"use client";

import { ImageEditor, type EditorTool } from "@/components/editor/ImageEditor";
import { MergeSummary } from "@/components/merge/MergeSummary";
import { ActionButton } from "@/components/ui/Button";
import type { CompressionEntry } from "@/hooks/useCompression";
import type { MergeEntry } from "@/hooks/useMergeExport";
import type { UploadItem } from "@/hooks/useSourceImages";
import type { OutputFormat, OutputLayout } from "@/lib/constants";
import { formatBytes } from "@/lib/format";
import type { EditResult } from "@/lib/image/edit";

/** 병합 출력이 활성일 때 요약 카드에 필요한 것들 */
export interface MergePanelProps {
  layout: OutputLayout;
  format: OutputFormat;
  imageCount: number;
  targetMB: number;
  entry: MergeEntry | null;
  onDownload: () => void;
}

interface PreviewPanelProps {
  item: UploadItem | undefined;
  entry: CompressionEntry | undefined;
  /** 전체 장수. 병합 안내 문구용 */
  total: number;
  /** 편집 중이면 시작 도구, 아니면 null */
  editingTool: EditorTool | null;
  onStartEdit: (tool: EditorTool) => void;
  onApplyEdit: (result: EditResult) => void;
  onCancelEdit: () => void;
  onRestoreOriginal: () => void;
  /** 병합 출력(이어붙이기/PDF)이 활성이면 요약 카드를 보여준다. null 이면 파일별 출력 모드. */
  merge: MergePanelProps | null;
}

/**
 * 오른쪽 "시각적 병합 및 가리기" 영역.
 * 보기 모드: 선택한 서류의 큰 미리보기 + 정보 + 편집 시작 버튼.
 * 편집 모드: 같은 자리에 ImageEditor 가 들어온다.
 * 병합(Phase 2-3)은 자리만 잡아 두고 "준비 중" 으로 표시한다.
 */
export function PreviewPanel({
  item,
  entry,
  total,
  editingTool,
  onStartEdit,
  onApplyEdit,
  onCancelEdit,
  onRestoreOriginal,
  merge,
}: PreviewPanelProps) {
  const image = item?.image;
  const editing = editingTool !== null && image;

  return (
    <section className="flex flex-col rounded-card border border-line bg-panel p-5" aria-label="시각적 병합 및 가리기">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">{editing ? "편집" : "시각적 병합 및 가리기"}</h2>
        {!editing && image && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <ActionButton variant="secondary" size="sm" onClick={() => onStartEdit("mask")}>
              ■ 가리기
            </ActionButton>
            <ActionButton variant="secondary" size="sm" onClick={() => onStartEdit("crop")}>
              ⌗ 크롭
            </ActionButton>
            <ActionButton variant="secondary" size="sm" onClick={() => onStartEdit("select")}>
              ↻ 회전·편집
            </ActionButton>
            {item?.edited && (
              <button type="button" onClick={onRestoreOriginal} className="text-xs text-muted underline hover:text-ink">
                원본으로 되돌리기
              </button>
            )}
          </div>
        )}
      </div>

      {/* 높이를 뷰포트 기준으로 고정한다. 세로로 긴 사진이 패널을 화면 밖까지 늘리지 않게. */}
      <div className="mt-4 h-[clamp(320px,62vh,1000px)]">
        {editing ? (
          <ImageEditor key={image.id + image.previewUrl} image={image} initialTool={editingTool} onApply={onApplyEdit} onCancel={onCancelEdit} />
        ) : (
          <div className="flex h-full items-center justify-center overflow-hidden rounded-xl border border-line bg-surface p-3">
            {image ? (
              // blob: URL 은 next/image 최적화 대상이 아니므로 기본 <img> 를 쓴다.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.previewUrl}
                alt={`${item.name} 미리보기`}
                // 컨테이너(100%)와 원본 크기 중 작은 쪽까지만. 원본보다 키워 흐릿해지는 것을 막는다.
                style={{ maxWidth: `min(100%, ${image.width}px)`, maxHeight: `min(100%, ${image.height}px)` }}
                className="h-auto w-auto rounded-md object-contain shadow-md"
              />
            ) : (
              <p className="text-sm text-muted">
                {item ? "이미지를 준비하는 중입니다." : "서류 카드를 선택하면 여기에 크게 표시됩니다."}
              </p>
            )}
          </div>
        )}
      </div>

      {image && !editing && (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <Info label="파일" value={item.name} />
          <Info
            label={item.edited ? "편집본" : "원본"}
            value={`${formatBytes(item.edited ? image.blob.size : item.size)} · ${image.width}×${image.height}`}
          />
          <Info
            label="최적화 결과"
            value={
              entry?.status === "done" && entry.result
                ? `${formatBytes(entry.result.blob.size)} · ${entry.result.width}×${entry.result.height}` +
                  (entry.result.quality !== null ? ` · 품질 ${Math.round(entry.result.quality * 100)}` : "")
                : entry?.status === "working"
                  ? "처리 중…"
                  : "아직 없음"
            }
          />
          <Info label="순서" value={`${total}장 중`} />
        </dl>
      )}

      {!editing && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {merge ? (
            <MergeSummary {...merge} />
          ) : (
            <div className="rounded-xl border border-dashed border-line p-4 text-sm">
              <p className="font-semibold">이어붙이기 · PDF</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                컨트롤 패널에서 저장 형식을 PDF 로 바꾸거나 출력 방식을 이어붙이기로 고르면, 카드 덱 순서대로 파일 하나로 묶습니다.
              </p>
            </div>
          )}
          <div className="rounded-xl border border-line p-4 text-sm">
            <p className="flex items-center justify-between gap-2 font-semibold">
              민감정보 가리기 · 크롭 · 회전
              <span className="shrink-0 whitespace-nowrap rounded bg-pass-soft px-1.5 py-0.5 text-[11px] font-medium text-pass">사용 가능</span>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              위 버튼으로 시작합니다. 편집은 이 브라우저 안에서만 이루어지고, 적용하면 카드 덱의 이미지가 교체됩니다.
              &ldquo;원본으로 되돌리기&rdquo; 로 언제든 취소할 수 있습니다.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="truncate font-medium" title={value}>
        {value}
      </dd>
    </div>
  );
}

