import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, MoreVertical } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from '@/components/ui/AppText';
import { ScalePressable } from '@/components/ui/Pressable';
import { useToast } from '@/components/ui/Toast';
import { getAutosaveEngine, type AutosaveStatus } from '@/lib/autosave';
import { useDiscardDraft } from '@/lib/mutations';

export const WIZARD_STEPS = ['client', 'vehicle', 'checklist', 'damage', 'photos', 'summary'] as const;
export type WizardStepName = (typeof WIZARD_STEPS)[number];

type Props = {
  inspectionId: string;
  step: WizardStepName;
  title: string;
  /** right side extra (e.g. checklist progress ring) */
  right?: React.ReactNode;
};

const STATUS_LABEL: Record<AutosaveStatus, string> = {
  idle: '',
  dirty: 'Saving…',
  saving: 'Saving…',
  saved: 'Saved',
  retrying: 'Couldn’t save — retrying',
};

export function WizardHeader({ inspectionId, step, title, right }: Props) {
  const { colors } = useTheme();
  const toast = useToast();
  const discard = useDiscardDraft();
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const stepIndex = WIZARD_STEPS.indexOf(step);

  useEffect(() => {
    const engine = getAutosaveEngine(inspectionId);
    return engine.subscribe(setStatus);
  }, [inspectionId]);

  const saveAndExit = async () => {
    await getAutosaveEngine(inspectionId).flush();
    router.dismissTo('/(app)/home');
  };

  const menu = () => {
    toast.show('info', 'Save & exit — or long-press a draft on Home to discard', {
      actionLabel: 'Save & exit',
      onAction: saveAndExit,
    });
  };

  return (
    <View>
      <View style={styles.row}>
        <ScalePressable
          onPress={() => (stepIndex === 0 ? saveAndExit() : router.back())}
          hitSlop={12}
          style={styles.iconBtn}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </ScalePressable>
        <View style={{ flex: 1 }}>
          <AppText variant="title2">{title}</AppText>
          {STATUS_LABEL[status] ? (
            <AppText
              variant="caption"
              color={status === 'retrying' ? undefined : 'tertiary'}
              style={status === 'retrying' ? { color: colors.repair } : undefined}
            >
              {STATUS_LABEL[status]}
            </AppText>
          ) : null}
        </View>
        {right}
        <ScalePressable
          onPress={menu}
          hitSlop={12}
          style={styles.iconBtn}
          disabled={discard.isPending}
        >
          <MoreVertical size={20} color={colors.textSecondary} />
        </ScalePressable>
      </View>
      {/* Step bar */}
      <View style={styles.steps}>
        {WIZARD_STEPS.map((s, i) => (
          <View
            key={s}
            style={[
              styles.stepSeg,
              {
                backgroundColor: i <= stepIndex ? colors.primary : colors.divider,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  steps: { flexDirection: 'row', gap: 6, marginTop: 10, marginBottom: 4 },
  stepSeg: { flex: 1, height: 4, borderRadius: 2 },
});
