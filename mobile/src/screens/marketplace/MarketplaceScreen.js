import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import LanguageContext from '../../context/LanguageContext';
import api from '../../config/api';

export default function MarketplaceScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState('');
  const [userCity, setUserCity] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        await getUserLocation();
      } catch (error) {
        console.error('Error getting user location:', error);
        // Continue even if location fails
      }
      // Always try to load shops
      await loadShops(1, false);
    };
    initialize();
  }, []);

  const getUserLocation = async (setLocationForSearch = false) => {
    try {
      if (setLocationForSearch) {
        setGettingLocation(true);
      }
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Please enable location permissions to find nearby shops.',
          [{ text: 'OK' }]
        );
        setGettingLocation(false);
        return null;
      }

      const locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = locationData.coords;
      
      // Reverse geocode to get city name
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        // Prioritize city name, fallback to district, subregion, then region
        // Use city name primarily for search (not state)
        const cityName = address.city || address.district || address.subregion || null;
        const stateName = address.region || null;
        
        // Store city for nearby badge display
        setUserCity(cityName);
        
        // For search, use city name (not state) as it's more specific
        // Only add state if city is not available
        const searchLocation = cityName || stateName;
        
        console.log('User location detected:', { 
          city: address.city,
          district: address.district,
          subregion: address.subregion,
          region: address.region,
          cityName,
          stateName,
          searchLocation
        });
        
        // If called from button, set location and search
        if (setLocationForSearch && searchLocation) {
          setLocation(searchLocation);
          // Search for shops in this location (will use contains match)
          await loadShops(1, false, searchLocation);
        }
        
        setGettingLocation(false);
        return searchLocation;
      }
      setGettingLocation(false);
      return null;
    } catch (error) {
      console.error('Error getting user location:', error);
      Alert.alert('Error', 'Failed to get your location. Please try again.');
      setGettingLocation(false);
      return null;
    }
  };

  const handleGetCurrentLocation = async () => {
    const locationName = await getUserLocation(true);
    if (locationName) {
      console.log('Searching for shops in:', locationName);
    }
  };

  const loadShops = async (page = 1, append = false, locationFilter = null) => {
    // Prevent duplicate requests
    if (append && loadingMore) return;
    if (!append && loading) return;
    
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setCurrentPage(1);
      setHasMore(true);
    }

    try {
      const params = { page, limit: 10 };
      // Use provided locationFilter or current location state
      const activeLocation = locationFilter !== null ? locationFilter : location;
      // Only add location filter if location search is active
      if (activeLocation && activeLocation.trim() !== '') {
        params.location = activeLocation.trim();
      }
      
      const response = await api.get('/marketplace/shops', { params });
      
      // Handle different response structures
      let newShops = [];
      let pagination = {};
      
      if (response && response.data) {
        newShops = response.data.shops || response.data || [];
        pagination = response.data.pagination || {};
      }
      
      // Ensure newShops is an array
      if (!Array.isArray(newShops)) {
        console.warn('Shops data is not an array:', newShops);
        newShops = [];
      }
      
      // Sort shops: same city first, then others (only when no location filter and first page)
      if (userCity && (!activeLocation || activeLocation.trim() === '') && page === 1) {
        newShops = newShops.sort((a, b) => {
          const aIsSameCity = a.location && a.location.toLowerCase() === userCity.toLowerCase();
          const bIsSameCity = b.location && b.location.toLowerCase() === userCity.toLowerCase();
          
          if (aIsSameCity && !bIsSameCity) return -1;
          if (!aIsSameCity && bIsSameCity) return 1;
          return 0;
        });
      }
      
      if (append) {
        setShops(prevShops => [...prevShops, ...newShops]);
      } else {
        setShops(newShops);
      }
      
      setHasMore(pagination.hasMore || false);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading shops:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error message:', error.message);
      // Only show alert if it's not a pagination error (400) or if it's the first page
      if (page === 1) {
        const errorMessage = error.response?.data?.error || error.message || 'Failed to load shops';
        Alert.alert('Error', errorMessage);
      } else {
        // For pagination errors, just stop loading more
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadShopsWithLocation = (locationFilter) => {
    loadShops(1, false, locationFilter);
  };

  const loadMoreShops = () => {
    // Prevent loading more if:
    // - Already loading more
    // - Currently loading initial shops
    // - No more shops available
    // - Shops array is empty (initial load not complete)
    if (!loadingMore && !loading && hasMore && shops.length > 0) {
      loadShops(currentPage + 1, true);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Reset pagination state
    setCurrentPage(1);
    setHasMore(true);
    await getUserLocation();
    await loadShops(1, false);
    setRefreshing(false);
  };

  const renderShop = ({ item }) => (
    <TouchableOpacity
      style={styles.shopCard}
      onPress={() => navigation.navigate('Shop', { shopId: item.id })}
    >
      <View style={styles.shopHeader}>
        <View style={styles.shopIcon}>
          <Text style={styles.shopIconText}>
            {item.name?.charAt(0).toUpperCase() || 'S'}
          </Text>
        </View>
        <View style={styles.shopInfo}>
          <View style={styles.shopNameRow}>
            <Text style={styles.shopName}>{item.name}</Text>
            {userCity && item.location && item.location.toLowerCase() === userCity.toLowerCase() && (
              <View style={styles.nearbyBadge}>
                <Text style={styles.nearbyBadgeText}>Nearby</Text>
              </View>
            )}
          </View>
          {item.location && (
            <Text style={styles.shopLocation}>
              <Ionicons name="location" size={12} /> {item.location}
            </Text>
          )}
        </View>
      </View>
      {item.description && (
        <Text style={styles.shopDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('marketplace.searchByLocation') || 'Search by location'}
          value={location}
          onChangeText={setLocation}
          onSubmitEditing={() => loadShops(1, false)}
        />
        <TouchableOpacity 
          onPress={handleGetCurrentLocation}
          style={styles.locationButton}
          disabled={gettingLocation}
        >
          {gettingLocation ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            <Ionicons name="locate" size={20} color="#4CAF50" />
          )}
        </TouchableOpacity>
        {location ? (
          <TouchableOpacity onPress={() => {
            setLocation('');
            // Force reload with empty location
            loadShopsWithLocation('');
          }}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={shops}
        renderItem={renderShop}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMoreShops}
        onEndReachedThreshold={0.5}
        scrollEventThrottle={400}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('marketplace.noShops')}</Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <Text style={styles.loadingMoreText}>{t('marketplace.loadingMore')}</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    margin: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  locationButton: {
    marginLeft: 10,
    marginRight: 5,
    padding: 5,
  },
  list: {
    padding: 10,
  },
  shopCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  shopIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  shopIconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  shopInfo: {
    flex: 1,
  },
  shopNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  nearbyBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  nearbyBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  shopLocation: {
    fontSize: 14,
    color: '#666',
  },
  shopDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  loadingMoreContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingMoreText: {
    color: '#999',
    fontSize: 14,
  },
});

