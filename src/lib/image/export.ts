import { OUTPUT_MIME, type OutputFormat, type OutputLayout, type StitchDirection } from "@/lib/constants";
import { compressToTarget } from "@/lib/image/compress";
import { ImageProcessingError } from "@/lib/image/errors";
import { stitchImages } from "@/lib/image/stitch";
import type { SourceImage } from "@/lib/image/types";
import { buildPdf, type PdfPageImage } from "@/lib/pdf/build";

/**
 * "여러 장 → 파일 하나" 출력 오케스트레이터 (브라우저 전용, React 무관).
 *
 *   layout        format      결과
 *   ─────────────────────────────────────────────────────────
 *   vertical/     jpeg/png    이어붙인 이미지 1장을 목표 용량으로 압축
 *   horizontal    pdf         이어붙인 이미지 1장을 1페이지 PDF 로 (페이지 크기 fit)
 *   separate      pdf         장마다 1페이지인 PDF (A4, 목표 용량을 페이지 수로 나눠 배분)
 *   separate      jpeg/png    여기서 다루지 않음. 파일별 압축은 useCompression 이 맡는다.
 *
 * PDF 용량 맞춤: 페이지 예산 = (목표 - 구조 오버헤드) / 페이지 수 로 시작해 각 페이지를 JPEG 로 압축하고 조립한다.
 * 결과가 목표를 넘으면 초과 비율만큼 예산을 줄여 다시 시도한다 (최대 3회). 그래도 넘으면 fitsTarget=false.
 */

export interface MergeExportOptions {
  layout: OutputLayout;
  format: OutputFormat;
  targetBytes: number;
  signal?: AbortSignal;
}

export interface MergeExportResult {
  blob: Blob;
  mime: string;
  /** 이미지 출력일 때만. PDF 는 undefined */
  width?: number;
  height?: number;
  pageCount: number;
  fitsTarget: boolean;
}

const PDF_MAX_ATTEMPTS = 3;
/** pdf-lib 구조 오버헤드 추정치. 문서 4KB + 페이지당 1.5KB. 실측보다 약간 크게 잡아 첫 시도에 맞을 확률을 높인다. */
const PDF_OVERHEAD_BYTES = (pages: number) => 4 * 1024 + pages * 1.5 * 1024;
/** 페이지 1장에 이보다 작은 예산은 의미가 없다 (글자가 안 읽힘). */
const PDF_MIN_PAGE_BUDGET = 40 * 1024;

export async function produceMergedOutput(images: SourceImage[], options: MergeExportOptions): Promise<MergeExportResult> {
  if (images.length === 0) {
    throw new ImageProcessingError("ENCODE_FAILED", "출력할 이미지가 없습니다.");
  }
  if (options.layout === "separate" && options.format !== "pdf") {
    throw new ImageProcessingError("ENCODE_FAILED", "개별 이미지 출력은 파일별 압축 경로를 사용합니다.");
  }

  if (options.format === "pdf") {
    return options.layout === "separate"
      ? exportPdfPages(images, options)
      : exportStitchedPdf(images, options.layout, options);
  }
  return exportStitchedImage(images, options.layout as StitchDirection, options);
}

// ── 이어붙인 이미지 ──────────────────────────────────────────────────

async function exportStitchedImage(images: SourceImage[], direction: StitchDirection, options: MergeExportOptions): Promise<MergeExportResult> {
  const stitched = await stitchImages(images, { direction, signal: options.signal });
  const result = await compressToTarget(stitched.canvas, {
    targetBytes: options.targetBytes,
    format: options.format === "png" ? "png" : "jpeg",
    signal: options.signal,
  });
  return { blob: result.blob, mime: result.mime, width: result.width, height: result.height, pageCount: 1, fitsTarget: result.fitsTarget };
}

// ── PDF ─────────────────────────────────────────────────────────────

async function exportStitchedPdf(images: SourceImage[], direction: StitchDirection, options: MergeExportOptions): Promise<MergeExportResult> {
  const stitched = await stitchImages(images, { direction, signal: options.signal });
  return assemblePdfWithinBudget([stitched.canvas], "fit", options);
}

async function exportPdfPages(images: SourceImage[], options: MergeExportOptions): Promise<MergeExportResult> {
  return assemblePdfWithinBudget(
    images.map((img) => img.blob),
    "a4",
    options,
  );
}

/**
 * 페이지 소스들을 예산 안에서 JPEG 로 압축해 PDF 를 만든다. 총 용량이 목표를 넘으면 예산을 줄여 재시도.
 * 소스가 Blob 이면 매 시도마다 다시 디코딩하고, 캔버스면 그대로 재사용한다.
 */
async function assemblePdfWithinBudget(
  sources: (Blob | OffscreenCanvas | HTMLCanvasElement)[],
  pageSize: "a4" | "fit",
  options: MergeExportOptions,
): Promise<MergeExportResult> {
  const n = sources.length;
  let budget = Math.max(PDF_MIN_PAGE_BUDGET, (options.targetBytes - PDF_OVERHEAD_BYTES(n)) / n);
  let best: { blob: Blob; fits: boolean } | null = null;

  for (let attempt = 0; attempt < PDF_MAX_ATTEMPTS; attempt += 1) {
    if (options.signal?.aborted) throw new ImageProcessingError("ABORTED", "작업이 취소되었습니다.");

    const pages: PdfPageImage[] = [];
    for (const source of sources) {
      const page = await compressToTarget(source, { targetBytes: Math.floor(budget), format: "jpeg", signal: options.signal });
      pages.push({ blob: page.blob, mime: "image/jpeg", width: page.width, height: page.height });
    }

    const pdf = await buildPdf(pages, { pageSize, signal: options.signal });
    const fits = pdf.size <= options.targetBytes;
    if (!best || pdf.size < best.blob.size) best = { blob: pdf, fits };
    if (fits) break;

    // 초과 비율만큼 예산을 줄인다. 8% 여유를 더 둬 두 번째 시도에서 맞을 확률을 높인다.
    const nextBudget = budget * (options.targetBytes / pdf.size) * 0.92;
    if (nextBudget < PDF_MIN_PAGE_BUDGET) break;
    budget = nextBudget;
  }

  return { blob: best!.blob, mime: OUTPUT_MIME.pdf, pageCount: n, fitsTarget: best!.fits };
}
