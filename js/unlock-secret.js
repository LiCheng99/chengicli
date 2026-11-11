/* ============================================================
 * unlock-secret.js —— 给加密文章的锁屏界面补一个「解锁」按钮
 *
 * 背景：hexo-blog-encrypt 默认的锁屏界面只有一个密码框，没有按钮，
 * 只能靠「焦点在输入框里按回车」来解密。下面几种情况会完全没反应：
 *   1. 点过页面别处，焦点不在输入框 → 回车不生效
 *   2. 手机/平板软键盘的「前往」「完成」不一定发出 keydown 13
 *   3. 站内 pjax 跳转进文章时，插件脚本被丢掉，压根没有解密逻辑可跑
 *
 * 本脚本做四件事：
 *   ① 插一个「解锁」按钮（电脑手机都能点）
 *   ② 点按钮 = 在密码框上按一次回车（复用插件自己的解密逻辑，不改它的加密实现）
 *   ③ 发现插件脚本不在页面里（pjax 场景）就补加载一次再解密
 *   ④ 给 alert 去重，避免密码输错时连弹几十个「密码不对」
 *
 * 卸载：删掉本文件 + 撤回 _config.chengic.yml 里 unlockSecretJs 那行 inject
 * ============================================================ */
(function () {
  'use strict';

  var BTN_ID = 'hbeUnlockBtn';
  var STYLE_ID = 'hbeUnlockStyle';
  var lastAttemptAt = 0;      // 简单节流，防止连点把解密跑成一堆弹窗
  var reloaded = false;       // pjax 兜底只做一次

  function box() { return document.getElementById('hexo-blog-encrypt'); }
  function input() { return document.getElementById('hbePass'); }

  var selfFiring = false;   // 标记"这是我们自己派发的回车"，避免自己的监听器再接一次形成递归

  /** 插件用的是 keyCode === 13，现代浏览器构造 KeyboardEvent 时设不了 keyCode，只能覆盖 */
  function pressEnter(el) {
    var ev = new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', bubbles: true, cancelable: true
    });
    Object.defineProperty(ev, 'keyCode', { get: function () { return 13; } });
    Object.defineProperty(ev, 'which', { get: function () { return 13; } });
    Object.defineProperty(ev, 'isComposing', { get: function () { return false; } });
    selfFiring = true;
    try {
      el.dispatchEvent(ev);
    } finally {
      selfFiring = false;
    }
  }

  /** 插件脚本还在不在页面上（pjax 换页时它常常被丢掉） */
  function hbeScriptHere() {
    return !!document.querySelector('script[src*="/lib/hbe.js"]');
  }

  /** 补加载插件脚本，加载完立刻再解一次 */
  function reloadHbe(done) {
    var s = document.createElement('script');
    s.src = '/lib/hbe.js';
    s.setAttribute('data-pjax', '');
    s.onload = function () { setTimeout(done, 150); };
    s.onerror = function () { done(); };
    document.body.appendChild(s);
  }

  /**
   * 浏览器只有在「安全上下文」里才给 WebCrypto（解密要用）。
   * 安全上下文 = https:// 或 localhost/127.0.0.1。
   * 用手机访问 http://192.168.x.x:端口 这种局域网地址时，crypto.subtle 是 undefined，
   * 插件会静默失败——表现就是「输了密码按回车一点反应都没有」。这里给出明确提示。
   */
  function webCryptoOK() {
    return !!(window.crypto && window.crypto.subtle);
  }

  function showHint(msg) {
    var b = box();
    if (!b) return;
    var old = document.getElementById('hbeUnlockHint');
    if (old) old.parentNode.removeChild(old);
    var p = document.createElement('p');
    p.id = 'hbeUnlockHint';
    p.className = 'hbe-unlock-hint';
    p.innerHTML = msg;
    b.appendChild(p);
  }

  function doUnlock() {
    var i = input();
    if (!i) return;

    if (!webCryptoOK()) {
      showHint('当前地址不是 <b>https</b> 或 <b>localhost</b>，浏览器禁用了解密所需的 WebCrypto，'
        + '所以点了没反应。<br>请改用 <b>https://</b> 域名访问；本机调试就用 '
        + '<b>http://localhost:端口</b>，不要用局域网 IP。');
      return;
    }

    var now = Date.now();
    if (now - lastAttemptAt < 2500) return;   // 2.5 秒内不重复触发
    lastAttemptAt = now;

    try { i.focus(); } catch (e) {}
    pressEnter(i);

    // pjax 进来时插件脚本不在 DOM 里，上面这一下等于没发生，补加载后再来一次
    if (!hbeScriptHere() && !reloaded) {
      reloaded = true;
      reloadHbe(function () {
        var i2 = input();
        if (!i2) return;
        try { i2.focus(); } catch (e) {}
        pressEnter(i2);
      });
    }
  }

  /**
   * 把 hexo-blog-encrypt 的「原生 alert」换成符合主题的弹窗。
   * 插件在密码错误（wrongPassMessage）或内容哈希校验不过（wrongHashMessage）
   * 时会调用 alert()，原生弹窗丑、还跟主题风格不搭，这里统一接管成卡片式弹窗。
   * 同时保留 1.5 秒去重，避免连点/连触发时叠一堆弹窗。
   */
  function installAlertGuard() {
    if (window.__hbeAlertGuarded) return;
    window.__hbeAlertGuarded = true;
    window.__origAlert = window.alert;   // 极端环境兜底用
    var lastMsg = null, lastAt = 0;
    window.alert = function (msg) {
      var now = Date.now();
      if (msg === lastMsg && now - lastAt < 1500) return;
      lastMsg = msg;
      lastAt = now;
      try {
        showSecretModal(msg);
      } catch (e) {
        // 极端环境下兜底：还是用回原生 alert，别让错误被吞掉
        /* eslint-disable no-console */
        console.error(e);
        if (window.__origAlert) window.__origAlert(msg);
      }
    };
  }

  /** 主题化错误弹窗（单例，重复时只更新文字） */
  function showSecretModal(msg) {
    var isError = /密码|不对|错误|错|失败/.test(msg || '');
    var title = isError ? '解锁失败' : '提示';
    var btnText = isError ? '重新输入' : '知道了';

    var existing = document.getElementById('hbeModal');
    if (existing) {
      existing.querySelector('.hbe-modal-title').textContent = title;
      existing.querySelector('.hbe-modal-msg').textContent = msg || '';
      existing.querySelector('.hbe-modal-btn').textContent = btnText;
      existing.querySelector('.hbe-modal-ico').className =
        'hbe-modal-ico' + (isError ? '' : ' info');
      return;
    }

    var mask = document.createElement('div');
    mask.className = 'hbe-modal-mask';
    mask.id = 'hbeModal';
    mask.innerHTML =
      '<div class="hbe-modal" role="alertdialog" aria-modal="true">' +
      '<div class="hbe-modal-ico' + (isError ? '' : ' info') + '">' +
      (isError ? '!' : 'i') + '</div>' +
      '<div class="hbe-modal-title"></div>' +
      '<div class="hbe-modal-msg"></div>' +
      '<button class="hbe-modal-btn" type="button"></button>' +
      '</div>';

    mask.querySelector('.hbe-modal-title').textContent = title;
    mask.querySelector('.hbe-modal-msg').textContent = msg || '';
    var btn = mask.querySelector('.hbe-modal-btn');
    btn.textContent = btnText;

    function close() {
      if (mask.parentNode) mask.parentNode.removeChild(mask);
    }
    btn.addEventListener('click', function () {
      close();
      // 关掉后把光标送回密码框并选中，方便直接重输
      var i = input();
      if (i) { try { i.focus(); i.select(); } catch (e) {} }
    });
    mask.addEventListener('click', function (e) {
      if (e.target === mask) close();   // 点遮罩空白处关闭
    });

    (document.body || document.documentElement).appendChild(mask);
  }

  function addButton(pwdBox) {
    if (document.getElementById(BTN_ID)) return;

    var btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.className = 'hbe-unlock-btn';
    btn.textContent = '解锁';

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      btn.disabled = true;
      btn.textContent = '解锁中…';
      doUnlock();
      setTimeout(function () {
        // 还锁着就把按钮恢复，方便再试；解开了就不用管了
        if (input()) { btn.disabled = false; btn.textContent = '解锁'; }
      }, 2600);
    });

    var host = pwdBox.closest('.hbe-input') || pwdBox.parentNode;
    host.parentNode.insertBefore(btn, host.nextSibling);

    // 输入框里回车也走同一套（比插件自带监听更稳：带节流、带 pjax 兜底）
    pwdBox.addEventListener('keydown', function (e) {
      if (selfFiring) return;   // 忽略我们自己派发的那一次，否则会无限递归
      if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        doUnlock();
      }
    });
  }

  function injectStyleOnce() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      '.hbe-unlock-btn{',
      '  display:block;margin:16px auto 0;padding:9px 30px;',
      '  border:none;border-radius:8px;cursor:pointer;',
      '  background:var(--theme-color,#49b1f5);color:#fff;',
      '  font-size:14px;line-height:1.6;letter-spacing:2px;',
      '  transition:opacity .15s,transform .1s;-webkit-tap-highlight-color:transparent;',
      '}',
      '.hbe-unlock-btn:hover{opacity:.88}',
      '.hbe-unlock-btn:active{transform:scale(.96)}',
      '.hbe-unlock-btn:disabled{opacity:.6;cursor:default}',
      '.hbe-unlock-hint{margin:14px auto 0;max-width:420px;padding:10px 14px;',
      '  background:rgba(255,90,90,.12);border:1px solid rgba(255,90,90,.4);',
      '  border-radius:8px;color:#ffd7d7;font-size:13px;line-height:1.7;text-align:left}',
      // —— 错误密码 / 提示弹窗（替代浏览器原生 alert，丑且样式跟主题不搭）——
      '.hbe-modal-mask{position:fixed;inset:0;z-index:99999;',
      '  display:flex;align-items:center;justify-content:center;padding:24px;',
      '  box-sizing:border-box;background:rgba(18,22,33,.45);',
      '  -webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);',
      '  animation:hbeMaskIn .18s ease both}',
      '.hbe-modal{width:min(360px,100%);box-sizing:border-box;',
      '  background:var(--card-bg,#fff);color:var(--font-color,#1f1f1f);',
      '  border-radius:14px;box-shadow:0 14px 44px rgba(0,0,0,.28);',
      '  border-top:4px solid var(--theme-color,#49b1f5);',
      '  padding:28px 24px 22px;text-align:center;',
      '  animation:hbeModalIn .22s cubic-bezier(.2,.9,.3,1.25) both}',
      '.hbe-modal-ico{width:56px;height:56px;border-radius:50%;margin:0 auto 14px;',
      '  display:flex;align-items:center;justify-content:center;',
      '  font-size:30px;font-weight:700;line-height:1;font-family:system-ui,sans-serif;',
      '  background:rgba(255,90,90,.12);color:#ff5a5a}',
      '.hbe-modal-ico.info{background:rgba(73,177,245,.14);color:var(--theme-color,#49b1f5)}',
      '.hbe-modal-title{font-size:17px;font-weight:700;margin-bottom:8px}',
      '.hbe-modal-msg{font-size:14px;line-height:1.7;opacity:.85}',
      '.hbe-modal-btn{margin-top:20px;padding:9px 30px;border:none;border-radius:8px;',
      '  cursor:pointer;background:var(--theme-color,#49b1f5);color:#fff;',
      '  font-size:14px;letter-spacing:1px;transition:opacity .15s,transform .1s;',
      '  -webkit-tap-highlight-color:transparent}',
      '.hbe-modal-btn:hover{opacity:.88}',
      '.hbe-modal-btn:active{transform:scale(.96)}',
      '@keyframes hbeMaskIn{from{opacity:0}to{opacity:1}}',
      '@keyframes hbeModalIn{from{opacity:0;transform:translateY(10px) scale(.96)}',
      '  to{opacity:1;transform:none}}'
    ].join('');
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  function init() {
    var b = box();
    var i = input();
    if (!b || !i) return;
    installAlertGuard();
    injectStyleOnce();
    addButton(i);
  }

  /** 是否还锁着：密码框 #hbePass 只在锁屏态存在，解密后容器还在但输入框没了 */
  function locked() { return !!input(); }

  /**
   * 加密文章的「目录」被主题模板写死 display:none（card_post_toc.pug 里
   * page.encrypt == true 那个分支），正文没解锁前目录点了确实没法跳，
   * 但解锁之后也没有任何脚本把它放开 —— 表现就是：F5 全页刷新后目录永远不见。
   *
   * 为什么插件自己放不开（注意这里以前写错了，别再改回去）：
   * hbe.js 解密成功后确实会把 .toc-div-class 设成 display:inline，但解密是异步的
   * （WebCrypto 回调）。F5 时密码缓存在 localStorage（key 是 hexo-blog-encrypt:#路径），
   * 不用等人工输入，解密往往在「侧栏 #card-toc 还没被解析出来」的那一刻就完成了，
   * 插件 getElementsByClassName('toc-div-class') 拿到 0 个元素，那个循环等于没跑，
   * 目录就永远停在模板写死的 none。手动输密码时人慢机器快，反而一切正常。
   *
   * 以前的判断是 `if (box()) return` —— 但 box() 取的是 #hexo-blog-encrypt，
   * 解密后容器本身不会消失（只换 innerHTML），所以那行等于「永远 return」，
   * 这个兜底从来没生效过。改成看密码框在不在。
   */
  function revealToc() {
    if (locked()) return;                    // 还锁着，不动
    var list = document.querySelectorAll('#card-toc .toc-content, .toc-div-class');
    for (var i = 0; i < list.length; i++) {
      var toc = list[i];
      if (!toc.querySelector('.toc-link')) continue;
      if (toc.style.display === 'none') toc.style.display = '';
    }
  }

  /**
   * 表格补包一层 .table-wrap。
   * 主题的 addTableWrap()（themes/chengic/source/js/main.js）只在
   * DOMContentLoaded / pjax:complete 各跑一次，而加密文章的正文是「解密后」才插进来的：
   * pjax 进文章时那一刻正文还是锁屏，一个 table 都没有，于是这些表格永远拿不到 .table-wrap。
   * 少了它自带的 `margin: 0 0 20px`，表现就是「下载」按钮紧贴甚至压在上方表格下面；
   * 也少了 overflow-x: scroll，窄屏时宽表格直接把版面撑破。
   * 解密完成后补包一次，已经包过的（F5 那种 refreshFn 跑得比解密晚的情况）跳过。
   */
  function wrapTables() {
    var host = document.getElementById('article-container');
    if (!host) return;

    // 0) 先把嵌套的 .table-wrap 拍平。
    //    .table-wrap 是 overflow-x: scroll，套两层就画两条 8px 的水平滚动条
    //    （Windows 上无溢出时 thumb 会填满轨道，看着就是表格底下多两条灰线）。
    var nest = host.querySelectorAll('.table-wrap > .table-wrap');
    for (var k = 0; k < nest.length; k++) {
      var inner = nest[k], outer = inner.parentNode;
      var gp = outer && outer.parentNode;
      if (!gp) continue;
      gp.insertBefore(inner, outer);   // 内层提到外层位置
      if (outer.parentNode) outer.parentNode.removeChild(outer);
    }

    // 1) 没包过的 table 补一层（加密文章 pjax 进来时主题那次跑在解密之前，一个 table 都没抓到）
    var tables = host.querySelectorAll('table');
    for (var i = 0; i < tables.length; i++) {
      var t = tables[i];
      var parent = t.parentNode;
      if (!parent) continue;
      if (parent.classList && parent.classList.contains('table-wrap')) continue;   // 主题已经包过
      if (t.closest && t.closest('.highlight')) continue;                          // 代码块里的表格不动
      var wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      parent.insertBefore(wrap, t);
      wrap.appendChild(t);
    }
  }

  /**
   * 解密完成后的「补一遍主题该做的事」。
   * 只碰这两件，不去调主体 refreshFn()：那个函数会重复绑定 #toggle-menu 点击、
   * tabs/hide 插件、评论初始化等一堆监听，跑第二遍就是各种双触发。
   */
  var lastHeadCount = -1;   // 上次重抓目录时的正文标题数量，防止每次 DOM 变动都重抓一遍
  function enhance() {
    if (locked()) return;
    revealToc();
    wrapTables();
    // 目录滚动高亮：主题那次 refreshFn 抓到的正文标题列表是空的，这里让它重抓一次。
    // 只在标题数量变化时重抓（解密前 0 个 → 解密后 5 个），否则聊天框之类频繁插节点
    // 会把这个防抖回调反复触发，每次都重建一遍滚动监听，纯浪费。
    if (typeof window.__fomalTocResync !== 'function') return;
    var host = document.getElementById('article-container');
    var n = host ? host.querySelectorAll('h1,h2,h3,h4,h5,h6').length : 0;
    if (n === lastHeadCount) return;
    lastHeadCount = n;
    try { window.__fomalTocResync(); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); enhance(); });
  } else {
    init();
    enhance();
  }
  document.addEventListener('pjax:complete', function () { init(); enhance(); });

  // 锁屏界面可能是加密正文插入后才出现的（pjax / 异步渲染），持续盯着；
  // 解密完成（正文被 innerHTML 换进来）、以及此后任何内容插入（比如懒加载补图）都走 enhance，
  // 保证目录放开和表格补包不会因为「跑得太早」而漏掉。
  if ('MutationObserver' in window) {
    var timer = null;
    new MutationObserver(function (muts) {
      if (!muts.some(function (m) { return m.addedNodes.length > 0; })) return;
      clearTimeout(timer);
      timer = setTimeout(function () { init(); enhance(); }, 100);
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  window.__HBE_UNLOCK_INIT = init;
})();
