"use client";

import { useId, type ReactNode } from "react";
import { PresetList } from "@/components/studio/PresetList";
import { SizeMeter, type SizeSample } from "@/components/studio/SizeMeter";
import { ActionButton, ToggleButton } from "@/components/ui/Button";
import { IconRefresh } from "@/components/ui/icons";
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

interface ControlPanelProps {
  /** 그리드 순서 등 레이아웃 클래스. 상위(Studio)가 모바일/데스크톱 배치를 결정한다. */
  className?: string;
  presets: readonly SubmissionPreset[];
  selectedPreset: SubmissionPreset;
  onSelectPreset: (preset: SubmissionPreset) => void;
  targetMB: number;
  onTargetChange: (mb: number) => void;
  /** 목표 용량을 선택된 프리셋의 기본값으로 되돌린다 */
  onResetTarget: () => void;
  /** 프리셋·목표 용량·형식·출력 방식을 모두 처음 상태로 */
  onResetAll: () => void;
  /** 어떤 설정이라도 기본에서 벗어났는가 (설정 초기화 버튼 활성 조건) */
  isDirty: boolean;
  format: OutputFormat;
  onFormatChange: (format: OutputFormat) => void;
  layout: OutputLayout;
  onLayoutChange: (layout: OutputLayout) => void;
  /** 준비된 이미지 수. 이어붙이기는 2장부터 의미가 있다. */
  imageCount: number;
  limitBytes: number | null;
  samples: SizeSample[];
  /** 처리 중이면 옵션 변경을 막는다 */
  isRunning: boolean;
}

const FORMAT_LABEL: Record<OutputFormat, string> = { jpeg: "JPG", png: "PNG", pdf: "PDF" };

const LAYOUT_LABEL: Record<OutputLayout, string> = { separate: "개별 파일", vertical: "세로 병합", horizontal: "가로 병합" };

