import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CheckCircle2, TriangleAlert } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { useInspectionFull } from '@/lib/queries';
import { useSendReport } from '@/lib/mutations';

export default function DoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const full = useInspectionFull(id);
  const sendReport = useSendReport();
  const [emailState, setEmailState] = useState<'sending' | 'sent' | 'failed'>('sending');
  const fired = useRef(false);

  // Fire the report pipeline once on arrival.
  useEffect(() => {
    if (fired.current || !id) return;
    fired.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    sendReport.mutate(
      { inspectionId: id },
      {
        onSuccess: () => setEmailState('sent'),
        onError: () => setEmailState('failed'),
      },
    );
  }, [id, sendReport]);

  const retry = () => {
    setEmailState('sending');
    sendReport.mutate(
      { inspectionId: id!, resend: true },
      {
        onSuccess: () => setEmailState('sent'),
        onError: () => setEmailState('failed'),
      },
    );
  };

  const clientEmail = full.data?.client?.email ?? '';

  return (
    <Screen scroll={false}>
      <View style={styles.center}>
        <Animated.View
          entering={ZoomIn.springify().damping(12)}
          style={[styles.circle, { backgroundColor: colors.passSoft }]}
        >
          <CheckCircle2 size={56} color={colors.pass} strokeWidth={1.5} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(150)} style={styles.textBlock}>
          <AppText variant="display" style={styles.title}>
            Inspection complete!
          </AppText>
          {emailState === 'sending' ? (
            <AppText variant="body" color="secondary" style={styles.subtitle}>
              Generating report and sending it to {clientEmail}…
            </AppText>
          ) : emailState === 'sent' ? (
            <AppText variant="body" color="secondary" style={styles.subtitle}>
              Report sent to {clientEmail}
            </AppText>
          ) : (
            <View style={[styles.warnBox, { backgroundColor: colors.repairSoft }]}>
              <TriangleAlert size={18} color={colors.repair} />
              <AppText variant="caption" style={{ color: colors.repair, flex: 1 }}>
                Saved — but the email didn’t send. The inspection is safe; retry when you’re back online.
              </AppText>
            </View>
          )}
        </Animated.View>

        <View style={styles.actions}>
          {emailState === 'failed' ? (
            <Button label="Retry sending" onPress={retry} loading={sendReport.isPending} />
          ) : (
            <Button
              label="View report"
              variant="secondary"
              onPress={() => router.replace(`/(app)/inspections/${id}`)}
              disabled={emailState === 'sending'}
            />
          )}
          <Button label="Done" variant={emailState === 'failed' ? 'secondary' : 'primary'} onPress={() => router.dismissTo('/(app)/home')} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, paddingBottom: 60 },
  circle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  textBlock: { alignItems: 'center', gap: 8 },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 20,
  },
  actions: { alignSelf: 'stretch', gap: 12, marginTop: 12 },
});
