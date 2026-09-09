"use client";

import { useState, type DragEvent } from "react";
import { CompressionResultLine } from "@/components/compress/CompressionResultLine";
import type { EditorTool } from "@/components/editor/ImageEditor";
import type { CompressionEntry } from "@/hooks/useCompression";
import type { UploadItem } from "@/hooks/useSourceImages";
import { formatBytes } from "@/lib/format";
import type { SourceImage } from "@/lib/image/types";

interface CardDeckProps {
  items: UploadItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  /** 항목을 toIndex 위치로 이동 */
  onMove: (id: string, toIndex: number) => void;
  entries: Record<string, CompressionEntry>;
  targetMB: number;
  onDownload: (image: SourceImage) => void;
  /** 카드의 [가리기] [크롭] 칩. 해당 카드를 선택하고 그 도구로 에디터를 연다. */
  onEdit: (id: string, tool: EditorTool) => void;
}

/** 드래그 중 dataTransfer 에 넣는 커스텀 타입. 파일 드롭(Files)과 구분하기 위함. */
export const CARD_DRAG_TYPE = "application/x-docufit-card";

/**
 * 서류 카드 덱. 순서 = 이어붙이기/PDF 페이지 순서.
 * - 마우스: 카드를 끌어 다른 카드 위에 놓으면 그 자리로 이동.
 * - 키보드: 카드의 ◀ ▶ 버튼. 드래그를 못 쓰는 사용자를 위한 동등한 경로.
 */
export function CardDeck({
  items,
  selectedId,
  onSelect,
  onRemove,
  onMove,
  entries,
  targetMB,
  onDownload,
  onEdit,
}: CardDeckProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  if (items.length === 0) return null;

  const handleDragStart = (e: DragEvent<HTMLLIElement>, id: string) => {
    e.dataTransfer.setData(CARD_DRAG_TYPE, id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  };

  const handleDragOver = (e: DragEvent<HTMLLIElement>, id: string) => {
    if (!e.dataTransfer.types.includes(CARD_DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropTargetId !== id) setDropTargetId(id);
  };

  const handleDrop = (e: DragEvent<HTMLLIElement>, targetId: string) => {
    if (!e.dataTransfer.types.includes(CARD_DRAG_TYPE)) return;
    e.preventDefault();
    const sourceId = e.dataTransfer.getData(CARD_DRAG_TYPE);
    const toIndex = items.findIndex((it) => it.id === targetId);
    if (sourceId && sourceId !== targetId && toIndex !== -1) onMove(sourceId, toIndex);
    setDraggingId(null);
    setDropTargetId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTargetId(null);
  };

  return (
    <ul
      className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3"
      data-testid="card-deck"
      aria-label="서류 카드 덱"
    >
      {items.map((item, index) => {
        const selected = item.id === selectedId;
        const entry = entries[item.id];
        return (
          <li
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDragOver={(e) => handleDragOver(e, item.id)}
            onDrop={(e) => handleDrop(e, item.id)}
            onDragEnd={handleDragEnd}
            onClick={() => onSelect(item.id)}
            aria-current={selected ? "true" : undefined}
            className={[
              "group relative flex cursor-grab flex-col rounded-xl border bg-panel p-2.5 text-left transition-shadow active:cursor-grabbing",
              selected ? "border-navy shadow-[0_0_0_2px_var(--color-navy)]" : "border-line hover:shadow-sm",
              draggingId === item.id ? "opacity-40" : "",
              dropTargetId === item.id && draggingId !== item.id ? "ring-2 ring-accent ring-offset-2" : "",
            ].join(" ")}
          >
            <span className="absolute left-2 top-2 z-10 rounded-md bg-navy px-1.5 py-0.5 text-[11px] font-bold text-white" aria-label={`${index + 1}번째`}>
              {index + 1}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.id);
              }}
              aria-label={`${item.name} 제거`}
              className="absolute right-2 top-2 z-10 rounded-md bg-panel/90 px-1.5 text-muted opacity-0 transition-opacity hover:text-ink focus:opacity-100 group-hover:opacity-100"
            >
              ✕
            </button>

            <Thumbnail item={item} />

            <p className="mt-2 truncate text-[13px] font-semibold" title={item.name}>
              {item.name}
            </p>
            <p className="text-xs text-muted">
              {formatBytes(item.size)}
              {item.image && ` · ${item.image.width}×${item.image.height}`}
              {item.image?.convertedFromHeic && <span className="ml-1 rounded bg-pass-soft px-1 text-[10px] font-medium text-pass">HEIC→JPG</span>}
              {item.edited && <span className="ml-1 rounded bg-accent-soft px-1 text-[10px] font-medium text-accent">편집됨</span>}
            </p>
            {item.status === "error" && (
              <p className="mt-1 text-xs text-fail" role="alert">
                {item.error}
              </p>
            )}
            {item.image && (
              <CompressionResultLine image={item.image} entry={entry} targetMB={targetMB} onDownload={() => onDownload(item.image as SourceImage)} />
            )}

            <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
              <Chip disabled={!item.image} onClick={() => onEdit(item.id, "mask")}>
                가리기
              </Chip>
              <Chip disabled={!item.image} onClick={() => onEdit(item.id, "crop")}>
                크롭
              </Chip>
              <span className="ml-auto flex gap-0.5">
                <MoveButton label="앞으로 이동" disabled={index === 0} onClick={() => onMove(item.id, index - 1)}>
                  ◀
                </MoveButton>
                <MoveButton label="뒤로 이동" disabled={index === items.length - 1} onClick={() => onMove(item.id, index + 1)}>
                  ▶
                </MoveButton>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Thumbnail({ item }: { item: UploadItem }) {
  const frame = "flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-lg bg-surface";
  if (item.status === "ready" && item.image) {
    return (
      // blob: URL 은 next/image 최적화 대상이 아니므로 기본 <img> 를 쓴다.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.image.previewUrl} alt="" draggable={false} className={`${frame} object-contain`} />
    );
  }
  return (
    <div className={`${frame} text-xs text-muted`} aria-live="polite">
      {item.status === "processing" ? <span className="animate-pulse">변환 중</span> : <span aria-hidden="true">!</span>}
    </div>
  );
}

function Chip({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="rounded border border-line px-1.5 py-0.5 text-muted hover:border-navy/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
    >
      [{children}]
    </button>
  );
}

function MoveButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="rounded px-1 text-muted hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}
