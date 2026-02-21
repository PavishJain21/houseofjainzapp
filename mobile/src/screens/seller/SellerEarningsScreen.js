import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../config/api';

export default function SellerEarningsScreen({ navigation }) {
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: '',
    bankAccountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
    upiId: '',
  });

  useFocusEffect(
    React.useCallback(() => {
      loadEarnings();
    }, [])
  );

  const loadEarnings = async () => {
    try {
      const response = await api.get('/payouts/earnings');
      setEarnings(response.data);
    } catch (error) {
      console.error('Error loading earnings:', error);
      Alert.alert('Error', 'Failed to load earnings data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEarnings();
  };

  const handleAddBankDetails = async () => {
    if (!bankDetails.accountHolderName || !bankDetails.bankAccountNumber || !bankDetails.ifscCode) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await api.post('/payouts/bank-details', {
        accountHolderName: bankDetails.accountHolderName,
        bankAccountNumber: bankDetails.bankAccountNumber,
        ifscCode: bankDetails.ifscCode.toUpperCase(),
        bankName: bankDetails.bankName,
        branchName: bankDetails.branchName,
        upiId: bankDetails.upiId,
      });

      Alert.alert('Success', 'Bank details saved successfully');
      setShowBankForm(false);
      loadEarnings();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save bank details');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async (shopId) => {
    const shop = earnings?.shops?.find(s => s.shopId === shopId);
    if (!shop) return;

    if (!earnings?.bankDetails) {
      Alert.alert('Bank Details Required', 'Please add your bank details before requesting a payout', [
        { text: 'Add Now', onPress: () => setShowBankForm(true) },
        { text: 'Cancel', style: 'cancel' }
      ]);
      return;
    }

    if (shop.availableForPayout < earnings.minimumPayoutAmount) {
      Alert.alert(
        'Minimum Amount Required',
        `You need at least ₹${earnings.minimumPayoutAmount} to request a payout. Your current balance is ₹${shop.availableForPayout.toFixed(2)}`
      );
      return;
    }

    Alert.alert(
      'Request Payout',
      `Request payout of ₹${shop.availableForPayout.toFixed(2)} for ${shop.shopName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            try {
              setLoading(true);
              await api.post('/payouts/request', {
                shopId: shopId,
                notes: 'Payout request from mobile app'
              });
              Alert.alert('Success', 'Payout request submitted successfully');
              loadEarnings();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to request payout');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading && !earnings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (showBankForm) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Add Bank Details</Text>
            <TouchableOpacity onPress={() => setShowBankForm(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Account Holder Name *</Text>
          <TextInput
            style={styles.input}
            value={bankDetails.accountHolderName}
            onChangeText={(text) => setBankDetails({ ...bankDetails, accountHolderName: text })}
            placeholder="Full Name"
            placeholderTextColor="#666"
          />

          <Text style={styles.label}>Bank Account Number *</Text>
          <TextInput
            style={styles.input}
            value={bankDetails.bankAccountNumber}
            onChangeText={(text) => setBankDetails({ ...bankDetails, bankAccountNumber: text })}
            placeholder="Account Number"
            placeholderTextColor="#666"
            keyboardType="numeric"
          />

          <Text style={styles.label}>IFSC Code *</Text>
          <TextInput
            style={styles.input}
            value={bankDetails.ifscCode}
            onChangeText={(text) => setBankDetails({ ...bankDetails, ifscCode: text })}
            placeholder="IFSC Code"
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Bank Name</Text>
          <TextInput
            style={styles.input}
            value={bankDetails.bankName}
            onChangeText={(text) => setBankDetails({ ...bankDetails, bankName: text })}
            placeholder="Bank Name"
            placeholderTextColor="#666"
          />

          <Text style={styles.label}>Branch Name</Text>
          <TextInput
            style={styles.input}
            value={bankDetails.branchName}
            onChangeText={(text) => setBankDetails({ ...bankDetails, branchName: text })}
            placeholder="Branch Name"
            placeholderTextColor="#666"
          />

          <Text style={styles.label}>UPI ID (Optional)</Text>
          <TextInput
            style={styles.input}
            value={bankDetails.upiId}
            onChangeText={(text) => setBankDetails({ ...bankDetails, upiId: text })}
            placeholder="your@upi"
            placeholderTextColor="#666"
          />

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleAddBankDetails}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Bank Details</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Earnings Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, styles.totalEarningsCard]}>
          <Ionicons name="wallet" size={32} color="#4CAF50" />
          <Text style={styles.summaryLabel}>Total Earnings</Text>
          <Text style={styles.summaryAmount}>₹{earnings?.totalEarnings?.toFixed(2) || '0.00'}</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.smallCard]}>
            <Ionicons name="hourglass" size={24} color="#FF9800" />
            <Text style={styles.summaryLabel}>Escrow Held</Text>
            <Text style={styles.summaryAmount}>₹{earnings?.escrowHeld?.toFixed(2) || '0.00'}</Text>
          </View>

          <View style={[styles.summaryCard, styles.smallCard]}>
            <Ionicons name="cash" size={24} color="#4CAF50" />
            <Text style={styles.summaryLabel}>Available</Text>
            <Text style={styles.summaryAmount}>₹{earnings?.availableForPayout?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.smallCard]}>
            <Ionicons name="checkmark-circle" size={24} color="#2196F3" />
            <Text style={styles.summaryLabel}>Paid Out</Text>
            <Text style={styles.summaryAmount}>₹{earnings?.paidOut?.toFixed(2) || '0.00'}</Text>
          </View>

          <View style={[styles.summaryCard, styles.smallCard]}>
            <Ionicons name="receipt" size={24} color="#9C27B0" />
            <Text style={styles.summaryLabel}>Commission</Text>
            <Text style={styles.summaryAmount}>₹{earnings?.totalCommission?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>
      </View>

      {/* Bank Details Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bank Details</Text>
        {earnings?.bankDetails ? (
          <View style={styles.bankCard}>
            <View style={styles.bankHeader}>
              <Ionicons name="card" size={24} color="#4CAF50" />
              <Text style={styles.bankName}>{earnings.bankDetails.bank_name || 'Bank Account'}</Text>
            </View>
            <Text style={styles.bankDetail}>
              Account: ****{earnings.bankDetails.bank_account_number?.slice(-4)}
            </Text>
            <Text style={styles.bankDetail}>IFSC: {earnings.bankDetails.ifsc_code}</Text>
            {earnings.bankDetails.upi_id && (
              <Text style={styles.bankDetail}>UPI: {earnings.bankDetails.upi_id}</Text>
            )}
            <TouchableOpacity
              style={styles.editBankButton}
              onPress={() => setShowBankForm(true)}
            >
              <Text style={styles.editBankText}>Edit Details</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addBankButton}
            onPress={() => setShowBankForm(true)}
          >
            <Ionicons name="add-circle" size={24} color="#4CAF50" />
            <Text style={styles.addBankText}>Add Bank Details</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#2196F3" />
        <View style={styles.infoContent}>
          <Text style={styles.infoText}>
            • Funds are held in escrow for {earnings?.escrowHoldDays || 7} days after delivery
          </Text>
          <Text style={styles.infoText}>
            • Minimum payout amount: ₹{earnings?.minimumPayoutAmount || 100}
          </Text>
          <Text style={styles.infoText}>
            • Platform commission: Deducted from each sale
          </Text>
        </View>
      </View>

      {/* Shop-wise Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shop-wise Earnings</Text>
        {earnings?.shops?.map((shop) => (
          <View key={shop.shopId} style={styles.shopCard}>
            <View style={styles.shopHeader}>
              <View>
                <Text style={styles.shopName}>{shop.shopName}</Text>
                <Text style={styles.shopOrders}>{shop.totalOrders} orders</Text>
              </View>
              <Text style={styles.shopEarnings}>₹{shop.totalEarnings.toFixed(2)}</Text>
            </View>
            
            {shop.availableForPayout > 0 && (
              <View style={styles.shopPayoutSection}>
                <View style={styles.availableAmount}>
                  <Text style={styles.availableLabel}>Available for Payout:</Text>
                  <Text style={styles.availableValue}>₹{shop.availableForPayout.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.payoutButton,
                    shop.availableForPayout < (earnings?.minimumPayoutAmount || 100) && styles.payoutButtonDisabled
                  ]}
                  onPress={() => handleRequestPayout(shop.shopId)}
                  disabled={shop.availableForPayout < (earnings?.minimumPayoutAmount || 100)}
                >
                  <Text style={styles.payoutButtonText}>Request Payout</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Payout History Button */}
      <TouchableOpacity
        style={styles.historyButton}
        onPress={() => navigation.navigate('PayoutHistory')}
      >
        <Ionicons name="time" size={20} color="#4CAF50" />
        <Text style={styles.historyButtonText}>View Payout History</Text>
        <Ionicons name="chevron-forward" size={20} color="#4CAF50" />
      </TouchableOpacity>
    </ScrollView>
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
  summaryContainer: {
    padding: 15,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalEarningsCard: {
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  smallCard: {
    flex: 0.48,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
  bankCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 15,
  },
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bankName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  bankDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  editBankButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  editBankText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  addBankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  addBankText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
  },
  infoContent: {
    flex: 1,
    marginLeft: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#1976D2',
    marginBottom: 5,
  },
  shopCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  shopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  shopOrders: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  shopEarnings: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  shopPayoutSection: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 10,
    marginTop: 10,
  },
  availableAmount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  availableLabel: {
    fontSize: 14,
    color: '#666',
  },
  availableValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  payoutButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  payoutButtonDisabled: {
    backgroundColor: '#ccc',
  },
  payoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  historyButtonText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 20,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 30,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