/** 왼쪽 사이드바. 프리셋 → 최적화 설정(형식·목표 용량·출력 방식) → 용량 신호등 → 설정 초기화. 상태는 전부 props. */
export function ControlPanel({
  className = "",
  presets,
  selectedPreset,
  onSelectPreset,
  targetMB,
  onTargetChange,
  onResetTarget,
  onResetAll,
  isDirty,
  format,
  onFormatChange,
  layout,
  onLayoutChange,
  imageCount,
  limitBytes,
  samples,
  isRunning,
}: ControlPanelProps) {
  const targetInputId = useId();
  const defaultMB = presetDefaultMB(selectedPreset);
  const isTargetOverridden = targetMB !== defaultMB;

  return (
    <aside
      className={`flex min-w-0 flex-col gap-6 rounded-card border border-line bg-panel p-4 lg:rounded-none lg:border-0 lg:border-r lg:bg-transparent lg:py-1 lg:pl-0 lg:pr-5 scroll-thin xl:min-h-0 xl:overflow-y-auto ${className}`}
      aria-label="컨트롤 패널"
    >
      <h2 className="text-[15px] font-semibold text-ink-strong lg:sr-only">설정</h2>

      <section>
        <SectionTitle>제출처 프리셋</SectionTitle>
        <PresetList presets={presets} selectedId={selectedPreset.id} onSelect={onSelectPreset} disabled={isRunning} />
        {!selectedPreset.verified && (
          <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
            <span className="font-semibold text-warn">참고 기준</span> · 기관 안내는 민원마다 다르고 자주 바뀝니다. 제출 전 해당 사이트의 첨부
            안내를 한 번 확인하세요.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-5">
        <SectionTitle>최적화 설정</SectionTitle>

        <Field label="파일 형식">
          <div className="grid grid-cols-3 gap-1.5">
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
          <Hint>{formatHint(format, layout)}</Hint>
        </Field>

        <Field
          label="목표 용량"
          labelSuffix="(파일 1개당)"
          aside={
            <button
              type="button"
              onClick={onResetTarget}
              disabled={isRunning || !isTargetOverridden}
              title={`${selectedPreset.name} 기본값 ${formatBytes(selectedPreset.maxBytesPerFile, 0)} 으로`}
              className="text-[11px] font-medium text-brand hover:underline disabled:cursor-not-allowed disabled:text-subtle disabled:no-underline"
            >
              기본값으로 초기화
            </button>
          }
        >
          <div className="grid grid-cols-4 gap-1.5">
            {TARGET_SIZE_PRESETS_MB.map((mb) => (
              <ToggleButton key={mb} active={targetMB === mb} disabled={isRunning} onClick={() => onTargetChange(mb)}>
                {mb}MB
              </ToggleButton>
            ))}
          </div>
          <label htmlFor={targetInputId} className="relative mt-1.5 block">
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
              className="w-full rounded-lg border border-line bg-panel py-2 pl-3 pr-12 text-[13px] font-medium tabular-nums text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand-ring disabled:opacity-50"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted" aria-hidden="true">
              MB
            </span>
          </label>
          <Hint live>
            {isTargetOverridden
              ? `${selectedPreset.name} 기본값 ${formatBytes(selectedPreset.maxBytesPerFile, 0)} 대신 ${formatBytes(targetMB * 1024 * 1024, 1)} 을 사용합니다.`
              : `${selectedPreset.name} 기본값입니다. 버튼이나 입력으로 바꿀 수 있습니다.`}
          </Hint>
        </Field>

        <Field label="출력 방식">
          <div className="grid grid-cols-3 gap-1.5">
            {OUTPUT_LAYOUTS.map((value) => {
              const needsTwo = value !== "separate" && imageCount < 2;
              return (
                <ToggleButton
                  key={value}
                  active={value === layout}
                  disabled={isRunning || needsTwo}
                  title={needsTwo ? "2장 이상일 때 선택할 수 있습니다" : undefined}
                  onClick={() => onLayoutChange(value)}
                  className="px-2"
                >
                  {LAYOUT_LABEL[value]}
                </ToggleButton>
              );
            })}
          </div>
          <Hint>{layoutHint(layout, format, imageCount)}</Hint>
        </Field>
      </section>

      <section>
        <SectionTitle>용량 확인</SectionTitle>
        <SizeMeter limitBytes={limitBytes} samples={samples} />
      </section>

      <ActionButton variant="secondary" size="sm" fullWidth disabled={isRunning || !isDirty} onClick={onResetAll} leadingIcon={<IconRefresh className="h-3.5 w-3.5" />}>
        설정 초기화
      </ActionButton>
    </aside>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-2.5 text-[13px] font-semibold text-ink-strong">{children}</h3>;
}

function Field({ label, labelSuffix, aside, children }: { label: string; labelSuffix?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-ink">
          {label}
          {labelSuffix && <span className="ml-1 font-normal text-subtle">{labelSuffix}</span>}
        </p>
        {aside}
      </div>
      {children}
    </div>
  );
}

function Hint({ children, live = false }: { children: ReactNode; live?: boolean }) {
  return (
    <p className="mt-1.5 text-[11px] leading-relaxed text-muted" aria-live={live ? "polite" : undefined}>
      {children}
    </p>
  );
}

function formatHint(format: OutputFormat, layout: OutputLayout): string {
  switch (format) {
    case "jpeg":
      return "사진·스캔 서류에 적합합니다. EXIF(위치·기기 정보)는 제거됩니다.";
    case "png":
      return "PNG 는 사진에서 용량이 커서 목표를 못 맞출 수 있습니다. 사진은 JPG 권장.";
    case "pdf":
      return layout === "separate" ? "장마다 한 페이지인 PDF 한 개를 만듭니다 (A4, 자동 방향)." : "이어붙인 한 장을 1페이지 PDF 로 만듭니다.";
  }
}

function layoutHint(layout: OutputLayout, format: OutputFormat, imageCount: number): string {
  if (layout === "separate") {
    return format === "pdf" ? `${imageCount}장이 ${imageCount}페이지 PDF 한 개로 묶입니다.` : "장마다 파일 하나씩 내려받습니다.";
  }
  return `카드 순서(1 → ${imageCount})대로 ${layout === "vertical" ? "위에서 아래로" : "왼쪽에서 오른쪽으로"} 한 장에 이어붙입니다.`;
}
