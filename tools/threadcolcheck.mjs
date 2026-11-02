/**
 * 验证螺纹速查页：JS 是否按表头含义给每一列上了 tc-col-* 颜色类。
 * 直接连已在跑的预览服务器 localhost:4444（public/ 已是最新构建）。
 */
import os from 'node:os';
import { spawn } from 'node:child_process';

const URL = 'http://localhost:4444/thread/';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 启动 Edge CDP ----
const cport = 9945 + Math.floor(Math.random() * 10);
const child = spawn(EDGE, [
  '--headless=new', '--remote-debugging-port=' + cport,
  '--user-data-dir=' + os.tmpdir() + '\\edge-tc-' + Date.now(),
  '--no-first-run', '--disable-gpu', '--window-size=1440,1000', 'about:blank'
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
  else if (m.method === 'Runtime.exceptionThrown') { console.log('⚠ 页面异常: ' + (JSON.stringify(m.params.exceptionDetails?.exception?.description || m.params).slice(0, 300))); }
};
const send = (m, p) => new Promise((res, rej) => { const id = ++mid; pend.set(id, { res, rej }); sock.send(JSON.stringify({ id, method: m, params: p || {} })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 240) }; return r.result.value; };

let bad = 0;
try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: URL });
  await sleep(2500); // 等 DOMContentLoaded + 3 个延迟 colorColumns

  const report = await ev(`(function(){
    var tables = Array.prototype.slice.call(document.querySelectorAll('.tc-table table'));
    return tables.map(function(t, i){
      var ths = Array.prototype.slice.call(t.querySelectorAll('thead th'));
      var firstRow = t.querySelector('tbody tr');
      var tds = firstRow ? Array.prototype.slice.call(firstRow.children) : [];
      var thInfo = ths.map(function(th){ return { txt: th.textContent.trim(), col: /tc-col-/.test(th.className) }; });
      var tdInfo = tds.map(function(td){ return /tc-col-/.test(td.className); });
      return { idx: i, thCount: ths.length, thInfo: thInfo, tdCount: tds.length, tdAllColored: tdInfo.length>0 && tdInfo.every(Boolean) };
    });
  })()`);

  if (!report || report.__err) { console.log('✗ 取不到报表: ' + (report && report.__err)); process.exit(1); }

  console.log('共 ' + report.length + ' 张表：');
  report.forEach(function(r){
    var thOk = r.thInfo.length>0 && r.thInfo.filter(function(x){ return x.txt; }).every(function(x){ return x.col; });
    // 没有数据行的表（如尚未保存任何自定义规格）只校验表头即可
    var allOk = thOk && (r.tdCount === 0 || r.tdAllColored);
    if (!allOk) bad++;
    var heads = r.thInfo.map(function(x){ return (x.col?'✔':'✘')+x.txt; }).join(' | ');
    console.log((allOk?'✓':'✗') + ' 表#' + r.idx + ' [' + r.thCount + '列] ' + heads + (r.tdCount===0?'  无数据行(仅校验表头)':(r.tdAllColored?'  数据格全上色':'  数据格未全上色')));
  });

  // ---- 动态验证：自定义表保存一行后，新行是否也上色 ----
  const dyn = await ev(`(function(){
    var d=document.getElementById('tcD'), p=document.getElementById('tcP'), n=document.getElementById('tcName'), s=document.getElementById('tcSave');
    if(!d||!p||!s) return {ok:false, why:'控件缺失'};
    n.value='校验非标 M9.5'; d.value='9.5'; p.value='1.25';
    d.dispatchEvent(new Event('input',{bubbles:true})); p.dispatchEvent(new Event('input',{bubbles:true}));
    s.click();
    var row=document.querySelector('#tcCustomBody tr');
    if(!row) return {ok:false, why:'保存后无行'};
    var tds=Array.prototype.slice.call(row.children);
    var cols=tds.map(function(td){ return /tc-col-/.test(td.className); });
    // 最后一个是删除按钮列，本来就不应上色；只校验前面的数据列
    var dataCols = cols.slice(0, cols.length-1);
    return { ok: dataCols.length>0 && dataCols.every(Boolean) && !cols[cols.length-1], dataCount: dataCols.length, lastIsAction: !cols[cols.length-1] };
  })()`);
  console.log((dyn&&dyn.ok?'✓':'✗') + ' 自定义表动态保存行上色 ' + (dyn&&dyn.why?dyn.why:('(数据列 '+dyn.dataCount+' 格全上色，末列删除键不染色)' )));

  console.log(bad === 0 && dyn && dyn.ok ? '\\n全部通过：表头+数据格(含动态行)均已按含义上色' : '\\n仍有未通过项');
} catch (e) {
  console.log('✗ 运行出错: ' + e.message);
  bad = 1;
} finally {
  sock.close(); child.kill('SIGKILL');
  process.exit(bad === 0 ? 0 : 1);
}
