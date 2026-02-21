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

export default function AdminShopsScreen({ navigation }) {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadShops();
  }, [search]);

  const loadShops = async () => {
    setLoading(true);
    try {
      const params = { page: 1, limit: 50 };
      if (search) params.search = search;

      const response = await api.get('/admin/marketplace/shops', { params });
      setShops(response.data.shops || []);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to load shops');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusToggle = async (shopId, currentStatus) => {
    try {
      await api.put(`/admin/marketplace/shops/${shopId}/status`, {
        is_active: !currentStatus,
      });
      Alert.alert('Success', 'Shop status updated');
      loadShops();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleDelete = (shopId, shopName) => {
    Alert.alert('Delete Shop', `Are you sure you want to delete ${shopName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/admin/marketplace/shops/${shopId}`);
            Alert.alert('Success', 'Shop deleted');
            loadShops();
          } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to delete shop');
          }
        },
      },
    ]);
  };

  const renderShop = ({ item }) => (
    <TouchableOpacity
      style={styles.shopCard}
      onPress={() => navigation.navigate('AdminProducts', { shopId: item.id, shopName: item.name })}
      activeOpacity={0.7}
    >
      <View style={styles.shopInfo}>
        <View style={styles.shopHeader}>
          <Text style={styles.shopName}>{item.name}</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
        <Text style={styles.shopLocation}>{item.location}</Text>
        <Text style={styles.shopOwner}>Owner: {item.owner?.name || 'Unknown'}</Text>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: item.is_active ? '#4CAF50' : '#f44336' },
            ]}
          >
            <Text style={styles.statusText}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.shopActions}>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={(e) => {
            e.stopPropagation();
            handleStatusToggle(item.id, item.is_active);
          }}
        >
          <Ionicons
            name={item.is_active ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#2196F3"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            handleDelete(item.id, item.name);
          }}
        >
          <Ionicons name="trash-outline" size={20} color="#f44336" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search shops..."
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
        data={shops}
        renderItem={renderShop}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadShops} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No shops found</Text>
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
  shopCard: {
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
  shopInfo: {
    flex: 1,
  },
  shopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  shopLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  shopOwner: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  statusContainer: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  shopActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButton: {
    padding: 5,
    marginRight: 10,
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

