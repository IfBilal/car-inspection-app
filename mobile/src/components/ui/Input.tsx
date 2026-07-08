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
};

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, helper, suffix, style, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors, radii, type } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.fail : focused ? colors.primary : colors.border;

  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="caption" color="secondary" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.field,
          {
            borderColor,
            borderRadius: radii.input,
            backgroundColor: colors.surface,
          },
          focused && { shadowColor: colors.primary, shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
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
          placeholderTextColor={colors.textTertiary}
          style={[type.body, styles.input, { color: colors.textPrimary }, style]}
        />
        {suffix ? (
          <AppText variant="caption" color="tertiary" style={styles.suffix}>
            {suffix}
          </AppText>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" style={[styles.helper, { color: colors.fail }]}>
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" color="tertiary" style={styles.helper}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {},
  field: {
    borderWidth: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  input: { flex: 1, paddingVertical: 14 },
  suffix: { marginLeft: 8 },
  helper: {},
});
