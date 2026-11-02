#!/usr/bin/env node
/**
 * music-api-dev —— 本地跑 /api/music（hexo server 不管 api/ 目录）
 * ---------------------------------------------------------------------------
 * 线上 Vercel 会把 api/music.js 变成函数；本地 `hexo server` 只吐 public/ 静态文件，
 * 于是音乐页在本地永远是「接口 500」。这个脚本用 Node 原生 http 起一个小服务，
 * 把同一个 handler 挂到 http://127.0.0.1:4456/api/music。
 *
 * 用法：node tools/music-api-dev.js [port]
 * 页面侧：音乐页会用 localStorage.mvpApi 里的地址（调试时设成上面的 URL 即可），
 *         没设就用同源 /api/music。
 */
'use strict';

const http = require('http');
const url = require('url');

const PORT = Number(process.argv[2] || process.env.MUSIC_API_PORT || 4456);
const target = process.argv[3] || 'api/music.js';

let handler;
function load() {
  const p = require.resolve(require('path').resolve(__dirname, '..', target));
  delete require.cache[p];
  handler = require(p);
}
load();

const server = http.createServer((req, res) => {
  const u = url.parse(req.url, true);
  if (u.pathname !== '/api/music') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found');
    return;
  }

  // 只实现 handler 用到的那几个 res 方法，够用就行
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return res;
  };
  req.query = u.query;

  Promise.resolve(handler(req, res)).catch((e) => {
    if (!res.headersSent) res.status(500).json({ ok: false, message: (e && e.message) || String(e) });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('music api dev → http://127.0.0.1:' + PORT + '/api/music');
});
