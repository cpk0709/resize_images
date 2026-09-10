"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * 공용 버튼. 버튼 색·크기는 이 파일에서만 정한다 (docs/design/studio-concept-v2.png 기준).
 *
 * - ToggleButton: 옵션 선택(프리셋·형식·출력 방식·에디터 도구). 선택 = 연한 파랑 배경 + 파랑 테두리 + 파랑 글자.
 * - ActionButton: 동작 실행.
 *     primary   기본 실행. 브랜드 파랑 단색 채움 (그라데이션 없음).
 *     secondary 보조 동작(편집 열기, 회전 등). 흰 배경 + 테두리.
 *     ghost     취소·되돌리기. 배경 없음, hover 때만 옅게.
 *     hero      **최종 추출(최적화 시작 / 다운로드) 전용.** primary 와 같은 색이되 더 크고 그림자가 있다. 화면에 하나만 둔다.
 * - IconButton: 아이콘 전용 정사각(줌 컨트롤 등).
 *
 * 색은 globals.css 토큰만 쓴다. 이 파일 밖에서 버튼 색 클래스를 직접 쓰지 않는 것이 목표.
 */

type NativeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

const FOCUS_RING = "outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-1";

interface ToggleButtonProps extends NativeButtonProps {
  active: boolean;
  /** 아이콘 등 라벨 앞 요소 */
  leadingIcon?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function ToggleButton({ active, leadingIcon, className = "", type = "button", children, ...rest }: ToggleButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={[
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        FOCUS_RING,
        active ? "border-brand bg-brand-soft font-semibold text-brand" : "border-line bg-panel font-medium text-ink hover:border-line-strong hover:bg-surface",
        className,
      ].join(" ")}
      {...rest}
    >
      {leadingIcon && <span aria-hidden="true">{leadingIcon}</span>}
      <span>{children}</span>
    </button>
  );
}

interface IconButtonProps extends NativeButtonProps {
  /** 스크린리더용 이름. 아이콘만 있는 버튼이므로 필수. */
  label: string;
  active?: boolean;
  /** md = 36px (기본, 모바일 탭 타깃). sm = 28px, 카드 안처럼 촘촘한 자리 전용. */
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
}

/**
 * 아이콘만 있는 정사각 버튼(줌 컨트롤, 카드의 다운로드 등).
 * `active` 는 토글 상태(예: 이동 모드)를 나타내며 ToggleButton 과 같은 색을 쓴다.
 */
export function IconButton({ label, active = false, size = "md", className = "", type = "button", children, ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={[
        "inline-flex shrink-0 items-center justify-center border transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        size === "md" ? "h-9 w-9 rounded-lg" : "h-7 w-7 rounded-md",
        FOCUS_RING,
        active ? "border-brand bg-brand-soft text-brand" : "border-line bg-panel text-ink hover:border-line-strong hover:bg-surface",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}

export type ActionVariant = "primary" | "secondary" | "ghost" | "hero";
export type ActionSize = "xs" | "sm" | "md" | "lg";

interface ActionButtonProps extends NativeButtonProps {
  variant?: ActionVariant;
  size?: ActionSize;
  /** 라벨 앞에 붙는 아이콘 */
  leadingIcon?: ReactNode;
  /** 라벨 뒤에 붙는 아이콘 */
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

const VARIANT_CLASS: Record<ActionVariant, string> = {
  primary: "bg-brand text-white shadow-sm hover:bg-brand-hover disabled:bg-line disabled:text-subtle disabled:shadow-none",
  secondary: "border border-line bg-panel text-ink hover:border-line-strong hover:bg-surface disabled:text-subtle",
  ghost: "bg-transparent text-muted hover:bg-surface hover:text-ink disabled:text-subtle",
  hero: "bg-brand text-white shadow-[0_6px_16px_rgba(37,99,235,0.28)] hover:bg-brand-hover hover:shadow-[0_8px_20px_rgba(37,99,235,0.34)] active:translate-y-px disabled:bg-line disabled:text-subtle disabled:shadow-none",
};

const SIZE_CLASS: Record<ActionSize, string> = {
  xs: "rounded-md px-2 py-1 text-xs font-medium",
  sm: "rounded-lg px-3 py-1.5 text-[13px] font-medium",
  md: "rounded-lg px-4 py-2 text-sm font-semibold",
  lg: "rounded-xl px-5 py-3 text-[15px] font-semibold",
};

export function ActionButton({
  variant = "primary",
  size = "md",
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  className = "",
  type = "button",
  children,
  ...rest
}: ActionButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all disabled:cursor-not-allowed",
        FOCUS_RING,
        fullWidth ? "w-full" : "",
        SIZE_CLASS[size],
        VARIANT_CLASS[variant],
        className,
      ].join(" ")}
      {...rest}
    >
      {leadingIcon && <span aria-hidden="true">{leadingIcon}</span>}
      <span>{children}</span>
      {trailingIcon && <span aria-hidden="true">{trailingIcon}</span>}
    </button>
  );
}
