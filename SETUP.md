# House of Jainz - Setup Guide

## Quick Start

### 1. Backend Setup

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your Supabase credentials
# SUPABASE_URL=your_supabase_url
# SUPABASE_ANON_KEY=your_supabase_key
# JWT_SECRET=your_secret_key

# Create upload directories
mkdir -p uploads/community uploads/products

# Run database migrations
# Copy and run supabase/schema.sql in your Supabase SQL editor

# Start server
npm run dev
```

### 2. Supabase Database Setup

1. Go to [Supabase](https://supabase.com) and create a new project
2. Go to SQL Editor
3. Copy the contents of `supabase/schema.sql`
4. Run the SQL script
5. Copy your project URL and anon key to `.env` file

### 3. Mobile App Setup

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Update API URL in mobile/src/config/api.js
# For physical devices, use your computer's IP: http://YOUR_IP:5000/api

# Start Expo
npm start

# Scan QR code with Expo Go app or press 'a' for Android / 'i' for iOS
```

## Important Notes

1. **Image Uploads**: Images are stored locally in `uploads/` directory. For production, use cloud storage (AWS S3, Cloudinary).

2. **Payment Integration**: The subscription payment is currently a placeholder. Integrate with Razorpay or Stripe for production.

3. **CORS**: Update CORS settings in `backend/server.js` for production.

4. **JWT Secret**: Use a strong, random JWT secret in production.

5. **API URL for Mobile**: When testing on physical devices, replace `localhost` with your computer's IP address in `mobile/src/config/api.js`.

## Testing

1. Register a new user with religion field
2. Create a post in community
3. Create a shop (30-day trial starts)
4. Add products to shop
5. Browse marketplace and add to cart
6. Add address and checkout
7. View orders in seller dashboard
8. Update order status

## Troubleshooting

- **Connection refused**: Check if backend is running and API URL is correct
- **Image upload fails**: Ensure `uploads/` directories exist
- **Database errors**: Verify Supabase connection and schema is applied
- **Mobile can't connect**: Use IP address instead of localhost

