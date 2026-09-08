@AGENTS.md

# DocuFit - 관공서 제출용 서류 이미지 최적화 툴

PRD 원문: `docs/PRD.md` · 설계 결정과 근거: `docs/architecture.md` · **작업 히스토리: `docs/HISTORY.md`**

## 한 줄 요약
회원가입 없이 HEIC → JPG/PDF 변환, 목표 용량(예: 10MB) 맞춤 압축, 여러 장 이어붙이기, 주민번호 가리기를 제공한다.
민감 서류(신분증, 임대차계약서)를 다루므로 **프라이버시가 기능보다 우선**한다.

---

## 세션 프로토콜 (어떤 PC 에서든 동일)

이 저장소는 "기억"을 전부 저장소 안에 둔다. 사람의 기억, 특정 PC 의 로컬 메모리에 의존하지 않는다.

### 세션 시작
1. `.claude/settings.json` 의 SessionStart 훅이 `scripts/session-context.mjs` 를 실행해 `docs/HISTORY.md` 의 **현재 상태 / 다음 할 일 / 미결 결정 / 최근 타임라인 3건** 과 git 상태, 로컬 환경 체크를 컨텍스트에 넣어 준다.
2. 훅 출력이 보이지 않으면(훅 비활성, 다른 도구 사용 등) **직접 `docs/HISTORY.md` 를 읽는다.** 이것을 건너뛰고 코드를 만지지 않는다.
3. "로컬 환경" 체크에 ❌ 가 있으면 그 명령부터 실행한다 (`npm install`, `.env` 생성, `npx prisma generate`).
4. 첫 응답에서 "지금 어디까지 왔고, 무엇부터 할지" 를 한두 문장으로 확인한 뒤 시작한다. 사용자가 다른 지시를 하면 그것을 우선한다.

### 세션 중
- 되돌리기 어려운 **결정**을 내리면 그 자리에서 `docs/HISTORY.md` 의 "미결 결정" 을 갱신하거나, 세션 끝 타임라인에 넣을 메모를 남긴다.
- 컨텍스트가 길어져 요약(compaction)이 예상되면 먼저 `/wrap-up` 을 한 번 실행해 진행 상황을 파일로 내린다.

### 세션 종료
- **`/wrap-up` 스킬을 실행한다** (`.claude/skills/wrap-up/SKILL.md`). 타임라인 1개 추가 → 현재 상태/다음 할 일/미결 결정 덮어쓰기 → CLAUDE.md 규칙 반영 → `tsc`/`lint`/`build` → 커밋.
- 코드/문서/결정이 바뀐 세션만 기록한다. 단순 질문답변 세션은 기록하지 않는다.

### HISTORY.md 구조 (고정, 스크립트가 파싱한다)
```
## 현재 상태        ← 덮어쓰기. Phase, 빌드 상태(날짜), 로컬 미완료, 원격 상태
## 다음 할 일       ← 덮어쓰기. 우선순위 순 번호 목록
## 미결 결정        ← 덮어쓰기. 질문 | 기본 가정 표
## 타임라인         ← append only, 최신이 위. "### YYYY-MM-DD · 세션 N · 제목"
```
섹션 제목 문구를 바꾸면 `scripts/session-context.mjs` 의 `section()` 호출도 같이 바꿔야 한다.

### 다른 PC 에서 처음 시작할 때
```bash
git clone <원격 URL> && cd <폴더>
npm install                      # postinstall 이 prisma generate 까지 수행
cp .env.example .env             # 값 채우기 (README 환경변수 표)
claude                           # SessionStart 훅이 HISTORY 를 읽어 준다
```

---

## 절대 원칙 (위반 금지)
1. **브라우저 우선 처리.** HEIC 변환, 편집, 이어붙이기, 압축, PDF 생성은 기본적으로 브라우저에서 끝낸다. 서버(sharp)는 브라우저가 목표 용량을 못 맞추는 경우의 폴백이다.
2. **원본은 서버에 올리지 않는다.** 서버 경로를 쓸 때도 편집(가리기)이 끝난 결과만 전송한다. 가리기 전 원본이 서버에 도달하면 버그다.
3. **TTL 60분.** 모든 `FileAsset` 은 `expiresAt` 을 반드시 가지며, `FILE_TTL_MINUTES` 상한은 60 으로 코드에 고정되어 있다. 늘리지 말 것.
4. **S3 키/DB/로그에 원본 파일명, 이미지 내용, EXIF 를 남기지 않는다.** 파일명 자체가 개인정보일 수 있다.
5. **presigned URL 수명(기본 10분) < TTL.** 다운로드 링크가 파일보다 오래 살아있으면 안 된다.
6. 새 서버 라우트는 응답에 `Cache-Control: no-store` 를 유지한다 (next.config.ts 전역 헤더).
7. **비밀은 저장소에 넣지 않는다.** `.env` 는 gitignore. 새 비밀이 생기면 `.env.example` 에 빈 값으로 키만 추가하고 `src/lib/env.ts` 스키마에 등록한다.

