"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Canvas, FabricObject, Rect, TPointerEventInfo } from "fabric";
import { toUserMessage } from "@/lib/image/errors";
import { applyEdits, type EditResult, type MaskRegion, type RegionRect, type Rotation } from "@/lib/image/edit";
import type { SourceImage } from "@/lib/image/types";

/**
 * 크롭 · 가리기(검은 박스 / 모자이크) · 90° 회전 에디터.
 *
 * 역할 분담
 * - fabric(동적 import): 사각형을 그리고 옮기고 크기를 바꾸는 상호작용만 맡는다. 화면 배율 좌표로 동작한다.
 * - `@/lib/image/edit`: "적용" 시 사각형들을 이미지 픽셀 좌표로 환산해 실제 픽셀을 바꾼다.
 *
 * 회전은 누르는 즉시 작업 이미지에 적용해 캔버스를 다시 그린다. 그때까지 그린 영역은 지워진다 (좌표계가 바뀌므로).
 * "적용" 을 누르기 전까지는 어떤 것도 카드 덱의 이미지에 반영되지 않는다.
 */

export type EditorTool = "mask" | "mosaic" | "crop" | "select";

interface ImageEditorProps {
  image: SourceImage;
  initialTool: EditorTool;
  onApply: (result: EditResult) => void;
  onCancel: () => void;
}

type RegionKind = "mask" | "mosaic" | "crop";

/** 화면에 올라간 작업 이미지. 회전할 때마다 갈아끼운다. */
interface WorkingImage {
  blob: Blob;
  mime: string;
  width: number;
  height: number;
  url: string;
  /** 우리가 만든 URL 이면 교체·언마운트 시 해제한다. 최초 이미지의 previewUrl 은 소유하지 않는다. */
  ownsUrl: boolean;
}

const MIN_REGION_PX = 4;

const REGION_STYLE: Record<RegionKind, { fill: string; stroke: string; dash?: number[] }> = {
  mask: { fill: "rgba(0,0,0,0.88)", stroke: "#000" },
  mosaic: { fill: "rgba(37,99,235,0.35)", stroke: "#2563eb", dash: [6, 4] },
  crop: { fill: "rgba(22,163,74,0.08)", stroke: "#16a34a", dash: [8, 4] },
};

const TOOL_HINT: Record<EditorTool, string> = {
  mask: "가릴 부분을 드래그하세요. 검은 박스는 복구할 수 없게 덮습니다 (주민번호 권장).",
  mosaic: "모자이크할 부분을 드래그하세요. 블록이 커서 글자는 읽을 수 없지만 형태는 남습니다.",
  crop: "남길 부분을 드래그하세요. 한 영역만 지정할 수 있고 다시 그리면 교체됩니다.",
  select: "영역을 클릭해 옮기거나 모서리를 끌어 크기를 바꾸세요. Delete 키로 삭제.",
};

