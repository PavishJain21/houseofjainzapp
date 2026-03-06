import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';

/**
 * Child Safety screen – view-only (no consent to accept).
 * Shows the child safety document from the API; linked from Profile and available at /childsafety on web.
 */
export default function ChildSafetyScreen({ navigation }) {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/consent/document/child_safety')
      .then((res) => {
        if (!cancelled && res.data?.document) {
          setDocument(res.data.document);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.status === 404 ? 'Child safety information not found' : err.message || 'Failed to load');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading Child Safety...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Child Safety</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="shield-checkmark-outline" size={48} color="#999" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {document && (
          <>
            <Text style={styles.title}>{document.title}</Text>
            <Text style={styles.version}>Version {document.version}</Text>
            <Text style={styles.effectiveDate}>
              Effective: {document.effective_date ? new Date(document.effective_date).toLocaleDateString() : '—'}
            </Text>
            <Text style={styles.divider}>━━━━━━━━━━━━━━━━━━━━</Text>
            <Text style={styles.contentText}>{document.content}</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    ...Platform.select({
      web: { height: '100vh', maxHeight: '100vh', overflow: 'hidden' },
      default: {},
    }),
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
  scrollView: {
    flex: 1,
    ...Platform.select({
      web: { minHeight: 0, overflow: 'auto' },
      default: {},
    }),
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  errorBox: {
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
});
