'use client';

import ResourceList from '@/components/ResourceList';
import type { WorkoutClass } from '@/lib/api';
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

  const date = new Date(value);
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

export default function WorkoutClassList({
  classes,
  emptyLabel,
  onDuplicate,
  onDelete,
  deletingIds
}: WorkoutClassListProps) {
  return (
    <ResourceList
      items={classes}
      emptyLabel={emptyLabel}
      renderItem={(workout) => {
        const formattedDate = formatDate(workout.scheduledFor);
        const isDeleting = deletingIds?.has(workout.id) ?? false;

        return (
          <article className={styles.card}>
            <header className={styles.cardHeader}>
              <div>
                <h3>{workout.name}</h3>
                <ul className={styles.metaList}>
                  {workout.focus ? <li>Foco: {workout.focus}</li> : null}
                  {formattedDate ? <li>Data: {formattedDate}</li> : null}
                </ul>
              </div>
              <div className={styles.metrics}>
                <span>
                  <strong>{workout.exerciseCount}</strong> {workout.exerciseCount === 1 ? 'exercício' : 'exercícios'}
                </span>
                <span>
                  <strong>{workout.totalSets}</strong> {workout.totalSets === 1 ? 'série' : 'séries'}
                </span>
              </div>
            </header>
            {workout.notes ? <p className={styles.notes}>{workout.notes}</p> : null}
            {onDuplicate || onDelete ? (
              <div className={styles.cardActions}>
                {onDelete ? (
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => onDelete(workout)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Excluindo...' : 'Excluir'}
                  </button>
                ) : null}
                {onDuplicate ? (
                  <button
                    type="button"
                    className={styles.duplicateButton}
                    onClick={() => onDuplicate(workout)}
                    disabled={isDeleting}
                  >
                    Registrar novo dia
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className={styles.exerciseGrid}>
              {workout.exercises.map((exercise) => (
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
          </article>
        );
      }}
    />
  );
}
