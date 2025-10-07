'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import type {
  Exercise,
  MuscleGroupClass,
  NewExerciseInput,
  NewWorkoutClassInput,
  WorkoutClass
} from '@/lib/api';
import styles from '@/styles/WorkoutClassForm.module.css';
import WorkoutExerciseFields from './WorkoutExerciseFields';
import type {
  WorkoutClassFormState,
  WorkoutExerciseDraft,
  WorkoutSetDraft
} from './types';

type WorkoutFormIntent = 'create' | 'register' | 'edit';

interface WorkoutClassFormProps {
  onSubmit: (input: NewWorkoutClassInput) => Promise<void>;
  isSubmitting: boolean;
  muscleGroups: readonly MuscleGroupClass[];
  muscleGroupError?: string | null;
  exercises: readonly Exercise[];
  exerciseError?: string | null;
  onRegisterExercise: (input: NewExerciseInput) => Promise<Exercise>;
  onUpdateExercise: (exerciseId: string, input: NewExerciseInput) => Promise<Exercise>;
  onDeleteExercise: (exerciseId: string) => Promise<void>;
  prefillRequest?: {
    workout: WorkoutClass;
    token: number;
    intent?: Exclude<WorkoutFormIntent, 'create'>;
    sessionId?: string | null;
  } | null;
  onClearPrefill?: () => void;
}

type TextInputEvent = { target: { value: string } };

type ExerciseEditorField =
  | 'name'
  | 'muscleGroup'
  | 'modality'
  | 'description'
  | 'equipment'
  | 'sets'
  | 'repetitions'
  | 'rest';

type ExerciseEditorValues = Record<ExerciseEditorField, string>;

interface ExerciseEditorState {
  formExerciseId: string;
  libraryExerciseId: string;
  values: ExerciseEditorValues;
}

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
  libraryExerciseId: null,
  sets: [createEmptySet()]
});

