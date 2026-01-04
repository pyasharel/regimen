#!/bin/bash
# Sync version from capacitor.config.ts to iOS project
# Usage: ./sync-version.sh

# Extract version and build from capacitor.config.ts
VERSION=$(grep "export const appVersion" capacitor.config.ts | sed "s/.*= '\\(.*\\)';/\\1/")
BUILD=$(grep "export const appBuild" capacitor.config.ts | sed "s/.*= '\\(.*\\)';/\\1/")

# For iOS, keep the full version unless patch is .0 (e.g., 1.0.0 -> 1.0)
SHORT_VERSION="$VERSION"
if [[ $VERSION =~ ^([0-9]+)\.([0-9]+)\.0$ ]]; then
  SHORT_VERSION="${BASH_REMATCH[1]}.${BASH_REMATCH[2]}"
fi

echo "📱 Syncing version to iOS..."
echo "   Version: $VERSION (iOS: $SHORT_VERSION)"
echo "   Build: $BUILD"

# Update iOS project.pbxproj
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

echo ""
echo "Next steps:"
echo "  1. git pull (if working from Lovable)"
echo "  2. npm run build"
echo "  3. npx cap sync ios"
echo "  4. Open Xcode: npx cap open ios"
echo "  5. Archive: Product → Archive"
echo "  6. Upload to App Store Connect"
