/**
 * 胶囊歌词换句滚动验收：
 *   1) 当前句上滑出顶
 *   2) 下一句同步从胶囊底部滑上来
 *   3) 新旧两句横向基线严格对齐（不跑到一边去）
 *   4) 胶囊高度随歌词长短变化（不写死）
 *   node tools/mproll.mjs
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'D:/BaiduSyncdisk/LICHENG/hexo/public';
const handler = (await import(pathToFileURL('D:/BaiduSyncdisk/LICHENG/hexo/api/music.js').href)).default;
const PORT = 4491;
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MIME = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon' };
function adapt(real){const o={};o.setHeader=(k,v)=>real.setHeader(k,v);o.status=c=>{real.statusCode=c;return o};o.json=x=>{real.setHeader('Content-Type','application/json; charset=utf-8');real.end(JSON.stringify(x));return o};o.end=d=>{real.end(d);return o};return o;}
const server = http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');
 if(u.pathname.startsWith('/api/')){let b='';req.on('data',c=>b+=c);req.on('end',async()=>{const q={};u.searchParams.forEach((v,k)=>q[k]=v);try{await handler({method:req.method,query:q,headers:req.headers,body:b},adapt(res));}catch(e){res.statusCode=500;res.end('{}')}});return;}
 let p=decodeURIComponent(u.pathname); if(p.endsWith('/'))p+='index.html';
 fs.readFile(path.normalize(path.join(ROOT,p)),(e,d)=>{if(e){res.statusCode=404;res.end('nf');return}res.setHeader('Content-Type',MIME[path.extname(p)]||'application/octet-stream');res.end(d)});});
await new Promise(r=>server.listen(PORT,r));
const sleep=m=>new Promise(r=>setTimeout(r,m));

const port = 9780 + Math.floor(Math.random()*10);
const child = spawn(EDGE, ['--headless=new','--remote-debugging-port='+port,'--user-data-dir='+os.tmpdir()+'\\edge-rl-'+Date.now(),
  '--no-first-run','--disable-gpu','--autoplay-policy=no-user-gesture-required','--window-size=1440,1000','about:blank'],{stdio:'ignore'});
let t=null; for(let i=0;i<60&&!t;i++){try{const l=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();t=l.find(x=>x.type==='page')||null;}catch(e){} if(!t)await sleep(250);}
const sock=new WebSocket(t.webSocketDebuggerUrl);let mid=0;const pend=new Map();
await new Promise(r=>{sock.onopen=r;});
sock.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const{res,rej}=pend.get(m.id);pend.delete(m.id);m.error?rej(new Error(JSON.stringify(m.error))):res(m.result);}};
const send=(m,p)=>new Promise((res,rej)=>{const id=++mid;pend.set(id,{res,rej});sock.send(JSON.stringify({id,method:m,params:p||{}}));});
const ev=async expr=>{const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true});if(r.exceptionDetails)return{__err:JSON.stringify(r.exceptionDetails).slice(0,300)};return r.result.value;};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:2,mobile:false});
await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/music/'}); await sleep(7000);

/* 读胶囊几何：当前句 + 所有覆盖层 */
const geo = () => ev(`(function(){
  var box=document.getElementById('ds-mini');
  if(!box) return 'no capsule';
  var txt=box.querySelector('.dm-text');
  var cur=box.querySelector('.dm-cur');
  var lines=box.querySelectorAll('.dm-line');
  function rect(el){ if(!el) return null; var r=el.getBoundingClientRect();
    return {x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height),
            cx:Math.round(r.x+r.width/2), text:(el.textContent||'').slice(0,12),
            tf:getComputedStyle(el).transform, op:getComputedStyle(el).opacity}; }
  return JSON.stringify({
    capH: Math.round(box.getBoundingClientRect().height),
    boxH: txt?txt.clientHeight:0,
    cur: rect(cur),
    lines: Array.prototype.map.call(lines, rect),
    curVis: cur?getComputedStyle(cur).visibility:''
  });
})()`);

const shot = async (name) => {
  const b = JSON.parse(await ev(`(function(){var m=document.getElementById('ds-mini'); if(!m) return '{}';
    var r=m.getBoundingClientRect(); return JSON.stringify({x:Math.round(r.x)-14,y:Math.round(r.y)-14,width:Math.round(r.width)+28,height:Math.round(r.height)+28});})()`));
  if (b.x === undefined) { console.log('no capsule'); return; }
  const s = await send('Page.captureScreenshot',{format:'png',clip:{x:b.x,y:b.y,width:b.width,height:b.height,scale:2}});
  fs.writeFileSync(os.tmpdir()+'\\'+name+'.png', Buffer.from(s.data,'base64'));
  console.log('SHOT ->', os.tmpdir()+'\\'+name+'.png');
};

/* 放一首有歌词的歌 */
await ev(`(function(){var r=document.querySelectorAll('#mp-list .mp-row');
  for(var i=0;i<r.length;i++){ if((r[i].textContent||'').indexOf('很任性')>=0){ r[i].click(); return 'clicked'; } }
  return 'not found';})()`);
await sleep(6000);

console.log('播放中        :', await geo());
await shot('mp-roll-0');

/* 跳到后面一句 → 触发换句滚动 */
await ev(`(function(){ window.fomalPlayer.seekTo(12); return 1; })()`);
await sleep(120);
console.log('动画开始(120ms):', await geo());
await shot('mp-roll-1');
await sleep(200);
console.log('动画中(320ms)  :', await geo());
await shot('mp-roll-2');
await sleep(500);
console.log('动画结束       :', await geo());
await shot('mp-roll-3');

/* 再换一次，看连续换句 */
await ev(`(function(){ window.fomalPlayer.seekTo(26); return 1; })()`);
await sleep(250);
console.log('第二次动画中   :', await geo());
await shot('mp-roll-4');
await sleep(700);
console.log('第二次结束     :', await geo());

child.kill('SIGKILL'); server.close(); process.exit(0);
