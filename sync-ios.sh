#!/bin/bash
# Quick sync script for iOS updates
# Usage: ./sync-ios.sh

echo "🔄 Pulling latest changes..."
git pull

echo "📦 Installing dependencies..."
npm install

echo "🏗️  Building web app..."
npm run build

echo "📱 Syncing to iOS..."
npx cap sync ios

echo "🚀 Running on iPhone..."
npx cap run ios

echo "✅ Done! Check version 0.1.1 (Build 3) in Settings"
