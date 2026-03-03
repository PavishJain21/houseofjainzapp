import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE_URL } from '../../config/api';

/**
 * Standalone view for a shared post link (e.g. houseofjainz.com/post/123).
 * Fetches and displays a single post; no auth required.
 * type: 'community' | 'forum'
 */
export default function SharedPostView({ postId, type = 'community' }) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const path = type === 'forum' ? `/forum/posts/${postId}` : `/community/posts/${postId}`;
    api
      .get(path)
      .then((res) => {
        if (!cancelled && res.data && res.data.post) {
          setPost(res.data.post);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.status === 404 ? 'Post not found' : 'Failed to load post');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [postId, type]);

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
        <Text style={styles.loadingText}>Loading post...</Text>
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={styles.center}>
        <Ionicons name="document-text-outline" size={64} color="#ccc" />
        <Text style={styles.errorText}>{error || 'Post not found'}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={openApp}>
          <Text style={styles.primaryButtonText}>Go to House of Jainz</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUrl = post.image_url
    ? (post.image_url.startsWith('http') ? post.image_url : `${API_BASE_URL.replace('/api', '')}${post.image_url}`)
    : null;

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
        <View style={styles.card}>
          <View style={styles.postHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(post.user?.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userMeta}>
              <Text style={styles.userName}>{post.user?.name || 'User'}</Text>
              {post.location ? (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={12} color="#8e8e8e" />
                  <Text style={styles.locationText} numberOfLines={1}>{post.location}</Text>
                </View>
              ) : null}
              <Text style={styles.time}>
                {post.created_at
                  ? new Date(post.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: new Date(post.created_at).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                    })
                  : ''}
              </Text>
            </View>
          </View>
          {post.content ? <Text style={styles.content}>{post.content}</Text> : null}
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.postImage} resizeMode="cover" />
          ) : null}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Ionicons name="heart-outline" size={18} color="#666" />
              <Text style={styles.statText}>{post.likesCount ?? 0}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="chatbubble-outline" size={18} color="#666" />
              <Text style={styles.statText}>{post.commentsCount ?? 0}</Text>
            </View>
          </View>
        </View>
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
    backgroundColor: '#f5f5f5',
    ...Platform.select({
      web: { height: '100vh', maxHeight: '100vh' },
      default: {},
    }),
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
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
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  userMeta: { flex: 1 },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: '#8e8e8e',
    marginLeft: 4,
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  content: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#666',
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
