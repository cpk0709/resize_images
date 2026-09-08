import "server-only";
import { getPrisma } from "@/lib/db";
import { deleteObjects } from "@/lib/storage/s3";
import { getEnv } from "@/lib/env";

/** 새 자산의 만료 시각. 항상 서버 시각 기준으로 계산한다. */
export function computeExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + getEnv().FILE_TTL_MINUTES * 60 * 1000);
}

export type CleanupResult = {
  scanned: number;
  deleted: number;
  failed: number;
  durationMs: number;
};

/**
 * 만료된 자산을 S3 와 DB 에서 삭제한다. 크론에서 주기적으로 호출.
 *
 * 순서가 중요하다:
 *   1) S3 객체 삭제 (실제 데이터)
 *   2) 성공한 것만 DB 하드 삭제
 *   3) 실패한 것은 남겨서 다음 실행에 재시도. DB 에는 없는데 S3 에는 남아있는 고아 객체를 만들지 않기 위함.
 *
 * 한 번에 최대 batchSize 건만 처리해 서버리스 실행시간 한도를 넘지 않게 한다.
 */
export async function cleanupExpiredAssets(batchSize = 500): Promise<CleanupResult> {
  const started = Date.now();
  const now = new Date();
  const prisma = getPrisma();

  const expired = await prisma.fileAsset.findMany({
    where: { expiresAt: { lte: now } },
    select: { id: true, s3Key: true },
    orderBy: { expiresAt: "asc" },
    take: batchSize,
  });

  let deleted = 0;
  let failed = 0;
  let errorMessage: string | null = null;

  if (expired.length > 0) {
    try {
      const failedKeys = new Set(await deleteObjects(expired.map((a) => a.s3Key)));
      const okIds = expired.filter((a) => !failedKeys.has(a.s3Key)).map((a) => a.id);
      failed = failedKeys.size;

      if (okIds.length > 0) {
        const res = await prisma.fileAsset.deleteMany({ where: { id: { in: okIds } } });
        deleted = res.count;
      }
    } catch (err) {
      failed = expired.length;
      errorMessage = err instanceof Error ? err.message : String(err);
    }
  }

  const durationMs = Date.now() - started;

  await prisma.cleanupRun.create({
    data: {
      scannedCount: expired.length,
      deletedCount: deleted,
      failedCount: failed,
      durationMs,
      error: errorMessage,
    },
  });

  return { scanned: expired.length, deleted, failed, durationMs };
}
