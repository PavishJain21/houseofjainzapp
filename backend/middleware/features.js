const { ROUTE_TO_FEATURE, isEnabled } = require('../config/features');

/**
 * Middleware: block request if the feature for this route is disabled.
 * Attach to app before routes: app.use(requireFeatureByRoute).
 */
function requireFeatureByRoute(req, res, next) {
  const path = (req.originalUrl || req.url || req.path || '').split('?')[0].replace(/\/$/, '') || '';
  let featureId = null;
  for (const [prefix, fid] of Object.entries(ROUTE_TO_FEATURE)) {
    if (path.startsWith(prefix)) {
      featureId = fid;
      break;
    }
  }
  if (!featureId) return next();
  if (isEnabled(featureId)) return next();
  return res.status(403).json({
    error: 'feature_disabled',
    message: `Feature "${featureId}" is currently disabled.`,
  });
}

module.exports = { requireFeatureByRoute };
