# House of Jainz

A community-based ecommerce platform designed for the Jain community, allowing users to connect with nearby community members and buy/sell products online.

## Features

### Community Dashboard
- Create posts with images and location
- Like and comment on posts
- View posts filtered by location
- Community feed

### Marketplace
- Location-based shop discovery
- Browse products by shop
- Search shops by location
- Product details and images

### Authentication
- User registration with religion field
- Secure login/logout
- JWT-based authentication

### Shopping Features
- Add products to cart
- Manage cart items (quantity, remove)
- Multiple addresses support
- Checkout process
- Order management

### Seller Dashboard
- Create and manage shops
- Add/edit products with images
- View and manage orders
- Update order status (pending, confirmed, processing, shipped, delivered, cancelled)

### Subscription System
- 30-day free trial for new shop owners
- Monthly subscription plan (₹199/month)
- Subscription status tracking
- Payment integration ready

## Tech Stack

### Backend
- Node.js with Express
- Supabase (PostgreSQL database)
- JWT authentication
- Multer for file uploads
- bcryptjs for password hashing

### Mobile App
- React Native with Expo
- React Navigation
- Axios for API calls
- AsyncStorage for local storage
- Expo Image Picker
- Expo Location

## Project Structure

```
house-of-jainz/
├── backend/
│   ├── config/
│   │   └── supabase.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── community.js
│   │   ├── marketplace.js
│   │   ├── cart.js
│   │   ├── orders.js
│   │   ├── seller.js
│   │   ├── subscription.js
│   │   └── addresses.js
│   └── server.js
├── mobile/
│   ├── src/
│   │   ├── config/
│   │   │   └── api.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   └── screens/
│   │       ├── auth/
│   │       ├── community/
│   │       ├── marketplace/
│   │       ├── cart/
│   │       ├── orders/
│   │       ├── profile/
│   │       ├── seller/
│   │       ├── address/
│   │       └── subscription/
│   └── App.js
├── supabase/
│   └── schema.sql
├── .env.example
├── package.json
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Supabase account
- Expo CLI (for mobile development)

### Backend Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

3. Update `.env` with your Supabase credentials:
```
PORT=5000
JWT_SECRET=your_secure_jwt_secret
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up Supabase database:
   - Create a new Supabase project
   - Run the SQL schema from `supabase/schema.sql` in the Supabase SQL editor

5. Create upload directories:
```bash
mkdir -p uploads/community uploads/products
```

6. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Mobile App Setup

1. Navigate to mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Update API configuration in `mobile/src/config/api.js`:
   - For development: `http://localhost:5000/api` (works for web and localhost)
   - For physical devices: `http://YOUR_IP_ADDRESS:5000/api` (use your computer's IP)
   - For production: your production backend URL

4. Start the Expo development server:
```bash
npm start
```

5. Run on your preferred platform:
   - **Web**: Press `w` or run `npm run web` - opens in browser at http://localhost:19006
   - **Android**: Press `a` or scan QR code with Expo Go app
   - **iOS**: Press `i` or scan QR code with Expo Go app

**Note**: The app now supports web browsers! See `WEB_SETUP.md` for detailed web setup instructions.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Community
- `GET /api/community/posts` - Get all posts
- `POST /api/community/posts` - Create post
- `POST /api/community/posts/:id/like` - Like/unlike post
- `POST /api/community/posts/:id/comments` - Add comment
- `GET /api/community/posts/:id/comments` - Get comments

### Marketplace
- `GET /api/marketplace/shops` - Get shops (filter by location)
- `POST /api/marketplace/shops` - Create shop
- `GET /api/marketplace/shops/:id/products` - Get shop products
- `GET /api/marketplace/products` - Get all products

### Cart
- `GET /api/cart` - Get cart items
- `POST /api/cart/add` - Add to cart
- `PUT /api/cart/:id` - Update cart item
- `DELETE /api/cart/:id` - Remove from cart

### Orders
- `POST /api/orders/checkout` - Place order
- `GET /api/orders/my-orders` - Get user orders
- `GET /api/orders/:id` - Get order details

### Seller
- `GET /api/seller/shops` - Get seller's shops
- `POST /api/seller/products` - Add product
- `GET /api/seller/products` - Get seller's products
- `PUT /api/seller/products/:id` - Update product
- `GET /api/seller/orders` - Get seller's orders
- `PUT /api/seller/orders/:id/status` - Update order status

### Addresses
- `GET /api/addresses` - Get user addresses
- `POST /api/addresses` - Add address
- `PUT /api/addresses/:id` - Update address
- `DELETE /api/addresses/:id` - Delete address

### Subscription
- `GET /api/subscription/status` - Get subscription status
- `POST /api/subscription/create` - Create subscription
- `GET /api/subscription/history` - Get subscription history

## Database Schema

The database includes the following main tables:
- `users` - User accounts
- `posts` - Community posts
- `likes` - Post likes
- `comments` - Post comments
- `shops` - Seller shops
- `products` - Shop products
- `cart_items` - Shopping cart
- `addresses` - User addresses
- `orders` - Customer orders
- `order_items` - Order line items
- `subscriptions` - Shop subscriptions

See `supabase/schema.sql` for complete schema.

## Subscription Model

1. **Free Trial**: New shop owners get 30 days free trial from shop creation date
2. **Subscription**: After trial, shop owners need to subscribe at ₹199/month to receive orders
3. **Status Tracking**: System tracks trial period and subscription status

## Development Notes

- Backend uses JWT for authentication
- Images are stored locally in `uploads/` directory (consider using cloud storage in production)
- Payment integration is placeholder - integrate with Razorpay/Stripe for production
- Update CORS settings for production
- Use environment variables for sensitive data
- Implement proper error handling and validation

## Production Deployment

1. Deploy backend to services like Heroku, Railway, or AWS
2. Use cloud storage (AWS S3, Cloudinary) for images
3. Set up production Supabase project
4. Configure environment variables
5. Build mobile app: `expo build:android` or `expo build:ios`
6. Submit to app stores

## License

This project is proprietary software.

## Support

For issues and questions, please contact the development team.

