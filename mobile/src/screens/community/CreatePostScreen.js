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
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';

export default function CreatePostScreen({ navigation }) {
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant location permissions');
        return;
      }

      const locationData = await Location.getCurrentPositionAsync({});
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
      Alert.alert('Error', 'Failed to get location. Please try again.');
    }
  };

  const handlePost = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = null;

      // Step 1: Upload image to Supabase Storage first (if image exists)
      if (image) {
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

          // Use FormData as primary method, base64 as fallback
          let uploadSuccess = false;
          
          // Try FormData first
          try {
            console.log('Using FormData to upload image');
            console.log('Platform:', Platform.OS);
            console.log('Image URI:', image);
            console.log('MIME type:', mimeType);
            console.log('File extension:', fileExtension);
            
            const imageFormData = new FormData();
            imageFormData.append('image', {
              uri: image,
              type: mimeType,
              name: `photo.${fileExtension}`,
            });
            
            const uploadResponse = await api.post('/community/upload-image', imageFormData);
            console.log('Image upload response:', uploadResponse.data);
            
            if (uploadResponse.data && uploadResponse.data.imageUrl) {
              imageUrl = uploadResponse.data.imageUrl;
              console.log('Image uploaded successfully via FormData, URL:', imageUrl);
              uploadSuccess = true;
            } else {
              throw new Error('No image URL returned from upload');
            }
          } catch (formDataError) {
            console.error('FormData upload failed, trying base64 fallback:', formDataError);
            // Fallback: try base64 approach
            try {
              console.log('Trying base64 fallback...');
              let base64Data = '';
              
              if (Platform.OS === 'ios') {
                console.log('iOS - Reading file as base64...');
                base64Data = await FileSystem.readAsStringAsync(image, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                console.log('iOS - File read successfully, base64 length:', base64Data.length);
              } else {
                // Android - read as base64
                console.log('Android - Reading file as base64...');
                base64Data = await FileSystem.readAsStringAsync(image, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                console.log('Android - File read successfully, base64 length:', base64Data.length);
              }

              // Upload image using base64
              console.log('Uploading image as base64 to /community/upload-image');
              const uploadResponse = await api.post('/community/upload-image', {
                imageBase64: base64Data,
                mimeType: mimeType,
                fileName: `photo.${fileExtension}`,
              }, {
                headers: {
                  'Content-Type': 'application/json',
                },
              });
              console.log('Image upload response:', uploadResponse.data);
              
              if (uploadResponse.data && uploadResponse.data.imageUrl) {
                imageUrl = uploadResponse.data.imageUrl;
                console.log('Image uploaded successfully via base64, URL:', imageUrl);
                uploadSuccess = true;
              } else {
                throw new Error('No image URL returned from upload');
              }
            } catch (base64Error) {
              console.error('Base64 upload also failed:', base64Error);
              Alert.alert(
                'Image Upload Failed',
                base64Error.response?.data?.error || formDataError.response?.data?.error || formDataError.message || 'Failed to upload image. Please try again.',
                [{ text: 'OK' }]
              );
              setLoading(false);
              return;
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

      // Step 2: Create post with image URL reference
      const postData = {
        content,
        location: location || null,
        imageUrl: imageUrl,
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
        <TextInput
          style={styles.input}
          placeholder="What's on your mind?"
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        {image && (
          <Image source={{ uri: image }} style={styles.imagePreview} />
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
            <Ionicons name="image" size={24} color="#4CAF50" />
            <Text style={styles.actionText}>Add Image</Text>
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
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    minHeight: 180,
    marginBottom: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  imagePreview: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    marginBottom: 20,
    resizeMode: 'cover',
    backgroundColor: '#f0f0f0',
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

