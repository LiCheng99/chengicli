/* ============================================================
 * open-assets-blank.js —— 让文章里的「下载」按钮在新标签页打开
 *
 * 背景：主题的 <a class="btn-beautify " href="/" 
  title=""></a> 标签（themes/chengic/scripts/tag/button.js）
 * 只输出 <a class="btn-beautify" href="...">，没有 target 参数可用，
 * 点图纸 / 程序下载会在当前页跳走，看一半的文章就丢了。
 *
 * 做法：不改主题、不改你的文章，页面跑起来后把「指向 /assets/ 附件的按钮」
 * 统一加上 target="_blank" rel="noopener"。
 * 站内跳转类按钮（比如 btn 指向 /categories/）不受影响。
 *
 * 卸载：删掉本文件 + 撤回 _config.chengic.yml inject.bottom 里那一行
 * ============================================================ */
(function () {
  'use strict';

  // 只认附件路径，避免把站内跳转按钮也改成新窗口
  var IS_ASSET = /\/assets\//i;

  function mark() {
    var links = document.querySelectorAll('#article-container a.btn-beautify');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (a.getAttribute('target')) continue;               // 已经设过了
      var href = a.getAttribute('href') || '';
      if (!IS_ASSET.test(href)) continue;
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mark);
  } else {
    mark();
  }
  document.addEventListener('pjax:complete', mark);

  // 加密文章的正文是输完密码才「动态插入」的，DOMContentLoaded 时还没有按钮，
  // 所以要盯着 DOM 变化补一遍（和 pdf-viewer.js 一个套路）
  if ('MutationObserver' in window) {
    var timer = null;
    new MutationObserver(function (muts) {
      if (!muts.some(function (m) { return m.addedNodes.length > 0; })) return;
      clearTimeout(timer);
      timer = setTimeout(mark, 100);
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
