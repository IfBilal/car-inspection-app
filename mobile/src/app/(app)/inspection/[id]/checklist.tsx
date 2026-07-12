import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ScalePressable } from '@/components/ui/Pressable';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { WizardHeader } from '@/components/wizard/WizardHeader';
import { ItemRow } from '@/components/checklist/ItemRow';
import { useTheme } from '@/theme/ThemeProvider';
import { useChecklist, useInspectionFull } from '@/lib/queries';
import { useBulkResults } from '@/lib/mutations';
import { ObdCard } from '@/components/checklist/ObdCard';
import { getAutosaveEngine } from '@/lib/autosave';
import { useWizardStore } from '@/store/wizard';
import type { ChecklistItem, ChecklistSection, SectionKind } from '@/lib/types';

type Row =
  | { type: 'header'; section: ChecklistSection; firstItemIndex: number }
  | { type: 'item'; item: ChecklistItem; kind: SectionKind };

const BULK_LABEL: Record<SectionKind, string> = {
  status: 'Mark remaining OK',
  passfail: 'Mark remaining Pass',
  flags: 'Mark remaining No',
};

export default function ChecklistStep() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const checklist = useChecklist();
  const full = useInspectionFull(id);
  const bulk = useBulkResults(id!);
  const listRef = useRef<FlashListRef<Row>>(null);
  const [activeSection, setActiveSection] = useState<number | null>(null);

  const resultsMap = useWizardStore((s) => s.results);
  const answered = Object.keys(resultsMap).length;

  const { rows, totalItems, sectionIndexMap } = useMemo(() => {
    const rows: Row[] = [];
    const sectionIndexMap = new Map<number, number>();
    let totalItems = 0;
    for (const section of checklist.data ?? []) {
      sectionIndexMap.set(section.id, rows.length);
      rows.push({ type: 'header', section, firstItemIndex: rows.length + 1 });
      for (const item of section.items) rows.push({ type: 'item', item, kind: section.kind });
      totalItems += section.items.length;
    }
    return { rows, totalItems, sectionIndexMap };
  }, [checklist.data]);

  const unanswered = totalItems - answered;

  const jumpToSection = (sectionId: number) => {
    setActiveSection(sectionId);
    const index = sectionIndexMap.get(sectionId);
    if (index != null) listRef.current?.scrollToIndex({ index, animated: true });
  };

  // "pass" maps to the good option of every kind: OK / Pass / No-flag.
  const markRemainingGood = (section: ChecklistSection & { items: ChecklistItem[] }) => {
    const results = useWizardStore.getState().results;
    const remaining = section.items.filter((i) => !results[i.id]);
    if (remaining.length === 0) return;
    const setResult = useWizardStore.getState().setResult;
    remaining.forEach((i) => setResult(i.id, 'pass'));
    bulk.mutate(
      remaining.map((i) => ({ item_id: i.id, result: 'pass' as const })),
      { onError: () => toast.show('error', 'Couldn’t save — check your connection') },
    );
    toast.show('success', `${remaining.length} items updated`);
  };

  const onContinue = () => {
    getAutosaveEngine(id!).enqueue({ kind: 'inspection', fields: { current_step: 4 } });
    router.push(`/(app)/inspection/${id}/photos`);
  };

  if (checklist.isPending) {
    return (
      <Screen>
        <WizardHeader inspectionId={id!} step="checklist" title="Checklist" />
        <View style={{ gap: 14, marginTop: 20 }}>
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} height={44} />
          ))}
        </View>
      </Screen>
    );
  }

  const sections = checklist.data ?? [];

  return (
    <Screen
      scroll={false}
      padded={false}
      footer={
        <Button
          label="Continue to photos"
          onPress={onContinue}
        />
      }
    >
      <View style={{ paddingHorizontal: 20 }}>
        <WizardHeader
          inspectionId={id!}
          step="checklist"
          title="Checklist"
          right={
            <AppText variant="caption" color="secondary">
              {answered}/{totalItems}
            </AppText>
          }
        />
      </View>

      {/* Section rail */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.rail}
        contentContainerStyle={styles.railContent}
      >
        {sections.map((s) => {
          const done = s.items.filter((i) => resultsMap[i.id]).length;
          const active = activeSection === s.id;
          return (
            <ScalePressable
              key={s.id}
              onPress={() => jumpToSection(s.id)}
              style={[
                styles.pill,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <AppText variant="caption" style={{ color: active ? '#FFFFFF' : colors.textPrimary }}>
                {s.title}
              </AppText>
              <AppText variant="micro" style={{ color: active ? '#FFFFFF' : colors.textTertiary }}>
                {done}/{s.items.length}
              </AppText>
            </ScalePressable>
          );
        })}
      </ScrollView>

      {/* One continuous virtualized list with sticky-ish headers */}
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <FlashList
          ref={listRef}
          data={rows}
          keyExtractor={(row) => (row.type === 'header' ? `s${row.section.id}` : `i${row.item.id}`)}
          getItemType={(row) => row.type}
          renderItem={({ item: row }) => {
            if (row.type === 'header') {
              const section = sections.find((s) => s.id === row.section.id)!;
              return (
                <View style={[styles.sectionHeader, { backgroundColor: colors.canvas }]}>
                  <AppText variant="micro" color="tertiary" style={{ flexShrink: 1 }}>
                    {row.section.title}
                  </AppText>
                  <ScalePressable onPress={() => markRemainingGood(section)} hitSlop={8}>
                    <AppText variant="caption" color="brand">
                      {BULK_LABEL[row.section.kind]}
                    </AppText>
                  </ScalePressable>
                </View>
              );
            }
            return <ItemRow item={row.item} kind={row.kind} inspectionId={id!} />;
          }}
          ListFooterComponent={full.data ? <ObdCard inspection={full.data} /> : null}
          onViewableItemsChanged={({ viewableItems }) => {
            const first = viewableItems.find((v) => v.item?.type === 'header' || v.item?.type === 'item');
            if (!first?.item) return;
            const sectionId =
              first.item.type === 'header' ? first.item.section.id : first.item.item.section_id;
            setActiveSection(sectionId);
          }}
        />
      </View>

      {unanswered > 0 ? (
        <View style={[styles.unansweredBar, { backgroundColor: colors.canvas }]}>
          <AppText variant="caption" color="tertiary" style={{ textAlign: 'center' }}>
            {unanswered} unanswered
          </AppText>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rail: { flexGrow: 0, marginTop: 8 },
  railContent: { gap: 8, paddingHorizontal: 20, paddingVertical: 8 },
  pill: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
    minHeight: 48,
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 8,
  },
  unansweredBar: { paddingVertical: 4 },
});
