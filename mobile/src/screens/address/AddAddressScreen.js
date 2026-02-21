import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import api from '../../config/api';

export default function AddAddressScreen({ route, navigation }) {
  const { addressId } = route.params || {};
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (addressId) {
      loadAddress();
    }
  }, [addressId]);

  const loadAddress = async () => {
    try {
      const response = await api.get('/addresses');
      const address = response.data.addresses.find(a => a.id === addressId);
      if (address) {
        setName(address.name);
        setPhone(address.phone);
        setAddressLine1(address.address_line1);
        setAddressLine2(address.address_line2 || '');
        setCity(address.city);
        setState(address.state);
        setPincode(address.pincode);
        setIsDefault(address.is_default);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load address');
    }
  };

  const handleSave = async () => {
    if (!name || !phone || !addressLine1 || !city || !state || !pincode) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      let savedAddress;
      if (addressId) {
        await api.put(`/addresses/${addressId}`, {
          name,
          phone,
          address_line1: addressLine1,
          address_line2: addressLine2,
          city,
          state,
          pincode,
          is_default: isDefault,
        });
        Alert.alert('Success', 'Address updated successfully');
      } else {
        const response = await api.post('/addresses', {
          name,
          phone,
          address_line1: addressLine1,
          address_line2: addressLine2,
          city,
          state,
          pincode,
          is_default: isDefault,
        });
        savedAddress = response.data.address;
        Alert.alert('Success', 'Address added successfully');
      }
      
      // If coming from Checkout screen, go back to refresh it
      const { returnTo } = route.params || {};
      if (returnTo === 'Checkout') {
        navigation.goBack();
      } else {
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Full Name *"
          placeholderTextColor="#666"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.input}
          placeholder="Phone Number *"
          placeholderTextColor="#666"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <TextInput
          style={styles.input}
          placeholder="Address Line 1 *"
          placeholderTextColor="#666"
          value={addressLine1}
          onChangeText={setAddressLine1}
        />

        <TextInput
          style={styles.input}
          placeholder="Address Line 2 (Optional)"
          placeholderTextColor="#666"
          value={addressLine2}
          onChangeText={setAddressLine2}
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="City *"
            placeholderTextColor="#666"
            value={city}
            onChangeText={setCity}
          />

          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="State *"
            placeholderTextColor="#666"
            value={state}
            onChangeText={setState}
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Pincode *"
          placeholderTextColor="#666"
          value={pincode}
          onChangeText={setPincode}
          keyboardType="number-pad"
        />

        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Set as default address</Text>
          <Switch
            value={isDefault}
            onValueChange={setIsDefault}
            trackColor={{ false: '#ccc', true: '#4CAF50' }}
            thumbColor="#fff"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : addressId ? 'Update Address' : 'Save Address'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 15,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

