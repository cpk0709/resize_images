import { createCanvas, encodeCanvas, getContext2D, type AnyCanvas } from "@/lib/image/canvas";
import { decodeToBitmap } from "@/lib/image/decode";

/**
 * 편집 연산 적용 (브라우저 전용, React·fabric 무관).
 *
 * 인터랙티브 에디터(fabric)는 "어디를 어떻게" 만 결정하고, 실제 픽셀 변경은 전부 여기서 한다.
 * 그래야 편집 결과가 화면 배율·라이브러리와 무관하게 재현되고, 나중에 서버(sharp)로 옮기기도 쉽다.
 *
 * 적용 순서: 회전 → 가리기 → 크롭.
 * 가리기·크롭 좌표는 모두 **회전이 끝난 이미지 공간(px)** 기준이다. 사용자가 화면에서 본 그대로.
 */

export type Rotation = 0 | 90 | 180 | 270;

export interface RegionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * solid: 단색으로 완전히 덮는다(복구 불가). 주민번호 같은 식별 정보에 권장.
 * mosaic: 블록 픽셀화. 형태는 남지만 글자는 읽을 수 없다.
 */
export type MaskRegion = RegionRect & ({ style: "solid"; color: string } | { style: "mosaic" });

export const DEFAULT_MASK_COLOR = "#000000";

export interface EditOperations {
  rotation: Rotation;
  crop: RegionRect | null;
  masks: MaskRegion[];
}

export interface EditResult {
  blob: Blob;
  mime: string;
  width: number;
  height: number;
}

/** 중간·최종 결과 JPEG 품질. 압축 단계가 다시 인코딩하므로 여기서는 손실을 최소화한다. */
const EDIT_JPEG_QUALITY = 0.97;

export function isNoOp(ops: EditOperations): boolean {
  return ops.rotation === 0 && ops.crop === null && ops.masks.length === 0;
}

/**
 * 이미지를 `rotation` 만큼 돌렸을 때 영역이 가는 자리. 에디터가 회전 후에도 그려둔 영역을 유지할 때 쓴다.
 * `size` 는 회전 **전** 이미지 크기. 90 = 시계 방향(↻), 270 = 반시계(↺).
 *   90:  (x, y) → (H - y - h, x)       270: (x, y) → (y, W - x - w)       180: (x, y) → (W - x - w, H - y - h)
 */
export function rotateRegion(r: RegionRect, rotation: Rotation, size: { width: number; height: number }): RegionRect {
  const { width: W, height: H } = size;
  switch (rotation) {
    case 90:
      return { x: H - r.y - r.height, y: r.x, width: r.height, height: r.width };
    case 270:
      return { x: r.y, y: W - r.x - r.width, width: r.height, height: r.width };
    case 180:
      return { x: W - r.x - r.width, y: H - r.y - r.height, width: r.width, height: r.height };
    default:
      return { ...r };
  }
}

/** PNG 원본은 PNG 로(투명·선명도 유지), 그 외(JPEG·HEIC 변환본·WEBP 등)는 JPEG 로. */
export function editOutputMime(sourceMime: string): "image/png" | "image/jpeg" {
  return sourceMime === "image/png" ? "image/png" : "image/jpeg";
}

export async function applyEdits(source: Blob, sourceMime: string, ops: EditOperations): Promise<EditResult> {
  const bitmap = await decodeToBitmap(source);
  try {
    const rotated = drawRotated(bitmap, ops.rotation);
    const rotatedSize = { width: rotated.width, height: rotated.height };

    for (const mask of ops.masks) {
      const r = clampRegion(mask, rotatedSize);
      if (!r) continue;
      if (mask.style === "solid") fillSolid(rotated, r, mask.color);
      else pixelate(rotated, r);
    }

    const crop = ops.crop ? clampRegion(ops.crop, rotatedSize) : null;
    const finalCanvas = crop ? drawCropped(rotated, crop) : rotated;

    const mime = editOutputMime(sourceMime);
    const blob = await encodeCanvas(finalCanvas, mime, mime === "image/jpeg" ? EDIT_JPEG_QUALITY : undefined);
    return { blob, mime, width: finalCanvas.width, height: finalCanvas.height };
  } finally {
    bitmap.close();
  }
}

