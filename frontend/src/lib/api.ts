import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
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

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const toInteger = (value: unknown): number | undefined => {
  const numeric = toFiniteNumber(value);
  if (typeof numeric !== 'number') {
    return undefined;
  }

  const rounded = Math.round(numeric);
  return Number.isFinite(rounded) ? rounded : undefined;
};

const ensureIdentifier = (prefix: string, fallbackIndex: number, value?: unknown): string => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${fallbackIndex}`;
};

const sanitizeOptionalString = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export interface ExerciseClass {
  id: string;
  name: string;
  description?: string;
  createdAt?: IsoDateString;
  sessions?: string[];
  totalDuration?: string;
}

export interface WorkoutSet {
  id: string;
  order: number;
  weightKg: number;
  repetitions: number;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  muscleGroup?: string;
  notes?: string;
  sets: WorkoutSet[];
  seriesCount: number;
}

export interface WorkoutClass {
  id: string;
  name: string;
  focus?: string;
  scheduledFor?: IsoDateString;
  notes?: string;
  exercises: WorkoutExercise[];
  exerciseCount: number;
  totalSets: number;
  createdAt?: IsoDateString;
  updatedAt?: IsoDateString;
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

export interface MuscleGroupClass {
  id: string;
  name: string;
  description?: string;
  createdAt?: IsoDateString;
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

export interface WorkoutSetInput {
  id?: string;
  weightKg?: number | string;
  repetitions?: number | string;
}

export interface WorkoutExerciseInput {
  id?: string;
  name: string;
  muscleGroup?: string;
  notes?: string;
  sets: WorkoutSetInput[];
}

export interface NewWorkoutClassInput {
  name: string;
  focus?: string;
  scheduledFor?: string;
  notes?: string;
  exercises: WorkoutExerciseInput[];
}

export interface NewMuscleGroupClassInput {
  name: string;
  description?: string;
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

const toWorkoutSets = (value: unknown): WorkoutSet[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const sets: WorkoutSet[] = [];

  value.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) {
      return;
    }

    const asRecord = item as Record<string, unknown>;
    const weightKg = toFiniteNumber(asRecord.weightKg);
    const repetitions = toInteger(asRecord.repetitions);

    if (typeof weightKg !== 'number' || typeof repetitions !== 'number') {
      return;
    }

    sets.push({
      id: ensureIdentifier('set', index, asRecord.id),
      order:
        typeof asRecord.order === 'number' && Number.isFinite(asRecord.order)
          ? asRecord.order
          : index + 1,
      weightKg,
      repetitions
    });
  });

  return sets;
};

const toWorkoutExercises = (value: unknown): WorkoutExercise[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const exercises: WorkoutExercise[] = [];

  value.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) {
      return;
    }

    const asRecord = item as Record<string, unknown>;
    const name = toStringOrUndefined(asRecord.name);
    if (!name) {
      return;
    }

    const sets = toWorkoutSets(asRecord.sets);
    if (sets.length === 0) {
      return;
    }

    exercises.push({
      id: ensureIdentifier('exercise', index, asRecord.id),
      name,
      muscleGroup: toStringOrUndefined(asRecord.muscleGroup),
      notes: toStringOrUndefined(asRecord.notes),
      sets,
      seriesCount: sets.length
    });
  });

  return exercises;
};

const createWorkoutClassConverter = (): FirestoreDataConverter<WorkoutClass> => ({
  toFirestore() {
    throw new Error('Serialization is not supported on the client.');
  },
  fromFirestore(snapshot) {
    const data: DocumentData = snapshot.data();
    const exercises = toWorkoutExercises(data.exercises);
    const totalSets = exercises.reduce((total, exercise) => total + exercise.seriesCount, 0);

    return {
      id: snapshot.id,
      name: toStringOrUndefined(data.name) ?? 'Treino sem nome',
      focus: toStringOrUndefined(data.focus),
      scheduledFor: toIsoDate(data.scheduledFor),
      notes: toStringOrUndefined(data.notes),
      exercises,
      exerciseCount: exercises.length,
      totalSets,
      createdAt: toIsoDate(data.createdAt),
      updatedAt: toIsoDate(data.updatedAt)
    } satisfies WorkoutClass;
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

const createMuscleGroupClassConverter = (): FirestoreDataConverter<MuscleGroupClass> => ({
  toFirestore() {
    throw new Error('Serialization is not supported on the client.');
  },
  fromFirestore(snapshot) {
    const data: DocumentData = snapshot.data();
    return {
      id: snapshot.id,
      name: toStringOrUndefined(data.name) ?? 'Grupo muscular sem nome',
      description: toStringOrUndefined(data.description),
      createdAt: toIsoDate(data.createdAt)
    } satisfies MuscleGroupClass;
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

export async function fetchMuscleGroupClasses(): Promise<MuscleGroupClass[]> {
  return fetchOrderedUserCollection('muscleGroups', 'createdAt', createMuscleGroupClassConverter());
}

const sanitizeWorkoutSetInput = (
  set: WorkoutSetInput,
  exerciseLabel: string,
  index: number
): WorkoutSet => {
  const weightKg = toFiniteNumber(set.weightKg);
  const repetitions = toInteger(set.repetitions);

  if (typeof weightKg !== 'number' || typeof repetitions !== 'number') {
    throw new Error(`Informe peso e repetições válidos para a série ${index + 1} de ${exerciseLabel}.`);
  }

  return {
    id: ensureIdentifier('set', index, set.id),
    order: index + 1,
    weightKg,
    repetitions
  } satisfies WorkoutSet;
};

const sanitizeWorkoutExerciseInput = (
  exercise: WorkoutExerciseInput,
  index: number
): WorkoutExercise => {
  const name = sanitizeOptionalString(exercise.name);
  if (!name) {
    throw new Error(`Informe um nome para o exercício ${index + 1}.`);
  }

  if (!Array.isArray(exercise.sets) || exercise.sets.length === 0) {
    throw new Error(`Adicione ao menos uma série para o exercício "${name}".`);
  }

  const sets = exercise.sets.map((set, setIndex) => sanitizeWorkoutSetInput(set, name, setIndex));

  return {
    id: ensureIdentifier('exercise', index, exercise.id),
    name,
    muscleGroup: sanitizeOptionalString(exercise.muscleGroup),
    notes: sanitizeOptionalString(exercise.notes),
    sets,
    seriesCount: sets.length
  } satisfies WorkoutExercise;
};

export async function fetchWorkoutClasses(): Promise<WorkoutClass[]> {
  return fetchOrderedUserCollection('workouts', 'createdAt', createWorkoutClassConverter());
}

export async function createWorkoutClass(input: NewWorkoutClassInput): Promise<WorkoutClass> {
  const name = sanitizeOptionalString(input.name);
  if (!name) {
    throw new Error('Informe um nome para o treino.');
  }

  if (!Array.isArray(input.exercises) || input.exercises.length === 0) {
    throw new Error('Cadastre ao menos um exercício para o treino.');
  }

  const focus = sanitizeOptionalString(input.focus);
  const notes = sanitizeOptionalString(input.notes);
  const scheduledFor = sanitizeOptionalString(input.scheduledFor);

  const exercises = input.exercises.map(sanitizeWorkoutExerciseInput);
  const totalSets = exercises.reduce((total, exercise) => total + exercise.seriesCount, 0);

  const uid = await requireUid();
  const db = getDb();
  const workoutsCollection = collection(db, `users/${uid}/workouts`);
  const docRef = await addDoc(workoutsCollection, {
    name,
    ...(focus ? { focus } : {}),
    ...(notes ? { notes } : {}),
    ...(scheduledFor ? { scheduledFor } : {}),
    exercises: exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      ...(exercise.muscleGroup ? { muscleGroup: exercise.muscleGroup } : {}),
      ...(exercise.notes ? { notes: exercise.notes } : {}),
      sets: exercise.sets.map((set) => ({
        id: set.id,
        order: set.order,
        weightKg: set.weightKg,
        repetitions: set.repetitions
      })),
      seriesCount: exercise.seriesCount
    })),
    exerciseCount: exercises.length,
    totalSets,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return {
    id: docRef.id,
    name,
    focus,
    scheduledFor: scheduledFor ?? undefined,
    notes,
    exercises,
    exerciseCount: exercises.length,
    totalSets
  } satisfies WorkoutClass;
}

export async function createMuscleGroupClass(
  input: NewMuscleGroupClassInput
): Promise<MuscleGroupClass> {
  const name = sanitizeOptionalString(input.name);
  if (!name) {
    throw new Error('Informe um nome para o grupo muscular.');
  }

  const description = sanitizeOptionalString(input.description);
  const uid = await requireUid();
  const db = getDb();
  const groupsCollection = collection(db, `users/${uid}/muscleGroups`);
  const docRef = await addDoc(groupsCollection, {
    name,
    ...(description ? { description } : {}),
    createdAt: serverTimestamp()
  });

  return {
    id: docRef.id,
    name,
    description: description ?? undefined,
    createdAt: new Date().toISOString()
  } satisfies MuscleGroupClass;
}

export async function fetchExercises(): Promise<Exercise[]> {
  return fetchOrderedUserCollection('exercises', 'createdAt', createExerciseConverter());
}

export async function fetchSessions(): Promise<Session[]> {
  return fetchOrderedUserCollection('sessions', 'date', createSessionConverter());
}
