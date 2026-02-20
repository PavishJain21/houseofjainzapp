import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../config/api';

export default function CheckoutScreen({ navigation }) {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [loading, setLoading] = useState(false);
  const [cartTotal, setCartTotal] = useState(0);
  const [pendingPayment, setPendingPayment] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      loadAddresses();
      loadCartTotal();
      
      // Check if returning from payment
      checkPendingPayment();
    }, [])
  );

  const loadAddresses = async () => {
    try {
      const response = await api.get('/addresses');
      const addressesList = response.data.addresses || [];
      setAddresses(addressesList);
      
      if (addressesList.length > 0) {
        const defaultAddress = addressesList.find(a => a.is_default);
        if (defaultAddress) {
          setSelectedAddress(defaultAddress.id);
        } else {
          setSelectedAddress(addressesList[0].id);
        }
      } else {
        setSelectedAddress(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load addresses');
    }
  };

  const loadCartTotal = async () => {
    try {
      const response = await api.get('/cart');
      setCartTotal(response.data.total || 0);
    } catch (error) {
      // Ignore
    }
  };

  const checkPendingPayment = async () => {
    try {
      const pending = await AsyncStorage.getItem('pendingPayment');
      if (pending) {
        const paymentData = JSON.parse(pending);
        Alert.alert(
          'Complete Payment',
          'You have a pending payment. Would you like to complete it?',
          [
            {
              text: 'Cancel',
              onPress: async () => {
                await AsyncStorage.removeItem('pendingPayment');
              },
              style: 'cancel'
            },
            {
              text: 'Complete',
              onPress: () => handlePaymentReturn(paymentData)
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error checking pending payment:', error);
    }
  };

  const clearCartAndUpdateBadge = async () => {
    try {
      const mainTabsNavigator = navigation.getParent()?.getParent()?.getParent();
      if (mainTabsNavigator) {
        mainTabsNavigator.navigate('CartTab', { cartCount: 0 });
      }
      const cartTabNavigator = navigation.getParent()?.getParent();
      if (cartTabNavigator) {
        cartTabNavigator.setParams({ cartCount: 0 });
      }
    } catch (error) {
      console.error('Error clearing cart badge:', error);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('Error', 'Please select an address');
      return;
    }

    setLoading(true);
    try {
      if (paymentMethod === 'cash_on_delivery') {
        // Original COD flow
        const response = await api.post('/orders/checkout', {
          addressId: selectedAddress,
          paymentMethod,
        });

        await clearCartAndUpdateBadge();

        Alert.alert('Success', 'Order placed successfully', [
          { 
            text: 'OK', 
            onPress: () => navigateToOrders()
          },
        ]);
      } else {
        // Online payment flow - open in browser
        handleOnlinePayment();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to place order');
      setLoading(false);
    }
  };

  const handleOnlinePayment = async () => {
    try {
      // Create Razorpay order
      const orderResponse = await api.post('/payments/create-order', {
        addressId: selectedAddress,
      });

      const { orderId, amount, keyId, totalAmount } = orderResponse.data;

      // Store payment info for when user returns
      const paymentInfo = {
        razorpayOrderId: orderId,
        addressId: selectedAddress,
        amount: totalAmount,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem('pendingPayment', JSON.stringify(paymentInfo));

      // Build Razorpay URL
      const razorpayUrl = buildRazorpayUrl(orderId, amount, keyId);

      // Open in browser
      const canOpen = await Linking.canOpenURL(razorpayUrl);
      if (canOpen) {
        await Linking.openURL(razorpayUrl);
        setLoading(false);
        
        Alert.alert(
          'Payment Opened',
          'Please complete the payment in your browser. Return here after payment.',
          [
            {
              text: 'I\'ve Completed Payment',
              onPress: () => promptForPaymentDetails(paymentInfo)
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: async () => {
                await AsyncStorage.removeItem('pendingPayment');
              }
            }
          ]
        );
      } else {
        throw new Error('Cannot open payment URL');
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  const buildRazorpayUrl = (orderId, amount, keyId) => {
    // Simple payment link - in production, generate this from backend
    const baseUrl = 'https://api.razorpay.com/v1/checkout/embedded';
    return `${baseUrl}?key_id=${keyId}&order_id=${orderId}&amount=${amount}`;
  };

  const promptForPaymentDetails = (paymentInfo) => {
    Alert.prompt(
      'Payment Verification',
      'Please enter your payment ID (starts with "pay_")',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Verify',
          onPress: async (paymentId) => {
            if (paymentId && paymentId.startsWith('pay_')) {
              await verifyPayment(paymentInfo.razorpayOrderId, paymentId, paymentInfo.addressId);
            } else {
              Alert.alert('Invalid', 'Please enter a valid payment ID');
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const verifyPayment = async (razorpayOrderId, razorpayPaymentId, addressId) => {
    setLoading(true);
    try {
      // For simplified verification without signature
      const response = await api.post('/payments/verify-payment-simple', {
        addressId: addressId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
      });

      await AsyncStorage.removeItem('pendingPayment');
      await clearCartAndUpdateBadge();

      setLoading(false);
      Alert.alert('Success', 'Payment verified! Order placed successfully.', [
        { 
          text: 'OK', 
          onPress: () => navigateToOrders()
        },
      ]);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', error.response?.data?.error || 'Failed to verify payment');
    }
  };

  const navigateToOrders = () => {
    try {
      const mainTabsNavigator = navigation.getParent()?.getParent()?.getParent();
      if (mainTabsNavigator) {
        mainTabsNavigator.navigate('ProfileTab', {
          screen: 'Orders'
        });
      } else {
        navigation.navigate('ProfileTab');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      navigation.goBack();
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Address</Text>
        {addresses.length === 0 ? (
          <TouchableOpacity
            style={styles.addAddressButton}
            onPress={() => {
              navigation.navigate('AddAddress', { 
                returnTo: 'Checkout',
              });
            }}
          >
            <Ionicons name="add-circle" size={24} color="#4CAF50" />
            <Text style={styles.addAddressText}>Add Address</Text>
          </TouchableOpacity>
        ) : (
          addresses.map((address) => (
            <TouchableOpacity
              key={address.id}
              style={[
                styles.addressCard,
                selectedAddress === address.id && styles.selectedAddress,
              ]}
              onPress={() => setSelectedAddress(address.id)}
            >
              <View style={styles.addressHeader}>
                <Text style={styles.addressName}>{address.name}</Text>
                {selectedAddress === address.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                )}
              </View>
              <Text style={styles.addressText}>{address.address_line1}</Text>
              {address.address_line2 && (
                <Text style={styles.addressText}>{address.address_line2}</Text>
              )}
              <Text style={styles.addressText}>
                {address.city}, {address.state} - {address.pincode}
              </Text>
              <Text style={styles.addressPhone}>{address.phone}</Text>
            </TouchableOpacity>
          ))
        )}
        <TouchableOpacity
          style={styles.addAddressLink}
          onPress={() => navigation.navigate('AddAddress', { returnTo: 'Checkout' })}
        >
          <Text style={styles.addAddressLinkText}>+ Add New Address</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        
        <TouchableOpacity
          style={[
            styles.paymentOption,
            paymentMethod === 'online' && styles.selectedPayment,
          ]}
          onPress={() => setPaymentMethod('online')}
        >
          <Ionicons name="card" size={24} color="#4CAF50" />
          <Text style={styles.paymentText}>Online Payment (Razorpay)</Text>
          {paymentMethod === 'online' && (
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.paymentOption,
            paymentMethod === 'cash_on_delivery' && styles.selectedPayment,
          ]}
          onPress={() => setPaymentMethod('cash_on_delivery')}
        >
          <Ionicons name="cash" size={24} color="#4CAF50" />
          <Text style={styles.paymentText}>Cash on Delivery</Text>
          {paymentMethod === 'cash_on_delivery' && (
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          )}
        </TouchableOpacity>

        {paymentMethod === 'online' && (
          <View style={styles.paymentNote}>
            <Ionicons name="information-circle" size={16} color="#666" />
            <Text style={styles.paymentNoteText}>
              Payment will open in your browser. Complete payment and return here to verify.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryAmount}>₹{cartTotal.toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.placeOrderButton, loading && styles.buttonDisabled]}
        onPress={handlePlaceOrder}
        disabled={loading || !selectedAddress}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.placeOrderText}>
            {paymentMethod === 'online' ? 'Proceed to Payment' : 'Place Order'}
          </Text>
        )}
      </TouchableOpacity>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  addressCard: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  selectedAddress: {
    borderColor: '#4CAF50',
    backgroundColor: '#f1f8f4',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addressName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  addressPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  addAddressText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
  },
  addAddressLink: {
    marginTop: 10,
  },
  addAddressLinkText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    marginBottom: 10,
  },
  selectedPayment: {
    borderColor: '#4CAF50',
    backgroundColor: '#f1f8f4',
  },
  paymentText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  paymentNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  paymentNoteText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  summary: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  placeOrderButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    margin: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

