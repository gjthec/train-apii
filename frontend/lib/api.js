import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { getFirebaseApp } from '@/lib/firebase';

function getDb() {
  return getFirestore(getFirebaseApp());
}

// --- login anônimo pra garantir uid em dev/cliente
export async function requireUid() {
  if (typeof window === 'undefined') {
    throw new Error('Auth só no cliente. Use Admin SDK no server.');
  }

  const app = getFirebaseApp();
  const auth = getAuth(app);

  await setPersistence(auth, browserLocalPersistence);

  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.error('signInAnonymously failed:', e && e.code, e && e.message);
      if (e && e.code === 'auth/operation-not-allowed') {
        throw new Error('Habilite "Anonymous" em Authentication → Sign-in method.');
      }
      throw e;
    }
  }

  if (auth.currentUser && auth.currentUser.uid) return auth.currentUser.uid;

  return await new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth,
      (u) => {
        unsub();
        u ? resolve(u.uid) : reject(new Error('Not signed in'));
      },
      (err) => {
        unsub();
        reject(err);
      }
    );
  });
}

function normalizeValue(value) {
  if (value === undefined || value === null) return value;
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString(); // Firestore Timestamp
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalizeValue(v)]));
  }
  return value;
}

function mapDocument(doc) {
  const data = doc.data();
  return { id: doc.id, ...normalizeValue(data) };
}

// ------------ SEM ÍNDICE COMPOSTO: coleções por usuário ------------
export async function fetchExerciseClasses() {
  const uid = await requireUid();
  const ref = collection(getDb(), `users/${uid}/exerciseClasses`);
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapDocument);
}

export async function fetchWorkouts() {
  const uid = await requireUid();
  const ref = collection(getDb(), `users/${uid}/workouts`);
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapDocument);
}

export async function fetchExercises() {
  const uid = await requireUid();
  const ref = collection(getDb(), `users/${uid}/exercises`);
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapDocument);
}

export async function fetchSessions() {
  const uid = await requireUid();
  const ref = collection(getDb(), `users/${uid}/sessions`);
  const q = query(ref, orderBy('date', 'desc')); // se seu campo é 'date'
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapDocument);
}
