/**
 * 표시용 포맷 유틸. 클라이언트/서버 공용, 부수효과 없음.
 */

const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;

/**
 * 바이트 수를 사람이 읽는 문자열로. 1024 진법 (관공서 안내문의 "10MB" 도 관례상 MiB 로 해석되는 경우가 많다).
 * 예) 0 → "0 B", 1536 → "1.5 KB", 10485760 → "10 MB"
 */
export function formatBytes(bytes: number, fractionDigits = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes} B`;

  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  // 10 MB 처럼 딱 떨어지면 소수점을 붙이지 않는다.
  const rounded = Number(value.toFixed(fractionDigits));
  return `${rounded} ${BYTE_UNITS[unitIndex]}`;
}
