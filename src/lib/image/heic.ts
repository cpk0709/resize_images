import { ImageProcessingError } from "@/lib/image/errors";

/**
 * HEIC/HEIF → JPEG 변환 (브라우저 전용).
 *
 * heic2any 는 libheif WASM 을 포함한 1.3MB 번들이고 모듈 평가 시 `window` 를 참조한다.
 * 따라서 정적 import 금지. HEIC 파일이 실제로 들어왔을 때만 이 함수 안에서 동적 import 한다.
 * 첫 호출에만 네트워크/파싱 비용이 들고, 이후는 모듈 캐시를 쓴다.
 */

/** 변환 품질. 이 단계는 "디코딩 가능한 형태로 바꾸는" 것이 목적이므로 높게 두고, 용량 최적화는 2-2 압축 단계가 맡는다. */
const HEIC_TO_JPEG_QUALITY = 0.92;

export async function convertHeicToJpeg(source: Blob): Promise<Blob> {
  let heic2any: (typeof import("heic2any"))["default"];
  try {
    heic2any = (await import("heic2any")).default;
  } catch (cause) {
    throw new ImageProcessingError(
      "HEIC_CONVERSION_FAILED",
      "HEIC 변환 모듈을 불러오지 못했습니다. 네트워크 상태를 확인하고 다시 시도해 주세요.",
      { cause },
    );
  }

  let result: Blob | Blob[];
  try {
    result = await heic2any({ blob: source, toType: "image/jpeg", quality: HEIC_TO_JPEG_QUALITY });
  } catch (cause) {
    throw new ImageProcessingError(
      "HEIC_CONVERSION_FAILED",
      "HEIC 파일을 변환하지 못했습니다. 파일이 손상되었거나 지원하지 않는 HEIC 변형일 수 있습니다.",
      { cause },
    );
  }

  // 연속 촬영(burst) HEIC 는 여러 장을 담을 수 있다. 서류 용도에서는 첫 장이 대표 이미지다.
  const first = Array.isArray(result) ? result[0] : result;
  if (!first || first.size === 0) {
    throw new ImageProcessingError("HEIC_CONVERSION_FAILED", "HEIC 파일에서 이미지를 찾지 못했습니다.");
  }
  return first;
}
