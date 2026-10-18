import type { Rng } from './rng';

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Integer in [min, max] inclusive. */
export function int(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng.next() * (max - min + 1));
}

export function chance(rng: Rng, p: number): boolean {
  return rng.next() < p;
}

export function uniform(rng: Rng, min: number, max: number): number {
  return min + rng.next() * (max - min);
}

export function pick<T>(rng: Rng, items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(rng.next() * items.length)];
}

/**
 * Picks one item by weight. Items with weight <= 0 never win. Returns undefined when the
 * total weight is zero. Always consumes exactly one draw when items exist.
 */
export function weightedPick<T>(
  rng: Rng,
  items: readonly T[],
  weight: (item: T) => number,
): T | undefined {
  let total = 0;
  for (const it of items) {
    const w = weight(it);
    if (w > 0) total += w;
  }
  if (total <= 0) return undefined;
  let r = rng.next() * total;
  let last: T | undefined;
  for (const it of items) {
    const w = weight(it);
    if (w <= 0) continue;
    last = it;
    r -= w;
    if (r < 0) return it;
  }
  return last;
}

/** Picks an index from a probability vector (need not sum exactly to 1). */
export function pickIndex(rng: Rng, probs: readonly number[]): number {
  const i = weightedPick(
    rng,
    probs.map((_, i) => i),
    (i) => probs[i] ?? 0,
  );
  return i ?? 0;
}

/**
 * Approximately normal(mean, sd), clamped to [min, max]. Uses the Irwin–Hall sum of 12
 * uniforms so it only needs + and -, which are bit-exact on every JS engine.
 */
export function normal(
  rng: Rng,
  mean: number,
  sd: number,
  min = -Infinity,
  max = Infinity,
): number {
  let s = 0;
  for (let i = 0; i < 12; i++) s += rng.next();
  return clamp(mean + (s - 6) * sd, min, max);
}

/** Fisher–Yates on a copy. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}
