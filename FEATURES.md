# Feature flags and parent/child relationships

Features can be **enabled or disabled** via environment variables. Disabling a **parent** feature automatically disables all **child** features.

---

## Feature list and hierarchy

### Root (parent) features

| Feature ID   | Label       | Description                                              | Env variable       | When disabled, also disables |
|-------------|-------------|----------------------------------------------------------|--------------------|------------------------------|
| **auth**    | Auth        | Login, register, forgot/reset password, Google login     | `ENABLE_AUTH`      | —                            |
| **community** | Community | Feed, create post, my posts, like, comment               | `ENABLE_COMMUNITY` | —                            |
| **forum**     | Forum     | Categories, text posts, like, comment, delete by owner, share | `ENABLE_FORUM`   | —                            |
| **marketplace** | Marketplace | Browse shops and products                          | `ENABLE_MARKETPLACE` | **cart**, **orders**, **addresses**, **payments**, **seller** |
| **notifications** | Notifications | In-app notifications list, mark read            | `ENABLE_NOTIFICATIONS` | —                         |
| **consent** | Consent      | Terms, privacy, cookie policy (onboarding + profile)     | `ENABLE_CONSENT`   | —                            |
| **admin**   | Admin        | Admin dashboard, users, shops, products, posts, orders, payouts | `ENABLE_ADMIN` | —                      |

### Child features (depend on parent)

All children of **marketplace** are disabled when **marketplace** is disabled:

| Feature ID   | Parent      | Label     | Description                                      | Env variable     |
|-------------|-------------|-----------|--------------------------------------------------|------------------|
| **cart**    | marketplace | Cart      | Shopping cart, add/update/remove items, checkout entry | `ENABLE_CART`    |
| **orders**  | marketplace | Orders    | Checkout, place order, my orders                 | `ENABLE_ORDERS`  |
| **addresses** | marketplace | Addresses | User delivery addresses                          | `ENABLE_ADDRESSES` |
| **payments** | marketplace | Payments  | Razorpay checkout                                | `ENABLE_PAYMENTS` |
| **seller**  | marketplace | Seller    | Shops, products, seller orders, earnings, payouts | `ENABLE_SELLER` |

**Summary:** Turning off **marketplace** turns off **cart**, **orders**, **addresses**, **payments**, and **seller**. You can also turn off individual children (e.g. only **seller**) while keeping marketplace and cart/orders on.

---

## Connected features (what goes away when you disable one)

- **Disable `marketplace`** → Removes: Marketplace tab, Cart tab, My Orders, Addresses, Seller dashboard, Order Received, Checkout, Payments (Razorpay), Payouts. Backend routes under `/api/marketplace`, `/api/cart`, `/api/orders`, `/api/addresses`, `/api/payments`, `/api/seller`, `/api/payouts` return 403.
- **Disable `community`** → Removes: Community tab, Create Post, My Posts. Backend `/api/community` returns 403.
- **Disable `forum`** → Removes: Forum tab, forum categories and posts. Backend `/api/forum` returns 403.
- **Disable `cart`** → Removes: Cart tab only (marketplace and shop/product still work).
- **Disable `orders`** → Removes: Checkout, My Orders (cart and marketplace still work).
- **Disable `seller`** → Removes: Seller dashboard, Order Received, Create Shop, Add/Edit Product, Seller orders, Earnings, Payout history. Backend `/api/seller`, `/api/payouts` return 403.
- **Disable `auth`** → Auth routes disabled (login/register etc. return 403).
- **Disable `notifications`** → Notifications menu and `/api/notifications` disabled.
- **Disable `consent`** → Consent-related UI and `/api/consent` disabled.
- **Disable `admin`** → Admin stack hidden for admin users; `/api/admin` and `/api/admin/payouts` return 403.

---

## How to enable/disable

### Backend (Node)

Set in `.env` or your host’s env (e.g. DigitalOcean, Netlify):

```bash
# Disable marketplace (and all its children: cart, orders, addresses, payments, seller)
ENABLE_MARKETPLACE=0

# Or disable only seller (marketplace, cart, orders still on)
ENABLE_SELLER=0

# Disable community
ENABLE_COMMUNITY=0
```

Defaults: all features are **enabled** (`1`) if not set.

### Mobile app

The app loads feature flags from **GET /api/features**. It uses them to:

- Show/hide bottom tabs (Community, Forum, Marketplace, Cart)
- Show/hide profile menu items (My Orders, Order Received, My Posts, Notifications, My Addresses, Seller Dashboard, Terms/Privacy/Cookie)
- Show Admin stack only when user is admin **and** `admin` feature is enabled

No env vars are needed on the mobile side; it follows the backend.

---

## API

- **GET /api/features** (no auth)  
  Returns:

  ```json
  {
    "features": {
      "auth": true,
      "community": true,
      "forum": true,
      "marketplace": true,
      "cart": true,
      "orders": true,
      "addresses": true,
      "payments": true,
      "seller": true,
      "notifications": true,
      "consent": true,
      "admin": true
    },
    "tree": { ... }
  }
  ```

  `features` is the resolved map (parent off ⇒ children off). `tree` describes each feature’s `parent`, `label`, and `description`.

- Any request to a route that belongs to a disabled feature receives **403** with `{ "error": "feature_disabled", "message": "..." }`.

---

## Code locations

| What              | Where |
|-------------------|--------|
| Feature tree + env | `backend/config/features.js` |
| Route guard       | `backend/middleware/features.js` |
| GET /api/features | `backend/app.js` |
| Mobile tree + resolve | `mobile/src/config/features.js` |
| Fetch + cache     | `mobile/src/services/featureService.js` |
| React context     | `mobile/src/context/FeatureContext.js` |
| Tabs (Community, Forum, Marketplace, Cart) | `mobile/App.js` (MainTabs) |
| Forum schema      | `supabase/forum_schema.sql` |
| Forum API         | `backend/routes/forum.js` |
| Profile menu      | `mobile/src/screens/profile/ProfileScreen.js` |
| Admin stack       | `mobile/App.js` (ConsentNavigator) |
