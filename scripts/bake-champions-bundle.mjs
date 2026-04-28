#!/usr/bin/env node
/**
 * @file `bake-champions-bundle.mjs`
 *
 * Reads `SETDEX_CHAMPIONS` from the pinned `damage-calc` source, expands the upstream short-key
 * `sps` (`hp`/`at`/`df`/`sa`/`sd`/`sp`) onto Showdown's full stat keys, and emits a deterministic
 * JSON bundle compatible with the existing `pokemonBundledPreset` RTK Query endpoint.
 *
 * Also patches `src/assets/bundles/buns.json` so the bundle bootstrap registers the Champions
 * bundle alongside the other `presets`-namespace bundles on extension install/upgrade.
 *
 * @since 1.4.0
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const ChampionsBundleId = 'champions-ou-curated';
const ChampionsBundleName = 'Champions OU (curated)';
const ChampionsBundleFormat = 'championsou';
const ChampionsBundleGen = 9;
const ChampionsBundleNtt = 'presets';
const ChampionsBundleAuthor = 'smogon/damage-calc';

// keep in sync with src/utils/presets/championsPresetConverter.ts (ChampionsSpsKeyMap)
const SpsKeyMap = {
  hp: 'hp',
  at: 'atk',
  df: 'def',
  sa: 'spa',
  sd: 'spd',
  sp: 'spe',
};

const StatKeys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

// Vendored from smogon/damage-calc → src/js/data/sets/champions.js. Re-fetch & overwrite when
// upgrading the pinned `@smogon/calc` SHA in package.json.
const setdexPath = resolve(repoRoot, 'scripts/data/champions-setdex.js');
const fallbackSetdexPath = process.env.CHAMPIONS_SETDEX_PATH;
const bundleOutPath = resolve(repoRoot, `src/assets/bundles/${ChampionsBundleId}.json`);
const bunsPath = resolve(repoRoot, 'src/assets/bundles/buns.json');

const loadSetdex = () => {
  let source = null;

  for (const candidate of [setdexPath, fallbackSetdexPath].filter(Boolean)) {
    try {
      source = readFileSync(candidate, 'utf8');
      break;
    } catch {
      // try the next candidate
    }
  }

  if (!source) {
    throw new Error(
      `Couldn't find SETDEX_CHAMPIONS. Tried:\n  ${setdexPath}\n  ${fallbackSetdexPath || '(CHAMPIONS_SETDEX_PATH unset)'}\n`
        + 'Set CHAMPIONS_SETDEX_PATH to a local copy of damage-calc/src/js/data/sets/champions.js if needed.',
    );
  }

  const eq = source.indexOf('=');

  if (eq < 0) {
    throw new Error('Malformed SETDEX_CHAMPIONS source — no `=` separator found');
  }

  const trimmed = source.slice(eq + 1).trim().replace(/;\s*$/, '');

  return JSON.parse(trimmed);
};

const expandSps = (sps) => {
  const evs = StatKeys.reduce((acc, key) => {
    acc[key] = 0;

    return acc;
  }, {});

  if (!sps || typeof sps !== 'object') {
    return evs;
  }

  for (const [shortKey, value] of Object.entries(sps)) {
    const fullKey = SpsKeyMap[shortKey];

    if (!fullKey || typeof value !== 'number' || Number.isNaN(value)) {
      continue;
    }

    evs[fullKey] = value;
  }

  return evs;
};

const sortKeys = (obj) => Object.keys(obj).sort().reduce((acc, key) => {
  acc[key] = obj[key];

  return acc;
}, {});

const buildBundlePayload = (setdex) => {
  // sort species & set names so the emitted JSON is deterministic across runs
  const formes = Object.keys(setdex).sort();
  const payload = {};

  for (const speciesForme of formes) {
    const setMap = setdex[speciesForme];

    if (!setMap || typeof setMap !== 'object') {
      continue;
    }

    const sortedSetNames = Object.keys(setMap).sort();
    const out = {};

    for (const setName of sortedSetNames) {
      const entry = setMap[setName] || {};

      const evs = expandSps(entry.sps);
      const ivs = StatKeys.reduce((acc, key) => {
        acc[key] = 0;

        return acc;
      }, {});

      const set = {
        level: 50,
        evs,
        ivs,
      };

      if (entry.nature) {
        set.nature = entry.nature;
      }

      if (entry.ability) {
        set.ability = entry.ability;
      }

      if (entry.item) {
        set.item = entry.item;
      }

      if (Array.isArray(entry.moves) && entry.moves.length) {
        set.moves = [...entry.moves];
      }

      const teraTypes = entry.teraTypes ?? entry.teratypes;

      if (teraTypes) {
        set.teraTypes = Array.isArray(teraTypes) ? [...teraTypes] : teraTypes;
      }

      out[setName] = set;
    }

    payload[speciesForme] = out;
  }

  return payload;
};

const checksum = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

const main = () => {
  const setdex = loadSetdex();
  const payload = buildBundlePayload(setdex);

  const bundle = {
    ok: true,
    status: [200, 'OK'],
    ntt: ChampionsBundleNtt,
    payload,
  };

  writeFileSync(bundleOutPath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');

  // patch buns.json so the bootstrap registers the bundle
  const buns = JSON.parse(readFileSync(bunsPath, 'utf8'));
  const presets = buns?.payload?.presets || {};
  const existing = presets[ChampionsBundleId];

  const meta = {
    id: ChampionsBundleId,
    ntt: ChampionsBundleNtt,
    name: ChampionsBundleName,
    label: ChampionsBundleName,
    author: ChampionsBundleAuthor,
    ext: null,
    gen: ChampionsBundleGen,
    format: ChampionsBundleFormat,
    desc: 'Curated Champions OU sets baked from SETDEX_CHAMPIONS in smogon/damage-calc.',
    created: existing?.created || new Date().toISOString(),
    updated: new Date().toISOString(),
    disabled: false,
  };

  presets[ChampionsBundleId] = meta;
  buns.payload.presets = sortKeys(presets);

  writeFileSync(bunsPath, `${JSON.stringify(buns, null, 2)}\n`, 'utf8');

  const formes = Object.keys(payload).length;
  const presetCount = Object.values(payload).reduce((sum, m) => sum + Object.keys(m).length, 0);

  console.log(`Baked ${presetCount} Champions presets across ${formes} species.`);
  console.log(`  → ${bundleOutPath}`);
  console.log(`  → ${bunsPath}`);
  console.log(`  payload sha256: ${checksum(payload)}`);
};

main();
