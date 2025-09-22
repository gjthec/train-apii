'use client';

import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import WorkoutProgressChart, {
  type WorkoutProgressPoint
} from '@/components/dashboards/WorkoutProgressChart';
import { fetchWorkoutClasses, type WorkoutClass, type WorkoutSession } from '@/lib/api';
import styles from '@/styles/Dashboard.module.css';

const toSortableDate = (value?: string): number => {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value.includes('T') ? value : `${value}T00:00:00`);
  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return Number.parseInt(value.replace(/-/g, ''), 10);
  }

  return 0;
};

const sortSessionsAsc = (sessions: WorkoutSession[]): WorkoutSession[] => {
  return [...sessions].sort((a, b) => toSortableDate(a.scheduledFor) - toSortableDate(b.scheduledFor));
};

const toLocaleDate = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

interface ExerciseProgress {
  id: string;
  name: string;
  points: WorkoutProgressPoint[];
}

const buildExerciseProgress = (workout?: WorkoutClass): ExerciseProgress[] => {
  if (!workout || !Array.isArray(workout.sessions) || workout.sessions.length === 0) {
    return [];
  }

  const sessions = sortSessionsAsc(workout.sessions);
  const progressMap = new Map<string, ExerciseProgress>();

  sessions.forEach((session) => {
    session.exercises.forEach((exercise) => {
      const key = exercise.id ?? `${exercise.name}-${progressMap.size}`;
      const existing = progressMap.get(key);

      const averageWeight = exercise.sets.length
        ? exercise.sets.reduce((total, set) => total + set.weightKg, 0) / exercise.sets.length
        : 0;
      const averageRepetitions = exercise.sets.length
        ? exercise.sets.reduce((total, set) => total + set.repetitions, 0) / exercise.sets.length
        : exercise.seriesCount ?? 0;

      const safeAverageWeight = Number.isFinite(averageWeight)
        ? Number.parseFloat(averageWeight.toFixed(2))
        : 0;
      const safeAverageRepetitions = Number.isFinite(averageRepetitions)
        ? Number.parseFloat(averageRepetitions.toFixed(2))
        : 0;

      const nextPoint: WorkoutProgressPoint = {
        date: session.scheduledFor,
        averageWeight: safeAverageWeight,
        averageRepetitions: safeAverageRepetitions
      };

      if (existing) {
        existing.points.push(nextPoint);
        return;
      }

      progressMap.set(key, {
        id: key,
        name: exercise.name,
        points: [nextPoint]
      });
    });
  });

  return Array.from(progressMap.values())
    .map((progress) => ({
      ...progress,
      points: [...progress.points].sort(
        (a, b) => toSortableDate(a.date) - toSortableDate(b.date)
      )
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
};

const DashboardsPage = () => {
  const [workouts, setWorkouts] = useState<WorkoutClass[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetchWorkoutClasses()
      .then((items) => {
        if (!isMounted) {
          return;
        }
        setError(undefined);
        setWorkouts(items);
      })
      .catch((err: unknown) => {
        console.error(err);
        if (!isMounted) {
          return;
        }
        setError('Não foi possível carregar os treinos.');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const sortedWorkouts = useMemo(() => {
    return [...workouts].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [workouts]);

  useEffect(() => {
    if (!sortedWorkouts.length) {
      if (selectedWorkoutId !== undefined) {
        setSelectedWorkoutId(undefined);
      }
      return;
    }

    if (!selectedWorkoutId) {
      setSelectedWorkoutId(sortedWorkouts[0].id);
      return;
    }

    const stillExists = sortedWorkouts.some((workout) => workout.id === selectedWorkoutId);
    if (!stillExists) {
      setSelectedWorkoutId(sortedWorkouts[0].id);
    }
  }, [sortedWorkouts, selectedWorkoutId]);

  const selectedWorkout = useMemo(() => {
    if (!selectedWorkoutId) {
      return sortedWorkouts[0];
    }
    return sortedWorkouts.find((workout) => workout.id === selectedWorkoutId) ?? sortedWorkouts[0];
  }, [selectedWorkoutId, sortedWorkouts]);

  const exerciseProgress = useMemo(() => buildExerciseProgress(selectedWorkout), [selectedWorkout]);

  const sessionCount = selectedWorkout?.sessions?.length ?? 0;
  const lastSessionDate = toLocaleDate(selectedWorkout?.lastSessionOn ?? selectedWorkout?.scheduledFor);

  return (
    <Layout
      title="Dashboards"
      description="Acompanhe a evolução das cargas e repetições dos seus treinos ao longo do tempo."
    >
      <Head>
        <title>Dashboards | Train API</title>
      </Head>
      <section className={styles.pageSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.filterRow}>
            <label htmlFor="workout-select">Treino</label>
            <select
              id="workout-select"
              className={styles.selectInput}
              value={selectedWorkout?.id ?? ''}
              onChange={(event) => setSelectedWorkoutId(event.target.value || undefined)}
              disabled={isLoading || !sortedWorkouts.length}
            >
              {sortedWorkouts.map((workout) => (
                <option key={workout.id} value={workout.id}>
                  {workout.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.emptyState}>
            <strong>Carregando dashboards...</strong>
            <span>Buscando os treinos e sessões registradas.</span>
          </div>
        ) : null}

        {error ? (
          <div className={styles.emptyState}>
            <strong>Erro ao carregar os dados.</strong>
            <span>{error}</span>
          </div>
        ) : null}

        {!error && !isLoading && !sortedWorkouts.length ? (
          <div className={styles.emptyState}>
            <strong>Nenhum treino cadastrado.</strong>
            <span>Cadastre um treino para visualizar os dashboards de evolução.</span>
          </div>
        ) : null}

        {selectedWorkout ? (
          <div className={styles.overviewCard}>
            <span className={styles.overviewTitle}>{selectedWorkout.name}</span>
            <div className={styles.overviewMeta}>
              <span>
                Total de sessões: <strong>{sessionCount}</strong>
              </span>
              {lastSessionDate ? (
                <span>
                  Última sessão: <strong>{lastSessionDate}</strong>
                </span>
              ) : null}
              <span>
                Exercícios cadastrados: <strong>{selectedWorkout.exerciseCount}</strong>
              </span>
            </div>
          </div>
        ) : null}

        {selectedWorkout && exerciseProgress.length > 0 ? (
          <div className={styles.progressGrid}>
            {exerciseProgress.map((progress) => (
              <WorkoutProgressChart key={progress.id} exerciseName={progress.name} points={progress.points} />
            ))}
          </div>
        ) : null}

        {selectedWorkout && exerciseProgress.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>Sem sessões registradas.</strong>
            <span>Adicione novas sessões ao treino para acompanhar a evolução dos exercícios.</span>
          </div>
        ) : null}
      </section>
    </Layout>
  );
};

export default DashboardsPage;
