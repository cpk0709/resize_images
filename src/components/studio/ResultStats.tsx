"use client";

import type { ReactNode } from "react";
import type { CompressionEntry } from "@/hooks/useCompression";
import type { MergeEntry } from "@/hooks/useMergeExport";
import type { UploadItem } from "@/hooks/useSourceImages";
import { MB, type OutputFormat, type OutputLayout } from "@/lib/constants";
import { formatBytes } from "@/lib/format";
import type { SourceImage } from "@/lib/image/types";

const FORMAT_LABEL: Record<OutputFormat, string> = { jpeg: "JPG", png: "PNG", pdf: "PDF" };

const LAYOUT_LABEL: Record<OutputLayout, string> = {
  separate: "장마다 한 페이지",
  vertical: "세로로 이어붙이기",
  horizontal: "가로로 이어붙이기",
};

/** 입력 MIME → 짧은 형식 이름 (HEIC 는 이미 JPEG 로 바뀌어 있어 originalMime 으로 판별) */
function sourceFormatLabel(mime: string): string {
  const sub = mime.split("/")[1]?.toUpperCase() ?? "이미지";
  if (sub === "JPEG") return "JPG";
  if (sub === "HEIF") return "HEIC";
  return sub;
}

export type ResultStatsProps =
  | {
      mode: "single";
      item: UploadItem;
      entry: CompressionEntry | undefined;
      format: OutputFormat;
      targetMB: number;
    }
  | {
      mode: "merge";
      images: SourceImage[];
      layout: OutputLayout;
      format: OutputFormat;
      targetMB: number;
      entry: MergeEntry | null;
    };

/**
 * "최적화 결과" 카드. 위 줄은 크기(현재 → 결과 → 절감률), 아래 줄은 형식·해상도(또는 구성)·품질(또는 목표).
 * 결과가 없을 때도 같은 틀을 유지해 "최적화 시작을 누르면 여기가 채워진다" 는 것이 보이게 한다.
 */
export function ResultStats(props: ResultStatsProps) {
  return props.mode === "single" ? <SingleStats {...props} /> : <MergeStats {...props} />;
}

function SingleStats({ item, entry, format, targetMB }: Extract<ResultStatsProps, { mode: "single" }>) {
  const image = item.image;
  const before = image && item.edited ? image.blob.size : item.size;
  const result = entry?.status === "done" ? entry.result : undefined;
  const after = result?.blob.size ?? null;
  const working = entry?.status === "working";

  const srcFormat = image ? sourceFormatLabel(image.originalMime) : "—";
  const outFormat = FORMAT_LABEL[format];
  const sizeText = image ? `${image.width}×${image.height}` : "—";
  const resized = result && image && (result.width !== image.width || result.height !== image.height);

  return (
    <StatsCard
      data-testid="result-stats"
      top={[
        { label: "현재 파일 크기", value: formatBytes(before) },
        { label: "최적화 후 크기", value: after !== null ? formatBytes(after) : working ? "처리 중…" : "—", muted: after === null },
        savingsCell(before, after),
      ]}
      bottom={[
        {
          label: "파일 형식",
          value: `${srcFormat} → ${outFormat}`,
          badge: image ? (image.convertedFromHeic ? "HEIC 변환됨" : srcFormat === outFormat ? "형식 유지" : "변환") : undefined,
        },
        {
          label: "해상도",
          value: result ? `${result.width}×${result.height}` : sizeText,
          badge: result ? (resized ? `원본 ${sizeText}` : "유지") : undefined,
        },
        {
          label: "이미지 품질",
          value: result ? (result.quality !== null ? `${Math.round(result.quality * 100)}%` : "무손실") : format === "png" ? "무손실" : "자동 (목표에 맞춤)",
        },
      ]}
      footer={
        entry?.status === "error" ? (
          <Note tone="fail">{entry.error}</Note>
        ) : result && !result.fitsTarget ? (
          <Note tone="warn">최소 해상도까지 줄여도 {formatBytes(targetMB * MB, 1)} 를 넘습니다. 목표를 늘리거나 JPG 를 선택해 보세요.</Note>
        ) : result ? (
          <Note tone="pass">목표 {formatBytes(targetMB * MB, 0)} 이내 · EXIF(위치·기기 정보) 제거됨</Note>
        ) : (
          <Note tone="muted">최적화를 시작하면 결과 크기와 절감률이 여기에 표시됩니다. 목표 {formatBytes(targetMB * MB, 0)} 은 파일 하나에 적용됩니다.</Note>
        )
      }
    />
  );
}

