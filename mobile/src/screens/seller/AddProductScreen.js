import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';

export default function AddProductScreen({ route, navigation }) {
  const { shopId, shopName, productId, product } = route.params || {};
  const isEditMode = !!productId;
  
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price?.toString() || '');
  const [category, setCategory] = useState(product?.category || '');
  const [stock, setStock] = useState(product?.stock?.toString() || '');
  const [image, setImage] = useState(product?.image_url || null);
  const [imageBase64, setImageBase64] = useState(null); // Android: base64 from picker (content:// URIs can't be read)
  const [loading, setLoading] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);
  const [deleting, setDeleting] = useState(false);
  

  const pickImageFromGallery = async () => {
    if (pickingImage) return; // Prevent multiple calls
    
    setPickingImage(true);
    try {
      // Request permission first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Please grant camera roll permissions to select images',
          [{ text: 'OK' }]
        );
        setPickingImage(false);
        return;
      }

      // Small delay to ensure UI is responsive
      await new Promise(resolve => setTimeout(resolve, 100));

      // On Android, get base64 from picker - content:// URIs fail with FormData & FileSystem
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        base64: Platform.OS === 'android',
      });

      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        if (selectedImage.uri) {
          setImage(selectedImage.uri);
          setImageBase64(Platform.OS === 'android' && selectedImage.base64 ? selectedImage.base64 : null);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert(
        'Error',
        'Failed to open image picker. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setPickingImage(false);
    }
  };

  const pickImageFromCamera = async () => {
    try {
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus.status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: Platform.OS === 'android',
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImage(asset.uri);
        setImageBase64(Platform.OS === 'android' && asset.base64 ? asset.base64 : null);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        {
          text: 'Gallery',
          onPress: pickImageFromGallery,
        },
        {
          text: 'Camera',
          onPress: pickImageFromCamera,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const removeImage = () => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setImage(null);
            setImageBase64(null);
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    console.log('handleSave called');
    console.log('Form data:', { shopId, name, price, stock, hasImage: !!image });
    
    if (!shopId) {
      Alert.alert('Error', 'Shop ID is required');
      return;
    }
    if (!name || !price || !stock) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate stock is a positive integer
    const stockNum = parseInt(stock);
    if (isNaN(stockNum) || stockNum < 0 || stockNum.toString() !== stock.trim()) {
      Alert.alert('Error', 'Stock must be a positive integer (whole number)');
      return;
    }

    console.log('Starting product creation process...');
    setLoading(true);
    try {
      let imageUrl = null;

      // Step 1: Upload image (or use existing URL when editing)
      if (image && image.trim() !== '') {
        if (image.startsWith('http://') || image.startsWith('https://')) {
          imageUrl = image; // Edit mode: existing image URL
        } else {
        try {
          console.log('Starting image upload, image URI:', image);
          
          // Determine file extension from URI - handle different URI formats
          // React Native image URIs might not have extensions, default to jpg
          let fileExtension = 'jpg'; // default
          const uriParts = image.split('.');
          if (uriParts.length > 1) {
            const lastPart = uriParts[uriParts.length - 1].toLowerCase();
            // Remove query parameters if any
            const ext = lastPart.split('?')[0].split('/')[0];
            if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
              fileExtension = ext === 'jpeg' ? 'jpg' : ext;
            }
          }
          
          console.log('Detected file extension:', fileExtension);
          console.log('Image URI:', image);

          // Determine MIME type
          let mimeType = 'image/jpeg';
          if (fileExtension === 'png') mimeType = 'image/png';
          if (fileExtension === 'gif') mimeType = 'image/gif';

          // Android: content:// URIs fail with FormData & FileSystem - use base64 from picker
          // iOS: try FormData first, fallback to FileSystem base64
          let uploadSuccess = false;
          let base64Data = imageBase64;

          if (Platform.OS === 'android' && base64Data) {
            try {
              console.log('Android - Using base64 from picker (avoids content:// URI issues)');
              const uploadResponse = await api.post('/seller/upload-image', {
                imageBase64: base64Data,
                mimeType: mimeType,
                fileName: `product.${fileExtension}`,
              }, { headers: { 'Content-Type': 'application/json' } });
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
            try {
              console.log('Using FormData to upload image');
              const imageFormData = new FormData();
              imageFormData.append('image', {
                uri: image,
                type: mimeType,
                name: `product.${fileExtension}`,
              });
              const uploadResponse = await api.post('/seller/upload-image', imageFormData);
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
                const uploadResponse = await api.post('/seller/upload-image', {
                  imageBase64: base64Data,
                  mimeType: mimeType,
                  fileName: `product.${fileExtension}`,
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
          console.error('Upload error response:', uploadError.response?.data);
          Alert.alert(
            'Image Upload Failed',
            uploadError.response?.data?.error || uploadError.message || 'Failed to upload image. Please try again.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
        }
        }
      }

      // Step 2: Create product with image URL reference
      const productData = {
        shopId,
        name,
        description: description || null,
        price,
        category: category || null,
        stock: stockNum, // Use validated integer
        imageUrl: imageUrl, // Use the uploaded image URL
      };

      if (isEditMode) {
        // Update existing product
        console.log('Updating product with data:', { ...productData, imageUrl: imageUrl ? 'URL set' : 'No image' });
        const productResponse = await api.put(`/seller/products/${productId}`, productData);
        console.log('Product updated successfully:', productResponse.data);
        
        Alert.alert('Success', 'Product updated successfully!', [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('ShopDetails', { shopId, shopName });
            },
          },
        ]);
      } else {
        // Create new product
        console.log('Creating product with data:', { ...productData, imageUrl: imageUrl ? 'URL set' : 'No image' });
        const productResponse = await api.post('/seller/products', productData);
        console.log('Product created successfully:', productResponse.data);

        // Navigate to ShopDetailsScreen to show the product listing
        navigation.navigate('ShopDetails', { shopId, shopName });
      }
    } catch (error) {
      console.error('Add product error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Failed to add product';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Network error
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      // Check if it's a product limit error
      if (error.response?.data?.limitReached) {
        const limitData = error.response.data;
        Alert.alert(
          'Product Limit Reached',
          errorMessage,
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('image') || errorMessage.includes('Image')) {
        // Check if it's an image validation error
        Alert.alert(
          'Image Error',
          errorMessage,
          [
            {
              text: 'OK',
              onPress: () => setImage(null), // Clear invalid image
            },
          ]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = () => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${name || 'this product'}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.delete(`/seller/products/${productId}`);
              Alert.alert('Success', 'Product deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => {
                    if (shopId) {
                      navigation.navigate('ShopDetails', { shopId, shopName });
                    } else {
                      navigation.goBack();
                    }
                  },
                },
              ]);
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert(
                'Error',
                error.response?.data?.error || 'Failed to delete product'
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {shopName && (
          <View style={styles.shopInfoContainer}>
            <Ionicons name="storefront" size={20} color="#4CAF50" />
            <Text style={styles.shopInfoText}>Adding product to: {shopName}</Text>
          </View>
        )}

        <View style={styles.imageSection}>
          {image ? (
            <View style={styles.imagePreviewContainer}>
              <Image 
                source={{ uri: image }} 
                style={styles.imagePreview}
                pointerEvents="none"
              />
              <View style={styles.imageOverlay}>
                <TouchableOpacity
                  style={styles.imageActionButton}
                  onPress={showImageOptions}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={20} color="#fff" />
                  <Text style={styles.imageActionText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.imageActionButton, styles.removeButton]}
                  onPress={removeImage}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.imageActionText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.imagePlaceholder, pickingImage && styles.imagePlaceholderDisabled]}
              onPress={pickImageFromGallery}
              activeOpacity={0.7}
              disabled={pickingImage}
            >
              <Ionicons name="image-outline" size={50} color="#4CAF50" />
              <Text style={styles.imagePlaceholderText}>
                {pickingImage ? 'Opening...' : 'Add Product Image'}
              </Text>
              {!pickingImage && (
                <>
                  <Text style={styles.imagePlaceholderSubtext}>
                    Tap to select from gallery
                  </Text>
                  <Text style={styles.imageFormatText}>
                    Supported: JPG, PNG, GIF
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Product Name *"
          placeholderTextColor="#666"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description"
          placeholderTextColor="#666"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Price (₹) *"
            placeholderTextColor="#666"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />

          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Stock *"
            placeholderTextColor="#666"
            value={stock}
            onChangeText={setStock}
            keyboardType="number-pad"
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Category (Optional)"
          placeholderTextColor="#666"
          value={category}
          onChangeText={setCategory}
        />

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.buttonDisabled]}
          onPress={() => {
            console.log('Add Product button pressed');
            handleSave();
          }}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.saveButtonText}>
            {loading ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Product' : 'Add Product')}
          </Text>
        </TouchableOpacity>

        {shopName && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => navigation.navigate('SellerDashboard')}
          >
            <Text style={styles.skipButtonText}>Skip - Go to Dashboard</Text>
          </TouchableOpacity>
        )}
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
  imageSection: {
    marginBottom: 15,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 250,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 10,
    justifyContent: 'space-around',
    zIndex: 10,
    elevation: 5, // For Android shadow
  },
  imageActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    justifyContent: 'center',
  },
  removeButton: {
    backgroundColor: '#f44336',
  },
  imageActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  imagePlaceholder: {
    width: '100%',
    height: 250,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  imagePlaceholderDisabled: {
    opacity: 0.6,
  },
  imagePlaceholderText: {
    marginTop: 15,
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePlaceholderSubtext: {
    marginTop: 5,
    color: '#666',
    fontSize: 12,
  },
  imageFormatText: {
    marginTop: 8,
    color: '#999',
    fontSize: 11,
    fontStyle: 'italic',
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
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
  shopInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  shopInfoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '500',
  },
  skipButton: {
    marginTop: 10,
    padding: 15,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

