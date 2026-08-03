# 퀴즈 중 진화 알림 토스트 Design

**Goal:** 퀴즈에서 정답을 맞혀 포인트가 적립되고 그 결과로 "내 포켓몬"이 진화(또는 분기 진화 대기 상태)에 들어가면, 결과 화면에 즉시 알림 배지를 띄우고 짧은 축하음을 재생한다. 실제 리빌 연출(단일 진화 팝업, 분기 선택 UI)은 지금처럼 `Home.jsx`에서만 재생한다 — 이 토스트는 "예고편" 역할만 한다.

**Scope:** `SilhouetteQuiz.jsx`, `CryQuiz.jsx`, `EvolutionQuiz.jsx` 세 페이지. `ChosungQuiz.jsx`는 별도 작업으로 삭제 예정이라 이번 범위에서 제외한다.

**Non-goals:** Home 화면의 기존 셀레브레이션 로직 변경, 진화 트리거 조건(`EVOLUTION_THRESHOLD` 등) 변경, 음소거 설정 추가.

---

## Architecture

`useAwardPoints()` 훅을 fire-and-forget에서 **결과를 반환하는 async 함수**로 바꾼다. 퀴즈 페이지는 정답 처리 함수(`submitChoice`/`submitTyped`)를 async로 바꾸고 `await`해서 결과를 받아 로컬 state에 저장한 뒤, 결과 화면에 조건부로 `EvolutionToast`를 렌더링한다.

`EvolutionToast`는 새 공유 컴포넌트(`src/components/EvolutionToast.jsx`)로, 세 페이지가 각자 로컬로 갖고 있는 `ResultHeading` 바로 아래에 삽입한다. 사운드는 별도 훅 `useEvolutionChime()`(`src/hooks/useEvolutionChime.js`)으로 분리해 `EvolutionToast`가 마운트될 때 호출한다.

## Data Flow

1. `useAwardPoints()`가 반환하는 함수의 시그니처를 변경:
   ```js
   awardPoints(points): Promise<{
     evolved: boolean,
     branchChoicePending: boolean,
     newStagePokemon: object | null, // evolved일 때만, loadPokemonData()의 필터 없는 전체 목록에서 조회
   } | null>
   ```
   - 기존처럼 `getMyPokemon()`이 `null`이면 즉시 `null`을 반환 (내 포켓몬 없음 — 조용히 무시).
   - `loadPokemonData()`로 필터 없는 전체 목록을 가져와 `currentStagePokemon`을 찾고 `addPoints()` 호출 — 로직은 기존과 동일, 반환값만 추가.
   - `evolved`일 때 `newStageId`로 전체 목록에서 `newStagePokemon`을 조회해 이름/스프라이트를 그대로 넘겨준다 (퀴즈 페이지가 따로 조회할 필요 없게).
2. 퀴즈 페이지의 `submitChoice`/`submitTyped`가 정답이면 `await awardPoints(earned)` 하고 결과를 `evolutionResult` state에 저장.
3. 결과 화면에서 `evolutionResult?.evolved || evolutionResult?.branchChoicePending`이면 `<EvolutionToast result={evolutionResult} />` 렌더.
4. `nextRound()`/다음 문제로 넘어갈 때 `evolutionResult`를 `null`로 리셋.

## Component: `EvolutionToast`

```
<EvolutionToast result={{ evolved, branchChoicePending, newStagePokemon }} />
```

- `evolved: true` → "짠! **{newStagePokemon.nameKo}**(으)로 진화했어요!" + 작은 스프라이트, `.evolution-reveal-new` 애니메이션 재사용(기존 `index.css`에 이미 정의된 reduced-motion 게이트 클래스).
- `branchChoicePending: true` → "진화 준비 완료! 홈에서 골라보세요" (스프라이트 없음, 같은 애니메이션).
- 아이콘은 기존 `SparklesIcon` 재사용.
- 마운트 시 `useEvolutionChime()`이 반환하는 `playChime()`을 한 번 호출.
- 스타일은 `src/styles/tokens.js`에 새 export `evolutionToast` 추가(카드 톤은 `card`와 동일 계열, 강조 테두리만 `var(--color-accent)`로).

## Sound: `useEvolutionChime`

Web Audio API로 짧은 상승 아르페지오(2~3음, 총 300ms 내외) 생성 — 외부 오디오 에셋 불필요. `AudioContext` 생성/재생 실패(구형 브라우저, 자동재생 정책 등)는 try/catch로 무음 처리하고 퀴즈 흐름을 막지 않는다. 매 호출마다 새 `AudioContext`를 만들지 않도록 모듈 스코프에서 lazy하게 하나만 생성해 재사용.

## Error Handling

- `getMyPokemon()`이 `null`이면 `awardPoints`가 `null` 반환 → 퀴즈 페이지는 `evolutionResult`를 세팅하지 않음 (토스트 없음). 기존 방어 동작 그대로.
- `newStagePokemon` 조회 실패(데이터에 없는 id) 시 `evolved: true`이지만 `newStagePokemon: null` — `EvolutionToast`는 이 경우 이름 없이 "짠! 진화했어요!"로 폴백.
- `AudioContext` 관련 예외는 사용자에게 노출하지 않고 무음 처리.

## Testing

- `useMyPokemonPoints.test.js` (신규): `awardPoints`가 진화/분기/무진화/레코드없음 4가지 케이스에서 올바른 Promise 결과를 반환하는지.
- `EvolutionToast.test.jsx` (신규): `evolved`/`branchChoicePending`/둘 다 false(렌더 안 함) 3케이스 스냅샷 없는 텍스트 assertion.
- `useEvolutionChime`은 AudioContext가 jsdom에 없으므로 "예외 없이 호출된다"는 정도만 테스트 (실제 재생 검증은 생략).
- 기존 `SilhouetteQuiz.test.jsx`/`CryQuiz.test.jsx`/`EvolutionQuiz.test.jsx`에 회귀 없는지 확인 (async 전환으로 인한 act() 경고 등 체크).

## File Structure

**New:**
- `src/components/EvolutionToast.jsx`
- `src/components/EvolutionToast.test.jsx`
- `src/hooks/useEvolutionChime.js`

**Modified:**
- `src/hooks/useMyPokemonPoints.js` — Promise 반환하도록 변경, 관련 테스트 신규 작성.
- `src/pages/SilhouetteQuiz.jsx`, `src/pages/CryQuiz.jsx`, `src/pages/EvolutionQuiz.jsx` — `submitChoice`/`submitTyped`를 async로, `evolutionResult` state 추가, 결과 화면에 `EvolutionToast` 삽입.
- `src/styles/tokens.js` — `evolutionToast` 스타일 추가.
