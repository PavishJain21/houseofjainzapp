const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for image uploads - use memory storage for React Native compatibility
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  },
});

// Accept 'image', 'file', or 'photo' so web browser and mobile both work
const uploadAnyImage = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 },
  { name: 'photo', maxCount: 1 },
]);

// Upload image to Supabase Storage (separate endpoint)
// Supports both FormData (multer) and base64 JSON
router.post('/upload-image', authenticateToken, (req, res, next) => {
  console.log('Upload endpoint hit');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Request body type:', typeof req.body);
  console.log('Request body keys:', req.body ? Object.keys(req.body) : 'No body');
  
  // Check if request contains base64 image (JSON body)
  // express.json() middleware should have already parsed it
  if (req.body && req.body.imageBase64) {
    console.log('Detected base64 upload');
    // Handle base64 upload directly
    return handleBase64Upload(req, res);
  } else {
    console.log('Detected FormData upload, using multer');
    return uploadAnyImage(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ error: err.message || 'File upload error' });
      }
      return handleFormDataUpload(req, res);
    });
  }
});

async function handleBase64Upload(req, res) {
  try {
    console.log('Processing base64 image upload');
    console.log('Request body:', req.body);
    console.log('Request body keys:', Object.keys(req.body || {}));
    console.log('Request body type:', typeof req.body);
    
    if (!req.body) {
      console.error('Request body is missing!');
      return res.status(400).json({ error: 'Request body is missing. Please ensure Content-Type is application/json.' });
    }
    
    if (!req.body.imageBase64) {
      console.error('imageBase64 field is missing in request body');
      console.error('Available fields:', Object.keys(req.body));
      return res.status(400).json({ error: 'No image data provided. Please provide imageBase64 in request body.' });
    }

    const userId = req.user.userId;
    console.log('User ID:', userId);
    
    const base64Data = req.body.imageBase64;
    const mimeType = req.body.mimeType || 'image/jpeg';
    const fileNameParam = req.body.fileName || 'photo.jpg';
    const fileExtension = path.extname(fileNameParam) || '.jpg';
    
    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64String = base64Data.includes(',') 
      ? base64Data.split(',')[1] 
      : base64Data;
    
    // Convert base64 to buffer
    const fileBuffer = Buffer.from(base64String, 'base64');
    console.log('Base64 converted to buffer, size:', fileBuffer.length);
    
    if (!fileBuffer || fileBuffer.length === 0) {
      console.error('File buffer is empty after base64 conversion!');
      return res.status(400).json({ error: 'Image file is empty or corrupted' });
    }

    const fileName = `community/${userId}-${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
    console.log('File name:', fileName);

    // Upload to Supabase Storage
    console.log('Uploading to Supabase Storage bucket: uploads');
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage error:', error);
      return res.status(500).json({ 
        error: `Failed to upload image to storage: ${error.message}` 
      });
    }

    console.log('File uploaded successfully, data:', data);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(fileName);

    console.log('Public URL:', urlData.publicUrl);

    res.status(200).json({
      imageUrl: urlData.publicUrl,
      fileName: fileName,
    });
  } catch (error) {
    console.error('Base64 upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
}

async function handleFormDataUpload(req, res) {
  try {
    // Support field names: image, file, photo (web often uses 'file')
    const file =
      (req.files && (req.files['image']?.[0] || req.files['file']?.[0] || req.files['photo']?.[0])) ||
      req.file;

    console.log('Processing FormData image upload');
    console.log('Request file:', file ? `File received: ${file.originalname}, size: ${file.size}` : 'No file');

    if (!file) {
      console.error('No file in request. Use FormData with field name: image, file, or photo');
      return res.status(400).json({
        error: 'No image file provided. Use FormData and append the image under the field name "image", "file", or "photo".',
      });
    }

    const userId = req.user.userId;
    console.log('User ID:', userId);

    const fileBuffer = file.buffer;
    const mimeType = file.mimetype;
    const fileExtension = path.extname(file.originalname) || '.jpg';
    
    console.log('File buffer size:', fileBuffer.length);
    console.log('File mimetype:', mimeType);

    if (!fileBuffer || fileBuffer.length === 0) {
      console.error('File buffer is empty!');
      return res.status(400).json({ error: 'Image file is empty or corrupted' });
    }

    const fileName = `community/${userId}-${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
    console.log('File name:', fileName);

    // Upload to Supabase Storage
    console.log('Uploading to Supabase Storage bucket: uploads');
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage error:', error);
      return res.status(500).json({ 
        error: `Failed to upload image to storage: ${error.message}` 
      });
    }

    console.log('File uploaded successfully, data:', data);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(fileName);

    console.log('Public URL:', urlData.publicUrl);

    res.status(200).json({
      imageUrl: urlData.publicUrl,
      fileName: fileName,
    });
  } catch (error) {
    console.error('FormData upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
}

// Create post (now accepts imageUrl instead of file)
router.post('/posts', authenticateToken, async (req, res) => {
  try {
    console.log('Create post endpoint called');
    const { content, location, imageUrl } = req.body;
    const userId = req.user.userId;
    
    console.log('Post data:', { content, location, hasImageUrl: !!imageUrl });

    console.log('Creating post in database with imageUrl:', imageUrl ? 'URL set' : 'No image');
    
    const { data: post, error } = await supabase
      .from('posts')
      .insert([
        {
          user_id: userId,
          content,
          image_url: imageUrl,
          location: location || null,
          created_at: new Date().toISOString()
        }
      ])
      .select(`
        *,
        user:users(id, name, email)
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('Post created successfully:', post.id);
    res.status(201).json({ post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all posts with pagination
router.get('/posts', authenticateToken, async (req, res) => {
  try {
    const { location, page = 1, limit = 10 } = req.query;
    const userId = req.user.userId;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('posts')
      .select(`
        *,
        user:users(id, name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (location) {
      query = query.eq('location', location);
    }

    const { data: posts, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Get likes and comments count, and check if user liked each post
    const postsWithStats = await Promise.all(
      posts.map(async (post) => {
        // Get likes count
        const { count: likesCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        // Get comments count
        const { count: commentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        // Check if current user liked this post
        const { data: userLike } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', userId)
          .single();

        return {
          ...post,
          likesCount: likesCount || 0,
          commentsCount: commentsCount || 0,
          isLiked: !!userLike,
          isOwnPost: post.user_id === userId, // Add flag to identify own posts
        };
      })
    );

    const totalPages = Math.ceil((count || 0) / limitNum);
    const hasMore = pageNum < totalPages;

    res.json({ 
      posts: postsWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages,
        hasMore,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like post
router.post('/posts/:postId/like', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // Unlike
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
      
      return res.json({ message: 'Post unliked', liked: false });
    }

    // Like
    const { data: like, error } = await supabase
      .from('likes')
      .insert([
        {
          post_id: postId,
          user_id: userId,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Post liked', liked: true, like });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Comment on post
router.post('/posts/:postId/comments', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    const { data: comment, error } = await supabase
      .from('comments')
      .insert([
        {
          post_id: postId,
          user_id: userId,
          content,
          created_at: new Date().toISOString()
        }
      ])
      .select(`
        *,
        user:users(id, name, email)
      `)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ comment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get comments for a post with pagination
router.get('/posts/:postId/comments', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const { data: comments, error, count } = await supabase
      .from('comments')
      .select(`
        *,
        user:users(id, name, email)
      `, { count: 'exact' })
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const totalPages = Math.ceil((count || 0) / limitNum);
    const hasMore = pageNum < totalPages;

    res.json({ 
      comments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages,
        hasMore,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's own posts (paginated)
router.get('/posts/my-posts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(20, Math.max(5, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const { data: posts, error, count } = await supabase
      .from('posts')
      .select(`
        *,
        user:users(id, name, email)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

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
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
        };
      })
    );

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limitNum);
    const hasMore = pageNum < totalPages;

    res.json({
      posts: postsWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete post (only by owner)
router.delete('/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    // First, check if post exists and belongs to user
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('id, user_id, image_url')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user owns the post
    if (post.user_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    // Delete associated likes
    await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId);

    // Delete associated comments
    await supabase
      .from('comments')
      .delete()
      .eq('post_id', postId);

    // Delete the post
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', userId);

    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }

    // Optionally delete image from storage if it exists
    if (post.image_url) {
      try {
        // Extract file path from URL
        const urlParts = post.image_url.split('/');
        const fileName = urlParts.slice(urlParts.indexOf('community')).join('/');
        await supabase.storage
          .from('uploads')
          .remove([fileName]);
      } catch (storageError) {
        // Log but don't fail if image deletion fails
        console.error('Error deleting image from storage:', storageError);
      }
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

