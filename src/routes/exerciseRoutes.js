import { Router } from 'express';
import { db, idFrom, now } from '../config/firebase.js';
import { exerciseSchema } from '../schemas/exerciseSchema.js';
import { getUserId } from '../utils/request.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const body = exerciseSchema.parse(req.body);
    const userId = getUserId(req);

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

router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const q = await db
      .collection('exercises')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    let items = q.docs.map(idFrom);

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

router.patch('/:id', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
  try {
    await db.collection('exercises').doc(req.params.id).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
