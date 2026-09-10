import Link from "next/link";
import { Studio } from "@/components/studio/Studio";
import { IconLock, IconShield } from "@/components/ui/icons";

/**
 * 스튜디오 레이아웃.
 * - 데스크톱(lg+): 3열 — 컨트롤 패널(설정) · 편집 캔버스(서류) · 미리보기·출력. 좌→우 흐름.
 * - 모바일: 1열 — 서류 추가가 먼저(편집 캔버스), 설정(컨트롤 패널), 미리보기. 최종 버튼은 화면 하단 고정(ActionBar).
 *   순서는 Studio 가 각 패널에 붙이는 `order-*` 클래스로 바꾸고, 하단 고정 바가 내용을 가리지 않게 main 에 여백을 둔다.
 * 헤더·푸터는 정적이라 서버 컴포넌트로 두고, 상호작용은 전부 <Studio /> 안에 있다.
 */
export default function Home() {
  return (
    <div className="flex w-full flex-1 flex-col gap-4 px-4 py-4 sm:px-8 sm:py-5 lg:gap-5 2xl:px-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5 sm:gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">DocuFit</h1>
          <span aria-hidden="true" className="h-5 w-px bg-line sm:h-6" />
          <p className="text-base font-medium text-ink sm:text-lg">관공서 서류 최적화 스튜디오</p>
        </div>
        <p className="inline-flex items-center gap-1.5 rounded-xl border border-pass/40 bg-pass-soft px-3 py-1.5 text-sm font-bold text-pass sm:px-4 sm:py-2 sm:text-base">
          <IconLock className="h-4 w-4" />
          <span className="sm:hidden">100% 브라우저 처리</span>
          <span className="hidden sm:inline">100% 브라우저 자체 처리 (데이터 안심)</span>
        </p>
      </header>

      {/*
        모바일은 반드시 grid-cols-1. 열 정의가 없으면 암시적 auto 열이 자식의 max-content(가로 스크롤 칩 등)까지 늘어나
        레이아웃 뷰포트가 390px 을 넘고 폰에서 페이지가 축소되어 보인다 (HISTORY 세션 16). 패널에는 min-w-0 을 둔다.
      */}
      <main className="grid flex-1 grid-cols-1 gap-4 pb-28 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-5 lg:pb-0 xl:grid-cols-[340px_minmax(0,1fr)_minmax(0,1.15fr)]">
        <Studio />
      </main>

      <footer className="pb-2 text-center">
        <p className="text-base font-bold">데이터 파기 안내</p>
        <p className="mt-1 inline-flex items-start gap-1.5 text-left text-sm text-muted sm:text-center">
          <IconShield className="mt-0.5 h-4 w-4 shrink-0 text-pass" />
          <span>
            모든 변환은 이 브라우저 안에서 끝나며 파일은 서버로 전송되지 않습니다. 탭을 닫으면 남는 것이 없습니다. 서버 처리 옵션을
            사용하는 경우에만 결과 파일이 저장되고, 그 파일은 1시간 뒤 자동 삭제됩니다.
          </span>
        </p>
        <p className="mt-2 text-xs text-muted">
          <Link href="/privacy" className="underline hover:text-ink">
            개인정보 처리 안내
          </Link>
          {" · "}
          <a href="https://github.com/cpk0709/resize_images" className="underline hover:text-ink" rel="noopener noreferrer" target="_blank">
            소스 코드
          </a>
        </p>
      </footer>
    </div>
  );
}
