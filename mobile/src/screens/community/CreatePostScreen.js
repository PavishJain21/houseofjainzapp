import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { getLocationWithFallback } from '../../utils/location';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';

export default function CreatePostScreen({ navigation }) {
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null); // Android: base64 from picker (content:// URIs can't be read)
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    // On Android, get base64 from picker - content:// URIs fail with FormData & FileSystem.readAsStringAsync
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: Platform.OS === 'android',
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setImage(asset.uri);
      setImageBase64(Platform.OS === 'android' && asset.base64 ? asset.base64 : null);
    }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant location permissions');
        return;
      }

      const locationData = await getLocationWithFallback({});
      const { latitude, longitude } = locationData.coords;
      
      // Reverse geocode to get city name
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        // Try to get city, if not available use district or subregion
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
    if (!image) {
      Alert.alert('Photo required', 'Please add a photo to your post.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Caption required', 'Please add a caption for your post.');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = null;

      // Step 1: Upload image to Supabase Storage (required)
      {
        try {
          console.log('Starting image upload, image URI:', image);
          
          // Determine file extension
          let fileExtension = 'jpg';
          const uriParts = image.split('.');
          if (uriParts.length > 1) {
            const lastPart = uriParts[uriParts.length - 1].toLowerCase();
            const ext = lastPart.split('?')[0].split('/')[0];
            if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
              fileExtension = ext === 'jpeg' ? 'jpg' : ext;
            }
          }

          let mimeType = 'image/jpeg';
          if (fileExtension === 'png') mimeType = 'image/png';
          if (fileExtension === 'gif') mimeType = 'image/gif';

          console.log('File extension:', fileExtension, 'MIME type:', mimeType);

          // Android: content:// URIs fail with FormData & FileSystem - use base64 from picker
          // iOS: try FormData first, fallback to FileSystem.readAsStringAsync base64
          let uploadSuccess = false;
          let base64Data = imageBase64; // Android: from picker

          if (Platform.OS === 'android' && base64Data) {
            try {
              console.log('Android - Using base64 from picker (avoids content:// URI issues)');
              const uploadResponse = await api.post('/community/upload-image', {
                imageBase64: base64Data,
                mimeType: mimeType,
                fileName: `photo.${fileExtension}`,
              }, {
                headers: { 'Content-Type': 'application/json' },
              });
              if (uploadResponse.data?.imageUrl) {
                imageUrl = uploadResponse.data.imageUrl;
                uploadSuccess = true;
              } else throw new Error('No image URL returned');
            } catch (androidError) {
              console.error('Android base64 upload failed:', androidError);
              Alert.alert(
                'Image Upload Failed',
                androidError.response?.data?.error || androidError.message || 'Failed to upload image. Please try again.',
                [{ text: 'OK' }]
              );
              setLoading(false);
              return;
            }
          } else {
            // iOS or Android without base64: try FormData first
            try {
              console.log('Using FormData to upload image');
              const imageFormData = new FormData();
              imageFormData.append('image', {
                uri: image,
                type: mimeType,
                name: `photo.${fileExtension}`,
              });
              const uploadResponse = await api.post('/community/upload-image', imageFormData);
              if (uploadResponse.data?.imageUrl) {
                imageUrl = uploadResponse.data.imageUrl;
                uploadSuccess = true;
              } else throw new Error('No image URL returned');
            } catch (formDataError) {
              console.error('FormData failed, trying base64 fallback:', formDataError);
              try {
                base64Data = await FileSystem.readAsStringAsync(image, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                const uploadResponse = await api.post('/community/upload-image', {
                  imageBase64: base64Data,
                  mimeType: mimeType,
                  fileName: `photo.${fileExtension}`,
                }, { headers: { 'Content-Type': 'application/json' } });
                if (uploadResponse.data?.imageUrl) {
                  imageUrl = uploadResponse.data.imageUrl;
                  uploadSuccess = true;
                } else throw new Error('No image URL returned');
              } catch (base64Error) {
                console.error('Base64 fallback failed:', base64Error);
                Alert.alert(
                  'Image Upload Failed',
                  base64Error.response?.data?.error || formDataError.response?.data?.error || 'Failed to upload image. Please try again.',
                  [{ text: 'OK' }]
                );
                setLoading(false);
                return;
              }
            }
          }
          
          if (!uploadSuccess) {
            Alert.alert(
              'Image Upload Failed',
              'Failed to upload image. Please try again.',
              [{ text: 'OK' }]
            );
            setLoading(false);
            return;
          }
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          Alert.alert(
            'Image Upload Failed',
            uploadError.response?.data?.error || uploadError.message || 'Failed to upload image. Please try again.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
        }
      }

      // Step 2: Create post with image URL and caption
      const postData = {
        content: content.trim(),
        location: location || null,
        imageUrl,
      };

      console.log('Creating post with data:', { ...postData, imageUrl: imageUrl ? 'URL set' : 'No image' });
      await api.post('/community/posts', postData);

      // Navigate back immediately after successful post
      navigation.goBack();
    } catch (error) {
      console.error('Post creation error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Photo (required) - show first */}
        <TouchableOpacity style={styles.imageBox} onPress={pickImage} disabled={loading}>
          {image ? (
            <Image source={{ uri: image }} style={styles.imagePreview} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={48} color="#4CAF50" />
              <Text style={styles.imagePlaceholderText}>Add photo (required)</Text>
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Write a caption..."
          placeholderTextColor="#666"
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          editable={!loading}
        />

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
            <Ionicons name="image" size={24} color="#4CAF50" />
            <Text style={styles.actionText}>{image ? 'Change Photo' : 'Add Photo'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={getLocation}>
            <Ionicons name="location" size={24} color="#4CAF50" />
            <Text style={styles.actionText}>
              {location ? 'Location Added' : 'Add Location'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.postButton, loading && styles.buttonDisabled]}
          onPress={handlePost}
          disabled={loading}
        >
          <Text style={styles.postButtonText}>
            {loading ? 'Posting...' : 'Post'}
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
    padding: 20,
    paddingTop: 60,
  },
  imageBox: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e8e8e8',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 180,
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 15,
    color: '#4CAF50',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 25,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 120,
    justifyContent: 'center',
  },
  actionText: {
    marginLeft: 8,
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 15,
  },
  postButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

