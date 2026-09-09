import { ImageProcessingError } from "@/lib/image/errors";

/**
 * 캔버스 생성·그리기·인코딩 공용 유틸 (브라우저 전용).
 * compress(압축)와 edit(크롭·가리기·회전)가 함께 쓴다.
 *
 * OffscreenCanvas 를 우선 쓴다. DOM 에 붙이지 않아 가볍고, `convertToBlob` 이 Promise 를 돌려준다.
 * 지원하지 않는 브라우저에서는 일반 <canvas> 로 폴백.
 */

export type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
export type AnyContext2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export function createCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** 2D 컨텍스트. 두 캔버스 타입의 컨텍스트는 여기서 쓰는 API(drawImage, fillRect, imageSmoothing*)가 같다. */
export function getContext2D(canvas: AnyCanvas): AnyContext2D {
  const ctx = canvas.getContext("2d") as AnyContext2D | null;
  if (!ctx) {
    throw new ImageProcessingError(
      "ENCODE_FAILED",
      "이미지를 그릴 수 없습니다. 이미지가 너무 크거나 브라우저 메모리가 부족합니다.",
    );
  }
  return ctx;
}

/** 비트맵을 지정 크기로 고품질 리샘플링해 새 캔버스에 그린다. */
export function drawScaled(bitmap: ImageBitmap, width: number, height: number): AnyCanvas {
  const canvas = createCanvas(width, height);
  const ctx = getContext2D(canvas);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

export async function encodeCanvas(canvas: AnyCanvas, mime: string, quality?: number): Promise<Blob> {
  try {
    if (typeof OffscreenCanvas !== "undefined" && canvas instanceof OffscreenCanvas) {
      return await canvas.convertToBlob({ type: mime, quality });
    }
    const element = canvas as HTMLCanvasElement;
    const blob = await new Promise<Blob | null>((resolve) => element.toBlob(resolve, mime, quality));
    if (!blob) throw new Error("toBlob returned null");
    return blob;
  } catch (cause) {
    throw new ImageProcessingError("ENCODE_FAILED", "이미지를 저장 형식으로 변환하지 못했습니다.", { cause });
  }
}
