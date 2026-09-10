import Link from "next/link";
import { IconShield } from "@/components/ui/icons";

/**
 * 페이지 하단 한 줄. 데이터 파기 약속과 안내 링크.
 * xl 앱 셸에서는 높이가 정확히 2.5rem(h-10) 이어야 한다 — page.tsx 가 그 값으로 본문 높이를 계산한다.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-panel">
      <div className="flex flex-col gap-1.5 px-4 py-3 text-[11px] text-muted sm:px-6 lg:h-10 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:py-0">
        <p className="flex min-w-0 items-start gap-1.5 leading-relaxed lg:items-center">
          <IconShield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pass lg:mt-0" />
          <span className="lg:truncate">
            모든 변환은 이 브라우저 안에서 끝나며 파일은 서버로 전송되지 않습니다. 탭을 닫으면 남는 것이 없습니다. 서버 처리 옵션을 쓰는
            경우에만 결과 파일이 저장되고 1시간 뒤 자동 삭제됩니다.
          </span>
        </p>
        <p className="shrink-0 whitespace-nowrap">
          {/* prefetch 끔: 정적 export(GitHub Pages)에서 세그먼트 프리페치 파일 경로가 어긋나 404 를 내기 때문. 클릭 이동은 정상. */}
          <Link href="/privacy" prefetch={false} className="font-medium text-ink hover:text-brand">
            개인정보 처리 안내
          </Link>
          <span className="mx-1.5 text-line-strong">·</span>
          <a href="https://github.com/cpk0709/resize_images" className="font-medium text-ink hover:text-brand" rel="noopener noreferrer" target="_blank">
            소스 코드
          </a>
        </p>
      </div>
    </footer>
  );
}
