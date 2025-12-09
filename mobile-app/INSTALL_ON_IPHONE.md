# Install App on Your iPhone - Quick Guide

## Xcode is Now Open! Follow These Steps:

### Step 1: Sign In to Xcode
1. In Xcode, go to **Xcode → Settings → Accounts** (or press `Cmd + ,`)
2. Click the **+** button
3. Sign in with your **Apple ID** (free account works for development)

### Step 2: Connect Your iPhone
1. Connect your iPhone to your Mac via USB cable
2. Unlock your iPhone
3. Trust this computer if prompted

### Step 3: Select Your Device
1. In Xcode, at the top toolbar, click the device selector (next to the play button)
2. Select your **iPhone** from the list
   - If you see "Unavailable", make sure your iPhone is unlocked and trusted

### Step 4: Configure Signing
1. In the left sidebar, click on **RoadRoutingApp** (blue icon at the top)
2. Select the **RoadRoutingApp** target
3. Go to **Signing & Capabilities** tab
4. Check **"Automatically manage signing"**
5. Select your **Team** (your Apple ID)
6. Xcode will automatically configure signing

### Step 5: Build and Install
1. Click the **Play button** (▶️) or press `Cmd + R`
2. Xcode will build the app (this may take a few minutes the first time)
3. The app will automatically install on your iPhone!

### Step 6: Trust the Developer (First Time Only)
1. On your iPhone, go to **Settings → General → VPN & Device Management**
2. Tap on your developer certificate
3. Tap **"Trust [Your Name]"**
4. The app will now open!

## Troubleshooting

### "No devices found"
- Make sure iPhone is unlocked
- Trust the computer on your iPhone
- Try a different USB cable/port

### "Signing requires a development team"
- Make sure you're signed in to Xcode with your Apple ID
- Select your team in Signing & Capabilities

### App expires after 7 days
- This is normal with a free Apple ID
- Just rebuild and reinstall (takes 2 minutes)
- For permanent installation, you need a paid Apple Developer account ($99/year)

## That's It!
Your app should now be installed and running on your iPhone! 🎉

