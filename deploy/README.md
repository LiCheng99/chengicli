# 云服务器部署指南（API 服务）

> 适用于：hexo 静态站 + 自己的云服务器（阿里云/腾讯云等），**不用 Vercel**。

---

## 一、为什么线上音乐页显示「HTTP 404」

音乐页要请求 `/api/music?action=qq_pl&id=...` 拿歌单。这个接口是**服务端代码**
（`api/music.js`），不是静态文件：

- `hexo generate` 只会把 `source/` 编译成 `public/`，`api/` 目录**不会**变成可访问的接口；
- 浏览器直连 `music.163.com` / `u.y.qq.com` 一定被 CORS 挡下，网易云还要服务端加密。

所以服务器上除了 nginx 托管静态文件，**还需要一个 Node 进程来跑 `/api/*`**。
只上传 `public/` 是不够的。

**快速自检**（在浏览器打开）：

```
https://你的域名/api/health
```

- 返回 `{"ok":true,...}` → 接口服务已在跑；
- 返回 404 或首页 HTML → 就是本文要解决的问题。

---

## 二、要准备的文件

服务器的项目目录（用 git 部署的话就是仓库根目录）里必须有：

| 路径 | 说明 |
|---|---|
| `api/music.js` | 音乐接口（必需） |
| `api/chat/completions.js` | AI 聊天接口（可选） |
| `tools/mpserve.cjs` | 通用站点服务器（必需） |
| `public/` | hexo 构建产物（nginx 的 root 指向它） |

> `public/` 由 nginx 直接托管，**不要求** Node 服务也托管它；
> 但 `tools/mpserve.cjs` 本身也带静态托管能力，两种用法都行。

---

## 三、一键安装（推荐）

在**项目根目录**（也就是上面那张表的目录）执行：

```bash
sudo bash deploy/install-music-api.sh
```

脚本会依次做：

1. 检查 Node ≥ 18（`api/music.js` 用了全局 fetch）、检查 `api/` `tools/` `public/` 是否齐全；
2. 写 `/etc/systemd/system/music-api.service` 并 `enable --now`（崩溃自动重启 + 开机自启）；
3. 把 nginx 的 `location /api/` 反代片段写进 `/etc/nginx/conf.d/music-api-api.conf`，
   `nginx -t` 通过后 reload（**不通过会自动删除该文件回滚**，不会把 nginx 搞挂）；
4. 探活 `curl http://127.0.0.1:8080/api/health` 并打印 `/api/music` 的返回。

装完验证：

```bash
curl https://你的域名/api/health
curl "https://你的域名/api/music?action=qq_pl&id=9676728276" | head -c 200
```

第二条应该能看到 `"tracks":[...]`（47 首）。

### 脚本参数 / 环境变量

```bash
# 项目目录不在当前位置时
sudo bash deploy/install-music-api.sh /var/www/blog

# 聊天接口的来源白名单（默认只放行 lichengic.com；用 IP 访问站点时必须加）
sudo AI_PROXY_ORIGINS=lichengic.com,47.102.186.147 bash deploy/install-music-api.sh

# 卸载
sudo bash deploy/install-music-api.sh --uninstall
```

---

## 三·补、宝塔面板（BT）用户专用

> 宝塔的 nginx 是面板托管的：主配置只 `include /www/server/panel/vhost/nginx/*.conf`，
> **不 include `/etc/nginx/conf.d/`**，所以 `install-music-api.sh` 里那步写 conf.d 在宝塔上**不会生效**
> （脚本检测到没 include 会打印片段后退出，不会把 nginx 搞挂）。宝塔请按下面走，全程点面板。

### 1. 确认上传的不是只有 `public/`

宝塔「文件」里进到站点目录，必须能看到三项：

```
你的站点目录/
├── api/music.js
├── tools/mpserve.cjs
└── public/            ← 宝塔「网站」里设置的「运行目录」就是它
```

只传 `public/` = 只有静态文件 = `/api/music` 永远 404（就是音乐页那个「HTTP 404」）。

### 2. 装 Node（≥18）

「软件商店 → Node.js版本管理器」装 **18 / 20 / 22** 任一版本。
`api/music.js` 用了全局 `fetch`，**Node 16 会直接报 `fetch is not defined`**。
装完先确认路径，宝塔一般在：

```bash
/www/server/nodejs/v22.x.x/bin/node -v      # 应输出 v22.x
```

### 3. 起 Node 服务（二选一）

**A. 用宝塔「Node项目」（最省事）**

网站 → Node项目 → 添加 Node 项目：

| 项目 | 填什么 |
|---|---|
| 项目目录 | 你的站点目录（含 `api/` `tools/` `public/` 那一层） |
| 启动选项 / 启动命令 | `tools/mpserve.cjs 8080 127.0.0.1` |
| Node 版本 | 18+ |
| 端口 | `8080`（**只给本机用**，不要放行到公网） |

**B. 用 PM2 / systemd 常驻**

```bash
cd /www/wwwroot/你的站点目录
/www/server/nodejs/v22.x.x/bin/node tools/mpserve.cjs 8080 127.0.0.1
# 先手动跑通，再用宝塔「PM2管理器」添加同样的启动命令做守护
```

