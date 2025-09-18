import admin from 'firebase-admin';

const loadCredential = () => {
  const {
    FIREBASE_SERVICE_ACCOUNT,
    FIREBASE_SERVICE_ACCOUNT_BASE64,
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
  } = process.env;

  if (FIREBASE_SERVICE_ACCOUNT) {
    try {
      const parsed = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
      return admin.credential.cert(parsed);
    } catch (error) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT inválido. Garanta que o valor seja um JSON da Service Account.',
      );
    }
  }

  if (FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const json = Buffer.from(FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
      const parsed = JSON.parse(json);
      return admin.credential.cert(parsed);
    } catch (error) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_BASE64 inválido. O valor deve ser um JSON codificado em Base64.',
      );
    }
  }

  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    return admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey,
    });
  }

  return admin.credential.applicationDefault();
};

const initializeFirebase = () => {
  if (admin.apps.length) return admin.app();

  try {
    const credential = loadCredential();
    admin.initializeApp({ credential });
    console.log('[Firestore] conectado com Service Account JSON');
  } catch (error) {
    console.error('Erro ao inicializar o Firebase Admin:', error.message);
    throw error;
  }

  return admin.app();
};

const getProjectId = () =>
  admin.app().options?.credential?.projectId ||
  admin.app().options?.projectId ||
  '(desconhecido)';

initializeFirebase();
console.log('🔥 Firestore Project ID em uso:', getProjectId());

const db = admin.firestore();
const now = () => admin.firestore.FieldValue.serverTimestamp();
const idFrom = (doc) => ({ id: doc.id, ...doc.data() });

export { admin, db, getProjectId, idFrom, now };
