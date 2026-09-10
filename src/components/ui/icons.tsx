import type { SVGProps } from "react";

/**
 * 단색 선 아이콘 (stroke 기반, currentColor). 이모지·유니코드 기호(■ ▦ ↻ 등)는 OS 마다 모양·색이 달라 UI 톤을 깨므로 쓰지 않는다.
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

// ── 방향·동작 ──

export function IconArrowRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 6l6 6-6 6" />
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

export function IconPlus(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconMinus(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12l4.5 4.5L19 7" />
    </svg>
  );
}

export function IconCheckCircle(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </svg>
  );
}

/** 초기화·다시 */
export function IconRefresh(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" />
    </svg>
  );
}

/** 왼쪽(반시계) 90° 회전 */
export function IconRotateLeft(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12a8 8 0 1 0 2.34-5.66M4 4v5h5" />
    </svg>
  );
}

/** 오른쪽(시계) 90° 회전 */
export function IconRotateRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.8 12.2a1 1 0 0 0 1 .8h7.4a1 1 0 0 0 1-.8L17.5 7M10 11v5.5M14 11v5.5" />
    </svg>
  );
}

/** 화면에 맞춤 (네 모서리) */
export function IconFit(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />
    </svg>
  );
}

/** 이동(패닝) 손 모양 */
export function IconHand(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v7.5a5.5 5.5 0 0 1-5.5 5.5H11a5 5 0 0 1-4.2-2.3L4.4 14a1.5 1.5 0 0 1 2.5-1.6L8 14" />
    </svg>
  );
}

// ── 편집 도구 ──

/** 단색 박스 가리기 (채운 사각형) */
export function IconSquareFill(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** 모자이크 (격자) */
export function IconGrid(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M4 9.33h16M4 14.67h16M9.33 4v16M14.67 4v16" />
    </svg>
  );
}

export function IconCrop(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6.5 2.5v13a2 2 0 0 0 2 2h13M2.5 6.5h13a2 2 0 0 1 2 2v13" />
    </svg>
  );
}

/** 선택 도구 (커서) */
export function IconCursor(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5.5 4.5l6 15 2.3-6.7 6.7-2.3-15-6z" />
    </svg>
  );
}

/** 민감정보 가리기 (눈 가림) */
export function IconEyeOff(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10 10 0 0 1 12 5c5 0 9 4 10 7a12 12 0 0 1-2.5 3.6M6.6 6.6C4.4 8 2.9 10 2 12c1 3 5 7 10 7 1.4 0 2.7-.3 3.9-.8" />
    </svg>
  );
}

// ── 문서·파일 ──

export function IconDocument(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h4" />
    </svg>
  );
}

/** 이미지가 든 문서 (드롭존) */
export function IconFileImage(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5" />
      <path d="M8.5 18l2.7-3.4 2 2.4 1.5-1.8 2.3 2.8" />
      <circle cx="10" cy="11.5" r="1.25" />
    </svg>
  );
}

export function IconImage(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M20.5 15.5l-4.5-4.5-7.5 8" />
    </svg>
  );
}

/** 여러 장 (개별 파일) */
export function IconCopy(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

/** 세로 이어붙이기 */
export function IconStackVertical(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="6" y="3.5" width="12" height="7.5" rx="1.5" />
      <rect x="6" y="13" width="12" height="7.5" rx="1.5" />
    </svg>
  );
}

/** 가로 이어붙이기 */
export function IconStackHorizontal(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="6" width="7.5" height="12" rx="1.5" />
      <rect x="13" y="6" width="7.5" height="12" rx="1.5" />
    </svg>
  );
}

// ── 기능·상태 ──

/** 용량 최적화 (안쪽으로 모이는 화살표) */
export function IconCompress(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 14h6v6M20 10h-6V4M14 10l6.5-6.5M3.5 20.5L10 14" />
    </svg>
  );
}

/** 포맷 변환 */
export function IconSwap(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7.5h13l-3-3M20 16.5H7l3 3" />
    </svg>
  );
}

export function IconSliders(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4l9 16H3L12 4zM12 10v4M12 17h.01" />
    </svg>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
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

// ── 기관 ──

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
