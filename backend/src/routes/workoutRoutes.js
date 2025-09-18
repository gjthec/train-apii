import { Router } from 'express';
import { db, idFrom, now } from '../config/firebase.js';
import { workoutItemSchema, workoutSchema } from '../schemas/workoutSchema.js';
import { getUserId } from '../utils/request.js';
import { normalizeWorkoutBody } from '../utils/workouts.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const raw = normalizeWorkoutBody({ ...req.body });
    const body = workoutSchema.parse(raw);
    const userId = getUserId(req);

    const ids = body.plan.map((i) => i.exerciseId);
    const snaps = await Promise.all(ids.map((id) => db.collection('exercises').doc(id).get()));
    const inexistentes = snaps.map((s, i) => (!s.exists ? ids[i] : null)).filter(Boolean);
    if (inexistentes.length) {
      return res
        .status(400)
        .json({ error: `exerciseIds inexistentes: ${inexistentes.join(', ')}` });
    }

    const ref = await db.collection('workouts').add({
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

router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const snap = await db.collection('workouts').where('userId', '==', userId).get();
    const workouts = snap.docs.map(idFrom);
    workouts.sort((a, b) => {
      const aTime = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : 0;
      const bTime = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
    res.json(workouts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
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

router.patch('/:id', async (req, res) => {
  try {
    const ref = db.collection('workouts').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Workout not found' });

    const raw = normalizeWorkoutBody({ ...req.body });

    if (raw.plan) {
      const parsedPlan = workoutItemSchema.array().parse(raw.plan);
      const ids = parsedPlan.map((i) => i.exerciseId);
      const snaps = await Promise.all(ids.map((id) => db.collection('exercises').doc(id).get()));
      const inexistentes = snaps.map((s, i) => (!s.exists ? ids[i] : null)).filter(Boolean);
      if (inexistentes.length) {
        return res
          .status(400)
          .json({ error: `exerciseIds inexistentes: ${inexistentes.join(', ')}` });
      }
    }

    await ref.set(raw, { merge: true });
    const updated = await ref.get();
    res.json(idFrom(updated));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.collection('workouts').doc(req.params.id).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