跑起来后在本机验一下（**服务器终端里**执行）：

```bash
curl http://127.0.0.1:8080/api/health
# {"ok":true,"ts":...,"node":"v22.x.x"}
curl "http://127.0.0.1:8080/api/music?action=qq_pl&id=9676728276" | head -c 120
# {"ok":true,"action":"qq_pl",...,"count":47,"tracks":[...]}
```

这两条不通，后面配反代也白搭——先解决 Node 服务本身（多半是 Node 版本太低 / 目录不对）。

### 4. 面板加反向代理

网站 → 你的站点 → 设置 → **反向代理** → 添加反向代理：

| 项目 | 填什么 |
|---|---|
| 代理名称 | `api`（随意） |
| 目标 URL | `http://127.0.0.1:8080` |
| 发送域名 | `$host` |
| 代理目录 | `/api` |

保存后宝塔会自动写进该站点的 vhost 并 reload。

> 宝塔把反代**单独存一个文件**：`/www/server/panel/vhost/nginx/proxy/<站点>/<名称>.conf`，
> 站点主 conf 里只有一行 `include .../proxy/<站点>/*.conf;`。所以排查时
> **`grep proxy_pass /www/server/panel/vhost/nginx/*.conf` 是什么都搜不到的**（要加 `-r` 或直接查 `proxy/` 子目录）。
> 同一路径下已有 `/api` 时再点「添加」会报「网站配置文件已经存在路径【/api】的反向代理」——去列表里**编辑已有的那条**，
> 或先删再建，不要新增。

> ⚠️ **目标 URL 末尾不要带 `/`**。带斜杠 nginx 会把 `/api/music` 截成 `/music` 转发 → 依旧 404。
> ⚠️ 代理目录填 `/api`（不要填 `/api/` 也行，两者等价；但别只填 `/`，那会把整站都转给 Node）。

### 5. 验证

浏览器直接开：

```
https://你的域名/api/health
```

看到 `{"ok":true,...}` 就成了，音乐页刷新（Ctrl+F5）即可出歌单。

### 5·补、没有域名、直接用 IP 访问（备案还没下来）

可以正常用，跟域名、备案都没有关系——前端请求的是**同源相对路径** `/api/music`，
浏览器只关心「这个路径能不能拿到 JSON」，不关心它绑的是域名还是 IP。三点注意：

1. **验证地址换成 IP**：`https://47.102.186.147/api/health`，返回 `{"ok":true,...}` 即可。
2. **证书只在 IP 下有效**：宝塔给纯 IP 签的是 Let's Encrypt 的 **IP 证书**（6 天有效期、自动续期，
   SAN 里写的就是 `IP Address:你的IP`）。备案下来改绑域名后必须**重新申请该域名的证书**，
   否则浏览器会报「证书与此网站域名不符」。
3. **IP 访问跳到了别的站点**：多半是「网站 → 默认站点」被指到了某个域名站，或该站只绑了域名没加 IP。
   把 IP 加进站点绑定的「域名列表」里即可（宝塔允许一个站点同时绑域名和 IP）。

> 反代配好后 `/api/*` 还是 404、返回的却是**博客自己的 404 页面**（`text/html` + 你的皮肤），
> 说明 nginx 根本没把 `/api` 转出去 —— 不是 Node 报错，是反代没生效（看 §4 的「末尾不要带 `/`」）。

### 3·补、用 systemd 常驻（不依赖宝塔插件，最稳）

宝塔「Node项目」有时会强制要求 `package.json`、还会给项目自动建站点（把整站都反代到 Node，
和「只反代 `/api`」冲突）。不想折腾插件就用 systemd，一次贴完，开机自启 + 崩溃自动重启：

```bash
cat > /etc/systemd/system/mpserve.service <<'EOF'
[Unit]
Description=licheng site API server
After=network.target

[Service]
Type=simple
WorkingDirectory=/www/wwwroot/你的站点目录
ExecStart=/www/server/nodejs/v24.21.0/bin/node tools/mpserve.cjs 8090 127.0.0.1
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now mpserve
systemctl status mpserve --no-pager     # active (running) 即可
```

以后改完 `api/` 代码：`systemctl restart mpserve`；看日志：`journalctl -u mpserve -n 50 --no-pager`。
`WorkingDirectory` 必须是**含 `api/` `tools/` `public/` 的那一层**（`ROOT` 是按 `tools/` 的上级算出来的）。

### 6. 以后更新

| 改了什么 | 要做什么 |
|---|---|
| `source/` 里的前端/样式/文章 | `hexo generate` → 上传 `public/` |
| `api/music.js`、`tools/mpserve.cjs` | 上传这两个文件 → **重启 Node 服务**（`api/` 是运行时 require 的，不重启不生效） |

---

## 四、手工配置（不想用脚本时）

### 1. 跑 Node 服务

```bash
cd /var/www/blog
node tools/mpserve.cjs 8080 127.0.0.1
```

