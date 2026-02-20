import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import { API_BASE_URL } from '../../config/api';

export default function SellerOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [activeTab, setActiveTab] = useState('received'); // 'received' or 'done'
  const [pendingCount, setPendingCount] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      loadOrders();
    }, [])
  );

  useEffect(() => {
    filterOrders();
  }, [orders, activeTab]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/seller/orders');
      const ordersList = response.data.orders || [];
      setOrders(ordersList);
      
      // Count pending orders in Order Received tab
      const receivedOrders = ordersList.filter(o => 
        ['pending', 'confirmed', 'processing', 'shipped'].includes(o.status)
      );
      const pending = receivedOrders.filter(o => o.status === 'pending').length;
      setPendingCount(pending);
    } catch (error) {
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    if (activeTab === 'received') {
      // Order Received: pending, confirmed, processing, shipped
      setFilteredOrders(orders.filter(order => 
        ['pending', 'confirmed', 'processing', 'shipped'].includes(order.status)
      ));
    } else {
      // Order Done: delivered, cancelled
      setFilteredOrders(orders.filter(order => 
        ['delivered', 'cancelled'].includes(order.status)
      ));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  // Get allowed next statuses based on current status and tab
  const getAllowedStatuses = (currentStatus, tab) => {
    if (tab === 'received') {
      // Order Received: forward only progression
      switch (currentStatus) {
        case 'pending':
          return [
            { value: 'confirmed', label: 'Order Received' },
            { value: 'cancelled', label: 'Cancel Order' }
          ];
        case 'confirmed':
          return [{ value: 'shipped', label: 'Shipped' }];
        case 'processing':
          return [{ value: 'shipped', label: 'Shipped' }];
        case 'shipped':
          return [{ value: 'delivered', label: 'Delivered' }];
        default:
          return [];
      }
    } else {
      // Order Done: can only cancel pending orders (if any appear here)
      if (currentStatus === 'pending') {
        return [{ value: 'cancelled', label: 'Cancel Order' }];
      }
      return []; // Delivered and cancelled are final
    }
  };

  const handleStatusChange = async () => {
    // Validate that a new status is selected and different from current
    if (!newStatus || newStatus === selectedOrder?.status) {
      Alert.alert('Error', 'Please select a different status');
      return;
    }

    try {
      const response = await api.put(`/seller/orders/${selectedOrder.id}/status`, {
        status: newStatus,
      });
      
      setStatusModalVisible(false);
      setSelectedOrder(null);
      setNewStatus('');
      
      // Reload orders to get updated data
      await loadOrders();
      
      Alert.alert('Success', 'Order status updated successfully');
    } catch (error) {
      console.error('Error updating order status:', error);
      
      // Extract detailed error message
      let errorMessage = 'Failed to update order status';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid status update. The order status may have changed. Please refresh and try again.';
      } else if (error.response?.status === 409) {
        errorMessage = 'Order status was already changed by another request. Please refresh and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage, [
        {
          text: 'Refresh',
          onPress: async () => {
            await loadOrders();
            setStatusModalVisible(false);
            setSelectedOrder(null);
            setNewStatus('');
          }
        },
        { text: 'OK' }
      ]);
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

  const canUpdateStatus = (order) => {
    const allowedStatuses = getAllowedStatuses(order.status, activeTab);
    return allowedStatuses.length > 0;
  };

  const renderOrder = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => {
        setSelectedOrder(item);
        setDetailsModalVisible(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderHeaderLeft}>
          <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
          <Text style={styles.orderDate}>
            {new Date(item.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
        >
          <Ionicons name={getStatusIcon(item.status)} size={12} color="#fff" />
          <Text style={styles.statusText}>
            {item.status === 'confirmed' ? 'ORDER RECEIVED' : item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {item.user && (
        <View style={styles.customerInfo}>
          <Ionicons name="person-outline" size={14} color="#666" />
          <Text style={styles.customerName}>
            {item.user.name} {item.user.phone && `• ${item.user.phone}`}
          </Text>
        </View>
      )}

      <View style={styles.orderItems}>
        {item.items?.slice(0, 2).map((orderItem, index) => (
          <View key={index} style={styles.orderItemRow}>
            <Text style={styles.orderItemText}>
              {orderItem.product?.name} × {orderItem.quantity}
            </Text>
            <Text style={styles.orderItemPrice}>
              ₹{(orderItem.price * orderItem.quantity).toFixed(2)}
            </Text>
          </View>
        ))}
        {item.items?.length > 2 && (
          <Text style={styles.moreItems}>
            +{item.items.length - 2} more items
          </Text>
        )}
      </View>

      <View style={styles.orderFooter}>
        <View>
          <Text style={styles.paymentMethod}>
            {item.payment_method === 'cash_on_delivery' ? 'Cash on Delivery' : 'Online Payment'}
          </Text>
        </View>
        <Text style={styles.orderTotal}>₹{parseFloat(item.total_amount).toFixed(2)}</Text>
      </View>

      {canUpdateStatus(item) && (
        <TouchableOpacity
          style={styles.updateButton}
          onPress={(e) => {
            e.stopPropagation();
            setSelectedOrder(item);
            // Initialize with empty status so user must select a new one
            setNewStatus('');
            setStatusModalVisible(true);
          }}
        >
          <Text style={styles.updateButtonText}>Update Status</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Description */}
      <View style={styles.headerDescription}>
        <Text style={styles.headerDescriptionText}>
          Orders received from customers for your shops
        </Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.tabActive]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
            Order Received
            {activeTab === 'received' && pendingCount > 0 && (
              <Text style={styles.tabBadge}> {pendingCount}</Text>
            )}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'done' && styles.tabActive]}
          onPress={() => setActiveTab('done')}
        >
          <Text style={[styles.tabText, activeTab === 'done' && styles.tabTextActive]}>
            Order Done
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No orders found</Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'received'
                  ? 'Orders from customers will appear here when they place orders for your products'
                  : 'Completed and cancelled orders will appear here'}
              </Text>
            </View>
          }
        />
      )}

      {/* Status Update Modal */}
      <Modal
        visible={statusModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Order Status</Text>
            <Text style={styles.modalOrderId}>Order #{selectedOrder?.id.slice(0, 8)}</Text>
            <Text style={styles.currentStatusText}>
              Current Status: {selectedOrder?.status === 'confirmed' ? 'Order Received' : selectedOrder?.status.charAt(0).toUpperCase() + selectedOrder?.status.slice(1)}
            </Text>

            <View style={styles.statusOptions}>
              {selectedOrder && getAllowedStatuses(selectedOrder.status, activeTab).map((statusOption) => (
                <TouchableOpacity
                  key={statusOption.value}
                  style={[
                    styles.statusOption,
                    newStatus === statusOption.value && styles.statusOptionActive,
                  ]}
                  onPress={() => setNewStatus(statusOption.value)}
                >
                  <Ionicons
                    name={getStatusIcon(statusOption.value)}
                    size={20}
                    color={newStatus === statusOption.value ? '#fff' : getStatusColor(statusOption.value)}
                  />
                  <Text
                    style={[
                      styles.statusOptionText,
                      newStatus === statusOption.value && styles.statusOptionTextActive,
                    ]}
                  >
                    {statusOption.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedOrder && getAllowedStatuses(selectedOrder.status, activeTab).length === 0 && (
              <Text style={styles.noStatusText}>
                No status changes allowed for this order
              </Text>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setStatusModalVisible(false);
                  setSelectedOrder(null);
                  setNewStatus('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              {selectedOrder && getAllowedStatuses(selectedOrder.status, activeTab).length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.updateButton,
                    !newStatus || newStatus === selectedOrder.status ? styles.updateButtonDisabled : null
                  ]}
                  onPress={handleStatusChange}
                  disabled={!newStatus || newStatus === selectedOrder.status}
                >
                  <Text style={styles.updateButtonText}>Update</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Order Details Modal */}
      <Modal
        visible={detailsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.detailsModalContent}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView style={styles.detailsScroll}>
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Order Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Order ID:</Text>
                    <Text style={styles.detailValue}>#{selectedOrder.id.slice(0, 8)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedOrder.created_at).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View
                      style={[
                        styles.statusBadgeSmall,
                        { backgroundColor: getStatusColor(selectedOrder.status) },
                      ]}
                    >
                      <Text style={styles.statusTextSmall}>
                        {selectedOrder.status === 'confirmed' ? 'ORDER RECEIVED' : selectedOrder.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Payment:</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.payment_method === 'cash_on_delivery'
                        ? 'Cash on Delivery'
                        : 'Online Payment'}
                    </Text>
                  </View>
                </View>

                {selectedOrder.user && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsSectionTitle}>Customer Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name:</Text>
                      <Text style={styles.detailValue}>{selectedOrder.user.name}</Text>
                    </View>
                    {selectedOrder.user.email && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Email:</Text>
                        <Text style={styles.detailValue}>{selectedOrder.user.email}</Text>
                      </View>
                    )}
                    {selectedOrder.user.phone && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Phone:</Text>
                        <Text style={styles.detailValue}>{selectedOrder.user.phone}</Text>
                      </View>
                    )}
                  </View>
                )}

                {selectedOrder.address && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsSectionTitle}>Delivery Address</Text>
                    <Text style={styles.addressText}>
                      {selectedOrder.address.name}
                      {'\n'}
                      {selectedOrder.address.address_line1}
                      {selectedOrder.address.address_line2 && `\n${selectedOrder.address.address_line2}`}
                      {'\n'}
                      {selectedOrder.address.city}, {selectedOrder.address.state} - {selectedOrder.address.pincode}
                      {'\n'}
                      Phone: {selectedOrder.address.phone}
                    </Text>
                  </View>
                )}

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Order Items</Text>
                  {selectedOrder.items?.map((orderItem, index) => (
                    <View key={index} style={styles.orderItemDetail}>
                      <View style={styles.orderItemDetailLeft}>
                        {orderItem.product?.image_url ? (
                          <Image
                            source={{ uri: orderItem.product.image_url }}
                            style={styles.orderItemImage}
                          />
                        ) : (
                          <View style={styles.orderItemImagePlaceholder}>
                            <Ionicons name="image-outline" size={20} color="#ccc" />
                          </View>
                        )}
                        <View style={styles.orderItemDetailInfo}>
                          <Text style={styles.orderItemDetailName}>
                            {orderItem.product?.name}
                          </Text>
                          <Text style={styles.orderItemDetailQuantity}>
                            Quantity: {orderItem.quantity} × ₹{orderItem.price.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.orderItemDetailTotal}>
                        ₹{(orderItem.price * orderItem.quantity).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.detailsSection}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Amount:</Text>
                    <Text style={styles.totalAmount}>
                      ₹{parseFloat(selectedOrder.total_amount).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {canUpdateStatus(selectedOrder) && (
                  <TouchableOpacity
                    style={styles.updateStatusButton}
                    onPress={() => {
                      setDetailsModalVisible(false);
                      // Initialize with empty status so user must select a new one
                      setNewStatus('');
                      setStatusModalVisible(true);
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color="#fff" />
                    <Text style={styles.updateStatusButtonText}>Update Status</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
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
  headerDescription: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerDescriptionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  tabBadge: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 6,
    fontSize: 12,
    fontWeight: 'bold',
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
  orderHeaderLeft: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
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
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  customerName: {
    fontSize: 14,
    color: '#666',
  },
  orderItems: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  orderItemText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  orderItemPrice: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
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
  paymentMethod: {
    fontSize: 12,
    color: '#666',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  updateButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 8,
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
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 5,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
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
    marginBottom: 8,
  },
  currentStatusText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontWeight: '500',
  },
  statusOptions: {
    marginBottom: 20,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    gap: 10,
  },
  statusOptionActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
  statusOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statusOptionTextActive: {
    color: '#fff',
  },
  noStatusText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
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
  updateButton: {
    backgroundColor: '#4CAF50',
  },
  updateButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailsModalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '95%',
    maxHeight: '90%',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  detailsScroll: {
    padding: 20,
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTextSmall: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  orderItemDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderItemDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  orderItemImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderItemDetailInfo: {
    flex: 1,
  },
  orderItemDetailName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  orderItemDetailQuantity: {
    fontSize: 12,
    color: '#666',
  },
  orderItemDetailTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  updateStatusButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  updateStatusButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
