import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link2 } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ChipSelector } from '@/components/ui/ChipSelector';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { WizardHeader } from '@/components/wizard/WizardHeader';
import { vehicleTitle } from '@/components/vehicle/VehicleCard';
import { useInspectionFull } from '@/lib/queries';
import { findVehicleByIdentifiers, useSaveVehicle } from '@/lib/mutations';
import { getAutosaveEngine } from '@/lib/autosave';
import { vehicleSchema, type VehicleForm } from '@/lib/validation';
import { useWizardStore } from '@/store/wizard';
import type { Vehicle } from '@/lib/types';

export default function VehicleStep() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const full = useInspectionFull(id);
  const saveVehicle = useSaveVehicle(id!);
  const prefillIdentifier = useWizardStore((s) => s.prefillIdentifier);
  const setPrefillIdentifier = useWizardStore((s) => s.setPrefillIdentifier);
  const [manuallyLinked, setManuallyLinked] = useState<Vehicle | null>(null);
  const [dupeCandidate, setDupeCandidate] = useState<Vehicle | null>(null);
  const [dupeDismissed, setDupeDismissed] = useState(false);

  // A resumed draft with a real (non-stub) vehicle behaves like a linked vehicle.
  const resumedVehicle = useMemo(() => {
    const v = full.data?.vehicle;
    if (!v) return null;
    const isStub = v.make === '' && !!v.chassis_number?.startsWith('DRAFT-');
    return isStub ? null : v;
  }, [full.data?.vehicle]);
  const linkedVehicle = manuallyLinked ?? resumedVehicle;

  const { control, handleSubmit, reset, getValues, formState } = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      registration_plate: prefillIdentifier ?? '',
      chassis_number: '',
      vin: '',
      make: '',
      model: '',
      year: '',
      colour: '',
      engine_size: '',
      transmission: '',
      fuel_type: '',
      drive_type: '',
      odometer_km: '',
      seller: '',
      purchase_price: '',
    },
  });

  // Resume: prefill the form from the draft's vehicle (skip unfilled stubs).
  useEffect(() => {
    const v = resumedVehicle;
    if (!v || formState.isDirty) return;
    reset({
      registration_plate: v.registration_plate ?? '',
      chassis_number: v.chassis_number ?? '',
      vin: v.vin ?? '',
      make: v.make,
      model: v.model,
      year: v.year != null ? String(v.year) : '',
      colour: v.colour ?? '',
      engine_size: v.engine_size ?? '',
      transmission: v.transmission ?? '',
      fuel_type: v.fuel_type ?? '',
      drive_type: v.drive_type ?? '',
      odometer_km: full.data?.odometer_km != null ? String(full.data.odometer_km) : '',
      seller: full.data?.seller ?? '',
      purchase_price: full.data?.purchase_price != null ? String(full.data.purchase_price) : '',
    });
  }, [resumedVehicle, full.data, formState.isDirty, reset]);

  // Consumed the search prefill — clear it.
  useEffect(() => {
    if (prefillIdentifier) setPrefillIdentifier(null);
  }, [prefillIdentifier, setPrefillIdentifier]);

  /** On identifier blur: offer linking if this car is already registered. */
  const checkExisting = async () => {
    if (linkedVehicle || dupeDismissed) return;
    const v = getValues();
    try {
      const existing = await findVehicleByIdentifiers({
        registration_plate: v.registration_plate || undefined,
        chassis_number: v.chassis_number || undefined,
        vin: v.vin || undefined,
      });
      if (existing && existing.id !== full.data?.vehicle_id && existing.make !== '') {
        setDupeCandidate(existing);
      }
    } catch {
      // lookup is best-effort; ignore network hiccups
    }
  };

  const useExisting = () => {
    if (!dupeCandidate) return;
    setManuallyLinked(dupeCandidate);
    setDupeCandidate(null);
    reset({
      registration_plate: dupeCandidate.registration_plate ?? '',
      chassis_number: dupeCandidate.chassis_number ?? '',
      vin: dupeCandidate.vin ?? '',
      make: dupeCandidate.make,
      model: dupeCandidate.model,
      year: dupeCandidate.year != null ? String(dupeCandidate.year) : '',
      colour: dupeCandidate.colour ?? '',
      engine_size: dupeCandidate.engine_size ?? '',
      transmission: dupeCandidate.transmission ?? '',
      fuel_type: dupeCandidate.fuel_type ?? '',
      drive_type: dupeCandidate.drive_type ?? '',
      odometer_km: getValues('odometer_km'),
      seller: getValues('seller'),
      purchase_price: getValues('purchase_price'),
    });
  };

  const onContinue = handleSubmit(async (form) => {
    try {
      const snapshot = {
        odometer_km: form.odometer_km,
        seller: form.seller,
        purchase_price: form.purchase_price,
      };
      if (linkedVehicle) {
        await saveVehicle.mutateAsync({ existingVehicleId: linkedVehicle.id, snapshot });
      } else {
        await saveVehicle.mutateAsync({ vehicleId: full.data!.vehicle_id, form, snapshot });
      }
      getAutosaveEngine(id!).enqueue({ kind: 'inspection', fields: { current_step: 3 } });
      router.push(`/(app)/inspection/${id}/checklist`);
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        toast.show('error', 'A vehicle with that plate/chassis/VIN already exists — check the identifiers');
        setDupeDismissed(false);
        void checkExisting();
      } else {
        toast.show('error', 'Couldn’t save the vehicle — try again');
      }
    }
  });

  return (
    <Screen footer={<Button label="Start checklist" onPress={onContinue} loading={saveVehicle.isPending} />}>
      <WizardHeader inspectionId={id!} step="vehicle" title="Vehicle details" />

      {linkedVehicle ? (
        <Card style={styles.linked}>
          <View style={styles.linkedRow}>
            <Chip label="Linked vehicle" tone="primary" icon={Link2} />
            <AppText variant="caption" color="secondary">
              {vehicleTitle(linkedVehicle)} — identifiers locked
            </AppText>
          </View>
        </Card>
      ) : null}

      {dupeCandidate ? (
        <Card style={styles.linked}>
          <AppText variant="bodyStrong">This car is already registered — use it?</AppText>
          <AppText variant="caption" color="secondary">
            {vehicleTitle(dupeCandidate)} {dupeCandidate.registration_plate ?? dupeCandidate.vin ?? ''}
          </AppText>
          <View style={styles.dupeActions}>
            <Button size="md" label="Use existing" onPress={useExisting} fullWidth={false} />
            <Button
              size="md"
              variant="ghost"
              label="Keep mine"
              onPress={() => {
                setDupeDismissed(true);
                setDupeCandidate(null);
              }}
              fullWidth={false}
            />
          </View>
        </Card>
      ) : null}

      <View style={styles.form}>
        <AppText variant="micro" color="tertiary">
          Identifiers — at least one required
        </AppText>
        <Controller
          control={control}
          name="registration_plate"
          render={({ field, fieldState }) => (
            <Input
              label="Registration plate"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!linkedVehicle}
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={() => {
                field.onBlur();
                void checkExisting();
              }}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="chassis_number"
          render={({ field }) => (
            <Input
              label="Chassis number"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!linkedVehicle}
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={() => {
                field.onBlur();
                void checkExisting();
              }}
            />
          )}
        />
        <Controller
          control={control}
          name="vin"
          render={({ field }) => (
            <Input
              label="VIN"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!linkedVehicle}
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={() => {
                field.onBlur();
                void checkExisting();
              }}
            />
          )}
        />

        <AppText variant="micro" color="tertiary" style={{ marginTop: 8 }}>
          Vehicle
        </AppText>
        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="make"
              render={({ field, fieldState }) => (
                <Input
                  label="Make"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="model"
              render={({ field, fieldState }) => (
                <Input
                  label="Model"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>
        </View>
        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="year"
              render={({ field, fieldState }) => (
                <Input
                  label="Year"
                  keyboardType="number-pad"
                  value={String(field.value ?? '')}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="colour"
              render={({ field }) => (
                <Input label="Colour" value={field.value ?? ''} onChangeText={field.onChange} />
              )}
            />
          </View>
        </View>
        <Controller
          control={control}
          name="engine_size"
          render={({ field }) => (
            <Input label="Engine size (e.g. 1.8L)" value={field.value ?? ''} onChangeText={field.onChange} />
          )}
        />
        <Controller
          control={control}
          name="transmission"
          render={({ field }) => (
            <ChipSelector
              label="Transmission"
              options={['Automatic', 'Manual', 'CVT', 'DCT']}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="fuel_type"
          render={({ field }) => (
            <ChipSelector
              label="Fuel type"
              options={['Petrol', 'Diesel', 'Hybrid', 'Electric', 'LPG']}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="drive_type"
          render={({ field }) => (
            <ChipSelector
              label="Drive type"
              options={['FWD', 'RWD', 'AWD', '4WD']}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        <AppText variant="micro" color="tertiary" style={{ marginTop: 8 }}>
          This visit
        </AppText>
        <Controller
          control={control}
          name="odometer_km"
          render={({ field, fieldState }) => (
            <Input
              label="Odometer"
              keyboardType="number-pad"
              suffix="KM"
              value={String(field.value ?? '')}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="seller"
          render={({ field }) => (
            <Input label="Seller (optional)" value={field.value ?? ''} onChangeText={field.onChange} />
          )}
        />
        <Controller
          control={control}
          name="purchase_price"
          render={({ field }) => (
            <Input
              label="Purchase price (optional)"
              keyboardType="decimal-pad"
              value={String(field.value ?? '')}
              onChangeText={field.onChange}
            />
          )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16, marginTop: 12 },
  twoCol: { flexDirection: 'row', gap: 12 },
  linked: { marginTop: 12, gap: 8 },
  linkedRow: { gap: 8 },
  dupeActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
});
