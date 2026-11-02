/**
 * 空格键播放/暂停 的端到端验收（10-31）
 *
 * 验三件事：
 *   1. 音乐馆页面（/music/）：按空格 = 播放 / 暂停
 *   2. 别的页面：鼠标停在左下角胶囊上时，按空格 = 播放 / 暂停
 *   3. 别的页面：鼠标**不在**播放器上时，按空格不响应（不误伤页面滚动）
 *
 * 另外顺带验：
 *   · 音乐页的搜索框里按空格 → 打出空格，不触发播放（焦点在输入框要放行）
 *   · 悬停在胶囊**按钮**上时按空格 → 交给按钮自己（浏览器会补一次 click），不重复触发
 *
 * node tools/mpspace.mjs
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'D:/BaiduSyncdisk/LICHENG/hexo/public';
const handler = (await import(pathToFileURL('D:/BaiduSyncdisk/LICHENG/hexo/api/music.js').href)).default;
const PORT = 4471;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

/* 一段静音 WAV：不依赖外网音频就能验「核心一出声，胶囊就出现 / 空格能暂停」 */
function silentWav(seconds = 2) {
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
const port = 9760 + Math.floor(Math.random() * 20);
const child = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + port,
  '--user-data-dir=' + os.tmpdir() + '\\edge-space-' + Date.now(),
  '--no-first-run', '--disable-gpu', '--autoplay-policy=no-user-gesture-required',
  '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' });

let target = null;
for (let i = 0; i < 60 && !target; i++) {
  try {
    const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    target = l.find((x) => x.type === 'page') || null;
  } catch (e) { }
  if (!target) await sleep(250);
}
const sock = new WebSocket(target.webSocketDebuggerUrl);
let mid = 0; const pend = new Map();
await new Promise((r) => { sock.onopen = r; });
sock.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) {
    const { res, rej } = pend.get(m.id); pend.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
  }
};
const send = (m, p) => new Promise((res, rej) => {
  const id = ++mid; pend.set(id, { res, rej });
  sock.send(JSON.stringify({ id, method: m, params: p || {} }));
});
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: false });
  if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 300) };
  return r.result.value;
};

/* 真正按下一次空格（keyDown + keyUp），带 proper 修饰键信息 */
async function pressSpace() {
  const base = { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32,
    text: ' ', unmodifiedText: ' ' };
  await send('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
  await sleep(60);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  await sleep(320);
}
/* 把鼠标移到指定坐标（真悬停，:hover 才会生效） */
async function moveMouse(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 });
  await sleep(180);
}

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log((pass ? '  PASS  ' : '  FAIL  ') + name + (detail ? '   → ' + detail : ''));
};

/* ============================================================
 * 一、音乐馆页面：按空格 = 播放 / 暂停
 * ============================================================ */
