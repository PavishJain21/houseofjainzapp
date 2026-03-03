/**
 * Feature flags: same parent/child tree as backend.
 * Used when API is unavailable; otherwise use FeatureContext (fetches from API).
 */

export const FEATURE_TREE = {
  auth: { parent: null, label: 'Auth', description: 'Login, register, forgot/reset password' },
  community: { parent: null, label: 'Community', description: 'Feed, create post, my posts, like, comment' },
  forum: { parent: null, label: 'Forum', description: 'Categories, text posts, like, comment, delete by owner, share' },
  sangh: { parent: null, label: 'Sangh', description: 'Create and join groups (public/private)' },
  marketplace: { parent: null, label: 'Marketplace', description: 'Browse shops and products' },
  cart: { parent: 'marketplace', label: 'Cart', description: 'Shopping cart, add/update/remove items' },
  orders: { parent: 'marketplace', label: 'Orders', description: 'Checkout, place order, my orders' },
  addresses: { parent: 'marketplace', label: 'Addresses', description: 'User delivery addresses' },
  payments: { parent: 'marketplace', label: 'Payments', description: 'Razorpay checkout' },
  seller: { parent: 'marketplace', label: 'Seller', description: 'Shops, products, seller orders, earnings, payouts' },
  notifications: { parent: null, label: 'Notifications', description: 'In-app notifications' },
  consent: { parent: null, label: 'Consent', description: 'Terms, privacy, cookie policy' },
  admin: { parent: null, label: 'Admin', description: 'Admin dashboard, users, shops, products, posts, orders, payouts' },
};

export const ALL_FEATURE_IDS = [
  'auth',
  'community',
  'forum',
  'sangh',
  'marketplace',
  'cart',
  'orders',
  'addresses',
  'payments',
  'seller',
  'notifications',
  'consent',
  'admin',
];

/** Resolve enabled map when a feature is disabled: it and all descendants are off */
export function resolveEnabledMap(rawMap) {
  const resolved = {};
  for (const id of ALL_FEATURE_IDS) {
    let enabled = rawMap[id] !== false;
    let current = id;
    while (enabled && FEATURE_TREE[current]?.parent) {
      const parent = FEATURE_TREE[current].parent;
      enabled = rawMap[parent] !== false;
      current = parent;
    }
    resolved[id] = enabled;
  }
  return resolved;
}

/** Default: all enabled (used as fallback when API fails) */
export function getDefaultEnabledMap() {
  const raw = {};
  ALL_FEATURE_IDS.forEach((id) => { raw[id] = true; });
  return resolveEnabledMap(raw);
}
