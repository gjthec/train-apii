'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { MuscleGroupClass, NewWorkoutClassInput, WorkoutClass } from '@/lib/api';
import styles from '@/styles/WorkoutClassForm.module.css';
import WorkoutExerciseFields from './WorkoutExerciseFields';
import type {
  WorkoutClassFormState,
  WorkoutExerciseDraft,
  WorkoutSetDraft
} from './types';

interface WorkoutClassFormProps {
  onSubmit: (input: NewWorkoutClassInput) => Promise<void>;
  isSubmitting: boolean;
  muscleGroups: readonly MuscleGroupClass[];
  muscleGroupError?: string | null;
  prefillRequest?: {
    workout: WorkoutClass;
    token: number;
  } | null;
  onClearPrefill?: () => void;
}

type TextInputEvent = { target: { value: string } };

const generateLocalId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayInputValue = (): string => formatDateForInput(new Date());

const normalizeDateInput = (value: string | undefined): string => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateForInput(parsed);
    }
  }

  return getTodayInputValue();
};

const createEmptySet = (): WorkoutSetDraft => ({
  id: generateLocalId('set'),
  weight: '',
  repetitions: ''
});

const createEmptyExercise = (): WorkoutExerciseDraft => ({
  id: generateLocalId('exercise'),
  name: '',
  muscleGroup: '',
  notes: '',
  sets: [createEmptySet()]
});

const createInitialState = (): WorkoutClassFormState => ({
  workoutId: null,
  name: '',
  focus: '',
  scheduledFor: getTodayInputValue(),
  notes: '',
  exercises: [createEmptyExercise()]
});

