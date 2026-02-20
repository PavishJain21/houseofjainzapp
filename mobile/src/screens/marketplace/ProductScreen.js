import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';

export default function ProductScreen({ route, navigation }) {
  const { productId } = route.params;
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isOwnShop, setIsOwnShop] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/marketplace/products/${productId}`);
      const productData = response.data.product;
      setProduct(productData);
      
      // Check if user owns the shop
      if (productData.shop && productData.shop.owner_id) {
        // Get current user's shops to check ownership
        try {
          const shopsRes = await api.get('/seller/shops');
          const userShops = shopsRes.data.shops || [];
          const ownsShop = userShops.some(shop => shop.id === productData.shop.id);
          setIsOwnShop(ownsShop);
        } catch (error) {
          // If user is not a seller or has no shops, they don't own it
          setIsOwnShop(false);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const updateCartBadge = async () => {
    try {
      const response = await api.get('/cart');
      const items = response.data.cartItems || [];
      const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
      // Navigate up to MainTabs level: ProductScreen -> MarketplaceStack -> MarketplaceTab -> MainTabs
      const mainTabsNavigator = navigation.getParent()?.getParent()?.getParent();
      if (mainTabsNavigator) {
        // Navigate to CartTab with cartCount param to update the badge
        // This will update the badge immediately
        mainTabsNavigator.navigate('CartTab', { cartCount });
        // Navigate back to MarketplaceTab after badge is updated
        setTimeout(() => {
          mainTabsNavigator.navigate('MarketplaceTab');
        }, 100);
      }
    } catch (error) {
      console.error('Error updating cart badge:', error);
    }
  };

  const handleAddToCart = async () => {
    try {
      await api.post('/cart/add', {
        productId: product.id,
        quantity,
      });
      // Update cart badge immediately after adding item
      await updateCartBadge();
      Alert.alert('Success', 'Product added to cart');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to add to cart';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleDeleteProduct = () => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.delete(`/seller/products/${product.id}`);
              Alert.alert('Success', 'Product deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => {
                    navigation.goBack();
                  },
                },
              ]);
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert(
                'Error',
                error.response?.data?.error || 'Failed to delete product'
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleEditProduct = () => {
    navigation.navigate('AddProduct', {
      productId: product.id,
      product: product,
      shopId: product.shop?.id,
      shopName: product.shop?.name,
    });
  };

  if (!product) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {product.image_url ? (
        <Image source={{ uri: product.image_url }} style={styles.productImage} />
      ) : (
        <View style={styles.productImagePlaceholder}>
          <Ionicons name="image-outline" size={60} color="#ccc" />
        </View>
      )}

      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productPrice}>₹{product.price}</Text>

        {product.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>
        )}

        {product.category && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <Text style={styles.category}>{product.category}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stock</Text>
          {product.stock > 0 ? (
            <Text style={styles.inStock}>{product.stock} available</Text>
          ) : (
            <Text style={styles.outOfStock}>Out of Stock</Text>
          )}
        </View>

        {product.stock > 0 && !isOwnShop && (
          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Ionicons name="remove" size={20} color="#4CAF50" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.min(product.stock, quantity + 1))}
              >
                <Ionicons name="add" size={20} color="#4CAF50" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isOwnShop && (
          <>
            <View style={styles.ownShopMessage}>
              <Ionicons name="information-circle" size={20} color="#ff9800" />
              <Text style={styles.ownShopText}>
                This is your own shop. You cannot buy from your own shop.
              </Text>
            </View>
            <View style={styles.ownerActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditProduct}
                disabled={loading}
              >
                <Ionicons name="create-outline" size={20} color="#fff" />
                <Text style={styles.editButtonText}>Edit Product</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteButton, deleting && styles.buttonDisabled]}
                onPress={handleDeleteProduct}
                disabled={deleting || loading}
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
                <Text style={styles.deleteButtonText}>
                  {deleting ? 'Deleting...' : 'Delete Product'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {!isOwnShop && (
          <TouchableOpacity
            style={[
              styles.addToCartButton,
              (product.stock === 0 || loading) && styles.buttonDisabled,
            ]}
            onPress={handleAddToCart}
            disabled={product.stock === 0 || loading}
          >
            <Text style={styles.addToCartText}>
              {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  productImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  productImagePlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  productPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  category: {
    fontSize: 14,
    color: '#666',
  },
  inStock: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  outOfStock: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '500',
  },
  quantitySection: {
    marginBottom: 20,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
  },
  addToCartButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  ownShopMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  ownShopText: {
    marginLeft: 10,
    color: '#856404',
    fontSize: 14,
    flex: 1,
  },
  ownerActions: {
    marginTop: 20,
    gap: 10,
  },
  editButton: {
    backgroundColor: '#2196F3',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

