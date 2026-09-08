#!/usr/bin/env node
/**
 * Claude Code SessionStart 훅.
 * docs/HISTORY.md 의 "현재 상태 / 다음 할 일 / 미결 결정" 과 최근 타임라인, git 상태, 로컬 환경 준비 여부를
 * 모아 세션 컨텍스트로 주입한다. 어떤 PC 에서 pull 하더라도 같은 출발점을 갖게 하는 것이 목적.
 *
 * - 의존성 없음 (Node 내장 모듈만). Windows / macOS / Linux 공통.
 * - 실패해도 세션을 막지 않는다. 항상 exit 0.
 * - 출력은 hookSpecificOutput.additionalContext JSON (Claude Code 가 모델 컨텍스트에 추가).
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HISTORY_PATH = join(ROOT, "docs", "HISTORY.md");
const RECENT_ENTRIES = 3;

function sh(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

/** "## 제목" 으로 시작하는 섹션 본문을 돌려준다 (다음 "## " 전까지). */
function section(md, title) {
  const re = new RegExp(`^## ${title}[^\\n]*\\n([\\s\\S]*?)(?=^## |^---$|(?![\\s\\S]))`, "m");
  const m = md.match(re);
  return m ? m[1].trim() : "";
}

/** 타임라인 섹션에서 "### " 항목을 최신순으로 n개 */
function recentTimeline(md, n) {
  const body = section(md, "타임라인");
  if (!body) return "";
  const entries = body.split(/^(?=### )/m).map((s) => s.trim()).filter(Boolean);
  return entries.slice(0, n).join("\n\n");
}

const lines = [];
lines.push("# DocuFit 세션 컨텍스트 (scripts/session-context.mjs 자동 생성)");
lines.push("");

if (existsSync(HISTORY_PATH)) {
  const md = readFileSync(HISTORY_PATH, "utf8");
  const status = section(md, "현재 상태");
  const next = section(md, "다음 할 일");
  const open = section(md, "미결 결정");
  const timeline = recentTimeline(md, RECENT_ENTRIES);

  if (status) lines.push("## 현재 상태", status, "");
  if (next) lines.push("## 다음 할 일", next, "");
  if (open) lines.push("## 미결 결정", open, "");
  if (timeline) lines.push(`## 최근 타임라인 (${RECENT_ENTRIES}건)`, timeline, "");
} else {
  lines.push("⚠ docs/HISTORY.md 가 없습니다. CLAUDE.md 의 세션 프로토콜에 따라 먼저 생성하세요.", "");
}

// git 상태
const branch = sh("git rev-parse --abbrev-ref HEAD");
if (branch) {
  const log = sh("git log --oneline -5");
  const dirty = sh("git status --porcelain");
  const ahead = sh("git rev-list --count @{upstream}..HEAD 2>/dev/null");
  const behind = sh("git rev-list --count HEAD..@{upstream} 2>/dev/null");
  lines.push("## git");
  lines.push(`- 브랜치: ${branch}` + (ahead || behind ? ` (upstream 대비 +${ahead || 0} / -${behind || 0})` : " (upstream 없음)"));
  if (log) lines.push("- 최근 커밋:", ...log.split("\n").map((l) => `  - ${l}`));
  lines.push(dirty ? `- 커밋되지 않은 변경 ${dirty.split("\n").length}건:\n${dirty.split("\n").slice(0, 15).map((l) => `  ${l}`).join("\n")}` : "- 워킹 트리 깨끗함");
  lines.push("");
} else if (existsSync(join(ROOT, ".git"))) {
  lines.push("## git", "- 아직 커밋이 없다 (초기 상태). 첫 커밋 전이면 /wrap-up 절차의 커밋 단계부터 진행.", "");
}

// 로컬 환경 준비 여부 (새 PC 에서 빠뜨리기 쉬운 것들)
const checks = [
  ["node_modules", existsSync(join(ROOT, "node_modules")), "npm install"],
  [".env", existsSync(join(ROOT, ".env")), "cp .env.example .env 후 값 채우기"],
  ["Prisma Client 생성물", existsSync(join(ROOT, "src", "generated", "prisma", "client.ts")), "npx prisma generate"],
];
lines.push("## 로컬 환경");
for (const [name, ok, fix] of checks) {
  lines.push(ok ? `- ✅ ${name}` : `- ❌ ${name} 없음 → \`${fix}\``);
}
lines.push("");
lines.push("세션을 마칠 때는 `/wrap-up` 으로 HISTORY.md 를 갱신하고 커밋한다. (CLAUDE.md 세션 프로토콜)");

const context = lines.join("\n");

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context },
  }),
);
