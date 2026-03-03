const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { sendPasswordResetEmail, sendOtpEmail } = require('../utils/email');

const router = express.Router();

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, phone } = req.body;
    const religion = req.body.religion?.trim() || 'Jain';

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password: hashedPassword,
          name,
          religion,
          phone: phone || null,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Generate JWT token (role will be fetched on each request for security)
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Get user role
    const { data: userWithRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        religion: user.religion,
        role: userWithRole?.role || 'user'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Get user role (in case it was updated)
    const { data: userWithRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        religion: user.religion,
        phone: user.phone,
        role: userWithRole?.role || 'user',
        avatar_url: user.avatar_url || null,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------- OTP Login (email → send OTP → verify OTP) --------
const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

// Send OTP to email (GoDaddy SMTP)
router.post('/send-otp', [
  body('email').isEmail().normalizeEmail(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email } = req.body;

    // Cooldown: don't send again within 60s for same email
    const { data: recentList } = await supabase
      .from('auth_otps')
      .select('id')
      .eq('email', email)
      .gte('created_at', new Date(Date.now() - OTP_RESEND_COOLDOWN_SECONDS * 1000).toISOString())
      .limit(1);
    if (recentList && recentList.length > 0) {
      return res.status(429).json({ error: 'Please wait a minute before requesting another code.' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    await supabase.from('auth_otps').insert([{ email, code, expires_at: expiresAt.toISOString() }]);

    const sent = await sendOtpEmail(email, code);
    if (!sent) {
      return res.status(500).json({ error: 'Failed to send OTP. Check server SMTP configuration.' });
    }

    res.json({ message: 'OTP sent to your email. It expires in ' + OTP_EXPIRY_MINUTES + ' minutes.' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify OTP and login (or create user if first time)
router.post('/verify-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, otp } = req.body;

    const { data: row } = await supabase
      .from('auth_otps')
      .select('id, code, expires_at')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!row || row.code !== otp) {
      return res.status(401).json({ error: 'Invalid or expired code.' });
    }
    if (new Date(row.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Code has expired. Request a new one.' });
    }

    // Invalidate this OTP (optional: delete or mark used)
    await supabase.from('auth_otps').delete().eq('id', row.id);

    let { data: user } = await supabase.from('users').select('*').eq('email', email).single();
    if (!user) {
      const placeholders = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{
          email,
          password: placeholders,
          name: email.split('@')[0] || 'User',
          religion: 'Jain',
          phone: null,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();
      if (insertError) return res.status(400).json({ error: insertError.message });
      user = newUser;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const { data: userWithRole } = await supabase.from('users').select('role').eq('id', user.id).single();

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        religion: user.religion,
        phone: user.phone,
        role: userWithRole?.role || 'user',
        avatar_url: user.avatar_url || null,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, religion, phone, role, avatar_url, created_at')
      .eq('id', req.user.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload profile picture (base64). Updates user.avatar_url.
// GET returns 405 so the URL is reachable (browser visits use GET).
router.get('/profile-picture', authenticateToken, (req, res) => {
  res.status(405).json({ error: 'Method not allowed. Use POST with body { imageBase64, mimeType? } to upload.' });
});
router.post('/profile-picture', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    let imageUrl = null;

    if (req.body && req.body.imageBase64) {
      const base64Data = req.body.imageBase64;
      const mimeType = req.body.mimeType || 'image/jpeg';
      const base64String = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const fileBuffer = Buffer.from(base64String, 'base64');
      if (!fileBuffer.length) return res.status(400).json({ error: 'Invalid image data' });
      const ext = mimeType === 'image/png' ? '.png' : '.jpg';
      const fileName = `profiles/${userId}-${Date.now()}${ext}`;
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(fileName, fileBuffer, { contentType: mimeType, upsert: true });
      if (error) return res.status(500).json({ error: 'Failed to upload image' });
      const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
    } else {
      return res.status(400).json({ error: 'Provide imageBase64 in request body' });
    }

    const { data: user, error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: imageUrl, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id, email, name, religion, phone, role, avatar_url, created_at')
      .single();

    if (updateError) return res.status(400).json({ error: updateError.message });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request password reset
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .single();

    // Always return success message (security: don't reveal if email exists)
    if (error || !user) {
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Invalidate any existing tokens for this user
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false);

    // Save reset token
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert([{
        user_id: user.id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
        used: false
      }]);

    if (tokenError) {
      console.error('Error saving reset token:', tokenError);
      return res.status(500).json({ error: 'Failed to generate reset token' });
    }

    // Generate reset link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:19006';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Send email with reset link
    const emailSent = await sendPasswordResetEmail(user.email, resetLink, user.name);

    // In development, return the link for testing
    if (process.env.NODE_ENV === 'development') {
      return res.json({
        message: 'Password reset link generated. Check console for link (development mode).',
        resetLink: resetLink // Only in development
      });
    }

    // Always return success message (security: don't reveal if email exists)
    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Verify reset token
router.post('/verify-reset-token', [
  body('token').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.body;

    // Find valid token
    const { data: resetToken, error } = await supabase
      .from('password_reset_tokens')
      .select('*, user:users(id, email)')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    res.json({
      valid: true,
      message: 'Token is valid'
    });
  } catch (error) {
    console.error('Error verifying reset token:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

// Reset password
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    // Find valid token
    const { data: resetToken, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*, user:users(id, email)')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', resetToken.user_id);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', resetToken.id);

    res.json({
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;

