/**
 * 验证「首次进入首页，每日一言就能播放」—— 不先访问 /music/。
 * 启动 mpserve.cjs（静态站 + /api/music 全有，等同线上 Nginx 反代），
 * 直接开首页，悬停每日一言卡片 → 点播放，看是否真的播起来（owner='side'）。
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const ROOT = 'D:/BaiduSyncdisk/LICHENG/hexo';
const PORT = 4521;
const BASE = `http://127.0.0.1:${PORT}`;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 启动 mpserve.cjs ----
const srv = spawn('node', [path.join(ROOT, 'tools/mpserve.cjs'), String(PORT), '127.0.0.1'], {
  cwd: ROOT, stdio: 'ignore'
});
let healthOk = false;
for (let i = 0; i < 50 && !healthOk; i++) {
  try { const r = await fetch(`${BASE}/api/health`); healthOk = r.ok; } catch (e) {}
  if (!healthOk) await sleep(200);
}
if (!healthOk) { console.log('✗ mpserve 没起来'); srv.kill('SIGKILL'); process.exit(1); }
console.log('mpserve 就绪');

// ---- 启动 Edge CDP ----
const cport = 9930 + Math.floor(Math.random() * 15);
const child = spawn(EDGE, [
  '--headless=new', '--remote-debugging-port=' + cport,
  '--user-data-dir=' + os.tmpdir() + '\\edge-fl-' + Date.now(),
  '--no-first-run', '--disable-gpu', '--window-size=1440,1000',
  '--autoplay-policy=no-user-gesture-required', 'about:blank'
], { stdio: 'ignore' });

let target = null;
for (let i = 0; i < 60 && !target; i++) {
  try { const l = await (await fetch(`http://127.0.0.1:${cport}/json/list`)).json(); target = l.find((x) => x.type === 'page') || null; } catch (e) {}
  if (!target) await sleep(250);
}
const sock = new WebSocket(target.webSocketDebuggerUrl);
let mid = 0; const pend = new Map();
await new Promise((r) => { sock.onopen = r; });
sock.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') { console.log('⚠ 页面异常: ' + JSON.stringify(m.params.exceptionDetails && m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params).slice(0, 300)); }
  else if (m.method === 'Runtime.consoleAPICalled' && m.params && (m.params.type === 'error' || m.params.type === 'warning')) {
    const txt = (m.params.args || []).map((a) => a.value !== undefined ? a.value : (a.description || '')).join(' ');
    if (txt) console.log('⚠ 控制台[' + m.params.type + ']: ' + txt.slice(0, 200));
  }
};
const send = (m, p) => new Promise((res, rej) => { const id = ++mid; pend.set(id, { res, rej }); sock.send(JSON.stringify({ id, method: m, params: p || {} })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 240) }; return r.result.value; };

const results = [];
const check = (name, pass, detail) => { results.push({ name, pass: !!pass, detail: detail || '' }); console.log((pass ? '✓ ' : '✗ ') + name + (detail ? '  ' + detail : '')); };

try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  // 全新 profile 的 localStorage 本来就是空的 → 已经是「第一次进站」场景，无需手动清缓存
  await send('Page.navigate', { url: BASE + '/' });
  await sleep(5000);

  // 核心是否就绪
  check('播放核心 fomalPlayer 存在', await ev(`!!window.fomalPlayer`) === true);

  // 每日一言卡片是否存在且可见
  const ciRaw = await ev(`(function(){
    var c=document.getElementById('daily-say');
    if(!c) return JSON.stringify({ok:false});
    var r=c.getBoundingClientRect();
    return JSON.stringify({ok:true, x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height),
      vis:getComputedStyle(c).visibility, disp:getComputedStyle(c).display});
  })()`);
  let ci = {};
  if (typeof ciRaw === 'string') { try { ci = JSON.parse(ciRaw); } catch (e) {} }
  else if (ciRaw && typeof ciRaw === 'object') { ci = ciRaw; }
  check('首页存在可见的每日一言卡片', ci && ci.ok && ci.w > 0 && ci.h > 0 && ci.disp !== 'none', typeof ciRaw === 'string' ? ciRaw : JSON.stringify(ci));

  // 悬停卡片 → 面板出现（openPanel(false)，不自动播）。
  // 先滚动卡片进视口，再真实鼠标悬停；若因祖先 visibility:hidden 挡了命中（headless 偶发），
  // 退化成直接派发 mouseenter 事件，驱动完全相同的代码路径。
  const rcRaw = await ev(`(function(){
    var c=document.getElementById('daily-say');
    if(!c) return null;
    c.scrollIntoView({block:'center'});
    var r=c.getBoundingClientRect();
    return JSON.stringify({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)});
  })()`);
  let rc = rcRaw ? JSON.parse(rcRaw) : null;
  if (rc && rc.w > 0 && rc.h > 0) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(rc.x + rc.w / 2), y: Math.round(rc.y + rc.h / 2), buttons: 0 });
    await sleep(900);
  }
  let panelOpen = await ev(`!!(document.getElementById('ds-player') && document.getElementById('ds-player').classList.contains('is-open'))`);
  if (!panelOpen) {
    await ev(`(function(){ var c=document.getElementById('daily-say'); if(c) c.dispatchEvent(new MouseEvent('mouseenter')); return 1; })()`);
    await sleep(600);
    panelOpen = await ev(`!!(document.getElementById('ds-player') && document.getElementById('ds-player').classList.contains('is-open'))`);
  }
  check('悬停后播放器面板出现', panelOpen === true);

  // 关键：此刻还没访问过 /music/，核心队列应该是空的（第一次进站）
  const queueBefore = await ev(`(window.fomalPlayer.queue()||[]).length`);
  check('播放前核心队列为空（确认没走过音乐馆）', queueBefore === 0, 'queue=' + queueBefore);

  // 等歌单先拉下来（悬停触发的 loadPlaylist(false)），确认 pl 已就绪但还没交给核心
  let preLen = 0;
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    preLen = await ev(`(window.fomalMusic?window.fomalMusic.playlist().length:0)`);
    if (preLen > 0) break;
  }

  // 刻意把面板关掉（模拟：先悬停看过、鼠标移开后，再回来点喇叭）。
  // 这样点击会走 openPanel(true) 分支 —— 旧代码在「歌单已加载但队列还未交接」时
  // 直接 playIndex(0) 打空队列 no-op，正是「点了没反应、卡获取音乐」的病根。
  await ev(`(function(){ var c=document.getElementById('daily-say'); if(c) c.dispatchEvent(new MouseEvent('mouseleave')); return 1; })()`);
  await sleep(700);
  const closedPanel = await ev(`!(document.getElementById('ds-player') && document.getElementById('ds-player').classList.contains('is-open'))`);
  check('刻意关掉面板以走 openPanel(true) 路径', closedPanel === true, 'closed=' + closedPanel);

  // 点卡片上的喇叭键（= 用户点播放）：面板已关 → 走 openPanel(true) → 先把侧栏歌单交给核心再播
  await ev(`(function(){
    if(window.fomalPlayer&&!window.__sq){
      window.__sq=window.fomalPlayer.setQueue;
      window.__sqCalls=0;
      window.fomalPlayer.setQueue=function(o){ window.__sqCalls=(window.__sqCalls||0)+1; return window.__sq(o); };
    }
    window.__dsDiag = {
      busNull: !window.fomalPlayer,
      isOpen: !!(document.getElementById('ds-player') && document.getElementById('ds-player').classList.contains('is-open')),
      panelExists: !!document.getElementById('ds-player'),
      plLen: (window.fomalMusic?window.fomalMusic.playlist().length:0)
    };
    var c=document.getElementById('daily-say'); var b=c&&c.querySelector('.ds-music');
    window.__dsDiag.hasBtn = !!b;
    if(b) b.click();
    return !!b;
  })()`);

  // 点击后立刻看一眼：队列/owner 是否真的交接了（区分「逻辑没跑」vs「自动播放被拦」）
  await sleep(1500);
  const afterClick = await ev(`(function(){
    var P=window.fomalPlayer;
    var d = window.__dsDiag||{};
    return JSON.stringify({ owner:P.owner(), q:(P.queue()||[]).length, playing:P.isPlaying(),
      hasSetQueue: typeof P.setQueue, sqCalls: (P.setQueue&&window.__sqCalls)||0,
      busNull:d.busNull, isOpenAtClick:d.isOpen, panelExisted:d.panelExists, btnExisted:d.hasBtn });
  })()`);
  console.log('点击后状态: ' + afterClick);

  // 等网络：qq_pl 拉歌单 + qq_url 取流 + 真正播起来
  let played = false, owner = '', plLen = 0;
  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    const sRaw = await ev(`(function(){
      var P=window.fomalPlayer;
      return JSON.stringify({ playing:P.isPlaying(), owner:P.owner(), q:(P.queue()||[]).length,
        pl:(window.fomalMusic?window.fomalMusic.playlist().length:-1) });
    })()`);
    let s = {}; if (typeof sRaw === 'string') { try { s = JSON.parse(sRaw); } catch (e) {} }
    owner = s.owner; plLen = s.pl;
    if (s.playing) { played = true; break; }
  }
  check('首次进首页即从每日一言播起来（不再卡「获取音乐」）', played === true, 'playing=' + played);
  check('播放源是侧栏队列 owner=side', owner === 'side', 'owner=' + owner);
  check('歌单通过 /api/music 取到（曲目数>0）', plLen > 0, 'plLen=' + plLen);

  // 顺带确认：切歌也正常（验证 resolve 在每首上都工作，不只在第 1 首）
  await ev(`window.fomalPlayer.next()`);
  let played2 = false;
  for (let i = 0; i < 12; i++) { await sleep(1000); if (await ev(`window.fomalPlayer.isPlaying()`)) { played2 = true; break; } }
  check('切到下一首仍能播（resolve 通用）', played2 === true);

} catch (err) {
  console.log('测试异常：' + (err && err.message));
} finally {
  sock.close();
  child.kill('SIGKILL');
  srv.kill('SIGKILL');
}

const failed = results.filter((r) => !r.pass);
console.log(`\n合计 ${results.length} 项，通过 ${results.length - failed.length}，失败 ${failed.length}`);
failed.forEach((f) => console.log('  ✗ ' + f.name + '  ' + (f.detail || '')));
process.exit(failed.length ? 1 : 0);
