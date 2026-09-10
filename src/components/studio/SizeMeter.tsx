"use client";

import { summarizeSizes, VERDICT_LABEL, VERDICT_TONE, type SizeSample } from "@/components/studio/sizeVerdict";
import { MB } from "@/lib/constants";
import { formatBytes } from "@/lib/format";

export type { SizeSample } from "@/components/studio/sizeVerdict";

interface SizeMeterProps {
  /** 파일 1개당 상한. null 이면 기준선 없이 크기만 보여준다. */
  limitBytes: number | null;
  samples: SizeSample[];
}

/** 라이브 용량 신호등. 가장 큰 파일 1장을 기준으로 합격선 대비 위치를 보여준다. */
export function SizeMeter({ limitBytes, samples }: SizeMeterProps) {
  const { verdict, worst, passCount, total } = summarizeSizes(limitBytes, samples);
  const tone = VERDICT_TONE[verdict];

  // 눈금: 0 · 기준선 · 끝. 끝은 기준선의 2배와 현재 최대값 중 큰 쪽이라 마커가 항상 바 안에 들어온다.
  const scaleMax = Math.max(limitBytes !== null ? limitBytes * 2 : 0, worst ? worst.bytes * 1.15 : 0, 1 * MB);
  const fillPct = worst ? Math.min(100, (worst.bytes / scaleMax) * 100) : 0;
  const limitPct = limitBytes !== null ? Math.min(100, (limitBytes / scaleMax) * 100) : null;

  return (
    <div className="rounded-xl border border-line bg-panel p-3.5" aria-live="polite">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] text-muted">가장 큰 파일</p>
          <p className={`text-xl font-bold tabular-nums leading-tight ${worst ? "text-ink-strong" : "text-subtle"}`}>{worst ? formatBytes(worst.bytes) : "—"}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.soft} ${tone.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
          {VERDICT_LABEL[verdict]}
        </span>
      </div>

      <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-surface" role="presentation">
        <div className={`h-full rounded-full transition-[width] duration-300 ${tone.dot}`} style={{ width: `${fillPct}%` }} />
        {limitPct !== null && (
          <div className="absolute top-0 h-full w-0.5 bg-ink-strong/60" style={{ left: `calc(${limitPct}% - 1px)` }} aria-hidden="true" />
        )}
      </div>

      <div className="relative mt-1 h-4 text-[11px] text-subtle">
        <span className="absolute left-0">0</span>
        {limitBytes !== null && limitPct !== null && (
          <span className="absolute -translate-x-1/2 font-semibold text-ink" style={{ left: `${limitPct}%` }}>
            {formatBytes(limitBytes, 0)}
          </span>
        )}
        <span className="absolute right-0">{formatBytes(scaleMax, 0)}</span>
      </div>

      <p className="mt-2 text-[11px] text-muted">
        {worst ? `${total}장 중 ${passCount}장 통과 · 가장 큰 파일: ${worst.name}` : "서류를 추가하면 용량을 표시합니다."}
      </p>
    </div>
  );
}
