import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import { cleanupExpiredAssets } from "@/lib/retention";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 만료 파일 파기 크론 엔드포인트.
 * - Vercel Cron 은 `Authorization: Bearer <CRON_SECRET>` 헤더를 붙여 GET 으로 호출한다. (vercel.json 참고)
 * - 다른 스케줄러(GitHub Actions, systemd timer 등)에서도 같은 헤더로 호출하면 된다.
 * - 5~10분 간격 실행 권장. 그래야 실제 최대 보존 시간이 TTL + 실행 간격 안에 확실히 들어온다.
 */
export async function GET(request: NextRequest) {
  // 인증은 전체 env 검증(getEnv) 전에 수행한다. S3/DB 설정이 비어 있어도 미인증 요청은 항상 401 이어야 한다.
  if (!isAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    getEnv(); // 여기서 나머지 설정(DB, S3)을 검증. 실패하면 503 으로 "설정 문제"임을 알린다.
  } catch (err) {
    console.error("[cron/cleanup] 환경변수 오류:", err instanceof Error ? err.message : err);
    return Response.json({ error: "server not configured" }, { status: 503 });
  }

  try {
    const result = await cleanupExpiredAssets();
    return Response.json({ ok: result.failed === 0, ...result });
  } catch (err) {
    // 상세 메시지는 서버 로그에만 남긴다. 응답에 DB/S3 내부 정보를 노출하지 않는다.
    console.error("[cron/cleanup] 실행 실패:", err instanceof Error ? err.message : err);
    return Response.json({ error: "cleanup failed" }, { status: 500 });
  }
}

/**
 * CRON_SECRET 만 직접 읽어 비교한다. getEnv() 를 쓰지 않는 이유:
 * 다른 환경변수가 잘못돼 있어도 인증 실패는 401 로 일관되게 응답해야 하기 때문.
 */
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 16) return false; // 시크릿 미설정 = 아무도 통과 못 함

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token.length === 0 || token.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}
