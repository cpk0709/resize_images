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
 * 작업 흐름의 끝(오른쪽 패널 하단)에 놓이는 액션 바.
 * 설정(왼쪽) → 서류(가운데) → 확인·출력(오른쪽) 흐름을 따라 버튼은 항상 오른쪽 끝에 둔다.
 * 최종 추출 버튼은 `hero` 변형 하나만 쓴다. 화면에서 가장 눈에 띄는 요소여야 한다.
 */
export function ActionBar({ action, summary, progress }: ActionBarProps) {
  const running = action.kind === "cancel";
  return (
    <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5" data-testid="action-bar">
      <p className="min-w-0 flex-1 text-sm text-muted" aria-live="polite">
        {running && progress && progress.total > 1 ? `최적화 중 ${progress.done}/${progress.total} · ` : running ? "최적화 중 · " : ""}
        {summary}
      </p>
      <PrimaryButton action={action} />
    </div>
  );
}

/** hero 버튼 오른쪽의 원형 아이콘 자리. 버튼 안에서 아이콘이 따로 읽히게 한다. */
function IconBadge({ children }: { children: React.ReactNode }) {
  return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">{children}</span>;
}

function PrimaryButton({ action }: { action: PrimaryAction }) {
  switch (action.kind) {
    case "disabled":
      return (
        <ActionButton variant="hero" size="xl" disabled>
          {action.label}
        </ActionButton>
      );
    case "run":
      return (
        <ActionButton
          variant="hero"
          size="xl"
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
        <ActionButton size="lg" variant="ghost" onClick={action.onClick} trailingIcon={<IconSpinner className="h-4 w-4" />}>
          {action.label}
        </ActionButton>
      );
    case "download":
      return (
        <ActionButton
          variant="hero"
          size="xl"
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
