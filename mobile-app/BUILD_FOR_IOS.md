# Building iOS App for Your iPhone

## Important Notes:
- **APK files are for Android only**
- For iOS, you need an **IPA file** or to install via Xcode/TestFlight
- iOS requires an **Apple Developer Account** ($99/year) for device installation

## Option 1: Build with EAS Build (Cloud - Easiest)

### Step 1: Install and Login
```bash
cd mobile-app
npm install -g eas-cli
eas login
```
(You'll need to create a free Expo account if you don't have one)

### Step 2: Configure Build
```bash
eas build:configure
```

### Step 3: Build for iOS
```bash
eas build --platform ios --profile preview
```

This will:
- Build your app in the cloud
- Create an IPA file
- Require Apple Developer account setup for device installation

### Step 4: Install on Your iPhone
After build completes:
1. Download the IPA file from the build page
2. Use **Xcode** or **AltStore** to install on your device
3. Or use **TestFlight** if you have an Apple Developer account

## Option 2: Build Locally with Xcode (Free for Development)

### Step 1: Prebuild the Project
```bash
cd mobile-app
npm install
npx expo prebuild
```

### Step 2: Open in Xcode
```bash
open ios/roadroutingapp.xcworkspace
```

### Step 3: In Xcode:
1. Select your **Apple ID** in Signing & Capabilities
2. Connect your iPhone via USB
3. Select your device from the device list
4. Click **Run** (▶️) or press `Cmd + R`

The app will install directly on your connected iPhone!

### Note for Free Apple ID:
- Apps built with a free Apple ID expire after 7 days
- You'll need to rebuild and reinstall weekly
- For permanent installation, you need a paid Apple Developer account

## Option 3: Use Expo Go (Quick Testing)

For quick testing without building:

1. **Install Expo Go** from the App Store on your iPhone
2. **Start the development server:**
   ```bash
   cd mobile-app
   npm start
   ```
3. **Scan the QR code** with your iPhone camera
4. The app will open in Expo Go

**Note:** Some native features (like maps) may not work perfectly in Expo Go.

## Recommended: Build Locally with Xcode

Since you're on macOS, the easiest way is:

```bash
cd mobile-app
npm install
npx expo prebuild
open ios/roadroutingapp.xcworkspace
```

Then in Xcode, just connect your iPhone and click Run!

