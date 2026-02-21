import * as Location from 'expo-location';
import { Platform } from 'react-native';

/**
 * Robust location fetch that works reliably on Android.
 * Uses getLastKnownPositionAsync as fallback when getCurrentPositionAsync fails or is slow.
 * On Android, prompts for high-accuracy mode if needed.
 */
export async function getLocationWithFallback(options = {}) {
  const { accuracy = Location.Accuracy.Low } = options;

  // 1. Check if location services are enabled
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error('LOCATION_SERVICES_DISABLED');
  }

  // 2. On Android, try enabling network provider for faster/better location
  if (Platform.OS === 'android') {
    try {
      await Location.enableNetworkProviderAsync();
    } catch {
      // User may have denied - continue anyway
    }
  }

  // 3. Try getLastKnownPositionAsync first (instant when cached, common on Android)
  let locationData = await Location.getLastKnownPositionAsync({
    maxAge: 300000, // Accept up to 5 min old - more lenient for Android
  });

  // 4. Fallback to getCurrentPositionAsync
  if (!locationData) {
    locationData = await Location.getCurrentPositionAsync({
      accuracy,
      mayShowUserSettingsDialog: Platform.OS === 'android',
    });
  }

  return locationData;
}
