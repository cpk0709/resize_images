"use client";

import { formatBytes } from "@/lib/format";
import type { SubmissionPreset } from "@/lib/presets";

interface PresetListProps {
  presets: readonly SubmissionPreset[];
  selectedId: string;
  onSelect: (preset: SubmissionPreset) => void;
  disabled?: boolean;
}

const AGENCY_ICON: Record<SubmissionPreset["agency"], string> = {
  government: "🏛️",
  court: "⚖️",
  tax: "🧾",
  custom: "＋",
};

/** 제출처 프리셋 목록. 선택만 담당하고, 선택 결과를 어떻게 쓰는지는 상위가 결정한다. */
export function PresetList({ presets, selectedId, onSelect, disabled = false }: PresetListProps) {
  return (
    <ul className="space-y-2" aria-label="제출처 프리셋">
      {presets.map((preset) => {
        const active = preset.id === selectedId;
        return (
          <li key={preset.id}>
            <button
              type="button"
              disabled={disabled}
              aria-pressed={active}
              title={preset.sourceNote}
              onClick={() => onSelect(preset)}
              className={[
                "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-[15px] transition-colors disabled:opacity-50",
                active
                  ? "border-navy bg-accent-soft/60 font-semibold text-navy shadow-[inset_0_0_0_1px_var(--color-navy)]"
                  : "border-line bg-panel hover:border-navy/40 hover:bg-surface",
              ].join(" ")}
            >
              <span aria-hidden="true" className="w-6 text-center text-lg leading-none">
                {AGENCY_ICON[preset.agency]}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block">{preset.name}</span>
                <span className="block text-[13px] font-normal text-muted">
                  기본 파일 1장 최대 {formatBytes(preset.maxBytesPerFile, 0)}
                </span>
              </span>
              {!preset.verified && (
                <span className="shrink-0 rounded bg-warn-soft px-1.5 py-0.5 text-[11px] font-medium text-warn">참고</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
