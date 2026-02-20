import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';

export default function SellerDashboardScreen({ navigation }) {
  const [shops, setShops] = useState([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [productCount, setProductCount] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [shopsRes, ordersRes] = await Promise.all([
        api.get('/seller/shops'),
        api.get('/seller/orders?status=pending').catch(() => ({ data: { orders: [] } })),
      ]);
      setShops(shopsRes.data.shops || []);
      const pendingOrders = ordersRes.data.orders || [];
      setPendingOrdersCount(pendingOrders.length);
      
      // Get total product count across all shops
      if (shopsRes.data.shops && shopsRes.data.shops.length > 0) {
        try {
          const productsRes = await Promise.all(
            shopsRes.data.shops.map(shop => 
              api.get(`/seller/products?shopId=${shop.id}`).catch(() => ({ data: { products: [] } }))
            )
          );
          const totalProducts = productsRes.reduce((sum, res) => {
            return sum + (res.data?.products?.length || 0);
          }, 0);
          setProductCount(totalProducts);
        } catch (error) {
          console.error('Error loading product count:', error);
        }
      } else {
        setProductCount(0);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    }
  };

  return (
    <ScrollView style={styles.container}>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('SellerEarnings')}
          >
            <Ionicons name="wallet" size={32} color="#4CAF50" />
            <Text style={styles.actionCardTitle}>My Earnings</Text>
            <Text style={styles.actionCardSubtitle}>View & request payouts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('OrderReceived')}
          >
            <View style={styles.iconWithBadge}>
              <Ionicons name="cube" size={32} color="#2196F3" />
              {pendingOrdersCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingOrdersCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.actionCardTitle}>Orders</Text>
            <Text style={styles.actionCardSubtitle}>Manage orders</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Product Limit Info */}
      <View style={styles.section}>
        <View style={styles.limitInfoCard}>
          <View style={styles.limitInfoRow}>
            <Ionicons name="cube-outline" size={24} color="#4CAF50" />
            <View style={styles.limitInfoText}>
              <Text style={styles.limitInfoLabel}>Total Products</Text>
              <Text style={[styles.limitInfoValue, productCount >= 100 && styles.limitReached]}>
                {productCount} / 100
              </Text>
            </View>
          </View>
          {productCount >= 90 && (
            <Text style={styles.limitWarning}>
              {productCount >= 100 
                ? '⚠️ Product limit reached!' 
                : `⚠️ You're approaching the limit (${100 - productCount} remaining)`}
            </Text>
          )}
        </View>
      </View>

      {/* Product Limit Info */}
      <View style={styles.section}>
        <View style={styles.limitInfoCard}>
          <View style={styles.limitInfoRow}>
            <Ionicons name="cube-outline" size={24} color="#4CAF50" />
            <View style={styles.limitInfoText}>
              <Text style={styles.limitInfoLabel}>Total Products</Text>
              <Text style={[styles.limitInfoValue, productCount >= 100 && styles.limitReached]}>
                {productCount} / 100
              </Text>
            </View>
          </View>
          {productCount >= 90 && (
            <Text style={styles.limitWarning}>
              {productCount >= 100 
                ? '⚠️ Product limit reached!' 
                : `⚠️ You're approaching the limit (${100 - productCount} remaining)`}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Shops</Text>
          {shops.length === 0 && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('CreateShop')}
            >
              <Ionicons name="add" size={20} color="#4CAF50" />
              <Text style={styles.addButtonText}>Add Shop</Text>
            </TouchableOpacity>
          )}
        </View>

        {shops.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No shops yet</Text>
            <Text style={styles.emptySubtext}>Create your first shop to start selling</Text>
          </View>
        ) : (
          shops.map((shop) => (
            <TouchableOpacity
              key={shop.id}
              style={styles.shopCard}
              onPress={() => navigation.navigate('ShopDetails', { shopId: shop.id })}
            >
              <View style={styles.shopInfo}>
                <Text style={styles.shopName}>{shop.name}</Text>
                <Text style={styles.shopLocation}>{shop.location}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  addButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
  },
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 10,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  shopLocation: {
    fontSize: 14,
    color: '#666',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 0.48,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  actionCardSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  iconWithBadge: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderBadge: {
    backgroundColor: '#ff9800',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  orderBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerRight: {
    marginRight: 10,
  },
  limitInfoCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  limitInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  limitInfoText: {
    marginLeft: 12,
    flex: 1,
  },
  limitInfoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  limitInfoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  limitReached: {
    color: '#f44336',
  },
  limitWarning: {
    marginTop: 10,
    fontSize: 13,
    color: '#f44336',
    fontWeight: '500',
  },
});

