const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Load .env from project root (Netlify uses dashboard env vars)
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const authRoutes = require('./routes/auth');
const communityRoutes = require('./routes/community');
const marketplaceRoutes = require('./routes/marketplace');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const sellerRoutes = require('./routes/seller');
const addressRoutes = require('./routes/addresses');
const adminRoutes = require('./routes/admin');
const notificationsRoutes = require('./routes/notifications');
const consentRoutes = require('./routes/consent');
const paymentsRoutes = require('./routes/payments');
const payoutsRoutes = require('./routes/payouts');
const adminPayoutsRoutes = require('./routes/admin-payouts');
const { requireFeatureByRoute } = require('./middleware/features');
const { getEnabledMap, getTree } = require('./config/features');

const app = express();

// Handle CORS preflight OPTIONS immediately (before any other middleware)
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Cron-Secret');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});

// CORS for actual requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Cron-Secret');
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (skipped on Netlify - images use Supabase Storage)
const uploadsPath = path.join(__dirname, '..', 'uploads');
if (fs.existsSync(uploadsPath)) {
  app.use('/uploads', express.static(uploadsPath));
}

// Feature flags: public endpoint (no auth) so app can hide UI
app.get('/api/features', (req, res) => {
  res.json({ features: getEnabledMap(), tree: getTree() });
});

// Block disabled features by route
app.use(requireFeatureByRoute);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/payouts', payoutsRoutes);
app.use('/api/admin/payouts', adminPayoutsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'House of Jainz API is running' });
});

module.exports = app;
