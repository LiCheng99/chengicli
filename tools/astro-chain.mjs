// 沿 iframe 祖先链逐层测宽度/max-width/背景，定位「深色卡片比白卡片窄」的约束点
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 4444;
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const CDP = 9334;
const VW = Number(process.argv[2] || 1256);

const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--user-data-dir=' + process.env.TEMP + '/edge-astro-chain',
  '--remote-debugging-port=' + CDP, '--window-size=' + VW + ',1000', 'about:blank'
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
await send('Emulation.setDeviceMetricsOverride', { width: VW, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:' + PORT + '/box/astronomy/' });
await sleep(3500);
await ev(`(function(){var f=document.getElementById('voyager-frame');return !!(f&&f.contentDocument&&f.contentDocument.querySelector('.wrap'));})()`);
await sleep(600);

const m = await ev(`(function(){
  var f=document.getElementById('voyager-frame');
  var out={vw:window.innerWidth, chain:[], wrap:null};
  // 祖先链：从 iframe 一路到 body
  var el=f;
  while(el && el!==document.documentElement){
    var r=el.getBoundingClientRect(); var cs=getComputedStyle(el);
    out.chain.push({
      tag:el.tagName.toLowerCase(),
      id:el.id||'', cls:(el.className&&el.className.toString?el.className.toString():'').slice(0,40),
      w:Math.round(r.width), x:Math.round(r.x),
      maxW:cs.maxWidth, minW:cs.minWidth, pad:cs.paddingLeft+'/'+cs.paddingRight,
      bg:(cs.backgroundColor||'')+(cs.backgroundImage&&cs.backgroundImage!=='none'?' [img]':''),
      disp:cs.display
    });
    el=el.parentElement;
  }
  // iframe 内部 .wrap
  try{
    var d=f.contentDocument; var w=d.querySelector('.wrap');
    var rw=w.getBoundingClientRect(); var wcs=getComputedStyle(w);
    out.wrap={w:Math.round(rw.width),x:Math.round(rw.x),maxW:wcs.maxWidth,margin:wcs.marginLeft+'/'+wcs.marginRight,pad:wcs.paddingLeft+'/'+wcs.paddingRight};
    out.iframeInner=f.contentWindow.innerWidth;
  }catch(e){ out.wrap={err:String(e)}; }
  return JSON.stringify(out);
})()`);

const o = JSON.parse(m);
console.log('===== 视口 ' + o.vw + ' =====');
console.log('iframe 内部宽:', o.iframeInner, ' .wrap:', JSON.stringify(o.wrap));
console.log('--- iframe 外层祖先链（从 iframe 向上）---');
o.chain.forEach(c => {
  console.log(
    (c.tag + (c.id ? '#' + c.id : '') + (c.cls ? '.' + c.cls.split(' ')[0] : '')).padEnd(28),
    'w=' + String(c.w).padEnd(5), 'x=' + String(c.x).padEnd(5),
    'maxW=' + String(c.maxW).padEnd(8), 'pad=' + c.pad.padEnd(14),
    'bg=' + c.bg.slice(0, 24)
  );
});

ws.close(); edge.kill();
process.exit(0);
