# Running as Desktop/Web App

## Quick Start

```bash
# Navigate to mobile-app directory
cd /Users/dineshponnada/Desktop/DINESH-2/mobile-app

# Install dependencies (if not already done)
npm install

# Run on web/desktop
npm run web
# or
npx expo start --web
```

This will:
1. Start the Expo development server
2. Open the app in your default web browser
3. Run as a desktop web application

## Access the App

Once running, you can access the app at:
- **Local**: http://localhost:8081 (or the port shown in terminal)
- The app will automatically open in your browser

## Features on Desktop/Web

✅ Source and destination search with autocomplete
✅ Route calculation with blockage avoidance  
✅ Route information display (distance, duration, blockage status)
✅ Google Maps integration for route visualization
✅ All functionality from mobile app

## Notes

- The app uses Google Maps embed for web/desktop (instead of native maps)
- All API calls work the same as mobile version
- The UI is fully responsive and works on desktop browsers
- You can resize the browser window to test different screen sizes

## Troubleshooting

If you get errors:
```bash
# Clear cache and restart
rm -rf node_modules
npm install
npx expo start --web --clear
```

