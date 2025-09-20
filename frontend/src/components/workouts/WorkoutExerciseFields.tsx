'use client';

import type { MuscleGroupClass } from '@/lib/api';
import styles from '@/styles/WorkoutClassForm.module.css';
import type { WorkoutExerciseDraft } from './types';

type TextInputEvent = { target: { value: string } };

interface WorkoutExerciseFieldsProps {
  exercise: WorkoutExerciseDraft;
  index: number;
  canRemove: boolean;
  muscleGroupOptions: readonly MuscleGroupClass[];
  onExerciseFieldChange: (exerciseId: string, field: 'name' | 'muscleGroup' | 'notes', value: string) => void;
  onSetFieldChange: (exerciseId: string, setId: string, field: 'weight' | 'repetitions', value: string) => void;
  onAddSet: (exerciseId: string) => void;
  onRemoveSet: (exerciseId: string, setId: string) => void;
  onRemoveExercise: (exerciseId: string) => void;
}

const renderSetLabel = (index: number): string => `Série ${index + 1}`;

export default function WorkoutExerciseFields({
  exercise,
  index,
  canRemove,
  muscleGroupOptions,
  onExerciseFieldChange,
  onSetFieldChange,
  onAddSet,
  onRemoveSet,
  onRemoveExercise
}: WorkoutExerciseFieldsProps) {
  const hasOptions = muscleGroupOptions.length > 0;
  const isCustomMuscleGroup =
    exercise.muscleGroup.length > 0 &&
    !muscleGroupOptions.some((option) => option.name === exercise.muscleGroup);
  const muscleGroupPlaceholder = hasOptions
    ? 'Selecione um grupo'
    : 'Cadastre grupos musculares para habilitar';
  const selectDisabled = !hasOptions && !isCustomMuscleGroup;

  return (
    <fieldset className={styles.exerciseCard}>
      <legend className={styles.exerciseLegend}>Exercício {index + 1}</legend>
      <div className={styles.exerciseHeader}>
        <div className={styles.fieldGroup}>
          <label htmlFor={`exercise-name-${exercise.id}`}>Nome *</label>
          <input
            id={`exercise-name-${exercise.id}`}
            value={exercise.name}
            onChange={(event: TextInputEvent) =>
              onExerciseFieldChange(exercise.id, 'name', event.target.value)}
            placeholder="Ex.: Agachamento livre"
            required
          />
        </div>
        <div className={styles.fieldGroup}>
          <label htmlFor={`exercise-muscle-${exercise.id}`}>Grupo muscular</label>
          <select
            id={`exercise-muscle-${exercise.id}`}
            value={exercise.muscleGroup}
            onChange={(event: TextInputEvent) =>
              onExerciseFieldChange(exercise.id, 'muscleGroup', event.target.value)}
            disabled={selectDisabled}
          >
            <option value="">{muscleGroupPlaceholder}</option>
            {isCustomMuscleGroup ? (
              <option value={exercise.muscleGroup}>{`Personalizado: ${exercise.muscleGroup}`}</option>
            ) : null}
            {muscleGroupOptions.map((option) => (
              <option key={option.id} value={option.name}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <label htmlFor={`exercise-notes-${exercise.id}`}>Observações</label>
        <input
          id={`exercise-notes-${exercise.id}`}
          value={exercise.notes}
          onChange={(event: TextInputEvent) =>
            onExerciseFieldChange(exercise.id, 'notes', event.target.value)}
          placeholder="Técnica, tempo, variações..."
        />
      </div>

      <ol className={styles.setList}>
        {exercise.sets.map((set, setIndex) => (
          <li key={set.id} className={styles.setRow}>
            <div className={styles.setLabel}>{renderSetLabel(setIndex)}</div>
            <div className={styles.inlineFields}>
              <div className={styles.fieldGroup}>
                <label htmlFor={`set-weight-${set.id}`}>Peso (kg) *</label>
                <input
                  id={`set-weight-${set.id}`}
                  inputMode="decimal"
                  value={set.weight}
                  onChange={(event: TextInputEvent) =>
                    onSetFieldChange(exercise.id, set.id, 'weight', event.target.value)}
                  placeholder="Ex.: 60"
                  required
                />
              </div>
              <div className={styles.fieldGroup}>
                <label htmlFor={`set-repetitions-${set.id}`}>Repetições *</label>
                <input
                  id={`set-repetitions-${set.id}`}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={set.repetitions}
                  onChange={(event: TextInputEvent) =>
                    onSetFieldChange(exercise.id, set.id, 'repetitions', event.target.value)}
                  placeholder="Ex.: 12"
                  required
                />
              </div>
            </div>
            <div className={styles.setActions}>
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => onRemoveSet(exercise.id, set.id)}
                disabled={exercise.sets.length === 1}
              >
                Remover série
              </button>
            </div>
          </li>
        ))}
      </ol>

      <div className={styles.exerciseActions}>
        <button type="button" className={styles.secondaryButton} onClick={() => onAddSet(exercise.id)}>
          Adicionar série
        </button>
        <button
          type="button"
          className={styles.removeButton}
          onClick={() => onRemoveExercise(exercise.id)}
          disabled={!canRemove}
        >
          Remover exercício
        </button>
      </div>
    </fieldset>
  );
}
