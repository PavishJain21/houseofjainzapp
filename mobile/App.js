import React, { useState, useEffect, useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/auth/ResetPasswordScreen';
import CommunityScreen from './src/screens/community/CommunityScreen';
import MarketplaceScreen from './src/screens/marketplace/MarketplaceScreen';
import CartScreen from './src/screens/cart/CartScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import CreatePostScreen from './src/screens/community/CreatePostScreen';
import ShopScreen from './src/screens/marketplace/ShopScreen';
import ProductScreen from './src/screens/marketplace/ProductScreen';
import CheckoutScreen from './src/screens/cart/CheckoutScreen';
import OrdersScreen from './src/screens/orders/OrdersScreen';
import SellerDashboardScreen from './src/screens/seller/SellerDashboardScreen';
import AddProductScreen from './src/screens/seller/AddProductScreen';
import CreateShopScreen from './src/screens/seller/CreateShopScreen';
import ShopDetailsScreen from './src/screens/seller/ShopDetailsScreen';
import SellerOrdersScreen from './src/screens/seller/SellerOrdersScreen';
import SellerEarningsScreen from './src/screens/seller/SellerEarningsScreen';
import PayoutHistoryScreen from './src/screens/seller/PayoutHistoryScreen';
import AddressScreen from './src/screens/address/AddressScreen';
import AddAddressScreen from './src/screens/address/AddAddressScreen';
import NotificationsScreen from './src/screens/notifications/NotificationsScreen';
import MyPostsScreen from './src/screens/profile/MyPostsScreen';
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import AdminUsersScreen from './src/screens/admin/AdminUsersScreen';
import AdminShopsScreen from './src/screens/admin/AdminShopsScreen';
import AdminProductsScreen from './src/screens/admin/AdminProductsScreen';
import AdminPostsScreen from './src/screens/admin/AdminPostsScreen';
import AdminOrdersScreen from './src/screens/admin/AdminOrdersScreen';

import { AuthContext } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { ConsentProvider, ConsentContext } from './src/context/ConsentContext';
import { API_BASE_URL } from './src/config/api';
import api from './src/config/api';

// Consent Screens
import OnboardingConsentScreen from './src/screens/consent/OnboardingConsentScreen';
import TermsScreen from './src/screens/consent/TermsScreen';
import PrivacyScreen from './src/screens/consent/PrivacyScreen';
import CookiePolicyScreen from './src/screens/consent/CookiePolicyScreen';
import CookieConsent from './src/components/CookieConsent';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function CommunityStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="CommunityFeed" 
        component={CommunityScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CreatePost" 
        component={CreatePostScreen}
        options={{ title: 'Create Post' }}
      />
    </Stack.Navigator>
  );
}

function MarketplaceStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Marketplace" 
        component={MarketplaceScreen}
        options={{ title: 'Marketplace' }}
      />
      <Stack.Screen 
        name="Shop" 
        component={ShopScreen}
        options={{ title: 'Shop' }}
      />
      <Stack.Screen 
        name="Product" 
        component={ProductScreen}
        options={{ title: 'Product Details' }}
      />
    </Stack.Navigator>
  );
}

function CartStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Cart" 
        component={CartScreen}
        options={{ title: 'Shopping Cart' }}
      />
      <Stack.Screen 
        name="Checkout" 
        component={CheckoutScreen}
        options={{ title: 'Checkout' }}
      />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen 
        name="Orders" 
        component={OrdersScreen}
        options={{ 
          title: 'My Orders',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen 
        name="SellerDashboard" 
        component={SellerDashboardScreen}
        options={{ title: 'Seller Dashboard' }}
      />
      <Stack.Screen 
        name="AddProduct" 
        component={AddProductScreen}
        options={({ route }) => ({ 
          title: route.params?.productId ? 'Edit Product' : 'Add Product' 
        })}
      />
      <Stack.Screen 
        name="CreateShop" 
        component={CreateShopScreen}
        options={{ title: 'Create Shop' }}
      />
      <Stack.Screen 
        name="ShopDetails" 
        component={ShopDetailsScreen}
        options={{ title: 'Shop Details' }}
      />
      <Stack.Screen 
        name="OrderReceived" 
        component={SellerOrdersScreen}
        options={{ title: 'Order Received' }}
      />
      <Stack.Screen 
        name="SellerEarnings" 
        component={SellerEarningsScreen}
        options={{ title: 'My Earnings' }}
      />
      <Stack.Screen 
        name="PayoutHistory" 
        component={PayoutHistoryScreen}
        options={{ title: 'Payout History' }}
      />
      <Stack.Screen 
        name="Addresses" 
        component={AddressScreen}
        options={{ title: 'My Addresses' }}
      />
      <Stack.Screen 
        name="AddAddress" 
        component={AddAddressScreen}
        options={{ title: 'Add Address' }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen 
        name="MyPosts" 
        component={MyPostsScreen}
        options={{ title: 'My Posts' }}
      />
      <Stack.Screen 
        name="Terms" 
        component={TermsScreen}
        options={{ title: 'Terms and Conditions' }}
      />
      <Stack.Screen 
        name="Privacy" 
        component={PrivacyScreen}
        options={{ title: 'Privacy Policy' }}
      />
      <Stack.Screen 
        name="CookiePolicy" 
        component={CookiePolicyScreen}
        options={{ title: 'Cookie Policy' }}
      />
    </Stack.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="AdminDashboard" 
        component={AdminDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AdminUsers" 
        component={AdminUsersScreen}
        options={{ title: 'Manage Users' }}
      />
      <Stack.Screen 
        name="AdminShops" 
        component={AdminShopsScreen}
        options={{ title: 'Manage Shops' }}
      />
      <Stack.Screen 
        name="AdminProducts" 
        component={AdminProductsScreen}
        options={({ route }) => ({ 
          title: route.params?.shopName ? `Products - ${route.params.shopName}` : 'Manage Products' 
        })}
      />
      <Stack.Screen 
        name="AdminPosts" 
        component={AdminPostsScreen}
        options={{ title: 'Manage Posts' }}
      />
      <Stack.Screen 
        name="AdminOrders" 
        component={AdminOrdersScreen}
        options={{ title: 'Manage Orders' }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'CommunityTab') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'MarketplaceTab') {
            iconName = focused ? 'storefront' : 'storefront-outline';
          } else if (route.name === 'CartTab') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="CommunityTab" component={CommunityStack} options={{ title: 'Community' }} />
      <Tab.Screen name="MarketplaceTab" component={MarketplaceStack} options={{ title: 'Marketplace' }} />
      <Tab.Screen 
        name="CartTab" 
        component={CartStack} 
        options={({ route }) => ({
          title: 'Cart',
          tabBarBadge: route.params?.cartCount > 0 ? route.params.cartCount : undefined,
        })}
      />
      <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (token && userData) {
        setUserToken(token);
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Refresh user data from API to get latest role
        try {
          const response = await api.get('/auth/me');
          if (response.data.user) {
            const updatedUser = {
              ...parsedUser,
              role: response.data.user.role || parsedUser.role || 'user'
            };
            setUser(updatedUser);
            await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
            console.log('User role updated:', updatedUser.role);
          }
        } catch (error) {
          console.log('Could not refresh user data, using cached:', error.message);
        }
      }
    } catch (error) {
      console.error('Error checking token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const authContext = {
    signIn: async (token, userData) => {
      try {
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        setUserToken(token);
        setUser(userData);
      } catch (error) {
        console.error('Error signing in:', error);
      }
    },
    signOut: async () => {
      try {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
        setUserToken(null);
        setUser(null);
      } catch (error) {
        console.error('Error signing out:', error);
      }
    },
    user,
    token: userToken,
  };

  if (isLoading) {
    return null; // You can add a loading screen here
  }

  // Check if user is superadmin or admin
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  
  // Debug logging
  if (user) {
    console.log('=== USER ROLE CHECK ===');
    console.log('Current user:', JSON.stringify(user, null, 2));
    console.log('User role:', user?.role);
    console.log('Is Super Admin:', isSuperAdmin);
    console.log('========================');
  }

  return (
    <LanguageProvider>
      <AuthContext.Provider value={authContext}>
        <ConsentProvider>
          <ConsentNavigator 
            userToken={userToken} 
            isSuperAdmin={isSuperAdmin}
          />
        </ConsentProvider>
      </AuthContext.Provider>
    </LanguageProvider>
  );
}

// Separate component to handle consent checking
function ConsentNavigator({ userToken, isSuperAdmin }) {
  const consentContext = useContext(ConsentContext);
  const [showCookieConsent, setShowCookieConsent] = useState(false);

  // Safely extract values with defaults - ensure context exists
  if (!consentContext) {
    // Context not available yet, return loading state
    return null;
  }

  // Extract values from context - these will trigger re-render when context updates
  const contextNeedsConsent = consentContext.needsConsent ?? false;
  const consentLoading = consentContext.loading ?? false;
  const consents = consentContext.consents ?? {};

  useEffect(() => {
    if (userToken && !consentLoading && consents) {
      // Check cookie consent status
      const needsCookies = !consents.cookies?.granted || consents.cookies?.needsConsent;
      const needsTerms = !consents.terms?.granted || consents.terms?.needsConsent;
      const needsPrivacy = !consents.privacy?.granted || consents.privacy?.needsConsent;
      
      // Only show cookie consent if main consents are granted
      setShowCookieConsent(needsCookies && !needsTerms && !needsPrivacy);
      
      // Debug logging
      console.log('ConsentNavigator state:', {
        contextNeedsConsent,
        needsTerms,
        needsPrivacy,
        needsCookies,
        showCookieConsent: needsCookies && !needsTerms && !needsPrivacy
      });
    }
  }, [userToken, consentLoading, consents, contextNeedsConsent]);

  // Only show loading on initial load, not when updating consents
  // Returning null causes navigation to reset, so we show a loading indicator instead
  // Wait for consent status to load before deciding which screen to show
  if (consentLoading && userToken && Object.keys(consents).length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Debug: Log the current state to verify consent check is working
  if (userToken && !consentLoading) {
    console.log('=== ConsentNavigator Render ===');
    console.log('contextNeedsConsent:', contextNeedsConsent);
    console.log('consents:', JSON.stringify(consents, null, 2));
    console.log('Will show consent screen:', contextNeedsConsent);
    console.log('==============================');
  }

  return (
    <>
      <NavigationContainer key={`nav-${contextNeedsConsent}-${userToken ? 'auth' : 'unauth'}`}>
        {userToken ? (
          contextNeedsConsent ? (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="OnboardingConsent" component={OnboardingConsentScreen} />
              <Stack.Screen name="Terms" component={TermsScreen} />
              <Stack.Screen name="Privacy" component={PrivacyScreen} />
              <Stack.Screen name="CookiePolicy" component={CookiePolicyScreen} />
            </Stack.Navigator>
          ) : isSuperAdmin ? (
            <AdminStack />
          ) : (
            <MainTabs />
          )
        ) : (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
      
      {/* Cookie Consent Modal - shown after main consents are granted */}
      {userToken && !contextNeedsConsent && (
        <CookieConsent
          visible={showCookieConsent}
          onAccept={() => {
            setShowCookieConsent(false);
          }}
          onDecline={() => {
            setShowCookieConsent(false);
          }}
        />
      )}
    </>
  );
}

