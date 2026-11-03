/*!
 * 微信 / QQ 二维码 → 同页灯箱展示（不跳转、不下载、不新开标签页）
 * ----------------------------------------------------------------------------
 * 背景：作者卡那张「微信-Wechat」按钮（#card-info-btn）原来把二维码图片当链接，
 *      target=_blank，点一下浏览器就跳到图片页 —— 读者以为被带走了。
 *      fomal.cc 的效果是就地弹层看图，这里照做。
 *
 * 生效对象（满足两条才算）：
 *   ① 元素是 a.social-icon，或者位于作者卡 .card-info / #card-info-btn 内；
 *   ② href 指向图片（png/jpg/webp/gif/avif/bmp/svg）。
 *   → 文章正文里的图片链接、B站/邮箱/QQ 聊天之类的普通外链都不会被接管。
 *   可选 data-qr / data-caption 属性覆盖二维码图与说明文字；data-qr-off 可单独豁免。
 *
 * 实现：文档级事件委托（capture 阶段）。不依赖「元素何时被绑定」，作者卡被 pjax
 *      或其它脚本重建后依然生效；脚本执行本身留了 data-wechat-qr 探针便于排查。
 * 依赖：主题 fancybox: true（Fancybox v4）。万一没就绪，用自建遮罩兜底
 *      —— 不能用 window.open：图片在对象存储上时响应头可能是 attachment，新标签页会变成下载。
 * 回滚：删掉 _config.fomalhaut.yml inject.bottom 里的 <script src="/js/wechat-qr.js?..."></script>
 *      以及本文件即可，社交图标会退回「直接打开图片」。
 */
(function () {
  'use strict';

  var IMG_EXT = /\.(png|jpe?g|webp|gif|avif|bmp|svg)(\?|#|$)/i;
  var SCOPE = '.card-info, #card-info-btn, a.social-icon';
  var ALLOW_EXTRA = '.social-icon, #card-info-btn';

  document.documentElement.setAttribute('data-wechat-qr', 'ready'); // 探针标记：脚本已执行

  function isQrAnchor(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.hasAttribute('data-qr-off')) return false;
    var href = el.getAttribute('href') || el.getAttribute('data-href') || '';
    if (!IMG_EXT.test(href)) return false;
    // 只接管作者卡 / 社交图标区里的图片链接，别抢文章正文的图片
    return !!(el.closest(SCOPE) || el.matches(ALLOW_EXTRA) || el.hasAttribute('data-qr'));
  }

  function captionOf(el) {
    var raw = el.getAttribute('data-caption') ||
      el.getAttribute('title') ||
      (el.querySelector('span') || {}).textContent ||
      el.textContent || '';
    raw = String(raw).trim();
    if (/微信|wechat|weixin/i.test(raw)) return '微信 · 扫码添加好友';
    if (/qq/i.test(raw)) return 'QQ · 扫码添加好友';
    if (/二维码|扫码|qr/i.test(raw)) return raw;
    return raw || '扫码添加好友';
  }

  function srcOf(el) {
    return el.getAttribute('data-qr') || el.getAttribute('href') || el.getAttribute('data-href') || '';
  }

  /* ---------- 兜底遮罩：Fancybox 没就绪时自己铺一层 ---------- */
  var closeOverlay = null;
  function overlay(src, caption) {
    if (closeOverlay) closeOverlay();   // 先关掉上一个，避免叠两层
    var wrap = document.createElement('div');
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.82);' +
      'display:flex;align-items:center;justify-content:center;padding:4vh 4vw;cursor:zoom-out;' +
      'opacity:0;transition:opacity .18s ease';

    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:14px;padding:14px 14px 10px;' +
      'max-width:min(420px,86vw);text-align:center;box-shadow:0 18px 60px rgba(0,0,0,.5);position:relative';

    var img = document.createElement('img');
    img.src = src;
    img.alt = caption;
    img.style.cssText = 'display:block;width:100%;height:auto;max-height:74vh;object-fit:contain;border-radius:8px';

    var p = document.createElement('p');
    p.textContent = caption;
    p.style.cssText = 'margin:10px 0 2px;color:#333;font-size:14px;font-family:inherit';

    var x = document.createElement('button');
    x.type = 'button';
    x.setAttribute('aria-label', '关闭');
    x.textContent = '×';
    x.style.cssText = 'position:absolute;top:-14px;right:-14px;width:32px;height:32px;border:0;border-radius:50%;' +
      'background:#fff;color:#333;font-size:20px;line-height:1;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25)';

    box.appendChild(x);
    box.appendChild(img);
    box.appendChild(p);
    wrap.appendChild(box);

    function close() {
      document.removeEventListener('keydown', onKey, true);
      document.documentElement.style.overflow = '';
      wrap.remove();
      closeOverlay = null;
    }
    function onKey(e) { if (e.key === 'Escape' || e.key === 'Esc') { e.stopPropagation(); close(); } }

    wrap.addEventListener('click', function (e) { if (e.target === wrap || e.target === x) close(); });
    x.addEventListener('click', close);
    document.addEventListener('keydown', onKey, true);
    document.documentElement.style.overflow = 'hidden';

    document.body.appendChild(wrap);
    requestAnimationFrame(function () { wrap.style.opacity = '1'; });
    closeOverlay = close;
  }

  function show(src, caption) {
    if (window.Fancybox && typeof window.Fancybox.show === 'function') {
      try {
        window.Fancybox.show([{ src: src, type: 'image', caption: caption }], {});
        return;
      } catch (e) { /* 落到自建遮罩 */ }
    }
    overlay(src, caption);
  }

  function onDocClick(ev) {
    var el = ev.target && ev.target.closest ? ev.target.closest('a[href], a[data-href]') : null;
    if (!isQrAnchor(el)) return;
    var src = srcOf(el);
    if (!src) return;
    // capture 阶段先手接管：拦掉 target=_blank 的新标签页 / 导航 / 默认下载
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    show(src, captionOf(el));
  }

  document.addEventListener('click', onDocClick, true);
  // 键盘回车激活链接时也走同一套（回车触发的 click 已被上面覆盖，这里兜底）
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter') return;
    var el = ev.target && ev.target.closest ? ev.target.closest('a[href], a[data-href]') : null;
    if (!isQrAnchor(el)) return;
    ev.preventDefault();
    ev.stopPropagation();
    show(srcOf(el), captionOf(el));
  }, true);
})();
