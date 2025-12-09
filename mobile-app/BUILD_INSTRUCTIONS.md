# Building the Mobile App

## For Android (APK file)

### Option 1: Build locally (requires Android Studio)

1. **Install Android Studio** and set up Android SDK
2. **Build the APK:**
   ```bash
   cd mobile-app
   npm install
   npx expo prebuild
   npx expo run:android --variant release
   ```
   
   The APK will be located at:
   `android/app/build/outputs/apk/release/app-release.apk`

### Option 2: Build with EAS Build (Cloud - Recommended)

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure the project:**
   ```bash
   eas build:configure
   ```

4. **Build Android APK:**
   ```bash
   eas build --platform android --profile preview
   ```

   This will create an APK file you can download and install on any Android device.

## For iOS (IPA file)

### Requirements:
- **Apple Developer Account** ($99/year)
- **macOS** with Xcode installed
- **Code signing certificates**

### Option 1: Build with EAS Build (Cloud - Recommended)

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure the project:**
   ```bash
   eas build:configure
   ```

4. **Build iOS app:**
   ```bash
   eas build --platform ios --profile preview
   ```

   This will create an IPA file, but you'll need to:
   - Have an Apple Developer account
   - Configure code signing
   - Install via TestFlight or Xcode

### Option 2: Build locally with Xcode

1. **Prebuild the project:**
   ```bash
   cd mobile-app
   npx expo prebuild
   ```

2. **Open in Xcode:**
   ```bash
   open ios/roadroutingapp.xcworkspace
   ```

3. **In Xcode:**
   - Select your development team
   - Choose a device or simulator
   - Product → Archive
   - Distribute App → Ad Hoc or App Store

## Quick Start (Android APK)

If you just want an Android APK quickly:

```bash
cd mobile-app
npm install
npx eas-cli build --platform android --profile preview
```

After the build completes, you'll get a download link for the APK file.

## Installing on Your Device

### Android:
1. Download the APK file
2. Enable "Install from Unknown Sources" in Android settings
3. Open the APK file and install

### iOS:
1. Download the IPA file
2. Use Xcode, TestFlight, or a tool like AltStore to install
3. Trust the developer certificate in iOS Settings → General → Device Management