console.log('\n【一】音乐馆页面 /music/');
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/music/` });
await sleep(5000);

/* 用静音 WAV 当音源，避免依赖外网：直接把核心队列塞成这一首 */
await ev(`(function(){
  var P = window.fomalPlayer;
  if(!P) return 'no bus';
  P.setQueue({ owner:'page', name:'测试', list:[{ id:'t1', name:'测试曲', artist:'测试员', url:'/__silent.wav', cover:'', pic:'' }] });
  P.playIndex(0);
  return 'ok';
})()`);
await sleep(1200);

let playing = await ev(`window.fomalPlayer ? window.fomalPlayer.isPlaying() : null`);
check('音乐页：初始状态为播放中', playing === true, 'isPlaying=' + playing);

/* 空格 → 暂停 */
await moveMouse(700, 500);            /* 页面空白处，不在侧栏面板上 */
await pressSpace();
let afterPause = await ev(`window.fomalPlayer.isPlaying()`);
check('音乐页：按空格 → 暂停', afterPause === false, 'isPlaying=' + afterPause);

/* 空格 → 继续播放 */
await pressSpace();
let afterResume = await ev(`window.fomalPlayer.isPlaying()`);
check('音乐页：再按空格 → 继续播放', afterResume === true, 'isPlaying=' + afterResume);

/* 搜索框里按空格：应该打出空格，不该动播放状态 */
await ev(`(function(){ var s=document.getElementById('mp-search'); if(s){ s.focus(); } return s? 'focused':'no input'; })()`);
await sleep(200);
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' });
await sleep(120);
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
await sleep(400);
const searchVal = await ev(`(function(){ var s=document.getElementById('mp-search'); return s? s.value : ''; })()`);
const playingAfterSearch = await ev(`window.fomalPlayer.isPlaying()`);
check('音乐页：搜索框里按空格 → 打出空格且不触发播放', searchVal === ' ' && playingAfterSearch === true,
  'value=' + JSON.stringify(searchVal) + ' isPlaying=' + playingAfterSearch);
await ev(`(function(){ var s=document.getElementById('mp-search'); if(s){ s.value=''; s.blur(); } return 1; })()`);

/* ============================================================
 * 二、别的页面：鼠标停在胶囊上 → 按空格 = 播放 / 暂停
 * ============================================================ */
console.log('\n【二】首页：鼠标停在左下角胶囊上');
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
await sleep(5000);

/* 让核心放起来，胶囊就会出现 */
await ev(`(function(){
  var P = window.fomalPlayer;
  if(!P) return 'no bus';
  P.setQueue({ owner:'side', name:'测试', list:[{ id:'t1', name:'测试曲', artist:'测试员', url:'/__silent.wav', cover:'', pic:'' }] });
  P.playIndex(0);
  return 'ok';
})()`);
await sleep(1500);

const miniInfo = await ev(`(function(){
  var m=document.getElementById('ds-mini');
  if(!m) return null;
  var r=m.getBoundingClientRect();
  return JSON.stringify({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),on:m.classList.contains('is-on')});
})()`);
check('首页：胶囊已出现', !!miniInfo && JSON.parse(miniInfo).on, miniInfo || 'no #ds-mini');

if (miniInfo) {
  const r = JSON.parse(miniInfo);
  /* 鼠标挪到胶囊中心（此时它已经展开，右列按键可见） */
  await moveMouse(Math.round(r.x + r.w / 2), Math.round(r.y + r.h / 2));

  const hoverHit = await ev(`(function(){
    var m=document.getElementById('ds-mini');
    return m ? m.matches(':hover') : 'no mini';
  })()`);
  check('首页：鼠标确实悬停在胶囊上（:hover 命中）', hoverHit === true, ':hover=' + hoverHit);

  const p1 = await ev(`window.fomalPlayer.isPlaying()`);
  await pressSpace();
  const p2 = await ev(`window.fomalPlayer.isPlaying()`);
  check('首页：悬停胶囊按空格 → 暂停', p1 === true && p2 === false, `before=${p1} after=${p2}`);

  await pressSpace();
  const p3 = await ev(`window.fomalPlayer.isPlaying()`);
  check('首页：再按空格 → 继续播放', p3 === true, 'isPlaying=' + p3);
}

/* ============================================================
 * 三、别的页面：鼠标不在播放器上 → 空格不响应
 * ============================================================ */
console.log('\n【三】首页：鼠标不在播放器上');
await moveMouse(720, 300);            /* 页面中间空白处 */
const p4 = await ev(`window.fomalPlayer.isPlaying()`);
await pressSpace();
const p5 = await ev(`window.fomalPlayer.isPlaying()`);
check('首页：鼠标不在播放器上按空格 → 不响应', p4 === p5, `before=${p4} after=${p5}`);

/* 页面有没有被空格滚走：鼠标不在播放器上时，空格应该保留浏览器默认的翻页滚动
   （我们没接管，就别去拦它）。所以这里只断言「空格没被播放器逻辑抢走」，
   滚动本身是正常的浏览器行为。 */
const scrollY = await ev(`window.scrollY`);
console.log(`  INFO  首页：空格后 scrollY=${scrollY}（浏览器默认翻页，未被播放器逻辑拦截）`);

/* ============================================================
 * 四、侧栏悬停面板：鼠标停在面板上 → 空格 = 播放 / 暂停
 * ============================================================ */
console.log('\n【四】首页：鼠标停在侧栏播放器面板上');
/* 侧栏面板是悬停卡片才弹出来的。卡片可能在视口外（首页很长），
   先把它滚进视口再悬停。 */
await ev(`(function(){
  var c=document.getElementById('daily-say');
  if(!c) return 0;
  c.scrollIntoView({block:'center'});
  return 1;
})()`);
await sleep(800);
const cardBox = await ev(`(function(){
  var c=document.getElementById('daily-say');
  if(!c) return null;
  var r=c.getBoundingClientRect();
  return JSON.stringify({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),
    inView: r.top>=0 && r.bottom<=window.innerHeight});
})()`);
check('首页：侧栏卡片已滚进视口', !!cardBox && JSON.parse(cardBox).inView, cardBox || 'no #daily-say');
if (cardBox) {
  const cb = JSON.parse(cardBox);
  /* 先移到别处，再移回卡片，确保产生一次真实的 mouseenter */
  await moveMouse(Math.round(cb.x + cb.w / 2), Math.max(2, Math.round(cb.y - 40)));
  await sleep(200);
  await moveMouse(Math.round(cb.x + cb.w / 2), Math.round(cb.y + cb.h / 2));
  await sleep(900);

  /* 关键场景（10-31 补）：鼠标停在**每日一言卡片**上，面板浮在卡片上方，
     鼠标并不在面板里 —— 这时按空格也必须生效。 */
  const cardHover = await ev(`(function(){
    var c=document.getElementById('daily-say');
    return c ? c.matches(':hover') : 'no card';
  })()`);
  check('首页：鼠标悬停在每日一言卡片上（:hover 命中）', cardHover === true, ':hover=' + cardHover);

  const d1 = await ev(`window.fomalPlayer.isPlaying()`);
  await pressSpace();
  const d2 = await ev(`window.fomalPlayer.isPlaying()`);
  check('首页：悬停每日一言卡片按空格 → 播放/暂停切换', d1 !== d2, `before=${d1} after=${d2}`);

  /* 再把鼠标挪到弹出的面板上，验证面板本身也生效 */
  const panelBox = await ev(`(function(){
    var p=document.getElementById('ds-player');
    if(!p) return null;
    var r=p.getBoundingClientRect();
    return JSON.stringify({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),open:p.classList.contains('is-open')});
  })()`);
  check('首页：侧栏面板已弹出', !!panelBox && JSON.parse(panelBox).open, panelBox || 'no #ds-player');
  if (panelBox) {
    const pb = JSON.parse(panelBox);
    await moveMouse(Math.round(pb.x + pb.w / 2), Math.round(pb.y + pb.h / 2));
    const panelHover = await ev(`(function(){
      var p=document.getElementById('ds-player');
      return p ? p.matches(':hover') : 'no panel';
    })()`);
    check('首页：鼠标确实悬停在面板上（:hover 命中）', panelHover === true, ':hover=' + panelHover);

    const q1 = await ev(`window.fomalPlayer.isPlaying()`);
    await pressSpace();
    const q2 = await ev(`window.fomalPlayer.isPlaying()`);
    check('首页：悬停面板按空格 → 播放/暂停切换', q1 !== q2, `before=${q1} after=${q2}`);
  }
} else {
  check('首页：找到侧栏卡片', false, 'no #daily-say');
}

console.log('\n──────────────────────────────');
const failed = results.filter((r) => !r.pass);
console.log(`合计 ${results.length} 项，通过 ${results.length - failed.length}，失败 ${failed.length}`);
failed.forEach((f) => console.log('  ✗ ' + f.name + '  ' + (f.detail || '')));

/* ============================================================
 * 五、音乐页上：空格必须走「音乐页语义」，不能被侧栏抢走
 *    （音乐页的侧栏公告卡目前是 0×0 空壳，面板弹不出来，
 *      所以这里直接把侧栏的两个 handler 顶上来做对抗测试：
 *      人工在侧栏 handler 上挂一个标记，若空格派发到它，
 *      说明优先级串了。）
 * ============================================================ */
console.log('\n【五】音乐页：空格派发不能被侧栏抢走（优先级对抗测试）');
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/music/` });
await sleep(5000);
await ev(`(function(){
  var P=window.fomalPlayer;
  P.setQueue({ owner:'page', name:'测试', list:[{ id:'t1', name:'测试曲', artist:'测试员', url:'/__silent.wav', cover:'', pic:'' }] });
  P.playIndex(0);
  return 'ok';
})()`);
await sleep(1200);

