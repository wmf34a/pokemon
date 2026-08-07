# 오늘의 포켓몬 / 카드 수집 / 포켓몬 키우기 / 일일 미션 — 설계 문서

- 작성일: 2026-08-07
- 상태: 설계 승인됨, 구현 계획 대기

## 배경 및 목적

기존 앱은 도감(정적 데이터 열람) + 퀴즈(정답 → 포인트 → 진화, `myPokemon.js`)로 구성되어 있다. 여기에 재방문 동기를 더하는 독립적인 4개 기능을 추가한다.

- **오늘의 포켓몬**: 매일 새로운 콘텐츠로 재방문 유도 (일 단위 훅).
- **카드 수집**: 퀴즈 플레이 자체에 수집 동기 부여 (플레이 단위 훅).
- **포켓몬 키우기**: 일상적 상호작용으로 애착 유지 (다마고치형 훅, 진화 시스템과 별개).
- **일일 미션**: 아이의 생활 습관(등원/하원/식사/양치/독서/취침)을 부모가 확인·체크하면 카드로 보상 — 카드 수집과 연동되는 실생활 훅.

네 기능 모두 계정 없이 `localStorage`만으로 동작하고, 기존 진화 시스템(`myPokemon.js`)의 데이터/로직은 건드리지 않는다. 각각 독립된 유틸 모듈 + 훅 + 페이지로 구성해 서로 의존하지 않는다 (단, 카드 수집은 5개 퀴즈 페이지의 정답 처리 지점과 일일 미션 완료 지점에서 호출되고, 키우기는 `myPokemon.currentStageId`를 읽기 전용으로 참조한다).

## 공통: 라우트 & 네비게이션

```
/daily       DailyPokemon 상세 페이지
/collection  CardCollection.jsx
/care        PokemonCare.jsx
/missions    DailyMission.jsx
/more        새 기능 4개를 카드 목록으로 모아 보여주는 진입 페이지
```

하단 네비는 기존 3탭 그대로 두고 **"더보기" 1탭만 추가**해 4탭 유지(홈/도감/퀴즈/더보기) — 7탭으로 늘리면 좁은 화면에서 라벨이 겹치거나 탭 폭이 너무 좁아지는 문제가 있어, 신규 기능 4개는 `/more` 진입 페이지에 카드 목록(아이콘+제목+한줄설명)으로 모아두고 각 카드가 `/daily`, `/collection`, `/care`, `/missions`로 라우팅한다. 각 기능 라우트는 URL로 직접 접근 가능하고, 홈 화면 하단 오늘의 포켓몬 요약 카드처럼 다른 화면에서 바로 링크로 들어오는 경로도 그대로 유지한다. `Icons.jsx`에 신규 아이콘 4~5개 추가(캘린더/카드/하트/체크리스트/더보기용 grid류, 기존 lucide 스타일 통일).

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

## 4. 일일 미션 (DailyMission)

카드 수집(기능 2)의 `awardCard`/`rollGrade`를 그대로 재사용해서 별도 등급 로직을 새로 만들지 않는다.

### 미션 카탈로그

기본 미션 6개는 코드 상수로 고정(카탈로그 자체는 저장하지 않음):

```js
// src/utils/dailyMission.js
export const DEFAULT_MISSIONS = [
  { id: "gotoSchool", label: "등원하기" },
  { id: "comeHome", label: "하원하기" },
  { id: "eatDinner", label: "저녁 잘 먹기" },
  { id: "brushTeeth", label: "양치 잘 하기" },
  { id: "readBook", label: "책 읽기" },
  { id: "sleepOnTime", label: "제시간에 자기" },
];
```

커스텀 미션은 localStorage key `pokemonMissions.custom.v1`에 별도 저장: `[{ id, label, createdAt }]`. 최대 10개, `label`은 앞뒤 공백 제거 후 최대 20자(초과분은 등록 자체를 막고 에러 문구 표시). 삭제 가능 — 삭제해도 과거 완료 기록(로그)은 그대로 남는다(통계 왜곡 방지 목적, 로그는 카탈로그를 참조하지 않음).

오늘 화면에 보여줄 미션 목록 = `DEFAULT_MISSIONS` + 커스텀 목록, 항상 이 순서로 합쳐서 렌더링.

### 완료 상태 & 로그 (저장 구조)

localStorage key `pokemonMissions.log.v1`: 완료 이벤트를 append-only 배열로 저장.

```json
[
  { "missionId": "gotoSchool", "date": "2026-08-07", "completedAt": "2026-08-07T09:02:11.000Z" }
]
```

- "오늘 완료됐는지"는 `date === 오늘` && `missionId` 일치 여부로 판단. 같은 `missionId`+`date` 조합은 하루에 한 번만 추가(중복 완료 방지, 취소 기능 없음 — 스펙대로 완료는 되돌릴 수 없음).
- 주간 통계("이번 주 몇 개 완료")는 이 로그에서 이번 주(월요일 00:00 로컬 ~ 지금) 범위의 항목 개수를 세서 계산 — 카탈로그 조회 없이 로그만으로 집계하므로 미션이 삭제돼도 과거 통계는 안 깨진다.
- 로그가 무한정 커지지 않게, 읽기/쓰기 시점에 90일보다 오래된 항목은 잘라낸다(주간 통계·오늘 상태 계산에는 영향 없음).

### 카드 지급

