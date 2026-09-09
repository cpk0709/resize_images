import { OUTPUT_MIME, type RasterFormat } from "@/lib/constants";
import { drawScaled, encodeCanvas } from "@/lib/image/canvas";
import { decodeToBitmap } from "@/lib/image/decode";
import { ImageProcessingError } from "@/lib/image/errors";

/**
 * 목표 용량 맞춤 압축 (브라우저 전용, React 무관).
 *
 * 전략 (docs/architecture.md 5장):
 *   1. 긴 변을 `maxLongSide` 이하로 먼저 맞춘다. 관공서 열람용으로 4000px 이면 충분하고, 캔버스 픽셀 한도(Safari 약 16.7M)도 피한다.
 *   2. JPEG: quality 를 [minQuality, maxQuality] 에서 이진 탐색해 목표 이하가 되는 **가장 높은** quality 를 찾는다.
 *      PNG: quality 개념이 없으므로 해상도 축소만 쓴다.
 *   3. 최저 quality 로도 초과하면 긴 변을 `downscaleStep` 배씩 줄이며 2 를 반복한다.
 *   4. 긴 변이 `minLongSide` 미만으로 내려가야 하면 포기하고, 지금까지 중 가장 작은 결과를 `fitsTarget: false` 로 돌려준다.
 *
 * 항상 재인코딩한다. 원본이 이미 목표 이하라도 그대로 돌려주지 않는 이유는 **EXIF(GPS, 촬영 시각, 기기 정보) 제거** 가
 * 이 단계의 부수 목적이기 때문이다 (CLAUDE.md 원칙 4). 캔버스를 거치면 메타데이터가 사라진다.
 */

export interface CompressTuning {
  /** 출력 긴 변 상한(px) */
  maxLongSide: number;
  /** 이 값 아래로는 줄이지 않는다. 서류 글자가 읽히지 않는 지점. */
  minLongSide: number;
  minQuality: number;
  maxQuality: number;
  /** 이진 탐색 반복 횟수. 6이면 quality 해상도 약 0.009 */
  qualitySearchSteps: number;
  /** 해상도 축소 비율 (0~1) */
  downscaleStep: number;
}

export const DEFAULT_COMPRESS_TUNING: Readonly<CompressTuning> = {
  maxLongSide: 4000,
  minLongSide: 600,
  minQuality: 0.4,
  maxQuality: 0.95,
  qualitySearchSteps: 6,
  downscaleStep: 0.85,
};

export interface CompressOptions {
  targetBytes: number;
  format: RasterFormat;
  tuning?: Partial<CompressTuning>;
  signal?: AbortSignal;
}

export interface CompressResult {
  blob: Blob;
  mime: string;
  width: number;
  height: number;
  /** JPEG quality (0~1). PNG 는 null */
  quality: number | null;
  /** 원본 대비 축소 배율 (1 = 원본 해상도) */
  scale: number;
  /** false 면 최소 해상도까지 줄여도 목표를 넘겼다는 뜻. UI 가 경고를 보여야 한다. */
  fitsTarget: boolean;
  /** 인코딩 횟수 (성능 진단용) */
  encodeCount: number;
}

export async function compressToTarget(source: Blob, options: CompressOptions): Promise<CompressResult> {
  const bitmap = await decodeToBitmap(source);
  try {
    return await compressBitmap(bitmap, options);
  } finally {
    bitmap.close();
  }
}

async function compressBitmap(bitmap: ImageBitmap, options: CompressOptions): Promise<CompressResult> {
  const t: CompressTuning = { ...DEFAULT_COMPRESS_TUNING, ...options.tuning };
  const mime = OUTPUT_MIME[options.format];
  const target = options.targetBytes;
  const sourceLongSide = Math.max(bitmap.width, bitmap.height);

  let scale = Math.min(1, t.maxLongSide / sourceLongSide);
  let encodeCount = 0;
  /** 아직 목표를 못 맞췄을 때 대비해 지금까지 가장 작은 결과를 보관 */
  let smallestSoFar: CompressResult | null = null;

  const makeResult = (blob: Blob, width: number, height: number, quality: number | null, fits: boolean): CompressResult => ({
    blob,
    mime,
    width,
    height,
    quality,
    scale,
    fitsTarget: fits,
    encodeCount,
  });

  for (;;) {
    throwIfAborted(options.signal);

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = drawScaled(bitmap, width, height);

    const encode = async (quality?: number): Promise<Blob> => {
      throwIfAborted(options.signal);
      encodeCount += 1;
      return encodeCanvas(canvas, mime, quality);
    };

    if (options.format === "png") {
      const blob = await encode();
      if (blob.size <= target) return makeResult(blob, width, height, null, true);
      smallestSoFar = pickSmaller(smallestSoFar, makeResult(blob, width, height, null, false));
    } else {
      // 최고 품질이 이미 목표 이하면 더 볼 것 없다 (작은 원본, 여유 있는 목표).
      const atMax = await encode(t.maxQuality);
      if (atMax.size <= target) return makeResult(atMax, width, height, t.maxQuality, true);

      // 최저 품질로도 넘치면 이 해상도에서는 답이 없다 → 축소로.
      const atMin = await encode(t.minQuality);
      if (atMin.size <= target) {
        const found = await searchHighestFittingQuality(encode, target, t, atMin);
        return makeResult(found.blob, width, height, found.quality, true);
      }
      smallestSoFar = pickSmaller(smallestSoFar, makeResult(atMin, width, height, t.minQuality, false));
    }

    const nextLongSide = Math.max(width, height) * t.downscaleStep;
    if (nextLongSide < t.minLongSide) {
      // smallestSoFar 는 이 시점에 반드시 존재한다 (위에서 최소 한 번은 대입됨).
      return { ...(smallestSoFar as CompressResult), encodeCount };
    }
    scale *= t.downscaleStep;
  }
}

/**
 * [minQuality, maxQuality] 구간에서 목표 이하가 되는 가장 높은 quality 를 이진 탐색.
 * 호출 전제: minQuality 결과는 목표 이하, maxQuality 결과는 초과.
 */
async function searchHighestFittingQuality(
  encode: (quality: number) => Promise<Blob>,
  target: number,
  t: CompressTuning,
  atMin: Blob,
): Promise<{ blob: Blob; quality: number }> {
  let lo = t.minQuality; // 항상 "맞는" 쪽
  let hi = t.maxQuality; // 항상 "넘치는" 쪽
  let best = { blob: atMin, quality: t.minQuality };

  for (let i = 0; i < t.qualitySearchSteps; i += 1) {
    const mid = (lo + hi) / 2;
    const blob = await encode(mid);
    if (blob.size <= target) {
      best = { blob, quality: mid };
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return best;
}

function pickSmaller(a: CompressResult | null, b: CompressResult): CompressResult {
  return a && a.blob.size <= b.blob.size ? a : b;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new ImageProcessingError("ABORTED", "작업이 취소되었습니다.");
  }
}
