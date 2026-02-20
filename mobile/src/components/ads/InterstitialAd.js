import React, { useEffect } from 'react';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { getAdUnitId } from '../../config/admob';

let interstitialAd = null;

export const loadInterstitialAd = (adUnitId = null) => {
  const unitId = adUnitId || getAdUnitId('INTERSTITIAL');
  
  interstitialAd = InterstitialAd.createForAdRequest(unitId, {
    requestNonPersonalizedAdsOnly: true,
  });

  return interstitialAd;
};

export const showInterstitialAd = async (adUnitId = null) => {
  try {
    if (!interstitialAd) {
      interstitialAd = loadInterstitialAd(adUnitId);
    }

    // Load the ad
    await interstitialAd.load();

    // Show the ad when loaded
    interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      interstitialAd.show();
    });

    // Reload for next time
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


