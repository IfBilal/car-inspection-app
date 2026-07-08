/**
 * Canonical form for vehicle identifiers (plate / chassis / VIN):
 * uppercase, no spaces or dashes. Applied on save AND on search so
 * lookups never miss ("abc 123" === "ABC-123" === "ABC123").
 */
export function normalizeIdentifier(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]+/g, '').trim();
}

/** A 17-char alphanumeric (no I/O/Q per standard) is treated as a VIN. */
export function looksLikeVin(raw: string): boolean {
  const n = normalizeIdentifier(raw);
  return n.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/.test(n);
}
