"use client";

import { useRef, useState, type DragEvent, type ChangeEvent, type MouseEvent } from "react";
import { ActionButton } from "@/components/ui/Button";
import { IconFileImage, IconPlus, IconUpload } from "@/components/ui/icons";
import { ACCEPT_ATTRIBUTE, MAX_INPUT_FILE_BYTES, MAX_INPUT_FILES } from "@/lib/constants";
import { formatBytes } from "@/lib/format";

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
 * - 실제 버튼은 안쪽 "파일 선택하기" 하나다(키보드 접근 경로). 영역 어디를 눌러도 같은 동작을 하되, 버튼 클릭이
 *   영역 클릭으로 한 번 더 전파되어 대화상자가 두 번 열리지 않게 막는다.
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
  const openFromButton = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    open();
  };

  const formats = "JPG · PNG · HEIC(아이폰) · WEBP · GIF · BMP · TIFF";
  const limits = `파일당 최대 ${formatBytes(MAX_INPUT_FILE_BYTES, 0)} · 한 번에 ${MAX_INPUT_FILES}장`;

  return (
    <div
      onClick={open}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      aria-disabled={disabled}
      data-testid="dropzone"
      className={[
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors",
        compact ? "gap-1 px-4 py-4 sm:flex-row sm:gap-4 sm:px-5 sm:text-left" : "flex-1 gap-1 px-5 py-10 sm:py-14",
        isDragging ? "border-brand bg-brand-soft" : "border-line-strong/80 bg-panel hover:border-brand/60 hover:bg-surface/60",
        disabled ? "cursor-not-allowed opacity-60" : "",
      ].join(" ")}
    >
      {/* 아이콘: 이미지가 든 서류 + 파랑 플러스 배지 */}
      <span className={`relative inline-flex text-brand ${compact ? "h-9 w-9" : "mb-4 h-14 w-14"}`} aria-hidden="true">
        <IconFileImage className="h-full w-full" strokeWidth={1.5} />
        {!compact && (
          <span className="absolute -bottom-0.5 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white ring-[3px] ring-panel">
            <IconPlus className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
        )}
      </span>

      <div className={compact ? "min-w-0 flex-1" : "min-w-0"}>
        {/* 모바일에는 드래그가 없다. 사진 앨범·카메라에서 고르는 흐름으로 안내한다. */}
        <p className={`font-semibold text-ink-strong ${compact ? "text-[13px]" : "text-[17px]"}`}>
          <span className="lg:hidden">탭해서 서류 사진 선택 또는 촬영</span>
          <span className="hidden lg:inline">{compact ? "서류를 더 추가하려면 여기에 놓거나 클릭하세요" : "파일을 드래그 앤 드롭하세요"}</span>
        </p>
        <p className={`text-muted ${compact ? "text-[11px]" : "mt-1 text-[13px]"}`}>
          {compact ? (
            <span>
              {formats} · {limits}
            </span>
          ) : (
            <>
              <span className="lg:hidden">아이폰 HEIC 포함 · 사진은 이 브라우저 밖으로 나가지 않습니다</span>
              <span className="hidden lg:inline">또는 아래 버튼을 클릭하여 파일을 선택할 수 있습니다. 사진은 이 브라우저 밖으로 나가지 않습니다.</span>
            </>
          )}
        </p>
      </div>

      {!compact && (
        <>
          <ActionButton variant="primary" size="md" className="mt-5" disabled={disabled} onClick={openFromButton} leadingIcon={<IconUpload className="h-4 w-4" />}>
            파일 선택하기
          </ActionButton>
          <p className="mt-5 text-[11px] text-subtle">
            <span className="text-muted">지원 형식</span> {formats}
            <span className="mx-2 text-line-strong" aria-hidden="true">
              |
            </span>
            {limits}
          </p>
        </>
      )}
      {compact && (
        <ActionButton variant="secondary" size="sm" className="hidden shrink-0 sm:inline-flex" disabled={disabled} onClick={openFromButton} leadingIcon={<IconPlus className="h-3.5 w-3.5" />}>
          파일 추가
        </ActionButton>
      )}

      <input ref={inputRef} type="file" multiple accept={ACCEPT_ATTRIBUTE} disabled={disabled} onChange={handleInputChange} onClick={(e) => e.stopPropagation()} className="sr-only" tabIndex={-1} />
    </div>
  );
}
