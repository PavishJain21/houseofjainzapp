const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

// Get all payouts (admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('seller_payouts')
      .select(`
        *,
        seller:users!seller_id(id, name, email, phone),
        shop:shops(id, name)
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: payouts, error, count } = await query;

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

    res.json({
      payouts: payoutsWithDetails,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error getting payouts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get payout statistics (admin)
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get payout counts by status
    const { data: statusCounts } = await supabase
      .from('seller_payouts')
      .select('status');

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      total: 0,
      totalAmount: 0,
      totalCommission: 0
    };

    if (statusCounts) {
      statusCounts.forEach(item => {
        stats[item.status] = (stats[item.status] || 0) + 1;
        stats.total += 1;
      });
    }

    // Get financial totals
    const { data: payouts } = await supabase
      .from('seller_payouts')
      .select('net_amount, commission_amount, status');

    if (payouts) {
      stats.totalAmount = payouts.reduce((sum, p) => sum + parseFloat(p.net_amount || 0), 0);
      stats.totalCommission = payouts.reduce((sum, p) => sum + parseFloat(p.commission_amount || 0), 0);
      stats.completedAmount = payouts
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + parseFloat(p.net_amount || 0), 0);
      stats.pendingAmount = payouts
        .filter(p => p.status === 'pending' || p.status === 'processing')
        .reduce((sum, p) => sum + parseFloat(p.net_amount || 0), 0);
    }

    res.json({ stats });
  } catch (error) {
    console.error('Error getting payout stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get payout details (admin)
router.get('/:payoutId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { payoutId } = req.params;

    const { data: payout, error } = await supabase
      .from('seller_payouts')
      .select(`
        *,
        seller:users!seller_id(id, name, email, phone),
        shop:shops(id, name)
      `)
      .eq('id', payoutId)
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

// Update payout status (admin)
router.put('/:payoutId/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { status, transactionReference, notes } = req.body;

    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get current payout
    const { data: payout } = await supabase
      .from('seller_payouts')
      .select('*')
      .eq('id', payoutId)
      .single();

    if (!payout) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    // Update payout
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.processed_at = new Date().toISOString();
    }

    if (transactionReference) {
      updateData.transaction_reference = transactionReference;
    }

    if (notes) {
      updateData.notes = payout.notes ? `${payout.notes}\n\nAdmin: ${notes}` : `Admin: ${notes}`;
    }

    const { data: updatedPayout, error } = await supabase
      .from('seller_payouts')
      .update(updateData)
      .eq('id', payoutId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Update related orders payout status
    const { data: mappings } = await supabase
      .from('payout_order_mapping')
      .select('order_id')
      .eq('payout_id', payoutId);

    if (mappings && mappings.length > 0) {
      const orderIds = mappings.map(m => m.order_id);
      
      let orderPayoutStatus = 'processing';
      if (status === 'completed') {
        orderPayoutStatus = 'completed';
      } else if (status === 'failed' || status === 'cancelled') {
        orderPayoutStatus = 'pending'; // Reset to pending so seller can request again
      }

      await supabase
        .from('orders')
        .update({ payout_status: orderPayoutStatus })
        .in('id', orderIds);
    }

    // Update transaction record
    await supabase
      .from('platform_transactions')
      .update({ 
        status,
        gateway_transaction_id: transactionReference || null,
        updated_at: new Date().toISOString()
      })
      .eq('reference_id', payoutId)
      .eq('reference_type', 'payout');

    // Send notification to seller (optional - implement if notification system exists)
    // await notifySellerPayoutStatusChanged(payout.seller_id, updatedPayout);

    res.json({ 
      message: 'Payout status updated successfully',
      payout: updatedPayout 
    });
  } catch (error) {
    console.error('Error updating payout status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all transactions (admin)
router.get('/transactions/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      type, 
      status, 
      startDate, 
      endDate, 
      limit = 100, 
      offset = 0 
    } = req.query;

    let query = supabase
      .from('platform_transactions')
      .select(`
        *,
        user:users(id, name, email)
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (type) {
      query = query.eq('transaction_type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: transactions, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      transactions: transactions || [],
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transaction statistics (admin)
router.get('/transactions/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = supabase
      .from('platform_transactions')
      .select('*');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: transactions } = await query;

    const stats = {
      totalTransactions: 0,
      totalAmount: 0,
      totalCommission: 0,
      byType: {},
      byStatus: {},
      recentTransactions: []
    };

    if (transactions) {
      stats.totalTransactions = transactions.length;
      stats.totalAmount = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      stats.totalCommission = transactions.reduce((sum, t) => sum + parseFloat(t.commission_amount || 0), 0);

      // Group by type
      transactions.forEach(t => {
        if (!stats.byType[t.transaction_type]) {
          stats.byType[t.transaction_type] = {
            count: 0,
            amount: 0,
            commission: 0
          };
        }
        stats.byType[t.transaction_type].count += 1;
        stats.byType[t.transaction_type].amount += parseFloat(t.amount || 0);
        stats.byType[t.transaction_type].commission += parseFloat(t.commission_amount || 0);
      });

      // Group by status
      transactions.forEach(t => {
        stats.byStatus[t.status] = (stats.byStatus[t.status] || 0) + 1;
      });

      // Get recent transactions
      stats.recentTransactions = transactions
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10);
    }

    res.json({ stats });
  } catch (error) {
    console.error('Error getting transaction stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get platform settings (admin)
router.get('/settings/platform', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data: settings, error } = await supabase
      .from('platform_settings')
      .select('*')
      .order('setting_key');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ settings: settings || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update platform settings (admin)
router.put('/settings/platform/:key', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'Value is required' });
    }

    const { data: setting, error } = await supabase
      .from('platform_settings')
      .update({
        setting_value: value.toString(),
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', key)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: 'Setting updated successfully',
      setting
    });
  } catch (error) {
    console.error('Error updating platform setting:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

