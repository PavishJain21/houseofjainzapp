import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchEnabledFeatures, getEnabledFeaturesSync } from '../services/featureService';

const FeatureContext = createContext({
  features: null,
  loading: true,
  isEnabled: () => true,
  refresh: async () => {},
});

export function FeatureProvider({ children }) {
  const [features, setFeatures] = useState(getEnabledFeaturesSync);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const map = await fetchEnabledFeatures();
    setFeatures(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isEnabled = useCallback(
    (featureId) => {
      if (!features) return true;
      return !!features[featureId];
    },
    [features]
  );

  return (
    <FeatureContext.Provider value={{ features, loading, isEnabled, refresh }}>
      {children}
    </FeatureContext.Provider>
  );
}

export function useFeatures() {
  const ctx = useContext(FeatureContext);
  if (!ctx) {
    return {
      features: null,
      loading: false,
      isEnabled: () => true,
      refresh: async () => {},
    };
  }
  return ctx;
}

export default useFeatures;
