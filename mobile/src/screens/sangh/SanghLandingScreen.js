import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import Logo from '../../components/Logo';
import LanguageToggle from '../../components/LanguageToggle';
import { useTheme } from '../../context/ThemeContext';

export default function SanghLandingScreen({ navigation, route }) {
  const { theme } = useTheme();
  const [sanghs, setSanghs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPage = useCallback(async (pageNum = 1, append = false) => {
    if (append && loadingMore) return;
    if (!append && loading) return;
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const res = await api.get('/sangh', { params: { page: pageNum, limit: 15 } });
      const list = res.data.sanghs || [];
      const pagination = res.data.pagination || {};

      if (append) {
        setSanghs((prev) => {
          const ids = new Set(prev.map((s) => s.id));
          const newItems = list.filter((s) => !ids.has(s.id));
          return [...prev, ...newItems];
        });
      } else {
        setSanghs(list);
      }
      setPage(pageNum);
      setHasMore(pagination.hasMore ?? false);
    } catch (err) {
      if (pageNum === 1) setSanghs([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [loading, loadingMore]);

  useEffect(() => {
    loadPage(1, false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const needRefresh = route.params?.refreshSanghList;
      if (needRefresh) {
        loadPage(1, false);
        navigation.setParams({ refreshSanghList: false });
      }
    }, [route.params?.refreshSanghList, loadPage, navigation])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPage(1, false);
  }, [loadPage]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    loadPage(page + 1, true);
  }, [hasMore, loadingMore, loading, page, loadPage]);

  const openSangh = (sangh) => {
    navigation.navigate('SanghDetail', { sanghId: sangh.id, sanghName: sangh.name });
  };

  const goCreate = () => {
    navigation.navigate('CreateSangh');
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={() => openSangh(item)}
      activeOpacity={0.8}
    >
      <View style={styles.cardIcon}>
        <Ionicons
          name={item.is_public ? 'globe-outline' : 'lock-closed-outline'}
          size={28}
          color={theme.colors.primary}
        />
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        {item.description ? (
          <Text style={[styles.cardDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
            {item.memberCount ?? 0} members
          </Text>
          {item.creator?.name && (
            <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
              by {item.creator.name}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={22} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );

  if (loading && sanghs.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Logo size="small" />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Sangh</Text>
        <LanguageToggle />
      </View>
      <View style={styles.subtitleRow}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Create or join groups (public & private)
        </Text>
      </View>
      <FlatList
        data={sanghs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, sanghs.length === 0 && styles.listEmpty]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="people-outline" size={56} color={theme.colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No groups yet</Text>
            <Text style={[styles.emptyDesc, { color: theme.colors.textSecondary }]}>
              Create a group to get started
            </Text>
            <TouchableOpacity style={[styles.createBtn, { backgroundColor: theme.colors.primary }]} onPress={goCreate}>
              <Text style={styles.createBtnText}>Create Sangh</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={goCreate}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 25,
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', marginLeft: 12 },
  subtitleRow: { paddingHorizontal: 16, paddingBottom: 12 },
  subtitle: { fontSize: 14 },
  list: { padding: 16, paddingBottom: 90 },
  listEmpty: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(76,175,80,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  cardDesc: { fontSize: 14, marginBottom: 6 },
  meta: { flexDirection: 'row', gap: 12 },
  metaText: { fontSize: 12 },
  emptyWrap: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  emptyDesc: { fontSize: 14, marginTop: 6 },
  createBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footerLoader: { padding: 16, alignItems: 'center' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
});
