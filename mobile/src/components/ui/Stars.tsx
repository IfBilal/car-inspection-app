import { StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { ScalePressable } from './Pressable';

type Props = {
  value: number;
  onChange?: (n: 1 | 2 | 3 | 4 | 5) => void;
  size?: number;
  readonly?: boolean;
};

export function Stars({ value, onChange, size = 36, readonly }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {([1, 2, 3, 4, 5] as const).map((n) => {
        const filled = n <= value;
        const star = (
          <Star
            size={size}
            color={filled ? colors.gold : colors.textTertiary}
            fill={filled ? colors.gold : 'transparent'}
            strokeWidth={1.5}
          />
        );
        if (readonly || !onChange) return <View key={n}>{star}</View>;
        return (
          <ScalePressable
            key={n}
            pressScale={0.85}
            hitSlop={6}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(n);
            }}
          >
            {star}
          </ScalePressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 8 } });
