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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';

export default function AdminUsersScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadUsers();
  }, [search]);

  const loadUsers = async (pageNum = 1, append = false) => {
    if (append) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const params = { page: pageNum, limit: 20 };
      if (search) params.search = search;

      const response = await api.get('/admin/users', { params });
      const newUsers = response.data.users || [];

      if (append) {
        setUsers((prev) => [...prev, ...newUsers]);
      } else {
        setUsers(newUsers);
      }

      setHasMore(response.data.pagination?.hasMore || false);
      setPage(pageNum);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      Alert.alert('Success', 'User role updated');
      loadUsers(page, false);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update role');
    }
  };

  const handleDelete = (userId, userName) => {
    Alert.alert('Delete User', `Are you sure you want to delete ${userName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/admin/users/${userId}`);
            Alert.alert('Success', 'User deleted');
            loadUsers(page, false);
          } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to delete user');
          }
        },
      },
    ]);
  };

  const renderUser = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userDetails}>
          {item.religion} • {item.role || 'user'}
        </Text>
        <Text style={styles.userDate}>
          Joined: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.userActions}>
        <TouchableOpacity
          style={styles.roleButton}
          onPress={() => {
            Alert.alert('Change Role', 'Select new role', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'User', onPress: () => handleRoleChange(item.id, 'user') },
              { text: 'Admin', onPress: () => handleRoleChange(item.id, 'admin') },
              { text: 'Super Admin', onPress: () => handleRoleChange(item.id, 'superadmin') },
            ]);
          }}
        >
          <Ionicons name="person-circle-outline" size={20} color="#2196F3" />
          <Text style={styles.roleButtonText}>Role</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id, item.name)}
        >
          <Ionicons name="trash-outline" size={20} color="#f44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
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
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadUsers(1, false)} />
        }
        onEndReached={() => {
          if (hasMore && !loading) {
            loadUsers(page + 1, true);
          }
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No users found</Text>
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
  userCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  userDetails: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  userDate: {
    fontSize: 12,
    color: '#999',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 10,
  },
  roleButtonText: {
    marginLeft: 5,
    color: '#2196F3',
    fontSize: 12,
  },
  deleteButton: {
    padding: 5,
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

