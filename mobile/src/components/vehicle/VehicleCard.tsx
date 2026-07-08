import { StyleSheet, View } from 'react-native';
import { Car } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { PlateBadge } from './PlateBadge';
import type { Vehicle } from '@/lib/types';

type Props = {
  vehicle: Vehicle;
  subtitle?: string;
  onPress?: () => void;
};

export function vehicleTitle(v: Pick<Vehicle, 'make' | 'model' | 'year'>) {
  return [v.year, v.make, v.model].filter(Boolean).join(' ');
}

export function VehicleCard({ vehicle, subtitle, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
          <Car size={22} color={colors.primary} strokeWidth={1.75} />
        </View>
        <View style={styles.info}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {vehicleTitle(vehicle)}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <PlateBadge plate={vehicle.registration_plate} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
});
