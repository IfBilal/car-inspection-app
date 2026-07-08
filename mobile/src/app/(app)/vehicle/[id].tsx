import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ClipboardList } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { ScalePressable } from '@/components/ui/Pressable';
import { Skeleton } from '@/components/ui/Skeleton';
import { Stars } from '@/components/ui/Stars';
import { useToast } from '@/components/ui/Toast';
import { PlateBadge } from '@/components/vehicle/PlateBadge';
import { vehicleTitle } from '@/components/vehicle/VehicleCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useVehicle, useVehicleHistory } from '@/lib/queries';
import { useCreateDraft } from '@/lib/mutations';
import { formatDate, RECOMMENDATION_LABEL, RECOMMENDATION_TONE } from '@/lib/format';

export default function VehicleProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const vehicle = useVehicle(id);
  const history = useVehicleHistory(id);
  const createDraft = useCreateDraft();

  const startForVehicle = () => {
    createDraft.mutate(id, {
      onSuccess: (inspectionId) => router.push(`/(app)/inspection/${inspectionId}/client`),
      onError: () => toast.show('error', 'Couldn’t start the inspection — try again'),
    });
  };

  const specs = vehicle.data
    ? [
        vehicle.data.colour,
        vehicle.data.transmission,
        vehicle.data.fuel_type,
        vehicle.data.engine_size,
        vehicle.data.drive_type,
      ].filter((s): s is string => !!s)
    : [];

  return (
    <Screen>
      <View style={styles.header}>
        <ScalePressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </ScalePressable>
        <AppText variant="title1">Vehicle</AppText>
      </View>

      {vehicle.isPending ? (
        <Card>
          <View style={{ gap: 12 }}>
            <Skeleton height={22} width="60%" />
            <Skeleton height={16} width="40%" />
          </View>
        </Card>
      ) : vehicle.data ? (
        <Card style={{ gap: 12 }}>
          <View style={styles.heroRow}>
            <AppText variant="title2" style={{ flex: 1 }}>
              {vehicleTitle(vehicle.data)}
            </AppText>
            <PlateBadge plate={vehicle.data.registration_plate} />
          </View>
          {specs.length > 0 ? (
            <View style={styles.chips}>
              {specs.map((s) => (
                <Chip key={s} label={s} tone="na" />
              ))}
            </View>
          ) : null}
          {vehicle.data.vin || vehicle.data.chassis_number ? (
            <AppText variant="caption" color="tertiary">
              {vehicle.data.vin ? `VIN ${vehicle.data.vin}` : ''}
              {vehicle.data.vin && vehicle.data.chassis_number ? '  ·  ' : ''}
              {vehicle.data.chassis_number ? `Chassis ${vehicle.data.chassis_number}` : ''}
            </AppText>
          ) : null}
          <Button label="New inspection for this vehicle" onPress={startForVehicle} loading={createDraft.isPending} />
        </Card>
      ) : null}

      <AppText variant="micro" color="tertiary" style={styles.sectionHeader}>
        History
      </AppText>
      {history.isPending ? (
        <Card>
          <View style={{ gap: 12 }}>
            <Skeleton height={18} width="70%" />
            <Skeleton height={18} width="55%" />
          </View>
        </Card>
      ) : history.data && history.data.length > 0 ? (
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          {history.data.map((row) => (
            <ListRow
              key={row.id}
              title={`${formatDate(row.completed_at ?? row.created_at)} · ${row.inspector?.full_name ?? ''}`}
              subtitle={row.client?.full_name ?? undefined}
              right={
                row.status === 'draft' ? (
                  <Chip label="Draft" tone="repair" />
                ) : (
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    {row.overall_rating ? <Stars value={row.overall_rating} size={12} readonly /> : null}
                    {row.recommendation ? (
                      <Chip
                        label={RECOMMENDATION_LABEL[row.recommendation]}
                        tone={RECOMMENDATION_TONE[row.recommendation]}
                      />
                    ) : null}
                  </View>
                )
              }
              onPress={() =>
                row.status === 'draft'
                  ? router.push(`/(app)/inspection/${row.id}/client`)
                  : router.push(`/(app)/inspections/${row.id}`)
              }
            />
          ))}
        </Card>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No inspections for this vehicle yet"
          actionLabel="Start one"
          onAction={startForVehicle}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 20 },
  back: { width: 40, height: 40, justifyContent: 'center' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sectionHeader: { marginTop: 28, marginBottom: 10 },
});
