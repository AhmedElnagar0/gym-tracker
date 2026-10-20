import { useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import type { Exercise } from '@/db/schema';
import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  MECHANICS,
  MECHANIC_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
} from '@/domain/constants';
import { loadLabel } from '@/domain/conventions';
import { type DraftErrors, type ExerciseDraft, NAME_MAX_LENGTH, VARIANT_LABEL_MAX_LENGTH } from '@/domain/validation';
import { useColors } from '@/hooks/use-colors';
import type { Result } from '@/repo/exercises';
import { fontSize, spacing, TAP_TARGET } from '@/theme';

import { Button } from './ui/button';
import { ChoiceChips } from './ui/choice-chips';
import { Field } from './ui/field';

export type ExerciseFormMode =
  | { kind: 'create' }
  | { kind: 'variant'; parent: Exercise }
  | { kind: 'edit'; exercise: Exercise; parent: Exercise | null; equipmentLocked: boolean };

const muscleChoices = MUSCLE_GROUPS.map((value) => ({ value, label: MUSCLE_GROUP_LABELS[value] }));
const mechanicChoices = MECHANICS.map((value) => ({ value, label: MECHANIC_LABELS[value] }));
const equipmentChoices = EQUIPMENT.map((value) => ({ value, label: EQUIPMENT_LABELS[value] }));

function initialDraft(mode: ExerciseFormMode): ExerciseDraft {
  switch (mode.kind) {
    case 'create':
      return { name: '', variantLabel: null, muscleGroup: null, mechanic: null, equipment: null, isUnilateral: false };
    case 'variant':
      return {
        name: '',
        variantLabel: '',
        muscleGroup: mode.parent.muscleGroup,
        mechanic: mode.parent.mechanic,
        equipment: mode.parent.equipment,
        isUnilateral: mode.parent.isUnilateral,
      };
    case 'edit': {
      const e = mode.exercise;
      return {
        name: e.name,
        variantLabel: e.variantLabel,
        muscleGroup: e.muscleGroup,
        mechanic: e.mechanic,
        equipment: e.equipment,
        isUnilateral: e.isUnilateral,
      };
    }
  }
}

/** Create / add-variant / edit form. `onSubmit` writes to the database and returns its result. */
export function ExerciseForm({
  mode,
  submitLabel,
  onSubmit,
}: {
  mode: ExerciseFormMode;
  submitLabel: string;
  onSubmit: (draft: ExerciseDraft) => Result<unknown>;
}) {
  const c = useColors();
  const [draft, setDraft] = useState<ExerciseDraft>(() => initialDraft(mode));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const parent = mode.kind === 'variant' ? mode.parent : mode.kind === 'edit' ? mode.parent : null;
  const isVariant = parent !== null;
  const equipmentLocked = mode.kind === 'edit' && mode.equipmentLocked;

  const set = <K extends keyof ExerciseDraft>(key: K, value: ExerciseDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = () => {
    const result = onSubmit(draft);
    if (!result.ok) {
      setErrors(result.fields ?? {});
      setFormError(result.error);
    }
  };

  const inputStyle = [styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }];

  return (
    <View style={styles.form}>
      <Field label="Name" error={errors.name}>
        <TextInput
          style={inputStyle}
          value={draft.name}
          onChangeText={(t) => set('name', t)}
          placeholder={isVariant ? `e.g. Incline ${parent.name}` : 'e.g. Cable Fly'}
          placeholderTextColor={c.textMuted}
          maxLength={NAME_MAX_LENGTH}
          autoCapitalize="words"
          returnKeyType="done"
        />
      </Field>

      {isVariant ? (
        <>
          <Field label="Variant label" hint="Short tag shown under the parent." error={errors.variantLabel}>
            <TextInput
              style={inputStyle}
              value={draft.variantLabel ?? ''}
              onChangeText={(t) => set('variantLabel', t)}
              placeholder="e.g. Incline"
              placeholderTextColor={c.textMuted}
              maxLength={VARIANT_LABEL_MAX_LENGTH}
              autoCapitalize="sentences"
              returnKeyType="done"
            />
          </Field>
          <Field label="Muscle group and type">
            <Text style={[styles.readOnly, { color: c.text }]}>
              {MUSCLE_GROUP_LABELS[parent.muscleGroup]} · {MECHANIC_LABELS[parent.mechanic]}
            </Text>
            <Text style={[styles.note, { color: c.textMuted }]}>
              Set by the parent, {parent.name}, so the variant stays listed under it.
            </Text>
          </Field>
        </>
      ) : (
        <>
          <Field label="Main muscle" error={errors.muscleGroup}>
            <ChoiceChips choices={muscleChoices} value={draft.muscleGroup} onChange={(v) => set('muscleGroup', v)} />
          </Field>
          <Field
            label="Type"
            hint={mode.kind === 'edit' ? 'Changing this also moves its variants.' : undefined}
            error={errors.mechanic}>
            <ChoiceChips choices={mechanicChoices} value={draft.mechanic} onChange={(v) => set('mechanic', v)} />
          </Field>
        </>
      )}

      <Field
        label="Equipment"
        error={errors.equipment}
        hint={
          equipmentLocked
            ? 'Locked: this exercise has logged workouts, and changing it would change what old weights mean.'
            : draft.equipment
              ? `Weights are logged in ${loadLabel(draft.equipment)}.`
              : undefined
        }>
        <ChoiceChips
          choices={equipmentChoices}
          value={draft.equipment}
          onChange={(v) => set('equipment', v)}
          disabled={equipmentLocked}
        />
      </Field>

      <View style={styles.switchRow}>
        <View style={styles.switchText}>
          <Text style={[styles.switchLabel, { color: c.text }]}>One side at a time</Text>
          <Text style={[styles.note, { color: c.textMuted }]}>Reps are logged per side.</Text>
        </View>
        <Switch value={draft.isUnilateral} onValueChange={(v) => set('isUnilateral', v)} />
      </View>

      {formError ? <Text style={[styles.formError, { color: c.danger }]}>{formError}</Text> : null}
      <Button title={submitLabel} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  input: {
    minHeight: TAP_TARGET,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
  },
  readOnly: { fontSize: fontSize.body },
  note: { fontSize: fontSize.small },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: TAP_TARGET },
  switchText: { flex: 1, gap: 2 },
  switchLabel: { fontSize: fontSize.body },
  formError: { fontSize: fontSize.body },
});
