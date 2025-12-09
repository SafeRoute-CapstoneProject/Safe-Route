# Running iOS App - Terminal Commands

## Quick Start (Recommended)

```bash
# Navigate to mobile-app directory
cd /Users/dineshponnada/Desktop/DINESH-2/mobile-app

# Install dependencies (if not already done)
npm install

# Run on iOS Simulator (opens Xcode automatically)
npx expo run:ios
```

## Alternative Methods

### Method 1: Using Expo CLI (Development Mode)
```bash
cd /Users/dineshponnada/Desktop/DINESH-2/mobile-app
npm start
# Then press 'i' to open iOS Simulator
```

### Method 2: Direct iOS Simulator Launch
```bash
cd /Users/dineshponnada/Desktop/DINESH-2/mobile-app
npm run ios
```

### Method 3: Build and Open in Xcode Manually
```bash
cd /Users/dineshponnada/Desktop/DINESH-2/mobile-app

# Generate iOS project (first time only)
npx expo prebuild --platform ios

# Open in Xcode
open ios/roadroutingapp.xcworkspace
# Then build and run from Xcode
```

## Troubleshooting Commands

### If CocoaPods needs to be installed:
```bash
cd /Users/dineshponnada/Desktop/DINESH-2/mobile-app/ios
pod install
cd ..
npx expo run:ios
```

### Clear cache and rebuild:
```bash
cd /Users/dineshponnada/Desktop/DINESH-2/mobile-app
rm -rf node_modules
npm install
npx expo run:ios --clear
```

### Check if Xcode is installed:
```bash
xcode-select -p
```

### Install Xcode Command Line Tools (if needed):
```bash
xcode-select --install
```

