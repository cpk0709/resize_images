#!/usr/bin/env bash
# 새 이미지 태그로 DocuFit 컨테이너를 교체한다. GitHub Actions 가 SSH 로 호출한다 (/srv/docufit/release.sh).
#
#   release.sh <tag>      tag = 커밋 해시 (ghcr.io/cpk0709/docufit:<tag>)
#
# 절차: pull → .env 의 IMAGE_TAG 갱신 → compose up → 127.0.0.1:3100 헬스 체크(최대 45초)
#       → 실패하면 이전 태그로 되돌리고 실패 종료 → 성공하면 현재·이전 태그 외 이미지 정리
set -euo pipefail

APP_ROOT="/srv/docufit"
IMAGE="ghcr.io/cpk0709/docufit"
TAG="${1:?이미지 태그(커밋 해시)가 필요합니다}"
HEALTH_URL="http://127.0.0.1:3100/"

cd "$APP_ROOT"
log() { echo "[release] $*"; }

PREV="$(grep -s '^IMAGE_TAG=' .env | cut -d= -f2- || true)"
[[ "$PREV" == "latest" ]] && PREV=""

log "pull $IMAGE:$TAG"
docker pull "$IMAGE:$TAG"

set_tag() { echo "IMAGE_TAG=$1" >.env; }

healthy() {
  for _ in $(seq 1 45); do
    if curl -fsS -o /dev/null --max-time 2 "$HEALTH_URL"; then return 0; fi
    sleep 1
  done
  return 1
}

# 이 프로젝트(name: docufit)의 컨테이너만 만든다·바꾼다. 다른 컨테이너는 compose 가 인식하지도 않는다.
log "전환: $PREV → $TAG"
set_tag "$TAG"
docker compose up -d

if healthy; then
  log "정상: $(curl -sS -o /dev/null -w '%{http_code}' "$HEALTH_URL") $HEALTH_URL"
else
  log "헬스 체크 실패. 컨테이너 로그 마지막 50줄:"
  docker logs --tail 50 docufit || true
  if [[ -n "$PREV" ]]; then
    log "롤백: $PREV"
    set_tag "$PREV"
    docker compose up -d
    healthy && log "이전 이미지로 복구됨" || log "이전 이미지도 응답 없음 — 수동 확인 필요"
  fi
  exit 1
fi

# 현재·이전 태그만 남기고 **이 앱의 이미지만** 정리한다 (공유 서버라 디스크가 빠듯하다).
# `docker image prune`/`system prune` 은 다른 앱의 이미지까지 건드릴 수 있어 쓰지 않는다.
log "이미지 정리"
docker image ls "$IMAGE" --format '{{.Tag}}' | grep -vE "^(${TAG}|${PREV:-__none__}|latest|<none>)$" | while read -r old; do
  docker rmi "$IMAGE:$old" >/dev/null 2>&1 && log "삭제: $IMAGE:$old" || true
done
# 태그가 벗겨진(<none>) 이 이미지의 옛 레이어만 골라 지운다
docker image ls "$IMAGE" --format '{{.Tag}} {{.ID}}' | awk '$1=="<none>"{print $2}' | while read -r id; do
  docker rmi "$id" >/dev/null 2>&1 || true
done
log "완료 ($TAG)"
