const express = require('express');
const supabase = require('../config/supabase');
const { requireAdmin, requireSuperAdmin } = require('../middleware/admin');

const router = express.Router();

// ==================== DASHBOARD STATS ====================
router.get('/dashboard/stats', requireAdmin, async (req, res) => {
  try {
    const { location } = req.query;

    // Build base queries
    let usersQuery = supabase.from('users').select('id', { count: 'exact', head: true });
    let shopsQuery = supabase.from('shops').select('id', { count: 'exact', head: true }).eq('is_active', true);
    let productsQuery = supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true);
    let postsQuery = supabase.from('posts').select('id', { count: 'exact', head: true });
    let ordersQuery = supabase.from('orders').select('id', { count: 'exact', head: true });

    // Apply location filter if provided
    if (location) {
      shopsQuery = shopsQuery.ilike('location', `%${location}%`);
      productsQuery = productsQuery.ilike('shop.location', `%${location}%`);
      postsQuery = postsQuery.ilike('location', `%${location}%`);
    }

    const [usersCount, shopsCount, productsCount, postsCount, ordersCount] = await Promise.all([
      usersQuery,
      shopsQuery,
      productsQuery,
      postsQuery,
      ordersQuery,
    ]);

    res.json({
      stats: {
        totalUsers: usersCount.count || 0,
        totalShops: shopsCount.count || 0,
        totalProducts: productsCount.count || 0,
        totalPosts: postsCount.count || 0,
        totalOrders: ordersCount.count || 0,
      },
      location: location || 'all',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== USER MANAGEMENT ====================
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { location, page = 1, limit = 20, role, search } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('users')
      .select('id, email, name, religion, phone, role, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (role) {
      query = query.eq('role', role);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      users: users || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
        hasMore: pageNum < Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:userId/role', requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id, email, name, role')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:userId', requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent deleting yourself
    if (userId === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const { error } = await supabase.from('users').delete().eq('id', userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== MARKETPLACE MANAGEMENT ====================
router.get('/marketplace/shops', requireAdmin, async (req, res) => {
  try {
    const { location, page = 1, limit = 20, search } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('shops')
      .select(
        `
        *,
        owner:users(id, name, email)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: shops, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      shops: shops || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
        hasMore: pageNum < Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/marketplace/shops/:shopId/status', requireAdmin, async (req, res) => {
  try {
    const { shopId } = req.params;
    const { is_active } = req.body;

    const { data: updatedShop, error } = await supabase
      .from('shops')
      .update({ is_active: is_active !== false, updated_at: new Date().toISOString() })
      .eq('id', shopId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ shop: updatedShop });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/marketplace/shops/:shopId', requireSuperAdmin, async (req, res) => {
  try {
    const { shopId } = req.params;

    // Delete shop (cascade will delete products and orders)
    const { error } = await supabase.from('shops').delete().eq('id', shopId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Shop deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/marketplace/products', requireAdmin, async (req, res) => {
  try {
    const { location, shopId, page = 1, limit = 20, search } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('products')
      .select(
        `
        *,
        shop:shops(id, name, location, owner_id)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (location) {
      query = query.ilike('shop.location', `%${location}%`);
    }

    if (shopId) {
      query = query.eq('shop_id', shopId);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: products, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      products: products || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
        hasMore: pageNum < Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/marketplace/products/:productId/status', requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const { is_active } = req.body;

    const { data: updatedProduct, error } = await supabase
      .from('products')
      .update({ is_active: is_active !== false, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ product: updatedProduct });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/marketplace/products/:productId', requireSuperAdmin, async (req, res) => {
  try {
    const { productId } = req.params;

    // Get product to delete image
    const { data: product } = await supabase.from('products').select('image_url').eq('id', productId).single();

    // Delete image from storage if exists
    if (product?.image_url) {
      const urlParts = product.image_url.split('/');
      const fileNameIndex = urlParts.findIndex((part) => part === 'products');
      if (fileNameIndex !== -1) {
        const fileName = urlParts.slice(fileNameIndex).join('/');
        await supabase.storage.from('uploads').remove([fileName]);
      }
    }

    const { error } = await supabase.from('products').delete().eq('id', productId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== COMMUNITY MANAGEMENT ====================
router.get('/community/posts', requireAdmin, async (req, res) => {
  try {
    const { location, page = 1, limit = 20, search } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('posts')
      .select(
        `
        *,
        user:users(id, name, email)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    if (search) {
      query = query.ilike('content', `%${search}%`);
    }

    const { data: posts, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Get likes and comments count for each post
    const postsWithStats = await Promise.all(
      (posts || []).map(async (post) => {
        const { count: likesCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);
        const { count: commentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        return {
          ...post,
          likesCount: likesCount || 0,
          commentsCount: commentsCount || 0,
        };
      })
    );

    res.json({
      posts: postsWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
        hasMore: pageNum < Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/community/posts/:postId', requireAdmin, async (req, res) => {
  try {
    const { postId } = req.params;

    // Get post to delete image
    const { data: post } = await supabase.from('posts').select('image_url').eq('id', postId).single();

    // Delete associated likes and comments
    await supabase.from('likes').delete().eq('post_id', postId);
    await supabase.from('comments').delete().eq('post_id', postId);

    // Delete image from storage if exists
    if (post?.image_url) {
      const urlParts = post.image_url.split('/');
      const fileNameIndex = urlParts.findIndex((part) => part === 'community');
      if (fileNameIndex !== -1) {
        const fileName = urlParts.slice(fileNameIndex).join('/');
        await supabase.storage.from('uploads').remove([fileName]);
      }
    }

    const { error } = await supabase.from('posts').delete().eq('id', postId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ORDERS MANAGEMENT ====================
router.get('/orders', requireAdmin, async (req, res) => {
  try {
    const { location, status, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('orders')
      .select(
        `
        *,
        user:users(id, name, email),
        shop:shops(id, name, location),
        address:addresses(*),
        items:order_items(
          *,
          product:products(id, name, price)
        )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (location) {
      query = query.ilike('shop.location', `%${location}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      orders: orders || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
        hasMore: pageNum < Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