function MergeStats({ images, layout, format, targetMB, entry }: Extract<ResultStatsProps, { mode: "merge" }>) {
  const before = images.reduce((sum, img) => sum + img.blob.size, 0);
  const result = entry?.status === "done" ? entry.result : undefined;
  const after = result?.blob.size ?? null;
  const working = entry?.status === "working";

  const what =
    format === "pdf"
      ? layout === "separate"
        ? `PDF 1개 · ${images.length}페이지 (A4, ${LAYOUT_LABEL[layout]})`
        : `PDF 1개 · 1페이지 (${LAYOUT_LABEL[layout]})`
      : `${FORMAT_LABEL[format]} 1장 (${LAYOUT_LABEL[layout]})`;

  return (
    <StatsCard
      data-testid="merge-summary"
      top={[
        { label: `현재 ${images.length}장 합계`, value: formatBytes(before) },
        { label: "병합 후 크기", value: after !== null ? formatBytes(after) : working ? "처리 중…" : "—", muted: after === null },
        savingsCell(before, after),
      ]}
      bottom={[
        { label: "병합 출력", value: `${images.length}장 → ${FORMAT_LABEL[format]} 1개` },
        {
          label: "구성",
          value: format === "pdf" && layout === "separate" ? `${images.length}페이지` : layout === "separate" ? "장마다 한 페이지" : layout === "vertical" ? "세로 병합" : "가로 병합",
          badge: result?.width ? `${result.width}×${result.height}` : undefined,
        },
        { label: "목표 용량", value: formatBytes(targetMB * MB, 0), badge: result ? (result.fitsTarget ? "통과" : "초과") : undefined },
      ]}
      footer={
        entry?.status === "error" ? (
          <Note tone="fail">{entry.error}</Note>
        ) : result && !result.fitsTarget ? (
          <Note tone="warn">최소 품질·해상도까지 줄여도 목표를 넘습니다. 목표 용량을 늘리거나 장수를 나눠 보세요.</Note>
        ) : result ? (
          <Note tone="pass">{what} · 목표 이내</Note>
        ) : (
          <Note tone="muted">{what}. 순서는 카드 순서(1 → {images.length})를 따르고, 목표 용량은 파일 하나에 적용됩니다.</Note>
        )
      }
    />
  );
}

interface Cell {
  label: string;
  value: string;
  /** 값 아래 작은 배지 */
  badge?: string;
  /** 값이 아직 없음 (회색) */
  muted?: boolean;
  /** 절감률처럼 강조할 값 (초록) */
  accent?: boolean;
}

function savingsCell(before: number, after: number | null): Cell {
  if (after === null || before <= 0) return { label: "절감률", value: "—", muted: true };
  const pct = (1 - after / before) * 100;
  return { label: "절감률", value: pct > 0 ? `${pct.toFixed(1)}%` : "0%", accent: pct > 0 };
}

function StatsCard({ top, bottom, footer, ...rest }: { top: Cell[]; bottom: Cell[]; footer: ReactNode; "data-testid"?: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel" {...rest}>
      <dl className="grid grid-cols-3 divide-x divide-line">
        {top.map((cell) => (
          <div key={cell.label} className="min-w-0 px-4 py-3.5 first:pl-4">
            <dt className="text-[11px] text-muted">{cell.label}</dt>
            <dd className={`mt-1 truncate text-[19px] font-bold tabular-nums leading-tight ${cell.accent ? "text-pass" : cell.muted ? "text-subtle" : "text-ink-strong"}`} title={cell.value}>
              {cell.value}
            </dd>
          </div>
        ))}
      </dl>
      <dl className="grid grid-cols-3 divide-x divide-line border-t border-line">
        {bottom.map((cell) => (
          <div key={cell.label} className="min-w-0 px-4 py-3">
            <dt className="text-[11px] text-muted">{cell.label}</dt>
            <dd className="mt-0.5 truncate text-[13px] font-semibold tabular-nums text-ink" title={cell.value}>
              {cell.value}
            </dd>
            {cell.badge && <span className="mt-1 inline-block rounded bg-brand-soft px-1.5 py-px text-[10px] font-semibold text-brand">{cell.badge}</span>}
          </div>
        ))}
      </dl>
      <div className="border-t border-line px-4 py-2.5">{footer}</div>
    </div>
  );
}

function Note({ tone, children }: { tone: "pass" | "warn" | "fail" | "muted"; children: ReactNode }) {
  const color = { pass: "text-pass", warn: "text-warn", fail: "text-fail", muted: "text-muted" }[tone];
  return (
    <p className={`text-[11px] leading-relaxed ${color}`} role={tone === "fail" || tone === "warn" ? "alert" : undefined} aria-live="polite">
      {children}
    </p>
  );
}
