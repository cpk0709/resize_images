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
  if (!isAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await cleanupExpiredAssets();
  return Response.json({ ok: result.failed === 0, ...result });
}

function isAuthorized(request: NextRequest): boolean {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const secret = getEnv().CRON_SECRET;
  if (token.length === 0 || token.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}
