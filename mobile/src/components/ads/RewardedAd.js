import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { getAdUnitId } from '../../config/admob';

const isWeb = Platform.OS === 'web';
let rewardedAd = null;

if (!isWeb) {
  var { RewardedAd, RewardedAdEventType, TestIds } = require('react-native-google-mobile-ads');
}

export const loadRewardedAd = (adUnitId = null) => {
  if (isWeb) return null;
  const unitId = adUnitId || getAdUnitId('REWARDED');
  if (!unitId) return null;
  rewardedAd = RewardedAd.createForAdRequest(unitId, {
    requestNonPersonalizedAdsOnly: true,
  });
  return rewardedAd;
};

export const showRewardedAd = async (adUnitId = null, onRewarded = () => {}) => {
  if (isWeb) {
    onRewarded({ amount: 0, type: 'web' });
    return;
  }
  try {
    if (!rewardedAd) {
      rewardedAd = loadRewardedAd(adUnitId);
    }
    if (!rewardedAd) return;
    await rewardedAd.load();
    rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      console.log('User earned reward:', reward);
      onRewarded(reward);
    });
    rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      rewardedAd.show();
    });
    rewardedAd.addAdEventListener(RewardedAdEventType.CLOSED, () => {
      rewardedAd = loadRewardedAd(adUnitId);
    });
  } catch (error) {
    console.error('Error showing rewarded ad:', error);
  }
};

// Hook to use rewarded ads
export const useRewardedAd = (adUnitId = null) => {
  useEffect(() => {
    const ad = loadRewardedAd(adUnitId);
    
    return () => {
      // Cleanup if needed
    };
  }, [adUnitId]);

  return {
    show: (onRewarded) => showRewardedAd(adUnitId, onRewarded),
  };
};

export default { loadRewardedAd, showRewardedAd, useRewardedAd };


