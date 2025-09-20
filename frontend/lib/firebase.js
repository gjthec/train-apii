import { initializeApp, getApps } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyC0H-eaNx9CFZ_doVuaNT_dAOscjl1fMDk',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'train-apii.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'train-apii',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'train-apii.appspot.com', // << ajuste
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '310943400718',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:310943400718:web:25c50c90a259370b870d5f',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-GD2SNF7411',
};

function assertConfig() {
  // valida só o essencial pro Auth não quebrar
  const required = ['apiKey', 'authDomain', 'projectId', 'appId'];
  for (const k of required) {
    if (!firebaseConfig[k]) {
      throw new Error(`Configuração do Firebase ausente: ${k}. Defina as variáveis NEXT_PUBLIC_FIREBASE_*.`);
    }
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
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (!analyticsPromise) {
    analyticsPromise = import('firebase/analytics')
      .then(async ({ getAnalytics, isSupported }) => {
        const supported = await isSupported();
        if (!supported) return null;
        console.log('app options:', getFirebaseApp().options);
        return getAnalytics(getFirebaseApp());
      })
      .catch(() => null);
  }
  return analyticsPromise;
}
