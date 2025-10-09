# Custom Splash Screen Setup for iOS

## Overview
The Capacitor splash screen you see is the default. To use your custom Regimen branding, you need to add splash screen images to the iOS project.

## Steps to Add Custom Splash Screen

### 1. Prepare Your Splash Screen Image
You'll need a splash screen image with your Regimen branding. Requirements:
- Recommended size: 2732 × 2732 pixels (square, to support all orientations)
- Format: PNG with transparency
- Background: Purple gradient (#8B5CF6) matching your brand
- Center your logo/branding in the middle

### 2. Add to iOS Project

After you've created your splash screen image:

1. Open your project in Xcode:
   ```bash
   npx cap open ios
   ```

2. In Xcode, navigate to:
   ```
   App > App > Assets.xcassets > Splash.imageset
   ```

3. Delete the existing placeholder images

4. Drag and drop your splash screen image (you can use the same image for all 3 slots: 1x, 2x, 3x)

5. Make sure the image is named consistently in the Contents.json file

### 3. Alternative: Use Background Color Only

If you prefer a simple solid color splash screen with no image:

1. Open `capacitor.config.ts`
2. The backgroundColor is already set to your brand purple: `#8B5CF6`
3. You can remove the image requirement by setting:
   ```typescript
   SplashScreen: {
     launchShowDuration: 2000,
     backgroundColor: "#8B5CF6",
     showSpinner: false,
     splashFullScreen: true,
     splashImmersive: true,
   }
   ```

### 4. Update capacitor.config.ts (Optional)

The config is already set up correctly in `capacitor.config.ts`:
```typescript
SplashScreen: {
  launchShowDuration: 2000,  // Shows for 2 seconds
  backgroundColor: "#8B5CF6", // Your brand purple
  androidScaleType: "CENTER_CROP",
  showSpinner: false,
  splashFullScreen: true,
  splashImmersive: true,
}
```

### 5. Generate a Quick Splash Screen

If you want me to generate a branded splash screen image for you, I can create one with:
- Purple gradient background (#8B5CF6)
- Regimen logo/branding
- Proper dimensions for iOS

Let me know if you'd like me to generate this!

## After Setup

1. Clean build folder in Xcode: Product → Clean Build Folder
2. Build and run
3. Your custom splash screen will now appear instead of the Capacitor default

## Note
The splash screen shows very briefly (less than a second) as you mentioned - this is normal and controlled by `launchShowDuration` in the config.
