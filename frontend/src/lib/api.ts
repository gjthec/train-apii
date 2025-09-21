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
  where,
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
  rpe?: number;
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
  templateId: string;
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
  difficulty?: string;
  scheduledFor?: IsoDateString;
  notes?: string;
  summary?: string;
  estimatedDuration?: string;
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
  rpe?: number | string;
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
    const rpe = toFiniteNumber(asRecord.rpe);

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
      repetitions,
      ...(typeof rpe === 'number' ? { rpe } : {})
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

async function fetchWorkoutSessionsGroupedByTemplate(
  uid: string,
  db: ReturnType<typeof getDb>
): Promise<Map<string, WorkoutSession[]>> {
  const grouped = new Map<string, WorkoutSession[]>();
  const sessionsRef = collection(db, `users/${uid}/workoutSessions`).withConverter(
    createWorkoutSessionConverter()
  );
  const snapshot = await getDocs(query(sessionsRef, orderBy('date', 'desc'), orderBy('createdAt', 'desc')));

  snapshot.docs.forEach((docSnap) => {
    try {
      const session = docSnap.data();
      const list = grouped.get(session.templateId);
      if (list) {
        list.push(session);
      } else {
        grouped.set(session.templateId, [session]);
      }
    } catch (error) {
      console.warn('Ignorando sessão de treino inválida', error);
    }
  });

  grouped.forEach((sessions, templateId) => {
    grouped.set(templateId, sortSessionsByDateDesc(sessions));
  });

  return grouped;
}

async function fetchSessionsForTemplate(
  uid: string,
  db: ReturnType<typeof getDb>,
  templateId: string
): Promise<WorkoutSession[]> {
  const sessions: WorkoutSession[] = [];
  const sessionsRef = collection(db, `users/${uid}/workoutSessions`).withConverter(
    createWorkoutSessionConverter()
  );
  const snapshot = await getDocs(
    query(sessionsRef, where('templateId', '==', templateId), orderBy('date', 'desc'), orderBy('createdAt', 'desc'))
  );

  snapshot.docs.forEach((docSnap) => {
    try {
      sessions.push(docSnap.data());
    } catch (error) {
      console.warn('Ignorando sessão de treino inválida', error);
    }
  });

  return sortSessionsByDateDesc(sessions);
}

async function loadWorkoutClass(
  uid: string,
  db: ReturnType<typeof getDb>,
  templateId: string
): Promise<WorkoutClass> {
  const workoutRef = doc(db, `users/${uid}/workouts/${templateId}`).withConverter(
    createWorkoutClassConverter()
  );
  const snapshot = await getDoc(workoutRef);
  if (!snapshot.exists()) {
    throw new Error('O treino selecionado não foi encontrado.');
  }

  const template = snapshot.data();
  const sessions = await fetchSessionsForTemplate(uid, db, templateId);
  const latestSession = sessions[0];
  const exerciseCount = latestSession?.exerciseCount ?? template.exerciseCount;
  const totalSets = latestSession?.totalSets ?? template.totalSets;
  const scheduledFor = latestSession?.scheduledFor ?? template.scheduledFor;

  return {
    ...template,
    notes: latestSession?.notes ?? template.notes,
    exercises: latestSession?.exercises ?? template.exercises,
    exerciseCount,
    totalSets,
    scheduledFor,
    sessions,
    sessionCount: sessions.length,
    lastSessionOn: sessions[0]?.scheduledFor ?? template.lastSessionOn
  } satisfies WorkoutClass;
}

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
    const exerciseCount =
      typeof data.exerciseCount === 'number' && Number.isFinite(data.exerciseCount)
        ? data.exerciseCount
        : exercises.length;
    const totalSets =
      typeof data.totalSets === 'number' && Number.isFinite(data.totalSets)
        ? data.totalSets
        : exercises.reduce((total, exercise) => total + exercise.seriesCount, 0);
    const lastSessionOn =
      normalizeStoredDate(data.lastSessionOn) ??
      normalizeStoredDate(data.scheduledFor) ??
      normalizeStoredDate(data.updatedAt) ??
      normalizeStoredDate(data.createdAt);

    return {
      id: snapshot.id,
      name: toStringOrUndefined(data.name) ?? 'Treino sem nome',
      focus: toStringOrUndefined(data.focus),
      scheduledFor: lastSessionOn,
      notes: toStringOrUndefined(data.notes),
      exercises,
      exerciseCount,
      totalSets,
      createdAt: toIsoDate(data.createdAt),
      updatedAt: toIsoDate(data.updatedAt),
      sessions: [],
      sessionCount:
        typeof data.sessionCount === 'number' && Number.isFinite(data.sessionCount)
          ? data.sessionCount
          : 0,
      lastSessionOn
    } satisfies WorkoutClass;
  }
});

