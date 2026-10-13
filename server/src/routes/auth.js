const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { login, logout, me, register, googleLogin, studentRegister, forgotPassword, verifyResetOtp, resetPasswordViaOtp, verifyEmail, resendVerification } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 10000,
  message: { message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 10000,
  message: { message: 'Too many registration attempts. Try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 10000,
  message: { message: 'Too many attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login',                loginLimiter,   login);
router.post('/google',               loginLimiter,   googleLogin);
router.post('/logout',               authenticate,   logout);
router.get('/me',                    authenticate,   me);
router.post('/register',             authenticate,   authorize(['super_admin']), register);
router.post('/student-register',     registerLimiter, studentRegister);
router.post('/forgot-password',      otpLimiter,     forgotPassword);
router.post('/verify-reset-otp',     otpLimiter,     verifyResetOtp);
router.post('/reset-password',       otpLimiter,     resetPasswordViaOtp);
router.post('/verify-email',         otpLimiter,     verifyEmail);
router.post('/resend-verification',  otpLimiter,     resendVerification);

module.exports = router;
