@AGENTS.md

# DocuFit - 관공서 제출용 서류 이미지 최적화 툴

PRD 원문: `docs/PRD.md` · 설계 결정과 근거: `docs/architecture.md` · **작업 히스토리: `docs/HISTORY.md`**

## 한 줄 요약
회원가입 없이 HEIC → JPG/PDF 변환, 목표 용량(예: 10MB) 맞춤 압축, 여러 장 이어붙이기, 주민번호 가리기를 제공한다.
민감 서류(신분증, 임대차계약서)를 다루므로 **프라이버시가 기능보다 우선**한다.

---

## 작업 품질 원칙 (최우선 원칙, 사용자 명시)

> 시간과 토큰이 얼마나 들든 **퀄리티가 우선**이다. 꼼꼼하게 만든 코드가 장기적으로 시간과 토큰을 아낀다.
> 숙련된 시니어 개발자처럼 신중하게 작업한다. 빠른 우회, 추측에 기반한 수정, "일단 돌아가게" 는 금지.

1. **수정 전에 끝까지 읽는다.** 고치려는 함수만 보지 않는다. 호출부, 타입 정의, 같은 개념을 다루는 인접 모듈, 관련 문서(`docs/`)까지 읽고 전체 그림을 잡은 뒤에 손댄다.
2. **새 코드보다 재사용을 먼저 찾는다.** 비슷한 로직이 이미 있는지 `src/lib` 를 먼저 검색한다. 같은 로직이 두 곳에 생기면 그 자리에서 공통화한다. 상수는 `src/lib/constants.ts`, 서버 유틸은 `src/lib/*`, 브라우저 이미지 로직은 `src/lib/image/*` 에 모은다.
3. **경계를 명확히 한다.** 순수 로직(변환·계산)은 React 와 분리된 모듈로 두고, 컴포넌트는 상태와 표시만 담당한다. 그래야 테스트·재사용·교체가 쉽다.
4. **입력 검증과 실패 경로를 설계한다.** 모든 외부 입력(파일, 요청, env)은 검증한다. 실패 시 사용자에게 무엇이 왜 안 됐는지 알려 주고, 내부 정보는 노출하지 않는다. 엣지 케이스(빈 파일, 거대 파일, 잘못된 확장자, 중복 업로드, 취소)를 먼저 나열한 뒤 구현한다.
5. **리팩토링과 기능 추가를 섞지 않는다.** 기존 코드를 개선해야 하면 별도 커밋으로 먼저 하고, 그 위에 기능을 얹는다. diff 를 읽는 사람이 의도를 바로 알 수 있어야 한다.
6. **완료 전 자기 리뷰.** `git diff` 를 처음부터 끝까지 다시 읽는다. 이름이 의도를 드러내는가, 주석이 "왜" 를 설명하는가, 죽은 코드·중복·불필요한 any 가 없는가, 타입이 좁은가를 점검한다. 그 다음 `tsc` / `lint` / `build`.
7. **과잉 설계도 금지.** 재사용을 고려하되 지금 필요 없는 추상화, 설정 옵션, 범용 유틸은 만들지 않는다. 두 번째 사용처가 생길 때 추출한다.
8. **모르면 확인한다.** 라이브러리 동작이 불확실하면 `node_modules` 의 타입 정의와 문서를 읽고, 그래도 불확실하면 작은 실험으로 검증한다. 기억에 의존해 API 를 추측하지 않는다.

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
- **pdf-lib 함정:** `save()` 가 Info dict 의 Producer 를 항상 "pdf-lib (...)" 로 덮어쓴다 (`updateMetadata: false` 로도 안 막힘). 우리 표식은 `setCreator` 로만 남긴다. PDF 메타데이터에 원본 파일명을 넣지 않는다.
- **fabric v7 함정:** 객체 기준점 `originX/originY` 기본값이 `center` 다 (v6 까지는 left/top). `left/top` 을 좌상단 좌표로 쓰려면 객체 생성 시 `originX: "left", originY: "top"` 을 명시한다. 배경 이미지가 1/4 만 보이거나 사각형이 어긋나면 이 문제다 (HISTORY 세션 7). 픽셀 좌표 환산은 origin 과 무관한 `getBoundingRect()` 를 쓴다.
- 스키마를 바꾸면 `npx prisma generate` 후 `npx prisma migrate dev --name <설명>`. 마이그레이션 파일은 커밋한다.
- 검증 명령: `npx tsc --noEmit`, `npm run lint`, `npm run build`. 셋 다 통과해야 완료다.
- 셸 명령은 **절대 경로**를 쓴다. `cd` 상태가 호출 간에 유지되어 엉뚱한 곳에 파일이 생긴 전례가 있다 (HISTORY 세션 1).
- 커밋 메시지, 코드 주석, 문서는 한국어. 식별자는 영어. 커밋 형식 `타입: 요약` (feat / fix / docs / chore / refactor).
- 사용자와의 대화는 한국어.

