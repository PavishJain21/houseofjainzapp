-- =============================================================================
-- HOUSE OF JAINZ – DATA CLEANUP QUERIES (GO-LIVE)
-- =============================================================================
-- Run these in Supabase SQL Editor. Backup or use a staging DB first.
-- See docs/DATA_OVERVIEW.md for table descriptions and dependency order.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. PRE-CLEANUP: Count rows (run before and after to verify)
-- -----------------------------------------------------------------------------
/*
SELECT 'users' AS tbl, COUNT(*) FROM users
UNION ALL SELECT 'posts', COUNT(*) FROM posts
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'shops', COUNT(*) FROM shops
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'forum_posts', COUNT(*) FROM forum_posts
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'cart_items', COUNT(*) FROM cart_items
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'auth_otps', COUNT(*) FROM auth_otps
UNION ALL SELECT 'password_reset_tokens', COUNT(*) FROM password_reset_tokens;
*/


-- -----------------------------------------------------------------------------
-- 1. MAINTENANCE: Clean expired auth and reset tokens (safe, no FKs)
-- -----------------------------------------------------------------------------
-- Expired OTPs (run periodically or before go-live)
DELETE FROM auth_otps WHERE expires_at < NOW();

-- Expired or used password reset tokens
DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = true;


-- -----------------------------------------------------------------------------
-- 2. FULL RESET: Wipe all app data, keep reference data
-- -----------------------------------------------------------------------------
-- Use when going live with a completely fresh database.
-- Keeps: consent_documents, platform_settings (and any RLS/policies).
-- Order respects foreign keys (children before parents).

TRUNCATE TABLE
  auth_otps,
  password_reset_tokens,
  likes,
  comments,
  forum_likes,
  forum_comments,
  order_items,
  order_payments,
  payout_order_mapping,
  cart_items,
  notifications,
  user_consents,
  posts,
  forum_posts,
  orders,
  seller_payouts,
  platform_transactions,
  addresses,
  payment_history,
  products,
  shops,
  seller_bank_details,
  subscriptions,
  users
RESTART IDENTITY CASCADE;


-- -----------------------------------------------------------------------------
-- 3. ALTERNATIVE: Full reset but KEEP admin/superadmin users
-- -----------------------------------------------------------------------------
-- Step 3a: Delete all data that depends on non-admin users, then delete
--          non-admin users. Admins and their addresses/shops remain.
--          (Optional: then delete admin shops/products/orders if you want
--           a clean slate for everyone.)

-- 3a – Delete in dependency order (everything that can reference any user/shop/order)

DELETE FROM auth_otps;
DELETE FROM password_reset_tokens;
DELETE FROM likes;
DELETE FROM comments;
DELETE FROM forum_likes;
DELETE FROM forum_comments;
DELETE FROM order_items;
DELETE FROM order_payments;
DELETE FROM payout_order_mapping;
DELETE FROM cart_items;
DELETE FROM notifications;
DELETE FROM user_consents;
DELETE FROM posts;
DELETE FROM forum_posts;
DELETE FROM orders;
DELETE FROM seller_payouts;
DELETE FROM platform_transactions;
DELETE FROM addresses;
DELETE FROM payment_history;
DELETE FROM products;
DELETE FROM shops;
DELETE FROM seller_bank_details;
DELETE FROM subscriptions;

-- 3b – Delete only non-admin users (keep role IN ('admin','superadmin'))
DELETE FROM users WHERE role NOT IN ('admin', 'superadmin');

-- Optional: if you also want to remove admin users and start with zero users,
-- run this after 3a (and skip 3b):
-- DELETE FROM users;


-- -----------------------------------------------------------------------------
-- 4. SELECTIVE: Remove only test/dev users (and their data via CASCADE)
-- -----------------------------------------------------------------------------
-- Option A: Delete users by email pattern (e.g. test@, demo@, dev@)
-- Replace the pattern with your convention. Their related rows will need
-- to be deleted first if you don’t use ON DELETE CASCADE on all FKs.

/*
DELETE FROM auth_otps WHERE email LIKE 'test%' OR email LIKE 'demo%';
DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test%' OR email LIKE 'demo%');
-- Then delete from child tables that reference users, then:
DELETE FROM users WHERE email LIKE 'test%' OR email LIKE 'demo%';
*/

-- Option B: Delete users created before a certain date (e.g. dev period)
/*
DELETE FROM users WHERE created_at < '2025-01-01 00:00:00+00';
*/
-- (Run only if your schema uses ON DELETE CASCADE on user_id; otherwise
--  delete from dependent tables first, in dependency order.)


-- -----------------------------------------------------------------------------
-- 5. TRANSACTIONAL CLEANUP: Remove orders/cart/posts, keep users and shops
-- -----------------------------------------------------------------------------
-- Use when you want to keep users and shops but clear orders, cart, and
-- community/forum content for a fresh start.

/*
DELETE FROM order_items;
DELETE FROM order_payments;
DELETE FROM payout_order_mapping;
DELETE FROM cart_items;
DELETE FROM notifications;
DELETE FROM user_consents;
DELETE FROM likes;
DELETE FROM comments;
DELETE FROM posts;
DELETE FROM forum_likes;
DELETE FROM forum_comments;
DELETE FROM forum_posts;
DELETE FROM orders;
DELETE FROM seller_payouts;
DELETE FROM platform_transactions;
DELETE FROM payment_history;
DELETE FROM products;
-- Optional: also clear shops and seller_bank_details if you want empty marketplace:
-- DELETE FROM seller_bank_details;
-- DELETE FROM shops;
*/


-- -----------------------------------------------------------------------------
-- 6. STORAGE CLEANUP (Supabase Dashboard or API)
-- -----------------------------------------------------------------------------
-- SQL does not delete files in Supabase Storage. After wiping posts/products:
-- 1. Open Supabase → Storage → bucket "uploads".
-- 2. Delete folders/files under community/, products/ as needed.
-- Or use Storage API in a script to remove objects by prefix.
-- =============================================================================
