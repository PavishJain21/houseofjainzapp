# Dummy Data Generation Script

This script generates bulk dummy data for testing the House of Jainz application.

## Features

Generates:
- **50 Users** - Test users with default password `password123`
- **20 Shops** - Various shops across different cities
- **~200 Products** - Products distributed across shops (10 per shop)
- **100 Posts** - Community posts with random content
- **Likes & Comments** - Random likes and comments on posts
- **30-50 Orders** - Orders with various statuses
- **Notifications** - Order-related notifications

## Prerequisites

Make sure you have:
1. Node.js installed
2. Supabase credentials configured in `.env` file
3. Database schema created (run `supabase/schema.sql` and `supabase/notifications_schema.sql`)

## Installation

The script uses dependencies that should already be installed:
- `@supabase/supabase-js`
- `bcryptjs`
- `dotenv`

If not installed, run:
```bash
npm install @supabase/supabase-js bcryptjs dotenv
```

## Usage

From the project root directory:

```bash
node backend/scripts/generate-dummy-data.js
```

Or from the backend directory:

```bash
node scripts/generate-dummy-data.js
```

## Test Users

After running the script, you can login with:
- **Email**: `user1@test.com`, `user2@test.com`, etc.
- **Password**: `password123` (same for all users)

## Customization

You can modify the script to change:
- Number of users: Change `count` parameter in `generateUsers(50)`
- Number of shops: Change `count` parameter in `generateShops(userIds, 20)`
- Products per shop: Change `countPerShop` parameter in `generateProducts(shops, 10)`
- Number of posts: Change `count` parameter in `generatePosts(userIds, 100)`

## Notes

- The script will skip existing users (based on email)
- Orders are created with realistic product selections
- Notifications are generated based on order statuses
- All dates are randomized within the last 30-60 days

## Cleanup

To remove all dummy data, you can:
1. Delete users with emails matching `user*@test.com` pattern
2. Or manually delete from Supabase dashboard

⚠️ **Warning**: This script inserts real data into your database. Use with caution!

