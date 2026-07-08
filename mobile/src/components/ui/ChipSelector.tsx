import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';
import { ScalePressable } from './Pressable';

type Props = {
  label: string;
  options: string[];
  value: string | undefined | null;
  onChange: (v: string) => void;
};

/** Horizontal chip group used instead of dropdowns (transmission, fuel…). */
export function ChipSelector({ label, options, value, onChange }: Props) {
  const { colors, radii } = useTheme();
  return (
    <View style={styles.wrap}>
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
      <View style={styles.row}>
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <ScalePressable
              key={opt}
              onPress={() => onChange(selected ? '' : opt)}
              style={[
                styles.chip,
                {
                  borderRadius: radii.full,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary : colors.surface,
                },
              ]}
            >
              <AppText variant="caption" style={{ color: selected ? '#FFFFFF' : colors.textSecondary }}>
                {opt}
              </AppText>
            </ScalePressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 8, minHeight: 36 },
});
