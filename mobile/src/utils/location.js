import * as Location from 'expo-location';
import { Platform } from 'react-native';

/**
 * Location utilities – works for all locations globally (any country/region).
 * Robust location fetch on Android/iOS/Web. On Web uses browser Geolocation API.
 */
export async function getLocationWithFallback(options = {}) {
  const { accuracy = Location.Accuracy.Low } = options;
  const isWeb = Platform.OS === 'web';

  // On web: skip native-only APIs and use getCurrentPositionAsync directly (browser will prompt for permission)
  if (isWeb) {
    try {
      const locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return locationData;
    } catch (e) {
      if (e?.code === 1 || e?.message?.includes('denied') || e?.message?.includes('permission')) {
        throw new Error('LOCATION_SERVICES_DISABLED');
      }
      throw e;
    }
  }

  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      throw new Error('LOCATION_SERVICES_DISABLED');
    }
  } catch (e) {
    throw e?.message === 'LOCATION_SERVICES_DISABLED' ? e : new Error('LOCATION_SERVICES_DISABLED');
  }

  if (Platform.OS === 'android') {
    try {
      await Location.enableNetworkProviderAsync();
    } catch {
      // User may have denied - continue anyway
    }
  }

  let locationData = await Location.getLastKnownPositionAsync({
    maxAge: 300000,
  });

  if (!locationData) {
    locationData = await Location.getCurrentPositionAsync({
      accuracy,
      mayShowUserSettingsDialog: Platform.OS === 'android',
    });
  }

  return locationData;
}

const NOMINATIM_USER_AGENT = 'HouseOfJainz/1.0';

/**
 * Get a readable location name (city, town, or area) from coordinates.
 * Works for all locations globally: uses Expo reverse geocode when available,
 * then OpenStreetMap Nominatim (worldwide coverage, no API key).
 */
export async function getLocationNameFromCoords(latitude, longitude) {
  try {
    const reverseGeocode = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });
    if (reverseGeocode && reverseGeocode.length > 0) {
      const address = reverseGeocode[0];
      const name =
        address.city ||
        address.district ||
        address.subregion ||
        address.region ||
        address.name ||
        null;
      if (name) return name;
    }
  } catch (_) {
    // Expo reverse geocode can fail on web or in some regions
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': NOMINATIM_USER_AGENT },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data?.address;
    if (!addr) return null;
    // OSM address keys vary by country; pick first available for global coverage
    const name =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county ||
      addr.state_district ||
      addr.region ||
      addr.state ||
      addr.country ||
      null;
    return name || null;
  } catch (_) {
    return null;
  }
}
