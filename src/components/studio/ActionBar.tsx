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
  /** 버튼 왼쪽에 놓는 한 줄 요약. 무엇이 만들어지는지 마지막으로 확인하는 자리. */
  summary: string;
  /** 진행 중일 때 "2/3" 같은 표시. 병합 출력처럼 단계가 하나면 생략. */
  progress?: { done: number; total: number };
}

/**
 * 최종 동작 액션 바.
 * - 데스크톱(lg+): 오른쭉 패널 하단에 놓인다 (설정 → 서류 → 출력, 좌→우 흐름의 끝).
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
      <div className="mt-auto hidden flex-wrap items-center justify-between gap-4 border-t border-line pt-5 lg:flex" data-testid="action-bar">
        <p className="min-w-0 flex-1 text-sm text-muted" aria-live="polite">
          {status}
          {summary}
        </p>
        <PrimaryButton action={action} size="xl" />
      </div>

      {/* 모바일: 화면 하단 고정 */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-panel/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(27,36,55,0.08)] backdrop-blur lg:hidden"
        data-testid="action-bar-mobile"
      >
        <p className="min-w-0 flex-1 text-xs leading-snug text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden" aria-live="polite">
          {status}
          {summary}
        </p>
        <PrimaryButton action={action} size="lg" />
      </div>
    </>
  );
}

/** hero 버튼 오른쪽의 원형 아이콘 자리. 버튼 안에서 아이콘이 따로 읽히게 한다. */
function IconBadge({ children }: { children: React.ReactNode }) {
  return <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 lg:h-8 lg:w-8">{children}</span>;
}

function PrimaryButton({ action, size }: { action: PrimaryAction; size: "lg" | "xl" }) {
  switch (action.kind) {
    case "disabled":
      return (
        <ActionButton variant="hero" size={size} disabled className="shrink-0">
          {action.label}
        </ActionButton>
      );
    case "run":
      return (
        <ActionButton
          variant="hero"
          size={size}
          className="shrink-0"
          onClick={action.onClick}
          trailingIcon={
            <IconBadge>
              <IconArrowRight className="h-4 w-4" />
            </IconBadge>
          }
        >
          {action.label}
        </ActionButton>
      );
    case "cancel":
      return (
        <ActionButton size={size === "xl" ? "lg" : "md"} variant="ghost" className="shrink-0" onClick={action.onClick} trailingIcon={<IconSpinner className="h-4 w-4" />}>
          {action.label}
        </ActionButton>
      );
    case "download":
      return (
        <ActionButton
          variant="hero"
          size={size}
          className="shrink-0"
          onClick={action.onClick}
          trailingIcon={
            <IconBadge>
              <IconDownload className="h-4 w-4" />
            </IconBadge>
          }
        >
          {action.label}
        </ActionButton>
      );
  }
}
