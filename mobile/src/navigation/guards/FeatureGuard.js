import React, { useContext } from 'react';
import { useFeatures } from '../../context/FeatureContext';

/**
 * Wraps a screen that requires a feature flag (e.g. community, forum, marketplace, cart).
 * If the feature is disabled, renders fallback (e.g. null or a "not available" message).
 * Used inside tab stacks so the tab visibility is already gated; this guards direct navigation.
 */
export function FeatureGuard({ children, featureId, fallback = null }) {
  const { isEnabled } = useFeatures();
  const enabled = isEnabled(featureId);

  if (!enabled) {
    return fallback;
  }
  return children;
}

export default FeatureGuard;
