import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SetEntryPanel } from '@/components/set-entry-panel';
import { PendingSetRow, SetRow } from '@/components/set-row';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { dismissKeyboardOnScroll } from '@/components/ui/keyboard';
import { Notice } from '@/components/ui/notice';
import { db } from '@/db/client';
import { exercises, sets, workoutExercises, workouts } from '@/db/schema';
import { EQUIPMENT_LABELS } from '@/domain/constants';
import { loadLabel } from '@/domain/conventions';
import { formatDateTime } from '@/domain/format';
import { keypadText } from '@/domain/keypad';
import { describePlan } from '@/domain/progression';
import type { SetDraft } from '@/domain/set-input';
import { useColors } from '@/hooks/use-colors';
import { useDbQuery } from '@/hooks/use-db-query';
import { getLastPerformance } from '@/repo/history';
import { addSet, deleteSet, updateSet } from '@/repo/sets';
import {
  getWorkoutExercise,
  NOTES_MAX_LENGTH,
  removeExerciseFromWorkout,
  setExerciseNotes,
  setNextTimePlan,
} from '@/repo/workout-exercises';
import { getWorkout } from '@/repo/workouts';
import { fontSize, spacing, TAP_TARGET } from '@/theme';

type Editing = { kind: 'new' } | { kind: 'edit'; setId: string } | null;

