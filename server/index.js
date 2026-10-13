require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const { sequelize, syncDB } = require('./src/models');
const { setIo } = require('./src/utils/gradingWorker');
const { setIo: setNotificationIo } = require('./src/utils/notificationService');
const { setIo: setVerilogIo } = require('./src/controllers/verilogController');
const { validateProductionExecutionConfig } = require('./src/utils/executionPolicy');
const { validateSuperadminEnv } = require('./src/config/envValidation');

// Suppress unhandled errors
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err?.message || err);
  if (process.env.NODE_ENV === 'production') process.exit(1);
});

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, credentials: true },
});

const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:', 'https:', ...(isProduction ? [] : ['http://localhost:*'])],
      connectSrc: ["'self'", process.env.CLIENT_URL].filter(Boolean),
      frameSrc:   ["'none'"],
      objectSrc:  ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // allow iframe embeds for frontend lab
}));

// CORS — whitelist origins
const ALLOWED_ORIGINS = new Set(
  [
    process.env.CLIENT_URL,
    process.env.CLIENT_URL_STAGING,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.NGROK_URL,
  ].filter(Boolean)
);
const isNgrokOrigin = (origin) =>
  !isProduction &&
  typeof origin === 'string' &&
  /(https?:\/\/.*\.(ngrok-free\.dev|ngrok\.io))$/i.test(origin);
const corsOptions = {
  origin: (origin, callback) => {
    // Allow same-origin / no-origin (server-to-server, health checks)
    if (!origin || ALLOWED_ORIGINS.has(origin) || isNgrokOrigin(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '512kb' }));
app.use(morgan(isProduction ? 'combined' : 'dev'));

// Sanitize req.body strings to prevent stored XSS — strip dangerous HTML tags
const DANGEROUS_TAGS = /<(script|iframe|object|embed|form|base|link|meta|style)[^>]*>|on\w+\s*=/gi;
app.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    const sanitize = (obj) => {
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key].replace(DANGEROUS_TAGS, '');
        } else if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          sanitize(obj[key]);
        }
      }
    };
    sanitize(req.body);
  }
  next();
});

// Global rate limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 200 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
}));

// Strict auth rate limit — 10 attempts / 15 min (relaxed in dev)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
});

// Routes — only features in use
app.use('/api/auth',            authLimiter, require('./src/routes/auth'));
app.use('/api/admin/learn',     require('./src/routes/adminLearn'));
app.use('/api/admin',           require('./src/routes/admin'));
app.use('/api/student',         require('./src/routes/student'));
app.use('/api/coding',          require('./src/routes/coding'));
app.use('/api/lab',             require('./src/routes/lab'));
app.use('/api/daily-challenge', require('./src/routes/dailyChallenge'));
app.use('/api/contests',        require('./src/routes/contest'));
app.use('/api/verilog',         require('./src/routes/verilog'));
app.use('/api/engineering',     require('./src/routes/engineering'));
app.use('/api/learn',           require('./src/routes/learn'));

// Static uploads — profile photos and course assets require authentication
const path = require('path');
const { authenticate } = require('./src/middleware/auth');
app.use('/uploads/profile-photos',    authenticate, express.static(path.join(__dirname, 'uploads', 'profile-photos')));
app.use('/uploads/course-thumbnails', authenticate, express.static(path.join(__dirname, 'uploads', 'course-thumbnails')));
app.use('/uploads/lesson-images',     authenticate, express.static(path.join(__dirname, 'uploads', 'lesson-images')));

// Health check routes
const { router: healthRouter } = require('./src/routes/health');
app.use('/api', healthRouter);

// Global error handler — catches any unhandled errors from route handlers
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// Socket.IO — students join their personal room for submission results
const jwt = require('jsonwebtoken');
io.on('connection', (socket) => {
  // Verify token from handshake before allowing any room joins
  const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace('Bearer ', '');
  let socketUser = null;
  if (token) {
    try { socketUser = jwt.verify(token, process.env.JWT_SECRET); } catch { /* invalid */ }
  }

  socket.on('join', (userId) => {
    // Only allow joining own room
    if (socketUser && userId && socketUser.id === userId) {
      socket.join(`user:${userId}`);
    }
  });

  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 5000;

async function start() {
  validateProductionExecutionConfig();
  validateSuperadminEnv();
  await sequelize.authenticate();
  console.log('MySQL connected');

  if (process.env.ALLOW_DB_SYNC === 'true') {
    await syncDB();
  } else {
    console.log('Database auto-sync disabled; migrations must be applied explicitly.');
  }

  setIo(io);
  global._gradingIo = io;
  setNotificationIo(io);
  setVerilogIo(io);
  console.log('Grading: in-process mode (no Redis required)');

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`);
    } else {
      console.error('Server error:', err.message);
    }
    process.exit(1);
  });
  server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
