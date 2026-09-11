#!/usr/bin/env bash
# DocuFit **전용 인스턴스**용 초기 설정 (Ubuntu 24.04 LTS, x86_64, systemd + 호스트 Node). 새 인스턴스에서 한 번만 root 로 실행한다.
# 이미 Docker·nginx 가 돌고 있는 공유 서버에는 이 스크립트가 아니라 deploy/docker/setup-shared.sh 를 쓴다 (현재 운영 서버가 그 경우).
#
#   sudo bash deploy/ec2/setup.sh --domain docufit.example.com --email you@example.com
#   sudo bash deploy/ec2/setup.sh                 # 도메인이 아직 없으면: HTTP 만, 나중에 certbot 만 따로
#
# 하는 일
#   1. 패키지: nginx, ufw, Node.js 22 (NodeSource)
#   2. 실행 계정 docufit(로그인 불가) 과 디렉터리 /srv/docufit/{releases,shared,bin}
#   3. /srv/docufit/shared/.env (없을 때만 생성, CRON_SECRET 자동 생성, root 600)
#   4. systemd 서비스 docufit (node server.js, 127.0.0.1:3100), cleanup 타이머(설치만, 활성화는 Phase 3 때)
#   5. nginx 리버스 프록시 (+ --domain 이 있으면 certbot 으로 HTTPS 와 HTTP→HTTPS 리다이렉트)
#   6. ufw: SSH, 80, 443 만 허용
#   7. 배포 계정(ubuntu)이 비밀번호 없이 `systemctl restart docufit` 만 할 수 있게 sudoers 추가
#
# 다시 실행해도 안전하다 (기존 .env 는 덮어쓰지 않는다).
set -euo pipefail

APP_USER="docufit"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"          # GitHub Actions 가 SSH 로 접속하는 계정
APP_ROOT="/srv/docufit"
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

