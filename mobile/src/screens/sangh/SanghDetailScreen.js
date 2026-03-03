import React, { useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
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
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);

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
    Alert.alert(
      'Leave group?',
      'You will need to join again to see this group.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setActioning(true);
            try {
              await api.post(`/sangh/${sanghId}/leave`);
              setSangh((prev) => prev ? { ...prev, isMember: false, memberCount: Math.max(0, (prev.memberCount || 1) - 1) } : null);
              setMessages([]);
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'Could not leave');
            } finally {
              setActioning(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    if (sangh?.creator?.id !== user?.id) return;
    Alert.alert(
      'Delete group?',
      'This cannot be undone. All members will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActioning(true);
            try {
              await api.delete(`/sangh/${sanghId}`);
              navigation.navigate('SanghLanding', { refreshSanghList: true });
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'Could not delete');
            } finally {
              setActioning(false);
            }
          },
        },
      ]
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

  const handleAddMember = async () => {
    const email = addMemberEmail.trim().toLowerCase();
    if (!email || addingMember) return;
    setAddingMember(true);
    try {
      await api.post(`/sangh/${sanghId}/members`, { email });
      setAddMemberModalVisible(false);
      setAddMemberEmail('');
      setSangh((prev) => prev ? { ...prev, memberCount: (prev.memberCount || 0) + 1 } : null);
      Alert.alert('Done', 'Member added');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Could not add member');
    } finally {
      setAddingMember(false);
    }
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
          <View style={styles.iconWrap}>
            <Ionicons
              name={sangh.is_public ? 'globe-outline' : 'lock-closed-outline'}
              size={40}
              color={theme.colors.primary}
            />
          </View>
          <Text style={[styles.name, { color: theme.colors.text }]}>{sangh.name}</Text>
          {sangh.description ? (
            <Text style={[styles.desc, { color: theme.colors.textSecondary }]}>{sangh.description}</Text>
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
            <>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: theme.colors.primary }]}
                onPress={() => setAddMemberModalVisible(true)}
                disabled={actioning}
              >
                <Ionicons name="person-add-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.secondaryBtnText, { color: theme.colors.primary }]}>Add member</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dangerBtn, { borderColor: '#c62828' }]}
                onPress={handleDelete}
                disabled={actioning}
              >
                <Ionicons name="trash-outline" size={20} color="#c62828" />
                <Text style={styles.dangerBtnText}>Delete group</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

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
                <View key={item.id} style={[styles.messageRow, { backgroundColor: theme.colors.surface }]}>
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
              ))
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={addMemberModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => !addingMember && setAddMemberModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.modalBox, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add member</Text>
            <Text style={[styles.modalHint, { color: theme.colors.textMuted }]}>Enter the member's email. Only admin can add people.</Text>
            <TextInput
              style={[styles.modalInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Email"
              placeholderTextColor={theme.colors.textMuted}
              value={addMemberEmail}
              onChangeText={setAddMemberEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!addingMember}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalCancel, { borderColor: theme.colors.border }]} onPress={() => !addingMember && setAddMemberModalVisible(false)} disabled={addingMember}>
                <Text style={[styles.modalCancelText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalAdd, { backgroundColor: theme.colors.primary }]}
                onPress={handleAddMember}
                disabled={!addMemberEmail.trim() || addingMember}
              >
                {addingMember ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalAddText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(76,175,80,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: { fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  desc: { fontSize: 15, textAlign: 'center', marginBottom: 12 },
  meta: { flexDirection: 'row', gap: 16 },
  metaText: { fontSize: 13 },
  actions: { gap: 12 },
  primaryBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  secondaryBtnText: { fontSize: 16, fontWeight: '600' },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  dangerBtnText: { color: '#c62828', fontSize: 16, fontWeight: '600' },
  messagesSection: { marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  sendRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12, padding: 12, borderRadius: 12 },
  messageInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  messagesLoader: { padding: 24, alignItems: 'center' },
  noMessages: { fontSize: 14, fontStyle: 'italic', marginTop: 8 },
  messageRow: { padding: 12, borderRadius: 12, marginBottom: 8 },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  messageSender: { fontSize: 14, fontWeight: '600' },
  messageTime: { fontSize: 11 },
  messageContent: { fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { width: '100%', maxWidth: 340, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalHint: { fontSize: 13, marginBottom: 12 },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: '600' },
  modalAdd: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalAddText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
