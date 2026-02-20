import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ConsentContext from '../context/ConsentContext';

export default function CookieConsent({ visible, onAccept, onDecline }) {
  const { grantConsent, revokeConsent, getConsentDocument } = useContext(ConsentContext);
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCookiePolicy();
    }
  }, [visible]);

  const loadCookiePolicy = async () => {
    try {
      setLoading(true);
      const result = await getConsentDocument('cookie_policy'); // Database uses 'cookie_policy' as document type
      if (result.success) {
        setDocument(result.document);
      } else if (result.notFound) {
        // Document not found - use default message
        console.warn('Cookie policy document not found. Using default message.');
      }
    } catch (error) {
      console.error('Error loading cookie policy:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!document) return;

    try {
      const result = await grantConsent('cookies', document.version);
      if (result.success) {
        if (onAccept) onAccept();
      } else {
        Alert.alert('Error', 'Failed to accept cookie policy');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to accept cookies');
    }
  };

  const handleDecline = async () => {
    try {
      await revokeConsent('cookies');
      if (onDecline) onDecline();
    } catch (error) {
      console.error('Error declining cookies:', error);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Ionicons name="restaurant-outline" size={32} color="#4CAF50" />
            <Text style={styles.title}>Cookie Consent</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
            </View>
          ) : (
            <>
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.description}>
                  We use cookies to enhance your experience, analyze site usage, and assist in our
                  marketing efforts. By clicking "Accept All", you consent to our use of cookies.
                </Text>

                {showDetails && document && (
                  <View style={styles.detailsContainer}>
                    <Text style={styles.detailsTitle}>Cookie Policy</Text>
                    <Text style={styles.detailsText}>{document.content}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.learnMoreButton}
                  onPress={() => setShowDetails(!showDetails)}
                >
                  <Text style={styles.learnMoreText}>
                    {showDetails ? 'Hide Details' : 'Learn More'}
                  </Text>
                  <Ionicons
                    name={showDetails ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#4CAF50"
                  />
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, styles.declineButton]}
                  onPress={handleDecline}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.acceptButton]}
                  onPress={handleAccept}
                >
                  <Text style={styles.acceptButtonText}>Accept All</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  content: {
    maxHeight: 400,
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 15,
  },
  detailsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  detailsText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#666',
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  learnMoreText: {
    fontSize: 14,
    color: '#4CAF50',
    marginRight: 5,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#f5f5f5',
  },
  declineButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

