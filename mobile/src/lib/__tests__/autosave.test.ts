import { AutosaveEngine } from '../autosave';

// Mock supabase client used by the engine
const mockUpsert = jest.fn();
const mockUpdateEq = jest.fn();

jest.mock('../supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'inspection_results') {
        return { upsert: (...args: unknown[]) => mockUpsert(...args) };
      }
      return {
        update: (fields: unknown) => ({
          eq: () => ({ eq: () => mockUpdateEq(fields) }),
        }),
      };
    },
  },
}));

describe('AutosaveEngine', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUpsert.mockReset().mockResolvedValue({ error: null });
    mockUpdateEq.mockReset().mockResolvedValue({ error: null });
  });
  afterEach(() => jest.useRealTimers());

  it('debounces: rapid enqueues cause a single flush', async () => {
    const engine = new AutosaveEngine('insp-1');
    engine.enqueue({ kind: 'result', itemId: 1, result: 'pass' });
    engine.enqueue({ kind: 'result', itemId: 2, result: 'fail' });
    engine.enqueue({ kind: 'result', itemId: 3, result: 'na' });
    expect(mockUpsert).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(800);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const rows = mockUpsert.mock.calls[0][0] as unknown[];
    expect(rows).toHaveLength(3);
  });

  it('dedupes: newer result for the same item wins', async () => {
    const engine = new AutosaveEngine('insp-1');
    engine.enqueue({ kind: 'result', itemId: 7, result: 'fail' });
    engine.enqueue({ kind: 'result', itemId: 7, result: 'pass' });
    await jest.advanceTimersByTimeAsync(800);
    const rows = mockUpsert.mock.calls[0][0] as { item_id: number; result: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ item_id: 7, result: 'pass' });
  });

  it('merges inspection scalar patches', async () => {
    const engine = new AutosaveEngine('insp-1');
    engine.enqueue({ kind: 'inspection', fields: { current_step: 2 } });
    engine.enqueue({ kind: 'inspection', fields: { odometer_km: 120000 } });
    await jest.advanceTimersByTimeAsync(800);
    expect(mockUpdateEq).toHaveBeenCalledWith({ current_step: 2, odometer_km: 120000 });
  });

  it('retries with backoff on failure and eventually saves', async () => {
    mockUpsert.mockResolvedValueOnce({ error: new Error('network') });
    const statuses: string[] = [];
    const engine = new AutosaveEngine('insp-1');
    engine.subscribe((s) => statuses.push(s));

    engine.enqueue({ kind: 'result', itemId: 1, result: 'pass' });
    await jest.advanceTimersByTimeAsync(800); // first flush fails
    expect(statuses).toContain('retrying');

    await jest.advanceTimersByTimeAsync(1000); // backoff retry succeeds
    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(statuses[statuses.length - 1]).toBe('saved');
  });

  it('force flush() writes immediately without waiting for debounce', async () => {
    const engine = new AutosaveEngine('insp-1');
    engine.enqueue({ kind: 'result', itemId: 1, result: 'repair' });
    const ok = await engine.flush();
    expect(ok).toBe(true);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });
});
