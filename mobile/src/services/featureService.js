import api from '../config/api';
import { resolveEnabledMap, getDefaultEnabledMap } from '../config/features';

let cachedMap = null;
let cacheTime = 0;
const CACHE_MS = 5 * 60 * 1000; // 5 min

/**
 * Fetch enabled features from backend. Returns { [featureId]: boolean } (resolved: parent off => children off).
 */
export async function fetchEnabledFeatures() {
  try {
    const { data } = await api.get('/features');
    const raw = data?.features || {};
    cachedMap = resolveEnabledMap(raw);
    cacheTime = Date.now();
    return cachedMap;
  } catch (err) {
    if (cachedMap) return cachedMap;
    return getDefaultEnabledMap();
  }
}

/**
 * Get cached enabled map; if stale or missing, fetch from API.
 */
export async function getEnabledFeatures() {
  if (cachedMap && Date.now() - cacheTime < CACHE_MS) return cachedMap;
  return fetchEnabledFeatures();
}

/**
 * Sync: get enabled map (from cache or API). Use in FeatureContext.
 */
export function getEnabledFeaturesSync() {
  return cachedMap || getDefaultEnabledMap();
}

/**
 * Check if a feature is enabled (uses cached map; may be stale until context has loaded).
 */
export function isFeatureEnabled(featureId) {
  const map = cachedMap || getDefaultEnabledMap();
  return !!map[featureId];
}

export function invalidateFeatureCache() {
  cachedMap = null;
  cacheTime = 0;
}
