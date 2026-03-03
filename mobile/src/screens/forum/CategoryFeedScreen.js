import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActionSheetIOS,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import { AuthContext } from '../../context/AuthContext';
import { shareContent, getPostShareUrl } from '../../utils/share';
import { confirmAsync } from '../../utils/alert';
import { getLocationWithFallback } from '../../utils/location';

export default function CategoryFeedScreen({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const { categorySlug, categoryLabel } = route.params || {};
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [postOptionsPost, setPostOptionsPost] = useState(null);
  const [userCity, setUserCity] = useState(null);
  const [locationFilter, setLocationFilter] = useState(null);

  const loadPosts = async (page = 1, append = false, locationParam = undefined) => {
    if (!categorySlug) return;
    if (append && loadingMore) return;
    if (!append && loading) return;
    const loc = locationParam !== undefined ? locationParam : locationFilter;

    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = { page, limit: 10 };
      if (loc && String(loc).trim()) params.location = String(loc).trim();
      const res = await api.get(`/forum/categories/${categorySlug}/posts`, { params });
      const newPosts = res.data.posts || [];
      const pagination = res.data.pagination || {};

      if (append) {
        setPosts((prev) => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }
      setHasMore(pagination.hasMore ?? false);
      setCurrentPage(page);
    } catch (err) {
      if (page === 1) {
        Alert.alert('Error', err.response?.data?.error || 'Failed to load posts');
      } else {
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPosts(1, false);
  }, [categorySlug]);

  // Refetch when returning to screen (e.g. after creating a post), not on first mount
  const isFirstFocus = React.useRef(true);
  useFocusEffect(
    React.useCallback(() => {
      if (!categorySlug) return;
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
      } else {
        loadPosts(1, false);
      }
    }, [categorySlug])
  );

  useEffect(() => {
    const title = categoryLabel || 'Forum';
    navigation.setOptions({ title });
  }, [categoryLabel, navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasMore(true);
    await loadPosts(1, false);
    setRefreshing(false);
  };

  const handleFilterNearby = async () => {
    if (locationFilter) return;
    let city = userCity;
    if (!city) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Location', 'Allow location to filter posts by nearby area.');
          return;
        }
        const locationData = await getLocationWithFallback({});
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: locationData.coords.latitude,
          longitude: locationData.coords.longitude,
        });
        if (reverseGeocode?.length) {
          const address = reverseGeocode[0];
          city = address.city || address.district || address.subregion || address.region || null;
          setUserCity(city);
        }
      } catch (e) {
        Alert.alert('Error', e?.message || 'Could not get location');
        return;
      }
    }
    if (city) {
      setLocationFilter(city);
      await loadPosts(1, false, city);
    } else {
      Alert.alert('Location', 'Could not detect your area. Try again or use All.');
    }
  };

  const handleFilterAll = () => {
    if (!locationFilter) return;
    setLocationFilter(null);
    loadPosts(1, false, null);
  };

  const loadMore = () => {
    if (!loadingMore && !loading && hasMore && posts.length > 0) {
      loadPosts(currentPage + 1, true);
    }
  };

  const handleLike = async (postId) => {
    try {
      await api.post(`/forum/posts/${postId}/like`);
      loadPosts(currentPage, false);
    } catch (err) {
      Alert.alert('Error', 'Failed to update like');
    }
  };

  const openComments = async (postId) => {
    setSelectedPostId(postId);
    setCommentText('');
    setCommentModalVisible(true);
    await loadComments(postId);
  };

  const loadComments = async (postId, page = 1, append = false) => {
    setLoadingComments(true);
    try {
      const res = await api.get(`/forum/posts/${postId}/comments`, {
        params: { page, limit: 20 },
      });
      const newComments = res.data.comments || [];
      if (append) {
        setComments((prev) => [...prev, ...newComments]);
      } else {
        setComments(newComments);
      }
    } catch (err) {
      if (!append) setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const submitComment = async () => {
    if (!commentText.trim() || !selectedPostId) return;
    try {
      await api.post(`/forum/posts/${selectedPostId}/comments`, {
        content: commentText.trim(),
      });
      setCommentText('');
      await loadComments(selectedPostId);
      loadPosts(currentPage, false);
    } catch (err) {
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const handleMoreOptions = (post) => {
    const isOwnPost = post.isOwnPost || (user && post.user?.id === user.id);
    if (Platform.OS === 'web') {
      setPostOptionsPost({ post, isOwnPost });
      return;
    }
    const options = ['Cancel', 'Share Post'];
    let destructiveIndex = -1;
    if (isOwnPost) {
      options.push('Delete Post');
      destructiveIndex = 2;
    }
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0, destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined },
        (idx) => {
          if (idx === 1) handleShare(post);
          else if (idx === 2 && isOwnPost) handleDeletePost(post);
        }
      );
    } else {
      const buttons = [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share Post', onPress: () => handleShare(post) },
      ];
      if (isOwnPost) {
        buttons.push({
          text: 'Delete Post',
          style: 'destructive',
          onPress: () => handleDeletePost(post),
        });
      }
      Alert.alert('Post Options', 'Choose an action', buttons, { cancelable: true });
    }
  };

  const handleShare = async (post) => {
    setPostOptionsPost(null);
    const url = getPostShareUrl(post.id, 'forum');
    await shareContent({
      title: 'Post from House of Jainz',
      message: '',
      url,
    });
  };

  const handleDeletePost = (post) => {
    setPostOptionsPost(null);
    confirmAsync(
      'Delete Post',
      'Are you sure you want to delete this post?',
      async () => {
        try {
          await api.delete(`/forum/posts/${post.id}`);
          loadPosts(1, false);
        } catch (err) {
          Alert.alert('Error', err.response?.data?.error || 'Failed to delete');
        }
      },
      'Delete',
      'Cancel'
    );
  };

  const renderPost = ({ item }) => (
    <View style={styles.post}>
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(item.user?.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.user?.name || 'User'}</Text>
            <Text style={styles.postTime}>
              {new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: new Date(item.created_at).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
              })}
            </Text>
            {item.location ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={12} color="#8e8e8e" />
                <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => handleMoreOptions(item)}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      <Text style={styles.postContent}>{item.content}</Text>

      <View style={styles.postActions}>
        <TouchableOpacity
          style={[styles.actionButton, item.isLiked && styles.actionButtonActive]}
          onPress={() => handleLike(item.id)}
        >
          <Ionicons
            name={item.isLiked ? 'heart' : 'heart-outline'}
            size={22}
            color={item.isLiked ? '#4CAF50' : '#666'}
          />
          <Text style={[styles.actionText, item.isLiked && styles.likedText]}>
            {item.likesCount || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openComments(item.id)}
        >
          <Ionicons name="chatbubble-outline" size={22} color="#666" />
          <Text style={styles.actionText}>{item.commentsCount || 0}</Text>
        </TouchableOpacity>

        <View style={styles.actionSpacer} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, !locationFilter && styles.filterChipActive]}
              onPress={handleFilterAll}
            >
              <Ionicons name="globe-outline" size={18} color={!locationFilter ? '#fff' : '#333'} />
              <Text style={[styles.filterChipText, !locationFilter && styles.filterChipTextActive]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, locationFilter && styles.filterChipActive]}
              onPress={handleFilterNearby}
            >
              <Ionicons name="location-outline" size={18} color={locationFilter ? '#fff' : '#333'} />
              <Text style={[styles.filterChipText, locationFilter && styles.filterChipTextActive]} numberOfLines={1}>
                {locationFilter ? (locationFilter.length > 12 ? `${locationFilter.slice(0, 10)}…` : locationFilter) : 'Nearby'}
              </Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={56} color="#ccc" />
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>Be the first to post in this category</Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <Text style={styles.footerText}>Loading more...</Text>
            </View>
          ) : null
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate('CreateForumPost', {
            categorySlug,
            categoryLabel: categoryLabel || categorySlug,
          })
        }
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={commentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setCommentModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Backdrop: tap here to dismiss keyboard; content is a sibling so TextInput is tappable */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.modalContent} pointerEvents="box-none">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setCommentModalVisible(false);
                  setComments([]);
                  setCommentText('');
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.commentsList}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.commentsListContent}
            >
              {loadingComments ? (
                <Text style={styles.loadingComments}>Loading...</Text>
              ) : comments.length === 0 ? (
                <Text style={styles.noComments}>No comments yet</Text>
              ) : (
                comments.map((c) => (
                  <View key={c.id} style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <View style={styles.commentAvatar}>
                        <Text style={styles.commentAvatarText}>
                          {(c.user?.name || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.commentUserName}>{c.user?.name || 'User'}</Text>
                        <Text style={styles.commentTime}>
                          {new Date(c.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.commentContent}>{c.content}</Text>
                  </View>
                ))
              )}
            </ScrollView>
            <View style={styles.addCommentSection}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                placeholderTextColor="#666"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.submitCommentBtn, !commentText.trim() && styles.submitCommentBtnDisabled]}
                onPress={submitComment}
                disabled={!commentText.trim()}
              >
                <Text style={styles.submitCommentText}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Web: Post options modal (Share / Delete) */}
      {Platform.OS === 'web' && (
        <Modal
          visible={!!postOptionsPost}
          transparent
          animationType="fade"
          onRequestClose={() => setPostOptionsPost(null)}
        >
          <TouchableWithoutFeedback onPress={() => setPostOptionsPost(null)}>
            <View style={styles.webOptionsOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.webOptionsBox}>
                  <Text style={styles.webOptionsTitle}>Post options</Text>
                  <TouchableOpacity
                    style={styles.webOptionsButton}
                    onPress={() => postOptionsPost && handleShare(postOptionsPost.post)}
                  >
                    <Ionicons name="share-outline" size={22} color="#262626" />
                    <Text style={styles.webOptionsButtonText}>Share Post</Text>
                  </TouchableOpacity>
                  {postOptionsPost?.isOwnPost && (
                    <TouchableOpacity
                      style={[styles.webOptionsButton, styles.webOptionsButtonDanger]}
                      onPress={() => postOptionsPost && handleDeletePost(postOptionsPost.post)}
                    >
                      <Ionicons name="trash-outline" size={22} color="#c62828" />
                      <Text style={[styles.webOptionsButtonText, { color: '#c62828' }]}>Delete Post</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.webOptionsButton, styles.webOptionsButtonCancel]}
                    onPress={() => setPostOptionsPost(null)}
                  >
                    <Text style={styles.webOptionsButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    minHeight: 48,
    flexShrink: 0,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
    gap: 6,
    minWidth: 72,
    flexShrink: 0,
  },
  filterChipActive: {
    backgroundColor: '#4CAF50',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    maxWidth: 120,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  webOptionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  webOptionsBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    minWidth: 240,
    maxWidth: 320,
  },
  webOptionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  webOptionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 10,
  },
  webOptionsButtonText: {
    fontSize: 16,
    color: '#262626',
  },
  webOptionsButtonDanger: {},
  webOptionsButtonCancel: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 4,
  },
  list: {
    padding: 12,
    paddingBottom: 100,
  },
  post: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
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
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  postTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#8e8e8e',
    marginLeft: 4,
  },
  moreButton: {
    padding: 8,
  },
  postContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },
  actionButtonActive: {
    backgroundColor: '#E8F5E9',
  },
  actionText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  likedText: {
    color: '#4CAF50',
  },
  actionSpacer: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 12,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 6,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    ...Platform.select({ web: { alignItems: 'center' } }),
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
    minHeight: '50%',
    ...Platform.select({
      web: { width: '100%', maxWidth: 430, alignSelf: 'center' },
      default: {},
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  commentsList: {
    flex: 1,
    marginBottom: 12,
  },
  commentsListContent: {
    paddingBottom: 12,
  },
  loadingComments: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  noComments: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
    fontStyle: 'italic',
  },
  commentItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  commentAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  commentTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  commentContent: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginLeft: 42,
  },
  addCommentSection: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 48,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  submitCommentBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  submitCommentBtnDisabled: {
    opacity: 0.5,
  },
  submitCommentText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
