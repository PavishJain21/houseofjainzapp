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

export default function AdminProductsScreen({ route, navigation }) {
  const { shopId, shopName } = route.params || {};
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadProducts();
  }, [search, shopId]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = { page: 1, limit: 50 };
      if (shopId) params.shopId = shopId;
      if (search) params.search = search;

      const response = await api.get('/admin/marketplace/products', { params });
      setProducts(response.data.products || []);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusToggle = async (productId, currentStatus) => {
    try {
      await api.put(`/admin/marketplace/products/${productId}/status`, {
        is_active: !currentStatus,
      });
      Alert.alert('Success', 'Product status updated');
      loadProducts();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleDelete = (productId, productName) => {
    Alert.alert('Delete Product', `Are you sure you want to delete ${productName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/admin/marketplace/products/${productId}`);
            Alert.alert('Success', 'Product deleted');
            loadProducts();
          } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to delete product');
          }
        },
      },
    ]);
  };

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.productImage} />
      ) : (
        <View style={styles.productImagePlaceholder}>
          <Ionicons name="image-outline" size={30} color="#ccc" />
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productShop}>Shop: {item.shop?.name || 'Unknown'}</Text>
        <Text style={styles.productPrice}>₹{item.price}</Text>
        <Text style={styles.productStock}>Stock: {item.stock}</Text>
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
      <View style={styles.productActions}>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => handleStatusToggle(item.id, item.is_active)}
        >
          <Ionicons
            name={item.is_active ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#2196F3"
          />
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
      {shopName && (
        <View style={styles.shopHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#333" />
          </TouchableOpacity>
          <View style={styles.shopHeaderInfo}>
            <Text style={styles.shopHeaderTitle}>Products</Text>
            <Text style={styles.shopHeaderSubtitle}>{shopName}</Text>
          </View>
        </View>
      )}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
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
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadProducts} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No products found</Text>
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
  shopHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  shopHeaderInfo: {
    flex: 1,
  },
  shopHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  shopHeaderSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
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
  productCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 10,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  productShop: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  productStock: {
    fontSize: 12,
    color: '#666',
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
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
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

