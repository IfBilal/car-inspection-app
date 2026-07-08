import { RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { ClipboardList, PlusCircle, Search } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { ScalePressable } from '@/components/ui/Pressable';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/theme/ThemeProvider';
import { useMyDrafts, useProfile, useRecentInspections, type InspectionListRow } from '@/lib/queries';
import { useCreateDraft, useDiscardDraft } from '@/lib/mutations';
import { formatDate, greeting, RECOMMENDATION_LABEL, RECOMMENDATION_TONE, timeAgo } from '@/lib/format';
import { vehicleTitle } from '@/components/vehicle/VehicleCard';
import { PlateBadge } from '@/components/vehicle/PlateBadge';
import { useToast } from '@/components/ui/Toast';

export default function HomeScreen() {
  const { colors, spacing } = useTheme();
  const profile = useProfile();
  const drafts = useMyDrafts();
  const recent = useRecentInspections();
  const createDraft = useCreateDraft();
  const discardDraft = useDiscardDraft();
  const toast = useToast();

  const firstName = profile.data?.full_name?.split(' ')[0] ?? '';
  const companyLine = profile.data?.company_name || profile.data?.full_name || ' ';

  const startInspection = () => {
    createDraft.mutate(undefined, {
      onSuccess: (id) => router.push(`/(app)/inspection/${id}/client`),
      onError: () => toast.show('error', 'Couldn’t start the inspection — try again'),
    });
  };

  const refreshing = drafts.isRefetching || recent.isRefetching;
  const onRefresh = () => {
    drafts.refetch();
    recent.refetch();
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(320)} style={styles.header}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" color="secondary">
            {greeting()} {firstName}
          </AppText>
          <AppText variant="title1" numberOfLines={1}>
            {companyLine}
          </AppText>
        </View>
        <ScalePressable
          onPress={() => router.push('/(app)/profile')}
          style={[styles.avatar, { backgroundColor: colors.primarySoft }]}
        >
          <AppText variant="bodyStrong" style={{ color: colors.primaryText }}>
            {(firstName[0] ?? '?').toUpperCase()}
          </AppText>
        </ScalePressable>
      </Animated.View>

      {/* Action cards */}
      <Animated.View entering={FadeInDown.duration(320).delay(60)} style={styles.actions}>
        <ScalePressable onPress={startInspection} style={[styles.actionWrap, styles.actionGlow]}>
          <LinearGradient
            colors={[colors.primary, colors.primaryPressed]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionCard}
          >
            <PlusCircle size={26} color="#FFFFFF" strokeWidth={1.75} />
            <AppText variant="bodyStrong" style={{ color: '#FFFFFF' }}>
              New{'\n'}Inspection
            </AppText>
          </LinearGradient>
        </ScalePressable>
        <ScalePressable
          onPress={() => router.push('/(app)/search')}
          style={[
            styles.actionWrap,
            styles.actionCard,
            { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
          ]}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.primarySoft }]}>
            <Search size={22} color={colors.primary} strokeWidth={1.75} />
          </View>
          <AppText variant="bodyStrong">Find{'\n'}Vehicle</AppText>
        </ScalePressable>
      </Animated.View>

      {/* Drafts */}
      {drafts.data && drafts.data.length > 0 ? (
        <Animated.View entering={FadeInUp.duration(320).delay(120)}>
          <AppText variant="micro" color="tertiary" style={styles.sectionHeader}>
            Continue inspection
          </AppText>
          <View style={{ gap: spacing.md }}>
            {drafts.data.map((d) => (
              <DraftCard
                key={d.id}
                draft={d}
                onDiscard={() =>
                  discardDraft.mutate(d.id, {
                    onError: () => toast.show('error', 'Couldn’t discard the draft'),
                  })
                }
              />
            ))}
          </View>
        </Animated.View>
      ) : null}

      {/* Recent */}
      <Animated.View entering={FadeInUp.duration(320).delay(180)}>
        <AppText variant="micro" color="tertiary" style={styles.sectionHeader}>
          Recent inspections
        </AppText>
      {recent.isPending ? (
        <Card>
          <View style={{ gap: 12 }}>
            <Skeleton height={18} width="70%" />
            <Skeleton height={14} width="50%" />
            <Skeleton height={18} width="65%" />
            <Skeleton height={14} width="45%" />
          </View>
        </Card>
      ) : recent.data && recent.data.length > 0 ? (
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          {recent.data.map((row) => (
            <ListRow
              key={row.id}
              title={row.vehicle ? vehicleTitle(row.vehicle) : 'Vehicle'}
              subtitle={`${row.client?.full_name ?? ''} · ${formatDate(row.completed_at)}`}
              right={
                row.recommendation ? (
                  <Chip
                    label={RECOMMENDATION_LABEL[row.recommendation]}
                    tone={RECOMMENDATION_TONE[row.recommendation]}
                  />
                ) : undefined
              }
              onPress={() => router.push(`/(app)/inspections/${row.id}`)}
            />
          ))}
        </Card>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No inspections yet"
          message="Start your first inspection and it'll show up here."
          actionLabel="New Inspection"
          onAction={startInspection}
        />
      )}
      </Animated.View>
    </Screen>
  );
}

function DraftCard({ draft, onDiscard }: { draft: InspectionListRow; onDiscard: () => void }) {
  const toast = useToast();
  return (
    <Card
      onPress={() => router.push(`/(app)/inspection/${draft.id}/client`)}
      onLongPress={() =>
        toast.show('info', 'Discard this draft?', { actionLabel: 'Discard', onAction: onDiscard })
      }
    >
      <View style={styles.draftRow}>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {draft.vehicle ? vehicleTitle(draft.vehicle) : 'New inspection'}
          </AppText>
          <AppText variant="caption" color="secondary" numberOfLines={1}>
            {draft.client?.full_name ? `${draft.client.full_name} · ` : ''}
            Updated {timeAgo(draft.updated_at)}
          </AppText>
        </View>
        {draft.vehicle?.registration_plate ? (
          <PlateBadge plate={draft.vehicle.registration_plate} />
        ) : (
          <Chip label="Draft" tone="repair" />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, marginBottom: 20 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 12 },
  actionWrap: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  actionGlow: {
    overflow: 'visible',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  actionCard: {
    minHeight: 120,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
    gap: 10,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: { marginTop: 28, marginBottom: 10 },
  draftRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