先用这个方式验证能跑通，再配守护。守护推荐 systemd，把
`deploy/music-api.service` 拷到 `/etc/systemd/system/`，改掉里面的
`WorkingDirectory` 与 `ExecStart`（用 `which node` 查 node 的真实路径），然后：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now music-api
```

### 2. nginx 反代

在**站点 server 块**里加（与 `root` 同级）：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8080;   # 末尾不要加斜杠！
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 10s;
    proxy_read_timeout    90s;          # 网易云/QQ 音乐接口有时慢
    proxy_buffering off;
}
```

然后：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

> ⚠️ `proxy_pass` 末尾**不能带斜杠**。带斜杠时 nginx 会把 `/api/music` 截成
> `/music` 转发，接口就 404 了。

---

## 五、常见问题

### 1. 接口 404 但服务在跑

多半是 nginx 没配 `location /api/`。先看 nginx 的错误日志：

```bash
sudo tail -30 /var/log/nginx/error.log
```

### 2. 聊天接口返回 403 / 「来源不被允许」

`api/chat/completions.js` 有来源白名单，默认只放行 `lichengic.com`。
用 IP 访问站点时，在 systemd 里加：

```ini
Environment=AI_PROXY_ORIGINS=lichengic.com,你的IP或域名
```

改完 `sudo systemctl restart music-api`。

（音乐接口 `api/music.js` **没有**这层校验，不受影响。）

### 3. 音乐接口返回 `upstream connect failed`

服务器出网被限制或走了不通的代理。检查：

```bash
curl -s "http://127.0.0.1:8080/api/music?action=qq_pl&id=9676728276" | head -c 200
```

本机通、外部不通 → 是 nginx 反代问题；本机也不通 → 是 Node 服务的出网问题。

### 4. 页面能开但歌单空白、控制台报 404

看浏览器 Network 里 `/api/music` 的实际状态码：

- 404 → nginx 没配反代；
- 200 但返回 HTML → `proxy_pass` 带了斜杠（见上）；
- 500 → 看 `journalctl -u music-api -n 50`。

### 5. 更新站点后接口行为变了

`api/music.js` 是**运行时被 require 的**（不是打包进 public），所以改完 `api/` 下的代码
必须重启服务才生效：

```bash
sudo systemctl restart music-api
```

只改 `source/` 里的前端/样式 → 重新 `hexo generate` 即可，不用重启。

### 6. `/api/health` 能返回 JSON，但里面没有 `node` 字段

本服务的健康检查**固定是这三个字段**：

```json
{"ok":true,"ts":1793364306701,"node":"v24.21.0"}
```

如果返回的是 `{"ok":true,"auth":true,"time":...}`、`{"error":"unauthorized","message":"访问口令不正确"}`
之类的结构，说明**你打到的根本不是本服务**——那个端口上跑着服务器上的另一个程序（宝塔插件、别的项目、
Docker 容器都有可能），而 `mpserve` 因为端口冲突（`EADDRINUSE`）压根没起来。

排查与处理：

```bash
ps aux | grep mpserve | grep -v grep     # 确认自己的进程在不在
ss -lntp | grep ':8080'                  # 看 8080 被谁占了
```

**不要去动占用端口的那个程序**（可能是你在跑的别的业务），换个端口即可：

```bash
/www/server/nodejs/v24.x.x/bin/node tools/mpserve.cjs 8090 127.0.0.1
curl http://127.0.0.1:8090/api/health    # 认准 node 字段
```

反代目标同步改成 `http://127.0.0.1:8090`。

---

## 六、文件清单

| 文件 | 作用 |
|---|---|
| `tools/mpserve.cjs` | 通用服务器：静态托管 + `/api/music` + `/api/chat` + `/api/health` |
| `deploy/install-music-api.sh` | 一键安装（systemd + nginx 反代 + 探活） |
| `deploy/music-api.service` | systemd unit 模板（手工装时用） |
| `deploy/nginx-api.conf` | nginx `location /api/` 片段（手工配时用） |

---

## 七、旧地址跳转（页面搬迁后的 301）

页面已经全部搬到一级路径：

| 旧地址 | 新地址 |
|---|---|
| `/box/astronomy/` | `/astronomy/` |
| `/box/nav/` | `/nav/` |
| `/box/gallery/` | `/gallery/` |
| `/social/link/` | `/links/` |
| `/social/fcircle/` | `/fcircle/` |
| `/life/music/` | `/music/` |

三种部署各自怎么兜：

- **mpserve 直出静态**（`node tools/mpserve.cjs 80 0.0.0.0`）：已经内置 301，什么都不用配。
- **Vercel**：`vercel.json` 里的 `redirects` 已经写好。
- **nginx 托管 public/**（宝塔默认就是这种）：nginx 直接读磁盘，请求不经过 mpserve，所以要在站点配置里加：

```nginx
location ~ ^/box/(astronomy|nav|gallery)(/.*)?$ { return 301 /$1$2; }
location ~ ^/social/(link|fcircle)(/.*)?$     { return 301 /$1$2; }
location ~ ^/life/music(/.*)?$                { return 301 /music$1; }
```

加完 `nginx -t && nginx -s reload`。不加也能用，只是老书签/老外链会 404。
