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

const app = express();

// Middleware - CORS: allow localhost (Expo web), mobile, Netlify
const corsOptions = {
  origin: [
    /^http:\/\/localhost(:\d+)?$/,   // http://localhost:8081, :3000, etc.
    /^http:\/\/127\.0\.0\.1(:\d+)?$/,
    /^https:\/\/.*\.netlify\.app$/,   // Netlify preview/production
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Cron-Secret'],
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (skipped on Netlify - images use Supabase Storage)
const uploadsPath = path.join(__dirname, '..', 'uploads');
if (fs.existsSync(uploadsPath)) {
  app.use('/uploads', express.static(uploadsPath));
}

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
