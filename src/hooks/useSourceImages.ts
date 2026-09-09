"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { MAX_INPUT_FILES } from "@/lib/constants";
import { ImageProcessingError, toUserMessage } from "@/lib/image/errors";
import { fileIdentityKey, prepareSourceImage, releaseSourceImage } from "@/lib/image/ingest";
import type { SourceImage } from "@/lib/image/types";

/**
 * 업로드된 이미지 목록의 상태와 생명주기를 책임지는 훅.
 *
 * 책임 분리:
 * - 파일을 어떻게 읽고 변환하는지는 `@/lib/image/ingest` 가 안다. 이 훅은 그 결과를 상태에 반영하고 자원을 해제한다.
 * - 화면에 어떻게 보이는지는 컴포넌트가 안다. 이 훅은 표시 로직을 갖지 않는다.
 *
 * 처리는 **순차 큐**로 한다. HEIC 변환은 CPU 를 많이 쓰고 메모리 피크가 크다.
 * 여러 장을 동시에 돌리면 저사양 기기에서 탭이 죽으므로, 한 장씩 처리하며 진행 상태를 보여주는 편이 낫다.
 *
 * 상태(useReducer)는 "화면에 보이는 것"만 담고, 해제가 필요한 자원(object URL)은 `registry` ref 가 따로 추적한다.
 * 렌더 중 ref 를 읽거나 쓰지 않기 위한 구조다 (react-hooks/refs).
 */

export type UploadItemStatus = "processing" | "ready" | "error";

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  status: UploadItemStatus;
  /** status === "error" 일 때 사용자에게 보여줄 문장 */
  error?: string;
  /** status === "ready" 일 때만 존재 */
  image?: SourceImage;
  /** 크롭·가리기·회전이 적용된 상태. 원본은 훅이 따로 보관하며 `restoreOriginal` 로 되돌릴 수 있다. */
  edited: boolean;
}

/** 편집 적용 후 교체되는 픽셀 데이터. 나머지 메타(이름, 원본 크기 등)는 유지된다. */
export interface ReplacementImage {
  blob: Blob;
  mime: string;
  width: number;
  height: number;
}

/** 큐에 넣기 전에 거절된 파일. 목록에 남기지 않고 한 번 알려주기만 한다. */
export interface RejectedFile {
  name: string;
  reason: string;
}

interface State {
  items: UploadItem[];
  rejected: RejectedFile[];
}

type Action =
  | { type: "enqueue"; items: UploadItem[]; rejected: RejectedFile[] }
  | { type: "resolve"; id: string; image: SourceImage }
  | { type: "fail"; id: string; error: string }
  | { type: "replace"; id: string; image: SourceImage; edited: boolean }
  | { type: "remove"; id: string }
  | { type: "move"; id: string; toIndex: number }
  | { type: "clear" }
  | { type: "dismissRejected" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "enqueue":
      return { items: [...state.items, ...action.items], rejected: action.rejected };
    case "resolve":
      return {
        ...state,
        items: state.items.map((it) => (it.id === action.id ? { ...it, status: "ready", image: action.image } : it)),
      };
    case "fail":
      return {
        ...state,
        items: state.items.map((it) => (it.id === action.id ? { ...it, status: "error", error: action.error } : it)),
      };
    case "replace":
      return {
        ...state,
        items: state.items.map((it) => (it.id === action.id ? { ...it, image: action.image, edited: action.edited } : it)),
      };
    case "remove":
      return { ...state, items: state.items.filter((it) => it.id !== action.id) };
    case "move": {
      const from = state.items.findIndex((it) => it.id === action.id);
      const to = Math.max(0, Math.min(state.items.length - 1, action.toIndex));
      if (from === -1 || from === to) return state;
      const items = [...state.items];
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return { ...state, items };
    }
    case "clear":
      return { items: [], rejected: [] };
    case "dismissRejected":
      return { ...state, rejected: [] };
  }
}

const initialState: State = { items: [], rejected: [] };

/** 항목별로 훅이 추적해야 하는 비-렌더 정보 */
interface RegistryEntry {
  /** 중복 판별 키 */
  identityKey: string;
  /** 준비가 끝난 뒤에만 존재. 제거 시 object URL 해제 대상. */
  image?: SourceImage;
  /** 첫 편집 직전의 픽셀 데이터. 편집 전 상태로 되돌리기 위해 보관. 원본 File 과 별개 (HEIC 는 이미 JPEG 변환본). */
  original?: ReplacementImage;
}

