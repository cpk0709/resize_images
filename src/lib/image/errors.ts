/**
 * 이미지 파이프라인 공통 오류.
 *
 * - `userMessage` 는 그대로 화면에 보여도 되는 한국어 문장이다. 내부 정보(스택, 라이브러리 이름)를 담지 않는다.
 * - `cause` 에는 원본 오류를 보존해 콘솔/로그에서 원인을 추적할 수 있게 한다.
 * - `code` 는 UI 가 분기하거나 테스트가 단언할 때 쓰는 안정된 식별자다. 문구가 바뀌어도 code 는 유지한다.
 */
export type ImageErrorCode =
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "TOO_MANY_FILES"
  | "UNSUPPORTED_FORMAT"
  | "DUPLICATE_FILE"
  | "HEIC_CONVERSION_FAILED"
  | "DECODE_FAILED";

export class ImageProcessingError extends Error {
  readonly code: ImageErrorCode;
  readonly userMessage: string;

  constructor(code: ImageErrorCode, userMessage: string, options?: { cause?: unknown }) {
    super(`${code}: ${userMessage}`, options);
    this.name = "ImageProcessingError";
    this.code = code;
    this.userMessage = userMessage;
  }
}

/** 알 수 없는 예외를 사용자에게 보여줄 문장으로 바꾼다. 우리가 던진 오류면 그 문장을 그대로 쓴다. */
export function toUserMessage(err: unknown, fallback = "처리 중 알 수 없는 문제가 발생했습니다."): string {
  return err instanceof ImageProcessingError ? err.userMessage : fallback;
}
