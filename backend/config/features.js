/**
 * Feature flags: parent/child tree and enable/disable.
 * Disabling a parent disables all its children.
 * Control via env: ENABLE_<FEATURE>=0|1 (default 1).
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// ─── Feature tree: parent → children (child features are disabled when parent is disabled) ───
const FEATURE_TREE = {
  auth: { parent: null, label: 'Auth', description: 'Login, register, forgot/reset password, Google login' },
  community: { parent: null, label: 'Community', description: 'Feed, create post, my posts, like, comment' },
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

/** All feature IDs in a stable order (roots first, then children) */
const ALL_FEATURE_IDS = [
  'auth',
  'community',
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

/** API route prefix → feature id (for middleware) */
const ROUTE_TO_FEATURE = {
  '/api/auth': 'auth',
  '/api/community': 'community',
  '/api/marketplace': 'marketplace',
  '/api/cart': 'cart',
  '/api/orders': 'orders',
  '/api/addresses': 'addresses',
  '/api/payments': 'payments',
  '/api/seller': 'seller',
  '/api/payouts': 'seller',
  '/api/notifications': 'notifications',
  '/api/consent': 'consent',
  '/api/admin': 'admin',
};

function readEnvFlag(key, defaultValue = true) {
  const v = process.env[key];
  if (v === undefined || v === '') return defaultValue;
  return v === '1' || v === 'true' || v === 'yes';
}

/** Raw enabled flags from env (only top-level and direct toggles; children can be overridden but still respect parent) */
function getRawEnabledFromEnv() {
  return {
    auth: readEnvFlag('ENABLE_AUTH', true),
    community: readEnvFlag('ENABLE_COMMUNITY', true),
    marketplace: readEnvFlag('ENABLE_MARKETPLACE', true),
    cart: readEnvFlag('ENABLE_CART', true),
    orders: readEnvFlag('ENABLE_ORDERS', true),
    addresses: readEnvFlag('ENABLE_ADDRESSES', true),
    payments: readEnvFlag('ENABLE_PAYMENTS', true),
    seller: readEnvFlag('ENABLE_SELLER', true),
    notifications: readEnvFlag('ENABLE_NOTIFICATIONS', true),
    consent: readEnvFlag('ENABLE_CONSENT', true),
    admin: readEnvFlag('ENABLE_ADMIN', true),
  };
}

/**
 * Resolved enabled map: a feature is enabled only if it is enabled in env AND all its ancestors are enabled.
 */
function getEnabledMap() {
  const raw = getRawEnabledFromEnv();
  const resolved = {};

  for (const id of ALL_FEATURE_IDS) {
    let enabled = raw[id] !== false;
    let current = id;
    while (enabled && FEATURE_TREE[current]?.parent) {
      const parent = FEATURE_TREE[current].parent;
      enabled = raw[parent] !== false;
      current = parent;
    }
    resolved[id] = enabled;
  }
  return resolved;
}

function isEnabled(featureId) {
  const map = getEnabledMap();
  return !!map[featureId];
}

/** Get feature tree for API (labels + hierarchy) */
function getTree() {
  return { ...FEATURE_TREE };
}

/** Get list of feature IDs that would be disabled if the given parent is disabled (parent + all descendants) */
function getDescendantIds(parentId) {
  const descendants = [parentId];
  for (const [id, meta] of Object.entries(FEATURE_TREE)) {
    if (meta.parent === parentId) {
      descendants.push(id, ...getDescendantIds(id));
    }
  }
  return [...new Set(descendants)];
}

module.exports = {
  FEATURE_TREE,
  ALL_FEATURE_IDS,
  ROUTE_TO_FEATURE,
  getEnabledMap,
  isEnabled,
  getTree,
  getRawEnabledFromEnv,
  getDescendantIds,
};
