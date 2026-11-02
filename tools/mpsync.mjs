/**
 * 三处音乐功能联动的端到端验收：
 *   音乐页点播放 → 左下角胶囊出现；胶囊按暂停 → 音乐页按钮跟着变回播放；
 *   音乐页按下一首 → 胶囊歌词/歌名跟着换。
 *
 *   node tools/mpsync.mjs
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'D:/BaiduSyncdisk/LICHENG/hexo/public';
const handler = (await import(pathToFileURL('D:/BaiduSyncdisk/LICHENG/hexo/api/music.js').href)).default;
const PORT = 4465;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

/* 一段 1 秒静音 WAV：用来在不依赖外网音频的情况下验证「核心一出声，胶囊就出现」 */
function silentWav(seconds = 1) {
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

const sleep = (m) => new Promise((r) => setTimeout(r, m));

async function launchEdge(W, H) {
  const port = 9620 + Math.floor(Math.random() * 15);
  const prof = os.tmpdir() + '\\edge-sync-' + Date.now();
  const child = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + prof,
    '--no-first-run', '--disable-gpu', '--autoplay-policy=no-user-gesture-required',
    '--window-size=' + W + ',' + H, 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 80; i++) {
    try {
      const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const t = l.find((x) => x.type === 'page');
      if (t && t.webSocketDebuggerUrl) return { child, ws: t.webSocketDebuggerUrl };
    } catch (e) {}
    await sleep(300);
  }
  throw new Error('no edge target');
}

function attach(wsUrl) {
  const sock = new WebSocket(wsUrl); let id = 0; const pend = new Map();
  const ready = new Promise((res, rej) => { sock.onopen = res; sock.onerror = rej; });
  sock.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
  };
  const send = (m, p) => new Promise((res, rej) => { const mid = ++id; pend.set(mid, { res, rej }); sock.send(JSON.stringify({ id: mid, method: m, params: p || {} })); });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 400) };
    return r.result.value;
  };
  return { sock, ready, send, ev };
}

const W = 1440, H = 1000;
const probe = `(function(){
  var P = window.fomalPlayer;
  var mini = document.getElementById('ds-mini');
  var page = document.querySelector('.mp-page');
  var playBtn = document.querySelector('.mp-play');
  var st = P ? P.state() : null;
  return JSON.stringify({
    hasBus: !!P,
    owner: st ? st.owner : '',
    index: st ? st.index : -1,
    playing: st ? st.playing : false,
    cur: st ? Math.round(st.cur * 10) / 10 : 0,
    trackName: st && st.track ? st.track.name : '',
    miniExists: !!mini,
    miniOn: mini ? mini.classList.contains('is-on') : false,
    miniText: mini && mini.querySelector('.dm-text') ? mini.querySelector('.dm-text').textContent.slice(0, 24) : '',
    pageTitle: (document.getElementById('mp-name') || {}).textContent || '',
    pagePlaying: page ? page.classList.contains('is-playing') : false,
    playBtnOn: playBtn ? playBtn.classList.contains('is-on') : false,
    sidePlLen: (window.fomalMusic && window.fomalMusic.playlist() ? window.fomalMusic.playlist().length : -1)
  });
})()`;

try {
  const { child, ws } = await launchEdge(W, H);
  try {
    const a = attach(ws);
    await a.ready; await a.send('Page.enable'); await a.send('Runtime.enable');
    await a.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: false });
    await a.send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/music/' });
    await sleep(8000);

    console.log('0) 初始      ', await a.ev(probe));

    /* A. 用本地静音 WAV 直接喂核心：验证「一出声胶囊就出现」这条链路，
         不依赖外网音频能不能下载（沙箱里经常下不动） */
    await a.ev(`(function(){
      var P = window.fomalPlayer;
      P.setQueue({owner:'test', name:'测试', list:[{name:'联动自检 A', artist:'local', url:'/__silent.wav'}]});
      P.playIndex(0);
      return 'ok';
    })()`);
    await sleep(2500);
    console.log('A) 核心出声  ', await a.ev(probe));

    /* B. 胶囊上按暂停 → 页面按钮要跟着变回「播放」 */
    await a.ev(`(function(){var b=document.querySelector('#ds-mini .dm-play'); if(b) b.click(); return !!b;})()`);
    await sleep(900);
    console.log('B) 胶囊暂停  ', await a.ev(probe));

    /* C. 胶囊上按播放 → 两边一起恢复 */
    await a.ev(`(function(){var b=document.querySelector('#ds-mini .dm-play'); if(b) b.click(); return !!b;})()`);
    await sleep(900);
    console.log('C) 胶囊播放  ', await a.ev(probe));

    /* D. 音乐页点「下一首」→ 队列该前进（测试队列只有 1 首，会绕回 0，换成 2 首更好判断） */
    await a.ev(`(function(){
      var P = window.fomalPlayer;
      P.setQueue({owner:'test', name:'测试', list:[
        {name:'联动自检 A', artist:'local', url:'/__silent.wav'},
        {name:'联动自检 B', artist:'local', url:'/__silent.wav'}
      ]});
      P.playIndex(0);
      return 'ok';
    })()`);
    await sleep(1500);
    var beforeNext = await a.ev(probe);
    await a.ev(`(function(){var b=document.querySelector('.mp-page [data-act="next"]'); if(b) b.click(); return !!b;})()`);
    await sleep(1200);
    var afterNext = await a.ev(probe);
    console.log('D) 页内下一首 before', beforeNext);
    console.log('D) 页内下一首 after ', afterNext);

    /* E. 真实链路：点音乐页播放键，看 owner 是否切到 page 并真的去取地址 */
    await a.ev(`(function(){var b=document.querySelector('.mp-page [data-act="play"]'); if(b) b.click(); return !!b;})()`);
    await sleep(4500);
    console.log('E) 页内点播放', await a.ev(probe));

    /* F. 悬停侧栏卡片 → 面板要显示「正在放的那首」和同一份歌词（说明它也订到核心了） */
    await a.ev(`(function(){var c=document.getElementById('daily-say'); if(!c) return 'no card'; c.dispatchEvent(new MouseEvent('mouseenter',{bubbles:false})); return 'ok';})()`);
    await sleep(1200);
    console.log('F) 悬停面板  ', await a.ev(`(function(){
      var p = document.getElementById('ds-player');
      if (!p) return 'no panel';
      var r = p.getBoundingClientRect();
      return JSON.stringify({
        open: p.classList.contains('is-open'),
        size: Math.round(r.width) + 'x' + Math.round(r.height),
        name: (p.querySelector('.ds-name')||{}).textContent || '',
        artist: (p.querySelector('.ds-artist')||{}).textContent || '',
        lines: p.querySelectorAll('.ds-lyric .ds-line').length,
        count: (p.querySelector('.ds-count')||{}).textContent || '',
        playOn: p.classList.contains('is-playing')
      });
    })()`));

    /* G. 面板上按暂停 → 音乐页要跟着停（三处联动里最容易漏的一环） */
    await a.ev(`(function(){var b=document.querySelector('#ds-player [data-act="play"]'); if(b) b.click(); return !!b;})()`);
    await sleep(900);
    console.log('G) 面板暂停  ', await a.ev(probe));

    const shot = await a.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(os.tmpdir() + '\\mp-sync.png', Buffer.from(shot.data, 'base64'));
    console.log('SHOT ->', os.tmpdir() + '\\mp-sync.png');
  } finally { try { child.kill('SIGKILL'); } catch (e) {} }
} catch (e) { console.log('ERR', String(e).slice(0, 400)); }
server.close();
console.log('DONE');
process.exit(0);
