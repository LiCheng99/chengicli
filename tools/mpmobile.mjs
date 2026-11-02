/**
 * 验收三件事：
 *   1) 手机端只显示两句歌词（当前句在上、下一句在下），不重叠
 *   2) 换句时上下滑动（当前句上滑出顶，下一句从下面滑上来）
 *   3) 歌单列表滚到底后，滚轮继续让整页滚动（overscroll 传递）
 *   node tools/mpmobile.mjs
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'D:/BaiduSyncdisk/LICHENG/hexo/public';
const handler = (await import(pathToFileURL('D:/BaiduSyncdisk/LICHENG/hexo/api/music.js').href)).default;
const PORT = 4495;
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MIME = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon' };
function adapt(real){const o={};o.setHeader=(k,v)=>real.setHeader(k,v);o.status=c=>{real.statusCode=c;return o};o.json=x=>{real.setHeader('Content-Type','application/json; charset=utf-8');real.end(JSON.stringify(x));return o};o.end=d=>{real.end(d);return o};return o;}
const server = http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');
 if(u.pathname.startsWith('/api/')){let b='';req.on('data',c=>b+=c);req.on('end',async()=>{const q={};u.searchParams.forEach((v,k)=>q[k]=v);try{await handler({method:req.method,query:q,headers:req.headers,body:b},adapt(res));}catch(e){res.statusCode=500;res.end('{}')}});return;}
 let p=decodeURIComponent(u.pathname); if(p.endsWith('/'))p+='index.html';
 fs.readFile(path.normalize(path.join(ROOT,p)),(e,d)=>{if(e){res.statusCode=404;res.end('nf');return}res.setHeader('Content-Type',MIME[path.extname(p)]||'application/octet-stream');res.end(d)});});
await new Promise(r=>server.listen(PORT,r));
const sleep=m=>new Promise(r=>setTimeout(r,m));

const port = 9820 + Math.floor(Math.random()*10);
const child = spawn(EDGE, ['--headless=new','--remote-debugging-port='+port,'--user-data-dir='+os.tmpdir()+'\\edge-mb-'+Date.now(),
  '--no-first-run','--disable-gpu','--autoplay-policy=no-user-gesture-required','--window-size=390,900','about:blank'],{stdio:'ignore'});
let t=null; for(let i=0;i<60&&!t;i++){try{const l=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();t=l.find(x=>x.type==='page')||null;}catch(e){} if(!t)await sleep(250);}
const sock=new WebSocket(t.webSocketDebuggerUrl);let mid=0;const pend=new Map();
await new Promise(r=>{sock.onopen=r;});
sock.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const{res,rej}=pend.get(m.id);pend.delete(m.id);m.error?rej(new Error(JSON.stringify(m.error))):res(m.result);}};
const send=(m,p)=>new Promise((res,rej)=>{const id=++mid;pend.set(id,{res,rej});sock.send(JSON.stringify({id,method:m,params:p||{}}));});
const ev=async expr=>{const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true});if(r.exceptionDetails)return{__err:JSON.stringify(r.exceptionDetails).slice(0,300)};return r.result.value;};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:2,mobile:true});
await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/music/'}); await sleep(7000);

console.log('=== 1) 手机端歌词框 ===');
/* 放有歌词的歌 */
await ev(`(function(){var r=document.querySelectorAll('#mp-list .mp-row');
  for(var i=0;i<r.length;i++){ if((r[i].textContent||'').indexOf('My Heart')>=0){ r[i].click(); return 'clicked'; } }
  return 'nf';})()`);
await sleep(6000);

/* 冻结过渡后量 */
await ev(`(function(){var st=document.createElement('style');
  st.textContent='#mp-lyric-stage .mp-lyric-row{transition:none !important;}';
  document.head.appendChild(st); return 1;})()`);
await sleep(1200);

const rows = await ev(`(function(){
  var st=document.getElementById('mp-lyric-stage'); if(!st) return 'no stage';
  var out=[];
  var list=st.querySelectorAll('.mp-lyric-row');
  for(var i=0;i<list.length;i++){
    var r=list[i].getBoundingClientRect(), cs=getComputedStyle(list[i]);
    out.push({cls:list[i].className.replace('mp-lyric-row ',''),
      x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),
      bottom:Math.round(r.bottom), fs:cs.fontSize, disp:cs.display,
      text:(list[i].textContent||'').slice(0,22)});
  }
  return JSON.stringify({vw:window.innerWidth, n:out.length, rows:out});
})()`);
console.log(rows);
const rr = JSON.parse(rows);
console.log('  窄屏判定:', rr.vw <= 700 ? '是 ✓' : '否 ✗');
console.log('  行数:', rr.n, '(应为 2)');
const vis = rr.rows.filter(r => r.disp !== 'none');
for (let i=0;i<vis.length;i++) for (let j=i+1;j<vis.length;j++){
  const a=vis[i], b=vis[j];
  const ov = !(a.x+a.w<=b.x || b.x+b.w<=a.x || a.y+a.h<=b.y || b.y+b.h<=a.y);
  console.log('  ' + a.cls + ' vs ' + b.cls + ' 重叠:', ov ? '是 ✗' : '否 ✓');
}

