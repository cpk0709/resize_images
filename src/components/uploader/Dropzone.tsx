"use client";

import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { ACCEPT_ATTRIBUTE, MAX_INPUT_FILES } from "@/lib/constants";

interface DropzoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  /** 서류가 이미 있으면 높이를 줄여 카드 덱에 자리를 넘긴다 */
  compact?: boolean;
}

/**
 * 드래그 앤 드롭 + 파일 선택 영역. 파일을 받아 넘기는 것까지만 책임진다 (검증은 훅/ingest 가 한다).
 *
 * - 파일 드래그(`Files` 타입)에만 반응한다. 카드 덱의 순서 변경 드래그가 지나가도 하이라이트되지 않는다.
 * - 드래그 카운터: 자식 요소 위를 지날 때 dragleave 가 먼저 발생해 하이라이트가 깜빡이는 문제를 막는다.
 * - `<input>` 은 숨기고 영역 전체를 버튼처럼 쓴다. 키보드 사용자는 포커스 후 Enter/Space 로 열 수 있다.
 * - 선택 후 `input.value` 를 비워 같은 파일을 다시 고를 수 있게 한다 (삭제 후 재추가 시나리오).
 */
export function Dropzone({ onFiles, disabled = false, compact = false }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files");

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    if (disabled) return;
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(e)) return;
    e.preventDefault(); // 이게 없으면 drop 이벤트가 오지 않는다.
    if (!disabled) e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    if (disabled) return;
    onFiles(Array.from(e.dataTransfer.files));
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    onFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  const open = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={[
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent",
        compact ? "px-6 py-6" : "px-6 py-12",
        isDragging ? "border-accent bg-accent-soft" : "border-line bg-surface/60 hover:border-navy/40",
        disabled ? "opacity-60" : "",
      ].join(" ")}
    >
      <span aria-hidden="true" className="mb-2 text-2xl text-muted">
        ⬆
      </span>
      <p className="text-[15px] font-medium">여기에 서류를 드래그하거나 클릭하여 추가하세요</p>
      <p className="mt-1 text-xs text-muted">
        JPG · PNG · HEIC(아이폰) · WEBP · GIF · BMP · TIFF, 한 번에 최대 {MAX_INPUT_FILES}장 · 파일은 이 브라우저 밖으로 나가지 않습니다
      </p>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        disabled={disabled}
        onChange={handleInputChange}
        onClick={(e) => e.stopPropagation()}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
}
