import { router } from 'expo-router';
import { Alert } from 'react-native';

import { db } from '@/db/client';
import { addExerciseToWorkout } from '@/repo/workout-exercises';
import { routes } from '@/routes';

/**
 * Adds an exercise to a workout and opens its logging screen. The picker screens are
 * removed from the back stack first, so Back from logging returns to the workout overview.
 */
export function addExerciseAndOpen(workoutId: string, exerciseId: string): void {
  const result = addExerciseToWorkout(db, workoutId, exerciseId);
  if (!result.ok) {
    Alert.alert('Not added', result.error);
    return;
  }
  router.dismissTo(routes.workout(workoutId));
  router.push(routes.workoutExercise(workoutId, result.value));
}
