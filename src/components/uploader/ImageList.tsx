"use client";

import type { UploadItem } from "@/hooks/useSourceImages";
import { formatBytes } from "@/lib/format";

interface ImageListProps {
  items: UploadItem[];
  onRemove: (id: string) => void;
}

/** 업로드 항목 카드 목록. 상태(처리 중 / 준비됨 / 실패)에 따라 썸네일 영역만 다르게 그린다. */
export function ImageList({ items, onRemove }: ImageListProps) {
  if (items.length === 0) return null;

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex gap-3 rounded-lg border border-neutral-200 p-3 text-left dark:border-neutral-800"
        >
          <Thumbnail item={item} />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={item.name}>
              {item.name}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {formatBytes(item.size)}
              {item.image && (
                <>
                  {" · "}
                  {item.image.width}×{item.image.height}
                </>
              )}
            </p>
            {item.image?.convertedFromHeic && (
              <span className="mt-1 inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                HEIC → JPG 변환됨
              </span>
            )}
            {item.status === "error" && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                {item.error}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label={`${item.name} 제거`}
            className="self-start rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}

function Thumbnail({ item }: { item: UploadItem }) {
  const frame = "h-16 w-16 shrink-0 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800";

  if (item.status === "ready" && item.image) {
    return (
      // blob: URL 은 next/image 최적화 대상이 아니므로 기본 <img> 를 쓴다.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.image.previewUrl} alt="" className={`${frame} object-cover`} />
    );
  }

  return (
    <div className={`${frame} flex items-center justify-center text-xs text-neutral-500`} aria-live="polite">
      {item.status === "processing" ? (
        <span className="animate-pulse">변환 중</span>
      ) : (
        <span aria-hidden="true">!</span>
      )}
    </div>
  );
}
