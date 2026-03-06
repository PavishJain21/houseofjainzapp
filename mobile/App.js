import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, ActivityIndicator, Platform, StyleSheet, Linking } from 'react-native';
import { playDailyWelcomeSoundIfNeeded } from './src/utils/dailyWelcomeSound';
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
import AuthCallbackScreen from './src/screens/auth/AuthCallbackScreen';
import CommunityScreen from './src/screens/community/CommunityScreen';
import ForumLandingScreen from './src/screens/forum/ForumLandingScreen';
import CategoryFeedScreen from './src/screens/forum/CategoryFeedScreen';
import CreateForumPostScreen from './src/screens/forum/CreateForumPostScreen';
import SanghLandingScreen from './src/screens/sangh/SanghLandingScreen';
import CreateSanghScreen from './src/screens/sangh/CreateSanghScreen';
import SanghDetailScreen from './src/screens/sangh/SanghDetailScreen';
import SanghAddMemberScreen from './src/screens/sangh/SanghAddMemberScreen';
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
import JainFestivalsScreen from './src/screens/profile/JainFestivalsScreen';
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import AdminUsersScreen from './src/screens/admin/AdminUsersScreen';
import AdminShopsScreen from './src/screens/admin/AdminShopsScreen';
import AdminProductsScreen from './src/screens/admin/AdminProductsScreen';
import AdminPostsScreen from './src/screens/admin/AdminPostsScreen';
import AdminOrdersScreen from './src/screens/admin/AdminOrdersScreen';

import { AuthContext } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ConsentProvider, ConsentContext } from './src/context/ConsentContext';
import { FeatureProvider, useFeatures } from './src/context/FeatureContext';
import { AuthGuard, GuestGuard, ConsentGuard, AdminGuard, FeatureGuard } from './src/navigation/guards';
import { API_BASE_URL } from './src/config/api';
import api from './src/config/api';

// Consent Screens
import OnboardingConsentScreen from './src/screens/consent/OnboardingConsentScreen';
import TermsScreen from './src/screens/consent/TermsScreen';
import PrivacyScreen from './src/screens/consent/PrivacyScreen';
import CookiePolicyScreen from './src/screens/consent/CookiePolicyScreen';
import CookieConsent from './src/components/CookieConsent';
import SharedPostView from './src/screens/shared/SharedPostView';
import PublicPrivacyView from './src/screens/shared/PublicPrivacyView';
import PublicChildSafetyView from './src/screens/shared/PublicChildSafetyView';
import ChildSafetyScreen from './src/screens/consent/ChildSafetyScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function WithGuestGuard(Component) {
  return function Wrapped(props) {
    return (
      <GuestGuard>
        <Component {...props} />
      </GuestGuard>
    );
  };
}

function WithConsentGuard(Component) {
  return function Wrapped(props) {
    return (
      <ConsentGuard>
        <Component {...props} />
      </ConsentGuard>
    );
  };
}

function CommunityStack() {
  return (
    <FeatureGuard featureId="community" fallback={null}>
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
    </FeatureGuard>
  );
}

