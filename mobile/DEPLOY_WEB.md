# Deploy House of Jainz (Web)

## Google AdSense verification

The AdSense **meta tag** and **script** are injected into `dist/index.html` automatically when you run `npm run build:web` (see `scripts/inject-adsense-html.js`). They are placed at the **top of `<head>`** so crawlers see them immediately.

**If AdSense says "We couldn't verify your site":**

1. **Redeploy** – Commit and push the latest code (including the inject script and `package.json` build script), then trigger a new deploy so the live site serves the updated `index.html`.
2. **Confirm the live HTML** – Open your live site URL, use “View Page Source” (not Inspect), and search for `google-adsense-account`. You should see the meta and script near the top of `<head>`.
3. **Wait** – Verification can take from a few minutes up to 24–48 hours after the correct HTML is live.
4. **Check access** – The site must be publicly reachable (no login wall on the homepage) and not blocked by `robots.txt` for Googlebot.

---

## Important: build runs inside `mobile/`

The web app lives in the **`mobile/`** folder. The build must run **from** `mobile/` so that **`dist/`** is created there. If your host uses the repo root, set the **root/base directory to `mobile`** so the build and publish paths are correct.

---

## 1. Build for production (local)

```bash
cd mobile
npm install
npm run build:web
```

This creates **`mobile/dist/`** with the static web files. The **publish directory** is **`dist`** (relative to `mobile/`).

---

## 2. Deploy to a host

### Netlify

**Option A – Use repo root and set “Base directory”**

1. In Netlify: **Site settings → Build & deploy → Build settings**
2. **Base directory:** `mobile`  ← required so the build runs inside mobile
3. **Build command:** `npm install && npm run build:web`
4. **Publish directory:** `dist`  ← relative to Base directory (so `mobile/dist`)

**Option B – Config in repo**

There is a **`mobile/netlify.toml`**. If you set Netlify’s **Base directory** to `mobile`, Netlify will use it:

- Build command: `npm install && npm run build:web`
- Publish: `dist`

### Vercel

1. **Root Directory:** set to **`mobile`** (Project Settings → General)
2. **Build Command:** `npm run build:web` (or leave default; **`mobile/vercel.json`** sets it)
3. **Output Directory:** `dist`

Or from CLI (from repo root, deploy the built output):

```bash
cd mobile
npm install && npm run build:web
npx vercel --prod
```

When prompted, set the project root to **mobile** so Vercel uses `mobile/vercel.json` and publishes `dist`.

### Render.com

1. Create a **Static Site** and connect your repo.
2. **Root Directory:** set to **`mobile`** (so the build runs inside the app folder).
3. **Build Command:** `npm install && npm run build:web`
4. **Publish Directory:** `dist`

**SPA routing (required for `/privacypolicy`, `/post/:id`, `/forum/post/:id`):**

In the Render Dashboard: your static site → **Redirects/Rewrites** → add rules. Use **Rewrite** (not Redirect) so the URL stays the same.

**Option A – One rule for all paths**

| Source    | Destination   | Action    |
|-----------|---------------|-----------|
| `/*`      | `/index.html` | **Rewrite** |

**Option B – If Option A gives 404, add one rule per path**

| Source         | Destination   | Action    |
|----------------|---------------|-----------|
| `/privacypolicy` | `/index.html` | **Rewrite** |
| `/post/*`      | `/index.html` | **Rewrite** |
| `/forum/post/*`| `/index.html` | **Rewrite** |

**Checklist if it still doesn’t work**

- **Action** is **Rewrite**, not Redirect (Redirect changes the URL and can break the app).
- **Publish Directory** is exactly `dist` (so the site root has `index.html`).
- After changing rules, **redeploy** the static site (or trigger a new deploy).
- Test the exact URL: `https://your-site.onrender.com/privacypolicy` (no trailing slash needed; the app accepts both).

### Option C: GitHub Pages (or any static host)

1. Build:

   ```bash
   cd mobile
   npm run build:web
   ```

2. Upload the **contents** of `dist/` to your host (e.g. push to a `gh-pages` branch, or use GitHub Actions to build and publish from `mobile`).

### Option D: Local preview

Serve the production build locally:

```bash
cd mobile
npm run build:web
npx serve dist
```

Then open the URL shown (e.g. http://localhost:3000).

---

## 3. Environment / API URL

The app uses `API_BASE_URL` from `src/config/api.js`. For production web:

- Ensure your backend is deployed and CORS allows your web origin (e.g. `https://your-app.vercel.app`).
- If you need a different API URL for production, use environment variables or a build-time config and point `API_BASE_URL` to that in the built bundle.

---

## “Publish directory dist does not exist”

This usually means either:

1. **Build didn’t run from `mobile/`**  
   Set **Base directory** (Netlify) or **Root Directory** (Vercel) to **`mobile`** so the build command runs inside the Expo app and creates `dist` there.

2. **Build failed**  
   Check the build logs. Run locally to confirm:
   ```bash
   cd mobile
   npm install
   npm run build:web
   ls dist
   ```
   If `dist` appears after this, use the same setup on the host (base = `mobile`, build = `npm install && npm run build:web`, publish = `dist`).

---

## Quick reference

| Setting           | Value                              |
|-------------------|------------------------------------|
| Base / root dir   | `mobile`                           |
| Build command     | `npm install && npm run build:web` |
| Publish directory | `dist`                             |
