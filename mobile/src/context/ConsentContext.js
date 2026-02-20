import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';
import { AuthContext } from './AuthContext';

// Provide default context value to prevent undefined errors
const defaultContextValue = {
  consents: {},
  loading: false,
  needsConsent: false,
  loadConsents: async () => {},
  grantConsent: async () => ({ success: false }),
  grantMultipleConsents: async () => ({ success: false }),
  revokeConsent: async () => ({ success: false }),
  getConsentDocument: async () => ({ success: false }),
  hasConsented: () => false,
  getConsentVersion: () => '1.0',
};

const ConsentContext = createContext(defaultContextValue);

export const ConsentProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [consents, setConsents] = useState({});
  const [loading, setLoading] = useState(true);
  const [needsConsent, setNeedsConsent] = useState(false);

  const loadConsents = useCallback(async (skipLoadingState = false) => {
    try {
      if (!skipLoadingState) {
        setLoading(true);
      }
      const response = await api.get('/consent/status');
      const consentData = response.data.consents || {};
      setConsents(consentData);

      // Check if user needs to grant required consents (terms and privacy are required, cookies optional)
      // A user needs consent if:
      // 1. They haven't granted it (!granted), OR
      // 2. The backend says they need consent (needsConsent = true, e.g., version mismatch)
      const needsTerms = !consentData.terms?.granted || consentData.terms?.needsConsent === true;
      const needsPrivacy = !consentData.privacy?.granted || consentData.privacy?.needsConsent === true;
      // Only terms and privacy are required
      const needsConsentValue = needsTerms || needsPrivacy;
      
      // Log for debugging - show full consent data to verify backend response
      console.log('=== Consent Status Loaded ===');
      console.log('Terms - Granted:', consentData.terms?.granted, '| Needs Consent:', consentData.terms?.needsConsent);
      console.log('Privacy - Granted:', consentData.privacy?.granted, '| Needs Consent:', consentData.privacy?.needsConsent);
      console.log('needsTerms:', needsTerms, '| needsPrivacy:', needsPrivacy);
      console.log('Final needsConsent:', needsConsentValue);
      console.log('Full consent data:', JSON.stringify(consentData, null, 2));
      console.log('============================');
      
      // Update state - this will trigger re-render
      setNeedsConsent(needsConsentValue);
      
      // Force a small delay to ensure state propagates
      if (!needsConsentValue) {
        console.log('✅ All required consents granted! needsConsent set to false');
      }
      
      return { success: true, needsConsent: needsConsentValue };
    } catch (error) {
      console.error('Error loading consents:', error);
      // Handle network errors gracefully
      if (error.message === 'Network Error' || !error.response) {
        console.warn('Network error loading consents. Backend may not be running.');
        // Don't block users if it's a network error - allow them to proceed
        setNeedsConsent(false);
        return { success: false, needsConsent: false };
      } else {
        // For other errors, assume consents are needed
        setNeedsConsent(true);
        return { success: false, needsConsent: true };
      }
    } finally {
      if (!skipLoadingState) {
        setLoading(false);
      }
    }
  }, []);

  const grantConsent = async (consentType, version, ipAddress = null, userAgent = null) => {
    try {
      // Check if already granted to prevent duplicates
      if (hasConsented(consentType)) {
        console.log(`Consent ${consentType} already granted`);
        return { success: true, data: { message: 'Already granted' } };
      }

      const response = await api.post('/consent/grant', {
        consentType,
        version,
        ipAddress,
        userAgent,
      });

      // Reload consents
      await loadConsents();
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error granting consent:', error);
      // Check if it's a duplicate error
      if (error.response?.status === 400 && error.response?.data?.error?.includes('already')) {
        // Already granted, reload consents and return success
        await loadConsents();
        return { success: true, data: { message: 'Already granted' } };
      }
      return { success: false, error: error.response?.data?.error || error.message };
    }
  };

  const grantMultipleConsents = async (consentsArray, ipAddress = null, userAgent = null) => {
    try {
      console.log('=== grantMultipleConsents API Call ===');
      console.log('Endpoint: POST /consent/grant-multiple');
      console.log('Payload:', JSON.stringify({ consents: consentsArray, ipAddress, userAgent }, null, 2));
      
      if (!consentsArray || consentsArray.length === 0) {
        console.warn('No consents to grant!');
        return { success: false, error: 'No consents provided' };
      }

      const response = await api.post('/consent/grant-multiple', {
        consents: consentsArray,
        ipAddress,
        userAgent,
      });

      console.log('=== API Response Success ===');
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data, null, 2));

      // Reload consents without showing loading state to prevent navigation reset
      const result = await loadConsents(true);
      console.log('Consents reloaded. needsConsent:', result?.needsConsent);
      
      return { success: true, data: response.data, needsConsent: result?.needsConsent };
    } catch (error) {
      console.error('=== Error granting multiple consents ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Full error:', JSON.stringify(error, null, 2));
      
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Unknown error occurred'
      };
    }
  };

  const revokeConsent = async (consentType) => {
    try {
      const response = await api.post('/consent/revoke', { consentType });
      await loadConsents();
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error revoking consent:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  };

  const getConsentDocument = async (type, version = null) => {
    try {
      // Use the type directly - backend expects the exact document_type from database
      // Database uses 'cookie_policy' as document_type, so we use it directly
      const endpoint = version 
        ? `/consent/document/${type}/${version}`
        : `/consent/document/${type}`;
      const response = await api.get(endpoint);
      return { success: true, document: response.data.document };
    } catch (error) {
      // Handle network errors
      if (error.message === 'Network Error' || !error.response) {
        // Don't log warnings for network errors - they're expected if backend is down
        // Only log for required documents
        if (type !== 'cookies' && type !== 'cookie_policy') {
          console.warn(`Network error fetching consent document ${type}. Backend may not be running.`);
        }
        return { 
          success: false, 
          error: `Network error. Please check your connection.`,
          networkError: true 
        };
      }
      // Handle 404 gracefully - document might not exist yet (schema not run)
      if (error.response?.status === 404) {
        // Only log warning for required documents (terms, privacy), not optional ones (cookies)
        if (type !== 'cookies' && type !== 'cookie_policy') {
          console.warn(`Consent document ${type} not found. Please run consent_schema.sql in Supabase.`);
        }
        return { 
          success: false, 
          error: `Document not found. Please contact support.`,
          notFound: true 
        };
      }
      console.error('Error fetching consent document:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  };

  const hasConsented = (consentType) => {
    return consents[consentType]?.granted === true && !consents[consentType]?.needsConsent;
  };

  const getConsentVersion = (consentType) => {
    return consents[consentType]?.version || '1.0';
  };

  useEffect(() => {
    if (user && token) {
      console.log('Loading consents on app start/user login...');
      loadConsents();
    } else {
      // No user logged in, reset state
      setConsents({});
      setNeedsConsent(false);
      setLoading(false);
    }
  }, [user, token, loadConsents]);

  // Memoize context value to ensure React detects changes properly
  // This ensures re-renders when consents, loading, or needsConsent change
  // Include loadConsents in dependencies since it's used by other functions
  const contextValue = useMemo(() => ({
    consents: consents || {},
    loading: loading ?? false,
    needsConsent: needsConsent ?? false,
    loadConsents,
    grantConsent,
    grantMultipleConsents,
    revokeConsent,
    getConsentDocument,
    hasConsented,
    getConsentVersion,
  }), [consents, loading, needsConsent, loadConsents]);

  return (
    <ConsentContext.Provider value={contextValue}>
      {children}
    </ConsentContext.Provider>
  );
};

// Export both default and named for flexibility
export default ConsentContext;
export { ConsentContext };

