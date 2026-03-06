import React, { useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import { confirmAsync } from '../../utils/alert';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';

export default function SanghMembersScreen({ route, navigation }) {
  const { sanghId, sanghName } = route.params || {};
  const { theme } = useTheme();
  const { user } = useContext(AuthContext);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);

  const fetchMembers = useCallback(async (isRefresh = false) => {
    if (!sanghId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get(`/sangh/${sanghId}/members`);
      setMembers(res.data.members || []);
    } catch (_) {
      setMembers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sanghId]);

  useFocusEffect(
    useCallback(() => {
      fetchMembers();
    }, [fetchMembers])
  );

  const handleRemoveMember = (member) => {
    if (member.is_creator || removingMemberId) return;
    confirmAsync(
      'Remove member?',
      `Remove ${member.name || member.email} from this group?`,
      async () => {
        setRemovingMemberId(member.id);
        try {
          await api.delete(`/sangh/${sanghId}/members/${member.id}`);
          setMembers((prev) => prev.filter((m) => m.id !== member.id));
        } catch (err) {
          Alert.alert('Error', err.response?.data?.error || 'Could not remove member');
        } finally {
          setRemovingMemberId(null);
        }
      },
      'Remove',
      'Cancel'
    );
  };

  const isCreator = members.some((m) => m.is_creator && m.id === user?.id);

  const renderItem = ({ item }) => (
    <View style={[styles.memberRow, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.memberAvatar, { backgroundColor: theme.colors.primary + '22' }]}>
        <Text style={[styles.memberAvatarText, { color: theme.colors.primary }]}>
          {(item.name || '?').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.memberBody}>
        <Text style={[styles.memberName, { color: theme.colors.text }]} numberOfLines={1}>
          {item.name || item.email || 'Unknown'}
          {item.is_creator ? ' (Admin)' : ''}
        </Text>
        {item.email ? (
          <Text style={[styles.memberEmail, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {item.email}
          </Text>
        ) : null}
      </View>
      {isCreator && !item.is_creator && (
        <TouchableOpacity
          style={[styles.removeMemberBtn, { borderColor: '#c62828' }]}
          onPress={() => handleRemoveMember(item)}
          disabled={removingMemberId === item.id}
        >
          {removingMemberId === item.id ? (
            <ActivityIndicator size="small" color="#c62828" />
          ) : (
            <Ionicons name="trash-outline" size={14} color="#c62828" />
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const keyExtractor = (item) => item.id;

  if (loading && members.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={members}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchMembers(true)}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.colors.textMuted }]}>No members yet.</Text>
        }
        ListHeaderComponent={
          <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
            {isCreator ? 'Tap the trash icon to remove a member. You cannot remove yourself (Admin).' : ''}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  hint: { fontSize: 13, marginBottom: 16 },
  empty: { fontSize: 15, textAlign: 'center', marginTop: 24 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: { fontSize: 16, fontWeight: '700' },
  memberBody: { flex: 1, minWidth: 0 },
  memberName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  memberEmail: { fontSize: 13 },
  removeMemberBtn: {
    width: 32,
    height: 32,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
