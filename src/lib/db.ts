import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getEnv } from "@/lib/env";

/**
 * Prisma 7 는 드라이버 어댑터가 필수. PostgreSQL 은 @prisma/adapter-pg + pg 를 사용한다.
 *
 * - 모듈 import 시점이 아니라 첫 호출 시점에 생성한다 (lazy).
 *   `next build` 가 라우트 설정을 수집하며 모듈을 평가할 때 환경변수가 없어도 실패하지 않게 하기 위함.
 * - dev 환경 HMR 로 커넥션이 누수되지 않도록 globalThis 에 싱글턴을 보관한다.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const adapter = new PrismaPg({ connectionString: getEnv().DATABASE_URL });
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  globalForPrisma.prisma = client;
  return client;
}