- `completeMission(missionId)`: 오늘 이미 완료된 미션이면 `null` 반환(아무 것도 안 함). 아니면 로그에 추가하고, 전체 포켓몬 데이터셋에서 완전 랜덤으로 하나 뽑아 `cardCollection.awardCard(randomId)` 호출 → 결과(신규 여부/등급/이미 보유 중이면 기존 등급)를 그대로 반환.
  - 이미 보유한 포켓몬이 랜덤으로 뽑히면 `awardCard`가 새 레코드를 만들지 않는다(기능 2 규칙 그대로) — 이 경우 뽑기 연출은 "이미 있는 카드예요" 결과로 보여주고, 그래도 "오늘 완료 미션 수"는 정상 카운트된다(카드 중복 여부와 미션 완료 자체는 별개).
- 전체 미션(기본+커스텀) 완료 시 보너스 카드 1장 추가 — 같은 `completeMission` 메커니즘을 `missionId: "__bonus__"`로 한 번 더 호출해 별도 로그 항목을 남긴다(하루 1회, 이미 지급됐으면 재지급 안 함).

### 확인 팝업 & 뽑기 연출

- 완료 버튼 클릭 시 네이티브 `confirm()` 대신 앱 톤에 맞는 커스텀 `ConfirmDialog.jsx`(신규, 재사용 가능하게 일반화) 표시 — "정말 완료했나요? (취소할 수 없어요)" 문구 + 확인/취소 버튼.
- 확인 시 `CardRevealModal.jsx`(신규) 표시: 카드 뒷면 상태로 나타났다가 짧은 딜레이 후 `rotateY` 플립으로 등급/포켓몬 공개(기능 2 카드 플립과 동일한 CSS 트랜지션 재사용). 이미 보유 중이던 결과면 "already owned" 문구만 다르게.

### 진동 + 효과음

- 완료 확정 시 짧은 효과음(`useEvolutionChime`처럼 Web Audio API로 합성한 짧은 "딩" 1음, 외부 에셋 불필요)과 함께 `navigator.vibrate(200)`(0.2초 단발 진동) 시도.
- **주의**: iOS/iPadOS Safari는 Vibration API 자체를 지원하지 않는다(이번 세션 초반에 고친 오디오 자동재생 이슈와 같은 계열의 플랫폼 제약). `src/utils/haptics.js`에 `vibrate(pattern)` 헬퍼를 만들어 `"vibrate" in navigator` 체크 후 있으면 호출, 없으면 조용히 무시 — 아이폰/아이패드에서는 진동 없이 효과음+시각 연출만으로 피드백을 준다는 뜻이며, 이는 버그가 아니라 플랫폼 한계로 문서화해둔다.

### 페이지

`DailyMission.jsx`:
- 상단: "오늘 완료 {N}/{전체 미션 수}" + "오늘 획득 카드 {M}장" 요약, 이번 주 완료 수 한 줄.
- 미션 리스트: 각 행에 라벨 + 완료 버튼(완료된 항목은 체크 아이콘 + `opacity: 0.55`로 흐리게, 버튼 자체가 사라지고 완료 시각 `HH:mm` 표시로 대체).
- 하단: 커스텀 미션 관리 — 입력창(최대 20자) + 추가 버튼(10개 도달 시 비활성화 + 안내), 커스텀 항목 옆 삭제 버튼.

---

## 테스트 계획

기존 `*.test.js` 패턴(vitest, `src/**/*.test.{js,jsx}`)을 따라:
- `dailyPokemon.test.js`: 같은 날짜 입력 → 같은 id, 날짜 바뀌면 재계산, localStorage 접근 실패 시 조용히 무시.
- `cardCollection.test.js`: 신규 획득/중복 무시, `rollGrade()` 확률 분포(대량 샘플링으로 대략적 비율 검증), localStorage 실패 방어.
- `pokemonCare.test.js`: 경과 시간에 따른 하락 계산, 액션별 1일 1회 제한, 클램프(0~100) 경계.
- `dailyMission.test.js`: 같은 미션 하루 중복 완료 방지, 전체 완료 시 보너스 1회만 지급, 90일 지난 로그 정리, 주간 통계 집계(로그만으로 계산되는지), 커스텀 미션 20자/10개 제한.
- `haptics.test.js`: `navigator.vibrate` 없는 환경(jsdom 기본)에서 조용히 무시하는지.
- 페이지 컴포넌트는 기존 `QuizResultScreen.test.jsx` 등처럼 핵심 분기(스타터 없음 안내, 신규 카드 토스트 노출, 미션 확인 팝업 취소 시 로그 안 남는지 등)만 스모크 테스트.

## 확정된 결정 사항 (질문 답변 반영)

- 오늘의 포켓몬 풀: gen1Only 설정 무시, 항상 전체 데이터셋.
- 카드 중복: 재추첨 없이 무시, 최초 등급 고정.
- 카드 등급: 4단계(일반 50% / 보통 30% / 레어 15% / 초희귀 5%).
- 키우기 대상: 항상 `myPokemon.currentStageId` (별도 선택 없음).
- 키우기 하락률: 시간당 배고픔 -2 / 행복 -1 / 피로 +1.
- 미션 카드 대상: 전체 포켓몬 중 완전 랜덤(퀴즈처럼 특정 정답 포켓몬 없음).
- 네비게이션: 7탭 대신 기존 3탭 + "더보기" 1탭(`/more`)으로 신규 기능 4개 진입점 통합.
