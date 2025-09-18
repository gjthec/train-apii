const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || '').trim();
const API_KEY = (process.env.NEXT_PUBLIC_API_KEY || '').trim();
const DEFAULT_USER_ID = (process.env.NEXT_PUBLIC_DEFAULT_USER_ID || 'default-user').trim();

function ensureBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error(
      'Defina NEXT_PUBLIC_API_BASE_URL apontando para a API Express que expõe os dados do Firebase.'
    );
  }
}

function buildHeaders() {
  const headers = { Accept: 'application/json' };

  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }

  if (DEFAULT_USER_ID) {
    headers['X-User-Id'] = DEFAULT_USER_ID;
  }

  return headers;
}

function normalizeValue(value) {
  if (value === undefined || value === null) return value;
  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    Object.prototype.hasOwnProperty.call(value, '_seconds') &&
    Object.prototype.hasOwnProperty.call(value, '_nanoseconds')
  ) {
    const millis = value._seconds * 1000 + Math.floor(value._nanoseconds / 1_000_000);
    return new Date(millis).toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, normalizeValue(val)])
    );
  }
  return value;
}

function mapDocument(doc) {
  return normalizeValue(doc);
}

async function request(pathname) {
  ensureBaseUrl();
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
  const url = new URL(pathname.replace(/^\//, ''), baseUrl);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    let message = `Falha ao buscar ${pathname}: ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) {
        message = body.error;
      }
    } catch (error) {
      // Ignora erro de parse e mantém mensagem padrão
    }
    throw new Error(message);
  }

  return response.json();
}

export async function fetchExerciseClasses() {
  const classes = await request('exercise-classes');
  const normalized = (Array.isArray(classes) ? classes : []).map((item) => mapDocument(item));
  normalized.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
  return normalized;
}

export async function fetchWorkouts() {
  const workouts = await request('workouts');
  const normalized = (Array.isArray(workouts) ? workouts : []).map((item) => mapDocument(item));
  normalized.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
  return normalized;
}

export async function fetchExercises() {
  const exercises = await request('exercises');
  const normalized = (Array.isArray(exercises) ? exercises : []).map((item) => mapDocument(item));
  normalized.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
  return normalized;
}

export async function fetchSessions() {
  const sessions = await request('sessions');
  const normalized = (Array.isArray(sessions) ? sessions : []).map((item) => mapDocument(item));
  normalized.sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  });
  return normalized;
}
