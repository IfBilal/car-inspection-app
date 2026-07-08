import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { normalizeIdentifier } from './normalize';
import type { ClientForm, VehicleForm } from './validation';
import type { ItemResult, Recommendation, Vehicle } from './types';

/** Creates the draft inspection row the moment the wizard opens. */
export function useCreateDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vehicleId?: string): Promise<string> => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error('Not signed in');

      // Placeholder client/vehicle rows are created lazily on step completion;
      // the schema requires both ids, so we create stubs now and fill them in.
      const { data: client, error: cErr } = await supabase
        .from('clients')
        .insert({ full_name: '', email: 'pending@draft.local', created_by: uid })
        .select('id')
        .single();
      if (cErr) throw cErr;

      let vid = vehicleId;
      if (!vid) {
        const { data: vehicle, error: vErr } = await supabase
          .from('vehicles')
          .insert({ make: '', model: '', chassis_number: `DRAFT-${crypto.randomUUID()}`, created_by: uid })
          .select('id')
          .single();
        if (vErr) throw vErr;
        vid = vehicle.id;
      }

      const { data, error } = await supabase
        .from('inspections')
        .insert({ vehicle_id: vid, client_id: client.id, inspector_id: uid })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drafts'] }),
  });
}

export function useDiscardDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inspectionId: string) => {
      const { error } = await supabase
        .from('inspections')
        .delete()
        .eq('id', inspectionId)
        .eq('status', 'draft');
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drafts'] }),
  });
}

/** Update the draft's client row (or relink to an existing client). */
export function useSaveClient(inspectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { clientId: string; form: ClientForm } | { existingClientId: string }) => {
      if ('existingClientId' in input) {
        const { error } = await supabase
          .from('inspections')
          .update({ client_id: input.existingClientId })
          .eq('id', inspectionId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from('clients')
        .update({
          full_name: input.form.full_name,
          email: input.form.email.trim().toLowerCase(),
          phone: input.form.phone || null,
          address: input.form.address || null,
        })
        .eq('id', input.clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspection', inspectionId] });
      qc.invalidateQueries({ queryKey: ['drafts'] });
    },
  });
}

function vehicleRowFromForm(form: VehicleForm) {
  return {
    registration_plate: form.registration_plate ? normalizeIdentifier(form.registration_plate) : null,
    chassis_number: form.chassis_number ? normalizeIdentifier(form.chassis_number) : null,
    vin: form.vin ? normalizeIdentifier(form.vin) : null,
    make: form.make,
    model: form.model,
    year: form.year ? Number(form.year) : null,
    colour: form.colour || null,
    engine_size: form.engine_size || null,
    transmission: form.transmission || null,
    fuel_type: form.fuel_type || null,
    drive_type: form.drive_type || null,
  };
}

/** Find an existing vehicle owning any of the given identifiers. */
export async function findVehicleByIdentifiers(form: {
  registration_plate?: string;
  chassis_number?: string;
  vin?: string;
}): Promise<Vehicle | null> {
  const clauses: string[] = [];
  if (form.registration_plate)
    clauses.push(`registration_plate.eq.${normalizeIdentifier(form.registration_plate)}`);
  if (form.chassis_number) clauses.push(`chassis_number.eq.${normalizeIdentifier(form.chassis_number)}`);
  if (form.vin) clauses.push(`vin.eq.${normalizeIdentifier(form.vin)}`);
  if (clauses.length === 0) return null;
  const { data, error } = await supabase.from('vehicles').select('*').or(clauses.join(',')).limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

export function useSaveVehicle(inspectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input:
        | { vehicleId: string; form: VehicleForm; snapshot: { odometer_km?: string; seller?: string; purchase_price?: string } }
        | { existingVehicleId: string; snapshot: { odometer_km?: string; seller?: string; purchase_price?: string } },
    ) => {
      const snapshotRow = {
        odometer_km: input.snapshot.odometer_km ? Number(input.snapshot.odometer_km) : null,
        seller: input.snapshot.seller || null,
        purchase_price: input.snapshot.purchase_price ? Number(input.snapshot.purchase_price) : null,
      };
      if ('existingVehicleId' in input) {
        const { error } = await supabase
          .from('inspections')
          .update({ vehicle_id: input.existingVehicleId, ...snapshotRow })
          .eq('id', inspectionId);
        if (error) throw error;
        return;
      }
      const { error: vErr } = await supabase
        .from('vehicles')
        .update(vehicleRowFromForm(input.form))
        .eq('id', input.vehicleId);
      if (vErr) throw vErr;
      const { error } = await supabase.from('inspections').update(snapshotRow).eq('id', inspectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspection', inspectionId] });
      qc.invalidateQueries({ queryKey: ['drafts'] });
    },
  });
}

