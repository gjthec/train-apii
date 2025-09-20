'use client';

import { useEffect, useMemo, useState } from 'react';

import WorkoutClassList from '@/components/workouts/WorkoutClassList';
import type { WorkoutClass } from '@/lib/api';
import styles from '@/styles/WorkoutHistoryByDate.module.css';

const NO_DATE_KEY = '__no-date__';

const extractDateKey = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getUTCFullYear();
    const month = `${parsed.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${parsed.getUTCDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return undefined;
};

const formatDateLabel = (key: string): string => {
  if (key === NO_DATE_KEY) {
    return 'Sem data';
  }

  const [year, month, day] = key.split('-').map((part) => Number.parseInt(part, 10));
  if (
    Number.isFinite(year) &&
    Number.isFinite(month) &&
    Number.isFinite(day) &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31
  ) {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  }

  return key;
};

const getGroupKey = (workout: WorkoutClass): string => {
  return (
    extractDateKey(workout.scheduledFor) ??
    extractDateKey(workout.updatedAt) ??
    extractDateKey(workout.createdAt) ??
    NO_DATE_KEY
  );
};

interface WorkoutDateGroup {
  key: string;
  label: string;
  workouts: WorkoutClass[];
}

const groupWorkoutsByDate = (workouts: WorkoutClass[]): WorkoutDateGroup[] => {
  if (workouts.length === 0) {
    return [];
  }

  const groups: WorkoutDateGroup[] = [];
  const map = new Map<string, WorkoutDateGroup>();

  workouts.forEach((workout) => {
    const key = getGroupKey(workout);
    const existing = map.get(key);
    if (existing) {
      existing.workouts.push(workout);
      return;
    }

    const group: WorkoutDateGroup = {
      key,
      label: formatDateLabel(key),
      workouts: [workout]
    };
    map.set(key, group);
    groups.push(group);
  });

  return groups;
};

interface WorkoutHistoryByDateProps {
  classes: WorkoutClass[];
  emptyLabel: string;
  onDuplicate?: (workout: WorkoutClass) => void;
}

export default function WorkoutHistoryByDate({
  classes,
  emptyLabel,
  onDuplicate
}: WorkoutHistoryByDateProps) {
  const groups = useMemo(() => groupWorkoutsByDate(classes), [classes]);
  const [selectedKey, setSelectedKey] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (groups.length === 0) {
      if (selectedKey !== undefined) {
        setSelectedKey(undefined);
      }
      return;
    }

    if (!selectedKey || !groups.some((group) => group.key === selectedKey)) {
      setSelectedKey(groups[0].key);
    }
  }, [groups, selectedKey]);

  if (groups.length === 0) {
    return <p className={styles.empty}>{emptyLabel}</p>;
  }

  const activeGroup = groups.find((group) => group.key === selectedKey) ?? groups[0];

  return (
    <div className={styles.container}>
      <div role="tablist" aria-label="Histórico de treinos" className={styles.tabList}>
        {groups.map((group) => {
          const isActive = group.key === activeGroup.key;
          const className = isActive
            ? `${styles.tab} ${styles.activeTab}`
            : styles.tab;

          return (
            <button
              key={group.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={className}
              onClick={() => setSelectedKey(group.key)}
            >
              <span className={styles.tabLabel}>{group.label}</span>
              <span className={styles.tabMeta}>
                {group.workouts.length}{' '}
                {group.workouts.length === 1 ? 'treino' : 'treinos'}
              </span>
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className={styles.tabPanel}>
        <WorkoutClassList
          classes={activeGroup.workouts}
          emptyLabel={emptyLabel}
          onDuplicate={onDuplicate}
        />
      </div>
    </div>
  );
}
