const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken, requireNotGuest } = require('../middleware/auth');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { roundPrice } = require('../utils/commission');

const router = express.Router();

// Razorpay configuration
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_Rv7BsjWbYT2sye',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'LGHs1I1QZEh65RJBmUNqmFBg'
});

// Get platform settings
async function getPlatformSetting(key, defaultValue) {
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('setting_value, data_type')
      .eq('setting_key', key)
      .single();
    
    if (!data) return defaultValue;
    
    switch (data.data_type) {
      case 'integer':
        return parseInt(data.setting_value);
      case 'decimal':
        return parseFloat(data.setting_value);
      case 'boolean':
        return data.setting_value === 'true';
      default:
        return data.setting_value;
    }
  } catch (error) {
    console.error(`Error getting platform setting ${key}:`, error);
    return defaultValue;
  }
}

// Calculate platform commission
async function calculateCommission(amount) {
  const commissionPercentage = await getPlatformSetting('platform_commission_percentage', 5);
  const commission = roundPrice((amount * commissionPercentage) / 100);
  const sellerAmount = roundPrice(amount - commission);
  
  return {
    totalAmount: amount,
    commission,
    sellerAmount,
    commissionPercentage
  };
}

// Create Razorpay order for checkout
router.post('/create-order', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { addressId } = req.body;
    const userId = req.user.userId;

    if (!addressId) {
      return res.status(400).json({ error: 'Address is required' });
    }

    // Get cart items
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

    // Validate stock and calculate total
    let totalAmount = 0;
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
      
      totalAmount += item.quantity * item.product.price;
    }

    totalAmount = roundPrice(totalAmount);
    const amountInPaise = Math.round(totalAmount * 100);

    // Create Razorpay order
    const receiptId = `order_${userId.substring(0, 8)}_${Date.now().toString().slice(-8)}`;
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: receiptId.length > 40 ? receiptId.substring(0, 40) : receiptId,
      notes: {
        userId: userId,
        addressId: addressId,
        type: 'product_order',
        itemCount: cartItems.length
      }
    };

    const razorpayOrder = await razorpay.orders.create(options);

    res.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: razorpay.key_id,
      totalAmount: totalAmount
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment order' });
  }
});

