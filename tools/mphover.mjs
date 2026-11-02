/**
 * 悬停动效验收：真实鼠标移到播放键 / 下一首键上，看图标是否可见、有没有胶囊同款反馈。
 *   node tools/mphover.mjs
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'D:/BaiduSyncdisk/LICHENG/hexo/public';
const handler = (await import(pathToFileURL('D:/BaiduSyncdisk/LICHENG/hexo/api/music.js').href)).default;
const PORT = 4478;
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

const port = 9690 + Math.floor(Math.random() * 10);
const child = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + os.tmpdir() + '\\edge-hv-' + Date.now(),
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
const hover = async (sel) => {
  const box = await ev(`(function(){var b=document.querySelector('${sel}'); if(!b) return null; b.scrollIntoView({block:'center'}); var r=b.getBoundingClientRect(); return JSON.stringify({x:Math.round(r.x+r.width/2), y:Math.round(r.y+r.height/2)});})()`);
  if (!box) return 'no element';
  const { x, y } = JSON.parse(box);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 });
  await sleep(500);
  return { x, y };
};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 2, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/music/' });
await sleep(7000);
await ev(`(function(){var b=document.querySelector('.mp-play'); if(b) b.click(); return 1;})()`);
await sleep(2500);

console.log('title:', await ev(`(function(){
  var n=document.getElementById('mp-name'), m=document.querySelector('.mp-meta'), t=document.querySelector('.mp-title');
  function info(el){ if(!el) return 'none'; var r=el.getBoundingClientRect(); var cs=getComputedStyle(el);
    return {t:Math.round(r.top),h:Math.round(r.height),w:Math.round(r.width),color:cs.color,op:cs.opacity,vis:cs.visibility,disp:cs.display}; }
  return JSON.stringify({name:(n||{}).textContent, meta:info(m), title:info(t)});
})()`));
console.log('icon:', await ev(`(function(){
  var b=document.querySelector('.mp-play'), sv=b.querySelector('svg');
  var cs=getComputedStyle(sv), cb=getComputedStyle(b);
  return JSON.stringify({fill:cs.fill, color:cb.color, cls:b.className, w:Math.round(sv.getBoundingClientRect().width)});
})()`));

/* 截播放卡局部，放大看歌名区域 */
const cardBox = JSON.parse(await ev(`(function(){var c=document.querySelector('.mp-deck-card');c.scrollIntoView({block:'center'});var r=c.getBoundingClientRect();return JSON.stringify({x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)});})()`));
await sleep(600);
const cardShot = await send('Page.captureScreenshot', { format: 'png', clip: { x: cardBox.x, y: cardBox.y, width: cardBox.width, height: Math.min(cardBox.height, 420), scale: 1 } });
fs.writeFileSync(os.tmpdir() + '\\mp-card.png', Buffer.from(cardShot.data, 'base64'));
console.log('CARD ->', os.tmpdir() + '\\mp-card.png', JSON.stringify(cardBox));

console.log('default key:', await ev(`(function(){
  var b=document.querySelector('.mp-key[data-act="next"]'); var cs=getComputedStyle(b);
  return JSON.stringify({color:cs.color, bg:cs.backgroundColor, border:cs.borderTopColor});
})()`));
console.log('hover play ->', JSON.stringify(await hover('.mp-play')));
console.log('hover state:', await ev(`(function(){var b=document.querySelector('.mp-play');var cs=getComputedStyle(b);return JSON.stringify({transform:cs.transform, shadow:cs.boxShadow.slice(0,60), anim:cs.animationName});})()`));
let shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(os.tmpdir() + '\\mp-hover-play.png', Buffer.from(shot.data, 'base64'));

console.log('hover next ->', JSON.stringify(await hover('.mp-key[data-act="next"]')));
console.log('hover state:', await ev(`(function(){var b=document.querySelector('.mp-key[data-act="next"]');var cs=getComputedStyle(b);return JSON.stringify({transform:cs.transform, shadow:cs.boxShadow.slice(0,70), filter:cs.filter});})()`));
shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(os.tmpdir() + '\\mp-hover-next.png', Buffer.from(shot.data, 'base64'));
console.log('SHOT ->', os.tmpdir() + '\\mp-hover-play.png /', os.tmpdir() + '\\mp-hover-next.png');
child.kill('SIGKILL'); server.close(); process.exit(0);
