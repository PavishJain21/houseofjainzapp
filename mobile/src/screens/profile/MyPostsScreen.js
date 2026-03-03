import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import LanguageContext from '../../context/LanguageContext';
import api, { API_BASE_URL } from '../../config/api';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { confirmAsync } from '../../utils/alert';

const PAGE_SIZE = 10;

export default function MyPostsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const { theme } = useTheme();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const loadPage = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) {
      if (append) setRefreshing(true);
      else setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const response = await api.get('/community/posts/my-posts', {
        params: { page: pageNum, limit: PAGE_SIZE },
      });
      const newPosts = response.data.posts || [];
      const pagination = response.data.pagination || {};
      setHasMore(!!pagination.hasMore);
      setTotal(pagination.total ?? 0);
      if (append || pageNum === 1) {
        setPosts(pageNum === 1 ? newPosts : (prev) => [...prev, ...newPosts]);
      }
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading my posts:', error);
      if (pageNum === 1) setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPage(1);
    }, [loadPage])
  );

  const onRefresh = useCallback(async () => {
    await loadPage(1, true);
  }, [loadPage]);

  const onEndReached = useCallback(() => {
    if (!loadingMore && hasMore && posts.length > 0) {
      loadPage(page + 1);
    }
  }, [loadingMore, hasMore, page, loadPage, posts.length]);

  const handleDelete = (postId) => {
    confirmAsync(
      t('community.deletePost'),
      t('community.deletePostConfirm'),
      async () => {
        try {
          await api.delete(`/community/posts/${postId}`);
          setPosts((prev) => prev.filter((p) => p.id !== postId));
          setTotal((t) => Math.max(0, t - 1));
        } catch (error) {
          Alert.alert(t('common.error'), 'Failed to delete post');
        }
      },
      t('common.delete'),
      t('common.cancel')
    );
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const imageUri = (item) => {
    const url = item.image_url;
    if (!url) return null;
    return url.startsWith('http') ? url : `${API_BASE_URL.replace('/api', '')}${url}`;
  };

  const renderPost = ({ item }) => (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.avatarText}>
            {(item.user?.name || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.meta}>
          <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>
            {item.user?.name || 'User'}
          </Text>
          {item.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={theme.colors.textMuted} />
              <Text style={[styles.location, { color: theme.colors.textMuted }]} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.time, { color: theme.colors.textMuted }]}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item.id)}
          style={[styles.deleteBtn, { backgroundColor: theme.colors.borderLight }]}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
        </TouchableOpacity>
      </View>

      {item.content ? (
        <Text style={[styles.content, { color: theme.colors.text }]} numberOfLines={6}>
          {item.content}
        </Text>
      ) : null}

      {item.image_url ? (
        <Image
          source={{ uri: imageUri(item) }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : null}

      <View style={[styles.footer, { borderTopColor: theme.colors.borderLight }]}>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Ionicons name="heart-outline" size={18} color={theme.colors.textMuted} />
            <Text style={[styles.statText, { color: theme.colors.textMuted }]}>
              {item.likes_count || 0}
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="chatbubble-outline" size={18} color={theme.colors.textMuted} />
            <Text style={[styles.statText, { color: theme.colors.textMuted }]}>
              {item.comments_count || 0}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const ListHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
        {t('profile.myPosts')}
      </Text>
      <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>
        {total > 0 ? `${total} post${total !== 1 ? 's' : ''}` : 'Your posts appear here'}
      </Text>
    </View>
  );

  const ListFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={[styles.footerLoaderText, { color: theme.colors.textMuted }]}>
          Loading more...
        </Text>
      </View>
    );
  };

  const ListEmpty = () => {
    if (loading) {
      return (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            Loading your posts...
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.borderLight }]}>
          <Ionicons name="document-text-outline" size={48} color={theme.colors.textMuted} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
          No posts yet
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.colors.textMuted }]}>
          Create a post from the Community tab to see it here.
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={[styles.list, posts.length === 0 && !loading && styles.listEmpty]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  listEmpty: {
    flexGrow: 1,
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  location: {
    fontSize: 12,
    marginLeft: 4,
  },
  time: {
    fontSize: 12,
    marginTop: 2,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: 260,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
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
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
});
