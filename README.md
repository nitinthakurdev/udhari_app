# Udhari mobile app

Expo 57 app for managing Udhari businesses and account connections. Application state is stored with Zustand, server state is handled by TanStack Query, and API requests use Axios.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_API_URL` to the backend `/api/v1` URL. Use your computer's LAN address for a physical phone. The Android Emulator defaults to `http://10.0.2.2:4001/api/v1`; iOS Simulator and web default to `http://localhost:4001/api/v1` during development.

3. Start Expo:

   ```bash
   npx expo start
   ```

## Local EAS builds

The `local` EAS profile builds the app against the staging API at
`https://staging-api.udhari.in/api/v1`.

```bash
eas build --local --profile local --platform android
eas build --local --profile local --platform ios
```

## Available flows

- Register, verify email, sign in, reset password, and change password
- Create, edit, select, default, and delete owned businesses
- Debounced business suggestions and business connection management
- Connected-user results scoped to the currently selected owned business
- Secure persisted authentication on native platforms

## Checks

```bash
npx tsc --noEmit
npm run lint
npx expo export --platform web
```
