import React, { useEffect } from 'react';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { getAdUnitId } from '../../config/admob';

let rewardedAd = null;

export const loadRewardedAd = (adUnitId = null) => {
  const unitId = adUnitId || getAdUnitId('REWARDED');
  
  rewardedAd = RewardedAd.createForAdRequest(unitId, {
    requestNonPersonalizedAdsOnly: true,
  });

  return rewardedAd;
};

export const showRewardedAd = async (adUnitId = null, onRewarded = () => {}) => {
  try {
    if (!rewardedAd) {
      rewardedAd = loadRewardedAd(adUnitId);
    }

    // Load the ad
    await rewardedAd.load();

    // Handle rewards
    rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      console.log('User earned reward:', reward);
      onRewarded(reward);
    });

    // Show the ad when loaded
    rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      rewardedAd.show();
    });

    // Reload for next time
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


