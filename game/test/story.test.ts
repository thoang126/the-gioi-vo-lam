import { describe, expect, it } from 'vitest';
import { LHVK, type StoryEvent } from '../src/content/lhvk';
import { advance, createWorld, Sim } from '../src/index';

const HANDLED_CONDITIONS = new Set([
  'world', 'origin', 'gender', 'age', 'realm', 'realm_min', 'realm_max', 'cultivator', 'spirit_root', 'spirit_root_min',
  'spirit_root_max', 'has_flag', 'has_flag_not', 'any_flag', 'trait', 'trait_not', 'physique', 'stat_min', 'stat_max', 'env',
  'env_not', 'has_technique', 'technique_grade_max', 'linh_thach_min', 'has_item', 'has_item_not', 'seen', 'seen_not',
  'seen_ago', 'npc', 'npc_not', 'who_cultivator', 'npc_mortal', 'npc_cultivator', 'npc_bond_min', 'path', 'path_not', 'path_years',
]);
const HANDLED_EFFECTS = new Set([
  'text', 'stat', 'add_flag', 'remove_flag', 'set', 'tu_vi', 'tu_vi_stage', 'tu_vi_years', 'linh_thach', 'item', 'consume_item',
  'technique', 'technique_from', 'artifact', 'skill', 'skill_from', 'world', 'spirit_root', 'lifespan', 'injury', 'heal',
  'cripple', 'death', 'npc', 'npc_bond', 'npc_offset', 'npc_end', 'npc_convert', 'npc_cultivate', 'who_bond', 'who_end',
  'who_mark', 'who_unmark', 'who_realm', 'path', 'path_end',
]);

function nodes(e: StoryEvent) {
  return [e, ...(e.choices ?? [])];
}

describe('imported Luân Hồi Vạn Kiếp content', () => {
  it('only uses condition and effect keys the interpreter understands', () => {
    const unknown: string[] = [];
    for (const e of LHVK.events) {
      for (const n of nodes(e)) {
        for (const k of Object.keys(n.conditions ?? {})) if (!HANDLED_CONDITIONS.has(k)) unknown.push(`${e.id}: condition ${k}`);
        for (const o of [n.effects, n.success, n.fail]) for (const k of Object.keys(o ?? {})) if (!HANDLED_EFFECTS.has(k)) unknown.push(`${e.id}: effect ${k}`);
      }
    }
    expect(unknown).toEqual([]);
  });

  it('refers only to techniques, items, artifacts, skills and paths that exist', () => {
    const missing: string[] = [];
    for (const e of LHVK.events) {
      for (const n of nodes(e)) {
        for (const o of [n.effects, n.success, n.fail]) {
          if (!o) continue;
          if (o.technique && !LHVK.techniques[o.technique]) missing.push(`${e.id}: technique ${o.technique}`);
          if (o.artifact && !LHVK.artifacts[o.artifact]) missing.push(`${e.id}: artifact ${o.artifact}`);
          if (o.skill && !LHVK.skills[o.skill]) missing.push(`${e.id}: skill ${o.skill}`);
          if (o.path && !LHVK.paths.some((p) => p.id === o.path)) missing.push(`${e.id}: path ${o.path}`);
          for (const i of [o.item ?? []].flat()) if (!LHVK.items[i]) missing.push(`${e.id}: item ${i}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('story events in the living world', () => {
  const worlds = [21, 22, 23].map((seed) => {
    const s = createWorld(seed, { autoplay: true, warmupYears: 20 });
    advance(s, 500 * 12);
    return s;
  });

  it('fires a wide range of events across lives', () => {
    const texts = new Set<string>();
    let storyLines = 0;
    for (const s of worlds) {
      for (const e of s.events) if (e.kind === 'story') { storyLines += 1; texts.add(e.text.slice(0, 40)); }
    }
    expect(storyLines).toBeGreaterThan(100);
    expect(texts.size).toBeGreaterThan(60);
  });

  it('binds story NPCs to real people of the world', () => {
    let bound = 0;
    for (const s of worlds) {
      const sim = new Sim(s);
      for (const e of s.events) {
        if (e.kind !== 'story') continue;
        for (const id of e.avatarIds) if (s.avatars[id] && s.avatars[id]!.soulLife === null) bound += 1;
      }
      for (const a of Object.values(s.avatars)) for (const id of Object.keys(a.relations)) expect(sim.get(Number(id)) ?? s.graves.length).toBeTruthy();
    }
    expect(bound).toBeGreaterThan(10);
  });

  it('walks life paths chosen at turning points', () => {
    const paths = new Set(worlds.flatMap((s) => s.soul.lives.flatMap((l) => l.paths)));
    expect(paths.size).toBeGreaterThan(3);
  });
});
