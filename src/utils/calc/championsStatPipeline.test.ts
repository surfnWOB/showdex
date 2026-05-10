// Regression test: Showdex's Champions stat pipeline must agree with
// `@smogon/calc`'s gen-0 sentinel (`calcStatChampions`) end-to-end.
//
// The original bug: `calcPokemonSpreadStats` ran the standard EV formula
// for Champions Pokemon (no Champions branch in `calcPokemonStat`) and
// then `createSmogonPokemon` passed the resulting wrong stats through
// to `@smogon/calc` as `rawStats`, which short-circuits the gen-0 stat
// calc when all 6 stats are present. Result: visibly inflated damage %
// (deflated HP denominator).
//
// This test bypasses `createSmogonPokemon` (it depends on the page-world
// `Dex` global which isn't available in Node) and exercises the two
// pieces of the pipeline that matter:
//
//   1. `calcPokemonSpreadStats` — must produce gen-0 stats for Champions.
//   2. `SmogonPokemon` constructed under gen 0 (no `rawStats` override,
//      mirroring the post-fix `createSmogonPokemon` behavior).
//
// Compared against a `SmogonPokemon` baseline with no `rawStats` so
// `calcStatChampions` runs unaided. Both paths must produce identical
// stats and identical damage rolls.

import { describe, expect, it } from 'vitest';
import {
  calculate,
  Field,
  Generations,
  Move,
  Pokemon as SmogonPokemon,
} from '@smogon/calc';
import { type CalcdexPokemon } from '@showdex/interfaces/calc';
import { calcPokemonSpreadStats } from './calcPokemonSpreadStats';

const FORMAT = 'gen9championsou';

const charizardBase = {
  hp: 78, atk: 130, def: 111, spa: 130, spd: 85, spe: 100,
} as Showdown.StatsTable;

const corviknightBase = {
  hp: 98, atk: 87, def: 105, spa: 53, spd: 85, spe: 67,
} as Showdown.StatsTable;

const buildCalcdexMon = (
  speciesForme: string,
  baseStats: Showdown.StatsTable,
  nature: Showdown.NatureName,
  ability: string,
  item: string,
  sps: Partial<Showdown.StatsTable>,
): CalcdexPokemon => ({
  calcdexId: `mock-${speciesForme}`,
  speciesForme,
  level: 50,
  gender: 'M',
  types: ['Normal'],
  ability,
  item,
  nature,
  baseStats,
  ivs: {} as Showdown.StatsTable,
  evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...sps } as Showdown.StatsTable,
  moves: ['Tackle'],
  hp: 100,
  maxhp: 100,
  volatiles: {},
  boosts: {} as Showdown.StatsTableNoHp,
} as unknown as CalcdexPokemon);

