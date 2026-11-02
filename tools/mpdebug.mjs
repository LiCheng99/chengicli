import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = process.argv[2] || 'http://127.0.0.1:4457/music/';
const TAG = process.argv[3] || 'light';
const DARK = process.argv[4] === '1';
let W = parseInt(process.argv[5] || '1440', 10);
if (TAG === 'mobile') W = 390;
const PORT = 9561 + Math.floor(Math.random() * 30);
const PROFILE = os.tmpdir() + '\\edge-dbg-' + Date.now();
spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, '--no-first-run', '--disable-gpu', '--window-size=' + W + ',1100', 'about:blank'], { stdio: 'ignore' });
const sleep = (m) => new Promise((r) => setTimeout(r, m));
async function ws() { for (let i = 0; i < 60; i++) { try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); const p = l.find((t) => t.type === 'page'); if (p && p.webSocketDebuggerUrl) return p.webSocketDebuggerUrl; } catch (e) {} await sleep(300); } throw new Error('no target'); }
const sock = new WebSocket(await ws()); let id = 0; const pend = new Map();
await new Promise((res, rej) => { sock.onopen = res; sock.onerror = rej; });
sock.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } };
const send = (m, p) => new Promise((res, rej) => { const mid = ++id; pend.set(mid, { res, rej }); sock.send(JSON.stringify({ id: mid, method: m, params: p || {} })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return 'ERR ' + JSON.stringify(r.exceptionDetails).slice(0, 200); return r.result.value; };
await send('Page.enable'); await send('Runtime.enable');
const logs = [];
sock.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.method === 'Runtime.consoleAPICalled') logs.push((m.params.args || []).map((a) => a.value).join(' ')); if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(m.params.exceptionDetails).slice(0, 200)); });
await send('Page.navigate', { url: URL }); await sleep(7000);
if (DARK) { await ev(`document.documentElement.setAttribute('data-theme','dark')`); await sleep(1400); }
console.log('href=', await ev('location.href'));
console.log('loaded=', await ev('document.querySelector(".mp-page")?("YES rows="+document.querySelectorAll(".mp-row").length):"NO mp-page"'));
console.log('readyState=', await ev('document.readyState'));
console.log('bodyLen=', await ev('document.body ? document.body.innerHTML.length : -1'));
console.log('mpPageById=', await ev('!!document.getElementById("mp-page")'));
console.log('mpPageByClass=', await ev('!!document.querySelector(".mp-page")'));
console.log('articleContainer=', await ev('!!document.getElementById("article-container")'));
console.log('mainInner=', await ev('document.querySelector("#article-container") ? document.querySelector("#article-container").innerHTML.length : -1'));
console.log('LOG:', logs.slice(0, 10).join(' | '));
const geo = await ev(`(function(){
  function R(s){var e=document.querySelector(s);if(!e)return null;var r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),cx:Math.round(r.x+r.width/2),cy:Math.round(r.y+r.height/2)};}
  var d=document.querySelector('.mp-disc'); var dr=d?d.getBoundingClientRect():null;
  return JSON.stringify({
    disc: dr?{x:Math.round(dr.x),y:Math.round(dr.y),w:Math.round(dr.width),h:Math.round(dr.height),cx:Math.round(dr.x+dr.width/2),cy:Math.round(dr.y+dr.height/2)}:null,
    base: R('.mp-arm-base'), head: R('.mp-arm-head'), rod: R('.mp-arm-rod'),
    deck: R('.mp-deck')
  });
})()`);
console.log('GEO', geo);
const lm = await send('Page.getLayoutMetrics');
const cw = Math.ceil(lm.cssContentSize.width), ch = Math.ceil(lm.cssContentSize.height);
const sh = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: cw, height: Math.min(ch, 6000), scale: 1 } });
fs.writeFileSync(os.tmpdir() + '\\mp-' + TAG + '.png', Buffer.from(sh.data, 'base64'));
console.log('SHOT mp-' + TAG + '.png', cw + 'x' + ch);
const drect = await ev(`(function(){var e=document.querySelector('.mp-deck-card');if(!e)return null;var r=e.getBoundingClientRect();return JSON.stringify({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)});})()`);
if (drect) { const d = JSON.parse(drect); const dc = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: Math.max(0, d.x - 24), y: Math.max(0, d.y - 24), width: d.w + 48, height: d.h + 48, scale: 2 } }); fs.writeFileSync(os.tmpdir() + '\\mp-' + TAG + '-deck.png', Buffer.from(dc.data, 'base64')); console.log('DECK mp-' + TAG + '-deck.png'); }
process.exit(0);
