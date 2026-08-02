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
