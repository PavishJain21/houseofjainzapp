const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken, optionalAuthenticateToken, requireNotGuest } = require('../middleware/auth');

const router = express.Router();

// Static forum categories (slug, label, description)
const FORUM_CATEGORIES = [
  { slug: 'rentals', label: 'Rentals', description: 'Find or list rentals', icon: 'home-outline' },
  { slug: 'realestate', label: 'Real Estate', description: 'Buy, sell, discuss property', icon: 'business-outline' },
  { slug: 'knowledge', label: 'Knowledge', description: 'Tips, guides, and Q&A', icon: 'book-outline' },
  { slug: 'events', label: 'Events', description: 'Local events and meetups', icon: 'calendar-outline' },
];

// GET /api/forum/categories - list all categories (no auth required for listing)
router.get('/categories', (req, res) => {
  res.json({ categories: FORUM_CATEGORIES });
});

// GET /api/forum/categories/:slug/posts - list posts in category (paginated, optional auth for guests)
router.get('/categories/:slug/posts', optionalAuthenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 10, location } = req.query;
    const userId = req.user ? req.user.userId : null;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const validSlug = FORUM_CATEGORIES.some((c) => c.slug === slug);
    if (!validSlug) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    let query = supabase
      .from('forum_posts')
      .select('*, user:users(id, name, email)', { count: 'exact' })
      .eq('category_slug', slug)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (location && typeof location === 'string' && location.trim()) {
      query = query.ilike('location', `%${location.trim()}%`);
    }

    const { data: posts, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const postsWithStats = await Promise.all(
      (posts || []).map(async (post) => {
        const { count: likesCount } = await supabase
          .from('forum_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        const { count: commentsCount } = await supabase
          .from('forum_comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        let userLike = null;
        if (userId) {
          const { data } = await supabase
            .from('forum_likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', userId)
            .single();
          userLike = data;
        }

        return {
          ...post,
          likesCount: likesCount || 0,
          commentsCount: commentsCount || 0,
          isLiked: !!userLike,
          isOwnPost: userId ? post.user_id === userId : false,
        };
      })
    );

    const totalPages = Math.ceil((count || 0) / limitNum);
    res.json({
      posts: postsWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages,
        hasMore: pageNum < totalPages,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/forum/posts - create text post
router.post('/posts', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { content, category_slug, location } = req.body;
    const userId = req.user.userId;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const validSlug = FORUM_CATEGORIES.some((c) => c.slug === category_slug);
    if (!validSlug) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const { data: post, error } = await supabase
      .from('forum_posts')
      .insert([
        {
          user_id: userId,
          category_slug: category_slug,
          content: content.trim(),
          location: location && typeof location === 'string' ? location.trim() || null : null,
          created_at: new Date().toISOString(),
        },
      ])
      .select('*, user:users(id, name, email)')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      post: {
        ...post,
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        isOwnPost: true,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/forum/posts/:postId - single post (public, for shared links)
router.get('/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { data: post, error } = await supabase
      .from('forum_posts')
      .select('*, user:users(id, name, email)')
      .eq('id', postId)
      .single();

    if (error || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { count: likesCount } = await supabase
      .from('forum_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);

    const { count: commentsCount } = await supabase
      .from('forum_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);

    res.json({
      post: {
        ...post,
        likesCount: likesCount || 0,
        commentsCount: commentsCount || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/forum/posts/:postId/like - toggle like
router.post('/posts/:postId/like', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    const { data: existingLike } = await supabase
      .from('forum_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      await supabase
        .from('forum_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
      return res.json({ message: 'Post unliked', liked: false });
    }

    const { error } = await supabase.from('forum_likes').insert([
      {
        post_id: postId,
        user_id: userId,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: 'Post liked', liked: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/forum/posts/:postId/comments
router.get('/posts/:postId/comments', optionalAuthenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const { data: comments, error, count } = await supabase
      .from('forum_comments')
      .select('*, user:users(id, name, email)', { count: 'exact' })
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) return res.status(400).json({ error: error.message });

    const totalPages = Math.ceil((count || 0) / limitNum);
    res.json({
      comments: comments || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages,
        hasMore: pageNum < totalPages,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/forum/posts/:postId/comments
router.post('/posts/:postId/comments', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const { data: comment, error } = await supabase
      .from('forum_comments')
      .insert([
        {
          post_id: postId,
          user_id: userId,
          content: content.trim(),
          created_at: new Date().toISOString(),
        },
      ])
      .select('*, user:users(id, name, email)')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ comment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/forum/posts/:postId - owner only
router.delete('/posts/:postId', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    const { data: post, error: fetchError } = await supabase
      .from('forum_posts')
      .select('id, user_id')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.user_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    await supabase.from('forum_likes').delete().eq('post_id', postId);
    await supabase.from('forum_comments').delete().eq('post_id', postId);
    const { error: deleteError } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', userId);

    if (deleteError) return res.status(400).json({ error: deleteError.message });
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
