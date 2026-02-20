import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ConsentContext from '../../context/ConsentContext';
import { AuthContext } from '../../context/AuthContext';

export default function CookiePolicyScreen({ navigation, route }) {
  const { grantConsent, getConsentDocument, consents, hasConsented } = useContext(ConsentContext);
  const { signOut } = useContext(AuthContext);
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const { onAccept, showAcceptButton = true } = route?.params || {};
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  };

  useEffect(() => {
    loadDocument();
    // Check if user has already accepted
    if (consents && consents.cookies) {
      setAlreadyAccepted(hasConsented('cookies'));
    }
  }, [consents]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const result = await getConsentDocument('cookie_policy'); // Database uses 'cookie_policy' as document type
      if (result.success) {
        setDocument(result.document);
      } else {
        // Cookies is optional, so handle errors gracefully without showing alerts
        if (result.networkError) {
          console.warn('Network error loading cookie policy:', result.error);
        } else if (result.notFound) {
          // Don't show alert - cookies is optional
          console.info('Cookie Policy document not found. This is optional and will be skipped.');
        } else {
          console.warn('Error loading Cookie Policy:', result.error);
        }
        // Document will remain null, UI will show "Document not available" message
      }
    } catch (error) {
      console.error('Error loading cookie policy:', error);
      // Don't show alert, just log the error - cookies is optional
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!document) return;

    setAccepting(true);
    try {
      const result = await grantConsent('cookies', document.version);
      if (result.success) {
        if (onAccept) {
          onAccept();
        } else {
          navigation.goBack();
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to accept cookie policy');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to accept cookie policy');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading Cookie Policy...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cookie Policy</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#f44336" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {document ? (
          <>
            <Text style={styles.title}>{document.title}</Text>
            <Text style={styles.version}>Version {document.version}</Text>
            <Text style={styles.effectiveDate}>
              Effective: {new Date(document.effective_date).toLocaleDateString()}
            </Text>
            <Text style={styles.divider}>━━━━━━━━━━━━━━━━━━━━</Text>
            <Text style={styles.contentText}>{document.content}</Text>
          </>
        ) : !loading && (
          <View style={styles.noDocumentContainer}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.noDocumentText}>Document not available</Text>
            <Text style={styles.noDocumentSubtext}>
              Please check your connection or contact support.
            </Text>
          </View>
        )}
      </ScrollView>

      {showAcceptButton && !alreadyAccepted && document && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.acceptButton, accepting && styles.acceptButtonDisabled]}
            onPress={handleAccept}
            disabled={accepting}
          >
            {accepting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.acceptButtonText}>Accept Cookie Policy</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
      {alreadyAccepted && (
        <View style={styles.footer}>
          <View style={styles.acceptedBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.acceptedText}>Already Accepted</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  version: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  effectiveDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
  },
  divider: {
    fontSize: 16,
    color: '#e0e0e0',
    marginBottom: 20,
    textAlign: 'center',
  },
  contentText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
    marginBottom: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptedBadge: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptedText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  noDocumentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noDocumentText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },
  noDocumentSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
});

