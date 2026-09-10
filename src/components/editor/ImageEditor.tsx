"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import type { Canvas, FabricObject, Rect, TPointerEventInfo } from "fabric";
import { ActionButton, IconButton, ToggleButton } from "@/components/ui/Button";
import { IconFit, IconHand, IconMinus, IconPlus } from "@/components/ui/icons";
import { decodeToBitmap } from "@/lib/image/decode";
import { toUserMessage } from "@/lib/image/errors";
import {
  applyEdits,
  clampRegion,
  DEFAULT_MASK_COLOR,
  renderMosaic,
  rotateRegion,
  type EditResult,
  type MaskRegion,
  type RegionRect,
  type Rotation,
} from "@/lib/image/edit";
import type { SourceImage } from "@/lib/image/types";

/**
 * 크롭 · 가리기(단색 박스 / 모자이크) · 90° 회전 에디터.
 *
 * 역할 분담
 * - fabric(동적 import): 사각형을 그리고 옮기고 크기를 바꾸는 상호작용만 맡는다. 화면 배율 좌표로 동작한다.
 * - `@/lib/image/edit`: "적용" 시 사각형들을 이미지 픽셀 좌표로 환산해 실제 픽셀을 바꾼다.
 *
 * 모자이크 사각형은 fabric Pattern 으로 실제 픽셀화 결과를 채워 보여준다 (최종 적용과 같은 `renderMosaic`).
 * 회전은 작업 이미지를 즉시 돌리고, 그려둔 영역은 `rotateRegion` 으로 좌표를 변환해 그대로 유지한다.
 * 확대(1~4배)는 fabric 뷰포트 줌 + 캔버스 요소 확대로 구현해 스크롤 컨테이너 안에서 움직인다. scene 좌표(맞춤 배율)는
 * 그대로라 영역 ↔ 이미지 픽셀 환산(`scaleRef`)은 배율과 무관하다. 모바일은 캔버스가 터치 스크롤을 막으므로 "이동 모드" 로 옮긴다.
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

/** fabric 객체에 붙여 두는 우리 쪽 메타. WeakMap 으로 관리해 fabric 객체를 오염시키지 않는다. */
interface RegionMeta {
  kind: RegionKind;
  /** kind === "mask" 일 때 채우는 색 */
  color?: string;
}

/** 이미지 픽셀 좌표로 표현한 영역. 회전 후 복원과 최종 적용에 쓰는 형태. */
interface RegionSpec extends RegionMeta {
  region: RegionRect;
}

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

/** 확대 단계. 1 = 화면 맞춤. 모바일에서 손가락으로 다루기 좋은 4 배까지. */
const ZOOM_STEPS = [1, 1.5, 2, 3, 4] as const;
const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1];

const PAN_HINT = "화면을 끌어서 이동하세요. 영역을 그리거나 고치려면 이동 모드를 끄세요.";

const TOOL_HINT: Record<EditorTool, string> = {
  mask: "가릴 부분을 드래그하세요. 단색 박스는 복구할 수 없게 덮습니다 (주민번호 권장). 색은 오른쪽 색상 선택에서.",
  mosaic: "모자이크할 부분을 드래그하세요. 화면에 보이는 모자이크가 그대로 저장됩니다.",
  crop: "남길 부분을 드래그하세요. 한 영역만 지정할 수 있고 다시 그리면 교체됩니다.",
  select: "영역을 클릭해 옮기거나 모서리를 끌어 크기를 바꾸세요. Delete 키로 삭제.",
};

