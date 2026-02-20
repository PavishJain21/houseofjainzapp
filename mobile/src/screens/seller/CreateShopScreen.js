import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';

export default function CreateShopScreen({ navigation }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant location permissions');
        return;
      }

      setLoading(true);
      const locationData = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = locationData.coords;

      // Reverse geocode to get readable address
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const addressData = reverseGeocode[0];
        const city = addressData.city || addressData.district || addressData.subregion || '';
        const state = addressData.region || '';
        const fullAddress = [
          addressData.street,
          addressData.district,
          addressData.city,
          addressData.region,
          addressData.postalCode,
        ]
          .filter(Boolean)
          .join(', ');

        setLocation(city || state || '');
        if (fullAddress) {
          setAddress(fullAddress);
        }
      } else {
        // Fallback to coordinates if reverse geocoding fails
        setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get location');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShop = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter shop name');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Error', 'Please enter location');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/marketplace/shops', {
        name: name.trim(),
        description: description.trim() || null,
        location: location.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
      });

      const shopId = response.data.shop.id;
      const shopName = response.data.shop.name;

      Alert.alert(
        'Success',
        'Shop created successfully! Would you like to add a product now?',
        [
          {
            text: 'Skip',
            style: 'cancel',
            onPress: () => {
              navigation.goBack();
            },
          },
          {
            text: 'Add Product',
            onPress: () => {
              navigation.navigate('AddProduct', { shopId, shopName });
            },
          },
        ]
      );
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Failed to create shop';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Shop Name *"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description (Optional)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <View style={styles.locationContainer}>
          <TextInput
            style={[styles.input, styles.locationInput]}
            placeholder="Location (City) *"
            value={location}
            onChangeText={setLocation}
          />
          <TouchableOpacity
            style={styles.locationButton}
            onPress={getLocation}
            disabled={loading}
          >
            <Ionicons name="location" size={20} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Full Address (Optional)"
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <TextInput
          style={styles.input}
          placeholder="Phone Number (Optional)"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <TouchableOpacity
          style={[styles.createButton, loading && styles.buttonDisabled]}
          onPress={handleCreateShop}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Creating...' : 'Create Shop'}
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
  textArea: {
    minHeight: 100,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  locationInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 10,
  },
  locationButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
});

