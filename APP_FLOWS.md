# House of Jainz – Complete App & Flows

This document describes the app architecture and each major flow end-to-end.

---

## 1. High-level architecture

- **Mobile app**: React Native (Expo), runs on iOS, Android, and Web.
- **Backend**: Node/Express API, talks to **Supabase** (Postgres + Storage).
- **Auth**: JWT in `Authorization: Bearer <token>`, token + user stored in AsyncStorage.
- **Features**: Backend feature flags (`/api/features`) control which areas are enabled; app hides tabs and guards routes by feature.

---

## 2. App entry & boot (mobile)

1. **App.js** mounts → `checkToken()` runs.
2. **checkToken**: reads `userToken` and `userData` from AsyncStorage.
   - If both exist: set state, then call **GET /api/auth/me** to refresh user (role, avatar, etc.) and merge into state + storage.
   - If missing: user stays null, token null.
3. **Loading**: while `isLoading` true, show loading UI (or null on native).
4. **Web-only**: before main app, handle **public URLs**:
   - `/privacypolicy` → PublicPrivacyView  
   - `/childsafety` → PublicChildSafetyView  
   - `/post/:id` → SharedPostView (community)  
   - `/forum/post/:id` → SharedPostView (forum)  
   - If path matches, render that view and stop; otherwise continue.
5. **Role**: `isAdminUser = user?.role === 'admin' || user?.role === 'superadmin'`.
6. **Providers**: LanguageProvider → ThemeProvider → AuthContext → FeatureProvider → ConsentProvider wrap the app.
7. **Main UI**: **ConsentNavigator** receives `userToken`, `isAdminUser`, `forceMainTabs`, `onForceMainTabsChange` and decides which navigator to show (see below).

---

## 3. Navigation flow (ConsentNavigator)

Single place that chooses **what the user sees** after boot or login.

```
                    ┌─────────────────┐
                    │  userToken?     │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │ No                          │ Yes
              ▼                             ▼
    ┌──────────────────┐         ┌─────────────────────┐
    │ Auth stack        │         │ contextNeedsConsent? │
    │ (Login, Register, │         │ (terms/privacy)      │
    │  ForgotPassword,  │         └──────────┬──────────┘
    │  ResetPassword,   │                    │
    │  AuthCallback)    │         ┌──────────┴──────────┐
                       │         │ Yes                 │ No
                       │         ▼                     ▼
                       │  ┌──────────────┐    ┌────────────────┐
                       │  │ Consent      │    │ showAdminStack?│
                       │  │ stack        │    │ (admin user &   │
                       │  │ Onboarding,  │    │  !forceMainTabs)│
                       │  │ Terms,       │    └───────┬────────┘
                       │  │ Privacy,     │            │
                       │  │ CookiePolicy │    ┌───────┴────────┐
                       │  └──────────────┘    │ Yes            │ No
                       │                      ▼                ▼
                       │               ┌─────────────┐  ┌─────────────┐
                       │               │ AdminStack  │  │ MainTabs     │
                       │               │ (dashboard, │  │ (Community,  │
                       │               │  users,     │  │  Forum,      │
                       │               │  shops,     │  │  Sangh,      │
                       │               │  products,  │  │  Calendar,   │
                       │               │  posts,     │  │  Marketplace,│
                       │               │  orders)    │  │  Cart,       │
                       │               └─────────────┘  │  Profile)    │
                       │                                └─────────────┘
```

- **No token** → Auth stack (Login first; web can start at AuthCallback for OAuth).
- **Token + needs consent** → Consent stack until terms/privacy are granted (ConsentContext loads from **GET /api/consent/status**).
- **Token + consent done**:
  - **Admin/superadmin** and **not** forceMainTabs → **AdminStack** (admin portal).
  - Else → **MainTabs** (main app).  
  **AdminGuard** can call `onForceMainTabsChange(true)` so an admin can switch to main app; that sets `forceMainTabs` and shows MainTabs until sign-out or clear.

