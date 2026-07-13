import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Camera, ImagePlus, Plus, Trash2 } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ScalePressable } from '@/components/ui/Pressable';
import { useToast } from '@/components/ui/Toast';
import { WizardHeader } from '@/components/wizard/WizardHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useInspectionFull } from '@/lib/queries';
import { useQueryClient } from '@tanstack/react-query';
import { useDeletePhoto } from '@/lib/mutations';
import { getAutosaveEngine } from '@/lib/autosave';
import { MAX_PHOTOS, signedPhotoUrl, uploadInspectionPhoto } from '@/lib/photos';

export default function PhotosStep() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, radii } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const full = useInspectionFull(id);
  const deletePhoto = useDeletePhoto(id!);
  const { width } = useWindowDimensions();
  const [uploading, setUploading] = useState(0);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const photos = useMemo(() => full.data?.photos ?? [], [full.data?.photos]);
  const tile = (width - 40 - 16) / 3;

  // Resolve signed URLs for stored photos
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const missing = photos.filter((p) => !urls[p.id]);
      if (missing.length === 0) return;
      const entries = await Promise.all(
        missing.map(async (p) => [p.id, await signedPhotoUrl(p.storage_path)] as const),
      );
      if (!cancelled) setUrls((u) => ({ ...u, ...Object.fromEntries(entries) }));
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [photos, urls]);

  const addPhotos = async (source: 'camera' | 'gallery') => {
    const remaining = MAX_PHOTOS - photos.length - uploading;
    if (remaining <= 0) return;

    let assets: ImagePicker.ImagePickerAsset[] = [];
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        toast.show('error', 'Camera permission is needed to take photos');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ quality: 1 });
      if (!res.canceled) assets = res.assets;
    } else {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 1,
      });
      if (!res.canceled) assets = res.assets;
    }
    if (assets.length === 0) return;

    setUploading((n) => n + assets.length);
    let failed = 0;
    await Promise.all(
      assets.map(async (asset, i) => {
        try {
          await uploadInspectionPhoto(id!, asset, photos.length + i);
        } catch {
          failed += 1;
        } finally {
          setUploading((n) => n - 1);
        }
      }),
    );
    qc.invalidateQueries({ queryKey: ['inspection', id] });
    if (failed > 0) toast.show('error', `${failed} photo${failed > 1 ? 's' : ''} failed to upload — try again`);
  };

  const chooseSource = () => {
    Alert.alert('Add photo', undefined, [
      { text: 'Take photo', onPress: () => void addPhotos('camera') },
      { text: 'Choose from gallery', onPress: () => void addPhotos('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const confirmDelete = (photoId: string, storagePath: string) => {
    Alert.alert('Delete photo?', undefined, [
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deletePhoto.mutate(
            { id: photoId, storage_path: storagePath },
            { onError: () => toast.show('error', 'Couldn’t delete the photo') },
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onContinue = () => {
    getAutosaveEngine(id!).enqueue({ kind: 'inspection', fields: { current_step: 6 } });
    router.push(`/(app)/inspection/${id}/summary`);
  };

  const canAdd = photos.length + uploading < MAX_PHOTOS;

  return (
    <Screen footer={<Button label="Continue" onPress={onContinue} />}>
      <WizardHeader
        inspectionId={id!}
        step="photos"
        title="Photos"
        right={
          <AppText variant="caption" color="secondary">
            {photos.length + uploading}/{MAX_PHOTOS}
          </AppText>
        }
      />
      <AppText variant="caption" color="secondary" style={styles.hint}>
        Add up to {MAX_PHOTOS} photos of the vehicle
      </AppText>

      <View style={styles.grid}>
        {photos.map((p) => (
          <ScalePressable
            key={p.id}
            onLongPress={() => confirmDelete(p.id, p.storage_path)}
            style={[styles.tile, { width: tile, height: tile, borderRadius: radii.photo, backgroundColor: colors.divider }]}
          >
            {urls[p.id] ? (
              <Image source={{ uri: urls[p.id] }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <ActivityIndicator color={colors.textTertiary} />
            )}
            <View style={[styles.deleteBadge, { backgroundColor: colors.surfaceRaised }]}>
              <Trash2 size={12} color={colors.fail} />
            </View>
          </ScalePressable>
        ))}
        {[...Array(uploading)].map((_, i) => (
          <View
            key={`up-${i}`}
            style={[styles.tile, { width: tile, height: tile, borderRadius: radii.photo, backgroundColor: colors.divider }]}
          >
            <ActivityIndicator color={colors.primary} />
          </View>
        ))}
        {canAdd ? (
          <ScalePressable
            onPress={chooseSource}
            style={[
              styles.tile,
              styles.addTile,
              { width: tile, height: tile, borderRadius: radii.photo, borderColor: colors.border },
            ]}
          >
            <Plus size={22} color={colors.primary} />
            <AppText variant="micro" color="tertiary">
              Add
            </AppText>
          </ScalePressable>
        ) : null}
      </View>

      <View style={styles.srcButtons}>
        <Button size="md" variant="secondary" icon={Camera} label="Take photo" fullWidth={false} onPress={() => void addPhotos('camera')} disabled={!canAdd} />
        <Button size="md" variant="secondary" icon={ImagePlus} label="Gallery" fullWidth={false} onPress={() => void addPhotos('gallery')} disabled={!canAdd} />
      </View>

      <AppText variant="caption" color="tertiary" style={styles.note}>
        Long-press a photo to delete it. Photos are optional.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { marginTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  tile: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  addTile: { borderWidth: 1.5, borderStyle: 'dashed', gap: 4 },
  deleteBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  srcButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  note: { marginTop: 16 },
});
