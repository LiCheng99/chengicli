/**
 * 验证天文馆页：iframe 是否变宽、侧栏是否隐藏；并确认普通页面（about）布局未被影响。
 * 连已在跑的预览服务器 localhost:4444。
 */
import os from 'node:os';
import { spawn } from 'node:child_process';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cport = 9960 + Math.floor(Math.random() * 8);
const child = spawn(EDGE, [
  '--headless=new', '--remote-debugging-port=' + cport,
  '--user-data-dir=' + os.tmpdir() + '\\edge-astro-' + Date.now(),
  '--no-first-run', '--disable-gpu', '--window-size=1280,900', 'about:blank'
], { stdio: 'ignore' });

let target = null;
for (let i = 0; i < 60 && !target; i++) {
  try { const l = await (await fetch(`http://127.0.0.1:${cport}/json/list`)).json(); target = l.find((x) => x.type === 'page') || null; } catch (e) {}
  if (!target) await sleep(250);
}
if (!target) { console.log('✗ Edge 没起来'); child.kill('SIGKILL'); process.exit(1); }

const sock = new WebSocket(target.webSocketDebuggerUrl);
let mid = 0; const pend = new Map();
await new Promise((r) => { sock.onopen = r; });
sock.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') { console.log('⚠ 异常: ' + (JSON.stringify(m.params.exceptionDetails?.exception?.description || '').slice(0,200))); }
};
const send = (m, p) => new Promise((res, rej) => { const id = ++mid; pend.set(id, { res, rej }); sock.send(JSON.stringify({ id, method: m, params: p || {} })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0,240) }; return r.result.value; };
const go = async (url) => { await send('Page.enable'); await send('Page.navigate', { url }); await sleep(2200); };

let bad = 0;
try {
  // ---- 天文馆页 ----
  await go('http://localhost:4444/box/astronomy/');
  const astro = await ev(`(function(){
    var f = document.getElementById('voyager-frame');
    var lay = document.querySelector('.layout');
    var aside = document.getElementById('aside-content');
    var cs = f ? getComputedStyle(f) : null;
    var lcs = lay ? getComputedStyle(lay) : null;
    var acs = aside ? getComputedStyle(aside) : null;
    return {
      vw: window.innerWidth,
      iframeW: f ? Math.round(f.getBoundingClientRect().width) : null,
      asideDisplay: acs ? acs.display : 'missing',
      layoutPadL: lcs ? lcs.paddingLeft : null,
      layoutPadR: lcs ? lcs.paddingRight : null
    };
  })()`);
  console.log('天文馆页 @视口 ' + astro.vw + 'px：');
  console.log('  iframe 宽 = ' + astro.iframeW + 'px');
  console.log('  侧栏 display = ' + astro.asideDisplay);
  console.log('  .layout padding = ' + astro.layoutPadL + ' / ' + astro.layoutPadR);
  const ok = astro.iframeW && astro.iframeW > astro.vw * 0.7 && astro.asideDisplay === 'none'
    && astro.layoutPadL === '88px' && astro.layoutPadR === '110px';
  if (!ok) bad++;
  console.log((ok?'✓':'✗') + ' 天文馆页：iframe 已变宽 + 侧栏已隐藏 + 留白已缩小');

  // ---- 普通页面（about）应不受影响：仍按比例留白 + 侧栏可见 ----
  await go('http://localhost:4444/about/');
  const normal = await ev(`(function(){
    var lay = document.querySelector('.layout');
    var aside = document.getElementById('aside-content');
    var lcs = lay ? getComputedStyle(lay) : null;
    var acs = aside ? getComputedStyle(aside) : null;
    return { padL: lcs?lcs.paddingLeft:null, padR: lcs?lcs.paddingRight:null, aside: acs?acs.display:'missing', vw: window.innerWidth };
  })()`);
  console.log('\\n普通页(about) @视口 ' + normal.vw + 'px：');
  console.log('  .layout padding = ' + normal.padL + ' / ' + normal.padR + '  侧栏 = ' + normal.aside);
  // 比例留白应为 10.3125vw 量级（非 88/110 固定值）—— 证明天文馆规则未波及普通页
  const expectL = Math.round(normal.vw * 0.103125 + 21);
  const expectR = Math.round(normal.vw * 0.103125 + 7);
  const okN = Math.abs(parseInt(normal.padL) - expectL) <= 3 && Math.abs(parseInt(normal.padR) - expectR) <= 3;
  if (!okN) bad++;
  console.log((okN?'✓':'✗') + ' 普通页：仍按比例留白(' + expectL + '/' + expectR + ')，天文馆规则未波及');
} catch (e) {
  console.log('✗ 出错: ' + e.message); bad = 1;
} finally {
  sock.close(); child.kill('SIGKILL');
  console.log(bad === 0 ? '\\n全部通过' : '\\n有未通过项');
  process.exit(bad === 0 ? 0 : 1);
}
