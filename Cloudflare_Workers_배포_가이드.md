# Cloudflare Workers 배포 가이드

GitHub 레포 `wmf34a/pokemon`(React + Vite 정적 웹앱)을 Cloudflare Workers
(Static Assets)로 배포하는 과정입니다. 서버 없이 정적 파일만 배포하므로
비용은 무료 티어로 충분합니다.

이 저장소는 Cloudflare의 Workers autoconfig 봇이 자동으로 추가한
`wrangler.jsonc` / `@cloudflare/vite-plugin` 설정을 사용합니다 (Pages가
아니라 Workers + Static Assets 방식).

## 0. 사전 준비 (완료됨)

- `public/data/pokemon.json`에 PokeAPI 데이터(1025마리)가 이미 커밋되어 있습니다.
  (이 파일이 비어있으면 배포된 사이트에서 도감이 빈 화면으로 보입니다. 갱신 방법은 5장 참고)
- `wrangler.jsonc`에 Worker 이름(`pokemon`)과 SPA 라우팅 설정
  (`assets.not_found_handling: single-page-application`)이 포함되어 있습니다.

## 1. Cloudflare 계정 연동 (Workers Builds)

1. [dash.cloudflare.com](https://dash.cloudflare.com) 접속 → 로그인/가입
2. 왼쪽 메뉴 **Workers & Pages** → 이 저장소와 연결된 `pokemon` Worker 선택
   (또는 아직 연결 전이면 **Create application** → **Workers** → **Connect to Git**)
3. GitHub 계정 연동 승인 후 `wmf34a/pokemon` 저장소 선택

## 2. 빌드 설정

Cloudflare가 `wrangler.jsonc`를 자동 인식하지만, 아래 값을 직접 확인/입력하세요.

| 항목 | 값 |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` (레포 루트에 `wrangler.jsonc`가 있는 경우) |

**Node 버전**: `wrangler`/`lint-staged` 등 일부 개발 도구가 Node 22 이상을
요구하므로, 이 저장소는 `.nvmrc`에 `22`를 고정해두었습니다. Cloudflare
빌드 환경도 이 `.nvmrc`를 자동으로 인식하므로 별도 설정은 필요 없습니다
(직접 지정하려면 환경 변수 `NODE_VERSION=22`를 추가하면 됩니다).

## 3. 배포

Cloudflare 대시보드에서 **Save and Deploy** 클릭 → 첫 빌드가 시작됩니다
(보통 1~2분). 완료되면 `https://pokemon.<계정서브도메인>.workers.dev`
형태의 무료 주소가 발급됩니다. 이 링크를 인스타그램 릴스 댓글로 안내하시면 됩니다.

이후 `main` 브랜치에 push할 때마다 Cloudflare Workers Builds가 자동으로
재배포합니다 (저장소의 GitHub Actions CI와는 별개로, Cloudflare가 자체
파이프라인으로 빌드/배포합니다).

### (참고) 수동/즉시 배포: `make deploy`

push 없이 로컬 변경사항을 바로 배포하고 싶을 때는 wrangler CLI로 즉시
배포할 수 있습니다.

```bash
npx wrangler login   # 최초 1회, 브라우저에서 Cloudflare 계정 인증
make deploy           # npm run build && wrangler deploy
```

Git 연동을 완료했다면 이후에는 `git push`만으로 자동 재배포되므로 평소에는
`make deploy`를 쓸 필요가 없습니다 (임시 확인/핫픽스용).

## 4. 커스텀 도메인 (선택)

굳이 필요 없다면 `workers.dev` 기본 주소만 써도 충분합니다. 도메인을 이미
갖고 있고 짧은 주소를 쓰고 싶다면 Worker의 **Settings → Domains & Routes**
탭에서 DNS를 Cloudflare로 연결해 붙일 수 있습니다.

## 5. 데이터 갱신 방법

포켓몬 데이터는 자주 바뀌지 않으므로 보통은 갱신할 일이 없습니다.
새로운 포켓몬이 추가되었거나 데이터를 다시 받고 싶을 때만:

```bash
node scripts/fetch-pokemon-data.mjs
git add public/data/pokemon.json
git commit -m "data: 포켓몬 데이터 갱신"
git push
```

push하면 Cloudflare Workers Builds가 자동으로 다시 빌드/배포합니다.

### (선택) GitHub Actions로 자동 갱신

매달 자동으로 데이터를 갱신하고 싶다면 `.github/workflows/update-data.yml`을
추가해 스케줄러로 `fetch-pokemon-data.mjs`를 실행하고 변경분을 자동 커밋하는
방식도 가능합니다. 트래픽이 크지 않은 개인 프로젝트 단계에서는 필수는 아니며,
필요해지면 별도로 요청해주시면 구성해드립니다.

## 6. 트러블슈팅

| 증상 | 원인/해결 |
|---|---|
| 배포된 사이트에서 도감이 비어있음 | `public/data/pokemon.json`을 커밋하지 않음 → 0단계 다시 확인 |
| 빌드 실패 (Node 버전 오류) | `.nvmrc` 또는 `NODE_VERSION` 환경변수로 Node 22 이상 고정 |
| 이미지가 하나도 안 보임 | 네트워크 문제로 PokeAPI 이미지 URL이 느릴 수 있음 (핫링크 방식이라 정상, 재시도하면 대부분 해결) |
| 새로고침하면 404 | `wrangler.jsonc`의 `assets.not_found_handling`이 `single-page-application`인지 확인 (SPA 라우팅 폴백) |
| 새 커밋을 push했는데 사이트가 그대로임 | Cloudflare 대시보드의 Worker **Deployments** 탭에서 빌드 상태 확인, 실패 시 로그 확인 |

## 7. 배포 전 체크리스트

- [ ] `public/data/pokemon.json`에 실제 데이터가 채워져 있는지 (`[]`가 아닌지) 확인
- [ ] `npm run build`가 로컬에서 에러 없이 끝나는지 확인
- [ ] 홈 화면 하단 비공식 팬 프로젝트 고지문이 남아있는지 확인
- [ ] `workers.dev` 주소로 접속해 도감/검색/정렬/실루엣/초성/울음소리 퀴즈가 실제로 동작하는지 확인
