import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { randomUUID } from 'expo-crypto';
import { supabase } from './supabase';

export const MAX_PHOTOS = 12;

/** Resize to ≤1600px @ 0.8 JPEG, upload, insert the DB row. */
export async function uploadInspectionPhoto(
  inspectionId: string,
  asset: ImagePicker.ImagePickerAsset,
  sortOrder: number,
): Promise<void> {
  const context = ImageManipulator.ImageManipulator.manipulate(asset.uri);
  const needsResize = Math.max(asset.width ?? 0, asset.height ?? 0) > 1600;
  const rendered = await (needsResize
    ? context.resize(
        (asset.width ?? 0) >= (asset.height ?? 0) ? { width: 1600 } : { height: 1600 },
      )
    : context
  ).renderAsync();
  const result = await rendered.saveAsync({
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64) throw new Error('Could not encode photo');

  const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
  const path = `inspections/${inspectionId}/${randomUUID()}.jpg`;

  const { error: upErr } = await supabase.storage
    .from('inspection-photos')
    .upload(path, bytes.buffer as ArrayBuffer, { contentType: 'image/jpeg' });
  if (upErr) throw upErr;

  const { error } = await supabase
    .from('inspection_photos')
    .insert({ inspection_id: inspectionId, storage_path: path, sort_order: sortOrder });
  if (error) {
    // don't leave an orphan object if the row insert failed
    await supabase.storage.from('inspection-photos').remove([path]);
    throw error;
  }
}

export async function signedPhotoUrl(path: string, bucket = 'inspection-photos'): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
