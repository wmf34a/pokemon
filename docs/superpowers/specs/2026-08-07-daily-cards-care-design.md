# 오늘의 포켓몬 / 카드 수집 / 포켓몬 키우기 — 설계 문서

- 작성일: 2026-08-07
- 상태: 설계 승인됨, 구현 계획 대기

## 배경 및 목적

기존 앱은 도감(정적 데이터 열람) + 퀴즈(정답 → 포인트 → 진화, `myPokemon.js`)로 구성되어 있다. 여기에 재방문 동기를 더하는 독립적인 3개 기능을 추가한다.

- **오늘의 포켓몬**: 매일 새로운 콘텐츠로 재방문 유도 (일 단위 훅).
- **카드 수집**: 퀴즈 플레이 자체에 수집 동기 부여 (플레이 단위 훅).
- **포켓몬 키우기**: 일상적 상호작용으로 애착 유지 (다마고치형 훅, 진화 시스템과 별개).

세 기능 모두 계정 없이 `localStorage`만으로 동작하고, 기존 진화 시스템(`myPokemon.js`)의 데이터/로직은 건드리지 않는다. 각각 독립된 유틸 모듈 + 훅 + 페이지로 구성해 서로 의존하지 않는다 (단, 카드 수집은 5개 퀴즈 페이지의 정답 처리 지점에, 키우기는 `myPokemon.currentStageId`를 읽기 전용으로 참조한다).

## 공통: 라우트 & 네비게이션

```
/daily       DailyPokemon 상세 페이지
/collection  CardCollection.jsx
/care        PokemonCare.jsx
```

`AppShell.jsx`의 `NAV_ITEMS`에 3개 추가해 하단 네비 6탭 구성: 홈 / 도감 / 퀴즈 / 오늘 / 카드 / 키우기. 기존 아이콘 크기(22px)·라벨(11px) 그대로 유지, `Icons.jsx`에 신규 아이콘 3개 추가(캘린더/카드/하트류, 기존 lucide 스타일 통일).

---

## 1. 오늘의 포켓몬 (DailyPokemon)

### 데이터 & 시드

`src/utils/dailyPokemon.js`:

- 오늘 날짜를 로컬 자정 기준 `YYYY-MM-DD` 문자열로 만든다.
- 문자열을 간단한 문자열 해시(mulberry32류 결정적 PRNG의 seed로 변환)로 정수화하고, **전체 포켓몬 데이터셋**(`pokemonQuiz.gen1Only` 설정 무시) 길이로 모듈로 연산해 인덱스를 뽑는다. 같은 날짜 → 항상 같은 인덱스.
- localStorage key `pokemonDaily.v1`: `{ date: "YYYY-MM-DD", pokemonId: number }`.
- 읽을 때 저장된 `date`가 오늘과 다르면 재계산해서 덮어쓴다. 오늘과 같으면 저장된 `pokemonId` 그대로 사용(새로고침해도 유지).

### 훅

`src/hooks/useDailyPokemon.js`: 위 로직 실행 + `loadPokemonData()` 결과에서 해당 id 찾아 포켓몬 객체까지 합쳐서 반환. 데이터 로딩 전엔 `undefined`.

### UI

- `/daily` 페이지: 아트워크 큰 이미지, 이름(`nameKo`), `TypeBadge` 나열, `descriptionKo`, `AudioButton`(기존 컴포넌트 그대로 재사용, `src={p.cry}`).
- 홈 화면 하단(기존 안내 문구 위): 축소 카드 — 작은 이미지 + 이름 + "오늘의 포켓몬 보러가기" → `/daily` 링크. 기존 `pop-card`/`press` 클래스, `card` 토큰 재사용.

---

## 2. 카드 수집 (CardCollection)

### 등급

4단계, 확률은 카드 획득 시점에 매번 독립 추첨:

| 등급 | 색상 | 확률 |
|---|---|---|
| 일반 | 흰색 (`--color-surface`) | 50% |
| 보통 | 초록색 | 30% |
| 레어 | 파란색 | 15% |
| 초희귀 | 금색 | 5% |

### 저장 & 획득 로직

`src/utils/cardCollection.js`, localStorage key `pokemonCards.v1`:

```json
{ "25": { "grade": "rare", "earnedAt": "2026-08-07T09:00:00.000Z" } }
```

- `awardCard(pokemonId)`: 이미 해당 id 키가 있으면 **아무 것도 하지 않고 기존 레코드 그대로 반환** (등급 고정, 재추첨 없음). 없으면 위 확률표로 등급 뽑아 저장하고 `{ isNew: true, grade }` 반환.
- 등급 판정은 순수 함수로 분리(`rollGrade()`)해서 유닛 테스트 가능하게 한다.

### 퀴즈 연동

5개 퀴즈 페이지(`CryQuiz`, `EvolutionQuiz`, `SilhouetteQuiz`, `TypeQuiz`, `ZoomQuiz`)의 정답 처리 지점(현재 `awardPoints(...)` 호출부)마다 `awardCard(answer.id)` 한 줄을 나란히 추가한다. `isNew`가 true일 때만 카드 획득 토스트를 띄운다(기존 오답에는 영향 없음, 오답 시 카드 없음).

### 토스트

`EvolutionToast.jsx`와 같은 자리(정답 공개 영역)에 `CardToast.jsx` 신규 컴포넌트 추가. `evolutionToast` 토큰과 같은 pill 모양이되, 등급별 배경/테두리 색만 다르게(일반/보통/레어는 색상 차이만, 초희귀는 반짝임 애니메이션 클래스 하나 추가 — 기존 `evolution-shimmer-ring`류 CSS 애니메이션 패턴 재사용).

