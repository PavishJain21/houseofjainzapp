import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ConsentContext from '../../context/ConsentContext';
import { AuthContext } from '../../context/AuthContext';
import { confirmAsync } from '../../utils/alert';

export default function OnboardingConsentScreen({ navigation }) {
  const consentContext = useContext(ConsentContext);
  const { user, signOut } = useContext(AuthContext);
  
  // Safely extract functions with fallbacks
  const grantMultipleConsents = consentContext?.grantMultipleConsents || (async () => ({ success: false }));
  const getConsentDocument = consentContext?.getConsentDocument || (async () => ({ success: false }));
  const loadConsents = consentContext?.loadConsents || (async () => {});
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [documents, setDocuments] = useState({});
  const [consents, setConsents] = useState({
    terms: false,
    privacy: false,
    cookies: false,
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  // Debug: Log button state whenever it changes
  useEffect(() => {
    const canContinue = consents.terms && consents.privacy && documents.terms && documents.privacy && !accepting;
    console.log('=== Continue Button State Changed ===');
    console.log('Can continue:', canContinue);
    console.log('Terms checked:', consents.terms);
    console.log('Privacy checked:', consents.privacy);
    console.log('Terms doc loaded:', !!documents.terms);
    console.log('Privacy doc loaded:', !!documents.privacy);
    console.log('Accepting:', accepting);
    console.log('====================================');
  }, [consents.terms, consents.privacy, documents.terms, documents.privacy, accepting]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const [termsResult, privacyResult, cookieResult] = await Promise.all([
        getConsentDocument('terms'),
        getConsentDocument('privacy'),
        getConsentDocument('cookie_policy'), // Database uses 'cookie_policy' as document type
      ]);

      const docs = {};
      if (termsResult.success && termsResult.document) {
        docs.terms = termsResult.document;
        console.log('✅ Terms document loaded:', docs.terms.version);
        console.log('Terms document object:', JSON.stringify(docs.terms, null, 2));
      } else {
        console.warn('⚠️ Terms document failed to load:', termsResult.error);
        console.warn('Terms result:', JSON.stringify(termsResult, null, 2));
      }
      
      if (privacyResult.success && privacyResult.document) {
        docs.privacy = privacyResult.document;
        console.log('✅ Privacy document loaded:', docs.privacy.version);
        console.log('Privacy document object:', JSON.stringify(docs.privacy, null, 2));
      } else {
        console.warn('⚠️ Privacy document failed to load:', privacyResult.error);
        console.warn('Privacy result:', JSON.stringify(privacyResult, null, 2));
      }
      
      if (cookieResult.success && cookieResult.document) {
        docs.cookies = cookieResult.document;
        console.log('✅ Cookies document loaded:', docs.cookies.version);
      } else {
        console.log('ℹ️ Cookies document not available (optional)');
      }

      // If required documents (terms/privacy) not found, show error
      if (!docs.terms || !docs.privacy) {
        console.error('❌ Required documents missing!');
        console.error('Docs object:', JSON.stringify(docs, null, 2));
        Alert.alert(
          'Setup Required',
          'Required consent documents are not available. Please ensure the database schema has been set up. Contact support for assistance.',
          [{ text: 'OK' }]
        );
      } else {
        console.log('✅ All required documents loaded successfully');
      }

      console.log('=== Documents loaded ===');
      console.log('Documents state:', JSON.stringify({
        terms: !!docs.terms,
        privacy: !!docs.privacy,
        cookies: !!docs.cookies
      }, null, 2));
      console.log('Full docs object keys:', Object.keys(docs));
      console.log('Docs.terms type:', typeof docs.terms);
      console.log('Docs.privacy type:', typeof docs.privacy);
      
      setDocuments(docs);
      
      // Verify state was set correctly
      setTimeout(() => {
        console.log('=== Verifying state after setDocuments ===');
        // This will be logged by the useEffect that watches documents
      }, 200);
    } catch (error) {
      Alert.alert('Error', 'Failed to load consent documents');
    } finally {
      setLoading(false);
    }
  };

  const toggleConsent = (type) => {
    setConsents((prev) => {
      const newState = {
        ...prev,
        [type]: !prev[type],
      };
      console.log(`✅ Checkbox toggled for ${type}:`, newState[type]);
      console.log('Updated consents state:', JSON.stringify(newState, null, 2));
      
      // Log button enable/disable status
      const canContinue = newState.terms && newState.privacy && documents.terms && documents.privacy && !accepting;
      console.log('=== Continue Button Status ===');
      console.log('Can continue:', canContinue);
      console.log('Terms checked:', newState.terms);
      console.log('Privacy checked:', newState.privacy);
      console.log('Terms doc loaded:', !!documents.terms);
      console.log('Privacy doc loaded:', !!documents.privacy);
      console.log('Accepting:', accepting);
      console.log('============================');
      
      return newState;
    });
  };

  const handleContinue = async () => {
    // Terms and Privacy are required
    if (!consents.terms || !consents.privacy) {
      Alert.alert(
        'Required Consents',
        'You must accept Terms and Conditions and Privacy Policy to continue.'
      );
      return;
    }

    // Validate that required documents are loaded
    if (!documents.terms || !documents.privacy) {
      Alert.alert(
        'Error',
        'Required documents are not loaded. Please wait a moment and try again.'
      );
      return;
    }

    setAccepting(true);
    try {
      const consentsArray = [];
      
      // Debug: Log current state
      console.log('=== Building Consents Array ===');
      console.log('Local consents state:', JSON.stringify(consents, null, 2));
      console.log('Documents loaded:', {
        terms: !!documents.terms,
        privacy: !!documents.privacy,
        cookies: !!documents.cookies,
        termsVersion: documents.terms?.version,
        privacyVersion: documents.privacy?.version,
        cookiesVersion: documents.cookies?.version
      });
      
      // Terms is required and should always be included if checked
      if (consents.terms && documents.terms && documents.terms.version) {
        consentsArray.push({
          consentType: 'terms',
          version: documents.terms.version,
        });
        console.log('✅ Added terms consent');
      } else {
        console.warn('⚠️ Terms not added:', {
          consentsTerms: consents.terms,
          hasDocument: !!documents.terms,
          hasVersion: !!documents.terms?.version
        });
      }
      
      // Privacy is required and should always be included if checked
      if (consents.privacy && documents.privacy && documents.privacy.version) {
        consentsArray.push({
          consentType: 'privacy',
          version: documents.privacy.version,
        });
        console.log('✅ Added privacy consent');
      } else {
        console.warn('⚠️ Privacy not added:', {
          consentsPrivacy: consents.privacy,
          hasDocument: !!documents.privacy,
          hasVersion: !!documents.privacy?.version
        });
      }
      
      // Cookies is optional
      if (consents.cookies && documents.cookies && documents.cookies.version) {
        consentsArray.push({
          consentType: 'cookies',
          version: documents.cookies.version,
        });
        console.log('✅ Added cookies consent');
      } else {
        console.log('ℹ️ Cookies not added (optional):', {
          consentsCookies: consents.cookies,
          hasDocument: !!documents.cookies,
          hasVersion: !!documents.cookies?.version
        });
      }

      // Validate that we have at least the required consents
      if (consentsArray.length === 0) {
        Alert.alert(
          'Error',
          'No consents to save. Please ensure Terms and Privacy are checked and documents are loaded.'
        );
        setAccepting(false);
        return;
      }

      console.log('=== Calling grantMultipleConsents API ===');
      console.log('Final consents array:', JSON.stringify(consentsArray, null, 2));
      console.log('GrantMultipleConsents function:', typeof grantMultipleConsents);
      
      if (!grantMultipleConsents || typeof grantMultipleConsents !== 'function') {
        console.error('grantMultipleConsents is not a function!', grantMultipleConsents);
        Alert.alert('Error', 'Consent function not available. Please try again.');
        setAccepting(false);
        return;
      }

      console.log('=== Making API call to grant consents ===');
      const result = await grantMultipleConsents(consentsArray);
      console.log('=== API Response Received ===');
      console.log('Result:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('✅ Consents granted successfully. needsConsent:', result.needsConsent);
        console.log('✅ API call completed. Navigation will update automatically.');
        
        // Force a reload of consents to ensure state is updated
        // Wait a bit for the backend to process
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Reload consents to update the context
        const reloadResult = await loadConsents();
        console.log('✅ Consents reloaded after grant. needsConsent:', reloadResult?.needsConsent);
        
        // The ConsentNavigator will automatically detect the change and show MainTabs
        // when contextNeedsConsent becomes false
      } else {
        console.error('❌ API call failed:', result.error);
        Alert.alert('Error', result.error || 'Failed to save consents. Please try again.');
      }
    } catch (error) {
      console.error('=== Error in handleContinue ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      Alert.alert('Error', `Failed to save consents: ${error.message || 'Unknown error'}`);
    } finally {
      setAccepting(false);
    }
  };

  const openDocument = (type) => {
    // Don't navigate if document doesn't exist (for cookies)
    if (type === 'cookies' && !documents.cookies) {
      console.info('Cookie Policy document not available. Skipping navigation.');
      return;
    }
    const screenName = type === 'terms' ? 'Terms' : type === 'privacy' ? 'Privacy' : 'CookiePolicy';
    navigation.navigate(screenName, {
      showAcceptButton: false,
    });
  };

  const handleLogout = () => {
    confirmAsync('Logout', 'Are you sure you want to logout?', signOut, 'Logout', 'Cancel');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading consent information...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.placeholder} />
        <Text style={styles.topBarTitle}>Terms & Conditions</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#f44336" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={64} color="#4CAF50" />
          <Text style={styles.title}>Welcome to House of Jainz</Text>
          <Text style={styles.subtitle}>
            Please review and accept our terms to continue
          </Text>
        </View>

        {/* Terms and Conditions */}
        <View style={styles.consentCard}>
          <View style={styles.consentHeader}>
            <View style={styles.consentInfo}>
              <Ionicons name="document-text" size={24} color="#4CAF50" />
              <View style={styles.consentTextContainer}>
                <Text style={styles.consentTitle}>Terms and Conditions</Text>
                <Text style={styles.consentSubtitle}>
                  Version {documents.terms?.version || '1.0'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.checkbox, consents.terms && styles.checkboxChecked]}
              onPress={() => toggleConsent('terms')}
            >
              {consents.terms && <Ionicons name="checkmark" size={20} color="#fff" />}
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.viewLink}
            onPress={() => openDocument('terms')}
          >
            <Text style={styles.viewLinkText}>View Terms and Conditions</Text>
            <Ionicons name="chevron-forward" size={20} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        {/* Privacy Policy */}
        <View style={styles.consentCard}>
          <View style={styles.consentHeader}>
            <View style={styles.consentInfo}>
              <Ionicons name="lock-closed" size={24} color="#2196F3" />
              <View style={styles.consentTextContainer}>
                <Text style={styles.consentTitle}>Privacy Policy</Text>
                <Text style={styles.consentSubtitle}>
                  Version {documents.privacy?.version || '1.0'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.checkbox, consents.privacy && styles.checkboxChecked]}
              onPress={() => toggleConsent('privacy')}
            >
              {consents.privacy && <Ionicons name="checkmark" size={20} color="#fff" />}
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.viewLink}
            onPress={() => openDocument('privacy')}
          >
            <Text style={styles.viewLinkText}>View Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color="#2196F3" />
          </TouchableOpacity>
        </View>

        {/* Cookie Policy - Always show, but disable if document doesn't exist */}
        <View style={styles.consentCard}>
          <View style={styles.consentHeader}>
            <View style={styles.consentInfo}>
              <Ionicons name="restaurant-outline" size={24} color="#FF9800" />
              <View style={styles.consentTextContainer}>
                <Text style={styles.consentTitle}>Cookie Policy</Text>
                <Text style={styles.consentSubtitle}>
                  {documents.cookies 
                    ? `Version ${documents.cookies.version} (Optional)`
                    : 'Not Available (Optional)'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.checkbox, 
                consents.cookies && styles.checkboxChecked,
                !documents.cookies && styles.checkboxDisabled
              ]}
              onPress={() => {
                if (documents.cookies) {
                  toggleConsent('cookies');
                }
              }}
              disabled={!documents.cookies}
            >
              {consents.cookies && documents.cookies && (
                <Ionicons name="checkmark" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          {documents.cookies ? (
            <TouchableOpacity
              style={styles.viewLink}
              onPress={() => openDocument('cookies')}
            >
              <Text style={styles.viewLinkText}>View Cookie Policy</Text>
              <Ionicons name="chevron-forward" size={20} color="#FF9800" />
            </TouchableOpacity>
          ) : (
            <View style={styles.viewLink}>
              <Text style={[styles.viewLinkText, { color: '#999', fontStyle: 'italic' }]}>
                Cookie Policy document not available
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.note}>
          * Terms and Conditions and Privacy Policy are required to use the app.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        {/* Debug info - remove in production */}
        {__DEV__ && (
          <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 5 }}>
            <Text style={{ fontSize: 10, color: '#666' }}>
              Debug: Terms checked: {consents.terms ? '✓' : '✗'} | 
              Privacy checked: {consents.privacy ? '✓' : '✗'} | 
              Terms doc: {documents.terms ? '✓' : '✗'} ({documents.terms?.version || 'none'}) | 
              Privacy doc: {documents.privacy ? '✓' : '✗'} ({documents.privacy?.version || 'none'}) | 
              Accepting: {accepting ? '✓' : '✗'}
            </Text>
            <Text style={{ fontSize: 9, color: '#999', marginTop: 5 }}>
              Documents keys: {Object.keys(documents).join(', ')} | 
              Terms exists: {String(!!documents.terms)} | 
              Privacy exists: {String(!!documents.privacy)}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!consents.terms || !consents.privacy || accepting || !documents.terms || !documents.privacy) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!consents.terms || !consents.privacy || accepting || !documents.terms || !documents.privacy}
        >
          {accepting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  logoutButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  consentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  consentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  consentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  consentTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  consentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  consentSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkboxDisabled: {
    opacity: 0.5,
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
  },
  viewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  viewLinkText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  note: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

