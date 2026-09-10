"use client";

import { summarizeSizes, VERDICT_LABEL, VERDICT_TONE, type SizeSample } from "@/components/studio/sizeVerdict";
import { IconClose, IconDocument } from "@/components/ui/icons";
import type { UploadItem } from "@/hooks/useSourceImages";
import { formatBytes } from "@/lib/format";

interface StatusBarProps {
  /** 목록의 전체 항목(변환 중 포함) */
  items: UploadItem[];
  /** 준비된 장수 */
  readyCount: number;
  processingCount: number;
  /** 현재 선택된 카드 */
  selected: UploadItem | undefined;
  onRemoveSelected: () => void;
  limitBytes: number | null;
  samples: SizeSample[];
  /** 최적화 절감량. 결과가 하나도 없으면 null */
  savings: { beforeBytes: number; afterBytes: number } | null;
  isRunning: boolean;
}

/**
 * 데스크톱 하단 상태 바. 왼쪽은 "무엇을 다루고 있나"(장수·선택 파일), 오른쪽은 "지금 상태"(용량 판정·절감량).
 * 모바일은 화면 하단 고정 액션 바(ActionBar)가 같은 역할을 하므로 lg 미만에서는 그리지 않는다.
 */
export function StatusBar({ items, readyCount, processingCount, selected, onRemoveSelected, limitBytes, samples, savings, isRunning }: StatusBarProps) {
  const { verdict } = summarizeSizes(limitBytes, samples);
  const tone = VERDICT_TONE[verdict];
  const saved = savings ? savings.beforeBytes - savings.afterBytes : 0;
  const savedPct = savings && savings.beforeBytes > 0 ? Math.round((saved / savings.beforeBytes) * 100) : 0;

  return (
    <div className="hidden items-center justify-between gap-4 rounded-card border border-line bg-panel px-4 py-2.5 text-xs lg:flex" data-testid="status-bar" aria-live="polite">
      <div className="flex min-w-0 items-center gap-3">
        <span className="shrink-0 font-semibold text-ink">
          {items.length === 0 ? "선택된 파일 없음" : `${readyCount}장 준비됨`}
          {processingCount > 0 && <span className="ml-1 font-normal text-muted">· {processingCount}장 변환 중</span>}
        </span>
        {selected && (
          <>
            <span className="h-4 w-px bg-line" aria-hidden="true" />
            <span className="flex min-w-0 items-center gap-1.5 text-muted">
              <IconDocument className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate font-medium text-ink" title={selected.name}>
                {selected.name}
              </span>
              <span className="shrink-0 tabular-nums">{formatBytes(selected.image?.blob.size ?? selected.size)}</span>
              <button
                type="button"
                onClick={onRemoveSelected}
                disabled={isRunning}
                aria-label={`${selected.name} 제거`}
                title="이 파일 제거"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-subtle hover:bg-surface hover:text-ink disabled:opacity-40"
              >
                <IconClose className="h-3 w-3" />
              </button>
            </span>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <span className={`inline-flex items-center gap-1.5 font-semibold ${tone.text}`}>
          <span className={`h-2 w-2 rounded-full ${tone.dot}`} aria-hidden="true" />
          {isRunning ? "최적화 중…" : verdict === "pass" && savings ? "최적화 완료" : VERDICT_LABEL[verdict]}
        </span>
        {savings && saved > 0 && (
          <span className="text-muted">
            절감 용량 <strong className="font-semibold tabular-nums text-ink">{formatBytes(saved)}</strong> ({savedPct}%)
          </span>
        )}
      </div>
    </div>
  );
}
