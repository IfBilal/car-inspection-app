import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';
import { ScalePressable } from './Pressable';

export type ChipTone = 'primary' | 'pass' | 'fail' | 'repair' | 'na' | 'info';

type Props = {
  label: string;
  tone?: ChipTone;
  icon?: LucideIcon;
  onPress?: () => void;
  selected?: boolean;
};

export function Chip({ label, tone = 'primary', icon: Icon, onPress, selected }: Props) {
  const { colors, radii } = useTheme();
  const map = {
    primary: { bg: colors.primarySoft, fg: colors.primaryText, solid: colors.primary },
    pass: { bg: colors.passSoft, fg: colors.pass, solid: colors.pass },
    fail: { bg: colors.failSoft, fg: colors.fail, solid: colors.fail },
    repair: { bg: colors.repairSoft, fg: colors.repair, solid: colors.repair },
    na: { bg: colors.naSoft, fg: colors.na, solid: colors.na },
    info: { bg: colors.naSoft, fg: colors.info, solid: colors.info },
  }[tone];

  const bg = selected ? map.solid : map.bg;
  const fg = selected ? '#FFFFFF' : map.fg;

  const content = (
    <View style={[styles.chip, { backgroundColor: bg, borderRadius: radii.full }]}>
      {Icon ? <Icon size={14} color={fg} strokeWidth={2} /> : null}
      <AppText variant="caption" style={{ color: fg }}>
        {label}
      </AppText>
    </View>
  );
  if (onPress) {
    return <ScalePressable onPress={onPress}>{content}</ScalePressable>;
  }
  return content;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
});
