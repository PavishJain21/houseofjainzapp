import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import { getLocationWithFallback } from '../../utils/location';

export default function CreateForumPostScreen({ route, navigation }) {
  const { categorySlug, categoryLabel } = route.params || {};
  const [content, setContent] = useState('');
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant location permissions');
        return;
      }

      const locationData = await getLocationWithFallback({});
      const { latitude, longitude } = locationData.coords;

      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        const cityName = address.city || address.district || address.subregion || address.region || 'Unknown Location';
        setLocation(cityName);
      } else {
        Alert.alert('Error', 'Could not determine location');
      }
    } catch (error) {
      console.error('Location error:', error);
      const msg = error?.message === 'LOCATION_SERVICES_DISABLED'
        ? 'Please enable Location Services in your device settings.'
        : 'Failed to get location. Please try again.';
      Alert.alert('Error', msg);
    }
  };

  const handlePost = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some text');
      return;
    }
    if (!categorySlug) {
      Alert.alert('Error', 'Category is required');
      return;
    }

    setLoading(true);
    try {
      await api.post('/forum/posts', {
        content: content.trim(),
        category_slug: categorySlug,
        location: location || null,
      });
      navigation.goBack();
      // Parent can refresh list via focus listener if needed
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {categoryLabel && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
          </View>
        )}
        <TextInput
          style={styles.input}
          placeholder="What would you like to share?"
          placeholderTextColor="#999"
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          editable={!loading}
        />

        <View style={styles.locationRow}>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={getLocation}
            disabled={loading}
          >
            <Ionicons name="location" size={22} color="#4CAF50" />
            <Text style={styles.locationButtonText}>
              {location ? 'Location Added' : 'Add Location'}
            </Text>
          </TouchableOpacity>
          {location ? (
            <View style={styles.locationTag}>
              <Text style={styles.locationTagText} numberOfLines={1}>{location}</Text>
              <TouchableOpacity
                onPress={() => setLocation(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color="#666" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.postButton, loading && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={loading}
        >
          <Text style={styles.postButtonText}>
            {loading ? 'Posting...' : 'Post'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  scroll: {
    padding: 20,
    paddingTop: 24,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  categoryBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    minHeight: 180,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 10,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  locationButtonText: {
    marginLeft: 8,
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: 14,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: '60%',
  },
  locationTagText: {
    fontSize: 14,
    color: '#333',
    marginRight: 6,
  },
  postButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
