import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScalePressable } from '@/components/ui/Pressable';
import { getAutosaveEngine } from '@/lib/autosave';
import type { InspectionFull } from '@/lib/queries';

/** OBD-II readiness / scan block (report.pdf page 2). Autosaves onto the inspection. */
export function ObdCard({ inspection }: { inspection: InspectionFull }) {
  const { colors } = useTheme();
  const [ready, setReady] = useState<boolean | null>(inspection.obd_ready);

  const save = (fields: Record<string, unknown>) =>
    getAutosaveEngine(inspection.id).enqueue({ kind: 'inspection', fields });

  return (
    <Card style={styles.card}>
      <AppText variant="micro" color="tertiary">
        OBD-II readiness monitors (emissions system)
      </AppText>
      <View style={styles.chips}>
        {(
          [
            { label: 'Ready — all monitors ready', value: true },
            { label: 'Not ready', value: false },
          ] as const
        ).map((opt) => {
          const selected = ready === opt.value;
          const tint = opt.value ? colors.pass : colors.repair;
          return (
            <ScalePressable
              key={String(opt.value)}
              onPress={() => {
                setReady(opt.value);
                save({ obd_ready: opt.value });
              }}
              style={[
                styles.chip,
                {
                  borderColor: selected ? tint : colors.border,
                  backgroundColor: selected ? tint : colors.surface,
                },
              ]}
            >
              <AppText variant="caption" style={{ color: selected ? '#FFFFFF' : colors.textSecondary }}>
                {opt.label}
              </AppText>
            </ScalePressable>
          );
        })}
      </View>
      <Input
        label="Codes found (leave empty if none)"
        placeholder="e.g. P0301, P0420"
        autoCapitalize="characters"
        defaultValue={inspection.obd_codes ?? ''}
        onChangeText={(t) => save({ obd_codes: t || null })}
      />
      <Input
        label="Additional scan notes"
        placeholder="Optional"
        defaultValue={inspection.obd_notes ?? ''}
        onChangeText={(t) => save({ obd_notes: t || null })}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, marginTop: 16, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
});
