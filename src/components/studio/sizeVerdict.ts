/**
 * 용량 판정 (신호등·상태 바 공용). 표시 로직이지만 React 와 무관한 순수 계산이라 컴포넌트 밖에 둔다.
 * "가장 큰 파일" 을 기준으로 삼는 이유: 관공서 제한은 파일 1개당이므로, 가장 큰 파일이 통과하면 전부 통과다.
 */

/** 판정에 올릴 파일 1개의 현재 크기 */
export interface SizeSample {
  id: string;
  name: string;
  bytes: number;
  /** result: 최적화 결과 크기, original: 아직 최적화 전 원본 크기 */
  kind: "original" | "result";
}

export type Verdict = "empty" | "pass" | "needs-optimize" | "over-limit" | "no-limit";

export interface SizeSummary {
  verdict: Verdict;
  /** 가장 큰 파일. 샘플이 없으면 null */
  worst: SizeSample | null;
  passCount: number;
  total: number;
}

export function summarizeSizes(limitBytes: number | null, samples: SizeSample[]): SizeSummary {
  const worst = samples.reduce<SizeSample | null>((acc, s) => (acc && acc.bytes >= s.bytes ? acc : s), null);
  const passCount = limitBytes === null ? samples.length : samples.filter((s) => s.bytes <= limitBytes).length;
  const verdict: Verdict = !worst
    ? "empty"
    : limitBytes === null
      ? "no-limit"
      : worst.bytes <= limitBytes
        ? "pass"
        : worst.kind === "result"
          ? "over-limit"
          : "needs-optimize";
  return { verdict, worst, passCount, total: samples.length };
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  empty: "대기 중",
  pass: "통과 (합격)",
  "needs-optimize": "초과 · 최적화 필요",
  "over-limit": "초과 · 목표를 늘리거나 JPG 선택",
  "no-limit": "기준 없음",
};

/** 판정별 색 클래스. text: 글자, dot: 상태 점·바, soft: 배지 배경 */
export const VERDICT_TONE: Record<Verdict, { text: string; dot: string; soft: string }> = {
  empty: { text: "text-muted", dot: "bg-subtle", soft: "bg-surface" },
  pass: { text: "text-pass", dot: "bg-pass", soft: "bg-pass-soft" },
  "needs-optimize": { text: "text-warn", dot: "bg-warn", soft: "bg-warn-soft" },
  "over-limit": { text: "text-fail", dot: "bg-fail", soft: "bg-fail-soft" },
  "no-limit": { text: "text-brand", dot: "bg-brand", soft: "bg-brand-soft" },
};
