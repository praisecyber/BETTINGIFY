# Bettingify Frontend

React, TypeScript, and Vite client for Bettingify. The app can run in a browser, as an Android/iOS Capacitor app, or as the Electron desktop app.

## Web development

```bash
npm install
npm run dev
```

In development, Vite proxies `/api` and `/ws` to `http://localhost:4000`. Start the [backend](https://github.com/praisecyber/BETTINGIFY-BACKEND) separately. Run `npm run typecheck` and `npm run build` to validate a production web build.

## Deploy the frontend to Vercel

Import `praisecyber/BETTINGIFY` as a Vite project with the frontend repository as the project root. Vercel uses `npm ci`, `npm run build`, and `dist` from [`vercel.json`](./vercel.json). Set these public URL-only project environment variables to the separately deployed backend:

- `VITE_API_URL=https://<your-backend-host>/api/v1`
- `VITE_WS_URL=wss://<your-backend-host>/ws/aviator`

Add the exact Vercel production/preview origins that need login to the backend `CORS_ORIGINS` setting. Keep provider keys and signing secrets exclusively in the backend environment. Vercel deployment requires signing in to Vercel and connecting the GitHub project.

## Mobile builds

Installed mobile apps require a public HTTPS backend; they cannot connect to a backend running on the developer's computer. On first launch, enter the HTTPS API URL ending in `/api/v1`. The Aviator secure WebSocket URL is derived automatically, or can be supplied separately using WSS. To set deployment URLs at build time, copy `.env.mobile.example` to `.env.mobile` and replace the example URLs.

```bash
npm run mobile:android
npm run mobile:ios
```

The Android command creates a debug APK under `android/app/build/outputs/apk/debug/`; Android SDK tooling is required. The iOS command opens the Xcode project and requires macOS and Xcode. Configure release signing before distributing store builds.

## Desktop app

`npm run desktop:dev` starts the Electron app with its bundled backend. `npm run desktop:package` creates installers with the Bettingify icon assets in `desktop/icons`. The desktop window uses isolated, sandboxed renderer settings.

## Sign-in and administration

Access tokens remain in memory; rotating refresh tokens are held in `HttpOnly` cookies rather than browser storage. Production deployments must use HTTPS and configure the exact web/native frontend origins in the backend's `CORS_ORIGINS`. Sign in to `#/admin` with the initial admin account provisioned from the backend's private environment. Existing admins can create additional administrator accounts in the Administrators tab.

## Keep credentials server-side

The frontend must not contain provider API keys, payment credentials, database credentials, or server signing secrets. Configure those only in the backend's private environment. `.env.mobile` is ignored by Git; it should contain only public API and WebSocket endpoint URLs, never keys.
