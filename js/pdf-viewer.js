/* ============================================================
 * pdf-viewer.js —— 文章内 PDF 预览（基于 pdf.js）
 *
 * 用法：在 md 里写
 *   <div class="pdfview" data-src="/assets/drawings/xxx.pdf" data-title=""><a class="pdfv-fallback" href="/assets/drawings/xxx.pdf" target="_blank" rel="noopener"><span class="pdfv-fb-icon">📄</span><span class="pdfv-fb-text">xxx.pdf</span><span class="pdfv-fb-tip">点击打开 PDF（若内嵌预览未加载）</span></a></div>
 *   <div class="pdfview" data-src="/assets/drawings/xxx.pdf" data-title="图纸 F3.6061.0074RM"><a class="pdfv-fallback" href="/assets/drawings/xxx.pdf" target="_blank" rel="noopener"><span class="pdfv-fb-icon">📄</span><span class="pdfv-fb-text">图纸 F3.6061.0074RM</span><span class="pdfv-fb-tip">点击打开 PDF（若内嵌预览未加载）</span></a></div>
 *
 * 极简版：不带工具栏，直接铺出 PDF 页面连续滚动查看，
 * 支持懒渲染、缩放（Ctrl+滚轮 / 双指捏合由浏览器处理）、
 * 左右方向键翻页、pjax 兼容。
 * 为什么不用 hexo-pdf 插件：它输出的是 <embed>，手机浏览器
 * 基本都不支持内嵌 PDF（安卓 Chrome/微信直接空白）。这里用
 * pdf.js 把页面画成 canvas，电脑手机都能看。
 * ============================================================ */
