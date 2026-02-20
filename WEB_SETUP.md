# Web Setup Guide

The House of Jainz app now supports web browsers! Here's how to run it on web.

## Prerequisites

Make sure you have:
- Node.js installed
- Backend server running (see main README)
- All dependencies installed

## Running on Web

### Step 1: Install Web Dependencies

```bash
cd mobile
npm install
```

The web dependencies (`react-native-web`, `react-dom`) are already added to `package.json`.

### Step 2: Start the Web App

```bash
cd mobile
npm run web
```

Or from the root directory:

```bash
npm run mobile -- --web
```

This will:
- Start the Expo development server
- Open your default browser to `http://localhost:19006`
- Enable hot reloading

### Step 3: Access the App

The app will automatically open in your browser. If it doesn't, navigate to:
- **Local**: http://localhost:19006
- The terminal will show the exact URL

## Web-Specific Features

### API Configuration

The API is configured to work with `localhost:5000` when running on web. Make sure your backend is running on port 5000.

If you need to change the API URL for web:
1. Edit `mobile/src/config/api.js`
2. Update the `getApiUrl()` function

### Platform-Specific Components

Some components have been adapted for web:
- **Picker**: Uses HTML `<select>` on web, React Native Picker on mobile
- **Image Picker**: Works on web (uses file input)
- **Location**: Works on web (browser geolocation API)

### Known Limitations

1. **File Uploads**: Image picker works but may have different UI on web
2. **Location Services**: Requires browser permission
3. **Navigation**: Uses web-compatible navigation
4. **Styling**: Some mobile-specific styles may need adjustment

## Building for Production Web

To create a production build:

```bash
cd mobile
npx expo export:web
```

This creates a `web-build` folder with static files you can deploy to:
- Netlify
- Vercel
- AWS S3
- Any static hosting service

## Troubleshooting

### Port Already in Use

If port 19006 is taken:
```bash
npx expo start --web --port 3000
```

### API Connection Issues

1. Make sure backend is running: `npm run dev` (from root)
2. Check `mobile/src/config/api.js` has correct URL
3. For CORS issues, ensure backend has CORS enabled (already configured)

### Build Errors

If you get build errors:
```bash
cd mobile
rm -rf node_modules
npm install
npx expo start --clear
```

### Picker Not Working

The Picker component is now web-compatible. If you see issues:
- Clear browser cache
- Restart the dev server
- Check browser console for errors

## Development Tips

1. **Hot Reload**: Changes auto-refresh in browser
2. **DevTools**: Use React DevTools browser extension
3. **Network Tab**: Check API calls in browser DevTools
4. **Console**: Check for errors in browser console

## Next Steps

- Test all features on web
- Adjust styling for desktop screens
- Add responsive design for tablets
- Optimize for different screen sizes

