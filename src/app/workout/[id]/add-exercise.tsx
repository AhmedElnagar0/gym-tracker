import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import { ExercisePicker } from '@/components/exercise-picker';
import { db } from '@/db/client';
import { addExerciseToWorkout } from '@/repo/workout-exercises';
import { routes } from '@/routes';

/** Pick an exercise; it's added to the end of the workout and its logging screen opens. */
export default function AddExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: 'Add exercise' }} />
      <ExercisePicker
        onPick={(exercise) => {
          const result = addExerciseToWorkout(db, id, exercise.id);
          if (result.ok) router.replace(routes.workoutExercise(id, result.value));
          else Alert.alert('Not added', result.error);
        }}
      />
    </>
  );
}
