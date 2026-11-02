/**
 * 唱片机页面截图 + 布局自检。用 mp-* 选择器（新版），覆盖 桌面/深色/手机。
 *   node tools/mpshot.mjs [width] [tag] [height]
 *   tag: light | dark | mobile（mobile 会把宽度强制 390 并带手机头栏）
 * 产物：/tmp/mp-<tag>.png 全页 + /tmp/mp-<tag>-deck.png 唱盘特写
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = process.argv[2] || 'http://127.0.0.1:4457/music/';
let W = parseInt(process.argv[3] || '1440', 10);
const TAG = process.argv[4] || 'light';
const H = parseInt(process.argv[5] || '1100', 10);
if (TAG === 'mobile') W = 390;

const PORT = 9561 + Math.floor(Math.random() * 30);
const PROFILE = path.join(os.tmpdir(), 'edge-mp-' + Date.now());
spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE,
  '--no-first-run', '--disable-gpu', '--window-size=' + W + ',' + H, 'about:blank'], { stdio: 'ignore' });

const sleep = (m) => new Promise((r) => setTimeout(r, m));
async function ws() {
  for (let i = 0; i < 60; i++) {
    try {
      const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const p = l.find((t) => t.type === 'page');
      if (p && p.webSocketDebuggerUrl) return p.webSocketDebuggerUrl;
    } catch (e) {}
    await sleep(300);
  }
  throw new Error('no target');
}
const sock = new WebSocket(await ws());
let id = 0; const pend = new Map();
await new Promise((res, rej) => { sock.onopen = res; sock.onerror = rej; });
sock.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
};
const send = (m, p) => new Promise((res, rej) => { const mid = ++id; pend.set(mid, { res, rej }); sock.send(JSON.stringify({ id: mid, method: m, params: p || {} })); });
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 300) };
  return r.result.value;
};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: W < 700 });
await send('Page.navigate', { url: URL });
await sleep(9000);                       // 等音源加载（含一次 /api/music）
if (TAG.startsWith('dark')) { await ev(`document.documentElement.setAttribute('data-theme','dark')`); await sleep(1400); }

const info = await ev(`(function(){
  function R(sel){var e=document.querySelector(sel);if(!e)return null;var r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)};}
  var page=document.querySelector('.mp-page');
  var list=document.getElementById('mp-list');
  var rows=list?list.querySelectorAll('.mp-row').length:0;
  var deckCard=R('.mp-deck-card'), deck=R('.mp-deck'), disc=R('.mp-disc'), arm=R('.mp-arm'), keys=R('.mp-keys');
  var cs=page?getComputedStyle(page):null;
  return JSON.stringify({
    pageW: page?Math.round(page.getBoundingClientRect().width):0,
    pageMaxW: cs?cs.maxWidth:null,
    deckCard: deckCard, deck: deck, disc: disc, arm: arm, keys: keys,
    rows: rows,
    docH: document.documentElement.scrollHeight,
    title: (document.getElementById('mp-name')||{}).textContent,
    plname: (document.getElementById('mp-plname')||{}).textContent
  });
})()`);
console.log('INFO', info);

const lm = await send('Page.getLayoutMetrics');
const cw = Math.ceil(lm.cssContentSize.width), ch = Math.ceil(lm.cssContentSize.height);
const full = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: cw, height: ch, scale: 1 } });
fs.writeFileSync(path.join(os.tmpdir(), 'mp-' + TAG + '.png'), Buffer.from(full.data, 'base64'));
console.log('SHOT', path.join(os.tmpdir(), 'mp-' + TAG + '.png'), cw + 'x' + ch);

/* 唱盘特写：放大截 .mp-deck-card，专门看唱臂与唱盘的贴合 */
const deck = JSON.parse(info).deckCard || JSON.parse(info).deck;
if (deck) {
  const sy = (await send('Page.getLayoutMetrics')).cssContentSize; // 占位
  const clip = { x: Math.max(0, deck.x - 20), y: Math.max(0, deck.y - 20), width: deck.w + 40, height: deck.h + 40, scale: 2 };
  try {
    const d = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip });
    fs.writeFileSync(path.join(os.tmpdir(), 'mp-' + TAG + '-deck.png'), Buffer.from(d.data, 'base64'));
    console.log('DECK', path.join(os.tmpdir(), 'mp-' + TAG + '-deck.png'));
  } catch (e) { console.log('DECK ERR', String(e).slice(0, 120)); }
}
process.exit(0);