/** Log, edit and delete the sets of one exercise in one workout. */
export default function LogExerciseScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { weId } = useLocalSearchParams<{ id: string; weId: string }>();
  const detail = useDbQuery(() => {
    const found = getWorkoutExercise(db, weId);
    if (!found) return undefined;
    const workout = getWorkout(db, found.workoutExercise.workoutId);
    const last = workout
      ? getLastPerformance(db, found.exercise.id, { workoutId: workout.id, startedAt: workout.startedAt })
      : undefined;
    return { ...found, last };
  }, [workoutExercises, sets, exercises, workouts]);

  const [editing, setEditing] = useState<Editing>(null);
  // Bumped after each new set so the panel resets (keeping the weight) for the next one.
  const [panelKey, setPanelKey] = useState(0);
  const [notes, setNotes] = useState(() => detail?.workoutExercise.notes ?? '');

  if (!detail) {
    return (
      <View style={[styles.flex, { backgroundColor: c.background, padding: spacing.md }]}>
        <Stack.Screen options={{ title: 'Exercise' }} />
        <Notice title="Not in this workout any more" body="It may have been removed." />
      </View>
    );
  }

  const { workoutExercise: we, exercise, sets: logged, last } = detail;
  const lastSets = last?.sets ?? [];
  // The plan was made at the end of the last session, for this one.
  const plan = {
    increaseWeight: last?.workoutExercise.nextIncreaseWeight ?? false,
    increaseReps: last?.workoutExercise.nextIncreaseReps ?? false,
  };
  const planText = describePlan(plan);
  const lastSet = logged.at(-1);
  const editingSet = editing?.kind === 'edit' ? logged.find((s) => s.id === editing.setId) : undefined;
  // Derived from what exists, so a set that vanished mid-edit can't leave the screen stuck.
  const panelOpen = editing?.kind === 'new' || editingSet !== undefined;

  const newSetDraft: SetDraft = {
    // Today's previous set's weight carries over; reps are always typed fresh.
    weight: lastSet ? keypadText(lastSet.weightKg) : '',
    reps: '',
    rpe: null,
    setType: 'working',
  };

  const onRemove = () => {
    Alert.alert(
      `Remove ${exercise.name}?`,
      logged.length > 0 ? `Its ${logged.length} logged sets will be deleted.` : 'It has no sets yet.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeExerciseFromWorkout(db, we.id);
            router.back();
          },
        },
      ],
    );
  };

  const savePlan = (plan: { increaseWeight?: boolean; increaseReps?: boolean }) => {
    const result = setNextTimePlan(db, we.id, plan);
    if (!result.ok) Alert.alert('Not saved', result.error);
  };

  // Saved on every keystroke: leaving the screen mid-typing can't lose the note.
  const changeNotes = (text: string) => {
    setNotes(text);
    setExerciseNotes(db, we.id, text);
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ title: exercise.name }} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        {...dismissKeyboardOnScroll}
        automaticallyAdjustKeyboardInsets>
        <Text style={[styles.meta, { color: c.textMuted }]}>
          {EQUIPMENT_LABELS[exercise.equipment]} · weights in {loadLabel(exercise.equipment)}
          {exercise.isUnilateral ? ' · reps per side' : ''}
        </Text>

        <View style={[styles.lastCard, { backgroundColor: c.surface }]}>
          {last ? (
            <>
              <Text style={[styles.lastTitle, { color: c.text }]}>Last time · {formatDateTime(last.workout.startedAt)}</Text>
              {last.workoutExercise.notes ? (
                <Text style={[styles.lastBody, { color: c.text }]}>“{last.workoutExercise.notes}”</Text>
              ) : null}
              {planText ? (
                <Text style={[styles.lastPlan, { color: c.accent }]}>You planned {planText} for today.</Text>
              ) : null}
            </>
          ) : (
            <Text style={[styles.lastBody, { color: c.textMuted }]}>First time logging this exercise.</Text>
          )}
        </View>

        {logged.length === 0 && lastSets.length === 0 ? (
          <Text style={[styles.empty, { color: c.textMuted }]}>No sets yet.</Text>
        ) : null}
        {logged.map((s, i) => (
          <SetRow
            key={s.id}
            number={i + 1}
            set={s}
            lastTime={lastSets[i]}
            selected={editing?.kind === 'edit' && editing.setId === s.id}
            onPress={() => setEditing({ kind: 'edit', setId: s.id })}
          />
        ))}
        {/* Sets done last time but not yet today, as reminders. */}
        {lastSets.slice(logged.length).map((s, i) => (
          <PendingSetRow
            key={s.id}
            number={logged.length + i + 1}
            lastTime={s}
            onPress={() => setEditing({ kind: 'new' })}
          />
        ))}
        {!panelOpen ? <Button title="Add set" onPress={() => setEditing({ kind: 'new' })} /> : null}

        {!panelOpen ? (
          <>
            <Field label="Note for this session" hint="Shown next time you do this exercise.">
              <TextInput
                style={[styles.notes, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
                value={notes}
                onChangeText={changeNotes}
                placeholder="e.g. seat at 4, felt easy"
                placeholderTextColor={c.textMuted}
                maxLength={NOTES_MAX_LENGTH}
                multiline
              />
            </Field>

            <Field label="Next time">
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: c.text }]}>Increase weight</Text>
                <Switch value={we.nextIncreaseWeight} onValueChange={(v) => savePlan({ increaseWeight: v })} />
              </View>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: c.text }]}>Increase reps</Text>
                <Switch value={we.nextIncreaseReps} onValueChange={(v) => savePlan({ increaseReps: v })} />
              </View>
            </Field>

            <Button title="Remove from workout" variant="danger" onPress={onRemove} />
          </>
        ) : null}
      </ScrollView>

      {editing?.kind === 'new' ? (
        <View style={{ paddingBottom: insets.bottom }}>
          <SetEntryPanel
            key={`new-${panelKey}`}
            title={`Set ${logged.length + 1}`}
            equipment={exercise.equipment}
            initial={newSetDraft}
            lastTime={lastSets[logged.length]}
            plan={plan}
            saveLabel="Save set"
            onSave={(draft) => {
              const result = addSet(db, we.id, draft);
              if (result.ok) setPanelKey((k) => k + 1);
              return result;
            }}
            onClose={() => setEditing(null)}
          />
        </View>
      ) : null}

      {editingSet ? (
        <View style={{ paddingBottom: insets.bottom }}>
          <SetEntryPanel
            key={`edit-${editingSet.id}`}
            title={`Edit set ${logged.indexOf(editingSet) + 1}`}
            equipment={exercise.equipment}
            lastTime={lastSets[logged.indexOf(editingSet)]}
            plan={plan}
            initial={{
              weight: keypadText(editingSet.weightKg),
              reps: String(editingSet.reps),
              rpe: editingSet.rpe,
              setType: editingSet.setType,
            }}
            saveLabel="Update set"
            onSave={(draft) => {
              const result = updateSet(db, editingSet.id, draft);
              if (result.ok) setEditing(null);
              return result;
            }}
            onDelete={() =>
              Alert.alert('Delete this set?', undefined, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    deleteSet(db, editingSet.id);
                    setEditing(null);
                  },
                },
              ])
            }
            onClose={() => setEditing(null)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.sm },
  meta: { fontSize: fontSize.body, marginBottom: spacing.sm },
  empty: { fontSize: fontSize.body },
  lastCard: { borderRadius: 12, padding: spacing.md, gap: spacing.xs, marginBottom: spacing.sm },
  lastTitle: { fontSize: fontSize.body, fontWeight: '700' },
  lastBody: { fontSize: fontSize.body },
  lastPlan: { fontSize: fontSize.body, fontWeight: '600' },
  notes: {
    minHeight: TAP_TARGET * 1.5,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: fontSize.body,
    textAlignVertical: 'top',
  },
  switchRow: { minHeight: TAP_TARGET, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: fontSize.body },
});
