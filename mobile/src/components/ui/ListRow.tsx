import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';
import { ScalePressable } from './Pressable';

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
};

export function ListRow({ title, subtitle, right, chevron = true, onPress, onLongPress }: Props) {
  const { colors } = useTheme();
  return (
    <ScalePressable onPress={onPress} onLongPress={onLongPress} disabled={!onPress && !onLongPress} style={styles.row}>
      <View style={styles.textCol}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="secondary" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
      {chevron && onPress ? <ChevronRight size={18} color={colors.textTertiary} /> : null}
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    minHeight: 56,
  },
  textCol: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end' },
});
