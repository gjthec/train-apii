'use client';

import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import WorkoutClassForm from '@/components/workouts/WorkoutClassForm';
import WorkoutHistoryByDate from '@/components/workouts/WorkoutHistoryByDate';
import {
  createWorkoutClass,
  deleteWorkoutClass,
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

type WorkoutsPageMode = 'new' | 'existing';

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<WorkoutClass[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroupClass[]>([]);
  const [muscleGroupError, setMuscleGroupError] = useState<string | null>(null);
  const [prefillRequest, setPrefillRequest] = useState<{ workout: WorkoutClass; token: number } | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());
  const [mode, setMode] = useState<WorkoutsPageMode>('new');

  const sortedWorkouts = useMemo(() => sortWorkoutsByDate(workouts), [workouts]);

  useEffect(() => {
    let isMounted = true;

    const loadWorkouts = async () => {
      try {
        const data = await fetchWorkoutClasses();
        if (!isMounted) return;
        setWorkouts(data);
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
      setWorkouts((previous) => [newWorkout, ...previous]);
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
    setMode('new');

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDeleteWorkout = async (workout: WorkoutClass) => {
    if (!workout.id) {
      return;
    }

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Deseja realmente excluir o treino "${workout.name}"?`);
      if (!confirmed) {
        return;
      }
    }

    setError(null);
    setSuccessMessage(null);
    setDeletingIds((previous) => {
      const next = new Set(previous);
      next.add(workout.id);
      return next;
    });

    try {
      await deleteWorkoutClass(workout.id);
      setWorkouts((previous) => previous.filter((item) => item.id !== workout.id));
      setSuccessMessage('Treino excluído com sucesso.');
      setPrefillRequest((previous) => {
        if (previous && previous.workout.id === workout.id) {
          return null;
        }
        return previous;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível excluir o treino.';
      setError(message);
    } finally {
      setDeletingIds((previous) => {
        const next = new Set(previous);
        next.delete(workout.id);
        return next;
      });
    }
  };

  const handleClearPrefill = () => {
    setPrefillRequest(null);
  };

  const handleSelectMode = (nextMode: WorkoutsPageMode) => {
    setMode(nextMode);
    if (nextMode === 'existing' && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const activeDescription =
    mode === 'new'
      ? 'Cadastre um novo treino do dia com exercícios, séries e cargas atualizadas.'
      : 'Selecione um treino já cadastrado para seguir novamente e registrar um novo dia.';

  return (
    <Layout title="Treinos" description="Cadastre e acompanhe seus treinos diários personalizados.">
      <Head>
        <title>Train API - Treinos</title>
      </Head>
      <section className={styles.modeSection}>
        <div className={styles.modeHeader}>
          <h3>Como deseja registrar o treino de hoje?</h3>
          <p className={styles.modeDescription}>{activeDescription}</p>
        </div>
        <div className={styles.modeToggle} role="tablist" aria-label="Opções de cadastro de treino">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'new'}
            className={mode === 'new' ? `${styles.modeButton} ${styles.modeButtonActive}` : styles.modeButton}
            onClick={() => handleSelectMode('new')}
          >
            Cadastrar novo treino
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'existing'}
            className={mode === 'existing' ? `${styles.modeButton} ${styles.modeButtonActive}` : styles.modeButton}
            onClick={() => handleSelectMode('existing')}
          >
            Seguir treino existente
          </button>
        </div>
      </section>

      {mode === 'new' ? (
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
      ) : null}

      {mode === 'existing' ? (
        <section className={styles.historySection}>
          <header className={styles.historyHeader}>
            <h3>Escolha um treino já cadastrado</h3>
            <p>
              Clique em “Registrar novo dia” para carregar o treino selecionado no formulário e atualizar as cargas
              conforme necessário.
            </p>
          </header>
          <WorkoutHistoryByDate
            classes={sortedWorkouts}
            emptyLabel="Nenhum treino cadastrado."
            onDuplicate={handleReuseWorkout}
            onDelete={handleDeleteWorkout}
            deletingIds={deletingIds}
          />
          {successMessage ? <p className={styles.success}>{successMessage}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}
        </section>
      ) : null}

      {mode === 'new' ? (
        <section className={styles.historyPreview}>
          <header className={styles.historyHeader}>
            <h3>Treinos anteriores</h3>
            <p>Precisa repetir um treino? Escolha abaixo e toque em “Registrar novo dia”.</p>
          </header>
          <WorkoutHistoryByDate
            classes={sortedWorkouts}
            emptyLabel="Nenhum treino cadastrado."
            onDuplicate={handleReuseWorkout}
            onDelete={handleDeleteWorkout}
            deletingIds={deletingIds}
          />
        </section>
      ) : null}
    </Layout>
  );
}
