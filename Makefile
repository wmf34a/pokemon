.PHONY: install dev lint lint-fix test test-watch build preview fetch-data ci deploy

CF_PROJECT_NAME ?= pokemon

install:
	npm install

dev:
	npm run dev

lint:
	npm run lint

lint-fix:
	npm run lint:fix

test:
	npm run test

test-watch:
	npm run test:watch

build:
	npm run build

preview:
	npm run preview

fetch-data:
	node scripts/fetch-pokemon-data.mjs

## CI에서 도는 것과 동일한 체크를 로컬에서 실행
ci: lint test build

## Cloudflare Pages에 dist/ 를 직접 배포 (최초 1회 `npx wrangler login` 필요)
## Cloudflare 대시보드에서 "Connect to Git"으로 연결했다면 push만으로 자동 배포되므로
## 이 타겟은 수동/즉시 배포가 필요할 때만 사용하면 됩니다.
deploy: build
	npx wrangler pages deploy dist --project-name=$(CF_PROJECT_NAME)
