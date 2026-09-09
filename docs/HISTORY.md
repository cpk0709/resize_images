# 작업 히스토리 (HISTORY)

이 파일은 세션 간 기억을 잇는 **단일 진실 공급원**이다. 어떤 PC 에서든 이 저장소를 pull 하고 Claude Code 를 열면
`scripts/session-context.mjs` 가 아래 "현재 상태" 와 최근 타임라인을 자동으로 읽어 컨텍스트에 넣는다.

작성 규칙은 `CLAUDE.md` 의 "세션 프로토콜" 참고. 요약: **세션마다 타임라인 1개 추가, 현재 상태는 덮어쓰기.**

---

## 현재 상태

- **Phase:** 2-2 완료, 스튜디오 UI 적용, **2-4 에디터 완료** (세션 7~8: 단색 박스 색상 선택, 모자이크 실시간 미리보기, 크롭, 회전 시 영역 유지, 원본 복원) → Phase 2-3(이어붙이기·PDF) 시작 전.
- **UI 기준:** `docs/design/studio-concept-v1.png` (Gemini 시안). 3열 스튜디오(전폭 반응형): 컨트롤 패널 / 편집 캔버스(드롭존·카드 덱) / 미리보기·편집 패널(병합만 준비 중 표시). 라이트 테마 단일.
- **빌드 상태:** `tsc` / `lint` / `build` 통과 (2026-09-09 세션 8). Chrome 헤드리스(CDP) 스모크: 스튜디오 19개 + 에디터 30개 체크 통과. HEIC 실파일 테스트는 미완 (사용자가 나중에 아이폰 사진으로 확인 예정)
- **스모크 테스트 자산 위치:** `%TEMP%\docufit-smoke\` (cdp-compress.mjs, cdp-studio.mjs, cdp-editor.mjs, 테스트 이미지). `.next/` 아래에 두면 `next build` 가 지운다.
- **로컬에서 아직 안 한 것:** DB 마이그레이션(`prisma migrate dev --name init`), S3 자격증명 연결. 로컬 `.env` 에는 CRON_SECRET 만 채워져 있음
- **프로덕션에서 재확인할 것:** `Cache-Control: no-store` 헤더 (dev 모드에서는 Next 가 덮어써 확인 불가)
- **원격 저장소:** `https://github.com/cpk0709/resize_images.git` (origin, 브랜치 main)

## 다음 할 일 (우선순위 순)

Phase 2 는 **서버 없이 브라우저만으로** 핵심 흐름을 완성한다. 각 소단계가 끝나면 로컬에서 직접 눌러볼 수 있어야 한다.

1. **HEIC 실파일 검증** 아이폰 사진(HEIC)을 실제로 올려 변환·썸네일·"HEIC → JPG 변환됨" 배지를 확인. 실패 시 `src/lib/image/heic.ts` 부터 본다.
2. **Phase 2-3 이어붙이기** 카드 덱 순서(드래그 정렬은 이미 가능) → 세로/가로 병합 → 하나의 이미지 또는 PDF(pdf-lib) 내보내기. 미리보기 패널의 "세로/가로 병합" 자리에 들어간다. 완료 기준: 계약서 3장 → PDF 1개.
3. **에디터 후속(선택)** 창 크기 변경 시 캔버스 재배치, 모자이크 블록 크기 조절, A4 비율 크롭 프리셋.
4. **Phase 3 서버 폴백 (선택)** 캔버스 한계 초과 시 동의 후 가리기 끝난 결과만 sharp 로 압축, S3 + 10분 presigned + 60분 파기. 미결 결정 1 에 따라 Phase 2 출시 후로 미룰 수 있음.
5. **Phase 4 배포** 배포 대상 결정, 프로덕션 `no-store` 확인, 개인정보처리방침 페이지, 접속 로그 보관 정책, (폴백 사용 시) 크론 실동작 검증 + S3 Lifecycle.

## 미결 결정 (사용자 답 필요)

| 질문 | 기본 가정 (답 없으면 이렇게 진행) |
|---|---|
| 서버 sharp 폴백 경로를 MVP 에 포함할까? | 포함하지 않음. 브라우저 전용으로 먼저 완성 |
| 배포 대상은? (Vercel+S3 / Cloudflare+R2 / 자체 서버+MinIO) | 미정. 크론 간격 제약이 달라지므로 Phase 4 전에 결정 |
| 제출처 프리셋 수치(정부24 10MB, 대법원 10MB, 홈택스 5MB)의 공식 근거 확정 | 검색 결과가 상충해 보수값 적용, `verified: false` 로 UI 에 "참고" 표시. 사용자가 실제 민원 화면에서 확인해 주면 `src/lib/presets.ts` 갱신 |
| 다크 모드 지원 여부 | 시안이 라이트 전용이라 라이트 단일로 정리. 요청 시 토큰만 추가하면 됨 |

