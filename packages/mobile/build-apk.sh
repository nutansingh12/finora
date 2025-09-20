#!/bin/bash

# Build APK script for Finora mobile app
set -e

echo "Setting up environment variables..."
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH="$ANDROID_HOME/platform-tools:$PATH"
export PATH="/opt/homebrew/bin:$PATH"

echo "Checking if bundle exists..."
if [ ! -f "android/app/src/main/assets/index.android.bundle" ]; then
    echo "Creating React Native bundle..."
    npx metro build index.js --platform android --dev false --out android/app/src/main/assets/index.android.bundle
fi

echo "Building APK..."
cd android

# Try to build without the bundle task since we already have the bundle
./gradlew assembleRelease --continue || {
    echo "Build failed, but continuing to check if APK was created..."
}

echo "Checking for APK..."
if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    echo "✅ APK created successfully!"
    echo "APK location: $(pwd)/app/build/outputs/apk/release/app-release.apk"
    ls -la app/build/outputs/apk/release/
else
    echo "❌ APK not found. Build may have failed."
    echo "Checking build outputs..."
    find app/build -name "*.apk" 2>/dev/null || echo "No APK files found"
fi
