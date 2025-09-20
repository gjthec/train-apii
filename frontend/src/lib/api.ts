import {
  collection,
  getDocs,
  orderBy,
  query,
  type DocumentData,
  type FirestoreDataConverter
} from 'firebase/firestore';

import { getDb, requireUid } from '@/lib/firebase';

type IsoDateString = string;

type TimestampLike = { toDate: () => Date };

const isTimestampLike = (value: unknown): value is TimestampLike =>
  typeof value === 'object' && value !== null && typeof (value as TimestampLike).toDate === 'function';

const toIsoDate = (value: unknown): IsoDateString | undefined => {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (isTimestampLike(value)) {
    return value.toDate().toISOString();
  }

  return undefined;
};

const toStringOrUndefined = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const toStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const result = value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  return result.length > 0 ? result : undefined;
};

const toNumberOrUndefined = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

export interface ExerciseClass {
  id: string;
  name: string;
  description?: string;
  createdAt?: IsoDateString;
  sessions?: string[];
  totalDuration?: string;
}

export interface Workout {
  id: string;
  name: string;
  focus?: string;
  difficulty?: string;
  exerciseCount?: number;
  estimatedDuration?: string;
  summary?: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup?: string;
  modality?: string;
  description?: string;
  equipment?: string;
  sets?: number;
  repetitions?: number;
  rest?: string;
}

export interface Session {
  id: string;
  title: string;
  status?: string;
  description?: string;
  start?: IsoDateString;
  duration?: string;
  className?: string;
}

const createExerciseClassConverter = (): FirestoreDataConverter<ExerciseClass> => ({
  toFirestore() {
    throw new Error('Serialization is not supported on the client.');
  },
  fromFirestore(snapshot) {
    const data: DocumentData = snapshot.data();
    return {
      id: snapshot.id,
      name: toStringOrUndefined(data.name) ?? 'Aula sem nome',
      description: toStringOrUndefined(data.description),
      createdAt: toIsoDate(data.createdAt),
      sessions: toStringArray(data.sessions),
      totalDuration: toStringOrUndefined(data.totalDuration)
    };
  }
});

const createWorkoutConverter = (): FirestoreDataConverter<Workout> => ({
  toFirestore() {
    throw new Error('Serialization is not supported on the client.');
  },
  fromFirestore(snapshot) {
    const data: DocumentData = snapshot.data();
    return {
      id: snapshot.id,
      name: toStringOrUndefined(data.name) ?? 'Treino sem nome',
      focus: toStringOrUndefined(data.focus),
      difficulty: toStringOrUndefined(data.difficulty),
      exerciseCount: toNumberOrUndefined(data.exerciseCount),
      estimatedDuration: toStringOrUndefined(data.estimatedDuration),
      summary: toStringOrUndefined(data.summary)
    };
  }
});

const createExerciseConverter = (): FirestoreDataConverter<Exercise> => ({
  toFirestore() {
    throw new Error('Serialization is not supported on the client.');
  },
  fromFirestore(snapshot) {
    const data: DocumentData = snapshot.data();
    return {
      id: snapshot.id,
      name: toStringOrUndefined(data.name) ?? 'Exercício sem nome',
      muscleGroup: toStringOrUndefined(data.muscleGroup),
      modality: toStringOrUndefined(data.modality),
      description: toStringOrUndefined(data.description),
      equipment: toStringOrUndefined(data.equipment),
      sets: toNumberOrUndefined(data.sets),
      repetitions: toNumberOrUndefined(data.repetitions),
      rest: toStringOrUndefined(data.rest)
    };
  }
});

const createSessionConverter = (): FirestoreDataConverter<Session> => ({
  toFirestore() {
    throw new Error('Serialization is not supported on the client.');
  },
  fromFirestore(snapshot) {
    const data: DocumentData = snapshot.data();
    return {
      id: snapshot.id,
      title: toStringOrUndefined(data.title) ?? 'Sessão sem título',
      status: toStringOrUndefined(data.status),
      description: toStringOrUndefined(data.description),
      start: toIsoDate(data.start ?? data.date),
      duration: toStringOrUndefined(data.duration),
      className: toStringOrUndefined(data.className)
    };
  }
});

async function fetchOrderedUserCollection<T>(
  collectionName: string,
  orderField: string,
  converter: FirestoreDataConverter<T>
): Promise<T[]> {
  const uid = await requireUid();
  const db = getDb();
  const ref = collection(db, `users/${uid}/${collectionName}`).withConverter(converter);
  const snapshot = await getDocs(query(ref, orderBy(orderField, 'desc')));
  return snapshot.docs.map((doc) => doc.data());
}

export async function fetchExerciseClasses(): Promise<ExerciseClass[]> {
  return fetchOrderedUserCollection('exerciseClasses', 'createdAt', createExerciseClassConverter());
}

export async function fetchWorkouts(): Promise<Workout[]> {
  return fetchOrderedUserCollection('workouts', 'createdAt', createWorkoutConverter());
}

export async function fetchExercises(): Promise<Exercise[]> {
  return fetchOrderedUserCollection('exercises', 'createdAt', createExerciseConverter());
}

export async function fetchSessions(): Promise<Session[]> {
  return fetchOrderedUserCollection('sessions', 'date', createSessionConverter());
}
