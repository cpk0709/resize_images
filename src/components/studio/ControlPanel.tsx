"use client";

import { useId } from "react";
import { PresetList } from "@/components/studio/PresetList";
import { SizeMeter, type SizeSample } from "@/components/studio/SizeMeter";
import {
  OUTPUT_FORMATS,
  OUTPUT_LAYOUTS,
  TARGET_SIZE_MAX_MB,
  TARGET_SIZE_MIN_MB,
  TARGET_SIZE_PRESETS_MB,
  type OutputFormat,
  type OutputLayout,
} from "@/lib/constants";
import { formatBytes } from "@/lib/format";
import { presetDefaultMB, type SubmissionPreset } from "@/lib/presets";

export type PrimaryAction =
  | { kind: "disabled"; label: string }
  | { kind: "run"; label: string; onClick: () => void }
  | { kind: "cancel"; label: string; onClick: () => void }
  | { kind: "download"; label: string; onClick: () => void };

interface ControlPanelProps {
  presets: readonly SubmissionPreset[];
  selectedPreset: SubmissionPreset;
  onSelectPreset: (preset: SubmissionPreset) => void;
  targetMB: number;
  onTargetChange: (mb: number) => void;
  /** 목표 용량을 선택된 프리셋의 기본값으로 되돌린다 */
  onResetTarget: () => void;
  format: OutputFormat;
  onFormatChange: (format: OutputFormat) => void;
  layout: OutputLayout;
  onLayoutChange: (layout: OutputLayout) => void;
  /** 준비된 이미지 수. 이어붙이기는 2장부터 의미가 있다. */
  imageCount: number;
  limitBytes: number | null;
  samples: SizeSample[];
  isRunning: boolean;
  progress: { done: number; total: number };
  primaryAction: PrimaryAction;
}

const FORMAT_LABEL: Record<OutputFormat, string> = { jpeg: "JPG", png: "PNG", pdf: "PDF" };

const LAYOUT_LABEL: Record<OutputLayout, string> = {
  separate: "개별 파일",
  vertical: "세로로 이어붙이기",
  horizontal: "가로로 이어붙이기",
};

