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
  Modal,
  TextInput,
  ActionSheetIOS,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import * as Location from 'expo-location';
import { getLocationWithFallback } from '../../utils/location';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE_URL } from '../../config/api';
import { AuthContext } from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import { shareContent, getPostShareUrl } from '../../utils/share';
import { confirmAsync } from '../../utils/alert';
import { useTheme } from '../../context/ThemeContext';
import AppBanner from '../../components/AppBanner';
import Logo from '../../components/Logo';
import LanguageToggle from '../../components/LanguageToggle';

export default function CommunityScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const { theme } = useTheme();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [userCity, setUserCity] = useState(null);
  const [locationFilter, setLocationFilter] = useState(null); // null = All, string = nearby city
  const [currentPage, setCurrentPage] = useState(1);
  const [postOptionsPost, setPostOptionsPost] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      await getUserLocation();
      await loadPosts(1, false);
    };
    initialize();
  }, []);

  // Prepend newly created post when returning from CreatePost (no full refetch)
  useEffect(() => {
    const newPost = route.params?.newPost;
    if (newPost && newPost.id) {
      setPosts((prev) => {
        if (prev.some((p) => p.id === newPost.id)) return prev;
        return [newPost, ...prev];
      });
      navigation.setParams({ newPost: undefined });
    }
  }, [route.params?.newPost]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const locationData = await getLocationWithFallback({});
      const { latitude, longitude } = locationData.coords;
      
      // Reverse geocode to get city name
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        const cityName = address.city || address.district || address.subregion || address.region || null;
        setUserCity(cityName);
        console.log('User city detected:', cityName);
      }
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };


  const loadPosts = async (page = 1, append = false, locationParam = undefined) => {
    // Prevent duplicate requests
    if (append && loadingMore) return;
    if (!append && loading) return;
    const loc = locationParam !== undefined ? locationParam : locationFilter;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setCurrentPage(1);
      setHasMore(true);
    }

    try {
      const params = { page, limit: 10 };
      if (loc && String(loc).trim()) params.location = String(loc).trim();
      const response = await api.get('/community/posts', { params });
      
      let newPosts = response.data.posts || [];
      const pagination = response.data.pagination || {};
      
      // Sort posts: same city first when not filtering by location (only for first page)
      if (userCity && page === 1 && !loc) {
        newPosts = newPosts.sort((a, b) => {
          const aIsSameCity = a.location && a.location.toLowerCase().includes(userCity.toLowerCase());
          const bIsSameCity = b.location && b.location.toLowerCase().includes(userCity.toLowerCase());
          if (aIsSameCity && !bIsSameCity) return -1;
          if (!aIsSameCity && bIsSameCity) return 1;
          return 0;
        });
      }
      
      if (append) {
        setPosts(prevPosts => [...prevPosts, ...newPosts]);
      } else {
        setPosts(newPosts);
      }
      
      setHasMore(pagination.hasMore || false);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading posts:', error);
      // Only show alert if it's not a pagination error (400) or if it's the first page
      if (page === 1) {
        Alert.alert('Error', error.response?.data?.error || 'Failed to load posts');
      } else {
        // For pagination errors, just stop loading more
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMorePosts = () => {
    // Prevent loading more if:
    // - Already loading more
    // - Currently loading initial posts
    // - No more posts available
    // - Posts array is empty (initial load not complete)
    if (!loadingMore && !loading && hasMore && posts.length > 0) {
      loadPosts(currentPage + 1, true);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasMore(true);
    await getUserLocation();
    await loadPosts(1, false);
    setRefreshing(false);
  };

  const handleFilterNearby = async () => {
    if (locationFilter) return; // already filtering by nearby
    let city = userCity;
    if (!city) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('community.locationPermission') || 'Location', t('community.locationPermissionMessage') || 'Allow location to filter posts by nearby area.');
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

  const handleLike = async (postId) => {
    try {
      await api.post(`/community/posts/${postId}/like`);
      // Reload current page to update like status
      loadPosts(currentPage, false);
    } catch (error) {
      console.error('Like error:', error);
      Alert.alert('Error', 'Failed to like post');
    }
  };

  const handleComment = async (postId) => {
    setSelectedPostId(postId);
    setCommentText('');
    setCommentModalVisible(true);
    
    // Load comments for this post
    await loadComments(postId);
  };

  const loadComments = async (postId, page = 1, append = false) => {
    setLoadingComments(true);
    try {
      const response = await api.get(`/community/posts/${postId}/comments`, {
        params: { page, limit: 20 },
      });
      const newComments = response.data.comments || [];
      
      if (append) {
        setComments(prevComments => [...prevComments, ...newComments]);
      } else {
        setComments(newComments);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      if (!append) {
        setComments([]);
      }
    } finally {
      setLoadingComments(false);
    }
  };

  const submitComment = async () => {
    if (!commentText.trim() || !selectedPostId) {
      return;
    }

    try {
      await api.post(`/community/posts/${selectedPostId}/comments`, {
        content: commentText.trim(),
      });
      setCommentText('');
      // Reload comments to show the new one
      await loadComments(selectedPostId);
      // Reload posts to update comment count
      loadPosts();
    } catch (error) {
      console.error('Comment error:', error);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const handleMoreOptions = (post) => {
    // Check if post belongs to current user (using isOwnPost flag from backend or comparing IDs)
    const isOwnPost = post.isOwnPost || (user && post.user?.id === user.id);
    const options = ['Cancel', 'Share Post'];
    const cancelButtonIndex = 0;
    let destructiveButtonIndex = -1;

    if (isOwnPost) {
      options.push('Delete Post');
      destructiveButtonIndex = 2;
    }

    if (Platform.OS === 'web') {
      setPostOptionsPost({ post, isOwnPost });
      return;
    }
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleShare(post);
          else if (buttonIndex === 2 && isOwnPost) handleDeletePost(post);
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
    const url = getPostShareUrl(post.id, 'community');
    await shareContent({
      title: 'Post from House of Jainz',
      message: '',
      url,
    });
  };

  const handleDeletePost = async (post) => {
    setPostOptionsPost(null);
    confirmAsync(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      async () => {
        try {
          await api.delete(`/community/posts/${post.id}`);
          if (Platform.OS !== 'web') Alert.alert('Success', 'Post deleted successfully');
          loadPosts();
        } catch (error) {
          console.error('Error deleting post:', error);
          Alert.alert('Error', error.response?.data?.error || 'Failed to delete post');
        }
      },
      'Delete',
      'Cancel'
    );
  };

  const renderPost = ({ item }) => (
    <View style={styles.post}>
      {/* Instagram-style: header row */}
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={1}>{item.user?.name || 'User'}</Text>
            {item.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={12} color="#8e8e8e" />
                <Text style={styles.location} numberOfLines={1}>{item.location}</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => handleMoreOptions(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#262626" />
        </TouchableOpacity>
      </View>

      {/* Photo: full-width card image */}
      {item.image_url && (
        <Image
          source={{
            uri: item.image_url.startsWith('http') || item.image_url.startsWith('https')
              ? item.image_url
              : `${API_BASE_URL.replace('/api', '')}${item.image_url}`,
          }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      {/* Action bar: like, comment (Instagram-style) */}
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLike(item.id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={item.isLiked ? 'heart' : 'heart-outline'}
            size={26}
            color={item.isLiked ? '#4CAF50' : '#262626'}
          />
          {(item.likesCount || 0) > 0 && (
            <Text style={[styles.actionCount, item.isLiked && styles.actionCountLiked]}>
              {item.likesCount}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleComment(item.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#262626" />
          {(item.commentsCount || 0) > 0 && (
            <Text style={styles.actionCount}>{item.commentsCount}</Text>
          )}
        </TouchableOpacity>
        <View style={styles.actionSpacer} />
      </View>

      {/* Caption: little text, username + content (Instagram-style) */}
      <View style={styles.captionBlock}>
        <Text style={styles.captionText} numberOfLines={2}>
          <Text style={styles.captionUsername}>{item.user?.name || 'User'}</Text>
          {' '}
          <Text style={styles.captionContent}>{item.content}</Text>
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
        <Logo size="small" />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('community.title')}</Text>
        <LanguageToggle />
        <TouchableOpacity
          style={styles.headerRightButton}
          onPress={() => navigation.navigate('JainFestivals')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="calendar-outline" size={26} color={theme.colors.primary || '#4CAF50'} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        scrollEventThrottle={400}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <AppBanner
            title="Welcome to House of Jainz"
            subtitle="Connect with the community, share moments, and discover local shops."
            icon="heart"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color={theme.colors.emptyIcon} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{t('community.noPosts')}</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textMuted }]}>{t('community.beFirst')}</Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <Text style={styles.loadingMoreText}>{t('community.loadingMore')}</Text>
            </View>
          ) : null
        }
      />

      {/* Floating Post Button */}
      <TouchableOpacity
        style={[styles.floatingPostButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('CreatePost')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Comment Modal */}
      <Modal
        visible={commentModalVisible}
        transparent={true}
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
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlayInner}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{t('community.comments')}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        Keyboard.dismiss();
                        setCommentModalVisible(false);
                        setComments([]);
                        setCommentText('');
                      }}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Comments List */}
                  <ScrollView 
                    style={styles.commentsList}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.commentsListContent}
                    showsVerticalScrollIndicator={true}
                  >
                    {loadingComments ? (
                      <Text style={styles.loadingText}>{t('community.loadingComments')}</Text>
                    ) : comments.length === 0 ? (
                      <Text style={styles.noCommentsText}>{t('community.noComments')}</Text>
                    ) : (
                      comments.map((item) => (
                        <View key={item.id} style={styles.commentItem}>
                          <View style={styles.commentHeader}>
                            <View style={styles.commentAvatar}>
                              <Text style={styles.commentAvatarText}>
                                {item.user?.name?.charAt(0).toUpperCase() || 'U'}
                              </Text>
                            </View>
                            <View style={styles.commentInfo}>
                              <Text style={styles.commentUserName}>{item.user?.name || 'User'}</Text>
                              <Text style={styles.commentTime}>
                                {new Date(item.created_at).toLocaleDateString()}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.commentContent}>{item.content}</Text>
                        </View>
                      ))
                    )}
                  </ScrollView>
                  
                  {/* Add Comment Section - Always visible at bottom */}
                  <View style={styles.addCommentSection}>
                    <View style={styles.commentInputContainer}>
                      <TextInput
                        style={styles.commentInput}
                        placeholder={t('community.writeComment')}
                        placeholderTextColor="#666"
                        value={commentText}
                        onChangeText={setCommentText}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        returnKeyType="done"
                        blurOnSubmit={false}
                      />
                      {commentText.trim() && (
                        <TouchableOpacity
                          style={styles.dismissKeyboardButton}
                          onPress={Keyboard.dismiss}
                        >
                          <Ionicons name="keyboard-outline" size={20} color="#666" />
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    <TouchableOpacity
                      style={[styles.submitButton, !commentText.trim() && styles.submitButtonDisabled]}
                      onPress={submitComment}
                      disabled={!commentText.trim()}
                    >
                      <Text style={styles.submitButtonText}>{t('community.postComment')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 25,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
    marginLeft: 12,
  },
  headerRightButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingPostButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
    marginTop: 120,
  },
  emptyText: {
    fontSize: 20,
    color: '#666',
    marginTop: 20,
    fontWeight: '700',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  list: {
    padding: 0,
    paddingBottom: 100,
  },
  post: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dbdbdb',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  userDetails: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  location: {
    fontSize: 12,
    color: '#8e8e8e',
    marginLeft: 4,
  },
  moreButton: {
    padding: 8,
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f0f0f0',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 14,
  },
  actionCount: {
    marginLeft: 6,
    fontSize: 14,
    color: '#262626',
    fontWeight: '600',
  },
  actionCountLiked: {
    color: '#4CAF50',
  },
  actionSpacer: {
    flex: 1,
  },
  captionBlock: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  captionText: {
    fontSize: 14,
    color: '#262626',
    lineHeight: 20,
  },
  captionUsername: {
    fontWeight: '600',
    color: '#262626',
  },
  captionContent: {
    fontWeight: '400',
    color: '#262626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    ...Platform.select({ web: { alignItems: 'center' } }),
  },
  modalOverlayInner: {
    flex: 1,
    justifyContent: 'flex-end',
    ...Platform.select({ web: { alignItems: 'center', width: '100%' } }),
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
    minHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    flexDirection: 'column',
    ...Platform.select({
      web: { width: '100%', maxWidth: 430, alignSelf: 'center' },
      default: {},
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 5,
  },
  commentsList: {
    flex: 1,
    marginBottom: 10,
  },
  commentsListContent: {
    paddingBottom: 10,
  },
  commentItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: '#fafafa',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commentAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  commentInfo: {
    flex: 1,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  commentContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 42,
  },
  loadingText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  noCommentsText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
    fontStyle: 'italic',
  },
  addCommentSection: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 10 : 5,
    backgroundColor: '#fff',
  },
  commentInputContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  commentInput: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    padding: 16,
    paddingRight: 45,
    fontSize: 16,
    minHeight: 60,
    maxHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  dismissKeyboardButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 5,
    zIndex: 10,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingMoreContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingMoreText: {
    color: '#999',
    fontSize: 14,
  },
});

