// Expo loads .env from this directory when you run `expo start` or `eas build`.
// Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable Google sign-in.
const appJson = require('./app.json');
module.exports = {
  ...appJson,
};