// Verify payment and create order
router.post('/verify-and-checkout', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { 
      addressId, 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;
    const userId = req.user.userId;

    if (!addressId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required payment details' });
    }

    // Verify payment signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', razorpay.key_secret)
      .update(text)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Verify payment with Razorpay
    let paymentDetails = null;
    try {
      paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
      
      if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
        return res.status(400).json({ error: 'Payment not successful' });
      }

      if (paymentDetails.order_id !== razorpay_order_id) {
        return res.status(400).json({ error: 'Order ID mismatch' });
      }
    } catch (error) {
      console.error('Error verifying payment with Razorpay:', error);
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    // Get cart items with current stock
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

    // Get escrow hold days from settings
    const escrowHoldDays = await getPlatformSetting('escrow_hold_days', 7);
    
    // Group items by shop and create orders
    const itemsByShop = {};
    cartItems.forEach(item => {
      const shopId = item.product.shop_id;
      if (!itemsByShop[shopId]) {
        itemsByShop[shopId] = [];
      }
      itemsByShop[shopId].push(item);
    });

    const orders = [];
    const createdOrderIds = [];
    
    try {
      for (const shopId in itemsByShop) {
        const shopItems = itemsByShop[shopId];
        const subtotal = shopItems.reduce((sum, item) => 
          sum + (item.quantity * item.product.price), 0);
        const total = roundPrice(subtotal);

        // Calculate commission and seller amount
        const { commission, sellerAmount } = await calculateCommission(total);

        // Get shop details
        const { data: shop } = await supabase
          .from('shops')
          .select('owner_id, name')
          .eq('id', shopId)
          .single();

        if (!shop) {
          if (createdOrderIds.length > 0) {
            await supabase.from('orders').delete().in('id', createdOrderIds);
          }
          return res.status(400).json({ error: 'Shop not found' });
        }

        // Order creation allowed (subscription limits removed)

        // Re-validate stock
        for (const item of shopItems) {
          const { data: currentProduct } = await supabase
            .from('products')
            .select('stock, is_active, name')
            .eq('id', item.product_id)
            .single();
          
          if (!currentProduct || !currentProduct.is_active) {
            if (createdOrderIds.length > 0) {
              await supabase.from('orders').delete().in('id', createdOrderIds);
            }
            return res.status(400).json({ 
              error: `Product "${item.product?.name || 'Unknown'}" is no longer available` 
            });
          }
          
          if (currentProduct.stock < item.quantity) {
            if (createdOrderIds.length > 0) {
              await supabase.from('orders').delete().in('id', createdOrderIds);
            }
            return res.status(400).json({ 
              error: `Insufficient stock for "${currentProduct.name}". Available: ${currentProduct.stock}, Requested: ${item.quantity}` 
            });
          }
        }

        // Calculate escrow release date
        const escrowReleaseDate = new Date();
        escrowReleaseDate.setDate(escrowReleaseDate.getDate() + escrowHoldDays);

        // Create order with payment details
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert([
            {
              user_id: userId,
              shop_id: shopId,
              address_id: addressId,
              total_amount: total,
              seller_amount: sellerAmount,
              platform_commission: commission,
              status: 'pending',
              payment_method: 'razorpay',
              payment_status: 'completed',
              payment_id: razorpay_payment_id,
              razorpay_order_id: razorpay_order_id,
              razorpay_payment_id: razorpay_payment_id,
              razorpay_signature: razorpay_signature,
              escrow_status: 'held',
              escrow_release_date: escrowReleaseDate.toISOString(),
              payout_status: 'pending',
              created_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (orderError) {
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
          await supabase.from('orders').delete().in('id', createdOrderIds);
          return res.status(400).json({ error: itemsError.message });
        }

        // Record payment in order_payments table
        await supabase
          .from('order_payments')
          .insert([
            {
              order_id: order.id,
              user_id: userId,
              amount: total,
              currency: 'INR',
              razorpay_order_id: razorpay_order_id,
              razorpay_payment_id: razorpay_payment_id,
              razorpay_signature: razorpay_signature,
              payment_method: paymentDetails?.method || 'razorpay',
              status: 'completed',
              metadata: {
                payment_details: {
                  status: paymentDetails?.status,
                  method: paymentDetails?.method,
                  bank: paymentDetails?.bank,
                  wallet: paymentDetails?.wallet,
                  vpa: paymentDetails?.vpa,
                  card_id: paymentDetails?.card_id
                }
              },
              created_at: new Date().toISOString()
            }
          ]);

        // Record transaction for audit trail
        await supabase
          .from('platform_transactions')
          .insert([
            {
              transaction_type: 'order_payment',
              reference_id: order.id,
              reference_type: 'order',
              user_id: userId,
              amount: total,
              commission_amount: commission,
              currency: 'INR',
              status: 'completed',
              payment_gateway: 'razorpay',
              gateway_transaction_id: razorpay_payment_id,
              description: `Payment for order in shop: ${shop.name}`,
              metadata: {
                shop_id: shopId,
                shop_name: shop.name,
                items_count: shopItems.length
              },
              created_at: new Date().toISOString()
            }
          ]);

        orders.push(order);

        // Notify shop owner
        const { notifyOrderPlaced } = require('../utils/notifications');
        if (shop && shop.owner_id) {
          await notifyOrderPlaced(order, shop.owner_id);
        }
      }

      // Clear cart after all orders are created
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
      message: 'Payment verified and order placed successfully', 
      orders,
      paymentDetails: {
        razorpay_payment_id,
        razorpay_order_id,
        method: paymentDetails?.method
      }
    });
  } catch (error) {
    console.error('Error in verify-and-checkout:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get payment HTML page for WebView
router.post('/payment-page', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { addressId, razorpayOrderId, amount } = req.body;
    const userId = req.user.userId;

    if (!addressId || !razorpayOrderId || !amount) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Get user details for prefill
    const { data: user } = await supabase
      .from('users')
      .select('name, email, phone')
      .eq('id', userId)
      .single();

    // Generate payment page HTML
    const paymentPageHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Payment</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      max-width: 400px;
      width: 90%;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      text-align: center;
      font-size: 24px;
    }
    .subtitle {
      color: #666;
      text-align: center;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .amount {
      font-size: 48px;
      font-weight: bold;
      color: #4CAF50;
      text-align: center;
      margin: 30px 0;
    }
    .info {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 14px;
    }
    .info-row:last-child {
      margin-bottom: 0;
    }
    .label {
      color: #666;
    }
    .value {
      color: #333;
      font-weight: 600;
    }
    button {
      width: 100%;
      padding: 18px;
      background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      margin-top: 10px;
      box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
      transition: all 0.3s ease;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
    }
    button:active {
      transform: translateY(0);
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
    }
    .secure {
      text-align: center;
      margin-top: 20px;
      color: #999;
      font-size: 12px;
    }
    .secure svg {
      width: 16px;
      height: 16px;
      vertical-align: middle;
      margin-right: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🛒 Complete Payment</h1>
    <p class="subtitle">You're almost done!</p>
    
    <div class="amount">₹${amount}</div>
    
    <div class="info">
      <div class="info-row">
        <span class="label">Order Type:</span>
        <span class="value">Product Purchase</span>
      </div>
      <div class="info-row">
        <span class="label">Amount:</span>
        <span class="value">₹${amount}</span>
      </div>
      <div class="info-row">
        <span class="label">Payment Method:</span>
        <span class="value">Razorpay</span>
      </div>
    </div>
    
    <button id="pay-button" onclick="pay()">Pay Now</button>
    
    <div class="secure">
      🔒 Secure payment powered by Razorpay
    </div>
  </div>

  <script>
    const options = {
      "key": "${razorpay.key_id}",
      "amount": ${Math.round(amount * 100)},
      "currency": "INR",
      "name": "House of Jainz",
      "description": "Product Purchase",
      "order_id": "${razorpayOrderId}",
      "handler": function (response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'payment_success',
          razorpay_order_id: "${razorpayOrderId}",
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        }));
      },
      "prefill": {
        "name": "${user?.name || 'User'}",
        "email": "${user?.email || ''}",
        "contact": "${user?.phone || ''}"
      },
      "theme": {
        "color": "#4CAF50"
      },
      "modal": {
        "ondismiss": function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'payment_cancelled'
          }));
        }
      }
    };

    function pay() {
      const rzp = new Razorpay(options);
      rzp.open();
    }

    // Auto-open payment on page load
    window.onload = function() {
      setTimeout(pay, 500);
    };
  </script>
