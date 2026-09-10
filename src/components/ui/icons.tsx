import type { SVGProps } from "react";

/**
 * 단색 선 아이콘 (stroke 기반, currentColor). 이모지는 OS 마다 모양·색이 달라 UI 톤을 깨므로 쓰지 않는다.
 * 크기는 className(w-4 h-4 등)으로 정한다. 장식용이므로 기본 aria-hidden.
 */

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps): IconProps {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props,
  };
}

export function IconArrowRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4v11M7 10l5 5 5-5M4 19h16" />
    </svg>
  );
}

export function IconUpload(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 16V5M7 10l5-5 5 5M4 19h16" />
    </svg>
  );
}

/** 관공서(정부) */
export function IconBuilding(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 21h18M5 21V10M19 21V10M9 21v-6h6v6M12 3 3 8h18L12 3z" />
    </svg>
  );
}

/** 법원(천칭) */
export function IconScale(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3v18M5 21h14M4 7h16M7 7l-3 7a3 3 0 0 0 6 0L7 7zM17 7l-3 7a3 3 0 0 0 6 0l-3-7z" />
    </svg>
  );
}

/** 세무(영수증) */
export function IconReceipt(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3zM9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconSpinner(props: IconProps) {
  return (
    <svg {...base({ ...props, className: ["animate-spin", props.className ?? ""].join(" ") })}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}
