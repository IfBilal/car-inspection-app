import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { ScalePressable } from './Pressable';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
};

export function Card({ children, onPress, onLongPress, style, padded = true }: Props) {
  const { colors, radii, shadows } = useTheme();
  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...(padded ? { padding: 16 } : null),
    ...shadows.card,
  };
  if (onPress || onLongPress) {
    return (
      <ScalePressable onPress={onPress} onLongPress={onLongPress} style={[base, style]}>
        {children}
      </ScalePressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}
