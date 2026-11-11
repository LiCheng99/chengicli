/* ============================================================
 * love-days.js —— 页脚「备案号 ---- 已经和女朋友 X年X月X天啦」
 *
 * 显示规则（2026-11-08）：按真实日历拆成「整年 / 整月 / 剩余天数」，
 *   为 0 的单位整段省略 —— 3年6月8天、3月26天、118天，绝不会出现「0年0月118天」。
 *   同一套算法也用在 source/js/modules/footer-time.js 的 #ftRun，改规则要两边同步。
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
   * · 备案号平时**不指定颜色**，跟着页脚其它链接走（2026-11-09 起它搬到了
   *   .copyright 里，配色见 site-inject.css 的 #footer-wrap .copyright .ft-icp）；
   *   只有鼠标悬停时才切成主题色，并且不带下划线。
   *   注意：页脚自带 #footer-wrap a 是 ID 选择器、优先级 (1,0,1)，
   *   所以这里必须写成「#footer-wrap + 类名」(1,2,1) 才盖得住它的 hover 下划线。
   * · 数字常显主题色，「已经和女朋友 / 年 / 月 / 天 / 啦」这些字保持页脚默认色。
   * ──────────────────────────────────────────────────────────────── */
  var THEME = 'var(--theme-color)';

  function style() {
    if (document.getElementById('loveDaysStyle')) return;
    var css = [
      '.footer_custom_text{line-height:2;letter-spacing:.3px}',

      /* 备案号：平时不指定颜色（继承页脚链接色）、不带下划线。
         2026-11-09 起 .ft-icp 挪到 .copyright 里，所以两个容器都写一遍 */
      '#footer-wrap .copyright a.ft-icp,',
      '#footer-wrap .footer_custom_text a.ft-icp{',
      '  text-decoration:none;transition:color .2s;',
      '}',
      /* 悬停：变主题色，且仍然不带下划线 */
      '#footer-wrap .copyright a.ft-icp:hover,',
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

  /** 加 n 年 / n 月；月末溢出夹到当月最后一天（1/31 + 1 月 = 2/28，闰年 2/29）。
   *  先 setDate(1) 再设年月，避免 1/31 → setMonth(+1) 直接跳到 3/3。 */
  function addClamped(d, yDelta, mDelta) {
    var x = new Date(d.getTime());
    var day = x.getDate();
    x.setDate(1);
    x.setFullYear(x.getFullYear() + yDelta, x.getMonth() + mDelta, 1);
    var last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
    x.setDate(Math.min(day, last));
    return x;
  }

  /** 按真实日历把「起始日 → 今天」拆成 整年 / 整月 / 剩余天数，不按 30 天折算。
   *  每次都从「原始起点」加 N 年 / M 月，而不是从上一个游标再 +1 个月 ——
   *  否则像 1/31 这种月末起点夹取成 2/28 后，下个月就变成 3/28，日期会漂移。 */
  function diffYMD(start, end) {
    var y = 0, m = 0;
    while (addClamped(start, y + 1, 0) <= end) y++;
    while (addClamped(start, y, m + 1) <= end) m++;
    var cursor = addClamped(start, y, m);
    return { years: y, months: m, days: Math.floor((end - cursor) / DAY) };
  }

  /** 只拼非零段：3年6月8天 / 3月26天 / 118天 / 3年（满整年整月）/ 0天。
   *  数字用 <b> 包住，样式见本文件 style() 里的 #ftLove b。 */
  function fmtYMD(p) {
    var parts = [];
    if (p.years)  parts.push('<b>' + p.years + '</b>年');
    if (p.months) parts.push('<b>' + p.months + '</b>月');
    if (p.days || !parts.length) parts.push('<b>' + p.days + '</b>天');
    return parts.join('');
  }

  function calc() {
    var start = midnight(new Date(LOVE_START + 'T00:00:00'));
    if (isNaN(start.getTime())) return null;

    var today = midnight(new Date());
    var total = Math.round((today - start) / DAY);
    if (total < 0) return { future: true, total: total };

    return { ymd: diffYMD(start, today) };
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
    el.innerHTML = '已经和女朋友' + fmtYMD(r.ymd) + '啦';
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
