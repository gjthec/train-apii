import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getApp, getApps, initializeApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import { doc, getFirestore, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';

export type FirebaseConfig = Pick<FirebaseOptions, 'apiKey' | 'authDomain' | 'projectId' | 'storageBucket' | 'messagingSenderId' | 'appId' | 'measurementId'>;

let app: FirebaseApp | null = null;
let lastSyncedProfileUid: string | null = null;

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

const dedupeProviderIds = (user: User): string[] => {
  const providerIds = user.providerData
    .map((info) => info?.providerId)
    .filter((providerId): providerId is string => Boolean(providerId));
  return Array.from(new Set(providerIds));
};

async function syncUserProfile(user: User): Promise<void> {
  if (lastSyncedProfileUid === user.uid) {
    return;
  }

  const db = getDb();
  const profileRef = doc(db, 'users', user.uid);
  await setDoc(
    profileRef,
    {
      displayName: user.displayName ?? null,
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
      providerIds: dedupeProviderIds(user),
      isAnonymous: user.isAnonymous,
      createdAt: user.metadata?.creationTime ?? null,
      lastSignInAt: user.metadata?.lastSignInTime ?? null,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  lastSyncedProfileUid = user.uid;
}

export async function requireUid(): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('requireUid can only be called in the browser.');
  }

  const { browserLocalPersistence, onAuthStateChanged, setPersistence } = await import('firebase/auth');

  const auth = await getClientAuth();
  await setPersistence(auth, browserLocalPersistence);

  const currentUser = auth.currentUser;
  if (currentUser?.uid && !currentUser.isAnonymous) {
    await syncUserProfile(currentUser);
    return currentUser.uid;
  }

  return new Promise<string>((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();

        if (user?.uid && !user.isAnonymous) {
          void syncUserProfile(user).catch((error) => {
            console.error('Failed to sync user profile', error);
          });
          resolve(user.uid);
          return;
        }

        reject(new Error('User is not signed in.'));
      },
      (err) => {
        unsubscribe();
        reject(err);
      }
    );
  });
}

export interface AuthenticatedUserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  providerIds: string[];
  isAnonymous: boolean;
}

export async function signInWithGoogle(): Promise<AuthenticatedUserProfile> {
  if (typeof window === 'undefined') {
    throw new Error('Google sign-in is only available in the browser.');
  }

  const auth = await getClientAuth();
  const {
    browserLocalPersistence,
    GoogleAuthProvider,
    linkWithPopup,
    setPersistence,
    signInWithPopup
  } = await import('firebase/auth');

  await setPersistence(auth, browserLocalPersistence);

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  let user: User | null = auth.currentUser ?? null;

  try {
    if (user && user.isAnonymous) {
      try {
        const result = await linkWithPopup(user, provider);
        user = result.user;
      } catch (linkError) {
        const authError = linkError as { code?: string; message?: string } | undefined;
        if (authError?.code === 'auth/credential-already-in-use') {
          const result = await signInWithPopup(auth, provider);
          user = result.user;
        } else {
          throw linkError;
        }
      }
    } else {
      const result = await signInWithPopup(auth, provider);
      user = result.user;
    }
  } catch (error) {
    const authError = error as { code?: string; message?: string } | undefined;
    if (authError?.code === 'auth/popup-closed-by-user') {
      throw new Error('A janela de login foi fechada antes de concluir a autenticação.');
    }
    if (authError?.code === 'auth/cancelled-popup-request') {
      throw new Error('Existe uma solicitação de login em andamento. Tente novamente.');
    }
    throw error instanceof Error ? error : new Error('Não foi possível autenticar com o Google.');
  }

  if (!user) {
    throw new Error('Não foi possível recuperar as informações do usuário autenticado.');
  }

  await syncUserProfile(user);

  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    providerIds: dedupeProviderIds(user),
    isAnonymous: user.isAnonymous
  };
}

export async function signOutClient(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const auth = await getClientAuth();
  const { signOut } = await import('firebase/auth');
  await signOut(auth);
  lastSyncedProfileUid = null;
}
