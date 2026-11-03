/* ============================================================================
 * modules/footer-time.js —— 页脚计时器
 * ----------------------------------------------------------------------------
 * 本文件由 source/js/fomal.js 拆出（2026-10-03 屎山重构）。
 * 【重要】这里故意不套 IIFE：主题 pug 模板里有大量内联 onclick="xxx()"，
 *        以及别的脚本会直接调全局函数，所以本文件里的声明必须留在全局作用域。
 * ----------------------------------------------------------------------------
 * 包含的模块（括号内为拆分前在 fomal.js 里的行号）：
 *   · 页脚计时器（计时主体）（1650-1693）—— createtime()：每秒刷新两处页脚文字
 *       ① #ftRun —— 页脚第一行「©2023-2026 By chengicli」后面：站点运行 X 年 Y 天（只写年/天，见函数内注释）
 *       ② #workboard —— 页脚第二块：旅行者 1 号当前距离地球
 * ----------------------------------------------------------------------------
 * 依赖 data/voyager1.js 的距离模型（vgDist / vgFmt / vgAU / vgLight）。
 * 加载方式：_config.fomalhaut.yml 的 inject.bottom 列表里以 <script defer> 引用。
 * ----------------------------------------------------------------------------
 * 【本文件目录】共 2 个顶层声明（行号可能随后续编辑漂移，找不到就 Ctrl+F 搜函数名）
 *     23  now
 *     24  createtime()
 * ========================================================================== */

/* ------------------------------ 页脚计时器（计时主体） ------------------------------ */
/* 原 fomal.js 1650-1693 行，原样搬运，未改逻辑 */
var now = new Date();
function createtime() {
  // 当前时间
  now.setTime(now.getTime() + 1000);
  // 旅行者1号距离：JPL Horizons 数据离线拟合模型（见文件中的 vgDist 模型块）
  var vgd = vgDist(Date.now());          // 几何距离（千米）
  var dis = vgFmt(vgd);                  // 千分位格式
  var unit = (vgd / vgAU).toFixed(6);    // 天文单位（1 AU = 149597870.7 km）
  var lt = vgLight(vgd);                 // 信号单程光行时
  // 网站诞生时间
  var grt = new Date("05/03/2023 11:50:35");
  // 年按“满周年”算：2023-05-03 → 2027-05-03 记 4 年，周年之后再数剩余的天数
  var years = now.getFullYear() - grt.getFullYear(),
    anniv = new Date(grt.getTime());
  anniv.setFullYear(grt.getFullYear() + years);
  if (anniv.getTime() > now.getTime()) {
    years--;
    anniv.setFullYear(grt.getFullYear() + years);
  }
  var ynum = years,
    rest = now.getTime() - anniv.getTime(); // 满周年之后经过的毫秒数
  var dnum = Math.floor(rest / 86400000);

  // 站点运行：只显示「年 + 天
  //   不满 1 年   → 只写「X 天」（50 天就显示 50 天，不出现「0 年」）
  //   刚好满整年 → 省略「0 天」，写「X 年」而不是「X 年 0 天」
  //   目标元素 #ftRun 在 themes/fomalhaut/layout/includes/footer.pug 的 .copyright 里
  var runEl = document.getElementById("ftRun");
  if (runEl) {
    var runParts = [];
    if (ynum > 0) runParts.push("<b>" + ynum + "</b> 年");
    if (dnum > 0 || ynum === 0) runParts.push("<b>" + dnum + "</b> 天");
    var runTxt = "站点运行 " + runParts.join(" ");
    if (runEl.innerHTML !== runTxt) runEl.innerHTML = runTxt; // 只在跨天/跨年时才写 DOM
  }
  // 想恢复就把下面这段注释放开，并把再下面 currentTimeHtml 里的 boardBadge + 加回去。
  // var boardBadge = isRestDay(new Date())
  //   ? `<img class='boardsign' src='/assets/badge/Fomalhaut-rest.svg' title='放假啦，光明正大地摸鱼~'>`
  //   : `<img class='boardsign' src='/assets/badge/Fomalhaut-work.svg' title='上班偷偷摸鱼，别被发现~'>`;
  // 页脚 #workboard 这块现在只剩旅行者 1 号（站点运行时间已挪到第一行版权后面，见上面的 #ftRun）
  let currentTimeHtml =
    `<div style="font-size:13px;font-weight:bold">旅行者 1 号当前距离地球 ${dis} 千米，约为 ${unit} 个天文单位（信号单程需 ${lt}）🚀</div>`;
  document.getElementById("workboard") &&
    (document.getElementById("workboard").innerHTML = currentTimeHtml);
}
// 先立即渲染一次（否则 #ftRun / #workboard 首屏会空 1 秒），再按 1000ms 周期刷新
createtime();
setInterval(() => {
  createtime();
}, 1000);

/*页脚计时器 end */
