// 天文馆页各层宽度实测：定位「深色卡片窄」到底卡在哪一层
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 4444;
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const CDP = 9333;

const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--user-data-dir=' + process.env.TEMP + '/edge-astro-measure',
  '--remote-debugging-port=' + CDP, '--window-size=1256,1000', 'about:blank'
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
await send('Page.navigate', { url: 'http://localhost:' + PORT + '/box/astronomy/' });
await sleep(3500);

// 等 iframe 内容加载
await ev(`(function(){var f=document.getElementById('voyager-frame');return !!(f&&f.contentDocument&&f.contentDocument.querySelector('.wrap'));})()`);
await sleep(800);

const m = await ev(`(function(){
  function box(el){ if(!el) return null; var r=el.getBoundingClientRect(); return {x:Math.round(r.x),w:Math.round(r.width)}; }
  var f=document.getElementById('voyager-frame');
  var layout=document.querySelector('#body-wrap .layout')||document.querySelector('.layout');
  var art=document.getElementById('article-container');
  var artParent=art&&art.parentElement;
  // iframe 内部
  var iw=null, wrap=null, bodyW=null;
  try{
    var d=f.contentDocument;
    var w=d.querySelector('.wrap');
    iw={w:Math.round(f.contentWindow.innerWidth)};
    wrap=box(w);
    bodyW=box(d.body);
  }catch(e){ iw={err:String(e)}; }
  return JSON.stringify({
    vw: window.innerWidth,
    layout: box(layout),
    layoutPadL: layout?getComputedStyle(layout).paddingLeft:null,
    layoutPadR: layout?getComputedStyle(layout).paddingRight:null,
    article: box(art),
    articleParent: box(artParent),
    asideDisplay: (function(){var a=document.getElementById('aside-content');return a?getComputedStyle(a).display:'none';})(),
    iframe: box(f),
    iframeInner: iw,
    wrapInIframe: wrap,
    bodyInIframe: bodyW
  });
})()`);

console.log('=== 天文馆页各层宽度实测 (视口 1256) ===');
const o = JSON.parse(m);
console.log('视口 vw           :', o.vw);
console.log('.layout          :', JSON.stringify(o.layout), ' padding:', o.layoutPadL, '/', o.layoutPadR);
console.log('#article-container:', JSON.stringify(o.article));
console.log('article 父容器    :', JSON.stringify(o.articleParent));
console.log('#aside-content   :', o.asideDisplay);
console.log('iframe 外框       :', JSON.stringify(o.iframe));
console.log('iframe 内部宽     :', JSON.stringify(o.iframeInner));
console.log('.wrap (红框卡片)  :', JSON.stringify(o.wrapInIframe));
console.log('iframe 内 body    :', JSON.stringify(o.bodyInIframe));

ws.close(); edge.kill();
process.exit(0);
