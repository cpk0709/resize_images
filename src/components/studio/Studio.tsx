"use client";

import { useState } from "react";
import type { EditorTool } from "@/components/editor/ImageEditor";
import type { PrimaryAction } from "@/components/studio/ActionBar";
import { CardDeck } from "@/components/studio/CardDeck";
import { ControlPanel } from "@/components/studio/ControlPanel";
import { PreviewPanel } from "@/components/studio/PreviewPanel";
import type { SizeSample } from "@/components/studio/SizeMeter";
import { Dropzone } from "@/components/uploader/Dropzone";
import { useCompression } from "@/hooks/useCompression";
import { useMergeExport } from "@/hooks/useMergeExport";
import { useSourceImages } from "@/hooks/useSourceImages";
import { MB, type OutputFormat, type OutputLayout } from "@/lib/constants";
import { formatBytes } from "@/lib/format";
import type { EditResult } from "@/lib/image/edit";
import { DEFAULT_PRESET_ID, findPreset, presetDefaultMB, SUBMISSION_PRESETS, type SubmissionPreset } from "@/lib/presets";

const FORMAT_LABEL: Record<OutputFormat, string> = { jpeg: "JPG", png: "PNG", pdf: "PDF" };
const LAYOUT_LABEL: Record<OutputLayout, string> = { separate: "개별 파일", vertical: "세로 이어붙이기", horizontal: "가로 이어붙이기" };

/**
 * 스튜디오 조립 컴포넌트. 세 패널(컨트롤 / 편집 캔버스 / 미리보기)을 page 의 grid 안에 형제로 렌더한다.
 *
 * 출력 경로는 둘이다.
 * - 파일별 압축(useCompression): 저장 형식 JPG/PNG + 출력 방식 "개별 파일".
 * - 병합 출력(useMergeExport): 그 외 (이어붙이기, 또는 PDF).
 * 어느 쪽이 활성인지는 `merge.isActive` 가 결정하고, 신호등·주요 버튼·카드 결과 표시가 그에 따라 바뀐다.
 */
export function Studio() {
  const source = useSourceImages();

  const [format, setFormat] = useState<OutputFormat>("jpeg");
  const [layout, setLayout] = useState<OutputLayout>("separate");

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

  // ── 파생 상태: 신호등 샘플, 주요 버튼 ──
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

  /** 액션 바 왼쪽의 한 줄 요약: 무엇을 어떤 기준으로 만드는지 */
  const actionSummary =
    total === 0
      ? "서류를 추가하면 여기서 최적화하고 내려받습니다."
      : merge.isActive
        ? `${FORMAT_LABEL[format]} · ${format === "pdf" && effectiveLayout === "separate" ? "장마다 한 페이지" : LAYOUT_LABEL[effectiveLayout]} · ${total}장 → 파일 1개 · 목표 ${formatBytes(limitBytes, 0)}`
        : `${FORMAT_LABEL[format]} · 개별 파일 ${total}장 · 파일마다 목표 ${formatBytes(limitBytes, 0)}`;

  return (
    <>
      <ControlPanel
        presets={SUBMISSION_PRESETS}
        selectedPreset={preset}
        onSelectPreset={handleSelectPreset}
        targetMB={compression.targetMB}
        onTargetChange={compression.changeTarget}
        onResetTarget={resetTarget}
        format={format}
        onFormatChange={handleFormatChange}
        layout={effectiveLayout}
        onLayoutChange={setLayout}
        imageCount={total}
        limitBytes={limitBytes}
        samples={samples}
        isRunning={isRunning}
      />

      <section className="flex flex-col gap-4 rounded-card border border-line bg-panel p-5" aria-label="편집 캔버스">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">편집 캔버스</h2>
          {source.items.length > 0 && (
            <button type="button" onClick={handleClear} className="text-sm text-muted underline hover:text-ink">
              모두 지우기
            </button>
          )}
        </div>

        <Dropzone onFiles={source.addFiles} compact={source.items.length > 0} />

        {source.rejected.length > 0 && (
          <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-warn/40 bg-warn-soft p-3 text-sm text-warn">
            <ul className="space-y-0.5">
              {source.rejected.map((r) => (
                <li key={`${r.name}-${r.reason}`}>
                  <span className="font-medium">{r.name}</span>: {r.reason}
                </li>
              ))}
            </ul>
            <button type="button" onClick={source.dismissRejected} aria-label="알림 닫기" className="shrink-0">
              ✕
            </button>
          </div>
        )}

        {source.items.length > 0 && (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">서류 카드 덱</h3>
            <span className="text-sm text-muted">
              {total}장 준비됨
              {source.processingCount > 0 && ` · ${source.processingCount}장 변환 중`}
              {" · 끌어서 순서 변경"}
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
      </section>

      <PreviewPanel
        item={selectedItem}
        entry={merge.isActive ? undefined : selectedItem ? compression.entries[selectedItem.id] : undefined}
        total={source.items.length}
        editingTool={editingTool}
        onStartEdit={(tool) => selectedItem && startEdit(selectedItem.id, tool)}
        onApplyEdit={applyEdit}
        onCancelEdit={() => setEditing(null)}
        onRestoreOriginal={restoreOriginal}
        merge={
          merge.isActive
            ? {
                layout: effectiveLayout,
                format,
                images: source.readyImages,
                editedIds: new Set(source.items.filter((it) => it.edited).map((it) => it.id)),
                selectedId: selectedItem?.id ?? null,
                onSelect: setSelectedId,
                targetMB: compression.targetMB,
                entry: merge.entry,
                onDownload: merge.download,
              }
            : null
        }
        layout={effectiveLayout}
        onLayoutChange={setLayout}
        action={primaryAction}
        actionSummary={actionSummary}
        progress={merge.isActive ? undefined : { done: compression.doneCount, total: compression.total }}
      />
    </>
  );
}
