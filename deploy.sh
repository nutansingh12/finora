#!/bin/bash

# Finora Deployment Script
# This script handles deployment of both web and mobile applications

set -e

echo "🚀 Finora Deployment Script"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Deploy Web Application to Vercel
deploy_web() {
    print_status "Deploying web application to Vercel..."
    
    cd packages/web
    
    # Check if Vercel CLI is installed
    if ! command_exists vercel; then
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    # Build the application
    print_status "Building web application..."
    npm run build
    
    # Deploy to Vercel
    print_status "Deploying to Vercel..."
    vercel --prod --yes
    
    print_success "Web application deployed successfully!"
    cd ../..
}

# Build Android APK
build_android() {
    print_status "Building Android APK..."
    
    cd packages/mobile
    
    # Check if Android SDK is available
    if [ -z "$ANDROID_HOME" ]; then
        print_error "ANDROID_HOME environment variable is not set"
        print_error "Please install Android SDK and set ANDROID_HOME"
        exit 1
    fi
    
    # Install dependencies
    print_status "Installing mobile dependencies..."
    npm install
    
    # Create assets directory
    mkdir -p android/app/src/main/assets
    
    # Bundle JavaScript
    print_status "Bundling JavaScript..."
    npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res
    
    # Build APK
    print_status "Building APK..."
    cd android
    ./gradlew assembleDebug
    
    # Copy APK to root directory
    cp app/build/outputs/apk/debug/app-debug.apk ../../../finora-debug.apk
    
    print_success "Android APK built successfully!"
    print_success "APK location: finora-debug.apk"
    cd ../../..
}

# Main deployment function
main() {
    case "$1" in
        "web")
            deploy_web
            ;;
        "android")
            build_android
            ;;
        "all")
            deploy_web
            build_android
            ;;
        *)
            echo "Usage: $0 {web|android|all}"
            echo ""
            echo "Commands:"
            echo "  web     - Deploy web application to Vercel"
            echo "  android - Build Android APK"
            echo "  all     - Deploy web and build Android APK"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
