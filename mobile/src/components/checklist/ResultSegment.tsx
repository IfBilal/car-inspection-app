import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from '@/components/ui/AppText';
import { ScalePressable } from '@/components/ui/Pressable';
import type { ItemResult } from '@/lib/types';

const OPTIONS: { value: ItemResult; letter: string }[] = [
  { value: 'pass', letter: 'P' },
  { value: 'fail', letter: 'F' },
  { value: 'na', letter: 'NA' },
  { value: 'repair', letter: 'R' },
];

type Props = {
  value: ItemResult | null;
  onChange: (v: ItemResult) => void;
};

export const ResultSegment = memo(function ResultSegment({ value, onChange }: Props) {
  const { colors } = useTheme();
  const colorFor: Record<ItemResult, string> = {
    pass: colors.pass,
    fail: colors.fail,
    na: colors.na,
    repair: colors.repair,
  };
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
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
              style={{ color: selected ? '#FFFFFF' : colors.textSecondary, fontFamily: 'Inter_700Bold' }}
            >
              {opt.letter}
            </AppText>
          </ScalePressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  segment: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
});
