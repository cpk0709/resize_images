"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * 공용 버튼. 컨트롤 패널·에디터·미리보기 패널에 흩어져 있던 같은 스타일을 한곳에 모았다.
 *
 * - ToggleButton: 옵션 선택(프리셋·형식·출력 방식·에디터 도구). 선택 상태는 검은 채움 대신
 *   연한 남색 배경 + 얇은 남색 링으로 표시한다 (aria-pressed 포함).
 * - ActionButton: 동작 실행.
 *     primary   보통의 실행(적용 등). 평평한 검정이 아니라 부드러운 남색 그라데이션.
 *     secondary 보조 동작(편집 열기, 회전 등). 흰 배경 + 테두리.
 *     ghost     취소·되돌리기. 테두리만.
 *     hero      **최종 추출(최적화 시작 / 다운로드) 전용.** 화면에 하나만 두며 다른 곳에 쓰지 않는다.
 *
 * 색은 globals.css 토큰만 쓴다. 이 파일 밖에서 버튼 색 클래스를 직접 쓰지 않는 것이 목표.
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
        "rounded-lg border px-3.5 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "border-transparent bg-accent-soft font-semibold text-navy ring-1 ring-inset ring-navy/35"
          : "border-line bg-panel font-medium text-ink hover:border-navy/30 hover:bg-surface",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}

export type ActionVariant = "primary" | "secondary" | "ghost" | "hero";
export type ActionSize = "sm" | "md" | "lg" | "xl";

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
  primary:
    "bg-gradient-to-b from-navy-hover to-navy text-white shadow-sm hover:from-navy hover:to-navy disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none",
  secondary: "border border-line bg-panel text-ink hover:border-navy/30 hover:bg-surface",
  ghost: "border border-line bg-panel text-ink hover:bg-surface",
  hero:
    "bg-gradient-to-r from-hero-start to-hero-end text-white shadow-lg shadow-hero-end/25 ring-1 ring-white/25 ring-inset hover:shadow-xl hover:shadow-hero-end/35 hover:brightness-[1.04] active:translate-y-px disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none disabled:ring-0",
};

const SIZE_CLASS: Record<ActionSize, string> = {
  sm: "rounded-lg px-3 py-1.5 text-sm font-medium",
  md: "rounded-lg px-4 py-2 text-sm font-semibold",
  lg: "rounded-xl px-5 py-3 text-base font-semibold",
  xl: "rounded-2xl px-7 py-4 text-lg font-bold tracking-tight",
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
        "inline-flex items-center justify-center gap-2.5 transition-all disabled:cursor-not-allowed",
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
