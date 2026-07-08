import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/Input';
import { ResultSegment } from './ResultSegment';
import { useWizardStore } from '@/store/wizard';
import { getAutosaveEngine } from '@/lib/autosave';
import type { ChecklistItem, ItemResult } from '@/lib/types';

type Props = { item: ChecklistItem; inspectionId: string };

/**
 * One checklist row. Subscribes only to its own result slice so a tap
 * re-renders exactly this row (219 rows must stay at 60fps).
 */
export const ItemRow = memo(function ItemRow({ item, inspectionId }: Props) {
  const { colors } = useTheme();
  const entry = useWizardStore((s) => s.results[item.id]);
  const setResult = useWizardStore((s) => s.setResult);
  const setNote = useWizardStore((s) => s.setNote);

  const onChange = useCallback(
    (result: ItemResult) => {
      setResult(item.id, result);
      getAutosaveEngine(inspectionId).enqueue({
        kind: 'result',
        itemId: item.id,
        result,
        note: useWizardStore.getState().results[item.id]?.note,
      });
    },
    [item.id, inspectionId, setResult],
  );

  const onNote = useCallback(
    (note: string) => {
      setNote(item.id, note);
      const current = useWizardStore.getState().results[item.id];
      if (current) {
        getAutosaveEngine(inspectionId).enqueue({
          kind: 'result',
          itemId: item.id,
          result: current.result,
          note,
        });
      }
    },
    [item.id, inspectionId, setNote],
  );

  const needsNote = entry?.result === 'fail' || entry?.result === 'repair';

  return (
    // No layout animation here: FlashList recycles these rows while scrolling,
    // and a row-level layout transition makes the whole list bounce on scroll.
    <View style={[styles.row, { borderBottomColor: colors.divider }]}>
      <View style={styles.top}>
        <View style={styles.labelCol}>
          <AppText variant="micro" color="tertiary">
            {item.item_number}
          </AppText>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {item.label}
          </AppText>
        </View>
        <ResultSegment value={entry?.result ?? null} onChange={onChange} />
      </View>
      {needsNote ? (
        <Animated.View entering={FadeIn.duration(160)}>
          <Input
            placeholder="What’s wrong?"
            defaultValue={entry?.note ?? ''}
            onChangeText={onNote}
            style={{ paddingVertical: 8 }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { paddingVertical: 12, gap: 10, borderBottomWidth: 1 },
  top: { gap: 10 },
  labelCol: { gap: 2 },
});
