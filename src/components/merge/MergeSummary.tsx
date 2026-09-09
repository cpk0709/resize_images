"use client";

import type { MergeEntry } from "@/hooks/useMergeExport";
import { MB, type OutputFormat, type OutputLayout } from "@/lib/constants";
import { formatBytes } from "@/lib/format";

interface MergeSummaryProps {
  layout: OutputLayout;
  format: OutputFormat;
  imageCount: number;
  targetMB: number;
  entry: MergeEntry | null;
  onDownload: () => void;
}

const LAYOUT_LABEL: Record<OutputLayout, string> = {
  separate: "장마다 한 페이지",
  vertical: "세로로 이어붙이기",
  horizontal: "가로로 이어붙이기",
};

/** 미리보기 패널의 병합 출력 요약 카드. 무엇이 만들어지는지와 결과 상태를 보여준다. */
export function MergeSummary({ layout, format, imageCount, targetMB, entry, onDownload }: MergeSummaryProps) {
  const what =
    format === "pdf"
      ? layout === "separate"
        ? `PDF 1개 · ${imageCount}페이지 (A4, ${LAYOUT_LABEL[layout]})`
        : `PDF 1개 · 1페이지 (${LAYOUT_LABEL[layout]})`
      : `${format === "png" ? "PNG" : "JPG"} 1장 (${LAYOUT_LABEL[layout]})`;

  return (
    <div className="rounded-xl border border-line p-4 text-sm" data-testid="merge-summary">
      <p className="flex items-center justify-between gap-2 font-semibold">
        병합 출력
        <span className="shrink-0 whitespace-nowrap rounded bg-pass-soft px-1.5 py-0.5 text-[11px] font-medium text-pass">사용 가능</span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        {what}. 순서는 카드 덱 순서(1 → {imageCount})를 따릅니다. 목표 용량 {formatBytes(targetMB * MB, 1)} 은 파일 하나에 적용됩니다.
      </p>

      {entry?.status === "working" && (
        <p className="mt-2 animate-pulse text-xs font-medium text-accent" aria-live="polite">
          병합 최적화 중…
        </p>
      )}
      {entry?.status === "error" && (
        <p className="mt-2 text-xs text-fail" role="alert">
          {entry.error}
        </p>
      )}
      {entry?.status === "done" && entry.result && (
        <div className="mt-2 space-y-1 text-xs">
          <p className={entry.result.fitsTarget ? "text-pass" : "text-fail"}>
            → <strong>{formatBytes(entry.result.blob.size)}</strong>
            {entry.result.width && ` · ${entry.result.width}×${entry.result.height}`}
            {format === "pdf" && ` · ${entry.result.pageCount}페이지`}
            <button
              type="button"
              onClick={onDownload}
              className="ml-2 rounded border border-line bg-panel px-2 py-0.5 font-medium text-ink hover:bg-surface"
            >
              다운로드
            </button>
          </p>
          {!entry.result.fitsTarget && (
            <p className="text-warn" role="alert">
              최소 품질·해상도까지 줄여도 목표를 넘습니다. 목표 용량을 늘리거나 장수를 나눠 보세요.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