## UI 규칙 (사용자 피드백으로 확정, 세션 12~15)
- **버튼 색·크기는 `src/components/ui/Button.tsx` 에서만 정한다.** 다른 컴포넌트에서 버튼 색 클래스를 직접 쓰지 않는다. 아이콘은 `src/components/ui/icons.tsx` 의 단색 선 아이콘만 쓴다. **이모지 금지** (OS 마다 모양·색이 달라 톤을 깬다).
- **검은 채움 버튼 금지.** 선택 토글은 연한 남색 배경 + 얇은 남색 링(`bg-accent-soft ring-navy/35`), 일반 실행은 남색 그라데이션(primary), 보조는 흰 배경 + 테두리(secondary/ghost).
- **최종 추출 버튼(`hero`)은 화면에 하나만.** 에메랄드→틸 그라데이션, xl 크기. 다른 어떤 요소에도 재사용하지 않는다. 위치는 작업 흐름의 끝인 **오른쪽 패널 하단 액션 바** (설정 → 서류 → 출력, 좌→우).
- **핵심 동작은 숨기지 않는다.** 목표 용량처럼 서비스의 핵심 조작은 항상 노출된 섹션으로 둔다. 기관 프리셋에 흡수했다가 사용자가 "메뉴가 사라졌다" 고 느낀 전례가 있다 (HISTORY 세션 10).
- **패널 제목이 약속한 것은 화면이 보여준다.** "시각적 병합" 이면 배치 미리보기와 결과가 실제로 보여야 한다. 텍스트 안내 카드로 대체하지 않는다 (세션 14).
- **미리보기는 모든 장이 한눈에 보여야 한다.** 가로 병합처럼 옆으로 넘치는 배치는 폭에 맞춰 비율 축소한다. 스크롤 바깥에 편집된 장이 숨어 "편집이 안 됐다" 는 보고를 받은 전례가 있다 (세션 15).
- 라이트 테마 단일. 색 토큰은 `globals.css` `@theme` 에만 정의한다.

## 검증·테스트 규칙
- 기능마다 Chrome 헤드리스(CDP) 스모크로 **실제 브라우저에서** 검증한다. 픽셀이 바뀌는 기능(가리기·모자이크·크롭·병합)은 결과 이미지를 디코딩해 픽셀 값을 확인한다. 화면 텍스트만 보고 통과시키지 않는다.
- 스모크 스크립트·테스트 이미지는 `%TEMP%\docufit-smoke\` 에 둔다 (`.next/` 아래는 `next build` 가 지운다). 이 PC 에만 있으므로 다른 PC 에서는 HISTORY 의 "검증" 절을 보고 재작성한다.
- 실패 집계는 스크립트가 출력하는 `FAILS=` 값을 읽는다. `grep -c '^FAIL'` 은 요약 줄 `FAILS=0` 까지 세어 오판한다 (세션 15).
- JPEG 결과의 픽셀을 검사할 때는 모자이크 블록·영역 **경계를 피해 내부에서** 샘플링한다. 크로마 서브샘플링이 경계 색을 섞는다 (세션 8).
- 스모크 스크립트 파일은 Write 도구로 만들고 문자열 교체는 node 로 한다. Bash 히어독은 백슬래시·한글을 훼손하고 sed 는 UTF-8 이모지를 못 바꾼다 (세션 12).

## React 패턴 (린트 규칙과 충돌한 전례)
- **effect 안에서 동기 setState 금지** (`react-hooks/set-state-in-effect`). 파생 상태는 렌더 중 계산하거나(`find ?? items[0]`), 무효화는 명시적 함수(`changeTarget/forget/reset`)로, 서명 비교(`useMergeExport`)로 처리한다.
- **렌더 중 ref 읽기/쓰기 금지** (`react-hooks/refs`). 해제가 필요한 자원(object URL, fabric 객체)은 ref 레지스트리에 두고 이벤트·콜백에서만 만진다.
- object URL 은 만든 곳이 해제한다. 결과와 수명이 같은 URL 은 결과를 관리하는 훅이 함께 보관·해제한다 (`useMergeExport.previewUrls`, `useSourceImages` 레지스트리).

## 개발 단계 (PRD 4장 기준) — 진행 상태는 `docs/HISTORY.md` 가 기준
- Phase 1: Next.js 세팅, Prisma 스키마, S3 유틸, TTL cleanup 크론
- Phase 2: 드래그 앤 드롭 업로더 + heic2any, 캔버스 에디터(이어붙이기/크롭/가리기)
- Phase 3: 브라우저 압축 파이프라인 + 서버 sharp 폴백 API, PDF 변환
- Phase 4: 결과 S3 저장 → presigned 다운로드, cleanup 검증, 배포
