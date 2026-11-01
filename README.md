# Offline Media Player

A mobile-first offline media player for Android, iPhone, and other phone browsers. It supports local audio and video playback without requiring internet, and it is packaged as a PWA with Capacitor support for Android/iOS app builds.

## Features

- Offline media playback from local files
- Audio and video support
- Playlist/library management
- Mobile-friendly UI
- Installable as a Progressive Web App (PWA)
- Share button for quick sharing
- Capacitor-ready for Android and iOS builds

## Run locally

1. Install dependencies:
   npm install
2. Start the app:
   npm run dev
3. Build the production app:
   npm run build

## Mobile installation

### Android

1. Install the Android platform:
   npx cap add android
2. Sync web assets:
   npm run build
   npm run cap:sync
3. Open Android Studio:
   npm run android
4. Build APK or AAB from Android Studio or use Gradle.

### iPhone / iPad

1. Install the iOS platform:
   npx cap add ios
2. Sync web assets:
   npm run build
   npm run cap:sync
3. Open Xcode:
   npm run ios

## Shareable / installable notes

- On supported phones, the app can be installed as a standalone app from the browser.
- For distributable Android builds, generate an APK or AAB in Android Studio.
- For iOS, use Xcode to sign and build the app.
- The app stores media locally in the browser's device storage and file picker flow, which makes it usable without network access.

## Notes

This project is intentionally designed to work as a mobile-friendly offline player without requiring a backend or internet service.
