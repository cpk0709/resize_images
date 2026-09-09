"use client";

import { useState } from "react";
import type { EditorTool } from "@/components/editor/ImageEditor";
import { CardDeck } from "@/components/studio/CardDeck";
import { ControlPanel, type PrimaryAction } from "@/components/studio/ControlPanel";
import { PreviewPanel } from "@/components/studio/PreviewPanel";
import type { SizeSample } from "@/components/studio/SizeMeter";
import { Dropzone } from "@/components/uploader/Dropzone";
import { useCompression } from "@/hooks/useCompression";
import { useSourceImages } from "@/hooks/useSourceImages";
import { MB } from "@/lib/constants";
import type { EditResult } from "@/lib/image/edit";
import { DEFAULT_PRESET_ID, findPreset, SUBMISSION_PRESETS, type SubmissionPreset } from "@/lib/presets";

/**
 * 스튜디오 조립 컴포넌트. 세 패널(컨트롤 / 편집 캔버스 / 미리보기)을 page 의 grid 안에 형제로 렌더한다.
 * 훅 두 개와 프리셋·선택 상태를 연결하고 파생값(신호등 샘플, 주요 버튼 상태)을 계산한다. 표시는 각 패널이.
 */
export function Studio() {
  const source = useSourceImages();
  const compression = useCompression(source.readyImages);

  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID);
  const preset = findPreset(presetId) ?? SUBMISSION_PRESETS[0];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 선택이 없거나 삭제됐으면 첫 항목을 보여준다. 상태로 동기화하지 않고 렌더 시점에 결정한다.
  const selectedItem = source.items.find((it) => it.id === selectedId) ?? source.items[0];

  const handleSelectPreset = (next: SubmissionPreset) => {
    setPresetId(next.id);
    if (next.maxBytesPerFile !== null) compression.changeTarget(next.maxBytesPerFile / MB);
  };

  /** 편집 중인 카드와 시작 도구. 카드가 바뀌거나 삭제되면 편집을 닫는다. */
  const [editing, setEditing] = useState<{ id: string; tool: EditorTool } | null>(null);
  const editingTool = editing && selectedItem && editing.id === selectedItem.id ? editing.tool : null;

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
    compression.forget(editing.id); // 픽셀이 바뀌었으니 이전 압축 결과는 무효
    setEditing(null);
  };
  const restoreOriginal = () => {
    if (!selectedItem) return;
    source.restoreOriginal(selectedItem.id);
    compression.forget(selectedItem.id);
  };

  const limitBytes = Math.round(compression.targetMB * MB);
  const samples: SizeSample[] = source.readyImages.map((img) => {
    const result = compression.entries[img.id]?.result;
    return result
      ? { id: img.id, name: img.originalName, bytes: result.blob.size, kind: "result" }
      : { id: img.id, name: img.originalName, bytes: img.originalSize, kind: "original" };
  });

  const primaryAction: PrimaryAction = compression.isRunning
    ? { kind: "cancel", label: "취소", onClick: compression.cancel }
    : compression.total === 0
      ? { kind: "disabled", label: source.items.length > 0 ? "서류를 준비하는 중…" : "서류를 추가하세요" }
      : compression.doneCount === compression.total
        ? {
            kind: "download",
            label: `최적화 다운로드 (${compression.format === "jpeg" ? "JPG" : "PNG"}, ${compression.total}장)`,
            onClick: compression.downloadAll,
          }
        : { kind: "run", label: "최적화 시작", onClick: compression.run };

  return (
    <>
      <ControlPanel
        presets={SUBMISSION_PRESETS}
        selectedPreset={preset}
        onSelectPreset={handleSelectPreset}
        targetMB={compression.targetMB}
        onTargetChange={compression.changeTarget}
        format={compression.format}
        onFormatChange={compression.changeFormat}
        limitBytes={limitBytes}
        samples={samples}
        isRunning={compression.isRunning}
        progress={{ done: compression.doneCount, total: compression.total }}
        primaryAction={primaryAction}
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
              {source.readyImages.length}장 준비됨
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
          entries={compression.entries}
          targetMB={compression.targetMB}
          onDownload={compression.download}
          onEdit={startEdit}
        />
      </section>

      <PreviewPanel
        item={selectedItem}
        entry={selectedItem ? compression.entries[selectedItem.id] : undefined}
        total={source.items.length}
        editingTool={editingTool}
        onStartEdit={(tool) => selectedItem && startEdit(selectedItem.id, tool)}
        onApplyEdit={applyEdit}
        onCancelEdit={() => setEditing(null)}
        onRestoreOriginal={restoreOriginal}
      />
    </>
  );
}
