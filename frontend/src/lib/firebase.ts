import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getApp, getApps, initializeApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

export type FirebaseConfig = Pick<FirebaseOptions, 'apiKey' | 'authDomain' | 'projectId' | 'storageBucket' | 'messagingSenderId' | 'appId' | 'measurementId'>;

let app: FirebaseApp | null = null;

function readFirebaseConfig(): FirebaseConfig {
  const config: FirebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  };

  const requiredKeys: Array<keyof FirebaseConfig> = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missing = requiredKeys.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing Firebase configuration values: ${missing.join(', ')}`);
  }

  return config;
}

export function getFirebaseApp(): FirebaseApp {
  if (app) {
    return app;
  }

  if (getApps().length > 0) {
    app = getApp();
    return app;
  }

  app = initializeApp(readFirebaseConfig());
  return app;
}

export function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export async function getClientAuth(): Promise<Auth> {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth is only available in the browser.');
  }

  const { getAuth } = await import('firebase/auth');
  return getAuth(getFirebaseApp());
}

export async function requireUid(): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('requireUid can only be called in the browser.');
  }

  const { browserLocalPersistence, onAuthStateChanged, setPersistence, signInAnonymously } = await import(
    'firebase/auth'
  );

  const auth = await getClientAuth();
  await setPersistence(auth, browserLocalPersistence);

  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      const authError = error as { code?: string; message?: string } | undefined;
      if (authError?.code === 'auth/operation-not-allowed') {
        throw new Error('Enable Anonymous sign-in in Firebase Authentication → Sign-in method.');
      }
      throw error;
    }
  }

  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }

  return new Promise<string>((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        if (user?.uid) {
          resolve(user.uid);
        } else {
          reject(new Error('User is not signed in.'));
        }
      },
      (err) => {
        unsubscribe();
        reject(err);
      }
    );
  });
}
