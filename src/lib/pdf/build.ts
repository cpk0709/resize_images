import { ImageProcessingError } from "@/lib/image/errors";

/**
 * 이미지 → PDF 조립 (브라우저 전용, pdf-lib 동적 import).
 *
 * - 페이지 크기 "a4": 이미지 방향에 따라 A4 세로/가로를 고르고 여백 안에 비율대로 맞춘다. 서류 제출용 기본값.
 * - 페이지 크기 "fit": 이미지 비율 그대로, 긴 변을 A4 긴 변(841.89pt)에 맞춘다. 이어붙인 긴 이미지용.
 * - 메타데이터에 원본 파일명은 넣지 않는다 (파일명이 개인정보일 수 있음). 제작 도구 이름만.
 */

export interface PdfPageImage {
  blob: Blob;
  mime: "image/jpeg" | "image/png";
  width: number;
  height: number;
}

export interface BuildPdfOptions {
  pageSize?: "a4" | "fit";
  /** 여백(pt). a4 에서만 의미 있음. 기본 18pt(약 6mm). */
  marginPt?: number;
  signal?: AbortSignal;
}

const A4_PORTRAIT: [number, number] = [595.28, 841.89];

export async function buildPdf(pages: PdfPageImage[], options: BuildPdfOptions = {}): Promise<Blob> {
  if (pages.length === 0) {
    throw new ImageProcessingError("ENCODE_FAILED", "PDF 로 만들 페이지가 없습니다.");
  }
  const pageSize = options.pageSize ?? "a4";
  const margin = pageSize === "a4" ? Math.max(0, options.marginPt ?? 18) : 0;

  let PDFDocument: (typeof import("pdf-lib"))["PDFDocument"];
  try {
    ({ PDFDocument } = await import("pdf-lib"));
  } catch (cause) {
    throw new ImageProcessingError("ENCODE_FAILED", "PDF 모듈을 불러오지 못했습니다. 네트워크 상태를 확인하고 다시 시도해 주세요.", { cause });
  }

  try {
    // pdf-lib 는 save() 시 Producer 를 자기 이름으로 강제한다 (updateMetadata:false 로도 막히지 않음, 2026-09 확인).
    // Producer 는 개인정보가 아니므로 그대로 두고 Creator 만 우리 것으로 둔다. 원본 파일명은 어디에도 넣지 않는다.
    const doc = await PDFDocument.create();
    doc.setCreator("DocuFit");

    for (const page of pages) {
      if (options.signal?.aborted) throw new ImageProcessingError("ABORTED", "작업이 취소되었습니다.");
      const bytes = new Uint8Array(await page.blob.arrayBuffer());
      const image = page.mime === "image/png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);

      const [pageW, pageH] = pageDimensions(page.width, page.height, pageSize);
      const pdfPage = doc.addPage([pageW, pageH]);
      const fit = image.scaleToFit(pageW - margin * 2, pageH - margin * 2);
      pdfPage.drawImage(image, {
        x: (pageW - fit.width) / 2,
        y: (pageH - fit.height) / 2,
        width: fit.width,
        height: fit.height,
      });
    }

    const bytes = await doc.save({ useObjectStreams: true });
    // pdf-lib 는 Uint8Array<ArrayBufferLike> 를 돌려준다. Blob 은 ArrayBuffer 기반만 받으므로 한 번 복사한다.
    return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  } catch (cause) {
    if (cause instanceof ImageProcessingError) throw cause;
    throw new ImageProcessingError("ENCODE_FAILED", "PDF 를 만들지 못했습니다.", { cause });
  }
}

function pageDimensions(imageW: number, imageH: number, pageSize: "a4" | "fit"): [number, number] {
  const landscape = imageW > imageH;
  if (pageSize === "a4") {
    return landscape ? [A4_PORTRAIT[1], A4_PORTRAIT[0]] : A4_PORTRAIT;
  }
  const longSide = A4_PORTRAIT[1];
  const ratio = imageW / imageH;
  return landscape ? [longSide, longSide / ratio] : [longSide * ratio, longSide];
}
