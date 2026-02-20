const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

// Middleware to check if user is admin or superadmin
const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }

      // Get user role from database
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', decoded.userId)
        .single();

      if (error || !user) {
        return res.status(403).json({ error: 'User not found' });
      }

      // Check if user is admin or superadmin
      if (user.role !== 'admin' && user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      req.user = {
        ...decoded,
        role: user.role
      };
      next();
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }

      // Get user role from database
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', decoded.userId)
        .single();

      if (error || !user) {
        return res.status(403).json({ error: 'User not found' });
      }

      // Check if user is superadmin
      if (user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Super admin access required' });
      }

      req.user = {
        ...decoded,
        role: user.role
      };
      next();
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { requireAdmin, requireSuperAdmin };

