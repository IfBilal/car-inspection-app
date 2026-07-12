import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ArrowLeft, ChevronDown, ChevronUp, Mail, Share2 } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ScalePressable } from '@/components/ui/Pressable';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { PlateBadge } from '@/components/vehicle/PlateBadge';
import { vehicleTitle } from '@/components/vehicle/VehicleCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useChecklist, useInspectionFull } from '@/lib/queries';
import { useSendReport } from '@/lib/mutations';
import { signedPhotoUrl } from '@/lib/photos';
import { formatDate, RECOMMENDATION_LABEL, RECOMMENDATION_TONE, scoreBand } from '@/lib/format';
import type { ItemResult } from '@/lib/types';

const RESULT_LETTER: Record<ItemResult, string> = { pass: 'P', fail: 'F', na: 'NA', repair: 'R' };

export default function InspectionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const full = useInspectionFull(id);
  const checklist = useChecklist();
  const sendReport = useSendReport();
  const { width } = useWindowDimensions();
  const [openSections, setOpenSections] = useState<Set<number>>(new Set());
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [sharing, setSharing] = useState(false);

  const resultByItem = useMemo(() => {
    const map = new Map<number, { result: ItemResult; note: string | null }>();
    for (const r of full.data?.results ?? []) map.set(r.item_id, { result: r.result, note: r.note });
    return map;
  }, [full.data?.results]);

  const photos = useMemo(() => full.data?.photos ?? [], [full.data?.photos]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const missing = photos.filter((p) => !photoUrls[p.id]);
      if (missing.length === 0) return;
      const entries = await Promise.all(
        missing.map(async (p) => [p.id, await signedPhotoUrl(p.storage_path)] as const),
      );
      if (!cancelled) setPhotoUrls((u) => ({ ...u, ...Object.fromEntries(entries) }));
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [photos, photoUrls]);

  // Drafts open in the wizard instead
  if (full.data && full.data.status === 'draft') {
    return <Redirect href={`/(app)/inspection/${full.data.id}/client`} />;
  }

  const resend = () => {
    const email = full.data?.client?.email ?? '';
    Alert.alert('Re-send report', `Send the report to ${email} again?`, [
      {
        text: 'Send',
        onPress: () =>
          sendReport.mutate(
            { inspectionId: id!, resend: true },
            {
              onSuccess: () => toast.show('success', `Report sent to ${email}`),
              onError: () => toast.show('error', 'Couldn’t send the report'),
            },
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const sharePdf = async () => {
    const insp = full.data;
    if (!insp) return;
    setSharing(true);
    try {
      let pdfPath = insp.pdf_path;
      if (!pdfPath) {
        const res = await sendReport.mutateAsync({ inspectionId: id!, resend: true });
        pdfPath = res.pdf_path;
      }
      const url = await signedPhotoUrl(pdfPath!, 'reports');
      const name = `Inspection-Report-${insp.vehicle?.registration_plate ?? insp.id.slice(0, 8)}.pdf`;
      const dest = new File(Paths.cache, name);
      if (dest.exists) dest.delete();
      const downloaded = await File.downloadFileAsync(url, dest);
      await Sharing.shareAsync(downloaded.uri, { mimeType: 'application/pdf' });
    } catch {
      toast.show('error', 'Couldn’t share the PDF');
    } finally {
      setSharing(false);
    }
  };

  const toggleSection = (sid: number) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const tile = (width - 40 - 16 - 32) / 3;

  return (
    <Screen>
      <View style={styles.header}>
        <ScalePressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </ScalePressable>
        <AppText variant="title1">Inspection</AppText>
      </View>

      {full.isPending ? (
        <Card>
          <View style={{ gap: 12 }}>
            <Skeleton height={22} width="60%" />
            <Skeleton height={16} width="40%" />
          </View>
        </Card>
      ) : full.data ? (
        <>
          {/* Hero */}
          <Card style={{ gap: 10 }}>
            <View style={styles.heroRow}>
              <AppText variant="title2" style={{ flex: 1 }}>
                {full.data.vehicle ? vehicleTitle(full.data.vehicle) : 'Vehicle'}
              </AppText>
              <PlateBadge plate={full.data.vehicle?.registration_plate ?? null} />
            </View>
            <AppText variant="caption" color="secondary">
              {full.data.client?.full_name} · {formatDate(full.data.completed_at)} ·{' '}
              {full.data.inspector?.full_name}
            </AppText>
            <View style={styles.heroBottom}>
              {full.data.overall_score ? (
                <Chip
                  label={`${full.data.overall_score}/10 · ${scoreBand(full.data.overall_score).label}`}
                  tone={scoreBand(full.data.overall_score).tone}
                />
              ) : null}
              {full.data.recommendation ? (
                <Chip
                  label={RECOMMENDATION_LABEL[full.data.recommendation]}
                  tone={RECOMMENDATION_TONE[full.data.recommendation]}
                />
              ) : null}
            </View>
            <View style={styles.actionRow}>
              <Button
                size="md"
                variant="secondary"
                icon={Mail}
                label="Re-send email"
                fullWidth={false}
                onPress={resend}
                loading={sendReport.isPending && !sharing}
              />
              <Button
                size="md"
                variant="secondary"
                icon={Share2}
                label="Share PDF"
                fullWidth={false}
                onPress={() => void sharePdf()}
                loading={sharing}
              />
            </View>
          </Card>

          {/* Results accordions */}
          <AppText variant="micro" color="tertiary" style={styles.sectionHeader}>
            Results
          </AppText>
          <View style={{ gap: 8 }}>
            {(checklist.data ?? []).map((section) => {
              const open = openSections.has(section.id);
              const tally = { p: 0, f: 0, r: 0, na: 0 };
              for (const item of section.items) {
                const r = resultByItem.get(item.id)?.result;
                if (r === 'pass') tally.p += 1;
                else if (r === 'fail') tally.f += 1;
                else if (r === 'repair') tally.r += 1;
                else if (r === 'na') tally.na += 1;
              }
              return (
                <Card key={section.id} padded={false}>
                  <ScalePressable onPress={() => toggleSection(section.id)} style={styles.accordionHead}>
                    <AppText variant="bodyStrong" style={{ flex: 1 }}>
                      {section.title}
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.pass }}>{`${tally.p}P`}</AppText>
                    <AppText variant="caption" style={{ color: colors.repair }}>{`${tally.r}R`}</AppText>
                    <AppText variant="caption" style={{ color: colors.fail }}>{`${tally.f}F`}</AppText>
                    {open ? (
                      <ChevronUp size={18} color={colors.textTertiary} />
                    ) : (
                      <ChevronDown size={18} color={colors.textTertiary} />
                    )}
                  </ScalePressable>
                  {open
                    ? section.items.map((item) => {
                        const r = resultByItem.get(item.id);
                        const color =
                          r?.result === 'pass'
                            ? colors.pass
                            : r?.result === 'fail'
                              ? colors.fail
                              : r?.result === 'repair'
                                ? colors.repair
                                : colors.na;
                        return (
                          <View key={item.id} style={[styles.resultRow, { borderTopColor: colors.divider }]}>
                            <AppText variant="micro" color="tertiary" style={styles.itemNo}>
                              {item.item_number}
                            </AppText>
                            <View style={{ flex: 1 }}>
                              <AppText variant="caption">{item.label}</AppText>
                              {r?.note ? (
                                <AppText variant="caption" color="tertiary">
                                  {r.note}
                                </AppText>
                              ) : null}
                            </View>
                            <AppText variant="caption" style={{ color, fontFamily: 'Inter_700Bold' }}>
                              {r ? RESULT_LETTER[r.result] : '—'}
                            </AppText>
                          </View>
                        );
                      })
                    : null}
                </Card>
              );
            })}
          </View>

          {/* Photos */}
          {photos.length > 0 ? (
            <>
              <AppText variant="micro" color="tertiary" style={styles.sectionHeader}>
                Photos
              </AppText>
              <Card>
                <View style={styles.photoGrid}>
                  {photos.map((p) => (
                    <View
                      key={p.id}
                      style={{ width: tile, height: tile, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.divider }}
                    >
                      {photoUrls[p.id] ? (
                        <Image source={{ uri: photoUrls[p.id] }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      ) : (
                        <ActivityIndicator style={{ flex: 1 }} color={colors.textTertiary} />
                      )}
                    </View>
                  ))}
                </View>
              </Card>
            </>
          ) : null}

          {/* Notes */}
          {full.data.inspector_notes ? (
            <>
              <AppText variant="micro" color="tertiary" style={styles.sectionHeader}>
                Inspector notes
              </AppText>
              <Card>
                <AppText variant="body">{full.data.inspector_notes}</AppText>
              </Card>
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 20 },
  back: { width: 40, height: 40, justifyContent: 'center' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  sectionHeader: { marginTop: 24, marginBottom: 8 },
  accordionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  resultRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  itemNo: { width: 28 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
