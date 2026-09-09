"use client";

import type { CompressionEntry } from "@/hooks/useCompression";
import type { UploadItem } from "@/hooks/useSourceImages";
import { formatBytes } from "@/lib/format";

interface PreviewPanelProps {
  item: UploadItem | undefined;
  entry: CompressionEntry | undefined;
  /** 전체 장수. 병합 안내 문구용 */
  total: number;
}

/**
 * 오른쪽 "시각적 병합 및 가리기" 영역. 지금은 선택한 서류의 큰 미리보기와 정보를 보여준다.
 * 병합(Phase 2-3)과 가리기(Phase 2-4) 도구는 이 패널 안에 들어온다. 자리만 잡아 두고 "준비 중" 으로 표시한다.
 */
export function PreviewPanel({ item, entry, total }: PreviewPanelProps) {
  return (
    <section className="flex flex-col rounded-card border border-line bg-panel p-5" aria-label="시각적 병합 및 가리기">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">시각적 병합 및 가리기</h2>
        <span className="rounded bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">편집 도구 준비 중</span>
      </div>

      {/* 높이를 뷰포트 기준으로 고정한다. 세로로 긴 사진이 패널을 화면 밖까지 늘리지 않게. */}
      <div className="mt-4 flex h-[clamp(320px,62vh,1000px)] items-center justify-center overflow-hidden rounded-xl border border-line bg-surface p-3">
        {item?.image ? (
          // blob: URL 은 next/image 최적화 대상이 아니므로 기본 <img> 를 쓴다.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image.previewUrl}
            alt={`${item.name} 미리보기`}
            // 컨테이너(100%)와 원본 크기 중 작은 쪽까지만. 원본보다 키워 흐릿해지는 것을 막는다.
            style={{ maxWidth: `min(100%, ${item.image.width}px)`, maxHeight: `min(100%, ${item.image.height}px)` }}
            className="h-auto w-auto rounded-md object-contain shadow-md"
          />
        ) : (
          <p className="text-sm text-muted">{item ? "이미지를 준비하는 중입니다." : "서류 카드를 선택하면 여기에 크게 표시됩니다."}</p>
        )}
      </div>

      {item?.image && (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <Info label="파일" value={item.name} />
          <Info label="원본" value={`${formatBytes(item.size)} · ${item.image.width}×${item.image.height}`} />
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

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ToolPlaceholder title="세로/가로 병합" phase="Phase 2-3">
          카드 덱 순서대로 여러 장을 한 장 또는 PDF 로 이어붙입니다. 순서는 카드를 끌어서 바꿀 수 있습니다.
        </ToolPlaceholder>
        <ToolPlaceholder title="민감정보 가리기 (Mask)" phase="Phase 2-4">
          주민등록번호·서명 위에 검은 박스나 모자이크를 칠합니다. 가리기 전 이미지는 어디에도 전송되지 않습니다.
        </ToolPlaceholder>
      </div>
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

function ToolPlaceholder({ title, phase, children }: { title: string; phase: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-4 text-sm">
      <p className="flex items-center justify-between font-semibold">
        {title}
        <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] font-medium text-muted">{phase}</span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{children}</p>
    </div>
  );
}
