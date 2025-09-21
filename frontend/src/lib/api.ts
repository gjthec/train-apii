import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
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

const sanitizeOptionalNumberInput = (value: number | string | undefined): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim();
    if (!normalized) {
      return undefined;
    }

    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const sanitizeOptionalIntegerInput = (value: number | string | undefined): number | undefined => {
  const numeric = sanitizeOptionalNumberInput(value);
  if (typeof numeric !== 'number') {
    return undefined;
  }

  const rounded = Math.round(numeric);
  return Number.isFinite(rounded) ? rounded : undefined;
};

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const resolveScheduledForDate = (value?: string): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateForInput(parsed);
    }
  }

  return formatDateForInput(new Date());
};

const normalizeStoredDate = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateForInput(parsed);
  }

  return undefined;
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

export interface WorkoutSession {
  id: string;
  scheduledFor: IsoDateString;
  notes?: string;
  exercises: WorkoutExercise[];
  exerciseCount: number;
  totalSets: number;
  createdAt?: IsoDateString;
  updatedAt?: IsoDateString;
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
  sessions: WorkoutSession[];
  sessionCount: number;
  lastSessionOn?: IsoDateString;
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

export interface NewExerciseInput {
  name: string;
  muscleGroup?: string;
  modality?: string;
  description?: string;
  equipment?: string;
  sets?: number | string;
  repetitions?: number | string;
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
  workoutId?: string;
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

const sortSessionsByDateDesc = (sessions: WorkoutSession[]): WorkoutSession[] => {
  return [...sessions].sort((a, b) => {
    const aValue = Date.parse(`${a.scheduledFor}T00:00:00`);
    const bValue = Date.parse(`${b.scheduledFor}T00:00:00`);
    return Number.isNaN(bValue) ? -1 : Number.isNaN(aValue) ? 1 : bValue - aValue;
  });
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

const toWorkoutSessions = (value: unknown): WorkoutSession[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const sessions: WorkoutSession[] = [];

  value.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) {
      return;
    }

    const asRecord = item as Record<string, unknown>;
    const scheduledFor = normalizeStoredDate(asRecord.scheduledFor ?? asRecord.date);
    if (!scheduledFor) {
      return;
    }

    const exercises = toWorkoutExercises(asRecord.exercises);
    if (exercises.length === 0) {
      return;
    }

    const exerciseCount = exercises.length;
    const totalSets = exercises.reduce((total, exercise) => total + exercise.seriesCount, 0);

    sessions.push({
      id: ensureIdentifier('session', index, asRecord.id),
      scheduledFor,
      notes: toStringOrUndefined(asRecord.notes),
      exercises,
      exerciseCount,
      totalSets,
      createdAt: toIsoDate(asRecord.createdAt),
      updatedAt: toIsoDate(asRecord.updatedAt)
    });
  });

  return sortSessionsByDateDesc(sessions);
};

