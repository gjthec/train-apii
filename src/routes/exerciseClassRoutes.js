import { Router } from 'express';
import { db, idFrom, now } from '../config/firebase.js';
import { exerciseClassSchema } from '../schemas/exerciseClassSchema.js';
import { getUserId } from '../utils/request.js';

const router = Router();

router.post('/', async (req, res) => {
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

router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const snap = await db
      .collection('exerciseClasses')
      .where('userId', '==', userId)
      .get();
    const classes = snap.docs.map(idFrom);
    classes.sort((a, b) => {
      const aTime = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : 0;
      const bTime = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
  try {
    await db.collection('exerciseClasses').doc(req.params.id).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
