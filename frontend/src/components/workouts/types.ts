export interface WorkoutSetDraft {
  id: string;
  weight: string;
  repetitions: string;
}

export interface WorkoutExerciseDraft {
  id: string;
  name: string;
  muscleGroup: string;
  notes: string;
  sets: WorkoutSetDraft[];
}

export interface WorkoutClassFormState {
  workoutId: string | null;
  name: string;
  focus: string;
  scheduledFor: string;
  notes: string;
  exercises: WorkoutExerciseDraft[];
}
