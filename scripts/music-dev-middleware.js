'use strict';
/**
 * 让本地的 `hexo server`（开发预览）也能处理 /api/music 代理。
 * ---------------------------------------------------------------------------
 * 没有这个中间件时，hexo server 只会返回静态文件和页面，不认识 /api/music，
 * 于是音乐页拉歌单会 404。加了之后，本地 4444 端口就能完整跑通音乐页。
 *
 * 坑（已处理）：本主题用的 hexo-server@3 是裸 connect，不是 express ——
 *   1. 没有 app.all()，只能用 app.use('/api/music', fn)；
 *   2. connect 不解析 req.query，要自己从 req.url 取；
 *   3. connect 的 res 没有 .status()/.json()，要包一层（同 tools/mpserve.cjs）。
 *
 * 注意：
 *   - 只在 `hexo server` 本地预览时生效，不是生产方案。
 *   - 改了本文件要【重启 hexo server】才会加载（hexo 在启动时扫描 scripts/）。
 *   - 生产环境请用通用站点服务器 tools/mpserve.cjs，不要拿 hexo server 上生产。
 */
const path = require('path');
const handler = require(path.join(__dirname, '..', 'api', 'music.js'));

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

hexo.extend.filter.register('server_middleware', (app) => {
  app.use('/api/music', (req, res) => {
    const u = new URL(req.url, 'http://localhost');
    const q = {};
    u.searchParams.forEach((v, k) => { q[k] = v; });
    const headers = {};
    Object.keys(req.headers).forEach((k) => { headers[k] = req.headers[k]; });
    const fakeReq = { method: req.method, query: q, headers };
    (async () => {
      try {
        await handler(fakeReq, adapt(res));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, message: String((e && e.message) || e) }));
      }
    })();
  });
});
