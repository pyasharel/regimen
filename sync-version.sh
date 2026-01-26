#!/bin/bash
# Sync version from capacitor.config.ts to iOS and Android projects
# Usage: ./sync-version.sh

# Extract version and build from capacitor.config.ts
VERSION=$(grep "export const appVersion" capacitor.config.ts | sed "s/.*= '\\(.*\\)';/\\1/")
BUILD=$(grep "export const appBuild" capacitor.config.ts | sed "s/.*= '\\(.*\\)';/\\1/")

# For iOS, keep the full version unless patch is .0 (e.g., 1.0.0 -> 1.0)
SHORT_VERSION="$VERSION"
if [[ $VERSION =~ ^([0-9]+)\.([0-9]+)\.0$ ]]; then
  SHORT_VERSION="${BASH_REMATCH[1]}.${BASH_REMATCH[2]}"
fi

echo "📱 Syncing version to iOS and Android..."
echo "   Version: $VERSION (iOS: $SHORT_VERSION)"
echo "   Build: $BUILD"
echo ""

# ==================== iOS ====================
PBXPROJ="ios/App/App.xcodeproj/project.pbxproj"

if [ -f "$PBXPROJ" ]; then
  # Update MARKETING_VERSION
  sed -i '' "s/MARKETING_VERSION = [^;]*;/MARKETING_VERSION = $SHORT_VERSION;/g" "$PBXPROJ"
  # Update CURRENT_PROJECT_VERSION (build number)
  sed -i '' "s/CURRENT_PROJECT_VERSION = [^;]*;/CURRENT_PROJECT_VERSION = $BUILD;/g" "$PBXPROJ"
  echo "✅ iOS project updated"
else
  echo "⚠️  iOS project not found. Run 'npx cap add ios' first."
fi

# ==================== Android ====================
GRADLE_FILE="android/app/build.gradle"

if [ -f "$GRADLE_FILE" ]; then
  # Update versionCode (build number - must be integer)
  sed -i '' "s/versionCode [0-9]*/versionCode $BUILD/g" "$GRADLE_FILE"
  # Update versionName (display version)
  sed -i '' "s/versionName \"[^\"]*\"/versionName \"$VERSION\"/g" "$GRADLE_FILE"
  echo "✅ Android project updated"
else
  echo "⚠️  Android project not found. Run 'npx cap add android' first."
fi

echo ""
echo "Next steps for iOS:"
echo "  1. git pull (if working from Lovable)"
echo "  2. npm run build"
echo "  3. npx cap sync ios"
echo "  4. Open Xcode: npx cap open ios"
echo "  5. Archive: Product → Archive"
echo "  6. Upload to App Store Connect"
echo ""
echo "Next steps for Android:"
echo "  1. git pull (if working from Lovable)"
echo "  2. npm run build"
echo "  3. npx cap sync android"
echo "  4. Open Android Studio: npx cap open android"
echo "  5. Build → Generate Signed Bundle / APK"
echo "  6. Upload to Google Play Console"