/** 왼쪽 컨트롤 패널. 프리셋 → 목표 용량, 저장 형식, 출력 방식, 신호등, 주요 동작 버튼. 상태는 전부 props. */
export function ControlPanel({
  presets,
  selectedPreset,
  onSelectPreset,
  targetMB,
  onTargetChange,
  onResetTarget,
  format,
  onFormatChange,
  layout,
  onLayoutChange,
  imageCount,
  limitBytes,
  samples,
  isRunning,
  progress,
  primaryAction,
}: ControlPanelProps) {
  const targetInputId = useId();
  const defaultMB = presetDefaultMB(selectedPreset);
  const isOverridden = targetMB !== defaultMB;

  return (
    <aside className="flex flex-col gap-6 rounded-card border border-line bg-panel p-5" aria-label="컨트롤 패널">
      <h2 className="text-xl font-bold">컨트롤 패널</h2>

      <section>
        <h3 className="mb-3 text-lg font-bold">제출처 프리셋</h3>
        <PresetList presets={presets} selectedId={selectedPreset.id} onSelect={onSelectPreset} disabled={isRunning} />
        {!selectedPreset.verified && (
          <p className="mt-3 text-xs leading-relaxed text-muted">
            <span className="font-medium text-warn">참고 기준</span> · 기관 안내는 민원마다 다르고 자주 바뀝니다. 제출 전
            해당 사이트의 첨부 안내를 한 번 확인하세요.
          </p>
        )}
      </section>

      <section aria-labelledby={`${targetInputId}-heading`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 id={`${targetInputId}-heading`} className="text-lg font-bold">
            목표 용량 <span className="text-sm font-normal text-muted">(파일 1개당)</span>
          </h3>
          <button
            type="button"
            onClick={onResetTarget}
            disabled={isRunning || !isOverridden}
            title={`${selectedPreset.name} 기본값 ${formatBytes(selectedPreset.maxBytesPerFile, 0)} 으로`}
            className="text-xs text-muted underline hover:text-ink disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
          >
            기본값으로 초기화
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {TARGET_SIZE_PRESETS_MB.map((mb) => (
            <ToggleButton key={mb} active={targetMB === mb} disabled={isRunning} onClick={() => onTargetChange(mb)}>
              {mb}MB
            </ToggleButton>
          ))}
          <label htmlFor={targetInputId} className="ml-1 flex items-center gap-1.5 text-sm">
            <span className="sr-only">직접 입력</span>
            <input
              id={targetInputId}
              type="number"
              inputMode="decimal"
              min={TARGET_SIZE_MIN_MB}
              max={TARGET_SIZE_MAX_MB}
              step={0.5}
              value={targetMB}
              disabled={isRunning}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v >= TARGET_SIZE_MIN_MB && v <= TARGET_SIZE_MAX_MB) onTargetChange(v);
              }}
              aria-label="목표 용량 직접 입력 (MB)"
              className="w-20 rounded-lg border border-line bg-panel px-2 py-1.5 text-sm"
            />
            MB
          </label>
        </div>
        <p className="mt-2 text-xs text-muted" aria-live="polite">
          {isOverridden
            ? `${selectedPreset.name} 기본값 ${formatBytes(selectedPreset.maxBytesPerFile, 0)} 대신 ${formatBytes(targetMB * 1024 * 1024, 1)} 을 사용합니다.`
            : `${selectedPreset.name} 기본값입니다. 버튼이나 입력으로 바꿀 수 있습니다.`}
        </p>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-bold">저장 형식</h3>
        <div className="flex flex-wrap gap-2">
          {OUTPUT_FORMATS.map((value) => {
            const accepted = selectedPreset.acceptedFormats.includes(value);
            const active = value === format;
            return (
              <ToggleButton
                key={value}
                active={active}
                disabled={isRunning}
                title={!accepted ? "이 제출처가 받지 않는 형식" : undefined}
                onClick={() => onFormatChange(value)}
                className={!accepted && !active ? "line-through decoration-fail/60" : ""}
              >
                {FORMAT_LABEL[value]}
              </ToggleButton>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">{formatHint(format, layout)}</p>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-bold">출력 방식</h3>
        <div className="flex flex-wrap gap-2">
          {OUTPUT_LAYOUTS.map((value) => {
            const needsTwo = value !== "separate" && imageCount < 2;
            return (
              <ToggleButton
                key={value}
                active={value === layout}
                disabled={isRunning || needsTwo}
                title={needsTwo ? "2장 이상일 때 선택할 수 있습니다" : undefined}
                onClick={() => onLayoutChange(value)}
              >
                {LAYOUT_LABEL[value]}
              </ToggleButton>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">{layoutHint(layout, format, imageCount)}</p>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-bold">라이브 용량 신호등</h3>
        <SizeMeter limitBytes={limitBytes} samples={samples} />
      </section>

      <div className="mt-auto border-t border-line pt-5">
        {isRunning && progress.total > 1 && (
          <p className="mb-2 text-sm text-muted" aria-live="polite">
            최적화 중 {progress.done}/{progress.total}
          </p>
        )}
        <PrimaryButton action={primaryAction} />
      </div>
    </aside>
  );
}

function formatHint(format: OutputFormat, layout: OutputLayout): string {
  switch (format) {
    case "jpeg":
      return "사진·스캔 서류에 적합합니다. EXIF(위치·기기 정보)는 제거됩니다.";
    case "png":
      return "PNG 는 사진에서 용량이 커서 목표를 못 맞출 수 있습니다. 사진은 JPG 권장.";
    case "pdf":
      return layout === "separate"
        ? "장마다 한 페이지인 PDF 한 개를 만듭니다 (A4, 자동 방향)."
        : "이어붙인 한 장을 1페이지 PDF 로 만듭니다.";
  }
}

function layoutHint(layout: OutputLayout, format: OutputFormat, imageCount: number): string {
  if (layout === "separate") {
    return format === "pdf" ? `${imageCount}장이 ${imageCount}페이지 PDF 한 개로 묶입니다.` : "장마다 파일 하나씩 내려받습니다.";
  }
  return `카드 덱 순서(1 → ${imageCount})대로 ${layout === "vertical" ? "위에서 아래로" : "왼쪽에서 오른쪽으로"} 한 장에 이어붙입니다. 너비(세로) 또는 높이(가로)를 가장 큰 장에 맞춥니다.`;
}

function ToggleButton({
  active,
  disabled,
  title,
  onClick,
  className = "",
  children,
}: {
  active: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={[
        "rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        active ? "border-navy bg-navy text-white" : "border-line bg-panel hover:bg-surface",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ action }: { action: PrimaryAction }) {
  const base = "flex w-full items-center justify-between rounded-xl px-5 py-3.5 text-base font-semibold transition-colors";
  switch (action.kind) {
    case "disabled":
      return (
        <button type="button" disabled className={`${base} cursor-not-allowed bg-line text-muted`}>
          {action.label}
        </button>
      );
    case "run":
      return (
        <button type="button" onClick={action.onClick} className={`${base} bg-accent text-white hover:bg-accent/90`}>
          {action.label}
          <span aria-hidden="true">▶</span>
        </button>
      );
    case "cancel":
      return (
        <button type="button" onClick={action.onClick} className={`${base} border border-line bg-panel hover:bg-surface`}>
          {action.label}
        </button>
      );
    case "download":
      return (
        <button type="button" onClick={action.onClick} className={`${base} bg-navy text-white hover:bg-navy-hover`}>
          {action.label}
          <span aria-hidden="true">↗</span>
        </button>
      );
  }
}
