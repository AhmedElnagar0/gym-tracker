import { router, Stack, useLocalSearchParams } from 'expo-router';

import { ExerciseForm } from '@/components/exercise-form';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { db } from '@/db/client';
import { createExercise, createVariant, getExercise } from '@/repo/exercises';

/** New exercise, or with ?parentId=… a new variant of that exercise. */
export default function NewExerciseScreen() {
  const { parentId } = useLocalSearchParams<{ parentId?: string }>();
  const parent = parentId ? getExercise(db, parentId) : undefined;

  if (parentId && !parent) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'New variant' }} />
        <Notice title="Parent exercise not found" body="It may have been deleted." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: parent ? `New variant` : 'New exercise' }} />
      <ExerciseForm
        mode={parent ? { kind: 'variant', parent } : { kind: 'create' }}
        submitLabel={parent ? `Add variant of ${parent.name}` : 'Create exercise'}
        onSubmit={(draft) => {
          const result = parent ? createVariant(db, parent.id, draft) : createExercise(db, draft);
          if (result.ok) router.back();
          return result;
        }}
      />
    </Screen>
  );
}
