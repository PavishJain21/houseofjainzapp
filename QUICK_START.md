# Quick Start Guide

## Fix the Current Error

You're getting an error because:
1. The `.env` file is missing
2. You need to configure Supabase credentials

### Step 1: Create Supabase Project

1. Go to https://supabase.com and sign up/login
2. Create a new project
3. Wait for it to initialize (takes 1-2 minutes)
4. Go to **Settings** → **API**
5. Copy:
   - **Project URL** (this is your `SUPABASE_URL`)
   - **anon public** key (this is your `SUPABASE_ANON_KEY`)

### Step 2: Update .env File

Open the `.env` file in the root directory and replace:

```
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

With your actual Supabase credentials.

Also generate a secure JWT secret:
```
JWT_SECRET=your_secure_random_string_here_minimum_32_characters
```

You can generate a random string using:
- Online: https://randomkeygen.com/
- Or in terminal: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Step 3: Set Up Database

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open `supabase/schema.sql` from this project
4. Copy all the SQL code
5. Paste it into Supabase SQL Editor
6. Click **Run** (or press Ctrl+Enter)

### Step 4: Run from Root Directory

**Important**: Run commands from the project root, not from the `backend` folder:

```bash
# Make sure you're in the root directory
cd C:\Pavish-Jain-Flipkart-Minutes

# Install dependencies (if not done)
npm install

# Create upload directories
mkdir uploads\community
mkdir uploads\products

# Start the server
npm run dev
```

The server should now start successfully on `http://localhost:5000`

## Next Steps

1. Test the API: Visit `http://localhost:5000/api/health`
2. Set up the mobile app (see README.md)
3. Start developing!

## Troubleshooting

- **Still getting env error?** Make sure `.env` is in the root directory, not in `backend/`
- **Database errors?** Make sure you ran the SQL schema in Supabase
- **Port already in use?** Change `PORT=5000` to another port in `.env`

