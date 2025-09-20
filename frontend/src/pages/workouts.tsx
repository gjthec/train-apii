'use client';

import Head from 'next/head';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import WorkoutClassForm from '@/components/workouts/WorkoutClassForm';
import WorkoutClassList from '@/components/workouts/WorkoutClassList';
import {
  createWorkoutClass,
  fetchMuscleGroupClasses,
  fetchWorkoutClasses,
  type NewWorkoutClassInput,
  type MuscleGroupClass,
  type WorkoutClass
} from '@/lib/api';
import styles from '@/styles/Workouts.module.css';

const toSortableNumber = (value?: string): number => {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return Number.parseInt(value.replace(/-/g, ''), 10);
  }

  return 0;
};

const sortWorkoutsByDate = (items: WorkoutClass[]): WorkoutClass[] => {
  return [...items].sort((a, b) => {
    const aValue =
      toSortableNumber(a.scheduledFor) || toSortableNumber(a.updatedAt) || toSortableNumber(a.createdAt);
    const bValue =
      toSortableNumber(b.scheduledFor) || toSortableNumber(b.updatedAt) || toSortableNumber(b.createdAt);

    return bValue - aValue;
  });
};

const formatScheduleForMessage = (value: string): string => {
  const parsed = new Date(`${value}T00:00:00`);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  return value;
};

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<WorkoutClass[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroupClass[]>([]);
  const [muscleGroupError, setMuscleGroupError] = useState<string | null>(null);
  const [prefillRequest, setPrefillRequest] = useState<{ workout: WorkoutClass; token: number } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadWorkouts = async () => {
      try {
        const data = await fetchWorkoutClasses();
        if (!isMounted) return;
        setWorkouts(sortWorkoutsByDate(data));
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Não foi possível carregar os treinos.';
        setError(message);
      }
    };

    const loadMuscleGroups = async () => {
      try {
        const data = await fetchMuscleGroupClasses();
        if (!isMounted) return;
        setMuscleGroups(data);
        setMuscleGroupError(null);
      } catch (err) {
        if (!isMounted) return;
        const message =
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar os grupos musculares.';
        setMuscleGroupError(message);
      }
    };

    void loadWorkouts();
    void loadMuscleGroups();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateWorkout = async (input: NewWorkoutClassInput) => {
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const newWorkout = await createWorkoutClass(input);
      setWorkouts((previous) => sortWorkoutsByDate([newWorkout, ...previous]));
      if (newWorkout.scheduledFor) {
        setSuccessMessage(`Treino registrado para ${formatScheduleForMessage(newWorkout.scheduledFor)}.`);
      } else {
        setSuccessMessage('Treino registrado com sucesso.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível salvar o treino.';
      setError(message);
      throw (err instanceof Error ? err : new Error(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReuseWorkout = (workout: WorkoutClass) => {
    setPrefillRequest({ workout, token: Date.now() });
    setSuccessMessage(null);
    setError(null);

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleClearPrefill = () => {
    setPrefillRequest(null);
  };

  return (
    <Layout title="Treinos" description="Cadastre e acompanhe seus treinos diários personalizados.">
      <Head>
        <title>Train API - Treinos</title>
      </Head>
      <section className={styles.formSection}>
        <WorkoutClassForm
          onSubmit={handleCreateWorkout}
          isSubmitting={isSubmitting}
          muscleGroups={muscleGroups}
          muscleGroupError={muscleGroupError}
          prefillRequest={prefillRequest}
          onClearPrefill={handleClearPrefill}
        />
        {successMessage ? <p className={styles.success}>{successMessage}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}
      </section>
      <section>
        <WorkoutClassList
          classes={workouts}
          emptyLabel="Nenhum treino cadastrado."
          onDuplicate={handleReuseWorkout}
        />
      </section>
    </Layout>
  );
}
