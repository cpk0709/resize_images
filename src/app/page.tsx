import { DEFAULT_TARGET_SIZE_MB, TARGET_SIZE_PRESETS_MB } from "@/lib/constants";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <section className="w-full max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">DocuFit</h1>
        <p className="mt-3 text-base text-neutral-600 dark:text-neutral-400">
          관공서 제출용 서류 이미지, 회원가입 없이 바로 최적화하세요.
        </p>

        <ul className="mt-8 grid gap-3 text-left text-sm sm:grid-cols-3">
          <li className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <strong className="block">HEIC → JPG / PDF</strong>
            아이폰 사진을 브라우저에서 바로 변환
          </li>
          <li className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <strong className="block">목표 용량 맞춤</strong>
            {TARGET_SIZE_PRESETS_MB.join(" / ")}MB 이하로 자동 압축 (기본 {DEFAULT_TARGET_SIZE_MB}MB)
          </li>
          <li className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <strong className="block">이어붙이기 & 가리기</strong>
            여러 장을 한 파일로, 주민번호는 검게 가리기
          </li>
        </ul>

        {/* Phase 2: 여기에 드래그 앤 드롭 업로더가 들어온다 */}
        <div className="mt-10 rounded-xl border-2 border-dashed border-neutral-300 p-12 text-neutral-500 dark:border-neutral-700">
          업로드 영역 (Phase 2 에서 구현)
        </div>

        <p className="mt-8 text-xs text-neutral-500">
          🔒 파일은 서버에 저장되더라도 생성 후 1시간이 지나면 자동으로 완전 삭제됩니다.
        </p>
      </section>
    </main>
  );
}
