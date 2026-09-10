"use client";

import type { ReactNode } from "react";
import { ImageEditor, type EditorTool } from "@/components/editor/ImageEditor";
import { MergePreview } from "@/components/merge/MergePreview";
import { ActionBar, type PrimaryAction } from "@/components/studio/ActionBar";
import { ResultStats } from "@/components/studio/ResultStats";
import { ActionButton } from "@/components/ui/Button";
import { IconCheckCircle, IconCrop, IconDocument, IconEyeOff, IconImage, IconRotateRight } from "@/components/ui/icons";
import type { CompressionEntry } from "@/hooks/useCompression";
import type { MergeEntry } from "@/hooks/useMergeExport";
import type { UploadItem } from "@/hooks/useSourceImages";
import type { OutputFormat, OutputLayout } from "@/lib/constants";
import { formatBytes } from "@/lib/format";
import type { EditResult } from "@/lib/image/edit";
import type { SourceImage } from "@/lib/image/types";

/** 병합 출력이 활성일 때 미리보기·결과 카드에 필요한 것들 */
export interface MergePanelProps {
  layout: OutputLayout;
  /** 카드 덱 순서 그대로의 준비된 이미지들 */
  images: SourceImage[];
  /** 편집이 적용된 장들 */
  editedIds: ReadonlySet<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  entry: MergeEntry | null;
}

interface PreviewPanelProps {
  /** 그리드 순서 등 레이아웃 클래스. 상위(Studio)가 모바일/데스크톱 배치를 결정한다. */
  className?: string;
  item: UploadItem | undefined;
  entry: CompressionEntry | undefined;
  format: OutputFormat;
  targetMB: number;
  /** 편집 중이면 시작 도구, 아니면 null */
  editingTool: EditorTool | null;
  onStartEdit: (tool: EditorTool) => void;
  onApplyEdit: (result: EditResult) => void;
  onCancelEdit: () => void;
  onRestoreOriginal: () => void;
  /** 병합 출력(이어붙이기/PDF)이 활성이면 미리보기와 결과 카드를 병합 기준으로 보여준다. null 이면 파일별 출력 모드. */
  merge: MergePanelProps | null;
  /** 패널 하단 액션 바 (주요 동작). 편집 중에는 숨긴다. */
  action: PrimaryAction;
  actionSummary: string;
  progress?: { done: number; total: number };
}

/**
 * 오른쪽 "미리보기 · 최적화 결과" 패널.
 * - 보기 모드: 선택한 서류의 큰 미리보기 + 파일 정보 + 결과 카드 + 최종 버튼.
 * - 병합 모드: 미리보기 자리에 배치 미리보기(결과가 있으면 결과)가 들어오고 결과 카드는 병합 기준.
 * - 편집 모드: 같은 자리에 ImageEditor 가 들어온다 (결과 카드·버튼은 숨김).
 */
