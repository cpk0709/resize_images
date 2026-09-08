"use client";

import { useId } from "react";
import { PresetList } from "@/components/studio/PresetList";
import { SizeMeter, type SizeSample } from "@/components/studio/SizeMeter";
import { TARGET_SIZE_MAX_MB, TARGET_SIZE_MIN_MB, type OutputFormat, type RasterFormat } from "@/lib/constants";
import type { SubmissionPreset } from "@/lib/presets";

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
  format: RasterFormat;
  onFormatChange: (format: RasterFormat) => void;
  limitBytes: number | null;
  samples: SizeSample[];
  isRunning: boolean;
  progress: { done: number; total: number };
  primaryAction: PrimaryAction;
}

const FORMAT_OPTIONS: { value: OutputFormat; label: string; available: boolean }[] = [
  { value: "jpeg", label: "JPG", available: true },
  { value: "png", label: "PNG", available: true },
  { value: "pdf", label: "PDF", available: false },
];

/** 왼쪽 컨트롤 패널. 프리셋 → 목표 용량, 저장 형식, 신호등, 주요 동작 버튼. 상태는 전부 props. */
export function ControlPanel({
  presets,
  selectedPreset,
  onSelectPreset,
  targetMB,
  onTargetChange,
  format,
  onFormatChange,
  limitBytes,
  samples,
  isRunning,
  progress,
  primaryAction,
}: ControlPanelProps) {
  const customInputId = useId();
  const isCustom = selectedPreset.maxBytesPerFile === null;

  return (
    <aside className="flex flex-col gap-6 rounded-card border border-line bg-panel p-5" aria-label="컨트롤 패널">
      <h2 className="text-xl font-bold">컨트롤 패널</h2>

      <section>
        <h3 className="mb-3 text-lg font-bold">제출처 프리셋</h3>
        <PresetList presets={presets} selectedId={selectedPreset.id} onSelect={onSelectPreset} disabled={isRunning} />

        {isCustom && (
          <label htmlFor={customInputId} className="mt-3 flex items-center gap-2 text-sm">
            파일 1장 최대
            <input
              id={customInputId}
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
              className="w-24 rounded-lg border border-line bg-panel px-2 py-1.5 text-sm"
            />
            MB
          </label>
        )}

        {!selectedPreset.verified && (
          <p className="mt-3 text-xs leading-relaxed text-muted">
            <span className="font-medium text-warn">참고 기준</span> · 기관 안내는 민원마다 다르고 자주 바뀝니다. 제출 전
            해당 사이트의 첨부 안내를 한 번 확인하세요.
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-lg font-bold">저장 형식</h3>
        <div className="flex flex-wrap gap-2">
          {FORMAT_OPTIONS.map((opt) => {
            const accepted = selectedPreset.acceptedFormats.includes(opt.value);
            const active = opt.value === format;
            const disabled = isRunning || !opt.available;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                title={!opt.available ? "PDF 내보내기는 이어붙이기 단계에서 제공됩니다" : !accepted ? "이 제출처가 받지 않는 형식" : undefined}
                onClick={() => opt.available && onFormatChange(opt.value as RasterFormat)}
                className={[
                  "rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  active ? "border-navy bg-navy text-white" : "border-line bg-panel hover:bg-surface",
                  !accepted && !active ? "line-through decoration-fail/60" : "",
                ].join(" ")}
              >
                {opt.label}
                {!opt.available && <span className="ml-1 text-[10px] font-normal">준비 중</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">
          {format === "png" ? "PNG 는 사진에서 용량이 커서 목표를 못 맞출 수 있습니다. 사진은 JPG 권장." : "사진·스캔 서류에 적합합니다. EXIF(위치·기기 정보)는 제거됩니다."}
        </p>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-bold">라이브 용량 신호등</h3>
        <SizeMeter limitBytes={limitBytes} samples={samples} />
      </section>

      <div className="mt-auto border-t border-line pt-5">
        {isRunning && (
          <p className="mb-2 text-sm text-muted" aria-live="polite">
            최적화 중 {progress.done}/{progress.total}
          </p>
        )}
        <PrimaryButton action={primaryAction} />
      </div>
    </aside>
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
