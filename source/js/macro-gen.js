/* ============================================================
 * macro-gen.js —— 宏程序生成器界面（/macro/）
 *   模板数据和生成逻辑在 macro-tpls.js（window.MACRO_TPL）
 *   这里只管：分组列表、参数表单、实时生成、高亮、复制下载
 * 只认 .mg-* 和 #mg* 这套标识，别的页面没有，直接 return
 * ============================================================ */
(function () {
  'use strict';

  /* 分组顺序和中文标题，模板里只存英文 key */
  var GROUPS = [
    ['hole', '孔系加工'],
    ['face', '平面铣削'],
    ['slot', '槽与型腔'],
    ['contour', '轮廓成形'],
    ['slope', '斜面与曲面'],
    ['thread', '螺纹铣削'],
    ['pattern', '孔阵列与沉孔'],
    ['lathe', '车床']
  ];

  var ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) { return ESC_MAP[c]; });
  }

  /* ---------------------------------------------------------- 语法高亮
   * 一次扫描，按捕获组编号判类型。顺序＝优先级，注释在最前，
   * 这样注释里的 G / # 不会被二次染色。
   */
  var TOKEN_RE = new RegExp(
    '(\\([^)]*\\))' +                                                      // 1 注释
    '|(#[0-9]+(?:\\.[0-9]+)?|#\\[[^\\]]*\\]|#<[^>]*>)' +                   // 2 宏变量
    '|(\\b(?:IF|THEN|ELSE|END|WHILE|DO|GOTO|EQ|NE|GT|LT|GE|LE|AND|OR|XOR)\\b)' + // 3 宏关键字
    '|(\\b(?:SIN|COS|TAN|ASIN|ACOS|ATAN|SQRT|ABS|ROUND|FIX|FUP|LN|EXP)\\b)' +    // 4 宏函数
    '|(\\b[Oo][0-9]{3,}\\b)' +                                             // 5 程序号
    '|(\\b[Nn][0-9]+\\b)' +                                                // 6 行号
    '|(\\b[Gg][0-9]+(?:\\.[0-9]+)?\\b)' +                                  // 7 G 代码
    '|(\\b[Mm][0-9]+\\b)' +                                                // 8 M 代码
    '|([A-Za-z][-+]?[0-9]*\\.?[0-9]+)' +                                   // 9 地址字 + 数值
    '|([A-Za-z](?=\\[))',                                                  // 10 地址字（后接表达式）
    'g'                                                                    // ← flags 必须是第二个参数
  );

  var CLS = ['', 'mg-t-cm', 'mg-t-var', 'mg-t-kw', 'mg-t-fn', 'mg-t-o',
             'mg-t-n', 'mg-t-g', 'mg-t-m', 'mg-t-addr', 'mg-t-addr'];

  function hlLine(line) {
    var out = '';
    var last = 0;
    var m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(line)) !== null) {
      if (m.index > last) out += esc(line.slice(last, m.index));
      var cls = '';
      for (var i = 1; i < CLS.length; i++) {
        if (m[i] !== undefined) { cls = CLS[i]; break; }
      }
      out += '<span class="' + cls + '">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
      if (m[0] === '') TOKEN_RE.lastIndex++;   // 防零宽死循环
    }
    out += esc(line.slice(last));
    return out;
  }

  function highlight(code) {
    var lines = String(code).split('\n');
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      out.push('<span class="mg-line"><span class="mg-ln">' + (i + 1) +
               '</span><span class="mg-txt">' + (hlLine(lines[i]) || ' ') + '</span></span>');
    }
    return out.join('');
  }

  /* ---------------------------------------------------------- 页面逻辑 */

  function init() {
    var app = document.getElementById('mgApp');
    if (!app) return;
    if (app.getAttribute('data-ready') === '1') return;   // pjax 来回切不重复绑事件

    var TPL = window.MACRO_TPL;
    var picker = document.getElementById('mgPicker');

    /* 模板库是另一个 script，pjax 下有可能晚一步执行，等一下再初始化 */
    if (!TPL || !Object.keys(TPL).length) {
      var tries = 0;
      (function wait() {
        if (window.MACRO_TPL && Object.keys(window.MACRO_TPL).length) {
          app.removeAttribute('data-ready');
          setTimeout(init, 0);
          return;
        }
        if (++tries < 60) { setTimeout(wait, 150); return; }
        if (picker) picker.innerHTML = '<p class="mg-warn">模板库没加载出来：多半是脚本还在旧缓存里，按 Ctrl+F5（Mac 是 Cmd+Shift+R）强刷一次就好。</p>';
      })();
      return;
    }

    app.setAttribute('data-ready', '1');

    var formBox = document.getElementById('mgForm');
    var codeEl = document.getElementById('mgCode');
    var nameEl = document.getElementById('mgName');
    var descEl = document.getElementById('mgDesc');
    var tabs = Array.prototype.slice.call(app.querySelectorAll('.mg-tab'));
    var copyBtn = document.getElementById('mgCopy');
    var dlBtn = document.getElementById('mgDl');

    var state = { kind: 'mill', tpl: null, values: {} };

    function keysOf(kind) {
      return Object.keys(TPL).filter(function (k) { return TPL[k].kind === kind; });
    }

    function defaults(key) {
      var o = {};
      TPL[key].fields.forEach(function (f) { o[f.k] = f.def; });
      return o;
    }

    /* 切模板时用缓存值，没缓存就取默认 */
    function valuesFor(key) {
      if (!state.values[key]) state.values[key] = defaults(key);
      return state.values[key];
    }

    /* 模板按钮：按分组排，每组一个小标题 + 网格 */
    function renderPicker() {
      var keys = keysOf(state.kind);
      picker.innerHTML = '';
      GROUPS.forEach(function (grp) {
        var list = keys.filter(function (k) { return TPL[k].g === grp[0]; });
        if (!list.length) return;

        var sec = document.createElement('div');
        sec.className = 'mg-grp';

        var h = document.createElement('div');
        h.className = 'mg-grp-title';
        h.textContent = grp[1] + ' · ' + list.length;
        sec.appendChild(h);

        var box = document.createElement('div');
        box.className = 'mg-tpls';
        list.forEach(function (key) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'mg-tpl' + (state.tpl === key ? ' is-on' : '');
          b.textContent = TPL[key].name;
          b.title = TPL[key].no + ' · ' + TPL[key].name;
          b.addEventListener('click', function () {
            state.tpl = key;
            renderPicker();
            renderForm();
            renderCode();
            /* 窄屏是上下排列，点完模板顺手滚到参数区 */
            if (window.innerWidth <= 768 && formBox.scrollIntoView) {
              formBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
          box.appendChild(b);
        });
        sec.appendChild(box);
        picker.appendChild(sec);
      });
    }

    function renderForm() {
      var tpl = TPL[state.tpl];
      var vals = valuesFor(state.tpl);
      formBox.innerHTML = '';

      tpl.fields.forEach(function (f) {
        var cell = document.createElement('label');
        cell.className = 'mg-field';
        if (f.tip) cell.title = f.tip;

        var cap = document.createElement('span');
        cap.className = 'mg-cap';
        cap.textContent = f.label;

        var input;
        if (f.type === 'select') {
          input = document.createElement('select');
          f.opts.forEach(function (o) {
            var op = document.createElement('option');
            op.value = o.v;
            op.textContent = o.t;
            input.appendChild(op);
          });
          input.value = String(vals[f.k]);
          input.addEventListener('change', function () {
            vals[f.k] = Number(input.value);
            renderCode();
          });
        } else {
          input = document.createElement('input');
          input.type = 'number';
          input.value = vals[f.k];
          if (f.step != null) input.step = f.step;
          if (f.min != null) input.min = f.min;
          if (f.max != null) input.max = f.max;
          input.inputMode = 'decimal';
          input.addEventListener('input', function () {
            var v = parseFloat(input.value);
            vals[f.k] = isFinite(v) ? v : 0;
            renderCode();
          });
        }

        cell.appendChild(cap);
        cell.appendChild(input);
        formBox.appendChild(cell);
      });

      var tip = document.createElement('p');
      tip.className = 'mg-form-tip';
      tip.textContent = '带下划虚线的参数有说明，鼠标停上去能看。改任何一项，右边立刻重算。';
      formBox.appendChild(tip);
    }

    function renderCode() {
      var tpl = TPL[state.tpl];
      var vals = valuesFor(state.tpl);
      var err = tpl.check ? tpl.check(vals) : null;

      nameEl.textContent = tpl.no + ' · ' + tpl.name;
      descEl.innerHTML = tpl.desc;

      if (err) {
        codeEl.innerHTML = '<span class="mg-line"><span class="mg-ln">!</span>' +
          '<span class="mg-txt mg-err">参数有问题：' + esc(err) + '</span></span>';
        codeEl.removeAttribute('data-code');
        copyBtn.disabled = true;
        dlBtn.disabled = true;
        return;
      }

      var code = tpl.gen(vals);
      codeEl.innerHTML = highlight(code);
      copyBtn.disabled = false;
      dlBtn.disabled = false;
      codeEl.setAttribute('data-code', code);
    }

    function currentCode() {
      return codeEl.getAttribute('data-code') || '';
    }

    /* ---------------------------------------------------------- 复制成功提示
     * 站点的「哎嘿！复制成功🍬」只监听浏览器原生 copy 事件，
     * 而 navigator.clipboard.writeText() 不触发该事件，所以这里自己弹一条。
     * 打上 __fomalCopyToastOff 是为了让 shell.js 的通用提示让位——
     * 老浏览器退回 execCommand('copy') 时会触发 copy 事件，否则两条会叠在一起。
     */
    function copyToast(code) {
      var no = (/^[Oo]\d+/.exec(code) || ['程序'])[0];
      var lines = code.split('\n').length;
      window.__fomalCopyToastOff = Date.now();
      if (typeof window.fomalNotify === 'function') {
        window.fomalNotify({
          title: '哎嘿！复制成功🍬',
          message: no + ' 共 ' + lines + ' 行，粘到记事本另存为 .NC 就能传机床。',
          position: 'top-left',
          offset: 50,
          showClose: true,
          type: 'success',
          duration: 5000
        });
      } else {
        document.dispatchEvent(new Event('copy'));   // 通知脚本没加载时的兜底
      }
    }

    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        var kind = t.getAttribute('data-kind');
        if (kind === state.kind) return;
        state.kind = kind;
        state.tpl = keysOf(kind)[0];
        tabs.forEach(function (x) { x.classList.toggle('is-on', x === t); });
        renderPicker();
        renderForm();
        renderCode();
      });
    });

    copyBtn.addEventListener('click', function () {
      var code = currentCode();
      if (!code) return;

      /* 先占位，让 shell.js 的通用「复制成功」让位（execCommand 会同步触发 copy 事件） */
      window.__fomalCopyToastOff = Date.now();

      var done = function () {
        var old = copyBtn.textContent;
        copyBtn.textContent = '已复制';
        setTimeout(function () { copyBtn.textContent = old; }, 1400);
        copyToast(code);
      };
      var fail = function () {
        if (typeof window.fomalNotify === 'function') {
          window.fomalNotify({
            title: '复制没成功',
            message: '浏览器拦了剪贴板，选中右边程序按 Ctrl+C 也一样。',
            position: 'top-left',
            offset: 50,
            showClose: true,
            type: 'warning',
            duration: 5000
          });
        }
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(done, fallback);
      } else {
        fallback();
      }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        if (ok) done(); else fail();
      }
    });

    dlBtn.addEventListener('click', function () {
      var code = currentCode();
      if (!code) return;
      // 文件名取程序号（O0001），取不到才退回 MACRO
      var m = /^[Oo](\d+)/.exec(code);
      var blob = new Blob([code + '\n'], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = (m ? 'O' + m[1] : 'MACRO') + '.NC';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
    });

    state.tpl = keysOf(state.kind)[0];
    renderPicker();
    renderForm();
    renderCode();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
    /* 正常加载、pjax 换页、以及外部脚本晚到，三条路都兜一遍 */
    window.addEventListener('load', init);
    document.addEventListener('pjax:complete', init);
    document.addEventListener('pjax:success', init);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { highlight: highlight };
  }
})();
