import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  children: ReactNode;
  /** scrollable content (default) or fixed */
  scroll?: boolean;
  /** pinned above the bottom safe area, e.g. the primary CTA */
  footer?: ReactNode;
  /** disable the default 20px gutters */
  padded?: boolean;
  refreshControl?: React.ReactElement<any>;
};

export function Screen({ children, scroll = true, footer, padded = true, refreshControl }: Props) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const gutter = padded ? spacing.gutter : 0;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 24, paddingTop: 8 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, { paddingHorizontal: gutter, paddingTop: 8 }]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.canvas }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {body}
      {footer ? (
        <View
          style={{
            paddingHorizontal: spacing.gutter,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16),
            backgroundColor: colors.canvas,
            borderTopWidth: 1,
            borderTopColor: colors.divider,
          }}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
