/**
 * 全站宽度改造后的截图：音乐页 + 文章页（宽屏 1600）
 *   node tools/mpshotwide.mjs
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

const PORT = 4601;
const server = http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');
 if(u.pathname.startsWith('/api/')){let b='';req.on('data',c=>b+=c);req.on('end',async()=>{const q={};u.searchParams.forEach((v,k)=>q[k]=v);try{await handler({method:req.method,query:q,headers:req.headers,body:b},adapt(res));}catch(e){res.statusCode=500;res.end('{}')}});return;}
 let p=decodeURIComponent(u.pathname); if(p.endsWith('/'))p+='index.html';
 fs.readFile(path.normalize(path.join(ROOT,p)),(e,d)=>{if(e){res.statusCode=404;res.end('nf');return}res.setHeader('Content-Type',MIME[path.extname(p)]||'application/octet-stream');res.end(d)});});
await new Promise(r=>server.listen(PORT,r));
const sleep=m=>new Promise(r=>setTimeout(r,m));
const port = 9920;
const child = spawn(EDGE, ['--headless=new','--remote-debugging-port='+port,'--user-data-dir='+os.tmpdir()+'\\edge-ws-'+Date.now(),
  '--no-first-run','--disable-gpu','--autoplay-policy=no-user-gesture-required','--window-size='+W+','+H,'about:blank'],{stdio:'ignore'});
let t=null; for(let i=0;i<60&&!t;i++){try{const l=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();t=l.find(x=>x.type==='page')||null;}catch(e){} if(!t)await sleep(250);}
const sock=new WebSocket(t.webSocketDebuggerUrl);let mid=0;const pend=new Map();
await new Promise(r=>{sock.onopen=r;});
sock.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const{res,rej}=pend.get(m.id);pend.delete(m.id);m.error?rej(new Error(JSON.stringify(m.error))):res(m.result);}};
const send=(m,p)=>new Promise((res,rej)=>{const id=++mid;pend.set(id,{res,rej});sock.send(JSON.stringify({id,method:m,params:p||{}}));});
const ev=async expr=>{const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true});if(r.exceptionDetails)return{__err:JSON.stringify(r.exceptionDetails).slice(0,300)};return r.result.value;};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:false});

/* 首页 */
await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/'});
await sleep(7000);
await ev('(function(){window.scrollTo(0,700);return 1;})()');
await sleep(1500);
var sh = await send('Page.captureScreenshot',{format:'png'});
fs.writeFileSync(os.tmpdir()+'\\mp-wide-home-'+W+'.png', Buffer.from(sh.data,'base64'));
console.log('SHOT -> mp-wide-home-'+W+'.png');

/* 文章页 */
await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/posts/canon-r50.html'});
await sleep(7000);
let cur = await ev('location.pathname');
if (cur !== '/posts/canon-r50.html') {
  await ev('(function(){location.replace("http://127.0.0.1:'+PORT+'/posts/canon-r50.html");return 1;})()');
  await sleep(7000);
}
console.log('文章页 URL:', await ev('location.pathname'));
await sleep(1500);
let s = await send('Page.captureScreenshot',{format:'png'});
fs.writeFileSync(os.tmpdir()+'\\mp-wide-article-' + W + '.png', Buffer.from(s.data,'base64'));
console.log('SHOT -> mp-wide-article-' + W + '.png');

/* 音乐页 */
await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/music/'});
await sleep(7000);
await ev('(function(){var r=document.querySelectorAll("#mp-list .mp-row");for(var i=0;i<r.length;i++){if((r[i].textContent||"").indexOf("Better Now")>=0){r[i].click();return 1}}return 0;})()');
await sleep(5000);
s = await send('Page.captureScreenshot',{format:'png'});
fs.writeFileSync(os.tmpdir()+'\\mp-wide-music-' + W + '.png', Buffer.from(s.data,'base64'));
console.log('SHOT -> mp-wide-music-' + W + '.png');

/* 音乐页歌词框几何 */
console.log('音乐页歌词:', await ev('(function(){' +
  'function R(el){if(!el)return null;var r=el.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),mid:Math.round(r.top+r.height/2),fs:getComputedStyle(el).fontSize};}' +
  'var c=document.querySelector(".mp-cover-wrap");var rows={};' +
  'var l=document.querySelectorAll("#mp-lyric-stage .mp-lyric-row");' +
  'for(var i=0;i<l.length;i++){var k=l[i].className;var n=k.indexOf("is-cur")>=0?"cur":(k.indexOf("is-nx1")>=0?"nx1":(k.indexOf("is-nx2")>=0?"nx2":"o"));if(!rows[n])rows[n]=R(l[i]);}' +
  'return JSON.stringify({cover:R(c),rows:rows});' +
  '})()'));

child.kill('SIGKILL'); server.close(); process.exit(0);
