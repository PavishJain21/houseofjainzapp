import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
  Image,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE_URL } from '../../config/api';

export default function ShopDetailsScreen({ route, navigation }) {
  const { shopId } = route.params;
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadShopData();
    }, [shopId])
  );

  const loadShopData = async () => {
    setLoading(true);
    setRefreshing(false);
    try {
      // Get shop details from seller's shops
      const shopsRes = await api.get('/seller/shops');
      const shopData = shopsRes.data.shops.find((s) => s.id === shopId);

      if (!shopData) {
        setLoading(false);
        Alert.alert('Error', 'Shop not found');
        navigation.goBack();
        return;
      }

      setShop(shopData);

      // Get products for this shop
      try {
        const productsRes = await api.get('/seller/products', {
          params: { shopId, page: 1, limit: 12 },
        });
        const pagination = productsRes.data.pagination || {};
        setProducts(productsRes.data.products || []);
        setHasMore(pagination.hasMore || false);
        setCurrentPage(1);
      } catch (productError) {
        console.error('Error loading products:', productError);
        // Set empty products array if products fail to load
        setProducts([]);
        setHasMore(false);
        Alert.alert('Error', 'Failed to load products');
      }
    } catch (error) {
      console.error('Error loading shop data:', error);
      Alert.alert('Error', 'Failed to load shop data');
      // Ensure shop is cleared if it failed to load
      if (!shop) {
        setShop(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadShopData();
  };

  const loadMoreProducts = async () => {
    if (loadingMore || !hasMore || !shop) {
      return; // Prevent duplicate requests
    }
    
    setLoadingMore(true);
    try {
      const productsRes = await api.get('/seller/products', {
        params: { shopId: shop.id, page: currentPage + 1, limit: 12 },
      });
      const newProducts = productsRes.data.products || [];
      const pagination = productsRes.data.pagination || {};
      
      if (newProducts.length > 0) {
        setProducts(prevProducts => [...prevProducts, ...newProducts]);
        setHasMore(pagination.hasMore || false);
        setCurrentPage(prev => prev + 1);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more products:', error);
      setHasMore(false); // Stop trying to load more if there's an error
      // Don't show alert for load more errors to avoid annoying users
    } finally {
      setLoadingMore(false);
    }
  };

  const handleAddProduct = () => {
    navigation.navigate('AddProduct', {
      shopId: shop.id,
      shopName: shop.name,
    });
  };

  const handleProductPress = (product) => {
    // Navigate to edit product screen
    navigation.navigate('AddProduct', {
      shopId: shop.id,
      shopName: shop.name,
      productId: product.id,
      product: product,
    });
  };

  const handleDeleteProduct = (product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/seller/products/${product.id}`);
              // Remove product from list immediately for better UX
              setProducts(prevProducts => prevProducts.filter(p => p.id !== product.id));
              Alert.alert('Success', 'Product deleted successfully');
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert(
                'Error',
                error.response?.data?.error || 'Failed to delete product'
              );
              // Reload products on error to ensure consistency
              loadShopData();
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      <TouchableOpacity
        style={styles.productCardContent}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.7}
      >
        {item.image_url ? (
          <Image
            source={{
              uri: item.image_url.startsWith('http')
                ? item.image_url
                : `${API_BASE_URL.replace('/api', '')}${item.image_url}`,
            }}
            style={styles.productImage}
          />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="image-outline" size={40} color="#ccc" />
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.productPrice}>₹{parseFloat(item.price).toFixed(2)}</Text>
          <View style={styles.productMeta}>
            <Text
              style={[
                styles.productStock,
                item.stock > 0 ? styles.inStock : styles.outOfStock,
              ]}
            >
              {item.stock > 0 ? `Stock: ${item.stock}` : 'Out of Stock'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteProduct(item)}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={18} color="#f44336" />
      </TouchableOpacity>
    </View>
  );

  if (loading && !shop) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!shop && !loading) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Shop Header */}
        <View style={styles.shopHeader}>
          <View style={styles.shopIcon}>
            <Text style={styles.shopIconText}>
              {shop.name?.charAt(0).toUpperCase() || 'S'}
            </Text>
          </View>
          <View style={styles.shopInfo}>
            <Text style={styles.shopName}>{shop.name}</Text>
            {shop.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={14} color="#666" />
                <Text style={styles.shopLocation}>{shop.location}</Text>
              </View>
            )}
            {shop.phone && (
              <View style={styles.locationRow}>
                <Ionicons name="call" size={14} color="#666" />
                <Text style={styles.shopPhone}>{shop.phone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Shop Description */}
        {shop.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>{shop.description}</Text>
          </View>
        )}

        {/* Shop Address */}
        {shop.address && (
          <View style={styles.addressContainer}>
            <Ionicons name="home" size={16} color="#666" />
            <Text style={styles.address}>{shop.address}</Text>
          </View>
        )}

        {/* Add Product Button */}
        <TouchableOpacity
          style={styles.addProductButton}
          onPress={handleAddProduct}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.addProductButtonText}>Add Product</Text>
        </TouchableOpacity>

        {/* Products Section */}
        <View style={styles.productsSection}>
          <View style={styles.productsHeader}>
            <Text style={styles.productsTitle}>
              Products ({products.length})
            </Text>
          </View>

          {loading && products.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Loading products...</Text>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No products yet</Text>
              <Text style={styles.emptySubtext}>
                Add your first product to start selling
              </Text>
              <TouchableOpacity
                style={styles.emptyAddButton}
                onPress={handleAddProduct}
              >
                <Text style={styles.emptyAddButtonText}>Add Product</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={products}
              renderItem={renderProduct}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.productsList}
              onEndReached={loadMoreProducts}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.loadingMoreContainer}>
                    <Text style={styles.loadingMoreText}>Loading more products...</Text>
                  </View>
                ) : null
              }
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  shopIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  shopIconText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  shopLocation: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  shopPhone: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  descriptionContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginTop: 10,
    marginHorizontal: 15,
    borderRadius: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  addressContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    marginTop: 10,
    marginHorizontal: 15,
    borderRadius: 10,
    alignItems: 'flex-start',
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
    margin: 15,
    borderRadius: 10,
  },
  addProductButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  productsSection: {
    marginTop: 10,
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  productsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  productsList: {
    padding: 10,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 5,
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  productCardContent: {
    flex: 1,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 10,
  },
  productImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  productImagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
    minHeight: 36,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productStock: {
    fontSize: 12,
    fontWeight: '500',
  },
  inStock: {
    color: '#4CAF50',
  },
  outOfStock: {
    color: '#f44336',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 15,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyAddButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingMoreContainer: {
    padding: 20,
    alignItems: 'center',
    width: '100%',
  },
  loadingMoreText: {
    color: '#999',
    fontSize: 14,
  },
});

