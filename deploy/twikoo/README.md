# Twikoo 私有部署（宝塔 + Docker）

> ⚠️ **镜像名是 `imaegoo/twikoo`，不是 `twikoojs/twikoo`。** 后者不存在，无论直连还是走镜像代理都会报
> `manifest not found` / `image is not in the allowlist`。

## 前置
- 服务器已装宝塔面板，并在「软件商店」安装好 **Docker**（宝塔 7.x+ 左侧有「Docker」菜单）
- 准备一个域名，如 `twikoo.example.com`，A 记录已解析到服务器 IP
- 云厂商安全组 / 宝塔防火墙放行 **80 / 443**

## 部署步骤
1. **上传编排文件**：把本目录 `docker-compose.yml` 传到服务器 `/www/docker/twikoo/`
   （或：宝塔 → Docker → 编排模板 → 新建，目录填 `/www/docker/twikoo`，粘贴文件内容）
2. **启动容器**（SSH）：
   ```bash
   cd /www/docker/twikoo
   docker compose up -d
   # 老版本用：docker-compose up -d
   ```
   确认：`docker ps` 能看到 `twikoo` 容器处于 `Up`。
3. **建站 + 反代**：宝塔 → 网站 → 添加站点，域名填 `twikoo.example.com`；
   进入该站点 → 反向代理 → 目标 URL 填 `http://127.0.0.1:8080`，发送域名 `$host`。
4. **上 HTTPS**：该站点 → SSL → Let's Encrypt 申请，开启「强制 HTTPS」。
5. **验证**：浏览器打开 `https://twikoo.example.com`，返回一段 JSON（含 `code` 字段）即后端正常。
6. **管理后台**：`https://twikoo.example.com/admin`，密码 = `docker-compose.yml` 里的 `TWIKOO_ADMIN_PASS`。
7. **接回博客**：把 `https://twikoo.example.com` 填进博客根目录 `_config.fomalhaut.yml` 的：
   ```yaml
   twikoo:
     envId: https://twikoo.example.com
   ```
   然后 `npx hexo generate`（或 `hexo clean && hexo g`）重新构建即可。

## 注意
- `data/` 是评论数据（lokijs），**不要删**；迁移时连同该目录一起备份。
- 极简版只有 twikoo 一个容器，内存约 100~200MB，1G 小机器很轻松。
- 反代只需普通 HTTP，Twikoo 不用 WebSocket。

## 国内拉取镜像超时（很常见）

若 `docker compose up -d` 报 `Error response from daemon: Get "https://registry-1.docker.io/v2/": context deadline exceeded`，
是 Docker Hub 在国内无法直连。

> ⚠️ **不要用 DaoCloud**（`docker.m.daocloud.io`）：它有镜像白名单，`imaegoo/twikoo` 不在列表内，会报
> `image is not in the allowlist`。

**A. 走镜像代理拉取，再打回原名（不重启 Docker，推荐先用这个）**
```bash
# 首选 1ms.run
docker pull docker.1ms.run/imaegoo/twikoo:latest
docker tag docker.1ms.run/imaegoo/twikoo:latest imaegoo/twikoo:latest

# 若 1ms.run 也超时，依次试下面两个（同样是 pull 完 tag 回原名）
# docker pull docker.1panel.live/imaegoo/twikoo:latest
# docker tag  docker.1panel.live/imaegoo/twikoo:latest imaegoo/twikoo:latest
# docker pull hub.rat.dev/imaegoo/twikoo:latest
# docker tag  hub.rat.dev/imaegoo/twikoo:latest imaegoo/twikoo:latest

cd /www/docker/twikoo && docker compose up -d
```

**B. 配全局镜像加速器（持久生效，会重启 Docker）**
```bash
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'DOCKEREOF'
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.1panel.live",
    "https://hub.rat.dev",
    "https://docker.nju.edu.cn"
  ]
}
DOCKEREOF
systemctl daemon-reload && systemctl restart docker
```

**C. 阿里云/腾讯云用户**：控制台「容器镜像服务」有专属加速地址（形如 `https://xxxx.mirror.aliyuncs.com`），
填进上面的 `registry-mirrors` 最稳，且不依赖第三方公共代理。

## 域名还在备案中能用吗

不能用于**对外**的 80/443。大陆服务器上未备案域名解析过来，80/443 会被拦截（这是硬性规定），Let's Encrypt 也过不了验证。
备案期间可以先做的是：
1. 把容器跑起来，在服务器上 `curl http://127.0.0.1:8080` 确认后端返回 JSON —— 证明 Twikoo 本身正常。
2. 等备案通过后再：建站绑域名 → 反向代理 → 申请 SSL → 把 `https://域名` 填进 `twikoo.envId`。

不建议备案期间把 `http://服务器IP:8080` 填进博客：① 博客是 HTTPS 时，浏览器会因「混合内容」拦截 HTTP 接口；② 直接暴露端口不安全。

## 兜底：不用 Docker，直接跑 tkserver（连 MongoDB 都不用）

如果 Docker 镜像怎么都拉不下来，Twikoo 还有一条更轻的路：官方的 `tkserver` 直接跑在 Node 上。
不配置 `MONGODB_URI` 时默认用 lokijs 本地文件存储，不需要装 MongoDB。

```bash
# 国内 npm 建议先换淘宝镜像
npm config set registry https://registry.npmmirror.com

# 安装并启动（默认端口 8080，数据存当前目录的 data/）
npm i -g tkserver
cd /www/docker/twikoo && tkserver
```

后台常驻：`nohup tkserver >> tkserver.log 2>&1 &`，或用宝塔「Node 项目」托管、配 systemd。
验证：`curl http://127.0.0.1:8080`，返回 JSON 即正常。反代、SSL、填 envId 与 Docker 方案完全一致。
