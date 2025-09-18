import admin from 'firebase-admin';

const getProjectId = () =>
  admin.app().options?.credential?.projectId ||
  admin.app().options?.projectId ||
  '(desconhecido)';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
  console.log('[Firestore] conectado com Service Account JSON');
  console.log('🔥 Firestore Project ID em uso:', getProjectId());
}

const db = admin.firestore();
const now = () => admin.firestore.FieldValue.serverTimestamp();
const idFrom = (doc) => ({ id: doc.id, ...doc.data() });

export { admin, db, getProjectId, idFrom, now };
