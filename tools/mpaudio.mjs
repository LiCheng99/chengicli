/**
 * 查「暂停了声音还在放」：数一数页面里到底有几个 <audio>、各自什么状态。
 *   node tools/mpaudio.mjs
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'D:/BaiduSyncdisk/LICHENG/hexo/public';
const handler = (await import(pathToFileURL('D:/BaiduSyncdisk/LICHENG/hexo/api/music.js').href)).default;
const PORT = 4483;
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

const port = 9720 + Math.floor(Math.random() * 10);
const child = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + os.tmpdir() + '\\edge-au-' + Date.now(),
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
const audioState = () => ev(`(function(){
  var as=document.querySelectorAll('audio');
  var arr=[];
  for(var i=0;i<as.length;i++){var a=as[i];arr.push({i:i,paused:a.paused,t:Math.round(a.currentTime*10)/10,
    src:(a.currentSrc||a.src||'').slice(-46), parent:a.parentNode?a.parentNode.tagName:'?', inDoc:document.body.contains(a)});}
  var s=window.fomalPlayer.state();
  return JSON.stringify({count:as.length,list:arr,busPlaying:s.playing,busIdx:s.index,busCur:Math.round(s.cur*10)/10});
})()`);

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/' });
await sleep(6000);
console.log('首页加载后   :', await audioState());

/* 首页点喇叭放歌 */
await ev(`(function(){var b=document.querySelector('.ds-music'); if(b){b.click(); return 'clicked';} return 'no btn';})()`);
await sleep(4000);
console.log('首页播放中   :', await audioState());

/* pjax 跳到音乐馆 */
await ev(`(function(){var a=document.querySelector('a[href="/music/"]'); if(a){a.click(); return 'go';} return 'no link';})()`);
await sleep(5000);
console.log('pjax 到音乐馆:', await audioState());

/* 在音乐页暂停 */
await ev(`(function(){var b=document.querySelector('.mp-play'); if(b) b.click(); return 1;})()`);
await sleep(1500);
console.log('音乐页暂停后 :', await audioState());
await sleep(3000);
console.log('暂停 3 秒后  :', await audioState());

/* 暂停状态下拖进度条（Meting 流，不可 seek）：应保持暂停，并且给提示 */
const bar = JSON.parse(await ev(`(function(){var b=document.getElementById('mp-bar'); b.scrollIntoView({block:'center'}); var r=b.getBoundingClientRect(); return JSON.stringify({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)});})()`));
await sleep(400);
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: Math.round(bar.x + bar.w * 0.7), y: Math.round(bar.y + bar.h / 2), button: 'left', clickCount: 1, buttons: 1 });
await sleep(250);
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(bar.x + bar.w * 0.7), y: Math.round(bar.y + bar.h / 2), button: 'left', clickCount: 1, buttons: 0 });
await sleep(2000);
console.log('暂停中拖进度条 :', await audioState());
console.log('提示文案      :', await ev(`(function(){var t=document.getElementById('mp-pltip'); return t?t.textContent:'(no el)';})()`));

child.kill('SIGKILL'); server.close(); process.exit(0);
