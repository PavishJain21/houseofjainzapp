import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../config/api';

export default function PayoutHistoryScreen({ navigation }) {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadPayoutHistory();
    }, [])
  );

  const loadPayoutHistory = async () => {
    try {
      const response = await api.get('/payouts/history');
      setPayouts(response.data.payouts || []);
    } catch (error) {
      console.error('Error loading payout history:', error);
      Alert.alert('Error', 'Failed to load payout history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPayoutHistory();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'processing':
        return '#FF9800';
      case 'pending':
        return '#2196F3';
      case 'failed':
        return '#F44336';
      case 'cancelled':
        return '#9E9E9E';
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'processing':
        return 'hourglass';
      case 'pending':
        return 'time';
      case 'failed':
        return 'close-circle';
      case 'cancelled':
        return 'ban';
      default:
        return 'help-circle';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderPayoutItem = ({ item }) => (
    <TouchableOpacity
      style={styles.payoutCard}
      onPress={() => navigation.navigate('PayoutDetails', { payoutId: item.id })}
    >
      <View style={styles.payoutHeader}>
        <View style={styles.payoutLeft}>
          <Text style={styles.shopName}>{item.shop?.name || 'Shop'}</Text>
          <Text style={styles.payoutDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={styles.payoutRight}>
          <Text style={styles.payoutAmount}>₹{parseFloat(item.net_amount).toFixed(2)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Ionicons
              name={getStatusIcon(item.status)}
              size={14}
              color={getStatusColor(item.status)}
            />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.payoutDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="cart" size={16} color="#666" />
          <Text style={styles.detailText}>{item.ordersCount || 0} orders</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="receipt" size={16} color="#666" />
          <Text style={styles.detailText}>
            Commission: ₹{parseFloat(item.commission_amount).toFixed(2)}
          </Text>
        </View>
        {item.transaction_reference && (
          <View style={styles.detailRow}>
            <Ionicons name="barcode" size={16} color="#666" />
            <Text style={styles.detailText}>Ref: {item.transaction_reference}</Text>
          </View>
        )}
      </View>

      {item.processed_at && (
        <Text style={styles.processedDate}>
          Processed on {formatDate(item.processed_at)}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (payouts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="wallet-outline" size={80} color="#ccc" />
        <Text style={styles.emptyTitle}>No Payout History</Text>
        <Text style={styles.emptyText}>
          Your payout requests will appear here
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={payouts}
        renderItem={renderPayoutItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 15,
  },
  payoutCard: {
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
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  payoutLeft: {
    flex: 1,
  },
  payoutRight: {
    alignItems: 'flex-end',
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  payoutDate: {
    fontSize: 12,
    color: '#999',
  },
  payoutAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  payoutDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  processedDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

