import { Stack, useLocalSearchParams } from 'expo-router';

import { MuscleExercisesList } from '@/components/exercise-picker';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { MUSCLE_GROUP_LABELS, MUSCLE_GROUPS, type MuscleGroup } from '@/domain/constants';
import { addExerciseAndOpen } from '@/workout-flow';

const isMuscleGroup = (value: string | undefined): value is MuscleGroup =>
  MUSCLE_GROUPS.includes(value as MuscleGroup);

/** One muscle group's exercises; tapping one adds it to the workout. */
export default function AddExerciseByMuscleScreen() {
  const { id, muscle } = useLocalSearchParams<{ id: string; muscle: string }>();

  if (!isMuscleGroup(muscle)) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Add exercise' }} />
        <Notice title="Unknown muscle group" body={String(muscle)} />
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: MUSCLE_GROUP_LABELS[muscle] }} />
      <MuscleExercisesList muscle={muscle} onPick={(exercise) => addExerciseAndOpen(id, exercise.id)} />
    </>
  );
}
