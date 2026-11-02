/**
 * 实测全站布局几何：
 *   音乐页：.layout / #article-container / 胶囊 / 右侧按钮 的位置与间距
 *   文章页：.layout / #post(文章) / #aside-content(目录) 的位置与间距
 *   node tools/mpwidth.mjs
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

async function run(w, h, url, label) {
  const PORT = 4540 + Math.floor(Math.random()*40);
  const server = http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');
   if(u.pathname.startsWith('/api/')){let b='';req.on('data',c=>b+=c);req.on('end',async()=>{const q={};u.searchParams.forEach((v,k)=>q[k]=v);try{await handler({method:req.method,query:q,headers:req.headers,body:b},adapt(res));}catch(e){res.statusCode=500;res.end('{}')}});return;}
   let p=decodeURIComponent(u.pathname); if(p.endsWith('/'))p+='index.html';
   fs.readFile(path.normalize(path.join(ROOT,p)),(e,d)=>{if(e){res.statusCode=404;res.end('nf');return}res.setHeader('Content-Type',MIME[path.extname(p)]||'application/octet-stream');res.end(d)});});
  await new Promise(r=>server.listen(PORT,r));
  const sleep=m=>new Promise(r=>setTimeout(r,m));
  const port = 9880 + Math.floor(Math.random()*40);
  const child = spawn(EDGE, ['--headless=new','--remote-debugging-port='+port,'--user-data-dir='+os.tmpdir()+'\\edge-wd-'+Date.now(),
    '--no-first-run','--disable-gpu','--window-size='+w+','+h,'about:blank'],{stdio:'ignore'});
  let t=null; for(let i=0;i<60&&!t;i++){try{const l=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();t=l.find(x=>x.type==='page')||null;}catch(e){} if(!t)await sleep(250);}
  const sock=new WebSocket(t.webSocketDebuggerUrl);let mid=0;const pend=new Map();
  await new Promise(r=>{sock.onopen=r;});
  sock.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const{res,rej}=pend.get(m.id);pend.delete(m.id);m.error?rej(new Error(JSON.stringify(m.error))):res(m.result);}};
  const send=(m,p)=>new Promise((res,rej)=>{const id=++mid;pend.set(id,{res,rej});sock.send(JSON.stringify({id,method:m,params:p||{}}));});
  const ev=async expr=>{const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true});if(r.exceptionDetails)return{__err:JSON.stringify(r.exceptionDetails).slice(0,300)};return r.result.value;};

  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:false});
  var full = 'http://127.0.0.1:' + PORT + url;
  await send('Page.navigate',{url:full}); await sleep(6500);
  /* 主题的 pjax 会在首屏后接管并把 .html 地址重写成带斜杠的规范形式，
     落到 404 页。直接用 location.replace 回正。 */
  var cur = await ev('location.pathname');
  console.log('  [nav] want=' + url + ' got=' + cur + ' href=' + await ev('location.href'));
  if (cur !== url) {
    await ev('(function(){ location.replace(' + JSON.stringify(full) + '); return 1; })()');
    await sleep(6500);
    console.log('  [after replace] got=' + await ev('location.pathname') + ' href=' + await ev('location.href'));
  }

  await sleep(1500);
  const raw = await ev('(function(){' +
    'function B(sel){ var el=document.querySelector(sel); if(!el) return null;' +
    'var r=el.getBoundingClientRect(); var cs=getComputedStyle(el);' +
    'return {x:Math.round(r.x), right:Math.round(r.right), w:Math.round(r.width),' +
    'pl:cs.paddingLeft, pr:cs.paddingRight, mw:cs.maxWidth, disp:cs.display}; }' +
    'var out={vw:window.innerWidth};' +
    'var sels=["#body-wrap","#content-inner","#post","#article-container","#aside-content","#rightside","#ds-mini",".mp-page",".mp-deck-card"];' +
    'for(var i=0;i<sels.length;i++){ var b=B(sels[i]); if(b) out[sels[i]]=b; }' +
    'return JSON.stringify(out);' +
    '})()');
  if (raw === undefined || raw === null || (typeof raw === 'object' && raw.__err)) {
    console.log('===== ' + label + ' (' + w + 'px) ===== 测量失败:', JSON.stringify(raw));
    console.log('');
    child.kill('SIGKILL'); server.close();
    return;
  }
  console.log('URL now:', await ev('location.pathname'), ' title:', await ev('document.title'));
  console.log('RAW:', String(raw).slice(0,600));
  const g = JSON.parse(raw);
  console.log('===== ' + label + ' (' + w + 'px) =====');
  console.log('  视口宽:', g.vw);
  for (const k of Object.keys(g)) {
    if (k==='vw') continue;
    const v = g[k];
    console.log('  ' + k.padEnd(18) + ' x=' + String(v.x).padStart(5) + ' right=' + String(v.right).padStart(5) +
      ' w=' + String(v.w).padStart(5) + '  padL=' + v.pl + ' padR=' + v.pr + ' maxW=' + v.mw);
  }
  /* 间距计算 */
  const L = g['#content-inner'], A = g['#aside-content'], P = g['#post'], AC = g['#article-container'];
  if (L && AC) console.log('  → 正文左边缘到视口左:', AC.x, ' 正文右边缘:', AC.right);
  if (AC && A) console.log('  → 正文右边缘 → 目录左边缘 间距:', A.x - AC.right, 'px');
  if (A) console.log('  → 目录右边缘:', A.right, ' 到视口右:', g.vw - A.right, 'px');
  if (P && A) console.log('  → 文章(#post)右边缘:', P.right, ' 目录左边缘:', A.x, ' 间距:', A.x - P.right);
  console.log('');

  child.kill('SIGKILL'); server.close();
}

const art = process.argv[2] || 'posts/canon-r50.html';
for (const w of [1000, 1300, 1600, 1920]) {
  await run(w, 1000, '/', '首页');
}
await run(1000, 1000, '/archives/2026/', '归档页(1000)');
await run(1600, 1000, '/music/', '音乐馆');
process.exit(0);