/** Bulk-mark all given items with a result (used by "Mark remaining as Pass"). */
export function useBulkResults(inspectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: { item_id: number; result: ItemResult }[]) => {
      if (rows.length === 0) return;
      const { error } = await supabase
        .from('inspection_results')
        .upsert(
          rows.map((r) => ({ inspection_id: inspectionId, ...r })),
          { onConflict: 'inspection_id,item_id' },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection', inspectionId] }),
  });
}

export function useDeletePhoto(inspectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (photo: { id: string; storage_path: string }) => {
      const { error } = await supabase.from('inspection_photos').delete().eq('id', photo.id);
      if (error) throw error;
      await supabase.storage.from('inspection-photos').remove([photo.storage_path]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection', inspectionId] }),
  });
}

export type SubmitPayload = {
  overall_rating: number;
  recommendation: Recommendation;
  inspector_notes: string;
  signaturePngB64: string;
  /** item ids that are still unanswered — bulk-marked N/A at submit */
  unansweredItemIds: number[];
};

export function useSubmitInspection(inspectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SubmitPayload) => {
      // 1. Signature upload
      const signaturePath = `inspections/${inspectionId}/signature.png`;
      const bytes = Uint8Array.from(atob(payload.signaturePngB64), (c) => c.charCodeAt(0));
      const { error: sigErr } = await supabase.storage
        .from('signatures')
        .upload(signaturePath, bytes.buffer as ArrayBuffer, { contentType: 'image/png', upsert: true });
      if (sigErr) throw sigErr;

      // 2. Unanswered → N/A
      if (payload.unansweredItemIds.length > 0) {
        const { error } = await supabase.from('inspection_results').upsert(
          payload.unansweredItemIds.map((item_id) => ({
            inspection_id: inspectionId,
            item_id,
            result: 'na' as const,
          })),
          { onConflict: 'inspection_id,item_id', ignoreDuplicates: true },
        );
        if (error) throw error;
      }

      // 3. Complete (immutability trigger allows this transition once)
      const { error } = await supabase
        .from('inspections')
        .update({
          overall_rating: payload.overall_rating,
          recommendation: payload.recommendation,
          inspector_notes: payload.inspector_notes || null,
          signature_path: signaturePath,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', inspectionId)
        .eq('status', 'draft');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspection', inspectionId] });
      qc.invalidateQueries({ queryKey: ['drafts'] });
      qc.invalidateQueries({ queryKey: ['recentInspections'] });
      qc.invalidateQueries({ queryKey: ['vehicleHistory'] });
    },
  });
}

/** Invoke the send-report Edge Function (submit + re-send). */
export function useSendReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { inspectionId: string; resend?: boolean; overrideEmail?: string }) => {
      const { data, error } = await supabase.functions.invoke('send-report', {
        body: {
          inspection_id: args.inspectionId,
          resend: args.resend ?? false,
          override_email: args.overrideEmail,
        },
      });
      if (error) throw error;
      if (data && data.ok === false) throw new Error(data.message ?? 'Report failed');
      return data as { ok: true; pdf_path: string };
    },
    onSuccess: (_d, args) => qc.invalidateQueries({ queryKey: ['inspection', args.inspectionId] }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fields: { full_name?: string; company_name?: string; phone?: string | null }) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error('Not signed in');
      const { error } = await supabase.from('profiles').update(fields).eq('id', uid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}
