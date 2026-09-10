"use client";

import { useState } from "react";
import type { EditorTool } from "@/components/editor/ImageEditor";
import type { PrimaryAction } from "@/components/studio/ActionBar";
import { CardDeck } from "@/components/studio/CardDeck";
import { ControlPanel } from "@/components/studio/ControlPanel";
import { FeatureTiles } from "@/components/studio/FeatureTiles";
import { PreviewPanel } from "@/components/studio/PreviewPanel";
import type { SizeSample } from "@/components/studio/SizeMeter";
import { StatusBar } from "@/components/studio/StatusBar";
import { ActionButton } from "@/components/ui/Button";
import { IconAlert, IconClose, IconTrash } from "@/components/ui/icons";
import { Dropzone } from "@/components/uploader/Dropzone";
import { useCompression } from "@/hooks/useCompression";
import { useMergeExport } from "@/hooks/useMergeExport";
import { useSourceImages } from "@/hooks/useSourceImages";
import { MB, MAX_INPUT_FILES, type OutputFormat, type OutputLayout } from "@/lib/constants";
import { formatBytes } from "@/lib/format";
import type { EditResult } from "@/lib/image/edit";
import { DEFAULT_PRESET_ID, findPreset, presetDefaultMB, SUBMISSION_PRESETS, type SubmissionPreset } from "@/lib/presets";

const FORMAT_LABEL: Record<OutputFormat, string> = { jpeg: "JPG", png: "PNG", pdf: "PDF" };
const LAYOUT_LABEL: Record<OutputLayout, string> = { separate: "개별 파일", vertical: "세로 이어붙이기", horizontal: "가로 이어붙이기" };

const DEFAULT_FORMAT: OutputFormat = "jpeg";
const DEFAULT_LAYOUT: OutputLayout = "separate";

/**
 * 스튜디오 조립 컴포넌트. 네 형제(컨트롤 / 편집 캔버스 / 미리보기 / 상태 바)를 page 의 grid 안에 렌더한다.
 *
 * 출력 경로는 둘이다.
 * - 파일별 압축(useCompression): 저장 형식 JPG/PNG + 출력 방식 "개별 파일".
 * - 병합 출력(useMergeExport): 그 외 (이어붙이기, 또는 PDF).
 * 어느 쪽이 활성인지는 `merge.isActive` 가 결정하고, 신호등·주요 버튼·카드 결과 표시가 그에 따라 바뀐다.
 */