export function useSourceImages() {
  const [state, dispatch] = useReducer(reducer, initialState);

  /** id → 항목 메타. 항목이 목록에 있는 동안만 존재한다. 크기가 곧 현재 항목 수다. */
  const registry = useRef(new Map<string, RegistryEntry>());
  /** 순차 처리 큐. 항상 마지막 작업의 Promise 를 가리킨다. */
  const queue = useRef<Promise<void>>(Promise.resolve());
  /** 언마운트 후 도착한 결과는 상태에 넣지 말고 즉시 자원을 해제한다. */
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const reg = registry.current;
    return () => {
      mounted.current = false;
      for (const entry of reg.values()) {
        if (entry.image) releaseSourceImage(entry.image);
      }
      reg.clear();
    };
  }, []);

  const addFiles = useCallback((incoming: Iterable<File>) => {
    const files = Array.from(incoming);
    if (files.length === 0) return;

    const reg = registry.current;
    const knownKeys = new Set(Array.from(reg.values(), (e) => e.identityKey));
    let remainingSlots = MAX_INPUT_FILES - reg.size;

    const accepted: { item: UploadItem; file: File }[] = [];
    const rejected: RejectedFile[] = [];

    for (const file of files) {
      const identityKey = fileIdentityKey(file);
      if (knownKeys.has(identityKey)) {
        rejected.push({ name: file.name, reason: "이미 추가된 파일입니다." });
        continue;
      }
      if (remainingSlots <= 0) {
        rejected.push({ name: file.name, reason: `한 번에 최대 ${MAX_INPUT_FILES}장까지 추가할 수 있습니다.` });
        continue;
      }
      const item: UploadItem = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        status: "processing",
        edited: false,
      };
      reg.set(item.id, { identityKey });
      knownKeys.add(identityKey);
      remainingSlots -= 1;
      accepted.push({ item, file });
    }

    dispatch({ type: "enqueue", items: accepted.map((a) => a.item), rejected });

    for (const { item, file } of accepted) {
      queue.current = queue.current.then(async () => {
        // 처리 순서를 기다리는 동안 사용자가 항목을 지웠으면 건너뛴다.
        if (!reg.has(item.id)) return;
        try {
          const image = await prepareSourceImage(file, item.id);
          const entry = reg.get(item.id);
          if (!mounted.current || !entry) {
            releaseSourceImage(image);
            return;
          }
          entry.image = image;
          dispatch({ type: "resolve", id: item.id, image });
        } catch (err) {
          // 사용자 입력 문제(빈 파일, 미지원 형식)는 정상 흐름이므로 warn, 그 외(변환/디코딩 실패, 예상 밖 예외)는 error.
          const isUserInputIssue =
            err instanceof ImageProcessingError &&
            (err.code === "EMPTY_FILE" || err.code === "FILE_TOO_LARGE" || err.code === "UNSUPPORTED_FORMAT");
          (isUserInputIssue ? console.warn : console.error)(`[useSourceImages] ${file.name} 처리 실패`, err);
          if (mounted.current && reg.has(item.id)) {
            dispatch({ type: "fail", id: item.id, error: toUserMessage(err) });
          }
        }
      });
    }
  }, []);

  const remove = useCallback((id: string) => {
    const entry = registry.current.get(id);
    if (entry?.image) releaseSourceImage(entry.image);
    registry.current.delete(id);
    dispatch({ type: "remove", id });
  }, []);

  const clear = useCallback(() => {
    for (const entry of registry.current.values()) {
      if (entry.image) releaseSourceImage(entry.image);
    }
    registry.current.clear();
    dispatch({ type: "clear" });
  }, []);

  /**
   * 편집 결과로 픽셀 데이터를 교체한다. 첫 교체 시 편집 전 데이터를 보관해 `restoreOriginal` 을 가능하게 한다.
   * 이전 미리보기 URL 은 여기서 해제한다.
   */
  const replaceImage = useCallback((id: string, next: ReplacementImage) => {
    const entry = registry.current.get(id);
    if (!entry?.image) return;
    const prev = entry.image;
    entry.original ??= { blob: prev.blob, mime: prev.mime, width: prev.width, height: prev.height };
    const image: SourceImage = { ...prev, ...next, previewUrl: URL.createObjectURL(next.blob) };
    releaseSourceImage(prev);
    entry.image = image;
    dispatch({ type: "replace", id, image, edited: true });
  }, []);

  /** 편집 전 상태로 되돌린다. 보관된 원본이 없으면 아무 일도 하지 않는다. */
  const restoreOriginal = useCallback((id: string) => {
    const entry = registry.current.get(id);
    if (!entry?.image || !entry.original) return;
    const prev = entry.image;
    const image: SourceImage = { ...prev, ...entry.original, previewUrl: URL.createObjectURL(entry.original.blob) };
    releaseSourceImage(prev);
    entry.image = image;
    entry.original = undefined;
    dispatch({ type: "replace", id, image, edited: false });
  }, []);

  /**
   * 항목 순서 변경. 순서는 Phase 2-3 이어붙이기/PDF 페이지 순서가 된다.
   * `toIndex` 는 이동 후 위치. 범위를 벗어나면 양 끝으로 보정된다.
   */
  const move = useCallback((id: string, toIndex: number) => dispatch({ type: "move", id, toIndex }), []);

  const dismissRejected = useCallback(() => dispatch({ type: "dismissRejected" }), []);

  // 배열 identity 를 유지해야 하위 훅(useCompression 등)의 effect 가 매 렌더마다 돌지 않는다.
  const readyImages = useMemo(() => state.items.flatMap((it) => (it.image ? [it.image] : [])), [state.items]);
  const processingCount = state.items.filter((it) => it.status === "processing").length;

  return {
    items: state.items,
    rejected: state.rejected,
    readyImages,
    processingCount,
    addFiles,
    remove,
    move,
    replaceImage,
    restoreOriginal,
    clear,
    dismissRejected,
  };
}
