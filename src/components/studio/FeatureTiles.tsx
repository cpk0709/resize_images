import type { ReactNode } from "react";
import { IconCompress, IconEyeOff, IconSwap } from "@/components/ui/icons";

/**
 * 편집 캔버스 하단의 기능 안내 3칸. 이 도구가 무엇을 해 주는지 한눈에 알리는 정적 문구다.
 * 실제 동작과 다른 약속을 적지 않는다 (예: 여기 없는 기능을 적지 않기).
 */
export function FeatureTiles() {
  return (
    <ul className="grid grid-cols-1 gap-4 border-t border-line pt-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-line" aria-label="주요 기능">
      <Tile icon={<IconEyeOff className="h-5 w-5" />} title="민감정보 가리기·편집">
        주민번호 같은 부분을 단색 박스나 모자이크로 덮고, 크롭·회전으로 필요한 부분만 남깁니다.
      </Tile>
      <Tile icon={<IconCompress className="h-5 w-5" />} title="용량 최적화">
        기관 첨부 제한(예: 10MB)에 맞춰 품질을 최대한 지키면서 파일 크기를 줄입니다.
      </Tile>
      <Tile icon={<IconSwap className="h-5 w-5" />} title="포맷 변환·이어붙이기">
        아이폰 HEIC 를 JPG 로 바꾸고, 여러 장을 한 장으로 이어붙이거나 PDF 한 개로 묶습니다.
      </Tile>
    </ul>
  );
}

function Tile({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 sm:px-4 sm:first:pl-0 sm:last:pr-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink-strong">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{children}</p>
      </div>
    </li>
  );
}
