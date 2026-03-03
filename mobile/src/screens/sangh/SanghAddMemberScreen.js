import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import { useTheme } from '../../context/ThemeContext';

const SEARCH_DEBOUNCE_MS = 350;

function getInitial(name) {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  return name.trim().slice(0, 2).toUpperCase();
}

export default function SanghAddMemberScreen({ route, navigation }) {
  const { sanghId, sanghName } = route.params || {};
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());

  const searchUsers = useCallback(async (searchTerm) => {
    if (!sanghId) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get(`/sangh/${sanghId}/members/search`, {
        params: { q: searchTerm.trim(), limit: 30 },
      });
      setUsers(res.data.users || []);
    } catch (err) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [sanghId]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim().length > 0) {
        searchUsers(query);
      } else {
        setUsers([]);
        setSearched(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, searchUsers]);

  const handleAdd = useCallback(async (user) => {
    if (!sanghId || addingId) return;
    setAddingId(user.id);
    try {
      await api.post(`/sangh/${sanghId}/members`, { user_id: user.id });
      setAddedIds((prev) => new Set([...prev, user.id]));
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (_) {
      // keep in list so user can retry
    } finally {
      setAddingId(null);
    }
  }, [sanghId, addingId]);

  const renderItem = useCallback(
    ({ item }) => {
      const isAdded = addedIds.has(item.id);
      const isAdding = addingId === item.id;
      return (
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '22' }]}>
            <Text style={[styles.avatarText, { color: theme.colors.primary }]} numberOfLines={1}>
              {getInitial(item.name)}
            </Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>
              {item.name || 'No name'}
            </Text>
            {item.email ? (
              <Text style={[styles.userEmail, { color: theme.colors.textMuted }]} numberOfLines={1}>
                {item.email}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={[
              styles.addBtn,
              isAdded ? styles.addBtnAdded : { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => !isAdded && !isAdding && handleAdd(item)}
            disabled={isAdded || isAdding}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.addBtnText}>{isAdded ? 'Added' : 'Add'}</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    },
    [theme, addedIds, addingId, handleAdd]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.searchWrap, { backgroundColor: theme.colors.surface }]}>
        <Ionicons name="search" size={22} color={theme.colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="Search by name or email..."
          placeholderTextColor={theme.colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close-circle" size={22} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.hint, { color: theme.colors.textMuted }]}>Searching...</Text>
        </View>
      ) : !query.trim() ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={64} color={theme.colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Find people to add</Text>
          <Text style={[styles.emptyDesc, { color: theme.colors.textSecondary }]}>
            Search by name or email to find users on the platform. Only people who are not already in this group will appear.
          </Text>
        </View>
      ) : users.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="person-add-outline" size={64} color={theme.colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No users found</Text>
          <Text style={[styles.emptyDesc, { color: theme.colors.textSecondary }]}>
            Try a different name or email. Already-added members won&apos;t show in results.
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text style={[styles.resultHint, { color: theme.colors.textMuted }]}>
              Tap &quot;Add&quot; to add them to {sanghName || 'the group'}.
            </Text>
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  list: { padding: 16, paddingBottom: 40 },
  resultHint: { fontSize: 13, marginBottom: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 16, fontWeight: '700' },
  cardBody: { flex: 1, minWidth: 0 },
  userName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  userEmail: { fontSize: 13 },
  addBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    minWidth: 72,
    alignItems: 'center',
  },
  addBtnAdded: { backgroundColor: '#9e9e9e' },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' },
  emptyDesc: { fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  hint: { marginTop: 12, fontSize: 14 },
});
