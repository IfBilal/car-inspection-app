import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  const height = size === 'lg' ? 54 : 44;
  const isFull = fullWidth ?? size === 'lg';

  const labelColor = {
    primary: '#FFFFFF',
    secondary: colors.textPrimary,
    ghost: colors.primary,
    destructive: '#FFFFFF',
  }[variant];

  const content = loading ? (
    <ActivityIndicator color={labelColor} />
  ) : (
    <View style={styles.content}>
      {Icon ? <Icon size={size === 'lg' ? 20 : 18} color={labelColor} strokeWidth={2} /> : null}
      <AppText variant="bodyStrong" style={{ color: labelColor }}>
        {label}
      </AppText>
    </View>
  );

  if (variant === 'primary') {
    // Gradient fill + soft green glow — the signature CTA treatment.
    return (
      <ScalePressable
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        disabled={disabled || loading}
        onPress={onPress}
        style={[
          styles.glow,
          isFull && styles.fullWidth,
          { borderRadius: radii.button, opacity: disabled ? 0.4 : 1 },
        ]}
      >
        <LinearGradient
          colors={['#22C55E', '#15803D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, { height, borderRadius: radii.button }]}
        >
          {/* top sheen */}
          <LinearGradient
            colors={['#FFFFFF2E', 'transparent']}
            style={[StyleSheet.absoluteFill, { borderRadius: radii.button, height: height / 2 }]}
          />
          {content}
        </LinearGradient>
      </ScalePressable>
    );
  }

  const background = {
    secondary: colors.surface,
    ghost: 'transparent',
    destructive: colors.fail,
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
        { opacity: disabled ? 0.4 : 1 },
      ]}
    >
      {content}
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  glow: {
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
