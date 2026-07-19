import { useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, PenLine, TriangleAlert, XCircle } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { ScalePressable } from '@/components/ui/Pressable';
import { useToast } from '@/components/ui/Toast';
import { WizardHeader } from '@/components/wizard/WizardHeader';
import { SignaturePad } from '@/components/signature/SignaturePad';
import { vehicleTitle } from '@/components/vehicle/VehicleCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useChecklist, useInspectionFull } from '@/lib/queries';
import { useSubmitInspection } from '@/lib/mutations';
import { getAutosaveEngine } from '@/lib/autosave';
import { useWizardStore } from '@/store/wizard';
import { formatDate, scoreBand } from '@/lib/format';
import type { Recommendation } from '@/lib/types';

const RECOMMENDATIONS: { value: Recommendation; label: string; sub: string; icon: any }[] = [
  { value: 'buy', label: 'Buy', sub: 'The vehicle is in good condition and ready to purchase.', icon: CheckCircle2 },
  { value: 'negotiate', label: 'Negotiate', sub: 'The vehicle has issues that should be addressed.', icon: TriangleAlert },
  { value: 'walk_away', label: 'Walk away', sub: 'The vehicle has major issues or too many red flags.', icon: XCircle },
];

export default function SummaryStep() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const full = useInspectionFull(id);
  const checklist = useChecklist();
  const submit = useSubmitInspection(id!);
  const [padOpen, setPadOpen] = useState(false);
  const [stage, setStage] = useState<'idle' | 'saving'>('idle');

  const results = useWizardStore((s) => s.results);
  const summary = useWizardStore((s) => s.summary);
  const setSummary = useWizardStore((s) => s.setSummary);

  const tallies = useMemo(() => {
    const sections = checklist.data ?? [];
    const unansweredIds: number[] = [];
    const perSection = sections.map((s) => {
      const t = { title: s.title, kind: s.kind, good: 0, warn: 0, bad: 0, na: 0, unanswered: 0 };
      for (const item of s.items) {
        const r = results[item.id]?.result;
        if (!r) {
          t.unanswered += 1;
          unansweredIds.push(item.id);
        } else if (r === 'pass') t.good += 1;
        else if (r === 'repair') t.warn += 1;
        else if (r === 'fail') t.bad += 1;
        else t.na += 1;
      }
      return t;
    });
    return { perSection, unansweredIds };
  }, [checklist.data, results]);

  const canSubmit =
    summary.score > 0 && summary.recommendation != null && summary.signaturePngB64 != null;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setStage('saving');
    const flushed = await getAutosaveEngine(id!).flush();
    if (!flushed) {
      setStage('idle');
      toast.show('error', 'Some answers haven’t saved yet — check your connection');
      return;
    }
    submit.mutate(
      {
        overall_score: summary.score,
        recommendation: summary.recommendation!,
        inspector_notes: summary.notes,
        estimated_repair_cost: summary.repairCost,
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

  const band = summary.score > 0 ? scoreBand(summary.score) : null;

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
            Buyer
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
            <AppText variant="caption" style={{ color: colors.pass }}>{t.good}</AppText>
            <AppText variant="caption" style={{ color: colors.repair }}>{t.warn}</AppText>
            <AppText variant="caption" style={{ color: colors.fail }}>{t.bad}</AppText>
            <AppText variant="caption" color="tertiary">{t.na + t.unanswered}</AppText>
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

      {/* Overall condition score */}
      <View style={styles.scoreHeader}>
        <AppText variant="micro" color="tertiary">
          Overall condition score
        </AppText>
        {band ? <Chip label={`${summary.score}/10 · ${band.label}`} tone={band.tone} /> : null}
      </View>
      <View style={styles.scoreRow}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const selected = summary.score === n;
          const tone = scoreBand(n);
          const tint =
            tone.tone === 'pass' ? colors.pass : tone.tone === 'info' ? colors.info : tone.tone === 'repair' ? colors.repair : colors.fail;
          return (
            <ScalePressable
              key={n}
              pressScale={0.88}
              onPress={() => setSummary({ score: n })}
              style={[
                styles.scoreChip,
                {
                  borderColor: selected ? tint : colors.border,
                  backgroundColor: selected ? tint : colors.surface,
                },
              ]}
            >
              <AppText
                variant="bodyStrong"
                style={{ color: selected ? '#FFFFFF' : colors.textSecondary }}
              >
                {n}
              </AppText>
            </ScalePressable>
          );
        })}
      </View>
      <AppText variant="caption" color="tertiary">
        9–10 Excellent · 7–8 Good · 5–6 Fair · 1–4 Poor
      </AppText>

      {/* Estimated repair cost */}
      <AppText variant="micro" color="tertiary" style={styles.sectionLabel}>
        Estimated repair costs
      </AppText>
      <Input
        placeholder="0"
        keyboardType="decimal-pad"
        suffix="$"
        defaultValue={summary.repairCost}
        onChangeText={(t) => setSummary({ repairCost: t })}
        helper="Total estimated repair cost — leave empty if none"
      />

      {/* Final recommendation */}
      <AppText variant="micro" color="tertiary" style={styles.sectionLabel}>
        Final recommendation
      </AppText>
      <View style={{ gap: 8 }}>
        {RECOMMENDATIONS.map((r) => {
          const selected = summary.recommendation === r.value;
          const tint = r.value === 'buy' ? colors.pass : r.value === 'walk_away' ? colors.fail : colors.repair;
          const soft = r.value === 'buy' ? colors.passSoft : r.value === 'walk_away' ? colors.failSoft : colors.repairSoft;
          return (
            <ScalePressable
              key={r.value}
              onPress={() => setSummary({ recommendation: r.value })}
              style={[
                styles.recCard,
                { borderColor: selected ? tint : colors.border, backgroundColor: selected ? soft : colors.surface },
              ]}
            >
              <r.icon size={22} color={tint} />
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" style={selected ? { color: tint } : undefined}>
                  {r.label}
                </AppText>
                <AppText variant="caption" color="secondary">
                  {r.sub}
                </AppText>
              </View>
            </ScalePressable>
          );
        })}
      </View>

      {/* Notes */}
      <AppText variant="micro" color="tertiary" style={styles.sectionLabel}>
        Notes / comments
      </AppText>
      <Input
        placeholder="Anything the buyer should know…"
        multiline
        numberOfLines={4}
        defaultValue={summary.notes}
        onChangeText={(t) => setSummary({ notes: t })}
        style={{ minHeight: 90, textAlignVertical: 'top' }}
      />

      {/* Buyer signature */}
      <AppText variant="micro" color="tertiary" style={styles.sectionLabel}>
        Buyer signature
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
              Tap for buyer to sign
            </AppText>
          </View>
        )}
      </ScalePressable>
      <AppText variant="caption" color="secondary" style={{ marginTop: 6 }}>
        {full.data?.client?.full_name || 'Buyer'} · {formatDate(new Date().toISOString())}
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
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 8,
  },
  scoreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  scoreChip: {
    width: 52,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
