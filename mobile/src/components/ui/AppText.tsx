import { Text, type TextProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { TypeVariant } from '@/theme/tokens';

type Props = TextProps & {
  variant?: TypeVariant;
  color?: 'primary' | 'secondary' | 'tertiary' | 'onPrimary' | 'brand';
};

export function AppText({ variant = 'body', color = 'primary', style, ...rest }: Props) {
  const { colors, type } = useTheme();
  const colorValue = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    onPrimary: colors.textOnPrimary,
    brand: colors.primary,
  }[color];
  return <Text {...rest} style={[type[variant], { color: colorValue }, style]} />;
}
