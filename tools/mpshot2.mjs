/**
 * 轻量截图（只截视口，不整页），用于快速看改版后的样子。
 *   node tools/mpshot2.mjs [light|dark] [宽] [高]
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const handler = (await import(pathToFileURL('D:/BaiduSyncdisk/LICHENG/hexo/api/music.js').href)).default;
function adapt(real) {
    const out = {};
  out.setHeader = (k, v) => real.setHeader(k, v);
  out.status = (c) => { real.statusCode = c; return out; };
  out.json = (o) => { real.setHeader('Content-Type', 'application/json; charset=utf-8'); real.end(JSON.stringify(o)); return out; };
  out.end = (d) => { real.end(d); return out; };
  return out;
}

const tag = process.argv[2] || 'light';
const W = Number(process.argv[3]) || 1440;
const H = Number(process.argv[4]) || 1000;
/* 路径参数别带开头的斜杠：Git Bash 会把 /music/ 当成盘符路径改写掉 */
const PAGE = '/' + String(process.argv[5] || 'music').replace(/^[/\\]+|[/\\]+$/g, '') + '/';
const ROOT = 'D:/BaiduSyncdisk/LICHENG/hexo/public';
const PORT = 4470;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

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
  const fp = path.normalize(path.join(ROOT, p));
  fs.readFile(fp, (err, data) => {
    if (err) { res.statusCode = 404; res.end('nf'); return; }
    res.setHeader('Content-Type', MIME[path.extname(fp)] || 'application/octet-stream');
    res.end(data);
  });
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (m) => new Promise((r) => setTimeout(r, m));

const port = 9660 + Math.floor(Math.random() * 10);
const prof = os.tmpdir() + '\\edge-shot-' + Date.now();
const child = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + prof,
  '--no-first-run', '--disable-gpu', '--autoplay-policy=no-user-gesture-required',
  '--window-size=' + W + ',' + H, 'about:blank'], { stdio: 'ignore' });

let target = null;
for (let i = 0; i < 60 && !target; i++) {
  try {
    const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    target = l.find((x) => x.type === 'page') || null;
  } catch (e) {}
  if (!target) await sleep(250);
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
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1.5, mobile: W < 700 });
  await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + PAGE });
  await sleep(6500);
  if (tag === 'dark') { await ev(`document.documentElement.setAttribute('data-theme','dark')`); await sleep(1200); }

  /* 滚到播放卡位置，并顺手点一下播放，让胶囊也露出来 */
  await ev(`(function(){var c=document.querySelector('.mp-deck-card'); if(c) c.scrollIntoView({block:'center'}); return 1;})()`);
  await sleep(600);
  await ev(`(function(){var b=document.querySelector('.mp-play'); if(b) b.click(); return 1;})()`);
  await sleep(7000);

  console.log('URL', await ev('location.pathname'));
  console.log('STATE', await ev(`(function(){
    var P=window.fomalPlayer, s=P?P.state():null, mini=document.getElementById('ds-mini');
    var card=document.querySelector('.mp-deck-card'), cr=card?card.getBoundingClientRect():null;
    var st=document.documentElement.style;
    return JSON.stringify({rows:document.querySelectorAll('#mp-list .mp-row').length,
      keys:document.querySelectorAll('.mp-keys .mp-key').length,
      sheet:!!document.getElementById('mp-sheet'),
      playing:s?s.playing:null, owner:s?s.owner:'',
      miniOn: mini?mini.classList.contains('is-on'):false,
      card: cr?Math.round(cr.left)+'..'+Math.round(cr.right)+' w'+Math.round(cr.width):'',
      vw: window.innerWidth,
      fake: document.body.classList.contains('mp-beat-fake'),
      beatLevel: st.getPropertyValue('--beat-level')||'',
      beatBass: st.getPropertyValue('--beat-bass')||'',
      waveTf: (document.querySelector('.main-hero-waves-area')||{}).style ? document.querySelector('.main-hero-waves-area').style.transform : '', dbg: P.beatDebug ? P.beatDebug() : null,
      svg: (function(){var b=document.querySelector('.mp-play');var sv=b&&b.querySelector('svg');if(!sv)return 'no svg';var r=sv.getBoundingClientRect();var cs=getComputedStyle(sv);var cb=getComputedStyle(b);return JSON.stringify({rect:Math.round(r.width)+'x'+Math.round(r.height),cssW:cs.width,cssH:cs.height,fill:cs.fill,color:cs.color,btnColor:cb.color,btnBg:cb.backgroundImage.slice(0,46),inline:b.innerHTML.slice(0,70)});})(),
      au: (function(){var a=document.querySelector('audio');return a?{t:Math.round(a.currentTime*10)/10,rdy:a.readyState,paused:a.paused,net:a.networkState,err:a.error?a.error.code:0,cur:(a.currentSrc||'').slice(-18)}:null;})()});
  })()`));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const out = os.tmpdir() + '\\mp-shot-' + tag + '.png';
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log('SHOT', out);
} catch (e) { console.log('ERR', String(e).slice(0, 300)); }
try { child.kill('SIGKILL'); } catch (e) {}
server.close();
process.exit(0);
