# iOS Mobile App Setup Guide

## Overview
This iOS mobile app replicates the functionality of the web app, providing route navigation with blockage avoidance using HERE Maps.

## Features
- ✅ Source and destination search with autocomplete
- ✅ Real-time route calculation with blockage avoidance
- ✅ Interactive map display with route visualization
- ✅ Blockage markers and circles on the map
- ✅ Route information panel (distance, duration, blockage status)
- ✅ Current location detection
- ✅ Modern UI matching the web app design

## Prerequisites
1. Node.js and npm installed
2. Expo CLI installed: `npm install -g expo-cli`
3. iOS Simulator (via Xcode) or physical iOS device
4. Expo Go app installed on your iOS device (for testing)

## Installation

1. Navigate to the mobile-app directory:
```bash
cd mobile-app
```

2. Install dependencies:
```bash
npm install
```

## Running on iOS

### Using Expo (Recommended for Development)

1. Start the Expo development server:
```bash
npm start
# or
expo start
```

2. Press `i` to open in iOS Simulator, or scan the QR code with Expo Go app on your iOS device.

### Building for Production

For a production build, you'll need to:

1. Configure the app in `app.json`
2. Build using EAS (Expo Application Services) or eject to bare React Native

## Configuration

The app uses the same backend API as the web app. Make sure the API endpoint in `config.js` is correct:

```javascript
endpoint: 'https://up94634q80.execute-api.us-east-1.amazonaws.com/Prod'
```

## App Structure

- `App.js` - Main navigation setup
- `screens/HomeScreen.js` - Source/destination input with search
- `screens/RouteScreen.js` - Route display with map and information panel
- `services/placeSearch.js` - Place search API integration
- `utils/polylineDecoder.js` - HERE Maps polyline decoder
- `config.js` - App configuration

## Features Matching Web App

1. **Search Functionality**: Uses the same `searchPlaces` API endpoint for autocomplete
2. **Route Calculation**: Uses the same `calculateRoute` API with blockage avoidance
3. **Blockage Display**: Shows all active blockages as red circles on the map
4. **Route Visualization**: Displays route as a teal/cyan colored line
5. **Route Information**: Shows distance, duration, and blockage avoidance status

## Notes

- The app uses `react-native-maps` for map display (Apple Maps on iOS)
- Polyline decoding includes a fallback mechanism if HERE Maps flexible polyline decoding fails
- Location permissions are required for current location detection
- The app is designed to work with the existing backend API endpoints

## Troubleshooting

1. **Map not displaying**: Ensure location permissions are granted
2. **Route not showing**: Check API endpoint configuration and network connectivity
3. **Search not working**: Verify the `searchPlaces` endpoint is accessible
4. **Polyline decoding errors**: The app will fall back to a simple route display

## Next Steps

For production deployment:
1. Configure app icons and splash screens
2. Set up proper API key management
3. Add error handling and retry logic
4. Implement offline route caching
5. Add turn-by-turn navigation (if needed)

