/**
 * 胶囊换句滚动 · 精确计时验收（不在采样之间截图，避免延迟污染时间轴）
 *   node tools/mproll2.mjs
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'D:/BaiduSyncdisk/LICHENG/hexo/public';
const handler = (await import(pathToFileURL('D:/BaiduSyncdisk/LICHENG/hexo/api/music.js').href)).default;
const PORT = 4492;
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MIME = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon' };
function adapt(real){const o={};o.setHeader=(k,v)=>real.setHeader(k,v);o.status=c=>{real.statusCode=c;return o};o.json=x=>{real.setHeader('Content-Type','application/json; charset=utf-8');real.end(JSON.stringify(x));return o};o.end=d=>{real.end(d);return o};return o;}
const server = http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');
 if(u.pathname.startsWith('/api/')){let b='';req.on('data',c=>b+=c);req.on('end',async()=>{const q={};u.searchParams.forEach((v,k)=>q[k]=v);try{await handler({method:req.method,query:q,headers:req.headers,body:b},adapt(res));}catch(e){res.statusCode=500;res.end('{}')}});return;}
 let p=decodeURIComponent(u.pathname); if(p.endsWith('/'))p+='index.html';
 fs.readFile(path.normalize(path.join(ROOT,p)),(e,d)=>{if(e){res.statusCode=404;res.end('nf');return}res.setHeader('Content-Type',MIME[path.extname(p)]||'application/octet-stream');res.end(d)});});
await new Promise(r=>server.listen(PORT,r));
const sleep=m=>new Promise(r=>setTimeout(r,m));

const port = 9790 + Math.floor(Math.random()*10);
const child = spawn(EDGE, ['--headless=new','--remote-debugging-port='+port,'--user-data-dir='+os.tmpdir()+'\\edge-r2-'+Date.now(),
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

/* 在页面里装一个采样器：每次 rAF 记录胶囊几何 */
await ev(`(function(){
  window.__samples = [];
  window.__t0 = performance.now();
  function tick(){
    var box=document.getElementById('ds-mini');
    if(box){
      var txt=box.querySelector('.dm-text');
      var lines=box.querySelectorAll('.dm-line');
      window.__samples.push({
        t: Math.round(performance.now()-window.__t0),
        capH: Math.round(box.getBoundingClientRect().height),
        boxH: txt?txt.clientHeight:0,
        n: lines.length,
        curVis: (box.querySelector('.dm-cur')||{}).style ? (box.querySelector('.dm-cur').style.visibility||'') : '',
        curText: (box.querySelector('.dm-cur')||{}).textContent ? box.querySelector('.dm-cur').textContent.slice(0,10) : '',
        lines: Array.prototype.map.call(lines, function(l){
          var cs=getComputedStyle(l); var m=new DOMMatrixReadOnly(cs.transform);
          return {t:l.textContent.slice(0,10), y:Math.round(m.m42), op:+(+cs.opacity).toFixed(2),
                  x:Math.round(l.getBoundingClientRect().x), cx:Math.round(l.getBoundingClientRect().x+l.getBoundingClientRect().width/2)};
        }),
        curX: (function(){var c=box.querySelector('.dm-cur'); if(!c) return null;
          var r=c.getBoundingClientRect(); return {x:Math.round(r.x), cx:Math.round(r.x+r.width/2), h:Math.round(r.height)};})()
      });
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return 'sampler on';
})()`);

/* 放有歌词的歌 */
await ev(`(function(){var r=document.querySelectorAll('#mp-list .mp-row');
  for(var i=0;i<r.length;i++){ if((r[i].textContent||'').indexOf('很任性')>=0){ r[i].click(); return 'clicked'; } }
  return 'not found';})()`);
await sleep(6000);

/* 标记：跳到 12s 触发换句 */
await ev(`window.__mark = performance.now(); (function(){ window.fomalPlayer.seekTo(12); return 1; })();`);
await sleep(1600);

const samples = JSON.parse(await ev(`JSON.stringify(window.__samples.filter(function(s){return s.t > (window.__mark - window.__t0) - 60; }))`));
console.log('采样帧数:', samples.length);
console.log('--- 换句滚动过程 ---');
let prev = null;
for (const s of samples) {
  if (s.n === 0) { if (prev !== 0) { console.log('  t=' + s.t + '  静止态  capH=' + s.capH + '  当前句=' + s.curText + '  curX=' + JSON.stringify(s.curX)); prev = 0; } continue; }
  prev = 1;
  const L = s.lines.map(l => '"' + l.t + '" y=' + l.y + ' op=' + l.op + ' cx=' + l.cx).join('  |  ');
  console.log('  t=' + s.t + '  capH=' + s.capH + '  boxH=' + s.boxH + '  ' + L + '  curVis=' + s.curVis);
}

console.log('--- 横向对齐检查（动画期间新旧两句的 cx）---');
const cxSet = new Set();
for (const s of samples) for (const l of s.lines) cxSet.add(l.cx);
console.log('  覆盖层文字 cx 集合:', [...cxSet].join(','), ' → ', cxSet.size === 1 ? '全部严格对齐 ✓' : '有偏移 ✗');

console.log('--- 静止态各帧的当前句 x（应一致）---');
const curXs = new Set();
for (const s of samples) if (s.curX) curXs.add(s.curX.x);
console.log('  .dm-cur x 集合:', [...curXs].join(','), ' → ', curXs.size === 1 ? '一致 ✓' : '有偏移 ✗');

/* 补拍动画中间帧：重新触发一次换句，在 250ms 时抓图 */
await ev(`(function(){ window.fomalPlayer.seekTo(30); return 1; })()`);
await sleep(300);
{
  const b = JSON.parse(await ev(`(function(){var m=document.getElementById('ds-mini'); if(!m) return '{}';
    var r=m.getBoundingClientRect(); return JSON.stringify({x:Math.round(r.x)-16,y:Math.round(r.y)-16,width:Math.round(r.width)+32,height:Math.round(r.height)+32});})()`));
  const sh = await send('Page.captureScreenshot',{format:'png',clip:{x:b.x,y:b.y,width:b.width,height:b.height,scale:3}});
  fs.writeFileSync(os.tmpdir()+'\\mp-roll-mid.png', Buffer.from(sh.data,'base64'));
  console.log('SHOT ->', os.tmpdir()+'\\mp-roll-mid.png');
}

child.kill('SIGKILL'); server.close(); process.exit(0);