/* 截图 */
const shot = async (name) => {
  const b = JSON.parse(await ev(`(function(){var c=document.querySelector('.mp-deck-card'); c.scrollIntoView({block:'center'});
    var r=c.getBoundingClientRect(); return JSON.stringify({x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.min(Math.round(r.height),260)});})()`));
  await sleep(400);
  const s = await send('Page.captureScreenshot',{format:'png',clip:{x:b.x,y:b.y,width:b.width,height:b.height,scale:2}});
  fs.writeFileSync(os.tmpdir()+'\\'+name+'.png', Buffer.from(s.data,'base64'));
  console.log('  SHOT ->', name+'.png');
};
await shot('mp-m-lyric');

/* 2) 上下滑动动画：恢复过渡后跳播 */
await ev(`(function(){var st=document.createElement('style');
  var olds=document.querySelectorAll('style'); return 1;})()`);
await ev(`(function(){
  /* 移除冻结样式 */
  var ss=document.querySelectorAll('style');
  for(var i=0;i<ss.length;i++){ if((ss[i].textContent||'').indexOf('transition:none !important')>=0){ ss[i].remove(); } }
  return 1;})()`);
await sleep(300);
/* 采样 */
await ev(`(function(){
  window.__s=[]; window.__t0=performance.now();
  (function tick(){
    var st=document.getElementById('mp-lyric-stage');
    if(st){
      var arr=[];
      var list=st.querySelectorAll('.mp-lyric-row');
      for(var i=0;i<list.length;i++){
        var cs=getComputedStyle(list[i]);
        arr.push({c:list[i].className.replace('mp-lyric-row ',''), y:Math.round(list[i].getBoundingClientRect().y),
                  op:+(+cs.opacity).toFixed(2)});
      }
      window.__s.push({t:Math.round(performance.now()-window.__t0), n:list.length, rows:arr});
    }
    requestAnimationFrame(tick);
  })(); return 1;})()`);
await sleep(200);
await ev(`window.__mark=performance.now(); (function(){ window.fomalPlayer.seekTo(30); return 1; })();`);
await sleep(1600);
const samples = JSON.parse(await ev(`JSON.stringify(window.__samples||window.__s)`));
console.log('');
console.log('=== 2) 上下滑动动画（采样）===');
for (const s of samples) {
  if (s.t < 0) continue;
  const L = s.rows.map(r=>'"'+r.c+'" y='+r.y+' op='+r.op).join('  |  ');
  console.log('  t=' + s.t + '  ' + L);
}

console.log('');
console.log('=== 3) 列表滚动到底后整页接着滚 ===');
const scrollInfo = await ev(`(function(){
  var list=document.getElementById('mp-list'); if(!list) return 'no list';
  var cs=getComputedStyle(list);
  return JSON.stringify({overscroll:cs.overscrollBehaviorY, overflowY:cs.overflowY,
    scrollH:list.scrollHeight, clientH:list.clientHeight, scrollTop:list.scrollTop,
    pageY:Math.round(window.scrollY), docH:document.documentElement.scrollHeight,
    winH:window.innerHeight});
})()`);
console.log('  列表属性:', scrollInfo);
const si = JSON.parse(scrollInfo);
console.log('  overscroll-behavior-y:', si.overscroll, si.overscroll==='auto' ? '✓ 会传递给页面' : '✗ 滚轮被锁住');

/* 把列表滚到底，然后派发滚轮，看页面是否跟着滚 */
await ev(`(function(){var l=document.getElementById('mp-list'); l.scrollTop=l.scrollHeight; window.scrollY=0; return 1;})()`);
await sleep(300);
const before = await ev(`Math.round(window.scrollY)`);
/* 真实滚轮事件 */
await send('Input.dispatchMouseEvent', { type:'mouseWheel', x:195, y:450, deltaX:0, deltaY:400 });
await sleep(800);
const after = await ev(`Math.round(window.scrollY)`);
const listAfter = await ev(`(function(){var l=document.getElementById('mp-list'); return JSON.stringify({scrollTop:Math.round(l.scrollTop), scrollH:l.scrollHeight, clientH:l.clientHeight});})()`);
console.log('  列表已滚到底，滚轮下滚 → 页面 scrollY: ' + before + ' → ' + after + (after > before ? ' ✓ 整页跟着滚' : ' ✗ 没动'));
console.log('  列表状态:', listAfter);

/* 回到顶部再往上滚 */
await ev(`(function(){var l=document.getElementById('mp-list'); l.scrollTop=0; window.scrollY=200; return 1;})()`);
await sleep(300);
const b2 = await ev(`Math.round(window.scrollY)`);
await send('Input.dispatchMouseEvent', { type:'mouseWheel', x:195, y:450, deltaX:0, deltaY:-400 });
await sleep(800);
const a2 = await ev(`Math.round(window.scrollY)`);
console.log('  列表在顶部，滚轮上滚 → 页面 scrollY: ' + b2 + ' → ' + a2 + (a2 < b2 ? ' ✓ 整页跟着滚' : ' ✗ 没动'));

child.kill('SIGKILL'); server.close(); process.exit(0);
