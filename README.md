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

운영 서버는 이미 다른 앱들이 Docker 로 돌고 **호스트 nginx** 가 80/443 을 이름 기반 가상호스트로 나눠 주는 **공유 EC2**(Ubuntu 24.04
x86_64) 다. DocuFit 도 컨테이너로 올리고(`127.0.0.1:3100`) nginx 에 사이트 하나만 추가한다. 이미지는 GitHub Actions 가 빌드해
GHCR(`ghcr.io/cpk0709/docufit`)에 올리고 서버는 pull 만 한다. 현재 버전(Phase 2)은 **브라우저 전용**이라 DB·S3 없이 동작한다.

1. **서버 초기 설정** (SSH 접속 후 한 번. 기존 서비스·nginx.conf·ufw 는 건드리지 않는다):
   ```bash
   git clone https://github.com/cpk0709/resize_images.git && cd resize_images
   sudo bash deploy/docker/setup-shared.sh                                              # 도메인 전: 8080 포트로 HTTP 임시 공개
   sudo bash deploy/docker/setup-shared.sh --domain docufit.kr --email me@example.com  # 도메인 A 레코드 연결 뒤: 80/443 + certbot
   ```
   `/srv/docufit/{compose.yml,app.env,.env,release.sh}` 와 `/etc/nginx/sites-enabled/docufit` 을 만든다. `app.env`(CRON_SECRET 자동 생성)는 다시 실행해도 덮어쓰지 않는다. 8080 모드에서는 ufw 에 8080 만 허용하고, 도메인 모드로 다시 실행하면 그 규칙을 닫는다.
2. **배포용 SSH 키**: 로컬 PC 에서 `ssh-keygen -t ed25519 -f docufit-deploy -N ""` → `docufit-deploy.pub` 내용을 서버의 `/home/ubuntu/.ssh/authorized_keys` 에 한 줄 추가. (`ubuntu` 는 docker 그룹이어야 한다.)
3. **GitHub 저장소 설정** (Settings → Secrets and variables → Actions): Secrets `EC2_HOST`(탄력적 IP), `EC2_USER`(`ubuntu`), `EC2_SSH_KEY`(개인키 `docufit-deploy` 전체). Variables `EC2_DEPLOY_ENABLED`=`true`, `DEPLOY_URL`=`http://<IP>:8080/`(도메인 뒤 `https://<도메인>/`).
4. **보안 그룹**: 8080(임시) 또는 80·443 인바운드 허용.
5. `main` 에 push(또는 Actions 에서 Run workflow)하면 `.github/workflows/deploy-ec2.yml` 이 typecheck·lint → 이미지 빌드·GHCR push → `compose.yml`·`release.sh` scp → `release.sh <sha>`(pull · 태그 교체 · up · 헬스 체크 · 실패 시 이전 태그로 롤백 · 오래된 이미지 정리) → `DEPLOY_URL` 응답 헤더 확인을 수행한다.
6. **첫 배포 뒤 한 번**: GHCR 패키지 `docufit` 을 Public 으로 바꾼다(GitHub 프로필 → Packages → docufit → Package settings → Change visibility). private 이면 서버의 `docker pull` 이 실패한다. 대신 서버에서 `docker login ghcr.io` 를 해 두어도 된다.

- `Dockerfile` 은 deps(`npm ci` + prisma generate) → build(`npm run build:standalone`) → runtime(Node 만, 비루트 `node`) 3단계. `package-standalone.mjs` 가 `.next/static` 을 넣고 빌드 머신의 `.env*` 를 제거하므로 이미지에 비밀이 없다. 컨테이너 환경변수의 유일한 출처는 `/srv/docufit/app.env`.
- 캐시 정책은 Next 가 정한다: 페이지·API 는 `Cache-Control: no-store`, `/_next/static`(해시 자산)은 1년 `immutable`. 확인: `curl -sI <DEPLOY_URL> | grep -i cache-control`.
- 서버 처리 옵션(Phase 3)을 켤 때: `app.env` 에 DB·S3 를 채우고 호스트 크론(또는 systemd 타이머)으로 10분마다 `curl -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3100/api/cron/cleanup`.
- 운영: `docker ps`, `docker logs -f docufit`, `cat /srv/docufit/.env`(현재 태그), nginx 로그 `/var/log/nginx/docufit.*.log`. 수동 롤백은 `/srv/docufit/release.sh <이전 sha>`.
- 전용 인스턴스(systemd + 호스트 Node)로 옮길 때의 변형은 `deploy/ec2/` 에 있다(현재 워크플로는 쓰지 않음).
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
