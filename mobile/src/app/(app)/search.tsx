import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, SearchX } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScalePressable } from '@/components/ui/Pressable';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { VehicleCard } from '@/components/vehicle/VehicleCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useVehicleSearch } from '@/lib/queries';
import { useCreateDraft } from '@/lib/mutations';
import { useDebounced } from '@/lib/useDebounced';
import { useToast } from '@/components/ui/Toast';
import { useWizardStore } from '@/store/wizard';

export default function SearchScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const createDraft = useCreateDraft();
  const setPrefillIdentifier = useWizardStore((s) => s.setPrefillIdentifier);
  const [term, setTerm] = useState('');
  const debounced = useDebounced(term, 300);
  const search = useVehicleSearch(debounced);
  const active = debounced.trim().length >= 2;

  const registerVehicle = () => {
    setPrefillIdentifier(debounced.trim().toUpperCase());
    createDraft.mutate(undefined, {
      onSuccess: (id) => router.push(`/(app)/inspection/${id}/client`),
      onError: () => toast.show('error', 'Couldn’t start the inspection — try again'),
    });
  };

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <ScalePressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </ScalePressable>
        <AppText variant="title1">Find Vehicle</AppText>
      </View>

      <Input
        placeholder="Plate, chassis or VIN"
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        value={term}
        onChangeText={setTerm}
        helper="Search matches plate, chassis number and VIN"
      />

      <View style={styles.results}>
        {!active ? null : search.isPending ? (
          <Card>
            <View style={{ gap: 12 }}>
              <Skeleton height={18} width="70%" />
              <Skeleton height={14} width="45%" />
            </View>
          </Card>
        ) : search.data && search.data.length > 0 ? (
          <View style={{ gap: 12 }}>
            {search.data.map((v) => {
              const count = v.inspections?.[0]?.count ?? 0;
              return (
                <VehicleCard
                  key={v.id}
                  vehicle={v}
                  subtitle={`${count} inspection${count === 1 ? '' : 's'}`}
                  onPress={() => router.push(`/(app)/vehicle/${v.id}`)}
                />
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon={SearchX}
            title={`No vehicle found for “${debounced.trim()}”`}
            message="Check the spelling, or register it as a new vehicle."
            actionLabel="Register this vehicle"
            onAction={registerVehicle}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 20 },
  back: { width: 40, height: 40, justifyContent: 'center' },
  results: { flex: 1, marginTop: 20 },
});
