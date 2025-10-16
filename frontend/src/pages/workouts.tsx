'use client';

import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import WorkoutClassForm from '@/components/workouts/WorkoutClassForm';
import WorkoutHistoryByDate from '@/components/workouts/WorkoutHistoryByDate';
import {
  createExercise,
  createWorkoutClass,
  deleteExercise,
  deleteWorkoutClass,
  fetchExercises,
  fetchMuscleGroupClasses,
  fetchWorkoutClasses,
  updateExercise,
  type Exercise,
  type NewExerciseInput,
  type NewWorkoutClassInput,
  type MuscleGroupClass,
  type WorkoutClass,
  type WorkoutSession
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

const sortSessionsByDate = (sessions: WorkoutSession[]): WorkoutSession[] => {
  return [...sessions].sort((a, b) => {
    const aValue =
      toSortableNumber(a.scheduledFor) || toSortableNumber(a.updatedAt) || toSortableNumber(a.createdAt);
    const bValue =
      toSortableNumber(b.scheduledFor) || toSortableNumber(b.updatedAt) || toSortableNumber(b.createdAt);

    return bValue - aValue;
  });
};

const toDate = (value?: string): Date | null => {
  if (!value) {
    return null;
  }

  const normalized = value.includes('T') ? value : `${value}T00:00:00`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const mergeWorkoutSessions = (
  previous: WorkoutClass | undefined,
  incoming: WorkoutClass
): WorkoutClass => {
  if (!previous) {
    const sortedSessions = sortSessionsByDate(incoming.sessions ?? []);
    const latestSession = sortedSessions[0];

    return {
      ...incoming,
      sessions: sortedSessions,
      sessionCount: sortedSessions.length,
      lastSessionOn: latestSession?.scheduledFor ?? incoming.lastSessionOn,
      exercises: latestSession?.exercises ?? incoming.exercises,
      exerciseCount: latestSession?.exerciseCount ?? incoming.exerciseCount,
      totalSets: latestSession?.totalSets ?? incoming.totalSets,
      scheduledFor: latestSession?.scheduledFor ?? incoming.scheduledFor
    };
  }

  const previousSessions = previous.sessions ?? [];
  const incomingSessions = incoming.sessions ?? [];

  if (incomingSessions.length === 0) {
    const sortedPreviousSessions = sortSessionsByDate(previousSessions);
    const fallbackSession = sortedPreviousSessions[0];

    return {
      ...previous,
      ...incoming,
      sessions: sortedPreviousSessions,
      sessionCount: sortedPreviousSessions.length,
      lastSessionOn: fallbackSession?.scheduledFor ?? incoming.lastSessionOn ?? previous.lastSessionOn,
      exercises: fallbackSession?.exercises ?? incoming.exercises ?? previous.exercises,
      exerciseCount:
        fallbackSession?.exerciseCount ?? incoming.exerciseCount ?? previous.exerciseCount,
      totalSets: fallbackSession?.totalSets ?? incoming.totalSets ?? previous.totalSets,
      scheduledFor: fallbackSession?.scheduledFor ?? incoming.scheduledFor ?? previous.scheduledFor
    };
  }

  const sessionMap = new Map<string, WorkoutSession>();
  for (const session of incomingSessions) {
    sessionMap.set(session.id, session);
  }
  for (const session of previousSessions) {
    if (!sessionMap.has(session.id)) {
      sessionMap.set(session.id, session);
    }
  }

  const mergedSessions = sortSessionsByDate(Array.from(sessionMap.values()));
  const latestSession = mergedSessions[0];

  return {
    ...previous,
    ...incoming,
    sessions: mergedSessions,
    sessionCount: mergedSessions.length,
    lastSessionOn: latestSession?.scheduledFor ?? incoming.lastSessionOn ?? previous.lastSessionOn,
    exercises: latestSession?.exercises ?? incoming.exercises ?? previous.exercises,
    exerciseCount:
      latestSession?.exerciseCount ?? incoming.exerciseCount ?? previous.exerciseCount,
    totalSets: latestSession?.totalSets ?? incoming.totalSets ?? previous.totalSets,
    scheduledFor: latestSession?.scheduledFor ?? incoming.scheduledFor ?? previous.scheduledFor
  };
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

type WorkoutPrefillIntent = 'register' | 'edit';

interface WorkoutPrefillRequest {
  workout: WorkoutClass;
  sessionId: string | null;
  intent: WorkoutPrefillIntent;
  token: number;
}

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
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseError, setExerciseError] = useState<string | null>(null);
  const [prefillRequest, setPrefillRequest] = useState<WorkoutPrefillRequest | null>(null);
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

  const featuredWorkoutSummary = useMemo(() => {
    if (sortedWorkouts.length === 0) {
      return null;
    }

    const latestWorkout = sortedWorkouts[0];
    const sortedSessions = sortSessionsByDate(latestWorkout.sessions ?? []);
    const latestSession = sortedSessions[0];
    const highlightDate =
      latestSession?.scheduledFor ??
      latestWorkout.lastSessionOn ??
      latestWorkout.scheduledFor ??
      latestWorkout.updatedAt ??
      latestWorkout.createdAt;

    return {
      name: latestWorkout.name,
      focus: latestWorkout.focus ?? null,
      formattedDate: highlightDate ? formatScheduleForMessage(highlightDate) : null,
      exerciseCount: latestSession?.exerciseCount ?? latestWorkout.exerciseCount ?? null,
      totalSets: latestSession?.totalSets ?? latestWorkout.totalSets ?? null,
      sessionCount: latestWorkout.sessionCount ?? sortedSessions.length
    } as const;
  }, [sortedWorkouts]);

  const { totalWorkouts, totalSessions, upcomingSessions, lastWorkoutDate } = useMemo(() => {
    const sessionAccumulator = { total: 0, upcoming: 0 };
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    for (const workout of sortedWorkouts) {
      const sessionCount =
        typeof workout.sessionCount === 'number'
          ? workout.sessionCount
          : workout.sessions?.length ?? 0;
      sessionAccumulator.total += sessionCount;

      const sessions = workout.sessions ?? [];
      for (const session of sessions) {
        const scheduledDate = toDate(session.scheduledFor ?? session.updatedAt ?? session.createdAt);
        if (scheduledDate && scheduledDate >= startOfToday) {
          sessionAccumulator.upcoming += 1;
        }
      }

      if (sessions.length === 0) {
        const fallbackDate =
          toDate(workout.scheduledFor ?? workout.updatedAt ?? workout.createdAt);
        if (fallbackDate && fallbackDate >= startOfToday) {
          sessionAccumulator.upcoming += 1;
        }
      }
    }

    const reference = sortedWorkouts.find((item) =>
      Boolean(item.lastSessionOn || item.scheduledFor || item.updatedAt || item.createdAt)
    );

    const latestDateString = reference
      ? reference.lastSessionOn ?? reference.scheduledFor ?? reference.updatedAt ?? reference.createdAt
      : null;

    return {
      totalWorkouts: sortedWorkouts.length,
      totalSessions: sessionAccumulator.total,
      upcomingSessions: sessionAccumulator.upcoming,
      lastWorkoutDate: latestDateString ? formatScheduleForMessage(latestDateString) : null
    };
  }, [sortedWorkouts]);

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

    const loadExercises = async () => {
      try {
        const data = await fetchExercises();
        if (!isMounted) return;
        setExercises(data);
        setExerciseError(null);
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Não foi possível carregar os exercícios.';
        setExerciseError(message);
      }
    };

    void loadWorkouts();
    void loadMuscleGroups();
    void loadExercises();

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
    const isEditingSession = Boolean(input.workoutId && input.sessionId);

    try {
      const savedWorkout = await createWorkoutClass(input);
      setWorkouts((previous) => {
        const index = previous.findIndex((item) => item.id === savedWorkout.id);
        if (index === -1) {
          return [mergeWorkoutSessions(undefined, savedWorkout), ...previous];
        }

        const next = [...previous];
        next[index] = mergeWorkoutSessions(previous[index], savedWorkout);
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

      if (isEditingSession) {
        setSuccessMessage(
          formattedDate
            ? `Treino ${savedWorkout.name} atualizado para o dia ${formattedDate}.`
            : `Treino ${savedWorkout.name} atualizado com sucesso.`
        );
      } else if (isExistingWorkout) {
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

  const handleRegisterExercise = async (input: NewExerciseInput): Promise<Exercise> => {
    const created = await createExercise(input);
    setExercises((previous) => {
      const next = [created, ...previous.filter((item) => item.id !== created.id)];
      return next;
    });
    setExerciseError(null);
    return created;
  };

  const handleUpdateExercise = async (exerciseId: string, input: NewExerciseInput): Promise<Exercise> => {
    const updated = await updateExercise(exerciseId, input);
    setExercises((previous) =>
      previous.map((item) => (item.id === updated.id ? updated : item))
    );
    setExerciseError(null);
    return updated;
  };

  const handleDeleteExerciseFromLibrary = async (exerciseId: string): Promise<void> => {
    await deleteExercise(exerciseId);
    setExercises((previous) => previous.filter((item) => item.id !== exerciseId));
  };

  const handleReuseWorkout = (
    workout: WorkoutClass,
    options: { intent?: WorkoutPrefillIntent; sessionId?: string | null } = {}
  ) => {
    const intent = options.intent ?? 'register';
    const sessionId = options.sessionId ?? null;

    setPrefillRequest({ workout, token: Date.now(), intent, sessionId });
    setSuccessMessage(null);
    setError(null);
    setMode('new');

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleEditWorkout = (workout: WorkoutClass, sessionId?: string | null) => {
    handleReuseWorkout(workout, { intent: 'edit', sessionId: sessionId ?? null });
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
      const sessionId = selectedWorkout.sessions?.[0]?.id ?? null;
      handleReuseWorkout(selectedWorkout, { sessionId });
    }
  };

  const activeDescription =
    mode === 'new'
      ? 'Cadastre um novo treino do dia com exercícios, séries e cargas atualizadas.'
      : 'Selecione um treino já cadastrado para seguir novamente e registrar um novo dia.';

  return (
    <Layout title="Treinos" description="Cadastre e acompanhe seus treinos diários personalizados.">
      <Head>
        <title>Onemorerep - Treinos</title>
      </Head>
      <section className={styles.pageIntro}>
        <div className={styles.introContent}>
          <span className={styles.introTag}>Gestão diária</span>
          <h1>Treinos organizados, evolução clara</h1>
          <p className={styles.introDescription}>
            Planeje as sessões da semana, registre cargas e acompanhe o progresso da sua equipe ou
            dos alunos com uma visão centralizada.
          </p>
          <p className={styles.lastWorkout}>
            {lastWorkoutDate ? (
              <>
                Último registro concluído em <strong>{lastWorkoutDate}</strong>.
              </>
            ) : (
              <>Ainda não há registros cadastrados — comece adicionando o primeiro treino.</>
            )}
          </p>
        </div>
        <div className={styles.introStats}>
          <article className={styles.statCard}>
            <span className={styles.statLabel}>Treinos na biblioteca</span>
            <strong className={styles.statValue}>{totalWorkouts}</strong>
            <span className={styles.statHelper}>planos disponíveis</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statLabel}>Dias registrados</span>
            <strong className={styles.statValue}>{totalSessions}</strong>
            <span className={styles.statHelper}>com histórico completo</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statLabel}>Sessões agendadas</span>
            <strong className={styles.statValue}>{upcomingSessions}</strong>
            <span className={styles.statHelper}>a partir de hoje</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statLabel}>Exercícios cadastrados</span>
            <strong className={styles.statValue}>{exercises.length}</strong>
            <span className={styles.statHelper}>disponíveis para montar treinos</span>
          </article>
        </div>
      </section>
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
            className={
              mode === 'new' ? `${styles.modeButton} ${styles.modeButtonActive}` : styles.modeButton
            }
            onClick={() => handleSelectMode('new')}
          >
            <span className={styles.modeButtonTitle}>Cadastro guiado</span>
            <span className={styles.modeButtonSubtitle}>
              Monte um treino do zero com exercícios e cargas atualizadas.
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'existing'}
            className={
              mode === 'existing'
                ? `${styles.modeButton} ${styles.modeButtonActive}`
                : styles.modeButton
            }
            onClick={() => handleSelectMode('existing')}
          >
            <span className={styles.modeButtonTitle}>Reaproveitar planejamento</span>
            <span className={styles.modeButtonSubtitle}>
              Escolha um treino salvo e registre um novo dia em minutos.
            </span>
          </button>
        </div>
      </section>

      {mode === 'new' ? (
        <div className={styles.newModeGrid}>
          <section className={`${styles.formSection} ${styles.primaryPanel} ${styles.newWorkoutPanel}`}>
            <header className={styles.formHeader}>
              <div>
                <span className={styles.sectionEyebrow}>Novo planejamento</span>
                <h2>Monte o treino do dia</h2>
              </div>
              <p>
                Adicione exercícios com séries, repetições e cargas recomendadas para guiar o aluno com
                clareza durante a sessão.
              </p>
            </header>
            <WorkoutClassForm
              onSubmit={handleCreateWorkout}
              isSubmitting={isSubmitting}
              muscleGroups={muscleGroups}
              muscleGroupError={muscleGroupError}
              exercises={exercises}
              exerciseError={exerciseError}
              onRegisterExercise={handleRegisterExercise}
              onUpdateExercise={handleUpdateExercise}
              onDeleteExercise={handleDeleteExerciseFromLibrary}
              prefillRequest={prefillRequest}
              onClearPrefill={handleClearPrefill}
            />
            {successMessage || error ? (
              <div className={styles.feedbackStack}>
                {successMessage ? <p className={styles.success}>{successMessage}</p> : null}
                {error ? <p className={styles.error}>{error}</p> : null}
              </div>
            ) : null}
          </section>

          <section className={`${styles.historyPreview} ${styles.secondaryPanel} ${styles.previousWorkoutsPanel}`}>
            <header className={styles.historyHeader}>
              <div>
                <span className={styles.sectionEyebrow}>Histórico rápido</span>
                <h3>Treinos anteriores</h3>
              </div>
              <p>Selecione um treino e clique em “Registrar novo dia” para reaproveitar o planejamento.</p>
            </header>
            <div className={styles.historyPreviewContent}>
              {featuredWorkoutSummary ? (
                <aside className={styles.historySpotlight} aria-label="Resumo do último treino registrado">
                  <div className={styles.historySpotlightHeader}>
                    <span className={styles.historySpotlightTag}>Reaproveitamento em foco</span>
                    <h4 className={styles.historySpotlightTitle}>{featuredWorkoutSummary.name}</h4>
                    {featuredWorkoutSummary.focus ? (
                      <span className={styles.historySpotlightFocus}>{featuredWorkoutSummary.focus}</span>
                    ) : null}
                  </div>
                  <div className={styles.historySpotlightMetrics}>
                    {featuredWorkoutSummary.formattedDate ? (
                      <div className={styles.historySpotlightMetric}>
                        <span className={styles.historySpotlightMetricLabel}>Último registro</span>
                        <strong className={styles.historySpotlightMetricValue}>
                          {featuredWorkoutSummary.formattedDate}
                        </strong>
                        <span className={styles.historySpotlightMetricHelper}>
                          Dia mais recente concluído
                        </span>
                      </div>
                    ) : null}
                    {typeof featuredWorkoutSummary.sessionCount === 'number' ? (
                      <div className={styles.historySpotlightMetric}>
                        <span className={styles.historySpotlightMetricLabel}>Dias cadastrados</span>
                        <strong className={styles.historySpotlightMetricValue}>
                          {featuredWorkoutSummary.sessionCount}
                        </strong>
                        <span className={styles.historySpotlightMetricHelper}>
                          {featuredWorkoutSummary.sessionCount === 1
                            ? 'dia registrado no histórico'
                            : 'dias registrados no histórico'}
                        </span>
                      </div>
                    ) : null}
                    {typeof featuredWorkoutSummary.exerciseCount === 'number' ? (
                      <div className={styles.historySpotlightMetric}>
                        <span className={styles.historySpotlightMetricLabel}>Exercícios no dia</span>
                        <strong className={styles.historySpotlightMetricValue}>
                          {featuredWorkoutSummary.exerciseCount}
                        </strong>
                        <span className={styles.historySpotlightMetricHelper}>
                          {featuredWorkoutSummary.exerciseCount === 1
                            ? 'exercício planejado'
                            : 'exercícios planejados'}
                        </span>
                      </div>
                    ) : null}
                    {typeof featuredWorkoutSummary.totalSets === 'number' ? (
                      <div className={styles.historySpotlightMetric}>
                        <span className={styles.historySpotlightMetricLabel}>Séries registradas</span>
                        <strong className={styles.historySpotlightMetricValue}>
                          {featuredWorkoutSummary.totalSets}
                        </strong>
                        <span className={styles.historySpotlightMetricHelper}>
                          {featuredWorkoutSummary.totalSets === 1
                            ? 'série planejada para o dia'
                            : 'séries planejadas para o dia'}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </aside>
              ) : (
                <aside className={styles.historySpotlightEmpty}>
                  <strong>Nenhum treino reaproveitado ainda</strong>
                  <p>Cadastre o primeiro plano para acompanhar destaques aqui.</p>
                </aside>
              )}
              <div className={styles.historyListShell}>
                <WorkoutHistoryByDate
                  classes={sortedWorkouts}
                  emptyLabel="Nenhum treino cadastrado."
                  onDuplicate={handleReuseWorkout}
                  onDelete={handleDeleteWorkout}
                  onEdit={handleEditWorkout}
                  deletingIds={deletingIds}
                />
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {mode === 'existing' ? (
        <section className={`${styles.historySection} ${styles.primaryPanel} ${styles.libraryPanel}`}>
          <header className={styles.historyHeader}>
            <div>
              <span className={styles.sectionEyebrow}>Biblioteca de treinos</span>
              <h3>Escolha um treino já cadastrado</h3>
            </div>
            <p>
              Carregue um treino existente para atualizar as cargas e registrar um novo dia sem perder o histórico.
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
          <div className={styles.historyListShell}>
            <WorkoutHistoryByDate
              classes={sortedWorkouts}
              emptyLabel="Nenhum treino cadastrado."
              onDuplicate={handleReuseWorkout}
              onDelete={handleDeleteWorkout}
              onEdit={handleEditWorkout}
              deletingIds={deletingIds}
            />
          </div>
          {successMessage || error ? (
            <div className={styles.feedbackStack}>
              {successMessage ? <p className={styles.success}>{successMessage}</p> : null}
              {error ? <p className={styles.error}>{error}</p> : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </Layout>
  );
}
