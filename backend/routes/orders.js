const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken, requireNotGuest } = require('../middleware/auth');
const { notifyOrderPlaced, notifyOrderStatusChanged } = require('../utils/notifications');
const { roundPrice } = require('../utils/commission');

const router = express.Router();

// Create order from cart
router.post('/checkout', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { addressId, paymentMethod } = req.body;
    const userId = req.user.userId;

    // Get cart items with current stock information (for validation)
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select(`
        *,
        product:products(id, name, price, shop_id, stock, is_active)
      `)
      .eq('user_id', userId);

    if (cartError || !cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Validate stock availability before creating orders (prevent overselling)
    for (const item of cartItems) {
      if (!item.product || !item.product.is_active) {
        return res.status(400).json({ 
          error: `Product "${item.product?.name || 'Unknown'}" is no longer available` 
        });
      }
      
      if (item.product.stock < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for "${item.product.name}". Available: ${item.product.stock}, Requested: ${item.quantity}` 
        });
      }
    }

    // Get address
    const { data: address, error: addressError } = await supabase
      .from('addresses')
      .select('*')
      .eq('id', addressId)
      .eq('user_id', userId)
      .single();

    if (addressError || !address) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    // Group items by shop
    const itemsByShop = {};
    cartItems.forEach(item => {
      const shopId = item.product.shop_id;
      if (!itemsByShop[shopId]) {
        itemsByShop[shopId] = [];
      }
      itemsByShop[shopId].push(item);
    });

    // Create orders for each shop (with rollback support for concurrency)
    const orders = [];
    const createdOrderIds = [];
    
    try {
      for (const shopId in itemsByShop) {
        const shopItems = itemsByShop[shopId];
        const subtotal = shopItems.reduce((sum, item) => 
          sum + (item.quantity * item.product.price), 0);
        const total = roundPrice(subtotal);

        // Get shop owner to check order limits
        const { data: shop } = await supabase
          .from('shops')
          .select('owner_id, name')
          .eq('id', shopId)
          .single();

        if (!shop) {
          // Rollback any created orders
          if (createdOrderIds.length > 0) {
            await supabase.from('orders').delete().in('id', createdOrderIds);
          }
          return res.status(400).json({ error: 'Shop not found' });
        }

        // Order creation allowed (subscription limits removed)

        // Re-validate stock right before creating order (double-check for race conditions)
        for (const item of shopItems) {
          const { data: currentProduct } = await supabase
            .from('products')
            .select('stock, is_active, name')
            .eq('id', item.product_id)
            .single();
          
          if (!currentProduct || !currentProduct.is_active) {
            // Rollback any created orders
            if (createdOrderIds.length > 0) {
              await supabase.from('orders').delete().in('id', createdOrderIds);
            }
            return res.status(400).json({ 
              error: `Product "${item.product?.name || 'Unknown'}" is no longer available` 
            });
          }
          
          if (currentProduct.stock < item.quantity) {
            // Rollback any created orders
            if (createdOrderIds.length > 0) {
              await supabase.from('orders').delete().in('id', createdOrderIds);
            }
            return res.status(400).json({ 
              error: `Insufficient stock for "${currentProduct.name || item.product.name}". Available: ${currentProduct.stock}, Requested: ${item.quantity}` 
            });
          }
        }

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert([
            {
              user_id: userId,
              shop_id: shopId,
              address_id: addressId,
              total_amount: total,
              commission_amount: 0,
              status: 'pending',
              payment_method: paymentMethod || 'cash_on_delivery',
              created_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (orderError) {
          // Rollback any created orders
          if (createdOrderIds.length > 0) {
            await supabase.from('orders').delete().in('id', createdOrderIds);
          }
          return res.status(400).json({ error: orderError.message });
        }

        createdOrderIds.push(order.id);

        // Create order items
        const orderItems = shopItems.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.product.price
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) {
          // Rollback order and order items
          await supabase.from('orders').delete().eq('id', order.id);
          if (createdOrderIds.length > 1) {
            await supabase.from('orders').delete().in('id', createdOrderIds.slice(0, -1));
          }
          return res.status(400).json({ error: itemsError.message });
        }

        orders.push(order);

        // Notify shop owner about new order (shop already fetched above)
        if (shop && shop.owner_id) {
          await notifyOrderPlaced(order, shop.owner_id);
        }
      }

      // Clear cart only after all orders are successfully created
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);
    } catch (error) {
      // Rollback: delete any created orders
      if (createdOrderIds.length > 0) {
        await supabase.from('orders').delete().in('id', createdOrderIds);
      }
      throw error;
    }

    res.status(201).json({ 
      message: 'Order placed successfully', 
      orders 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user orders (guest gets empty)
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'guest') return res.json({ orders: [] });
    const userId = req.user.userId;

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        shop:shops(id, name),
        address:addresses(*),
        items:order_items(
          *,
          product:products(id, name, price, image_url)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get order by ID
router.get('/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        shop:shops(id, name),
        address:addresses(*),
        items:order_items(
          *,
          product:products(id, name, price, image_url)
        )
      `)
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status by customer (for received orders)
router.put('/:orderId/status', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    const validStatuses = ['delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Customers can only mark orders as delivered or cancelled' });
    }

    // Verify order belongs to user
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Only allow status updates for certain transitions
    if (status === 'delivered' && order.status !== 'shipped') {
      return res.status(400).json({ error: 'Order must be shipped before marking as delivered' });
    }

    // Only pending orders can be cancelled
    if (status === 'cancelled' && order.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending orders can be cancelled' });
    }

    // Prevent customers from changing confirmed/processing/shipped orders back to pending
    if (order.status === 'confirmed' || order.status === 'processing' || order.status === 'shipped') {
      if (status === 'pending') {
        return res.status(400).json({ error: 'Cannot change order status back to pending once it has been confirmed' });
      }
      if (status === 'cancelled') {
        return res.status(400).json({ error: 'Cannot cancel order once it has been confirmed. Please contact the seller.' });
      }
    }

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

    if (error || !updatedOrder) {
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
      
      return res.status(400).json({ error: error?.message || 'Failed to update order status' });
    }

    // Notify customer about status change
    if (updatedOrder.user_id && updatedOrder.status !== order.status) {
      await notifyOrderStatusChanged(updatedOrder, updatedOrder.user_id, updatedOrder.status, order.status);
    }

    res.json({ order: updatedOrder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

