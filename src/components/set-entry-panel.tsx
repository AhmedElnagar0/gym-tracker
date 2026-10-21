import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SET_TYPES, type Equipment, type SetType } from '@/domain/constants';
import { loadLabel } from '@/domain/conventions';
import { applyKey, type KeypadKey, REPS_RULES, WEIGHT_RULES } from '@/domain/keypad';
import { RPE_CHOICES, SET_TYPE_LABELS, type SetDraft, type SetErrors } from '@/domain/set-input';
import { useColors } from '@/hooks/use-colors';
import type { Result } from '@/repo/result';
import { fontSize, spacing } from '@/theme';

import { NumberPad } from './number-pad';
import { Button } from './ui/button';
import { ChoiceChips } from './ui/choice-chips';

type Field = 'weight' | 'reps';

/**
 * Weight / reps entry with the large number pad, plus set type and optional RPE.
 * `onSave` writes to the database; on success a new-set panel resets for the next set
 * (keeping the weight), while an edit panel closes.
 */
export function SetEntryPanel({
  title,
  equipment,
  initial,
  saveLabel,
  onSave,
  onClose,
  onDelete,
}: {
  title: string;
  equipment: Equipment;
  initial: SetDraft;
  saveLabel: string;
  onSave: (draft: SetDraft) => Result<unknown, SetErrors>;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const c = useColors();
  const [draft, setDraft] = useState<SetDraft>(initial);
  // Start on reps when the weight is already filled in (carried over from the last set).
  const [field, setField] = useState<Field>(initial.weight === '' ? 'weight' : 'reps');
  const [errors, setErrors] = useState<SetErrors>({});

  const press = (key: KeypadKey) => {
    const rules = field === 'weight' ? WEIGHT_RULES : REPS_RULES;
    setDraft((d) => ({ ...d, [field]: applyKey(d[field], key, rules) }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const save = () => {
    const result = onSave(draft);
    if (!result.ok) {
      setErrors(result.fields ?? {});
      if (result.fields?.weight) setField('weight');
      else if (result.fields?.reps) setField('reps');
    }
  };

  const fieldBox = (name: Field, label: string, unit: string) => {
    const active = field === name;
    const error = errors[name];
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${draft[name] || 'empty'}`}
        onPress={() => setField(name)}
        style={[
          styles.box,
          { backgroundColor: c.surface, borderColor: error ? c.danger : active ? c.accent : c.border },
        ]}>
        <Text style={[styles.boxLabel, { color: c.textMuted }]}>{label}</Text>
        <Text style={[styles.boxValue, { color: draft[name] ? c.text : c.textMuted }]}>{draft[name] || '–'}</Text>
        <Text style={[styles.boxUnit, { color: error ? c.danger : c.textMuted }]} numberOfLines={2}>
          {error ?? unit}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.panel, { backgroundColor: c.background, borderTopColor: c.border }]}>
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      <View style={styles.boxes}>
        {fieldBox('weight', 'Weight', loadLabel(equipment))}
        {fieldBox('reps', 'Reps', 'reps')}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        <ChoiceChips
          choices={SET_TYPES.map((value) => ({ value, label: SET_TYPE_LABELS[value] }))}
          value={draft.setType}
          onChange={(setType: SetType) => setDraft((d) => ({ ...d, setType }))}
        />
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        <ChoiceChips
          choices={[{ value: 'none', label: 'No RPE' }, ...RPE_CHOICES.map((r) => ({ value: String(r), label: `RPE ${r}` }))]}
          value={draft.rpe === null ? 'none' : String(draft.rpe)}
          onChange={(v) => setDraft((d) => ({ ...d, rpe: v === 'none' ? null : Number(v) }))}
        />
      </ScrollView>

      <NumberPad onKey={press} allowDecimal={field === 'weight'} />

      <View style={styles.actions}>
        <View style={styles.action}>
          <Button title={saveLabel} onPress={save} />
        </View>
        <View style={styles.action}>
          <Button title={onDelete ? 'Delete' : 'Done'} variant={onDelete ? 'danger' : 'secondary'} onPress={onDelete ?? onClose} />
        </View>
      </View>
      {onDelete ? (
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}>
          <Text style={[styles.cancelText, { color: c.accent }]}>Cancel</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderTopWidth: 1, padding: spacing.md, gap: spacing.sm },
  title: { fontSize: fontSize.body, fontWeight: '700' },
  boxes: { flexDirection: 'row', gap: spacing.sm },
  box: { flex: 1, borderWidth: 2, borderRadius: 12, padding: spacing.sm, minHeight: 92 },
  boxLabel: { fontSize: fontSize.small, fontWeight: '600', textTransform: 'uppercase' },
  boxValue: { fontSize: 34, fontWeight: '700', fontVariant: ['tabular-nums'] },
  boxUnit: { fontSize: fontSize.small },
  chipsRow: { paddingRight: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
  cancel: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { fontSize: fontSize.body, fontWeight: '600' },
});
