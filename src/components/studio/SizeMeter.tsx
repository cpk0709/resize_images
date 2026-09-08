"use client";

import { MB } from "@/lib/constants";
import { formatBytes } from "@/lib/format";

/** 신호등에 올릴 파일 1개의 현재 크기 */
export interface SizeSample {
  id: string;
  name: string;
  bytes: number;
  /** result: 최적화 결과 크기, original: 아직 최적화 전 원본 크기 */
  kind: "original" | "result";
}

interface SizeMeterProps {
  /** 파일 1개당 상한. null 이면 기준선 없이 크기만 보여준다. */
  limitBytes: number | null;
  samples: SizeSample[];
}

type Verdict = "empty" | "pass" | "needs-optimize" | "over-limit" | "no-limit";

/**
 * 라이브 용량 신호등. 가장 큰 파일 1장을 기준으로 합격선 대비 위치를 보여준다.
 * "가장 큰 파일" 을 쓰는 이유: 관공서 제한은 파일 1개당이므로, 가장 큰 파일이 통과하면 전부 통과다.
 */
export function SizeMeter({ limitBytes, samples }: SizeMeterProps) {
  const worst = samples.reduce<SizeSample | null>((acc, s) => (acc && acc.bytes >= s.bytes ? acc : s), null);
  const passCount = limitBytes === null ? samples.length : samples.filter((s) => s.bytes <= limitBytes).length;

  const verdict: Verdict = !worst
    ? "empty"
    : limitBytes === null
      ? "no-limit"
      : worst.bytes <= limitBytes
        ? "pass"
        : worst.kind === "result"
          ? "over-limit"
          : "needs-optimize";

  // 눈금: 0 · 기준선 · 끝. 끝은 기준선의 2배와 현재 최대값 중 큰 쪽이라 마커가 항상 바 안에 들어온다.
  const scaleMax = Math.max(limitBytes !== null ? limitBytes * 2 : 0, worst ? worst.bytes * 1.15 : 0, 1 * MB);
  const fillPct = worst ? Math.min(100, (worst.bytes / scaleMax) * 100) : 0;
  const limitPct = limitBytes !== null ? Math.min(100, (limitBytes / scaleMax) * 100) : null;

  const tone = VERDICT_TONE[verdict];

  return (
    <div aria-live="polite">
      <div className="flex items-end justify-between gap-2">
        <span
          className={`inline-block rounded-lg px-3 py-1.5 text-base font-bold text-white ${tone.bubble}`}
          style={{ visibility: worst ? "visible" : "hidden" }}
        >
          {worst ? formatBytes(worst.bytes) : "-"}
        </span>
        <span className={`text-sm font-semibold ${tone.text}`}>{VERDICT_LABEL[verdict]}</span>
      </div>

      <div className="relative mt-2 h-3 w-full overflow-hidden rounded-full bg-line" role="presentation">
        <div className={`h-full rounded-full transition-[width] duration-300 ${tone.bar}`} style={{ width: `${fillPct}%` }} />
        {limitPct !== null && (
          <div
            className="absolute top-0 h-full w-0.5 bg-navy/70"
            style={{ left: `calc(${limitPct}% - 1px)` }}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="relative mt-1 h-4 text-xs text-muted">
        <span className="absolute left-0">0</span>
        {limitBytes !== null && limitPct !== null && (
          <span className="absolute -translate-x-1/2 font-medium text-navy" style={{ left: `${limitPct}%` }}>
            {formatBytes(limitBytes, 0)}
          </span>
        )}
        <span className="absolute right-0">{formatBytes(scaleMax, 0)}</span>
      </div>

      <p className="mt-2 text-xs text-muted">
        {worst
          ? `${samples.length}장 중 ${passCount}장 통과 · 가장 큰 파일: ${worst.name}`
          : "서류를 추가하면 용량을 표시합니다."}
      </p>
    </div>
  );
}

const VERDICT_LABEL: Record<Verdict, string> = {
  empty: "대기 중",
  pass: "통과 (합격)",
  "needs-optimize": "초과 · 최적화 필요",
  "over-limit": "초과 · 목표를 늘리거나 JPG 선택",
  "no-limit": "기준 없음",
};

const VERDICT_TONE: Record<Verdict, { bubble: string; bar: string; text: string }> = {
  empty: { bubble: "bg-muted", bar: "bg-muted", text: "text-muted" },
  pass: { bubble: "bg-pass", bar: "bg-pass", text: "text-pass" },
  "needs-optimize": { bubble: "bg-warn", bar: "bg-warn", text: "text-warn" },
  "over-limit": { bubble: "bg-fail", bar: "bg-fail", text: "text-fail" },
  "no-limit": { bubble: "bg-navy", bar: "bg-navy", text: "text-navy" },
};