/* 侧栏面板/胶囊在音乐页上压根弹不出来（侧栏公告卡是 0×0 空壳，
   且音乐页正文有自己的 stacking context 盖在上面），
   所以这里不去模拟悬停，而是**直接查核心的派发顺序**：
   往核心里塞两个探针 handler，用**互不相同**的优先级，
   看空格到底先派给了谁（第一个 return 后，后面的就不会被调用）。 */
const probe = await ev(`(function(){
  var P=window.fomalPlayer;
  if(!P || !P.registerSpace) return 'no registerSpace';
  window.__probe=[];
  /* 低优先级探针（25）：模拟侧栏那一档 */
  P.registerSpace({ el:null, scope:function(){ return !!document.getElementById('mp-page'); }, priority:25,
    fn:function(){ window.__probe.push('low-25'); } });
  /* 高优先级探针（35）：模拟音乐页那一档（真实音乐页 handler 是 30，
     所以这个探针会抢在它前面 —— 用来验证排序本身是通的） */
  P.registerSpace({ el:null, scope:function(){ return !!document.getElementById('mp-page'); }, priority:35,
    fn:function(){ window.__probe.push('high-35'); } });
  return 'ok';
})()`);
await sleep(200);
await pressSpace();
const probeResult = await ev(`JSON.stringify(window.__probe||[])`);
check('核心派发：高优先级先于低优先级，且只派发一次',
  probe === 'ok' && probeResult === '["high-35"]', '探针=' + probeResult);

