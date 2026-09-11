#!/usr/bin/env bash
# DocuFit — 이미 Docker + 호스트 nginx 가 돌고 있는 **공유 서버**용 초기 설정. root 권한으로 실행한다.
#
#   sudo bash deploy/docker/setup-shared.sh                                   # 도메인 전: 8080 포트로 HTTP 공개 (임시)
#   sudo bash deploy/docker/setup-shared.sh --domain docufit.kr --email me@x  # 도메인 A 레코드 연결 뒤: 80/443 가상호스트 + certbot
#
# 이 스크립트는 기존 서비스를 건드리지 않는다: nginx 를 설치·재설정하지 않고 사이트 파일 하나만 추가하며, ufw 규칙은
# 8080(임시 모드)만 추가/제거한다. 전용 인스턴스용(systemd·nginx 설치)은 deploy/ec2/setup.sh.
#
# 전제: nginx 가 active, docker + docker compose 사용 가능, 배포 계정(ubuntu)이 docker 그룹에 속함.
# 만드는 것: /srv/docufit/{compose.yml,app.env,.env,release.sh}, /etc/nginx/sites-enabled/docufit
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-ubuntu}"   # GitHub Actions 가 SSH 로 접속하는 계정 (docker 그룹 필수)
APP_ROOT="/srv/docufit"
PORT_MODE_PORT=8080
DOMAIN=""
EMAIL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --email) EMAIL="$2"; shift 2 ;;
    *) echo "알 수 없는 옵션: $1" >&2; exit 1 ;;
  esac
done
if [[ $EUID -ne 0 ]]; then echo "root 로 실행하세요: sudo bash $0 ..." >&2; exit 1; fi
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> 1/4 전제 확인"
systemctl is-active --quiet nginx || { echo "호스트 nginx 가 실행 중이어야 합니다." >&2; exit 1; }
command -v docker >/dev/null || { echo "docker 가 없습니다." >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "docker compose 플러그인이 없습니다." >&2; exit 1; }
id -nG "$DEPLOY_USER" | grep -qw docker || { echo "$DEPLOY_USER 가 docker 그룹에 없습니다: sudo usermod -aG docker $DEPLOY_USER 후 재로그인" >&2; exit 1; }
echo "   nginx active, $(docker --version), $(docker compose version --short)"

echo "==> 2/4 디렉터리·환경변수"
mkdir -p "$APP_ROOT"
install -m 644 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$HERE/compose.yml" "$APP_ROOT/compose.yml"
install -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$HERE/release.sh" "$APP_ROOT/release.sh"
if [[ ! -f "$APP_ROOT/app.env" ]]; then
  cat >"$APP_ROOT/app.env" <<EOF
# DocuFit 컨테이너 환경변수 (compose env_file). 현재 버전(브라우저 전용)은 아래만 있어도 동작한다.
# 서버 처리 옵션(Phase 3)을 켤 때 DATABASE_URL·S3_* 를 채운다.
CRON_SECRET=$(openssl rand -hex 32)
FILE_TTL_MINUTES=60
MAX_UPLOAD_MB=50
# DATABASE_URL=postgresql://user:password@host:5432/docufit?schema=public
# S3_BUCKET=
# S3_REGION=ap-northeast-2
# S3_ACCESS_KEY_ID=
# S3_SECRET_ACCESS_KEY=
EOF
  echo "   생성: $APP_ROOT/app.env"
else
  echo "   유지: $APP_ROOT/app.env"
fi
chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_ROOT/app.env"
chmod 600 "$APP_ROOT/app.env"
# 이미지 태그 파일 (compose 변수). 첫 배포 전에는 latest.
[[ -f "$APP_ROOT/.env" ]] || { echo "IMAGE_TAG=latest" >"$APP_ROOT/.env"; chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_ROOT/.env"; }
chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_ROOT"

echo "==> 3/4 nginx 사이트"
# 로그 형식 선언(http 컨텍스트). 기존 사이트에는 영향 없음 — 이름 붙은 형식을 하나 추가할 뿐이다.
install -m 644 "$HERE/../nginx/docufit-logformat.conf" /etc/nginx/conf.d/docufit-logformat.conf
if [[ -n "$DOMAIN" ]]; then
  sed "s/__SERVER_NAME__/$DOMAIN/g" "$HERE/../nginx/docufit.conf" >/etc/nginx/sites-available/docufit
  # 임시 8080 모드에서 넘어왔다면 ufw 규칙을 닫는다
  ufw status | grep -qE "^${PORT_MODE_PORT}/tcp" && ufw --force delete allow ${PORT_MODE_PORT}/tcp >/dev/null && echo "   ufw: ${PORT_MODE_PORT} 닫음"
else
  sed "s/__PORT__/$PORT_MODE_PORT/g" "$HERE/../nginx/docufit-port.conf" >/etc/nginx/sites-available/docufit
  if systemctl is-active --quiet ufw; then
    ufw allow ${PORT_MODE_PORT}/tcp >/dev/null && echo "   ufw: ${PORT_MODE_PORT} 허용 (임시. 도메인 연결 후 --domain 으로 다시 실행하면 닫힌다)"
  fi
fi
ln -sfn /etc/nginx/sites-available/docufit /etc/nginx/sites-enabled/docufit
nginx -t
systemctl reload nginx
echo "   설치: /etc/nginx/sites-enabled/docufit"

if [[ -n "$DOMAIN" ]]; then
  if [[ -z "$EMAIL" ]]; then echo "--domain 을 쓰려면 --email 도 필요합니다." >&2; exit 1; fi
  echo "==> 4/4 HTTPS (Let's Encrypt)"
  if ! command -v certbot >/dev/null; then
    snap install core >/dev/null 2>&1 || true
    snap install --classic certbot
    ln -sfn /snap/bin/certbot /usr/bin/certbot
  fi
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect
  systemctl reload nginx
else
  echo "==> 4/4 HTTPS 는 도메인 연결 뒤 (--domain --email)"
fi

cat <<EOF

완료. 다음 단계
  1. GitHub 저장소 Settings → Secrets and variables → Actions
       Secrets   EC2_HOST=$(curl -fsS --max-time 3 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo '<서버 IP>')  EC2_USER=$DEPLOY_USER  EC2_SSH_KEY=<배포용 개인키>
       Variables EC2_DEPLOY_ENABLED=true  DEPLOY_URL=${DOMAIN:+https://$DOMAIN/}${DOMAIN:-http://<서버 IP>:$PORT_MODE_PORT/}
  2. 배포용 키: 로컬에서 ssh-keygen -t ed25519 -f docufit-deploy -N "" → 공개키를 /home/$DEPLOY_USER/.ssh/authorized_keys 에 추가
  3. 첫 배포 뒤 GHCR 패키지(ghcr.io/cpk0709/docufit)를 Public 으로 바꾸거나, 이 서버에서 docker login ghcr.io 를 해 둔다.
  4. 보안 그룹 인바운드: ${DOMAIN:+80, 443}${DOMAIN:-$PORT_MODE_PORT (임시)} 허용
EOF