---

## 4. Auth flow

### 4.1 Login (email/password)

- **Screen**: LoginScreen.
- **API**: **POST /api/auth/login** `{ email, password }`.
- **Backend**: find user by email, compare password (bcrypt), read `role` (normalized to `user`|`admin`|`superadmin`), return JWT + user.
- **App**: on success, `signIn(token, userData)` → AsyncStorage + set state. ConsentNavigator then shows consent stack or (if consent done) admin portal or main app by role.

### 4.2 Register

- **Screen**: RegisterScreen.
- **API**: **POST /api/auth/register** `{ email, password, name, phone?, religion? }`.
- **Backend**: insert into `users` (password hashed), return JWT + user (role from DB, default `user`).
- **App**: same as login – signIn → then consent or main/admin by role.

### 4.3 OTP login

- **Send OTP**: **POST /api/auth/send-otp** `{ email }` → email sent with code.
- **Verify**: **POST /api/auth/verify-otp** `{ email, otp }` → if valid, create user if missing, return JWT + user.
- **App**: signIn with returned token and user.

### 4.4 Google sign-in

- **App**: opens Google OAuth (or in-app browser); backend handles **GET /api/auth/google**, redirect to Google, then **GET /api/auth/google/callback** with code → backend exchanges code, finds/creates user by `google_id` or email, returns redirect URL with `?token=...`.
- **App** (native): deep link with token → read token, **GET /api/auth/me** with Bearer token → store token + user, then same navigation logic.

### 4.5 Session refresh

- **GET /api/auth/me** (Bearer token): returns current user (id, email, name, religion, phone, role, avatar_url, created_at). Role normalized.
- Used on app load (checkToken) and when refreshing profile (refreshUser).

### 4.6 Sign-out

- **App**: `signOut()` → remove `userToken` and `userData` from AsyncStorage, set state to null, set forceMainTabs false. ConsentNavigator then shows Auth stack.

---

## 5. Consent flow

- **ConsentProvider** (and ConsentContext) load status via **GET /api/consent/status** (authenticated). Response: `consents` (terms, privacy, cookies: granted, needsConsent, version, etc.).
- **needsConsent** = terms or privacy not granted or backend says needsConsent (e.g. new version).
- **ConsentNavigator**: if `contextNeedsConsent` true → show Consent stack (OnboardingConsent, Terms, Privacy, CookiePolicy). User grants via **POST /api/consent/grant** or **POST /api/consent/grant-multiple**.
- After consent is granted, ConsentProvider/loadConsents updates state → needsConsent false → ConsentNavigator shows either AdminStack or MainTabs.
- **Cookie consent**: optional; modal shown after main consents (terms/privacy) are done, from ConsentNavigator.

---

## 6. Feature flags

- **Backend**: `backend/config/features.js` defines feature tree and reads env (e.g. `ENABLE_COMMUNITY`, `ENABLE_ADMIN`). **GET /api/features** returns `{ features: {...}, tree: {...} }`.
- **Backend routes**: **requireFeatureByRoute** middleware blocks requests to e.g. `/api/community` if that feature is disabled (403).
- **App**: **FeatureProvider** fetches `/api/features`, **useFeatures().isEnabled(featureId)** used by MainTabs (which tabs to show) and **FeatureGuard** (wrap stacks like Community, Forum, Sangh, Marketplace, Cart). Admin portal is **not** gated by feature flag; it’s role-only.

---

## 7. Main app (MainTabs) – tab structure

Tabs shown based on feature flags (and FeatureGuard inside each stack):

