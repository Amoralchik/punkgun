/** Active profile slot from the URL (`?slot=2`), clamped to 1–3. */
export function profileSlot(search: string): number {
  const raw = new URLSearchParams(search).get('slot');
  if (!raw) return 1;
  const value = Number(raw);
  if (!Number.isFinite(value)) return 1;
  return Math.min(3, Math.max(1, Math.floor(value)));
}