(function () {
  'use strict';

  // 【2026-10-26 修复】这两个文件原本叫 pdf.min.mjs / pdf.worker.min.mjs。
  // 现象：本地 hexo s 一切正常，上传到服务器后预览框只显示「图纸加载失败」。
  // 原因：默认的 nginx mime.types 里没有 mjs，会把 .mjs 当成
  //   application/octet-stream 返回；浏览器对 ES Module 做【严格 MIME 校验】，
  //   类型不是 JS 就拒绝加载 → import() 直接抛错 → 预览框走失败兜底。
  //   本地正常是因为 hexo server 自己把 .mjs 映射成了 text/javascript。
  // 对策：改用 .js 后缀（所有服务器都会按 application/javascript 返回）。
  //   想继续用 .mjs 的话，也可以在服务器 nginx 里补一行
  //   `types { application/javascript mjs; }`。
  var PDFJS_URL = '/js/lib/pdf/pdf.min.js';
  var WORKER_URL = '/js/lib/pdf/pdf.worker.min.js';

  /** 把脚本取回来包成 blob URL，绕开服务器的 MIME 配置 */
  function blobImport(url) {
    return fetch(url, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (code) {
        return URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      });
  }

  var pdfjsPromise = null;
  function loadPdfJs() {
    if (pdfjsPromise) return pdfjsPromise;
    pdfjsPromise = import(PDFJS_URL).then(function (mod) {
      mod.GlobalWorkerOptions.workerSrc = WORKER_URL;
      return mod;
    }).catch(function (err) {
      // 换服务器 / 套 CDN 后 MIME 又被配坏时的兜底：主模块和 worker 都走 blob。
      // Worker 也是以 { type: 'module' } 加载的，同样受 MIME 限制，所以一起换。
      console.warn('[pdfview] 模块直接加载失败，改用 blob 兜底：', err && err.message);
      return blobImport(WORKER_URL).then(function (workerUrl) {
        return blobImport(PDFJS_URL).then(function (mod) {
          mod.GlobalWorkerOptions.workerSrc = workerUrl;
          return mod;
        });
      });
    });
    return pdfjsPromise;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /**
   * 渲染一个 PDF 容器
   * @param {HTMLElement} box  .pdfview 容器
   */
  function setupViewer(box) {
    var src = box.getAttribute('data-src');
    if (!src) return;

    // 清掉服务端渲染的兜底链接，换成真正的预览器
    box.innerHTML = '';

    // ---- 画布区 ----
    var stage = el('div', 'pdfv-stage');
    var pages = el('div', 'pdfv-pages');
    stage.appendChild(pages);

    var loading = el('div', 'pdfv-loading');
    loading.innerHTML = '<div class="pdfv-spin"></div><p>正在加载图纸…</p>';
    stage.appendChild(loading);

    box.appendChild(stage);

    // ---- 状态 ----
    var doc = null;
    var scale = 1;
    var renderQueue = Promise.resolve();

    function baseScale(page, containerWidth) {
      // 让页面宽度贴合容器：容器宽 / (页面原始宽)
      var vp = page.getViewport({ scale: 1 });
      return (containerWidth - 4) / vp.width;
    }

    function stageWidth() {
      return Math.max(280, stage.clientWidth);
    }

    /** 把某一页渲染到它自己的 canvas */
    function renderPage(num, canvas) {
      return doc.getPage(num).then(function (page) {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var vp = page.getViewport({ scale: baseScale(page, stageWidth()) * scale });
        canvas.width = Math.floor(vp.width * dpr);
        canvas.height = Math.floor(vp.height * dpr);
        canvas.style.width = Math.floor(vp.width) + 'px';
        canvas.style.height = Math.floor(vp.height) + 'px';
        var ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return page.render({ canvasContext: ctx, viewport: vp }).promise;
      });
    }

    /** 懒加载：页面接近视口时才真正渲染 */
    var observer = null;
    function observe(itemsArr) {
      if (observer) observer.disconnect();
      if (!('IntersectionObserver' in window)) {
        // 老浏览器：直接全渲染
        itemsArr.forEach(function (item) { requestRender(item); });
        return;
      }
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            var item = en.target.__pdfItem;
            if (item) requestRender(item);
          }
        });
      }, { root: stage, rootMargin: '300px 0px' });
      itemsArr.forEach(function (item) { observer.observe(item.wrap); });
    }

    function requestRender(item) {
      if (item.done || item.busy) return;
      item.busy = true;
      renderQueue = renderQueue.then(function () {
        return renderPage(item.num, item.canvas)
          .then(function () { item.done = true; })
          .catch(function (e) { console.warn('[pdfview] 第' + item.num + '页渲染失败', e); })
          .then(function () { item.busy = false; });
      });
    }

    var items = [];

    /** 重建所有页（首次加载、缩放、容器宽度变化时调用） */
    function build() {
      if (!doc) return;
      pages.innerHTML = '';
      items = [];
      for (var i = 1; i <= doc.numPages; i++) {
        (function (num) {
          var wrap = el('div', 'pdfv-page');
          wrap.setAttribute('data-page', num);
          var canvas = el('canvas');
          wrap.appendChild(canvas);
          var holder = { num: num, wrap: wrap, canvas: canvas, done: false, busy: false };
          wrap.__pdfItem = holder;
          items.push(holder);
          pages.appendChild(wrap);
        })(i);
      }
      observe(items);
    }

    // ---- 缩放：Ctrl/Cmd + 滚轮 ----
    stage.addEventListener('wheel', function (e) {
      if (!doc || !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      var next = Math.max(0.5, Math.min(3, scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      if (next === scale) return;
      scale = next;
      build();
    }, { passive: false });

    // ---- 键盘左右方向键翻页 ----
    box.tabIndex = 0;
    box.addEventListener('keydown', function (e) {
      if (!doc) return;
      var pageH = stage.clientHeight * 0.85;
      if (e.key === 'ArrowLeft') { stage.scrollBy({ top: -pageH, behavior: 'smooth' }); e.preventDefault(); }
      if (e.key === 'ArrowRight') { stage.scrollBy({ top: pageH, behavior: 'smooth' }); e.preventDefault(); }
    });

    // 容器宽度变化（旋转屏幕 / 侧栏折叠）→ 防抖重建
    var resizeTimer = null;
    var lastW = stageWidth();
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var w = stageWidth();
        if (Math.abs(w - lastW) < 20) return;
        lastW = w;
        if (doc) build();
      }, 300);
    });

    // ---- 开始加载 ----
    loadPdfJs().then(function (pdfjs) {
      return pdfjs.getDocument({
        url: src,
        cMapUrl: undefined,
        isEvalSupported: false
      }).promise;
    }).then(function (d) {
      doc = d;
      loading.remove();
      scale = 1;
      build();
    }).catch(function (err) {
      console.error('[pdfview] 加载失败', err);
      loading.innerHTML = '<p class="pdfv-err">图纸加载失败，请直接 '
        + '<a href="' + src + '" target="_blank" rel="noopener">打开原文件</a></p>';
    });
  }

  function init(root) {
    (root || document).querySelectorAll('.pdfview:not([data-ready])').forEach(function (box) {
      box.setAttribute('data-ready', '1');
      setupViewer(box);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }

  // pjax 站内跳转后重新扫描
  document.addEventListener('pjax:complete', function () { init(); });

  // hexo-blog-encrypt 输入密码后是把正文「动态插入」进来的，
  // 不会触发 DOMContentLoaded，所以必须监听 DOM 变化才能接管到。
  if ('MutationObserver' in window) {
    var moTimer = null;
    new MutationObserver(function (mutations) {
      var hasNew = mutations.some(function (m) { return m.addedNodes.length > 0; });
      if (!hasNew) return;
      clearTimeout(moTimer);
      // 用防抖合并批量插入，避免一次解密触发几十次扫描
      moTimer = setTimeout(function () { init(); }, 80);
    }).observe(document.body, { childList: true, subtree: true });
  }

  window.__PDFVIEW_REINIT = init;
})();