// ── 내부 구현 ──────────────────────────────────────────────────────────

function drawRotated(bitmap: ImageBitmap, rotation: Rotation): AnyCanvas {
  const swap = rotation === 90 || rotation === 270;
  const width = swap ? bitmap.height : bitmap.width;
  const height = swap ? bitmap.width : bitmap.height;
  const canvas = createCanvas(width, height);
  const ctx = getContext2D(canvas);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // 캔버스 중심을 기준으로 회전한 뒤, 비트맵을 중심 정렬로 그린다.
  // 변환은 반드시 되돌린다. 같은 컨텍스트로 이어서 그리는 가리기(fillRect)가 밀리지 않도록.
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  ctx.restore();
  return canvas;
}

function drawCropped(source: AnyCanvas, crop: RegionRect): AnyCanvas {
  const canvas = createCanvas(crop.width, crop.height);
  const ctx = getContext2D(canvas);
  ctx.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return canvas;
}

function fillSolid(canvas: AnyCanvas, r: RegionRect, color: string): void {
  const ctx = getContext2D(canvas);
  ctx.fillStyle = color;
  ctx.fillRect(r.x, r.y, r.width, r.height);
}

/** 영역을 픽셀화한 결과를 제자리에 덮어쓴다. */
function pixelate(canvas: AnyCanvas, r: RegionRect): void {
  const mosaic = renderMosaic(canvas, r);
  const ctx = getContext2D(canvas);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mosaic, 0, 0, mosaic.width, mosaic.height, r.x, r.y, r.width, r.height);
  ctx.imageSmoothingEnabled = true;
}

/** 모자이크 블록 한 변(px). 영역 짧은 변의 1/6, 최소 12px. 너무 작으면 식별 가능해 가리기 의미가 없다. */
export function mosaicBlockSize(r: RegionRect): number {
  return Math.max(12, Math.round(Math.min(r.width, r.height) / 6));
}

/**
 * `source` 의 `r` 영역을 블록 단위로 픽셀화한 캔버스(크기 r.width × r.height)를 돌려준다.
 * 최종 적용(edit)과 에디터 실시간 미리보기가 같은 함수를 써서 "보이는 대로 저장" 된다.
 */
export function renderMosaic(source: CanvasImageSource, r: RegionRect): AnyCanvas {
  const block = mosaicBlockSize(r);
  const smallW = Math.max(1, Math.round(r.width / block));
  const smallH = Math.max(1, Math.round(r.height / block));

  // 1) 축소: 블록마다 평균색 하나로
  const small = createCanvas(smallW, smallH);
  const sctx = getContext2D(small);
  sctx.imageSmoothingEnabled = true;
  sctx.drawImage(source, r.x, r.y, r.width, r.height, 0, 0, smallW, smallH);

  // 2) 보간 없이 원래 크기로 확대
  const out = createCanvas(Math.max(1, Math.round(r.width)), Math.max(1, Math.round(r.height)));
  const octx = getContext2D(out);
  octx.imageSmoothingEnabled = false;
  octx.drawImage(small, 0, 0, smallW, smallH, 0, 0, out.width, out.height);
  return out;
}

/** 이미지 경계 안으로 자르고 정수화. 남는 면적이 없으면 null. */
export function clampRegion(r: RegionRect, bounds: { width: number; height: number }): RegionRect | null {
  const x1 = Math.max(0, Math.floor(r.x));
  const y1 = Math.max(0, Math.floor(r.y));
  const x2 = Math.min(bounds.width, Math.ceil(r.x + r.width));
  const y2 = Math.min(bounds.height, Math.ceil(r.y + r.height));
  if (x2 - x1 < 1 || y2 - y1 < 1) return null;
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}
