import { SiteFooter } from "@/components/layout/SiteFooter";
import { Studio } from "@/components/studio/Studio";

/**
 * 스튜디오 레이아웃 (앱 바는 layout.tsx).
 * - xl+: 앱 셸. 앱 바·푸터를 뺀 화면 높이에 3열(사이드바 · 편집 캔버스 · 미리보기)과 상태 바가 꽉 들어가고,
 *   각 패널이 안에서 스크롤된다. 페이지 자체는 스크롤되지 않는다 (docs/design/studio-concept-v2.png).
 * - lg: 2열 — 사이드바 · 캔버스, 미리보기는 두 열을 차지해 아래로. 페이지 스크롤.
 * - 모바일: 1열 — 서류 추가가 먼저(편집 캔버스), 설정, 미리보기. 최종 버튼은 화면 하단 고정(ActionBar).
 *   순서는 Studio 가 각 패널에 붙이는 `order-*` 클래스로 바꾸고, 하단 고정 바가 내용을 가리지 않게 아래 여백을 둔다.
 */
export default function Home() {
  return (
    <>
      {/*
        모바일은 반드시 grid-cols-1. 열 정의가 없으면 암시적 auto 열이 자식의 max-content(가로 스크롤 칩 등)까지 늘어나
        레이아웃 뷰포트가 390px 을 넘고 폰에서 페이지가 축소되어 보인다 (HISTORY 세션 16). 패널에는 min-w-0 을 둔다.
        xl 의 높이 = 100dvh − 앱 바 3.5rem − 푸터 2.5rem.
      */}
      {/* xl 에서 flex-none: 세로 flex 자식에 flex-1 이 남아 있으면 flex-basis 가 height 를 덮어써 셸 높이가 무시된다. */}
      <main className="grid w-full flex-1 grid-cols-1 gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[272px_minmax(0,1fr)] lg:gap-5 lg:py-5 xl:h-[calc(100dvh-6rem)] xl:flex-none xl:grid-cols-[272px_minmax(0,1fr)_minmax(400px,34%)] xl:grid-rows-[minmax(0,1fr)_auto]">
        <Studio />
      </main>
      <SiteFooter />
      {/* 모바일 하단 고정 액션 바 높이만큼 비워 푸터가 가려지지 않게 */}
      <div className="h-24 lg:hidden" aria-hidden="true" />
    </>
  );
}
