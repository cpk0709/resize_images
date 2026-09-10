"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MB, type OutputFormat, type OutputLayout } from "@/lib/constants";
import { buildMergedFilename, downloadBlob } from "@/lib/image/download";
import { ImageProcessingError, toUserMessage } from "@/lib/image/errors";
import { produceMergedOutput, type MergeExportResult } from "@/lib/image/export";
import type { SourceImage } from "@/lib/image/types";

/**
 * "여러 장 → 파일 하나" 출력(이어붙이기 / PDF)의 상태 훅.
 *
 * 결과는 만들 때의 **입력 서명**(이미지 id·픽셀 데이터·순서 + 옵션)과 함께 저장한다.
 * 현재 서명과 다르면 결과를 없는 것으로 취급하므로, 순서 변경·편집·옵션 변경 시 호출자가 일일이 무효화할 필요가 없다.
 * (useCompression 의 forget/reset 방식과 다른 이유: 병합 결과는 "전체" 에 의존해 개별 무효화가 의미 없다.)
 */

export interface MergeOptions {
  layout: OutputLayout;
  format: OutputFormat;
  targetMB: number;
}

export interface MergeEntry {
  status: "working" | "done" | "error";
  result?: MergeExportResult;
  /** `result.pagePreviews` 의 object URL. 결과와 같은 수명을 가지며 훅이 해제한다. */
  previewUrls?: string[];
  error?: string;
}

interface StoredEntry extends MergeEntry {
  signature: string;
}

export function useMergeExport(images: SourceImage[], options: MergeOptions) {
  const [stored, setStored] = useState<StoredEntry | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const signature = useMemo(
    () =>
      images.map((img) => `${img.id}:${img.blob.size}:${img.width}x${img.height}`).join("|") +
      `#${options.layout}#${options.format}#${options.targetMB}`,
    [images, options.layout, options.format, options.targetMB],
  );

  /** 이 옵션 조합이 병합 출력을 만드는가. 아니면 파일별 압축(useCompression)이 담당한다. */
  const isActive = options.layout !== "separate" || options.format === "pdf";

  const entry: MergeEntry | null = stored && stored.signature === signature ? stored : null;

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStored((prev) => (prev?.status === "working" ? null : prev));
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  // 결과가 바뀌거나 컴포넌트가 사라지면 이전 결과의 미리보기 URL 을 해제한다.
  useEffect(() => {
    const urls = stored?.previewUrls;
    return () => {
      for (const u of urls ?? []) URL.revokeObjectURL(u);
    };
  }, [stored]);

  const run = useCallback(async () => {
    if (!isActive || images.length === 0) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const sig = signature;
    setStored({ status: "working", signature: sig });

    try {
      const result = await produceMergedOutput(images, {
        layout: options.layout,
        format: options.format,
        targetBytes: Math.round(options.targetMB * MB),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setStored({ status: "done", result, previewUrls: result.pagePreviews.map((b) => URL.createObjectURL(b)), signature: sig });
    } catch (err) {
      if (err instanceof ImageProcessingError && err.code === "ABORTED") return;
      console.error("[useMergeExport] 병합 출력 실패", err);
      setStored({ status: "error", error: toUserMessage(err), signature: sig });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [isActive, images, signature, options.layout, options.format, options.targetMB]);

  const download = useCallback(() => {
    if (!entry?.result) return;
    downloadBlob(entry.result.blob, buildMergedFilename(images.length, options.format));
  }, [entry, images.length, options.format]);

  return {
    isActive,
    entry,
    isRunning: entry?.status === "working",
    run,
    cancel,
    download,
  };
}
