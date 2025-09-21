'use client';

import { useEffect, useMemo, useState } from 'react';

import type { WorkoutClass, WorkoutSession } from '@/lib/api';
import styles from '@/styles/WorkoutClassList.module.css';

interface WorkoutClassListProps {
  classes: WorkoutClass[];
  emptyLabel: string;
  onDuplicate?: (workout: WorkoutClass) => void;
  onDelete?: (workout: WorkoutClass) => void;
  deletingIds?: ReadonlySet<string>;
}

const formatDate = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = value.includes('T') ? value : `${value}T00:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const weightFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0
});

const sessionExerciseLabel = (count: number): string =>
  `${count} ${count === 1 ? 'exercício' : 'exercícios'}`;

const sessionSetLabel = (count: number): string =>
  `${count} ${count === 1 ? 'série' : 'séries'}`;

const sessionCountLabel = (count: number): string =>
  `${count} ${count === 1 ? 'dia registrado' : 'dias registrados'}`;

interface WorkoutCardProps {
  workout: WorkoutClass;
  onDuplicate?: (workout: WorkoutClass) => void;
  onDelete?: (workout: WorkoutClass) => void;
  deletingIds?: ReadonlySet<string>;
}

const getSessionDateLabel = (session?: WorkoutSession): string =>
  formatDate(session?.scheduledFor) ?? 'Sem data';

function WorkoutCard({ workout, onDuplicate, onDelete, deletingIds }: WorkoutCardProps) {
  const sessions = useMemo(() => workout.sessions ?? [], [workout.sessions]);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0]?.id ?? '');

  useEffect(() => {
    if (sessions.length === 0) {
      if (activeSessionId !== '') {
        setActiveSessionId('');
      }
      return;
    }

    if (!activeSessionId || !sessions.some((session) => session.id === activeSessionId)) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  const activeSession = useMemo(() => {
    if (sessions.length === 0) {
      return undefined;
    }

    return sessions.find((session) => session.id === activeSessionId) ?? sessions[0];
  }, [sessions, activeSessionId]);

  const formattedLastDate = formatDate(workout.lastSessionOn ?? workout.scheduledFor);
  const formattedActiveDate = getSessionDateLabel(activeSession);
  const sessionCount = workout.sessionCount ?? sessions.length;
  const isDeleting = deletingIds?.has(workout.id) ?? false;

  const handleDuplicateClick = () => {
    if (!onDuplicate || !activeSession) {
      return;
    }

    onDuplicate({
      ...workout,
      scheduledFor: activeSession.scheduledFor,
      notes: activeSession.notes ?? workout.notes,
      exercises: activeSession.exercises,
      exerciseCount: activeSession.exerciseCount,
      totalSets: activeSession.totalSets
    });
  };

  return (
    <article className={styles.card}>
      <header className={styles.cardHeader}>
        <div>
          <h3>{workout.name}</h3>
          <ul className={styles.metaList}>
            {workout.focus ? <li>Foco: {workout.focus}</li> : null}
            {sessionCount > 0 ? <li>{sessionCountLabel(sessionCount)}</li> : <li>Nenhum dia registrado</li>}
            {formattedLastDate ? <li>Último registro: {formattedLastDate}</li> : null}
          </ul>
        </div>
        {activeSession ? (
          <div className={styles.metrics}>
            <span>
              <strong>{activeSession.exerciseCount}</strong> {sessionExerciseLabel(activeSession.exerciseCount)}
            </span>
            <span>
              <strong>{activeSession.totalSets}</strong> {sessionSetLabel(activeSession.totalSets)}
            </span>
          </div>
        ) : null}
      </header>

      {onDuplicate || onDelete ? (
        <div className={styles.cardActions}>
          {onDelete ? (
            <button
              type="button"
              className={styles.deleteButton}
              onClick={() => onDelete(workout)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir treino'}
            </button>
          ) : null}
          {onDuplicate ? (
            <button
              type="button"
              className={styles.duplicateButton}
              onClick={handleDuplicateClick}
              disabled={isDeleting || !activeSession}
            >
              Registrar novo dia
            </button>
          ) : null}
        </div>
      ) : null}

      {sessions.length > 1 ? (
        <div
          className={styles.sessionTabs}
          role="tablist"
          aria-label={`Dias registrados para ${workout.name}`}
        >
          {sessions.map((session) => {
            const isActive = session.id === (activeSession?.id ?? '');
            const className = isActive
              ? `${styles.sessionTab} ${styles.activeSessionTab}`
              : styles.sessionTab;

            return (
              <button
                key={session.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={className}
                onClick={() => setActiveSessionId(session.id)}
              >
                <span className={styles.sessionTabLabel}>{getSessionDateLabel(session)}</span>
                <span className={styles.sessionTabMeta}>
                  {sessionExerciseLabel(session.exerciseCount)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {activeSession ? (
        <div className={styles.sessionSummary}>
          <div className={styles.sessionInfo}>
            <strong>Dia selecionado:</strong> {formattedActiveDate}
          </div>
          {activeSession.notes ? <p className={styles.notes}>{activeSession.notes}</p> : null}
        </div>
      ) : (
        <p className={styles.emptyMessage}>Nenhum dia cadastrado para este treino.</p>
      )}

      {activeSession ? (
        <div className={styles.exerciseGrid}>
          {activeSession.exercises.map((exercise) => (
            <section key={exercise.id} className={styles.exerciseCard}>
              <header className={styles.exerciseHeader}>
                <div>
                  <h4>{exercise.name}</h4>
                  {exercise.muscleGroup ? <span>{exercise.muscleGroup}</span> : null}
                </div>
                <span className={styles.seriesCount}>{exercise.seriesCount} séries</span>
              </header>
              {exercise.notes ? <p className={styles.exerciseNotes}>{exercise.notes}</p> : null}
              <ol className={styles.setList}>
                {exercise.sets.map((set) => (
                  <li key={set.id} className={styles.setItem}>
                    <span className={styles.setOrder}>Série {set.order}</span>
                    <span className={styles.setMetric}>{weightFormatter.format(set.weightKg)} kg</span>
                    <span className={styles.setMetric}>{set.repetitions} repetições</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default function WorkoutClassList({
  classes,
  emptyLabel,
  onDuplicate,
  onDelete,
  deletingIds
}: WorkoutClassListProps) {
  if (classes.length === 0) {
    return <p className={styles.empty}>{emptyLabel}</p>;
  }

  return (
    <div className={styles.list}>
      {classes.map((workout) => (
        <WorkoutCard
          key={workout.id}
          workout={workout}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          deletingIds={deletingIds}
        />
      ))}
    </div>
  );
}
