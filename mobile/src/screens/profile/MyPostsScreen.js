import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import LanguageContext from '../../context/LanguageContext';
import api, { API_BASE_URL } from '../../config/api';
import { AuthContext } from '../../context/AuthContext';

export default function MyPostsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadMyPosts();
    }, [])
  );

  const loadMyPosts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/community/posts/my-posts');
      setPosts(response.data.posts || []);
    } catch (error) {
      console.error('Error loading my posts:', error);
      Alert.alert(t('common.error'), 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMyPosts();
    setRefreshing(false);
  };

  const handleDelete = async (postId) => {
    Alert.alert(
      t('community.deletePost'),
      t('community.deletePostConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/community/posts/${postId}`);
              setPosts(prev => prev.filter(p => p.id !== postId));
              Alert.alert(t('common.success'), 'Post deleted successfully');
            } catch (error) {
              Alert.alert(t('common.error'), 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  const renderPost = ({ item }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>{item.user?.name || 'User'}</Text>
            {item.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={12} color="#666" />
                <Text style={styles.location}>{item.location}</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item.id)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={20} color="#f44336" />
        </TouchableOpacity>
      </View>

      {item.content && (
        <Text style={styles.postContent}>{item.content}</Text>
      )}

      {item.image_url && (
        <Image
          source={{ 
            uri: item.image_url.startsWith('http') || item.image_url.startsWith('https')
              ? item.image_url 
              : `${API_BASE_URL.replace('/api', '')}${item.image_url}` 
          }}
          style={styles.postImage}
          resizeMode="cover"
          onError={(error) => {
            console.error('Image load error:', error.nativeEvent.error);
            console.error('Image URL:', item.image_url);
          }}
        />
      )}

      <View style={styles.postFooter}>
        <View style={styles.footerItem}>
          <Ionicons name="heart-outline" size={18} color="#666" />
          <Text style={styles.footerText}>{item.likes_count || 0}</Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="chatbubble-outline" size={18} color="#666" />
          <Text style={styles.footerText}>{item.comments_count || 0}</Text>
        </View>
        <Text style={styles.postDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>Your posts will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 10,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  location: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  deleteButton: {
    padding: 5,
  },
  postContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  postDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 5,
  },
});

