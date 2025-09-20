'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { MuscleGroupClass, NewWorkoutClassInput } from '@/lib/api';
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
}

type TextInputEvent = { target: { value: string } };

const generateLocalId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
  name: '',
  focus: '',
  scheduledFor: '',
  notes: '',
  exercises: [createEmptyExercise()]
});

const toNumberOrUndefined = (value: string, isInteger = false): number | undefined => {
  const normalized = value.replace(',', '.');
  const parsed = isInteger ? Number.parseInt(normalized, 10) : Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export default function WorkoutClassForm({
  onSubmit,
  isSubmitting,
  muscleGroups,
  muscleGroupError
}: WorkoutClassFormProps) {
  const [formState, setFormState] = useState<WorkoutClassFormState>(() => createInitialState());
  const exercisesCount = formState.exercises.length;
  const hasMuscleGroups = muscleGroups.length > 0;

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
      name: formState.name,
      focus: formState.focus,
      scheduledFor: formState.scheduledFor,
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
