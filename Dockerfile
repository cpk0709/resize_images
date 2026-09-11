# syntax=docker/dockerfile:1
# DocuFit 운영 이미지. GitHub Actions 가 빌드해 ghcr.io/cpk0709/docufit 로 올리고, 서버는 pull 만 한다 (deploy/docker/).
#
# 3단계: deps(npm ci + prisma generate) → build(next build standalone) → runtime(Node 만, 비루트).
# glibc(bookworm-slim) 를 쓰는 이유: sharp 등 네이티브 모듈의 가장 흔한 빌드가 glibc x64 라 alpine(musl) 보다 변수가 적다.
# 이미지 안에는 빌드 산출물만 있고 .env 는 없다 (package-standalone.mjs 가 제거). 환경변수는 compose 의 env_file 로 넣는다.

ARG NODE_IMAGE=node:22-bookworm-slim

# ── 1. 의존성 ──
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
# postinstall 의 `prisma generate` 가 prisma7.config.ts 를 읽을 때 필요한 형식상 값. 실제 DB 에 접속하지 않는다.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY package.json package-lock.json prisma7.config.ts ./
COPY prisma ./prisma
RUN npm ci

# ── 2. 빌드 ──
FROM ${NODE_IMAGE} AS build
WORKDIR /app
ARG GIT_SHA=unknown
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    GITHUB_SHA=${GIT_SHA}
COPY . .
# 소스 복사 뒤에 덮어써야 한다: .dockerignore 가 로컬 node_modules·src/generated 를 제외하므로 deps 단계 것을 쓴다.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/src/generated ./src/generated
# next/font 가 이 단계에서 Google Fonts 를 내려받아 이미지에 넣는다 (실행 중에는 외부 요청 없음).
RUN npm run build:standalone

# ── 3. 실행 ──
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/.next/standalone ./
USER node
EXPOSE 3000
# curl 없이 Node 로 헬스 체크 (이미지에 패키지를 더 넣지 않는다)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
