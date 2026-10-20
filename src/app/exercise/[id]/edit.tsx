import { router, Stack, useLocalSearchParams } from 'expo-router';

import { ExerciseForm } from '@/components/exercise-form';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { db } from '@/db/client';
import { canChangeEquipment } from '@/domain/exercise-rules';
import { getExercise, getUsage, updateExercise } from '@/repo/exercises';

export default function EditExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = getExercise(db, id);

  if (!exercise) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Edit exercise' }} />
        <Notice title="Exercise not found" body="It may have been deleted." />
      </Screen>
    );
  }

  const parent = exercise.parentId ? (getExercise(db, exercise.parentId) ?? null) : null;
  const equipmentLocked = !canChangeEquipment(getUsage(db, exercise.id));

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Edit exercise' }} />
      <ExerciseForm
        mode={{ kind: 'edit', exercise, parent, equipmentLocked }}
        submitLabel="Save changes"
        onSubmit={(draft) => {
          const result = updateExercise(db, exercise.id, draft);
          if (result.ok) router.back();
          return result;
        }}
      />
    </Screen>
  );
}
