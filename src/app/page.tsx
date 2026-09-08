import { Studio } from "@/components/studio/Studio";

/**
 * 스튜디오 레이아웃 (docs 디자인 시안):
 *   헤더(로고 + 프라이버시 배지) / 3열: 컨트롤 패널 · 편집 캔버스 · 병합·가리기 미리보기 / 푸터(파기 안내)
 * 헤더·푸터는 정적이라 서버 컴포넌트로 두고, 상호작용은 전부 <Studio /> 안에 있다.
 */
export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-5 py-6 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-navy">DocuFit</h1>
          <span aria-hidden="true" className="h-6 w-px bg-line" />
          <p className="text-lg font-medium text-ink">관공서 서류 최적화 스튜디오</p>
        </div>
        <p className="rounded-xl border border-pass/40 bg-pass-soft px-4 py-2 text-base font-bold text-pass">
          🔒 100% 브라우저 자체 처리 (데이터 안심)
        </p>
      </header>

      <main className="grid flex-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_minmax(0,1fr)]">
        <Studio />
      </main>

      <footer className="pb-2 text-center">
        <p className="text-base font-bold">데이터 파기 안내</p>
        <p className="mt-1 text-sm text-muted">
          🛡️ 모든 변환은 이 브라우저 안에서 끝나며 파일은 서버로 전송되지 않습니다. 탭을 닫으면 남는 것이 없습니다.
          서버 처리 옵션을 사용하는 경우에만 결과 파일이 저장되고, 그 파일은 1시간 뒤 자동 삭제됩니다.
        </p>
      </footer>
    </div>
  );
}