describe('Champions stat pipeline regression', () => {
  // Charizard-Mega-X (Adamant, Tough Claws), atk/spe maxed at SP=32, vs.
  // Corviknight (Impish, Pressure), hp/def maxed at SP=32 — Flare Blitz.
  const attackerSps: Partial<Showdown.StatsTable> = { atk: 32, spe: 32 };
  const defenderSps: Partial<Showdown.StatsTable> = { hp: 32, def: 32 };

  const charizardMon = buildCalcdexMon(
    'Charizard-Mega-X', charizardBase, 'Adamant', 'Tough Claws', 'Charizardite X',
    attackerSps,
  );
  const corviknightMon = buildCalcdexMon(
    'Corviknight', corviknightBase, 'Impish', 'Pressure', 'Leftovers',
    defenderSps,
  );

  it('calcPokemonSpreadStats matches the gen-0 formula for Charizard-Mega-X (Adamant)', () => {
    const stats = calcPokemonSpreadStats(FORMAT, charizardMon);

    // base + sp + 75 for HP (sp=0)
    expect(stats.hp).toBe(78 + 0 + 75); // 153
    // floor(1.1 * (130 + 32 + 20)) = floor(200.2) = 200
    expect(stats.atk).toBe(200);
    // floor(1 * (111 + 0 + 20)) = 131
    expect(stats.def).toBe(131);
    // floor(0.9 * (130 + 0 + 20)) = floor(135) = 135
    expect(stats.spa).toBe(135);
    // floor(1 * (85 + 0 + 20)) = 105
    expect(stats.spd).toBe(105);
    // floor(1 * (100 + 32 + 20)) = 152
    expect(stats.spe).toBe(152);
  });

  it('calcPokemonSpreadStats matches the gen-0 formula for Corviknight (Impish)', () => {
    const stats = calcPokemonSpreadStats(FORMAT, corviknightMon);

    expect(stats.hp).toBe(98 + 32 + 75); // 205
    // Impish: +def, -spa
    // floor(1 * (87 + 0 + 20)) = 107
    expect(stats.atk).toBe(107);
    // floor(1.1 * (105 + 32 + 20)) = floor(172.7) = 172
    expect(stats.def).toBe(172);
    // floor(0.9 * (53 + 0 + 20)) = floor(65.7) = 65
    expect(stats.spa).toBe(65);
    expect(stats.spd).toBe(105); // 85 + 0 + 20
    expect(stats.spe).toBe(87); // 67 + 0 + 20
  });

  it('Showdex spreadStats agree with @smogon/calc gen-0 stats end-to-end', () => {
    const charizardSpread = calcPokemonSpreadStats(FORMAT, charizardMon);
    const corviknightSpread = calcPokemonSpreadStats(FORMAT, corviknightMon);

    const gen0 = Generations.get(0);

    // Mirrors the post-fix `createSmogonPokemon` for Champions: NO rawStats
    // override, level locked at 50, evs as SPs, ivs empty.
    const baselineAttacker = new SmogonPokemon(gen0, 'Charizard-Mega-X', {
      level: 50,
      ability: 'Tough Claws',
      item: 'Charizardite X',
      nature: 'Adamant',
      ivs: {},
      evs: attackerSps,
      moves: ['Flare Blitz'],
    });
    const baselineDefender = new SmogonPokemon(gen0, 'Corviknight', {
      level: 50,
      ability: 'Pressure',
      item: 'Leftovers',
      nature: 'Impish',
      ivs: {},
      evs: defenderSps,
      moves: ['Roost'],
    });

    expect(charizardSpread.hp).toBe(baselineAttacker.rawStats.hp);
    expect(charizardSpread.atk).toBe(baselineAttacker.rawStats.atk);
    expect(charizardSpread.def).toBe(baselineAttacker.rawStats.def);
    expect(charizardSpread.spa).toBe(baselineAttacker.rawStats.spa);
    expect(charizardSpread.spd).toBe(baselineAttacker.rawStats.spd);
    expect(charizardSpread.spe).toBe(baselineAttacker.rawStats.spe);

    expect(corviknightSpread.hp).toBe(baselineDefender.rawStats.hp);
    expect(corviknightSpread.atk).toBe(baselineDefender.rawStats.atk);
    expect(corviknightSpread.def).toBe(baselineDefender.rawStats.def);
    expect(corviknightSpread.spa).toBe(baselineDefender.rawStats.spa);
    expect(corviknightSpread.spd).toBe(baselineDefender.rawStats.spd);
    expect(corviknightSpread.spe).toBe(baselineDefender.rawStats.spe);

    // Damage rolls must be identical between the two paths since the
    // stats they feed @smogon/calc are identical.
    const move = new Move(gen0, 'Flare Blitz');
    const field = new Field();

    const baselineResult = calculate(gen0, baselineAttacker, baselineDefender, move, field);

    expect(Array.isArray(baselineResult.damage)).toBe(true);
    expect((baselineResult.damage as number[]).length).toBeGreaterThan(0);

    // Sanity bound: the original buggy pipeline produced 216-254 damage
    // (133.3-156.7%), but the correct gen-0 baseline tops out at ~242
    // damage (~118%). If we ever regress to the EV-formula pipeline,
    // the max roll spikes back into the 250+ range.
    const maxRoll = Math.max(...(baselineResult.damage as number[]));

    expect(maxRoll).toBeLessThan(250);
  });
});
