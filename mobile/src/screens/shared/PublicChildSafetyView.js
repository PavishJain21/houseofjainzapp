import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';

/**
 * Public Child Safety page for houseofjainz.com/childsafety.
 * Fetches and displays the latest child safety document; no login required.
 */
export default function PublicChildSafetyView() {
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
          setError(err.response?.status === 404 ? 'Child safety information not found' : 'Failed to load');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const openApp = () => {
    const base = typeof window !== 'undefined' && window.location ? window.location.origin : 'https://houseofjainz.com';
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = base + '/';
    } else {
      Linking.openURL(base + '/');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading Child Safety...</Text>
      </View>
    );
  }

  if (error || !document) {
    return (
      <View style={styles.center}>
        <Ionicons name="shield-checkmark-outline" size={64} color="#ccc" />
        <Text style={styles.errorText}>{error || 'Child safety information not available'}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={openApp}>
          <Text style={styles.primaryButtonText}>Go to House of Jainz</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>House of Jainz</Text>
        <TouchableOpacity style={styles.openButton} onPress={openApp}>
          <Text style={styles.openButtonText}>Open app</Text>
          <Ionicons name="open-outline" size={18} color="#4CAF50" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{document.title}</Text>
        <Text style={styles.version}>Version {document.version}</Text>
        <Text style={styles.effectiveDate}>
          Effective: {document.effective_date ? new Date(document.effective_date).toLocaleDateString() : '—'}
        </Text>
        <Text style={styles.divider}>━━━━━━━━━━━━━━━━━━━━</Text>
        <Text style={styles.contentText}>{document.content}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={openApp}>
          <Text style={styles.primaryButtonText}>Open in House of Jainz</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'web' ? 48 : 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  openButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
    ...Platform.select({ web: { minHeight: 0 } }),
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
