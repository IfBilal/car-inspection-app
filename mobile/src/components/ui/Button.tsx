import { ActivityIndicator, View, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';
import { ScalePressable } from './Pressable';

type Props = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'lg' | 'md';
  label: string;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  fullWidth?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'lg',
  label,
  icon: Icon,
  loading = false,
  disabled = false,
  onPress,
  fullWidth,
}: Props) {
  const { colors, radii } = useTheme();
  const height = size === 'lg' ? 52 : 44;
  const isFull = fullWidth ?? size === 'lg';

  const background = {
    primary: colors.primary,
    secondary: colors.surface,
    ghost: 'transparent',
    destructive: colors.fail,
  }[variant];
  const labelColor = {
    primary: colors.textOnPrimary,
    secondary: colors.textPrimary,
    ghost: colors.primary,
    destructive: '#FFFFFF',
  }[variant];
  const borderStyle =
    variant === 'secondary' ? { borderWidth: 1, borderColor: colors.border } : null;

  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.base,
        { height, borderRadius: radii.button, backgroundColor: background },
        borderStyle,
        isFull && styles.fullWidth,
        (disabled || loading) && { opacity: disabled ? 0.4 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <View style={styles.content}>
          {Icon ? <Icon size={20} color={labelColor} strokeWidth={2} /> : null}
          <AppText variant="bodyStrong" style={{ color: labelColor }}>
            {label}
          </AppText>
        </View>
      )}
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
