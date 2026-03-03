# Sign in with Google – End-to-end setup

## 1. Database (Supabase)

Run in Supabase SQL Editor:

```sql
-- From supabase/google_auth_schema.sql
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
```

## 2. Google Cloud Console

1. **APIs & Services → Credentials**  
   Create or use a **Web application** OAuth 2.0 client.

2. **Authorized redirect URIs** (for that client) add:
   - `https://<your-backend-host>/api/auth/google/callback`  
   Example: `https://houseofjainz-o8g2v.ondigitalocean.app/api/auth/google/callback`

3. **OAuth consent screen → Authorized domains**  
   Add your backend domain (e.g. `houseofjainz-o8g2v.ondigitalocean.app`) and, if you use web app login, your web app domain.

4. Copy **Client ID** and **Client secret**.

## 3. Backend environment

In your backend `.env` (or host env vars):

```env
GOOGLE_CLIENT_ID=<your-web-client-id>
GOOGLE_CLIENT_SECRET=<your-web-client-secret>
# Optional: if your backend URL is different
# API_BASE_URL=https://houseofjainz-o8g2v.ondigitalocean.app
# FRONTEND_URL=https://houseofjainz.com   # or houseofjainz://auth/callback for app deep link
```

## 4. Web app (SPA) – callback route

For web login, the backend redirects to your app with `?token=...`. Your SPA must serve the app for that path so the client can read the token and complete sign-in.

- **Netlify**: `mobile/netlify.toml` already has a redirect for `/auth/callback` → `/index.html`.
- **Vercel / Render / other**: Add a rewrite so `/auth/callback` (and `/auth/callback?token=...`) serves your `index.html`.

## 5. Native app – deep link

For Android/iOS, the redirect URI is `houseofjainz://auth/callback`. Configure this scheme in your Expo/app config so the OS opens your app after Google sign-in. The app listens for the URL and completes sign-in with the token.

## Flow summary

- **Web**: User taps “Sign in with Google” → redirect to backend `/auth/google` → Google → backend `/auth/google/callback` → redirect to `https://your-app.com/auth/callback?token=JWT` → app reads token, calls `GET /auth/me`, stores session, redirects to `/`.
- **Native**: Same until callback; backend redirects to `houseofjainz://auth/callback?token=JWT` → app opens, `Linking` handler reads token, fetches user, signs in.

## Optional: POST /auth/google (ID token)

Clients that have a Google ID token (e.g. from a native SDK) can sign in without the redirect flow:

```http
POST /api/auth/google
Content-Type: application/json

{ "idToken": "<google-id-token>" }
```

Response: `{ "token": "<your-jwt>", "user": { ... } }`.
