import { ACCEPTED_INPUT_EXTENSIONS, ACCEPTED_INPUT_MIME } from "@/lib/constants";
import type { DetectedImageType } from "@/lib/image/types";

/**
 * 파일 형식 판별. 우선순위: 매직 바이트 > 브라우저가 준 MIME > 확장자.
 *
 * 매직 바이트를 먼저 보는 이유:
 * - Windows 는 HEIC 의 MIME 을 모르는 경우가 많아 `file.type` 이 "" 로 온다.
 * - 확장자는 사용자가 바꿀 수 있다 (".jpg" 로 저장된 PNG 가 흔하다).
 * - 판별이 틀리면 뒤 단계(디코딩/변환)가 이유 모를 실패를 낸다. 여기서 확정하는 게 디버깅 비용이 가장 낮다.
 */

const SNIFF_BYTES = 16;

/** ISO BMFF `ftyp` 박스의 major/compatible brand 중 HEIC/HEIF 계열 */
const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);

const EXTENSION_TO_MIME: Record<(typeof ACCEPTED_INPUT_EXTENSIONS)[number], string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
};

const ACCEPTED_MIME_SET: ReadonlySet<string> = new Set(ACCEPTED_INPUT_MIME);

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

/** 앞 16바이트로 판별. 모르면 null. */
export function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG") return "image/png";
  if (ascii(bytes, 0, 4) === "GIF8") return "image/gif";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  if (ascii(bytes, 0, 2) === "BM") return "image/bmp";
  if (ascii(bytes, 0, 4) === "II*\0" || ascii(bytes, 0, 4) === "MM\0*") return "image/tiff";
  if (ascii(bytes, 4, 4) === "ftyp" && HEIF_BRANDS.has(ascii(bytes, 8, 4).toLowerCase())) return "image/heic";

  return null;
}

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

function mimeFromExtension(fileName: string): string | null {
  const ext = extensionOf(fileName);
  return (ACCEPTED_INPUT_EXTENSIONS as readonly string[]).includes(ext)
    ? EXTENSION_TO_MIME[ext as (typeof ACCEPTED_INPUT_EXTENSIONS)[number]]
    : null;
}

export function isHeicMime(mime: string): boolean {
  return mime === "image/heic" || mime === "image/heif";
}

/**
 * 지원하는 이미지면 형식을 돌려주고, 아니면 null.
 * 파일 앞부분만 읽으므로 수십 MB 파일에도 비용이 거의 없다.
 */
export async function detectImageType(file: File): Promise<DetectedImageType | null> {
  const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());

  const mime =
    sniffMime(head) ??
    (ACCEPTED_MIME_SET.has(file.type) ? file.type : null) ??
    mimeFromExtension(file.name);

  if (!mime) return null;
  return { mime, isHeic: isHeicMime(mime) };
}