const createWorkoutSessionConverter = (): FirestoreDataConverter<WorkoutSession> => ({
  toFirestore() {
    throw new Error('Serialization is not supported on the client.');
  },
  fromFirestore(snapshot) {
    const data: DocumentData = snapshot.data();
    const templateId = toStringOrUndefined(data.templateId);
    const scheduledFor =
      normalizeStoredDate(data.scheduledFor ?? data.date) ?? formatDateForInput(new Date());
    if (!templateId) {
      throw new Error('Sessão inválida sem template associado.');
    }

    const exercises = toWorkoutExercises(data.exercises);
    const exerciseCount =
      typeof data.exerciseCount === 'number' && Number.isFinite(data.exerciseCount)
        ? data.exerciseCount
        : exercises.length;
    const totalSets =
      typeof data.totalSets === 'number' && Number.isFinite(data.totalSets)
        ? data.totalSets
        : exercises.reduce((total, exercise) => total + exercise.seriesCount, 0);

    return {
      id: snapshot.id,
      templateId,
      scheduledFor,
      notes: toStringOrUndefined(data.notes),
      exercises,
      exerciseCount,
      totalSets,
      createdAt: toIsoDate(data.createdAt),
      updatedAt: toIsoDate(data.updatedAt)
    } satisfies WorkoutSession;
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
  const rpe = toFiniteNumber(set.rpe);

  if (typeof weightKg !== 'number' || typeof repetitions !== 'number') {
    throw new Error(`Informe peso e repetições válidos para a série ${index + 1} de ${exerciseLabel}.`);
  }

  return {
    id: ensureIdentifier('set', index, set.id),
    order: index + 1,
    weightKg,
    repetitions,
    ...(typeof rpe === 'number' ? { rpe } : {})
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
    repetitions: set.repetitions,
    ...(typeof set.rpe === 'number' ? { rpe: set.rpe } : {})
  })),
  seriesCount: exercise.seriesCount
});

