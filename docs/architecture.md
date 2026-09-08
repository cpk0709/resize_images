# DocuFit 아키텍처 및 설계 결정

## 1. 왜 "브라우저 우선(client-first)" 인가

PRD 의 출발점은 "민감한 서류를 출처 모를 사이트에 올리는 게 찝찝하다" 이다.
가장 확실한 프라이버시 보호는 **서버에 파일이 도달하지 않는 것**이다. 다행히 PRD 의 핵심 기능은 전부 브라우저에서 구현 가능하다.

| 기능 | 브라우저 구현 | 서버 필요 여부 |
|---|---|---|
| HEIC → JPEG | `heic2any` (PRD 도 클라이언트 처리 권장) | 없음 |
| 이어붙이기 / 크롭 / 가리기 | Canvas API (`fabric` v7) | 없음 |
| 목표 용량 압축 | `canvas.toBlob("image/jpeg", q)` 를 q 와 해상도에 대해 이진 탐색 | 없음 (폴백만) |
| PDF 병합 | `pdf-lib` (순수 JS, 브라우저 동작) | 없음 |
| 다운로드 | `URL.createObjectURL` + `<a download>` | 없음 |

따라서 기본 경로는 **파일이 사용자 기기를 벗어나지 않는다.** 이 경우 S3/DB 도 건드리지 않는다.

## 2. 그럼 서버(sharp) / S3 / DB 는 언제 쓰나

PRD 3.2, 3.5 가 요구하는 서버 경로는 **폴백**으로 유지한다.

- 브라우저 Canvas 는 픽셀 상한(대략 16k x 16k, 모바일 Safari 는 훨씬 작음)이 있어 A4 스캔 5~6장을 세로로 이어붙이면 실패할 수 있다.
- 저사양 모바일에서 수십 MB 이미지를 여러 장 처리하면 탭이 죽을 수 있다.
- 이때만 사용자에게 "서버에서 처리(1시간 후 자동 삭제)" 를 명시적으로 안내하고 동의 후 전송한다.

서버 경로 규칙:
1. 전송되는 것은 **가리기 등 편집이 끝난 결과**다. 원본은 절대 아니다.
2. 서버는 sharp 로 압축/PDF 변환 후 결과만 S3 에 저장하고 `FileAsset(kind=RESULT)` 를 만든다.
3. 다운로드는 10분짜리 presigned URL. 파일은 60분 뒤 파기.

## 3. TTL 파기가 실제로 동작함을 보장하는 방법

PRD 3.6 은 "무조건 1시간 후 삭제" 를 요구한다. 두 겹으로 방어한다.

1. **1차: 애플리케이션 크론** (`/api/cron/cleanup`, 10분 간격)
   - `expiresAt <= now` 인 레코드를 조회 → S3 객체 삭제 → 성공한 것만 DB 삭제.
   - 실패한 키는 DB 에 남겨 다음 실행에서 재시도한다. "DB 에서만 지워지고 S3 에 남는" 고아 객체를 방지.
   - 매 실행을 `CleanupRun` 에 기록해 "정말 지워졌는가"를 사후 검증할 수 있다.
   - 실제 최대 보존 시간 = 60분 + 크론 간격(10분) = 70분. 간격을 늘리면 그만큼 늘어난다.
2. **2차: S3 Lifecycle Rule** (`Expiration: 1 day`)
   - S3 Lifecycle 은 **하루 단위**가 최소라서 1시간 TTL 을 직접 구현할 수 없다. 크론이 죽었을 때의 안전망이다.
   - 버킷 설정 예시는 아래.

```json
{
  "Rules": [
    {
      "ID": "docufit-expire-all",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "Expiration": { "Days": 1 },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 1 }
    }
  ]
}
```

주의: Vercel Hobby 플랜은 크론이 하루 1회로 제한된다. 10분 간격이 필요하면 Pro 플랜 또는 외부 스케줄러(GitHub Actions `schedule`, Cloudflare Cron Trigger 등)로 같은 엔드포인트를 호출한다.

## 4. 데이터 최소화

- DB 에는 이미지 내용이 없다. S3 키, MIME, 바이트 수, 크기, 시각, 익명 세션 ID 만 저장한다.
- S3 키에 원본 파일명을 넣지 않는다 (`{kind}/{date}/{sessionId}/{assetId}.{ext}`).
- 결과 이미지는 EXIF 를 제거한다 (GPS, 촬영 시각, 기기 정보). sharp 는 기본적으로 메타데이터를 버리며, 브라우저 Canvas 재인코딩도 EXIF 를 남기지 않는다.
- 익명 세션 ID 는 httpOnly 쿠키. 회원/로그인/이메일 없음.
- 전역 응답 헤더 `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`.

## 5. 목표 용량 압축 알고리즘 (Phase 3 에서 구현)

브라우저와 서버가 같은 전략을 쓴다.

```
input: image, targetBytes, format(jpeg|png|pdf)
1. 해상도 상한을 먼저 정한다 (긴 변 4000px 정도; 관공서 열람용으로 충분).
2. JPEG quality 를 [40, 95] 에서 이진 탐색해 targetBytes 이하가 되는 최대 quality 를 찾는다 (최대 6~7회 인코딩).
3. quality 40 에서도 초과하면 긴 변을 0.85배씩 줄이며 2 를 반복한다.
4. PNG 는 quality 개념이 없으므로 해상도 축소만 사용하고, 사진류는 JPEG 로 유도한다.
5. PDF 는 위에서 만든 JPEG 를 페이지로 삽입하므로 페이지별 예산 = targetBytes / 페이지수 * 0.95 로 나눠 압축한다.
```

## 6. 미결 사항 (사용자 결정 필요)

- 서버 폴백 경로를 MVP 에 포함할지, 아니면 브라우저 전용으로 먼저 출시할지.
- 배포 대상 (Vercel + AWS S3 / Cloudflare Pages + R2 / 자체 서버 + MinIO). 크론 간격 제약이 달라진다.
