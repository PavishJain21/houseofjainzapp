import React, { useState, useCallback, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Platform,
  RefreshControl,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import { confirmAsync } from '../../utils/alert';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';

export default function SanghDetailScreen({ route, navigation }) {
  const { sanghId } = route.params || {};
  const { theme } = useTheme();
  const { user } = useContext(AuthContext);
  const [sangh, setSangh] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [refreshingMessages, setRefreshingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [actionError, setActionError] = useState('');
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
  const [reactingMessageId, setReactingMessageId] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const PREVIEW_MEMBERS = 3;
  const REACTION_EMOJIS = ['👍', '🙏', '❤️', '😂', '😮', '😢'];

  const fetchOne = useCallback(async () => {
    if (!sanghId) return;
    setLoading(true);
    try {
      const res = await api.get(`/sangh/${sanghId}`);
      setSangh(res.data.sangh);
    } catch (err) {
      setSangh(null);
    } finally {
      setLoading(false);
    }
  }, [sanghId]);

  const fetchMessages = useCallback(async (isRefresh = false) => {
    if (!sanghId || !sangh?.isMember) return;
    if (isRefresh) setRefreshingMessages(true);
    else setMessagesLoading(true);
    try {
      const res = await api.get(`/sangh/${sanghId}/messages`, { params: { limit: 50 } });
      setMessages(res.data.messages || []);
    } catch (err) {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
      setRefreshingMessages(false);
    }
  }, [sanghId, sangh?.isMember]);

  useFocusEffect(
    useCallback(() => {
      fetchOne();
    }, [fetchOne])
  );

  useFocusEffect(
    useCallback(() => {
      if (sangh?.isMember) fetchMessages(false);
    }, [sangh?.isMember, sanghId])
  );

  const onRefreshMessages = useCallback(() => {
    if (sangh?.isMember) fetchMessages(true);
  }, [sangh?.isMember, fetchMessages]);

  const fetchMembers = useCallback(async () => {
    if (!sanghId || !sangh?.isMember) return;
    setMembersLoading(true);
    try {
      const res = await api.get(`/sangh/${sanghId}/members`);
      setMembers(res.data.members || []);
    } catch (_) {
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, [sanghId, sangh?.isMember]);

  // Fetch members when sangh is loaded and user is a member (fixes initial load)
  useEffect(() => {
    if (sangh?.isMember && sanghId) fetchMembers();
  }, [sangh?.isMember, sanghId]);

  // Refetch members when returning to screen (e.g. after adding someone)
  useFocusEffect(
    useCallback(() => {
      if (sangh?.isMember && sanghId) fetchMembers();
    }, [sangh?.isMember, sanghId, fetchMembers])
  );

  const handleJoin = async () => {
    if (!sanghId || actioning) return;
    setActioning(true);
    try {
      await api.post(`/sangh/${sanghId}/join`);
      setSangh((prev) => prev ? { ...prev, isMember: true, memberCount: (prev.memberCount || 0) + 1 } : null);
      fetchMessages(false);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Could not join');
    } finally {
      setActioning(false);
    }
  };

  const handleLeave = () => {
    if (!sangh?.isMember || sangh?.creator?.id === user?.id) return;
    confirmAsync(
      'Leave group?',
      'You will need to join again to see this group.',
      async () => {
        setActioning(true);
        try {
          await api.post(`/sangh/${sanghId}/leave`);
          setSangh((prev) => prev ? { ...prev, isMember: false, memberCount: Math.max(0, (prev.memberCount || 1) - 1) } : null);
          setMessages([]);
        } catch (err) {
          const msg = err.response?.data?.error || 'Could not leave';
          setActionError(msg);
          if (Platform.OS !== 'web') Alert.alert('Error', msg);
        } finally {
          setActioning(false);
        }
      },
      'Leave',
      'Cancel'
    );
  };

  const handleDelete = () => {
    if (sangh?.creator?.id !== user?.id) return;
    confirmAsync(
      'Delete group?',
      'This cannot be undone. All members will be removed.',
      async () => {
        setActioning(true);
        try {
          await api.delete(`/sangh/${sanghId}`);
          navigation.navigate('SanghLanding', { refreshSanghList: true });
        } catch (err) {
          const msg = err.response?.data?.error || 'Could not delete';
          setActionError(msg);
          if (Platform.OS !== 'web') Alert.alert('Error', msg);
        } finally {
          setActioning(false);
        }
      },
      'Delete',
      'Cancel'
    );
  };

  const handleSendMessage = async () => {
    const content = newMessage.trim();
    if (!content || sendingMessage || sangh?.creator?.id !== user?.id) return;
    setSendingMessage(true);
    try {
      const res = await api.post(`/sangh/${sanghId}/messages`, { content });
      setMessages((prev) => [res.data.message, ...prev]);
      setNewMessage('');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Could not send');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleLongPressMessage = (message) => {
    setReactionPickerMessageId(message.id);
  };

  const updateMessageReactions = useCallback((messageId, updater) => {
    setMessages((prev) =>
      prev.map((m) => (m.id !== messageId ? m : { ...m, reactions: updater(m.reactions || []) }))
    );
  }, []);

  const handleSelectReaction = async (messageId, emoji) => {
    if (!sanghId || reactingMessageId) return;
    const msg = messages.find((m) => m.id === messageId);
    const current = (msg?.reactions || []).find((r) => r.userReacted);
    const isRemoving = current && current.emoji === emoji;
    setReactionPickerMessageId(null);
    setReactingMessageId(messageId);
    try {
      if (isRemoving) {
        await api.delete(`/sangh/${sanghId}/messages/${messageId}/reactions`);
        updateMessageReactions(messageId, (reactions) => {
          const next = reactions.map((r) =>
            r.emoji === emoji ? { ...r, count: Math.max(0, r.count - 1), userReacted: false } : r
          ).filter((r) => r.count > 0);
          return next;
        });
      } else {
        await api.post(`/sangh/${sanghId}/messages/${messageId}/reactions`, { emoji });
        updateMessageReactions(messageId, (reactions) => {
          const afterRemovingMine = reactions
            .map((r) => (r.userReacted ? { ...r, count: r.count - 1, userReacted: false } : r))
            .filter((r) => r.count > 0);
          const existing = afterRemovingMine.find((r) => r.emoji === emoji);
          if (existing) {
            return afterRemovingMine.map((r) =>
              r.emoji === emoji ? { ...r, count: r.count + 1, userReacted: true } : r
            );
          }
          return [...afterRemovingMine, { emoji, count: 1, userReacted: true }];
        });
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Could not update reaction');
    } finally {
      setReactingMessageId(null);
    }
  };

  const handleRemoveReaction = async (messageId) => {
    if (!sanghId || reactingMessageId) return;
    setReactionPickerMessageId(null);
    setReactingMessageId(messageId);
    try {
      await api.delete(`/sangh/${sanghId}/messages/${messageId}/reactions`);
      updateMessageReactions(messageId, (reactions) =>
        reactions.map((r) => (r.userReacted ? { ...r, count: Math.max(0, r.count - 1), userReacted: false } : r)).filter((r) => r.count > 0)
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Could not remove reaction');
    } finally {
      setReactingMessageId(null);
    }
  };

  const handleDeleteMessage = (item) => {
    if (deletingMessageId) return;
    confirmAsync(
      'Delete message?',
      'This message will be removed for everyone.',
      async () => {
        setDeletingMessageId(item.id);
        try {
          await api.delete(`/sangh/${sanghId}/messages/${item.id}`);
          setMessages((prev) => prev.filter((m) => m.id !== item.id));
        } catch (err) {
          Alert.alert('Error', err.response?.data?.error || 'Could not delete message');
        } finally {
          setDeletingMessageId(null);
        }
      },
      'Delete',
      'Cancel'
    );
  };

  if (loading && !sangh) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!sangh) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.notFound, { color: theme.colors.textSecondary }]}>Group not found</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.colors.primary }]} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isCreator = sangh.creator?.id === user?.id;

  const renderMessage = ({ item }) => (
    <View style={[styles.messageRow, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.messageHeader}>
        <Text style={[styles.messageSender, { color: theme.colors.text }]}>
          {item.sender?.name || 'Admin'}
        </Text>
        <Text style={[styles.messageTime, { color: theme.colors.textMuted }]}>
          {item.created_at ? new Date(item.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : ''}
        </Text>
      </View>
      <Text style={[styles.messageContent, { color: theme.colors.text }]}>{item.content}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          sangh.isMember ? (
            <RefreshControl
              refreshing={refreshingMessages}
              onRefresh={onRefreshMessages}
              tintColor={theme.colors.primary}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.cardTitleRow}>
            <View style={styles.iconWrap}>
              <Ionicons
                name={sangh.is_public ? 'globe-outline' : 'lock-closed-outline'}
                size={28}
                color={theme.colors.primary}
              />
            </View>
            <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>{sangh.name}</Text>
          </View>
          {sangh.description ? (
            <Text style={[styles.desc, { color: theme.colors.textSecondary }]} numberOfLines={2}>{sangh.description}</Text>
          ) : null}
          <View style={styles.meta}>
            <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
              {sangh.memberCount ?? 0} members
            </Text>
            {sangh.creator?.name && (
              <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
                Admin: {sangh.creator.name}
              </Text>
            )}
          </View>
        </View>

        {actionError ? (
          <View style={[styles.inlineErrorWrap, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.inlineError, { color: '#c62828' }]}>{actionError}</Text>
            <TouchableOpacity onPress={() => setActionError('')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close-circle" size={20} color="#c62828" />
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={styles.actions}>
          {!sangh.isMember && sangh.is_public && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
              onPress={handleJoin}
              disabled={actioning}
            >
              <Text style={styles.primaryBtnText}>{actioning ? 'Joining…' : 'Join group'}</Text>
            </TouchableOpacity>
          )}
          {sangh.isMember && !isCreator && (
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: theme.colors.border }]}
              onPress={handleLeave}
              disabled={actioning}
            >
              <Text style={[styles.secondaryBtnText, { color: theme.colors.text }]}>Leave group</Text>
            </TouchableOpacity>
          )}
          {isCreator && (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.secondaryBtn, styles.actionsRowBtn, { borderColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('SanghAddMember', { sanghId, sanghName: sangh?.name })}
                disabled={actioning}
              >
                <Ionicons name="person-add-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.secondaryBtnText, { color: theme.colors.primary }]} numberOfLines={1}>Add member</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dangerBtn, styles.actionsRowBtn, { borderColor: '#c62828' }]}
                onPress={handleDelete}
                disabled={actioning}
              >
                <Ionicons name="trash-outline" size={20} color="#c62828" />
                <Text style={styles.dangerBtnText} numberOfLines={1}>Delete group</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {sangh.isMember && (
          <TouchableOpacity
            style={[styles.membersPreviewCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => navigation.navigate('SanghMembers', { sanghId, sanghName: sangh?.name })}
            activeOpacity={0.7}
          >
            <View style={styles.membersPreviewHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Members {sangh.memberCount != null ? `(${sangh.memberCount})` : ''}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
            </View>
            {membersLoading && members.length === 0 ? (
              <View style={styles.membersLoader}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : members.length === 0 ? (
              <Text style={[styles.noMessages, { color: theme.colors.textMuted }]}>No members yet.</Text>
            ) : (
              <>
                <View style={styles.membersPreviewAvatars}>
                  {members.slice(0, PREVIEW_MEMBERS).map((m) => (
                    <View key={m.id} style={[styles.previewAvatar, { backgroundColor: theme.colors.primary + '22' }]}>
                      <Text style={[styles.previewAvatarText, { color: theme.colors.primary }]} numberOfLines={1}>
                        {(m.name || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={[styles.viewAllLink, { color: theme.colors.primary }]}>
                  View all {members.length} member{members.length !== 1 ? 's' : ''} →
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {sangh.isMember && (
          <View style={styles.messagesSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Messages (admin only can send)</Text>
            {isCreator && (
              <View style={[styles.sendRow, { backgroundColor: theme.colors.surface }]}>
                <TextInput
                  style={[styles.messageInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                  placeholder="Type a message…"
                  placeholderTextColor={theme.colors.textMuted}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  multiline
                  maxLength={5000}
                  editable={!sendingMessage}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                >
                  {sendingMessage ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            )}
            {messagesLoading && messages.length === 0 ? (
              <View style={styles.messagesLoader}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : messages.length === 0 ? (
              <Text style={[styles.noMessages, { color: theme.colors.textMuted }]}>No messages yet. Only the admin can send.</Text>
            ) : (
              messages.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.messageRow, { backgroundColor: theme.colors.surface }]}
                  onLongPress={() => handleLongPressMessage(item)}
                  delayLongPress={400}
                >
                  <View style={styles.messageHeader}>
                    <View style={styles.messageHeaderLeft}>
                      <Text style={[styles.messageSender, { color: theme.colors.text }]}>
                        {item.sender?.name || 'Admin'}
                      </Text>
                      <Text style={[styles.messageTime, { color: theme.colors.textMuted }]}>
                        {item.created_at ? new Date(item.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : ''}
                      </Text>
                    </View>
                    {isCreator && (
                      <TouchableOpacity
                        style={styles.messageDeleteBtn}
                        onPress={() => handleDeleteMessage(item)}
                        disabled={deletingMessageId === item.id}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        {deletingMessageId === item.id ? (
                          <ActivityIndicator size="small" color="#c62828" />
                        ) : (
                          <Ionicons name="trash-outline" size={20} color="#c62828" />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={[styles.messageContent, { color: theme.colors.text }]}>{item.content}</Text>
                  {(item.reactions && item.reactions.length > 0) ? (
                    <View style={styles.reactionsRow}>
                      {item.reactions.map((r) => (
                        <View
                          key={r.emoji}
                          style={[
                            styles.reactionChip,
                            { backgroundColor: theme.colors.surface, borderColor: r.userReacted ? theme.colors.primary : theme.colors.border },
                          ]}
                        >
                          <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                          {r.count > 1 ? <Text style={[styles.reactionCount, { color: theme.colors.textMuted }]}>{r.count}</Text> : null}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </Pressable>
              ))
            )}

            <Modal
              visible={!!reactionPickerMessageId}
              transparent
              animationType="fade"
              onRequestClose={() => setReactionPickerMessageId(null)}
            >
              <Pressable style={styles.reactionOverlay} onPress={() => setReactionPickerMessageId(null)}>
                <View style={[styles.reactionPicker, { backgroundColor: theme.colors.surface }]}>
                  {REACTION_EMOJIS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={styles.reactionPickerBtn}
                      onPress={() => reactionPickerMessageId && handleSelectReaction(reactionPickerMessageId, emoji)}
                    >
                      <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.reactionRemoveBtn, { borderColor: theme.colors.border }]}
                    onPress={() => reactionPickerMessageId && handleRemoveReaction(reactionPickerMessageId)}
                  >
                    <Text style={[styles.reactionRemoveText, { color: theme.colors.textMuted }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Modal>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { padding: 16, paddingBottom: 40 },
  notFound: { fontSize: 16, marginBottom: 16 },
  backBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  card: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(76,175,80,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  name: { fontSize: 18, fontWeight: '700', flex: 1 },
  desc: { fontSize: 13, marginBottom: 8 },
  meta: { flexDirection: 'row', gap: 12 },
  metaText: { fontSize: 12 },
  actions: { gap: 12 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionsRowBtn: { flex: 1 },
  primaryBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  secondaryBtnText: { fontSize: 16, fontWeight: '600' },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  dangerBtnText: { color: '#c62828', fontSize: 16, fontWeight: '600' },
  membersSection: { marginTop: 24 },
  membersPreviewCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  membersPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  membersPreviewAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  previewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewAvatarText: { fontSize: 14, fontWeight: '700' },
  viewAllLink: { fontSize: 14, fontWeight: '600' },
  membersLoader: { padding: 12, alignItems: 'center' },
  messagesSection: { marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  sendRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12, padding: 12, borderRadius: 12 },
  messageInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  messagesLoader: { padding: 24, alignItems: 'center' },
  noMessages: { fontSize: 14, fontStyle: 'italic', marginTop: 8 },
  messageRow: { padding: 12, borderRadius: 12, marginBottom: 8 },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  messageHeaderLeft: { flex: 1, minWidth: 0 },
  messageDeleteBtn: { padding: 4, marginLeft: 8 },
  messageSender: { fontSize: 14, fontWeight: '600' },
  messageTime: { fontSize: 11 },
  messageContent: { fontSize: 15 },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' },
  reactionChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  reactionEmoji: { fontSize: 16 },
  reactionCount: { fontSize: 12, marginLeft: 2 },
  reactionOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  reactionPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  reactionPickerBtn: { padding: 8 },
  reactionPickerEmoji: { fontSize: 28 },
  reactionRemoveBtn: { marginLeft: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  reactionRemoveText: { fontSize: 14 },
  inlineErrorWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, marginBottom: 12 },
  inlineError: { flex: 1, fontSize: 14 },
});
