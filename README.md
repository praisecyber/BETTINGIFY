# Bettingify Frontend

React, TypeScript, and Vite client for Bettingify. The app can run in a browser, as an Android/iOS Capacitor app, or as the Electron desktop app.

## Web development

```bash
npm install
npm run dev
```

In development, Vite proxies `/api` and `/ws` to `http://localhost:4000`. Start the [backend](https://github.com/praisecyber/BETTINGIFY-BACKEND) separately. Run `npm run typecheck` and `npm run build` to validate a production web build.

## Mobile builds

Installed mobile apps require a public HTTPS backend; they cannot connect to a backend running on the developer's computer. On first launch, enter the HTTPS API URL ending in `/api/v1`. The Aviator secure WebSocket URL is derived automatically, or can be supplied separately using WSS. To set deployment URLs at build time, copy `.env.mobile.example` to `.env.mobile` and replace the example URLs.

```bash
npm run mobile:android
npm run mobile:ios
```

The Android command creates a debug APK under `android/app/build/outputs/apk/debug/`; Android SDK tooling is required. The iOS command opens the Xcode project and requires macOS and Xcode. Configure release signing before distributing store builds.

## Keep credentials server-side

The frontend must not contain provider API keys, payment credentials, database credentials, or server signing secrets. Configure those only in the backend's private environment. `.env.mobile` is ignored by Git; it should contain only public API and WebSocket endpoint URLs, never keys.
