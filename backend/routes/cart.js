const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken, requireNotGuest } = require('../middleware/auth');

const router = express.Router();

// Get cart (guest gets empty cart)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'guest') {
      return res.json({ cartItems: [], total: 0 });
    }
    const userId = req.user.userId;

    const { data: cartItems, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        product:products(id, name, price, image_url, shop_id)
      `)
      .eq('user_id', userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const total = cartItems.reduce((sum, item) => sum + (item.quantity * item.product.price), 0);

    res.json({ cartItems, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add to cart
router.post('/add', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.userId;
    const requestedQuantity = quantity || 1;

    // Get product with shop information and current stock
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        *,
        shop:shops(owner_id)
      `)
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found or inactive' });
    }

    // Check stock availability before adding to cart
    if (product.stock < requestedQuantity) {
      return res.status(400).json({ 
        error: `Insufficient stock. Available: ${product.stock}, Requested: ${requestedQuantity}` 
      });
    }

    // Check if user is trying to buy from their own shop
    if (product.shop.owner_id === userId) {
      return res.status(403).json({ 
        error: 'You cannot buy products from your own shop' 
      });
    }

    // Check if item already in cart (with lock to prevent race conditions)
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (existingItem) {
      // Update quantity atomically
      const newQuantity = existingItem.quantity + requestedQuantity;
      
      // Re-check stock before updating cart
      const { data: currentProduct } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();
      
      if (!currentProduct || currentProduct.stock < newQuantity) {
        return res.status(400).json({ 
          error: `Insufficient stock. Available: ${currentProduct?.stock || 0}, Total in cart would be: ${newQuantity}` 
        });
      }

      const { data: updatedItem, error } = await supabase
        .from('cart_items')
        .update({ 
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingItem.id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json({ message: 'Cart updated', item: updatedItem });
    }

    // Add new item
    const { data: cartItem, error } = await supabase
      .from('cart_items')
      .insert([
        {
          user_id: userId,
          product_id: productId,
          quantity: requestedQuantity
        }
      ])
      .select()
      .single();

    if (error) {
      // Handle unique constraint violations (race condition)
      if (error.code === '23505') {
        // Item was added by another request, retry
        const { data: retryItem } = await supabase
          .from('cart_items')
          .select('*')
          .eq('user_id', userId)
          .eq('product_id', productId)
          .single();
        
        if (retryItem) {
          return res.json({ message: 'Item added to cart', item: retryItem });
        }
      }
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ message: 'Item added to cart', item: cartItem });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update cart item quantity
router.put('/:itemId', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.userId;

    if (quantity <= 0) {
      // Remove item
      await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', userId);

      return res.json({ message: 'Item removed from cart' });
    }

    const { data: updatedItem, error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Cart updated', item: updatedItem });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove from cart
router.delete('/:itemId', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.userId;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear cart
router.delete('/', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const userId = req.user.userId;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

