/**
 * 侧栏独立场景回归：在首页（有侧栏）悬停公告卡 → 面板出默认态 → 点播放
 * 应该由核心去拉侧栏那张 Meting 歌单并开播，胶囊随之出现。
 *
 *   node tools/mpside.mjs
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = 'D:/BaiduSyncdisk/LICHENG/hexo/public';
const PORT = 4466;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  let p = decodeURIComponent(u.pathname); if (p.endsWith('/')) p += 'index.html';
  const fp = path.normalize(path.join(ROOT, p));
  fs.readFile(fp, (err, data) => {
    if (err) { res.statusCode = 404; res.end('nf'); return; }
    res.setHeader('Content-Type', MIME[path.extname(fp)] || 'application/octet-stream');
    res.end(data);
  });
});
await new Promise((r) => server.listen(PORT, r));

const sleep = (m) => new Promise((r) => setTimeout(r, m));

const port = 9640 + Math.floor(Math.random() * 10);
const prof = os.tmpdir() + '\\edge-side-' + Date.now();
const child = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + prof,
  '--no-first-run', '--disable-gpu', '--autoplay-policy=no-user-gesture-required',
  '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' });

let target = null;
for (let i = 0; i < 80 && !target; i++) {
  try {
    const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    target = l.find((x) => x.type === 'page') || null;
  } catch (e) {}
  if (!target) await sleep(300);
}
if (!target) { console.log('no target'); process.exit(1); }

const sock = new WebSocket(target.webSocketDebuggerUrl);
let mid = 0; const pend = new Map();
await new Promise((r) => { sock.onopen = r; });
sock.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
};
const send = (m, p) => new Promise((res, rej) => { const id = ++mid; pend.set(id, { res, rej }); sock.send(JSON.stringify({ id, method: m, params: p || {} })); });
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 300) };
  return r.result.value;
};

try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/' });
  await sleep(7000);

  console.log('card?', await ev(`(function(){var c=document.getElementById('daily-say'); if(!c) return 'none'; var r=c.getBoundingClientRect(); return JSON.stringify({w:Math.round(r.width),h:Math.round(r.height),x:Math.round(r.x),y:Math.round(r.y)});})()`));

  await ev(`(function(){var c=document.getElementById('daily-say'); c.dispatchEvent(new MouseEvent('mouseenter')); document.querySelector('.ds-music').click(); return 'ok';})()`);
  await sleep(6000);

  console.log('after play', await ev(`(function(){
    var P=window.fomalPlayer, s=P.state(), p=document.getElementById('ds-player'), mini=document.getElementById('ds-mini');
    return JSON.stringify({owner:s.owner, idx:s.index, playing:s.playing, name:s.track?s.track.name:'', dur:Math.round(s.dur),
      panelName:(p&&p.querySelector('.ds-name')||{}).textContent||'', panelCount:(p&&p.querySelector('.ds-count')||{}).textContent||'',
      miniOn: mini?mini.classList.contains('is-on'):false, miniText: mini&&mini.querySelector('.dm-text')?mini.querySelector('.dm-text').textContent.slice(0,16):''});
  })()`));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(os.tmpdir() + '\\mp-side.png', Buffer.from(shot.data, 'base64'));
  console.log('SHOT ->', os.tmpdir() + '\\mp-side.png');
} catch (e) { console.log('ERR', String(e).slice(0, 300)); }
try { child.kill('SIGKILL'); } catch (e) {}
server.close();
console.log('DONE');
process.exit(0);
