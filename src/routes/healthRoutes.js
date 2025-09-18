import { Router } from 'express';
import { getProjectId } from '../config/firebase.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true }));

router.get('/_debug/project', (_req, res) => {
  res.json({ projectId: getProjectId() });
});

export default router;
