# Google Sign-In (OAuth 2.0) – Fix “doesn’t comply with Google’s OAuth 2.0 policy”

If you see **Error 400: invalid_request** or **“You can't sign in to this app because it doesn't comply with Google's OAuth 2.0 policy”**, do the following in [Google Cloud Console](https://console.cloud.google.com/).

---

## 1. OAuth consent screen → Authorized domains

The **domain** of your redirect URI must be in the consent screen’s **Authorized domains**.

1. Go to **APIs & Services** → **OAuth consent screen**.
2. Click **EDIT APP** (or set it up if you haven’t).
3. Go to the **Authorized domains** section (not the one under Credentials).
4. Click **ADD DOMAIN** and add **only the host**, no `https://` and no path:
   - For backend callback: **`houseofjainz-o8g2v.ondigitalocean.app`**
   - If you use web login on your own domain, add that domain too (e.g. `localhost` for local dev is often auto-allowed; for production add your real domain).
5. Save.

---

## 2. Credentials → Redirect URI

1. Go to **APIs & Services** → **Credentials**.
2. Open your **Web application** OAuth 2.0 client (the one whose Client ID you use in the app).
3. Under **Authorized redirect URIs**, add this **exact** URL (one line, no trailing slash):
   ```text
   https://houseofjainz-o8g2v.ondigitalocean.app/api/auth/google/callback
   ```
4. If you use Google sign-in on **web** (browser), also add your web app URL, e.g.:
   - Local: `http://localhost:8081` (or the port you use)
   - Production: `https://yourdomain.com`
5. Save.

---

## 3. App in “Testing” mode → Add test users

If the OAuth consent screen is in **Testing**:

1. Go to **APIs & Services** → **OAuth consent screen**.
2. In **Test users**, click **ADD USERS**.
3. Add the **Google account emails** that should be able to sign in (e.g. your own and teammates).
4. Save.

Only these users can sign in until you switch to **Production** (and complete verification if required).

---

## 4. Checklist

- [ ] **Authorized domains** (OAuth consent screen): `houseofjainz-o8g2v.ondigitalocean.app` added.
- [ ] **Authorized redirect URIs** (Credentials → Web client):  
  `https://houseofjainz-o8g2v.ondigitalocean.app/api/auth/google/callback` added **exactly** (no trailing slash, same protocol and path).
- [ ] If consent screen is in **Testing**: your Google account (and any other test accounts) added under **Test users**.
- [ ] Backend `.env` has `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from this same Web client.
- [ ] Mobile app has the same Client ID (e.g. `EXPO_PUBLIC_GOOGLE_CLIENT_ID` in `mobile/.env`).

After changing anything in the consent screen or redirect URIs, wait a minute and try sign-in again. If it still fails, open the **error details** link on the Google error page and check for the exact validation rule mentioned there.
