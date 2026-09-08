# 작업 히스토리 (HISTORY)

이 파일은 세션 간 기억을 잇는 **단일 진실 공급원**이다. 어떤 PC 에서든 이 저장소를 pull 하고 Claude Code 를 열면
`scripts/session-context.mjs` 가 아래 "현재 상태" 와 최근 타임라인을 자동으로 읽어 컨텍스트에 넣는다.

작성 규칙은 `CLAUDE.md` 의 "세션 프로토콜" 참고. 요약: **세션마다 타임라인 1개 추가, 현재 상태는 덮어쓰기.**

---

## 현재 상태

- **Phase:** 2-2(목표 용량 압축) 완료 → Phase 2-3(이어붙이기·PDF) 시작 전. **핵심 사용 사례(HEIC/대용량 → 10MB 이하 JPG 다운로드)가 동작하는 상태.**
- **빌드 상태:** `tsc` / `lint` / `build` 통과 (2026-09-08 세션 5). Chrome 헤드리스(CDP) 스모크로 업로드→압축→다운로드 검증. HEIC 실파일 테스트는 미완 (사용자가 나중에 아이폰 사진으로 확인 예정)
- **스모크 테스트 자산 위치:** `%TEMP%\docufit-smoke\` (cdp-compress.mjs, 테스트 이미지). `.next/` 아래에 두면 `next build` 가 지운다.
- **로컬에서 아직 안 한 것:** DB 마이그레이션(`prisma migrate dev --name init`), S3 자격증명 연결. 로컬 `.env` 에는 CRON_SECRET 만 채워져 있음
- **프로덕션에서 재확인할 것:** `Cache-Control: no-store` 헤더 (dev 모드에서는 Next 가 덮어써 확인 불가)
- **원격 저장소:** `https://github.com/cpk0709/resize_images.git` (origin, 브랜치 main)

## 다음 할 일 (우선순위 순)

Phase 2 는 **서버 없이 브라우저만으로** 핵심 흐름을 완성한다. 각 소단계가 끝나면 로컬에서 직접 눌러볼 수 있어야 한다.

1. **HEIC 실파일 검증** 아이폰 사진(HEIC)을 실제로 올려 변환·썸네일·"HEIC → JPG 변환됨" 배지를 확인. 실패 시 `src/lib/image/heic.ts` 부터 본다.
2. **Phase 2-3 이어붙이기** 순서 드래그 정렬, 세로/가로, 하나의 이미지 또는 PDF(pdf-lib) 내보내기. 완료 기준: 계약서 3장 → PDF 1개.
4. **Phase 2-4 에디터** fabric 캔버스로 크롭, 검은 박스 가리기, 모자이크 브러시. 완료 기준: 주민번호 가린 신분증 내보내기.
5. **Phase 3 서버 폴백 (선택)** 캔버스 한계 초과 시 동의 후 가리기 끝난 결과만 sharp 로 압축, S3 + 10분 presigned + 60분 파기. 미결 결정 1 에 따라 Phase 2 출시 후로 미룰 수 있음.
6. **Phase 4 배포** 배포 대상 결정, 프로덕션 `no-store` 확인, 개인정보처리방침 페이지, 접속 로그 보관 정책, (폴백 사용 시) 크론 실동작 검증 + S3 Lifecycle.

## 미결 결정 (사용자 답 필요)

| 질문 | 기본 가정 (답 없으면 이렇게 진행) |
|---|---|
| 서버 sharp 폴백 경로를 MVP 에 포함할까? | 포함하지 않음. 브라우저 전용으로 먼저 완성 |
| 배포 대상은? (Vercel+S3 / Cloudflare+R2 / 자체 서버+MinIO) | 미정. 크론 간격 제약이 달라지므로 Phase 4 전에 결정 |

---

## 타임라인 (최신이 위)