</body>
</html>
    `;

    res.json({
      html: paymentPageHTML,
      orderId: razorpayOrderId
    });
  } catch (error) {
    console.error('Error creating payment page:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment page' });
  }
});

// Get order payment details
router.get('/order/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

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

    // Get payment details
    const { data: payment } = await supabase
      .from('order_payments')
      .select('*')
      .eq('order_id', orderId)
      .single();

    res.json({ 
      payment: payment || null,
      orderPaymentInfo: {
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        escrow_status: order.escrow_status,
        escrow_release_date: order.escrow_release_date,
        total_amount: order.total_amount
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simplified payment verification (for browser-based flow without signature)
router.post('/verify-payment-simple', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { 
      addressId, 
      razorpay_order_id, 
      razorpay_payment_id
    } = req.body;
    const userId = req.user.userId;

    if (!addressId || !razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({ error: 'Missing required payment details' });
    }

    // Verify payment with Razorpay API
    let paymentDetails = null;
    try {
      paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
      
      if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
        return res.status(400).json({ error: 'Payment not successful' });
      }

      if (paymentDetails.order_id !== razorpay_order_id) {
        return res.status(400).json({ error: 'Order ID mismatch' });
      }
    } catch (error) {
      console.error('Error verifying payment with Razorpay:', error);
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    // Get cart items with current stock
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

    // Get escrow hold days from settings
    const escrowHoldDays = await getPlatformSetting('escrow_hold_days', 7);
    
    // Group items by shop and create orders
    const itemsByShop = {};
    cartItems.forEach(item => {
      const shopId = item.product.shop_id;
      if (!itemsByShop[shopId]) {
        itemsByShop[shopId] = [];
      }
      itemsByShop[shopId].push(item);
    });

    const orders = [];
    const createdOrderIds = [];
    
    try {
      for (const shopId in itemsByShop) {
        const shopItems = itemsByShop[shopId];
        const subtotal = shopItems.reduce((sum, item) => 
          sum + (item.quantity * item.product.price), 0);
        const total = roundPrice(subtotal);

        // Calculate commission and seller amount
        const { commission, sellerAmount } = await calculateCommission(total);

        // Get shop details
        const { data: shop } = await supabase
          .from('shops')
          .select('owner_id, name')
          .eq('id', shopId)
          .single();

        if (!shop) {
          if (createdOrderIds.length > 0) {
            await supabase.from('orders').delete().in('id', createdOrderIds);
          }
          return res.status(400).json({ error: 'Shop not found' });
        }

        // Order creation allowed (subscription limits removed)

        // Calculate escrow release date
        const escrowReleaseDate = new Date();
        escrowReleaseDate.setDate(escrowReleaseDate.getDate() + escrowHoldDays);

        // Create order with payment details
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert([
            {
              user_id: userId,
              shop_id: shopId,
              address_id: addressId,
              total_amount: total,
              seller_amount: sellerAmount,
              platform_commission: commission,
              status: 'pending',
              payment_method: 'razorpay',
              payment_status: 'completed',
              payment_id: razorpay_payment_id,
              razorpay_order_id: razorpay_order_id,
              razorpay_payment_id: razorpay_payment_id,
              escrow_status: 'held',
              escrow_release_date: escrowReleaseDate.toISOString(),
              payout_status: 'pending',
              created_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (orderError) {
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
          await supabase.from('orders').delete().in('id', createdOrderIds);
          return res.status(400).json({ error: itemsError.message });
        }

        // Record payment
        await supabase
          .from('order_payments')
          .insert([
            {
              order_id: order.id,
              user_id: userId,
              amount: total,
              currency: 'INR',
              razorpay_order_id: razorpay_order_id,
              razorpay_payment_id: razorpay_payment_id,
              payment_method: paymentDetails?.method || 'razorpay',
              status: 'completed',
              created_at: new Date().toISOString()
            }
          ]);

        // Record transaction
        await supabase
          .from('platform_transactions')
          .insert([
            {
              transaction_type: 'order_payment',
              reference_id: order.id,
              reference_type: 'order',
              user_id: userId,
              amount: total,
              commission_amount: commission,
              currency: 'INR',
              status: 'completed',
              payment_gateway: 'razorpay',
              gateway_transaction_id: razorpay_payment_id,
              description: `Payment for order in shop: ${shop.name}`,
              created_at: new Date().toISOString()
            }
          ]);

        orders.push(order);

        // Notify shop owner
        const { notifyOrderPlaced } = require('../utils/notifications');
        if (shop && shop.owner_id) {
          await notifyOrderPlaced(order, shop.owner_id);
        }
      }

      // Clear cart after all orders are created
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
      message: 'Payment verified and order placed successfully', 
      orders
    });
  } catch (error) {
    console.error('Error in verify-payment-simple:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Razorpay Payment Link (for external payment)
router.post('/create-payment-link', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { addressId, amount } = req.body;
    const userId = req.user.userId;

    if (!addressId || !amount) {
      return res.status(400).json({ error: 'Address and amount are required' });
    }

    // Get cart items for reference
    const { data: cartItems } = await supabase
      .from('cart_items')
      .select(`
        *,
        product:products(id, name, price)
      `)
      .eq('user_id', userId);

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Get user details
    const { data: user } = await supabase
      .from('users')
      .select('name, email, phone')
      .eq('id', userId)
      .single();

    const amountInPaise = Math.round(amount * 100);

    // Create Razorpay order first
    const receiptId = `order_${userId.substring(0, 8)}_${Date.now().toString().slice(-8)}`;
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: receiptId.length > 40 ? receiptId.substring(0, 40) : receiptId,
      notes: {
        userId: userId,
        addressId: addressId,
        type: 'product_order',
        itemCount: cartItems.length
      }
    });

    // Create Payment Link
    const paymentLinkOptions = {
      amount: amountInPaise,
      currency: 'INR',
      description: 'House of Jainz - Product Purchase',
      customer: {
        name: user?.name || 'Customer',
        email: user?.email || '',
        contact: user?.phone || ''
      },
      notify: {
        sms: false,
        email: false
      },
      reminder_enable: false,
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:19006'}/payment-success`,
      callback_method: 'get',
      notes: {
        order_id: razorpayOrder.id,
        user_id: userId,
        address_id: addressId
      }
    };

    console.log('📝 Creating payment link with options:', JSON.stringify(paymentLinkOptions, null, 2));
    
    const paymentLink = await razorpay.paymentLink.create(paymentLinkOptions);
    
    console.log('✅ Payment link created:', JSON.stringify({
      id: paymentLink.id,
      short_url: paymentLink.short_url,
      status: paymentLink.status
    }, null, 2));

    const linkUrl = paymentLink.short_url || paymentLink.url || `https://rzp.io/i/${paymentLink.id}`;
    
    console.log('🔗 Sending payment link to client:', linkUrl);

    res.json({
      paymentLink: linkUrl,
      razorpayOrderId: razorpayOrder.id,
      amount: amount,
      paymentLinkId: paymentLink.id
    });
  } catch (error) {
    console.error('❌ Error creating payment link:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    res.status(500).json({ 
      error: error.message || 'Failed to create payment link',
      details: error.description || error.error?.description
    });
  }
});

