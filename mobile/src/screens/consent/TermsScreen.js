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
import api from '../../config/api';

export default function TermsScreen({ navigation, route }) {
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
    if (consents && consents.terms) {
      setAlreadyAccepted(hasConsented('terms'));
    }
  }, [consents]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const result = await getConsentDocument('terms');
      if (result.success) {
        setDocument(result.document);
      } else {
        if (result.notFound) {
          Alert.alert(
            'Document Not Available',
            'Terms and Conditions document is not available. Please contact support or try again later.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          Alert.alert('Error', result.error || 'Failed to load Terms and Conditions');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!document) return;

    setAccepting(true);
    try {
      const result = await grantConsent('terms', document.version);
      if (result.success) {
        if (onAccept) {
          onAccept();
        } else {
          navigation.goBack();
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to accept terms');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to accept terms');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading Terms and Conditions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms and Conditions</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#f44336" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {document && (
          <>
            <Text style={styles.title}>{document.title}</Text>
            <Text style={styles.version}>Version {document.version}</Text>
            <Text style={styles.effectiveDate}>
              Effective: {new Date(document.effective_date).toLocaleDateString()}
            </Text>
            <Text style={styles.divider}>━━━━━━━━━━━━━━━━━━━━</Text>
            <Text style={styles.contentText}>{document.content}</Text>
          </>
        )}
      </ScrollView>

      {showAcceptButton && !alreadyAccepted && (
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
                <Text style={styles.acceptButtonText}>Accept Terms</Text>
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
});

