import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { getAdUnitId } from '../../config/admob';

export default function BannerAdComponent({ 
  adUnitId = null, 
  size = BannerAdSize.BANNER,
  position = 'bottom' // 'top' or 'bottom'
}) {
  const [adUnit, setAdUnit] = useState(null);

  useEffect(() => {
    // Use provided ad unit ID or get default banner ad unit ID
    const unitId = adUnitId || getAdUnitId('BANNER');
    setAdUnit(unitId);
  }, [adUnitId]);

  if (!adUnit) {
    return null;
  }

  return (
    <View style={[styles.container, position === 'top' ? styles.top : styles.bottom]}>
      <BannerAd
        unitId={adUnit}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {
          console.log('Banner ad loaded');
        }}
        onAdFailedToLoad={(error) => {
          console.error('Banner ad failed to load:', error);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
  },
  top: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  bottom: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
});


