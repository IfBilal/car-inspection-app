import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from '@/components/ui/AppText';

/** License-plate styled capsule: bordered, bold, spaced characters. */
export function PlateBadge({ plate }: { plate: string | null }) {
  const { colors } = useTheme();
  if (!plate) return null;
  return (
    <View style={[styles.badge, { borderColor: colors.textPrimary, backgroundColor: colors.surface }]}>
      <AppText variant="caption" style={[styles.text, { color: colors.textPrimary }]}>
        {plate}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: { fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
});
