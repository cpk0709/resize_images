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

/** 이미지 카드 하단에 붙는 압축 상태 한 줄. 결과가 없으면 아무것도 그리지 않는다. */
export function CompressionResultLine({ image, entry, targetMB, onDownload }: CompressionResultLineProps) {
  if (!entry) return null;

  if (entry.status === "working") {
    return (
      <p className="mt-1 animate-pulse text-xs text-blue-600 dark:text-blue-400" aria-live="polite">
        최적화 중…
      </p>
    );
  }

  if (entry.status === "error") {
    return (
      <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
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
      <p className="text-neutral-700 dark:text-neutral-300">
        → <strong>{formatBytes(result.blob.size)}</strong> ({reductionLabel}) · {result.width}×{result.height}
        {result.quality !== null && ` · 품질 ${Math.round(result.quality * 100)}`}
        <button
          type="button"
          onClick={onDownload}
          className="ml-2 rounded border border-neutral-300 px-2 py-0.5 font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          다운로드
        </button>
      </p>
      {!result.fitsTarget && (
        <p className="text-amber-700 dark:text-amber-400" role="alert">
          최소 해상도까지 줄여도 {targetMB}MB({formatBytes(targetMB * MB)}) 를 넘습니다. 목표 용량을 늘리거나 JPG 를
          선택해 보세요.
        </p>
      )}
    </div>
  );
}
