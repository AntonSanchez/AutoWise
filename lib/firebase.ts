import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  initializeAuth,
  reactNativeLocalPersistence,
  type Auth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// Firebase console → Project settings → General → Your apps → Web app (</>) → SDK setup and configuration.
// Values are read from .env as EXPO_PUBLIC_* so Expo bundles them into the app - see .env.example.
// These are not secret: they identify the project, they don't authorize access. Real access control
// lives in firestore.rules (Firestore only allows a signed-in user to read/write their own data).
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn(
    'AutoWise: Firebase config is missing. Copy .env.example to .env, fill in your project keys ' +
      '(Firebase console → Project settings → General → Your apps), then restart `expo start` with the cache cleared.',
  );
}

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// initializeAuth may only run once per app instance. Fast Refresh in development re-evaluates this
// module without restarting the app, so fall back to the already-initialized instance instead of
// crashing on "auth/already-initialized".
let authInstance: Auth;
try {
  authInstance = initializeAuth(firebaseApp, {
    persistence: Platform.OS === 'web' ? browserLocalPersistence : reactNativeLocalPersistence,
  });
} catch {
  authInstance = getAuth(firebaseApp);
}

export const auth = authInstance;
export const db = getFirestore(firebaseApp);
