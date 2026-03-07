const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken, requireNotGuest } = require('../middleware/auth');

const router = express.Router();

// Get user's consent status (guest: no consents stored)
router.get('/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'guest') {
      const { data: documents } = await supabase.from('consent_documents').select('*').eq('is_active', true).order('effective_date', { ascending: false });
      const consentStatus = { terms: { granted: false, needsConsent: true }, privacy: { granted: false, needsConsent: true }, cookies: { granted: false, needsConsent: true } };
      return res.json({ consents: consentStatus, documents: documents || [] });
    }
    const userId = req.user.userId;

    // Get all consents for the user
    const { data: consents, error } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Get latest active consent documents
    const { data: documents } = await supabase
      .from('consent_documents')
      .select('*')
      .eq('is_active', true)
      .order('effective_date', { ascending: false });

    // Organize consents by type
    const consentStatus = {};
    const requiredConsents = ['terms', 'privacy', 'cookies'];
    
    // Map consent types to document types (cookie_policy in DB vs cookies in consent)
    const documentTypeMap = {
      'terms': 'terms',
      'privacy': 'privacy',
      'cookies': 'cookie_policy' // Database uses 'cookie_policy' as document_type
    };
    
    requiredConsents.forEach(type => {
      // Find the most recent non-revoked consent for this type
      // Consents are already ordered by created_at descending, so first match is the latest
      const userConsent = consents?.find(c => 
        c.consent_type === type && 
        c.granted === true && 
        (!c.revoked_at || c.revoked_at === null)
      );
      // Use the mapped document type to find the document
      const documentType = documentTypeMap[type] || type;
      const latestDoc = documents?.find(d => d.document_type === documentType);
      
      const needsConsent = !userConsent || (userConsent && latestDoc && userConsent.consent_version !== latestDoc.version);
      
      console.log(`Consent status for ${type}:`, {
        hasConsent: !!userConsent,
        consentVersion: userConsent?.consent_version,
        docVersion: latestDoc?.version,
        needsConsent: needsConsent
      });
      
      consentStatus[type] = {
        granted: !!userConsent,
        grantedAt: userConsent?.granted_at || null,
        version: latestDoc?.version || '1.0',
        documentId: latestDoc?.id || null,
        needsConsent: needsConsent
      };
    });

    res.json({ consents: consentStatus, documents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Grant consent
router.post('/grant', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { consentType, version, ipAddress, userAgent } = req.body;

    if (!consentType || !version) {
      return res.status(400).json({ error: 'consentType and version are required' });
    }

    // Map consent types to document types (cookie_policy in DB vs cookies in consent)
    const documentTypeMap = {
      'terms': 'terms',
      'privacy': 'privacy',
      'cookies': 'cookie_policy' // Database uses 'cookie_policy' as document_type
    };
    const documentType = documentTypeMap[consentType] || consentType;

    // Verify document exists and is active
    const { data: document } = await supabase
      .from('consent_documents')
      .select('*')
      .eq('document_type', documentType)
      .eq('version', version)
      .eq('is_active', true)
      .single();

    if (!document) {
      return res.status(404).json({ error: 'Consent document not found or inactive' });
    }

    // Check if consent already exists for this version
    const { data: existingConsent } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', userId)
      .eq('consent_type', consentType)
      .eq('consent_version', version)
      .single();

    let consent;

    if (existingConsent && existingConsent.granted && !existingConsent.revoked_at) {
      // Consent already exists and is granted - update timestamp
      const { data: updatedConsent, error: updateError } = await supabase
        .from('user_consents')
        .update({
          granted_at: new Date().toISOString(),
          ip_address: ipAddress || req.ip,
          user_agent: userAgent || req.headers['user-agent'],
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConsent.id)
        .select()
        .single();

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }
      consent = updatedConsent;
    } else {
      // Revoke previous versions (different versions)
      await supabase
        .from('user_consents')
        .update({ 
          revoked_at: new Date().toISOString(),
          granted: false
        })
        .eq('user_id', userId)
        .eq('consent_type', consentType)
        .eq('granted', true)
        .is('revoked_at', null)
        .neq('consent_version', version);

      // If existing consent exists but is revoked, update it
      if (existingConsent) {
        const { data: updatedConsent, error: updateError } = await supabase
          .from('user_consents')
          .update({
            granted: true,
            granted_at: new Date().toISOString(),
            revoked_at: null,
            ip_address: ipAddress || req.ip,
            user_agent: userAgent || req.headers['user-agent'],
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConsent.id)
          .select()
          .single();

        if (updateError) {
          return res.status(400).json({ error: updateError.message });
        }
        consent = updatedConsent;
      } else {
        // Insert new consent
        const { data: newConsent, error: insertError } = await supabase
          .from('user_consents')
          .insert([
            {
              user_id: userId,
              consent_type: consentType,
              consent_version: version,
              granted: true,
              granted_at: new Date().toISOString(),
              ip_address: ipAddress || req.ip,
              user_agent: userAgent || req.headers['user-agent']
            }
          ])
          .select()
          .single();

        if (insertError) {
          return res.status(400).json({ error: insertError.message });
        }
        consent = newConsent;
      }
    }

    res.status(201).json({ 
      message: 'Consent granted successfully',
      consent 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Revoke consent
router.post('/revoke', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { consentType } = req.body;

    if (!consentType) {
      return res.status(400).json({ error: 'consentType is required' });
    }

    // Revoke all versions of this consent type
    const { data, error } = await supabase
      .from('user_consents')
      .update({ 
        revoked_at: new Date().toISOString(),
        granted: false
      })
      .eq('user_id', userId)
      .eq('consent_type', consentType)
      .eq('granted', true)
      .is('revoked_at', null)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      message: 'Consent revoked successfully',
      revoked: data 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get consent document by type and version
router.get('/document/:type/:version', async (req, res) => {
  try {
    const { type, version } = req.params;

    const { data: document, error } = await supabase
      .from('consent_documents')
      .select('*')
      .eq('document_type', type)
      .eq('version', version)
      .single();

    if (error || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ document });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get latest active consent document by type
router.get('/document/:type', async (req, res) => {
  try {
    const { type } = req.params;

    const { data: document, error } = await supabase
      .from('consent_documents')
      .select('*')
      .eq('document_type', type)
      .eq('is_active', true)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ document });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Grant multiple consents (for onboarding)
router.post('/grant-multiple', authenticateToken, requireNotGuest, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { consents, ipAddress, userAgent } = req.body; // consents: [{type, version}, ...]

    if (!consents || !Array.isArray(consents)) {
      return res.status(400).json({ error: 'consents array is required' });
    }

    // Map consent types to document types (cookie_policy in DB vs cookies in consent)
    const documentTypeMap = {
      'terms': 'terms',
      'privacy': 'privacy',
      'cookies': 'cookie_policy' // Database uses 'cookie_policy' as document_type
    };

    const grantedConsents = [];

    for (const consent of consents) {
      const { consentType, version } = consent;

      // Map consent type to document type
      const documentType = documentTypeMap[consentType] || consentType;

      // Verify document exists
      const { data: document } = await supabase
        .from('consent_documents')
        .select('*')
        .eq('document_type', documentType)
        .eq('version', version)
        .eq('is_active', true)
        .single();

      if (!document) {
        continue; // Skip invalid consents
      }

      // Check if consent already exists for this version
      const { data: existingConsent } = await supabase
        .from('user_consents')
        .select('*')
        .eq('user_id', userId)
        .eq('consent_type', consentType)
        .eq('consent_version', version)
        .single();

      if (existingConsent && existingConsent.granted && !existingConsent.revoked_at) {
        // Consent already exists and is granted - update timestamp and return it
        const { data: updatedConsent } = await supabase
          .from('user_consents')
          .update({
            granted_at: new Date().toISOString(),
            ip_address: ipAddress || req.ip,
            user_agent: userAgent || req.headers['user-agent'],
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConsent.id)
          .select()
          .single();
        
        if (updatedConsent) {
          grantedConsents.push(updatedConsent);
          console.log(`✅ Consent already exists and updated: ${consentType} version ${version} for user ${userId}`);
        }
      } else {
        // Revoke previous versions (different versions)
        await supabase
          .from('user_consents')
          .update({ 
            revoked_at: new Date().toISOString(),
            granted: false
          })
          .eq('user_id', userId)
          .eq('consent_type', consentType)
          .eq('granted', true)
          .is('revoked_at', null)
          .neq('consent_version', version); // Don't revoke the same version

        // If existing consent exists but is revoked, update it instead of inserting
        if (existingConsent) {
          const { data: updatedConsent, error: updateError } = await supabase
            .from('user_consents')
            .update({
              granted: true,
              granted_at: new Date().toISOString(),
              revoked_at: null,
              ip_address: ipAddress || req.ip,
              user_agent: userAgent || req.headers['user-agent'],
              updated_at: new Date().toISOString()
            })
            .eq('id', existingConsent.id)
            .select()
            .single();

          if (updateError) {
            console.error(`Error updating consent ${consentType}:`, updateError);
            continue;
          }

          if (updatedConsent) {
            grantedConsents.push(updatedConsent);
            console.log(`✅ Consent updated: ${consentType} version ${version} for user ${userId}`);
          }
        } else {
          // Insert new consent
          const { data: newConsent, error: insertError } = await supabase
            .from('user_consents')
            .insert([
              {
                user_id: userId,
                consent_type: consentType,
                consent_version: version,
                granted: true,
                granted_at: new Date().toISOString(),
                ip_address: ipAddress || req.ip,
                user_agent: userAgent || req.headers['user-agent']
              }
            ])
            .select()
            .single();

          if (insertError) {
            console.error(`Error granting consent ${consentType}:`, insertError);
            // Continue to next consent instead of failing completely
            continue;
          }

          if (newConsent) {
            grantedConsents.push(newConsent);
            console.log(`✅ Consent granted: ${consentType} version ${version} for user ${userId}`);
          } else {
            console.warn(`⚠️ Consent not granted: ${consentType} version ${version} - no data returned`);
          }
        }
      }
    }

    console.log(`✅ Total consents granted: ${grantedConsents.length} out of ${consents.length} requested`);
    
    res.status(201).json({ 
      message: 'Consents granted successfully',
      consents: grantedConsents,
      grantedCount: grantedConsents.length,
      requestedCount: consents.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

