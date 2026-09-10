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
 * 데스크톱은 세로 목록(아이콘 타일 + 두 줄), 모바일은 가로 스크롤 칩(화면 높이를 아끼고 엄지로 넘기기 쉽다).
 */
export function PresetList({ presets, selectedId, onSelect, disabled = false }: PresetListProps) {
  return (
    <ul className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0" aria-label="제출처 프리셋">
      {presets.map((preset) => {
        const active = preset.id === selectedId;
        const Icon = AGENCY_ICON[preset.agency];
        return (
          <li key={preset.id} className="w-[240px] shrink-0 snap-start lg:w-auto">
            <button
              type="button"
              disabled={disabled}
              aria-pressed={active}
              title={preset.sourceNote}
              onClick={() => onSelect(preset)}
              className={[
                "flex h-full w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-ring disabled:opacity-50",
                active ? "border-transparent bg-brand-soft" : "border-transparent hover:bg-surface",
                // 모바일 칩은 카드처럼 테두리가 있어야 구분된다
                "max-lg:border-line max-lg:bg-panel",
                active ? "max-lg:!border-brand max-lg:!bg-brand-soft" : "",
              ].join(" ")}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${active ? "border-brand-ring bg-panel text-brand" : "border-line bg-panel text-muted"}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className={`block truncate text-[13px] font-semibold lg:whitespace-normal ${active ? "text-brand" : "text-ink"}`}>{preset.name}</span>
                <span className="mt-0.5 block truncate text-[11px] text-muted">
                  파일 1장 최대 {formatBytes(preset.maxBytesPerFile, 0)}
                </span>
              </span>
              {!preset.verified && (
                <span className="shrink-0 rounded-md bg-warn-soft px-1.5 py-0.5 text-[10px] font-semibold text-warn" title="공식 안내를 직접 확인한 값이 아닙니다">
                  참고
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
