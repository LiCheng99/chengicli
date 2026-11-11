/* ============================================================================
 * modules/footer-time.js —— 页脚「站点运行」计时器
 * ----------------------------------------------------------------------------
 * 本文件由 source/js/fomal.js 拆出（2026-10-03 屎山重构）。
 * 【重要】这里故意不套 IIFE：主题 pug 模板里有大量内联 onclick="xxx()"，
 *        以及别的脚本会直接调全局函数，所以本文件里的声明必须留在全局作用域。
 * ----------------------------------------------------------------------------
 * 只负责一处：#ftRun —— 「站点运行 X年X月X天」，2026-11-09 起从 © 那行挪到
 * 页脚第三行（.footer_custom_text 开头），和「已经和女朋友 X年X月X天啦」并排；
 * 按真实日历拆整年 / 整月 / 剩余天数，为 0 的单位整段省略（见 FT_YMD）。
 *
 * 2026-11-08：原来这里还会每秒往 #workboard 写「旅行者 1 号当前距离地球…」，
 * 那个页面已经删除，visitor 也看不到意义，已整段移除。依赖的 data/voyager1.js
 * 也一并从 inject.bottom 摘掉了。
 * 2026-11-09：#workboard 那一行「共 N 篇文章 · … 去归档翻翻」整块从页脚删掉，
 * 现在页脚只剩三条线，本文件依旧只写 #ftRun。
 *
 * #ftRun 始终在页脚 .copyright 里；因为按 id 找元素，页脚结构怎么调整都不影响。
 * 加载方式：_config.chengic.yml 的 inject.bottom 列表里以 <script defer> 引用。
 * ----------------------------------------------------------------------------
 * 【本文件目录】顶层声明（行号可能随后续编辑漂移，找不到就 Ctrl+F 搜函数名）
 *     FT_YMD                     年/月/天 拆分与拼串
 *     now / FT_GRT / createtime()
 *     FT_RUN_EL / FT_RUN_KEY     上次写入的节点与日期键（同一天不重复写 DOM）
 * ========================================================================== */

/* ------------------------------ 页脚计时器（计时主体） ------------------------------ */
/* 原 fomal.js 1650-1693 行拆出；2026-11-08 把「年 + 天」改成「年 / 月 / 天」 */
/* 日历「年 / 月 / 天」拆分器。
 * 与 source/js/love-days.js 里的 addClamped / diffYMD / fmtYMD 是同一套算法，
 * 改规则要两边同步；这里包成单个全局 FT_YMD，避免污染全局命名空间。 */
var FT_YMD = (function () {
  var DAY = 86400000;

  /** 加 n 年 / n 月；月末溢出夹到当月最后一天（1/31 + 1 月 = 2/28，闰年 2/29）。 */
  function addClamped(d, yDelta, mDelta) {
    var x = new Date(d.getTime());
    var day = x.getDate();
    x.setDate(1);
    x.setFullYear(x.getFullYear() + yDelta, x.getMonth() + mDelta, 1);
    var last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
    x.setDate(Math.min(day, last));
    return x;
  }

  /** 从「原始起点」加 N 年 / M 月来数整年整月，剩下的才是天数；不按 30 天折算。
   *  不从上一个游标再 +1 月，避免 1/31 → 2/28 → 3/28 这种月末夹取后的日期漂移。 */
  function diff(start, end) {
    var y = 0, m = 0;
    while (addClamped(start, y + 1, 0) <= end) y++;
    while (addClamped(start, y, m + 1) <= end) m++;
    var cursor = addClamped(start, y, m);
    return { years: y, months: m, days: Math.floor((end - cursor) / DAY) };
  }

  /** 只拼非零段；数字用 <b> 包住，样式见 site-inject.css 的 #ftRun b。 */
  function fmt(p) {
    var parts = [];
    if (p.years)  parts.push("<b>" + p.years + "</b>年");
    if (p.months) parts.push("<b>" + p.months + "</b>月");
    if (p.days || !parts.length) parts.push("<b>" + p.days + "</b>天");
    return parts.join("");
  }

  return { diff: diff, fmt: fmt };
})();

var now = new Date();
var FT_GRT = new Date("05/03/2023 11:50:35");   // 网站诞生时间
var FT_RUN_EL = null;                            // 上次写过的 #ftRun 节点
var FT_RUN_KEY = "";                             // 上次写入时的日期键（年-月-日）

function createtime() {
  // 当前时间：直接取（原来靠 now.setTime(+1000) 累加，页面开久了会漂）
  now.setTime(Date.now());

  // 站点运行：按真实日历拆「整年 / 整月 / 剩余天数」，为 0 的单位整段省略
  //   3年6月5天 / 3月26天 / 118天 / 3年（满整年整月）/ 0天
  //   绝不出现「0年0月118天」。目标元素 #ftRun 在页脚 .copyright 里。
  var runEl = document.getElementById("ftRun");
  if (!runEl) return;

  // 2026-11-08：这个数字一天只变一次，没必要每秒都去读 innerHTML 比字符串。
  // 原来每秒读一次，页脚又压在渐隐遮罩上，作者反馈「站点运行」那一行会一闪一闪；
  // 现在只比对日期键，同一天同一个元素直接返回，跨天才重新拼字符串写 DOM。
  var key = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
  if (runEl === FT_RUN_EL && key === FT_RUN_KEY && runEl.innerHTML) return;

  var runTxt = "站点运行 " + FT_YMD.fmt(FT_YMD.diff(FT_GRT, now));
  if (runEl.innerHTML !== runTxt) runEl.innerHTML = runTxt;
  // pjax 换页会把 #ftRun 换成新节点，所以要记住节点本身，内容被清空时也重写
  FT_RUN_EL = runEl;
  FT_RUN_KEY = key;
}

// 先立即渲染一次（否则 #ftRun 首屏会空 1 秒），之后每秒只做一次日期比对，
// 跨天（0 点）时才会真正改 DOM
createtime();
setInterval(function () {
  createtime();
}, 1000);

/*页脚计时器 end */
