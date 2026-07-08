import { supabase } from './supabase';
import type { ItemResult } from './types';

export type AutosaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'retrying';

export type Patch =
  | { kind: 'result'; itemId: number; result: ItemResult; note?: string }
  | { kind: 'inspection'; fields: Record<string, unknown> };

type StatusListener = (status: AutosaveStatus) => void;

const DEBOUNCE_MS = 800;
const BACKOFF_MS = [1000, 3000, 9000];

/**
 * Debounced, batching, retrying draft autosave.
 * One engine instance per open wizard (keyed by inspection id).
 */
export class AutosaveEngine {
  private queue = new Map<string, Patch>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  private flushing = false;
  private listeners = new Set<StatusListener>();
  private _status: AutosaveStatus = 'idle';

  constructor(private inspectionId: string) {}

  get status() {
    return this._status;
  }

  subscribe(fn: StatusListener): () => void {
    this.listeners.add(fn);
    fn(this._status);
    return () => this.listeners.delete(fn);
  }

  private setStatus(s: AutosaveStatus) {
    this._status = s;
    this.listeners.forEach((fn) => fn(s));
  }

  private key(p: Patch): string {
    return p.kind === 'result' ? `result:${p.itemId}` : 'inspection';
  }

  enqueue(patch: Patch) {
    if (patch.kind === 'inspection') {
      // merge scalar fields instead of overwriting older ones
      const existing = this.queue.get('inspection');
      if (existing && existing.kind === 'inspection') {
        patch = { kind: 'inspection', fields: { ...existing.fields, ...patch.fields } };
      }
    }
    this.queue.set(this.key(patch), patch);
    this.setStatus('dirty');
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => void this.flush(), DEBOUNCE_MS);
  }

  /** Force-flush (step change, app background, save & exit). */
  async flush(): Promise<boolean> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.flushing) return true; // a flush is running; queued items get picked up after
    if (this.queue.size === 0) {
      if (this._status !== 'idle') this.setStatus('saved');
      return true;
    }

    const batch = [...this.queue.values()];
    this.queue.clear();
    this.flushing = true;
    this.setStatus('saving');

    try {
      const results = batch.filter((p): p is Extract<Patch, { kind: 'result' }> => p.kind === 'result');
      if (results.length > 0) {
        const { error } = await supabase.from('inspection_results').upsert(
          results.map((r) => ({
            inspection_id: this.inspectionId,
            item_id: r.itemId,
            result: r.result,
            note: r.note ?? null,
          })),
          { onConflict: 'inspection_id,item_id' },
        );
        if (error) throw error;
      }
      const scalar = batch.find((p): p is Extract<Patch, { kind: 'inspection' }> => p.kind === 'inspection');
      if (scalar) {
        const { error } = await supabase
          .from('inspections')
          .update(scalar.fields)
          .eq('id', this.inspectionId)
          .eq('status', 'draft');
        if (error) throw error;
      }
      this.attempt = 0;
      this.flushing = false;
      if (this.queue.size > 0) return this.flush(); // items arrived mid-flight
      this.setStatus('saved');
      return true;
    } catch {
      // requeue failed patches without clobbering anything newer
      for (const p of batch) {
        if (!this.queue.has(this.key(p))) this.queue.set(this.key(p), p);
        else if (p.kind === 'inspection') {
          const newer = this.queue.get('inspection');
          if (newer && newer.kind === 'inspection') {
            this.queue.set('inspection', {
              kind: 'inspection',
              fields: { ...p.fields, ...newer.fields },
            });
          }
        }
      }
      this.flushing = false;
      this.setStatus('retrying');
      const delay = BACKOFF_MS[Math.min(this.attempt, BACKOFF_MS.length - 1)];
      this.attempt += 1;
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => void this.flush(), delay);
      return false;
    }
  }

  destroy() {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.listeners.clear();
  }
}

// Engine registry: survives navigation between wizard steps.
const engines = new Map<string, AutosaveEngine>();

export function getAutosaveEngine(inspectionId: string): AutosaveEngine {
  let engine = engines.get(inspectionId);
  if (!engine) {
    engine = new AutosaveEngine(inspectionId);
    engines.set(inspectionId, engine);
  }
  return engine;
}

export function releaseAutosaveEngine(inspectionId: string) {
  const engine = engines.get(inspectionId);
  if (engine) {
    void engine.flush();
    engine.destroy();
    engines.delete(inspectionId);
  }
}
