"use client";

import { useState, type DragEvent, type ReactNode } from "react";
import { CompressionResultLine } from "@/components/compress/CompressionResultLine";
import type { EditorTool } from "@/components/editor/ImageEditor";
import { ActionButton } from "@/components/ui/Button";
import { IconChevronLeft, IconChevronRight, IconClose, IconCrop, IconEyeOff } from "@/components/ui/icons";
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
  /** 카드의 [가리기] [크롭] 버튼. 해당 카드를 선택하고 그 도구로 에디터를 연다. */
  onEdit: (id: string, tool: EditorTool) => void;
}

/** 드래그 중 dataTransfer 에 넣는 커스텀 타입. 파일 드롭(Files)과 구분하기 위함. */
export const CARD_DRAG_TYPE = "application/x-docufit-card";

/**
 * 서류 카드 덱. 순서 = 이어붙이기/PDF 페이지 순서.
 * - 마우스: 카드를 끌어 다른 카드 위에 놓으면 그 자리로 이동.
 * - 키보드: 카드의 ‹ › 버튼. 드래그를 못 쓰는 사용자를 위한 동등한 경로.
 */
export function CardDeck({ items, selectedId, onSelect, onRemove, onMove, entries, targetMB, onDownload, onEdit }: CardDeckProps) {
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
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]" data-testid="card-deck" aria-label="서류 카드 덱">
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
              "group relative flex cursor-grab flex-col rounded-xl border bg-panel p-2.5 text-left transition-[box-shadow,border-color] active:cursor-grabbing",
              selected ? "border-brand ring-2 ring-brand-ring" : "border-line hover:border-line-strong hover:shadow-[var(--shadow-card)]",
              draggingId === item.id ? "opacity-40" : "",
              dropTargetId === item.id && draggingId !== item.id ? "ring-2 ring-brand ring-offset-2" : "",
            ].join(" ")}
          >
            <span className="absolute left-2 top-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-md bg-brand px-1.5 text-[11px] font-bold text-white" aria-label={`${index + 1}번째`}>
              {index + 1}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.id);
              }}
              aria-label={`${item.name} 제거`}
              // 모바일에는 hover 가 없으므로 항상 보인다. 데스크톱에서는 hover/focus 시에만.
              className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-md bg-panel/90 text-muted shadow-sm transition-opacity hover:text-ink focus:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
            >
              <IconClose className="h-3.5 w-3.5" />
            </button>

            <Thumbnail item={item} />

            <p className="mt-2 truncate text-[13px] font-semibold text-ink-strong" title={item.name}>
              {item.name}
            </p>
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted">
              <span className="tabular-nums">
                {formatBytes(item.size)}
                {item.image && ` · ${item.image.width}×${item.image.height}`}
              </span>
              {item.image?.convertedFromHeic && <Pill tone="pass">HEIC→JPG</Pill>}
              {item.edited && <Pill tone="brand">편집됨</Pill>}
            </p>
            {item.status === "error" && (
              <p className="mt-1 text-[11px] text-fail" role="alert">
                {item.error}
              </p>
            )}
            {item.image && <CompressionResultLine image={item.image} entry={entry} targetMB={targetMB} onDownload={() => onDownload(item.image as SourceImage)} />}

            <div className="mt-2 flex flex-wrap items-center gap-1">
              <ActionButton variant="secondary" size="xs" disabled={!item.image} onClick={(e) => stopThen(e, () => onEdit(item.id, "mask"))} leadingIcon={<IconEyeOff className="h-3 w-3" />}>
                가리기
              </ActionButton>
              <ActionButton variant="secondary" size="xs" disabled={!item.image} onClick={(e) => stopThen(e, () => onEdit(item.id, "crop"))} leadingIcon={<IconCrop className="h-3 w-3" />}>
                크롭
              </ActionButton>
              <span className="ml-auto flex">
                <MoveButton label="앞으로 이동" disabled={index === 0} onClick={() => onMove(item.id, index - 1)}>
                  <IconChevronLeft className="h-3.5 w-3.5" />
                </MoveButton>
                <MoveButton label="뒤로 이동" disabled={index === items.length - 1} onClick={() => onMove(item.id, index + 1)}>
                  <IconChevronRight className="h-3.5 w-3.5" />
                </MoveButton>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** 카드 클릭(선택)으로 전파되지 않게 막고 동작을 실행한다 */
function stopThen(e: React.MouseEvent, fn: () => void) {
  e.stopPropagation();
  fn();
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
    <div className={`${frame} text-[11px] text-muted`} aria-live="polite">
      {item.status === "processing" ? <span className="animate-pulse">변환 중</span> : <span aria-hidden="true">!</span>}
    </div>
  );
}

function Pill({ tone, children }: { tone: "pass" | "brand"; children: ReactNode }) {
  return (
    <span className={`rounded px-1 py-px text-[10px] font-semibold ${tone === "pass" ? "bg-pass-soft text-pass" : "bg-brand-soft text-brand"}`}>{children}</span>
  );
}

function MoveButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => stopThen(e, onClick)}
      // 모바일 탭 타깃(28px)을 확보하고 데스크톱에서는 촘촘하게
      className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 lg:h-6 lg:w-6"
    >
      {children}
    </button>
  );
}
