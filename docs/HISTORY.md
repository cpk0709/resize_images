# 작업 히스토리 (HISTORY)

이 파일은 세션 간 기억을 잇는 **단일 진실 공급원**이다. 어떤 PC 에서든 이 저장소를 pull 하고 Claude Code 를 열면
`scripts/session-context.mjs` 가 아래 "현재 상태" 와 최근 타임라인을 자동으로 읽어 컨텍스트에 넣는다.

작성 규칙은 `CLAUDE.md` 의 "세션 프로토콜" 참고. 요약: **세션마다 타임라인 1개 추가, 현재 상태는 덮어쓰기.**

---

## 현재 상태

- **Phase:** 1 완료 → Phase 2 시작 전
- **빌드 상태:** `tsc` / `lint` / `build` 모두 통과 (2026-09-08)
- **로컬에서 아직 안 한 것:** DB 마이그레이션(`prisma migrate dev --name init`), S3 자격증명 연결
- **원격 저장소:** `https://github.com/cpk0709/resize_images.git` (origin, 브랜치 main)

## 다음 할 일 (우선순위 순)

1. Phase 2-1: `src/components/Uploader.tsx` 드래그 앤 드롭 + 파일 선택. HEIC 는 확장자로도 감지해 `heic2any` 지연 로드로 JPEG 변환
2. Phase 2-2: `src/lib/image/compress.ts` 브라우저 캔버스 재인코딩으로 목표 용량 맞추기 (quality 이진 탐색 → 해상도 0.85배 축소)
3. Phase 2-3: 결과를 `<a download>` 로 즉시 저장. 여기까지 네트워크 요청 0건
4. Phase 2-4: fabric 에디터 (세로/가로 이어붙이기, 크롭, 검은 박스 가리기), pdf-lib 병합

## 미결 결정 (사용자 답 필요)

| 질문 | 기본 가정 (답 없으면 이렇게 진행) |
|---|---|
| 서버 sharp 폴백 경로를 MVP 에 포함할까? | 포함하지 않음. 브라우저 전용으로 먼저 완성 |
| 배포 대상은? (Vercel+S3 / Cloudflare+R2 / 자체 서버+MinIO) | 미정. 크론 간격 제약이 달라지므로 Phase 4 전에 결정 |

---

## 타임라인 (최신이 위)

### 2026-09-08 · 세션 2 · 협업 하네스 구축
- **한 것:** `docs/HISTORY.md` 신설. `scripts/session-context.mjs` + `.claude/settings.json` SessionStart 훅으로 세션 시작 시 히스토리 자동 주입. `/wrap-up` 스킬(세션 마무리 절차) 추가. CLAUDE.md 에 세션 프로토콜과 그라운드 룰 보강. 첫 커밋.
- **결정:** 히스토리는 파일 하나(`docs/HISTORY.md`)로 관리. "현재 상태" 는 덮어쓰고 "타임라인" 은 append. 세션 종료는 `/wrap-up` 으로 통일.
- **다음:** Phase 2-1 업로더부터.

### 2026-09-08 · 세션 1 · Phase 1 초기 세팅
- **한 것:** Next.js 16 + TS + Tailwind v4 스캐폴딩. Prisma 7 스키마(`FileAsset`, `CleanupRun`), `getPrisma()` lazy 싱글턴, zod 환경변수 검증, S3 유틸(SSE 암호화 업로드 / presigned 다운로드 / 일괄 삭제), TTL cleanup 로직과 `/api/cron/cleanup` 라우트, 보안 헤더, 한국어 랜딩. `docs/PRD.md`, `docs/architecture.md`, `README.md` 작성.
- **결정:** 브라우저 우선 처리(파일이 기기를 떠나지 않음)를 기본 경로로, 서버 sharp+S3 는 폴백으로. TTL 60분은 코드 상한으로 고정. S3 Lifecycle 은 하루 단위라 안전망일 뿐, 1차 보장은 10분 간격 크론.
- **문제/해결:** (1) Bash 도구의 cwd 가 유지되어 `prisma init` 이 `node_modules` 안에서 실행됨 → 정리 후 루트에서 재실행. 이후 절대 경로만 사용. (2) `db.ts` 가 import 시점에 env 를 읽어 `next build` 실패 → lazy `getPrisma()` 로 변경. (3) prisma 가 설치한 에이전트 스킬 링크가 깨져 제거.
- **검증:** `tsc --noEmit`, `eslint`, `next build` 통과. DB/S3 는 자격증명이 없어 미검증.