### 2026-09-08 · 세션 5 · Phase 2-2 목표 용량 압축 구현
- **한 것:** `src/lib/image/compress.ts` (긴 변 4000px 상한 → JPEG quality [0.4, 0.95] 이진 탐색 → 실패 시 0.85배 축소 반복, 최소 긴 변 600px, OffscreenCanvas 우선·`<canvas>` 폴백, AbortSignal 취소, 항상 재인코딩해 EXIF 제거). `src/lib/image/download.ts` (`<a download>`, 파일명 `원본_docufit.ext`). `src/hooks/useCompression.ts` (순차 실행, 옵션 변경 시 결과 무효화, `forget/reset` 으로 Blob 해제). UI `src/components/compress/{CompressPanel,CompressionResultLine}.tsx`. `ImageList` 에 `renderExtra` 슬롯, `useSourceImages.readyImages` 를 useMemo 로. 상수 `TARGET_SIZE_MIN_MB/MAX_MB`, 타입 `RasterFormat`.
- **결정:** (1) 결과 무효화·해제를 effect 가 아니라 명시적 함수(`changeTarget`, `forget`, `reset`)로. effect 내 setState 는 React 훅 린트에 걸리고 시점이 불명확. (2) 원본이 목표 이하여도 항상 재인코딩: EXIF(GPS 등) 제거가 부수 목적. (3) 실행은 명시적 "최적화 시작" 버튼. 옵션 바꿀 때마다 자동 재압축하면 저사양 기기 부담. (4) 알고리즘 튜닝 상수는 `compress.ts` 안에 둠(사용처 하나). 전역 constants 로 올리지 않음.
- **문제/해결:** `.next/smoke/` 에 둔 테스트 이미지가 `next build` 로 0바이트가 되어 스모크가 "빈 파일" 로 실패 → 자산과 스크립트를 `%TEMP%\docufit-smoke\` 로 이동. `OffscreenCanvas` 미지원 브라우저에서 `instanceof` 가 ReferenceError 를 내는 코드 → `typeof` 가드 추가.
- **검증(Chrome 헤드리스):** 10MB 노이즈 JPEG(최악 케이스) → 2MB 목표: 3400×2550, 품질 41, 2,076,186B (≤ 2MiB). 10MB 목표: 원본 해상도 유지, 품질 93. PNG 2MB 목표: 926×695 로 축소해 1.79MB. 3장 일괄 다운로드 파일 크기 전부 목표 이하. 브라우저 오류 0. 각 시나리오 1.6~2.1초. `tsc`/`lint`/`build` 통과.
- **다음:** Phase 2-3 이어붙이기(순서 정렬, 세로/가로, 이미지·PDF 내보내기). HEIC 실파일 확인은 사용자 몫.

### 2026-09-08 · 세션 4 · Phase 2-1 업로더 구현
- **한 것:** 순수 로직 `src/lib/image/{errors,types,detect,heic,decode,ingest}.ts` (형식 판별은 매직 바이트 우선, HEIC 는 `heic2any` 동적 import, 디코딩은 `createImageBitmap` + EXIF 회전 반영, `<img>` 폴백). 상태 훅 `src/hooks/useSourceImages.ts` (순차 큐, 중복·개수 제한, object URL 해제 레지스트리). UI `src/components/uploader/{Dropzone,ImageList,Uploader}.tsx`. `src/lib/format.ts` (formatBytes). 상수 `ACCEPT_ATTRIBUTE`, `MAX_INPUT_FILE_BYTES`(100MB), `MAX_INPUT_FILES`(30). 랜딩 페이지에 업로더 연결.
- **결정:** (1) 파일 형식은 `file.type` 이 아니라 매직 바이트로 확정 (Windows 는 HEIC MIME 을 안 줌, 확장자는 거짓일 수 있음). (2) HEIC 변환은 CPU/메모리 피크가 커서 병렬 대신 순차 큐. (3) 렌더용 상태(useReducer)와 해제 필요한 자원(ref 레지스트리)을 분리. react-hooks/refs 규칙(렌더 중 ref 쓰기 금지)에 걸려 미러링 방식을 버림. (4) 사용자 입력 오류(빈 파일, 미지원 형식)는 console.warn, 변환·디코딩 실패는 console.error.
- **문제/해결:** 브라우저 자동화 도구가 없어 Chrome 헤드리스를 CDP(WebSocket)로 직접 조작하는 임시 스크립트(`.next/smoke/cdp.mjs`, 미커밋) 작성. sharp 로 테스트 이미지 생성(10MB JPEG, PNG, PNG 인데 .jpg, EXIF orientation 6, 빈 파일, txt).
- **검증:** 6종 파일 업로드 → 4장 준비/2장 오류 메시지 정확, 거짓 확장자 PNG 정상 디코딩, EXIF 회전 반영(800×600 → 600×800 표시), 중복 재추가 거절 알림, 제거 버튼 동작, 브라우저 콘솔 오류 0. `tsc`/`lint`/`build` 통과. **HEIC 실파일은 미검증.**
- **다음:** HEIC 실파일 확인 후 Phase 2-2 압축.

### 2026-09-08 · 세션 3 · 로컬 실행 검증, 크론 인증 결함 수정, 품질 원칙·개발 계획 확정
- **한 것:** 첫 커밋을 `origin/main` 에 push (git 신원은 저장소 로컬 설정). `next dev` 로컬 실행 후 curl 로 랜딩·보안 헤더·크론 인증 검증. `src/app/api/cron/cleanup/route.ts` 수정. CLAUDE.md 에 "작업 품질 원칙" 8개 항목 추가. Phase 2~4 세부 계획을 "다음 할 일" 에 확정.
- **결정:** (1) 품질 > 시간·토큰. 시니어 개발자처럼 기존 코드를 끝까지 읽고 재사용·리팩토링을 우선하며 자기 리뷰 후 완료 (사용자 명시). (2) Phase 2 는 서버 없이 브라우저만으로 완성하고, 서버 폴백은 그 뒤. (3) 법적으로 변환 파일 보관 의무는 없고 오히려 파기 의무(개인정보보호법 21조)와 주민등록번호 처리 금지(24조의2)가 있어, "가리기 후에만 서버 전송" 원칙이 법적으로도 유리함을 확인. 접속 로그 보관 정책은 Phase 4 에서.
- **문제/해결:** 크론 라우트가 인증 전에 `getEnv()` 를 호출해 S3 설정이 비면 미인증 요청에도 500 을 반환 → `CRON_SECRET` 만 직접 비교해 항상 401, 설정 오류 503, 실행 실패 500 으로 분리. 상세 오류는 서버 로그에만. push 시 자격 증명 관리자에 다른 GitHub 계정이 캐시되어 403 → 원격 URL 에 `cpk0709@` 를 넣어 계정별 인증으로 해결.
- **검증:** 401/401/503 흐름 curl 확인. `tsc`, `lint` 통과.
- **다음:** Phase 2-1 업로더.

### 2026-09-08 · 세션 2 · 협업 하네스 구축
- **한 것:** `docs/HISTORY.md` 신설. `scripts/session-context.mjs` + `.claude/settings.json` SessionStart 훅으로 세션 시작 시 히스토리 자동 주입. `/wrap-up` 스킬(세션 마무리 절차) 추가. CLAUDE.md 에 세션 프로토콜과 그라운드 룰 보강. 첫 커밋.
- **결정:** 히스토리는 파일 하나(`docs/HISTORY.md`)로 관리. "현재 상태" 는 덮어쓰고 "타임라인" 은 append. 세션 종료는 `/wrap-up` 으로 통일.
- **다음:** Phase 2-1 업로더부터.

### 2026-09-08 · 세션 1 · Phase 1 초기 세팅
- **한 것:** Next.js 16 + TS + Tailwind v4 스캐폴딩. Prisma 7 스키마(`FileAsset`, `CleanupRun`), `getPrisma()` lazy 싱글턴, zod 환경변수 검증, S3 유틸(SSE 암호화 업로드 / presigned 다운로드 / 일괄 삭제), TTL cleanup 로직과 `/api/cron/cleanup` 라우트, 보안 헤더, 한국어 랜딩. `docs/PRD.md`, `docs/architecture.md`, `README.md` 작성.
- **결정:** 브라우저 우선 처리(파일이 기기를 떠나지 않음)를 기본 경로로, 서버 sharp+S3 는 폴백으로. TTL 60분은 코드 상한으로 고정. S3 Lifecycle 은 하루 단위라 안전망일 뿐, 1차 보장은 10분 간격 크론.
- **문제/해결:** (1) Bash 도구의 cwd 가 유지되어 `prisma init` 이 `node_modules` 안에서 실행됨 → 정리 후 루트에서 재실행. 이후 절대 경로만 사용. (2) `db.ts` 가 import 시점에 env 를 읽어 `next build` 실패 → lazy `getPrisma()` 로 변경. (3) prisma 가 설치한 에이전트 스킬 링크가 깨져 제거.
- **검증:** `tsc --noEmit`, `eslint`, `next build` 통과. DB/S3 는 자격증명이 없어 미검증.
