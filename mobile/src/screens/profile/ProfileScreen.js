import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import api from '../../config/api';

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useContext(AuthContext);
  const { t, language, changeLanguage } = useContext(LanguageContext);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [hasShops, setHasShops] = useState(false);
  const [checkingShops, setCheckingShops] = useState(true);

  useEffect(() => {
    checkSellerStatus();
  }, []);

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

  const handleLogout = () => {
    Alert.alert(t('auth.logout'), t('auth.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  };

  const menuItems = [
    {
      title: t('profile.myOrders'),
      icon: 'receipt-outline',
      onPress: () => navigation.navigate('Orders'),
    },
    // Show "Order Received" only for sellers (users who have shops)
    ...(hasShops ? [{
      title: t('profile.orderReceived'),
      icon: 'bag-check-outline',
      onPress: () => navigation.navigate('OrderReceived'),
    }] : []),
    {
      title: t('profile.myPosts'),
      icon: 'document-text-outline',
      onPress: () => navigation.navigate('MyPosts'),
    },
    {
      title: t('profile.notifications'),
      icon: 'notifications-outline',
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      title: t('profile.myAddresses'),
      icon: 'location-outline',
      onPress: () => navigation.navigate('Addresses'),
    },
    {
      title: t('profile.sellerDashboard'),
      icon: 'storefront-outline',
      onPress: () => navigation.navigate('SellerDashboard'),
    },
    {
      title: t('profile.language'),
      icon: 'language-outline',
      onPress: () => setLanguageModalVisible(true),
    },
    {
      title: 'Terms and Conditions',
      icon: 'document-text-outline',
      onPress: () => navigation.navigate('Terms', { showAcceptButton: false }),
    },
    {
      title: 'Privacy Policy',
      icon: 'lock-closed-outline',
      onPress: () => navigation.navigate('Privacy', { showAcceptButton: false }),
    },
    {
      title: 'Cookie Policy',
      icon: 'restaurant-outline',
      onPress: () => navigation.navigate('CookiePolicy', { showAcceptButton: false }),
    },
    {
      title: t('auth.logout'),
      icon: 'log-out-outline',
      onPress: handleLogout,
      color: '#f44336',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || t('common.user')}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        {user?.religion && (
          <Text style={styles.userReligion}>{user.religion}</Text>
        )}
      </View>

      <View style={styles.menu}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <Ionicons
              name={item.icon}
              size={24}
              color={item.color || '#4CAF50'}
            />
            <Text
              style={[styles.menuText, item.color && { color: item.color }]}
            >
              {item.title}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('profile.selectLanguage')}</Text>
            <TouchableOpacity
              style={[styles.languageOption, language === 'en' && styles.languageOptionSelected]}
              onPress={() => {
                changeLanguage('en');
                setLanguageModalVisible(false);
              }}
            >
              <Text style={styles.languageText}>{t('profile.english')}</Text>
              {language === 'en' && <Ionicons name="checkmark" size={20} color="#4CAF50" />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.languageOption, language === 'hi' && styles.languageOptionSelected]}
              onPress={() => {
                changeLanguage('hi');
                setLanguageModalVisible(false);
              }}
            >
              <Text style={styles.languageText}>{t('profile.hindi')}</Text>
              {language === 'hi' && <Ionicons name="checkmark" size={20} color="#4CAF50" />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setLanguageModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>{t('common.close')}</Text>
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
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
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

