/**
 * 单档截图（避免一次起多个 Edge 被沙箱掐掉）。
 *   node tools/mpverify2.mjs <light|dark|mobile>
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const tag = process.argv[2] || 'light';
const ROOT = 'D:/BaiduSyncdisk/LICHENG/hexo/public';
const handler = (await import(pathToFileURL('D:/BaiduSyncdisk/LICHENG/hexo/api/music.js').href)).default;
const PORT = 4460;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
function adapt(real) {
    const out = {};
  out.setHeader = (k, v) => real.setHeader(k, v);
  out.status = (c) => { real.statusCode = c; return out; };
  out.json = (o) => { real.setHeader('Content-Type', 'application/json; charset=utf-8'); real.end(JSON.stringify(o)); return out; };
  out.end = (d) => { real.end(d); return out; };
  return out;
}
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname.startsWith('/api/')) {
    let body = ''; req.on('data', (c) => (body += c));
    req.on('end', async () => { const q = {}; u.searchParams.forEach((v, k) => (q[k] = v)); const headers = {}; for (const k in req.headers) headers[k] = req.headers[k];
      try { await handler({ method: req.method, query: q, headers, body }, adapt(res)); } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ ok: false, message: String(e) })); } });
    return;
  }
  let p = decodeURIComponent(u.pathname); if (p.endsWith('/')) p += 'index.html';
  const fp = path.normalize(path.join(ROOT, p));
  fs.readFile(fp, (err, data) => { if (err) { res.statusCode = 404; res.end('nf'); return; } res.setHeader('Content-Type', MIME[path.extname(fp)] || 'application/octet-stream'); res.end(data); });
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (m) => new Promise((r) => setTimeout(r, m));
async function launchEdge(W, H) {
  const port = 9585 + Math.floor(Math.random() * 20);
  const prof = os.tmpdir() + '\\edge-v2-' + Date.now() + '-' + Math.floor(Math.random() * 1e6);
  const child = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + prof, '--no-first-run', '--disable-gpu', '--window-size=' + W + ',' + H, 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const t = l.find((x) => x.type === 'page'); if (t && t.webSocketDebuggerUrl) return { child, ws: t.webSocketDebuggerUrl }; } catch (e) {} await sleep(300); }
  throw new Error('no edge target');
}
function attach(wsUrl) {
  const sock = new WebSocket(wsUrl); let id = 0; const pend = new Map();
  const ready = new Promise((res, rej) => { sock.onopen = res; sock.onerror = rej; });
  sock.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } };
  const send = (m, p) => new Promise((res, rej) => { const mid = ++id; pend.set(mid, { res, rej }); sock.send(JSON.stringify({ id: mid, method: m, params: p || {} })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 200) }; return r.result.value; };
  return { sock, ready, send, ev };
}
const W = tag === 'mobile' ? 390 : 1440, H = tag === 'mobile' ? 900 : 1100;
const dark = tag === 'dark';
try {
  const { child, ws } = await launchEdge(W, H);
  try {
    const a = attach(ws); await a.ready; await a.send('Page.enable'); await a.send('Runtime.enable');
    await a.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: W < 700 });
    await a.send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/music/' }); await sleep(9000);
    if (dark) { await a.ev(`document.documentElement.setAttribute('data-theme','dark')`); await sleep(1400); }
    const info = await a.ev(`(function(){function R(s){var e=document.querySelector(s);if(!e)return null;var r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)};}var page=document.querySelector('.mp-page');var list=document.getElementById('mp-list');return JSON.stringify({pageW:page?Math.round(page.getBoundingClientRect().width):0,disc:R('.mp-disc'),arm:R('.mp-arm'),rows:list?list.querySelectorAll('.mp-row').length:0,title:(document.getElementById('mp-name')||{}).textContent,plname:(document.getElementById('mp-plname')||{}).textContent});})()`);
    console.log(tag, 'INFO', info);
    const lm = await a.send('Page.getLayoutMetrics');
    const cw = Math.ceil(lm.cssContentSize.width), ch = Math.ceil(lm.cssContentSize.height);
    const full = await a.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: cw, height: Math.min(ch, 6000), scale: 1 } });
    fs.writeFileSync(os.tmpdir() + '\\mp-' + tag + '.png', Buffer.from(full.data, 'base64'));
    console.log(tag, 'SHOT', os.tmpdir() + '\\mp-' + tag + '.png', cw + 'x' + ch);
  } finally { try { child.kill('SIGKILL'); } catch (e) {} }
} catch (e) { console.log(tag, 'ERR', String(e).slice(0, 200)); }
server.close();
console.log(tag, 'DONE');
process.exit(0);
