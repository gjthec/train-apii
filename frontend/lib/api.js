import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { getFirebaseApp } from '@/lib/firebase';

const DEFAULT_USER_ID = process.env.NEXT_PUBLIC_DEFAULT_USER_ID ?? '';

function getDb() {
  return getFirestore(getFirebaseApp());
}

function normalizeValue(value) {
  if (value === undefined || value === null) return value;
  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, normalizeValue(val)])
    );
  }
  return value;
}

function mapDocument(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...normalizeValue(data),
  };
}

function ensureUserId() {
  if (!DEFAULT_USER_ID) {
    throw new Error(
      'Defina NEXT_PUBLIC_DEFAULT_USER_ID para filtrar os dados do Firebase.'
    );
  }
  return DEFAULT_USER_ID;
}

export async function fetchExerciseClasses() {
  const userId = ensureUserId();
  const classesQuery = query(
    collection(getDb(), 'exerciseClasses'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(classesQuery);
  const classes = snapshot.docs.map(mapDocument);
  classes.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
  return classes;
}

export async function fetchWorkouts() {
  const userId = ensureUserId();
  const workoutsQuery = query(
    collection(getDb(), 'workouts'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(workoutsQuery);
  const workouts = snapshot.docs.map(mapDocument);
  workouts.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
  return workouts;
}

export async function fetchExercises() {
  const userId = ensureUserId();
  const exercisesQuery = query(
    collection(getDb(), 'exercises'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(exercisesQuery);
  const exercises = snapshot.docs.map(mapDocument);
  exercises.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
  return exercises;
}

export async function fetchSessions() {
  const userId = ensureUserId();
  const sessionsQuery = query(
    collection(getDb(), 'sessions'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(sessionsQuery);
  const sessions = snapshot.docs.map(mapDocument);
  sessions.sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  });
  return sessions;
}
