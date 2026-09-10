"use client";

import type { OutputFormat, OutputLayout } from "@/lib/constants";
import type { MergeExportResult } from "@/lib/image/export";
import type { SourceImage } from "@/lib/image/types";

interface MergePreviewProps {
  /** 카드 덱 순서 그대로 */
  images: SourceImage[];
  layout: OutputLayout;
  format: OutputFormat;
  /** 병합이 끝났으면 결과. 없으면 배치 시뮬레이션을 보여준다. */
  result: MergeExportResult | null;
  /** 결과 페이지들의 object URL (useMergeExport 가 만들고 해제한다) */
  resultUrls: string[];
}

/**
 * 병합 출력 미리보기 (오른쪽 패널의 큰 영역).
 *
 * - 결과 전: 카드 덱 순서대로 원본 썸네일을 방향에 맞게 배열한다. 실제 병합과 같은 규칙(세로 = 같은 너비, 가로 = 같은 높이)으로
 *   늘리므로 순서·방향·비율을 미리 확인할 수 있다. 픽셀 병합은 하지 않는다 (가볍게).
 * - 결과 후: 실제 결과 이미지(PDF 는 안에 들어간 페이지 JPEG)를 보여준다. 보이는 것이 곧 내려받는 것.
 */
export function MergePreview({ images, layout, format, result, resultUrls }: MergePreviewProps) {
  if (images.length === 0) {
    return <p className="text-sm text-muted">서류를 추가하면 배치 미리보기가 표시됩니다.</p>;
  }

  if (result && resultUrls.length > 0) {
    const single = resultUrls.length === 1;
    return (
      <div className="flex h-full w-full flex-col">
        <Caption>{format === "pdf" ? `병합 결과 · PDF ${result.pageCount}페이지 (보이는 그대로 저장됩니다)` : "병합 결과 (보이는 그대로 저장됩니다)"}</Caption>
        <div className={`min-h-0 flex-1 ${single ? "flex items-center justify-center" : "overflow-auto"}`}>
          {single ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resultUrls[0]} alt="병합 결과 미리보기" className="max-h-full max-w-full rounded-md object-contain shadow-md" />
          ) : (
            <ol className="mx-auto flex max-w-[520px] flex-col gap-3">
              {resultUrls.map((url, i) => (
                <li key={url} className="relative">
                  <PageBadge>{i + 1}페이지</PageBadge>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`${i + 1}페이지 미리보기`} className="w-full rounded-md shadow-md" />
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    );
  }

  // ── 배치 시뮬레이션 ──
  if (layout === "separate") {
    // PDF 페이지별: 세로로 한 장씩, 페이지 번호
    return (
      <div className="flex h-full w-full flex-col">
        <Caption>배치 미리보기 · 장마다 한 페이지 (카드 덱 순서)</Caption>
        <ol className="mx-auto flex min-h-0 max-w-[520px] flex-1 flex-col gap-3 overflow-auto">
          {images.map((img, i) => (
            <li key={img.id} className="relative shrink-0">
              <PageBadge>{i + 1}페이지</PageBadge>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.previewUrl} alt={`${i + 1}페이지: ${img.originalName}`} className="w-full rounded-md bg-white shadow-md" />
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const vertical = layout === "vertical";
  return (
    <div className="flex h-full w-full flex-col">
      <Caption>배치 미리보기 · {vertical ? "위에서 아래로" : "왼쪽에서 오른쪽으로"} 이어붙입니다 (카드 덱 순서)</Caption>
      <div className={`min-h-0 flex-1 overflow-auto ${vertical ? "" : "flex items-center"}`}>
        <div
          className={vertical ? "mx-auto flex w-full max-w-[520px] flex-col shadow-md" : "mx-auto flex h-full flex-row shadow-md"}
          data-testid="merge-layout-preview"
        >
          {images.map((img, i) => (
            <div key={img.id} className={`relative ${vertical ? "w-full" : "h-full"} shrink-0`}>
              <PageBadge>{i + 1}</PageBadge>
              {/* 세로: 너비를 맞추고 높이는 비율대로. 가로: 높이를 맞추고 너비는 비율대로. 실제 병합 규칙과 같다. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.previewUrl}
                alt={`${i + 1}번: ${img.originalName}`}
                className={vertical ? "block w-full" : "block h-full w-auto"}
                style={vertical ? undefined : { maxHeight: "100%" }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 shrink-0 text-xs font-medium text-muted">{children}</p>;
}

function PageBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute left-1.5 top-1.5 z-10 rounded-md bg-navy/90 px-1.5 py-0.5 text-[11px] font-bold text-white shadow-sm">{children}</span>
  );
}
