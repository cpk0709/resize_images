"use client";

import type { ComponentType, SVGProps } from "react";
import { IconBuilding, IconPlus, IconReceipt, IconScale } from "@/components/ui/icons";
import { formatBytes } from "@/lib/format";
import type { SubmissionPreset } from "@/lib/presets";

interface PresetListProps {
  presets: readonly SubmissionPreset[];
  selectedId: string;
  onSelect: (preset: SubmissionPreset) => void;
  disabled?: boolean;
}

const AGENCY_ICON: Record<SubmissionPreset["agency"], ComponentType<SVGProps<SVGSVGElement>>> = {
  government: IconBuilding,
  court: IconScale,
  tax: IconReceipt,
  custom: IconPlus,
};

/**
 * 제출처 프리셋 목록. 선택만 담당하고, 선택 결과를 어떻게 쓰는지는 상위가 결정한다.
 * 데스크톱은 세로 목록, 모바일은 가로 스크롤 칩(화면 높이를 아끼고 엄지로 넘기기 쉽다).
 */
export function PresetList({ presets, selectedId, onSelect, disabled = false }: PresetListProps) {
  return (
    <ul
      className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
      aria-label="제출처 프리셋"
    >
      {presets.map((preset) => {
        const active = preset.id === selectedId;
        const Icon = AGENCY_ICON[preset.agency];
        return (
          <li key={preset.id} className="w-[260px] shrink-0 snap-start lg:w-auto">
            <button
              type="button"
              disabled={disabled}
              aria-pressed={active}
              title={preset.sourceNote}
              onClick={() => onSelect(preset)}
              className={[
                "flex h-full w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-[15px] transition-colors disabled:opacity-50",
                active
                  ? "border-navy bg-accent-soft/60 font-semibold text-navy shadow-[inset_0_0_0_1px_var(--color-navy)]"
                  : "border-line bg-panel hover:border-navy/40 hover:bg-surface",
              ].join(" ")}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-gradient-to-b from-navy-hover to-navy text-white" : "bg-surface text-navy"}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate lg:whitespace-normal">{preset.name}</span>
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
