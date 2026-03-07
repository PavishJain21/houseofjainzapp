const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken, requireNotGuest } = require('../middleware/auth');

const router = express.Router();

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

// Get seller earnings dashboard
router.get('/earnings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get seller's shops
    const { data: shops } = await supabase
      .from('shops')
      .select('id, name')
      .eq('owner_id', userId);

    if (!shops || shops.length === 0) {
      return res.json({
        totalEarnings: 0,
        availableForPayout: 0,
        escrowHeld: 0,
        paidOut: 0,
        totalCommission: 0,
        shops: [],
        minimumPayoutAmount: await getPlatformSetting('minimum_payout_amount', 100)
      });
    }

    const shopIds = shops.map(s => s.id);

    // Get earnings from orders
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .in('shop_id', shopIds)
      .eq('payment_status', 'completed');

    const totalEarnings = orders ? orders.reduce((sum, o) => sum + parseFloat(o.seller_amount || 0), 0) : 0;
    const totalCommission = orders ? orders.reduce((sum, o) => sum + parseFloat(o.platform_commission || 0), 0) : 0;
    
    const escrowHeld = orders ? orders
      .filter(o => o.escrow_status === 'held')
      .reduce((sum, o) => sum + parseFloat(o.seller_amount || 0), 0) : 0;
    
    const availableForPayout = orders ? orders
      .filter(o => o.escrow_status === 'released' && o.payout_status === 'pending')
      .reduce((sum, o) => sum + parseFloat(o.seller_amount || 0), 0) : 0;
    
    const paidOut = orders ? orders
      .filter(o => o.payout_status === 'completed')
      .reduce((sum, o) => sum + parseFloat(o.seller_amount || 0), 0) : 0;

    // Get shop-wise breakdown
    const shopBreakdown = shops.map(shop => {
      const shopOrders = orders ? orders.filter(o => o.shop_id === shop.id) : [];
      return {
        shopId: shop.id,
        shopName: shop.name,
        totalOrders: shopOrders.length,
        totalEarnings: shopOrders.reduce((sum, o) => sum + parseFloat(o.seller_amount || 0), 0),
        availableForPayout: shopOrders
          .filter(o => o.escrow_status === 'released' && o.payout_status === 'pending')
          .reduce((sum, o) => sum + parseFloat(o.seller_amount || 0), 0)
      };
    });

    // Get bank details
    const { data: bankDetails } = await supabase
      .from('seller_bank_details')
      .select('*')
      .eq('seller_id', userId)
      .eq('is_primary', true)
      .single();

    res.json({
      totalEarnings: parseFloat(totalEarnings.toFixed(2)),
      availableForPayout: parseFloat(availableForPayout.toFixed(2)),
      escrowHeld: parseFloat(escrowHeld.toFixed(2)),
      paidOut: parseFloat(paidOut.toFixed(2)),
      totalCommission: parseFloat(totalCommission.toFixed(2)),
      shops: shopBreakdown,
      bankDetails: bankDetails || null,
      minimumPayoutAmount: await getPlatformSetting('minimum_payout_amount', 100),
      escrowHoldDays: await getPlatformSetting('escrow_hold_days', 7)
    });
  } catch (error) {
    console.error('Error getting earnings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get orders eligible for payout
router.get('/eligible-orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get seller's shops
    const { data: shops } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', userId);

    if (!shops || shops.length === 0) {
      return res.json({ orders: [] });
    }

    const shopIds = shops.map(s => s.id);

    // Get orders that are eligible for payout
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
      .in('shop_id', shopIds)
      .eq('payment_status', 'completed')
      .eq('escrow_status', 'released')
      .eq('payout_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ orders: orders || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add or update bank details
router.post('/bank-details', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      accountHolderName,
      bankAccountNumber,
      ifscCode,
      bankName,
      branchName,
      accountType,
      upiId
    } = req.body;

    if (!accountHolderName || !bankAccountNumber || !ifscCode) {
      return res.status(400).json({ 
        error: 'Account holder name, bank account number, and IFSC code are required' 
      });
    }

    // Check if bank details already exist
    const { data: existing } = await supabase
      .from('seller_bank_details')
      .select('id')
      .eq('seller_id', userId)
      .eq('bank_account_number', bankAccountNumber);

    if (existing && existing.length > 0) {
      // Update existing
      const { data: updated, error } = await supabase
        .from('seller_bank_details')
        .update({
          account_holder_name: accountHolderName,
          ifsc_code: ifscCode,
          bank_name: bankName,
          branch_name: branchName,
          account_type: accountType || 'savings',
          upi_id: upiId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing[0].id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json({ 
        message: 'Bank details updated successfully',
        bankDetails: updated 
      });
    }

    // Set all existing accounts to non-primary
    await supabase
      .from('seller_bank_details')
      .update({ is_primary: false })
      .eq('seller_id', userId);

    // Create new bank details
    const { data: bankDetails, error } = await supabase
      .from('seller_bank_details')
      .insert([
        {
          seller_id: userId,
          account_holder_name: accountHolderName,
          bank_account_number: bankAccountNumber,
          ifsc_code: ifscCode,
          bank_name: bankName,
          branch_name: branchName,
          account_type: accountType || 'savings',
          upi_id: upiId,
          is_verified: false,
          is_primary: true,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ 
      message: 'Bank details added successfully',
      bankDetails 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bank details
router.get('/bank-details', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const { data: bankDetails, error } = await supabase
      .from('seller_bank_details')
      .select('*')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ bankDetails: bankDetails || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request payout
router.post('/request', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { shopId, notes } = req.body;

    // Get minimum payout amount
    const minimumPayoutAmount = await getPlatformSetting('minimum_payout_amount', 100);

    // Get seller's shop
    const { data: shop } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .eq('owner_id', userId)
      .single();

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found or unauthorized' });
    }

    // Get bank details
    const { data: bankDetails } = await supabase
      .from('seller_bank_details')
      .select('*')
      .eq('seller_id', userId)
      .eq('is_primary', true)
      .single();

    if (!bankDetails) {
      return res.status(400).json({ 
        error: 'Please add bank details before requesting payout' 
      });
    }

    // Get eligible orders for this shop
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('shop_id', shopId)
      .eq('payment_status', 'completed')
      .eq('escrow_status', 'released')
      .eq('payout_status', 'pending');

    if (!orders || orders.length === 0) {
      return res.status(400).json({ 
        error: 'No funds available for payout' 
      });
    }

    // Calculate total amount
    const totalAmount = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const totalCommission = orders.reduce((sum, o) => sum + parseFloat(o.platform_commission || 0), 0);
    const netAmount = orders.reduce((sum, o) => sum + parseFloat(o.seller_amount || 0), 0);

    if (netAmount < minimumPayoutAmount) {
      return res.status(400).json({ 
        error: `Minimum payout amount is ₹${minimumPayoutAmount}. Your available balance is ₹${netAmount.toFixed(2)}` 
      });
    }

    // Create payout request
    const { data: payout, error: payoutError } = await supabase
      .from('seller_payouts')
      .insert([
        {
          seller_id: userId,
          shop_id: shopId,
          amount: totalAmount,
          commission_amount: totalCommission,
          net_amount: netAmount,
          currency: 'INR',
          status: 'pending',
          payment_method: 'bank_transfer',
          bank_account_number: bankDetails.bank_account_number,
          ifsc_code: bankDetails.ifsc_code,
          upi_id: bankDetails.upi_id,
          notes: notes,
          requested_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (payoutError) {
      return res.status(400).json({ error: payoutError.message });
    }

    // Update orders to mark as payout processing
    const orderIds = orders.map(o => o.id);
    await supabase
      .from('orders')
      .update({ payout_status: 'processing' })
      .in('id', orderIds);

    // Create payout-order mappings
    const mappings = orders.map(order => ({
      payout_id: payout.id,
      order_id: order.id,
      amount: order.seller_amount,
      commission_amount: order.platform_commission,
      created_at: new Date().toISOString()
    }));

    await supabase
      .from('payout_order_mapping')
      .insert(mappings);

    // Record transaction
    await supabase
      .from('platform_transactions')
      .insert([
        {
          transaction_type: 'seller_payout',
          reference_id: payout.id,
          reference_type: 'payout',
          user_id: userId,
          amount: netAmount,
          commission_amount: totalCommission,
          currency: 'INR',
          status: 'pending',
          payment_gateway: 'bank_transfer',
          description: `Payout request for ${shop.name}`,
          metadata: {
            shop_id: shopId,
            shop_name: shop.name,
            orders_count: orders.length,
            bank_account: `****${bankDetails.bank_account_number.slice(-4)}`
          },
          created_at: new Date().toISOString()
        }
      ]);

    res.status(201).json({ 
      message: 'Payout request submitted successfully',
      payout: {
        id: payout.id,
        amount: payout.net_amount,
        ordersCount: orders.length,
        status: payout.status
      }
    });
  } catch (error) {
    console.error('Error requesting payout:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get payout history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const { data: payouts, error } = await supabase
      .from('seller_payouts')
      .select(`
        *,
        shop:shops(id, name)
      `)
      .eq('seller_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Get order count for each payout
    const payoutsWithDetails = await Promise.all(
      (payouts || []).map(async (payout) => {
        const { data: mappings } = await supabase
          .from('payout_order_mapping')
          .select('order_id')
          .eq('payout_id', payout.id);

        return {
          ...payout,
          ordersCount: mappings ? mappings.length : 0
        };
      })
    );

    res.json({ payouts: payoutsWithDetails });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get payout details
router.get('/:payoutId', authenticateToken, async (req, res) => {
  try {
    const { payoutId } = req.params;
    const userId = req.user.userId;

    const { data: payout, error } = await supabase
      .from('seller_payouts')
      .select(`
        *,
        shop:shops(id, name)
      `)
      .eq('id', payoutId)
      .eq('seller_id', userId)
      .single();

    if (error || !payout) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    // Get orders in this payout
    const { data: mappings } = await supabase
      .from('payout_order_mapping')
      .select(`
        *,
        order:orders(
          *,
          items:order_items(
            *,
            product:products(id, name, price)
          )
        )
      `)
      .eq('payout_id', payoutId);

    res.json({ 
      payout,
      orders: mappings ? mappings.map(m => m.order) : []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-release escrow funds (cron job endpoint - should be called by scheduler)
router.post('/cron/auto-release-escrow', async (req, res) => {
  try {
    // Verify cron secret (optional security measure)
    const cronSecret = req.headers['x-cron-secret'];
    if (cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get orders that need escrow release
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('escrow_status', 'held')
      .eq('payment_status', 'completed')
      .eq('status', 'delivered')
      .lte('escrow_release_date', new Date().toISOString());

    if (!orders || orders.length === 0) {
      return res.json({ 
        message: 'No orders ready for escrow release',
        count: 0 
      });
    }

    // Release escrow for eligible orders
    const orderIds = orders.map(o => o.id);
    const { error } = await supabase
      .from('orders')
      .update({ 
        escrow_status: 'released',
        updated_at: new Date().toISOString()
      })
      .in('id', orderIds);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      message: 'Escrow released successfully',
      count: orders.length,
      orderIds
    });
  } catch (error) {
    console.error('Error in auto-release-escrow:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

