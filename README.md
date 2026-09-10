# DocuFit

관공서·은행 사이트의 첨부파일 제한(용량, 확장자)에 맞춰 서류 이미지를 최적화하는 웹 툴.
회원가입 없음. 파일은 브라우저에서 처리하는 것이 기본이며, 서버에 저장되는 경우에도 1시간 뒤 완전 삭제된다.

- HEIC(아이폰) → JPG / PNG / PDF 변환
- 목표 용량(2 / 5 / 10 / 20MB) 맞춤 자동 압축
- 여러 장 이어붙이기(세로/가로), 크롭, 주민번호 가리기(검은 박스 / 모자이크)

기획 문서: [docs/PRD.md](docs/PRD.md) · 설계 결정: [docs/architecture.md](docs/architecture.md)

## 시작하기

```bash
npm install
cp .env.example .env        # 값 채우기 (아래 참고)
npx prisma dev              # 로컬 임시 Postgres. 출력되는 DATABASE_URL 을 .env 에 넣는다
npx prisma migrate dev --name init
npm run dev                 # http://localhost:3000
```

S3 는 로컬 개발 시 MinIO 를 권장한다.

```bash
docker run -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=minio -e MINIO_ROOT_PASSWORD=minio12345 quay.io/minio/minio server /data --console-address ":9001"
# .env: S3_ENDPOINT=http://localhost:9000, S3_FORCE_PATH_STYLE=true, 버킷은 콘솔(9001)에서 생성
```

## 환경변수

| 변수 | 설명 |
|---|---|
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `S3_BUCKET`, `S3_REGION` | 버킷 이름, 리전 |
| `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE` | S3 호환 스토리지(R2, MinIO)에서만 지정 |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | 해당 버킷에만 권한을 가진 IAM 키 |
| `CRON_SECRET` | `/api/cron/cleanup` 호출 인증 토큰 (16자 이상) |
| `FILE_TTL_MINUTES` | 파일 보존 시간. 기본 60, 상한 60 |
| `MAX_UPLOAD_MB` | 서버 처리 경로 요청 본문 상한 |

## 다른 PC 에서 이어서 작업하기

이 저장소는 작업 기억을 전부 저장소 안에 둔다. 새 PC 에서는 아래만 하면 된다.

```bash
git clone <원격 URL> && cd <폴더>
npm install                 # postinstall 이 prisma generate 까지 수행
cp .env.example .env        # 값 채우기
claude                      # Claude Code 실행
```

Claude Code 가 열리면 `.claude/settings.json` 의 SessionStart 훅이 `scripts/session-context.mjs` 를 실행해
`docs/HISTORY.md` 의 현재 상태·다음 할 일·미결 결정·최근 타임라인과 git 상태를 자동으로 읽어 준다.
세션을 마칠 때는 `/wrap-up` 을 실행하면 HISTORY 갱신 → 검증 → 커밋까지 진행한다. 규칙 전문은 `CLAUDE.md`.

## 임시 배포 (GitHub Pages)

`main` 에 push 하면 `.github/workflows/deploy-pages.yml` 이 정적 export 를 빌드해 **https://cpk0709.github.io/resize_images/** 에 배포한다.

```bash
npm run build:pages      # 로컬에서 같은 빌드 재현 → out/
```

- `scripts/build-pages.mjs` 가 `GITHUB_PAGES=true` 로 `next build` 를 돌린다. `next.config.ts` 는 이때만 `output: "export"`, `basePath: "/resize_images"`, `trailingSlash: true` 를 켠다.
- 정적 export 는 Request 를 읽는 Route Handler 를 지원하지 않아, 빌드 동안 `src/app/api` 를 옆으로 옮겨 두고 끝나면 복원한다. 현재 버전(브라우저 전용)은 서버 라우트를 쓰지 않으므로 기능 차이는 없다.
- **정적 호스팅은 응답 헤더를 제어할 수 없다.** `Cache-Control: no-store` 등 보안 헤더는 Node 서버 배포(아래 EC2)에서만 적용된다. 파일은 서버로 가지 않으므로 캐시에 남는 것은 코드뿐이지만, 정식 배포는 EC2 다.
- 첫 배포 전 저장소 Settings → Pages → Source 를 **GitHub Actions** 로 두어야 한다. 워크플로가 자동 활성화(enablement)를 시도하지만 권한에 따라 수동 설정이 필요할 수 있다.

