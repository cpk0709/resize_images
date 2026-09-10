"use client";

import type { CompressionEntry } from "@/hooks/useCompression";
import { IconButton } from "@/components/ui/Button";
import { IconDownload } from "@/components/ui/icons";
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
      <p className="mt-1.5 animate-pulse text-[11px] font-medium text-brand" aria-live="polite">
        최적화 중…
      </p>
    );
  }

  if (entry.status === "error") {
    return (
      <p className="mt-1.5 text-[11px] text-fail" role="alert">
        {entry.error}
      </p>
    );
  }

  const { result } = entry;
  if (!result) return null;

  const reduction = 1 - result.blob.size / image.originalSize;
  const reductionLabel = reduction > 0.005 ? `−${Math.round(reduction * 100)}%` : "≈ 원본";

  return (
    <div className="mt-1.5 space-y-1 text-[11px]">
      <div className={`flex items-center justify-between gap-2 ${result.fitsTarget ? "text-pass" : "text-fail"}`}>
        <p className="min-w-0 truncate tabular-nums">
          → <strong>{formatBytes(result.blob.size)}</strong> <span className="opacity-80">({reductionLabel})</span>
        </p>
        <IconButton
          label="이 파일 다운로드"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
        >
          <IconDownload className="h-3.5 w-3.5" />
        </IconButton>
      </div>
      {!result.fitsTarget && (
        <p className="text-warn" role="alert">
          최소 해상도까지 줄여도 {formatBytes(targetMB * MB, 1)} 를 넘습니다. 목표를 늘리거나 JPG 를 선택해 보세요.
        </p>
      )}
    </div>
  );
}
