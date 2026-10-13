const PLACEHOLDER_PATTERNS = [
  /^replace_with_/i,
  /^changeme$/i,
  /^change_me$/i,
  /^example$/i,
  /^placeholder$/i,
  /^your-domain\.example$/i,
  /^your_domain_example$/i,
  /^dummy$/i,
  /^testpassword$/i,
  /^password$/i,
  /^admin123$/i,
];

const isPlaceholderValue = (value) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) return true;
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized))) return true;
  return /(?:replace_with_|changeme|placeholder|your-domain\.example|example\.com)/i.test(normalized);
};

const isValidEmail = (value) =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const validateSuperadminEnv = () => {
  const email    = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;
  const dbPass   = process.env.DB_PASS;

  if (email && (isPlaceholderValue(email) || !isValidEmail(email))) {
    console.error('FATAL: SUPERADMIN_EMAIL is set to a placeholder or invalid email address.');
    process.exit(1);
  }

  if (password && isPlaceholderValue(password)) {
    console.error('FATAL: SUPERADMIN_PASSWORD is set to a placeholder value.');
    process.exit(1);
  }

  if (!jwtSecret || jwtSecret.length < 32) {
    console.error('FATAL: JWT_SECRET must be set and at least 32 characters long.');
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production' && dbPass && ['12345', 'password', 'root', ''].includes(dbPass)) {
    console.error('FATAL: DB_PASS is set to a weak or default value in production.');
    process.exit(1);
  }
};

module.exports = { isPlaceholderValue, validateSuperadminEnv };