## 배포 (EC2, 정식)

Ubuntu 24.04 (x86_64) EC2 한 대에 Node 서버(standalone) + nginx(TLS) 로 운영한다. 빌드는 GitHub Actions 가 하고 서버에는
Node 만 있으면 된다. 현재 버전(Phase 2)은 **브라우저 전용**이라 DB·S3 없이 동작한다.

**권장 사양**: 서울(ap-northeast-2), t3.small(2GB) 또는 무료 티어 t3.micro, Ubuntu Server 24.04 LTS **x86_64**(빌드 러너와 같은
아키텍처여야 네이티브 모듈이 맞는다), gp3 20GB, 탄력적 IP, 보안 그룹 22(내 IP만)·80·443.

1. **서버 초기 설정** (인스턴스에 SSH 접속 후 한 번):
   ```bash
   git clone https://github.com/cpk0709/resize_images.git && cd resize_images
   sudo bash deploy/ec2/setup.sh                                                # 도메인이 아직 없으면 HTTP 만
   sudo bash deploy/ec2/setup.sh --domain docufit.kr --email me@example.com    # 도메인 A 레코드가 이 IP 를 가리킨 뒤: HTTPS 까지
   ```
   nginx·ufw·Node 22·실행 계정(docufit)·`/srv/docufit/{releases,shared,bin}`·systemd 서비스·`/srv/docufit/shared/.env`(CRON_SECRET 자동 생성) 을 만든다. 다시 실행해도 `.env` 는 덮어쓰지 않는다.
2. **배포용 SSH 키**: 로컬 PC 에서 `ssh-keygen -t ed25519 -f docufit-deploy -N ""` → `docufit-deploy.pub` 내용을 서버의 `/home/ubuntu/.ssh/authorized_keys` 에 한 줄 추가.
3. **GitHub 저장소 설정** (Settings → Secrets and variables → Actions): Secrets `EC2_HOST`(탄력적 IP 또는 도메인), `EC2_USER`(`ubuntu`), `EC2_SSH_KEY`(개인키 `docufit-deploy` 전체 내용). Variables `EC2_DEPLOY_ENABLED` = `true`.
4. 이후 `main` 에 push 하면 `.github/workflows/deploy-ec2.yml` 이 `npm run build:standalone` → tar → scp → `release.sh`(풀기 · `current` 심볼릭 링크 교체 · 재시작 · 헬스 체크 · 실패 시 이전 릴리스로 롤백) → 응답 헤더 확인을 수행한다.

- `npm run build:standalone` = `next build`(output standalone) + `scripts/package-standalone.mjs`. 스크립트가 `.next/static`·`public` 을 넣고 빌드 머신의 `.env*` 를 제거한다. 서버 환경변수의 유일한 출처는 `/srv/docufit/shared/.env`(systemd `EnvironmentFile`, root 600).
- 캐시 정책은 Next 가 정한다: 페이지·API 는 `Cache-Control: no-store`, `/_next/static`(해시 자산)은 1년 `immutable`. 확인: `curl -sI https://<도메인>/ | grep -i cache-control`.
- 서버 처리 옵션(Phase 3)을 켤 때: `.env` 에 DB·S3 를 채우고 `sudo systemctl enable --now docufit-cleanup.timer`(10분마다 파기 크론 호출).
- 운영: `sudo systemctl status docufit`, `journalctl -u docufit -f`, nginx 로그 `/var/log/nginx/docufit.*.log`. 릴리스는 `/srv/docufit/releases/<sha>`(최근 3개 유지).
- GitHub Pages 배포(`deploy-pages.yml`)는 도메인 전환 전까지 스테이징으로 함께 유지한다. Vercel 은 쓰지 않는다(`vercel.json` 은 참고용).

## 검증

```bash
npm run typecheck
npm run lint
npm run build
```

## 파기(cleanup) 크론 수동 실행

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/cleanup
```

응답의 `deleted` / `failed` 와 DB 의 `CleanupRun` 테이블로 실제 삭제 여부를 확인할 수 있다.
