import { MB, type OutputFormat } from "@/lib/constants";

/**
 * 제출처 프리셋. 관공서·기관별 첨부파일 제한을 한 번에 적용한다.
 *
 * ⚠ 수치의 출처
 * 기관 안내 페이지는 민원 종류마다 제한이 다르고 예고 없이 바뀐다. 여기 값은 2026-09 기준 공개 자료에서
 * 확인한 범위 안에서 **보수적으로**(더 작은 쪽으로) 잡은 참고값이다. `verified: false` 인 항목은 UI 에서
 * "참고 기준" 으로 표시하고, 제출 전 해당 사이트 안내를 확인하라고 안내한다.
 * 값을 바꾸면 `verifiedAt` 과 `sourceNote` 도 함께 갱신할 것.
 */
export interface SubmissionPreset {
  id: string;
  /** 버튼에 보이는 이름 */
  name: string;
  /** 기관 구분 (아이콘 선택용) */
  agency: "government" | "court" | "tax" | "custom";
  /** 파일 1개당 상한. custom 은 null (사용자 입력) */
  maxBytesPerFile: number | null;
  /** 이 기관이 받아주는 포맷. 우리가 낼 수 있는 것만 나열 */
  acceptedFormats: OutputFormat[];
  /** 공식 안내로 확인했는가 */
  verified: boolean;
  /** 출처·근거 메모 (UI 툴팁) */
  sourceNote: string;
}

export const SUBMISSION_PRESETS: readonly SubmissionPreset[] = [
  {
    id: "gov24",
    name: "정부24 전입신고",
    agency: "government",
    maxBytesPerFile: 10 * MB,
    acceptedFormats: ["jpeg", "png", "pdf"],
    verified: false,
    sourceNote: "정부24 민원별 첨부 제한은 10MB 안내가 가장 흔함 (일부 민원 15MB). 보수적으로 10MB 적용. 제출 전 해당 민원 안내 확인.",
  },
  {
    id: "court",
    name: "대법원 전자소송·등기",
    agency: "court",
    maxBytesPerFile: 10 * MB,
    acceptedFormats: ["pdf", "jpeg", "png"],
    verified: false,
    sourceNote: "전자소송 업무처리지침: 문서 파일 1개당 10MB (2025년 개정 후 20MB 안내도 있음). 보수적으로 10MB 적용.",
  },
  {
    id: "hometax",
    name: "홈택스",
    agency: "tax",
    maxBytesPerFile: 5 * MB,
    acceptedFormats: ["pdf", "jpeg", "png"],
    verified: false,
    sourceNote: "홈택스 첨부 가능 형식은 PDF·JPG·PNG·GIF·TIF·BMP. 용량 상한은 공개 자료에서 확인 못 해 5MB 로 보수 적용.",
  },
  {
    id: "custom",
    name: "직접 설정",
    agency: "custom",
    maxBytesPerFile: null,
    acceptedFormats: ["jpeg", "png", "pdf"],
    verified: true,
    sourceNote: "목표 용량을 직접 입력합니다.",
  },
];

export const DEFAULT_PRESET_ID = "gov24";

export function findPreset(id: string): SubmissionPreset | undefined {
  return SUBMISSION_PRESETS.find((p) => p.id === id);
}
