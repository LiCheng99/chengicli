// 截图对比：捕获天文馆页当前渲染 + 报告各层宽度
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';

const PORT = 4444;
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const CDP = 9335;
const VW = Number(process.argv[2] || 1256);
const OUT = process.argv[3] || process.env.TEMP + '/astro-now.png';

const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--user-data-dir=' + process.env.TEMP + '/edge-astro-shot',
  '--remote-debugging-port=' + CDP, 'about:blank'
], { stdio: 'ignore' });
await sleep(1800);

async function getWs() {
  const r = await fetch('http://127.0.0.1:' + CDP + '/json/list');
  const list = await r.json();
  return list.find(t => t.type === 'page').webSocketDebuggerUrl;
}
const ws = new WebSocket(await getWs());
await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } };
function send(method, params) { return new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); }); }
async function ev(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; }

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: VW, height: 1400, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:' + PORT + '/box/astronomy/' });
await sleep(4000);
await ev(`(function(){var f=document.getElementById('voyager-frame');return !!(f&&f.contentDocument&&f.contentDocument.querySelector('.wrap'));})()`);
await sleep(800);

const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
console.log('截图已保存:', OUT);

const m = await ev(`(function(){
  function box(el){ if(!el) return null; var r=el.getBoundingClientRect(); return {x:Math.round(r.x),w:Math.round(r.width)}; }
  var f=document.getElementById('voyager-frame');
  var page=document.getElementById('page');
  var wrap=null;
  try{ wrap=box(f.contentDocument.querySelector('.wrap')); }catch(e){}
  return JSON.stringify({ vw:window.innerWidth, page:box(page), iframe:box(f), wrap:wrap,
    pagePad: getComputedStyle(page).paddingLeft });
})()`);
console.log('宽度报告:', m);

ws.close(); edge.kill();
process.exit(0);
