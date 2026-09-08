"use client";

import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { ACCEPT_ATTRIBUTE, MAX_INPUT_FILES } from "@/lib/constants";

interface DropzoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

/**
 * 드래그 앤 드롭 + 파일 선택 영역. 파일을 받아 넘기는 것까지만 책임진다 (검증은 훅/ingest 가 한다).
 *
 * - 드래그 카운터: 자식 요소 위를 지날 때 dragleave 가 먼저 발생해 하이라이트가 깜빡이는 문제를 막는다.
 * - `<input>` 은 숨기고 버튼으로 연다. 키보드 사용자는 버튼에 포커스해 Enter 로 열 수 있다.
 * - 선택 후 `input.value` 를 비워 같은 파일을 다시 고를 수 있게 한다 (삭제 후 재추가 시나리오).
 */
export function Dropzone({ onFiles, disabled = false }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // 이게 없으면 drop 이벤트가 오지 않는다.
    if (!disabled) e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
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

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      aria-disabled={disabled}
      className={[
        "rounded-xl border-2 border-dashed p-10 text-center transition-colors",
        isDragging
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
          : "border-neutral-300 dark:border-neutral-700",
        disabled ? "opacity-60" : "",
      ].join(" ")}
    >
      <p className="text-base font-medium">서류 사진을 여기에 끌어다 놓으세요</p>
      <p className="mt-1 text-sm text-neutral-500">
        JPG · PNG · HEIC(아이폰) · WEBP · GIF · BMP · TIFF, 한 번에 최대 {MAX_INPUT_FILES}장
      </p>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        disabled={disabled}
        onChange={handleInputChange}
        className="sr-only"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="mt-5 inline-flex items-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        파일 선택
      </button>

      <p className="mt-4 text-xs text-neutral-500">
        🔒 파일은 이 브라우저 안에서만 처리됩니다. 서버로 전송되지 않습니다.
      </p>
    </div>
  );
}
