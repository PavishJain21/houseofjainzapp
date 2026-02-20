import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';

export default function ShopScreen({ route, navigation }) {
  const { shopId } = route.params;
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadShopData();
  }, [shopId]);

  const loadShopData = async (page = 1, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setCurrentPage(1);
    }

    try {
      const [shopRes, productsRes] = await Promise.all([
        api.get(`/marketplace/shops`).then(res => 
          res.data.shops.find(s => s.id === shopId)
        ),
        api.get(`/marketplace/shops/${shopId}/products`, {
          params: { page, limit: 12 },
        })
      ]);

      if (!append) {
        setShop(shopRes);
      }

      const newProducts = productsRes.data.products || [];
      const pagination = productsRes.data.pagination || {};

      if (append) {
        setProducts(prevProducts => [...prevProducts, ...newProducts]);
      } else {
        setProducts(newProducts);
      }

      setHasMore(pagination.hasMore || false);
      setCurrentPage(page);
    } catch (error) {
      Alert.alert('Error', 'Failed to load shop data');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const loadMoreProducts = () => {
    if (!loadingMore && hasMore) {
      loadShopData(currentPage + 1, true);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadShopData(1, false);
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('Product', { productId: item.id })}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.productImage} />
      ) : (
        <View style={styles.productImagePlaceholder}>
          <Ionicons name="image-outline" size={40} color="#ccc" />
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.productPrice}>₹{item.price}</Text>
        {item.stock > 0 ? (
          <Text style={styles.productStock}>In Stock</Text>
        ) : (
          <Text style={styles.productOutOfStock}>Out of Stock</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (!shop) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.shopHeader}>
        <View style={styles.shopIcon}>
          <Text style={styles.shopIconText}>
            {shop.name?.charAt(0).toUpperCase() || 'S'}
          </Text>
        </View>
        <View style={styles.shopInfo}>
          <Text style={styles.shopName}>{shop.name}</Text>
          {shop.location && (
            <Text style={styles.shopLocation}>
              <Ionicons name="location" size={12} /> {shop.location}
            </Text>
          )}
        </View>
      </View>

      {shop.description && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>{shop.description}</Text>
        </View>
      )}

      <Text style={styles.productsTitle}>Products</Text>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.productsList}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <Text style={styles.loadingMoreText}>Loading more products...</Text>
            </View>
          ) : null
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  shopIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  shopIconText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  shopLocation: {
    fontSize: 14,
    color: '#666',
  },
  descriptionContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginTop: 10,
    marginHorizontal: 10,
    borderRadius: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  productsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    margin: 15,
    marginBottom: 10,
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
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  productStock: {
    fontSize: 12,
    color: '#4CAF50',
  },
  productOutOfStock: {
    fontSize: 12,
    color: '#f44336',
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