// Check payment status (for polling)
router.post('/check-payment-status', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { razorpayOrderId, addressId, paymentLinkId } = req.body;
    const userId = req.user.userId;

    console.log('🔍 Checking payment status for:', { razorpayOrderId, paymentLinkId, userId });

    if (!razorpayOrderId || !addressId) {
      console.log('❌ Missing required parameters');
      return res.status(400).json({ error: 'Order ID and address are required' });
    }

    // Check if order already exists for this razorpay order
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, status, payment_status')
      .eq('razorpay_order_id', razorpayOrderId)
      .eq('user_id', userId)
      .single();

    if (existingOrder) {
      console.log('✅ Order already exists:', existingOrder.id);
      // Order already created
      return res.json({
        paid: true,
        orderCreated: true,
        orderId: existingOrder.id
      });
    }

    // For payment links, check the payment link status FIRST
    if (paymentLinkId) {
      try {
        console.log('🔗 Fetching payment link from Razorpay:', paymentLinkId);
        const paymentLinkDetails = await razorpay.paymentLink.fetch(paymentLinkId);
        console.log('📊 Payment link status:', paymentLinkDetails.status);
        
        if (paymentLinkDetails.status === 'paid') {
          console.log('💰 Payment link is PAID!');
          console.log('📋 Payment link full details:', JSON.stringify(paymentLinkDetails, null, 2));
          
          // Try to get payment ID from payment link first
          let paymentId = null;
          
          // Check if payment link has payments array
          if (paymentLinkDetails.payments && paymentLinkDetails.payments.length > 0) {
            paymentId = paymentLinkDetails.payments[0].payment_id;
            console.log('💳 Payment ID from link:', paymentId);
          }
          
          // If not found in link, try fetching from order
          if (!paymentId) {
            console.log('🔍 Payment ID not in link, fetching from order...');
            const payments = await razorpay.orders.fetchPayments(razorpayOrderId);
            console.log('💳 Payments found in order:', payments?.items?.length || 0);
            
            if (payments && payments.items && payments.items.length > 0) {
              paymentId = payments.items[0].id;
              console.log('💳 Payment ID from order:', paymentId);
            }
          }
          
          // If we have a payment ID, verify and create order
          if (paymentId) {
            try {
              // Fetch payment details to verify
              const payment = await razorpay.payments.fetch(paymentId);
              console.log('💵 Payment details:', {
                id: payment.id,
                status: payment.status,
                amount: payment.amount,
                method: payment.method
              });
              
              if (payment.status === 'captured' || payment.status === 'authorized') {
                // Payment successful, create order automatically
                console.log('🎉 Payment verified via link! Creating order...');
                try {
                  await createOrderFromPayment(userId, addressId, razorpayOrderId, payment.id);
                  console.log('✅ Order created successfully!');
                  
                  return res.json({
                    paid: true,
                    orderCreated: true,
                    paymentId: payment.id
                  });
                } catch (orderError) {
                  console.error('❌ Error creating order:', orderError);
                  return res.json({
                    paid: true,
                    orderCreated: false,
                    error: 'Payment successful but order creation failed. Please contact support.'
                  });
                }
              } else {
                console.log('⚠️ Payment not captured yet:', payment.status);
              }
            } catch (paymentFetchError) {
              console.error('❌ Error fetching payment:', paymentFetchError);
            }
          } else {
            console.log('⚠️ No payment ID found, payment might still be processing');
          }
        }
        
        // Payment link not paid yet
        console.log('⏳ Payment link status:', paymentLinkDetails.status);
        return res.json({
          paid: false,
          orderCreated: false,
          status: paymentLinkDetails.status
        });
      } catch (linkError) {
        console.error('❌ Error fetching payment link:', linkError.message);
        console.log('⚠️ Falling back to order status check...');
        // Continue to fallback order check below
      }
    }

    // Fallback: Fetch order details from Razorpay (for non-link payments)
    try {
      console.log('📡 Fetching order from Razorpay...');
      const razorpayOrderDetails = await razorpay.orders.fetch(razorpayOrderId);
      console.log('📦 Razorpay order status:', razorpayOrderDetails.status);
      
      if (razorpayOrderDetails.status === 'paid') {
        console.log('💰 Order is paid! Fetching payment details...');
        
        // Payment is successful, fetch payment details
        const payments = await razorpay.orders.fetchPayments(razorpayOrderId);
        console.log('💳 Payments found:', payments?.items?.length || 0);
        
        if (payments && payments.items && payments.items.length > 0) {
          const payment = payments.items[0];
          console.log('💵 Payment status:', payment.status, 'ID:', payment.id);
          
          if (payment.status === 'captured' || payment.status === 'authorized') {
            // Payment successful, create order automatically
            console.log('🎉 Payment verified! Creating order...');
            try {
              await createOrderFromPayment(userId, addressId, razorpayOrderId, payment.id);
              console.log('✅ Order created successfully!');
              
              return res.json({
                paid: true,
                orderCreated: true,
                paymentId: payment.id
              });
            } catch (orderError) {
              console.error('❌ Error creating order:', orderError);
              return res.json({
                paid: true,
                orderCreated: false,
                error: 'Payment successful but order creation failed. Please contact support.'
              });
            }
          } else {
            console.log('⏳ Payment not captured yet:', payment.status);
          }
        }
      }

      // Payment not yet completed
      console.log('⏳ Payment pending, status:', razorpayOrderDetails.status);
      return res.json({
        paid: false,
        orderCreated: false,
        status: razorpayOrderDetails.status
      });
    } catch (razorpayError) {
      console.error('❌ Error fetching from Razorpay:', razorpayError.message);
      
      // If order not found, it might be too new, return pending
      if (razorpayError.error && razorpayError.error.code === 'BAD_REQUEST_ERROR') {
        return res.json({
          paid: false,
          orderCreated: false,
          status: 'checking'
        });
      }
      
      return res.json({
        paid: false,
        orderCreated: false,
        error: 'Could not verify payment status'
      });
    }
  } catch (error) {
    console.error('❌ Error checking payment status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to create order from successful payment
async function createOrderFromPayment(userId, addressId, razorpayOrderId, razorpayPaymentId) {
  // Get cart items
  const { data: cartItems } = await supabase
    .from('cart_items')
    .select(`
      *,
      product:products(id, name, price, shop_id, stock, is_active)
    `)
    .eq('user_id', userId);

  if (!cartItems || cartItems.length === 0) {
    throw new Error('Cart is empty');
  }

  // Get address
  const { data: address } = await supabase
    .from('addresses')
    .select('*')
    .eq('id', addressId)
    .eq('user_id', userId)
    .single();

  if (!address) {
    throw new Error('Invalid address');
  }

  const escrowHoldDays = await getPlatformSetting('escrow_hold_days', 7);

  // Group items by shop
  const itemsByShop = {};
  cartItems.forEach(item => {
    const shopId = item.product.shop_id;
    if (!itemsByShop[shopId]) {
      itemsByShop[shopId] = [];
    }
    itemsByShop[shopId].push(item);
  });

  const orders = [];
  
  for (const shopId in itemsByShop) {
    const shopItems = itemsByShop[shopId];
    const subtotal = shopItems.reduce((sum, item) => 
      sum + (item.quantity * item.product.price), 0);
    const total = roundPrice(subtotal);

    const { commission, sellerAmount } = await calculateCommission(total);

    const { data: shop } = await supabase
      .from('shops')
      .select('owner_id, name')
      .eq('id', shopId)
      .single();

    if (!shop) continue;

    const escrowReleaseDate = new Date();
    escrowReleaseDate.setDate(escrowReleaseDate.getDate() + escrowHoldDays);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          user_id: userId,
          shop_id: shopId,
          address_id: addressId,
          total_amount: total,
          seller_amount: sellerAmount,
          platform_commission: commission,
          status: 'pending',
          payment_method: 'razorpay',
          payment_status: 'completed',
          payment_id: razorpayPaymentId,
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          escrow_status: 'held',
          escrow_release_date: escrowReleaseDate.toISOString(),
          payout_status: 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      continue;
    }

    // Create order items
    const orderItems = shopItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.product.price
    }));

    await supabase.from('order_items').insert(orderItems);

    // Record payment
    await supabase
      .from('order_payments')
      .insert([
        {
          order_id: order.id,
          user_id: userId,
          amount: total,
          currency: 'INR',
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          payment_method: 'razorpay',
          status: 'completed',
          created_at: new Date().toISOString()
        }
      ]);

    // Record transaction
    await supabase
      .from('platform_transactions')
      .insert([
        {
          transaction_type: 'order_payment',
          reference_id: order.id,
          reference_type: 'order',
          user_id: userId,
          amount: total,
          commission_amount: commission,
          currency: 'INR',
          status: 'completed',
          payment_gateway: 'razorpay',
          gateway_transaction_id: razorpayPaymentId,
          description: `Payment for order in shop: ${shop.name}`,
          created_at: new Date().toISOString()
        }
      ]);

    orders.push(order);

    // Notify shop owner
    const { notifyOrderPlaced } = require('../utils/notifications');
    if (shop && shop.owner_id) {
      await notifyOrderPlaced(order, shop.owner_id);
    }
  }

  // Clear cart
  await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId);

  return orders;
}

module.exports = router;