export function ImageEditor({ image, initialTool, onApply, onCancel }: ImageEditorProps) {
  /** 캔버스 영역의 바깥 틀. 스크롤바가 생기지 않으므로 맞춤 크기 측정 기준으로 쓴다. */
  const frameRef = useRef<HTMLDivElement>(null);
  /** 스크롤 컨테이너. 확대된 캔버스는 이 안에서 스크롤된다. */
  const scrollerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const metaRef = useRef(new WeakMap<FabricObject, RegionMeta>());
  const cropRectRef = useRef<Rect | null>(null);
  /** canvas px = image px × scale */
  const scaleRef = useRef(1);
  const toolRef = useRef<EditorTool>(initialTool);
  const maskColorRef = useRef(DEFAULT_MASK_COLOR);
  /** 회전 뒤 다시 그릴 영역들 (이미 회전된 좌표) */
  const pendingRef = useRef<RegionSpec[]>([]);
  /** 회전이 한 번이라도 있었는가. 적용할 것이 있는지 판단할 때 사용. */
  const rotatedRef = useRef(false);

  /**
   * 확대 배율(1 = 컨테이너 맞춤). fabric 뷰포트 줌(`setZoom`)으로 구현하므로 scene 좌표계와 영역 좌표 환산은 그대로고,
   * 캔버스 요소만 커져 컨테이너가 스크롤된다. 모바일에서 작은 화면으로 세밀한 영역을 그릴 수 있게 하는 장치.
   */
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  /** 이동(패닝) 모드: 확대 상태에서 한 손가락 드래그로 스크롤. 켜져 있으면 그리기·선택은 막힌다. */
  const [panMode, setPanMode] = useState(false);
  /** 맞춤 상태의 캔버스 크기(px). 확대는 여기에 배율을 곱한다. */
  const baseSizeRef = useRef({ width: 0, height: 0 });
  const panDragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  const [tool, setTool] = useState<EditorTool>(initialTool);
  const [maskColor, setMaskColor] = useState(DEFAULT_MASK_COLOR);
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

  /** 캔버스 위 사각형들을 이미지 픽셀 영역으로 읽어 낸다. 적용과 회전 보존이 같은 함수를 쓴다. */
  const collectRegions = useCallback((): RegionSpec[] => {
    const canvas = fabricRef.current;
    if (!canvas) return [];
    const inv = 1 / scaleRef.current;
    const specs: RegionSpec[] = [];
    for (const obj of canvas.getObjects()) {
      const meta = metaRef.current.get(obj);
      if (!meta) continue;
      const b = obj.getBoundingRect();
      specs.push({ ...meta, region: { x: b.left * inv, y: b.top * inv, width: b.width * inv, height: b.height * inv } });
    }
    return specs;
  }, []);

  // 이벤트 핸들러는 캔버스 생성 시 한 번 등록되므로 최신 도구·색은 ref 로 읽는다.
  useEffect(() => {
    toolRef.current = tool;
    const canvas = fabricRef.current;
    if (!canvas) return;
    const drawing = tool !== "select";
    canvas.skipTargetFind = drawing; // 그리기 도구일 때는 기존 영역을 잡지 않아 드래그가 항상 새 영역을 만든다.
    canvas.defaultCursor = drawing ? "crosshair" : "default";
    if (drawing) canvas.discardActiveObject();
    canvas.requestRenderAll();
  }, [tool]);

  useEffect(() => {
    maskColorRef.current = maskColor;
    // 단색 박스가 선택돼 있으면 그 색도 함께 바꾼다.
    const canvas = fabricRef.current;
    if (!canvas) return;
    let changed = false;
    for (const obj of canvas.getActiveObjects()) {
      const meta = metaRef.current.get(obj);
      if (meta?.kind === "mask") {
        meta.color = maskColor;
        obj.set({ fill: maskColor, stroke: maskColor });
        changed = true;
      }
    }
    if (changed) canvas.requestRenderAll();
  }, [maskColor]);

  // 작업 이미지가 바뀔 때마다 fabric 캔버스를 새로 만든다.
  useEffect(() => {
    const container = frameRef.current;
    const el = canvasElRef.current;
    if (!container || !el) return;

    let disposed = false;
    let canvas: Canvas | null = null;
    let bitmap: ImageBitmap | null = null;

    (async () => {
      setBusy("loading");
      setError(null);
      try {
        const [{ Canvas, FabricImage, Rect, Pattern }, decoded] = await Promise.all([
          import("fabric"),
          decodeToBitmap(working.blob),
        ]);
        if (disposed) {
          decoded.close();
          return;
        }
        bitmap = decoded;

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
        metaRef.current = new WeakMap();
        cropRectRef.current = null;

        // 회전 등으로 캔버스를 다시 만들어도 사용자가 잡아 둔 확대 배율은 유지한다.
        baseSizeRef.current = { width, height };
        if (zoomRef.current !== 1) {
          canvas.setZoom(zoomRef.current);
          canvas.setDimensions({ width: Math.round(width * zoomRef.current), height: Math.round(height * zoomRef.current) });
        }

        const bg = await FabricImage.fromURL(working.url);
        if (disposed) return;
        // fabric v7 은 객체 기준점(origin) 기본값이 center 다. left/top 을 좌상단 좌표로 다루기 위해 명시한다.
        bg.set({ originX: "left", originY: "top", left: 0, top: 0, scaleX: scale, scaleY: scale, selectable: false, evented: false, objectCaching: false });
        canvas.backgroundImage = bg;

        // ── 영역 사각형 생성·스타일 ──
        const styleFor = (meta: RegionMeta) => {
          switch (meta.kind) {
            case "mask":
              return { fill: meta.color ?? DEFAULT_MASK_COLOR, stroke: meta.color ?? DEFAULT_MASK_COLOR, strokeDashArray: undefined };
            case "mosaic":
              return { fill: "rgba(37,99,235,0.25)", stroke: "#2563eb", strokeDashArray: [6, 4] };
            case "crop":
              return { fill: "rgba(22,163,74,0.08)", stroke: "#16a34a", strokeDashArray: [8, 4] };
          }
        };

        const makeRect = (meta: RegionMeta, box: RegionRect): Rect => {
          const rect = new Rect({
            originX: "left",
            originY: "top",
            left: box.x,
            top: box.y,
            width: box.width,
            height: box.height,
            ...styleFor(meta),
            strokeWidth: 1.5,
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
          metaRef.current.set(rect, meta);
          return rect;
        };

        /** 모자이크 사각형의 채움을 현재 위치·크기 기준 실제 픽셀화 결과로 갈아 끼운다. */
        const refreshMosaic = (rect: FabricObject) => {
          if (!bitmap) return;
          const inv = 1 / scale;
          const b = rect.getBoundingRect();
          const region = clampRegion(
            { x: b.left * inv, y: b.top * inv, width: b.width * inv, height: b.height * inv },
            { width: working.width, height: working.height },
          );
          if (!region) return;
          const source = renderMosaic(bitmap, region);
          // 패턴은 객체 좌상단에서 시작한다. 이미지 px 로 만든 소스를 캔버스 배율로 축소해 얹는다.
          rect.set({
            fill: new Pattern({ source, repeat: "no-repeat", patternTransform: [scale, 0, 0, scale, 0, 0] }),
          });
        };

        /** 크기 조절은 scaleX/Y 로 들어온다. width/height 로 정규화해야 패턴이 늘어나지 않는다. */
        const normalizeScale = (rect: FabricObject) => {
          if (rect.scaleX === 1 && rect.scaleY === 1) return;
          rect.set({ width: rect.width * rect.scaleX, height: rect.height * rect.scaleY, scaleX: 1, scaleY: 1 });
          rect.setCoords();
        };

        const registerRegion = (rect: Rect, meta: RegionMeta) => {
          if (meta.kind === "crop") {
            if (cropRectRef.current) canvas?.remove(cropRectRef.current); // 크롭은 하나만
            cropRectRef.current = rect;
            setHasCrop(true);
          }
          if (meta.kind === "mosaic") refreshMosaic(rect);
        };

        // ── 회전 뒤 복원 ──
        for (const spec of pendingRef.current) {
          const box = { x: spec.region.x * scale, y: spec.region.y * scale, width: spec.region.width * scale, height: spec.region.height * scale };
          const rect = makeRect({ kind: spec.kind, color: spec.color }, box);
          canvas.add(rect);
          registerRegion(rect, spec);
        }
        pendingRef.current = [];
        setRegionCount(countRegions(canvas, metaRef.current));
        setHasCrop(cropRectRef.current !== null);

        // ── 드래그로 사각형 그리기 ──
        let drawing: { rect: Rect; originX: number; originY: number } | null = null;

        canvas.on("mouse:down", (opt: TPointerEventInfo) => {
          const kind = toolRef.current;
          if (kind === "select" || !canvas) return;
          const p = opt.scenePoint;
          const meta: RegionMeta = kind === "mask" ? { kind, color: maskColorRef.current } : { kind };
          const rect = makeRect(meta, { x: p.x, y: p.y, width: 0, height: 0 });
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
          drawing = null;
          const meta = metaRef.current.get(rect);

          if (!meta || rect.width < MIN_REGION_PX || rect.height < MIN_REGION_PX) {
            canvas.remove(rect);
            canvas.requestRenderAll();
            return;
          }

          registerRegion(rect, meta);
          setRegionCount(countRegions(canvas, metaRef.current));

          // 그린 직후 바로 다듬을 수 있게 선택 도구로 전환하고 그 영역을 잡아 준다.
          setTool("select");
          canvas.setActiveObject(rect);
          canvas.requestRenderAll();
        });

        // 옮기거나 크기를 바꾸면 모자이크를 그 자리 기준으로 다시 계산한다.
        const onTransform = ({ target }: { target: FabricObject }) => {
          if (metaRef.current.get(target)?.kind === "mosaic") refreshMosaic(target);
        };
        canvas.on("object:moving", onTransform);
        canvas.on("object:scaling", onTransform);
        canvas.on("object:modified", ({ target }) => {
          normalizeScale(target);
          if (metaRef.current.get(target)?.kind === "mosaic") refreshMosaic(target);
          canvas?.requestRenderAll();
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
      bitmap?.close();
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

  /**
   * 확대 배율 적용. 화면 중심에 있던 지점이 확대 후에도 중심에 남도록 스크롤을 맞춘다.
   * 맞춤(1)으로 돌아오면 이동 모드는 의미가 없으므로 끈다.
   * fabric 은 포인터 좌표를 읽을 때마다 캔버스 오프셋을 다시 계산하므로 스크롤 뒤 별도 보정은 필요 없다.
   */
  const applyZoom = useCallback((next: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(1, next));
    zoomRef.current = clamped;
    setZoom(clamped);
    if (clamped === 1) setPanMode(false);

    const canvas = fabricRef.current;
    const scroller = scrollerRef.current;
    if (!canvas) return;

    // 지금 뷰포트 중심이 캔버스의 어느 비율 지점인지. 캔버스가 컨테이너보다 작으면 m-auto 로 가운데 놓여 있으므로
    // 스크롤 위치만으로는 알 수 없고, 두 요소의 화면 좌표 차이로 구한다.
    const canvasRect = canvas.upperCanvasEl.getBoundingClientRect();
    const viewRect = scroller?.getBoundingClientRect();
    const cx = viewRect && canvasRect.width ? (viewRect.left + viewRect.width / 2 - canvasRect.left) / canvasRect.width : 0.5;
    const cy = viewRect && canvasRect.height ? (viewRect.top + viewRect.height / 2 - canvasRect.top) / canvasRect.height : 0.5;

    const width = Math.round(baseSizeRef.current.width * clamped);
    const height = Math.round(baseSizeRef.current.height * clamped);
    canvas.setZoom(clamped);
    canvas.setDimensions({ width, height });
    canvas.requestRenderAll();

    // 확대된 캔버스가 컨테이너보다 크면 margin 이 0 이라 캔버스 원점 = 스크롤 원점. 작으면 브라우저가 0 으로 잘라 준다.
    if (scroller) {
      scroller.scrollLeft = cx * width - scroller.clientWidth / 2;
      scroller.scrollTop = cy * height - scroller.clientHeight / 2;
    }
  }, []);

  const zoomIn = useCallback(() => applyZoom(ZOOM_STEPS.find((z) => z > zoomRef.current) ?? MAX_ZOOM), [applyZoom]);
  const zoomOut = useCallback(() => applyZoom([...ZOOM_STEPS].reverse().find((z) => z < zoomRef.current) ?? 1), [applyZoom]);

  // ── 이동 모드: 오버레이가 fabric 대신 입력을 받아 드래그·휠을 컨테이너 스크롤로 바꾼다. 마우스·터치 공통(Pointer Events). ──
  const onPanStart = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    panDragRef.current = { x: e.clientX, y: e.clientY, left: scroller.scrollLeft, top: scroller.scrollTop };
  }, []);
  const onPanMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = panDragRef.current;
    const scroller = scrollerRef.current;
    if (!drag || !scroller) return;
    scroller.scrollLeft = drag.left - (e.clientX - drag.x);
    scroller.scrollTop = drag.top - (e.clientY - drag.y);
  }, []);
  const onPanEnd = useCallback(() => {
    panDragRef.current = null;
  }, []);
  const onPanWheel = useCallback((e: ReactWheelEvent<HTMLDivElement>) => {
    scrollerRef.current?.scrollBy(e.deltaX, e.deltaY);
  }, []);

  const removeSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const targets = canvas.getActiveObjects();
    if (targets.length === 0) return;
    canvas.discardActiveObject();
    canvas.remove(...targets);
    setRegionCount(countRegions(canvas, metaRef.current));
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
        // 그려둔 영역은 회전 후 좌표로 옮겨 두고, 새 캔버스가 뜰 때 다시 그린다.
        const size = { width: working.width, height: working.height };
        pendingRef.current = collectRegions().map((spec) => ({ ...spec, region: rotateRegion(spec.region, delta as Rotation, size) }));

        const result = await applyEdits(working.blob, working.mime, { rotation: delta as Rotation, crop: null, masks: [] });
        rotatedRef.current = true;
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
        pendingRef.current = [];
        setError(toUserMessage(err));
        setBusy(null);
      }
    },
    [working, collectRegions],
  );

  const apply = useCallback(async () => {
    if (!fabricRef.current) return;
    setBusy("applying");
    setError(null);
    try {
      const masks: MaskRegion[] = [];
      let crop: RegionRect | null = null;
      for (const spec of collectRegions()) {
        if (spec.kind === "crop") crop = spec.region;
        else if (spec.kind === "mask") masks.push({ ...spec.region, style: "solid", color: spec.color ?? DEFAULT_MASK_COLOR });
        else masks.push({ ...spec.region, style: "mosaic" });
      }

      if (masks.length === 0 && !crop && !rotatedRef.current) {
        onCancel(); // 바뀐 것이 없으면 적용할 것도 없다.
        return;
      }

      // 좌표만 남긴다 (이미지 내용 없음). 영역이 어긋날 때 원인 추적용.
      console.debug("[ImageEditor] apply", { image: `${working.width}×${working.height}`, crop, masks });
      const result = await applyEdits(working.blob, working.mime, { rotation: 0, crop, masks });
      onApply(result);
    } catch (err) {
      console.error("[ImageEditor] 적용 실패", err);
      setError(toUserMessage(err));
      setBusy(null);
    }
  }, [working, collectRegions, onApply, onCancel]);

  const disabled = busy !== null;

  return (
    <div className="flex h-full flex-col gap-3" data-testid="image-editor">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <ToggleButton active={tool === "mask"} disabled={disabled} onClick={() => setTool("mask")}>
          ■ 단색 박스
        </ToggleButton>
        <label className="flex items-center gap-1 text-xs text-muted" title="단색 박스 색상">
          <input
            type="color"
            value={maskColor}
            disabled={disabled}
            onChange={(e) => setMaskColor(e.target.value)}
            aria-label="단색 박스 색상"
            className="h-7 w-9 cursor-pointer rounded border border-line bg-panel p-0.5"
          />
          색상
        </label>
        <ToggleButton active={tool === "mosaic"} disabled={disabled} onClick={() => setTool("mosaic")}>
          ▦ 모자이크
        </ToggleButton>
        <ToggleButton active={tool === "crop"} disabled={disabled} onClick={() => setTool("crop")}>
          ⌗ 크롭
        </ToggleButton>
        <ToggleButton active={tool === "select"} disabled={disabled} onClick={() => setTool("select")}>
          ↖ 선택
        </ToggleButton>
        <ActionButton variant="secondary" size="sm" disabled={disabled} onClick={() => rotate(270)} title="왼쪽으로 90° 회전 (영역 유지)">
          ↺ 90°
        </ActionButton>
        <ActionButton variant="secondary" size="sm" disabled={disabled} onClick={() => rotate(90)} title="오른쪽으로 90° 회전 (영역 유지)">
          ↻ 90°
        </ActionButton>
        <ActionButton variant="secondary" size="sm" disabled={disabled} onClick={removeSelected}>
          선택 삭제
        </ActionButton>
        <ActionButton variant="secondary" size="sm" disabled={disabled || regionCount === 0} onClick={clearAll}>
          모두 지우기
        </ActionButton>

        {/* 확대·축소. 캔버스 위에 띄우지 않는 이유: 서류의 모서리(가릴 내용이 있을 수 있는 자리)를 가리면 안 된다. */}
        <div className="ml-auto flex items-center gap-1" role="group" aria-label="확대·축소" data-testid="editor-zoom">
          <IconButton label="축소" disabled={disabled || zoom === 1} onClick={zoomOut}>
            <IconMinus className="h-4 w-4" />
          </IconButton>
          <span className="min-w-[3.25rem] text-center text-xs font-semibold tabular-nums text-ink" aria-live="polite" data-testid="editor-zoom-level">
            {Math.round(zoom * 100)}%
          </span>
          <IconButton label="확대" disabled={disabled || zoom === MAX_ZOOM} onClick={zoomIn}>
            <IconPlus className="h-4 w-4" />
          </IconButton>
          <IconButton label="화면에 맞춤" disabled={disabled || zoom === 1} onClick={() => applyZoom(1)}>
            <IconFit className="h-4 w-4" />
          </IconButton>
          <IconButton label={panMode ? "이동 모드 끄기" : "이동 모드 (끌어서 스크롤)"} active={panMode} disabled={disabled || zoom === 1} onClick={() => setPanMode((v) => !v)}>
            <IconHand className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      <p className="text-xs text-muted" aria-live="polite">
        {busy === "loading" ? "편집기 불러오는 중…" : busy === "rotating" ? "회전 중…" : busy === "applying" ? "적용 중…" : panMode ? PAN_HINT : TOOL_HINT[tool]}
        {!busy && regionCount > 0 && ` · 영역 ${regionCount}개${hasCrop ? " (크롭 포함)" : ""}`}
      </p>

      <div ref={frameRef} className="relative flex min-h-0 flex-1">
        {/*
          스크롤 컨테이너. 캔버스가 작을 때는 m-auto 로 가운데, 확대되어 넘치면 margin 이 0 이 되어 처음부터 끝까지
          스크롤할 수 있다 (justify-center 는 넘친 왼쪽을 잘라 버린다). fabric 은 캔버스에 touch-action: none 을 걸어
          손가락 스크롤을 막으므로 모바일에서는 아래 이동 모드로 옮긴다.
        */}
        <div ref={scrollerRef} className="flex min-h-0 min-w-0 flex-1 overflow-auto rounded-xl border border-line bg-surface" data-testid="editor-scroller">
          <div className="m-auto">
            <canvas ref={canvasElRef} />
          </div>
        </div>

        {panMode && zoom > 1 && (
          <div
            className="absolute inset-0 z-10 cursor-grab touch-none active:cursor-grabbing"
            data-testid="editor-pan-overlay"
            onPointerDown={onPanStart}
            onPointerMove={onPanMove}
            onPointerUp={onPanEnd}
            onPointerCancel={onPanEnd}
            onWheel={onPanWheel}
          />
        )}
      </div>

      {error && (
        <p className="text-sm text-fail" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <ActionButton variant="ghost" onClick={onCancel} disabled={busy === "applying"}>
          취소
        </ActionButton>
        <ActionButton onClick={apply} disabled={disabled}>
          적용
        </ActionButton>
      </div>
    </div>
  );
}

function countRegions(canvas: Canvas, meta: WeakMap<FabricObject, RegionMeta>): number {
  return canvas.getObjects().filter((o) => meta.has(o)).length;
}
