/**
 * 验收「长歌名不再遮挡右侧歌词」+「右侧两句歌词字号变大并下移」。
 *   node tools/mpoverlap.mjs
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'D:/BaiduSyncdisk/LICHENG/hexo/public';
const handler = (await import(pathToFileURL('D:/BaiduSyncdisk/LICHENG/hexo/api/music.js').href)).default;
const PORT = 4494;
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MIME = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon' };
function adapt(real){const o={};o.setHeader=(k,v)=>real.setHeader(k,v);o.status=c=>{real.statusCode=c;return o};o.json=x=>{real.setHeader('Content-Type','application/json; charset=utf-8');real.end(JSON.stringify(x));return o};o.end=d=>{real.end(d);return o};return o;}
const server = http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');
 if(u.pathname.startsWith('/api/')){let b='';req.on('data',c=>b+=c);req.on('end',async()=>{const q={};u.searchParams.forEach((v,k)=>q[k]=v);try{await handler({method:req.method,query:q,headers:req.headers,body:b},adapt(res));}catch(e){res.statusCode=500;res.end('{}')}});return;}
 let p=decodeURIComponent(u.pathname); if(p.endsWith('/'))p+='index.html';
 fs.readFile(path.normalize(path.join(ROOT,p)),(e,d)=>{if(e){res.statusCode=404;res.end('nf');return}res.setHeader('Content-Type',MIME[path.extname(p)]||'application/octet-stream');res.end(d)});});
await new Promise(r=>server.listen(PORT,r));
const sleep=m=>new Promise(r=>setTimeout(r,m));

const port = 9810 + Math.floor(Math.random()*10);
const child = spawn(EDGE, ['--headless=new','--remote-debugging-port='+port,'--user-data-dir='+os.tmpdir()+'\\edge-ov-'+Date.now(),
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

/* 点最长歌名那首 */
await ev(`(function(){var r=document.querySelectorAll('#mp-list .mp-row');
  for(var i=0;i<r.length;i++){ if((r[i].textContent||'').indexOf('Go Again')>=0){ r[i].click(); return 'clicked'; } }
  return 'nf';})()`);
await sleep(6000);

/* 先冻结过渡（字号/位移都有 0.6s 过渡，不冻结会量到中间帧），并等歌词稳定 */
await ev(`(function(){
  var st=document.createElement('style');
  st.textContent='#mp-lyric-stage .mp-lyric-row{transition:none !important;}';
  document.head.appendChild(st);
  return 1;
})()`);
await sleep(1500);

/* 量：歌名块 / 歌手 / 三行歌词 的包围盒 */
const geo = await ev(`(function(){
  function box(el){ if(!el) return null; var r=el.getBoundingClientRect();
    return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),
            right:Math.round(r.right),bottom:Math.round(r.bottom),
            fs:getComputedStyle(el).fontSize, text:(el.textContent||'').slice(0,34)}; }
  var name=document.getElementById('mp-name'), artist=document.getElementById('mp-artist');
  var rows={};
  var list=document.querySelectorAll('#mp-lyric-stage .mp-lyric-row');
  for(var i=0;i<list.length;i++){
    var c=list[i].className;
    var k = c.indexOf('is-cur')>=0?'cur':(c.indexOf('is-nx1')>=0?'nx1':(c.indexOf('is-nx2')>=0?'nx2':'other'));
    if(!rows[k]) rows[k]=box(list[i]);
  }
  return JSON.stringify({
    name:box(name), artist:box(artist),
    titleW: (function(){var t=document.querySelector('.mp-title'); var r=t.getBoundingClientRect();
       return {w:Math.round(r.width), scrollW:t.scrollWidth, clipped: t.scrollWidth > Math.round(r.width)+1};})(),
    nameClipped: name ? (name.scrollWidth > name.clientWidth+1) : false,
    rows:rows
  });
})()`);
console.log('几何:', geo);

/* 判定遮挡：歌名/歌手的包围盒 与 nx1 歌词包围盒 是否相交 */
const g = JSON.parse(geo);
function overlap(a, b) {
  if (!a || !b) return false;
  return !(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y);
}
console.log('');
console.log('=== 遮挡判定 ===');
console.log('  歌名 vs 右上歌词(nx1) 重叠:', overlap(g.name, g.rows.nx1) ? '是 ✗' : '否 ✓');
console.log('  歌手 vs 右上歌词(nx1) 重叠:', overlap(g.artist, g.rows.nx1) ? '是 ✗' : '否 ✓');
console.log('  歌名块被截断:', g.nameClipped ? '是（省略号生效）✓' : '否');
console.log('');
console.log('=== 右侧两句歌词字号/位置 ===');
console.log('  nx1:', g.rows.nx1 ? ('字号 ' + g.rows.nx1.fs + '  x=' + g.rows.nx1.x + ' y=' + g.rows.nx1.y) : '(无)');
console.log('  nx2:', g.rows.nx2 ? ('字号 ' + g.rows.nx2.fs + '  x=' + g.rows.nx2.x + ' y=' + g.rows.nx2.y) : '(无)');
console.log('  cur:', g.rows.cur ? ('字号 ' + g.rows.cur.fs + '  x=' + g.rows.cur.x + ' y=' + g.rows.cur.y) : '(无)');

/* 截卡片特写 */
const box = JSON.parse(await ev(`(function(){var c=document.querySelector('.mp-deck-card'); c.scrollIntoView({block:'center'});
  var r=c.getBoundingClientRect(); return JSON.stringify({x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.min(Math.round(r.height),300)});})()`));
await sleep(500);
const s = await send('Page.captureScreenshot',{format:'png',clip:{x:box.x,y:box.y,width:box.width,height:box.height,scale:1.6}});
fs.writeFileSync(os.tmpdir()+'\\mp-overlap.png', Buffer.from(s.data,'base64'));
console.log('');
console.log('SHOT ->', os.tmpdir()+'\\mp-overlap.png');

child.kill('SIGKILL'); server.close(); process.exit(0);
