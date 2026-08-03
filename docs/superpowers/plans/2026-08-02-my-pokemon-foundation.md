# 내 포켓몬 진화 시스템 — Phase 1 슬라이스 1 (데이터 파이프라인 + 저장 스키마 + 스타터 선택 + 홈 통합) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add evolution-chain metadata to the static Pokémon dataset, a localStorage-backed "my Pokémon" record, a starter-selection screen, a minimal "my Pokémon" screen, and Home-screen integration — with no point accrual, no evolution triggering/celebration, and no new quiz mode (all deferred to a later plan).

**Architecture:** The data pipeline (`scripts/fetch-pokemon-data.mjs`) gains three new fields per entry by walking each species' evolution-chain tree once per distinct chain URL (cached). Pure tree-walking logic lives in a new sibling module so it's unit-testable without hitting the network. A new `src/utils/myPokemon.js` mirrors the existing `getGen1OnlyPref`/`setGen1OnlyPref` defensive localStorage pattern. Two new pages (`ChooseStarter`, `MyPokemon`) reuse existing UI patterns from `Dex.jsx` and `PokemonDetail.jsx`. `Home.jsx` and `App.jsx` are updated last to wire everything together.

**Tech Stack:** React 19 + react-router-dom v7 + Vite, Vitest + @testing-library/react (jsdom environment), plain `node:fs`/`fetch` build script (no bundler) for the data pipeline.

## Global Constraints

- Never throw from the data-fetch pipeline on a per-species evolution-chain failure — warn and continue, leave `evolvesTo: []` (from spec and task brief).
- localStorage access must be wrapped defensively (try/catch, safe default) exactly like `getGen1OnlyPref`/`setGen1OnlyPref` in `src/utils/pokemonData.js:100-114` — corrupted/missing data must never throw and must degrade to "no my Pokémon" state.
- Do NOT implement point accrual, evolution triggering/celebration, or the evolution-order quiz mode — explicitly deferred.
- Do NOT implement any Phase 2/Phase 3 spec items (nickname re-editing, share cards, petting, dex stamps, badges, daily quiz, parent summary).
- Bottom tab bar (Home/도감/퀴즈) in `src/components/AppShell.jsx` stays unchanged — it already covers navigation on every page.
- Follow existing code style: inline `style={{}}` objects using CSS custom properties (`var(--space-*)`, `var(--color-*)`, `var(--radius-*)`), Korean UI copy, `AppShell` wrapper with `title`/`backTo` props.

---

## File Structure

**New files:**
- `scripts/evolutionChain.mjs` — pure functions: `idFromUrl`, `findChainNode`, `extractEvolutionInfo`. No top-level side effects, safe to import from tests.
- `scripts/fetch-pokemon-data.test.mjs` — Vitest unit tests for `scripts/evolutionChain.mjs`.
- `src/utils/myPokemon.js` — `getMyPokemon`, `chooseStarter`, `getStarterCandidates`.
- `src/utils/myPokemon.test.js` — Vitest unit tests for the above.
- `src/pages/ChooseStarter.jsx` — starter-selection screen at `/mine/choose`.
- `src/pages/MyPokemon.jsx` — minimal "my Pokémon" screen at `/mine`.

**Modified files:**
- `scripts/fetch-pokemon-data.mjs` — imports `extractEvolutionInfo`, adds a per-chain-URL cache (`Map` of Promises), adds `evolutionStage`/`evolvesFrom`/`evolvesTo` to each `fetchOne(id)` result.
- `src/pages/Home.jsx` — replace the two `NavCard` shortcuts with a my-Pokémon status section; keep intro title/paragraph and footer disclaimer.
- `src/App.jsx` — add `/mine/choose` and `/mine` routes.

**Untouched but load-bearing (read, not modified):** `src/utils/pokemonData.js` (`loadPokemonData`, `TYPE_COLOR`, `TYPE_LABEL_KO`, `getAllTypes`), `src/utils/hangul.js` (`matchesQuery`), `src/components/AppShell.jsx`, `src/components/SearchBar.jsx`, `src/components/TypeBadge.jsx`, `src/components/Icons.jsx` (`SparklesIcon`).

---

### Task 1: Pure evolution-chain tree-walking logic

**Files:**
- Create: `scripts/evolutionChain.mjs`
- Test: `scripts/fetch-pokemon-data.test.mjs`

**Interfaces:**
- Produces: `idFromUrl(url: string|null): number|null`, `findChainNode(root, speciesName, depth=1, parentId=null): {node, depth, parentId}|null`, `extractEvolutionInfo(chainRoot, speciesName): {evolutionStage: number, evolvesFrom: number|null, evolvesTo: Array<{id:number, minLevel:number|null}>}`.
- Consumed by: Task 2 (`scripts/fetch-pokemon-data.mjs`).

- [x] **Step 1: Write the failing test file**

Create `scripts/fetch-pokemon-data.test.mjs`:

