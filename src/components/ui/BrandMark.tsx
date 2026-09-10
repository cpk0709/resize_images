import type { SVGProps } from "react";

/**
 * DocuFit 마크 (앱 바용 인라인 SVG). `src/app/icon.svg`(파비콘 원본)와 같은 도형·색이어야 한다.
 * 파랑 타일 + 접힌 모서리 서류 + 우하단 초록 합격 체크. 둘 중 하나를 바꾸면 다른 쪽도 같이 바꾼다.
 */
export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <rect width="64" height="64" rx="14" fill="#2563eb" />
      <path d="M20 12h15l11 11v29a3 3 0 0 1-3 3H20a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3z" fill="#ffffff" />
      <path d="M35 12v11h11z" fill="#bfd3fe" />
      <rect x="23" y="30" width="16" height="3" rx="1.5" fill="#bfd3fe" />
      <rect x="23" y="37" width="11" height="3" rx="1.5" fill="#bfd3fe" />
      <circle cx="47" cy="47" r="12" fill="#16a34a" stroke="#2563eb" strokeWidth="3" />
      <path d="M41 47l4 4 8-8" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
