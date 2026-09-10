# 작업 히스토리 (HISTORY)

이 파일은 세션 간 기억을 잇는 **단일 진실 공급원**이다. 어떤 PC 에서든 이 저장소를 pull 하고 Claude Code 를 열면
`scripts/session-context.mjs` 가 아래 "현재 상태" 와 최근 타임라인을 자동으로 읽어 컨텍스트에 넣는다.

작성 규칙은 `CLAUDE.md` 의 "세션 프로토콜" 참고. 요약: **세션마다 타임라인 1개 추가, 현재 상태는 덮어쓰기.**

---

## 현재 상태

- **Phase:** **Phase 2 전체 완료** (세션 9: 2-3 이어붙이기·PDF). 업로드 → 편집(가리기·크롭·회전) → 출력(파일별 JPG/PNG, 세로/가로 이어붙이기, 페이지별 PDF) 이 모두 브라우저 안에서 동작한다. 다음은 Phase 4 배포 준비 (Phase 3 서버 폴백은 미결 결정 1 대로 보류).
- **UI 기준:** `docs/design/studio-concept-v2.png` (세션 20, "전문 디자인팀" 시안) + 사용자 피드백. 브랜드 파랑 단일(#2563eb), 라이트 테마. 데스크톱(xl) 앱 셸: 상단 앱 바 → 사이드바(프리셋·최적화 설정·용량 확인·설정 초기화) / 서류 업로드·편집(드롭존·카드 덱·기능 안내 3칸) / 미리보기·최적화 결과(3×2 수치 카드)·최종 버튼 → 하단 상태 바 → 푸터. 각 패널이 안에서 스크롤. **모바일 1열: 서류 추가 → 설정(가로 스크롤 프리셋) → 미리보기, 최종 버튼은 화면 하단 고정.** 버튼은 `src/components/ui/Button.tsx`, 아이콘은 `src/components/ui/icons.tsx` 만 사용. 글꼴 Inter + Noto Sans KR(next/font 자체 배포).
- **빌드 상태:** `tsc` / `lint` / `build` 통과 (2026-09-10 세션 20). Chrome 헤드리스(CDP) 스모크: 스튜디오 29 + 에디터 30 + 병합/PDF 37 + 병합 중 편집 23 + 모바일 15 + 에디터 확대 53 체크 통과 (세션 20 에서 새 라벨에 맞춰 스크립트 갱신). 실패 집계는 스크립트가 출력하는 `FAILS=` 값을 읽는다 (`grep -c '^FAIL'` 은 요약 줄까지 센다). HEIC 실파일 테스트는 미완 (사용자가 나중에 아이폰 사진으로 확인 예정)
- **스모크 테스트 자산 위치:** `%TEMP%\docufit-smoke\` (cdp-studio.mjs, cdp-editor.mjs, cdp-merge.mjs, cdp-merge-edit.mjs, cdp-mobile.mjs, cdp-zoom.mjs, 디자인 스크린샷용 cdp-shots.mjs, 테스트 이미지). `.next/` 아래에 두면 `next build` 가 지운다. 이 PC 에만 있으므로 다른 PC 에서는 HISTORY 의 검증 절을 참고해 재작성해야 한다.
- **로컬에서 아직 안 한 것:** DB 마이그레이션(`prisma migrate dev --name init`), S3 자격증명 연결. 로컬 `.env` 에는 CRON_SECRET 만 채워져 있음
- **프로덕션 헤더:** `next start` 로 실측 완료 (세션 11) — `no-store`, `nosniff`, `DENY`, `no-referrer` 적용. 실서비스 URL 에서 한 번 더 확인할 것.
- **원격 저장소:** `https://github.com/cpk0709/resize_images.git` (origin, 브랜치 main)
- **정식 배포(진행 중, 세션 21):** **EC2** 로 결정(사용자). 저장소 쪽 준비 완료 — `output: "standalone"`, `npm run build:standalone`, `deploy/ec2/{setup.sh,release.sh,docufit.service,cleanup 타이머}`, `deploy/nginx/docufit.conf`, `.github/workflows/deploy-ec2.yml`(변수 `EC2_DEPLOY_ENABLED=true` 일 때만 실행). **사용자 쪽 남은 일:** 인스턴스 생성 → `setup.sh` → 배포 키·Secrets 등록 → 도메인 A 레코드 → `setup.sh --domain`. 절차는 README "배포 (EC2, 정식)".
- **임시 배포(운영 중):** GitHub Pages **https://cpk0709.github.io/resize_images/** — main push 마다 `.github/workflows/deploy-pages.yml` 이 정적 export(`npm run build:pages`)를 배포(약 1~2분). 2026-09-10 세션 17 에 첫 배포 성공, 실배포 주소에서 전 스모크 통과. 정적 호스팅이라 보안 헤더 미적용, 서버 라우트 없음. 정식 배포는 Vercel 예정.

## 다음 할 일 (우선순위 순)

Phase 2 는 **서버 없이 브라우저만으로** 핵심 흐름을 완성한다. 각 소단계가 끝나면 로컬에서 직접 눌러볼 수 있어야 한다.

1. **SEO 최적화** (사용자 지시, 2026-09-10; 파비콘은 세션 18 완료, 세션 20 에서 브랜드 파랑으로 재생성) — 대상: 관공서·은행 사이트에 서류 사진을 올리다 용량·확장자 제한에 막힌 사람. 할 일: manifest(`manifest.ts`, force-static, basePath 주의), 한국어 검색 의도에 맞는 title·description·키워드(예: "정부24 첨부파일 용량 초과", "HEIC JPG 변환", "전입신고 서류 사진 10MB", "이미지 용량 줄이기 무료"), Open Graph·Twitter 카드 이미지, `robots.txt`·`sitemap.xml`(`app/robots.ts`, `app/sitemap.ts` — 정적 export 에서는 `dynamic = "force-static"` 필요), JSON-LD(WebApplication/FAQ), 랜딩 본문에 검색 의도를 담은 설명·FAQ 섹션(프라이버시 강조), `metadataBase` = **https://cpk0709.github.io/resize_images**(basePath 포함 주의)·canonical, `lang="ko"`.
2. **EC2 정식 배포 실행** (사용자 결정, 세션 21) — 사용자: **새** 인스턴스 생성(서울, 기본 VPC 퍼블릭 서브넷, Ubuntu 24.04 x86_64, t3.micro/small, 탄력적 IP; 이전 medi 인스턴스는 프라이빗 서브넷이라 불가) → 로컬 `~/.ssh/docufit-ec2.pub` 를 `authorized_keys` 에 등록 → `sudo bash deploy/ec2/setup.sh` → 배포 키 + Secrets(EC2_HOST/EC2_USER/EC2_SSH_KEY) + 변수 `EC2_DEPLOY_ENABLED=true` → push 로 첫 배포 → 도메인 구매·A 레코드 → `setup.sh --domain --email`. 그 뒤: `curl -sI https://<도메인>/ | grep -i cache-control` 로 `no-store` 확인, `src/app/privacy/page.tsx` 3절에 "AWS 서울 EC2 · nginx 접속 로그 보관 기간" 기입, GitHub Pages 워크플로 유지 여부 결정, `metadataBase` 를 새 도메인으로.
3. **HEIC 실파일 검증** 아이폰 사진(HEIC)을 실제로 올려 변환·썸네일·"HEIC → JPG 변환됨" 배지를 확인. 실패 시 `src/lib/image/heic.ts` 부터 본다.
4. **품질 후속(선택)** 병합 진행률 표시(현재는 스피너 문구만), 에디터 창 크기 변경 시 캔버스 재배치, 에디터 핀치 줌·휠 줌(현재는 +/− 버튼만), 모자이크 블록 크기 조절, A4 비율 크롭 프리셋, PDF 페이지 여백 옵션.
5. **Phase 3 서버 폴백 (선택)** 캔버스 한계 초과 시 동의 후 가리기 끝난 결과만 sharp 로 압축, S3 + 10분 presigned + 60분 파기(EC2 에서는 `docufit-cleanup.timer` 활성화 + S3 Lifecycle). 미결 결정 1 에 따라 Phase 2 출시 후로 미룰 수 있음.

## 미결 결정 (사용자 답 필요)

| 질문 | 기본 가정 (답 없으면 이렇게 진행) |
|---|---|
| 서버 sharp 폴백 경로를 MVP 에 포함할까? | 포함하지 않음. 브라우저 전용으로 먼저 완성 |
| 배포 대상은? (Vercel+S3 / Cloudflare+R2 / 자체 서버+MinIO) | 기본 가정 **Vercel Hobby** (Phase 2 는 서버 의존 없음, 크론 매일 1회). 서버 경로(Phase 3)를 켤 때 Pro 또는 외부 스케줄러 재검토 |
| 제출처 프리셋 기본 수치(정부24 10MB, 대법원 10MB, 홈택스 5MB)의 공식 근거 확정 | 검색 결과가 상충해 보수값 적용, `verified: false` 로 UI 에 "참고" 표시. 사용자는 목표 용량 섹션에서 언제든 덮어쓸 수 있음. 확인되면 `src/lib/presets.ts` 갱신 |
| 다크 모드 지원 여부 | 시안이 라이트 전용이라 라이트 단일로 정리. 요청 시 토큰만 추가하면 됨 |

---

## 타임라인 (최신이 위)

### 2026-09-10 · 세션 21 · EC2 정식 배포 준비 (standalone 빌드 · 서버 설정 스크립트 · 배포 워크플로)
- **배경:** 사용자 질문 "도메인 사서 서버 배포하면 유입에 좋을까, 광고 가능할까" → 답: 도메인·정식 배포는 SEO·신뢰에 필수, 광고는 트래픽 확인 뒤 결정(프라이버시 약속과 충돌, Vercel Hobby 는 상업 이용 금지). 사용자가 **EC2 로 배포** 결정, 스텝바이스텝 요청.
- **권장 구성:** 서울 리전, t3.small(또는 무료 티어 t3.micro), Ubuntu 24.04 **x86_64**(GitHub 러너와 같은 아키텍처 — sharp 등 네이티브 모듈 때문에 ARM(t4g) 은 피함), 탄력적 IP, 보안 그룹 22(내 IP)/80/443. 서버에는 Node 22 + nginx 만. 빌드는 GitHub Actions.
- **한 것:** `next.config.ts` 기본 `output: "standalone"`. `scripts/package-standalone.mjs`(`npm run build:standalone`): `.next/static`·`public` 복사, `RELEASE`(커밋 해시) 기록, **빌드 머신의 `.env*` 제거**(Next 가 standalone 에 .env 를 복사해 넣는 것을 로컬 검증에서 발견 — 로컬 빌드 아카이브에 CRON_SECRET 이 실릴 수 있었다). `deploy/ec2/setup.sh`(1회: 패키지·계정·디렉터리·.env 생성·systemd·nginx·ufw·sudoers·certbot 옵션), `deploy/ec2/release.sh`(풀기 → current 심볼릭 링크 원자 교체 → restart → 30초 헬스 체크 → 실패 시 이전 릴리스 롤백 → 최근 3개 유지), `docufit.service`(docufit 계정, 127.0.0.1:3000, EnvironmentFile, ProtectSystem=strict 등 최소 권한), `docufit-cleanup.{service,timer}`(Phase 3 용, 설치만), `deploy/nginx/docufit.conf`(프록시 + HSTS, 캐시 정책은 Next 에 위임), `.github/workflows/deploy-ec2.yml`(typecheck·lint → build:standalone → tar → scp → release.sh → 헤더 확인; Secrets EC2_HOST/EC2_USER/EC2_SSH_KEY, 변수 EC2_DEPLOY_ENABLED 게이트, 취소 금지 concurrency). `.gitattributes` 로 `*.sh`·`deploy/**` LF 강제. README 배포 절을 EC2 로 교체, package.json 중복 `postinstall` 키 정리.
- **결함 수정:** `headers()` 의 `source: "/(.*)"` 가 `/_next/static` 까지 `no-store` 를 걸어 해시 자산(글꼴·heic2any 1.3MB)이 방문마다 다시 받히던 것 → `/((?!_next/static).*)` 로 제외. standalone 로컬 실행으로 확인: `/` no-store, 청크 `public, max-age=31536000, immutable`, `/api/cron/cleanup` 401 + no-store.
- **검증:** `npm run build:standalone` → `.next/standalone` 에 server.js·.next/static·RELEASE, `.env` 없음. `PORT=3100 node server.js` 로 헤더·404·API 확인. 서버 쪽 스크립트는 실제 EC2 가 없어 **미실행** — 첫 실행 때 오류가 나면 setup.sh 부터 본다.
- **인스턴스 재사용 시도 → 포기 (결정):** 사용자가 이전 프로젝트(medi)의 중지된 t3.micro(`i-01045629b6251626a`, EIP 15.164.150.126)를 재시작해 쓰려 했다. 키 페어 `.pem` 이 없어 EC2 Instance Connect(브라우저) 로 새 공개키(`~/.ssh/docufit-ec2`, ed25519, 로컬 PC 에 생성 완료) 를 넣으려 했으나 "Error establishing SSH connection". 세부 정보에서 원인 확정: **서브넷이 프라이빗(`medi-prisub-ap-2a`)** — ALB→프라이빗 EC2(3000)·bastion 경유 SSH 구조라 EIP 가 있어도 외부에서 닿지 않고, 같은 이유로 웹 서비스도 불가. AMI 는 삭제된 커스텀 이미지(OS 불명), IAM 역할은 CodeDeploy 용. 인스턴스는 서브넷을 옮길 수 없으므로 **새 인스턴스(기본 VPC 퍼블릭 서브넷, Ubuntu 24.04 x86_64, t3.micro/small, 퍼블릭 IP 자동 할당, 새 SG docufit-sg 22/80/443)** 로 진행하기로 안내. 그 과정에서 medi SG(`sg-023e56afb455e9309`)에 SSH/80/443 0.0.0.0/0 규칙이 추가되어 있음 — medi 인스턴스를 다시 중지하고 필요 없으면 규칙·EIP 정리 권고.
- **다음:** 사용자: 새 EC2 생성 → `docufit-ec2.pub` 등록 → setup.sh → 배포 키·Secrets·변수 등록 → push 로 첫 배포 → 도메인 구매·A 레코드 → `setup.sh --domain --email`. 그 뒤 GitHub Pages 워크플로를 스테이징으로 남길지 결정, 개인정보 안내 3절에 "AWS(서울) EC2, nginx 접속 로그 보관 기간" 기입, SEO.

### 2026-09-10 · 세션 20 · UI 전면 리디자인 — "전문 디자인팀" 시안(v2) 적용
- **배경:** 사용자가 GPT 에 "회사 디자인팀이 만든 것처럼 업그레이드" 를 요청해 받은 시안 `docs/design/studio-concept-v2.png` 을 첨부하며 "현재 페이지는 묘하게 AI 가 만든 것 같은 디자인" 이라 지적, 동일하게 업그레이드 요청. 시안에 있지만 우리 서비스에 없는 것(계정·알림·프로젝트·문서함, 해상도 dpi, 품질 슬라이더, "다시 최적화")은 **만들지 않았다** — 회원가입·저장이 없는 서비스라 거짓 UI 가 된다. 그 자리는 프라이버시 배지·실제 설정·실제 결과로 채웠다.
- **디자인 시스템:** `globals.css` 토큰 재정의 — navy/accent/hero 그라데이션 토큰 폐기, `brand`(#2563eb)/`brand-hover`/`brand-soft`/`brand-ring`, `ink/ink-strong/muted/subtle` 3단계 텍스트, `line/line-strong`, pass/warn/fail + soft. 글꼴을 next/font(Inter + Noto Sans KR variable, `display: swap`)로 자체 배포 — 런타임에 Google 로 요청이 나가지 않는다. `Button.tsx`: ToggleButton(선택 = 연한 파랑 배경 + 파랑 테두리), ActionButton primary(단색 파랑)/secondary/ghost/hero(단색 파랑 + 그림자, lg), 크기 xs·sm·md·lg(xl 제거), `leadingIcon`, `whitespace-nowrap`; IconButton 에 `size="sm"`(28px). `icons.tsx` 에 20여 종 추가(Close·Chevron·Refresh·Rotate·Trash·Check·Document·FileImage·Image·Crop·Cursor·EyeOff·Grid·SquareFill·Compress·Swap·Alert·Info·Stack·Copy·Sliders). 유니코드 기호 아이콘(■ ▦ ⌗ ↖ ↺ ↻ ⇅ ⇆ ◀ ▶ ✕ →) 전부 교체. `BrandMark`(앱 바 로고) + `icon.svg` 를 브랜드 파랑으로 바꾸고 파비콘 세트 재생성.
- **레이아웃:** `layout.tsx` 에 공통 `AppBar`(sticky, 로고 + "100% 브라우저 자체 처리" 배지). `page.tsx` 는 xl 에서 **앱 셸**(`h-[calc(100dvh-6rem)]`, 3열 + 상태 바 행, 패널 내부 스크롤 `scroll-thin`), lg 는 2열(미리보기 col-span-2), 모바일 1열 유지. `SiteFooter`(한 줄, lg 에서 h-10 고정) 는 페이지가 그린다 — 스튜디오는 모바일 고정 바 여백이 필요해서.
- **사이드바(ControlPanel):** 카드가 아닌 페이지 배경 위 열(lg 에서 오른쪽 구분선). 섹션 제목 13px. 프리셋은 아이콘 타일 + 이름 + "파일 1장 최대 10 MB" + 참고 배지, 선택 = 연한 파랑 배경. "최적화 설정": 파일 형식 3등분 칩, 목표 용량 4등분 칩 + `MB` 접미어 입력, 출력 방식 3등분 칩("개별 파일/세로 병합/가로 병합"). "용량 확인"(SizeMeter 를 카드형으로: 큰 수치 + 판정 배지 + 얇은 바). 맨 아래 **"설정 초기화"**(프리셋·목표·형식·출력 방식 전부 기본으로, 새 `onResetAll`/`isDirty`). 판정 로직은 `studio/sizeVerdict.ts` 로 분리(SizeMeter·StatusBar 공용).
- **가운데(Studio 섹션):** 제목 "서류 업로드 및 편집" + 설명 두 줄 + "모두 지우기"(ghost, 휴지통). 드롭존: 빈 상태는 큰 아이콘(이미지 든 서류 + 파랑 플러스 배지) + "파일을 드래그 앤 드롭하세요" + primary "파일 선택하기" + 지원 형식 줄; 파일이 있으면 한 줄 compact + "파일 추가". 안쪽 버튼 클릭이 영역 클릭으로 전파돼 대화상자가 두 번 열리지 않게 `stopPropagation`. 카드 덱: 파랑 번호 배지, 닫기 아이콘, 배지 pill, 결과 줄(`→ 9.9 MB (−1%)` + 아이콘 다운로드), 가리기·크롭 xs 버튼 + ‹ › 이동. 하단 `FeatureTiles`(민감정보 가리기·편집 / 용량 최적화 / 포맷 변환·이어붙이기, md 이상).
- **오른쪽(PreviewPanel):** "미리보기" + 편집 버튼(가리기·크롭·회전·편집, 아이콘) — 헤더의 세로/가로 병합 토글은 사이드바 출력 방식과 중복이라 제거. 미리보기 프레임은 xl 에서 flex-1. 아래 `FileRow`(아이콘 타일·이름·크기×해상도·상태 pill: 준비 완료/HEIC 변환됨/편집 적용됨/최적화 완료). **"최적화 결과" `ResultStats`**: 3×2 수치 카드 — 현재 크기 / 최적화 후 / 절감률(초록), 파일 형식(JPG → JPG + 배지) / 해상도(+ 원본 배지) / 품질(%·무손실·자동), 하단 상태 문구(목표 이내·초과 경고·오류). 병합 모드는 같은 틀로 합계/병합 후/절감률, 병합 출력/구성/목표. `MergeSummary` 삭제(ResultStats 가 대체, `data-testid="merge-summary"` 유지). ActionBar 데스크톱 = 요약 한 줄 + 패널 폭 hero 버튼(lg). 빈 미리보기는 아이콘 + 안내.
- **상태 바(StatusBar, 데스크톱):** 왼쪽 "N장 준비됨 · 변환 중" + 선택 파일 칩(이름·크기·제거), 오른쪽 판정 점 + 라벨(최적화 완료/초과 등) + "절감 용량 132 KB (1%)".
- **에디터 툴바:** 단색 박스·모자이크·크롭·선택 토글에 아이콘, 회전은 "왼쪽 90°/오른쪽 90°", 모두 지우기 휴지통. 취소는 secondary.
- **결정:** (1) 세션 13 의 "밝은 파랑 반대·hero 초록 그라데이션" 은 이 시안으로 **대체**됨 — 사용자가 시안을 직접 지정. (2) 시안의 계정 UI 는 넣지 않는다(위). (3) "다시 최적화" 버튼은 넣지 않았다 — 설정·편집이 바뀌면 결과가 자동 무효화되어 쓸 일이 없다. (4) 앱 셸은 xl(1280+)만. lg 는 미리보기가 두 열 아래로 가서 셸 높이에 안 들어간다.
- **문제/해결:** (1) 세로 flex 자식 `main` 에 `flex-1` 이 남아 `xl:h-[…]` 가 무시됨(flex-basis 가 height 를 덮음) → `xl:flex-none`. (2) 드롭존 안 텍스트 div 의 `flex-1` 이 세로 flex 에서 늘어나 버튼이 바닥으로 → compact 에서만 flex-1. (3) 좁은 사이드바에서 출력 방식 칩이 두 줄로 → 아이콘 제거 + `whitespace-nowrap`. (4) layout 과 page 양쪽에 푸터가 들어가 중복 → 페이지만.
- **검증:** 스크린샷(cdp-shots.mjs, 1600×1000 / 390×844) 로 시안과 비교 — 빈 상태·파일 3장·최적화 완료·세로 병합·에디터·모바일 전체. 스모크 6종을 새 라벨(가리기/크롭/회전·편집/모자이크/오른쪽 90°/세로 병합/용량 확인/제출처 프리셋)에 맞춰 갱신하고 전부 통과: 스튜디오 29 / 에디터 30 / 병합 37 / 병합 중 편집 23 / 모바일 15 / 확대 53. `tsc`/`lint`/`build` 통과.
- **다음:** SEO(OG 이미지는 새 브랜드 파랑으로). 사용자 실기기에서 새 UI 확인. 사이드바 프리셋 부제가 좁아 형식 목록은 툴팁(`title`)으로만.

### 2026-09-10 · 세션 19 · 에디터 확대·축소 (+/−, 맞춤, 이동 모드) — 모바일에서 세밀한 가리기·크롭
- **배경:** 사용자 보고 "모바일에서 크롭·가리기 할 때 이미지가 너무 작아 컨트롤이 어렵다". 원인은 둘: (1) 확대 수단이 없었다. (2) 모바일 편집 영역이 `50vh`(422px) 인데 도구 줄이 3~4줄로 접혀 실제 캔버스는 150px 남짓이었다.
- **한 것:** `ImageEditor` 에 확대 단계 `1 / 1.5 / 2 / 3 / 4` (`ZOOM_STEPS`). 구현은 fabric **뷰포트 줌**(`canvas.setZoom`) + `setDimensions` 로 캔버스 요소를 배율만큼 키우고, 스크롤 컨테이너(`overflow-auto`, 내부 `m-auto` 래퍼) 안에서 움직인다. scene 좌표(맞춤 배율)는 그대로라 `collectRegions`/`refreshMosaic` 의 이미지 픽셀 환산은 손대지 않았다. 확대 시 뷰포트 중심 지점 유지(캔버스·컨테이너 화면 좌표 차이로 계산 — 스크롤 위치만 쓰면 m-auto 로 가운데 놓인 캔버스에서 어긋난다). 회전으로 캔버스를 재생성해도 `zoomRef` 로 배율 유지. **이동 모드**(손 아이콘): fabric 이 캔버스에 `touch-action: none` 을 걸어 손가락 스크롤이 안 되므로, 오버레이 div 가 Pointer Events 드래그·휠을 컨테이너 스크롤로 바꾼다. 확대 1 이면 자동 해제. 컨트롤은 도구 줄 오른쪽(`ml-auto`) `[−][%][+][맞춤][이동]`, 아이콘 전용 `IconButton`(36px, aria-label/title) 을 `Button.tsx` 에 추가, `IconMinus/IconFit/IconHand` 추가. 안내 문구가 이동 모드일 때 바뀐다. `PreviewPanel` 은 편집 중 모바일 높이를 `clamp(480px,72vh,1000px)` 로 확대. 도구 줄 세로 구분선 제거(줄바꿈 시 줄 끝·줄 머리에 걸려 어색).
- **결정:** (1) 줌 컨트롤을 캔버스 위에 띄우지 않는다 — 서류 모서리(가릴 내용이 있을 수 있는 자리)를 덮기 때문. (2) 스크롤 시 `calcOffset` 재계산은 넣지 않았다 — fabric v7 은 포인터 좌표를 읽을 때마다 `calcOffset()` 을 호출한다 (`_getPointerImpl`). (3) 핀치·휠 줌은 이번 범위 밖(후속 후보).
- **검증(`cdp-zoom.mjs` 53 체크, FAILS=0):** 모바일 390×844 터치 에뮬레이션 — 100% 에서 스크롤 없음·축소/맞춤/이동 비활성, 확대 ×2 → 캔버스 폭·높이 정확히 2배·가로세로 스크롤 가능·스크롤이 가운데, 스크롤한 상태에서 **터치 드래그**로 가리기 → 적용 → 결과 픽셀(영역 안 검정 3점, 밖 파랑 2점), 이동 모드 터치 드래그로 scrollLeft/Top 정확히 (+60,+50) 이동·영역 미생성, 회전 뒤 200% 유지 → 맞춤 → 정확히 절반, 400% 상한, 취소 시 원본 유지. 데스크톱 1800×1100 — 휠 네이티브 스크롤, 마우스 드래그 가리기 → 픽셀 검사. 회귀: 에디터 30 / 모바일 15 / 병합 중 편집 23 / 스튜디오 전부 통과. `tsc`/`lint`/`build` 통과. 첫 실행에서 잡은 결함 2건(중심 유지 계산, 모바일 편집 높이 부족) 을 고친 뒤 재검증. push 후 Pages 배포(53d878f) 성공, **실배포 주소에서 cdp-zoom 53 체크 통과.**
- **다음:** SEO. 사용자 실기기(아이폰) 에서 확대·이동 모드 손맛 확인.

### 2026-09-10 · 세션 18 · 파비콘 교체 (DocuFit 브랜드 마크)
- **한 것:** `src/app/icon.svg` 원본(남색 rx14 타일 + 접힌 모서리 흰 서류 + 우하단 초록 합격 체크, 16px 가독성을 위해 요소 3개로 제한). `scripts/generate-icons.mjs` 가 sharp 로 `icon.png`(48), `apple-icon.png`(180), `favicon.ico`(32, PNG 내장 ICO 를 직접 조립)를 생성. 기본 Next favicon.ico 교체. Next 파일 규약이라 `<link rel="icon">` 4종이 자동 노출되고 basePath 도 자동 적용.
- **결정:** 아이콘 원본은 SVG 하나만 손으로 관리하고 나머지는 스크립트 산출물을 커밋(빌드 때 생성하지 않음 — 빌드 의존성·시간을 늘리지 않기 위해). 디자인을 바꾸면 스크립트를 다시 돌린다.
- **검증:** dev 서버 HTML 에 ico/png/svg/apple-touch 링크 4개, 각 파일 200 + 올바른 Content-Type. ICO 헤더(type 1, count 1, PNG 시그니처 offset 22) 확인. 16/32/48px 확대 몽타주로 가독성 확인.
- **다음:** SEO(메타데이터·OG 이미지·robots/sitemap·JSON-LD·랜딩 설명/FAQ). manifest 는 basePath 때문에 `manifest.ts`(force-static)로.

### 2026-09-10 · 세션 17 · GitHub Pages 임시 배포 (정적 export + Actions)
- **한 것:** `next.config.ts` 가 `GITHUB_PAGES=true` 일 때만 `output: "export"`, `basePath: "/resize_images"`, `trailingSlash: true`, `images.unoptimized`. `scripts/build-pages.mjs`(`npm run build:pages`): 빌드 동안 `src/app/api` 를 `.pages-excluded-api` 로 옮기고 반드시 복원(try/finally, SIGINT), `.next/dev/types` 제거(dev 산출물이 api 라우트를 참조해 타입 검사를 깨뜨림), `out/.nojekyll` 추가, Windows 에서 dev 서버가 디렉터리를 잡고 있을 때(EPERM) 안내. `.github/workflows/deploy-pages.yml`: main push 마다 typecheck·lint → build:pages → configure-pages(enablement) → upload → deploy. README "임시 배포 (GitHub Pages)" 절. create-next-app 잔여 SVG(`public/*.svg`) 삭제. 푸터·개인정보 페이지 `Link` 에 `prefetch={false}`.
- **결정:** (1) 서버 라우트 제외는 런타임 분기가 아니라 빌드 시 디렉터리 격리. `export const dynamic` 은 리터럴이어야 하고 `force-static` 은 Vercel 크론 인증을 깨뜨리기 때문. (2) `trailingSlash: true` 유지 — `/privacy` 와 `/privacy/` 둘 다 동작(Pages 가 301). false 면 `/privacy/` 가 404. (3) 세그먼트 프리페치 파일 경로 불일치(export 는 `privacy/__next.privacy/__PAGE__.txt` 디렉터리로 쓰고 클라이언트는 `privacy/__next.privacy.__PAGE__.txt` 를 요청) 는 Next 16 export 의 문제로 보여 `prefetch={false}` 로 우회. 클릭 이동은 `privacy/index.txt` 로 정상. (4) 정적 호스팅은 응답 헤더를 못 넣으므로 보안 헤더는 Vercel 배포에서만. 임시 배포라 README 에 명시.
- **문제/해결:** (1) Windows 에서 `next dev` 실행 중 `src/app/api` rename 이 EPERM → dev 종료 후 빌드(스크립트가 안내). (2) 타입 검사가 `.next/dev/types/validator.ts` 때문에 실패 → 빌드 전 삭제. (3) **CI 첫 실행 실패 2회.** ① `src/generated/prisma` 가 없어 tsc 실패 — 문서에 있다고 적혀 있던 `postinstall` 이 실제로는 없었음 → `postinstall: prisma generate` 추가 + 워크플로 더미 `DATABASE_URL`. ② `LayoutProps` 전역 타입이 없어 tsc 실패 — `next-env.d.ts`/`.next/types` 는 gitignore 대상이고 dev/build 가 만들기 때문 → `typecheck` 를 `next typegen && tsc --noEmit` 로. 둘 다 임시 폴더에 새로 clone 해 `npm ci` 부터 재현한 뒤 고쳤다(CI 로그는 비로그인 API 로 받을 수 없어 403). (4) 검증용 정적 서버는 Pages 규칙(디렉터리 → index.html, 슬래시 없는 디렉터리 → 301, 확장자 없는 경로 → .html)을 그대로 구현.
- **검증(로컬 정적 서버 http://localhost:8080/resize_images/):** 라우팅 `/`200, `/privacy`→301→`/privacy/`200, 없는 경로 404. 스튜디오 30 / 모바일 15 / 병합 37 / 에디터 30 / 병합 중 편집 23 스모크 전부 통과(정적 export 대상). 클라이언트 이동 프로브(메인 ↔ 개인정보) 통과. `tsc`/`lint` 통과.
- **배포 완료(실서비스 검증):** 사용자가 Settings → Pages → Source 를 GitHub Actions 로 켠 뒤 빈 커밋으로 재실행 → 성공. **https://cpk0709.github.io/resize_images/** 와 `/privacy/` 200. 실배포 주소에서 스튜디오 30 / 모바일 15 / 에디터 30 / 병합 중 편집 23 / 페이지 이동 프로브 전부 통과. 응답 헤더는 GitHub 의 `Cache-Control: max-age=600` (정적 호스팅이라 no-store 불가, 예상대로).
- **다음:** 파비콘·SEO (`metadataBase` = https://cpk0709.github.io/resize_images). 사용자 실기기(HEIC) 테스트를 배포 주소에서.

### 2026-09-10 · 세션 16 · 모바일 최적화 레이아웃 + 레이아웃 뷰포트 확장 결함 수정
- **한 것:** 모바일(lg 미만) 전용 배치 — 순서를 `order-*` 로 서류 추가(편집 캔버스) → 설정 → 미리보기로, 최종 버튼은 화면 하단 고정 바(`ActionBar` 를 데스크톱용 `hidden lg:flex` / 모바일용 `fixed bottom-0 lg:hidden` 두 벌로, `main pb-28`), 프리셋은 가로 스크롤 칩(`-mx-4 overflow-x-auto snap-x`, 260px), 드롭존 문구를 "탭해서 서류 사진 선택 또는 촬영" 으로, 카드 덱 2열·탭 타깃 확대·삭제 버튼 항상 표시, 미리보기 높이 50vh, 헤더 배지 짧은 문구, 헤더/푸터 이모지(🔒 🛡️) → `IconLock`/`IconShield`. 패널에 `className` prop 추가(Studio 가 배치 결정).
- **결함 발견·수정:** 모바일 에뮬레이션에서 `innerWidth` 가 954 로 측정됨 — `main` 의 `grid` 에 모바일 열 정의가 없어 암시적 auto 열이 프리셋 칩 max-content(936px)까지 늘어나 레이아웃 뷰포트가 확장, 실제 폰에서는 페이지가 축소되어 보였을 결함. viewport 메타는 정상(`/privacy` 는 390). `grid-cols-1` + 패널 `min-w-0` 으로 수정. 대조 실험(data URL 메타 유/무, `/privacy`)으로 원인을 확정한 뒤 고침.
- **결정:** 모바일에서는 "사진부터" 흐름. 설정을 먼저 보여 주던 데스크톱 순서를 그대로 쌓으면 첫 화면이 설정으로 가득 차고 버튼이 서너 화면 아래로 간다.
- **검증(cdp-mobile.mjs 15 체크, 390×844 DPR 3 터치):** innerWidth 390, 가로 스크롤 없음, 캔버스가 설정보다 위, 모바일 문구, 고정 바 bottom=844·데스크톱 바 display none, 카드 2열, 프리셋 sw 936 > cw 356(가로 스크롤), 고정 바에서 최적화 실행·완료 라벨. 데스크톱 회귀(스튜디오·병합 중 편집·에디터) 통과. `tsc`/`lint`/`build` 통과.
- **다음:** 임시 배포(사용자 "깃허브 배포" — GitHub Pages 정적 export 인지 GitHub 연동 Vercel 인지 확인 필요), 파비콘·SEO.

### 2026-09-10 · 세션 15 · 병합 미리보기에 편집 결과가 보이지 않던 문제 — 가로 띠 폭 맞춤, 편집됨 배지, 타일 선택
- **한 것:** `MergePreview` 가로 배치를 "각 장 높이 = 컨테이너 높이" 에서 "각 장 너비 = (가로세로비 / 전체 비) × 100%" 로 바꿔 띠 전체가 항상 폭 안에 들어오고 높이가 자동으로 같아지게 함(실제 병합과 같은 비율). 타일마다 순서 배지 + **"편집됨" 배지**(편집된 장), 타일 클릭으로 카드 선택(선택 강조 링, 카드 덱과 동기화). `MergePanelProps` 에 `editedIds / selectedId / onSelect` 추가. 대체 텍스트 "N번: 파일명" 유지.
- **결정:** 사용자 보고("이어붙이기 후 각 장 크롭·가리기·모자이크를 했는데 미리보기에 안 보임")를 데이터 흐름(replaceImage → readyImages → MergePreview) 검토와 픽셀 검증으로 확인한 결과, 편집은 정상 반영되고 있었고 **가로 미리보기가 옆으로 넘쳐 편집된 장이 스크롤 바깥에 숨는 표시 결함**이었다. 세로도 스크롤이 필요하지만 방향상 자연스럽다고 판단해 유지. 어떤 장이 편집 대상인지 보이도록 선택 강조·편집됨 배지를 추가.
- **문제/해결:** (1) 스모크 실패 집계를 `grep -c '^FAIL'` 로 하다가 요약 줄 `FAILS=0` 까지 세어 "실패 1건" 으로 오판(에디터·병합 스모크에서 두 번). 실제 실패는 없었다. 집계는 `^FAIL ` (공백 포함) 또는 스크립트의 `FAILS=` 값을 읽을 것. (2) 타일 라벨을 바꾸면서 대체 텍스트가 "1: 파일명" 으로 줄어든 것을 스모크가 잡아 "1번: 파일명" 으로 복구.
- **검증(cdp-merge-edit.mjs 23 체크):** 세로 병합 → 미리보기 2번 타일 클릭 선택(카드 덱 동기화) → 가리기 드래그·적용 → 타일 이미지 갱신·가린 영역 검정·바깥 원본·편집됨 배지 → 병합 실행 → 결과 이미지의 해당 위치(0.4, 0.397) 검정, doc 영역 파랑·rotated 영역 빨강 유지 → 가로 병합 띠 폭 624 ≤ 632, 타일 3개 높이 동일. 병합 37 / 스튜디오 30 / 에디터 30 회귀 통과. `tsc`/`lint`/`build` 통과.
- **다음:** 사용자 로컬 테스트 피드백 반영 계속. 배포·HEIC 실기기 확인.

### 2026-09-10 · 세션 14 · 이어붙이기 미리보기 (배치 시뮬레이션 + 결과 표시) 와 헤더 병합 토글
- **한 것:** `src/components/merge/MergePreview.tsx` — 병합 모드에서 오른쪽 큰 영역에 (a) 결과 전: 카드 덱 순서대로 썸네일을 세로(같은 너비)/가로(같은 높이)로 배열한 배치 시뮬레이션, PDF 페이지별은 페이지 번호 붙여 세로 나열, (b) 결과 후: 실제 결과 이미지(PDF 는 안에 들어간 페이지 JPEG 들) 표시. `MergeExportResult.pagePreviews` 추가(이미지 출력=결과 1장, PDF=페이지 JPEG 들). `useMergeExport` 가 결과 도착 시 object URL 을 만들어 `previewUrls` 로 보관하고 결과 교체·언마운트 시 해제. PreviewPanel 헤더에 "⇅ 세로 병합 / ⇆ 가로 병합" 토글(컨트롤 패널 "출력 방식" 과 같은 상태, 같은 것을 다시 누르면 개별 파일로), 병합 모드에서는 제목을 "시각적 병합" 으로, 안내 카드 문구도 상황별로.
- **결정:** 사용자 질문 "이어붙이기 미구현인가요?" — 구현돼 있었지만 진입점이 왼쪽에만 있고 오른쪽 "시각적 병합" 패널에 시각적 요소가 없어 미구현처럼 보였다. 제목이 약속한 것을 화면이 보여주도록 고침. 미리보기 URL 수명은 컴포넌트 effect 가 아니라 훅이 결과와 함께 관리 (react-hooks/set-state-in-effect 회피 + 수명이 결과와 일치).
- **문제/해결:** 스모크 기대값 오류 1건(업로드 순서가 doc → photo → rotated 인데 photo 먼저라고 가정). 제품은 정상.
- **검증(cdp-merge.mjs 37 체크):** 세로 병합 선택 시 배치 미리보기 3장 순서 일치·헤더 토글 활성, 병합 후 결과 미리보기 1412×4000, PDF 3페이지 미리보기 3장. 스튜디오·에디터 회귀 통과. `tsc`/`lint`/`build` 통과.
- **다음:** 사용자 로컬 테스트 피드백 반영 계속. 배포·HEIC 실기기 확인.

### 2026-09-10 · 세션 13 · 최종 추출 버튼 전용 스타일(hero), 검은 채움 버튼 정리
- **한 것:** `ui/Button.tsx` 에 `hero` 변형과 `xl` 크기 추가 — 에메랄드→틸 그라데이션(`--color-hero-start/end` 토큰), 큰 크기, 은은한 색 그림자, 안쪽 흰 링, 오른쪽 원형 아이콘 배지. ActionBar 의 최적화 시작/다운로드가 이것을 쓴다(화면에 하나만). 선택 토글은 검은 채움 → 연한 남색 배경 + 얇은 남색 링(`bg-accent-soft ring-navy/35`). primary(적용 등)는 평평한 검정 → 부드러운 남색 그라데이션. 프리셋 선택 아이콘 타일도 같은 그라데이션.
- **결정:** 사용자 피드백 — "최적화 버튼은 누가 봐도 최종 마무리 버튼으로 차별화, 크기도 크게. 다른 검은 버튼들은 별로." hero 색을 초록 계열로 잡은 이유: 신호등 "통과(합격)" 와 같은 의미 계열이라 '합격 파일 뽑기' 로 읽힘. hero 는 다른 어떤 요소에도 재사용하지 않는다.
- **검증:** 스튜디오 30 스모크 통과(버튼 텍스트 매칭 유지), 스크린샷 확인, `tsc`/`lint`/`build` 통과.
- **다음:** 사용자 로컬 테스트 피드백 반영 계속. 배포·HEIC 실기기 확인.

### 2026-09-10 · 세션 12 · 주요 동작 버튼을 우측 하단 액션 바로, 버튼·아이콘 스타일 정돈
- **한 것:** (1) 리팩토링 커밋: `src/components/ui/Button.tsx` (ToggleButton / ActionButton primary·secondary·ghost, sm·md·lg). 컨트롤 패널·에디터·미리보기 패널에 세 벌 있던 버튼 스타일 통합. (2) `src/components/studio/ActionBar.tsx`: `PrimaryAction` 타입과 주요 버튼을 컨트롤 패널에서 분리해 **미리보기 패널 하단**에 배치. 왼쪽에 "JPG · 개별 파일 3장 · 파일마다 목표 5 MB" 식 출력 요약, 오른쪽 끝에 버튼. 편집 중에는 숨김. (3) `src/components/ui/icons.tsx` 단색 선 아이콘(화살표·다운로드·업로드·관공서·천칭·영수증·플러스·스피너). 프리셋 이모지(🏛️⚖️🧾＋)와 드롭존 "⬆", 버튼의 "▶ ↗" 를 모두 교체. (4) 주요 버튼 색을 파란 채움(accent)에서 남색(navy) 단일로. (5) 세션 훅의 upstream 오보 수정(Windows cmd 리다이렉트).
- **결정:** 사용자 피드백 — 왼쪽 아래 버튼 위치가 애매하고 흐름(설정 → 서류 → 출력, 좌→우)에 맞지 않으며 색이 촌스럽다. 액션 바를 흐름의 끝인 오른쪽 하단에 두고, 이모지·강한 파랑을 걷어냄. 색 클래스는 `ui/Button.tsx` 밖에서 직접 쓰지 않는 것을 목표로 한다.
- **문제/해결:** (1) Bash 히어독이 백슬래시·한글을 훼손하고 sed 가 UTF-8 이모지를 못 바꿔 스모크 수정이 헛돌았음 → 스크립트 파일은 Write 도구, 문자열 교체는 node 로 (기존 메모의 교훈 재확인). (2) 스모크가 이모지 "🧾" 로 프리셋을 클릭하던 것을 텍스트 "홈택스" 로 변경.
- **검증:** 스튜디오 30 / 에디터 30 / 병합·PDF 33 스모크 전부 통과(포트 3000). 스크린샷으로 액션 바 위치·아이콘 확인. `tsc`/`lint`/`build` 통과.
- **다음:** 사용자 로컬 테스트 피드백 반영. 배포·HEIC 실기기 확인.

### 2026-09-09 · 세션 11 · Phase 4 배포 준비 (사용자 결정 불필요한 항목)
- **한 것:** (1) 프로덕션 모드(`next build` + `next start -p 3002`) 헤더 실측: `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `X-Powered-By` 없음, 크론 미인증 401. (2) `src/app/privacy/page.tsx` 개인정보 처리 안내 — 수집하지 않는 것(계정·이미지·EXIF·쿠키·분석 스크립트), 브라우저 처리 설명, 호스팅 접속 로그 고지(업체·기간은 배포 확정 후 명시), 서버 처리 옵션(준비 중)의 약속, 프리셋 참고값 고지, 문의 경로. 푸터에 링크 + 소스 코드 링크. (3) `vercel.json` 크론을 Hobby 제한에 맞춰 매일 18:00 UTC 로 (서버 경로 미사용이므로 실질 영향 없음). (4) README "배포 (Vercel 기준)" 절. (5) 390px·820px 스크린샷으로 1열 스택 레이아웃 확인 — 수정 불필요.
- **결정:** 배포 대상 기본 가정을 Vercel 로. Phase 2 는 서버 의존이 없어 환경변수 없이 배포 가능. Pro 플랜·외부 스케줄러는 서버 경로(Phase 3)를 켤 때 결정.
- **검증:** 프로덕션 헤더 curl 실측, `/privacy` 200 + 본문 문구 확인, 스튜디오 스모크 모바일·태블릿 폭에서 0 실패, `tsc`/`lint`/`build` 통과.
- **다음:** 사용자가 Vercel 배포 실행(`vercel link && vercel --prod`) 후 실서비스 URL 에서 헤더·HEIC 실기기 확인. 개인정보 안내 3절의 호스팅 업체·로그 기간 기입.

### 2026-09-09 · 세션 10 · 목표 용량 메뉴 복원 (기관 기본값 + 직접 설정 + 초기화)
- **한 것:** 컨트롤 패널에 "목표 용량 (파일 1개당)" 섹션을 프리셋 바로 아래 항상 노출. 2/5/10/20MB 빠른 선택 + 직접 입력 + "기본값으로 초기화"(기본값과 다를 때만 활성). 프리셋 선택 → 기관 기본값 적용, 이후 사용자가 바꾸면 프리셋 선택은 유지되고 목표 용량만 달라지며 안내문에 "기본값 10 MB 대신 5 MB 를 사용합니다" 표시. "직접 설정" 프리셋을 "기타 기관 (직접 설정)" 으로 바꿔 기본 10MB 를 갖게 하고 `maxBytesPerFile` 을 non-null 로 단순화. `presetDefaultMB()` 추가.
- **결정:** 사용자 지적("파일 용량 줄이는 메뉴가 사라진 듯")이 맞았다. 시안을 따르며 용량 프리셋을 기관 프리셋에 흡수한 것은 핵심 동작을 숨긴 실수. 기관 기본값은 유지하되 숫자를 바로 누를 자리를 되살림.
- **검증(cdp-studio.mjs 30 체크):** 기본값 상태에서 초기화 버튼 비활성, 5MB 선택 시 안내문·신호등 기준선 5MB·프리셋 선택 유지, 초기화 후 10MB 복귀, 직접 입력 3MB 반영. 병합 스모크 33 체크 회귀 통과. `tsc`/`lint`/`build` 통과.
- **다음:** 실기기(HEIC) 테스트, Phase 4 배포 준비.

### 2026-09-09 · 세션 9 · Phase 2-3 이어붙이기 · PDF 내보내기
- **한 것:** `src/lib/image/stitch.ts` (세로/가로 병합, 가장 큰 장 기준 공통 변, `MAX_CANVAS_PIXELS`=16M 초과 시 비율 축소, 결과는 캔버스). `src/lib/pdf/build.ts` (pdf-lib 동적 import, A4 자동 방향 + 여백 18pt / 이어붙인 장은 fit 페이지, Creator=DocuFit, 원본 파일명 미포함). `src/lib/image/export.ts` (레이아웃×형식 매트릭스 오케스트레이터, PDF 는 페이지 예산 = (목표-오버헤드)/n 으로 압축 후 조립, 초과 시 예산 재조정 최대 3회). `compressToTarget` 이 Blob 외에 비트맵·캔버스도 받도록 일반화(병합 결과를 재인코딩 없이 압축). `useMergeExport` (결과를 입력 서명과 묶어 순서·편집·옵션 변경 시 자동 무효). UI: 컨트롤 패널 "출력 방식"(개별/세로/가로, 1장이면 이어붙이기 비활성) + PDF 형식 활성, `MergeSummary` 카드, 신호등은 병합 모드에서 "병합 결과" 1건 기준, 병합 모드에서는 카드별 결과 숨김. `buildMergedFilename` → `docufit_N장.ext`.
- **결정:** (1) PDF 는 기본 "장마다 한 페이지(A4)". 이어붙이기+PDF 는 1페이지 fit. (2) 병합 결과 무효화는 forget/reset 이 아니라 서명 비교. 병합은 전체 입력에 의존해 개별 무효화가 의미 없기 때문. (3) 병합 파일명에 원본 이름을 섞지 않음(개인정보 가능성, 여러 개 중 선택 애매). (4) pdf-lib 는 save() 시 Producer 를 강제하므로(updateMetadata:false 로도 불가, Node 로 확인) Creator 만 설정.
- **문제/해결:** (1) `new Blob([Uint8Array<ArrayBufferLike>])` 타입 오류 → `new Uint8Array(bytes)` 로 복사. (2) 스모크 실패 3건은 전부 테스트 쪽: 버튼 텍스트에 아이콘("▶", "＋")이 붙어 exact 매칭 실패 → startsWith/includes 모드; 다운로드 대기가 전체 파일 수를 세어 PDF 감지 실패 → 확장자별·mtime 스냅샷 비교(헤드리스 Chrome 은 같은 이름을 " (1)" 없이 덮어씀).
- **검증(cdp-merge.mjs 33 체크, 다운로드 파일을 sharp·pdf-lib 로 검사):** 1장일 때 이어붙이기 비활성. 세로 이어붙이기 JPG 2MB 목표 → 1412×4000, 1,129,153B, 비율 4000/11333 정확. 개별+PDF → 700KB, 3페이지, 페이지 크기 [842×595, 842×595, 595×842] (방향 자동), Creator=DocuFit. 가로+PDF → 1페이지 841.9×246.5 (fit). 순서 변경 시 결과 무효화. 스튜디오·에디터 회귀 통과. `tsc`/`lint`/`build` 통과.
- **다음:** Phase 4 배포 준비. 사용자 실기기(HEIC) 테스트.

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
