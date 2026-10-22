import { router, Stack, useLocalSearchParams } from 'expo-router';

import { ExercisePicker } from '@/components/exercise-picker';
import { routes } from '@/routes';
import { addExerciseAndOpen } from '@/workout-flow';

/** Pick an exercise by muscle group or from the full list; it's added and its logging screen opens. */
export default function AddExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: 'Add exercise' }} />
      <ExercisePicker
        onPick={(exercise) => addExerciseAndOpen(id, exercise.id)}
        onOpenMuscle={(muscle) => router.push(routes.addExerciseByMuscle(id, muscle))}
      />
    </>
  );
}
