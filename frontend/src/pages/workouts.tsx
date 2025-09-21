'use client';

import Head from 'next/head';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import ResourceList from '@/components/ResourceList';
import { fetchWorkoutClasses, type WorkoutClass } from '@/lib/api';
import styles from '@/styles/Workouts.module.css';

type NullableString = string | null | undefined;

const formatFocus = (value: NullableString): string => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return 'Sem foco definido';
};

const formatDifficulty = (sessionCount?: number): string => {
  if (typeof sessionCount === 'number' && sessionCount > 0) {
    return `${sessionCount} sessão${sessionCount > 1 ? 'es' : ''}`;
  }
  return 'Novo treino';
};

const formatExerciseCount = (value?: number): string =>
  typeof value === 'number' && Number.isFinite(value) ? String(value) : '–';

const formatDuration = (workout: WorkoutClass): string => {
  if (typeof workout.estimatedDuration === 'string' && workout.estimatedDuration.trim().length > 0) {
    return workout.estimatedDuration;
  }

  if (typeof workout.totalSets === 'number' && Number.isFinite(workout.totalSets) && workout.totalSets > 0) {
    return `${workout.totalSets} série${workout.totalSets > 1 ? 's' : ''}`;
  }

  if (typeof workout.sessionCount === 'number' && workout.sessionCount > 0) {
    return `${workout.sessionCount} sessão${workout.sessionCount > 1 ? 'es' : ''}`;
  }

  return '–';
};

const resolveSummary = (workout: WorkoutClass): NullableString => {
  if (typeof workout.summary === 'string' && workout.summary.trim().length > 0) {
    return workout.summary;
  }

  if (typeof workout.notes === 'string' && workout.notes.trim().length > 0) {
    return workout.notes;
  }

  const recentSession = workout.sessions?.[0];
  if (recentSession && typeof recentSession.notes === 'string' && recentSession.notes.trim().length > 0) {
    return recentSession.notes;
  }

  return null;
};

type WorkoutsPageState = {
  workouts: WorkoutClass[];
  error: string | null;
};

export default function WorkoutsPage() {
  const [{ workouts, error }, setState] = useState<WorkoutsPageState>({ workouts: [], error: null });

  useEffect(() => {
    let isMounted = true;

    fetchWorkoutClasses()
      .then((data) => {
        if (!isMounted) return;
        setState({ workouts: data, error: null });
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Não foi possível carregar os treinos.';
        setState({ workouts: [], error: message });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Layout title="Treinos" description="Treinos montados com base nos dados recebidos da API.">
      <Head>
        <title>Train API - Treinos</title>
      </Head>
      {error ? <p className={styles.error}>{error}</p> : null}
      <ResourceList
        items={workouts}
        emptyLabel="Nenhum treino cadastrado."
        renderItem={(item) => {
          const summary = resolveSummary(item);
          return (
            <article>
              <header className={styles.cardHeader}>
                <div>
                  <h3>{item.name}</h3>
                  <p>{formatFocus(item.focus)}</p>
                </div>
                <span className={styles.difficulty}>{formatDifficulty(item.sessionCount)}</span>
              </header>
              <p className={styles.metrics}>
                Exercícios: <strong>{formatExerciseCount(item.exerciseCount)}</strong> · Duração:{' '}
                <strong>{formatDuration(item)}</strong>
              </p>
              {summary ? <p>{summary}</p> : null}
            </article>
          );
        }}
      />
    </Layout>
  );
}
