# Scripts Directory

This directory contains utility scripts for database operations and data generation.

## Generate Posts Script

### Option 1: Node.js Script (Recommended)

**File:** `generate_posts.js`

**Usage:**
```bash
# Generate 10,000 posts (default)
npm run generate-posts

# Or generate custom number of posts
node scripts/generate_posts.js 5000
```

**Features:**
- Generates posts with realistic content
- Distributes posts among existing users
- Includes random locations (Indian cities)
- 70% of posts have images
- Posts created over last 6 months (random dates)
- Progress tracking
- Batch insertion for performance

**Requirements:**
- Supabase credentials configured in `.env`
- At least one user in the `users` table

### Option 2: SQL Script

**File:** `generate_posts_sql.sql`

**Usage:**
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `generate_posts_sql.sql`
3. Click "Run" to execute

**Features:**
- Pure SQL implementation
- No external dependencies
- Faster execution for large datasets
- Can be run directly in Supabase SQL editor

**Note:** Make sure you have users in the database before running this script.

## Post Content

The scripts generate posts with:
- **Content:** 50+ different Jain community-related messages
- **Locations:** 20 major Indian cities with Jain communities
- **Images:** 70% of posts have placeholder image URLs
- **Dates:** Random dates within the last 6 months
- **Users:** Posts distributed randomly among existing users

## Performance

- **Node.js Script:** Processes in batches of 100 posts
- **SQL Script:** Processes all 10,000 posts in a single transaction
- Both scripts include progress indicators

## Troubleshooting

**Error: "No users found"**
- Create at least one user in the database first
- Users can be created through the registration API or directly in Supabase

**Error: "Missing Supabase environment variables"**
- Ensure `.env` file exists in project root
- Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env`

**Slow Performance:**
- Reduce batch size in Node.js script (default: 100)
- Use SQL script for faster bulk insertion
- Check database connection and indexes

