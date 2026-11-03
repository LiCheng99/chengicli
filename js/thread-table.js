/* ============================================================
 * thread-table.js —— 螺纹规格速查页
 *   1) 搜索：只显示命中的行，没命中的隐藏
 *   2) 分类切换
 *   3) 表头吸顶：把顶部工具条的底边位置写进 --tc-top
 *   4) 自定义螺纹：非标规格计算 + 本机保存
 * 只认 .tc-* 这套 id / 类名，站内其它页面没有这些元素，不会有任何动作
 * ============================================================ */
(function () {
  'use strict';

  function init() {
    var search = document.getElementById('tcSearch');
    if (!search) return;                      // 不是这个页面，直接退出
    var clear = document.getElementById('tcClear');
    var count = document.getElementById('tcCount');
    var cats = Array.prototype.slice.call(document.querySelectorAll('.tc-cat'));
    var secs = Array.prototype.slice.call(document.querySelectorAll('.tc-sec'));

    var curCat = 'all';

    function norm(s) {
      return String(s).toLowerCase().replace(/\s+/g, '');
    }

    /* 主题会给每个 <table> 自动套一层 .table-wrap（overflow-x: scroll）。
     * 只要祖先里有任何滚动容器，thead 的 sticky 就只相对它生效，
     * 页面一滚表头照样跑掉 —— 所以这里直接把这一层拆掉。
     */
    function unwrapTables() {
      Array.prototype.slice.call(document.querySelectorAll('.tc-table > .table-wrap'))
        .forEach(function (w) {
          var p = w.parentNode;
          while (w.firstChild) p.insertBefore(w.firstChild, w);
          p.removeChild(w);
        });
    }
    unwrapTables();

    /* 每次都重新查一次，这样「自定义螺纹」新增的行也能被过滤到 */
    function allRows() {
      return Array.prototype.slice.call(document.querySelectorAll('.tc-table tbody tr'));
    }

    function apply() {
      var kw = norm(search.value);
      var rows = allRows();
      var shownRows = 0;

      rows.forEach(function (tr) {
        var hit = !kw || norm(tr.textContent).indexOf(kw) !== -1;
        var sec = tr.closest('.tc-sec');
        var catOk = curCat === 'all' || (sec && sec.getAttribute('data-cat') === curCat);
        var show = hit && catOk;
        tr.classList.toggle('is-hide', !show);
        tr.classList.toggle('is-hit', !!kw && show);
        if (show) shownRows++;
      });

      // 整个区块一行都没命中就收起来（自定义区块有 data-keep，永远保留）
      secs.forEach(function (sec) {
        if (curCat !== 'all' && sec.getAttribute('data-cat') !== curCat) {
          sec.classList.add('is-hide');
          return;
        }
        sec.classList.remove('is-hide');
        var visible = sec.querySelectorAll('.tc-table tbody tr:not(.is-hide)').length;
        sec.style.display = (visible || sec.getAttribute('data-keep')) ? '' : 'none';
      });

      if (count) {
        count.textContent = kw
          ? '匹配到 ' + shownRows + ' 条规格'
          : '共收录 ' + rows.length + ' 条规格（可直接输入关键词过滤）';
      }
      if (clear) clear.classList.toggle('is-show', !!search.value);
    }

    /* ---------- 列色彩区分 ----------
     * 按表头文字把每一列归到固定含义（规格 / 大径 / 小径 / 牙高 / 螺距 / 底孔 / 每英寸牙数），
     * 给 th 和同列的 td 都加上 tc-col-* 类，CSS 据此上色。整页各表（含动态生成的自定义表）统一配色。
     * 映射直接认中文关键字，所以「底孔钻头 mm」和「内螺纹底孔 mm」会归到同一色（都是底孔）。
     */
    function colToken(text) {
      var t = norm(text);
      if (t.indexOf('规格') !== -1) return 'key';
      if (t.indexOf('大径') !== -1) return 'major';
      if (t.indexOf('小径') !== -1) return 'minor';
      if (t.indexOf('牙高') !== -1) return 'height';
      if (t.indexOf('螺距') !== -1) return 'pitch';
      if (t.indexOf('底孔') !== -1) return 'drill';        // 底孔钻头 / 内螺纹底孔
      if (t.indexOf('每英寸牙数') !== -1) return 'tpi';
      return null;
    }

    function colorColumns() {
      Array.prototype.slice.call(document.querySelectorAll('.tc-table table')).forEach(function (table) {
        var ths = table.querySelectorAll('thead th');
        var tokens = [];
        Array.prototype.slice.call(ths).forEach(function (th, i) {
          var tok = colToken(th.textContent);
          tokens[i] = tok;
          if (tok) th.classList.add('tc-col-' + tok);
        });
        Array.prototype.slice.call(table.querySelectorAll('tbody tr')).forEach(function (tr) {
          var tds = tr.children;
          for (var i = 0; i < tds.length; i++) {
            var tok = tokens[i];
            if (tok) tds[i].classList.add('tc-col-' + tok);
          }
        });
      });
    }

    /* ---------- 表头吸顶 ----------
     * .tc-wrap 自己是 sticky（贴在导航栏下面），
     * 表头就要吸在它的下边缘，所以实时把它的 bottom 写进 --tc-top。
     */
    var wrap = document.querySelector('.tc-wrap');
    var root = document.documentElement;
    var lastTop = -1;
    var rafId = 0;

    function syncTop() {
      rafId = 0;
      if (!wrap) return;
      var v = Math.round(wrap.getBoundingClientRect().bottom);
      if (v < 0) v = 0;
      if (v !== lastTop) {
        lastTop = v;
        root.style.setProperty('--tc-top', v + 'px');
      }
    }
    function queue() { if (!rafId) rafId = requestAnimationFrame(syncTop); }

    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    if (window.ResizeObserver && wrap) new ResizeObserver(queue).observe(wrap);

    /* ============================================================
     * 自定义螺纹：非标规格计算
     * ============================================================ */
    var COEF = {
      '60':  { h: 0.613435, k: 1.226869, kIn: 1.082532, pct: true  },  // 公制 / 统一
      '55':  { h: 0.640327, k: 1.280654, kIn: 1.137329, pct: true  },  // 惠氏 / 管
      'npt': { h: 0.800000, k: 1.600000, kIn: 1.600000, pct: false },  // 锥管
      '30':  { pct: false },                                            // 梯形 Tr
      '29':  { pct: false }                                             // 梯形 Acme
    };
    var STORE_KEY = 'tcCustomThreads';

    var typeSel = document.getElementById('tcType');
    var nameIn = document.getElementById('tcName');
    var dIn = document.getElementById('tcD');
    var pIn = document.getElementById('tcP');
    var tpiIn = document.getElementById('tcTpi');
    var pctIn = document.getElementById('tcPct');
    var pctTxt = document.getElementById('tcPctTxt');
    var outEl = document.getElementById('tcOut');
    var hintEl = document.getElementById('tcHint');
    var saveBtn = document.getElementById('tcSave');
    var cBody = document.getElementById('tcCustomBody');
    var emptyEl = document.getElementById('tcEmpty');

    function f3(v) { return (Math.round(v * 1000) / 1000).toFixed(3); }
    function f2(v) { return (Math.round(v * 100) / 100).toFixed(2); }

    function load() {
      try {
        var raw = localStorage.getItem(STORE_KEY);
        var arr = raw ? JSON.parse(raw) : [];
        return Object.prototype.toString.call(arr) === '[object Array]' ? arr : [];
      } catch (e) { return []; }
    }
    function store(arr) {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(arr)); } catch (e) {}
    }

    var custom = load();

    /* 螺距 ⇄ 每英寸牙数 双向联动 */
    var syncing = false;
    function bindPair(a, b, fn) {
      a.addEventListener('input', function () {
        if (syncing) return;
        syncing = true;
        fn(a.value, b);
        syncing = false;
      });
    }
    if (pIn && tpiIn) {
      bindPair(pIn, tpiIn, function (v, target) {
        var n = parseFloat(v);
        target.value = (isFinite(n) && n > 0) ? f2(25.4 / n) : '';
        renderOut();
      });
      bindPair(tpiIn, pIn, function (v, target) {
        var n = parseFloat(v);
        target.value = (isFinite(n) && n > 0) ? f3(25.4 / n) : '';
        renderOut();
      });
    }

    /* 核心计算 */
    function calc() {
      var type = typeSel.value;
      var c = COEF[type];
      var D = parseFloat(dIn.value);
      var P = parseFloat(pIn.value);
      if (!isFinite(D) || !isFinite(P) || D <= 0 || P <= 0) return null;

      var h, minor, drill;
      if (type === '30') {                       // Tr：ac 间隙随螺距变
        var ac = P <= 5 ? 0.25 : (P <= 12 ? 0.5 : 1);
        h = 0.5 * P + ac;
        minor = D - P - 2 * ac;
        drill = D - P;
      } else if (type === '29') {                // Acme：0.01″ 间隙
        h = 0.5 * P + 0.254;
        minor = D - P - 0.508;
        drill = D - P;
      } else {
        h = c.h * P;
        minor = D - c.k * P;
        drill = c.pct ? (D - c.kIn * P * (parseInt(pctIn.value, 10) / 100)) : (D - c.kIn * P);
      }
      return { type: type, D: D, P: P, h: h, minor: minor, drill: drill,
               tpi: parseFloat(tpiIn.value), pct: parseInt(pctIn.value, 10) };
    }

    function renderOut() {
      if (!outEl) return;
      var r = calc();
      if (!r) {
        outEl.className = 'tc-out is-empty';
        outEl.textContent = '填好「大径」和「螺距」（或每英寸牙数）后，这里会实时算出小径、牙高和底孔钻头。';
        if (saveBtn) saveBtn.disabled = true;
        return;
      }
      if (saveBtn) saveBtn.disabled = false;
      outEl.className = 'tc-out';
      var tpiTxt = isFinite(r.tpi) && r.tpi > 0 ? f2(r.tpi) : f2(25.4 / r.P);
      outEl.innerHTML =
        item(f3(r.D), '大径 mm') +
        item(f3(r.minor), '小径 mm') +
        item(f3(r.h), '牙高 mm') +
        item(f3(r.P), '螺距 mm') +
        item(tpiTxt, '每英寸牙数') +
        item(f2(r.drill), r.type === '30' || r.type === '29' ? '内螺纹底孔 mm' : '底孔钻头 mm');
    }

    function item(v, label) {
      return '<div class="tc-out-item"><b>' + v + '</b><span>' + label + '</span></div>';
    }

    /* 渲染自定义表格 */
    function renderCustom() {
      if (!cBody) return;
      cBody.innerHTML = custom.map(function (r, i) {
        return '<tr><td class="tc-key">' + esc(r.name) + '</td>' +
          '<td>' + esc(r.D) + '</td><td>' + esc(r.minor) + '</td>' +
          '<td>' + esc(r.h) + '</td><td>' + esc(r.P) + '</td>' +
          '<td>' + esc(r.drill) + '</td>' +
          '<td><button type="button" class="tc-del" data-i="' + i + '" title="删除"></button></td></tr>';
      }).join('');
      if (emptyEl) emptyEl.style.display = custom.length ? 'none' : '';
      colorColumns();                          // 动态生成的自定义行也要上色
    }

    function esc(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /* 保存 */
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var r = calc();
        if (!r) { if (hintEl) hintEl.textContent = '先把大径和螺距填完整'; return; }
        var nm = (nameIn.value || '').trim();
        if (!nm) nm = '自定义 ' + f3(r.D) + '×' + f3(r.P);
        if (r.type === '60' || r.type === '55') nm += ' ·' + r.pct + '%';
        custom.push({
          name: nm, D: f3(r.D), minor: f3(r.minor),
          h: f3(r.h), P: f3(r.P), drill: f2(r.drill)
        });
        store(custom);
        renderCustom();
        apply();
        if (hintEl) {
          hintEl.textContent = '已保存：' + nm;
          setTimeout(function () { hintEl.textContent = ''; }, 2600);
        }
      });
    }

    /* 删除（事件委托，行是动态生成的） */
    if (cBody) {
      cBody.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('.tc-del') : null;
        if (!btn) return;
        var i = parseInt(btn.getAttribute('data-i'), 10);
        if (isNaN(i)) return;
        custom.splice(i, 1);
        store(custom);
        renderCustom();
        apply();
      });
    }

    /* 输入框联动 */
    [typeSel, dIn, pctIn].forEach(function (el) {
      if (el) el.addEventListener('input', renderOut);
    });
    if (pctIn && pctTxt) {
      pctIn.addEventListener('input', function () { pctTxt.textContent = pctIn.value; });
    }

    /* ---------- 搜索 / 分类 ---------- */
    var timer = null;
    search.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(apply, 120);
    });

    if (clear) {
      clear.addEventListener('click', function () {
        search.value = '';
        apply();
        search.focus();
      });
    }

    cats.forEach(function (btn) {
      if (btn.id === 'tcSave') return;           // 别把保存按钮当成分类按钮
      btn.addEventListener('click', function () {
        cats.forEach(function (b) { b.classList.remove('is-on'); });
        btn.classList.add('is-on');
        curCat = btn.getAttribute('data-cat') || 'all';
        apply();
        queue();
      });
    });

    document.addEventListener('keydown', function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (e.key === '/' && document.activeElement !== search && tag !== 'INPUT' && tag !== 'SELECT') {
        e.preventDefault();
        search.focus();
      }
      if (e.key === 'Escape' && document.activeElement === search) {
        search.value = '';
        apply();
        search.blur();
      }
    });

    renderCustom();
    renderOut();
    apply();
    colorColumns();
    syncTop();
    // 主题包 .table-wrap 的脚本可能比本文件晚执行，晚一点再拆一次 + 重算吸顶位置
    [80, 400, 1200].forEach(function (ms) {
      setTimeout(function () { unwrapTables(); apply(); colorColumns(); syncTop(); }, ms);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // pjax 站内跳转后重新初始化
  document.addEventListener('pjax:complete', init);
})();
