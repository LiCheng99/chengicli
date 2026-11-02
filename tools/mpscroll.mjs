/**
 * 验收「歌单列表滚到底后整页接着滚」：对照实验
 *   A) 鼠标在列表上，列表已到底 → 页面应跟着滚
 *   B) 鼠标在列表外 → 页面照滚（对照组，验证 wheel 机制本身有效）
 *   node tools/mpscroll.mjs
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'D:/BaiduSyncdisk/LICHENG/hexo/public';
const handler = (await import(pathToFileURL('D:/BaiduSyncdisk/LICHENG/hexo/api/music.js').href)).default;
const PORT = 4496;
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MIME = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon' };
function adapt(real){const o={};o.setHeader=(k,v)=>real.setHeader(k,v);o.status=c=>{real.statusCode=c;return o};o.json=x=>{real.setHeader('Content-Type','application/json; charset=utf-8');real.end(JSON.stringify(x));return o};o.end=d=>{real.end(d);return o};return o;}
const server = http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');
 if(u.pathname.startsWith('/api/')){let b='';req.on('data',c=>b+=c);req.on('end',async()=>{const q={};u.searchParams.forEach((v,k)=>q[k]=v);try{await handler({method:req.method,query:q,headers:req.headers,body:b},adapt(res));}catch(e){res.statusCode=500;res.end('{}')}});return;}
 let p=decodeURIComponent(u.pathname); if(p.endsWith('/'))p+='index.html';
 fs.readFile(path.normalize(path.join(ROOT,p)),(e,d)=>{if(e){res.statusCode=404;res.end('nf');return}res.setHeader('Content-Type',MIME[path.extname(p)]||'application/octet-stream');res.end(d)});});
await new Promise(r=>server.listen(PORT,r));
const sleep=m=>new Promise(r=>setTimeout(r,m));

const port = 9830 + Math.floor(Math.random()*10);
const child = spawn(EDGE, ['--headless=new','--remote-debugging-port='+port,'--user-data-dir='+os.tmpdir()+'\\edge-sc-'+Date.now(),
  '--no-first-run','--disable-gpu','--autoplay-policy=no-user-gesture-required','--window-size=1440,1000','about:blank'],{stdio:'ignore'});
let t=null; for(let i=0;i<60&&!t;i++){try{const l=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();t=l.find(x=>x.type==='page')||null;}catch(e){} if(!t)await sleep(250);}
const sock=new WebSocket(t.webSocketDebuggerUrl);let mid=0;const pend=new Map();
await new Promise(r=>{sock.onopen=r;});
sock.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const{res,rej}=pend.get(m.id);pend.delete(m.id);m.error?rej(new Error(JSON.stringify(m.error))):res(m.result);}};
const send=(m,p)=>new Promise((res,rej)=>{const id=++mid;pend.set(id,{res,rej});sock.send(JSON.stringify({id,method:m,params:p||{}}));});
const ev=async expr=>{const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true});if(r.exceptionDetails)return{__err:JSON.stringify(r.exceptionDetails).slice(0,300)};return r.result.value;};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/music/'}); await sleep(7000);

const info = await ev(`(function(){
  var l=document.getElementById('mp-list'); if(!l) return 'no list';
  l.scrollIntoView({block:'center'});
  var r=l.getBoundingClientRect();
  return JSON.stringify({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),
    overscroll:getComputedStyle(l).overscrollBehaviorY,
    scrollH:l.scrollHeight, clientH:l.clientHeight,
    docH:document.documentElement.scrollHeight, winH:window.innerHeight,
    maxListScroll:l.scrollHeight-l.clientHeight, pageMax:document.documentElement.scrollHeight-window.innerHeight});
})()`);
console.log('页面状态:', info);
const i = JSON.parse(info);
const cx = Math.round(i.x + i.w/2), cy = Math.round(i.y + i.h/2);

const wheel = async (x,y,dy) => {
  await send('Input.dispatchMouseEvent', { type:'mouseWheel', x, y, deltaX:0, deltaY:dy, pointerType:'mouse' });
  await sleep(700);
};

/* 对照组 B：鼠标在列表外（页面顶部区域），页面应能滚 */
await ev(`window.scrollTo(0,0); 1`);
await sleep(300);
const b0 = await ev(`Math.round(window.scrollY)`);
await wheel(700, 120, 400);
const b1 = await ev(`Math.round(window.scrollY)`);
console.log('');
console.log('B) 鼠标在列表外 (700,120) 滚轮下 → 页面 scrollY: ' + b0 + ' → ' + b1 + (b1>b0?' ✓ 滚轮机制本身有效':' ✗ wheel 在此环境无效'));

/* A) 鼠标在列表上，列表先滚到中段，确认列表能滚 */
await ev(`(function(){var l=document.getElementById('mp-list'); l.scrollTop=0; window.scrollTo(0,0); return 1;})()`);
await sleep(300);
await wheel(cx, cy, 400);
const aMid = await ev(`(function(){var l=document.getElementById('mp-list');
  return JSON.stringify({listTop:Math.round(l.scrollTop), pageY:Math.round(window.scrollY)});})()`);
console.log('A1) 鼠标在列表上滚 400 → ' + aMid + (JSON.parse(aMid).listTop>0?' ✓ 列表自己滚了':''));

/* A) 把列表滚到底，再滚 → 页面应跟着滚 */
await ev(`(function(){var l=document.getElementById('mp-list'); l.scrollTop=l.scrollHeight; window.scrollTo(0,0); return 1;})()`);
await sleep(400);
const listAtEnd = await ev(`(function(){var l=document.getElementById('mp-list');
  return JSON.stringify({listTop:Math.round(l.scrollTop), max:l.scrollHeight-l.clientHeight});})()`);
const c0 = await ev(`Math.round(window.scrollY)`);
await wheel(cx, cy, 400);
const c1 = await ev(`Math.round(window.scrollY)`);
console.log('A2) 列表已到底 ' + listAtEnd + '，滚轮继续下 → 页面 scrollY: ' + c0 + ' → ' + c1 + (c1>c0?' ✓ 整页跟着滚':' ✗ 没动'));

/* 往上：列表在顶部，滚轮上滚 → 页面应跟着往上 */
await ev(`(function(){var l=document.getElementById('mp-list'); l.scrollTop=0; window.scrollTo(0,300); return 1;})()`);
await sleep(400);
const d0 = await ev(`Math.round(window.scrollY)`);
await wheel(cx, cy, -400);
const d1 = await ev(`Math.round(window.scrollY)`);
console.log('A3) 列表在顶部，滚轮上 → 页面 scrollY: ' + d0 + ' → ' + d1 + (d1<d0?' ✓ 整页跟着滚':' ✗ 没动'));

child.kill('SIGKILL'); server.close(); process.exit(0);
