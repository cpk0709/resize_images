/**
 * 클라이언트/서버 공용 상수. 비밀값은 여기에 두지 않는다.
 */

/** 파일 보존 시간(ms). PRD 3.6: 생성 후 1시간이 지나면 무조건 삭제. */
export const FILE_TTL_MS = 60 * 60 * 1000;

/** 관공서 사이트에서 흔한 첨부 용량 제한 프리셋(MB). 슬라이더/버튼 UI에서 사용. */
export const TARGET_SIZE_PRESETS_MB = [2, 5, 10, 20] as const;
export const DEFAULT_TARGET_SIZE_MB = 10;

/** 최종 다운로드 포맷. PRD 3.1 */
export const OUTPUT_FORMATS = ["jpeg", "png", "pdf"] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export const OUTPUT_MIME: Record<OutputFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf",
};

export const OUTPUT_EXTENSION: Record<OutputFormat, string> = {
  jpeg: "jpg",
  png: "png",
  pdf: "pdf",
};

/**
 * 업로드 허용 입력 MIME. HEIC/HEIF 는 브라우저에서 heic2any 로 JPEG 변환 후 처리한다.
 * 일부 브라우저는 HEIC 파일의 type 을 빈 문자열로 주므로 확장자 검사도 병행해야 한다.
 */
export const ACCEPTED_INPUT_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
  "image/bmp",
  "image/tiff",
] as const;

export const ACCEPTED_INPUT_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
  "gif",
  "bmp",
  "tif",
  "tiff",
] as const;

/**
 * `<input type="file" accept>` 에 넣는 문자열. MIME 과 확장자를 모두 나열해야
 * Windows 탐색기(HEIC MIME 미등록)와 macOS Finder 양쪽에서 HEIC 가 선택 가능하다.
 */
export const ACCEPT_ATTRIBUTE = [
  ...ACCEPTED_INPUT_MIME,
  ...ACCEPTED_INPUT_EXTENSIONS.map((ext) => `.${ext}`),
].join(",");

/**
 * 브라우저에서 받아들이는 파일 1개 상한. 48MP 아이폰 HEIC 가 10~15MB, ProRAW 급은 제외 대상.
 * 서버 폴백 상한(env MAX_UPLOAD_MB)과는 별개다.
 */
export const MAX_INPUT_FILE_BYTES = 100 * 1024 * 1024;

/** 한 번에 다룰 수 있는 이미지 수. 계약서 수십 장 수준이면 충분하고, 그 이상은 메모리 위험. */
export const MAX_INPUT_FILES = 30;

/** 이어붙이기 방향. PRD 3.3 */
export const STITCH_DIRECTIONS = ["vertical", "horizontal"] as const;
export type StitchDirection = (typeof STITCH_DIRECTIONS)[number];

export const MB = 1024 * 1024;
