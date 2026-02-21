import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';

export default function AdminPostsScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPosts();
  }, [search]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const params = { page: 1, limit: 50 };
      if (search) params.search = search;

      const response = await api.get('/admin/community/posts', { params });
      setPosts(response.data.posts || []);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = (postId, userName) => {
    Alert.alert('Delete Post', `Are you sure you want to delete this post by ${userName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/admin/community/posts/${postId}`);
            Alert.alert('Success', 'Post deleted');
            loadPosts();
          } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to delete post');
          }
        },
      },
    ]);
  };

  const renderPost = ({ item }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.user?.name || 'Unknown'}</Text>
          <Text style={styles.postDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id, item.user?.name || 'Unknown')}
        >
          <Ionicons name="trash-outline" size={20} color="#f44336" />
        </TouchableOpacity>
      </View>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.postImage} />
      ) : null}
      <Text style={styles.postContent} numberOfLines={3}>
        {item.content}
      </Text>
      {item.location ? (
        <Text style={styles.postLocation}>
          <Ionicons name="location" size={14} color="#666" /> {item.location}
        </Text>
      ) : null}
      <View style={styles.postStats}>
        <Text style={styles.statText}>
          <Ionicons name="heart" size={14} color="#f44336" /> {item.likesCount || 0}
        </Text>
        <Text style={styles.statText}>
          <Ionicons name="chatbubble" size={14} color="#2196F3" /> {item.commentsCount || 0}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search posts..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadPosts} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No posts found</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  postCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  postDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  deleteButton: {
    padding: 5,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  postContent: {
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
  },
  postLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  postStats: {
    flexDirection: 'row',
    gap: 20,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
  },
});

