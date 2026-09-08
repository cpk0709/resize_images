"use client";

import { Dropzone } from "@/components/uploader/Dropzone";
import { ImageList } from "@/components/uploader/ImageList";
import { useSourceImages } from "@/hooks/useSourceImages";

/**
 * 업로드 흐름의 조립 컴포넌트. 훅에서 상태를 받아 Dropzone 과 ImageList 에 나눠 준다.
 * Phase 2-2 에서 압축 옵션·다운로드 버튼이 이 아래에 붙는다 (`readyImages` 를 입력으로).
 */
export function Uploader() {
  const { items, rejected, readyImages, processingCount, addFiles, remove, clear, dismissRejected } =
    useSourceImages();

  return (
    <div className="mt-10 space-y-4">
      <Dropzone onFiles={addFiles} />

      {rejected.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-left text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <div className="flex items-start justify-between gap-3">
            <ul className="space-y-0.5">
              {rejected.map((r) => (
                <li key={`${r.name}-${r.reason}`}>
                  <span className="font-medium">{r.name}</span>: {r.reason}
                </li>
              ))}
            </ul>
            <button type="button" onClick={dismissRejected} aria-label="알림 닫기" className="shrink-0">
              ✕
            </button>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400">
          <span>
            {readyImages.length}장 준비됨
            {processingCount > 0 && ` · ${processingCount}장 변환 중`}
          </span>
          <button type="button" onClick={clear} className="underline hover:text-neutral-900 dark:hover:text-neutral-100">
            모두 지우기
          </button>
        </div>
      )}

      <ImageList items={items} onRemove={remove} />
    </div>
  );
}
