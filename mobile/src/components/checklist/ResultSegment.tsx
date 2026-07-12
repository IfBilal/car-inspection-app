import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from '@/components/ui/AppText';
import { ScalePressable } from '@/components/ui/Pressable';
import type { ItemResult, SectionKind } from '@/lib/types';

/**
 * Rating options per section kind (mirrors report.pdf):
 *  status:   OK (pass) / Needs Attention (repair) / Critical (fail)
 *  passfail: Pass (pass) / Fail (fail) / N/A (na)
 *  flags:    Yes (fail — a red flag present) / No (pass)
 */
const OPTIONS: Record<SectionKind, { value: ItemResult; label: string }[]> = {
  status: [
    { value: 'pass', label: 'OK' },
    { value: 'repair', label: 'Attention' },
    { value: 'fail', label: 'Critical' },
  ],
  passfail: [
    { value: 'pass', label: 'Pass' },
    { value: 'fail', label: 'Fail' },
    { value: 'na', label: 'N/A' },
  ],
  flags: [
    { value: 'fail', label: 'Yes' },
    { value: 'pass', label: 'No' },
  ],
};

type Props = {
  kind: SectionKind;
  value: ItemResult | null;
  onChange: (v: ItemResult) => void;
};

export const ResultSegment = memo(function ResultSegment({ kind, value, onChange }: Props) {
  const { colors } = useTheme();
  const colorFor: Record<ItemResult, string> = {
    pass: colors.pass,
    fail: colors.fail,
    na: colors.na,
    repair: colors.repair,
  };
  return (
    <View style={styles.row}>
      {OPTIONS[kind].map((opt) => {
        const selected = value === opt.value;
        const color = colorFor[opt.value];
        return (
          <ScalePressable
            key={opt.value}
            pressScale={0.9}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(opt.value);
            }}
            style={[
              styles.segment,
              { borderColor: selected ? color : colors.border, backgroundColor: selected ? color : 'transparent' },
            ]}
          >
            <AppText
              variant="caption"
              style={{ color: selected ? '#FFFFFF' : colors.textSecondary, fontFamily: 'Inter_600SemiBold' }}
            >
              {opt.label}
            </AppText>
          </ScalePressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  segment: {
    minWidth: 44,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
});