echo "==> 1/7 패키지"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg nginx ufw
if ! command -v node >/dev/null || [[ "$(node -v | cut -d. -f1)" != "v22" ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo "node $(node -v), nginx $(nginx -v 2>&1 | cut -d/ -f2)"

echo "==> 2/7 계정·디렉터리"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --home "$APP_ROOT" --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_ROOT/releases" "$APP_ROOT/shared" "$APP_ROOT/bin"
# 릴리스 폴더는 배포 계정이 쓰고, 서비스 계정은 읽기만 한다.
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_ROOT/releases" "$APP_ROOT/bin"
chmod 755 "$APP_ROOT" "$APP_ROOT/releases" "$APP_ROOT/bin"

echo "==> 3/7 환경변수 파일"
ENV_FILE="$APP_ROOT/shared/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  cat >"$ENV_FILE" <<EOF
# DocuFit 서버 환경변수. systemd EnvironmentFile 이 읽는다 (root 만 읽을 수 있음).
# 현재 버전(브라우저 전용)은 아래 두 값만 있어도 동작한다. 서버 처리 옵션(Phase 3)을 켤 때 DB·S3 를 채운다.
NODE_ENV=production
CRON_SECRET=$(openssl rand -hex 32)
FILE_TTL_MINUTES=60
MAX_UPLOAD_MB=50
# DATABASE_URL=postgresql://user:password@host:5432/docufit?schema=public
# S3_BUCKET=
# S3_REGION=ap-northeast-2
# S3_ACCESS_KEY_ID=
# S3_SECRET_ACCESS_KEY=
EOF
  echo "생성: $ENV_FILE"
else
  echo "유지: $ENV_FILE (이미 있음)"
fi
chown root:root "$ENV_FILE"
chmod 600 "$ENV_FILE"

echo "==> 4/7 systemd"
install -m 644 "$HERE/docufit.service" /etc/systemd/system/docufit.service
install -m 644 "$HERE/docufit-cleanup.service" /etc/systemd/system/docufit-cleanup.service
install -m 644 "$HERE/docufit-cleanup.timer" /etc/systemd/system/docufit-cleanup.timer
install -m 755 "$HERE/release.sh" "$APP_ROOT/bin/release.sh"
chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_ROOT/bin/release.sh"
systemctl daemon-reload
systemctl enable docufit >/dev/null
# 첫 릴리스가 올라오기 전이면 서비스는 시작 실패 상태로 두어도 된다. 배포 스크립트가 restart 한다.

echo "==> 5/7 nginx"
SERVER_NAME="${DOMAIN:-_}"
install -m 644 "$HERE/../nginx/docufit-logformat.conf" /etc/nginx/conf.d/docufit-logformat.conf
sed "s/__SERVER_NAME__/$SERVER_NAME/g" "$HERE/../nginx/docufit.conf" >/etc/nginx/sites-available/docufit
ln -sfn /etc/nginx/sites-available/docufit /etc/nginx/sites-enabled/docufit
rm -f /etc/nginx/sites-enabled/default
# 서버 버전 숨김
grep -q "^\s*server_tokens off;" /etc/nginx/nginx.conf || sed -i 's/^\(\s*\)# server_tokens off;/\1server_tokens off;/' /etc/nginx/nginx.conf
nginx -t
systemctl enable nginx >/dev/null
systemctl reload nginx

echo "==> 6/7 방화벽"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null
ufw status | sed 's/^/   /'

echo "==> 7/7 배포 계정 sudo 규칙"
cat >/etc/sudoers.d/docufit-deploy <<EOF
$DEPLOY_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart docufit, /usr/bin/systemctl status docufit, /usr/bin/systemctl is-active docufit
EOF
chmod 440 /etc/sudoers.d/docufit-deploy
visudo -cf /etc/sudoers.d/docufit-deploy >/dev/null

if [[ -n "$DOMAIN" ]]; then
  if [[ -z "$EMAIL" ]]; then echo "--domain 을 쓰려면 --email 도 필요합니다 (Let's Encrypt 만료 알림용)." >&2; exit 1; fi
  echo "==> HTTPS (Let's Encrypt)"
  if ! command -v certbot >/dev/null; then
    snap install core >/dev/null 2>&1 || true
    snap refresh core >/dev/null 2>&1 || true
    snap install --classic certbot
    ln -sfn /snap/bin/certbot /usr/bin/certbot
  fi
  # DNS A 레코드가 이 서버의 탄력적 IP 를 가리키고 있어야 통과한다.
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect
  systemctl reload nginx
  echo "인증서 자동 갱신: $(systemctl list-timers | grep -c certbot) certbot 타이머 활성"
fi

cat <<EOF

완료. 다음 단계
  1. GitHub 저장소 Settings → Secrets and variables → Actions 에 등록:
       EC2_HOST     = 이 서버의 탄력적 IP 또는 도메인
       EC2_USER     = $DEPLOY_USER
       EC2_SSH_KEY  = 배포용 개인키 전체 내용 (아래 명령으로 만든 키의 개인키)
  2. 배포용 키 생성(로컬 PC):  ssh-keygen -t ed25519 -f docufit-deploy -C docufit-deploy -N ""
     공개키 등록(이 서버):     echo "<docufit-deploy.pub 내용>" >> /home/$DEPLOY_USER/.ssh/authorized_keys
  3. main 에 push 하면 .github/workflows/deploy-ec2.yml 이 빌드 → 업로드 → 재시작한다.
  4. 확인: curl -sI http${DOMAIN:+s}://${DOMAIN:-<IP>}/ | grep -i -E "cache-control|x-frame|server"
  ※ 이 변형(systemd)은 tar 릴리스를 받는다. 현재 .github/workflows/deploy-ec2.yml 은 Docker 변형(deploy/docker) 기준이므로
    전용 인스턴스로 갈 때는 워크플로의 "Release on server" 단계를 tar+scp+release.sh 로 바꿔야 한다 (HISTORY 세션 21 참고).
EOF
