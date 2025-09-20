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
      toSortableNumber(a.lastSessionOn) ||
      toSortableNumber(a.scheduledFor) ||
      toSortableNumber(a.updatedAt) ||
      toSortableNumber(a.createdAt);
    const bValue =
      toSortableNumber(b.lastSessionOn) ||
      toSortableNumber(b.scheduledFor) ||
      toSortableNumber(b.updatedAt) ||
      toSortableNumber(b.createdAt);

    return bValue - aValue;
  });
};

const formatScheduleForMessage = (value: string): string => {
  const normalized = value.includes('T') ? value : `${value}T00:00:00`;
  const parsed = new Date(normalized);
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

interface SelectChangeEvent {
  target: {
    value: string;
  };
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<WorkoutClass[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroupClass[]>([]);
  const [muscleGroupError, setMuscleGroupError] = useState<string | null>(null);
  const [prefillRequest, setPrefillRequest] = useState<
    { workout: WorkoutClass; token: number } | null
  >(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());
  const [mode, setMode] = useState<WorkoutsPageMode>('new');
  const [selectedExistingId, setSelectedExistingId] = useState<string>('');

  const sortedWorkouts = useMemo(() => sortWorkoutsByDate(workouts), [workouts]);
  const selectedWorkout = useMemo(() => {
    if (!selectedExistingId) {
      return null;
    }

    return sortedWorkouts.find((item) => item.id === selectedExistingId) ?? null;
  }, [sortedWorkouts, selectedExistingId]);

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

  useEffect(() => {
    if (sortedWorkouts.length === 0) {
      setSelectedExistingId('');
      return;
    }

    setSelectedExistingId((previous) => {
      if (previous && sortedWorkouts.some((item) => item.id === previous)) {
        return previous;
      }

      return sortedWorkouts[0]?.id ?? '';
    });
  }, [sortedWorkouts]);

  const handleCreateWorkout = async (input: NewWorkoutClassInput) => {
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const isExistingWorkout = Boolean(input.workoutId);

    try {
      const savedWorkout = await createWorkoutClass(input);
      setWorkouts((previous) => {
        const index = previous.findIndex((item) => item.id === savedWorkout.id);
        if (index === -1) {
          return [savedWorkout, ...previous];
        }

        const next = [...previous];
        next[index] = savedWorkout;
        return next;
      });

      setSelectedExistingId((previous) => {
        if (isExistingWorkout) {
          return savedWorkout.id;
        }

        return previous || savedWorkout.id;
      });

      const formattedDate = savedWorkout.scheduledFor
        ? formatScheduleForMessage(savedWorkout.scheduledFor)
        : null;

      if (isExistingWorkout) {
        setSuccessMessage(
          formattedDate
            ? `Novo dia registrado para ${savedWorkout.name} em ${formattedDate}.`
            : `Novo dia registrado para ${savedWorkout.name}.`
        );
      } else {
        setSuccessMessage(
          formattedDate
            ? `Treino ${savedWorkout.name} criado com registro em ${formattedDate}.`
            : `Treino ${savedWorkout.name} cadastrado com sucesso.`
        );
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
      const confirmed = window.confirm(
        `Deseja realmente excluir o treino "${workout.name}" e todos os dias registrados?`
      );
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
      setSuccessMessage('Treino e histórico excluídos com sucesso.');
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
    if (nextMode === 'existing') {
      if (sortedWorkouts.length > 0) {
        setSelectedExistingId((previous) => {
          if (previous && sortedWorkouts.some((item) => item.id === previous)) {
            return previous;
          }

          return sortedWorkouts[0]?.id ?? '';
        });
      }

      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleExistingChange = (event: SelectChangeEvent) => {
    setSelectedExistingId(event.target.value);
  };

  const handleSelectExisting = () => {
    if (selectedWorkout) {
      handleReuseWorkout(selectedWorkout);
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
          <div className={styles.existingSelector}>
            <label className={styles.selectLabel} htmlFor="existing-workout">
              Treino salvo
            </label>
            <div className={styles.selectRow}>
              <select
                id="existing-workout"
                className={styles.selectControl}
                value={selectedExistingId}
                onChange={handleExistingChange}
                disabled={sortedWorkouts.length === 0}
              >
                {sortedWorkouts.length === 0 ? (
                  <option value="">Nenhum treino cadastrado</option>
                ) : null}
                {sortedWorkouts.map((item) => {
                  const labelParts: string[] = [item.name];
                  if (item.lastSessionOn) {
                    labelParts.push(`Último em ${formatScheduleForMessage(item.lastSessionOn)}`);
                  } else if (item.scheduledFor) {
                    labelParts.push(`Registrado em ${formatScheduleForMessage(item.scheduledFor)}`);
                  } else if (item.updatedAt) {
                    labelParts.push(`Atualizado em ${formatScheduleForMessage(item.updatedAt)}`);
                  } else if (item.createdAt) {
                    labelParts.push(`Criado em ${formatScheduleForMessage(item.createdAt)}`);
                  }

                  if (typeof item.sessionCount === 'number' && item.sessionCount > 0) {
                    labelParts.push(
                      `${item.sessionCount} ${item.sessionCount === 1 ? 'dia registrado' : 'dias registrados'}`
                    );
                  }

                  return (
                    <option key={item.id} value={item.id}>
                      {labelParts.join(' — ')}
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                className={styles.selectAction}
                onClick={handleSelectExisting}
                disabled={!selectedWorkout}
              >
                Registrar novo dia
              </button>
            </div>
          </div>
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
