// src/index.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import admin from 'firebase-admin';
import { z } from 'zod';

/** ============================
 *  Firebase Admin
 * ============================ */
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
  console.log('[Firestore] conectado com Service Account JSON');

  const projectId =
    admin.app().options?.credential?.projectId ||
    admin.app().options?.projectId ||
    '(desconhecido)';
  console.log('🔥 Firestore Project ID em uso:', projectId);
}
const db = admin.firestore();

/** ============================
 *  App Express
 * ============================ */
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health & debug
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/_debug/project', (_req, res) => {
  const projectId =
    admin.app().options?.credential?.projectId ||
    admin.app().options?.projectId ||
    '(desconhecido)';
  res.json({ projectId });
});

// Auth via X-API-Key
app.use((req, res, next) => {
  const requiredKey = process.env.API_KEY;
  if (!requiredKey) return next();
  const key = req.header('X-API-Key');
  if (key !== requiredKey) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

// Helpers
const now = () => admin.firestore.FieldValue.serverTimestamp();
const idFrom = (doc) => ({ id: doc.id, ...doc.data() });
const getUserId = (req) => req.header('X-User-Id') || 'default-user';

/** ============================
 *  Schemas (Zod)
 * ============================ */
const exerciseClassSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

const exerciseSchema = z.object({
  name: z.string().min(2),
  classId: z.string().min(1), // obrigatório
  muscleGroup: z.string().min(2).optional(),
});

// ---- workout com plano (series/carga alvo por exercício)
const workoutItemSchema = z.object({
  exerciseId: z.string(),
  series: z.number().int().positive(),
  load: z.number().nonnegative().optional(),
  targetReps: z.number().int().positive().optional(),
});

const workoutSchema = z.object({
  name: z.string().min(2),
  notes: z.string().optional(),
  plan: z.array(workoutItemSchema).min(1),
});

// compat: aceita formato antigo exerciseIds e converte pra plan
function normalizeWorkoutBody(body) {
  const clone = { ...body };
  if (Array.isArray(clone.exerciseIds) && !clone.plan) {
    clone.plan = clone.exerciseIds.map((id) => ({ exerciseId: id, series: 3 }));
    delete clone.exerciseIds;
  }
  return clone;
}

const setSchema = z.object({
  weight: z.number().nonnegative(),
  reps: z.number().int().positive(),
});

const sessionEntrySchema = z.object({
  exerciseId: z.string(),
  name: z.string().optional(),
  sets: z.array(setSchema).min(1),
});

const sessionSchema = z.object({
  date: z.string().datetime().or(z.string()),
  workoutId: z.string().optional(),
  customName: z.string().optional(),
  entries: z.array(sessionEntrySchema).min(1),
});

/** ============================
 *  Rotas
 * ============================ */

// --------- EXERCISE CLASSES ----------
app.post('/exercise-classes', async (req, res) => {
  try {
    const body = exerciseClassSchema.parse(req.body);
    const userId = getUserId(req);
    const ref = await db.collection('exerciseClasses').add({
      ...body,
      userId,
      createdAt: now(),
    });
    const snap = await ref.get();
    res.status(201).json(idFrom(snap));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/exercise-classes', async (req, res) => {
  try {
    const userId = getUserId(req);
    const q = await db
      .collection('exerciseClasses')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    res.json(q.docs.map(idFrom));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/exercise-classes/:id', async (req, res) => {
  try {
    const ref = db.collection('exerciseClasses').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Class not found' });
    await ref.set(req.body, { merge: true });
    const updated = await ref.get();
    res.json(idFrom(updated));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/exercise-classes/:id', async (req, res) => {
  try {
    await db.collection('exerciseClasses').doc(req.params.id).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------- EXERCISES ----------
app.post('/exercises', async (req, res) => {
  try {
    const body = exerciseSchema.parse(req.body);
    const userId = getUserId(req);

    // valida classe
    const classSnap = await db.collection('exerciseClasses').doc(body.classId).get();
    if (!classSnap.exists) return res.status(400).json({ error: 'classId inexistente' });

    const ref = await db.collection('exercises').add({
      ...body,
      userId,
      createdAt: now(),
    });
    const snap = await ref.get();
    res.status(201).json(idFrom(snap));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/exercises', async (req, res) => {
  try {
    const userId = getUserId(req);
    const q = await db
      .collection('exercises')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    let items = q.docs.map(idFrom);

    // expand=class
    if (req.query.expand === 'class' && items.length) {
      const classIds = [...new Set(items.map((e) => e.classId).filter(Boolean))];
      const classSnaps = await Promise.all(
        classIds.map((id) => db.collection('exerciseClasses').doc(id).get())
      );
      const classMap = new Map(
        classSnaps.filter((s) => s.exists).map((s) => [s.id, { id: s.id, ...s.data() }])
      );
      items = items.map((e) => ({ ...e, class: classMap.get(e.classId) || null }));
    }

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/exercises/:id', async (req, res) => {
  try {
    if (req.body?.classId) {
      const classSnap = await db.collection('exerciseClasses').doc(req.body.classId).get();
      if (!classSnap.exists) return res.status(400).json({ error: 'classId inexistente' });
    }

    const ref = db.collection('exercises').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Exercise not found' });

    await ref.set(req.body, { merge: true });
    const updated = await ref.get();
    res.json(idFrom(updated));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/exercises/:id', async (_req, res) => {
  try {
    await db.collection('exercises').doc(_req.params.id).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------- WORKOUTS (PLANO COM SERIES/CARGA) ----------
app.post('/workouts', async (req, res) => {
  try {
    const raw = normalizeWorkoutBody({ ...req.body });
    const body = workoutSchema.parse(raw);
    const userId = getUserId(req);

    // valida exercícios
    const ids = body.plan.map((i) => i.exerciseId);
    const snaps = await Promise.all(ids.map((id) => db.collection('exercises').doc(id).get()));
    const inexistentes = snaps.map((s, i) => (!s.exists ? ids[i] : null)).filter(Boolean);
    if (inexistentes.length) {
      return res.status(400).json({ error: `exerciseIds inexistentes: ${inexistentes.join(', ')}` });
    }

    const ref = await db.collection('workouts').add({
      ...body, // contém plan[]
      userId,
      createdAt: now(),
    });
    const snap = await ref.get();
    res.status(201).json(idFrom(snap));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/workouts', async (req, res) => {
  try {
    const userId = getUserId(req);
    const q = await db
      .collection('workouts')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    res.json(q.docs.map(idFrom));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /workouts/:id?expand=exercises → popula os exercícios do plan
app.get('/workouts/:id', async (req, res) => {
  try {
    const ref = db.collection('workouts').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Workout not found' });
    const data = { id: doc.id, ...doc.data() };

    if (req.query.expand === 'exercises' && Array.isArray(data.plan) && data.plan.length) {
      const ids = [...new Set(data.plan.map((i) => i.exerciseId))];
      const byId = await Promise.all(ids.map((id) => db.collection('exercises').doc(id).get()));
      const map = new Map(byId.filter((s) => s.exists).map((s) => [s.id, { id: s.id, ...s.data() }]));
      data.plan = data.plan.map((item) => ({ ...item, exercise: map.get(item.exerciseId) || null }));
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/workouts/:id', async (req, res) => {
  try {
    const ref = db.collection('workouts').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Workout not found' });

    const raw = normalizeWorkoutBody({ ...req.body });

    // se veio plan, valida conteúdo e existência dos exercícios
    if (raw.plan) {
      const parsedPlan = z.array(workoutItemSchema).parse(raw.plan);
      const ids = parsedPlan.map((i) => i.exerciseId);
      const snaps = await Promise.all(ids.map((id) => db.collection('exercises').doc(id).get()));
      const inexistentes = snaps.map((s, i) => (!s.exists ? ids[i] : null)).filter(Boolean);
      if (inexistentes.length) {
        return res.status(400).json({ error: `exerciseIds inexistentes: ${inexistentes.join(', ')}` });
      }
    }

    await ref.set(raw, { merge: true });
    const updated = await ref.get();
    res.json(idFrom(updated));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/workouts/:id', async (req, res) => {
  try {
    await db.collection('workouts').doc(req.params.id).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------- SESSIONS ----------
app.post('/sessions', async (req, res) => {
  try {
    const body = sessionSchema.parse(req.body);
    const userId = getUserId(req);
    const payload = {
      ...body,
      userId,
      date: new Date(body.date).toISOString(),
      createdAt: now(),
    };
    const ref = await db.collection('sessions').add(payload);
    const snap = await ref.get();
    res.status(201).json(idFrom(snap));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/sessions', async (req, res) => {
  try {
    const userId = getUserId(req);
    let q = db.collection('sessions').where('userId', '==', userId);

    const { from, to } = req.query;
    if (from) q = q.where('date', '>=', new Date(from).toISOString());
    if (to) q = q.where('date', '<=', new Date(to).toISOString());

    const snap = await q.orderBy('date', 'desc').get();
    res.json(snap.docs.map(idFrom));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/sessions/:id', async (req, res) => {
  try {
    const partialSchema = sessionSchema.partial();
    const data = partialSchema.parse(req.body);

    const ref = db.collection('sessions').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Session not found' });

    if (data.date) data.date = new Date(data.date).toISOString();

    await ref.set({ ...data }, { merge: true });
    const updated = await ref.get();
    res.json(idFrom(updated));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/sessions/:id', async (req, res) => {
  try {
    await db.collection('sessions').doc(req.params.id).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** ============================
 *  Start
 * ============================ */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`Train API rodando em http://localhost:${PORT}`)
);
