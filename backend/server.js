const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../.env') });

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
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
// Increase JSON payload limit for base64 image uploads (10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploaded images)
app.use('/uploads', express.static('uploads'));

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

