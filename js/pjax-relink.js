/*!
 * pjax-relink.js —— 让「后插入的站内链接」也走 pjax、让跳转存根页不再整页刷新
 *
 * 【2026-10-28 用户报的 bug】
 *   公告栏「每日一言」悬停播放器正放着歌，点首页磁贴「无锡元基 (2)」「查看更多...」
 *   或者页脚「文章分类」，歌就停了、左下角胶囊也消失。
 *
 * 【根因 1】pjax 0.2.8 是「逐元素绑 click」（lib/proto/attach-link.js），初始化时只绑
 *   当时 DOM 里已经存在的 <a>。首页磁贴那两条链接是 hexo-magnet-fomal 用内联脚本
 *   insertAdjacentHTML 插进去的（见 /index.html 里那段 data-pjax 脚本），插完 pjax 早绑完了，
 *   于是点击走浏览器默认跳转 = 整页刷新。整页刷新会销毁 daily-say.js 闭包里的那个
 *   `new Audio()`，歌自然就停在那一刻（胶囊因为是 JS 建的，也一起没了）。
 *   实测：点磁贴后 document 被重新创建，pjax:send / pjax:complete 一次都没触发。
 *   页脚「听点音乐」这类运行期补进去的链接同理，只是以前没人点到。
 *
 * 【根因 2】/categories/ 是 redirect 存根页（source/categories/index.md → redirect_to: /tags/，
 *   模板 themes/fomalhaut/layout/includes/page/redirect.pug）。页脚「文章分类」虽然被 pjax 绑定了，
 *   但存根页被换进来后，它内联的 location.replace("/tags/") 立刻执行 → 强制整页跳到 /tags/，
 *   同样把播放器一起刷掉。
 *
 * 【本文件怎么修】两件互不干扰的事，都不碰主题源码：
 *   1) 捕获阶段（先于元素上的 pjax 监听）：命中 REDIRECTS 表的存根路径 → 直接 pjax.loadUrl(最终地址)，
 *      存根页根本不会被加载，它的 location.replace 也就没机会执行。
 *   2) 冒泡阶段（晚于元素上的 pjax 监听）：pjax 处理过的点击会在元素上留 data-pjax-state 属性，
 *      有这个属性就放行；没有的 = pjax 没绑上的运行期插入链接 → preventDefault 后交给 pjax.loadUrl。
 *   两条合起来：磁贴、页脚补的链接、以后任何新注入的站内链接都自动走 pjax，音乐不再被打断。
 *
 * 新增存根页时：在下面 REDIRECTS 里补一行 '/旧路径/': '/新路径/'。
 * 回滚：删掉本文件，并去掉 _config.fomalhaut.yml 里引用它的那一行。
 */
(function () {
  'use strict';

  /* 存根页（front-matter 里有 redirect_to 的页面）→ 真正的落点。
   *   source/categories/index.md → /tags/（分类已合并进「文章统计」）
   *   注：关于页已彻底搬到 /about/，旧的 /personal/about/ 存根已删除、不再做跳转。 */
  var REDIRECTS = {
    '/categories/': '/tags/'
  };

  function pjaxReady() {
    return !!(window.pjax && typeof window.pjax.loadUrl === 'function');
  }

  /* 取这次点击对应的站内 <a>；不满足条件（外链 / 新窗口 / 修饰键 / 下载 / 锚点 / 伪协议）返回 null */
  function pickLink(e) {
    if (e.button !== 0) return null;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;

    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return null;
    if (a.target && a.target !== '_self') return null;
    if (a.hasAttribute('download')) return null;

    var raw = a.getAttribute('href') || '';
    if (!raw || raw.charAt(0) === '#') return null;
    if (/^(javascript|mailto|tel|data):/i.test(raw)) return null;

    /* 下载 / 资源类链接（.zip/.pdf/.png…）不要当成页面换进来：交给浏览器按原样处理 */
    if (/\.(zip|rar|7z|pdf|png|jpe?g|gif|webp|svg|mp3|mp4|mov|webm|exe|apk|docx?|xlsx?|pptx?|txt|csv)(\?|#|$)/i.test(raw)) return null;

    var u;
    try { u = new URL(a.href, location.href); } catch (err) { return null; }
    if (u.origin !== location.origin) return null;      // 外链交给浏览器
    return { a: a, u: u };
  }

  function redirectTarget(pathname) {
    if (REDIRECTS[pathname]) return REDIRECTS[pathname];
    try {
      var dec = decodeURI(pathname);
      if (REDIRECTS[dec]) return REDIRECTS[dec];
    } catch (e) {}
    return null;
  }

  /* ① 捕获阶段：存根页直连最终地址。
     必须早于 pjax 在 <a> 上的监听，否则它已经 loadUrl(存根页) 了，撤不回来。 */
  document.addEventListener('click', function (e) {
    var hit = pickLink(e);
    if (!hit) return;
    var to = redirectTarget(hit.u.pathname);
    if (!to) return;
    if (!pjaxReady()) return;                            // 没有 pjax 就让它正常跳转
    e.preventDefault();
    e.stopPropagation();
    window.pjax.loadUrl(to);
  }, true);

  /* ② 冒泡阶段：pjax 没绑上的运行期插入链接，补一次 pjax 换页。
     pjax 处理过的点击会先把 data-pjax-state 写到元素上（load / reload / abort），
     所以「没有这个属性」就等于「pjax 没管这次点击」。 */
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented) return;
    var hit = pickLink(e);
    if (!hit) return;
    if (hit.a.hasAttribute('data-pjax-state')) return;
    if (!pjaxReady()) return;
    e.preventDefault();
    window.pjax.loadUrl(hit.u.href);
  }, false);
})();
