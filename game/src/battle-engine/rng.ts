/**
 * Seeded PRNG: xoshiro128** seeded via splitmix32. The full state is four uint32s so it
 * can be stored inside LifeState and resumed exactly.
 */
export type RngState = [number, number, number, number];

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform uint32. */
  nextU32(): number;
  /** Snapshot of the internal state (copy). */
  state(): RngState;
}

const rotl = (x: number, k: number) => ((x << k) | (x >>> (32 - k))) >>> 0;

/** FNV-1a 32-bit, used to turn string seeds into numbers. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function splitmix32(seed: number): () => number {
  let x = seed >>> 0;
  return () => {
    x = (x + 0x9e3779b9) >>> 0;
    let z = x;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
}

export function rngFromState(initial: RngState): Rng {
  const s: RngState = [initial[0] >>> 0, initial[1] >>> 0, initial[2] >>> 0, initial[3] >>> 0];
  const nextU32 = () => {
    const result = Math.imul(rotl(Math.imul(s[1], 5) >>> 0, 7), 9) >>> 0;
    const t = (s[1] << 9) >>> 0;
    s[2] = (s[2] ^ s[0]) >>> 0;
    s[3] = (s[3] ^ s[1]) >>> 0;
    s[1] = (s[1] ^ s[2]) >>> 0;
    s[0] = (s[0] ^ s[3]) >>> 0;
    s[2] = (s[2] ^ t) >>> 0;
    s[3] = rotl(s[3], 11);
    return result;
  };
  return {
    nextU32,
    next: () => nextU32() / 4294967296,
    state: () => [s[0], s[1], s[2], s[3]],
  };
}

/** Same seed ⇒ same sequence, on every platform. */
export function createRng(seed: number | string): Rng {
  const n = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
  const sm = splitmix32(n);
  const st: RngState = [sm(), sm(), sm(), sm()];
  if ((st[0] | st[1] | st[2] | st[3]) === 0) st[0] = 1;
  return rngFromState(st);
}
