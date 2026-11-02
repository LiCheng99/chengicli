#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# 一键安装：把 /api/music（音乐页接口）挂到你的云服务器上。
#   sudo bash deploy/install-music-api.sh [项目根目录]
#
# 做的事：
#   1. 检查 node（>=18）与项目文件是否齐全
#   2. 装 systemd 守护（崩溃自动重启、开机自启）
#   3. 把 /api/ 反代片段塞进 nginx 的 server 块（自动备份 + 自动回滚）
#   4. 探活验证
#
# 回滚：bash deploy/install-music-api.sh --uninstall
# ---------------------------------------------------------------------------
set -euo pipefail

PORT=8080
APP_PORT=8080
PROJECT_DIR="${1:-}"
SERVICE=music-api
UNIT=/etc/systemd/system/${SERVICE}.service
NGINX_DIR=/etc/nginx/conf.d
NGINX_SNIPPET=/etc/nginx/conf.d/${SERVICE}-api.conf

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
blue()  { printf '\033[36m%s\033[0m\n' "$*"; }

# ------------------------------ 卸载 ------------------------------
if [ "${1:-}" = "--uninstall" ]; then
  systemctl disable --now ${SERVICE} 2>/dev/null || true
  rm -f "$UNIT" "$NGINX_SNIPPET"
  systemctl daemon-reload
  nginx -t && systemctl reload nginx 2>/dev/null || true
  green "已卸载 ${SERVICE}（nginx 片段与 systemd 服务都已移除）"
  exit 0
fi

# --------------------------- 1. 环境检查 ---------------------------
blue "==> 检查环境"
command -v node >/dev/null || { red "没装 node，先装 Node >= 18"; exit 1; }
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 18 ]; then red "Node 版本太低（$(node -v)），需要 >= 18（用到全局 fetch）"; exit 1; fi
green "  node $(node -v)"

if [ -z "$PROJECT_DIR" ]; then
  PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi
PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"
[ -f "$PROJECT_DIR/api/music.js" ]    || { red "找不到 $PROJECT_DIR/api/music.js —— 服务器上要有 api/ 目录"; exit 1; }
[ -f "$PROJECT_DIR/tools/mpserve.cjs" ] || { red "找不到 $PROJECT_DIR/tools/mpserve.cjs"; exit 1; }
[ -d "$PROJECT_DIR/public" ]         || { red "找不到 $PROJECT_DIR/public —— 先跑 hexo generate"; exit 1; }
green "  项目目录 $PROJECT_DIR"

# --------------------------- 2. systemd ---------------------------
blue "==> 安装 systemd 守护"
NODE_BIN="$(command -v node)"
cat > "$UNIT" <<UNIT
[Unit]
Description=Blog Music & Chat API Server
After=network.target

[Service]
Type=simple
WorkingDirectory=${PROJECT_DIR}
ExecStart=${NODE_BIN} tools/mpserve.cjs ${APP_PORT} 127.0.0.1
Restart=always
RestartSec=3
Environment=NODE_ENV=production
# AI 聊天接口的来源白名单（默认只放行 lichengic.com）。
# 用 IP 访问站点时把你的域名/IP 加进来；填 * 表示全放行（不推荐）。
Environment=AI_PROXY_ORIGINS=${AI_PROXY_ORIGINS:-lichengic.com}
# 上游大模型 API Key（可选；不填只是聊天功能不可用）
# Environment=DEEPSEEK_API_KEY=sk-xxxxxxxx
StandardOutput=append:/var/log/music-api.log
StandardError=append:/var/log/music-api.log

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now ${SERVICE}
sleep 1
if systemctl is-active --quiet ${SERVICE}; then green "  ${SERVICE} 已启动"; else red "  启动失败，看 journalctl -u ${SERVICE} -n 30"; exit 1; fi

# --------------------------- 3. nginx ---------------------------
blue "==> 配置 nginx 反代"
command -v nginx >/dev/null || { red "没装 nginx，跳过（你用别的服务器的话手工配 location /api/）"; exit 0; }
if [ -f "$NGINX_SNIPPET" ]; then
  blue "  $NGINX_SNIPPET 已存在，跳过写入"
else
  # 找主配置里 include conf.d 的地方；有就把片段放进去并 reload
  MAIN_CONF=$(nginx -V 2>&1 | grep -oE -- '--conf-path=[^ ]+' | cut -d= -f2)
  MAIN_CONF=${MAIN_CONF:-/etc/nginx/nginx.conf}
  if grep -q "include .*conf.d" "$MAIN_CONF" 2>/dev/null; then
    cat > "$NGINX_SNIPPET" <<'CONF'
# 由 deploy/install-music-api.sh 生成：/api/ 反代到 Node 服务
location /api/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 10s;
    proxy_read_timeout    90s;
    proxy_buffering off;
}
CONF
    if nginx -t; then
      systemctl reload nginx && green "  nginx 已 reload"
    else
      red "  nginx 配置有误，已回滚 $NGINX_SNIPPET"; rm -f "$NGINX_SNIPPET"; exit 1
    fi
  else
    red "  nginx 主配置没 include conf.d —— 手工把下面这段加到 server 块里："
    cat <<'CONF'
location /api/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 90s;
}
CONF
  fi
fi

# --------------------------- 4. 探活 ---------------------------
blue "==> 探活"
sleep 1
if curl -sf "http://127.0.0.1:${APP_PORT}/api/health" >/dev/null; then
  green "  本机 /api/health 正常"
  printf '  本机 /api/music: '
  curl -s "http://127.0.0.1:${APP_PORT}/api/music?action=qq_pl&id=9676728276" | head -c 120; echo
else
  red "  /api/health 不通，看日志： journalctl -u ${SERVICE} -n 50"
  exit 1
fi

echo
green "搞定。外部访问：curl https://你的域名/api/health"
blue "  看日志： journalctl -u ${SERVICE} -f   或   tail -f /var/log/music-api.log"
