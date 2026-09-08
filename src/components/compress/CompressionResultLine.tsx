"use client";

import type { CompressionEntry } from "@/hooks/useCompression";
import { MB } from "@/lib/constants";
import { formatBytes } from "@/lib/format";
import type { SourceImage } from "@/lib/image/types";

interface CompressionResultLineProps {
  image: SourceImage;
  entry: CompressionEntry | undefined;
  targetMB: number;
  onDownload: () => void;
}

/** 서류 카드 하단에 붙는 압축 상태 한 줄. 결과가 없으면 아무것도 그리지 않는다. */
export function CompressionResultLine({ image, entry, targetMB, onDownload }: CompressionResultLineProps) {
  if (!entry) return null;

  if (entry.status === "working") {
    return (
      <p className="mt-1 animate-pulse text-xs font-medium text-accent" aria-live="polite">
        최적화 중…
      </p>
    );
  }

  if (entry.status === "error") {
    return (
      <p className="mt-1 text-xs text-fail" role="alert">
        {entry.error}
      </p>
    );
  }

  const { result } = entry;
  if (!result) return null;

  const reduction = 1 - result.blob.size / image.originalSize;
  const reductionLabel = reduction > 0 ? `${Math.round(reduction * 100)}% 감소` : "원본과 비슷";

  return (
    <div className="mt-1 space-y-0.5 text-xs">
      <p className={result.fitsTarget ? "text-pass" : "text-fail"}>
        → <strong>{formatBytes(result.blob.size)}</strong> ({reductionLabel})
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          className="ml-2 rounded border border-line bg-panel px-2 py-0.5 font-medium text-ink hover:bg-surface"
        >
          다운로드
        </button>
      </p>
      {!result.fitsTarget && (
        <p className="text-warn" role="alert">
          최소 해상도까지 줄여도 {formatBytes(targetMB * MB, 1)} 를 넘습니다. 목표를 늘리거나 JPG 를 선택해 보세요.
        </p>
      )}
    </div>
  );
}
