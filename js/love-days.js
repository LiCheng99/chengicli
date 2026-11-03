/* ============================================================
 * love-days.js —— 页脚「备案号 ---- 已经和女朋友 X 天啦」
 *
 * ★★★ 要改的通常只有下面这一行 ★★★
 * 把 LOVE_START 改成你们在一起的那天，格式必须是 年-月-日
 * 改完保存 → hexo generate → 刷新页面即可，不用动别的
 * ============================================================ */
var LOVE_START = '2026-07-13';

(function () {
  'use strict';

  var DAY = 86400000;

  /* ── 颜色规则（2026-10-25 改）────────────────────────────────────
   * · 主题色统一用 --theme-color。这个变量由 source/js/inject/beauty-boot.js
   *   在 <head> 里同步注入（默认 rgb(255,20,147)，可在侧栏「美化设置」里改，也支持自定义色），
   *   首帧就存在，所以这里直接用 var(--theme-color)，不用写死色值。
   * · 备案号平时**不指定颜色**，跟着页脚其它链接走（#footer-wrap a 的 var(--light-grey)）；
   *   只有鼠标悬停时才切成主题色，并且不带下划线。
   *   注意：页脚自带 #footer-wrap a 是 ID 选择器、优先级 (1,0,1)，
   *   所以这里必须写成「#footer-wrap + 类名」(1,2,1) 才盖得住它的 hover 下划线。
   * · 天数数字常显主题色，「已经和女朋友 / 年 / 天 / 啦」这些字保持页脚默认色。
   * ──────────────────────────────────────────────────────────────── */
  var THEME = 'var(--theme-color)';

  function style() {
    if (document.getElementById('loveDaysStyle')) return;
    var css = [
      '.footer_custom_text{line-height:2;letter-spacing:.3px}',

      /* 备案号：平时不指定颜色（继承页脚链接色）、不带下划线 */
      '#footer-wrap .footer_custom_text a.ft-icp{',
      '  text-decoration:none;transition:color .2s;',
      '}',
      /* 悬停：变主题色，且仍然不带下划线 */
      '#footer-wrap .footer_custom_text a.ft-icp:hover{',
      '  color:' + THEME + ';text-decoration:none;',
      '}',

      /* 天数数字：只用主题色文字，不加背景块、不加内边距 */
      '#footer-wrap .footer_custom_text #ftLove b{',
      '  margin:0 2px;padding:0;border-radius:0;background:none;',
      '  color:' + THEME + ';font-weight:700;',
      '  font-variant-numeric:tabular-nums;',
      '}',

      '.footer_custom_text .ft-sep{margin:0 8px;opacity:.55}'
    ].join('');
    var st = document.createElement('style');
    st.id = 'loveDaysStyle';
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  function midnight(d) {
    var x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  /** 算「满几年 + 零几天」：先数整周年，剩下的算天数 */
  function calc() {
    var start = midnight(new Date(LOVE_START + 'T00:00:00'));
    if (isNaN(start.getTime())) return null;

    var today = midnight(new Date());
    var total = Math.round((today - start) / DAY);
    if (total < 0) return { future: true, total: total };

    // 数整周年：把起始日逐年加 1 年，超过今天就停
    var years = 0;
    var anniv = new Date(start);
    for (;;) {
      var next = new Date(anniv);
      next.setFullYear(next.getFullYear() + 1);
      if (next > today) break;
      anniv = next;
      years++;
    }
    var days = Math.round((today - anniv) / DAY);
    return { years: years, days: days, total: total + 1 };  // +1：在一起当天算第 1 天
  }

  function render() {
    var el = document.getElementById('ftLove');
    if (!el) return;
    style();

    var r = calc();
    if (!r) {
      el.textContent = '（love-days.js：LOVE_START 日期格式不对，请写成 年-月-日）';
      return;
    }
    if (r.future) {
      el.innerHTML = '还有 <b>' + Math.abs(r.total) + '</b> 天就到一起纪念日啦';
      return;
    }
    // 不满一年就不写「X年」，直接显示天数；满了一年才补上「X年」
    el.innerHTML = r.years > 0
      ? '已经和女朋友<b>' + r.years + '</b>年<b>' + r.days + '</b>天啦'
      : '已经和女朋友<b>' + r.days + '</b>天啦';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
  document.addEventListener('pjax:complete', render);

  // 过零点自动刷新（有人电脑整夜不关机，第二天数字还是新的）
  setInterval(render, 60 * 60 * 1000);
})();