### 컬렉션 페이지

`CardCollection.jsx`:
- 전체 포켓몬 목록을 그리드로 순회(`Dex.jsx`의 그리드 레이아웃 패턴 재사용).
- 미보유: 실루엣 처리(`filter: brightness(0)` — 홈 화면 분기 진화 선택 카드에서 이미 쓰는 방식 재사용), 등급 뱃지 없음, 클릭 무반응.
- 보유: 카드 앞면(이미지+이름+등급 뱃지), 클릭 시 `transform: rotateY(180deg)` 3D 플립 → 뒷면(타입 뱃지, 특성, 설명). 특성은 데이터에 영어 슬러그만 있어(`overgrow` 등) 한글 사전 없이 `_`→공백 치환 + 첫 글자 대문자화만 해서 표시(한글화는 이번 스코프 밖).
- 상단에 진행률(획득 수 / 전체 수) 표시.

---

## 3. 포켓몬 키우기 (PokemonCare)

### 대상

항상 `getMyPokemon().currentStageId`. `getMyPokemon()`이 `null`이면(아직 스타터 안 고름) `/care` 페이지는 "먼저 포켓몬을 골라주세요" 안내 + `/mine/choose` 링크만 보여주고 상태 UI는 렌더링하지 않는다.

### 저장 & 상태 계산

`src/utils/pokemonCare.js`, localStorage key `pokemonCare.v1`:

```json
{
  "hunger": 80,
  "happiness": 80,
  "fatigue": 20,
  "lastFedDate": "2026-08-07",
  "lastPlayedDate": "2026-08-07",
  "lastSleptDate": "2026-08-07",
  "lastTickAt": "2026-08-07T09:00:00.000Z"
}
```

- 백그라운드 타이머 없음. `getCareState()` 호출 시점에 `lastTickAt`부터 지금까지 경과한 시간(시간 단위)만큼 순수 함수로 상태를 깎아 계산하고, 계산 결과를 저장하면서 `lastTickAt`을 지금 시각으로 갱신한다.
- 하락률(시간당): 배고픔 -2, 행복 -1, 피로 +1. 각 필드 0~100 클램프.
- 최초 레코드 없으면 `hunger/happiness: 80, fatigue: 20`으로 초기화(과거 시점 없음 취급, 즉시 깎지 않음).

### 액션 (1일 1회 제한)

- `feed()`: 오늘 `lastFedDate`가 이미 오늘이면 무시(호출부에서 버튼 비활성화로 막되, 함수 자체도 방어). 아니면 배고픔 +30(클램프), `lastFedDate` = 오늘.
- `play()`: 행복 +25, 피로 +15(노는 것도 체력 소모), `lastPlayedDate` = 오늘.
- `sleep()`: 피로 -40, `lastSleptDate` = 오늘.
- 각 액션 가능 여부(`canFeedToday()` 등)는 별도 export로 노출해 페이지에서 버튼 disabled 처리에 그대로 쓴다.

### 표정 / 이펙트

이모지 대신 CSS로 표현(디자인 원칙 준수):
- 종합 점수 = `(hunger + happiness + (100 - fatigue)) / 3` 기준 4단계: 행복(70+) / 보통(40~69) / 지침(20~39) / 삐침(20 미만).
- 단계별로 포켓몬 아트워크에 CSS 필터만 다르게(밝기/채도) 적용하고, 단계별 상태 문구(예: "기분이 좋아 보여요" / "심심한가 봐요" / "많이 지쳤어요")를 텍스트로 보여준다.
- "삐침" 단계 진입은 페이지 방문 시 1회성 토스트만 띄우고(연속 방문 시 중복 안 띄우도록 세션 플래그로 억제), 포인트/진화 등 다른 시스템에는 어떤 영향도 주지 않는다.

### 페이지

`PokemonCare.jsx`: 포켓몬 이미지(표정 필터 적용) 중앙, 배고픔/행복/피로 3개 게이지 바(`Home.jsx`의 진화 게이지 바 스타일 재사용), 밥주기/놀아주기/재우기 3버튼(오늘 이미 했으면 disabled + "내일 다시" 안내).

---

## 테스트 계획

기존 `*.test.js` 패턴(vitest, `src/**/*.test.{js,jsx}`)을 따라:
- `dailyPokemon.test.js`: 같은 날짜 입력 → 같은 id, 날짜 바뀌면 재계산, localStorage 접근 실패 시 조용히 무시.
- `cardCollection.test.js`: 신규 획득/중복 무시, `rollGrade()` 확률 분포(대량 샘플링으로 대략적 비율 검증), localStorage 실패 방어.
- `pokemonCare.test.js`: 경과 시간에 따른 하락 계산, 액션별 1일 1회 제한, 클램프(0~100) 경계.
- 페이지 컴포넌트는 기존 `QuizResultScreen.test.jsx` 등처럼 핵심 분기(스타터 없음 안내, 신규 카드 토스트 노출 등)만 스모크 테스트.

## 확정된 결정 사항 (질문 답변 반영)

- 오늘의 포켓몬 풀: gen1Only 설정 무시, 항상 전체 데이터셋.
- 카드 중복: 재추첨 없이 무시, 최초 등급 고정.
- 카드 등급: 4단계(일반 50% / 보통 30% / 레어 15% / 초희귀 5%).
- 키우기 대상: 항상 `myPokemon.currentStageId` (별도 선택 없음).
- 키우기 하락률: 시간당 배고픔 -2 / 행복 -1 / 피로 +1.
