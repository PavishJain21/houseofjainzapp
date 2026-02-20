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
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../config/api';

export default function CheckoutScreen({ navigation }) {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [loading, setLoading] = useState(false);
  const [cartTotal, setCartTotal] = useState(0);
  const [pollingActive, setPollingActive] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [debugMessage, setDebugMessage] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadAddresses();
      loadCartTotal();
      checkPendingPayment();
      
      // Cleanup on unfocus
      return () => {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      };
    }, [])
  );

  useEffect(() => {
    // Cleanup on unmount or when pollingInterval changes
    return () => {
      if (pollingInterval) {
        console.log('🧹 Cleanup: Clearing polling interval on unmount/change');
        clearInterval(pollingInterval);
        setPollingActive(false);
      }
    };
  }, [pollingInterval]);

  const checkPendingPayment = async () => {
    try {
      // Don't check pending payments if already polling
      if (pollingActive) {
        console.log('⏭️ Skipping pending payment check - already polling');
        return;
      }
      
      const pending = await AsyncStorage.getItem('pendingPayment');
      if (pending) {
        const paymentData = JSON.parse(pending);
        console.log('📋 Found pending payment:', paymentData);
        
        // Check if payment is not too old (within 30 minutes)
        if (Date.now() - paymentData.timestamp < 30 * 60 * 1000) {
          Alert.alert(
            'Pending Payment',
            'You have an incomplete payment. Checking status...',
            [
              { 
                text: 'Check Status', 
                onPress: () => {
                  startPollingForPayment(
                    paymentData.razorpayOrderId, 
                    paymentData.addressId, 
                    paymentData.paymentLinkId
                  );
                }
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
          // Payment too old, remove it
          console.log('🗑️ Removing old pending payment');
          await AsyncStorage.removeItem('pendingPayment');
        }
      }
    } catch (error) {
      console.error('Error checking pending payment:', error);
    }
  };

  const loadAddresses = async () => {
    try {
      const response = await api.get('/addresses');
      const addressesList = response.data.addresses || [];
      setAddresses(addressesList);
      
      // Auto-select address: first check for default, then select first one if available
      if (addressesList.length > 0) {
        const defaultAddress = addressesList.find(a => a.is_default);
        if (defaultAddress) {
          setSelectedAddress(defaultAddress.id);
        } else {
          // If no default address, select the first one (newly added)
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

  const clearCartAndUpdateBadge = async () => {
    try {
      // Clear cart badge by setting it to 0
      const mainTabsNavigator = navigation.getParent()?.getParent()?.getParent();
      if (mainTabsNavigator) {
        // Navigate to CartTab to update badge, then navigate away
        mainTabsNavigator.navigate('CartTab', { cartCount: 0 });
      }
      // Also update CartTab's parent directly if available
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
        // Online payment with polling
        await handleOnlinePayment();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to place order');
      setLoading(false);
    }
  };

  const handleOnlinePayment = async () => {
    try {
      // Stop any existing polling
      console.log('🛑 Stopping any existing polling...');
      stopPolling();
      
      // Clear any old pending payments
      await AsyncStorage.removeItem('pendingPayment');
      console.log('🧹 Cleared old pending payments');
      
      // Create Razorpay payment link
      const response = await api.post('/payments/create-payment-link', {
        addressId: selectedAddress,
        amount: cartTotal,
      });

      const { paymentLink, razorpayOrderId, paymentLinkId } = response.data;

      console.log('💳 Payment link created:', { paymentLink, razorpayOrderId, paymentLinkId });

      // Store payment info
      const paymentInfo = {
        razorpayOrderId,
        paymentLinkId,
        addressId: selectedAddress,
        amount: cartTotal,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem('pendingPayment', JSON.stringify(paymentInfo));

      setLoading(false);
      
      // IMMEDIATELY try to open the link (don't wait for alert)
      Linking.openURL(paymentLink).catch(err => {
        console.error('Failed to open link:', err);
      });
      
      // Start polling immediately
      startPollingForPayment(razorpayOrderId, selectedAddress, paymentLinkId);
      
      // Show info alert (non-blocking)
      Alert.alert(
        '💳 Payment Opened',
        'Payment page has been opened in your browser.\n\n✅ Complete your payment\n✅ Return here after payment\n\nWe are automatically checking for payment confirmation!',
        [
          {
            text: 'OK'
          },
          {
            text: 'Stop Checking',
            style: 'cancel',
            onPress: () => stopPolling()
          }
        ]
      );
    } catch (error) {
      console.error('Error creating payment link:', error);
      setLoading(false);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create payment link');
    }
  };

  const startPollingForPayment = (razorpayOrderId, addressId, paymentLinkId) => {
    console.log('🔄 Starting polling for:', { razorpayOrderId, paymentLinkId });
    setPollingActive(true);
    setDebugMessage('Starting payment check...');
    let pollCount = 0;
    const maxPolls = 60; // Poll for 5 minutes (60 * 5 seconds)
    let intervalId = null; // Store interval ID locally

    const checkPayment = async () => {
      pollCount++;
      const debugMsg = `Checking payment... (${pollCount}/${maxPolls})`;
      console.log(`📡 ${debugMsg}`);
      setDebugMessage(debugMsg);
      
      try {
        // Check payment status
        console.log('📞 Calling API with:', { razorpayOrderId, paymentLinkId });
        const response = await api.post('/payments/check-payment-status', {
          razorpayOrderId,
          addressId,
          paymentLinkId
        });

        console.log('📥 Response:', JSON.stringify(response.data, null, 2));
        setDebugMessage(`Response: ${response.data.paid ? 'PAID!' : 'Pending'} (${pollCount})`);

        if (response.data.paid) {
          // Payment successful! Stop polling IMMEDIATELY
          console.log('✅ Payment detected!');
          console.log('🛑 Stopping polling immediately...');
          
          // Clear interval immediately
          if (intervalId) {
            clearInterval(intervalId);
            console.log('✅ Interval cleared');
          }
          setPollingInterval(null);
          setPollingActive(false);
          setDebugMessage('✅ Payment successful!');
          
          await AsyncStorage.removeItem('pendingPayment');
          await clearCartAndUpdateBadge();
          
          Alert.alert(
            '✅ Payment Successful!',
            'Your order has been placed successfully.',
            [
              {
                text: 'View Orders',
                onPress: () => {
                  // Ensure polling is stopped
                  console.log('🛑 View Orders clicked - ensuring polling stopped');
                  if (intervalId) {
                    clearInterval(intervalId);
                  }
                  setPollingInterval(null);
                  setPollingActive(false);
                  navigateToOrders();
                }
              }
            ],
            {
              cancelable: false,  // Prevent dismissal by tapping outside
              onDismiss: () => {
                // Also stop polling if alert is somehow dismissed
                console.log('🛑 Alert dismissed - ensuring polling stopped');
                if (intervalId) {
                  clearInterval(intervalId);
                }
                setPollingInterval(null);
                setPollingActive(false);
              }
            }
          );
          
          // Return to stop the interval from continuing
          return;
        } else {
          console.log('⏳ Not paid yet:', response.data.status);
          
          if (pollCount >= maxPolls) {
            console.log('⏱️ Timeout');
            setDebugMessage('⏱️ Timeout - check orders manually');
            
            // Clear interval immediately
            if (intervalId) {
              clearInterval(intervalId);
            }
            setPollingInterval(null);
            setPollingActive(false);
            
            Alert.alert(
              '⏱️ Payment Check Timeout',
              'We couldn\'t detect your payment. If you completed it, your order will be processed. Check your orders.',
              [
                {
                  text: 'Check Orders',
                  onPress: () => navigateToOrders()
                },
                {
                  text: 'OK',
                  style: 'cancel'
                }
              ]
            );
          }
        }
      } catch (error) {
        console.error('❌ Error:', error);
        const errorMsg = error.response?.data?.error || error.message;
        setDebugMessage(`Error: ${errorMsg}`);
        
        if (pollCount >= maxPolls) {
          if (intervalId) {
            clearInterval(intervalId);
          }
          setPollingInterval(null);
          setPollingActive(false);
        }
      }
    };

    // Start the interval
    intervalId = setInterval(checkPayment, 5000); // Poll every 5 seconds
    setPollingInterval(intervalId);
    
    // Also check immediately (don't wait 5 seconds for first check)
    checkPayment();
  };

  const stopPolling = () => {
    console.log('🛑 stopPolling called');
    if (pollingInterval) {
      console.log('🛑 Clearing interval:', pollingInterval);
      clearInterval(pollingInterval);
      setPollingInterval(null);
      console.log('✅ Polling interval cleared and set to null');
    } else {
      console.log('⚠️ No polling interval to clear');
    }
    setPollingActive(false);
    console.log('✅ Polling stopped completely');
  };

  const navigateToOrders = () => {
    console.log('📍 Navigating to Orders - stopping polling first');
    // Ensure polling is completely stopped before navigating
    stopPolling();
    
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
                onAddressAdded: () => {
                  // This will be handled by useFocusEffect when screen comes back into focus
                }
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
          <Text style={styles.paymentText}>Online Payment</Text>
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
            <Ionicons name="information-circle" size={16} color="#4CAF50" />
            <Text style={styles.paymentNoteText}>
              💳 Secure payment via Razorpay. Pay with UPI, Cards, Net Banking or Wallets. Payment will open in your browser and we'll automatically verify it!
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
        style={[styles.placeOrderButton, (loading || pollingActive) && styles.buttonDisabled]}
        onPress={handlePlaceOrder}
        disabled={loading || !selectedAddress || pollingActive}
      >
        {loading || pollingActive ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#fff" />
            {pollingActive && (
              <Text style={styles.loadingText}>Checking payment...</Text>
            )}
          </View>
        ) : (
          <Text style={styles.placeOrderText}>
            {paymentMethod === 'online' ? 'Proceed to Payment' : 'Place Order'}
          </Text>
        )}
      </TouchableOpacity>

      {pollingActive && (
        <View>
          <View style={styles.pollingBanner}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.pollingText}>
                🔄 Waiting for payment confirmation...
              </Text>
              {debugMessage && (
                <Text style={styles.debugText}>{debugMessage}</Text>
              )}
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.reopenButton}
            onPress={async () => {
              const pending = await AsyncStorage.getItem('pendingPayment');
              if (pending) {
                const paymentData = JSON.parse(pending);
                // Recreate the payment link URL
                Alert.alert(
                  'Payment Link',
                  'If the payment page didn\'t open, you can:\n\n1. Complete payment in browser if already open\n2. Or tap "Open Payment Link" to try again',
                  [
                    {
                      text: 'Open Payment Link',
                      onPress: async () => {
                        try {
                          const response = await api.post('/payments/create-payment-link', {
                            addressId: paymentData.addressId,
                            amount: paymentData.amount,
                          });
                          await Linking.openURL(response.data.paymentLink);
                        } catch (error) {
                          Alert.alert('Error', 'Failed to create payment link');
                        }
                      }
                    },
                    {
                      text: 'Cancel',
                      style: 'cancel'
                    }
                  ]
                );
              }
            }}
          >
            <Ionicons name="open-outline" size={16} color="#4CAF50" />
            <Text style={styles.reopenButtonText}>
              Payment page didn't open? Tap here
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
  paymentNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    padding: 12,
    backgroundColor: '#f1f8f4',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  paymentNoteText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 18,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 14,
  },
  pollingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff3cd',
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeb3b',
  },
  pollingText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
  },
  debugText: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  reopenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  reopenButtonText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },
});