function ForumStack() {
  return (
    <FeatureGuard featureId="forum" fallback={null}>
      <Stack.Navigator>
        <Stack.Screen 
          name="ForumLanding" 
          component={ForumLandingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ForumCategoryFeed" 
          component={CategoryFeedScreen}
          options={({ route }) => ({ title: route.params?.categoryLabel || 'Forum' })}
        />
        <Stack.Screen 
          name="CreateForumPost" 
          component={CreateForumPostScreen}
          options={({ route }) => ({ title: route.params?.categoryLabel ? `Post in ${route.params.categoryLabel}` : 'Create Post' })}
        />
      </Stack.Navigator>
    </FeatureGuard>
  );
}

function SanghStack() {
  return (
    <FeatureGuard featureId="sangh" fallback={null}>
      <Stack.Navigator>
        <Stack.Screen 
          name="SanghLanding" 
          component={SanghLandingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="CreateSangh" 
          component={CreateSanghScreen}
          options={{ title: 'Create Sangh' }}
        />
        <Stack.Screen 
          name="SanghDetail" 
          component={SanghDetailScreen}
          options={({ route }) => ({ title: route.params?.sanghName || 'Group' })}
        />
        <Stack.Screen 
          name="SanghAddMember" 
          component={SanghAddMemberScreen}
          options={({ route }) => ({ title: `Add members · ${route.params?.sanghName || 'Group'}` })}
        />
      </Stack.Navigator>
    </FeatureGuard>
  );
}

function MarketplaceStack() {
  return (
    <FeatureGuard featureId="marketplace" fallback={null}>
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
    </FeatureGuard>
  );
}

function CartStack() {
  return (
    <FeatureGuard featureId="cart" fallback={null}>
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
    </FeatureGuard>
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
        name="JainFestivals" 
        component={JainFestivalsScreen}
        options={{ title: 'Jain Festivals' }}
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
      <Stack.Screen 
        name="ChildSafety" 
        component={ChildSafetyScreen}
        options={{ title: 'Child Safety' }}
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
  const { isEnabled } = useFeatures();
  const { theme } = useTheme();
  const showCommunity = isEnabled('community');
  const showForum = isEnabled('forum');
  const showSangh = isEnabled('sangh');
  const showMarketplace = isEnabled('marketplace');
  const showCart = isEnabled('cart');
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'CommunityTab') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'ForumTab') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'SanghTab') {
            iconName = focused ? 'people-circle' : 'people-circle-outline';
          } else if (route.name === 'MarketplaceTab') {
            iconName = focused ? 'storefront' : 'storefront-outline';
          } else if (route.name === 'CartTab') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.tabActive,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          ...(Platform.OS === 'web' ? { paddingBottom: 56, minHeight: 96 } : {}),
        },
        headerShown: false,
      })}
    >
      {showCommunity && <Tab.Screen name="CommunityTab" component={CommunityStack} options={{ title: 'Community' }} />}
      {showForum && <Tab.Screen name="ForumTab" component={ForumStack} options={{ title: 'Forum' }} />}
      {showSangh && <Tab.Screen name="SanghTab" component={SanghStack} options={{ title: 'Sangh' }} />}
      {showMarketplace && <Tab.Screen name="MarketplaceTab" component={MarketplaceStack} options={{ title: 'Marketplace' }} />}
      {showCart && (
        <Tab.Screen 
          name="CartTab" 
          component={CartStack} 
          options={({ route }) => ({
            title: 'Cart',
            tabBarBadge: route.params?.cartCount > 0 ? route.params.cartCount : undefined,
          })}
        />
      )}
      <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);
  const [forceMainTabs, setForceMainTabs] = useState(false);

  useEffect(() => {
    checkToken();
  }, []);

  // Web: viewport-fit=cover, body padding, and Google AdSense meta
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    let meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      const content = meta.getAttribute('content') || '';
      if (!content.includes('viewport-fit=cover')) {
        meta.setAttribute('content', content + (content ? ', ' : '') + 'viewport-fit=cover');
      }
    }
    if (!document.querySelector('meta[name="google-adsense-account"]')) {
      const adsenseMeta = document.createElement('meta');
      adsenseMeta.name = 'google-adsense-account';
      adsenseMeta.content = 'ca-pub-7344910238595105';
      document.head.appendChild(adsenseMeta);
    }
    if (!document.querySelector('script[data-adsense-client="ca-pub-7344910238595105"]')) {
      const adsenseScript = document.createElement('script');
      adsenseScript.async = true;
      adsenseScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7344910238595105';
      adsenseScript.crossOrigin = 'anonymous';
      adsenseScript.setAttribute('data-adsense-client', 'ca-pub-7344910238595105');
      document.head.appendChild(adsenseScript);
    }
    const styleId = 'houseofjainz-safe-area';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        html, body, #root { height: 100%; min-height: 100vh; min-height: 100dvh; max-height: 100dvh; box-sizing: border-box; margin: 0; overflow: hidden; }
        /* Constrain app to visible viewport so bottom nav is visible without pinching */
        [data-web-mobile-frame] {
          max-height: 100dvh !important;
          padding-bottom: max(env(safe-area-inset-bottom, 0px), 56px) !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Play daily welcome sound (jaijinendra.mp3) once per day as soon as app opens
  useEffect(() => {
    const t = setTimeout(() => {
      playDailyWelcomeSoundIfNeeded();
    }, 500);
    return () => clearTimeout(t);
  }, []);

  const checkToken = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (token && userData) {
        setUserToken(token);
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Refresh user data from API (role, avatar_url, etc.)
        try {
          const response = await api.get('/auth/me');
          if (response.data.user) {
            const updatedUser = { ...parsedUser, ...response.data.user };
            setUser(updatedUser);
            await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
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

  const handledGoogleCallback = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const handleUrl = async (url) => {
      if (!url || !url.includes('auth/callback')) return;
      const match = url.match(/[?&]token=([^&]+)/);
      const token = match ? decodeURIComponent(match[1]) : null;
      if (!token) return;
      handledGoogleCallback.current = true;
      try {
        const res = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        if (res.data?.user) {
          const userData = { ...res.data.user, role: res.data.user?.role || 'user' };
          await AsyncStorage.setItem('userToken', token);
          await AsyncStorage.setItem('userData', JSON.stringify(userData));
          setUserToken(token);
          setUser(userData);
        }
      } catch (_) {}
    };
    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  const refreshUser = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      if (!token || !userData) return;
      const response = await api.get('/auth/me');
      if (response.data.user) {
        const parsed = JSON.parse(userData);
        const updatedUser = { ...parsed, ...response.data.user };
        setUser(updatedUser);
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.log('Could not refresh user:', error.message);
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
        setForceMainTabs(false);
      } catch (error) {
        console.error('Error signing out:', error);
      }
    },
    user,
    token: userToken,
    refreshUser,
  };

  if (isLoading) {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.webRoot}>
          <View style={[styles.webMobileFrame, styles.loadingCenter]}>
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
        </View>
      );
    }
    return null;
  }

  // Web: public URLs (shared post, privacy policy)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const path = (window.location.pathname || '').replace(/\/$/, '') || '/';
    if (path === '/privacypolicy') {
      return (
        <View style={styles.webRoot}>
          <View style={styles.webMobileFrame}>
            <PublicPrivacyView />
          </View>
        </View>
      );
    }
    if (path === '/childsafety') {
      return (
        <View style={styles.webRoot}>
          <View style={styles.webMobileFrame}>
            <PublicChildSafetyView />
          </View>
        </View>
      );
    }
    const communityMatch = path.match(/^\/post\/(\d+)$/);
    if (communityMatch) {
      return (
        <View style={styles.webRoot}>
          <View style={styles.webMobileFrame}>
            <SharedPostView postId={communityMatch[1]} type="community" />
          </View>
        </View>
      );
    }
    const forumMatch = path.match(/^\/forum\/post\/(\d+)$/);
    if (forumMatch) {
      return (
        <View style={styles.webRoot}>
          <View style={styles.webMobileFrame}>
            <SharedPostView postId={forumMatch[1]} type="forum" />
          </View>
        </View>
      );
    }
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

  const appContent = (
    <LanguageProvider>
      <ThemeProvider>
        <AuthContext.Provider value={authContext}>
          <FeatureProvider>
            <ConsentProvider>
              <ConsentNavigator 
                userToken={userToken} 
                isSuperAdmin={isSuperAdmin}
                onForceMainTabsChange={setForceMainTabs}
                forceMainTabs={forceMainTabs}
              />
            </ConsentProvider>
          </FeatureProvider>
        </AuthContext.Provider>
      </ThemeProvider>
    </LanguageProvider>
  );

  // On web: always show app in mobile viewport (fixed width, centered) with safe-area padding
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webRoot}>
        <View style={[styles.webMobileFrame, styles.webFrameSafeArea]} dataSet={{ webMobileFrame: true }}>
          {appContent}
        </View>
      </View>
    );
  }

  return appContent;
}

