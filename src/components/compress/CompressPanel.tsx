"use client";

import { useId } from "react";
import {
  TARGET_SIZE_MAX_MB,
  TARGET_SIZE_MIN_MB,
  TARGET_SIZE_PRESETS_MB,
  type RasterFormat,
} from "@/lib/constants";

interface CompressPanelProps {
  targetMB: number;
  onTargetChange: (mb: number) => void;
  format: RasterFormat;
  onFormatChange: (format: RasterFormat) => void;
  isRunning: boolean;
  doneCount: number;
  total: number;
  onRun: () => void;
  onCancel: () => void;
  onDownloadAll: () => void;
}

const FORMAT_LABEL: Record<RasterFormat, string> = { jpeg: "JPG", png: "PNG" };

/** 목표 용량·포맷 선택과 실행/다운로드 버튼. 상태는 갖지 않고 전부 props 로 받는다. */
export function CompressPanel({
  targetMB,
  onTargetChange,
  format,
  onFormatChange,
  isRunning,
  doneCount,
  total,
  onRun,
  onCancel,
  onDownloadAll,
}: CompressPanelProps) {
  const customInputId = useId();
  const isPreset = (TARGET_SIZE_PRESETS_MB as readonly number[]).includes(targetMB);
  const allDone = total > 0 && doneCount === total;

  return (
    <section
      aria-label="압축 옵션"
      className="space-y-4 rounded-lg border border-neutral-200 p-4 text-left dark:border-neutral-800"
    >
      <div>
        <p className="text-sm font-medium">목표 용량 (파일 1장당)</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {TARGET_SIZE_PRESETS_MB.map((mb) => (
            <ToggleButton key={mb} active={targetMB === mb} onClick={() => onTargetChange(mb)} disabled={isRunning}>
              {mb}MB 이하
            </ToggleButton>
          ))}
          <label htmlFor={customInputId} className="ml-1 flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400">
            직접 입력
            <input
              id={customInputId}
              type="number"
              inputMode="decimal"
              min={TARGET_SIZE_MIN_MB}
              max={TARGET_SIZE_MAX_MB}
              step={0.5}
              value={isPreset ? "" : targetMB}
              placeholder="MB"
              disabled={isRunning}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v >= TARGET_SIZE_MIN_MB && v <= TARGET_SIZE_MAX_MB) onTargetChange(v);
              }}
              className="w-20 rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
            />
            MB
          </label>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">저장 형식</p>
        <div className="mt-2 flex items-center gap-2">
          {(Object.keys(FORMAT_LABEL) as RasterFormat[]).map((f) => (
            <ToggleButton key={f} active={format === f} onClick={() => onFormatChange(f)} disabled={isRunning}>
              {FORMAT_LABEL[f]}
            </ToggleButton>
          ))}
          <span className="text-xs text-neutral-500">
            {format === "png" ? "PNG 는 사진에서 용량이 커서 목표를 못 맞출 수 있습니다. 사진은 JPG 를 권장합니다." : "사진·스캔 서류에 적합합니다."}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        {isRunning ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            취소
          </button>
        ) : (
          <button
            type="button"
            onClick={onRun}
            disabled={total === 0 || allDone}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {allDone ? "최적화 완료" : "최적화 시작"}
          </button>
        )}

        <span className="text-sm text-neutral-600 dark:text-neutral-400" aria-live="polite">
          {isRunning ? `처리 중 ${doneCount}/${total}` : total > 0 && doneCount > 0 ? `${doneCount}/${total}장 완료` : ""}
        </span>

        {allDone && (
          <button
            type="button"
            onClick={onDownloadAll}
            className="ml-auto rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            {total > 1 ? `${total}장 모두 다운로드` : "다운로드"}
          </button>
        )}
      </div>
    </section>
  );
}

function ToggleButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={[
        "rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:opacity-50",
        active
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
