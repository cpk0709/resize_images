"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * 공용 버튼. 컨트롤 패널·에디터·미리보기 패널에 흩어져 있던 같은 스타일을 한곳에 모았다.
 *
 * - ToggleButton: 옵션 선택(프리셋·형식·출력 방식·에디터 도구). `active` 로 눌린 상태를 표시하고 aria-pressed 를 붙인다.
 * - ActionButton: 동작 실행. primary(주요 동작) / secondary(보조) / ghost(취소·링크성).
 *
 * 색은 globals.css 토큰만 쓴다. 여기 외의 컴포넌트에서 버튼 색 클래스를 직접 쓰지 않는 것이 목표.
 */

type NativeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

interface ToggleButtonProps extends NativeButtonProps {
  active: boolean;
  className?: string;
  children: ReactNode;
}

export function ToggleButton({ active, className = "", type = "button", children, ...rest }: ToggleButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={[
        "rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        active ? "border-navy bg-navy text-white" : "border-line bg-panel hover:bg-surface",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}

export type ActionVariant = "primary" | "secondary" | "ghost";
export type ActionSize = "sm" | "md" | "lg";

interface ActionButtonProps extends NativeButtonProps {
  variant?: ActionVariant;
  size?: ActionSize;
  /** 라벨 뒤에 붙는 아이콘 */
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

const VARIANT_CLASS: Record<ActionVariant, string> = {
  primary: "bg-navy text-white hover:bg-navy-hover disabled:bg-line disabled:text-muted",
  secondary: "border border-line bg-panel text-ink hover:border-navy/40 hover:bg-surface",
  ghost: "border border-line bg-panel text-ink hover:bg-surface",
};

const SIZE_CLASS: Record<ActionSize, string> = {
  sm: "rounded-lg px-3 py-1.5 text-sm font-medium",
  md: "rounded-lg px-4 py-2 text-sm font-semibold",
  lg: "rounded-xl px-5 py-3.5 text-base font-semibold",
};

export function ActionButton({
  variant = "primary",
  size = "md",
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
        "inline-flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        fullWidth ? "w-full justify-between" : "",
        SIZE_CLASS[size],
        VARIANT_CLASS[variant],
        className,
      ].join(" ")}
      {...rest}
    >
      <span>{children}</span>
      {trailingIcon && <span aria-hidden="true">{trailingIcon}</span>}
    </button>
  );
}
