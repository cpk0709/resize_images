/**
 * 브라우저 이미지 파이프라인의 공통 데이터 모델.
 * Phase 2-1(업로드) 에서 만들어지고, 2-2(압축) · 2-3(이어붙이기) · 2-4(편집) 가 그대로 소비한다.
 */

/**
 * 브라우저가 디코딩할 수 있는 상태로 준비된 원본 이미지 1장.
 *
 * - HEIC 는 이미 JPEG 로 변환되어 `blob` 에 들어 있다. 원본 HEIC Blob 은 보관하지 않는다 (메모리 절약).
 * - `previewUrl` 은 `URL.createObjectURL` 결과다. 이 객체를 버릴 때 반드시 `releaseSourceImage()` 로 해제한다.
 * - 원본 파일명은 결과 파일명의 기본값을 만들 때만 쓴다. 서버로 보내거나 로그에 남기지 않는다 (CLAUDE.md 원칙 4).
 */
export interface SourceImage {
  /** 세션 내 고유 ID (crypto.randomUUID). React key 와 삭제 식별자로 사용. */
  id: string;
  originalName: string;
  /** 사용자가 올린 파일의 바이트 수. 변환 후 크기는 `blob.size`. */
  originalSize: number;
  /** 매직 바이트로 판별한 원본 MIME. `file.type` 이 비어 있어도 신뢰할 수 있는 값. */
  originalMime: string;
  /** 디코딩 가능한 이미지 데이터. HEIC 였다면 image/jpeg. */
  blob: Blob;
  /** `blob` 의 MIME */
  mime: string;
  /** EXIF 회전이 반영된 표시 기준 크기(px) */
  width: number;
  height: number;
  previewUrl: string;
  convertedFromHeic: boolean;
}

/** 파일 1개의 형식 판별 결과 */
export interface DetectedImageType {
  mime: string;
  isHeic: boolean;
}
