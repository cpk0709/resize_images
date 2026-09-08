import { z } from "zod";

/**
 * 서버 환경변수 스키마.
 * - 빌드 시점(prerender)에 throw 되지 않도록 lazy 하게 검증한다. (getEnv() 호출 시점에만 검증)
 * - 클라이언트 번들에 절대 포함되면 안 되는 값들이므로 "server-only" 모듈에서만 import 한다.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url(),

  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().min(1).default("ap-northeast-2"),
  /** AWS S3 이외(Cloudflare R2, MinIO 등)를 쓸 때만 지정 */
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  /** MinIO 등 path-style 전용 스토리지에서 true */
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  /** cleanup 크론 엔드포인트 보호용 시크릿 (Vercel Cron은 Authorization: Bearer 로 전달) */
  CRON_SECRET: z.string().min(16),

  /** 파일 보존 시간(분). PRD 요구: 60분. 절대 늘리지 말 것. */
  FILE_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(60),
  /** 서버 처리 경로에서 받는 요청 본문 상한(MB). 프론트에서도 동일 값으로 사전 차단. */
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(200).default(50),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`환경변수 설정이 올바르지 않습니다.\n${issues}\n.env.example 을 참고하세요.`);
  }
  cached = parsed.data;
  return cached;
}