const toNumberOrUndefined = (value: string, isInteger = false): number | undefined => {
  const normalized = value.replace(',', '.');
  const parsed = isInteger ? Number.parseInt(normalized, 10) : Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const createStateFromWorkout = (workout: WorkoutClass): WorkoutClassFormState => {
  const exercises = workout.exercises.length > 0 ? workout.exercises : [
    {
      id: generateLocalId('exercise'),
      name: '',
      muscleGroup: '',
      notes: '',
      sets: []
    }
  ];

  return {
    workoutId: workout.id ?? null,
    name: workout.name ?? '',
    focus: workout.focus ?? '',
    scheduledFor: getTodayInputValue(),
    notes: workout.notes ?? '',
    exercises: exercises.map((exercise) => ({
      id: exercise.id ?? generateLocalId('exercise'),
      name: exercise.name,
      muscleGroup: exercise.muscleGroup ?? '',
      notes: exercise.notes ?? '',
      sets:
        exercise.sets.length > 0
          ? exercise.sets.map((set) => ({
              id: set.id ?? generateLocalId('set'),
              weight: Number.isFinite(set.weightKg) ? `${set.weightKg}` : '',
              repetitions: Number.isFinite(set.repetitions) ? `${set.repetitions}` : ''
            }))
          : [createEmptySet()]
    }))
  };
};

export default function WorkoutClassForm({
  onSubmit,
  isSubmitting,
  muscleGroups,
  muscleGroupError,
  prefillRequest,
  onClearPrefill
}: WorkoutClassFormProps) {
  const [formState, setFormState] = useState<WorkoutClassFormState>(() => createInitialState());
  const activePrefill = prefillRequest?.workout;
  const exercisesCount = formState.exercises.length;
  const hasMuscleGroups = muscleGroups.length > 0;

  useEffect(() => {
    if (!prefillRequest) {
      return;
    }

    setFormState(createStateFromWorkout(prefillRequest.workout));
  }, [prefillRequest]);

  const prefillDateLabel = useMemo(() => {
    if (!activePrefill?.scheduledFor) {
      return null;
    }

    const normalized = normalizeDateInput(activePrefill.scheduledFor);
    const parsed = new Date(`${normalized}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }

    return normalized;
  }, [activePrefill?.scheduledFor]);

  const handleClearPrefillClick = () => {
    setFormState(createInitialState());
    onClearPrefill?.();
  };

  const handleRootFieldChange = (field: 'name' | 'focus' | 'scheduledFor' | 'notes') =>
    (event: TextInputEvent) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleExerciseFieldChange = (
    exerciseId: string,
    field: 'name' | 'muscleGroup' | 'notes',
    value: string
  ) => {
    setFormState((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, [field]: value } : exercise
      )
    }));
  };

  const handleSetFieldChange = (
    exerciseId: string,
    setId: string,
    field: 'weight' | 'repetitions',
    value: string
  ) => {
    setFormState((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) => (set.id === setId ? { ...set, [field]: value } : set))
            }
          : exercise
      )
    }));
  };

  const handleAddExercise = () => {
    setFormState((prev) => ({
      ...prev,
      exercises: [...prev.exercises, createEmptyExercise()]
    }));
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setFormState((prev) => {
      const remaining = prev.exercises.filter((exercise) => exercise.id !== exerciseId);
      return {
        ...prev,
        exercises: remaining.length > 0 ? remaining : [createEmptyExercise()]
      };
    });
  };

  const handleAddSet = (exerciseId: string) => {
    setFormState((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, sets: [...exercise.sets, createEmptySet()] }
          : exercise
      )
    }));
  };

  const handleRemoveSet = (exerciseId: string, setId: string) => {
    setFormState((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise) => {
        if (exercise.id !== exerciseId) {
          return exercise;
        }

        const remainingSets = exercise.sets.filter((set) => set.id !== setId);
        return {
          ...exercise,
          sets: remainingSets.length > 0 ? remainingSets : [createEmptySet()]
        };
      })
    }));
  };

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();

    const payload: NewWorkoutClassInput = {
      workoutId: formState.workoutId ?? undefined,
      name: formState.name,
      focus: formState.focus,
      scheduledFor: normalizeDateInput(formState.scheduledFor),
      notes: formState.notes,
      exercises: formState.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        notes: exercise.notes,
        sets: exercise.sets.map((set) => ({
          id: set.id,
          weightKg: toNumberOrUndefined(set.weight),
          repetitions: toNumberOrUndefined(set.repetitions, true)
        }))
      }))
    };

    try {
      await onSubmit(payload);
      setFormState(createInitialState());
      onClearPrefill?.();
    } catch (error) {
      // O estado de erro é tratado pelo componente pai.
    }
  };

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2>Novo treino do dia</h2>
          <p>Organize os exercícios com séries, cargas e repetições para acompanhar sua evolução.</p>
        </div>
        <span className={styles.exerciseCount}>
          {exercisesCount} {exercisesCount === 1 ? 'exercício' : 'exercícios'}
        </span>
      </header>
      {activePrefill ? (
        <div className={styles.prefillBanner}>
          <div>
            <strong>Treino base carregado:</strong> {activePrefill.name}
            {prefillDateLabel ? ` (${prefillDateLabel})` : ''}
          </div>
          <div className={styles.prefillActions}>
            <span>Atualize as cargas e escolha a data para registrar um novo dia.</span>
            <button type="button" className={styles.clearPrefillButton} onClick={handleClearPrefillClick}>
              Limpar formulário
            </button>
          </div>
        </div>
      ) : null}
      {muscleGroupError ? <p className={styles.inlineError}>{muscleGroupError}</p> : null}
      {!hasMuscleGroups ? (
        <p className={styles.supportMessage}>
          Cadastre os grupos musculares em <Link href="/muscle-groups">Grupos musculares</Link> para
          habilitar a seleção durante o cadastro dos exercícios.
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inlineFields}>
          <div className={styles.fieldGroup}>
            <label htmlFor="workout-name">Nome do treino *</label>
            <input
              id="workout-name"
              name="name"
              value={formState.name}
              onChange={handleRootFieldChange('name')}
              placeholder="Ex.: Treino de perna"
              required
            />
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor="workout-focus">Foco</label>
            <input
              id="workout-focus"
              name="focus"
              value={formState.focus}
              onChange={handleRootFieldChange('focus')}
              placeholder="Ex.: Quadríceps, posterior"
            />
          </div>
        </div>
        <div className={styles.inlineFields}>
          <div className={styles.fieldGroup}>
            <label htmlFor="workout-date">Data</label>
            <input
              id="workout-date"
              type="date"
              name="scheduledFor"
              value={formState.scheduledFor}
              onChange={handleRootFieldChange('scheduledFor')}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor="workout-notes">Observações</label>
            <input
              id="workout-notes"
              name="notes"
              value={formState.notes}
              onChange={handleRootFieldChange('notes')}
              placeholder="Notas gerais, aquecimento, etc."
            />
          </div>
        </div>

        <div className={styles.exerciseList}>
          {formState.exercises.map((exercise, index) => (
            <WorkoutExerciseFields
              key={exercise.id}
              index={index}
              exercise={exercise}
              canRemove={formState.exercises.length > 1}
              muscleGroupOptions={muscleGroups}
              onExerciseFieldChange={handleExerciseFieldChange}
              onSetFieldChange={handleSetFieldChange}
              onAddSet={handleAddSet}
              onRemoveSet={handleRemoveSet}
              onRemoveExercise={handleRemoveExercise}
            />
          ))}
        </div>

        <div className={styles.formActions}>
          <button type="button" className={styles.secondaryButton} onClick={handleAddExercise}>
            Adicionar exercício
          </button>
          <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Cadastrar treino'}
          </button>
        </div>
      </form>
    </section>
  );
}
