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
import { getLocationWithFallback, getLocationNameFromCoords } from '../../utils/location';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';

export default function CreatePostScreen({ navigation }) {
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null); // Android: base64 from picker (content:// URIs can't be read)
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    // On web, permissions are handled by the browser file input
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }
    }

    // On Android/Web: get base64 from picker (content:// / blob: URIs need base64 for upload)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: Platform.OS === 'android' || Platform.OS === 'web',
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setImage(asset.uri);
      const useBase64 = (Platform.OS === 'android' || Platform.OS === 'web') && asset.base64;
      setImageBase64(useBase64 ? asset.base64 : null);
    }
  };

  const getLocation = async () => {
    setLocationLoading(true);
    try {
      if (Platform.OS !== 'web') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant location permissions');
          setLocationLoading(false);
          return;
        }
      }

      const locationData = await getLocationWithFallback({});
      const { latitude, longitude } = locationData.coords;

      const cityName = await getLocationNameFromCoords(latitude, longitude);
      setLocation(
        cityName || `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
      );
    } catch (error) {
      console.error('Location error:', error);
      const msg = error?.message === 'LOCATION_SERVICES_DISABLED'
        ? 'Please allow location access in your browser or device settings.'
        : 'Failed to get location. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLocationLoading(false);
    }
  };

  const handlePost = async () => {
    if (!image) {
      Alert.alert('Photo required', 'Please add a photo to your post.');
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

          // Android/Web: use base64 from picker (content:// / blob: URIs don't work with FormData)
          // iOS: try FormData first, fallback to FileSystem.readAsStringAsync base64
          let uploadSuccess = false;
          let base64Data = imageBase64;

          if ((Platform.OS === 'android' || Platform.OS === 'web') && base64Data) {
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

      // Step 2: Create post with image URL (caption optional)
      const postData = {
        content: (content && content.trim()) || '',
        location: location || null,
        imageUrl,
      };

      console.log('Creating post with data:', { ...postData, imageUrl: imageUrl ? 'URL set' : 'No image' });
      const res = await api.post('/community/posts', postData);
      const created = res?.data?.post;

      // Navigate back with new post so feed can prepend without refetch
      if (created) {
        const newPost = {
          ...created,
          likesCount: 0,
          commentsCount: 0,
          isLiked: false,
          isOwnPost: true,
        };
        navigation.navigate('CommunityFeed', { newPost });
      } else {
        navigation.goBack();
      }
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
          placeholder="Write a caption (optional)..."
          placeholderTextColor="#666"
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          editable={!loading}
        />

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={pickImage} disabled={loading}>
            <Ionicons name="image" size={24} color="#4CAF50" />
            <Text style={styles.actionText}>{image ? 'Change Photo' : 'Add Photo'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={getLocation}
            disabled={loading || locationLoading}
          >
            <Ionicons name="location" size={24} color="#4CAF50" />
            <Text style={styles.actionText}>
              {locationLoading ? 'Getting location...' : location ? 'Change Location' : 'Add Location'}
            </Text>
          </TouchableOpacity>
        </View>

        {location ? (
          <View style={styles.locationTag}>
            <Ionicons name="location" size={18} color="#4CAF50" />
            <Text style={styles.locationTagText} numberOfLines={1}>{location}</Text>
            <TouchableOpacity
              onPress={() => setLocation(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.locationTagRemove}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        ) : null}

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
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#e8f5e9',
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 12,
    marginBottom: 20,
    maxWidth: '100%',
  },
  locationTagText: {
    marginLeft: 8,
    marginRight: 6,
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '500',
    flex: 1,
  },
  locationTagRemove: {
    padding: 4,
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

