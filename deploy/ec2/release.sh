#!/usr/bin/env bash
# 새 릴리스를 풀고 서비스를 교체한다. GitHub Actions 가 SSH 로 호출한다 (setup.sh 가 /srv/docufit/bin/release.sh 로 설치).
#
#   release.sh <tarball> <sha>
#     tarball : .next/standalone 을 통째로 묶은 .tgz (package-standalone.mjs 결과)
#     sha     : 릴리스 폴더 이름으로 쓸 커밋 해시
#
# 절차: releases/<sha> 에 풀기 → current 심볼릭 링크 교체 → systemctl restart → 127.0.0.1:3100 헬스 체크(최대 30초)
#       → 실패하면 이전 릴리스로 링크를 되돌리고 다시 시작한 뒤 실패 종료 → 성공하면 오래된 릴리스 정리(최근 3개 유지)
set -euo pipefail

APP_ROOT="/srv/docufit"
TARBALL="${1:?tarball 경로가 필요합니다}"
SHA="${2:?커밋 해시가 필요합니다}"
RELEASES="$APP_ROOT/releases"
CURRENT="$APP_ROOT/current"
TARGET="$RELEASES/$SHA"
HEALTH_URL="http://127.0.0.1:3100/"

log() { echo "[release] $*"; }

PREVIOUS=""
if [[ -L "$CURRENT" ]]; then PREVIOUS="$(readlink -f "$CURRENT")"; fi

log "풀기: $TARBALL → $TARGET"
rm -rf "$TARGET"
mkdir -p "$TARGET"
tar -xzf "$TARBALL" -C "$TARGET"
rm -f "$TARBALL"
[[ -f "$TARGET/server.js" ]] || { log "server.js 가 없습니다. 잘못된 아카이브."; exit 1; }

switch_to() {
  ln -sfn "$1" "$CURRENT.tmp"
  mv -Tf "$CURRENT.tmp" "$CURRENT"   # 원자적 교체
  sudo /usr/bin/systemctl restart docufit
}

healthy() {
  for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null --max-time 2 "$HEALTH_URL"; then return 0; fi
    sleep 1
  done
  return 1
}

log "전환: current → $SHA"
switch_to "$TARGET"

if healthy; then
  log "정상: $(curl -sS -o /dev/null -w '%{http_code}' "$HEALTH_URL") $HEALTH_URL"
else
  log "헬스 체크 실패. 서비스 로그 마지막 30줄:"
  sudo /usr/bin/systemctl status docufit --no-pager -n 30 || true
  if [[ -n "$PREVIOUS" && -d "$PREVIOUS" ]]; then
    log "롤백: $PREVIOUS"
    switch_to "$PREVIOUS"
    healthy && log "이전 릴리스로 복구됨" || log "이전 릴리스도 응답 없음 — 수동 확인 필요"
  fi
  exit 1
fi

# 최근 3개만 남긴다 (현재 릴리스는 항상 유지)
log "정리"
ls -1dt "$RELEASES"/*/ 2>/dev/null | tail -n +4 | while read -r old; do
  [[ "$(readlink -f "$old")" == "$(readlink -f "$CURRENT")" ]] && continue
  rm -rf "$old" && log "삭제: $old"
done
log "완료 (release $(cut -c1-7 "$TARGET/RELEASE" | head -1))"
