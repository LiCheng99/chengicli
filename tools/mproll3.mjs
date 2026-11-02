/**
 * 验证「胶囊高度随歌词长短变化」+ 换句时高度平滑伸缩。
 * 用 setMiniText 走真实路径：切到不同长度的歌词行。
 *   node tools/mproll3.mjs
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'D:/BaiduSyncdisk/LICHENG/hexo/public';
const handler = (await import(pathToFileURL('D:/BaiduSyncdisk/LICHENG/hexo/api/music.js').href)).default;
const PORT = 4493;
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MIME = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon' };
function adapt(real){const o={};o.setHeader=(k,v)=>real.setHeader(k,v);o.status=c=>{real.statusCode=c;return o};o.json=x=>{real.setHeader('Content-Type','application/json; charset=utf-8');real.end(JSON.stringify(x));return o};o.end=d=>{real.end(d);return o};return o;}
const server = http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');
 if(u.pathname.startsWith('/api/')){let b='';req.on('data',c=>b+=c);req.on('end',async()=>{const q={};u.searchParams.forEach((v,k)=>q[k]=v);try{await handler({method:req.method,query:q,headers:req.headers,body:b},adapt(res));}catch(e){res.statusCode=500;res.end('{}')}});return;}
 let p=decodeURIComponent(u.pathname); if(p.endsWith('/'))p+='index.html';
 fs.readFile(path.normalize(path.join(ROOT,p)),(e,d)=>{if(e){res.statusCode=404;res.end('nf');return}res.setHeader('Content-Type',MIME[path.extname(p)]||'application/octet-stream');res.end(d)});});
await new Promise(r=>server.listen(PORT,r));
const sleep=m=>new Promise(r=>setTimeout(r,m));

const port = 9800 + Math.floor(Math.random()*10);
const child = spawn(EDGE, ['--headless=new','--remote-debugging-port='+port,'--user-data-dir='+os.tmpdir()+'\\edge-r3-'+Date.now(),
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

/* 让胶囊出现（放歌） */
await ev(`(function(){var r=document.querySelectorAll('#mp-list .mp-row');
  for(var i=0;i<r.length;i++){ if((r[i].textContent||'').indexOf('很任性')>=0){ r[i].click(); return 'clicked'; } }
  return 'nf';})()`);
await sleep(6000);

const capInfo = () => ev(`(function(){
  var box=document.getElementById('ds-mini'); if(!box) return 'no box';
  var txt=box.querySelector('.dm-text'), cur=box.querySelector('.dm-cur');
  var lines=box.querySelectorAll('.dm-line');
  var cr=cur?cur.getBoundingClientRect():null;
  return JSON.stringify({
    capH: Math.round(box.getBoundingClientRect().height),
    boxH: txt?txt.clientHeight:0,
    curH: cr?Math.round(cr.height):0,
    curText: cur?cur.textContent.slice(0,20):'',
    animating: lines.length>0,
    inlineH: box.style.height||'(auto)'
  });
})()`);

/* 直接给播放器灌不同长度的歌词，检验高度自适应 */
const setLyric = async (txt) => {
  await ev(`(function(){
    /* 走真实路径：改核心的歌词行，触发胶囊 setMiniText */
    var P=window.fomalPlayer;
    var s=P.state();
    return 1;
  })()`);
};

console.log('当前状态        :', await capInfo());

/* 用真实歌词行来测：把这首歌的不同长度的行依次灌进去 */
const lines = ['以为感受到你那跳动的脉搏','一个人很寂寞另一个很洒脱','简单温暖剩过一万次的承诺','谁先放开的手当初却没有说'];
for (const L of lines) {
  await ev(`(function(){
    /* 直接调核心的歌词接口：模拟唱到这一句 */
    var ev2=new CustomEvent('x');
    return 1;
  })()`);
  await sleep(50);
  break;
}

/* 更好：直接驱动 daily-say 的 setMiniText —— 它在闭包里，用歌词行变化来触发。
   这里改用：让播放器跳到不同时间点，歌词自然变化。 */
console.log('');
console.log('=== 高度随歌词长短变化（换不同长度的歌词行）===');
for (const [label, seek] of [['短句', 12], ['长句', 26], ['短句2', 40]]) {
  await ev(`(function(){ window.fomalPlayer.seekTo(${seek}); return 1; })()`);
  await sleep(1400);
  console.log('  ' + label + ' (seek ' + seek + 's):', await capInfo());
}

/* 采样：换句过程中胶囊高度是否平滑（不该有突跳） */
await ev(`(function(){
  window.__h = [];
  window.__t0 = performance.now();
  (function tick(){
    var b=document.getElementById('ds-mini');
    if(b) window.__h.push({t:Math.round(performance.now()-window.__t0), h:Math.round(b.getBoundingClientRect().height),
                            n:b.querySelectorAll('.dm-line').length});
    requestAnimationFrame(tick);
  })();
  return 1;
})()`);
await sleep(200);
await ev(`(function(){ window.fomalPlayer.seekTo(52); return 1; })()`);
await sleep(1400);
const hs = JSON.parse(await ev(`JSON.stringify(window.__h)`));
console.log('');
console.log('=== 换句期间胶囊高度轨迹 ===');
let jumps = [];
for (let i=1;i<hs.length;i++){ if (Math.abs(hs[i].h - hs[i-1].h) > 12) jumps.push(hs[i-1].h + '->' + hs[i].h + ' @' + hs[i].t); }
console.log('  高度序列:', hs.map(x=>x.h).join(','));
console.log('  突变(>12px):', jumps.length ? jumps.join(' | ') : '无 ✓');

child.kill('SIGKILL'); server.close(); process.exit(0);
