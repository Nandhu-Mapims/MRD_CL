const jwt = require('jsonwebtoken');

// Security: Require JWT_SECRET - no default fallback
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET environment variable is not set!');
  console.error('   Set JWT_SECRET in your .env file or environment variables.');
  console.error('   Generate a strong secret: openssl rand -base64 32');
  process.exit(1);
}

const authMiddleware = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;

      if (roles.length) {
        if (!payload.role) {
          return res.status(403).json({
            message: 'Your session is missing role information. Please log out and log in again.',
            code: 'MISSING_ROLE',
          });
        }
        if (!roles.includes(payload.role)) {
          return res.status(403).json({
            message: 'Admin access required to save forms. Please log in with an admin account (e.g. admin@hospital.com). If you already did, log out and log in again to refresh your session.',
            code: 'INSUFFICIENT_ROLE',
            requiredRoles: roles,
          });
        }
      }

      next();
    } catch (err) {
      console.error('JWT verify error', err);
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
};

module.exports = authMiddleware;


