import type { Content } from './content';
import type { BattleResult, Side, TurnLog } from './types';
import vi from './vi.json';

type Key = keyof typeof vi;
const t = (key: Key, p: Record<string, string | number> = {}) =>
  vi[key].replace(/\{(\w+)\}/g, (_, k: string) => String(p[k] ?? `{${k}}`));

export interface NarratedTurn {
  round: number;
  actor: Side;
  text: string;
  /** For styling: a big moment (tuyệt kỹ, bảo mệnh) or a status line. */
  tone: 'normal' | 'big' | 'status';
  hp: [number, number];
}

/**
 * Turns a battle log into Vietnamese lines for the chronicle and the replay screen
 * (Phụ lục B.12). Pure: same log ⇒ same text.
 */
export function narrateBattle(
  content: Content,
  r: BattleResult,
  names: { a: string; b: string },
  treasures: { a?: string; b?: string } = {},
): { turns: NarratedTurn[]; ending: string } {
  const nameOf = (s: Side) => names[s];
  const other = (s: Side): Side => (s === 'a' ? 'b' : 'a');
  const skill = (id?: string) => content.skills.find((k) => k.id === id)?.name ?? id ?? '';
  const status = (id?: string) => (id ? (content.battle.statuses[id]?.name ?? id) : '');
  const artifact = (id?: string) => content.artifacts.find((a) => a.id === id)?.name ?? 'pháp bảo';

  const line = (x: TurnLog): { text: string; tone: NarratedTurn['tone'] } => {
    const actor = nameOf(x.actor);
    const target = nameOf(other(x.actor));
    const dmg = x.damage ?? 0;
    let text: string;
    let tone: NarratedTurn['tone'] = 'normal';
    switch (x.action) {
      case 'attack':
        text = t('battle.attack', { actor, target, dmg });
        break;
      case 'skill': {
        const k = content.skills.find((s) => s.id === x.skillId);
        if (k?.effect === 'shield')
          text = t('battle.shield', { actor, skill: k.name, value: x.shield ?? 0 });
        else if (k?.effect === 'heal')
          text = t('battle.heal', { actor, skill: k.name, value: x.heal ?? 0 });
        else if (k?.effect === 'buff')
          text = t('battle.buff', { actor, skill: k.name, status: status(x.buff) });
        else {
          text = t(x.ultimate ? 'battle.ultimate' : 'battle.skill', {
            actor,
            target,
            skill: skill(x.skillId),
            dmg,
          });
          if (x.ultimate) tone = 'big';
        }
        break;
      }
      case 'defend':
        text = t('battle.defend', { actor });
        break;
      case 'treasure':
        // A treasure with no attack of its own (a talisman, a lock) is only the channel for
        // the owner's strike: it must not read as the artifact itself dealing the damage.
        text = t(
          content.artifacts.find((a) => a.id === treasures[x.actor])?.atk
            ? 'battle.treasure'
            : 'battle.treasure_channel',
          { actor, target, dmg, artifact: artifact(treasures[x.actor]) },
        );
        break;
      case 'skip':
        text = t('battle.skip', { actor, status: status(x.statusId) });
        tone = 'status';
        break;
      case 'status_tick':
        text = t('battle.tick', { actor, status: status(x.statusId), dmg });
        tone = 'status';
        break;
      case 'blood_burn':
        text = t('battle.burn', { actor, dmg });
        tone = 'status';
        break;
      case 'extra_hit':
        text = t('battle.extra', { actor, target, dmg });
        break;
    }
    // Damage is at least 1 before the hộ thuẫn, so 0 means the shield took all of it.
    if (x.damage === 0) {
      text = text
        .replace(`${target} mất 0 khí huyết`, t('battle.blocked', { target }))
        .replace('mất 0 khí huyết', t('battle.self_blocked'));
    }
    const tags: string[] = [];
    if (x.crit) tags.push(t('battle.crit'));
    if ((x.mult ?? 1) > 1) tags.push(t('battle.counter'));
    if ((x.mult ?? 1) < 1) tags.push(t('battle.countered'));
    if (tags.length) text += ` (${tags.join(', ')})`;
    const tail: string[] = [];
    for (const s of x.inflicted ?? [])
      tail.push(t('battle.inflicted', { target, status: status(s) }));
    if (x.lifesteal) tail.push(t('battle.lifesteal', { value: x.lifesteal }));
    if (x.reflected) tail.push(t('battle.reflect', { actor, value: x.reflected }));
    if (x.lastStand) {
      tail.push(t('battle.last_stand', { name: nameOf(x.lastStand) }));
      tone = 'big';
    }
    return { text: `${[text, ...tail].join('; ')}.`, tone };
  };

  const turns = r.log.map((x) => ({ round: x.round, actor: x.actor, hp: x.hp, ...line(x) }));
  // A timeout is decided on the share of khí huyết left, not the raw number shown.
  const ending =
    r.winner === null
      ? t(r.end === 'ko' ? 'battle.double_ko' : 'battle.draw', { rounds: r.rounds })
      : t(r.end === 'ko' ? 'battle.win_ko' : 'battle.win_timeout', {
          winner: nameOf(r.winner),
          rounds: r.rounds,
        });
  return { turns, ending };
}
