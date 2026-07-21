# 포켓몬 도감 & 퀴즈 (웹앱 스타터)

React + Vite 기반 정적 웹앱입니다. PokeAPI 데이터를 **빌드 전에 미리 받아
`public/data/pokemon.json`으로 캐싱**하고, 앱은 그 정적 파일만 읽습니다.
(PokeAPI fair use 정책 준수 + 트래픽 급증 대비)

## 1. 설치

```bash
npm install
```

## 2. 데이터 준비 (최초 1회 + 데이터 갱신 시)

```bash
node scripts/fetch-pokemon-data.mjs
```

- 전체 포켓몬(기본 1025마리)을 PokeAPI에서 받아 `public/data/pokemon.json`에 저장합니다.
- 테스트할 때는 `node scripts/fetch-pokemon-data.mjs 150` 처럼 숫자를 주면 그 수만큼만 받아 속도를 높일 수 있습니다.
- 이 스크립트는 pokeapi.co 로 실제 네트워크 요청을 보내므로, 외부 네트워크가 열려있는 환경(로컬 PC, GitHub Actions 등)에서 실행하세요.
- 데이터가 자주 바뀌지 않으므로 매 배포마다 다시 받을 필요는 없습니다. 필요할 때만 재실행 후 커밋하면 됩니다.

## 3. 로컬 개발 서버

```bash
npm run dev
```

## 4. 빌드 (배포용)

```bash
npm run build
```

`dist/` 폴더가 생성됩니다. 이 폴더를 Cloudflare Pages 등 정적 호스팅에 올리면 됩니다.

## 5. 개발 스크립트 모음 (Makefile)

```bash
make install     # npm install
make dev         # 개발 서버
make lint        # oxlint 검사
make lint-fix    # oxlint 자동 수정
make test        # vitest 실행 (1회)
make test-watch  # vitest watch 모드
make build       # 프로덕션 빌드
make ci          # lint + test + build (CI와 동일한 체크를 로컬에서)
make deploy      # dist/ 를 Cloudflare Pages로 즉시 배포 (최초 1회 npx wrangler login 필요)
```

## 6. 품질 도구

- **Lint**: [oxlint](https://oxc.rs/) — 설정은 `.oxlintrc.json` (react 플러그인 포함)
- **Test**: [Vitest](https://vitest.dev/) + Testing Library — `src/**/*.test.{js,jsx}`
- **Git hooks**: [husky](https://typicode.github.io/husky/) + lint-staged
  - `pre-commit`: staged된 `.js/.jsx` 파일에 `oxlint --fix` 적용
  - `pre-push`: 전체 테스트(`npm run test`) 실행
- **CI**: `.github/workflows/ci.yml` — push/PR 시 GitHub Actions에서 lint → test → build 순으로 검증

## 프로젝트 구조

```
scripts/fetch-pokemon-data.mjs   # PokeAPI → public/data/pokemon.json 캐싱 스크립트
public/data/pokemon.json         # 캐싱된 포켓몬 데이터 (빌드 산출물에 포함됨)
src/pages/Home.jsx                # 홈
src/pages/Dex.jsx                 # 도감 (목록/검색/정렬/필터)
src/pages/PokemonDetail.jsx       # 포켓몬 상세
src/pages/QuizHub.jsx             # 퀴즈 모드 선택
src/pages/SilhouetteQuiz.jsx      # 실루엣 퀴즈 (구현 완료)
src/utils/hangul.js               # 한글 초성 검색 유틸
src/utils/pokemonData.js          # 데이터 로드/정렬/타입 라벨 유틸
```

## 구현 상태

- [x] 도감 전체 목록 / 가나다순 정렬 / 초성 검색 / 타입 필터
- [x] 포켓몬 상세 (이미지, 타입, 특성, 설명, 울음소리)
- [x] 실루엣 퀴즈 (힌트 단계별 공개, 객관식/주관식, 점수)
- [x] 초성 퀴즈 (초성 표시 + 타입/설명/세대 힌트, 객관식/주관식, 점수)
- [x] 울음소리 퀴즈 (소리 재생 + 타입/실루엣/초성 힌트, 객관식/주관식, 점수)
- [ ] 타입 상성 퀴즈 / 진화 순서 맞추기 / 도감번호 업다운 (기획안의 추가 게임모드 — `src/pages/QuizHub.jsx`에 "준비중"으로 자리만 잡아둠. 기존 퀴즈 페이지들을 참고해 같은 패턴으로 추가 가능)
- [ ] 컬렉션/스트릭 등 기록 저장 (localStorage 활용 예정)

## Cloudflare Pages 배포

빌드 명령어 `npm run build`, 빌드 출력 디렉터리 `dist` 로 설정하면 됩니다.
자세한 단계는 별도 배포 가이드 문서를 참고하세요.

## 저작권 안내

이 앱은 팬이 제작한 비공식 프로젝트이며 Nintendo, Game Freak, The Pokémon
Company와 관련이 없습니다. 데이터 출처: [PokeAPI](https://pokeapi.co)
