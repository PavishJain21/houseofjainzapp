const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken, requireNotGuest } = require('../middleware/auth');
const { roundPrice } = require('../utils/commission');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { notifyOrderStatusChanged } = require('../utils/notifications');

const router = express.Router();

// Configure multer for product images - use memory storage for React Native compatibility
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage, // Use memory storage instead of disk storage
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file allowed
  },
  fileFilter: (req, file, cb) => {
    // Allowed image extensions
    const allowedExtensions = /jpeg|jpg|png|gif|webp/;
    // Allowed MIME types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype.toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    
    // Provide specific error message
    cb(new Error('Only image files are allowed (JPG, PNG, GIF, WEBP). Maximum size: 5MB'));
  }
});

// Get seller's shops (guest gets empty)
router.get('/shops', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'guest') return res.json({ shops: [] });
    const userId = req.user.userId;

    const { data: shops, error } = await supabase
      .from('shops')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ shops });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload image to Supabase Storage (separate endpoint)
// Supports both FormData (multer) and base64 JSON
router.post('/upload-image', authenticateToken, requireNotGuest, (req, res, next) => {
  console.log('Product upload endpoint hit');
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
    // Handle FormData upload with multer
    return upload.single('image')(req, res, (err) => {
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
    const fileNameParam = req.body.fileName || 'product.jpg';
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

    const fileName = `products/${userId}-${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
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
    console.log('Processing FormData image upload');
    console.log('Request file:', req.file ? `File received: ${req.file.originalname}, size: ${req.file.size}` : 'No file');
    
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No image file provided. Please ensure the image is selected and try again.' });
    }

    const userId = req.user.userId;
    console.log('User ID:', userId);
    
    const fileBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;
    const fileExtension = path.extname(req.file.originalname) || '.jpg';
    
    console.log('File buffer size:', fileBuffer.length);
    console.log('File mimetype:', mimeType);

    if (!fileBuffer || fileBuffer.length === 0) {
      console.error('File buffer is empty!');
      return res.status(400).json({ error: 'Image file is empty or corrupted' });
    }

    const fileName = `products/${userId}-${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
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

// Add product to shop (now accepts image_url instead of file)
router.post('/products', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { shopId, name, description, price, category, stock, imageUrl } = req.body;
    const userId = req.user.userId;

    // Verify shop ownership
    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('id', shopId)
      .eq('owner_id', userId)
      .single();

    if (!shop) {
      return res.status(403).json({ error: 'You do not own this shop' });
    }

    // Check product limit (max 100 products per user)
    const { data: userShops } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', userId);

    if (userShops && userShops.length > 0) {
      const shopIds = userShops.map(shop => shop.id);
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .in('shop_id', shopIds);

      if (productCount >= 100) {
        return res.status(403).json({ 
          error: `Product limit reached. You have ${productCount}/100 products. You cannot add more products.`,
          limitReached: true,
          currentCount: productCount,
          limit: 100
        });
      }
    }

    const productPrice = roundPrice(parseFloat(price));

    const { data: product, error } = await supabase
      .from('products')
      .insert([
        {
          shop_id: shopId,
          name,
          description,
          price: productPrice,
          category: category || null,
          stock: parseInt(stock) || 0,
          image_url: imageUrl,
          is_active: true,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ 
      product
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product
router.put('/products/:productId', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, description, price, category, stock, imageUrl } = req.body;
    const userId = req.user.userId;

    // Verify product ownership through shop
    const { data: product } = await supabase
      .from('products')
      .select(`
        id,
        shop_id,
        shop:shops(owner_id)
      `)
      .eq('id', productId)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.shop.owner_id !== userId) {
      return res.status(403).json({ error: 'You do not own this product' });
    }

    const updateData = {
      name,
      description: description || null,
      price: parseFloat(price),
      category: category || null,
      stock: parseInt(stock) || 0,
      updated_at: new Date().toISOString()
    };

    // Only update image if provided
    if (imageUrl !== undefined) {
      updateData.image_url = imageUrl;
    }

    const { data: updatedProduct, error } = await supabase
      .from('products')
      .update(updateData)
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

// Delete product (only by shop owner)
router.delete('/products/:productId', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.userId;

    // Verify product ownership through shop
    const { data: product } = await supabase
      .from('products')
      .select(`
        id,
        shop_id,
        image_url,
        shop:shops(owner_id)
      `)
      .eq('id', productId)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.shop.owner_id !== userId) {
      return res.status(403).json({ error: 'You do not own this product' });
    }

    // Check if product is in any active cart
    const { data: cartItems } = await supabase
      .from('cart_items')
      .select('id')
      .eq('product_id', productId)
      .limit(1);

    if (cartItems && cartItems.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete product. It is currently in someone\'s cart. Please mark it as inactive instead.' 
      });
    }

    // Delete the product
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }

    // Delete image from storage if it exists
    if (product.image_url) {
      try {
        // Extract file path from URL
        const urlParts = product.image_url.split('/');
        const fileNameIndex = urlParts.findIndex(part => part === 'products');
        if (fileNameIndex !== -1) {
          const fileName = urlParts.slice(fileNameIndex).join('/');
          const { error: storageError } = await supabase.storage
            .from('uploads')
            .remove([fileName]);
          
          if (storageError) {
            console.error('Error deleting image from storage:', storageError);
            // Don't fail the request if image deletion fails
          }
        }
      } catch (storageError) {
        // Log but don't fail if image deletion fails
        console.error('Error deleting image from storage:', storageError);
      }
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get seller's products
router.get('/products', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { shopId, page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // If shopId is provided, verify ownership first
    if (shopId) {
      const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .eq('id', shopId)
        .eq('owner_id', userId)
        .single();

      if (!shop) {
        return res.status(403).json({ error: 'You do not own this shop' });
      }
    }

    // Get seller's shops first to filter products
    const { data: userShops } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', userId);

    if (!userShops || userShops.length === 0) {
      return res.json({ 
        products: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 0,
          totalPages: 0,
          hasMore: false,
        }
      });
    }

    const shopIds = userShops.map((shop) => shop.id);

    // Build query for products
    let query = supabase
      .from('products')
      .select(`
        *,
        shop:shops(id, name, owner_id)
      `, { count: 'exact' })
      .in('shop_id', shopIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    // If specific shopId is provided, filter by it
    if (shopId) {
      query = query.eq('shop_id', shopId);
    }

    const { data: products, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const totalPages = Math.ceil((count || 0) / limitNum);
    const hasMore = pageNum < totalPages;

    res.json({ 
      products: products || [],
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

// Update product
router.put('/products/:productId', authenticateToken, requireNotGuest, upload.single('image'), async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, description, price, category, stock, is_active } = req.body;
    const userId = req.user.userId;

    // Verify product ownership
    const { data: product } = await supabase
      .from('products')
      .select(`
        *,
        shop:shops(owner_id)
      `)
      .eq('id', productId)
      .single();

    if (!product || product.shop.owner_id !== userId) {
      return res.status(403).json({ error: 'You do not own this product' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (price) updateData.price = parseFloat(price);
    if (category) updateData.category = category;
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (is_active !== undefined) updateData.is_active = is_active === 'true';
    if (req.file) updateData.image_url = `/uploads/products/${req.file.filename}`;

    const { data: updatedProduct, error } = await supabase
      .from('products')
      .update(updateData)
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

// Get seller's orders
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status } = req.query;

    // First, get all shops owned by the user
    const { data: userShops, error: shopsError } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', userId);

    if (shopsError) {
      return res.status(400).json({ error: shopsError.message });
    }

    if (!userShops || userShops.length === 0) {
      return res.json({ orders: [] });
    }

    const shopIds = userShops.map(shop => shop.id);

    // Then get orders for those shops
    let query = supabase
      .from('orders')
      .select(`
        *,
        shop:shops(id, name, owner_id),
        user:users(id, name, email, phone),
        address:addresses(*),
        items:order_items(
          *,
          product:products(id, name, price, image_url)
        )
      `)
      .in('shop_id', shopIds);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ orders: orders || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status
router.put('/orders/:orderId/status', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // First, get the order with shop_id
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          *,
          product:products(id, stock, name)
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order fetch error:', orderError);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify the shop belongs to the user
    if (!order.shop_id) {
      return res.status(404).json({ error: 'Order does not have a shop associated' });
    }

    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id, owner_id')
      .eq('id', order.shop_id)
      .single();

    if (shopError || !shop) {
      console.error('Shop fetch error:', shopError);
      return res.status(404).json({ error: 'Shop not found for this order' });
    }

    if (shop.owner_id !== userId) {
      console.error('Ownership mismatch:', { shopOwnerId: shop.owner_id, userId, orderId });
      return res.status(403).json({ error: 'You do not own this order' });
    }

    // Validate status transitions - enforce forward-only progression
    const currentStatus = order.status;
    
    // Define valid status transitions (forward only)
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'], // Can confirm or cancel
      'confirmed': ['shipped'], // Can only move forward to shipped
      'processing': ['shipped'], // Can only move forward to shipped (processing is same as confirmed)
      'shipped': ['delivered'], // Can only move forward to delivered
      'delivered': [], // Final status - no changes allowed
      'cancelled': [], // Final status - no changes allowed
    };

    // Check if transition is valid
    if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(status)) {
      // Special case: if trying to cancel from pending, allow it
      if (currentStatus === 'pending' && status === 'cancelled') {
        // This is already in validTransitions, so this shouldn't happen, but keep for safety
      } else {
        const allowedStatuses = validTransitions[currentStatus] || [];
        return res.status(400).json({ 
          error: `Invalid status transition. Current status: ${currentStatus}. Allowed transitions: ${allowedStatuses.join(', ') || 'none (final status)'}` 
        });
      }
    }

    // Prevent backward transitions explicitly
    const statusOrder = ['pending', 'confirmed', 'shipped', 'delivered'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const newIndex = statusOrder.indexOf(status);
    
    if (currentIndex !== -1 && newIndex !== -1 && newIndex < currentIndex && status !== 'cancelled') {
      return res.status(400).json({ 
        error: 'Cannot move order status backward. Only forward progression is allowed.' 
      });
    }

    // If confirming order, reduce stock atomically using database function
    if (status === 'confirmed' && order.status === 'pending') {
      // Use atomic database function to prevent race conditions
      for (const item of order.items) {
        const product = item.product;
        
        // Call atomic stock reduction function (thread-safe)
        const { data: result, error: rpcError } = await supabase.rpc('reduce_product_stock', {
          p_product_id: product.id,
          p_quantity: item.quantity
        });

        if (rpcError) {
          console.error('RPC Error for product:', product.id, rpcError);
          return res.status(400).json({ 
            error: `Failed to update stock: ${rpcError.message}` 
          });
        }

        // Check result structure - Supabase RPC returns JSON object
        if (!result) {
          console.error('No result from RPC for product:', product.id);
          return res.status(400).json({ error: 'Failed to update stock: No result from database function' });
        }

        // Log result for debugging
        console.log('RPC result for product:', product.id, JSON.stringify(result));

        // Handle result format (should be JSON object with success property)
        // Supabase RPC returns the JSON directly, so result should be the JSON object
        const success = result && typeof result === 'object' && result.success === true;
        if (!success) {
          const errorMsg = (result && result.error) || (result && result.message) || 'Failed to update stock';
          const productName = product.name || 'Unknown product';
          console.error('Stock reduction failed for product:', productName, errorMsg);
          return res.status(400).json({ 
            error: errorMsg.includes('Insufficient') 
              ? errorMsg 
              : `Failed to update stock for ${productName}. ${errorMsg}` 
          });
        }
      }
    }

    // If cancelling order that had stock reduced, restore stock atomically
    // Only restore stock if order was confirmed/processing (stock was already reduced)
    // Pending orders don't have stock reduced, so no need to restore
    if (status === 'cancelled' && (order.status === 'confirmed' || order.status === 'processing')) {
      for (const item of order.items) {
        const product = item.product;
        
        // Call atomic stock restoration function (thread-safe)
        const { data: result, error: rpcError } = await supabase.rpc('restore_product_stock', {
          p_product_id: product.id,
          p_quantity: item.quantity
        });

        if (rpcError || !result || !result.success) {
          console.error(`Failed to restore stock for product ${product.id}:`, rpcError || result?.error);
          // Don't fail the cancellation if stock restore fails, but log it
        }
      }
    }
    // Note: Cancelling from pending doesn't restore stock because stock was never reduced

    // Use optimistic locking: only update if status hasn't changed (prevents concurrent updates)
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('status', order.status) // Optimistic locking: only update if status matches
      .select()
      .single();

    if (error) {
      console.error('Error updating order status:', error);
      return res.status(400).json({ error: error.message || 'Failed to update order status' });
    }

    if (!updatedOrder) {
      // Status was changed by another request, fetch current status
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();
      
      if (currentOrder && currentOrder.status !== order.status) {
        return res.status(409).json({ 
          error: `Order status was already changed to ${currentOrder.status}. Please refresh and try again.` 
        });
      }
      
      console.error('Order update returned no data. Order ID:', orderId, 'Current status:', order.status, 'New status:', status);
      return res.status(400).json({ error: 'Failed to update order status. Please try again.' });
    }

    // Notify customer about status change (order.user_id is already available from the initial query)
    if (order.user_id && updatedOrder.status !== order.status) {
      try {
        await notifyOrderStatusChanged(updatedOrder, order.user_id, updatedOrder.status, order.status);
      } catch (notifyError) {
        // Log notification error but don't fail the status update
        console.error('Error sending notification:', notifyError);
      }
    }

    res.json({ order: updatedOrder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

