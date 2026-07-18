import { useState } from 'react';
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Eraser } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ScalePressable } from '@/components/ui/Pressable';
import { WizardHeader } from '@/components/wizard/WizardHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { getAutosaveEngine } from '@/lib/autosave';
import { useWizardStore } from '@/store/wizard';
import type { DamageMark, DamageMarkType } from '@/lib/types';
import { getVehicleDiagram } from '@/lib/vehicle-diagrams';
import { useInspectionFull } from '@/lib/queries';

// Client-specified legend (differs from the sample document on purpose):
// X = Dent, /// = Scratch, O = Rust
const MARK_TYPES: { value: DamageMarkType; glyph: string; label: string }[] = [
  { value: 'dent', glyph: 'X', label: 'Dent' },
  { value: 'scratch', glyph: '///', label: 'Scratch' },
  { value: 'rust', glyph: 'O', label: 'Rust' },
];

const GLYPH: Record<DamageMarkType, string> = { dent: 'X', scratch: '///', rust: 'O' };
/** Tap within this normalized distance of an existing mark removes it. */
const REMOVE_RADIUS = 0.035;

export default function DamageStep() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const inspection = useInspectionFull(id);
  const marks = useWizardStore((s) => s.damageMarks);
  const setDamageMarks = useWizardStore((s) => s.setDamageMarks);
  const [tool, setTool] = useState<DamageMarkType>('dent');

  const diagram = getVehicleDiagram(inspection.data?.vehicle?.body_type);
  const maxCanvasW = width - 40;
  const maxCanvasH = 430;
  const canvasH = Math.min(maxCanvasW / diagram.aspect, maxCanvasH);
  const canvasW = canvasH * diagram.aspect;

  const save = (next: DamageMark[]) => {
    setDamageMarks(next);
    getAutosaveEngine(id!).enqueue({ kind: 'inspection', fields: { damage_marks: next } });
  };

  const onTap = (evt: { nativeEvent: { locationX: number; locationY: number } }) => {
    const x = evt.nativeEvent.locationX / canvasW;
    const y = evt.nativeEvent.locationY / canvasH;
    // remove an existing mark if tapped (distance normalized against width)
    const hit = marks.findIndex(
      (m) => Math.hypot(m.x - x, (m.y - y) / diagram.aspect) < REMOVE_RADIUS,
    );
    Haptics.selectionAsync();
    if (hit >= 0) {
      save(marks.filter((_, i) => i !== hit));
    } else {
      save([...marks, { x, y, t: tool }]);
    }
  };

  const onContinue = () => {
    getAutosaveEngine(id!).enqueue({ kind: 'inspection', fields: { current_step: 5 } });
    router.push(`/(app)/inspection/${id}/photos`);
  };

  return (
    <Screen footer={<Button label="Continue to photos" onPress={onContinue} />}>
      <WizardHeader
        inspectionId={id!}
        step="damage"
        title="Damage diagram"
        right={
          marks.length > 0 ? (
            <AppText variant="caption" color="secondary">
              {marks.length} mark{marks.length === 1 ? '' : 's'}
            </AppText>
          ) : undefined
        }
      />
      <AppText variant="caption" color="secondary" style={styles.hint}>
        {diagram.label}: pick a damage type, then tap the vehicle where the damage is. Tap a mark to remove it.
      </AppText>

      {/* Tool selector */}
      <View style={styles.tools}>
        {MARK_TYPES.map((t) => {
          const selected = tool === t.value;
          return (
            <ScalePressable
              key={t.value}
              onPress={() => setTool(t.value)}
              style={[
                styles.tool,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary : colors.surface,
                },
              ]}
            >
              <AppText variant="bodyStrong" style={{ color: selected ? '#FFFFFF' : colors.fail }}>
                {t.glyph}
              </AppText>
              <AppText variant="caption" style={{ color: selected ? '#FFFFFF' : colors.textSecondary }}>
                {t.label}
              </AppText>
            </ScalePressable>
          );
        })}
        <ScalePressable
          onPress={() => save([])}
          disabled={marks.length === 0}
          style={[styles.tool, { borderColor: colors.border, backgroundColor: colors.surface, opacity: marks.length ? 1 : 0.4 }]}
        >
          <Eraser size={16} color={colors.textSecondary} />
          <AppText variant="caption" color="secondary">
            Clear
          </AppText>
        </ScalePressable>
      </View>

      {/* Diagram canvas — always white like the paper form so the artwork reads */}
      <Pressable onPress={onTap} style={[styles.canvas, { width: canvasW, height: canvasH, borderColor: colors.border }]}>
        <Image source={diagram.source} style={{ width: canvasW, height: canvasH }} resizeMode="contain" />
        {marks.map((m, i) => (
          <View
            key={`${m.x}-${m.y}-${i}`}
            pointerEvents="none"
            style={[styles.mark, { left: m.x * canvasW - 12, top: m.y * canvasH - 12 }]}
          >
            <AppText style={styles.markGlyph}>{GLYPH[m.t]}</AppText>
          </View>
        ))}
      </Pressable>

      <AppText variant="caption" color="tertiary" style={styles.legend}>
        X = Dent   ·   /// = Scratch   ·   O = Rust
      </AppText>
      <AppText variant="caption" color="tertiary">
        Inspect all areas including front bumper, rear bumper, hood, roof, trunk, doors, fenders,
        quarter panels, rocker panels, and undercarriage.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { marginTop: 12, marginBottom: 12 },
  legend: { marginTop: 12, marginBottom: 4 },
  tools: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  canvas: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  mark: {
    position: 'absolute',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markGlyph: {
    color: '#DC2626',
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
});
