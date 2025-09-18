import { initializeApp, getApps } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function assertConfig() {
  if (!firebaseConfig.apiKey) {
    throw new Error(
      'Configuração do Firebase ausente. Defina as variáveis NEXT_PUBLIC_FIREBASE_*.'
    );
  }
}

export function getFirebaseApp() {
  assertConfig();
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  return getApps()[0];
}

let analyticsPromise;

export function initAnalytics() {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  if (!analyticsPromise) {
    analyticsPromise = import('firebase/analytics')
      .then(async ({ getAnalytics, isSupported }) => {
        const supported = await isSupported();
        if (!supported) return null;
        return getAnalytics(getFirebaseApp());
      })
      .catch(() => null);
  }

  return analyticsPromise;
}
