const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? '';

async function request(path) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (API_KEY) {
    headers['x-api-key'] = API_KEY;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Erro ao carregar ${path}: ${response.status} ${details}`);
  }

  return response.json();
}

export async function fetchExerciseClasses() {
  return request('/exercise-classes');
}

export async function fetchWorkouts() {
  return request('/workouts');
}

export async function fetchExercises(workoutId) {
  const url = workoutId ? `/workouts/${workoutId}/exercises` : '/exercises';
  return request(url);
}

export async function fetchSessions() {
  return request('/sessions');
}
