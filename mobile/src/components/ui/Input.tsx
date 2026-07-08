import { forwardRef, useState } from 'react';
import { TextInput, View, StyleSheet, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  helper?: string;
  /** e.g. "KM" rendered at the right edge */
  suffix?: string;
  /** 'glass' = translucent dark-hero styling for the auth screens */
  tone?: 'default' | 'glass';
};

const GLASS = {
  bg: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.16)',
  borderFocus: '#22C55E',
  text: '#F2F5F2',
  label: 'rgba(255,255,255,0.72)',
  placeholder: 'rgba(255,255,255,0.40)',
  helper: 'rgba(255,255,255,0.55)',
  error: '#F87171',
};

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, helper, suffix, style, onFocus, onBlur, tone = 'default', ...rest },
  ref,
) {
  const { colors, radii, type } = useTheme();
  const [focused, setFocused] = useState(false);
  const glass = tone === 'glass';

  const palette = glass
    ? {
        bg: GLASS.bg,
        border: error ? GLASS.error : focused ? GLASS.borderFocus : GLASS.border,
        text: GLASS.text,
        label: GLASS.label,
        placeholder: GLASS.placeholder,
        helper: GLASS.helper,
        error: GLASS.error,
      }
    : {
        bg: colors.surface,
        border: error ? colors.fail : focused ? colors.primary : colors.border,
        text: colors.textPrimary,
        label: colors.textSecondary,
        placeholder: colors.textTertiary,
        helper: colors.textTertiary,
        error: colors.fail,
      };

  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="caption" style={{ color: palette.label }}>
          {label}
        </AppText>
      ) : null}
      {/* Keep the style array shape constant across focus changes — adding new
          style keys mid-focus restructures the native view on Android (Fabric)
          and blurs the TextInput, instantly dismissing the keyboard. Focus is
          indicated by border colour + width only. */}
      <View
        style={[
          styles.field,
          {
            borderColor: palette.border,
            borderWidth: focused ? 2 : 1,
            borderRadius: radii.input,
            backgroundColor: palette.bg,
          },
        ]}
      >
        <TextInput
          ref={ref}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={palette.placeholder}
          selectionColor={glass ? '#22C55E' : colors.primary}
          style={[type.body, styles.input, { color: palette.text }, style]}
        />
        {suffix ? (
          <AppText variant="caption" style={[styles.suffix, { color: palette.helper }]}>
            {suffix}
          </AppText>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" style={{ color: palette.error }}>
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" style={{ color: palette.helper }}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  input: { flex: 1, paddingVertical: 14 },
  suffix: { marginLeft: 8 },
});
