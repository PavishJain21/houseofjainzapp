const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const supabase = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { sendPasswordResetEmail } = require('../utils/email');

const router = express.Router();

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim(),
  body('religion').notEmpty().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, religion, phone } = req.body;

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
        role: userWithRole?.role || 'user'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Build backend callback URL for Google (must match Authorized redirect URI in Google Console)
function getGoogleCallbackRedirectUri(req) {
  const base = process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  return base.replace(/\/$/, '') + '/api/auth/google/callback';
}

// Google OAuth callback (GET): used by native app so redirect_uri is HTTPS (Web client allows this).
// User signs in on Google → Google redirects here with ?code= → we exchange code, then redirect to app with token.
router.get('/google/callback', async (req, res) => {
  try {
    const { code, error: googleError, error_description } = req.query;
    if (googleError) {
      const msg = error_description || googleError;
      return res.redirect(`houseofjainz://auth/callback?error=${encodeURIComponent(msg)}`);
    }
    if (!googleClientId || !googleClientSecret) {
      return res.redirect('houseofjainz://auth/callback?error=' + encodeURIComponent('Google sign-in not configured'));
    }
    if (!code) {
      return res.redirect('houseofjainz://auth/callback?error=' + encodeURIComponent('No code from Google'));
    }
    const redirectUri = getGoogleCallbackRedirectUri(req);
    const client = new OAuth2Client(googleClientId, googleClientSecret, redirectUri);
    const { tokens } = await client.getToken(code);
    const idToken = tokens.id_token;
    if (!idToken) {
      return res.redirect('houseofjainz://auth/callback?error=' + encodeURIComponent('No ID token'));
    }
    const ticket = await client.verifyIdToken({ idToken, audience: googleClientId });
    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name || payload.given_name || email?.split('@')[0] || 'User';
    if (!email) {
      return res.redirect('houseofjainz://auth/callback?error=' + encodeURIComponent('No email from Google'));
    }
    let { data: user } = await supabase.from('users').select('*').eq('email', email).single();
    if (!user) {
      const oauthPasswordPlaceholder = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{ email, password: oauthPasswordPlaceholder, name, religion: 'Jain', phone: null, created_at: new Date().toISOString() }])
        .select()
        .single();
      if (insertError) return res.redirect('houseofjainz://auth/callback?error=' + encodeURIComponent(insertError.message));
      user = newUser;
    }
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { data: userWithRole } = await supabase.from('users').select('role').eq('id', user.id).single();
    const userJson = encodeURIComponent(JSON.stringify({
      id: user.id, email: user.email, name: user.name, religion: user.religion, phone: user.phone,
      role: userWithRole?.role || 'user'
    }));
    res.redirect(`houseofjainz://auth/callback?token=${encodeURIComponent(token)}&user=${userJson}`);
  } catch (err) {
    console.error('Google callback error:', err);
    res.redirect('houseofjainz://auth/callback?error=' + encodeURIComponent(err.message || 'Google sign-in failed'));
  }
});

// Google login (own implementation: idToken or authorization code)
// Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env (from Google Cloud Console)
router.post('/google', async (req, res) => {
  try {
    if (!googleClientId) {
      return res.status(503).json({
        error: 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID in backend .env.',
      });
    }

    const { id_token, code, redirect_uri } = req.body;
    let payload;

    if (id_token) {
      // Verify Google ID token (e.g. from a native Google Sign-In SDK)
      const client = new OAuth2Client(googleClientId);
      const ticket = await client.verifyIdToken({
        idToken: id_token,
        audience: googleClientId,
      });
      payload = ticket.getPayload();
    } else if (code && redirect_uri && googleClientSecret) {
      // Exchange authorization code for tokens (e.g. from OAuth redirect in app)
      const client = new OAuth2Client(googleClientId, googleClientSecret, redirect_uri);
      const { tokens } = await client.getToken(code);
      const idToken = tokens.id_token;
      if (!idToken) {
        return res.status(401).json({ error: 'Google did not return an ID token' });
      }
      const ticket = await client.verifyIdToken({
        idToken,
        audience: googleClientId,
      });
      payload = ticket.getPayload();
    } else {
      return res.status(400).json({
        error: 'Provide either id_token or code + redirect_uri. For code flow, GOOGLE_CLIENT_SECRET must be set.',
      });
    }

    const email = payload.email;
    const name = payload.name || payload.given_name || email?.split('@')[0] || 'User';

    if (!email) {
      return res.status(400).json({ error: 'Google account must provide an email' });
    }

    // Find or create user in our users table
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) {
      const oauthPasswordPlaceholder = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            email,
            password: oauthPasswordPlaceholder,
            name,
            religion: 'Jain',
            phone: null,
            created_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (insertError) {
        return res.status(400).json({ error: insertError.message });
      }
      user = newUser;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

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
        role: userWithRole?.role || 'user'
      }
    });
  } catch (error) {
    console.error('Google login error:', error);
    if (error.message && error.message.includes('redirect_uri')) {
      return res.status(400).json({ error: 'Invalid or mismatched redirect_uri. Use the same redirect_uri as in the OAuth request.' });
    }
    res.status(401).json({ error: 'Invalid or expired Google sign-in' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, religion, phone, role, created_at')
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