export function PreviewPanel({
  className = "",
  item,
  entry,
  format,
  targetMB,
  editingTool,
  onStartEdit,
  onApplyEdit,
  onCancelEdit,
  onRestoreOriginal,
  merge,
  action,
  actionSummary,
  progress,
}: PreviewPanelProps) {
  const image = item?.image;
  const editing = editingTool !== null && image;

  return (
    <section className={`flex min-w-0 flex-col rounded-card border border-line bg-panel p-4 sm:p-5 ${className}`} aria-label="시각적 병합 및 가리기">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-ink-strong">{editing ? "편집" : merge ? "병합 미리보기" : "미리보기"}</h2>
        {!editing && image && (
          <div className="flex flex-wrap items-center gap-1.5">
            <ActionButton variant="secondary" size="sm" onClick={() => onStartEdit("mask")} leadingIcon={<IconEyeOff className="h-3.5 w-3.5" />}>
              가리기
            </ActionButton>
            <ActionButton variant="secondary" size="sm" onClick={() => onStartEdit("crop")} leadingIcon={<IconCrop className="h-3.5 w-3.5" />}>
              크롭
            </ActionButton>
            <ActionButton variant="secondary" size="sm" onClick={() => onStartEdit("select")} leadingIcon={<IconRotateRight className="h-3.5 w-3.5" />}>
              회전·편집
            </ActionButton>
            {item?.edited && (
              <ActionButton variant="ghost" size="sm" onClick={onRestoreOriginal}>
                원본으로 되돌리기
              </ActionButton>
            )}
          </div>
        )}
      </div>

      {/*
        높이: 모바일·lg 는 뷰포트 비율로 고정한다 (세로로 긴 사진이 패널을 화면 밖까지 늘리지 않게). xl 앱 셸에서는 결과 카드·버튼을
        뺀 나머지를 전부 차지한다 (flex-1). 편집 중에는 모바일도 넉넉하게: 도구 줄이 3~4줄로 접혀 캔버스 몫이 줄어들고, 세밀한 영역을
        그려야 해서 캔버스가 커야 한다.
      */}
      <div className={["mt-3 xl:h-auto xl:min-h-0 xl:flex-1", editing ? "h-[clamp(480px,72vh,1000px)] lg:h-[clamp(420px,62vh,1000px)]" : "h-[clamp(280px,50vh,900px)] lg:h-[clamp(300px,45vh,900px)]"].join(" ")}>
        {editing ? (
          <ImageEditor key={image.id + image.previewUrl} image={image} initialTool={editingTool} onApply={onApplyEdit} onCancel={onCancelEdit} />
        ) : merge ? (
          <div className="h-full overflow-hidden rounded-xl bg-surface p-3">
            <MergePreview
              images={merge.images}
              layout={merge.layout}
              format={format}
              editedIds={merge.editedIds}
              selectedId={merge.selectedId}
              onSelect={merge.onSelect}
              result={merge.entry?.status === "done" ? merge.entry.result ?? null : null}
              resultUrls={merge.entry?.status === "done" ? merge.entry.previewUrls ?? [] : []}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center overflow-hidden rounded-xl bg-surface p-4">
            {image ? (
              // blob: URL 은 next/image 최적화 대상이 아니므로 기본 <img> 를 쓴다.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.previewUrl}
                alt={`${item.name} 미리보기`}
                // 컨테이너(100%)와 원본 크기 중 작은 쪽까지만. 원본보다 키워 흐릿해지는 것을 막는다.
                style={{ maxWidth: `min(100%, ${image.width}px)`, maxHeight: `min(100%, ${image.height}px)` }}
                className="h-auto w-auto rounded-md bg-white object-contain shadow-[var(--shadow-float)]"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-center text-[13px] text-muted">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-panel text-subtle shadow-[var(--shadow-card)]">
                  <IconImage className="h-6 w-6" />
                </span>
                {item ? "이미지를 준비하는 중입니다." : "서류 카드를 선택하면 여기에 크게 표시됩니다."}
              </div>
            )}
          </div>
        )}
      </div>

      {!editing && item && image && <FileRow item={item} image={image} entry={merge ? undefined : entry} />}

      {!editing && (
        <div className="mt-5">
          <h3 className="mb-2.5 text-[15px] font-semibold text-ink-strong">최적화 결과</h3>
          {merge ? (
            <ResultStats mode="merge" images={merge.images} layout={merge.layout} format={format} targetMB={targetMB} entry={merge.entry} />
          ) : item ? (
            <ResultStats mode="single" item={item} entry={entry} format={format} targetMB={targetMB} />
          ) : (
            <div className="rounded-xl border border-dashed border-line-strong/70 px-4 py-6 text-center text-[13px] text-muted">
              서류를 추가하면 현재 크기, 최적화 후 크기, 절감률이 여기에 표시됩니다.
            </div>
          )}
        </div>
      )}

      {!editing && <ActionBar action={action} summary={actionSummary} progress={progress} />}
    </section>
  );
}

/** 미리보기 아래 파일 한 줄: 아이콘 · 이름 · 크기/해상도 · 상태 배지 */
function FileRow({ item, image, entry }: { item: UploadItem; image: SourceImage; entry: CompressionEntry | undefined }) {
  const status: { label: string; tone: "pass" | "brand" } =
    entry?.status === "done"
      ? { label: "최적화 완료", tone: "pass" }
      : item.edited
        ? { label: "편집 적용됨", tone: "brand" }
        : image.convertedFromHeic
          ? { label: "HEIC → JPG 변환됨", tone: "pass" }
          : { label: "준비 완료", tone: "pass" };

  return (
    <div className="mt-3 flex items-center gap-3 border-t border-line pt-3" data-testid="file-row">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand" aria-hidden="true">
        <IconDocument className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink-strong" title={item.name}>
          {item.name}
        </p>
        <p className="text-[11px] tabular-nums text-muted">
          {formatBytes(item.edited ? image.blob.size : item.size)} · {image.width} × {image.height}
          {item.edited && <span className="ml-1 text-subtle">(편집본 · 원본 {formatBytes(item.size)})</span>}
        </p>
      </div>
      <StatusPill tone={status.tone}>{status.label}</StatusPill>
    </div>
  );
}

function StatusPill({ tone, children }: { tone: "pass" | "brand"; children: ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone === "pass" ? "bg-pass-soft text-pass" : "bg-brand-soft text-brand"}`}>
      <IconCheckCircle className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}
