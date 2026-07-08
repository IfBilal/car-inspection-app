import { useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, PenLine, TriangleAlert, Wrench, XCircle } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScalePressable } from '@/components/ui/Pressable';
import { Stars } from '@/components/ui/Stars';
import { useToast } from '@/components/ui/Toast';
import { WizardHeader } from '@/components/wizard/WizardHeader';
import { SignaturePad } from '@/components/signature/SignaturePad';
import { vehicleTitle } from '@/components/vehicle/VehicleCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useChecklist, useInspectionFull, useProfile } from '@/lib/queries';
import { useSubmitInspection } from '@/lib/mutations';
import { getAutosaveEngine } from '@/lib/autosave';
import { useWizardStore } from '@/store/wizard';
import { formatDate } from '@/lib/format';
import type { Recommendation } from '@/lib/types';

const RECOMMENDATIONS: { value: Recommendation; label: string; icon: any }[] = [
  { value: 'recommended', label: 'Recommended', icon: CheckCircle2 },
  { value: 'recommended_with_repairs', label: 'Recommended with repairs', icon: Wrench },
  { value: 'not_recommended', label: 'Not recommended', icon: XCircle },
];

export default function SummaryStep() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const full = useInspectionFull(id);
  const profile = useProfile();
  const checklist = useChecklist();
  const submit = useSubmitInspection(id!);
  const [padOpen, setPadOpen] = useState(false);
  const [stage, setStage] = useState<'idle' | 'saving'>('idle');

  const results = useWizardStore((s) => s.results);
  const summary = useWizardStore((s) => s.summary);
  const setSummary = useWizardStore((s) => s.setSummary);

  const tallies = useMemo(() => {
    const sections = checklist.data ?? [];
    let unansweredIds: number[] = [];
    const perSection = sections.map((s) => {
      const t = { title: s.title, p: 0, f: 0, r: 0, na: 0, unanswered: 0 };
      for (const item of s.items) {
        const r = results[item.id]?.result;
        if (!r) {
          t.unanswered += 1;
          unansweredIds.push(item.id);
        } else if (r === 'pass') t.p += 1;
        else if (r === 'fail') t.f += 1;
        else if (r === 'repair') t.r += 1;
        else t.na += 1;
      }
      return t;
    });
    return { perSection, unansweredIds };
  }, [checklist.data, results]);

  const canSubmit =
    summary.rating > 0 && summary.recommendation != null && summary.signaturePngB64 != null;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setStage('saving');
    // flush any pending result saves before completing
    const flushed = await getAutosaveEngine(id!).flush();
    if (!flushed) {
      setStage('idle');
      toast.show('error', 'Some answers haven’t saved yet — check your connection');
      return;
    }
    submit.mutate(
      {
        overall_rating: summary.rating,
        recommendation: summary.recommendation!,
        inspector_notes: summary.notes,
        signaturePngB64: summary.signaturePngB64!,
        unansweredItemIds: tallies.unansweredIds,
      },
      {
        onSuccess: () => router.replace(`/(app)/inspection/${id}/done`),
        onError: () => {
          setStage('idle');
          toast.show('error', 'Couldn’t submit — try again');
        },
      },
    );
  };

  return (
    <Screen
      footer={
        <Button
          label="Submit inspection"
          onPress={onSubmit}
          disabled={!canSubmit}
          loading={stage === 'saving' || submit.isPending}
        />
      }
    >
      <WizardHeader inspectionId={id!} step="summary" title="Summary" />

      {/* Review strip */}
      <View style={styles.review}>
        <Card style={styles.reviewCard} onPress={() => router.push(`/(app)/inspection/${id}/client`)}>
          <AppText variant="micro" color="tertiary">
            Client
          </AppText>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {full.data?.client?.full_name || '—'}
          </AppText>
        </Card>
        <Card style={styles.reviewCard} onPress={() => router.push(`/(app)/inspection/${id}/vehicle`)}>
          <AppText variant="micro" color="tertiary">
            Vehicle
          </AppText>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {full.data?.vehicle ? vehicleTitle(full.data.vehicle) : '—'}
          </AppText>
        </Card>
      </View>

      <Card style={{ marginTop: 12, gap: 6 }} onPress={() => router.push(`/(app)/inspection/${id}/checklist`)}>
        <AppText variant="micro" color="tertiary">
          Results
        </AppText>
        {tallies.perSection.map((t) => (
          <View key={t.title} style={styles.tallyRow}>
            <AppText variant="caption" style={{ flex: 1 }} numberOfLines={1}>
              {t.title}
            </AppText>
            <AppText variant="caption" style={{ color: colors.pass }}>{`${t.p}P`}</AppText>
            <AppText variant="caption" style={{ color: colors.repair }}>{`${t.r}R`}</AppText>
            <AppText variant="caption" style={{ color: colors.fail }}>{`${t.f}F`}</AppText>
            <AppText variant="caption" color="tertiary">{`${t.na}NA`}</AppText>
          </View>
        ))}
      </Card>

      {tallies.unansweredIds.length > 0 ? (
        <Card style={[styles.warn, { backgroundColor: colors.repairSoft, borderColor: colors.repair }]}>
          <TriangleAlert size={18} color={colors.repair} />
          <AppText variant="caption" style={{ flex: 1, color: colors.repair }}>
            {tallies.unansweredIds.length} items unanswered — they’ll be marked N/A
          </AppText>
        </Card>
      ) : null}

      {/* Rating */}
      <AppText variant="micro" color="tertiary" style={styles.sectionLabel}>
        Overall rating
      </AppText>
      <View style={styles.starsWrap}>
        <Stars value={summary.rating} onChange={(n) => setSummary({ rating: n })} />
      </View>

      {/* Recommendation */}
      <AppText variant="micro" color="tertiary" style={styles.sectionLabel}>
        Recommendation
      </AppText>
      <View style={{ gap: 8 }}>
        {RECOMMENDATIONS.map((r) => {
          const selected = summary.recommendation === r.value;
          const tint =
            r.value === 'recommended' ? colors.pass : r.value === 'not_recommended' ? colors.fail : colors.repair;
          return (
            <ScalePressable
              key={r.value}
              onPress={() => setSummary({ recommendation: r.value })}
              style={[
                styles.recCard,
                {
                  borderColor: selected ? tint : colors.border,
                  backgroundColor: selected
                    ? r.value === 'recommended'
                      ? colors.passSoft
                      : r.value === 'not_recommended'
                        ? colors.failSoft
                        : colors.repairSoft
                    : colors.surface,
                },
              ]}
            >
              <r.icon size={20} color={tint} />
              <AppText variant="bodyStrong" style={selected ? { color: tint } : undefined}>
                {r.label}
              </AppText>
            </ScalePressable>
          );
        })}
      </View>

      {/* Notes */}
      <AppText variant="micro" color="tertiary" style={styles.sectionLabel}>
        Inspector notes
      </AppText>
      <Input
        placeholder="Anything the client should know…"
        multiline
        numberOfLines={4}
        defaultValue={summary.notes}
        onChangeText={(t) => setSummary({ notes: t })}
        style={{ minHeight: 90, textAlignVertical: 'top' }}
      />

      {/* Signature */}
      <AppText variant="micro" color="tertiary" style={styles.sectionLabel}>
        Signature
      </AppText>
      <ScalePressable
        onPress={() => setPadOpen(true)}
        style={[styles.sigBox, { borderColor: colors.border, backgroundColor: colors.surface }]}
      >
        {summary.signaturePngB64 ? (
          <Image
            source={{ uri: `data:image/png;base64,${summary.signaturePngB64}` }}
            style={styles.sigImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.sigEmpty}>
            <PenLine size={20} color={colors.textTertiary} />
            <AppText variant="body" color="tertiary">
              Sign here
            </AppText>
          </View>
        )}
      </ScalePressable>
      <AppText variant="caption" color="secondary" style={{ marginTop: 6 }}>
        {profile.data?.full_name ?? ''} · {formatDate(new Date().toISOString())}
      </AppText>

      <SignaturePad
        visible={padOpen}
        onDone={(b64) => {
          setSummary({ signaturePngB64: b64 });
          setPadOpen(false);
        }}
        onCancel={() => setPadOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  review: { flexDirection: 'row', gap: 12, marginTop: 12 },
  reviewCard: { flex: 1, gap: 4 },
  tallyRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  sectionLabel: { marginTop: 24, marginBottom: 8 },
  starsWrap: { alignItems: 'center', paddingVertical: 8 },
  recCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    minHeight: 56,
  },
  sigBox: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16, minHeight: 110, overflow: 'hidden' },
  sigImage: { width: '100%', height: 110 },
  sigEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 110 },
});
