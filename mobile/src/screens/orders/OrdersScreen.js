import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import LanguageContext from '../../context/LanguageContext';
import api from '../../config/api';

export default function OrdersScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadOrders();
    }, [])
  );

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/orders/my-orders');
      setOrders(response.data.orders || []);
    } catch (error) {
      Alert.alert(t('common.error'), t('orders.loadError') || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleStatusUpdate = async () => {
    try {
      await api.put(`/orders/${selectedOrder.id}/status`, {
        status: newStatus,
      });
      setStatusModalVisible(false);
      setSelectedOrder(null);
      await loadOrders();
      Alert.alert(t('common.success'), t('orders.statusUpdated'));
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update status');
    }
  };

  const canUpdateStatus = (order) => {
    // Customers can mark shipped orders as delivered
    // Customers can cancel ONLY pending orders
    // Once confirmed, customers cannot change status (only seller can)
    return order.status === 'shipped' || order.status === 'pending';
  };

  const getAvailableStatuses = (currentStatus) => {
    if (currentStatus === 'shipped') {
      return [{ label: 'Mark as Delivered', value: 'delivered' }];
    }
    if (currentStatus === 'pending') {
      return [{ label: 'Cancel Order', value: 'cancelled' }];
    }
    return [];
  };

  const getButtonText = (status) => {
    if (status === 'shipped') {
      return t('orders.markAsDelivered');
    }
    if (status === 'pending') {
      return t('orders.cancelOrder');
    }
    return '';
  };

  const getButtonIcon = (status) => {
    if (status === 'shipped') {
      return 'checkmark-circle-outline';
    }
    if (status === 'pending') {
      return 'close-circle-outline';
    }
    return 'ellipse-outline';
  };

  const getStatusDisplayText = (status) => {
    switch (status) {
      case 'pending':
        return t('orders.pending');
      case 'confirmed':
        return t('orders.orderReceived');
      case 'processing':
        return t('orders.processing');
      case 'shipped':
        return t('orders.shipped');
      case 'delivered':
        return t('orders.delivered');
      case 'cancelled':
        return t('orders.cancelled');
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    // Normalize status to lowercase for comparison
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
        return '#ff9800';
      case 'confirmed':
        return '#2196F3';
      case 'processing':
        return '#9C27B0';
      case 'shipped':
        return '#00BCD4';
      case 'delivered':
        return '#4CAF50';
      case 'cancelled':
        return '#c62828'; // Darker red for cancelled status
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'confirmed':
        return 'checkmark-circle-outline';
      case 'processing':
        return 'construct-outline';
      case 'shipped':
        return 'car-outline';
      case 'delivered':
        return 'checkmark-done-circle';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const renderOrder = ({ item }) => (
    <TouchableOpacity style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>{t('orders.orderId')} #{item.id.slice(0, 8)}</Text>
          <Text style={styles.orderDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
        >
          <Ionicons name={getStatusIcon(item.status)} size={12} color="#fff" />
          <Text style={styles.statusText}>{getStatusDisplayText(item.status).toUpperCase()}</Text>
        </View>
      </View>

      {item.shop && (
        <View style={styles.shopInfo}>
          <Ionicons name="storefront-outline" size={14} color="#666" />
          <Text style={styles.shopName}>{item.shop.name}</Text>
        </View>
      )}

      <View style={styles.orderItems}>
        {item.items?.slice(0, 2).map((orderItem, index) => (
          <Text key={index} style={styles.orderItemText}>
            {orderItem.product?.name} x {orderItem.quantity}
          </Text>
        ))}
        {item.items?.length > 2 && (
          <Text style={styles.moreItems}>
            +{item.items.length - 2} more items
          </Text>
        )}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>{t('orders.total')}: ₹{parseFloat(item.total_amount).toFixed(2)}</Text>
      </View>

      {canUpdateStatus(item) && (
        <TouchableOpacity
          style={[
            styles.updateButton,
            item.status === 'pending' && styles.cancelButton
          ]}
          onPress={() => {
            setSelectedOrder(item);
            const availableStatuses = getAvailableStatuses(item.status);
            if (availableStatuses.length > 0) {
              setNewStatus(availableStatuses[0].value);
              setStatusModalVisible(true);
            }
          }}
        >
          <Ionicons 
            name={getButtonIcon(item.status)} 
            size={18} 
            color="#fff" 
          />
          <Text style={styles.updateButtonText}>
            {getButtonText(item.status)}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>{t('orders.noOrders')}</Text>
          </View>
        }
      />

      {/* Status Update Modal */}
      <Modal
        visible={statusModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('orders.updateStatusTitle')}</Text>
            <Text style={styles.modalOrderId}>{t('orders.orderId')} #{selectedOrder?.id.slice(0, 8)}</Text>

            {selectedOrder && (
              <View style={styles.statusInfo}>
                <Text style={styles.statusInfoText}>
                  {t('orders.currentStatus')}: <Text style={styles.statusInfoValue}>{getStatusDisplayText(selectedOrder.status)}</Text>
                </Text>
                <Text style={styles.statusInfoText}>
                  {t('orders.newStatus')}: <Text style={styles.statusInfoValue}>{getStatusDisplayText(newStatus)}</Text>
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setStatusModalVisible(false);
                  setSelectedOrder(null);
                }}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.updateButton]}
                onPress={handleStatusUpdate}
              >
                <Text style={styles.updateButtonText}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 10,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  shopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  shopName: {
    fontSize: 14,
    color: '#666',
  },
  orderItems: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  orderItemText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  moreItems: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  updateButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalOrderId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  statusInfo: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusInfoValue: {
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'capitalize',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
});
