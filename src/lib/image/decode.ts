import { ImageProcessingError } from "@/lib/image/errors";

/**
 * Blob → 픽셀 데이터 디코딩 (브라우저 전용).
 *
 * `createImageBitmap` 을 기본으로 쓰고, 특정 포맷을 거부하면 `<img>` 를 거쳐 한 번 더 시도한다.
 * - `imageOrientation: "from-image"` 로 EXIF 회전을 반영한다. 아이폰 세로 사진이 눕는 문제를 여기서 끝낸다.
 * - 반환된 ImageBitmap 은 GPU/메모리 자원이므로 사용 후 `close()` 해야 한다. 크기만 필요하면 `readImageSize` 를 쓴다.
 */

const DECODE_FAILED_MESSAGE = "이미지를 읽을 수 없습니다. 파일이 손상되었거나 브라우저가 지원하지 않는 형식입니다.";
const UNSUPPORTED_BROWSER_MESSAGE = "이 브라우저는 이미지 처리를 지원하지 않습니다. 최신 Chrome, Safari, Edge 를 사용해 주세요.";

export async function decodeToBitmap(blob: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap !== "function") {
    throw new ImageProcessingError("DECODE_FAILED", UNSUPPORTED_BROWSER_MESSAGE);
  }

  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch (cause) {
    // 일부 Safari 버전은 TIFF 등에서 Blob 직접 디코딩을 거부한다. <img> 디코더는 지원 폭이 더 넓다.
    return decodeViaImageElement(blob, cause);
  }
}

export interface ImageSize {
  width: number;
  height: number;
}

/** 표시 기준(EXIF 회전 반영) 크기. 비트맵은 즉시 해제한다. */
export async function readImageSize(blob: Blob): Promise<ImageSize> {
  const bitmap = await decodeToBitmap(blob);
  try {
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

async function decodeViaImageElement(blob: Blob, originalCause: unknown): Promise<ImageBitmap> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImageElement(url);
    // <img> 는 CSS 기본값(image-orientation: from-image)에 따라 이미 회전이 반영된 상태로 디코딩된다.
    return await createImageBitmap(img);
  } catch {
    throw new ImageProcessingError("DECODE_FAILED", DECODE_FAILED_MESSAGE, { cause: originalCause });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image element failed to load"));
    img.src = url;
  });
}
