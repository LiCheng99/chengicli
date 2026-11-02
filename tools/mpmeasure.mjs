/**
 * 精确测量音乐馆页「两条红线」之间的距离。
 *   左红线 = 音乐胶囊右边缘（作者图里画在胶囊右侧）
 *   右红线 = 右侧悬浮工具条左边缘（作者图里画在工具条左侧）
 * 同时给出「卡片到胶囊」「卡片到工具条」两个距离。
 *   node tools/mpmeasure.mjs [视口宽]
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'D:/BaiduSyncdisk/LICHENG/hexo/public';
const handler = (await import(pathToFileURL('D:/BaiduSyncdisk/LICHENG/hexo/api/music.js').href)).default;
const MIME = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon' };
function adapt(real){const o={};o.setHeader=(k,v)=>real.setHeader(k,v);o.status=c=>{real.statusCode=c;return o};o.json=x=>{real.setHeader('Content-Type','application/json; charset=utf-8');real.end(JSON.stringify(x));return o};o.end=d=>{real.end(d);return o};return o;}
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const W = Number(process.argv[2]) || 1600, H = 1000;

const PORT = 4610;
const server = http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');
 if(u.pathname.startsWith('/api/')){let b='';req.on('data',c=>b+=c);req.on('end',async()=>{const q={};u.searchParams.forEach((v,k)=>q[k]=v);try{await handler({method:req.method,query:q,headers:req.headers,body:b},adapt(res));}catch(e){res.statusCode=500;res.end('{}')}});return;}
 let p=decodeURIComponent(u.pathname); if(p.endsWith('/'))p+='index.html';
 fs.readFile(path.normalize(path.join(ROOT,p)),(e,d)=>{if(e){res.statusCode=404;res.end('nf');return}res.setHeader('Content-Type',MIME[path.extname(p)]||'application/octet-stream');res.end(d)});});
await new Promise(r=>server.listen(PORT,r));
const sleep=m=>new Promise(r=>setTimeout(r,m));
const port = 9950 + Math.floor(Math.random()*40);
const child = spawn(EDGE, ['--headless=new','--remote-debugging-port='+port,'--user-data-dir='+os.tmpdir()+'\\edge-ms-'+Date.now(),
  '--no-first-run','--disable-gpu','--autoplay-policy=no-user-gesture-required','--window-size='+W+','+H,'about:blank'],{stdio:'ignore'});
let t=null; for(let i=0;i<60&&!t;i++){try{const l=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();t=l.find(x=>x.type==='page')||null;}catch(e){} if(!t)await sleep(250);}
const sock=new WebSocket(t.webSocketDebuggerUrl);let mid=0;const pend=new Map();
await new Promise(r=>{sock.onopen=r;});
sock.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const{res,rej}=pend.get(m.id);pend.delete(m.id);m.error?rej(new Error(JSON.stringify(m.error))):res(m.result);}};
const send=(m,p)=>new Promise((res,rej)=>{const id=++mid;pend.set(id,{res,rej});sock.send(JSON.stringify({id,method:m,params:p||{}}));});
const ev=async expr=>{const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true});if(r.exceptionDetails)return{__err:JSON.stringify(r.exceptionDetails).slice(0,300)};return r.result.value;};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/music/'}); await sleep(7000);

/* 放歌，让胶囊出现 */
await ev('(function(){var r=document.querySelectorAll("#mp-list .mp-row");for(var i=0;i<r.length;i++){if((r[i].textContent||"").indexOf("My Heart")>=0){r[i].click();return 1}}return 0;})()');
await sleep(6000);

const g = JSON.parse(await ev('(function(){' +
  'function R(s){var el=document.querySelector(s);if(!el)return null;var r=el.getBoundingClientRect();' +
  'return {x:Math.round(r.x),right:Math.round(r.right),w:Math.round(r.width),disp:getComputedStyle(el).display};}' +
  'var mini=R("#ds-mini"), rs=R("#rightside"), card=R(".mp-deck-card"), fps=R("#fps"), lay=R("#content-inner");' +
  'var out={vw:window.innerWidth, mini:mini, fps:fps, rs:rs, card:card, lay:lay};' +
  'if(mini&&rs){' +
  '  out.A_胶囊左边到工具条左边 = rs.x - mini.x;' +
  '  out.B_胶囊右边到工具条右边 = rs.right - mini.right;' +
  '  out.C_胶囊右边到工具条左边 = rs.x - mini.right;' +
  '  out.D_胶囊左边到工具条右边 = rs.right - mini.x;' +
  '  out.胶囊右到卡片左 = card.x - mini.right;' +
  '  out.卡片右到工具条左 = rs.x - card.right;' +
  '  out.卡片宽 = card.w;' +
  '}' +
  'return JSON.stringify(out);' +
  '})()'));

console.log('视口宽:', g.vw);
console.log('胶囊 #ds-mini   :', JSON.stringify(g.mini));
console.log('帧率 #fps       :', JSON.stringify(g.fps));
console.log('工具条 #rightside:', JSON.stringify(g.rs));
console.log('播放卡          :', JSON.stringify(g.card));
console.log('');
console.log('  胶囊左→工具条左  =', g.A_胶囊左边到工具条左边, 'px');
console.log('  胶囊右→工具条右  =', g.B_胶囊右边到工具条右边, 'px');
console.log('  胶囊右→工具条左  =', g.C_胶囊右边到工具条左边, 'px');
console.log('  胶囊左→工具条右  =', g.D_胶囊左边到工具条右边, 'px');
console.log('  ---');
console.log('  胶囊右→卡片左    =', g.胶囊右到卡片左, 'px');
console.log('  卡片右→工具条左  =', g.卡片右到工具条左, 'px');
console.log('  卡片宽度          =', g.卡片宽, 'px');

child.kill('SIGKILL'); server.close(); process.exit(0);