| Tab            | Stack / screens | Feature flag | Description |
|----------------|------------------|-------------|-------------|
| Community      | CommunityStack   | community   | Feed, Create Post |
| Forum          | ForumStack       | forum       | Categories, category feed, Create forum post |
| Sangh          | SanghStack       | sangh       | Groups list, Create Sangh, Detail, Members, Add member |
| Calendar       | FestivalsStack   | (always)    | Jain festivals |
| Marketplace    | MarketplaceStack | marketplace | Shops list, Shop, Product |
| Cart           | CartStack        | cart        | Cart, Checkout |
| Profile        | ProfileStack     | (always)    | Profile, Orders, Seller dashboard, Addresses, Notifications, My Posts, Contact, Terms, Privacy, Cookie, Child Safety |

Profile stack also has: AddProduct, CreateShop, ShopDetails, SellerOrders, SellerEarnings, PayoutHistory, AddAddress.

---

## 8. Admin flow

- **Who**: users with `role === 'admin'` or `role === 'superadmin'`.
- **When**: after login and consent, if `isAdminUser && !forceMainTabs`, ConsentNavigator renders **AdminGuard** + **AdminStack**.
- **AdminStack screens**: AdminDashboard, AdminUsers, AdminShops, AdminProducts, AdminPosts, AdminOrders. Some actions (e.g. change user role, delete shop) use **requireSuperAdmin** on the backend.
- **Backend**: **/api/admin/** routes use **requireAdmin** or **requireSuperAdmin** (JWT + DB role check). **/api/admin/payouts/** uses requireAdmin.
- **Switch to main app**: from admin UI, a control can call `onForceMainTabsChange(true)` so the same user sees MainTabs until they sign out or you reset forceMainTabs.

---

## 9. Backend API overview

| Prefix              | Purpose |
|---------------------|--------|
| /api/features       | Public; feature flags + tree |
| /api/health         | Health check |
| /api/auth           | Register, login, send-otp, verify-otp, /me, password reset, Google OAuth, profile picture |
| /api/consent        | status, grant, grant-multiple, revoke, document by type/version |
| /api/community      | Posts CRUD, likes, comments (authenticateToken) |
| /api/forum          | Categories, posts, likes, comments (authenticateToken) |
| /api/sangh          | Groups, members, messages, reactions (authenticateToken) |
| /api/marketplace     | Shops, products (public + auth) |
| /api/cart           | Cart CRUD (authenticateToken) |
| /api/orders         | Create order, list my orders (authenticateToken) |
| /api/seller         | Shops, products, orders, earnings, payouts (authenticateToken) |
| /api/addresses       | Delivery addresses (authenticateToken) |
| /api/notifications  | Notifications (authenticateToken) |
| /api/payments       | Razorpay create/verify (authenticateToken) |
| /api/payouts         | Seller payout requests (authenticateToken) |
| /api/admin           | Dashboard stats, users, shops, products, posts, orders (requireAdmin/requireSuperAdmin) |
| /api/admin/payouts   | Payout management (requireAdmin) |

Feature middleware runs after **GET /api/features** and blocks disabled feature routes with 403.

---

## 10. Data & context summary

- **AuthContext**: token, user, signIn, signOut, refreshUser. Used for auth and role (admin vs main).
- **ConsentContext**: consents, loading, needsConsent, loadConsents, grantConsent, grantMultipleConsents, etc. Used by ConsentNavigator and consent screens.
- **FeatureContext**: features map from API, isEnabled(featureId). Used by MainTabs and FeatureGuard.
- **ThemeContext / LanguageContext**: theme and i18n.
- **API**: axios instance, baseURL from config (e.g. DigitalOcean or local), request interceptor adds Bearer token from AsyncStorage.

---

## 11. Web-specific

- **Public routes**: /privacypolicy, /childsafety, /post/:id, /forum/post/:id render standalone views before the main app.
- **Auth callback**: web can set initialRouteName to AuthCallback when path is `/auth/callback`.
- **Viewport**: mobile-style frame (max width, safe area), viewport meta and AdSense script injected in App.js.

This is the complete app and each flow in one place. For a specific flow (e.g. checkout, seller payout, or forum post), the same pattern applies: screen → API (with auth/feature/role as above) → Supabase.
