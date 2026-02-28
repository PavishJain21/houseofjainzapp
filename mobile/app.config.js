// Expo loads .env from this directory when you run `expo start` or `eas build`.
// Set EXPO_PUBLIC_GOOGLE_CLIENT_ID (in mobile/.env or here) to enable Google sign-in.
const appJson = require('./app.json');
module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra || {}),
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '206763068103-2btqifg7h8o6thme3ijqf91rl8f9jfl8.apps.googleusercontent.com',
    },
  },
};