```js
import { describe, it, expect } from "vitest";
import { idFromUrl, findChainNode, extractEvolutionInfo } from "./evolutionChain.mjs";

// 이브이 계열을 흉내낸 가짜 체인 트리 (분기 진화, 1단계에서 바로 갈림)
const eeveeChain = {
  species: { name: "eevee", url: "https://pokeapi.co/api/v2/pokemon-species/133/" },
  evolution_details: [],
  evolves_to: [
    {
      species: { name: "vaporeon", url: "https://pokeapi.co/api/v2/pokemon-species/134/" },
      evolution_details: [{ min_level: null }],
      evolves_to: [],
    },
    {
      species: { name: "jolteon", url: "https://pokeapi.co/api/v2/pokemon-species/135/" },
      evolution_details: [{ min_level: null }],
      evolves_to: [],
    },
  ],
};

// 이상해씨 계열을 흉내낸 가짜 체인 트리 (선형 3단 진화)
const bulbasaurChain = {
  species: { name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon-species/1/" },
  evolution_details: [],
  evolves_to: [
    {
      species: { name: "ivysaur", url: "https://pokeapi.co/api/v2/pokemon-species/2/" },
      evolution_details: [{ min_level: 16 }],
      evolves_to: [
        {
          species: { name: "venusaur", url: "https://pokeapi.co/api/v2/pokemon-species/3/" },
          evolution_details: [{ min_level: 32 }],
          evolves_to: [],
        },
      ],
    },
  ],
};

describe("idFromUrl", () => {
  it("URL 마지막 경로 세그먼트를 숫자 id로 추출한다", () => {
    expect(idFromUrl("https://pokeapi.co/api/v2/pokemon-species/2/")).toBe(2);
    expect(idFromUrl("https://pokeapi.co/api/v2/evolution-chain/1/")).toBe(1);
  });

  it("url이 없으면 null을 반환한다", () => {
    expect(idFromUrl(null)).toBe(null);
    expect(idFromUrl(undefined)).toBe(null);
    expect(idFromUrl("")).toBe(null);
  });
});

describe("findChainNode", () => {
  it("루트 노드를 찾으면 depth 1, parentId null을 반환한다", () => {
    const found = findChainNode(bulbasaurChain, "bulbasaur");
    expect(found.depth).toBe(1);
    expect(found.parentId).toBe(null);
  });

  it("중간 단계 노드를 찾으면 depth 2, parentId는 루트의 id다", () => {
    const found = findChainNode(bulbasaurChain, "ivysaur");
    expect(found.depth).toBe(2);
    expect(found.parentId).toBe(1);
  });

  it("마지막 단계 노드를 찾으면 depth 3, parentId는 중간 단계의 id다", () => {
    const found = findChainNode(bulbasaurChain, "venusaur");
    expect(found.depth).toBe(3);
    expect(found.parentId).toBe(2);
  });

  it("체인에 없는 이름이면 null을 반환한다", () => {
    expect(findChainNode(bulbasaurChain, "pikachu")).toBe(null);
  });
});

describe("extractEvolutionInfo", () => {
  it("선형 진화의 1단계는 evolvesFrom null, evolvesTo에 다음 단계 하나", () => {
    const info = extractEvolutionInfo(bulbasaurChain, "bulbasaur");
    expect(info).toEqual({
      evolutionStage: 1,
      evolvesFrom: null,
      evolvesTo: [{ id: 2, minLevel: 16 }],
    });
  });

  it("선형 진화의 중간 단계는 evolvesFrom에 이전 단계 id가 들어간다", () => {
    const info = extractEvolutionInfo(bulbasaurChain, "ivysaur");
    expect(info).toEqual({
      evolutionStage: 2,
      evolvesFrom: 1,
      evolvesTo: [{ id: 3, minLevel: 32 }],
    });
  });

  it("최종 진화는 evolvesTo가 빈 배열이다", () => {
    const info = extractEvolutionInfo(bulbasaurChain, "venusaur");
    expect(info).toEqual({ evolutionStage: 3, evolvesFrom: 2, evolvesTo: [] });
  });

  it("분기 진화(이브이)는 evolvesTo에 여러 원소가 들어간다", () => {
    const info = extractEvolutionInfo(eeveeChain, "eevee");
    expect(info.evolutionStage).toBe(1);
    expect(info.evolvesFrom).toBe(null);
    expect(info.evolvesTo).toEqual([
      { id: 134, minLevel: null },
      { id: 135, minLevel: null },
    ]);
  });

  it("체인에서 종을 찾지 못하면 1단계/진화없음으로 방어적으로 처리한다", () => {
    const info = extractEvolutionInfo(bulbasaurChain, "missingno");
    expect(info).toEqual({ evolutionStage: 1, evolvesFrom: null, evolvesTo: [] });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/fetch-pokemon-data.test.mjs`
Expected: FAIL — `Cannot find module './evolutionChain.mjs'` (or similar resolve error), since the module doesn't exist yet.

- [x] **Step 3: Write the implementation**

Create `scripts/evolutionChain.mjs`:

```js
/**
 * 진화 체인(evolution chain) 트리를 순수하게 다루는 헬퍼 함수 모음.
 * 네트워크 호출(fetch-pokemon-data.mjs)과 분리되어 있어 단위 테스트가 가능하다
 * (fetch-pokemon-data.test.mjs 참고). 이 파일은 import 시 아무 부수효과도 없다.
 *
 * PokeAPI evolution-chain 응답의 `chain` 트리 형태:
 * {
 *   species: { name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon-species/1/" },
 *   evolution_details: [],              // 루트는 항상 비어있음
 *   evolves_to: [
 *     {
 *       species: { name: "ivysaur", url: ".../pokemon-species/2/" },
 *       evolution_details: [{ min_level: 16, ... }],
 *       evolves_to: [ ... ]
 *     }
 *   ]
 * }
 */

// URL 마지막 경로 세그먼트를 숫자 id로 추출.
// 예) "https://pokeapi.co/api/v2/pokemon-species/2/" -> 2
export function idFromUrl(url) {
  if (!url) return null;
  const segments = url.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  const n = Number(last);
  return Number.isFinite(n) ? n : null;
}

// 체인 트리를 재귀적으로 순회해 speciesName과 이름이 일치하는 노드를 찾는다.
// 반환값: { node, depth (루트=1), parentId (없으면 null) } | null
export function findChainNode(root, speciesName, depth = 1, parentId = null) {
  if (!root) return null;
  if (root.species?.name === speciesName) {
    return { node: root, depth, parentId };
  }
  const nextParentId = idFromUrl(root.species?.url);
  for (const child of root.evolves_to || []) {
    const found = findChainNode(child, speciesName, depth + 1, nextParentId);
    if (found) return found;
  }
  return null;
}

// speciesName에 해당하는 evolutionStage/evolvesFrom/evolvesTo를 계산.
// 체인에서 찾지 못하면(방어적 상황) 1단계 + 진화 없음으로 처리한다.
export function extractEvolutionInfo(chainRoot, speciesName) {
  const found = findChainNode(chainRoot, speciesName);
  if (!found) {
    return { evolutionStage: 1, evolvesFrom: null, evolvesTo: [] };
  }
  const { node, depth, parentId } = found;
  const evolvesTo = (node.evolves_to || []).map((child) => ({
    id: idFromUrl(child.species?.url),
    minLevel: child.evolution_details?.[0]?.min_level ?? null,
  }));
  return { evolutionStage: depth, evolvesFrom: parentId, evolvesTo };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/fetch-pokemon-data.test.mjs`
