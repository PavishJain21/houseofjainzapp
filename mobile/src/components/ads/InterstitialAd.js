import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { getAdUnitId } from '../../config/admob';

const isWeb = Platform.OS === 'web';
let interstitialAd = null;

if (!isWeb) {
  var { InterstitialAd, AdEventType, TestIds } = require('react-native-google-mobile-ads');
}

export const loadInterstitialAd = (adUnitId = null) => {
  if (isWeb) return null;
  const unitId = adUnitId || getAdUnitId('INTERSTITIAL');
  if (!unitId) return null;
  interstitialAd = InterstitialAd.createForAdRequest(unitId, {
    requestNonPersonalizedAdsOnly: true,
  });
  return interstitialAd;
};

export const showInterstitialAd = async (adUnitId = null) => {
  if (isWeb) return;
  try {
    if (!interstitialAd) {
      interstitialAd = loadInterstitialAd(adUnitId);
    }
    if (!interstitialAd) return;
    await interstitialAd.load();
    interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      interstitialAd.show();
    });
    interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      interstitialAd = loadInterstitialAd(adUnitId);
    });
  } catch (error) {
    console.error('Error showing interstitial ad:', error);
  }
};

// Hook to use interstitial ads
export const useInterstitialAd = (adUnitId = null) => {
  useEffect(() => {
    const ad = loadInterstitialAd(adUnitId);
    
    return () => {
      // Cleanup if needed
    };
  }, [adUnitId]);

  return {
    show: () => showInterstitialAd(adUnitId),
  };
};

export default { loadInterstitialAd, showInterstitialAd, useInterstitialAd };


