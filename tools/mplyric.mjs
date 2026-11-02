/**
 * 歌词三框轮播验收：播放指定曲目 → 读三个框的内容与角色 → 跳到后面一句 → 再读，确认轮换。
 *   node tools/mplyric.mjs
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'D:/BaiduSyncdisk/LICHENG/hexo/public';
const handler = (await import(pathToFileURL('D:/BaiduSyncdisk/LICHENG/hexo/api/music.js').href)).default;
const PORT = 4481;
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

const port = 9710 + Math.floor(Math.random() * 10);
const child = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + os.tmpdir() + '\\edge-ly-' + Date.now(),
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

const readRows = () => ev(`(function(){
  var st=document.getElementById('mp-lyric-stage');
  if(!st) return 'no stage';
  return JSON.stringify(Array.prototype.map.call(st.querySelectorAll('.mp-lyric-row'), function(r){
    var cs=getComputedStyle(r), b=r.getBoundingClientRect();
    return {cls:r.className.replace('mp-lyric-row ',''), text:(r.textContent||'').slice(0,16),
            x:Math.round(b.x), y:Math.round(b.y), fs:cs.fontSize, op:cs.opacity};
  }));
})()`);

const shot = async (name) => {
  const box = JSON.parse(await ev(`(function(){var c=document.querySelector('.mp-deck-card'); c.scrollIntoView({block:'center'}); var r=c.getBoundingClientRect(); return JSON.stringify({x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.min(Math.round(r.height),300)});})()`));
  await sleep(500);
  const s = await send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1.6 } });
  fs.writeFileSync(os.tmpdir() + '\\' + name + '.png', Buffer.from(s.data, 'base64'));
  console.log('SHOT ->', os.tmpdir() + '\\' + name + '.png');
};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 2, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/music/' });
await sleep(7000);

/* 点第 10 行「很任性 (DJ COOK.版)」 */
console.log('点歌:', await ev(`(function(){
  var rows=document.querySelectorAll('#mp-list .mp-row');
  for (var i=0;i<rows.length;i++){ if((rows[i].textContent||'').indexOf('很任性')>=0){ rows[i].click(); return 'clicked '+i; } }
  return 'not found';
})()`));
await sleep(4500);
console.log('三框(初始):', await readRows());
await shot('mp-lyric-1');

/* 跳到 12 秒后 —— 应该换成后面的句子，且是滚动轮换 */
await ev(`(function(){ window.fomalPlayer.seekTo(12); return 1; })()`);
await sleep(1400);
console.log('三框(跳到12s):', await readRows());
await shot('mp-lyric-2');

/* 再往后跳 9 秒 */
await ev(`(function(){ window.fomalPlayer.seekTo(21); return 1; })()`);
await sleep(1400);
console.log('三框(跳到21s):', await readRows());
await shot('mp-lyric-3');

/* 自然播放中的逐句推进（走滚动过渡那条分支）：先定位到一句前面，等它自然唱到下一句 */
await ev(`(function(){ window.fomalPlayer.seekTo(8.0); return 1; })()`);
await sleep(1500);
console.log('过渡前  :', await readRows());
await sleep(6000);
console.log('过渡后  :', await readRows());
console.log('音频状态:', await ev(`(function(){
  var a=document.querySelector('audio'); var s=window.fomalPlayer.state();
  return JSON.stringify({paused:a?a.paused:null, t:a?Math.round(a.currentTime*10)/10:null, err:a&&a.error?a.error.code:0,
    cur:Math.round(s.cur*10)/10, dur:Math.round(s.dur||0), playing:s.playing, idx:s.index});
})()`));
await shot('mp-lyric-4');

console.log('歌词行数:', await ev(`(function(){var P=window.fomalPlayer; var s=P.state(); return s.lines?s.lines.length:0;})()`));
child.kill('SIGKILL'); server.close(); process.exit(0);
