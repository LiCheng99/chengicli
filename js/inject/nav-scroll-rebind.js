/* ============================================================================
 * inject/nav-scroll-rebind.js —— 顶栏滚动逻辑补挂（2026-11-02）
 * ----------------------------------------------------------------------------
 * 【症状】
 *   点菜单用 pjax 进 /music/ 之后，顶栏不再吸顶：
 *   往下滚，整条导航跟着正文一起滚出视口（不等同于"藏起来"，是真的滚走了）；
 *   再往上滑也不会滑回来。同一地址直接打开（整页加载）一切正常。
 *
 * 【根因】
 *   主题 main.js 的 scrollFn() 开头有这么一句：
 *       if (document.body.scrollHeight <= window.innerHeight + 56) {
 *         $rightside.style.cssText = 'opacity: 1; transform: translateX(-58px)'
 *         return
 *       }
 *   pjax:complete 触发时，body 里刚被替换成新页面，滚动高度还没算出来
 *   （实测在浏览器里那一刻读到的高度是旧值/偏小），于是命中提前 return，
 *   后面那句 window.scrollCollect = btf.throttle(...) 根本没执行。
 *   结果：「滚动方向 → nav-fixed / nav-visible」这套逻辑这一页**永久失效**，
 *   因为没有任何地方会再调一次 scrollFn。
 *   实测证据：pjax:complete 时 refreshFn ENTER bound=false → refreshFn OK bound=false；
 *            之后手动 window.refreshFn() 返回 ok，bound 立刻变 true。
 *   所以既不是报错、也不是高度真的不够，纯粹是**跑得太早**。
 *
 * 【修法】
 *   pjax:complete 之后等布局稳定，若 window.scrollCollect 仍为空、且页面高度已经够，
 *   就补调一次 window.refreshFn()。只在「确实没绑上」时调，正常页面零副作用。
 *   不碰 themes/ 源码，坏了删掉这个文件即可回滚。
 * ----------------------------------------------------------------------------
 * ⚠️ 为什么要重试：refreshFn 内部同样有那条高度判断，刚 pjax 完立刻调也可能再
 *    提前 return 一次，所以要隔 100ms 左右再看、直到真正绑上或次数用完。
 * ========================================================================== */
(function () {
  'use strict';

  var MAX_TRIES = 10;      // 最多试 10 次 ≈ 1 秒
  var GAP = 100;           // 每次间隔

  // 已经绑上了就不用管；refreshFn 不存在（主题没加载）也直接放弃
  function needsRebind() {
    return !window.scrollCollect && typeof window.refreshFn === 'function';
  }

  function enoughHeight() {
    var extra = 56; // 与主题那句 innerHeight + 56 保持一致
    return document.body && document.body.scrollHeight > window.innerHeight + extra;
  }

  function rebind(tries) {
    if (!needsRebind()) return;
    if (enoughHeight()) {
      try {
        window.refreshFn();
      } catch (e) {
        // 主题内部出错就别再死磕了，控制台留一条即可
        console.warn('[nav-rebind] refreshFn 调用失败：', e && e.message);
        return;
      }
      // 调完仍然没绑上（还是高度判断拦的），继续等
      if (!needsRebind()) return;
    }
    if (tries < MAX_TRIES) setTimeout(function () { rebind(tries + 1); }, GAP);
  }

  document.addEventListener('pjax:complete', function () {
    // 先让 pjax:complete 的其他监听器（含 pjax.pug 里那次 refreshFn）跑完
    setTimeout(function () { rebind(0); }, 60);
  });
})();
