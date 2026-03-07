const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
}

// Middleware to check if user is admin or superadmin
const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = await verifyToken(token);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(403).json({ error: 'User not found' });
    }

    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = { ...decoded, role: user.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    res.status(500).json({ error: err.message || 'Server error' });
  }
};

// Middleware to check if user is superadmin only
const requireSuperAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = await verifyToken(token);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(403).json({ error: 'User not found' });
    }

    if (user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    req.user = { ...decoded, role: user.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    res.status(500).json({ error: err.message || 'Server error' });
  }
};

module.exports = { requireAdmin, requireSuperAdmin };