export async function fetchWorkoutClasses(): Promise<WorkoutClass[]> {
  const uid = await requireUid();
  const db = getDb();
  const workoutsRef = collection(db, `users/${uid}/workouts`).withConverter(
    createWorkoutClassConverter()
  );
  const snapshot = await getDocs(query(workoutsRef, orderBy('createdAt', 'desc')));
  const templates = snapshot.docs.map((docSnap) => docSnap.data());

  if (templates.length === 0) {
    return [];
  }

  const sessionsByTemplate = await fetchWorkoutSessionsGroupedByTemplate(uid, db);

  return templates.map((template) => {
    const sessions = sessionsByTemplate.get(template.id) ?? [];
    const latestSession = sessions[0];
    const exerciseCount = latestSession?.exerciseCount ?? template.exerciseCount;
    const totalSets = latestSession?.totalSets ?? template.totalSets;
    const scheduledFor = latestSession?.scheduledFor ?? template.scheduledFor;

    return {
      ...template,
      notes: latestSession?.notes ?? template.notes,
      exercises: latestSession?.exercises ?? template.exercises,
      exerciseCount,
      totalSets,
      scheduledFor,
      sessions,
      sessionCount: sessions.length,
      lastSessionOn: sessions[0]?.scheduledFor ?? template.lastSessionOn
    } satisfies WorkoutClass;
  });
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

  const existingWorkoutId = sanitizeOptionalString(input.workoutId);

  if (existingWorkoutId) {
    const templateRef = doc(db, `users/${uid}/workouts/${existingWorkoutId}`).withConverter(
      createWorkoutClassConverter()
    );
    const templateSnapshot = await getDoc(templateRef);
    if (!templateSnapshot.exists()) {
      throw new Error('O treino selecionado não foi encontrado.');
    }

    const template = templateSnapshot.data();
    const sessionExercises = template.exercises.map((templateExercise, index) => {
      const matchingExercise =
        exercises.find((exercise) => exercise.id === templateExercise.id) ??
        exercises.find((exercise) => exercise.name === templateExercise.name);
      const setsSource = matchingExercise?.sets ?? templateExercise.sets;
      const sets = setsSource.map((set, setIndex) => ({
        id: ensureIdentifier('set', setIndex, set.id),
        order: setIndex + 1,
        weightKg: set.weightKg,
        repetitions: set.repetitions,
        ...(typeof set.rpe === 'number' ? { rpe: set.rpe } : {})
      }));

      return {
        id: templateExercise.id,
        name: templateExercise.name,
        muscleGroup: templateExercise.muscleGroup,
        notes: matchingExercise?.notes ?? templateExercise.notes,
        sets,
        seriesCount: sets.length
      } satisfies WorkoutExercise;
    });

    const sessionExerciseCount = sessionExercises.length;
    const sessionTotalSets = sessionExercises.reduce((total, exercise) => total + exercise.seriesCount, 0);
    const sessionsCollection = collection(db, `users/${uid}/workoutSessions`);
    await addDoc(sessionsCollection, {
      templateId: existingWorkoutId,
      date: scheduledFor,
      scheduledFor,
      ...(notes ? { notes } : {}),
      exercises: sessionExercises.map(serializeWorkoutExercise),
      exerciseCount: sessionExerciseCount,
      totalSets: sessionTotalSets,
      createdAt: nowIso,
      updatedAt: nowIso
    });

    await updateDoc(doc(db, `users/${uid}/workouts/${existingWorkoutId}`), {
      lastSessionOn: scheduledFor,
      sessionCount: (template.sessionCount ?? 0) + 1,
      scheduledFor,
      exerciseCount: template.exerciseCount,
      totalSets: template.totalSets,
      updatedAt: nowIso
    });

    return loadWorkoutClass(uid, db, existingWorkoutId);
  }

  const workoutsCollection = collection(db, `users/${uid}/workouts`);
  const docRef = await addDoc(workoutsCollection, {
    name,
    ...(focus ? { focus } : {}),
    ...(notes ? { notes } : {}),
    exercises: exercises.map(serializeWorkoutExercise),
    exerciseCount: exercises.length,
    totalSets,
    sessionCount: 0,
    scheduledFor,
    lastSessionOn: null,
    createdAt: nowIso,
    updatedAt: nowIso
  });

  const sessionsCollection = collection(db, `users/${uid}/workoutSessions`);
  await addDoc(sessionsCollection, {
    templateId: docRef.id,
    date: scheduledFor,
    scheduledFor,
    ...(notes ? { notes } : {}),
    exercises: exercises.map(serializeWorkoutExercise),
    exerciseCount: exercises.length,
    totalSets,
    createdAt: nowIso,
    updatedAt: nowIso
  });

  await updateDoc(doc(db, `users/${uid}/workouts/${docRef.id}`), {
    sessionCount: 1,
    lastSessionOn: scheduledFor,
    updatedAt: nowIso
  });

  return loadWorkoutClass(uid, db, docRef.id);
}

export async function deleteWorkoutClass(workoutId: string): Promise<void> {
  const sanitizedId = sanitizeOptionalString(workoutId);
  if (!sanitizedId) {
    throw new Error('Treino inválido para exclusão.');
  }

  const uid = await requireUid();
  const db = getDb();
  const workoutRef = doc(db, `users/${uid}/workouts/${sanitizedId}`);
  const sessionsRef = collection(db, `users/${uid}/workoutSessions`);
  const sessionsSnapshot = await getDocs(
    query(sessionsRef, where('templateId', '==', sanitizedId))
  );

  await Promise.all(sessionsSnapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
  await deleteDoc(workoutRef);
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
