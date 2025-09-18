import { Router } from 'express';
import { db, idFrom, now } from '../config/firebase.js';
import { sessionSchema } from '../schemas/sessionSchema.js';
import { getUserId } from '../utils/request.js';

const router = Router();

router.post('/', async (req, res) => {
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

router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const snap = await db.collection('sessions').where('userId', '==', userId).get();
    const items = snap.docs.map(idFrom);

    const { from, to } = req.query;
    const parsedFrom = from ? new Date(from) : null;
    const parsedTo = to ? new Date(to) : null;
    const fromDate = parsedFrom && !Number.isNaN(parsedFrom.getTime()) ? parsedFrom : null;
    const toDate = parsedTo && !Number.isNaN(parsedTo.getTime()) ? parsedTo : null;

    const filtered = items.filter((session) => {
      if (!session.date) return true;
      const current = new Date(session.date);
      if (Number.isNaN(current.getTime())) return true;
      if (fromDate && current < fromDate) return false;
      if (toDate && current > toDate) return false;
      return true;
    });

    const getTime = (value) => {
      const time = new Date(value).getTime();
      return Number.isNaN(time) ? 0 : time;
    };

    filtered.sort((a, b) => getTime(b.date) - getTime(a.date));

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
  try {
    await db.collection('sessions').doc(req.params.id).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
