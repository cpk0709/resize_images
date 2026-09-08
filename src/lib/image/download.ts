import { OUTPUT_EXTENSION, type OutputFormat } from "@/lib/constants";
import { extensionOf } from "@/lib/image/detect";

/**
 * 브라우저 다운로드 유틸. 네트워크를 거치지 않고 Blob 을 그대로 저장한다.
 */

/** 결과 파일명의 접미사. 원본과 같은 폴더에 저장돼도 구분되고, ASCII 라 어떤 OS 에서도 안전하다. */
const OUTPUT_SUFFIX = "_docufit";

/**
 * 원본 파일명에서 확장자를 떼고 접미사 + 새 확장자를 붙인다.
 * 예) "임대차계약서 1.HEIC" + jpeg → "임대차계약서 1_docufit.jpg"
 */
export function buildOutputFilename(originalName: string, format: OutputFormat): string {
  const ext = extensionOf(originalName);
  const base = ext ? originalName.slice(0, -(ext.length + 1)) : originalName;
  const safeBase = base.replace(/[\\/:*?"<>|]+/g, "_").trim() || "image";
  return `${safeBase}${OUTPUT_SUFFIX}.${OUTPUT_EXTENSION[format]}`;
}

/**
 * `<a download>` 클릭으로 저장. object URL 은 클릭이 처리된 뒤 해제한다.
 * 즉시 revoke 하면 일부 브라우저(Safari)에서 다운로드가 시작되지 않는다.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
