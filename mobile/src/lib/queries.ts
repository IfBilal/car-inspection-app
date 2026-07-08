import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { normalizeIdentifier } from './normalize';
import type {
  ChecklistItem,
  ChecklistSection,
  Client,
  Inspection,
  InspectionPhoto,
  InspectionResult,
  Vehicle,
} from './types';

// Rows joined for list/detail rendering
export type InspectionListRow = Inspection & {
  client: Pick<Client, 'id' | 'full_name' | 'email'> | null;
  vehicle: Pick<Vehicle, 'id' | 'make' | 'model' | 'year' | 'registration_plate'> | null;
  inspector: { id: string; full_name: string } | null;
};

const INSPECTION_LIST_SELECT =
  '*, client:clients(id, full_name, email), vehicle:vehicles(id, make, model, year, registration_plate), inspector:profiles(id, full_name)';

export function useVehicleSearch(term: string) {
  const normalized = normalizeIdentifier(term);
  return useQuery({
    queryKey: ['vehicleSearch', normalized],
    enabled: normalized.length >= 2,
    queryFn: async (): Promise<(Vehicle & { inspections: { count: number }[] })[]> => {
      const like = `%${normalized}%`;
      const { data, error } = await supabase
        .from('vehicles')
        .select('*, inspections(count)')
        .or(`registration_plate.ilike.${like},chassis_number.ilike.${like},vin.ilike.${like}`)
        .neq('make', '') // hide draft stubs that haven't been filled in yet
        .not('chassis_number', 'ilike', 'DRAFT-%')
        .limit(15);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: ['vehicle', id],
    enabled: !!id,
    queryFn: async (): Promise<Vehicle> => {
      const { data, error } = await supabase.from('vehicles').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useVehicleHistory(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['vehicleHistory', vehicleId],
    enabled: !!vehicleId,
    queryFn: async (): Promise<InspectionListRow[]> => {
      const { data, error } = await supabase
        .from('inspections')
        .select(INSPECTION_LIST_SELECT)
        .eq('vehicle_id', vehicleId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InspectionListRow[];
    },
  });
}

export function useRecentInspections() {
  return useQuery({
    queryKey: ['recentInspections'],
    queryFn: async (): Promise<InspectionListRow[]> => {
      const { data, error } = await supabase
        .from('inspections')
        .select(INSPECTION_LIST_SELECT)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as InspectionListRow[];
    },
  });
}

export function useMyDrafts() {
  return useQuery({
    queryKey: ['drafts'],
    queryFn: async (): Promise<InspectionListRow[]> => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return [];
      const { data, error } = await supabase
        .from('inspections')
        .select(INSPECTION_LIST_SELECT)
        .eq('status', 'draft')
        .eq('inspector_id', uid)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InspectionListRow[];
    },
  });
}

export function useChecklist() {
  return useQuery({
    queryKey: ['checklist'],
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async (): Promise<(ChecklistSection & { items: ChecklistItem[] })[]> => {
      const [sections, items] = await Promise.all([
        supabase.from('checklist_sections').select('*').order('sort_order'),
        supabase.from('checklist_items').select('*').order('sort_order'),
      ]);
      if (sections.error) throw sections.error;
      if (items.error) throw items.error;
      return (sections.data ?? []).map((s) => ({
        ...s,
        items: (items.data ?? []).filter((i) => i.section_id === s.id),
      }));
    },
  });
}

export function useClientSearch(term: string) {
  const trimmed = term.trim();
  return useQuery({
    queryKey: ['clientSearch', trimmed.toLowerCase()],
    enabled: trimmed.length >= 2,
    queryFn: async (): Promise<Client[]> => {
      const like = `%${trimmed}%`;
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .or(`full_name.ilike.${like},email.ilike.${like}`)
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type InspectionFull = Inspection & {
  client: Client | null;
  vehicle: Vehicle | null;
  inspector: { id: string; full_name: string; company_name: string } | null;
  results: InspectionResult[];
  photos: InspectionPhoto[];
};

export function useInspectionFull(id: string | undefined) {
  return useQuery({
    queryKey: ['inspection', id],
    enabled: !!id,
    queryFn: async (): Promise<InspectionFull> => {
      const [insp, results, photos] = await Promise.all([
        supabase
          .from('inspections')
          .select(
            '*, client:clients(*), vehicle:vehicles(*), inspector:profiles(id, full_name, company_name)',
          )
          .eq('id', id!)
          .single(),
        supabase.from('inspection_results').select('*').eq('inspection_id', id!),
        supabase.from('inspection_photos').select('*').eq('inspection_id', id!).order('sort_order'),
      ]);
      if (insp.error) throw insp.error;
      if (results.error) throw results.error;
      if (photos.error) throw photos.error;
      return {
        ...(insp.data as any),
        results: results.data ?? [],
        photos: photos.data ?? [],
      } as InspectionFull;
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
      if (error) throw error;
      return data;
    },
  });
}
