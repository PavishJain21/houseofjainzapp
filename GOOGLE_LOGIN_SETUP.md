# Google Login Setup Guide

This guide explains how to enable "Login with Google" using Supabase OAuth in House of Jainz.

## 1. Supabase Dashboard - Enable Google Provider

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **Providers**
2. Enable **Google** provider
3. You'll need a **Client ID** and **Client Secret** from Google (see step 2)

## 2. Google Cloud Console - Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Create OAuth 2.0 Client IDs:
   - **Web application** (for Supabase callback):
     - Authorized redirect URIs: `https://<your-project-ref>.supabase.co/auth/v1/callback`
     - Get this from Supabase Dashboard → Auth → URL Configuration
   - Add your app's redirect URL to Supabase: **Authentication** → **URL Configuration** → Redirect URLs:
     - `houseofjainz://auth/callback` (for native app)
     - `houseofjainz://**` (wildcard for deep linking)
3. Copy the **Client ID** and **Client Secret** into Supabase Google provider settings

## 3. Mobile App - Environment Variables

Add to your `.env` (in project root or mobile folder) or `app.config.js`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

These are the same values as `SUPABASE_URL` and `SUPABASE_ANON_KEY` used by the backend.

## 4. Scopes (Optional)

Supabase needs these Google OAuth scopes (usually added by default):
- `userinfo.profile`
- `userinfo.email`
- `openid`

## Flow Summary

1. User taps "Continue with Google" on the login screen
2. App opens Google sign-in in a browser via Supabase OAuth
3. After successful auth, Supabase redirects back to `houseofjainz://auth/callback` with tokens
4. App exchanges the Supabase access token with your backend (`POST /auth/google`)
5. Backend verifies the token, creates/finds user in `users` table, returns your JWT
6. User is signed in with the same session as email/password login
