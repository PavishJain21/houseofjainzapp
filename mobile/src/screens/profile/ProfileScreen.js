import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import useFeatures from '../../context/FeatureContext';
import api from '../../config/api';
import AppBanner from '../../components/AppBanner';
import { confirmAsync } from '../../utils/alert';

export default function ProfileScreen({ navigation }) {
  const { user, signOut, refreshUser } = useContext(AuthContext);
  const { t, language, changeLanguage } = useContext(LanguageContext);
  const { theme, themePreference, setThemeMode } = useTheme();
  const { isEnabled } = useFeatures();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [hasShops, setHasShops] = useState(false);
  const [checkingShops, setCheckingShops] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (isEnabled('seller')) checkSellerStatus();
    else setCheckingShops(false);
  }, [isEnabled('seller')]);

  const checkSellerStatus = async () => {
    setCheckingShops(true);
    try {
      const response = await api.get('/seller/shops');
      setHasShops((response.data.shops || []).length > 0);
    } catch (error) {
      setHasShops(false);
    } finally {
      setCheckingShops(false);
    }
  };

  const removeProfilePicture = async () => {
    try {
      await api.delete('/auth/profile-picture');
      if (refreshUser) await refreshUser();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to remove profile picture.');
    }
  };

  const pickAndUploadProfilePicture = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please allow access to your photos to set a profile picture.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const base64 = asset.base64;
      if (!base64) {
        Alert.alert('Error', 'Could not read image. Try another photo.');
        return;
      }
      setUploadingAvatar(true);
      await api.post('/auth/profile-picture', {
        imageBase64: base64,
        mimeType: asset.mimeType || 'image/jpeg',
      });
      if (refreshUser) await refreshUser();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to upload profile picture.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = () => {
    confirmAsync(
      t('auth.logout'),
      t('auth.logoutConfirm'),
      signOut,
      t('auth.logout'),
      t('common.cancel')
    );
  };

  const menuItems = [
    ...(isEnabled('orders') ? [{
      title: t('profile.myOrders'),
      icon: 'receipt-outline',
      onPress: () => navigation.navigate('Orders'),
    }] : []),
    ...(isEnabled('seller') && hasShops ? [{
      title: t('profile.orderReceived'),
      icon: 'bag-check-outline',
      onPress: () => navigation.navigate('OrderReceived'),
    }] : []),
    ...(isEnabled('community') ? [{
      title: t('profile.myPosts'),
      icon: 'document-text-outline',
      onPress: () => navigation.navigate('MyPosts'),
    }] : []),
    ...(isEnabled('notifications') ? [{
      title: t('profile.notifications'),
      icon: 'notifications-outline',
      onPress: () => navigation.navigate('Notifications'),
    }] : []),
    ...(isEnabled('addresses') ? [{
      title: t('profile.myAddresses'),
      icon: 'location-outline',
      onPress: () => navigation.navigate('Addresses'),
    }] : []),
    ...(isEnabled('seller') ? [{
      title: t('profile.sellerDashboard'),
      icon: 'storefront-outline',
      onPress: () => navigation.navigate('SellerDashboard'),
    }] : []),
    // Appearance hidden for now
    // { title: t('profile.appearance'), icon: 'moon-outline', onPress: () => setThemeModalVisible(true) },
    {
      title: t('profile.language'),
      icon: 'language-outline',
      onPress: () => setLanguageModalVisible(true),
    },
    {
      title: 'Jain Festivals',
      icon: 'calendar-outline',
      onPress: () => navigation.navigate('JainFestivals'),
    },
    ...(isEnabled('consent') ? [
      { title: 'Terms and Conditions', icon: 'document-text-outline', onPress: () => navigation.navigate('Terms', { showAcceptButton: false }) },
      { title: 'Privacy Policy', icon: 'lock-closed-outline', onPress: () => navigation.navigate('Privacy', { showAcceptButton: false }) },
      { title: 'Cookie Policy', icon: 'restaurant-outline', onPress: () => navigation.navigate('CookiePolicy', { showAcceptButton: false }) },
      { title: 'Child Safety', icon: 'shield-checkmark-outline', onPress: () => navigation.navigate('ChildSafety') },
    ] : []),
    {
      title: t('auth.logout'),
      icon: 'log-out-outline',
      onPress: handleLogout,
      color: '#f44336',
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppBanner
        title="House of Jainz"
        subtitle="Your profile, orders, and preferences in one place."
        icon="person-circle"
        variant="primary"
      />
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={uploadingAvatar ? undefined : pickAndUploadProfilePicture}
          activeOpacity={0.8}
          style={styles.avatarTouch}
        >
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            )}
            {uploadingAvatar ? (
              <View style={[styles.avatarOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            ) : null}
          </View>
          {!uploadingAvatar ? (
            <View style={[styles.avatarBadge, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          ) : null}
        </TouchableOpacity>
        <Text style={[styles.userName, { color: theme.colors.text }]}>{user?.name || t('common.user')}</Text>
        <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>{user?.email}</Text>
        {user?.religion && (
          <Text style={[styles.userReligion, { color: theme.colors.primary }]}>{user.religion}</Text>
        )}
        {user?.avatar_url && (
          <TouchableOpacity
            onPress={() => confirmAsync('Remove photo', 'Remove your profile picture?', removeProfilePicture, 'Remove', 'Cancel')}
            style={styles.removePhotoTouch}
          >
            <Text style={[styles.removePhotoText, { color: theme.colors.textMuted }]}>Remove photo</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.menu, { backgroundColor: theme.colors.surface }]}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.menuItem, { borderBottomColor: theme.colors.borderLight }]}
            onPress={item.onPress}
          >
            <Ionicons
              name={item.icon}
              size={24}
              color={item.color || theme.colors.primary}
            />
            <Text
              style={[styles.menuText, { color: theme.colors.text }, item.color && { color: item.color }]}
            >
              {item.title}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Theme / Appearance Modal */}
      <Modal
        visible={themeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t('profile.appearance')}</Text>
            <TouchableOpacity
              style={[styles.languageOption, themePreference === 'light' && styles.languageOptionSelected, { borderColor: theme.colors.border }]}
              onPress={() => { setThemeMode('light'); setThemeModalVisible(false); }}
            >
              <Text style={[styles.languageText, { color: theme.colors.text }]}>{t('profile.themeLight')}</Text>
              {themePreference === 'light' && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.languageOption, themePreference === 'dark' && styles.languageOptionSelected, { borderColor: theme.colors.border }]}
              onPress={() => { setThemeMode('dark'); setThemeModalVisible(false); }}
            >
              <Text style={[styles.languageText, { color: theme.colors.text }]}>{t('profile.themeDark')}</Text>
              {themePreference === 'dark' && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.languageOption, themePreference === null && styles.languageOptionSelected, { borderColor: theme.colors.border }]}
              onPress={() => { setThemeMode(null); setThemeModalVisible(false); }}
            >
              <Text style={[styles.languageText, { color: theme.colors.text }]}>{t('profile.themeSystem')}</Text>
              {themePreference === null && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: theme.colors.borderLight }]}
              onPress={() => setThemeModalVisible(false)}
            >
              <Text style={[styles.modalCloseText, { color: theme.colors.text }]}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t('profile.selectLanguage')}</Text>
            <TouchableOpacity
              style={[styles.languageOption, language === 'en' && styles.languageOptionSelected, { borderColor: language === 'en' ? theme.colors.primary : theme.colors.border }]}
              onPress={() => {
                changeLanguage('en');
                setLanguageModalVisible(false);
              }}
            >
              <Text style={[styles.languageText, { color: theme.colors.text }]}>{t('profile.english')}</Text>
              {language === 'en' && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.languageOption, language === 'hi' && styles.languageOptionSelected, { borderColor: language === 'hi' ? theme.colors.primary : theme.colors.border }]}
              onPress={() => {
                changeLanguage('hi');
                setLanguageModalVisible(false);
              }}
            >
              <Text style={[styles.languageText, { color: theme.colors.text }]}>{t('profile.hindi')}</Text>
              {language === 'hi' && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: theme.colors.borderLight }]}
              onPress={() => setLanguageModalVisible(false)}
            >
              <Text style={[styles.modalCloseText, { color: theme.colors.text }]}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarTouch: {
    marginBottom: 15,
    alignSelf: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  userReligion: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  removePhotoTouch: {
    marginTop: 10,
    paddingVertical: 4,
  },
  removePhotoText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  menu: {
    backgroundColor: '#fff',
    marginTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    marginBottom: 10,
  },
  languageOptionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#f1f8f4',
  },
  languageText: {
    fontSize: 16,
    color: '#333',
  },
  modalCloseButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});

