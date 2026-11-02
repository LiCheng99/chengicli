'use strict';
/**
 * pdfview.js —— 注册 {% pdfview %} 标签，在文章里嵌入可翻页的 PDF 预览
 *
 * 用法：
 *   {% pdfview /assets/drawings/xxx.pdf %}
 *   {% pdfview /assets/drawings/xxx.pdf 标题文字 %}
 *
 * 与官方 hexo-pdf 的区别：
 *   hexo-pdf 输出 <embed>，手机浏览器（安卓 Chrome / 微信内置）基本不支持内嵌
 *   PDF，会整块空白。这里只输出一个容器 div，由前端 /js/pdf-viewer.js 用
 *   pdf.js 画成 canvas，电脑手机都能翻页。
 *
 * 卸载方式：删掉本文件 + 撤回 _config.fomalhaut.yml 里 pdfViewerCss/Js 两行 inject
 */

const urlFor = require('hexo-util').url_for.bind(hexo);

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

hexo.extend.tag.register('pdfview', function (args, content) {
  // 路径两种写法都支持：
  //   {% pdfview /assets/xxx.pdf %}        → args = ['/assets/xxx.pdf']
  //   {% pdfview %}/assets/xxx.pdf{% endpdfview %} → 内容在 content 里
  let src = (args[0] || '').trim();
  let title = args.slice(1).join(' ').trim();
  if (!src && content) {
    const lines = String(content).trim().split('\n');
    src = (lines[0] || '').trim();
    title = lines.slice(1).join(' ').trim();
  }
  if (!src) return '<p style="color:#c00">pdfview：缺少 PDF 路径</p>';
  const href = escapeAttr(urlFor(src));

  // 首屏放的是 <a>：pdf.js 的 JS 还没加载 / 加载失败 / 浏览器禁用 import() 时，
  // 用户点一下就能在新窗口打开原 PDF，不会看到一块死空白。
  // 前端脚本接管后会把这个 <a> 换成真正的预览器。
  return `<div class="pdfview" data-src="${href}" data-title="${escapeAttr(title)}">`
    + `<a class="pdfv-fallback" href="${href}" target="_blank" rel="noopener">`
    + `<span class="pdfv-fb-icon">📄</span>`
    + `<span class="pdfv-fb-text">${escapeAttr(title) || src.split('/').pop()}</span>`
    + `<span class="pdfv-fb-tip">点击打开 PDF（若内嵌预览未加载）</span>`
    + `</a></div>`;
}, { ends: false });
