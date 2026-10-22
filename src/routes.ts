import type { Href } from 'expo-router';

import type { MuscleGroup } from '@/domain/constants';

// Every in-app link is built here, so a path typo can only happen in one place.
// (Expo Router's experimental typed routes are off: on Windows its generator listed
// every file under src/ as a route and broke type-checking.)

export const routes = {
  backup: (): Href => '/backup',
  newExercise: (): Href => '/exercise/new',
  newVariant: (parentId: string): Href => ({ pathname: '/exercise/new', params: { parentId } }),
  exercise: (id: string): Href => ({ pathname: '/exercise/[id]', params: { id } }),
  editExercise: (id: string): Href => ({ pathname: '/exercise/[id]/edit', params: { id } }),
  workout: (id: string): Href => ({ pathname: '/workout/[id]', params: { id } }),
  addExerciseToWorkout: (workoutId: string): Href => ({ pathname: '/workout/[id]/add-exercise', params: { id: workoutId } }),
  addExerciseByMuscle: (workoutId: string, muscle: MuscleGroup): Href => ({
    pathname: '/workout/[id]/add-exercise/[muscle]',
    params: { id: workoutId, muscle },
  }),
  workoutExercise: (workoutId: string, workoutExerciseId: string): Href => ({
    pathname: '/workout/[id]/exercise/[weId]',
    params: { id: workoutId, weId: workoutExerciseId },
  }),
};
