/**
 * 通用站点服务器（本地预览 与 云服务器部署通用）
 * ---------------------------------------------------------------------------
 * 同时做三件事：
 *   1. 静态托管 hexo 构建产物 public/（相当于 nginx 的 root）
 *   2. 处理 /api/music       —— 音乐页的 QQ 音乐代理（游客身份取歌单/播放地址/歌词）
 *   3. 处理 /api/chat/*      —— AI 聊天代理（转发到 OpenAI 兼容接口）
 *   另有 /api/health 健康检查，方便云上探活。
 *
 * 为什么需要它：/api/* 是**服务端代码**（不是静态文件），hexo generate 不会把它们
 * 变成接口，浏览器直连 music.163.com / u.y.qq.com 也一定被 CORS 挡下。
 * Vercel 函数那种写法在自建云服务器上跑不起来 —— 这个文件就是替代方案：
 * 一个普通的 Node http 服务，任意能跑 Node ≥18 的服务器都能用。
 *
 * 用法：
 *   node tools/mpserve.cjs [port] [host]
 *     port 默认 4457；host 默认 127.0.0.1（本地只监听本机，安全）。
 *     云服务器上： node tools/mpserve.cjs 8080 127.0.0.1
 *
 * 云服务器两种部署方式：
 *   A. nginx 反代（推荐，nginx 已经在跑时）：
 *        nginx 静态托管 public/ 作 root；
 *        再 location /api/ { proxy_pass http://127.0.0.1:8080; }
 *        本服务只起在 127.0.0.1:8080 即可。
 *   B. 直接当站点服务器：
 *        hexo generate && node tools/mpserve.cjs 80 0.0.0.0
 *
 * 部署脚本：deploy/install-music-api.sh（自动装 systemd 守护 + 改 nginx）。
 *
 * 要求 Node >= 18（用到全局 fetch）。
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

/* ---------------------------- 读取 .env ----------------------------
 * 支持项目根目录的 .env（里面有密钥，不能进仓库，已在 .gitignore 里）：
 *   · **不覆盖**已经存在的环境变量 —— 线上用 systemd 的 Environment= 或面板变量时，
 *     它们优先级更高，.env 只当兜底
 *   · 解析逻辑在 tools/env.cjs
 * ------------------------------------------------------------------ */
require('./env.cjs').loadEnv();

const ROOT = path.join(__dirname, '..', 'public');
const PORT = parseInt(process.argv[2] || '4457', 10);
const HOST = process.argv[3] || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml; charset=utf-8'
};

/** 把 Node 原生 res 包成 api/music.js 期望的接口（setHeader / status / json / end） */
function adapt(real) {
  const out = {};
  out.setHeader = (k, v) => { real.setHeader(k, v); return out; };
  out.getHeader = (k) => real.getHeader(k);
  out.status = (c) => { real.statusCode = c; return out; };
  out.json = (obj) => {
    real.setHeader('Content-Type', 'application/json; charset=utf-8');
    real.end(JSON.stringify(obj));
    return out;
  };
  out.end = (d) => { real.end(d); return out; };
  return out;
}

/** 收集请求体并尝试解析成 JSON（聊天接口要 req.body 是对象） */
function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 4 * 1024 * 1024) req.destroy();   // 4MB 上限，够用了
    });
    req.on('end', () => {
      let body = {};
      if (raw) {
        try { body = JSON.parse(raw); } catch (e) { body = raw; }
      }
      resolve({ raw, body });
    });
    req.on('error', () => resolve({ raw, body: {} }));
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');

  // ── 旧地址兼容：/box/astronomy/… → /astronomy/…
  // 页面早就搬到根路径了，这里只做 301（不占目录、不用 nginx 配置）。
  // 与 vercel.json 里的 redirects 保持一致。
  const LEGACY_PREFIX = [
    ['/box/astronomy', '/astronomy'],
    ['/box/gallery', '/gallery'],
    ['/box/nav', '/nav'],
    ['/social/link', '/links'],
    ['/social/fcircle', '/fcircle'],
    ['/life/music', '/music']          // 旧的音乐馆跳转页已删除，保留 301 免得老书签 404
  ];
  for (const [from, to] of LEGACY_PREFIX) {
    if (u.pathname === from || u.pathname.startsWith(from + '/')) {
      res.statusCode = 301;
      res.setHeader('Location', to + u.pathname.slice(from.length) + (u.search || ''));
      res.end();
      return;
    }
  }

  // 健康检查，方便云上探活 / 负载均衡
  if (u.pathname === '/api/health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true, ts: Date.now(), node: process.version }));
    return;
  }

  if (u.pathname.startsWith('/api/')) {
    const { raw, body } = await readBody(req);

    // 聊天接口：它按 Vercel 函数的写法用 req.body（对象）+ 原生 res，
    // 所以这里把**真实 res** 传进去，只补一个解析好的 body。
    if (u.pathname.startsWith('/api/chat/')) {
      try {
        const handler = require(path.join(__dirname, '..', 'api', 'chat', 'completions.js'));
        const q = {};
        u.searchParams.forEach((v, k) => { q[k] = v; });
        req.query = q;
        req.body = body;
        await handler(req, res);
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, message: String((e && e.message) || e) }));
      }
      return;
    }

    // 音乐接口：api/music.js 用的是 res.status()/.json()，需要适配层
    try {
      const handler = require(path.join(__dirname, '..', 'api', 'music.js'));
      const q = {};
      u.searchParams.forEach((v, k) => { q[k] = v; });
      const headers = {};
      Object.keys(req.headers).forEach((k) => { headers[k] = req.headers[k]; });
      await handler({ method: req.method, query: q, headers, body: raw }, adapt(res));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, message: String((e && e.message) || e) }));
    }
    return;
  }

  let p = decodeURIComponent(u.pathname);

  // 目录页补斜杠：/astronomy → 301 /astronomy/
  // 不补的话「/astronomy」会去读 public/astronomy（是个目录）→ 404；
  // 补成带斜杠的规范 URL 也让页面里的相对链接、缓存键保持一致。
  if (!p.endsWith('/') && !path.extname(p)) {
    const dirIndex = path.normalize(path.join(ROOT, p, 'index.html'));
    if (dirIndex.startsWith(ROOT) && fs.existsSync(dirIndex)) {
      res.statusCode = 301;
      res.setHeader('Location', u.pathname + '/' + (u.search || ''));
      res.end();
      return;
    }
  }

  if (p.endsWith('/')) p += 'index.html';
  const fp = path.normalize(path.join(ROOT, p));
  if (!fp.startsWith(ROOT)) { res.statusCode = 403; res.end('forbidden'); return; }
  fs.readFile(fp, (err, data) => {
    if (err) {
      // hexo 的文章是 /post/ 这种没有 .html 后缀的路由，补一下再试
      const alt = path.normalize(path.join(ROOT, p + '.html'));
      if (alt.startsWith(ROOT) && fs.existsSync(alt)) {
        res.setHeader('Content-Type', MIME['.html']);
        res.end(fs.readFileSync(alt));
        return;
      }
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    res.setHeader('Content-Type', MIME[path.extname(fp)] || 'application/octet-stream');
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  console.log('music server on http://' + HOST + ':' + PORT +
    '  (static=' + ROOT + ', api=/api/music,/api/chat)');
});

// 退出时优雅关闭（systemd stop 时不会留下半开连接）
['SIGINT', 'SIGTERM'].forEach((sig) => {
  process.on(sig, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
});
