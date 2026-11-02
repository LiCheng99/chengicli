/**
 * 模式键 / 音量键的图标切换验收：连点模式键看三种图标轮流出现，点音量键看静音图标。
 *   node tools/mpicons.mjs
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'D:/BaiduSyncdisk/LICHENG/hexo/public';
const handler = (await import(pathToFileURL('D:/BaiduSyncdisk/LICHENG/hexo/api/music.js').href)).default;
const PORT = 4479;
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

const port = 9700 + Math.floor(Math.random() * 10);
const child = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + os.tmpdir() + '\\edge-ic-' + Date.now(),
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

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 2, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/music/' });
await sleep(7000);

const readKey = (sel) => ev(`(function(){
  var b=document.querySelector('${sel}');
  if(!b) return 'missing';
  var sv=b.querySelector('svg'), p=sv&&sv.querySelector('path');
  return JSON.stringify({title:b.title, on:b.classList.contains('is-on'),
    d:p?p.getAttribute('d').slice(0,26):'', hasNum: sv&&sv.querySelector('text')?sv.querySelector('text').textContent:''});
})()`);

console.log('模式 初始  ', await readKey('[data-act="mode"]'));
for (let i = 1; i <= 3; i++) {
  await ev(`(function(){document.querySelector('[data-act="mode"]').click(); return 1;})()`);
  await sleep(350);
  console.log('模式 第' + i + '次', await readKey('[data-act="mode"]'));
}
console.log('音量 初始  ', await readKey('[data-act="mute"]'));
await ev(`(function(){document.querySelector('[data-act="mute"]').click(); return 1;})()`);
await sleep(350);
console.log('音量 静音后', await readKey('[data-act="mute"]'));
await ev(`(function(){document.querySelector('[data-act="mute"]').click(); return 1;})()`);
await sleep(350);
console.log('音量 恢复后', await readKey('[data-act="mute"]'));

/* 模式键三种状态特写 */
for (let k = 0; k < 3; k++) {
  const b = JSON.parse(await ev(`(function(){var b=document.querySelector('[data-act="mode"]'); var r=b.getBoundingClientRect(); return JSON.stringify({x:Math.round(r.x)-16,y:Math.round(r.y)-16,width:Math.round(r.width)+32,height:Math.round(r.height)+32,title:b.title});})()`));
  const sh = await send('Page.captureScreenshot', { format: 'png', clip: { x: b.x, y: b.y, width: b.width, height: b.height, scale: 3 } });
  fs.writeFileSync(os.tmpdir() + '\\mp-mode-' + k + '.png', Buffer.from(sh.data, 'base64'));
  console.log('模式图标', k, b.title, '->', os.tmpdir() + '\\mp-mode-' + k + '.png');
  await ev(`(function(){document.querySelector('[data-act="mode"]').click(); return 1;})()`);
  await sleep(350);
}

/* 静音态特写 */
await ev(`(function(){document.querySelector('[data-act="mute"]').click(); return 1;})()`);
await sleep(400);
console.log('静音 d 全长:', await ev(`(function(){var p=document.querySelector('[data-act="mute"] svg path'); return p.getAttribute('d').length + ' | ' + p.getAttribute('d').slice(40,90);})()`));
const mbox = JSON.parse(await ev(`(function(){var b=document.querySelector('[data-act="mute"]'); var r=b.getBoundingClientRect(); return JSON.stringify({x:Math.round(r.x)-14,y:Math.round(r.y)-14,width:Math.round(r.width)+28,height:Math.round(r.height)+28});})()`));
await sleep(300);
const mshot = await send('Page.captureScreenshot', { format: 'png', clip: { x: mbox.x, y: mbox.y, width: mbox.width, height: mbox.height, scale: 3 } });
fs.writeFileSync(os.tmpdir() + '\\mp-mute-on.png', Buffer.from(mshot.data, 'base64'));
await ev(`(function(){document.querySelector('[data-act="mute"]').click(); return 1;})()`);
await sleep(400);
console.log('正常 d 全长:', await ev(`(function(){var p=document.querySelector('[data-act="mute"] svg path'); return p.getAttribute('d').length + ' | ' + p.getAttribute('d').slice(40,90);})()`));
const mbox2 = JSON.parse(await ev(`(function(){var b=document.querySelector('[data-act="mute"]'); var r=b.getBoundingClientRect(); return JSON.stringify({x:Math.round(r.x)-14,y:Math.round(r.y)-14,width:Math.round(r.width)+28,height:Math.round(r.height)+28});})()`));
await sleep(300);
const mshot2 = await send('Page.captureScreenshot', { format: 'png', clip: { x: mbox2.x, y: mbox2.y, width: mbox2.width, height: mbox2.height, scale: 3 } });
fs.writeFileSync(os.tmpdir() + '\\mp-mute-off.png', Buffer.from(mshot2.data, 'base64'));
console.log('SHOT ->', os.tmpdir() + '\\mp-mute-on.png /', os.tmpdir() + '\\mp-mute-off.png');

/* 截两个键的特写 */
const box = JSON.parse(await ev(`(function(){var k=document.querySelector('.mp-keys'); k.scrollIntoView({block:'center'}); var r=k.getBoundingClientRect(); return JSON.stringify({x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)});})()`));
await sleep(500);
const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 2 } });
fs.writeFileSync(os.tmpdir() + '\\mp-keys.png', Buffer.from(shot.data, 'base64'));
console.log('SHOT ->', os.tmpdir() + '\\mp-keys.png');
child.kill('SIGKILL'); server.close(); process.exit(0);
