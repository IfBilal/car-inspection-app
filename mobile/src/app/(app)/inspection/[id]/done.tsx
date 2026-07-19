import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { CheckCircle2, Eye, MailCheck, TriangleAlert } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { useInspectionFull } from '@/lib/queries';
import { useSendReport } from '@/lib/mutations';
import { signedPhotoUrl } from '@/lib/photos';

type ReportState = 'generating' | 'ready' | 'sending' | 'sent' | 'failed';

export default function DoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const full = useInspectionFull(id);
  const generateReport = useSendReport();
  const sendReport = useSendReport();
  const [reportState, setReportState] = useState<ReportState>('generating');
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const fired = useRef(false);

  const generatePreview = () => {
    if (!id) return;
    setReportState('generating');
    setPreviewError(false);
    setHasPreviewed(false);
    generateReport.mutate(
      { inspectionId: id, previewOnly: true },
      {
        onSuccess: (result) => {
          setPdfPath(result.pdf_path);
          setReportState('ready');
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: () => setReportState('failed'),
      },
    );
  };

  // Generate and store the report, but do not email it before approval.
  useEffect(() => {
    if (fired.current || !id) return;
    fired.current = true;
    generatePreview();
    // The mutation object is intentionally excluded: this must run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const previewReport = async () => {
    if (!pdfPath) return;
    setPreviewError(false);
    try {
      const url = await signedPhotoUrl(pdfPath, 'reports');
      await WebBrowser.openBrowserAsync(url);
      setHasPreviewed(true);
    } catch {
      setPreviewError(true);
    }
  };

  const approveAndSend = () => {
    if (!id || !hasPreviewed) return;
    setReportState('sending');
    sendReport.mutate(
      { inspectionId: id, useExistingPdf: true },
      {
        onSuccess: () => {
          setReportState('sent');
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: () => setReportState('failed'),
      },
    );
  };

  const clientEmail = full.data?.client?.email ?? 'the client';
  const isGenerationFailure = reportState === 'failed' && !pdfPath;
  const isSendFailure = reportState === 'failed' && !!pdfPath;

  return (
    <Screen scroll={false}>
      <View style={styles.center}>
        <Animated.View
          entering={FadeIn.duration(400)}
          style={[
            styles.circle,
            { backgroundColor: reportState === 'sent' ? colors.passSoft : colors.primarySoft },
          ]}
        >
          {reportState === 'generating' || reportState === 'sending' ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : reportState === 'sent' ? (
            <MailCheck size={54} color={colors.pass} strokeWidth={1.5} />
          ) : (
            <Eye size={54} color={colors.primary} strokeWidth={1.5} />
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150)} style={styles.textBlock}>
          <AppText variant="display" style={styles.title}>
            {reportState === 'sent' ? 'Report sent!' : 'Final verification'}
          </AppText>

          {reportState === 'generating' ? (
            <AppText variant="body" color="secondary" style={styles.subtitle}>
              Generating the final PDF for review…
            </AppText>
          ) : reportState === 'sending' ? (
            <AppText variant="body" color="secondary" style={styles.subtitle}>
              Sending the approved report to {clientEmail}…
            </AppText>
          ) : reportState === 'sent' ? (
            <AppText variant="body" color="secondary" style={styles.subtitle}>
              The approved report was sent to {clientEmail}.
            </AppText>
          ) : reportState === 'ready' ? (
            <AppText variant="body" color="secondary" style={styles.subtitle}>
              Preview the complete PDF and verify every detail before approving it for {clientEmail}.
            </AppText>
          ) : (
            <View style={[styles.warnBox, { backgroundColor: colors.repairSoft }]}>
              <TriangleAlert size={18} color={colors.repair} />
              <AppText variant="caption" style={{ color: colors.repair, flex: 1 }}>
                {isGenerationFailure
                  ? 'The report could not be generated. The inspection is safe—try again.'
                  : 'The report is approved, but the email could not be sent. Try again.'}
              </AppText>
            </View>
          )}

          {hasPreviewed && reportState !== 'sent' ? (
            <View style={[styles.verifiedBox, { backgroundColor: colors.passSoft }]}>
              <CheckCircle2 size={17} color={colors.pass} />
              <AppText variant="caption" style={{ color: colors.pass }}>
                Preview opened — ready for your approval
              </AppText>
            </View>
          ) : null}

          {previewError ? (
            <AppText variant="caption" style={{ color: colors.fail, textAlign: 'center' }}>
              Couldn’t open the PDF preview. Please try again.
            </AppText>
          ) : null}
        </Animated.View>

        <View style={styles.actions}>
          {isGenerationFailure ? (
            <Button label="Retry generating report" onPress={generatePreview} loading={generateReport.isPending} />
          ) : reportState === 'sent' ? (
            <>
              <Button label="View sent report" variant="secondary" icon={Eye} onPress={() => void previewReport()} />
              <Button label="Done" onPress={() => router.dismissTo('/(app)/home')} />
            </>
          ) : (
            <>
              <Button
                label={hasPreviewed ? 'Preview report again' : 'Preview final report'}
                variant="secondary"
                icon={Eye}
                onPress={() => void previewReport()}
                disabled={!pdfPath || reportState === 'generating' || reportState === 'sending'}
              />
              <Button
                label={isSendFailure ? 'Retry approved email' : 'Approve & send to client'}
                icon={MailCheck}
                onPress={approveAndSend}
                loading={reportState === 'sending'}
                disabled={!hasPreviewed || reportState === 'generating'}
              />
              {!hasPreviewed && reportState === 'ready' ? (
                <AppText variant="caption" color="tertiary" style={styles.approvalHint}>
                  Open the preview before approving the report.
                </AppText>
              ) : null}
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, paddingBottom: 40 },
  circle: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
  textBlock: { alignItems: 'center', gap: 10 },
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
  verifiedBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10 },
  actions: { alignSelf: 'stretch', gap: 12, marginTop: 8 },
  approvalHint: { textAlign: 'center' },
});
