import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

// Initialize AdMob (no-op on web; react-native-google-mobile-ads is native-only)
let isInitialized = false;

export const initializeAdMob = async () => {
  if (isWeb) return;
  if (isInitialized) return;

  try {
    const mobileAds = require('react-native-google-mobile-ads').default;
    await mobileAds().initialize();
    isInitialized = true;
    console.log('AdMob initialized successfully');
  } catch (error) {
    console.error('Error initializing AdMob:', error);
  }
};

// Ad Unit IDs - Replace with your actual ad unit IDs
// Use test IDs during development
export const AD_UNITS = {
  // Test Ad Unit IDs (for development)
  BANNER_ANDROID: 'ca-app-pub-3940256099942544/6300978111',
  BANNER_IOS: 'ca-app-pub-3940256099942544/2934735716',
  INTERSTITIAL_ANDROID: 'ca-app-pub-3940256099942544/1033173712',
  INTERSTITIAL_IOS: 'ca-app-pub-3940256099942544/4411468910',
  REWARDED_ANDROID: 'ca-app-pub-3940256099942544/5224354917',
  REWARDED_IOS: 'ca-app-pub-3940256099942544/1712485313',
  
  // Production Ad Unit IDs (replace with your actual IDs)
  // BANNER_ANDROID: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  // BANNER_IOS: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  // INTERSTITIAL_ANDROID: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  // INTERSTITIAL_IOS: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  // REWARDED_ANDROID: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  // REWARDED_IOS: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
};

// Get platform-specific ad unit ID (null on web so ad components render nothing)
export const getAdUnitId = (adType) => {
  if (isWeb) return null;
  const platform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
  return AD_UNITS[`${adType}_${platform}`] || AD_UNITS[`${adType}_ANDROID`];
};

export default isWeb ? { initialize: async () => {} } : require('react-native-google-mobile-ads').default;


