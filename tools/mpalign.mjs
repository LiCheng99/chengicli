/**
 * 验收「歌词框与封面对齐」：
 *   桌面：当前句与封面垂直居中；右下那句的下边与封面下边对齐；后两句字号 18px
 *   手机：当前句与封面垂直居中；下一句在下面
 *   node tools/mpalign.mjs
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

async function run(w, h, label) {
  const PORT = 4500 + Math.floor(Math.random()*40);
  const server = http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');
   if(u.pathname.startsWith('/api/')){let b='';req.on('data',c=>b+=c);req.on('end',async()=>{const q={};u.searchParams.forEach((v,k)=>q[k]=v);try{await handler({method:req.method,query:q,headers:req.headers,body:b},adapt(res));}catch(e){res.statusCode=500;res.end('{}')}});return;}
   let p=decodeURIComponent(u.pathname); if(p.endsWith('/'))p+='index.html';
   fs.readFile(path.normalize(path.join(ROOT,p)),(e,d)=>{if(e){res.statusCode=404;res.end('nf');return}res.setHeader('Content-Type',MIME[path.extname(p)]||'application/octet-stream');res.end(d)});});
  await new Promise(r=>server.listen(PORT,r));
  const sleep=m=>new Promise(r=>setTimeout(r,m));
  const port = 9840 + Math.floor(Math.random()*40);
  const child = spawn(EDGE, ['--headless=new','--remote-debugging-port='+port,'--user-data-dir='+os.tmpdir()+'\\edge-al-'+Date.now(),
    '--no-first-run','--disable-gpu','--autoplay-policy=no-user-gesture-required','--window-size='+w+','+h,'about:blank'],{stdio:'ignore'});
  let t=null; for(let i=0;i<60&&!t;i++){try{const l=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();t=l.find(x=>x.type==='page')||null;}catch(e){} if(!t)await sleep(250);}
  const sock=new WebSocket(t.webSocketDebuggerUrl);let mid=0;const pend=new Map();
  await new Promise(r=>{sock.onopen=r;});
  sock.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const{res,rej}=pend.get(m.id);pend.delete(m.id);m.error?rej(new Error(JSON.stringify(m.error))):res(m.result);}};
  const send=(m,p)=>new Promise((res,rej)=>{const id=++mid;pend.set(id,{res,rej});sock.send(JSON.stringify({id,method:m,params:p||{}}));});
  const ev=async expr=>{const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true});if(r.exceptionDetails)return{__err:JSON.stringify(r.exceptionDetails).slice(0,300)};return r.result.value;};

  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:2,mobile:w<=700});
  await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/music/'}); await sleep(7000);
  await ev(`(function(){var r=document.querySelectorAll('#mp-list .mp-row');
    for(var i=0;i<r.length;i++){ if((r[i].textContent||'').indexOf('My Heart')>=0){ r[i].click(); return 1; } } return 0;})()`);
  await sleep(6000);

  const g = JSON.parse(await ev(`(function(){
    function rect(el){ if(!el) return null; var r=el.getBoundingClientRect();
      return {top:Math.round(r.top),bottom:Math.round(r.bottom),h:Math.round(r.height),
              mid:Math.round(r.top+r.height/2), fs:getComputedStyle(el).fontSize}; }
    var cover=document.querySelector('.mp-cover-wrap');
    var rows={};
    var list=document.querySelectorAll('#mp-lyric-stage .mp-lyric-row');
    for(var i=0;i<list.length;i++){
      var c=list[i].className;
      var k=c.indexOf('is-cur')>=0?'cur':(c.indexOf('is-nx1')>=0?'nx1':(c.indexOf('is-nx2')>=0?'nx2':'other'));
      if(!rows[k]) rows[k]=rect(list[i]);
    }
    var st=document.getElementById('mp-lyric-stage');
    return JSON.stringify({vw:window.innerWidth, cover:rect(cover), rows:rows,
      vars:{cur:st.style.getPropertyValue('--mp-top-cur'),
            nx1:st.style.getPropertyValue('--mp-top-nx1'),
            nx2:st.style.getPropertyValue('--mp-top-nx2')}});
  })()`));

  console.log('===== ' + label + ' (' + w + 'px) =====');
  console.log('  封面:', JSON.stringify(g.cover));
  console.log('  变量:', JSON.stringify(g.vars));
  const c = g.cover, r = g.rows;
  if (r.cur) {
    const d = Math.abs(r.cur.mid - c.mid);
    console.log('  当前句: 中线 y=' + r.cur.mid + '  封面中线 y=' + c.mid + '  偏差 ' + d + 'px ' + (d <= 2 ? '✓ 居中' : '✗'));
  }
  if (r.nx2) {
    const d = Math.abs(r.nx2.bottom - c.bottom);
    console.log('  右下句: 下边 y=' + r.nx2.bottom + '  封面下边 y=' + c.bottom + '  偏差 ' + d + 'px ' + (d <= 2 ? '✓ 对齐' : '✗'));
  }
  if (r.nx1) console.log('  右上句: 字号 ' + r.nx1.fs + '  (目标 18px)');
  if (r.nx2) console.log('  右下句: 字号 ' + r.nx2.fs + '  (目标 18px)');

  /* 截卡片 */
  const b = JSON.parse(await ev(`(function(){var c=document.querySelector('.mp-deck-card');
    var r=c.getBoundingClientRect();
    return JSON.stringify({x:Math.max(0,Math.round(r.x)),y:Math.max(0,Math.round(r.y)),
      width:Math.round(Math.min(r.width, window.innerWidth-Math.max(0,Math.round(r.x)))),
      height:Math.round(Math.min(r.height, window.innerHeight-Math.max(0,Math.round(r.y))))});})()`));
  await sleep(500);
  const s = await send('Page.captureScreenshot',{format:'png',clip:{x:b.x,y:b.y,width:b.width,height:b.height,scale:1.6}});
  const name = 'mp-align-' + label + '.png';
  fs.writeFileSync(os.tmpdir()+'\\'+name, Buffer.from(s.data,'base64'));
  console.log('  SHOT ->', name);

  child.kill('SIGKILL'); server.close();
}

await run(1440, 1000, 'desktop');
console.log('');
await run(390, 900, 'mobile');
process.exit(0);
