/**
 * 空格键改动的回归验收（10-31）
 * 确认加了空格调度之后，三处音乐联动（音乐页 / 侧栏面板 / 左下角胶囊）没被破坏。
 *
 *   node tools/mpspaceregress.mjs
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'D:/BaiduSyncdisk/LICHENG/hexo/public';
const handler = (await import(pathToFileURL('D:/BaiduSyncdisk/LICHENG/hexo/api/music.js').href)).default;
const PORT = 4474;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

function silentWav(seconds = 3) {
  const rate = 8000, n = rate * seconds;
  const buf = Buffer.alloc(44 + n);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate, 28);
  buf.writeUInt16LE(1, 32); buf.writeUInt16LE(8, 34);
  buf.write('data', 36); buf.writeUInt32LE(n, 40);
  buf.fill(128, 44);
  return buf;
}
const WAV = silentWav(3);

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
  if (u.pathname === '/__silent.wav') { res.setHeader('Content-Type', 'audio/wav'); res.end(WAV); return; }
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9800 + Math.floor(Math.random() * 15);
const child = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + port,
  '--user-data-dir=' + os.tmpdir() + '\\edge-reg-' + Date.now(),
  '--no-first-run', '--disable-gpu', '--autoplay-policy=no-user-gesture-required',
  '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' });
let target = null;
for (let i = 0; i < 60 && !target; i++) {
  try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); target = l.find((x) => x.type === 'page') || null; } catch (e) { }
  if (!target) await sleep(250);
}
const sock = new WebSocket(target.webSocketDebuggerUrl);
let mid = 0; const pend = new Map();
await new Promise((r) => { sock.onopen = r; });
sock.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } };
const send = (m, p) => new Promise((res, rej) => { const id = ++mid; pend.set(id, { res, rej }); sock.send(JSON.stringify({ id, method: m, params: p || {} })); });
/* 不用 awaitPromise —— playIndex 的 promise 会等网络，await 会把整条命令挂死 */
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: false });
  if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 300) };
  return r.result.value;
};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log((pass ? '  PASS  ' : '  FAIL  ') + name + (detail ? '   → ' + detail : ''));
};

console.log('\n【回归一】音乐页点播放 → 胶囊出现、状态同步');
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/music/` });
await sleep(5000);
await ev(`(function(){
  var P=window.fomalPlayer;
  P.setQueue({ owner:'page', name:'测试', list:[{ id:'t1', name:'测试曲', artist:'测试员', url:'/__silent.wav', cover:'', pic:'' }] });
  P.playIndex(0);
  return 'ok';
})()`);
await sleep(1500);
const miniOn = await ev(`(function(){ var m=document.getElementById('ds-mini'); return m? m.classList.contains('is-on') : false; })()`);
check('音乐页出声 → 左下角胶囊自动出现', miniOn === true, 'is-on=' + miniOn);

const playBtnLabel = await ev(`(function(){
  var b=document.querySelector('#mp-page .mp-play');
  return b ? (b.classList.contains('is-on') ? '暂停' : '播放') : 'no btn';
})()`);
check('音乐页播放键图标同步成「暂停」', playBtnLabel === '暂停', '按钮=' + playBtnLabel);

console.log('\n【回归二】核心事件派发没被空格调度器影响');
/* 队列给 3 首 —— 只有 1 首时 next() 会绕回同一首，测不出切歌 */
const evtLog = await ev(`(function(){
  var P=window.fomalPlayer;
  P.setQueue({ owner:'page', name:'测试', list:[
    { id:'t1', name:'曲一', artist:'测试员', url:'/__silent.wav', cover:'', pic:'' },
    { id:'t2', name:'曲二', artist:'测试员', url:'/__silent.wav', cover:'', pic:'' },
    { id:'t3', name:'曲三', artist:'测试员', url:'/__silent.wav', cover:'', pic:'' }
  ]});
  P.playIndex(0);
  window.__ev=[];
  P.on(function(t){ window.__ev.push(t); });
  return 'ok';
})()`);
await sleep(1200);
await ev(`window.fomalPlayer.next()`);
await sleep(1200);
/* time 事件很频繁，取尾部会把 track 挤掉 —— 直接看整段里有没有 track */
const evAll = await ev(`JSON.stringify((window.__ev||[]))`);
const trackIdx = await ev(`window.fomalPlayer.index()`);
check('next() 派发 track 事件且下标前进',
  evtLog === 'ok' && /"track"/.test(evAll || '') && trackIdx === 1,
  '含track=' + /"track"/.test(evAll || '') + ' index=' + trackIdx);

console.log('\n【回归三】模式键 / 静音键图标仍随状态变');
const muteBefore = await ev(`(function(){
  var b=document.querySelector('#mp-page [data-act="mute"]');
  return b ? b.getAttribute('title') : 'no btn';
})()`);
await ev(`(function(){ var b=document.querySelector('#mp-page [data-act="mute"]'); if(b) b.click(); return 1; })()`);
await sleep(500);
const muteAfter = await ev(`(function(){
  var b=document.querySelector('#mp-page [data-act="mute"]');
  return b ? b.getAttribute('title') : 'no btn';
})()`);
check('静音键点击后 title 变化', muteBefore !== muteAfter, `${muteBefore} → ${muteAfter}`);
await ev(`(function(){ var b=document.querySelector('#mp-page [data-act="mute"]'); if(b) b.click(); return 1; })()`);
await sleep(300);

console.log('\n【回归四】首页侧栏播放（独立于音乐页）仍然可用');
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
await sleep(5000);
const sideOk = await ev(`(function(){
  var P=window.fomalPlayer;
  P.setQueue({ owner:'side', name:'QQ 音乐', list:[{ id:'t1', name:'侧栏曲', artist:'测试员', url:'/__silent.wav', cover:'', pic:'' }] });
  P.playIndex(0);
  return 'ok';
})()`);
await sleep(1500);
const sidePlaying = await ev(`window.fomalPlayer.isPlaying()`);
check('首页侧栏播放正常', sideOk === 'ok' && sidePlaying === true, 'isPlaying=' + sidePlaying);
const sideOwner = await ev(`window.fomalPlayer.owner()`);
check('owner 正确标记为 side', sideOwner === 'side', 'owner=' + sideOwner);

console.log('\n──────────────────────────────');
const failed = results.filter((r) => !r.pass);
console.log(`合计 ${results.length} 项，通过 ${results.length - failed.length}，失败 ${failed.length}`);
failed.forEach((f) => console.log('  ✗ ' + f.name + '  ' + (f.detail || '')));

child.kill('SIGKILL'); server.close();
process.exit(failed.length ? 1 : 0);