---

## 타임라인 (최신이 위)

### 2026-09-09 · 세션 8 · 에디터 개선 (색상 선택, 회전 시 영역 유지, 모자이크 실시간 미리보기)
- **한 것:** (1) 단색 박스 색상 컬러피커 (`<input type="color">`, 선택된 박스 색도 즉시 변경). `MaskRegion` 을 `{style:"solid", color} | {style:"mosaic"}` 유니언으로. (2) 회전 시 그려둔 영역 유지: `rotateRegion()` 으로 이미지 px 좌표를 변환해 새 캔버스에 다시 그림(크롭 영역 포함). (3) 모자이크 사각형을 fabric `Pattern` 으로 채워 실제 픽셀화 결과를 편집 중에 표시. 옮기거나 크기를 바꾸면 그 자리 기준으로 재계산, `object:modified` 에서 scaleX/Y 를 width/height 로 정규화해 패턴이 늘어나지 않게. 최종 적용과 미리보기가 같은 `renderMosaic()` 을 써서 "보이는 대로 저장". (4) 적용 시 영역 좌표를 `console.debug` 로 남김(이미지 내용 없음).
- **결정:** 모자이크 미리보기는 정확성을 위해 실제 알고리즘을 그대로 실행한다(영역이 작아 비용 미미). 색상은 단색 박스에만 적용(모자이크는 색 개념 없음).
- **문제/해결:** 모자이크 검사가 실패해 30분간 원인 추적 → 알고리즘은 정상이었고, 스모크의 샘플 좌표(0.2 + 블록 2개 = 0.4)가 정확히 모자이크 블록 경계에 놓여 JPEG 4:2:0 크로마 서브샘플링이 인접 블록 색을 섞은 것. 검사 좌표를 블록 내부로 옮겨 해결. 교훈: 손실 압축 결과를 픽셀 단위로 검증할 때는 블록 경계를 피할 것.
- **검증(cdp-editor.mjs 30 체크):** 빨강(#ff0000) 박스 그린 뒤 ↻ 90° → 영역 유지 → 적용 → 480×640 결과에서 회전된 위치가 빨강, 바깥 파랑. 원본 복원. 크롭 320×478. 노이즈 사진 모자이크 → 블록 내부 인접 픽셀 동일, 바깥은 노이즈 유지. 브라우저 오류 0. `tsc`/`lint`/`build` 통과.
- **다음:** Phase 2-3 이어붙이기.

### 2026-09-09 · 세션 7 · 전폭 반응형 레이아웃 + Phase 2-4 에디터(가리기·모자이크·크롭·회전)
- **한 것:** (1) 레이아웃: 최대 폭 제거, 3열 비율 340px/1fr/1.15fr, 미리보기 상자 높이 clamp(320px,62vh,1000px)·이미지 상한 `min(100%, 원본)`, 카드 덱 auto-fill 그리드. (2) 리팩토링 커밋: 캔버스 헬퍼를 `src/lib/image/canvas.ts` 로 추출. (3) `src/lib/image/edit.ts` 순수 편집 로직(회전 → 가리기(black/mosaic) → 크롭, 좌표는 회전 후 이미지 px). (4) `useSourceImages.replaceImage/restoreOriginal` + `UploadItem.edited`, 첫 편집 전 픽셀을 레지스트리에 보관. (5) `src/components/editor/ImageEditor.tsx` fabric v7 동적 import, 드래그로 사각형 생성 후 선택 도구로 자동 전환, Delete 삭제, 90° 회전은 즉시 작업 이미지에 적용(영역 초기화), "적용" 시 `getBoundingRect()`→이미지 px 환산. (6) PreviewPanel 보기/편집 모드, 카드 [가리기][크롭] 칩 활성, 편집됨 배지, 원본 복원, 편집 후 압축 결과 무효화.
- **결정:** (1) 사용자 요청으로 2-4(에디터)를 2-3(병합)보다 먼저. (2) 픽셀 변경은 fabric 이 아니라 `edit.ts` 가 전담. fabric 은 "어디를" 정하는 UI 만. 서버(sharp) 이식·재현성 때문. (3) 모자이크 블록은 짧은 변의 1/6, 최소 12px. 식별 정보는 검은 박스 권장을 힌트로 표시. (4) 회전은 즉시 적용 방식. 좌표계가 바뀌므로 그려둔 영역은 지운다고 안내. (5) 편집 중간 결과는 JPEG 0.97(PNG 원본은 PNG).
- **문제/해결:** (1) fabric v7 은 `originX/originY` 기본값이 center (CHANGELOG BREAKING #10715) → 배경 이미지가 1/4 만 보이고 사각형이 어긋남 → 배경·사각형에 left/top 명시. CLAUDE.md 작업 규칙에 기록. (2) `drawRotated` 가 translate/rotate 변환을 되돌리지 않아 이어서 그린 `fillRect` 가 중심만큼 밀림 → save/restore. 크롭은 새 캔버스를 써서 영향 없었음. (3) 에디터 키 핸들러 effect 가 `removeSelected` 선언 전에 참조 → 순서 재배치. (4) python3 헤어독이 Windows 스토어 스텁에서 멈춤 → node 로 대체.
- **검증(Chrome 헤드리스, cdp-editor.mjs, 실제 마우스 이벤트):** 640×480 파랑 PNG 에 가리기 영역 드래그 → 적용 → 영역 내부 픽셀 검정, 외부 파랑 유지. 크롭 왼쪽 절반 → 320×478. 회전 90° → 478×320. 원본 복원 → 640×480, 편집됨 배지 제거. 브라우저 오류 0. 스튜디오 스모크 19개도 통과. `tsc`/`lint`/`build` 통과.
- **다음:** Phase 2-3 이어붙이기.

### 2026-09-08 · 세션 6 · 스튜디오 UI 리디자인 (Gemini 시안 적용)
- **한 것:** 시안 `docs/design/studio-concept-v1.png` 를 저장소에 보관. `globals.css` 디자인 토큰(navy/pass/warn/fail/surface, 라이트 단일). `src/lib/presets.ts` 제출처 프리셋(정부24·대법원·홈택스·직접 설정, `verified` 플래그). 새 컴포넌트 `src/components/studio/{Studio,ControlPanel,PresetList,SizeMeter,CardDeck,PreviewPanel}.tsx`. `useSourceImages.move()` 순서 변경(HTML5 드래그 + ◀▶ 버튼 키보드 경로). `Dropzone` 은 파일 드래그(`Files`)에만 반응하도록 수정하고 클릭 영역 전체·키보드 열기 지원. `page.tsx` 헤더(배지)/3열 grid/푸터. 구 `Uploader`, `ImageList`, `CompressPanel` 삭제.
- **결정:** (1) 신호등은 "가장 큰 파일 1장" 기준. 제한이 파일당이므로 그 한 장이 통과하면 전부 통과. 눈금 끝은 기준선 2배와 현재값 중 큰 쪽. (2) 프리셋 수치는 보수값 + "참고" 배지. 근거 없는 수치를 확정처럼 보이게 하지 않는다. (3) 병합·가리기 도구는 UI 자리만 잡고 "준비 중" 표시. 동작하지 않는 버튼을 살아 있는 것처럼 두지 않는다. (4) 선택 카드는 상태로 동기화하지 않고 렌더 시 `find ?? items[0]` 로 결정. (5) 라이트 테마 단일.
- **문제/해결:** 카드 드래그가 드롭존을 하이라이트하는 간섭 → 드롭존은 `dataTransfer.types` 에 `Files` 가 있을 때만 반응, 카드는 커스텀 타입 `application/x-docufit-card`. 프리셋 이름이 잘려 보임 → 두 줄 레이아웃. 작은 이미지가 미리보기에서 과확대 → 원본 크기 상한.
- **검증(Chrome 헤드리스, cdp-studio.mjs 19 체크):** 헤더/프리셋/빈 신호등/초기 비활성 버튼, 3장 업로드, 홈택스 선택 시 기준선 5MB·"초과 · 최적화 필요", 최적화 후 "통과 (합격)"·"3장 중 3장 통과", ▶ 버튼 순서 교체, 합성 DragEvent 로 3→1 이동, 카드 선택 시 미리보기 반영, 3장 일괄 다운로드(5,217,083B ≤ 5MiB), 브라우저 오류 0. `tsc`/`lint`/`build` 통과.
- **다음:** Phase 2-3 이어붙이기(카드 덱 순서 → 세로/가로 병합 → 이미지/PDF). 미리보기 패널의 "세로/가로 병합" 자리에 들어간다.

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
