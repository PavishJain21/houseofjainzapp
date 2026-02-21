# Deploy Backend to Netlify

## Prerequisites

- Project connected to Netlify (via Git)
- `serverless-http` installed: `npm install serverless-http`

## Deploy Steps

1. **Push to Git** – Netlify will auto-deploy on push (if connected).

2. **Set Environment Variables** in Netlify:
   - Site → **Site configuration** → **Environment variables** → **Add variable**
   - Add all required vars:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `JWT_SECRET`
     - `FRONTEND_URL` (e.g. `https://your-app.netlify.app`)
     - `RAZORPAY_KEY_ID`
     - `RAZORPAY_KEY_SECRET`
     - `NODE_ENV` = `production`
     - Optional: `CRON_SECRET`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`

3. **Build settings** (if needed):
   - Build command: leave empty or `echo 'Backend only'`
   - Publish directory: `.` (or leave default)
   - Functions directory: `netlify/functions` (from `netlify.toml`)

4. **Trigger deploy** – Deploy → Trigger deploy → Deploy site

## API URLs

- Base: `https://<your-site>.netlify.app/api`
- Health: `https://<your-site>.netlify.app/api/health`
- Auth: `https://<your-site>.netlify.app/api/auth/login`, etc.

Update your mobile app's `API_BASE_URL` in `mobile/src/config/api.js` to:
```
https://<your-site>.netlify.app/api
```

## Limitations

- **Timeout**: 10s (Free) / 26s (Pro). Long operations may fail.
- **No disk writes**: File uploads must use Supabase Storage (community/seller already do).
- **Cold starts**: First request after idle can be slower.
