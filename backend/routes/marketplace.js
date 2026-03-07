const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for product images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/products/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Get shops by location with pagination
router.get('/shops', authenticateToken, async (req, res) => {
  try {
    const { location, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('shops')
      .select(`
        *,
        owner:users(id, name, email)
      `, { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (location) {
      // Use case-insensitive partial match for better results
      // This allows matching "Mumbai" with "Mumbai, Maharashtra" etc.
      query = query.ilike('location', `%${location.trim()}%`);
    }

    const { data: shops, error, count } = await query;

    // Only treat as error if error exists AND no data returned
    // Supabase sometimes returns warnings in error even when data exists
    if (error && !shops) {
      console.error('Supabase error fetching shops:', JSON.stringify(error, null, 2));
      // Handle malformed error messages - check if it's a valid error object
      let errorMessage = 'Failed to fetch shops';
      if (typeof error === 'object') {
        if (error.message && typeof error.message === 'string' && error.message.length > 2) {
          errorMessage = error.message;
        } else if (error.details) {
          errorMessage = error.details;
        } else if (error.hint) {
          errorMessage = error.hint;
        }
      } else if (typeof error === 'string' && error.length > 2) {
        errorMessage = error;
      }
      return res.status(400).json({ error: errorMessage });
    }

    // Log warning if error exists but data also exists (partial success)
    // Don't return error, just log it since we have data
    if (error && shops) {
      console.warn('Supabase warning (data still returned, ignoring error):', 
        typeof error === 'object' ? JSON.stringify(error, null, 2) : error);
    }

    // Ensure shops is an array
    const shopsList = shops || [];
    const totalPages = Math.ceil((count || 0) / limitNum);
    const hasMore = pageNum < totalPages;

    res.json({ 
      shops: shopsList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages,
        hasMore,
      }
    });
  } catch (error) {
    console.error('Error in GET /marketplace/shops:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch shops' });
  }
});

// Create shop (with optional seller contact and bank details for onboarding)
router.post('/shops', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      location,
      address,
      phone,
      contactName,
      // Bank details (collected at shop onboarding for payouts)
      accountHolderName,
      bankAccountNumber,
      ifscCode,
      bankName,
      branchName,
    } = req.body;
    const userId = req.user.userId;

    // Required for shop
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Shop name is required' });
    }
    if (!location || !location.trim()) {
      return res.status(400).json({ error: 'Location is required' });
    }

    // Bank details required at onboarding
    if (!accountHolderName || !accountHolderName.trim()) {
      return res.status(400).json({ error: 'Account holder name is required' });
    }
    if (!bankAccountNumber || !String(bankAccountNumber).trim()) {
      return res.status(400).json({ error: 'Bank account number is required' });
    }
    if (!ifscCode || !String(ifscCode).trim()) {
      return res.status(400).json({ error: 'IFSC code is required' });
    }
    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ error: 'Seller contact phone is required' });
    }

    const { data: shop, error } = await supabase
      .from('shops')
      .insert([
        {
          owner_id: userId,
          name: name.trim(),
          description: (description && description.trim()) || null,
          location: location.trim(),
          address: (address && address.trim()) || null,
          phone: String(phone).trim(),
          contact_name: (contactName && contactName.trim()) || null,
          is_active: true,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Save bank details to seller_bank_details (for payouts) if table exists
    const ifscTrimmed = String(ifscCode).trim().toUpperCase();
    const bankAccTrimmed = String(bankAccountNumber).trim();
    try {
      const { data: existing } = await supabase
        .from('seller_bank_details')
        .select('id')
        .eq('seller_id', userId)
        .eq('bank_account_number', bankAccTrimmed);

      if (existing && existing.length > 0) {
        await supabase
          .from('seller_bank_details')
          .update({
            account_holder_name: accountHolderName.trim(),
            ifsc_code: ifscTrimmed,
            bank_name: (bankName && bankName.trim()) || null,
            branch_name: (branchName && branchName.trim()) || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing[0].id);
      } else {
        await supabase
          .from('seller_bank_details')
          .update({ is_primary: false })
          .eq('seller_id', userId);

        await supabase
          .from('seller_bank_details')
          .insert([
            {
              seller_id: userId,
              account_holder_name: accountHolderName.trim(),
              bank_account_number: bankAccTrimmed,
              ifsc_code: ifscTrimmed,
              bank_name: (bankName && bankName.trim()) || null,
              branch_name: (branchName && branchName.trim()) || null,
              account_type: 'savings',
              is_verified: false,
              is_primary: true,
              created_at: new Date().toISOString()
            }
          ]);
      }
    } catch (bankErr) {
      console.warn('Shop created but bank details save failed (seller_bank_details may not exist):', bankErr.message);
      // Shop is already created; don't fail the request
    }

    res.status(201).json({ shop });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get products by shop with pagination
router.get('/shops/:shopId/products', authenticateToken, async (req, res) => {
  try {
    const { shopId } = req.params;
    const { page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const { data: products, error, count } = await supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const totalPages = Math.ceil((count || 0) / limitNum);
    const hasMore = pageNum < totalPages;

    res.json({ 
      products,
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

// Get all products (with location filter) with pagination
router.get('/products', authenticateToken, async (req, res) => {
  try {
    const { location, shopId, page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('products')
      .select(`
        *,
        shop:shops(id, name, location, owner_id)
      `, { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (location) {
      // Use case-insensitive partial match for better results
      query = query.ilike('shop.location', `%${location.trim()}%`);
    }

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
      products,
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

// Get single product by ID
router.get('/products/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        shop:shops(id, name, location, owner_id)
      `)
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (error || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

