#!/usr/bin/env node
/**
 * GitHub Pages 용 정적 빌드.
 *
 * 정적 export 는 Request 를 읽는 Route Handler 를 지원하지 않는다 (Next 문서 "Unsupported Features").
 * 현재 서버 라우트는 /api/cron/cleanup 하나이고 브라우저 전용인 Phase 2 기능은 이것을 쓰지 않으므로,
 * 빌드 동안만 src/app/api 를 옆으로 옮겨 두고 끝나면 반드시 되돌린다 (실패·중단 시에도).
 *
 * 결과: out/ (basePath /resize_images 적용). Jekyll 이 _next/ 를 무시하지 않도록 .nojekyll 을 넣는다.
 *
 * 사용: npm run build:pages
 */
import { spawnSync } from "node:child_process";
import { existsSync, renameSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const API_DIR = join(ROOT, "src", "app", "api");
const API_PARKED = join(ROOT, ".pages-excluded-api");
const OUT_DIR = join(ROOT, "out");

function restoreApi() {
  if (existsSync(API_PARKED) && !existsSync(API_DIR)) {
    renameSync(API_PARKED, API_DIR);
    console.log("[build-pages] src/app/api 복원");
  }
}

// 이전 실행이 비정상 종료해 남겨둔 것이 있으면 먼저 복원
restoreApi();

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    restoreApi();
    process.exit(1);
  });
}

let exitCode = 1;
try {
  if (existsSync(API_DIR)) {
    try {
      renameSync(API_DIR, API_PARKED);
    } catch (err) {
      if (err && err.code === "EPERM") {
        console.error("[build-pages] src/app/api 를 옮길 수 없습니다 (EPERM). Windows 에서는 `next dev` 가 디렉터리를 잡고 있으면 생깁니다. 개발 서버를 종료한 뒤 다시 실행하세요.");
        process.exit(1);
      }
      throw err;
    }
    console.log("[build-pages] 정적 export 에서 제외: src/app/api → .pages-excluded-api (빌드 후 복원)");
  }
  rmSync(OUT_DIR, { recursive: true, force: true });
  // `next dev` 가 만든 타입 산출물은 api 라우트를 참조해 타입 검사를 깨뜨린다. dev 를 다시 켜면 재생성되므로 지워도 된다.
  rmSync(join(ROOT, ".next", "dev", "types"), { recursive: true, force: true });

  const isWin = process.platform === "win32";
  const result = spawnSync(isWin ? "npx.cmd" : "npx", ["next", "build"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: isWin,
    env: { ...process.env, GITHUB_PAGES: "true" },
  });
  exitCode = result.status ?? 1;

  if (exitCode === 0) {
    writeFileSync(join(OUT_DIR, ".nojekyll"), "");
    console.log("[build-pages] 완료: out/ (.nojekyll 추가)");
  }
} finally {
  restoreApi();
}

process.exit(exitCode);
