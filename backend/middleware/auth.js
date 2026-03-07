const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

/** Optional auth: set req.user if valid token, else req.user = null. Never returns 401. For guest browsing. */
const optionalAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
      return next();
    }
    req.user = user;
    next();
  });
};

/** Use after authenticateToken: block guest role (view-only). Returns 401 so client can prompt login. */
const requireNotGuest = (req, res, next) => {
  if (req.user && req.user.role === 'guest') {
    return res.status(401).json({ error: 'Login required for this action' });
  }
  next();
};

module.exports = { authenticateToken, optionalAuthenticateToken, requireNotGuest };

