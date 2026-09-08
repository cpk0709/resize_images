"use client";

import { CompressPanel } from "@/components/compress/CompressPanel";
import { CompressionResultLine } from "@/components/compress/CompressionResultLine";
import { Dropzone } from "@/components/uploader/Dropzone";
import { ImageList } from "@/components/uploader/ImageList";
import { useCompression } from "@/hooks/useCompression";
import { useSourceImages } from "@/hooks/useSourceImages";

/**
 * 업로드 → 압축 → 다운로드 흐름의 조립 컴포넌트.
 * 두 훅(useSourceImages, useCompression)을 연결하고 화면 배치만 결정한다.
 */
export function Uploader() {
  const { items, rejected, readyImages, processingCount, addFiles, remove, clear, dismissRejected } =
    useSourceImages();
  const compression = useCompression(readyImages);

  // 이미지가 사라지면 압축 결과(Blob)도 함께 버린다. 두 훅을 잇는 유일한 지점.
  const handleRemove = (id: string) => {
    compression.forget(id);
    remove(id);
  };
  const handleClear = () => {
    compression.reset();
    clear();
  };

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

      {readyImages.length > 0 && (
        <CompressPanel
          targetMB={compression.targetMB}
          onTargetChange={compression.changeTarget}
          format={compression.format}
          onFormatChange={compression.changeFormat}
          isRunning={compression.isRunning}
          doneCount={compression.doneCount}
          total={compression.total}
          onRun={compression.run}
          onCancel={compression.cancel}
          onDownloadAll={compression.downloadAll}
        />
      )}

      {items.length > 0 && (
        <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400">
          <span>
            {readyImages.length}장 준비됨
            {processingCount > 0 && ` · ${processingCount}장 변환 중`}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="underline hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            모두 지우기
          </button>
        </div>
      )}

      <ImageList
        items={items}
        onRemove={handleRemove}
        renderExtra={(item) => {
          const image = item.image;
          if (!image) return null;
          return (
            <CompressionResultLine
              image={image}
              entry={compression.entries[item.id]}
              targetMB={compression.targetMB}
              onDownload={() => compression.download(image)}
            />
          );
        }}
      />
    </div>
  );
}
