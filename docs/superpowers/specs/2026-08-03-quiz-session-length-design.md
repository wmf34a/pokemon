# 퀴즈 세션 길이 제한 (20문제) Design

**Goal:** 지금은 퀴즈 화면에 한 번 들어가면 무한히 문제가 이어진다. 세션당 20문제로 제한하고, 다 풀면 결과 요약 화면을 보여준 뒤 "다시 하기"로 새 20문제 세션을 시작하거나 퀴즈 목록으로 돌아갈 수 있게 한다. 재진입/재시작 때마다 순수 랜덤으로 다시 뽑기 때문에 매번 다른 조합이 나온다.

**Scope:** `SilhouetteQuiz.jsx`, `CryQuiz.jsx`, `EvolutionQuiz.jsx`. `ChosungQuiz.jsx`는 별도 작업으로 곧 삭제될 예정이라 제외한다. 앞으로 추가될 신규 퀴즈 모드(누구냔 넌, 타입 퀴즈)도 이번에 만드는 공용 함수를 재사용할 것을 전제로 설계한다.

**Non-goals:** 직전 세션과의 중복 회피(순수 랜덤이면 충분하다고 결정함), 세션 기록의 localStorage 영속화, 문제 수를 20 외의 값으로 설정하는 옵션.

---

## Architecture

새 순수 함수 모듈 `src/utils/quizSession.js`에 `pickSessionAnswers(pool, count = SESSION_LENGTH)`를 추가한다. `pool`에서 중복 없이 최대 `count`개를 무작위로 뽑아 배열로 반환한다(`pool.length < count`면 있는 만큼만, 즉 `Math.min(pool.length, count)`개). `SESSION_LENGTH = 20`을 이 모듈의 named export로 둔다 — 매직 넘버 금지.

`SilhouetteQuiz`/`CryQuiz`는 데이터 로드 후(`all`이 채워진 시점) `pickSessionAnswers(all, SESSION_LENGTH)`로 "이번 세션에서 정답이 될 포켓몬 20개"를 뽑아 `sessionQuestions` state에 저장한다. `questionIndex`(0부터 시작)로 현재 몇 번째 문제인지 관리한다. 오답 보기(distractors)는 지금처럼 매 문제마다 전체 `all`에서 새로 뽑는다 — 세션에 고정하지 않는다.

`EvolutionQuiz`는 `getEvolutionQuizCandidates(all)`(기존, `src/utils/evolutionQuizChain.js`)로 시작 포켓몬 후보를 구하고, 같은 `pickSessionAnswers`로 20개를 뽑은 뒤 각각 기존 `buildEvolutionChain(candidate, all)`(기존)로 체인을 만들어 `sessionQuestions`에 저장한다. 기존 `pickEvolutionQuizChain`(내부적으로 무작위 시작점 선택 + 재시도)은 세션 사전 계산에는 쓰지 않는다 — 세션 시작 시 한 번에 20개를 결정하는 이 흐름과 맞지 않기 때문이다. 다만 세션 준비 단계에서 `buildEvolutionChain`이 유효한 체인을 만들지 못하는 후보(예: 분기 진화라 2단계 체인이 안 나오는 경우 등, 기존 `pickEvolutionQuizChain` 내부의 방어 로직과 동일한 케이스)는 건너뛰고 다음 후보로 넘어가, 최종적으로 최대 20개(후보가 부족하면 그만큼)를 채운다.

## Data Flow

1. `all` 로드 완료 → `sessionQuestions` 생성(위 방식), `questionIndex = 0`, `sessionComplete = false`, `correctCount = 0`, `score = 0`
2. 문제 화면: `sessionQuestions[questionIndex]`를 기준으로 지금과 동일하게 문제를 구성(오답 보기 새로 뽑기 등)
3. 정답 제출 시: 기존처럼 채점 + 포인트 적립 + (있다면) `EvolutionToast` 표시. 추가로 정답이면 `correctCount` 증가
4. "다음 문제" 클릭 시:
   - `questionIndex + 1 < sessionQuestions.length`면 `questionIndex`를 증가시키고 다음 문제로 진행(기존 `nextRound`와 동일한 리셋 로직 재사용)
   - 아니면(마지막 문제였으면) `sessionComplete = true`로 전환해 결과 화면을 보여준다
5. 결과 화면: "20문제 중 {correctCount}문제 정답 · 총 {score}점" + "다시 하기" 버튼(2번부터 다시, `pickSessionAnswers`를 다시 호출해 새 세션 생성) + "퀴즈 목록으로" 버튼(`/quiz`로 이동)

## Component/UI Changes

- 문제 화면 상단 텍스트를 `{round}번째 문제 · 점수 {score}점`에서 `{questionIndex + 1}/{sessionQuestions.length}번째 문제 · 점수 {score}점`으로 변경
- 결과 요약 화면은 각 페이지에 인라인으로 추가(기존 결과 화면과 같은 `AppShell` 안, 별도 라우트 없음)
- 새 CSS 없음 — 기존 `primaryBtn`/버튼 스타일 재사용

## Error Handling

- `sessionQuestions`가 비어있는 극단적 경우(후보 풀이 0개, 필터링 후 남는 게 없는 경우 등)는 기존 `if (!answer)`/`if (!chain)` 스켈레톤 로딩 분기와 동일하게 처리 — 별도 에러 UI를 새로 만들지 않는다.
- `EvolutionQuiz`에서 후보 20개 중 일부가 유효한 체인을 못 만들어 세션이 20개보다 적게 채워지는 경우, 결과 화면의 분모는 실제 `sessionQuestions.length`를 쓴다("18문제 중 O문제 정답" 처럼) — 20 고정 문구를 쓰지 않는다.

## Testing

- `quizSession.test.js`(신규): `pickSessionAnswers`가 (a) 중복 없이 뽑는지, (b) `count`를 넘지 않는지, (c) `pool.length < count`일 때 `pool.length`만큼만 반환하는지, (d) `count`가 0이거나 `pool`이 빈 배열일 때 빈 배열을 반환하는지.
- 페이지 wiring(3개)은 기존 관례(fetch 의존 페이지는 페이지 단위 자동 테스트 없음)를 따라 수동 검증으로 확인한다.

## File Structure

**New:**
- `src/utils/quizSession.js` — `SESSION_LENGTH`, `pickSessionAnswers`.
- `src/utils/quizSession.test.js`

**Modified:**
- `src/pages/SilhouetteQuiz.jsx`, `src/pages/CryQuiz.jsx` — 세션 state 추가, 문제 생성 로직을 `sessionQuestions[questionIndex]` 기반으로 변경, 결과 요약 화면 추가.
- `src/pages/EvolutionQuiz.jsx` — 위와 동일하되 체인 기반으로 세션 준비.