const createWorkoutClassConverter = (): FirestoreDataConverter<WorkoutClass> => ({
  toFirestore() {
    throw new Error('Serialization is not supported on the client.');
  },
  fromFirestore(snapshot) {
    const data: DocumentData = snapshot.data();
    let sessions = toWorkoutSessions(data.sessions);

    if (sessions.length === 0) {
      const fallbackExercises = toWorkoutExercises(data.exercises);
      if (fallbackExercises.length > 0) {
        const fallbackDate =
          normalizeStoredDate(data.scheduledFor) ??
          normalizeStoredDate(data.updatedAt) ??
          normalizeStoredDate(data.createdAt) ??
          formatDateForInput(new Date());

        const fallbackTotalSets = fallbackExercises.reduce(
          (total, exercise) => total + exercise.seriesCount,
          0
        );

        sessions = [
          {
            id: ensureIdentifier('session', 0, undefined),
            scheduledFor: fallbackDate,
            notes: toStringOrUndefined(data.notes),
            exercises: fallbackExercises,
            exerciseCount: fallbackExercises.length,
            totalSets: fallbackTotalSets,
            createdAt: toIsoDate(data.createdAt),
            updatedAt: toIsoDate(data.updatedAt)
          }
        ];
      }
    }

    const latestSession = sessions[0];
    const exercises = latestSession?.exercises ?? toWorkoutExercises(data.exercises);
    const exerciseCount = latestSession?.exerciseCount ?? exercises.length;
    const totalSets = latestSession?.totalSets ?? exercises.reduce((total, exercise) => total + exercise.seriesCount, 0);
    const scheduledFor =
      latestSession?.scheduledFor ??
      normalizeStoredDate(data.scheduledFor) ??
      normalizeStoredDate(data.updatedAt) ??
      normalizeStoredDate(data.createdAt);

    return {
      id: snapshot.id,
      name: toStringOrUndefined(data.name) ?? 'Treino sem nome',
      focus: toStringOrUndefined(data.focus),
      scheduledFor,
      notes: toStringOrUndefined(data.notes),
      exercises,
      exerciseCount,
      totalSets,
      createdAt: toIsoDate(data.createdAt),
      updatedAt: toIsoDate(data.updatedAt),
      sessions,
      sessionCount: sessions.length,
      lastSessionOn: sessions[0]?.scheduledFor
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

const serializeWorkoutExercise = (exercise: WorkoutExercise) => ({
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
});

const serializeWorkoutSession = (session: WorkoutSession) => ({
  id: session.id,
  scheduledFor: session.scheduledFor,
  ...(session.notes ? { notes: session.notes } : {}),
  exercises: session.exercises.map(serializeWorkoutExercise),
  exerciseCount: session.exerciseCount,
  totalSets: session.totalSets,
  ...(session.createdAt ? { createdAt: session.createdAt } : {}),
  ...(session.updatedAt ? { updatedAt: session.updatedAt } : {})
});

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
  const scheduledFor = resolveScheduledForDate(input.scheduledFor);

  const exercises = input.exercises.map(sanitizeWorkoutExerciseInput);
  const totalSets = exercises.reduce((total, exercise) => total + exercise.seriesCount, 0);

  const uid = await requireUid();
  const db = getDb();
  const nowIso = new Date().toISOString();
  const session: WorkoutSession = {
    id: ensureIdentifier('session', Date.now(), undefined),
    scheduledFor,
    notes,
    exercises,
    exerciseCount: exercises.length,
    totalSets,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  const existingWorkoutId = sanitizeOptionalString(input.workoutId);

  if (existingWorkoutId) {
    const workoutRef = doc(db, `users/${uid}/workouts/${existingWorkoutId}`);
    const snapshot = await getDoc(workoutRef);

    if (!snapshot.exists()) {
      throw new Error('O treino selecionado não foi encontrado.');
    }

    const data = snapshot.data() as DocumentData;
    const existingSessions = toWorkoutSessions(data.sessions);
    const mergedSessions = sortSessionsByDateDesc([
      session,
      ...existingSessions.filter((existing) => existing.id !== session.id)
    ]);
    const serializedSessions = mergedSessions.map(serializeWorkoutSession);
    const existingCreatedAt = toIsoDate(data.createdAt) ?? nowIso;
    const nextFocus = focus ?? toStringOrUndefined(data.focus);
    const nextNotes = notes ?? toStringOrUndefined(data.notes);

    const updatePayload: Record<string, unknown> = {
      name,
      sessions: serializedSessions,
      sessionCount: mergedSessions.length,
      scheduledFor: session.scheduledFor,
      exerciseCount: session.exerciseCount,
      totalSets: session.totalSets,
      lastSessionOn: session.scheduledFor,
      updatedAt: nowIso
    };

    if (nextFocus) {
      updatePayload.focus = nextFocus;
    }

    if (nextNotes) {
      updatePayload.notes = nextNotes;
    }

    await updateDoc(workoutRef, updatePayload);

    return {
      id: existingWorkoutId,
      name,
      focus: nextFocus,
      scheduledFor: session.scheduledFor,
      notes: nextNotes,
      exercises: session.exercises,
      exerciseCount: session.exerciseCount,
      totalSets: session.totalSets,
      createdAt: existingCreatedAt,
      updatedAt: nowIso,
      sessions: mergedSessions,
      sessionCount: mergedSessions.length,
      lastSessionOn: session.scheduledFor
    } satisfies WorkoutClass;
  }

  const workoutsCollection = collection(db, `users/${uid}/workouts`);
  const docRef = await addDoc(workoutsCollection, {
    name,
    ...(focus ? { focus } : {}),
    ...(notes ? { notes } : {}),
    sessions: [serializeWorkoutSession(session)],
    sessionCount: 1,
    scheduledFor: session.scheduledFor,
    exerciseCount: session.exerciseCount,
    totalSets: session.totalSets,
    lastSessionOn: session.scheduledFor,
    createdAt: nowIso,
    updatedAt: nowIso
  });

  return {
    id: docRef.id,
    name,
    focus,
    scheduledFor: session.scheduledFor,
    notes,
    exercises: session.exercises,
    exerciseCount: session.exerciseCount,
    totalSets: session.totalSets,
    createdAt: nowIso,
    updatedAt: nowIso,
    sessions: [session],
    sessionCount: 1,
    lastSessionOn: session.scheduledFor
  } satisfies WorkoutClass;
}

export async function deleteWorkoutClass(workoutId: string): Promise<void> {
  const sanitizedId = sanitizeOptionalString(workoutId);
  if (!sanitizedId) {
    throw new Error('Treino inválido para exclusão.');
  }

  const uid = await requireUid();
  const db = getDb();
  const workoutRef = doc(db, `users/${uid}/workouts/${sanitizedId}`);
  await deleteDoc(workoutRef);
}

export async function createExercise(input: NewExerciseInput): Promise<Exercise> {
  const name = sanitizeOptionalString(input.name);
  if (!name) {
    throw new Error('Informe um nome para o exercício.');
  }

  const muscleGroup = sanitizeOptionalString(input.muscleGroup);
  const modality = sanitizeOptionalString(input.modality);
  const description = sanitizeOptionalString(input.description);
  const equipment = sanitizeOptionalString(input.equipment);
  const sets = sanitizeOptionalIntegerInput(input.sets);
  const repetitions = sanitizeOptionalIntegerInput(input.repetitions);
  const rest = sanitizeOptionalString(input.rest);
  const uid = await requireUid();
  const db = getDb();
  const exercisesCollection = collection(db, `users/${uid}/exercises`);
  const docRef = await addDoc(exercisesCollection, {
    name,
    ...(muscleGroup ? { muscleGroup } : {}),
    ...(modality ? { modality } : {}),
    ...(description ? { description } : {}),
    ...(equipment ? { equipment } : {}),
    ...(typeof sets === 'number' ? { sets } : {}),
    ...(typeof repetitions === 'number' ? { repetitions } : {}),
    ...(rest ? { rest } : {}),
    createdAt: serverTimestamp()
  });

  return {
    id: docRef.id,
    name,
    muscleGroup: muscleGroup ?? undefined,
    modality: modality ?? undefined,
    description: description ?? undefined,
    equipment: equipment ?? undefined,
    sets: sets ?? undefined,
    repetitions: repetitions ?? undefined,
    rest: rest ?? undefined
  } satisfies Exercise;
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

export async function deleteMuscleGroupClass(groupId: string): Promise<void> {
  const sanitizedId = sanitizeOptionalString(groupId);
  if (!sanitizedId) {
    throw new Error('Grupo muscular inválido para exclusão.');
  }

  const uid = await requireUid();
  const db = getDb();
  const groupRef = doc(db, `users/${uid}/muscleGroups/${sanitizedId}`);
  await deleteDoc(groupRef);
}

export async function fetchExercises(): Promise<Exercise[]> {
  return fetchOrderedUserCollection('exercises', 'createdAt', createExerciseConverter());
}

export async function fetchSessions(): Promise<Session[]> {
  return fetchOrderedUserCollection('sessions', 'date', createSessionConverter());
}
