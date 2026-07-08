import { create } from 'zustand';
import type { InspectionFull } from '@/lib/queries';
import type { ItemResult, Recommendation } from '@/lib/types';

export type WizardResults = Record<number, { result: ItemResult; note?: string }>;

type WizardState = {
  inspectionId: string | null;
  clientId: string | null;
  vehicleId: string | null;
  /** locked when the inspection was started from an existing vehicle */
  vehicleLocked: boolean;
  /** identifier typed in search before "Register this vehicle" */
  prefillIdentifier: string | null;
  results: WizardResults;
  summary: {
    rating: number;
    recommendation: Recommendation | null;
    notes: string;
    signaturePngB64: string | null;
  };

  setPrefillIdentifier: (v: string | null) => void;
  hydrate: (full: InspectionFull) => void;
  setResult: (itemId: number, result: ItemResult) => void;
  setNote: (itemId: number, note: string) => void;
  setSummary: (patch: Partial<WizardState['summary']>) => void;
  reset: () => void;
};

const emptySummary = { rating: 0, recommendation: null, notes: '', signaturePngB64: null };

export const useWizardStore = create<WizardState>((set, get) => ({
  inspectionId: null,
  clientId: null,
  vehicleId: null,
  vehicleLocked: false,
  prefillIdentifier: null,
  results: {},
  summary: { ...emptySummary },

  setPrefillIdentifier: (v) => set({ prefillIdentifier: v }),

  hydrate: (full) => {
    const results: WizardResults = {};
    for (const r of full.results) {
      results[r.item_id] = { result: r.result, note: r.note ?? undefined };
    }
    set({
      inspectionId: full.id,
      clientId: full.client?.id ?? full.client_id,
      vehicleId: full.vehicle?.id ?? full.vehicle_id,
      results,
      summary: {
        rating: full.overall_rating ?? 0,
        recommendation: full.recommendation,
        notes: full.inspector_notes ?? '',
        signaturePngB64: null,
      },
    });
  },

  setResult: (itemId, result) =>
    set({ results: { ...get().results, [itemId]: { ...get().results[itemId], result } } }),

  setNote: (itemId, note) => {
    const existing = get().results[itemId];
    if (!existing) return;
    set({ results: { ...get().results, [itemId]: { ...existing, note } } });
  },

  setSummary: (patch) => set({ summary: { ...get().summary, ...patch } }),

  reset: () =>
    set({
      inspectionId: null,
      clientId: null,
      vehicleId: null,
      vehicleLocked: false,
      prefillIdentifier: null,
      results: {},
      summary: { ...emptySummary },
    }),
}));
