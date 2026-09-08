"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_TARGET_SIZE_MB, MB, type RasterFormat } from "@/lib/constants";
import { compressToTarget, type CompressResult } from "@/lib/image/compress";
import { buildOutputFilename, downloadBlob } from "@/lib/image/download";
import { ImageProcessingError, toUserMessage } from "@/lib/image/errors";
import type { SourceImage } from "@/lib/image/types";

/**
 * 준비된 이미지들을 목표 용량으로 압축하고 결과를 관리하는 훅.
 *
 * - 옵션(목표 용량, 포맷)이 바뀌면 기존 결과는 무효가 되므로 `changeTarget/changeFormat` 이 결과를 버리고 진행 중 작업을 취소한다.
 * - 이미지가 목록에서 빠지면 호출자가 `forget(id)` / `reset()` 으로 알려 결과(Blob, 수 MB)를 즉시 버린다.
 *   effect 로 images 를 감시하며 동기화하지 않는 이유: 상태 갱신 시점이 렌더 뒤로 밀려 불명확하고, 렌더 중 setState 규칙에 걸린다.
 * - 실행은 순차. 압축은 한 장당 인코딩을 최대 8회쯤 하므로 병렬로 돌리면 저사양 기기가 버티지 못한다.
 * - 알고리즘은 `@/lib/image/compress` 가 안다. 이 훅은 순서·취소·상태만 다룬다.
 */

export type CompressionStatus = "working" | "done" | "error";

export interface CompressionEntry {
  status: CompressionStatus;
  result?: CompressResult;
  error?: string;
}

export function useCompression(images: SourceImage[]) {
  const [targetMB, setTargetMB] = useState<number>(DEFAULT_TARGET_SIZE_MB);
  const [format, setFormat] = useState<RasterFormat>("jpeg");
  const [entries, setEntries] = useState<Record<string, CompressionEntry>>({});
  const [isRunning, setIsRunning] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsRunning(false);
  }, []);

  /** 옵션이 바뀌면 모든 결과가 무효 */
  const invalidateAll = useCallback(() => {
    cancel();
    setEntries({});
  }, [cancel]);

  const changeTarget = useCallback(
    (mb: number) => {
      if (mb === targetMB) return;
      invalidateAll();
      setTargetMB(mb);
    },
    [targetMB, invalidateAll],
  );

  const changeFormat = useCallback(
    (next: RasterFormat) => {
      if (next === format) return;
      invalidateAll();
      setFormat(next);
    },
    [format, invalidateAll],
  );

  /** 이미지 1장이 목록에서 빠질 때 호출. 진행 중이던 그 항목은 결과 도착 시 버려진다. */
  const forget = useCallback((id: string) => {
    setEntries((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  /** 목록을 모두 지울 때 호출 */
  const reset = useCallback(() => {
    invalidateAll();
  }, [invalidateAll]);

  // 언마운트 시 진행 중 작업 취소
  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsRunning(true);

    const targetBytes = Math.round(targetMB * MB);
    const pending = images.filter((img) => entries[img.id]?.status !== "done");

    try {
      for (const image of pending) {
        if (controller.signal.aborted) break;
        setEntries((prev) => ({ ...prev, [image.id]: { status: "working" } }));
        try {
          const result = await compressToTarget(image.blob, { targetBytes, format, signal: controller.signal });
          if (controller.signal.aborted) break;
          setEntries((prev) => ({ ...prev, [image.id]: { status: "done", result } }));
        } catch (err) {
          if (err instanceof ImageProcessingError && err.code === "ABORTED") break;
          console.error(`[useCompression] ${image.originalName} 압축 실패`, err);
          setEntries((prev) => ({ ...prev, [image.id]: { status: "error", error: toUserMessage(err) } }));
        }
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsRunning(false);
      }
    }
  }, [images, entries, targetMB, format]);

  const download = useCallback(
    (image: SourceImage) => {
      const result = entries[image.id]?.result;
      if (!result) return;
      downloadBlob(result.blob, buildOutputFilename(image.originalName, format));
    },
    [entries, format],
  );

  /**
   * 여러 파일 연속 다운로드. 브라우저가 "여러 파일 다운로드 허용" 을 한 번 물을 수 있다.
   * 클릭 사이에 짧은 간격을 두어 일부 브라우저가 앞 클릭을 무시하는 문제를 피한다.
   */
  const downloadAll = useCallback(async () => {
    for (const image of images) {
      if (!entries[image.id]?.result) continue;
      download(image);
      await new Promise((r) => setTimeout(r, 300));
    }
  }, [images, entries, download]);

  const doneCount = images.filter((img) => entries[img.id]?.status === "done").length;

  return {
    targetMB,
    changeTarget,
    format,
    changeFormat,
    entries,
    isRunning,
    doneCount,
    total: images.length,
    run,
    cancel,
    forget,
    reset,
    download,
    downloadAll,
  };
}
