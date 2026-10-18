// Imports the story content of Luân Hồi Vạn Kiếp into src/content/lhvk.json.
// Usage: npm run import:lhvk [-- /path/to/luan-hoi-van-kiep]   (default: ../../luan-hoi-van-kiep)
// The JSON is committed, so the game builds without the LHVK repo next to it.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parse } from 'yaml';

const root = resolve(process.argv[2] ?? process.env.LHVK_DIR ?? '../../luan-hoi-van-kiep');
const data = join(root, 'packages/content/data');
const read = (p: string) => parse(readFileSync(join(data, p), 'utf8'));

function yamlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? yamlFiles(p) : f.endsWith('.yaml') && f !== 'config.yaml' ? [p] : [];
  });
}

// Hạ giới only: Tiên giới (world `immortal`, realms from Tán Tiên up) is not in this game yet.
const IMMORTAL_REALMS = new Set(['tan_tien', 'dia_tien', 'thien_tien', 'chan_tien', 'huyen_tien', 'kim_tien', 'dai_la', 'chuan_thanh', 'thanh_nhan']);
const realmIdOf = (ref: string) => ref.replace(/_\d+$/, '');

interface RawEvent {
  id: string;
  conditions?: { world?: string[]; realm?: string[]; realm_min?: string };
  [k: string]: unknown;
}

function keep(e: RawEvent): boolean {
  const c = e.conditions ?? {};
  if (c.world && c.world.every((w) => w === 'immortal')) return false;
  if (c.realm && c.realm.every((r) => IMMORTAL_REALMS.has(r))) return false;
  if (c.realm_min && IMMORTAL_REALMS.has(realmIdOf(c.realm_min))) return false;
  return true;
}

const events: (RawEvent & { file: string })[] = [];
let dropped = 0;
for (const f of yamlFiles(join(data, 'events')).sort()) {
  const list = parse(readFileSync(f, 'utf8')) as RawEvent[] | null;
  for (const e of list ?? []) {
    if (keep(e)) events.push({ ...e, file: relative(data, f) });
    else dropped += 1;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const byId = (list: any[], pick: (x: any) => unknown) => Object.fromEntries(list.map((x) => [x.id, pick(x)]));
const narration = read('narration/narration.yaml');
const out = {
  source: 'luan-hoi-van-kiep/packages/content/data',
  eventConfig: read('events/config.yaml'),
  events,
  paths: read('paths/paths.yaml').filter((p: { slot: string; id: string }) => !['heaven_court', 'free_immortal', 'blessed_hermit'].includes(p.id)),
  techniques: byId(read('cultivation/techniques.yaml'), (t: { name: string }) => t.name),
  skills: byId(read('gear/skills.yaml'), (k: { name: string; element: string | null; grade: string }) => ({ name: k.name, element: k.element, grade: k.grade })),
  artifacts: byId(read('gear/artifacts.yaml'), (a: { name: string; atk?: number; def?: number; slot: string }) => ({ name: a.name, atk: a.atk ?? 0, def: a.def ?? 0, slot: a.slot })),
  items: byId(read('gear/items.yaml'), (i: { name: string; kind: string; breakthroughFor?: string; breakthroughBonus?: number }) => ({ name: i.name, kind: i.kind, breakthroughFor: i.breakthroughFor ?? null, breakthroughBonus: i.breakthroughBonus ?? 0 })),
  autochoice: read('autochoice/autochoice.yaml'),
  narration: {
    openers: narration.openers,
    beastPrefixes: narration.beasts.prefixes,
    beastSpecies: narration.beasts.species,
    beastLands: narration.beastLands,
  },
  birthMods: {
    origins: byId(read('birth/origins.yaml'), (o: { modifiers?: unknown }) => o.modifiers ?? {}),
    roots: byId(read('birth/spirit-roots.yaml'), (o: { modifiers?: unknown }) => o.modifiers ?? {}),
    physiques: byId(read('birth/physiques.yaml'), (o: { modifiers?: unknown }) => o.modifiers ?? {}),
  },
  deathCauses: byId(read('mortality/mortality.yaml').causes, (c: { name: string; told?: unknown }) => ({ name: c.name, told: c.told ?? null })),
};

writeFileSync('src/content/lhvk.json', JSON.stringify(out, null, 1) + '\n');
console.log(`Imported ${events.length} events (${dropped} Tiên giới events skipped), ${out.paths.length} paths from ${root}`);
