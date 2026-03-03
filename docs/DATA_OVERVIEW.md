# House of Jainz – Data Overview

Summary of database tables (Supabase/PostgreSQL) and how they relate. Use this to understand the data model before running any cleanup.

---

## 1. Core tables and relationships

### Users and auth
| Table | Purpose | Key relations |
|-------|---------|----------------|
| **users** | App users (email, name, religion, role). | Referenced by almost every other table. |
| **auth_otps** | OTP codes for email login (no FK to users). | Standalone; clean expired for hygiene. |
| **password_reset_tokens** | Reset links (user_id). | Delete when going live or keep and expire. |

### Community (feed, posts, likes, comments)
| Table | Purpose | Key relations |
|-------|---------|----------------|
| **posts** | Community posts (content, image_url, location, user_id). | users → posts; posts → likes, comments. |
| **likes** | Like on a post (post_id, user_id). | posts, users. |
| **comments** | Comment on a post (post_id, user_id, content). | posts, users. |

### Forum
| Table | Purpose | Key relations |
|-------|---------|----------------|
| **forum_posts** | Forum text posts (category_slug, content, user_id). | users. |
| **forum_likes** | Like on forum post. | forum_posts, users. |
| **forum_comments** | Comment on forum post. | forum_posts, users. |

### Marketplace (shops, products, cart, orders)
| Table | Purpose | Key relations |
|-------|---------|----------------|
| **shops** | Seller shops (owner_id, name, location). | users. |
| **products** | Products (shop_id, name, price, stock, image_url). | shops. |
| **cart_items** | User cart (user_id, product_id, quantity). | users, products. |
| **addresses** | User addresses (user_id). | users. |
| **orders** | Order header (user_id, shop_id, address_id, total, status, payment/escrow fields). | users, shops, addresses. |
| **order_items** | Order line items (order_id, product_id, quantity, price). | orders, products. |

### Payments and payouts
| Table | Purpose | Key relations |
|-------|---------|----------------|
| **order_payments** | Razorpay payment attempts per order. | orders, users. |
| **seller_payouts** | Payout records to sellers. | users, shops. |
| **payout_order_mapping** | Which orders are in which payout. | seller_payouts, orders. |
| **seller_bank_details** | Sellers’ bank/UPI details. | users. |
| **platform_transactions** | Audit log of platform money flow. | user_id optional. |
| **platform_settings** | Config (escrow days, commission %, etc.). | No FKs; reference data. |
| **payment_history** | Legacy payment attempts (subscriptions). | users, subscriptions. |

### Other
| Table | Purpose | Key relations |
|-------|---------|----------------|
| **notifications** | In-app notifications (user_id). | users. |
| **user_consents** | Terms/privacy/cookie consent (user_id). | users. |
| **consent_documents** | Legal document versions. | No FKs; reference data. |
| **subscriptions** | Subscription plans (if used). | users. |

### Storage (Supabase Storage)
- **uploads** bucket: community post images, product images (paths like `community/...`, `products/...`). Not deleted by SQL; use Supabase Dashboard or Storage API to clean if needed.

---

## 2. Dependency order (for deletes)

When deleting or truncating, respect foreign keys. Typical order (children before parents):

1. **auth_otps** (no FK)
2. **password_reset_tokens**
3. **likes**, **comments** (community)
4. **forum_likes**, **forum_comments**
5. **order_items**, **order_payments**
6. **payout_order_mapping**
7. **cart_items**
8. **notifications**, **user_consents**
9. **posts**, **forum_posts**
10. **orders**, **seller_payouts**, **platform_transactions**, **addresses**, **payment_history**
11. **products**
12. **shops**, **seller_bank_details**
13. **subscriptions**
14. **users**

**Do not truncate** (or re-seed after): **consent_documents**, **platform_settings** (reference/configuration data).

---

## 3. Useful counts (before/after cleanup)

Run in Supabase SQL Editor to inspect:

```sql
SELECT 'users' AS tbl, COUNT(*) FROM users
UNION ALL SELECT 'posts', COUNT(*) FROM posts
UNION ALL SELECT 'likes', COUNT(*) FROM likes
UNION ALL SELECT 'comments', COUNT(*) FROM comments
UNION ALL SELECT 'forum_posts', COUNT(*) FROM forum_posts
UNION ALL SELECT 'forum_likes', COUNT(*) FROM forum_likes
UNION ALL SELECT 'forum_comments', COUNT(*) FROM forum_comments
UNION ALL SELECT 'shops', COUNT(*) FROM shops
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'cart_items', COUNT(*) FROM cart_items
UNION ALL SELECT 'addresses', COUNT(*) FROM addresses
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'order_payments', COUNT(*) FROM order_payments
UNION ALL SELECT 'seller_payouts', COUNT(*) FROM seller_payouts
UNION ALL SELECT 'payout_order_mapping', COUNT(*) FROM payout_order_mapping
UNION ALL SELECT 'seller_bank_details', COUNT(*) FROM seller_bank_details
UNION ALL SELECT 'platform_transactions', COUNT(*) FROM platform_transactions
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'user_consents', COUNT(*) FROM user_consents
UNION ALL SELECT 'auth_otps', COUNT(*) FROM auth_otps
UNION ALL SELECT 'password_reset_tokens', COUNT(*) FROM password_reset_tokens
UNION ALL SELECT 'consent_documents', COUNT(*) FROM consent_documents
UNION ALL SELECT 'platform_settings', COUNT(*) FROM platform_settings;
```
