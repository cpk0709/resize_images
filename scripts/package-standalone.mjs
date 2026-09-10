#!/usr/bin/env node
/**
 * `next build`(output: "standalone") 결과를 그대로 서버에 올릴 수 있는 폴더로 완성한다.
 *
 * Next 는 standalone 에 `.next/static`(해시된 JS·CSS·글꼴)과 `public`(파비콘 등)을 넣지 않는다 — CDN 에 따로 올리는 구성을
 * 가정하기 때문. 우리는 한 서버에서 전부 서빙하므로 여기서 복사해 넣는다. 그 뒤 `RELEASE` 파일에 커밋 해시를 남긴다.
 *
 * 사용: npm run build:standalone   (= next build && node scripts/package-standalone.mjs)
 * 결과: .next/standalone/  → 이 폴더를 통째로 tar 로 묶어 EC2 에 올린다 (.github/workflows/deploy-ec2.yml).
 *       서버에서는 `node server.js` 로 실행한다 (PORT, HOSTNAME 환경변수).
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STANDALONE = join(ROOT, ".next", "standalone");

if (!existsSync(join(STANDALONE, "server.js"))) {
  console.error("[package-standalone] .next/standalone/server.js 가 없습니다. next.config.ts 의 output 이 \"standalone\" 인 상태로 `next build` 를 먼저 실행하세요.");
  process.exit(1);
}

function copy(from, to) {
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
  console.log(`[package-standalone] ${from.replace(ROOT, ".")} → ${to.replace(ROOT, ".")}`);
}

copy(join(ROOT, ".next", "static"), join(STANDALONE, ".next", "static"));
if (existsSync(join(ROOT, "public"))) copy(join(ROOT, "public"), join(STANDALONE, "public"));

// Next 는 빌드 머신의 .env* 를 standalone 에 복사해 넣는다. 로컬에서 빌드한 아카이브에 CRON_SECRET 같은 비밀이 실려 나가면 안 되고,
// 서버 환경변수는 systemd EnvironmentFile 이 유일한 출처여야 하므로 제거한다 (CLAUDE.md 절대 원칙 7).
for (const name of readdirSync(STANDALONE)) {
  if (name.startsWith(".env")) {
    rmSync(join(STANDALONE, name), { force: true });
    console.log(`[package-standalone] 제거: ${name} (비밀은 서버의 EnvironmentFile 만 사용)`);
  }
}

let sha = process.env.GITHUB_SHA ?? "";
if (!sha) {
  try {
    sha = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    sha = "unknown";
  }
}
writeFileSync(join(STANDALONE, "RELEASE"), `${sha}\n${new Date().toISOString()}\n`);
console.log(`[package-standalone] 완료: ${STANDALONE} (release ${sha.slice(0, 7)})`);
