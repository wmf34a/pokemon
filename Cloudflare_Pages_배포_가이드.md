# Cloudflare Pages 배포 가이드

GitHub 레포에 올린 `pokemon-dex-quiz-webapp`(React + Vite 정적 웹앱)을
Cloudflare Pages로 배포하는 전 과정입니다. 서버 없이 정적 파일만 배포하므로
비용은 무료 티어로 충분합니다.

## 0. 사전 준비

1. GitHub에 새 레포지토리 생성 (예: `pokemon-dex-quiz`)
2. 받은 `pokemon-dex-quiz-webapp.zip`을 풀어서 그 안의 `app/` 폴더 내용을 레포 루트에 push
3. 배포 전에 로컬에서 실제 포켓몬 데이터를 한 번 받아 커밋해둡니다 (외부 네트워크가 열려있는 로컬 PC에서 실행):

   ```bash
   npm install
   node scripts/fetch-pokemon-data.mjs
   git add public/data/pokemon.json
   git commit -m "data: pokemon.json 캐싱"
   git push
   ```

   (이 파일이 없으면 배포된 사이트에서 도감이 빈 화면으로 보입니다.)

## 1. Cloudflare 계정 및 Pages 프로젝트 생성

1. [dash.cloudflare.com](https://dash.cloudflare.com) 접속 → 로그인/가입
2. 왼쪽 메뉴 **Workers & Pages** → **Create application** → **Pages** 탭 → **Connect to Git**
3. GitHub 계정 연동 승인 후, 방금 만든 레포지토리 선택

## 2. 빌드 설정

Cloudflare가 자동으로 Vite 프로젝트를 감지하지만, 아래 값을 직접 확인/입력하세요.

| 항목 | 값 |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` (레포 루트에 package.json이 있는 경우) |

**Node 버전**: 프로젝트 루트에 `.nvmrc` 또는 환경 변수 `NODE_VERSION=20`을 추가하면
빌드 환경의 Node 버전을 고정할 수 있습니다 (권장).

```bash
echo "20" > .nvmrc
git add .nvmrc && git commit -m "chore: pin node version" && git push
```

## 3. 배포

**Save and Deploy** 클릭 → 첫 빌드가 시작됩니다 (보통 1~2분).
완료되면 `https://<프로젝트명>.pages.dev` 형태의 무료 주소가 발급됩니다.
이 링크를 인스타그램 릴스 댓글로 안내하시면 됩니다.

이후 `main` 브랜치에 push할 때마다 자동으로 재배포됩니다 (CI/CD 자동 연동).

### (참고) 수동/즉시 배포: `make deploy`

Cloudflare 대시보드의 "Connect to Git" 연동을 아직 안 했거나, push 없이
로컬 변경사항을 바로 확인하고 싶을 때는 wrangler CLI로 즉시 배포할 수
있습니다.

```bash
npx wrangler login   # 최초 1회, 브라우저에서 Cloudflare 계정 인증
make deploy           # npm run build 후 dist/ 를 Pages 프로젝트로 배포
```

`make deploy`는 기본적으로 프로젝트 이름을 `pokemon`으로 사용합니다.
다른 이름의 Pages 프로젝트에 배포하려면:

```bash
make deploy CF_PROJECT_NAME=다른-프로젝트-이름
```

Git 연동을 완료했다면 이후에는 `git push`만으로 Cloudflare Pages가
자동으로 재배포하므로 평소에는 `make deploy`를 쓸 필요가 없습니다.

## 4. 커스텀 도메인 (선택)

굳이 필요 없다면 `pages.dev` 기본 주소만 써도 충분합니다. 도메인을 이미
갖고 있고 짧은 주소를 쓰고 싶다면 Pages 프로젝트의 **Custom domains** 탭에서
DNS를 Cloudflare로 연결해 붙일 수 있습니다.

## 5. 데이터 갱신 방법

포켓몬 데이터는 자주 바뀌지 않으므로 보통은 갱신할 일이 없습니다.
새로운 포켓몬이 추가되었거나 데이터를 다시 받고 싶을 때만:

```bash
node scripts/fetch-pokemon-data.mjs
git add public/data/pokemon.json
git commit -m "data: 포켓몬 데이터 갱신"
git push
```

push하면 Cloudflare Pages가 자동으로 다시 빌드/배포합니다.

### (선택) GitHub Actions로 자동 갱신

매달 자동으로 데이터를 갱신하고 싶다면 `.github/workflows/update-data.yml`을
추가해 스케줄러로 `fetch-pokemon-data.mjs`를 실행하고 변경분을 자동 커밋하는
방식도 가능합니다. 트래픽이 크지 않은 개인 프로젝트 단계에서는 필수는 아니며,
필요해지면 별도로 요청해주시면 구성해드립니다.

## 6. 트러블슈팅

| 증상 | 원인/해결 |
|---|---|
| 배포된 사이트에서 도감이 비어있음 | `public/data/pokemon.json`을 커밋하지 않음 → 0단계 다시 확인 |
| 빌드 실패 (Node 버전 오류) | `.nvmrc` 또는 `NODE_VERSION` 환경변수로 Node 20 이상 고정 |
| 이미지가 하나도 안 보임 | 네트워크 문제로 PokeAPI 이미지 URL이 느릴 수 있음 (핫링크 방식이라 정상, 재시도하면 대부분 해결) |
| 새 커밋을 push했는데 사이트가 그대로임 | Cloudflare Pages 대시보드의 **Deployments** 탭에서 빌드 상태 확인, 실패 시 로그 확인 |

## 7. 배포 전 체크리스트

- [ ] `public/data/pokemon.json`에 실제 데이터가 채워져 있는지 (`[]`가 아닌지) 확인
- [ ] `npm run build`가 로컬에서 에러 없이 끝나는지 확인
- [ ] 홈 화면 하단 비공식 팬 프로젝트 고지문이 남아있는지 확인
- [ ] `pages.dev` 주소로 접속해 도감/검색/정렬/실루엣 퀴즈가 실제로 동작하는지 확인