export function ImageEditor({ image, initialTool, onApply, onCancel }: ImageEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  /** fabric 객체 → 종류. fabric 객체에 임의 속성을 심지 않고 타입 안전하게 추적한다. */
  const kindsRef = useRef(new WeakMap<FabricObject, RegionKind>());
  const cropRectRef = useRef<Rect | null>(null);
  /** 캔버스 px → 이미지 px 환산 배율의 역수 (canvas = image * scale) */
  const scaleRef = useRef(1);
  const toolRef = useRef<EditorTool>(initialTool);

  const [tool, setTool] = useState<EditorTool>(initialTool);
  const [working, setWorking] = useState<WorkingImage>(() => ({
    blob: image.blob,
    mime: image.mime,
    width: image.width,
    height: image.height,
    url: image.previewUrl,
    ownsUrl: false,
  }));
  const [regionCount, setRegionCount] = useState(0);
  const [hasCrop, setHasCrop] = useState(false);
  const [busy, setBusy] = useState<"loading" | "rotating" | "applying" | null>("loading");
  const [error, setError] = useState<string | null>(null);

  // 이벤트 핸들러는 캔버스 생성 시 한 번 등록되므로 최신 도구는 ref 로 읽는다.
  useEffect(() => {
    toolRef.current = tool;
    const canvas = fabricRef.current;
    if (!canvas) return;
    // 그리기 도구일 때는 기존 영역을 잡지 않게 해서 드래그가 항상 새 영역을 만든다.
    const drawing = tool !== "select";
    canvas.skipTargetFind = drawing;
    canvas.defaultCursor = drawing ? "crosshair" : "default";
    if (drawing) canvas.discardActiveObject();
    canvas.requestRenderAll();
  }, [tool]);

  // 작업 이미지가 바뀔 때마다 fabric 캔버스를 새로 만든다.
  useEffect(() => {
    const container = containerRef.current;
    const el = canvasElRef.current;
    if (!container || !el) return;

    let disposed = false;
    let canvas: Canvas | null = null;

    (async () => {
      setBusy("loading");
      setError(null);
      try {
        const { Canvas, FabricImage, Rect } = await import("fabric");
        if (disposed) return;

        const cw = Math.max(200, container.clientWidth - 2);
        const ch = Math.max(200, container.clientHeight - 2);
        const scale = Math.min(cw / working.width, ch / working.height);
        scaleRef.current = scale;
        const width = Math.round(working.width * scale);
        const height = Math.round(working.height * scale);

        canvas = new Canvas(el, {
          width,
          height,
          selection: false, // 드래그로 여러 객체 묶어 잡기 비활성. 드래그는 항상 "새 영역 그리기".
          preserveObjectStacking: true,
          uniformScaling: false,
          stopContextMenu: true,
        });
        fabricRef.current = canvas;
        kindsRef.current = new WeakMap();
        cropRectRef.current = null;
        setRegionCount(0);
        setHasCrop(false);

        const bg = await FabricImage.fromURL(working.url);
        if (disposed) return;
        // fabric v7 은 객체 기준점(origin) 기본값이 center 다. left/top 을 좌상단 좌표로 다루기 위해 명시한다.
        bg.set({
          originX: "left",
          originY: "top",
          left: 0,
          top: 0,
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
          objectCaching: false,
        });
        canvas.backgroundImage = bg;

        // ── 드래그로 사각형 그리기 ──
        let drawing: { rect: Rect; originX: number; originY: number } | null = null;

        canvas.on("mouse:down", (opt: TPointerEventInfo) => {
          const kind = toolRef.current;
          if (kind === "select" || !canvas) return;
          const p = opt.scenePoint;
          const style = REGION_STYLE[kind];
          const rect = new Rect({
            originX: "left",
            originY: "top",
            left: p.x,
            top: p.y,
            width: 0,
            height: 0,
            fill: style.fill,
            stroke: style.stroke,
            strokeWidth: 1.5,
            strokeDashArray: style.dash,
            strokeUniform: true,
            objectCaching: false,
            lockRotation: true,
            cornerColor: "#1e2a44",
            cornerStrokeColor: "#fff",
            cornerSize: 9,
            transparentCorners: false,
            borderColor: "#1e2a44",
          });
          rect.setControlsVisibility({ mtr: false });
          canvas.add(rect);
          drawing = { rect, originX: p.x, originY: p.y };
        });

        canvas.on("mouse:move", (opt: TPointerEventInfo) => {
          if (!drawing || !canvas) return;
          const p = opt.scenePoint;
          const x = Math.max(0, Math.min(width, p.x));
          const y = Math.max(0, Math.min(height, p.y));
          drawing.rect.set({
            left: Math.min(drawing.originX, x),
            top: Math.min(drawing.originY, y),
            width: Math.abs(x - drawing.originX),
            height: Math.abs(y - drawing.originY),
          });
          drawing.rect.setCoords();
          canvas.requestRenderAll();
        });

        canvas.on("mouse:up", () => {
          if (!drawing || !canvas) return;
          const { rect } = drawing;
          const kind = toolRef.current as RegionKind;
          drawing = null;

          if (rect.width < MIN_REGION_PX || rect.height < MIN_REGION_PX) {
            canvas.remove(rect);
            canvas.requestRenderAll();
            return;
          }

          if (kind === "crop") {
            // 크롭은 하나만. 이전 것을 치운다.
            if (cropRectRef.current) canvas.remove(cropRectRef.current);
            cropRectRef.current = rect;
            setHasCrop(true);
          }
          kindsRef.current.set(rect, kind);
          setRegionCount(countRegions(canvas, kindsRef.current));

          // 그린 직후 바로 다듬을 수 있게 선택 도구로 전환하고 그 영역을 잡아 준다.
          setTool("select");
          canvas.setActiveObject(rect);
          canvas.requestRenderAll();
        });

        canvas.on("object:removed", ({ target }) => {
          if (target === cropRectRef.current) {
            cropRectRef.current = null;
            setHasCrop(false);
          }
        });

        // 초기 도구 반영
        const drawingTool = toolRef.current !== "select";
        canvas.skipTargetFind = drawingTool;
        canvas.defaultCursor = drawingTool ? "crosshair" : "default";
        canvas.requestRenderAll();
        setBusy(null);
      } catch (err) {
        if (!disposed) {
          console.error("[ImageEditor] 캔버스 초기화 실패", err);
          setError("편집기를 불러오지 못했습니다. 페이지를 새로 고친 뒤 다시 시도해 주세요.");
          setBusy(null);
        }
      }
    })();

    return () => {
      disposed = true;
      fabricRef.current = null;
      void canvas?.dispose();
    };
  }, [working]);

  // 작업 이미지 URL 소유권 정리
  useEffect(
    () => () => {
      if (working.ownsUrl) URL.revokeObjectURL(working.url);
    },
    [working],
  );

  const removeSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const targets = canvas.getActiveObjects();
    if (targets.length === 0) return;
    canvas.discardActiveObject();
    canvas.remove(...targets);
    setRegionCount(countRegions(canvas, kindsRef.current));
    canvas.requestRenderAll();
  }, []);

  // Delete / Backspace 로 선택 영역 삭제
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      removeSelected();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [removeSelected]);

  const clearAll = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.remove(...canvas.getObjects());
    setRegionCount(0);
    canvas.requestRenderAll();
  }, []);

  const rotate = useCallback(
    async (delta: 90 | 270) => {
      setBusy("rotating");
      setError(null);
      try {
        const result = await applyEdits(working.blob, working.mime, { rotation: delta as Rotation, crop: null, masks: [] });
        setWorking({
          blob: result.blob,
          mime: result.mime,
          width: result.width,
          height: result.height,
          url: URL.createObjectURL(result.blob),
          ownsUrl: true,
        });
      } catch (err) {
        console.error("[ImageEditor] 회전 실패", err);
        setError(toUserMessage(err));
        setBusy(null);
      }
    },
    [working],
  );

  const apply = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setBusy("applying");
    setError(null);
    try {
      const inv = 1 / scaleRef.current;
      const masks: MaskRegion[] = [];
      let crop: RegionRect | null = null;

      for (const obj of canvas.getObjects()) {
        const kind = kindsRef.current.get(obj);
        if (!kind) continue;
        const b = obj.getBoundingRect();
        const region: RegionRect = { x: b.left * inv, y: b.top * inv, width: b.width * inv, height: b.height * inv };
        if (kind === "crop") crop = region;
        else masks.push({ ...region, style: kind === "mask" ? "black" : "mosaic" });
      }

      const rotatedAlready = working.blob !== image.blob; // 회전이 있었으면 working 이 이미 회전본
      if (masks.length === 0 && !crop && !rotatedAlready) {
        onCancel(); // 바뀐 것이 없으면 적용할 것도 없다.
        return;
      }

      const result = await applyEdits(working.blob, working.mime, { rotation: 0, crop, masks });
      onApply(result);
    } catch (err) {
      console.error("[ImageEditor] 적용 실패", err);
      setError(toUserMessage(err));
      setBusy(null);
    }
  }, [working, image.blob, onApply, onCancel]);

  const disabled = busy !== null;

  return (
    <div className="flex h-full flex-col gap-3" data-testid="image-editor">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <ToolButton active={tool === "mask"} disabled={disabled} onClick={() => setTool("mask")}>
          ■ 검은 박스
        </ToolButton>
        <ToolButton active={tool === "mosaic"} disabled={disabled} onClick={() => setTool("mosaic")}>
          ▦ 모자이크
        </ToolButton>
        <ToolButton active={tool === "crop"} disabled={disabled} onClick={() => setTool("crop")}>
          ⌗ 크롭
        </ToolButton>
        <ToolButton active={tool === "select"} disabled={disabled} onClick={() => setTool("select")}>
          ↖ 선택
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
        <ToolButton disabled={disabled} onClick={() => rotate(270)} title="왼쪽으로 90° 회전">
          ↺ 90°
        </ToolButton>
        <ToolButton disabled={disabled} onClick={() => rotate(90)} title="오른쪽으로 90° 회전">
          ↻ 90°
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
        <ToolButton disabled={disabled} onClick={removeSelected}>
          선택 삭제
        </ToolButton>
        <ToolButton disabled={disabled || regionCount === 0} onClick={clearAll}>
          모두 지우기
        </ToolButton>
      </div>

      <p className="text-xs text-muted" aria-live="polite">
        {busy === "loading" ? "편집기 불러오는 중…" : busy === "rotating" ? "회전 중…" : busy === "applying" ? "적용 중…" : TOOL_HINT[tool]}
        {!busy && regionCount > 0 && ` · 영역 ${regionCount}개${hasCrop ? " (크롭 포함)" : ""}`}
      </p>

      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface"
      >
        <canvas ref={canvasElRef} />
      </div>

      {error && (
        <p className="text-sm text-fail" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy === "applying"}
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-surface disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={disabled}
          className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
        >
          적용
        </button>
      </div>
    </div>
  );
}

function countRegions(canvas: Canvas, kinds: WeakMap<FabricObject, RegionKind>): number {
  return canvas.getObjects().filter((o) => kinds.has(o)).length;
}

function ToolButton({
  active = false,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={[
        "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40",
        active ? "border-navy bg-navy text-white" : "border-line bg-panel hover:bg-surface",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