/* ============================================================
 * 六、悬停胶囊的播放键：空格交给按钮自己，不能双触发
 * ============================================================ */
console.log('\n【六】首页：悬停胶囊上的播放键（不重复触发）');
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
await sleep(5000);
await ev(`(function(){
  var P=window.fomalPlayer;
  P.setQueue({ owner:'side', name:'测试', list:[{ id:'t1', name:'测试曲', artist:'测试员', url:'/__silent.wav', cover:'', pic:'' }] });
  P.playIndex(0);
  return 'ok';
})()`);
await sleep(1500);
/* 悬停胶囊让它展开，露出右列按键 */
const mi = await ev(`(function(){
  var m=document.getElementById('ds-mini');
  if(!m) return null;
  var r=m.getBoundingClientRect();
  return JSON.stringify({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)});
})()`);
if (mi) {
  const mr = JSON.parse(mi);
  await moveMouse(Math.round(mr.x + 20), Math.round(mr.y + mr.h / 2));   /* 悬停 → 胶囊展开 */
  await sleep(700);
  const btn = await ev(`(function(){
    var b=document.querySelector('#ds-mini .dm-play');
    if(!b) return null;
    var r=b.getBoundingClientRect();
    return JSON.stringify({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)});
  })()`);
  check('首页：胶囊展开后播放键可见', !!btn, btn || 'no .dm-play');
  if (btn) {
    const br = JSON.parse(btn);
    await moveMouse(Math.round(br.x + br.w / 2), Math.round(br.y + br.h / 2));
    const onBtn = await ev(`(function(){
      var b=document.querySelector('#ds-mini .dm-play');
      return b ? b.matches(':hover') : 'none';
    })()`);
    check('首页：鼠标悬停在播放键上', onBtn === true, ':hover=' + onBtn);
    /* 按键有焦点时浏览器会自己补 click（keyup 时），所以焦点不在按键上时
       我们才接管 —— 这里先点一下让按钮拿到焦点，再按空格，
       期望：只翻一次（不是翻两次）。 */
    const before = await ev(`window.fomalPlayer.isPlaying()`);
    await pressSpace();
    const after = await ev(`window.fomalPlayer.isPlaying()`);
    check('首页：悬停播放键按空格 → 状态只翻一次（没双触发）', before !== after, `before=${before} after=${after}`);
  }
}

console.log('\n──────────────────────────────');
const failed2 = results.filter((r) => !r.pass);
console.log(`最终合计 ${results.length} 项，通过 ${results.length - failed2.length}，失败 ${failed2.length}`);
failed2.forEach((f) => console.log('  ✗ ' + f.name + '  ' + (f.detail || '')));

/* ============================================================
 * 七、侧栏被隐藏的页面（/about/）：每日一言卡片整个不存在，
 *     空格不该被误触发（核心要用 getElementById 现取，元素没了就跳过）
 * ============================================================ */
console.log('\n【七】/about/ 页：侧栏被主题隐藏，不该误触发');
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/about/` });
await sleep(5000);
const aboutCard = await ev(`(function(){
  var c=document.getElementById('daily-say');
  if(!c) return 'none';
  var r=c.getBoundingClientRect();
  return JSON.stringify({w:Math.round(r.width),h:Math.round(r.height),
    asideDisplay:getComputedStyle(document.getElementById('aside-content')).display});
})()`);
console.log(`  INFO  /about/ 侧栏状态: ${aboutCard}`);
await ev(`(function(){
  var P=window.fomalPlayer;
  P.setQueue({ owner:'side', name:'测试', list:[{ id:'t1', name:'测试曲', artist:'测试员', url:'/__silent.wav', cover:'', pic:'' }] });
  P.playIndex(0);
  return 'ok';
})()`);
await sleep(1200);
/* 鼠标随便放个位置（页面中部），此时不该有任何播放器 UI 被悬停 */
await moveMouse(720, 300);
const b1 = await ev(`window.fomalPlayer.isPlaying()`);
await pressSpace();
const b2 = await ev(`window.fomalPlayer.isPlaying()`);
check('/about/：鼠标不在任何播放器上 → 空格不响应（不误触发）', b1 === b2, `before=${b1} after=${b2}`);

console.log('\n──────────────────────────────');
const failed3 = results.filter((r) => !r.pass);
console.log(`最终合计 ${results.length} 项，通过 ${results.length - failed3.length}，失败 ${failed3.length}`);
failed3.forEach((f) => console.log('  ✗ ' + f.name + '  ' + (f.detail || '')));

child.kill('SIGKILL');
server.close();
process.exit(failed3.length ? 1 : 0);