const MOBILE_VIEW_WIDTH = 430;

const styles = StyleSheet.create({
  webRoot: {
    flex: 1,
    height: '100%',
    minHeight: '100vh',
    maxHeight: '100dvh',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  webMobileFrame: {
    flex: 1,
    width: '100%',
    maxWidth: MOBILE_VIEW_WIDTH,
    height: '100%',
    minHeight: '100vh',
    maxHeight: '100dvh',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  webFrameSafeArea: {
    paddingTop: 'env(safe-area-inset-top, 0px)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    paddingLeft: 'env(safe-area-inset-left, 0px)',
    paddingRight: 'env(safe-area-inset-right, 0px)',
  },
  loadingCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Separate component to handle consent checking
function ConsentNavigator({ userToken, isSuperAdmin, onForceMainTabsChange, forceMainTabs }) {
  const consentContext = useContext(ConsentContext);
  const { isEnabled } = useFeatures();
  const { theme } = useTheme();
  const [showCookieConsent, setShowCookieConsent] = useState(false);
  const adminEnabled = isEnabled('admin');
  const showAdminStack = isSuperAdmin && adminEnabled && !forceMainTabs;
  const navTheme = {
    dark: theme.mode === 'dark',
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.primary,
    },
  };

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
      <NavigationContainer
        key={`nav-${contextNeedsConsent}-${userToken ? 'auth' : 'unauth'}-${theme.mode}`}
        theme={navTheme}
      >
        {userToken ? (
          contextNeedsConsent ? (
            <ConsentGuard>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="OnboardingConsent" component={WithConsentGuard(OnboardingConsentScreen)} />
                <Stack.Screen name="Terms" component={WithConsentGuard(TermsScreen)} />
                <Stack.Screen name="Privacy" component={WithConsentGuard(PrivacyScreen)} />
                <Stack.Screen name="CookiePolicy" component={WithConsentGuard(CookiePolicyScreen)} />
              </Stack.Navigator>
            </ConsentGuard>
          ) : showAdminStack ? (
            <AdminGuard onNotAdmin={() => onForceMainTabsChange?.(true)}>
              <AdminStack />
            </AdminGuard>
          ) : (
            <AuthGuard>
              <MainTabs />
            </AuthGuard>
          )
        ) : (
          <Stack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName={
              Platform.OS === 'web' && typeof window !== 'undefined' && (window.location.pathname || '').replace(/\/$/, '') === '/auth/callback'
                ? 'AuthCallback'
                : 'Login'
            }
          >
            <Stack.Screen name="Login" component={WithGuestGuard(LoginScreen)} />
            <Stack.Screen name="Register" component={WithGuestGuard(RegisterScreen)} />
            <Stack.Screen name="ForgotPassword" component={WithGuestGuard(ForgotPasswordScreen)} />
            <Stack.Screen name="ResetPassword" component={WithGuestGuard(ResetPasswordScreen)} />
            <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} />
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

