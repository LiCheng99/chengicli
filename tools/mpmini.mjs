/**
 * 胶囊歌词滑动验收：播放有歌词的歌 → 触发换句 → 抓滑动中间帧 + 特写。
 *   node tools/mpmini.mjs
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'D:/BaiduSyncdisk/LICHENG/hexo/public';
const handler = (await import(pathToFileURL('D:/BaiduSyncdisk/LICHENG/hexo/api/music.js').href)).default;
const PORT = 4486;
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
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
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      const q = {}; u.searchParams.forEach((v, k) => (q[k] = v));
      try { await handler({ method: req.method, query: q, headers: req.headers, body }, adapt(res)); }
      catch (e) { res.statusCode = 500; res.end(JSON.stringify({ ok: false, message: String(e) })); }
    });
    return;
  }
  let p = decodeURIComponent(u.pathname); if (p.endsWith('/')) p += 'index.html';
  fs.readFile(path.normalize(path.join(ROOT, p)), (err, data) => {
    if (err) { res.statusCode = 404; res.end('nf'); return; }
    res.setHeader('Content-Type', MIME[path.extname(p)] || 'application/octet-stream');
    res.end(data);
  });
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (m) => new Promise((r) => setTimeout(r, m));

const port = 9740 + Math.floor(Math.random() * 10);
const child = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + os.tmpdir() + '\\edge-mn-' + Date.now(),
  '--no-first-run', '--disable-gpu', '--autoplay-policy=no-user-gesture-required', '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' });
let target = null;
for (let i = 0; i < 60 && !target; i++) {
  try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); target = l.find((x) => x.type === 'page') || null; } catch (e) {}
  if (!target) await sleep(250);
}
const sock = new WebSocket(target.webSocketDebuggerUrl);
let mid = 0; const pend = new Map();
await new Promise((r) => { sock.onopen = r; });
sock.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } };
const send = (m, p) => new Promise((res, rej) => { const id = ++mid; pend.set(id, { res, rej }); sock.send(JSON.stringify({ id, method: m, params: p || {} })); });
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 300) };
  return r.result.value;
};
const capsule = () => ev(`(function(){
  var t=document.querySelector('#ds-mini .dm-text');
  if(!t) return 'no capsule';
  var cur=t.querySelector('.dm-cur'), inEl=t.querySelector('.dm-txt-in');
  return JSON.stringify({cls:t.className, cur: cur?(cur.textContent||'').slice(0,18):null,
    curTf: cur?getComputedStyle(cur).transform:null, curOp: cur?getComputedStyle(cur).opacity:null,
    inText: inEl?(inEl.textContent||'').slice(0,18):null,
    inTf: inEl?getComputedStyle(inEl).transform:null, inOp: inEl?getComputedStyle(inEl).opacity:null});
})()`);
const shot = async (name) => {
  const box = JSON.parse(await ev(`(function(){var m=document.getElementById('ds-mini'); if(!m) return '{}'; var r=m.getBoundingClientRect(); return JSON.stringify({x:Math.round(r.x)-6,y:Math.round(r.y)-6,width:Math.round(r.width)+12,height:Math.round(r.height)+12});})()`));
  if (box.x === undefined) { console.log('no capsule'); return; }
  const s = await send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 2 } });
  fs.writeFileSync(os.tmpdir() + '\\' + name + '.png', Buffer.from(s.data, 'base64'));
  console.log('SHOT ->', os.tmpdir() + '\\' + name + '.png');
};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 2, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/music/' });
await sleep(7000);

/* 放有歌词的「很任性」 */
await ev(`(function(){
  var rows=document.querySelectorAll('#mp-list .mp-row');
  for (var i=0;i<rows.length;i++){ if((rows[i].textContent||'').indexOf('很任性')>=0){ rows[i].click(); return 'clicked'; } }
  return 'not found';
})()`);
await sleep(5000);
console.log('胶囊(初始) :', await capsule());
await shot('mp-mini-1');

/* 跳到后面一句 → 应该触发滑动换词 */
await ev(`(function(){ window.fomalPlayer.seekTo(12); return 1; })()`);
await sleep(220);
console.log('滑动中间帧 :', await capsule());
await shot('mp-mini-2');
await sleep(1200);
console.log('滑动完成后 :', await capsule());
await shot('mp-mini-3');

child.kill('SIGKILL'); server.close(); process.exit(0);
