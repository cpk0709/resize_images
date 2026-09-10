"use client";

import type { OutputFormat, OutputLayout } from "@/lib/constants";
import type { MergeExportResult } from "@/lib/image/export";
import type { SourceImage } from "@/lib/image/types";

interface MergePreviewProps {
  /** 카드 덱 순서 그대로 */
  images: SourceImage[];
  layout: OutputLayout;
  format: OutputFormat;
  /** 편집(가리기·크롭·회전)이 적용된 장들. 타일에 "편집됨" 을 표시한다. */
  editedIds: ReadonlySet<string>;
  /** 현재 선택된 카드. 헤더의 가리기·크롭 버튼이 이 장을 편집한다. */
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** 병합이 끝났으면 결과. 없으면 배치 시뮬레이션을 보여준다. */
  result: MergeExportResult | null;
  /** 결과 페이지들의 object URL (useMergeExport 가 만들고 해제한다) */
  resultUrls: string[];
}

/**
 * 병합 출력 미리보기 (오른쪽 패널의 큰 영역).
 *
 * - 결과 전: 카드 덱 순서대로 현재 이미지(편집이 적용된 상태)를 방향에 맞게 배열한다.
 *   실제 병합과 같은 규칙으로 크기를 맞춘다: 세로 = 같은 너비, 가로 = 같은 높이.
 *   전체 띠가 항상 컨테이너 안에 들어오게 그린다 (세로: 너비 맞춤 후 세로 스크롤, 가로: 너비에 맞춰 비율 축소).
 *   어느 방향이든 모든 장이 한눈에 보여야 편집 결과를 확인할 수 있다.
 * - 결과 후: 실제 결과 이미지(PDF 는 안에 들어간 페이지 JPEG)를 보여준다. 보이는 것이 곧 내려받는 것.
 */
export function MergePreview({ images, layout, format, editedIds, selectedId, onSelect, result, resultUrls }: MergePreviewProps) {
  if (images.length === 0) {
    return <p className="text-sm text-muted">서류를 추가하면 배치 미리보기가 표시됩니다.</p>;
  }

  if (result && resultUrls.length > 0) {
    const single = resultUrls.length === 1;
    return (
      <div className="flex h-full w-full flex-col">
        <Caption>{format === "pdf" ? `병합 결과 · PDF ${result.pageCount}페이지 (보이는 그대로 저장됩니다)` : "병합 결과 (보이는 그대로 저장됩니다)"}</Caption>
        <div className={`min-h-0 flex-1 ${single ? "flex items-center justify-center" : "overflow-auto"}`}>
          {single ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resultUrls[0]} alt="병합 결과 미리보기" className="max-h-full max-w-full rounded-md object-contain shadow-md" />
          ) : (
            <ol className="mx-auto flex max-w-[520px] flex-col gap-3">
              {resultUrls.map((url, i) => (
                <li key={url} className="relative">
                  <Badge>{i + 1}페이지</Badge>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`${i + 1}페이지 미리보기`} className="w-full rounded-md shadow-md" />
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    );
  }

  // ── 배치 시뮬레이션 ──
  /** @param label 배지 문구 ("1" 또는 "1페이지"). 대체 텍스트에는 항상 "1번" / "1페이지" 처럼 단위를 붙인다. */
  const tile = (img: SourceImage, i: number, label: string, className: string, style?: React.CSSProperties) => {
    const selected = img.id === selectedId;
    const alt = `${/^\d+$/.test(label) ? `${label}번` : label}: ${img.originalName}`;
    return (
      <button
        key={img.id}
        type="button"
        onClick={() => onSelect(img.id)}
        aria-pressed={selected}
        title={`${img.originalName} 선택`}
        className={["relative block shrink-0 text-left outline-none", selected ? "ring-2 ring-navy ring-offset-2 ring-offset-surface" : "hover:ring-2 hover:ring-navy/30 hover:ring-offset-2 hover:ring-offset-surface", className].join(" ")}
        style={style}
        data-testid="merge-tile"
        data-image-id={img.id}
      >
        <Badge>{label}</Badge>
        {editedIds.has(img.id) && <Badge tone="edited">편집됨</Badge>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.previewUrl} alt={alt} className="block h-auto w-full bg-white" draggable={false} />
      </button>
    );
  };

  if (layout === "separate") {
    return (
      <div className="flex h-full w-full flex-col">
        <Caption>배치 미리보기 · 장마다 한 페이지 (카드 덱 순서). 장을 클릭하면 선택되어 위 버튼으로 편집할 수 있습니다.</Caption>
        <div className="mx-auto flex min-h-0 w-full max-w-[520px] flex-1 flex-col gap-3 overflow-auto p-1">
          {images.map((img, i) => tile(img, i, `${i + 1}페이지`, "w-full rounded-md shadow-md"))}
        </div>
      </div>
    );
  }

  if (layout === "vertical") {
    return (
      <div className="flex h-full w-full flex-col">
        <Caption>배치 미리보기 · 위에서 아래로 이어붙입니다 (카드 덱 순서). 장을 클릭하면 선택됩니다.</Caption>
        <div className="min-h-0 flex-1 overflow-auto p-1">
          <div className="mx-auto flex w-full max-w-[520px] flex-col shadow-md" data-testid="merge-layout-preview">
            {images.map((img, i) => tile(img, i, `${i + 1}`, "w-full"))}
          </div>
        </div>
      </div>
    );
  }

  // 가로: 각 장의 너비를 (가로세로비 / 전체 비) 로 나눠 주면 높이가 자동으로 같아진다. 실제 병합과 같은 결과 비율.
  const totalAspect = images.reduce((sum, img) => sum + img.width / img.height, 0);
  return (
    <div className="flex h-full w-full flex-col">
      <Caption>배치 미리보기 · 왼쪽에서 오른쪽으로 이어붙입니다 (카드 덱 순서). 장을 클릭하면 선택됩니다.</Caption>
      <div className="flex min-h-0 flex-1 items-center overflow-auto p-1">
        <div className="mx-auto flex w-full flex-row shadow-md" data-testid="merge-layout-preview">
          {images.map((img, i) => tile(img, i, `${i + 1}`, "", { width: `${((img.width / img.height) / totalAspect) * 100}%` }))}
        </div>
      </div>
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 shrink-0 text-xs font-medium text-muted">{children}</p>;
}

function Badge({ children, tone = "order" }: { children: React.ReactNode; tone?: "order" | "edited" }) {
  return (
    <span
      className={[
        "absolute top-1.5 z-10 rounded-md px-1.5 py-0.5 text-[11px] font-bold shadow-sm",
        tone === "order" ? "left-1.5 bg-navy/90 text-white" : "right-1.5 bg-accent-soft text-navy ring-1 ring-navy/30",
      ].join(" ")}
    >
      {children}
    </span>
  );
}