## 기술 스택 (실제 설치된 버전 기준)
- Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4
- Prisma 7 (`prisma-client` 제너레이터, 출력: `src/generated/prisma`, 드라이버 어댑터 `@prisma/adapter-pg` 필수)
  - 설정 파일은 `prisma7.config.ts` (이 CLI 버전의 기본 파일명). `schema.prisma` 에는 url 을 쓰지 않는다.
- AWS SDK v3 (`@aws-sdk/client-s3`, presigner), `sharp`, `heic2any`, `fabric` v7, `pdf-lib`, `zod` v4

## 디렉터리
```
.claude/settings.json     SessionStart 훅 (팀 공유, 커밋됨)
.claude/skills/wrap-up/   세션 마무리 스킬
scripts/session-context.mjs  HISTORY.md + git + 환경 체크를 컨텍스트로 출력
docs/HISTORY.md           작업 히스토리 (세션 간 단일 진실 공급원)
docs/PRD.md, docs/architecture.md
src/app/                  라우트. api/cron/cleanup = TTL 파기 크론
src/lib/env.ts            zod 환경변수 검증 (lazy: getEnv())
src/lib/db.ts             getPrisma() lazy 싱글턴 (server-only)
src/lib/storage/s3.ts     S3 업로드/presign/일괄삭제 (server-only)
src/lib/retention.ts      computeExpiresAt, cleanupExpiredAssets (server-only)
src/lib/constants.ts      클라이언트/서버 공용 상수 (비밀값 금지)
src/lib/image/            (Phase 2~3) 브라우저 이미지 파이프라인, 서버 sharp 파이프라인
src/generated/prisma/     생성물. 커밋하지 않음. `npx prisma generate` 로 재생성
prisma/schema.prisma      FileAsset, CleanupRun
```

## 작업 규칙
- Next 16 은 학습 데이터와 다를 수 있다. API 를 쓰기 전에 `node_modules/next/dist/docs/` 를 먼저 확인한다 (AGENTS.md 지시).
- 서버 전용 모듈은 첫 줄에 `import "server-only"` 를 둔다. 클라이언트 컴포넌트에서 import 하면 빌드가 실패해야 정상이다.
- 환경변수와 Prisma 클라이언트는 **모듈 import 시점이 아닌 호출 시점**에 초기화한다 (`getEnv()`, `getPrisma()`). `next build` 가 라우트 설정을 수집할 때 env 없이도 통과해야 하기 때문.
- `heic2any`, `fabric` 은 브라우저 전용이다. 클라이언트 컴포넌트에서 `await import()` 로 지연 로드한다.
- 스키마를 바꾸면 `npx prisma generate` 후 `npx prisma migrate dev --name <설명>`. 마이그레이션 파일은 커밋한다.
- 검증 명령: `npx tsc --noEmit`, `npm run lint`, `npm run build`. 셋 다 통과해야 완료다.
- 셸 명령은 **절대 경로**를 쓴다. `cd` 상태가 호출 간에 유지되어 엉뚱한 곳에 파일이 생긴 전례가 있다 (HISTORY 세션 1).
- 커밋 메시지, 코드 주석, 문서는 한국어. 식별자는 영어. 커밋 형식 `타입: 요약` (feat / fix / docs / chore / refactor).
- 사용자와의 대화는 한국어.

## 개발 단계 (PRD 4장 기준) — 진행 상태는 `docs/HISTORY.md` 가 기준
- Phase 1: Next.js 세팅, Prisma 스키마, S3 유틸, TTL cleanup 크론
- Phase 2: 드래그 앤 드롭 업로더 + heic2any, 캔버스 에디터(이어붙이기/크롭/가리기)
- Phase 3: 브라우저 압축 파이프라인 + 서버 sharp 폴백 API, PDF 변환
- Phase 4: 결과 S3 저장 → presigned 다운로드, cleanup 검증, 배포
