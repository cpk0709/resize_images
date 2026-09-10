"use client";

import { ActionButton } from "@/components/ui/Button";
import { IconArrowRight, IconDownload, IconSpinner } from "@/components/ui/icons";

/**
 * 주요 동작(최적화 시작 / 취소 / 다운로드)의 상태. Studio 가 계산하고 ActionBar 가 그린다.
 */
export type PrimaryAction =
  | { kind: "disabled"; label: string }
  | { kind: "run"; label: string; onClick: () => void }
  | { kind: "cancel"; label: string; onClick: () => void }
  | { kind: "download"; label: string; onClick: () => void };

interface ActionBarProps {
  action: PrimaryAction;
  /** 버튼 위에 놓는 한 줄 요약. 무엇이 만들어지는지 마지막으로 확인하는 자리. */
  summary: string;
  /** 진행 중일 때 "2/3" 같은 표시. 병합 출력처럼 단계가 하나면 생략. */
  progress?: { done: number; total: number };
}

/**
 * 최종 동작 액션 바.
 * - 데스크톱(lg+): 오른쪽 패널 하단, 요약 한 줄 + 패널 폭을 채우는 버튼 (설정 → 서류 → 출력, 좌→우 흐름의 끝).
 * - 모바일: 화면 하단에 고정한다. 긴 세로 스크롤 어디서든 엄지로 바로 누를 수 있어야 한다.
 *   `main` 에 `pb-28` 여백이 있어 내용이 가려지지 않는다 (page.tsx).
 * 최종 추출 버튼은 `hero` 변형 하나만 쓴다. 화면에서 가장 눈에 띄는 요소여야 한다.
 */
export function ActionBar({ action, summary, progress }: ActionBarProps) {
  const running = action.kind === "cancel";
  const status = running && progress && progress.total > 1 ? `최적화 중 ${progress.done}/${progress.total} · ` : running ? "최적화 중 · " : "";

  return (
    <>
      {/* 데스크톱: 패널 안 */}
      <div className="mt-auto hidden flex-col gap-2.5 border-t border-line pt-4 lg:flex" data-testid="action-bar">
        <p className="text-xs text-muted" aria-live="polite">
          {status}
          {summary}
        </p>
        <PrimaryButton action={action} size="lg" fullWidth />
      </div>

      {/* 모바일: 화면 하단 고정 */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-panel/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(17,24,39,0.08)] backdrop-blur lg:hidden"
        data-testid="action-bar-mobile"
      >
        <p className="min-w-0 flex-1 overflow-hidden text-[11px] leading-snug text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]" aria-live="polite">
          {status}
          {summary}
        </p>
        <PrimaryButton action={action} size="md" />
      </div>
    </>
  );
}

function PrimaryButton({ action, size, fullWidth = false }: { action: PrimaryAction; size: "md" | "lg"; fullWidth?: boolean }) {
  const common = { size, fullWidth, className: "shrink-0" } as const;
  switch (action.kind) {
    case "disabled":
      return (
        <ActionButton variant="hero" {...common} disabled>
          {action.label}
        </ActionButton>
      );
    case "run":
      return (
        <ActionButton variant="hero" {...common} onClick={action.onClick} trailingIcon={<IconArrowRight className="h-4 w-4" />}>
          {action.label}
        </ActionButton>
      );
    case "cancel":
      return (
        <ActionButton variant="secondary" {...common} onClick={action.onClick} leadingIcon={<IconSpinner className="h-4 w-4" />}>
          {action.label}
        </ActionButton>
      );
    case "download":
      return (
        <ActionButton variant="hero" {...common} onClick={action.onClick} leadingIcon={<IconDownload className="h-4 w-4" />}>
          {action.label}
        </ActionButton>
      );
  }
}
