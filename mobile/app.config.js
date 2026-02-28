// Expo loads .env from this directory when you run `expo start` or `eas build`.
const appJson = require('./app.json');
module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra || {}),
    },
  },
};
