const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken, requireNotGuest } = require('../middleware/auth');

const router = express.Router();

// Get user addresses (guest gets empty list)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'guest') return res.json({ addresses: [] });
    const userId = req.user.userId;

    const { data: addresses, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ addresses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add address
router.post('/', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { name, phone, address_line1, address_line2, city, state, pincode, is_default } = req.body;
    const userId = req.user.userId;

    // If this is set as default, unset other defaults
    if (is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    const { data: address, error } = await supabase
      .from('addresses')
      .insert([
        {
          user_id: userId,
          name,
          phone,
          address_line1,
          address_line2: address_line2 || null,
          city,
          state,
          pincode,
          is_default: is_default || false,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ address });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update address
router.put('/:addressId', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { addressId } = req.params;
    const { name, phone, address_line1, address_line2, city, state, pincode, is_default } = req.body;
    const userId = req.user.userId;

    // Verify ownership
    const { data: address } = await supabase
      .from('addresses')
      .select('id')
      .eq('id', addressId)
      .eq('user_id', userId)
      .single();

    if (!address) {
      return res.status(403).json({ error: 'Address not found' });
    }

    // If this is set as default, unset other defaults
    if (is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', userId)
        .neq('id', addressId);
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (address_line1) updateData.address_line1 = address_line1;
    if (address_line2 !== undefined) updateData.address_line2 = address_line2;
    if (city) updateData.city = city;
    if (state) updateData.state = state;
    if (pincode) updateData.pincode = pincode;
    if (is_default !== undefined) updateData.is_default = is_default;

    const { data: updatedAddress, error } = await supabase
      .from('addresses')
      .update(updateData)
      .eq('id', addressId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ address: updatedAddress });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete address
router.delete('/:addressId', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const { addressId } = req.params;
    const userId = req.user.userId;

    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', addressId)
      .eq('user_id', userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

