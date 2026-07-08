import { looksLikeVin, normalizeIdentifier } from '../normalize';

describe('normalizeIdentifier', () => {
  it('uppercases', () => {
    expect(normalizeIdentifier('abc123')).toBe('ABC123');
  });
  it('strips spaces and dashes', () => {
    expect(normalizeIdentifier(' abc 123 ')).toBe('ABC123');
    expect(normalizeIdentifier('ABC-123')).toBe('ABC123');
    expect(normalizeIdentifier('a b-c 1-2 3')).toBe('ABC123');
  });
  it('canonical forms match regardless of input style', () => {
    const variants = ['abc 123', 'ABC-123', 'Abc123', ' abc-1 23 '];
    const canonical = variants.map(normalizeIdentifier);
    expect(new Set(canonical).size).toBe(1);
  });
});

describe('looksLikeVin', () => {
  it('accepts a valid 17-char VIN', () => {
    expect(looksLikeVin('JTDBR32E720123456')).toBe(true);
    expect(looksLikeVin('jtdbr32e720123456')).toBe(true);
    expect(looksLikeVin('JTD BR32E 7201 23456')).toBe(true);
  });
  it('rejects wrong lengths', () => {
    expect(looksLikeVin('ABC123')).toBe(false);
    expect(looksLikeVin('JTDBR32E72012345')).toBe(false); // 16
    expect(looksLikeVin('JTDBR32E7201234567')).toBe(false); // 18
  });
  it('rejects I, O, Q per VIN standard', () => {
    expect(looksLikeVin('JTDBR32E72012345I')).toBe(false);
    expect(looksLikeVin('JTDBR32E72012345O')).toBe(false);
    expect(looksLikeVin('JTDBR32E72012345Q')).toBe(false);
  });
});