Expected: PASS (13 tests).

- [x] **Step 5: Commit**

```bash
git add scripts/evolutionChain.mjs scripts/fetch-pokemon-data.test.mjs
git commit -m "test: add pure evolution-chain tree-walking helpers with unit tests"
```

---

### Task 2: Wire evolution-chain fetching into the data pipeline

**Files:**
- Modify: `scripts/fetch-pokemon-data.mjs` (full rewrite of the file, shown below)

**Interfaces:**
- Consumes: `extractEvolutionInfo(chainRoot, speciesName)` from `scripts/evolutionChain.mjs` (Task 1).
- Produces: each entry in `public/data/pokemon.json` gains `evolutionStage: number`, `evolvesFrom: number|null`, `evolvesTo: Array<{id:number, minLevel:number|null}>` (in addition to the pre-existing `evolutionChainUrl`). Consumed by Task 3's `getStarterCandidates`.

This task has no automated test (network-dependent, and the sandbox may not have internet access) — verify with a syntax check plus a manual smoke run instructions below.

- [x] **Step 1: Replace the full contents of `scripts/fetch-pokemon-data.mjs`**

```js
/**
 * PokeAPI에서 전체 포켓몬 종(species) 데이터를 미리 받아
 * public/data/pokemon.json 정적 파일로 저장하는 스크립트.
 *
 * 왜 필요한가:
 *  - PokeAPI는 요청 시마다 호출하지 않고 "로컬 캐싱"할 것을 권장하는
 *    fair use 정책을 갖고 있습니다 (https://pokeapi.co/docs/v2#fairuse).
 *  - 인스타그램 릴스 등으로 트래픽이 갑자기 몰려도, 앱이 매번 PokeAPI를
 *    호출하지 않고 이 정적 JSON만 읽도록 하면 안전합니다.
 *
 * 사용법:
 *   node scripts/fetch-pokemon-data.mjs [limit]
 *   예) node scripts/fetch-pokemon-data.mjs 400   → 처음 400마리만(테스트용)
 *   예) node scripts/fetch-pokemon-data.mjs        → 전체(기본 1025마리)
 *
 * 주의: 이 스크립트는 pokeapi.co 로 실제 네트워크 요청을 보냅니다.
 * 사내/샌드박스 환경에서 외부 네트워크가 막혀 있다면 GitHub Actions나
 * 로컬 PC 등 pokeapi.co 접근이 가능한 환경에서 실행하세요.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { extractEvolutionInfo } from "./evolutionChain.mjs";

const POKEAPI = "https://pokeapi.co/api/v2";
const TOTAL_DEFAULT = 1025; // 2026년 기준 대략치 — 필요 시 조정
const LIMIT = Number(process.argv[2]) || TOTAL_DEFAULT;
const CONCURRENCY = 8; // PokeAPI에 과도한 동시 요청을 보내지 않기 위한 제한

// 같은 진화 계열의 모든 species는 동일한 evolution-chain URL을 공유한다
// (예: 이상해씨/이상해풀/이상해꽃 모두 evolution-chain/1/). ~1025개 species에 비해
// 체인 수는 훨씬 적으므로, URL당 한 번만 fetch하도록 캐싱한다.
// 값이 아니라 "Promise"를 캐싱해야, 여러 worker가 같은 URL을 동시에 요청할 때
// 중복 fetch가 발생하지 않는다.
const chainCache = new Map();

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  return res.json();
}

function pickKoName(names, fallback) {
  return names.find((n) => n.language.name === "ko")?.name || fallback;
}

function pickKoGenus(genera, fallback) {
  return genera.find((g) => g.language.name === "ko")?.genus || fallback;
}

function pickKoFlavorText(entries, fallback) {
  const ko = entries.find((e) => e.language.name === "ko");
  return ko ? ko.flavor_text.replace(/\n|\f/g, " ") : fallback;
}

function pickEnFlavorText(entries) {
  const en = entries.find((e) => e.language.name === "en");
  return en ? en.flavor_text.replace(/\n|\f/g, " ") : "No description available.";
}

// evolution-chain URL을 캐시에서 가져오거나, 없으면 fetch 후 캐시에 저장한다.
// 개별 chain fetch가 실패해도 throw하지 않고 null을 반환해 빌드 전체를 막지 않는다.
function fetchChain(url) {
  if (!url) return Promise.resolve(null);
  if (!chainCache.has(url)) {
    chainCache.set(
      url,
      fetchJson(url)
        .then((data) => data.chain)
        .catch((err) => {
          console.warn(`  evolution chain fetch failed for ${url}: ${err.message}`);
          return null;
        })
    );
  }
  return chainCache.get(url);
}

async function fetchOne(id) {
  const [pokemon, species] = await Promise.all([
    fetchJson(`${POKEAPI}/pokemon/${id}`),
    fetchJson(`${POKEAPI}/pokemon-species/${id}`),
  ]);

  const evolutionChainUrl = species.evolution_chain?.url || null;
  const chainRoot = await fetchChain(evolutionChainUrl);
  const evoInfo = chainRoot
    ? extractEvolutionInfo(chainRoot, species.name)
    : { evolutionStage: 1, evolvesFrom: null, evolvesTo: [] };

  return {
    id: pokemon.id,
    nameEn: pokemon.name,
    nameKo: pickKoName(species.names, pokemon.name),
    genusKo: pickKoGenus(species.genera, ""),
    types: pokemon.types.map((t) => t.type.name),
    height: pokemon.height / 10, // m
    weight: pokemon.weight / 10, // kg
    abilities: pokemon.abilities.map((a) => a.ability.name),
    descriptionKo: pickKoFlavorText(species.flavor_text_entries, ""),
    descriptionEn: pickEnFlavorText(species.flavor_text_entries),
    generation: species.generation?.name || "",
    color: species.color?.name || "",
    isLegendary: species.is_legendary,
    isMythical: species.is_mythical,
    sprite: pokemon.sprites?.front_default || null,
    artwork:
      pokemon.sprites?.other?.["official-artwork"]?.front_default ||
      pokemon.sprites?.front_default ||
      null,
    cry: pokemon.cries?.latest || pokemon.cries?.legacy || null,
    evolutionChainUrl,
    evolutionStage: evoInfo.evolutionStage,
    evolvesFrom: evoInfo.evolvesFrom,
    evolvesTo: evoInfo.evolvesTo,
  };
}

async function run() {
  console.log(`Fetching ${LIMIT} Pokémon from PokeAPI (concurrency=${CONCURRENCY})...`);
  const ids = Array.from({ length: LIMIT }, (_, i) => i + 1);
  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < ids.length) {
      const id = ids[cursor++];
      try {
        const data = await fetchOne(id);
        results.push(data);
        if (results.length % 50 === 0) {
          console.log(`  ${results.length}/${LIMIT} done`);
        }
      } catch (err) {
        console.warn(`  skip #${id}: ${err.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  results.sort((a, b) => a.id - b.id);

  const outDir = path.resolve("public/data");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, "pokemon.json"),
    JSON.stringify(results, null, 0)
  );

  console.log(`Done. Wrote ${results.length} entries to public/data/pokemon.json`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [x] **Step 2: Syntax-check the script (no network required)**

Run: `node --check scripts/fetch-pokemon-data.mjs`
Expected: no output, exit code 0 (valid syntax, `import` resolves at parse-check time since it's a relative path that exists).

- [x] **Step 3: Re-run the Task 1 unit tests to confirm nothing broke**

Run: `npx vitest run scripts/fetch-pokemon-data.test.mjs`
Expected: PASS (unaffected — the test only imports `evolutionChain.mjs`, never `fetch-pokemon-data.mjs`, so it never triggers `run()`).

- [x] **Step 4: Manual smoke test (requires network access — run locally, not expected to work in this sandbox)**

Run: `node scripts/fetch-pokemon-data.mjs 20`
Expected: `public/data/pokemon.json` is written with 20 entries; spot check that entry `id: 1` (bulbasaur) has `evolutionStage: 1, evolvesFrom: null, evolvesTo: [{id: 2, minLevel: 16}]` and entry `id: 4` (charmander, if within first 20) has similar linear-chain data. This step is a human checkpoint, not part of CI.

- [x] **Step 5: Commit**

```bash
git add scripts/fetch-pokemon-data.mjs
git commit -m "feat: fetch and cache evolution-chain data per species in the data pipeline"
```

---

### Task 3: `src/utils/myPokemon.js` storage module

**Files:**
- Create: `src/utils/myPokemon.js`
- Test: `src/utils/myPokemon.test.js`

**Interfaces:**
- Consumes: nothing beyond global `localStorage` (jsdom provides a working `localStorage` in tests, same as implicitly relied upon by `getGen1OnlyPref`'s pattern).
- Produces: `getMyPokemon(): Record|null`, `chooseStarter(pokemon: {id:number, nameKo:string}, nickname: string): Record`, `getStarterCandidates(allPokemon: Array): Array`. The `Record` shape: `{starterId, nickname, currentStageId, history, pointsSinceLastEvolution, lifetimePoints, pendingEvolution, collection}`. Consumed by Task 4 (`ChooseStarter.jsx`), Task 5 (`MyPokemon.jsx`), Task 7 (`Home.jsx`).

- [x] **Step 1: Write the failing test file**

Create `src/utils/myPokemon.test.js`:

```js
import { describe, it, expect, beforeEach } from "vitest";
import { getMyPokemon, chooseStarter, getStarterCandidates } from "./myPokemon";

const bulbasaur = {
  id: 1,
  nameKo: "이상해씨",
  evolutionStage: 1,
  evolvesTo: [{ id: 2, minLevel: 16 }],
};

const pikachu = {
  id: 25,
  nameKo: "피카츄",
  evolutionStage: 1,
  evolvesTo: [{ id: 26, minLevel: null }],
};

const mewtwo = {
  id: 150,
  nameKo: "뮤츠",
  evolutionStage: 1,
  evolvesTo: [],
};

const ivysaur = {
  id: 2,
  nameKo: "이상해풀",
  evolutionStage: 2,
  evolvesTo: [{ id: 3, minLevel: 32 }],
};

beforeEach(() => {
  localStorage.clear();
});

describe("getMyPokemon", () => {
  it("저장된 값이 없으면 null을 반환한다", () => {
    expect(getMyPokemon()).toBe(null);
  });

  it("저장된 JSON이 손상되었으면 null을 반환한다", () => {
    localStorage.setItem("pokemonMine.v1", "{ not valid json");
    expect(getMyPokemon()).toBe(null);
  });

  it("저장된 값이 필수 필드가 없는 객체면 null을 반환한다", () => {
    localStorage.setItem("pokemonMine.v1", JSON.stringify({ nickname: "몽몽이" }));
    expect(getMyPokemon()).toBe(null);
  });

  it("chooseStarter로 저장한 값을 그대로 읽어온다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    expect(getMyPokemon()).toEqual({
      starterId: 1,
      nickname: "몽몽이",
      currentStageId: 1,
      history: [1],
      pointsSinceLastEvolution: 0,
      lifetimePoints: 0,
      pendingEvolution: false,
      collection: [],
    });
  });
});

describe("chooseStarter", () => {
  it("닉네임이 공백이면 포켓몬의 nameKo를 기본값으로 사용한다", () => {
    const record = chooseStarter(bulbasaur, "   ");
    expect(record.nickname).toBe("이상해씨");
  });

  it("닉네임 앞뒤 공백은 제거한다", () => {
    const record = chooseStarter(bulbasaur, "  몽몽이  ");
    expect(record.nickname).toBe("몽몽이");
  });
});

describe("getStarterCandidates", () => {
  it("evolutionStage가 1이고 evolvesTo가 있는 포켓몬만 후보로 반환한다", () => {
    const all = [bulbasaur, pikachu, mewtwo, ivysaur];
    const candidates = getStarterCandidates(all);
    expect(candidates.map((p) => p.id)).toEqual([1, 25]);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/myPokemon.test.js`
Expected: FAIL — `Cannot find module './myPokemon'` (module doesn't exist yet).

- [x] **Step 3: Write the implementation**

Create `src/utils/myPokemon.js`:

```js
// "내 포켓몬" 선택/현재 상태를 localStorage에 저장하는 모듈.
// pokemonData.js의 getGen1OnlyPref/setGen1OnlyPref와 동일하게, localStorage 접근
// 실패(시크릿 모드 등)나 저장된 값이 손상된 경우 모두 조용히 안전한 기본값으로 처리한다.

const KEY = "pokemonMine.v1";

// 저장된 "내 포켓몬" 레코드를 반환한다.
// 저장된 값이 없거나, JSON 파싱에 실패하거나, 필수 필드가 없는 손상된 값이면 null.
export function getMyPokemon() {
  let raw;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof parsed.currentStageId !== "number" ||
    typeof parsed.starterId !== "number"
  ) {
    return null;
  }

  return parsed;
}

// 스타터 포켓몬 선택 시 전체 레코드를 초기화해 저장한다.
// nickname이 빈 값(공백만 있어도)이면 포켓몬의 한국어 이름(nameKo)을 기본값으로 사용한다.
export function chooseStarter(pokemon, nickname) {
  const trimmed = (nickname || "").trim();
  const record = {
    starterId: pokemon.id,
    nickname: trimmed || pokemon.nameKo,
    currentStageId: pokemon.id,
    history: [pokemon.id],
    pointsSinceLastEvolution: 0,
    lifetimePoints: 0,
    pendingEvolution: false,
    collection: [],
  };

  try {
    localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // localStorage 접근 불가 환경(시크릿 모드 등)에서는 조용히 무시
  }

  return record;
}

// 스타터로 고를 수 있는 후보: 1단계이면서 진화 가능한(evolvesTo가 있는) 포켓몬.
// 전설/신화 포켓몬은 대부분 진화가 없어 이 조건만으로 자연히 제외된다.
export function getStarterCandidates(allPokemon) {
  return allPokemon.filter(
    (p) => p.evolutionStage === 1 && p.evolvesTo?.length > 0
  );
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/myPokemon.test.js`
Expected: PASS (7 tests).

- [x] **Step 5: Commit**

```bash
git add src/utils/myPokemon.js src/utils/myPokemon.test.js
git commit -m "feat: add localStorage-backed my-Pokemon storage module"
```

---

### Task 4: `/mine/choose` starter-selection screen

**Files:**
- Create: `src/pages/ChooseStarter.jsx`

**Interfaces:**
- Consumes: `loadPokemonData()`, `getAllTypes(list)`, `TYPE_LABEL_KO`, `TYPE_COLOR` from `src/utils/pokemonData.js`; `matchesQuery(name, query)` from `src/utils/hangul.js`; `getStarterCandidates(allPokemon)`, `chooseStarter(pokemon, nickname)` from `src/utils/myPokemon.js` (Task 3); `AppShell`, `SearchBar`, `TypeBadge` components (all pre-existing, signatures confirmed by reading their source).
- Produces: default export `ChooseStarter` React component, mounted at route `/mine/choose` in Task 6.

No automated test for this task — it's a data-fetching page that follows the same untested convention as `Dex.jsx`/`PokemonDetail.jsx` in this codebase (only pure-logic modules have unit tests here). Verify manually per Step 2 below.

- [x] **Step 1: Write the implementation**

Create `src/pages/ChooseStarter.jsx`:

```jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import SearchBar from "../components/SearchBar";
import TypeBadge from "../components/TypeBadge";
import {
  loadPokemonData,
  getAllTypes,
  TYPE_LABEL_KO,
  TYPE_COLOR,
} from "../utils/pokemonData";
import { matchesQuery } from "../utils/hangul";
import { getStarterCandidates, chooseStarter } from "../utils/myPokemon";

export default function ChooseStarter() {
  const navigate = useNavigate();
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState(null);
  const [picked, setPicked] = useState(null);
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    loadPokemonData()
      .then(setAll)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const candidates = useMemo(() => getStarterCandidates(all), [all]);
  const types = useMemo(() => getAllTypes(candidates), [candidates]);

  const filtered = useMemo(() => {
    let list = candidates.filter((p) => matchesQuery(p.nameKo, query));
    if (typeFilter) list = list.filter((p) => p.types.includes(typeFilter));
    return list;
  }, [candidates, query, typeFilter]);

  function handleConfirm() {
    chooseStarter(picked, nickname);
    navigate("/mine");
  }

  if (picked) {
    return (
      <AppShell title="포켓몬 고르기" backTo="/">
        <div style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
          <img
            src={picked.artwork || picked.sprite}
            alt={picked.nameKo}
            style={{ width: 160, height: 160 }}
          />
          <h2 style={{ fontSize: 22, marginTop: 4 }}>{picked.nameKo}</h2>
          <div style={{ marginTop: 4 }}>
            {picked.types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </div>

          <label
            htmlFor="starter-nickname"
            style={{
              display: "block",
              marginTop: "var(--space-5)",
              marginBottom: 6,
              fontSize: 13,
              color: "var(--color-text-muted)",
              textAlign: "left",
            }}
          >
            별명을 지어주세요 (비워두면 "{picked.nameKo}"로 시작해요)
          </label>
          <input
            id="starter-nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={picked.nameKo}
            style={{
              width: "100%",
              minHeight: 44,
              padding: "10px 14px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontSize: 15,
              boxSizing: "border-box",
            }}
          />

          <button
            type="button"
            onClick={handleConfirm}
            className="press"
            style={{
              width: "100%",
              marginTop: "var(--space-4)",
              minHeight: 48,
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "var(--color-primary)",
              color: "var(--color-text-on-primary)",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            이 포켓몬으로 시작하기
          </button>

          <button
            type="button"
            onClick={() => setPicked(null)}
            style={{
              width: "100%",
              marginTop: "var(--space-3)",
              minHeight: 44,
              padding: "10px 16px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-muted)",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            다시 고르기
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="포켓몬 고르기" backTo="/">
      {error && (
        <p style={{ color: "var(--color-danger)", fontSize: 14 }}>
          {error} (README의 "데이터 준비" 단계를 먼저 실행하세요)
        </p>
      )}

      <SearchBar value={query} onChange={setQuery} />

      <div
        className="no-scrollbar"
        style={{
          display: "flex",
          gap: 6,
          margin: "var(--space-3) 0 var(--space-4)",
          overflowX: "auto",
        }}
      >
        <button onClick={() => setTypeFilter(null)} style={pillStyle(!typeFilter)}>
          전체
        </button>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            style={pillStyle(typeFilter === t)}
          >
            {TYPE_LABEL_KO[t] || t}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 12,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 168 }} />
          ))}
        </div>
      ) : (
        <>
          <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
            {filtered.length}마리 중에서 골라보세요
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            {filtered.map((p) => (
              <StarterCard key={p.id} p={p} onPick={setPicked} />
            ))}
          </div>
          {filtered.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--color-text-muted)", marginTop: 40 }}>
              조건에 맞는 포켓몬이 없어요.
            </p>
          )}
        </>
      )}
    </AppShell>
  );
}

function StarterCard({ p, onPick }) {
  const tint = TYPE_COLOR[p.types[0]] || "#999";
  return (
    <button
      type="button"
      onClick={() => onPick(p)}
      className="press"
      style={{
        display: "block",
        width: "100%",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-3)",
        textAlign: "center",
        border: "none",
        background: "var(--color-surface)",
        boxShadow: "var(--shadow-card)",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 84,
          height: 84,
          margin: "0 auto",
          borderRadius: "50%",
          background: `color-mix(in srgb, ${tint} 22%, var(--color-surface-2))`,
        }}
      >
        <img
          src={p.sprite}
          alt={p.nameKo}
          loading="lazy"
          style={{ width: 60, height: 60, imageRendering: "pixelated" }}
        />
      </div>
      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 8 }}>
        #{String(p.id).padStart(4, "0")}
      </div>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{p.nameKo}</div>
      <div style={{ marginTop: 6 }}>
        {p.types.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
      </div>
    </button>
  );
}

function pillStyle(active) {
  return {
    flexShrink: 0,
    padding: "8px 16px",
    minHeight: 36,
    borderRadius: "var(--radius-pill)",
    border: active ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
    background: active ? "var(--color-primary)" : "var(--color-surface)",
    color: active ? "var(--color-text-on-primary)" : "var(--color-text)",
    fontSize: 13,
    fontWeight: 600,
  };
}
```

- [x] **Step 2: Manual verification (after Task 6 wires the route)**

Run: `npm run dev`, navigate to `http://localhost:5173/mine/choose` (assuming default Vite port). Confirm: only stage-1 evolvable Pokémon appear (e.g. 이상해씨 appears, 피죤투/뮤츠-type finals/legendaries do not), search and type-filter pills work, tapping a card shows the nickname-confirm panel, confirming navigates to `/mine` (which won't exist as a real screen until Task 5/6 — expect a blank/404-ish result until then, that's fine at this checkpoint).

- [x] **Step 3: Commit**

```bash
git add src/pages/ChooseStarter.jsx
git commit -m "feat: add starter-selection screen at /mine/choose"
```

---

### Task 5: `/mine` minimal my-Pokémon screen

**Files:**
- Create: `src/pages/MyPokemon.jsx`

**Interfaces:**
- Consumes: `getMyPokemon()` from `src/utils/myPokemon.js` (Task 3); `loadPokemonData()`, `TYPE_COLOR` from `src/utils/pokemonData.js`; `AppShell` component; `useNavigate` from `react-router-dom`.
- Produces: default export `MyPokemon` React component, mounted at route `/mine` in Task 6.

**Judgment call locked in here:** no progress bar, no history strip, no collection gallery (all deferred — point accrual doesn't exist yet in this slice). A single static Korean placeholder line is shown instead of a TODO comment (decided explicitly, see Self-Review section).

- [x] **Step 1: Write the implementation**

Create `src/pages/MyPokemon.jsx`:

```jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { loadPokemonData, TYPE_COLOR } from "../utils/pokemonData";
import { getMyPokemon } from "../utils/myPokemon";

export default function MyPokemon() {
  const navigate = useNavigate();
  const [record, setRecord] = useState(undefined); // undefined = 아직 확인 전, null = 없음
  const [p, setP] = useState(null);

  useEffect(() => {
    const rec = getMyPokemon();
    setRecord(rec);
    if (!rec) {
      navigate("/mine/choose", { replace: true });
      return;
    }
    loadPokemonData().then((all) => {
      setP(all.find((x) => x.id === rec.currentStageId) || null);
    });
  }, [navigate]);

  if (record === undefined || record === null || !p) {
    return (
      <AppShell title="내 포켓몬" backTo="/">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 20, width: "60%", margin: "0 auto 8px" }} />
      </AppShell>
    );
  }

  const tint = TYPE_COLOR[p.types[0]] || "#999";

  return (
    <AppShell title="내 포켓몬" backTo="/">
      <div
        style={{
          textAlign: "center",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6) var(--space-4) var(--space-4)",
          background: `color-mix(in srgb, ${tint} 18%, var(--color-surface))`,
        }}
      >
        <img src={p.artwork} alt={record.nickname} style={{ width: 180, height: 180 }} />
        <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
          #{String(p.id).padStart(4, "0")}
        </div>
        <h1 style={{ fontSize: 26, marginTop: 2 }}>{record.nickname}</h1>
        <div style={{ color: "var(--color-text-muted)", fontSize: 14 }}>{p.nameKo}</div>
      </div>

      <p
        style={{
          marginTop: "var(--space-5)",
          textAlign: "center",
          color: "var(--color-text-muted)",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        퀴즈를 풀면 다음 진화까지 포인트가 쌓여요. (진화 시스템은 곧 추가돼요)
      </p>
    </AppShell>
  );
}
```

- [x] **Step 2: Manual verification (after Task 6 wires the route)**

Run: `npm run dev`. With no `pokemonMine.v1` in localStorage, navigating to `/mine` should redirect to `/mine/choose`. After picking a starter there, navigating to `/mine` should show the artwork, nickname, id, and the static placeholder line.

- [x] **Step 3: Commit**

```bash
git add src/pages/MyPokemon.jsx
git commit -m "feat: add minimal my-Pokemon screen at /mine"
```

---

### Task 6: Wire the new routes into `src/App.jsx`

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `ChooseStarter` (Task 4), `MyPokemon` (Task 5) default exports.

- [x] **Step 1: Replace the full contents of `src/App.jsx`**

```jsx
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dex from "./pages/Dex";
import PokemonDetail from "./pages/PokemonDetail";
import QuizHub from "./pages/QuizHub";
import SilhouetteQuiz from "./pages/SilhouetteQuiz";
import ChosungQuiz from "./pages/ChosungQuiz";
import CryQuiz from "./pages/CryQuiz";
import ChooseStarter from "./pages/ChooseStarter";
import MyPokemon from "./pages/MyPokemon";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dex" element={<Dex />} />
      <Route path="/pokemon/:id" element={<PokemonDetail />} />
      <Route path="/quiz" element={<QuizHub />} />
      <Route path="/quiz/silhouette" element={<SilhouetteQuiz />} />
      <Route path="/quiz/chosung" element={<ChosungQuiz />} />
      <Route path="/quiz/cry" element={<CryQuiz />} />
      <Route path="/mine/choose" element={<ChooseStarter />} />
      <Route path="/mine" element={<MyPokemon />} />
    </Routes>
  );
}
```

- [x] **Step 2: Manual verification**

Run: `npm run dev` and manually confirm `/mine/choose` and `/mine` both render (per Task 4/5 Step 2 checks above), now end-to-end: pick a starter on `/mine/choose` → land on `/mine` showing the chosen Pokémon.

- [x] **Step 3: Run the full test suite to confirm no regressions**

Run: `npm test`
Expected: PASS — all existing tests (`QuizHub.test.jsx`, `hangul.test.js`, `pokemonData.test.js`) plus the two new test files from Task 1 and Task 3 pass.

- [x] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: route /mine/choose and /mine to the new my-Pokemon pages"
```

---

### Task 7: Redesign `src/pages/Home.jsx` around my-Pokémon status

**Files:**
- Modify: `src/pages/Home.jsx`

**Interfaces:**
- Consumes: `getMyPokemon()` (Task 3), `loadPokemonData()` (pre-existing), `SparklesIcon` (pre-existing, from `src/components/Icons.jsx`).

- [x] **Step 1: Replace the full contents of `src/pages/Home.jsx`**

```jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { SparklesIcon } from "../components/Icons";
import { loadPokemonData } from "../utils/pokemonData";
import { getMyPokemon } from "../utils/myPokemon";

export default function Home() {
  const [mine, setMine] = useState(undefined); // undefined = 확인 전, null = 없음, 객체 = 있음
  const [artwork, setArtwork] = useState(null);

  useEffect(() => {
    const rec = getMyPokemon();
    setMine(rec);
    if (rec) {
      loadPokemonData().then((all) => {
        const p = all.find((x) => x.id === rec.currentStageId);
        setArtwork(p?.artwork || null);
      });
    }
  }, []);

  return (
    <AppShell title={undefined}>
      <div style={{ padding: "var(--space-4) 0 var(--space-2)" }}>
        <img
          src={`${import.meta.env.BASE_URL}pokeball.svg`}
          alt=""
          style={{ width: 40, height: 40, marginBottom: "var(--space-3)" }}
        />
        <h1 style={{ fontSize: 30, color: "var(--color-primary)" }}>
          포켓몬 도감 & 퀴즈
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "var(--space-2)", lineHeight: 1.5 }}>
          아이와 함께, 또는 포켓몬을 좋아하는 누구나 즐길 수 있는 미니 도감 &
          퀴즈 앱입니다.
        </p>
      </div>

      <div style={{ marginTop: "var(--space-4)" }}>
        {mine === undefined && (
          <div className="skeleton" style={{ height: 120, borderRadius: "var(--radius-lg)" }} />
        )}

        {mine === null && (
          <Link
            to="/mine/choose"
            className="press pop-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
              padding: "var(--space-5)",
              borderRadius: "var(--radius-lg)",
              background: "var(--color-primary)",
              color: "var(--color-text-on-primary)",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "color-mix(in srgb, currentColor 18%, transparent)",
                flexShrink: 0,
              }}
            >
              <SparklesIcon size={26} strokeWidth={1.9} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 19 }}>
                나만의 포켓몬을 만나보세요!
              </div>
              <div style={{ fontWeight: 400, fontSize: 13, marginTop: 4, opacity: 0.85 }}>
                포켓몬을 골라 퀴즈를 풀며 키워보세요
              </div>
            </div>
          </Link>
        )}

        {mine && (
          <Link
            to="/mine"
            className="press pop-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
              padding: "var(--space-4)",
              borderRadius: "var(--radius-lg)",
              background: "var(--color-surface)",
              boxShadow: "var(--shadow-card)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--color-surface-2)",
                flexShrink: 0,
              }}
            >
              {artwork && (
                <img src={artwork} alt={mine.nickname} style={{ width: 52, height: 52 }} />
              )}
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>내 포켓몬</div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 19 }}>
                {mine.nickname}
              </div>
            </div>
          </Link>
        )}
      </div>

      <p style={{ marginTop: "var(--space-10)", fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.6 }}>
        본 앱은 팬이 제작한 비공식 프로젝트이며 Nintendo, Game Freak, The
        Pokémon Company와 관련이 없습니다. 데이터 출처:{" "}
        <a href="https://pokeapi.co" target="_blank" rel="noreferrer">PokeAPI</a>
      </p>
    </AppShell>
  );
}
```

- [x] **Step 2: Manual verification**

Run: `npm run dev`. With no `pokemonMine.v1` in localStorage, `/` shows the "나만의 포켓몬을 만나보세요!" CTA card linking to `/mine/choose`. After choosing a starter, revisiting `/` shows the compact status card with artwork + nickname linking to `/mine`. Confirm the bottom tab bar (홈/도감/퀴즈) still works for reaching `/dex` and `/quiz` (this replaces the removed `NavCard` shortcuts, per the spec's own reasoning that they duplicated the tab bar).

- [x] **Step 3: Run the full test suite one final time**

Run: `npm test`
Expected: PASS — all tests green (no test targets `Home.jsx` directly, consistent with existing convention; `QuizHub.test.jsx` and the two new test files remain unaffected).

- [x] **Step 4: Commit**

```bash
git add src/pages/Home.jsx
git commit -m "feat: replace Home nav-card shortcuts with my-Pokemon status section"
```

---

## Self-Review

**1. Spec coverage (mapped to the 6 concrete-scope items in the task brief):**
- Item 1 (fetch script + evolutionStage/evolvesFrom/evolvesTo + chain caching + pure-function unit tests) → Task 1 + Task 2. ✓
- Item 2 (`myPokemon.js` getter/chooseStarter/getStarterCandidates + unit tests) → Task 3. ✓
- Item 3 (`ChooseStarter.jsx` at `/mine/choose`, Dex-pattern reuse, inline confirm, `AppShell` wrap) → Task 4. ✓
- Item 4 (`MyPokemon.jsx` at `/mine`, redirect-if-null, hero-panel styling, no progress bar) → Task 5. ✓
- Item 5 (`Home.jsx` my-Pokémon section replacing NavCards, keep intro/footer) → Task 7. ✓
- Item 6 (`App.jsx` route wiring) → Task 6. ✓
- Explicitly deferred items (point accrual, evolution triggering/celebration, evolution-order quiz, Phase 2/3) → not present anywhere in this plan. ✓

**2. Placeholder scan:** No "TBD"/"TODO"/"implement later" strings anywhere in the plan's code blocks. Every step that produces code shows the full file content, not a diff fragment or a "similar to Task N" reference. The one place a lesser plan might have left a TODO — the "다음 진화까지" line in `MyPokemon.jsx` — instead ships a concrete static Korean sentence, per the task brief's explicit instruction to decide rather than leave a TODO.

**3. Type/signature consistency across tasks:**
- `extractEvolutionInfo(chainRoot, speciesName)` (Task 1) is called identically in Task 2's `fetchOne` as `extractEvolutionInfo(chainRoot, species.name)`. ✓
- `getStarterCandidates(allPokemon)` (Task 3) is called as `getStarterCandidates(all)` in Task 4 with the same single-array-argument shape. ✓
- `chooseStarter(pokemon, nickname)` (Task 3) is called as `chooseStarter(picked, nickname)` in Task 4 — `picked` is a full pokemon object from `loadPokemonData()` (has `.id`, `.nameKo`), matching what `chooseStarter` destructures (`pokemon.id`, `pokemon.nameKo`). ✓
- `getMyPokemon()` (Task 3) is called with no arguments identically in Task 5 (`MyPokemon.jsx`) and Task 7 (`Home.jsx`). ✓
- The stored record's field names (`starterId`, `nickname`, `currentStageId`, `history`, `pointsSinceLastEvolution`, `lifetimePoints`, `pendingEvolution`, `collection`) match the spec's JSON example exactly and match what Task 5/7 read (`rec.currentStageId`, `mine.nickname`). ✓
- `evolutionStage`/`evolvesTo` field names from Task 1/2 match what Task 3's `getStarterCandidates` filters on (`p.evolutionStage === 1 && p.evolvesTo?.length > 0`). ✓

---

## Judgment Calls Made (resolved, not blocking)

1. **New file `scripts/evolutionChain.mjs` instead of testing `fetch-pokemon-data.mjs` directly.** Necessary because `fetch-pokemon-data.mjs` calls `run().catch(...)` unconditionally at module top level — importing it from a test would trigger real PokeAPI network requests during `vitest run`. Keeps the executable script thin, puts testable logic in an importable module.
2. **Vitest `include` pattern for `.mjs` test files — verified, not a risk.** Checked `node_modules/vitest/dist/config.cjs` directly: `defaultInclude = ["**/*.{test,spec}.?(c|m)[jt]s?(x)"]`, which matches `fetch-pokemon-data.test.mjs`.
3. **Species-name matching uses `species.name`, not `pokemon.name`.** The evolution-chain tree's nodes only ever contain `species.name`; for the base-form species ids 1–1025 this script fetches, `species.name === pokemon.name` in practice.
4. **Fallback values on total evolution-chain fetch failure:** `evolutionStage: 1`, `evolvesFrom: null`, `evolvesTo: []`. A network hiccup on one chain fetch would make an affected mid-chain Pokémon look like a stage-1 Pokémon with no further evolutions (silently wrong metadata, not a crash) — acceptable given this only affects the rare fetch-failure case and can be fixed by re-running the fetch script.
5. **Nickname input:** plain single-line `<input>`, trimmed, empty falls back to `nameKo`, no max-length or profanity validation, "다시 고르기" button instead of relying on `AppShell`'s `backTo` for the confirm sub-view (since the confirm panel isn't a separate route).
6. **`ChooseStarter.jsx` drops the sort-order pill row** that `Dex.jsx` has (이름순/도감번호순/세대순), keeping only search + type filter — a one-time starter pick doesn't need re-sorting.
7. **No render/unit tests for `ChooseStarter.jsx`/`MyPokemon.jsx` pages themselves**, only manual verification steps — matches the existing project convention (`Dex.jsx`/`PokemonDetail.jsx` have no test files either; only pure-logic modules and `QuizHub.jsx` are tested).

### Critical Files for Implementation
- `scripts/fetch-pokemon-data.mjs`
- `scripts/evolutionChain.mjs` (new)
- `src/utils/myPokemon.js` (new)
- `src/pages/ChooseStarter.jsx` (new)
- `src/pages/MyPokemon.jsx` (new)
- `src/pages/Home.jsx`
- `src/App.jsx`
