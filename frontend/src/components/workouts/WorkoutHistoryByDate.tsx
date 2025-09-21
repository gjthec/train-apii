'use client';

import WorkoutClassList from '@/components/workouts/WorkoutClassList';
import type { WorkoutClass } from '@/lib/api';
import styles from '@/styles/WorkoutHistoryByDate.module.css';

interface WorkoutHistoryByDateProps {
  classes: WorkoutClass[];
  emptyLabel: string;
  onDuplicate?: (workout: WorkoutClass) => void;
  onDelete?: (workout: WorkoutClass) => void;
  deletingIds?: ReadonlySet<string>;
}

export default function WorkoutHistoryByDate({
  classes,
  emptyLabel,
  onDuplicate,
  onDelete,
  deletingIds
}: WorkoutHistoryByDateProps) {
  if (classes.length === 0) {
    return <p className={styles.empty}>{emptyLabel}</p>;
  }

  return (
    <div className={styles.container}>
      <WorkoutClassList
        classes={classes}
        emptyLabel={emptyLabel}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        deletingIds={deletingIds}
      />
    </div>
  );
}