const createInitialState = (): WorkoutClassFormState => ({
  workoutId: null,
  sessionId: null,
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

const createStateFromWorkout = (
  workout: WorkoutClass,
  intent: WorkoutFormIntent,
  sessionId: string | null
): WorkoutClassFormState => {
  const exercises = workout.exercises.length > 0 ? workout.exercises : [
    {
      id: generateLocalId('exercise'),
      name: '',
      muscleGroup: '',
      notes: '',
      libraryExerciseId: null,
      sets: []
    }
  ];

  return {
    workoutId: workout.id ?? null,
    sessionId: intent === 'edit' ? sessionId : null,
    name: workout.name ?? '',
    focus: workout.focus ?? '',
    scheduledFor:
      intent === 'edit' && workout.scheduledFor
        ? normalizeDateInput(workout.scheduledFor)
        : getTodayInputValue(),
    notes: workout.notes ?? '',
    exercises: exercises.map((exercise) => ({
      id: exercise.id ?? generateLocalId('exercise'),
      name: exercise.name,
      muscleGroup: exercise.muscleGroup ?? '',
      notes: exercise.notes ?? '',
      libraryExerciseId: null,
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

const createEditorValuesFromExercise = (exercise: Exercise): ExerciseEditorValues => ({
  name: exercise.name ?? '',
  muscleGroup: exercise.muscleGroup ?? '',
  modality: exercise.modality ?? '',
  description: exercise.description ?? '',
  equipment: exercise.equipment ?? '',
  sets: typeof exercise.sets === 'number' ? `${exercise.sets}` : '',
  repetitions: typeof exercise.repetitions === 'number' ? `${exercise.repetitions}` : '',
  rest: exercise.rest ?? ''
});

export default function WorkoutClassForm({
  onSubmit,
  isSubmitting,
  muscleGroups,
  muscleGroupError,
  exercises,
  exerciseError,
  onRegisterExercise,
  onUpdateExercise,
  onDeleteExercise,
  prefillRequest,
  onClearPrefill
}: WorkoutClassFormProps) {
  const [formState, setFormState] = useState<WorkoutClassFormState>(() => createInitialState());
  const [formIntent, setFormIntent] = useState<WorkoutFormIntent>('create');
  const activePrefill = prefillRequest?.workout;
  const exercisesCount = formState.exercises.length;
  const hasMuscleGroups = muscleGroups.length > 0;
  const hasExerciseOptions = exercises.length > 0;
  const [savingExerciseIds, setSavingExerciseIds] = useState<Set<string>>(() => new Set());
  const [exerciseLibraryError, setExerciseLibraryError] = useState<string | null>(null);
  const [exerciseLibrarySuccess, setExerciseLibrarySuccess] = useState<string | null>(null);
  const [exerciseEditor, setExerciseEditor] = useState<ExerciseEditorState | null>(null);
  const [isUpdatingLibraryExercise, setIsUpdatingLibraryExercise] = useState(false);
  const [deletingLibraryExerciseIds, setDeletingLibraryExerciseIds] = useState<Set<string>>(
    () => new Set()
  );

  useEffect(() => {
    if (!prefillRequest) {
      return;
    }

    const intent = prefillRequest.intent ?? 'register';
    const nextSessionId = prefillRequest.sessionId ?? null;
    setFormState(createStateFromWorkout(prefillRequest.workout, intent, nextSessionId));
    setFormIntent(intent);
    setExerciseEditor(null);
    setExerciseLibrarySuccess(null);
  }, [prefillRequest]);

  useEffect(() => {
    if (!prefillRequest) {
      setFormIntent('create');
    }
  }, [prefillRequest]);

  useEffect(() => {
    if (!exerciseEditor) {
      return;
    }

    const latest = exercises.find((item) => item.id === exerciseEditor.libraryExerciseId);
    if (!latest) {
      setExerciseEditor(null);
      return;
    }

    setExerciseEditor((prev) => {
      if (!prev || prev.libraryExerciseId !== latest.id) {
        return prev;
      }

      const nextValues = createEditorValuesFromExercise(latest);
      const hasChanged = (Object.keys(nextValues) as ExerciseEditorField[]).some(
        (field) => prev.values[field] !== nextValues[field]
      );

      if (!hasChanged) {
        return prev;
      }

      return { ...prev, values: nextValues };
    });
  }, [exercises, exerciseEditor]);

  useEffect(() => {
    setFormState((prev) => {
      let changed = false;
      const nextExercises = prev.exercises.map((exercise) => {
        const trimmedName = exercise.name.trim();
        if (!trimmedName) {
          if (exercise.libraryExerciseId !== null) {
            changed = true;
            return { ...exercise, libraryExerciseId: null };
          }
          return exercise;
        }

        const matched =
          exercises.find((option) => option.id === exercise.libraryExerciseId) ??
          exercises.find((option) => option.name.toLowerCase() === trimmedName.toLowerCase());

        if (!matched) {
          if (exercise.libraryExerciseId !== null) {
            changed = true;
            return { ...exercise, libraryExerciseId: null };
          }
          return exercise;
        }

        const normalizedMuscle = matched.muscleGroup ?? '';
        if (
          exercise.libraryExerciseId === matched.id &&
          exercise.muscleGroup === normalizedMuscle
        ) {
          return exercise;
        }

        changed = true;
        return {
          ...exercise,
          libraryExerciseId: matched.id,
          muscleGroup: exercise.muscleGroup || normalizedMuscle
        };
      });

      if (!changed) {
        return prev;
      }

      return { ...prev, exercises: nextExercises };
    });
  }, [exercises]);

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

  const headerTitle =
    formIntent === 'edit' ? 'Editar treino' : 'Novo treino do dia';

  const headerDescription =
    formIntent === 'edit'
      ? 'Atualize os exercícios, séries e cargas deste treino salvo.'
      : 'Organize os exercícios com séries, cargas e repetições para acompanhar sua evolução.';

  const submitLabel = (() => {
    if (isSubmitting) {
      return 'Salvando...';
    }

    if (formIntent === 'edit') {
      return 'Salvar alterações';
    }

    if (formIntent === 'register') {
      return 'Registrar novo dia';
    }

    return 'Cadastrar treino';
  })();

  const prefillInstructions =
    formIntent === 'edit'
      ? 'Faça as alterações necessárias e clique em “Salvar alterações”.'
      : 'Atualize as cargas e escolha a data para registrar um novo dia.';

  const handleClearPrefillClick = () => {
    setFormState(createInitialState());
    setFormIntent('create');
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
        exercise.id === exerciseId
          ? {
              ...exercise,
              [field]: value,
              libraryExerciseId: field === 'name' || field === 'muscleGroup' ? null : exercise.libraryExerciseId
            }
          : exercise
      )
    }));
  };

  const handleSelectExerciseFromLibrary = (exerciseId: string, selectedId: string) => {
    const selected = exercises.find((item) => item.id === selectedId);
    setFormState((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise) => {
        if (exercise.id !== exerciseId) {
          return exercise;
        }

        if (!selected) {
          return { ...exercise, libraryExerciseId: null };
        }

        return {
          ...exercise,
          libraryExerciseId: selected.id,
          name: selected.name,
          muscleGroup: selected.muscleGroup ?? '',
          notes: exercise.notes
        };
      })
    }));
  };

  const handleSaveExerciseToLibrary = async (exerciseId: string) => {
    const exercise = formState.exercises.find((item) => item.id === exerciseId);
    if (!exercise) {
      return;
    }

    const trimmedName = exercise.name.trim();
    if (trimmedName.length === 0) {
      setExerciseLibraryError('Informe um nome antes de salvar o exercício.');
      return;
    }

    setExerciseLibraryError(null);
    setExerciseLibrarySuccess(null);
    setSavingExerciseIds((prev) => new Set(prev).add(exerciseId));

    try {
      const created = await onRegisterExercise({
        name: trimmedName,
        muscleGroup: exercise.muscleGroup.trim() || undefined
      });

      setFormState((prev) => ({
        ...prev,
        exercises: prev.exercises.map((item) =>
          item.id === exerciseId
            ? {
                ...item,
                name: created.name,
                muscleGroup: created.muscleGroup ?? '',
                libraryExerciseId: created.id
              }
            : item
        )
      }));
      setExerciseLibrarySuccess('Exercício salvo na biblioteca.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível salvar o exercício na biblioteca.';
      setExerciseLibraryError(message);
    } finally {
      setSavingExerciseIds((prev) => {
        const next = new Set(prev);
        next.delete(exerciseId);
        return next;
      });
    }
  };

  const handleOpenExerciseEditor = (formExerciseId: string, libraryExerciseId: string) => {
    const selected = exercises.find((item) => item.id === libraryExerciseId);
    if (!selected) {
      setExerciseLibraryError('O exercício selecionado não está disponível.');
      return;
    }

    setExerciseLibraryError(null);
    setExerciseLibrarySuccess(null);
    setExerciseEditor({
      formExerciseId,
      libraryExerciseId,
      values: createEditorValuesFromExercise(selected)
    });
  };

  const handleCloseExerciseEditor = () => {
    setExerciseEditor(null);
  };

  const handleExerciseEditorFieldChange = (field: ExerciseEditorField, value: string) => {
    setExerciseEditor((prev) => (prev ? { ...prev, values: { ...prev.values, [field]: value } } : prev));
  };

  const handleExerciseEditorSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!exerciseEditor) {
      return;
    }

    const { libraryExerciseId, values } = exerciseEditor;
    const trimmedName = values.name.trim();
    if (!trimmedName) {
      setExerciseLibraryError('Informe um nome para atualizar o exercício.');
      return;
    }

    setExerciseLibraryError(null);
    setExerciseLibrarySuccess(null);
    setIsUpdatingLibraryExercise(true);

    const sanitizeInput = (value: string): string | undefined => {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    };

    try {
      const updated = await onUpdateExercise(libraryExerciseId, {
        name: trimmedName,
        muscleGroup: sanitizeInput(values.muscleGroup),
        modality: sanitizeInput(values.modality),
        description: sanitizeInput(values.description),
        equipment: sanitizeInput(values.equipment),
        sets: sanitizeInput(values.sets),
        repetitions: sanitizeInput(values.repetitions),
        rest: sanitizeInput(values.rest)
      });

      setFormState((prev) => ({
        ...prev,
        exercises: prev.exercises.map((exercise) =>
          exercise.libraryExerciseId === updated.id
            ? {
                ...exercise,
                name: updated.name,
                muscleGroup: updated.muscleGroup ?? ''
              }
            : exercise
        )
      }));

      setExerciseEditor((prev) =>
        prev && prev.libraryExerciseId === updated.id
          ? { ...prev, values: createEditorValuesFromExercise(updated) }
          : prev
      );

      setExerciseLibrarySuccess('Exercício atualizado com sucesso.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível atualizar o exercício.';
      setExerciseLibraryError(message);
    } finally {
      setIsUpdatingLibraryExercise(false);
    }
  };

  const handleDeleteLibraryExercise = async (_formExerciseId: string, libraryExerciseId: string) => {
    if (!libraryExerciseId) {
      return;
    }

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Deseja realmente remover este exercício cadastrado? Ele deixará de aparecer na lista para novos treinos.'
      );
      if (!confirmed) {
        return;
      }
    }

    setExerciseLibraryError(null);
    setExerciseLibrarySuccess(null);
    setDeletingLibraryExerciseIds((prev) => new Set(prev).add(libraryExerciseId));

    try {
      await onDeleteExercise(libraryExerciseId);
      setFormState((prev) => ({
        ...prev,
        exercises: prev.exercises.map((exercise) =>
          exercise.libraryExerciseId === libraryExerciseId
            ? { ...exercise, libraryExerciseId: null }
            : exercise
        )
      }));

      setExerciseEditor((prev) => (prev && prev.libraryExerciseId === libraryExerciseId ? null : prev));
      setExerciseLibrarySuccess('Exercício removido da biblioteca.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível remover o exercício da biblioteca.';
      setExerciseLibraryError(message);
    } finally {
      setDeletingLibraryExerciseIds((prev) => {
        const next = new Set(prev);
        next.delete(libraryExerciseId);
        return next;
      });
    }
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
      sessionId: formIntent === 'edit' ? formState.sessionId ?? undefined : undefined,
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
      setFormIntent('create');
      setExerciseEditor(null);
      setExerciseLibrarySuccess(null);
      setExerciseLibraryError(null);
      onClearPrefill?.();
    } catch (error) {
      // O estado de erro é tratado pelo componente pai.
    }
  };

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2>{headerTitle}</h2>
          <p>{headerDescription}</p>
        </div>
        <span className={styles.exerciseCount}>
          {exercisesCount} {exercisesCount === 1 ? 'exercício' : 'exercícios'}
        </span>
      </header>
      {activePrefill ? (
        <div className={styles.prefillBanner}>
          <div>
            <strong>{formIntent === 'edit' ? 'Treino em edição:' : 'Treino base carregado:'}</strong>{' '}
            {activePrefill.name}
            {prefillDateLabel ? ` (${prefillDateLabel})` : ''}
          </div>
          <div className={styles.prefillActions}>
            <span>{prefillInstructions}</span>
            <button type="button" className={styles.clearPrefillButton} onClick={handleClearPrefillClick}>
              Limpar formulário
            </button>
          </div>
        </div>
      ) : null}
      {muscleGroupError ? <p className={styles.inlineError}>{muscleGroupError}</p> : null}
      {exerciseError ? <p className={styles.inlineError}>{exerciseError}</p> : null}
      {exerciseLibraryError ? <p className={styles.inlineError}>{exerciseLibraryError}</p> : null}
      {exerciseLibrarySuccess ? <p className={styles.inlineSuccess}>{exerciseLibrarySuccess}</p> : null}
      {!hasMuscleGroups ? (
        <p className={styles.supportMessage}>
          Cadastre os grupos musculares em <Link href="/muscle-groups">Grupos musculares</Link> para
          habilitar a seleção durante o cadastro dos exercícios.
        </p>
      ) : null}
      {exerciseEditor ? (
        <form className={styles.exerciseEditor} onSubmit={handleExerciseEditorSubmit}>
          <div className={styles.exerciseEditorHeader}>
            <div>
              <h3>Editar exercício cadastrado</h3>
              <p>Atualize as informações para reutilizar este exercício em outros treinos.</p>
            </div>
            <button type="button" className={styles.editorCloseButton} onClick={handleCloseExerciseEditor}>
              Fechar
            </button>
          </div>
          <div className={styles.exerciseEditorGrid}>
            <div className={styles.fieldGroup}>
              <label htmlFor="editor-name">Nome *</label>
              <input
                id="editor-name"
                value={exerciseEditor.values.name}
                onChange={(event: TextInputEvent) =>
                  handleExerciseEditorFieldChange('name', event.target.value)
                }
                required
              />
            </div>
            <div className={styles.fieldGroup}>
              <label htmlFor="editor-muscle">Grupo muscular</label>
              <input
                id="editor-muscle"
                value={exerciseEditor.values.muscleGroup}
                onChange={(event: TextInputEvent) =>
                  handleExerciseEditorFieldChange('muscleGroup', event.target.value)
                }
              />
            </div>
            <div className={styles.fieldGroup}>
              <label htmlFor="editor-modality">Modalidade</label>
              <input
                id="editor-modality"
                value={exerciseEditor.values.modality}
                onChange={(event: TextInputEvent) =>
                  handleExerciseEditorFieldChange('modality', event.target.value)
                }
              />
            </div>
            <div className={styles.fieldGroup}>
              <label htmlFor="editor-equipment">Equipamento</label>
              <input
                id="editor-equipment"
                value={exerciseEditor.values.equipment}
                onChange={(event: TextInputEvent) =>
                  handleExerciseEditorFieldChange('equipment', event.target.value)
                }
              />
            </div>
            <div className={styles.fieldGroup}>
              <label htmlFor="editor-description">Descrição</label>
              <input
                id="editor-description"
                value={exerciseEditor.values.description}
                onChange={(event: TextInputEvent) =>
                  handleExerciseEditorFieldChange('description', event.target.value)
                }
              />
            </div>
            <div className={styles.fieldGroup}>
              <label htmlFor="editor-sets">Séries</label>
              <input
                id="editor-sets"
                inputMode="numeric"
                value={exerciseEditor.values.sets}
                onChange={(event: TextInputEvent) =>
                  handleExerciseEditorFieldChange('sets', event.target.value)
                }
              />
            </div>
            <div className={styles.fieldGroup}>
              <label htmlFor="editor-repetitions">Repetições</label>
              <input
                id="editor-repetitions"
                inputMode="numeric"
                value={exerciseEditor.values.repetitions}
                onChange={(event: TextInputEvent) =>
                  handleExerciseEditorFieldChange('repetitions', event.target.value)
                }
              />
            </div>
            <div className={styles.fieldGroup}>
              <label htmlFor="editor-rest">Descanso</label>
              <input
                id="editor-rest"
                value={exerciseEditor.values.rest}
                onChange={(event: TextInputEvent) =>
                  handleExerciseEditorFieldChange('rest', event.target.value)
                }
              />
            </div>
          </div>
          <div className={styles.exerciseEditorActions}>
            <button
              type="button"
              className={styles.dangerButton}
              onClick={() =>
                handleDeleteLibraryExercise(exerciseEditor.formExerciseId, exerciseEditor.libraryExerciseId)
              }
              disabled={
                deletingLibraryExerciseIds.has(exerciseEditor.libraryExerciseId) || isUpdatingLibraryExercise
              }
            >
              {deletingLibraryExerciseIds.has(exerciseEditor.libraryExerciseId)
                ? 'Excluindo...'
                : 'Excluir exercício'}
            </button>
            <div className={styles.exerciseEditorPrimaryActions}>
              <button
                type="button"
                className={styles.editorSecondaryButton}
                onClick={handleCloseExerciseEditor}
                disabled={isUpdatingLibraryExercise}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={styles.editorPrimaryButton}
                disabled={isUpdatingLibraryExercise}
              >
                {isUpdatingLibraryExercise ? 'Salvando alterações...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </form>
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
              exerciseOptions={exercises}
              hasExerciseOptions={hasExerciseOptions}
              onSelectExercise={handleSelectExerciseFromLibrary}
              onSaveExercise={handleSaveExerciseToLibrary}
              isSavingExercise={savingExerciseIds.has(exercise.id)}
              onEditLibraryExercise={handleOpenExerciseEditor}
              onDeleteLibraryExercise={handleDeleteLibraryExercise}
              isDeletingLibraryExercise={
                exercise.libraryExerciseId
                  ? deletingLibraryExerciseIds.has(exercise.libraryExerciseId)
                  : false
              }
              isEditingLibraryExercise={
                exercise.libraryExerciseId === exerciseEditor?.libraryExerciseId && isUpdatingLibraryExercise
              }
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
            {submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
