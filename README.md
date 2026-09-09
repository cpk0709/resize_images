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

## 배포 (Vercel 기준)

현재 버전(Phase 2)은 **브라우저 전용**이라 DB·S3 없이도 동작한다. 서버 처리 옵션(Phase 3)을 켜기 전까지는 환경변수 없이 배포해도 된다.

```bash
npm i -g vercel
vercel link            # cpk0709/resize_images 저장소 연결
vercel --prod
```

- `vercel.json` 의 크론(`/api/cron/cleanup`)은 Hobby 플랜 제한(하루 1회)에 맞춰 매일 18:00 UTC(한국 03:00)로 잡혀 있다.
  서버 처리 옵션을 켜서 1시간 TTL 을 보장해야 할 때는 Pro 플랜에서 `*/10 * * * *` 로 바꾸거나 외부 스케줄러로 같은 엔드포인트를 호출한다.
- 환경변수가 없으면 크론 엔드포인트는 인증 실패 시 401, 인증 성공 시 503(설정 없음)을 돌려주며 페이지 동작에는 영향이 없다.
- 배포 후 확인: `curl -sI https://<도메인>/ | grep -i cache-control` 이 `no-store` 여야 한다.

## 검증

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## 파기(cleanup) 크론 수동 실행

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/cleanup
```

응답의 `deleted` / `failed` 와 DB 의 `CleanupRun` 테이블로 실제 삭제 여부를 확인할 수 있다.
