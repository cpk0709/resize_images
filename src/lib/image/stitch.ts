import { MAX_CANVAS_PIXELS, type StitchDirection } from "@/lib/constants";
import { createCanvas, getContext2D, type AnyCanvas } from "@/lib/image/canvas";
import { decodeToBitmap } from "@/lib/image/decode";
import { ImageProcessingError } from "@/lib/image/errors";

/**
 * 여러 장을 한 장으로 이어붙인다 (브라우저 전용, React 무관). PRD 3.3.
 *
 * - vertical: 위→아래. 모든 장을 같은 너비로 맞춘다 (가장 넓은 장 기준, 비율 유지).
 * - horizontal: 왼쪽→오른쪽. 모든 장을 같은 높이로 맞춘다.
 * - 결과 픽셀 수가 `maxPixels` 를 넘으면 전체를 비율대로 줄인다. 캔버스 한도를 넘으면 빈 이미지가 나오기 때문.
 *
 * 결과는 캔버스로 돌려준다. 인코딩(용량 맞춤)은 compress 가 맡는다. 중간 인코딩을 한 번 아끼기 위함.
 */

export interface StitchItem {
  blob: Blob;
  width: number;
  height: number;
}

export interface StitchOptions {
  direction: StitchDirection;
  /** 장 사이 간격(px, 결과 기준). 서류는 보통 0. */
  gap?: number;
  background?: string;
  maxPixels?: number;
  signal?: AbortSignal;
}

export interface StitchResult {
  canvas: AnyCanvas;
  width: number;
  height: number;
  /** 픽셀 한도 때문에 줄였으면 1 미만 */
  scale: number;
}

export async function stitchImages(items: StitchItem[], options: StitchOptions): Promise<StitchResult> {
  if (items.length === 0) {
    throw new ImageProcessingError("ENCODE_FAILED", "이어붙일 이미지가 없습니다.");
  }
  const gap = Math.max(0, options.gap ?? 0);
  const maxPixels = options.maxPixels ?? MAX_CANVAS_PIXELS;
  const vertical = options.direction === "vertical";

  // 1) 공통 변(너비 또는 높이)을 정하고 각 장의 배치 크기를 계산한다.
  const common = Math.max(...items.map((it) => (vertical ? it.width : it.height)));
  const layout = planLayout(items, common, vertical, gap);

  // 2) 픽셀 한도 초과 시 전체 축소
  let scale = 1;
  const total = layout.width * layout.height;
  if (total > maxPixels) {
    scale = Math.sqrt(maxPixels / total);
  }
  const width = Math.max(1, Math.round(layout.width * scale));
  const height = Math.max(1, Math.round(layout.height * scale));

  // 3) 그리기
  const canvas = createCanvas(width, height);
  const ctx = getContext2D(canvas);
  ctx.fillStyle = options.background ?? "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  for (let i = 0; i < items.length; i += 1) {
    if (options.signal?.aborted) throw new ImageProcessingError("ABORTED", "작업이 취소되었습니다.");
    const slot = layout.slots[i];
    const bitmap = await decodeToBitmap(items[i].blob);
    try {
      ctx.drawImage(bitmap, Math.round(slot.x * scale), Math.round(slot.y * scale), Math.round(slot.width * scale), Math.round(slot.height * scale));
    } finally {
      bitmap.close();
    }
  }

  return { canvas, width, height, scale };
}

interface Slot {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 축소 전 좌표계에서 각 장의 자리. 공통 변에 맞춰 비율대로 늘리거나 줄인다. */
function planLayout(items: StitchItem[], common: number, vertical: boolean, gap: number): { width: number; height: number; slots: Slot[] } {
  const slots: Slot[] = [];
  let cursor = 0;
  for (const it of items) {
    const ratio = vertical ? common / it.width : common / it.height;
    const w = vertical ? common : Math.round(it.width * ratio);
    const h = vertical ? Math.round(it.height * ratio) : common;
    slots.push(vertical ? { x: 0, y: cursor, width: w, height: h } : { x: cursor, y: 0, width: w, height: h });
    cursor += (vertical ? h : w) + gap;
  }
  const length = cursor - gap; // 마지막 간격 제외
  return vertical ? { width: common, height: length, slots } : { width: length, height: common, slots };
}