export function Studio() {
  const source = useSourceImages();

  const [format, setFormat] = useState<OutputFormat>(DEFAULT_FORMAT);
  const [layout, setLayout] = useState<OutputLayout>(DEFAULT_LAYOUT);

  const compression = useCompression(source.readyImages);
  const merge = useMergeExport(source.readyImages, { layout, format, targetMB: compression.targetMB });

  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID);
  const preset = findPreset(presetId) ?? SUBMISSION_PRESETS[0];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 선택이 없거나 삭제됐으면 첫 항목을 보여준다. 상태로 동기화하지 않고 렌더 시점에 결정한다.
  const selectedItem = source.items.find((it) => it.id === selectedId) ?? source.items[0];

  /** 편집 중인 카드와 시작 도구. 카드가 바뀌거나 삭제되면 편집을 닫는다. */
  const [editing, setEditing] = useState<{ id: string; tool: EditorTool } | null>(null);
  const editingTool = editing && selectedItem && editing.id === selectedItem.id ? editing.tool : null;

  // 이어붙이기는 2장부터. 1장으로 줄어들면 개별 파일로 되돌린다.
  const effectiveLayout: OutputLayout = source.readyImages.length < 2 ? "separate" : layout;

  /** 프리셋을 고르면 그 기관의 기본 용량으로. 이후 사용자가 바꾸면 프리셋은 유지된 채 목표 용량만 달라진다. */
  const handleSelectPreset = (next: SubmissionPreset) => {
    setPresetId(next.id);
    compression.changeTarget(presetDefaultMB(next));
  };
  const resetTarget = () => compression.changeTarget(presetDefaultMB(preset));

  const handleFormatChange = (next: OutputFormat) => {
    setFormat(next);
    if (next !== "pdf") compression.changeFormat(next); // 파일별 압축 경로의 포맷. PDF 는 병합 경로가 담당.
  };

  /** 프리셋·목표 용량·형식·출력 방식을 처음 상태로. 서류 목록은 그대로 둔다 (그건 "모두 지우기"). */
  const defaultPreset = findPreset(DEFAULT_PRESET_ID) ?? SUBMISSION_PRESETS[0];
  const isSettingsDirty =
    presetId !== DEFAULT_PRESET_ID || compression.targetMB !== presetDefaultMB(preset) || format !== DEFAULT_FORMAT || layout !== DEFAULT_LAYOUT;
  const resetAllSettings = () => {
    setPresetId(DEFAULT_PRESET_ID);
    compression.changeTarget(presetDefaultMB(defaultPreset));
    handleFormatChange(DEFAULT_FORMAT);
    setLayout(DEFAULT_LAYOUT);
  };

  const handleRemove = (id: string) => {
    compression.forget(id);
    source.remove(id);
    if (editing?.id === id) setEditing(null);
  };
  const handleClear = () => {
    compression.reset();
    source.clear();
    setEditing(null);
  };

  const startEdit = (id: string, tool: EditorTool) => {
    setSelectedId(id);
    setEditing({ id, tool });
  };
  const applyEdit = (result: EditResult) => {
    if (!editing) return;
    source.replaceImage(editing.id, result);
    compression.forget(editing.id); // 픽셀이 바뀌었으니 이전 압축 결과는 무효 (병합 결과는 서명으로 자동 무효)
    setEditing(null);
  };
  const restoreOriginal = () => {
    if (!selectedItem) return;
    source.restoreOriginal(selectedItem.id);
    compression.forget(selectedItem.id);
  };

  // ── 파생 상태: 신호등 샘플, 절감량, 주요 버튼 ──
  const limitBytes = Math.round(compression.targetMB * MB);
  const total = source.readyImages.length;

  const samples: SizeSample[] = merge.isActive
    ? total === 0
      ? []
      : [
          merge.entry?.result
            ? { id: "merged", name: "병합 결과", bytes: merge.entry.result.blob.size, kind: "result" }
            : { id: "merged", name: `${total}장 합계 (병합 전)`, bytes: source.readyImages.reduce((sum, img) => sum + img.blob.size, 0), kind: "original" },
        ]
    : source.readyImages.map((img) => {
        const result = compression.entries[img.id]?.result;
        return result
          ? { id: img.id, name: img.originalName, bytes: result.blob.size, kind: "result" }
          : { id: img.id, name: img.originalName, bytes: img.originalSize, kind: "original" };
      });

  /** 결과가 있는 장들의 "지금 크기 → 결과 크기" 합. 상태 바의 절감량. */
  const savings = (() => {
    if (merge.isActive) {
      const result = merge.entry?.result;
      if (!result) return null;
      return { beforeBytes: source.readyImages.reduce((sum, img) => sum + img.blob.size, 0), afterBytes: result.blob.size };
    }
    const done = source.readyImages.filter((img) => compression.entries[img.id]?.result);
    if (done.length === 0) return null;
    return {
      beforeBytes: done.reduce((sum, img) => sum + img.blob.size, 0),
      afterBytes: done.reduce((sum, img) => sum + (compression.entries[img.id]?.result?.blob.size ?? 0), 0),
    };
  })();

  const isRunning = merge.isActive ? merge.isRunning : compression.isRunning;

  const primaryAction: PrimaryAction = (() => {
    if (total === 0) return { kind: "disabled", label: source.items.length > 0 ? "서류를 준비하는 중…" : "서류를 추가하세요" };
    if (merge.isActive) {
      if (merge.isRunning) return { kind: "cancel", label: "취소", onClick: merge.cancel };
      if (merge.entry?.status === "done") {
        const pages = format === "pdf" ? `, ${merge.entry.result?.pageCount ?? 1}페이지` : "";
        return { kind: "download", label: `최적화 다운로드 (${FORMAT_LABEL[format]}${pages})`, onClick: merge.download };
      }
      return { kind: "run", label: total > 1 ? `${total}장 병합 최적화 시작` : "최적화 시작", onClick: merge.run };
    }
    if (compression.isRunning) return { kind: "cancel", label: "취소", onClick: compression.cancel };
    if (compression.doneCount === compression.total) {
      return { kind: "download", label: `최적화 다운로드 (${FORMAT_LABEL[format]}, ${total}장)`, onClick: compression.downloadAll };
    }
    return { kind: "run", label: "최적화 시작", onClick: compression.run };
  })();

  /** 액션 바의 한 줄 요약: 무엇을 어떤 기준으로 만드는지 */
  const actionSummary =
    total === 0
      ? "서류를 추가하면 여기서 최적화하고 내려받습니다."
      : merge.isActive
        ? `${FORMAT_LABEL[format]} · ${format === "pdf" && effectiveLayout === "separate" ? "장마다 한 페이지" : LAYOUT_LABEL[effectiveLayout]} · ${total}장 → 파일 1개 · 목표 ${formatBytes(limitBytes, 0)}`
        : `${FORMAT_LABEL[format]} · 개별 파일 ${total}장 · 파일마다 목표 ${formatBytes(limitBytes, 0)}`;

  return (
    <>
      {/* 모바일에서는 서류 추가(편집 캔버스)가 먼저, 설정이 다음. 데스크톱은 설정 → 서류 → 출력. */}
      <ControlPanel
        className="order-2 lg:order-1"
        presets={SUBMISSION_PRESETS}
        selectedPreset={preset}
        onSelectPreset={handleSelectPreset}
        targetMB={compression.targetMB}
        onTargetChange={compression.changeTarget}
        onResetTarget={resetTarget}
        onResetAll={resetAllSettings}
        isDirty={isSettingsDirty}
        format={format}
        onFormatChange={handleFormatChange}
        layout={effectiveLayout}
        onLayoutChange={setLayout}
        imageCount={total}
        limitBytes={limitBytes}
        samples={samples}
        isRunning={isRunning}
      />

      <section className="order-1 flex min-w-0 flex-col gap-4 rounded-card border border-line bg-panel p-4 sm:p-5 lg:order-2 scroll-thin xl:min-h-0 xl:overflow-y-auto" aria-label="편집 캔버스">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-ink-strong">서류 업로드 및 편집</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              <span className="lg:hidden">사진을 추가하면 이 기기 안에서만 변환·압축합니다.</span>
              <span className="hidden lg:inline">
                파일을 드래그 앤 드롭하거나, 클릭하여 서류 사진을 추가하세요. JPG · PNG · HEIC(아이폰) · WEBP · GIF · BMP · TIFF 를 지원하며 한 번에 최대{" "}
                {MAX_INPUT_FILES}장까지 올릴 수 있습니다.
              </span>
            </p>
          </div>
          {source.items.length > 0 && (
            <ActionButton variant="ghost" size="sm" className="shrink-0" onClick={handleClear} disabled={isRunning} leadingIcon={<IconTrash className="h-3.5 w-3.5" />}>
              모두 지우기
            </ActionButton>
          )}
        </div>

        <Dropzone onFiles={source.addFiles} compact={source.items.length > 0} />

        {source.rejected.length > 0 && (
          <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-warn/30 bg-warn-soft p-3 text-[13px] text-warn">
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <ul className="min-w-0 flex-1 space-y-0.5">
              {source.rejected.map((r) => (
                <li key={`${r.name}-${r.reason}`} className="truncate">
                  <span className="font-semibold">{r.name}</span>: {r.reason}
                </li>
              ))}
            </ul>
            <button type="button" onClick={source.dismissRejected} aria-label="알림 닫기" className="shrink-0 rounded p-0.5 hover:bg-warn/10">
              <IconClose className="h-4 w-4" />
            </button>
          </div>
        )}

        {source.items.length > 0 && (
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-ink-strong">추가한 서류</h3>
            <span className="text-[11px] text-muted">
              {total}장 준비됨
              {source.processingCount > 0 && ` · ${source.processingCount}장 변환 중`}
              <span className="hidden sm:inline"> · 끌어서 순서 변경</span>
            </span>
          </div>
        )}

        <CardDeck
          items={source.items}
          selectedId={selectedItem?.id ?? null}
          onSelect={setSelectedId}
          onRemove={handleRemove}
          onMove={source.move}
          // 병합 출력 중에는 파일별 결과가 의미 없으므로 카드에 표시하지 않는다.
          entries={merge.isActive ? {} : compression.entries}
          targetMB={compression.targetMB}
          onDownload={compression.download}
          onEdit={startEdit}
        />

        <div className="mt-auto hidden pt-2 md:block">
          <FeatureTiles />
        </div>
      </section>

      <PreviewPanel
        className="order-3 lg:col-span-2 xl:col-span-1 scroll-thin xl:min-h-0 xl:overflow-y-auto"
        item={selectedItem}
        entry={merge.isActive ? undefined : selectedItem ? compression.entries[selectedItem.id] : undefined}
        format={format}
        targetMB={compression.targetMB}
        editingTool={editingTool}
        onStartEdit={(tool) => selectedItem && startEdit(selectedItem.id, tool)}
        onApplyEdit={applyEdit}
        onCancelEdit={() => setEditing(null)}
        onRestoreOriginal={restoreOriginal}
        merge={
          merge.isActive
            ? {
                layout: effectiveLayout,
                images: source.readyImages,
                editedIds: new Set(source.items.filter((it) => it.edited).map((it) => it.id)),
                selectedId: selectedItem?.id ?? null,
                onSelect: setSelectedId,
                entry: merge.entry,
              }
            : null
        }
        action={primaryAction}
        actionSummary={actionSummary}
        progress={merge.isActive ? undefined : { done: compression.doneCount, total: compression.total }}
      />

      <div className="order-4 lg:col-span-full">
        <StatusBar
          items={source.items}
          readyCount={total}
          processingCount={source.processingCount}
          selected={selectedItem}
          onRemoveSelected={() => selectedItem && handleRemove(selectedItem.id)}
          limitBytes={limitBytes}
          samples={samples}
          savings={savings}
          isRunning={isRunning}
        />
      </div>
    </>
  );
}
