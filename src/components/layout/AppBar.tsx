import Link from "next/link";
import { BrandMark } from "@/components/ui/BrandMark";
import { IconLock } from "@/components/ui/icons";

/**
 * 상단 앱 바. 모든 페이지에 공통(layout.tsx). 정적이므로 서버 컴포넌트.
 * 왼쪽 브랜드, 오른쪽 "브라우저에서만 처리" 배지 — 계정·알림이 없는 서비스라 그 자리에 프라이버시 약속을 둔다.
 */
export function AppBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-panel/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" prefetch={false} className="flex min-w-0 items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-brand-ring">
          <BrandMark className="h-7 w-7 shrink-0" />
          <span className="text-[17px] font-bold tracking-tight text-ink-strong">DocuFit</span>
          <span aria-hidden="true" className="hidden h-4 w-px bg-line-strong sm:block" />
          <span className="hidden truncate text-[13px] text-muted sm:block">관공서 서류 최적화 스튜디오</span>
        </Link>

        <p className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-pass/25 bg-pass-soft px-3 py-1 text-xs font-semibold text-pass">
          <IconLock className="h-3.5 w-3.5" />
          <span className="sm:hidden">100% 브라우저 처리</span>
          <span className="hidden sm:inline">100% 브라우저 자체 처리 · 서버 전송 없음 (데이터 안심)</span>
        </p>
      </div>
    </header>
  );
}
