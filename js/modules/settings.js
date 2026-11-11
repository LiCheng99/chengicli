/* ============================================================================
 * modules/settings.js —— 美化模块（站点设置面板 / Winbox）
 * ----------------------------------------------------------------------------
 * 本文件由 source/js/fomal.js 拆出（2026-10-03 屎山重构）。
 * 【重要】这里故意不套 IIFE：主题 pug 模板里有大量内联 onclick="xxx()"，
 *        以及别的脚本会直接调全局函数，所以本文件里的声明必须留在全局作用域。
 * ----------------------------------------------------------------------------
 * 包含的模块（括号内为拆分前在 fomal.js 里的行号）：
 *   · 美化模块（1753-2925）—— 包括：localStorage 设置读写、设置面板 HTML 拼装（createWinbox/winboxNeedSize/winResize/toggleWinbox）、各开关的实时生效逻辑、滑条增强等
 * ----------------------------------------------------------------------------
 * 整个站点最大的一块：点右下角齿轮弹出的设置面板，管背景图、字体、主题色、侧栏宽度等一大堆外观开关。
 * 加载方式：_config.chengic.yml 的 inject.bottom 列表里以 <script defer> 引用。
 * ----------------------------------------------------------------------------
 * 【本文件目录】共 62 个顶层声明（行号可能随后续编辑漂移，找不到就 Ctrl+F 搜函数名）
 *    110  FONT_LIST
 *    111  FONT_DEFAULT
 *    112  CODE_FONT_LIST
 *    113  CODE_FONT_DEFAULT
 *    116  initItem()
 *    144  setFont(n)
 *    168  setCodeFont(n)
 *    176  setFontBorder()
 *    179  setCodeFontBorder()
 *    182  markFontBorder(prefix, curKey)
 *    208  setColor(c)
 *    229  setUniverse()
 *    244  setSnow()
 *    260  addNavClass()
 *    271  setNav()
 *    297  fpssw()
 *    308  reload()
 *    321  toggleRightside()
 *    341  setAside()
 *    360  setAsidePos()
 *    375  curTransNum
 *    376  curTransMini
 *    378  setTrans()
 *    392  curJumpRange
 *    393  rangeJumpReady
 *    396  rangeValueFromX(rangeEl, clientX)
 *    417  fireRangeInput(rangeEl)
 *    429  setRangeByX(rangeEl, clientX)
 *    437  bindRangeJump(rangeEl)
 *    459  initRangeJump()
 *    485  deltaSeconds
 *    512  defineColor
 *    513  changeBgColor()
 *    518  bingDayBg
 *    520  bingHistoryBg
 *    522  EEEDog
 *    524  seovx
 *    526  picsum
 *    530  waiBizhi
 *    532  btstu
 *    536  unsplash
 *    540  isValidBgVal(s)
 *    551  bgValToUrl(s)
 *    583  resetBg_()
 *    595  changeBg(s)
 *    621  setBg(s)
 *    633  getPicture()
 *    637  getPicture_()
 *    666  checkImgExists(imgurl)
 *    690  setLight()
 *    700  changeLight(flag)
 *    713  blurRadius
 *    717  strs
 *    722  saveBgFilter()
 *    770  setBgFilter()
 *    805  winbox
 *    807  createWinbox()
 *   1107  resetBg()
 *   1122  reset()
 *   1186  winboxNeedSize()
 *   1228  winResize()
 *   1246  toggleWinbox()
 * ========================================================================== */

/* ------------------------------ 美化模块 ------------------------------ */
/* 原 fomal.js 1753-2925 行，原样搬运，未改逻辑 */
/* 美化模块 start */

// 更新版本需要每个用户都恢复一次默认设置
if (localStorage.getItem("reset_8") == undefined) {
  localStorage.setItem("reset_8", "1");
  // 清空之前的标记值
  for (var i = 1; i <= 7; i++) {
    localStorage.removeItem("reset_" + i);
  }
  initItem();
  setTimeout(function () {
    fomalNotify({
          title: "提示🍒",
          message: " (｡･∀･)ﾉﾞ由于网站部分设置项更新，当前已为您重置所有设置，祝您愉快！",
          position: 'top-left',
          offset: 50,
          showClose: true,
          type: "success",
          duration: 8000
        })
  }, 1500);
}

/* ===== 字体设置（常规字体 / 代码块字体两组）=====
   family 名与 _custom/custom.css 里的 @font-face、面板按钮 id（swf_ / swfc_ + family）严格一一对应。
   localStorage.font / localStorage.codeFont 存的就是 family 名本身：常规字体直接当 --global-font 用，
   代码块字体当 --code-font 用（样式表里 pre/code 写的是 var(--code-font, JetBrainsMono)）。 */
/* 10-29：'LXGW' → 'LXGW WenKai Screen'（霞鹜文楷屏幕阅读版，GB 简体字集）。
   两次变更的原因：
   1) 原来的 'LXGW' 指向 @fontsource 的**繁体字集**单文件，简体独有字缺失、逐字回落微软雅黑；
   2) 作者指定全站默认用**屏幕阅读版**（对屏幕显示做过优化），所以默认值直接用 Screen 那款。
   旧访客 localStorage 里的 'LXGW' / 'LXGW WenKai' 会在下面白名单校验时被换成新默认值。 */
var FONT_LIST = ["LXGW WenKai Screen", "LXGWNeoXiHei", "SourceHanSerif", "default"];
var FONT_DEFAULT = "LXGW WenKai Screen";
/* 10-29：与 appearance-fonts.js 的 APPEARANCE_CODE_FONTS 严格对齐。
   以前这边只有 3 个 webfont、面板那边只有 4 个系统字体名，两份名单没有交集：
   面板显示「当前 · 默认字体」、无高亮，选了也存不住（下次载入被这份白名单改回 JetBrainsMono）。 */
var CODE_FONT_LIST = ["JetBrainsMono", "FiraCode", "SourceCodePro", "Consolas_1", "Monaco_1", "MapleMono_1", "Hack_1"];
var CODE_FONT_DEFAULT = "JetBrainsMono";

// 恢复localStorage默认配置项
/* 只在「版本升级要所有人都重置一次」时被调用（见上面 reset_8 那段判断），平时不会跑。
   两条铁律：
     1. 这里的默认值必须和各模块自己 `getItem(x) == undefined` 时的兜底值逐字一致，
        否则用户被重置过一次之后，表现会和「全新访客」不一样（这种 bug 极难查）。
     2. localStorage 只能存字符串，所以数字 / 布尔也一律写成 "97" / "1" / "true"；
        各模块比较时用的是 == 或 === "1"，别顺手改成裸数字。 */
function initItem() {
  // 壁纸：'default' = 用主题自带壁纸；也可存 #色值 / url(...) / linear-gradient(...)，写入 --default-bg
  localStorage.setItem("blogbg", "default");
  // 首页星空层 #universe 的 display：block 开 / none 关（只在暗色主题下真的看得见）
  localStorage.setItem("universe", "block");
  // 右上角帧率显示：'1' 显示 / '0' 隐藏
  localStorage.setItem("fpson", "1");
  // 卡片背景的 alpha 百分比（面板上叫「卡片不透明度」）：97 = 几乎不透明，0 = 全透
  // 同时写进 --trans-light / --trans-dark；自研组件若写死 var(--card-bg) 不跟随，见 macro-gen.css 的 --mg-panel
  localStorage.setItem("transNum", "97");
  // 正文字体 family 名，白名单见 FONT_LIST，直接当 --global-font 用；'default' 走完整系统字体栈
  localStorage.setItem("font", FONT_DEFAULT);
  // 代码块字体 family 名，白名单见 CODE_FONT_LIST，当 --code-font 用（pre/code 写的是 var(--code-font, ...)）
  localStorage.setItem("codeFont", CODE_FONT_DEFAULT);
  // 主题色预设键名。坑：'green' 实际渲染成 rgb(255,20,147) 洋红（见 beauty-boot.js 的 cmap）；
  // 'purple' / 'gray' / 'black' 是旧键名，读取时会被映射成 purepurple / darkblue；'custom' 则走下面那项
  localStorage.setItem("themeColor", "green");
  localStorage.setItem("themeCustomColor", "#c74bd0"); // 自定义主题色的默认值：故意不落在 11 个预设里（#c74bd0 ≈ 305°，夹在紫罗兰 270° 与樱花粉 339° 之间），这样彩虹环内点一眼能认出"这是自定义"
  // 右侧工具条（回到顶部 / 文章目录那排按钮）显示：block 显示 / none 隐藏
  localStorage.setItem("rs", "block");
  // 右键：'on' 换成站点自定义右键菜单 / 'off' 恢复系统默认菜单
  localStorage.setItem("mouse", "on");
  // 猫咪挂件：'1' 开 / '0' 关（首帧由 beauty-boot.js 打 beauty-neko-off 类先藏掉，避免闪一下）
  localStorage.setItem("nekoOn", "0");
  localStorage.setItem("cursorOn", "1"); // 听话鼠标默认开启：鼠标不再带拖影，用系统指针
  localStorage.setItem("rippleOn", "0"); // 点击涟漪默认关闭（第 4 个互动挂件，写法与上面两个相反）
  // 黑夜霓虹灯：'true' 站点名 / 标题 / 副标题做呼吸发光动画，'false' 不发光
  // 注意这不是深浅色模式 —— 深浅色存的是另一个键 theme（saveToLocal 写，带 2 天有效期）
  localStorage.setItem("light", "true");
  // 下雪层 #snow 的 display：none 关 / block 开
  localStorage.setItem("snow", "none");
  // 萤火虫：'1' 开 / '0' 关（同样只有暗色主题下看得见）
  localStorage.setItem("fireflies", "0");
  // 侧边栏卡片（个人卡 / 文章目录 / 标签云等）显示：'1' 显示 / '0' 隐藏
  localStorage.setItem("aside", "1");
  // 侧栏位置：'1' 在右 / '0' 挪到左（靠 --first-child-order 换顺序，不改 DOM）
  localStorage.setItem("asidePos", "1");
  // 顶栏模式：'1' 常驻吸顶（nav_fixed）/ '0' 平时藏起来、滑过才出现（nav_visible）
  localStorage.setItem("nav", "1");
  // 壁纸滤镜总开关：'1' 用下面的 bgFilterVal / '0' 直接 --bg-filter: none
  localStorage.setItem("bgFilterOn", "1");
  // 默认滤镜：不模糊，只轻微提饱和 + 提对比；想要毛玻璃就把 blur 调大
  var bgFilterValue = "blur(0px) saturate(108%) contrast(105%)";
  localStorage.setItem("bgFilterVal", bgFilterValue);
}


// 设置字体
// 用白名单校验而不是只判断 undefined：旧版面板留下的已下架字体（MiSans / YSHST）或其它脏值会被清掉，
// 回落到默认值，保证打开面板时永远有一项是高亮的。
if (FONT_LIST.indexOf(localStorage.getItem("font")) < 0) {
  localStorage.setItem("font", FONT_DEFAULT);
}
setFont(localStorage.getItem("font"));
function setFont(n) {
  localStorage.setItem("font", n)
  if (n == "default") {
    // 系统默认 = 完整系统字体栈。原来这里只写 '-apple-system'，而 Windows 不认这个关键字，
    // 于是 font-family 只写 var(--global-font) 的元素（左上角站点名 / 首页大标题 / 副标题 / 作者名）
    // 会直接掉到「浏览器默认字体」——用户把 Chrome 标准字体设成霞鹜文楷时，标题就变成楷体。
    // 完整栈里 -apple-system / BlinkMacSystemFont 在 Windows 上被跳过，自动落到 Segoe UI（中文落微软雅黑系）。
    // 同时不要把任何等宽字体混进正文栈里。
    var sysFontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Lato, Roboto, 'PingFang SC', 'Microsoft JhengHei', 'Microsoft YaHei', sans-serif";
    document.documentElement.style.setProperty('--global-font', sysFontStack);
    document.body.style.fontFamily = sysFontStack;
  }
  else {
    document.documentElement.style.setProperty('--global-font', n);
    document.body.style.fontFamily = "var(--global-font),-apple-system, IBM Plex Mono ,monosapce,'微软雅黑', sans-serif";
  }
  try { setFontBorder(); } catch (err) { };
}

// 设置代码块字体：只改 --code-font 变量（样式表里 pre/code 已经写成 var(--code-font, JetBrainsMono)）
if (CODE_FONT_LIST.indexOf(localStorage.getItem("codeFont")) < 0) {
  localStorage.setItem("codeFont", CODE_FONT_DEFAULT);
}
setCodeFont(localStorage.getItem("codeFont"));
function setCodeFont(n) {
  localStorage.setItem("codeFont", n)
  document.documentElement.style.setProperty('--code-font', n);
  try { setCodeFontBorder(); } catch (err) { };
}

// 设置字体选择框边界（当前选中项额外铺一层主题色系浅底，一眼就能看出选了哪个字体）
// 常规/代码两组共用一套高亮逻辑，prefix 区分：常规 = swf_ + family，代码 = swfc_ + family
function setFontBorder() {
  markFontBorder("swf_", localStorage.getItem("font"));
}
function setCodeFontBorder() {
  markFontBorder("swfc_", localStorage.getItem("codeFont"));
}
function markFontBorder(prefix, curKey) {
  if (typeof syncAppearanceFonts === "function") { syncAppearanceFonts(); return; }
  var swfId = prefix + curKey;
  var cur = document.getElementById(swfId);
  // 面板还没打开时找不到节点，直接返回（原来这里会抛错，靠外层 try 兜住）
  if (!cur) return;
  // 先把同组其它项还原成默认样式：.swf 的白底由样式表给，内联值清空即恢复
  Array.prototype.forEach.call(document.getElementsByClassName("swf"), function (ee) {
    if (ee.id.indexOf(prefix) === 0 && ee.id != swfId) {
      ee.style.border = "2px solid var(--border-color)";
      ee.style.backgroundColor = "";
      ee.style.boxShadow = "";
    }
  });
  cur.style.border = "2px solid var(--theme-color)";
  // 主题色 32% 掺白 68% 的淡底：不管主题色是深是浅（13 色实测最低对比度 6.95:1），深色文字(#303030)都保持可读
  cur.style.backgroundColor = "color-mix(in srgb, var(--theme-color) 32%, #ffffff)";
  // 外圈再补一道同色柔光，暗色面板里也能和未选中项拉开差距
  cur.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--theme-color) 38%, transparent)";
}


// 主题色「实底上的前景色」：按相对亮度在近黑与纯白之间二选一。
// 背景：主题按钮/标签/气泡/选中底色全是白字压在 --theme-color 上，而 10 个预设里
// 只有紫罗兰的白字对比度过 WCAG AA（默认深粉红色只有 2.13:1）。数字与推导见 bak/theme-ink-20261014/。
// 阈值 0.19：亮度更高的主题色给近黑 #141a1c（实测最低 4.8:1），更低的给纯白（最低 4.4:1）。
function themeOnColorInk(rgb) {
  var m = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(String(rgb).trim());
  if (!m) return '#ffffff';
  var lin = function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  var L = 0.2126 * lin(+m[1]) + 0.7152 * lin(+m[2]) + 0.0722 * lin(+m[3]);
  return L > 0.19 ? '#141a1c' : '#ffffff';
}
// 设置主题色：预设键兼容旧访客，自定义值独立保存，切回预设不会丢失调色结果。

// 预设色环的显示色（仅用于美化面板画圆点，和 beauty-boot.js 的 cmap 同源；不参与 setColor 逻辑）
var THEME_PRESET_HEX = {
  red: "rgb(239, 90, 90)", orange: "rgb(215, 146, 77)", yellow: "rgb(196, 166, 74)",
  matcha: "rgb(102, 179, 77)", green: "rgb(255, 20, 147)", puregreen: "rgb(77, 175, 135)",
  blue: "rgb(74, 156, 199)", heoblue: "rgb(97, 106, 209)", darkblue: "rgb(113, 133, 156)",
  purepurple: "rgb(147, 90, 205)", pink: "rgb(237, 112, 155)"
};
var themeColorPresets = [
  ['red', '珊瑚红'],
  ['orange', '暖杏橙'],
  ['yellow', '蜂蜜金'],
  ['matcha', '抹茶绿'],
  ['green', '深粉红色'],
  ['puregreen', '玉石绿'],
  ['blue', '晴空蓝'],
  ['heoblue', '柔靛蓝'],
  ['darkblue', '雾蓝灰'],
  ['purepurple', '紫罗兰'],
  ['pink', '樱花粉']
];
function validThemeHex(value) { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value); }
function themeHexToRGB(hex) {
  return 'rgb(' + [1, 3, 5].map(function(i) { return parseInt(hex.slice(i, i + 2), 16); }).join(', ') + ')';
}
// （实底图标块曾经用 themeSolidFill() 压深过一档，2026-10-15 第三版改回主题色原色 + 轻微投影，
//   函数已删除。要恢复压深版见 source/css/site-inject.css 的 #rightside 块注释。）
function setColor(c) {
  c = normalizeThemePreset(c);
  var hex = localStorage.getItem('themeCustomColor');
  if (c === 'custom' && validThemeHex(hex)) map.set('custom', themeHexToRGB(hex));
  else if (!themeColorPresets.some(function(p) { return p[0] === c; })) c = 'green';
  var theme_color = map.get(c);
  document.getElementById('themeColor').innerText = ':root{--theme-color:' + theme_color + ' !important}';
  // 实底前景色跟着主题色走：写内联样式（优先级最高），CSS 里只留 #fff 兜底。
  var ink = themeOnColorInk(theme_color);
  document.documentElement.style.setProperty('--on-theme', ink);
  // 渐变按钮的调色方向锚点：浅色预设往白、深色预设往黑（公告栏 .a-btn 的渐变用它）
  document.documentElement.style.setProperty('--on-theme-away', ink === '#ffffff' ? '#000000' : '#ffffff');

  localStorage.setItem('themeColor', c);
  if (window.__cursorColor !== theme_color) {
    window.__cursorColor = theme_color;
    CURSOR.refresh();
  }
  var channels = theme_color.slice(4, -1);
  document.documentElement.style.setProperty('--text-bg-hover', 'rgba(' + channels + ', 0.7)');
  document.documentElement.style.setProperty('--high-trans-color', 'rgba(' + channels + ', 0.5)');
  document.documentElement.style.setProperty('--hh-trans-color', 'rgba(' + channels + ', 0.1)');
  syncThemeColorControls();
}
function setCustomColor(hex) {
  if (!validThemeHex(hex)) return false;
  localStorage.setItem('themeCustomColor', hex.toLowerCase());
  setColor('custom');
  return true;
}
function syncThemeColorControls() {
  var c = localStorage.getItem('themeColor');
  var hex = localStorage.getItem('themeCustomColor');
  if (!validThemeHex(hex)) hex = '#c74bd0';
  themeColorPresets.forEach(function(p) {
    var radio = document.getElementById(p[0]);
    if (radio) radio.checked = c === p[0];
  });
  var input = document.getElementById('customThemeInput');
  if (input) input.value = hex.toLowerCase();
  var choice = document.getElementById('customThemeChoice');
  if (choice) {
    choice.classList.toggle('is-selected', c === 'custom');
    choice.style.setProperty('--custom-theme-color', hex);
    choice.title = '自定义主题色 · ' + hex.toUpperCase() + ' · 点击打开调色板';
  }
  var status = document.getElementById('themeColorStatus');
  var preset = themeColorPresets.find(function(p) { return p[0] === c; });
  if (status) status.textContent = (c === 'custom' ? '自定义 · ' + hex.toUpperCase() : '当前 · ' + (preset ? preset[1] : '深粉红色')) + '　点击彩虹圈自由选色，自动保存';
}
function themeColorMarkup() {
  return '<div class="content colorRow" role="group" aria-label="主题色选择">' + themeColorPresets.map(function(p) {
    return '<label class="theme-choice" style="--tc:' + (THEME_PRESET_HEX[p[0]] || '#888') + '" title="' + p[1] + '"><input type="radio" id="' + p[0] + '" name="colors" aria-label="' + p[1] + '" onclick="setColor(\'' + p[0] + '\')"></label>';
  }).join('') + '<label class="theme-choice theme-custom" id="customThemeChoice" title="自定义主题色 · 点击打开调色板"><span class="theme-rainbow" aria-hidden="true"></span><input type="color" id="customThemeInput" value="#c74bd0" aria-label="自定义主题色，打开调色板" aria-describedby="themeColorStatus" oninput="setCustomColor(this.value)" onchange="setCustomColor(this.value)"></label></div><p class="theme-color-hint" id="themeColorStatus"></p>';
}
setColor(localStorage.getItem('themeColor'));


// 互动挂件的独立偏好：猫咪与听话鼠标旧访客首次见到时默认开启，点击涟漪反过来、默认关闭。
function syncInteractionControls() {
  var catToggle = document.getElementById('nekoSet');
  var cursorToggle = document.getElementById('cursorSet');
  var rippleToggle = document.getElementById('rippleSet');
  if (catToggle) catToggle.checked = localStorage.getItem('nekoOn') !== '0';
  // 听话鼠标与点击涟漪一致：只有显式存过 '1' 才算开，缺键 / 空值一律当关。
  if (cursorToggle) cursorToggle.checked = localStorage.getItem('cursorOn') === '1';
  // 点击涟漪只有显式存过 '1' 才算开，缺键 / 空值 / 手改脏值一律当关。
  if (rippleToggle) rippleToggle.checked = localStorage.getItem('rippleOn') === '1';
  // 说明文案由模块按「是否被减少动态效果偏好暂停」自己切，这里只把手交过去。
  if (window.FOMAL_RIPPLE) window.FOMAL_RIPPLE.syncControls();
}
function applyInteractionSettings() {
  setNekoEnabled(localStorage.getItem('nekoOn') !== '0');
  CURSOR.setEnabled(localStorage.getItem('cursorOn') === '1');
  if (window.FOMAL_RIPPLE) window.FOMAL_RIPPLE.setEnabled(localStorage.getItem('rippleOn') === '1');
  syncInteractionControls();
}
function setNeko() {
  var toggle = document.getElementById('nekoSet');
  if (!toggle) return;
  localStorage.setItem('nekoOn', toggle.checked ? '1' : '0');
  setNekoEnabled(toggle.checked);
}
function setCursor() {
  var toggle = document.getElementById('cursorSet');
  if (!toggle) return;
  localStorage.setItem('cursorOn', toggle.checked ? '1' : '0');
  CURSOR.setEnabled(toggle.checked);
}
// 点击涟漪开关：默认关，只写 '1' / '0' 两种确定值（读的是 modules/ripple.js）。
function setRipple() {
  var toggle = document.getElementById('rippleSet');
  if (!toggle) return;
  localStorage.setItem('rippleOn', toggle.checked ? '1' : '0');
  if (window.FOMAL_RIPPLE) window.FOMAL_RIPPLE.setEnabled(toggle.checked);
}
applyInteractionSettings();

// 昼夜切换动效档位：off / light / standard / flourish（真正读档位的是 shell.js 的 dmTier()）
var DARK_TRANS_DESC = {
  off: "关闭：切换时不做动画，颜色一瞬间到位",
  light: "轻：老式转盘从上往下掠过（约 1.5 秒）",
  standard: "标准：日落 → 暮色 → 星夜，最后从点击位置像揭幕一样翻开（约 1.5 秒）",
  flourish: "华丽：在标准之上再多一层流云与第二颗流星（约 1.6 秒）"
};
function syncDarkTransition(value) {
  var v = DARK_TRANS_DESC[value] ? value : "standard";
  var seg = document.getElementById("darkTransSet");
  // 面板可能还没建、也可能被外部脚本替换过：拿不到按钮就只做取值校验，不碰 DOM
  if (seg && seg.querySelectorAll) {
    var btns = seg.querySelectorAll("button[data-tier]") || [];
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute ? btns[i].getAttribute("data-tier") === v : true;
      if (btns[i].classList) { if (on) btns[i].classList.add("is-on"); else btns[i].classList.remove("is-on"); }
      if (btns[i].setAttribute) btns[i].setAttribute("aria-checked", on ? "true" : "false");
    }
  }
  var note = document.getElementById("darkTransNote");
  if (note) note.textContent = DARK_TRANS_DESC[v] + (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? " · 系统已开「减少动态效果」，这里会自动瞬时切换" : "");
  return v;
}
function setDarkTransition(value) {
  var v = syncDarkTransition(value);
  try { localStorage.setItem("darkTransition", v); } catch (e) {}
}

// 星空背景开关
if (localStorage.getItem("universe") == undefined) {
  localStorage.setItem("universe", "block");
}
document.getElementById("universe").style.display = localStorage.getItem("universe");
function setUniverse() {
  if (document.getElementById("universeSet").checked) {
    document.getElementById("universe").style.display = "block";
    localStorage.setItem("universe", "block");
  } else {
    document.getElementById("universe").style.display = "none";
    localStorage.setItem("universe", "none");
  }
}

// 雪花开关
if (localStorage.getItem("snow") == undefined) {
  localStorage.setItem("snow", "none");
}
document.getElementById("snow").style.display = localStorage.getItem("snow");
function setSnow() {
  if (document.getElementById("snowSet").checked) {
    document.getElementById("snow").style.display = "block";
    localStorage.setItem("snow", "block");
    if (window.FOMAL_FIREFLIES) window.FOMAL_FIREFLIES.setEnabled(false);
  } else {
    document.getElementById("snow").style.display = "none";
    localStorage.setItem("snow", "none");
  }
  if (window.FOMAL_SNOW) window.FOMAL_SNOW.refresh();
}

// 萤火虫微光开关：雪花与萤火虫只保留最后开启的一项。
function setFireflies() {
  var control = document.getElementById('firefliesSet');
  if (control && window.FOMAL_FIREFLIES) window.FOMAL_FIREFLIES.setEnabled(control.checked);
}

// 导航栏常驻开关
if (localStorage.getItem("nav") == undefined) {
  localStorage.setItem("nav", "1");
}
document.addEventListener('pjax:complete', addNavClass);
document.addEventListener('DOMContentLoaded', addNavClass);
function addNavClass() {
  if (localStorage.getItem("nav") == "1") {
    document.getElementById("nav").classList.add("nav_fixed");
    document.getElementById("nav").classList.remove("nav_visible");
    document.getElementById("nav-display").innerText = `:root{--nav-visible-display:none;--nav-fixed-display:inline-flex;}`;
  } else {
    document.getElementById("nav").classList.add("nav_visible");
    document.getElementById("nav").classList.remove("nav_fixed");
    document.getElementById("nav-display").innerText = `:root{--nav-visible-display:inline-flex;--nav-fixed-display:none;}`;
  }
}
function setNav() {
  if (document.getElementById("navSet").checked) {
    document.getElementById("nav").classList.add("nav_fixed");
    document.getElementById("nav").classList.remove("nav_visible");
    document.getElementById("nav-display").innerText = `:root{--nav-visible-display:none;--nav-fixed-display:inline-flex;}`;
    localStorage.setItem("nav", "1");
  } else {
    document.getElementById("nav").classList.add("nav_visible");
    document.getElementById("nav").classList.remove("nav_fixed");
    document.getElementById("nav-display").innerText = `:root{--nav-visible-display:inline-flex;--nav-fixed-display:none;}`;
    localStorage.setItem("nav", "0");
  }
}

// 帧率监测开关
if (localStorage.getItem("fpson") == undefined) {
  localStorage.setItem("fpson", "1");
}
// 初始化
// 2026-10-04 性能修复：帧率计数本身是一条常驻 requestAnimationFrame 循环，
// 面板里把「帧率监测」关掉后不该还在跑 —— 改成开着才启动（fpssw 重新打开会补启动）。
var fpsPanel = document.getElementById("fps");
if (localStorage.getItem("fpson") == 1) {
  startFps();
  if (fpsPanel) fpsPanel.style.display = "block";
} else {
  stopFps();
  if (fpsPanel) fpsPanel.style.display = "none";
}
// 切换：显示节点暂时缺失也不能阻止取消采样和保存偏好。
function fpssw() {
  var toggle = document.getElementById("fpson");
  if (!toggle) return;
  var enabled = toggle.checked;
  localStorage.setItem("fpson", enabled ? "1" : "0");
  if (enabled) startFps();
  else stopFps();
  var panel = document.getElementById("fps");
  if (panel) panel.style.display = enabled ? "block" : "none";
}

// 刷新窗口
function reload() {
  window.location.reload();
}

// 侧边部件开关
if (localStorage.getItem("rs") == undefined) {
  localStorage.setItem("rs", "block");
}
if (localStorage.getItem("rs") == "block") {
  document.getElementById("rightSide").innerText = `:root{--rightside-display: block}`;
} else {
  document.getElementById("rightSide").innerText = `:root{--rightside-display: none}`;
}
function toggleRightside() {
  // 先设置localStorage变量
  if (document.getElementById("rightSideSet").checked) {
    localStorage.setItem("rs", "block");
    document.getElementById("rightSide").innerText = `:root{--rightside-display: block}`;
  } else {
    localStorage.setItem("rs", "none");
    document.getElementById("rightSide").innerText = `:root{--rightside-display: none}`;
  }
}

// 侧栏显隐
if (localStorage.getItem("aside") == undefined) {
  localStorage.setItem("aside", "1");
}
if (localStorage.getItem("aside") == "1") {
  document.getElementById("aside-show").innerText = `:root{--layout-justify-content: unset; --aside-content-display: block;}`;
} else {
  document.getElementById("aside-show").innerText = `:root{--layout-justify-content: center; --aside-content-display: none;}`;
}
function setAside() {
  if (document.getElementById("asideSet").checked) {
    localStorage.setItem("aside", "1");
    document.getElementById("aside-show").innerText = `:root{--layout-justify-content: unset; --aside-content-display: block;}`;
  } else {
    localStorage.setItem("aside", "0");
    document.getElementById("aside-show").innerText = `:root{--layout-justify-content: center; --aside-content-display: none;}`;
  }
}

// 侧栏位置
if (localStorage.getItem("asidePos") == undefined) {
  localStorage.setItem("asidePos", "1");
}
if (localStorage.getItem("asidePos") == "1") {
  document.getElementById("aside-pos").innerText = `:root{--first-child-order: 0; --recent-post-item-margin: 0px 1% 20px 0px;}`;
} else {
  document.getElementById("aside-pos").innerText = `:root{--first-child-order: 2; --recent-post-item-margin: 0px 0px 20px 1%;}`;
}
function setAsidePos() {
  if (document.getElementById("asidePosSet").checked) {
    localStorage.setItem("asidePos", "1");
    document.getElementById("aside-pos").innerText = `:root{--first-child-order: 0; --recent-post-item-margin: 0px 1% 20px 0px;}`;
  } else {
    localStorage.setItem("asidePos", "0");
    document.getElementById("aside-pos").innerText = `:root{--first-child-order: 2; --recent-post-item-margin: 0px 0px 20px 1%;}`;
  }
}


// 透明度调节滑块
if (localStorage.getItem("transNum") == undefined) {
  localStorage.setItem("transNum", 97);
}
var curTransNum = Number(localStorage.getItem("transNum"));
if (!Number.isFinite(curTransNum) || curTransNum < 0 || curTransNum > 100) curTransNum = 97;
var curTransMini = curTransNum;
var transFrame = 0;
function applyTrans() {
  transFrame = 0;
  document.getElementById("transPercent").textContent = ':root{--trans-light:rgba(250,250,250,' + curTransNum + '%)!important;--trans-dark:rgba(28,28,28,' + curTransNum + '%)!important}';
}
function syncTransControls() {
  var range = document.getElementById('transSet'), number = document.getElementById('transNumber');
  if (range) { range.value = curTransNum; range.style.setProperty('--bf-fill', curTransNum + '%'); }
  if (number) { number.value = curTransNum; number.removeAttribute('aria-invalid'); }
}
function setTrans(input, commit) {
  input = input || document.getElementById('transSet');
  var n = input.value.trim() === '' ? NaN : Number(input.value);
  var valid = Number.isFinite(n) && n >= 0 && n <= 100;
  if (valid) {
    curTransNum = n; curTransMini = n;
    var peer = document.getElementById(input.id === 'transSet' ? 'transNumber' : 'transSet');
    if (peer) peer.value = n;
    document.getElementById('transSet').style.setProperty('--bf-fill', n + '%');
  }
  input.setAttribute('aria-invalid', valid ? 'false' : 'true');
  if (commit) {
    localStorage.setItem('transNum', curTransNum);
    syncTransControls();
    if (transFrame) cancelAnimationFrame(transFrame);
    applyTrans();
    document.getElementById('transStatus').textContent = valid ? '已自动保存 · 数值越大，卡片底色越实' : '请输入 0–100，已恢复上次有效值';
  } else if (!transFrame) transFrame = requestAnimationFrame(applyTrans);
}

// 磨砂效果（backdrop-filter 的 blur 半径）
if (localStorage.getItem("frostNum") == undefined) {
  localStorage.setItem("frostNum", 7);
}
var curFrostNum = Number(localStorage.getItem("frostNum"));
if (!Number.isFinite(curFrostNum) || curFrostNum < 0 || curFrostNum > 30) curFrostNum = 7;
function applyFrost() {
  var el = document.getElementById("frostVar");
  if (!el) { el = document.createElement("style"); el.id = "frostVar"; document.head.appendChild(el); }
  el.textContent = ":root{--frost: blur(" + curFrostNum + "px) saturate(1.15)}";
}

// 字体颜色
var curFontColor = localStorage.getItem("fontColor") || "";
// 全站文字统一（排除链接/按钮/代码，保留强调色）
// 文字颜色：不再逐个列容器（永远列不全，页脚 div / 分页 / 菜单都漏过）。
// 改成「全量打标记 + 精确排除」：除排除清单外，所有元素加 .fc-auto，统一吃 var(--fc-cur)。
// 排除的是「不能改颜色的」——实底按钮/徽章/悬浮键（白字压主题色）和代码块（有语法高亮）。
// 2026-11-08：页脚（#footer-wrap）整块加进排除清单 —— 它压在页面底部的渐隐暗场上，
// 文字用的是自己的三级白（site-inject.css「页脚 v4」一节），必须保持浅色：
// 一旦被刷成访客选的深色字色，就是深字压深底、整块消失。顺带也让页脚躲开
// paintFontColor() 每秒给全站元素写内联 color 的那波重排。
// （a.btn-xz / .btn-xz 是历史兜底，footer.pug 里已经不用了。）
var FC_KEEP = "#footer-wrap,a.btn-xz,.btn-xz,.a-chip,#ai-chat-btn,#rightside>div>button,.page-number.current,pre,code,kbd,figure.highlight";

function paintFontColor() {
  if (!curFontColor || !document.body) return;
  document.body.classList.add("fc-auto");
  var nodes = document.body.getElementsByTagName("*");
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    if (el.classList.contains("fc-auto")) continue;
    if (el.closest(FC_KEEP)) continue;
    el.classList.add("fc-auto");
    el.style.setProperty("color", "var(--fc-cur)", "important");
  }
}

function clearFontColor() {
  if (!document.body) return;
  document.body.classList.remove("fc-auto");
  var nodes = document.querySelectorAll(".fc-auto");
  for (var i = 0; i < nodes.length; i++) {
    nodes[i].classList.remove("fc-auto");
    nodes[i].style.removeProperty("color");
  }
}

// 动态内容（评论、音乐列表、通知、pjax 换页后的新节点）也要补上标记。
// 只监听 childList：加 class 不会触发它，所以不会自激死循环。
var fcObserver = null, fcTimer = null;
function watchFontColor() {
  if (fcObserver || !window.MutationObserver || !document.body) return;
  fcObserver = new MutationObserver(function () {
    if (fcTimer) return;
    fcTimer = setTimeout(function () { fcTimer = null; paintFontColor(); }, 250);
  });
  fcObserver.observe(document.body, { childList: true, subtree: true });
}

function applyFontColor() {
  var el = document.getElementById("fontColorVar");
  if (!el) { el = document.createElement("style"); el.id = "fontColorVar"; document.head.appendChild(el); }
  if (!curFontColor) { el.textContent = ""; clearFontColor(); return; }
  var dark = "color-mix(in srgb, " + curFontColor + " 45%, #fff)";
  el.textContent =
    ":root{--fc-cur:" + curFontColor + " !important;--font-color:" + curFontColor + " !important}" +
    "html[data-theme=dark]{--fc-cur:" + dark + " !important;--font-color:" + dark + " !important}" +
    ".fc-auto{color:var(--fc-cur) !important}";
  paintFontColor();
  watchFontColor();
}
// 首屏自动应用一次：不开面板也要让上次选的字色生效（beauty-boot 只写了 CSS 变量，
// 真正给元素打 .fc-auto 标记要等 DOM 就绪）。
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () { applyFontColor(); });
} else {
  applyFontColor();
}

function syncFontColorControls() {
  var p = document.getElementById("fontColorPick");
  if (p && curFontColor) p.value = curFontColor;
  var dots = document.querySelectorAll(".fc-dot[data-fc]");
  for (var i = 0; i < dots.length; i++) {
    dots[i].classList.toggle("is-on", dots[i].getAttribute("data-fc") === curFontColor);
  }
  var st = document.getElementById("fontColorStatus");
  // 2026-11-02：面板搬到「三、字体设置」后，初始文案改成「未自定义」——
  // 上面已经有一条 ap-hint 讲怎么用了，这里只报状态，不重复。
  if (st) st.textContent = curFontColor ? ("当前：" + curFontColor + " · 全站生效，深色模式自动提亮") : "未自定义，用主题默认文字颜色";
}
function setFontColor(v, commit) {
  if (!/^#[0-9a-fA-F]{6}$/.test(String(v))) return;
  curFontColor = v.toLowerCase();
  applyFontColor();
  if (commit) {
    localStorage.setItem("fontColor", curFontColor);
    syncFontColorControls();
    var st = document.getElementById("fontColorStatus");
    if (st) st.textContent = "已自动保存 · " + curFontColor + "（深色模式会自动提亮）";
  }
}
function resetFontColor() {
  curFontColor = "";
  localStorage.removeItem("fontColor");
  applyFontColor();
  syncFontColorControls();
  var st = document.getElementById("fontColorStatus");
  if (st) st.textContent = "已恢复主题默认文字颜色";
}

function syncFrostControls() {
  var r = document.getElementById('frostSet'), n = document.getElementById('frostNumber');
  if (r) { r.value = curFrostNum; r.style.setProperty('--bf-fill', (curFrostNum / 30 * 100) + '%'); }
  if (n) { n.value = curFrostNum; n.removeAttribute('aria-invalid'); }
}
function setFrost(input, commit) {
  input = input || document.getElementById('frostSet');
  var n = input.value.trim() === '' ? NaN : Number(input.value);
  var valid = Number.isFinite(n) && n >= 0 && n <= 30;
  if (valid) {
    curFrostNum = n;
    var peer = document.getElementById(input.id === 'frostSet' ? 'frostNumber' : 'frostSet');
    if (peer) peer.value = n;
    var r = document.getElementById('frostSet');
    if (r) r.style.setProperty('--bf-fill', (n / 30 * 100) + '%');
    applyFrost();
  }
  input.setAttribute('aria-invalid', valid ? 'false' : 'true');
  if (commit) {
    localStorage.setItem('frostNum', curFrostNum);
    syncFrostControls();
    var st = document.getElementById('frostStatus');
    if (st) st.textContent = valid ? '已自动保存 · 0 表示关闭磨砂' : '请输入 0–30，已恢复上次有效值';
  }
}
function resetFrost() {
  curFrostNum = 7;
  localStorage.setItem('frostNum', 7);
  applyFrost(); syncFrostControls();
  var st = document.getElementById('frostStatus');
  if (st) st.textContent = '已恢复默认 7px';
}
applyFrost();

function resetTrans() {
  curTransNum = 97; curTransMini = 97;
  localStorage.setItem('transNum',97);
  if (transFrame) cancelAnimationFrame(transFrame);
  applyTrans(); syncTransControls();
  var status = document.getElementById('transStatus');
  if (status) status.textContent = '已恢复默认 97%，其他设置不变';
}
applyTrans();


/* 滑条增强：拖动或者点击进度条任意位置都能跳转 start */
var curJumpRange = null;      // 当前正在拖动/点击的滑条
var rangeJumpReady = false;   // 全局的移动、松手监听是否已注册

// 把屏幕横坐标换算成滑条该取的值（扣掉滑块自身宽度，两端才准）
function rangeValueFromX(rangeEl, clientX) {
  var rect = rangeEl.getBoundingClientRect();
  var min = parseFloat(rangeEl.min);
  var max = parseFloat(rangeEl.max);
  var step = parseFloat(rangeEl.step);
  if (isNaN(min)) min = 0;
  if (isNaN(max)) max = 100;
  if (isNaN(step) || step <= 0) step = 1;
  if (!rect.width) return isNaN(parseFloat(rangeEl.value)) ? min : parseFloat(rangeEl.value);
  var thumb = 15;                          // 与 CSS 里 ::-webkit-slider-thumb 的宽度保持一致
  var usable = rect.width - thumb;         // 滑块圆心能走的总距离
  if (usable <= 0) usable = rect.width;
  var ratio = (clientX - rect.left - thumb / 2) / usable;
  ratio = ratio < 0 ? 0 : (ratio > 1 ? 1 : ratio);
  var val = min + ratio * (max - min);
  val = Math.round(val / step) * step;     // 按 step 取整，和原生拖动保持一致
  val = Math.min(max, Math.max(min, val));
  return Math.round(val * 1000) / 1000;    // 去掉浮点误差尾巴
}

// 直接改 value 不会触发 oninput，这里手动补一次 input 事件，复用原有的 setTrans()
function fireRangeInput(rangeEl) {
  var evt;
  try {
    evt = new Event("input", { bubbles: true });
  } catch (err) {
    evt = document.createEvent("Event");
    evt.initEvent("input", true, true);
  }
  rangeEl.dispatchEvent(evt);
}

// 按坐标更新滑条的值
function setRangeByX(rangeEl, clientX) {
  var val = rangeValueFromX(rangeEl, clientX);
  if (parseFloat(rangeEl.value) === val) return;
  rangeEl.value = val;
  fireRangeInput(rangeEl);
}

// 绑定：按下即跳到该位置，按住拖动则一路跟随（含轨道左右的空白区域）
function bindRangeJump(rangeEl) {
  if (!rangeEl || rangeEl.rangeJumpBound) return;
  rangeEl.rangeJumpBound = true;
  var box = rangeEl.parentNode || rangeEl;
  var start = function (clientX) { curJumpRange = rangeEl; setRangeByX(rangeEl, clientX); };
  if (window.PointerEvent) {
    box.addEventListener("pointerdown", function (e) {
      if (e.button && e.button !== 0) return;   // 只响应左键
      start(e.clientX);
    });
  } else {
    box.addEventListener("mousedown", function (e) {
      if (e.button) return;
      start(e.clientX);
    });
    box.addEventListener("touchstart", function (e) {
      if (e.touches && e.touches[0]) start(e.touches[0].clientX);
    }, { passive: true });
  }
}

// 全局监听只注册一次，避免反复开关小窗时重复绑定
function initRangeJump() {
  if (rangeJumpReady) return;
  rangeJumpReady = true;
  var move = function (clientX) { if (curJumpRange) setRangeByX(curJumpRange, clientX); };
  var end = function () { curJumpRange = null; };
  if (window.PointerEvent) {
    document.addEventListener("pointermove", function (e) { move(e.clientX); });
    document.addEventListener("pointerup", end);
    document.addEventListener("pointercancel", end);
  } else {
    document.addEventListener("mousemove", function (e) { move(e.clientX); });
    document.addEventListener("mouseup", end);
    document.addEventListener("touchmove", function (e) {
      if (e.touches && e.touches[0]) move(e.touches[0].clientX);
    }, { passive: true });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", end);
  }
}
/* 滑条增强 end */


// 每12小时强制切换一次夜间模式
// 2026-10-14：这是「自动决定深浅色」的另一半，所以也听 _config.chengic.yml 里
// window.fomalNightConfig.enabled 那个总开关 —— 关掉自动模式时这一段同样不许动手。
var autoNightOff = !!(window.fomalDayNight && window.fomalDayNight.config
  && window.fomalDayNight.config.enabled === false);
if (localStorage.getItem("lastTime") == undefined) {
  localStorage.setItem("lastTime", Date.now() - 8.1 * 60 * 60 * 1000);
}
let deltaSeconds = (Date.now() - localStorage.getItem("lastTime")) / 1000;
// 距离上次主动切换日夜模式超过8h，根据当前时间自动调节日夜模式
if (deltaSeconds > 60 * 60 * 8 && !autoNightOff) {
  // 24小时后再生效
  localStorage.setItem("lastTime", Date.now());
  var curHour = new Date().getHours();
  var curMode = document.getElementsByTagName('html')[0].getAttribute('data-theme');
  // 是白天还是夜间：优先问 /js/inject/daynight-boot.js —— 它每页都在，按访客当地真实日出日落算
  // （window.fomalDayNight.isDayNow）；老路径再问首页那张日历卡（fomalAsideCalendar），最后才退回早7晚7。
  // 它们都会在解析期先把模式摆正，所以正常情况下下面两个分支根本不会进。
  var isDayNow = (window.fomalDayNight && typeof window.fomalDayNight.isDayNow === 'function')
    ? window.fomalDayNight.isDayNow()
    : (window.fomalAsideCalendar && typeof window.fomalAsideCalendar.isDayNow === 'function')
      ? window.fomalAsideCalendar.isDayNow()
      : (curHour >= 7 && curHour < 19);
  // 模式不正确
  if (!isDayNow && curMode != "dark") {
    activateDarkMode();
    saveToLocal.set('theme', 'dark', 2);
    document.getElementById('modeicon').setAttribute('xlink:href', '#icon-sun');
  } else if (isDayNow && curMode != "light") {
    activateLightMode();
    saveToLocal.set('theme', 'light', 2);
    // 切到白天：body.DarkMode 要摘掉（原来这里写的是 add，类与页面状态正好相反 ——
    // shell.js 的日转过场与月亮按钮样式都读这个类）
    document.querySelector('body').classList.remove('DarkMode');
    document.getElementById('modeicon').setAttribute('xlink:href', '#icon-moon');
  }
}


// 切换自定义颜色
var defineColor = localStorage.getItem("blogbg") && localStorage.getItem("blogbg").charAt(0) == '#' ? localStorage.getItem("blogbg") : '#F4D88A';
function changeBgColor() {
  changeBg(document.querySelector("#define_colors").value);
}

// 必应每日壁纸API（2026-09-30 修复：原 bing.img.run 已全站失效）
let bingDayBg = "url(https://bing.biturl.top/?resolution=1920&format=image&index=0&mkt=zh-CN)";
// 必应历史/随机壁纸API（2026-09-30 修复：原 bing.img.run 已全站失效）
let bingHistoryBg = "url(/External-link/img/bg/picsum-1039.jpg)";
// 二次元随机（2026-09-30 换到 loliapi；2026-10-06 改走同站横屏库 /acg/pc/ —— 原 /acg/ 每 3 次请求就有 1 次 404）
let EEEDog = "url(/External-link/img/bg/picsum-1015.jpg)";
// 随机美图（2026-09-30 换到 api.dujin.org/pic/；2026-10-06 该接口开始返回 0 字节空图，改用 moe.jitsu.top 萌图）
let seovx = "url(/External-link/img/bg/picsum-1018.jpg)";
// picsum随机
let picsum = "url(/External-link/img/bg/picsum-1043.jpg)";
// 小歪二次元
// let waiDongman = "url(https://api.ixiaowai.cn/api/api.php)";
// 高清壁纸（2026-09-30 修复：原 api.ixiaowai.cn 已失效）
let waiBizhi = "url(/External-link/img/bg/picsum-1044.jpg)";
// 手机竖屏二次元（2026-09-30 修复：原 api.btstu.cn 仅有 http，HTTPS 站会被浏览器按混合内容拦截）
let btstu = "url(/External-link/img/bg/picsum-1039.jpg)";
// tuapi 动漫
// let tuapi = "url(https://tuapi.eees.cc/api.php?category=dongman)";
// 横屏二次元（2026-09-30 修复：原 source.unsplash.com 官方已停服）
let unsplash = "url(/External-link/img/bg/picsum-1043.jpg)";


// 判断背景值是否合法（default / #颜色 / url(...) / 渐变 / http(s) 链接）
function isValidBgVal(s) {
  if (s == undefined || s == null) return false;
  s = String(s).trim();
  if (s == "" || s == "undefined" || s == "null") return false;
  if (s.charAt(0) == "#") return true;
  if (s.indexOf("url(") == 0) return true;
  if (s.indexOf("linear-gradient") == 0 || s.indexOf("radial-gradient") == 0) return true;
  if (s.indexOf("http://") == 0 || s.indexOf("https://") == 0) return true;
  return false;
}
// 从背景值里取出图片直链，取不到返回空串
function bgValToUrl(s) {
  if (!isValidBgVal(s)) return "";
  s = String(s).trim();
  var m = s.match(/^url\((["']?)(.*?)\1\)$/);
  if (m) s = m[2];
  return /^https?:\/\//.test(s) ? s.trim() : "";
}
// 更换背景(自己的代码)
restoreAppearanceBackground();
// 默认背景（「恢复默认设置」reset() 会调这里；刷新后 localStorage 里没存自定义背景时也走这里）
// 四张图与 _config.chengic.yml 的 inject.head #defineBg 逐字一致，改一处必须同步另一处：
//   --default-bg      PC 日间    /Background-wallpaper/computer-Daytime-background.webp
//   --darkmode-bg     PC 夜间    /Background-wallpaper/computer-Night-background.webp
//   --mobileday-bg    移动端日间  /Background-wallpaper/phone-Daytime-background.webp
//   --mobilenight-bg  移动端夜间  /Background-wallpaper/phone-Night-background.webp
function resetBg_() {
  var el = document.getElementById("defineBg");
  if (!el) return;
  el.innerText = `:root{
    --default-bg: url(/Background-wallpaper/computer-Daytime-background.webp);  /* PC 日间 */
    --darkmode-bg:url(/Background-wallpaper/computer-Night-background.webp);   /* PC 夜间 */
    --mobileday-bg: url(/Background-wallpaper/phone-Daytime-background.webp);  /* 移动端日间 */
    --mobilenight-bg: url(/Background-wallpaper/phone-Night-background.webp);  /* 移动端夜间 */
  }`;
}

// 切换背景主函数
function changeBg(s) { return changeAppearanceBackground(s); }
// 设置背景属性
function setBg(s) {
  var el = document.getElementById("defineBg");
  if (!el) return;
  el.innerText = `:root{
    --default-bg: ${s};
    --darkmode-bg: ${s};
    --mobileday-bg: ${s};
    --mobilenight-bg: ${s};
  }`;
}

// 切换链接对应的背景(加入了链接检验与防抖)
function getPicture() { return previewCustomBackground(); }
function getPicture_() { return previewCustomBackground(); }
// 判断图片链接是否可用
function checkImgExists(imgurl) {
  var url = appearanceBackgroundSafeUrl(imgurl, false);
  if (!url) return Promise.reject(new Error("无效的图片链接"));
  return appearanceBackgroundProbe(url).promise.then(function(ok) {
    if (!ok) throw new Error("图片加载失败或超时");
    return true;
  });
}

// 黑夜霓虹灯开关
if (localStorage.getItem("light") == undefined) {
  localStorage.setItem("light", "true");
}
// 这里要适配Pjax
document.addEventListener('pjax:complete', function () {
  changeLight(localStorage.getItem("light") == "true" ? true : false)
});
document.addEventListener('DOMContentLoaded', function () {
  changeLight(localStorage.getItem("light") == "true" ? true : false)
});
function setLight() {
  if (document.getElementById("lightSet").checked) {
    changeLight(true);
    localStorage.setItem("light", "true");
  } else {
    changeLight(false);
    localStorage.setItem("light", "false");
  }
}
// 更换霓虹灯状态
function changeLight(flag) {
  if (document.getElementById("site-name"))
    document.getElementById("site-name").style.animation = flag ? "light_15px 10s linear infinite" : "none";
  if (document.getElementById("site-title"))
    document.getElementById("site-title").style.animation = flag ? "light_15px 10s linear infinite" : "none";
  if (document.getElementById("site-subtitle"))
    document.getElementById("site-subtitle").style.animation = flag ? "light_10px 10s linear infinite" : "none";
  if (document.getElementById("post-info"))
    document.getElementById("post-info").style.animation = flag ? "light_5px 10s linear infinite" : "none";
  document.getElementById("menu_shadow").innerText = flag ? `:root{--menu-shadow: 0 0 1px var(--theme-color);}` : `:root{--menu-shadow: none;}`;
}

// 背景滤镜：滑条实时预览，change/blur 保存；旧的 0–300px 模糊值继续兼容。
var bgFilterFields = [
  { id: 'blurRad', label: '模糊程度', unit: 'px', max: 60, value: 0 },
  { id: 'saturation', label: '饱和度', unit: '%', max: 200, value: 108 },
  { id: 'contrast', label: '对比度', unit: '%', max: 200, value: 105 }
];
var bgFilterFrame = 0;
var blurRadius = 0, saturate = 108, contrast = 105;
function readBgFilter() {
  var match = /^blur\(([\d.]+)px\) saturate\(([\d.]+)%\) contrast\(([\d.]+)%\)$/.exec(localStorage.getItem('bgFilterVal') || '');
  bgFilterFields.forEach(function(f, i) {
    var n = match ? Number(match[i + 1]) : NaN;
    var limit = i === 0 ? 300 : 200;
    f.value = Number.isFinite(n) && n >= 0 && n <= limit ? n : [0,108,105][i];
    // 新设置使用 0–60px；较大的旧值扩展滑条上限，恢复默认后回到常用范围。
    f.max = i === 0 ? Math.max(60, Math.ceil(f.value / 10) * 10) : 200;
  });
  syncBgFilterGlobals();
}
function syncBgFilterGlobals() {
  blurRadius = bgFilterFields[0].value; saturate = bgFilterFields[1].value; contrast = bgFilterFields[2].value;
}
function bgFilterCSS() { return 'blur(' + blurRadius + 'px) saturate(' + saturate + '%) contrast(' + contrast + '%)'; }
function applyBgFilter() {
  bgFilterFrame = 0;
  var style = document.getElementById('bgFilterParam');
  if (style) style.textContent = ':root{--bg-filter:' + (localStorage.getItem('bgFilterOn') === '0' ? 'none' : bgFilterCSS()) + ';}';
}
function syncBgFilterControls() {
  var enabled = localStorage.getItem('bgFilterOn') !== '0';
  var toggle = document.getElementById('bgFilterSet');
  if (toggle) toggle.checked = enabled;
  bgFilterFields.forEach(function(f) {
    var input = document.getElementById(f.id), range = document.getElementById(f.id + 'Range');
    if (input) { input.max = f.max; input.value = f.value; input.disabled = !enabled; input.removeAttribute('aria-invalid'); }
    var endpoint = document.getElementById(f.id + 'Max');
    if (endpoint) endpoint.textContent = f.max + f.unit;
    if (range) { range.max = f.max; range.value = f.value; range.disabled = !enabled; range.style.setProperty('--bf-fill', f.value / f.max * 100 + '%'); }
  });
  var status = document.getElementById('bgFilterStatus');
  if (status) status.textContent = enabled ? '调整时实时预览，松手或结束输入后自动保存' : '滤镜已关闭 · 开启后可调，原数值已保留';
  var resetButton = document.getElementById('bgFilterReset');
  if (resetButton) resetButton.disabled = !enabled;
}
function editBgFilter(id, input, commit) {
  if (localStorage.getItem('bgFilterOn') === '0') return;
  var f = bgFilterFields.find(function(item) { return item.id === id; });
  if (!f) return;
  var n = input.value.trim() === '' ? NaN : Number(input.value);
  var valid = Number.isFinite(n) && n >= 0 && n <= f.max;
  if (valid) { f.value = n; syncBgFilterGlobals(); }
  if (commit) {
    syncBgFilterControls();
    saveBgFilter();
    if (!valid) document.getElementById('bgFilterStatus').textContent = '请输入 0–' + f.max + f.unit + '，已恢复上次有效值';
  } else {
    input.setAttribute('aria-invalid', valid ? 'false' : 'true');
    var peer = document.getElementById(input.id === id ? id + 'Range' : id);
    if (valid && peer) peer.value = n;
    var range = document.getElementById(id + 'Range');
    if (range) range.style.setProperty('--bf-fill', f.value / f.max * 100 + '%');
    if (!bgFilterFrame) bgFilterFrame = requestAnimationFrame(applyBgFilter);
  }
}
function saveBgFilter() {
  localStorage.setItem('bgFilterVal', bgFilterCSS());
  if (bgFilterFrame) { cancelAnimationFrame(bgFilterFrame); bgFilterFrame = 0; }
  applyBgFilter();
}
function resetBgFilter() {
  bgFilterFields.forEach(function(f, i) { f.value = [0,108,105][i]; f.max = i === 0 ? 60 : 200; });
  syncBgFilterGlobals(); saveBgFilter(); syncBgFilterControls();
  var status = document.getElementById('bgFilterStatus');
  if (status) status.textContent = '已恢复滤镜默认值，其他美化设置不变';
}
function setBgFilter() {
  localStorage.setItem('bgFilterOn', document.getElementById('bgFilterSet').checked ? '1' : '0');
  saveBgFilter(); syncBgFilterControls();
}
function bgFilterMarkup() {
  return '<section class="bf-panel" aria-label="背景滤镜"><div class="bf-heading"><label for="bgFilterSet">背景滤镜</label><input type="checkbox" id="bgFilterSet" onchange="setBgFilter()"></div>' +
    '<p class="bf-hint" id="bgFilterStatus" role="status"></p>' + bgFilterFields.map(function(f) {
      return '<div class="bf-control"><div class="bf-value-row"><label for="' + f.id + '">' + f.label + '</label><span class="bf-number"><input type="number" id="' + f.id + '" min="0" max="' + f.max + '" step="1" inputmode="decimal" oninput="editBgFilter(\'' + f.id + '\',this,false)" onblur="editBgFilter(\'' + f.id + '\',this,true)" onkeydown="if(event.key===\'Enter\')this.blur()" aria-describedby="' + f.id + 'Limits"><span>' + f.unit + '</span></span></div>' +
        '<input class="bf-slider" type="range" id="' + f.id + 'Range" min="0" max="' + f.max + '" step="1" aria-label="' + f.label + '" aria-describedby="' + f.id + 'Limits" oninput="editBgFilter(\'' + f.id + '\',this,false)" onchange="editBgFilter(\'' + f.id + '\',this,true)">' +
        '<div class="bf-limits" id="' + f.id + 'Limits"><span>0' + f.unit + '</span><span>' + (f.unit === '%' ? '100% · 原图' : '数值越大，背景越朦胧') + '</span><span id="' + f.id + 'Max">' + f.max + f.unit + '</span></div></div>';
    }).join('') + '<div class="bf-footer"><button type="button" id="bgFilterReset" onclick="resetBgFilter()">恢复滤镜默认值</button></div></section>';
}
readBgFilter();
if (localStorage.getItem('bgFilterOn') == null) localStorage.setItem('bgFilterOn', '1');
applyBgFilter();

// 解决开启Pjax的问题
// function whenDOMReady() {
//   try {
//     let data = loadData('blogbg', 1440)
//     if (data) changeBg_noWindow(data, 0)
//     else localStorage.removeItem('blogbg');
//   } catch (error) { localStorage.removeItem('blogbg'); }
// }
// whenDOMReady()
// document.addEventListener("pjax:success", whenDOMReady)

// 无弹窗提醒更换背景
// function changeBg_noWindow(s, flag) {
//   let bg = document.getElementById("web_bg");
//   if (s.charAt(0) == "#") {
//     bg.style.backgroundColor = s;
//     bg.style.backgroundImage = "none";
//   } else bg.style.backgroundImage = s;
//   if (!flag) {
//     saveData("blogbg", s);
//   }
// }

// 创建窗口
// 美化窗口「从没调过」时的默认大小（作者 2026-11-02 定：1000×620）。
// 用户自己拖过之后走 localStorage.meihuaSize，这里只是兜底。
var MEIHUA_BOX_DEFAULT = { w: 1000, h: 620 };

var winbox = "";
// 面板最近一次被打开的时间戳（2026-10-29）：用来挡掉「点齿轮打开面板」这一下，
// 否则同一串事件里刚绑上的「点外面关闭」会立刻把它关回去。
var winboxOpenedAt = 0;
// 弹出动画的起点按钮（2026-10-29）：最近一次被按下的「打开面板」按钮，
// 菜单项 / 侧栏按钮点开时也能从那颗按钮上长出来，而不是永远从导航栏齿轮算。
var winboxTriggerEl = null;
// 动画令牌：收起动画跑到一半又被点开时，用它作废上一段动画的收尾回调
var winboxPopToken = 0;

// 记下「谁把我打开的」，只认三种入口：onclick="toggleWinbox()"、href="javascript:toggleWinbox();"、data-winbox-open
document.addEventListener(
  "pointerdown",
  function (e) {
    var t = e.target;
    if (!t || t.nodeType !== 1 || !t.closest) return;
    winboxTriggerEl = t.closest('[onclick*="toggleWinbox"],[href*="toggleWinbox"],[data-winbox-open]');
  },
  true
);

function createWinbox() {
  let div = document.createElement("div");
  document.body.appendChild(div);
  var savedBox = null;
  try { savedBox = JSON.parse(localStorage.getItem("meihuaSize") || "null"); } catch (e) {}
  winbox = WinBox({
    id: "meihuaBox",
    index: 99,
    title: "美化设置",
    x: "left",
    y: "center",
    minwidth: "300px",
    width: savedBox && savedBox.w ? savedBox.w : MEIHUA_BOX_DEFAULT.w,
    height: savedBox && savedBox.h ? savedBox.h : MEIHUA_BOX_DEFAULT.h,
    // "#76c8f1"
    background: 'var(--theme-color)',
    onmaximize: () => {
      div.innerHTML = `<style>body::-webkit-scrollbar {display: none;} div#meihuaBox {width: 100% !important;}</style>`;
    },
    onrestore: () => {
      div.innerHTML = "";
    },
    // 最小化后停到右上角齿轮正下方（Winbox 默认排到视口左下角，见 dockWinboxMin）
    onminimize: () => {
      dockWinboxMin();
    },
  });
  winResize();
  window.addEventListener("resize", winResize);

  // 面板 HTML。改这里的约定（样式全在 themes/chengic/source/css/_custom/custom.css 的「美化面板」一节）：
  //  · 每段「文字 + 开关」用 <label class="opt"> 包住 —— 点文字也能切开关，窄屏换行时开关不会跟自己的文字分家；
  //  · 背景滤镜使用 bf-panel 双层布局，独立样式在 source/css/site-inject.css；
  //  · 主题色那一行是 .colorRow：桌面一行铺开，手机端换成等宽网格（@media max-width:768px）。
  // 恢复默认背景按钮已删除（2026-10-04）：上面的「恢复默认设置」reset() 里已经会 resetBg_()，那个按钮是重复的。
  winbox.body.innerHTML = `
<div class="settings" style="display: block;">
<div id="article-container" style="padding:12px;">
<br>
<center><p><button id="reset_btn" type="button" onclick="debounce(reset, 300)" title="点击此按钮恢复美化模块默认设置"><i class="fa-solid fa-arrows-rotate" style="animation: fa-spin 8s linear infinite;"></i>&nbsp;恢复默认设置</button></p></center>

<h2>一、显示偏好</h2>

<section class="bf-panel opacity-panel" aria-label="卡片不透明度">
  <div class="bf-value-row"><label for="transNumber">卡片不透明度</label><span class="bf-number"><input id="transNumber" type="number" min="0" max="100" step="1" inputmode="decimal" aria-describedby="transLimits transStatus" oninput="setTrans(this,false)" onblur="setTrans(this,true)" onkeydown="if(event.key==='Enter')this.blur()"><span>%</span></span></div>
  <p class="bf-hint" id="transStatus" role="status">实时预览，结束调整后自动保存 · 只改变卡片底色，不影响文字</p>
  <input class="bf-slider" id="transSet" type="range" min="0" max="100" step="1" aria-label="卡片不透明度" aria-describedby="transLimits" oninput="setTrans(this,false)" onchange="setTrans(this,true)">
  <div class="bf-limits" id="transLimits"><span>0% · 完全透明</span><span>100% · 不透明</span></div>
  <div class="bf-footer"><button type="button" onclick="resetTrans()">恢复默认 97%</button></div>
</section>

<section class="bf-panel frost-panel" aria-label="磨砂效果">
  <div class="bf-value-row"><label for="frostNumber">磨砂效果</label><span class="bf-number"><input id="frostNumber" type="number" min="0" max="30" step="1" inputmode="decimal" aria-describedby="frostStatus" oninput="setFrost(this,false)" onblur="setFrost(this,true)" onkeydown="if(event.key==='Enter')this.blur()"><span>px</span></span></div>
  <p class="bf-hint" id="frostStatus" role="status">卡片背后会被虚化，0 = 关闭；数值越大越「雾」</p>
  <input class="bf-slider" id="frostSet" type="range" min="0" max="30" step="1" aria-label="磨砂效果" oninput="setFrost(this,false)" onchange="setFrost(this,true)">
  <div class="bf-limits"><span>0px · 关闭</span><span>30px · 很雾</span></div>
  <div class="bf-footer"><button type="button" onclick="resetFrost()">恢复默认 7px</button></div>
</section>


${bgFilterMarkup()}

<section class="bf-panel feature-panel" aria-labelledby="effectsHeading">
  <div class="bf-heading" id="effectsHeading">氛围特效</div>
  <p class="bf-hint">保留喜欢的装饰，开关后立即生效</p>
  <div class="feature-grid">
    <label class="feature-opt"><span>星空特效<small>夜间模式</small></span><input type="checkbox" id="universeSet" onchange="setUniverse()"></label>
    <label class="feature-opt"><span>霓虹彩灯<small>夜间模式</small></span><input type="checkbox" id="lightSet" onchange="setLight()"></label>
    <label class="feature-opt"><span>雪花特效<small>白天模式 · 默认关闭 · 底部薄积雪</small></span><input type="checkbox" id="snowSet" onchange="setSnow()"></label>
    <label class="feature-opt"><span>萤火虫微光<small id="firefliesHint">下方微光 · 默认关闭 · 与雪花互斥</small></span><input type="checkbox" id="firefliesSet" aria-describedby="firefliesHint" onchange="setFireflies()"></label>
    <div class="feature-opt dm-wide" role="group" aria-labelledby="darkTransLabel"><span id="darkTransLabel">昼夜切换<small>入夜 / 黎明的过场动画</small></span><div class="dm-seg" id="darkTransSet" role="radiogroup" aria-label="昼夜切换动画"><button type="button" role="radio" aria-checked="false" data-tier="off" onclick="setDarkTransition('off')">关闭</button><button type="button" role="radio" aria-checked="false" data-tier="light" onclick="setDarkTransition('light')">轻</button><button type="button" role="radio" aria-checked="true" data-tier="standard" onclick="setDarkTransition('standard')">标准</button><button type="button" role="radio" aria-checked="false" data-tier="flourish" onclick="setDarkTransition('flourish')">华丽</button></div><p class="dm-seg-note" id="darkTransNote" role="status">标准：日落 → 暮色 → 星夜，最后从点击位置像揭幕一样翻开（约 1.5 秒）</p></div>
  </div>
</section>

<section class="bf-panel feature-panel" aria-labelledby="interactionHeading">
  <div class="bf-heading" id="interactionHeading">互动挂件</div>
  <p class="bf-hint">猫咪与听话鼠标默认开启，点击涟漪默认关闭，选择都会自动保存</p>
  <div class="feature-grid">
    <label class="feature-opt"><span>猫咪挂件<small>桌面端的挂绳小猫咪</small></span><input type="checkbox" id="nekoSet" onchange="setNeko()"></label>
    <label class="feature-opt"><span>听话鼠标<small>关闭后使用系统鼠标指针</small></span><input type="checkbox" id="cursorSet" onchange="setCursor()"></label>
    <label class="feature-opt"><span>帧率监测<small>默认开启</small></span><input type="checkbox" id="fpson" onchange="fpssw()"></label>
    <label class="feature-opt"><span>点击涟漪<small id="rippleHint">点一下，泛起一圈小波纹 · 默认关闭</small></span><input type="checkbox" id="rippleSet" aria-describedby="rippleHint" onchange="setRipple()"></label>
  </div>
</section>

<section class="bf-panel feature-panel" aria-labelledby="layoutHeading">
  <div class="bf-heading" id="layoutHeading">布局与部件</div>
  <p class="bf-hint">调整常用工具与页面侧栏的显示方式</p>
  <div class="feature-grid">
    <label class="feature-opt"><span>右侧部件<small>默认开启</small></span><input type="checkbox" id="rightSideSet" onchange="toggleRightside()"></label>
    <label class="feature-opt"><span>顶栏常驻<small>默认开启</small></span><input type="checkbox" id="navSet" onchange="setNav()"></label>
    <label class="feature-opt"><span>侧栏显隐<small>默认显示</small></span><input type="checkbox" id="asideSet" onchange="setAside()"></label>
    <label class="feature-opt"><span>侧栏位置<small>开启在右 · 关闭在左</small></span><input type="checkbox" id="asidePosSet" onchange="setAsidePos()"></label>
  </div>
</section>

<h2>二、主题色设置</h2>
${themeColorMarkup()}

<h2>三、字体设置</h2>
${appearanceFontMarkup()}
<h2>四、背景设置</h2>
${appearanceBackgroundMarkup()}

<br>
<center><div style="font-size:1.2em;color:var(--theme-color);font-weight:bold;">------ ( •̀ ω •́ )y 到底啦 ------</div></center>
<br>

</div>

</div>

`;

  // 滑条：点击或拖动轨道任意位置都能跳转（原来进度条盖住轨道，左侧点不动）
  initRangeJump();
  // 原生滑条负责点击/拖动及键盘操作，避免旧指针模拟器重复处理。
  syncTransControls();
  syncFrostControls();
  syncFontColorControls();
  applyFontColor();

  syncInteractionControls();

  // 打开小窗时恢复主题色，包括不对应预设 radio 的自定义色。
  syncThemeColorControls();
  readBgFilter();
  applyBgFilter();
  syncBgFilterControls();

  if (localStorage.getItem("universe") == "block") {
    document.getElementById("universeSet").checked = true;
  } else if (localStorage.getItem("universe") == "none") {
    document.getElementById("universeSet").checked = false;
  }
  if (localStorage.getItem("fpson") == "1") {
    document.getElementById("fpson").checked = true;
  } else {
    document.getElementById("fpson").checked = false;
  }
  if (localStorage.getItem("rs") == "block") {
    document.getElementById("rightSideSet").checked = true;
  } else if (localStorage.getItem("rs") == "none") {
    document.getElementById("rightSideSet").checked = false;
  }
  if (localStorage.getItem("light") == "true") {
    document.getElementById("lightSet").checked = true;
  } else {
    document.getElementById("lightSet").checked = false;
  }
  setFontBorder();
  setCodeFontBorder();
  initAppearanceFonts();
  initAppearanceBackgrounds();
  if (window.FOMAL_FIREFLIES) window.FOMAL_FIREFLIES.syncControls();
  if (localStorage.getItem("snow") == "block") {
    document.getElementById("snowSet").checked = true;
  } else if (localStorage.getItem("snow") == "none") {
    document.getElementById("snowSet").checked = false;
  }

  // 切片式测试会把 createWinbox / reset 单独取出来跑，函数可能不在同一片里：拿不到就跳过同步
  if (typeof syncDarkTransition === "function") syncDarkTransition(localStorage.getItem("darkTransition") || "standard");
  if (localStorage.getItem("nav") == "1") {
    document.getElementById("navSet").checked = true;
  } else if (localStorage.getItem("nav") == "0") {
    document.getElementById("navSet").checked = false;
  }
  if (localStorage.getItem("aside") == "1") {
    document.getElementById("asideSet").checked = true;
  } else if (localStorage.getItem("aside") == "0") {
    document.getElementById("asideSet").checked = false;
  }
  if (localStorage.getItem("asidePos") == "1") {
    document.getElementById("asidePosSet").checked = true;
  } else if (localStorage.getItem("asidePos") == "0") {
    document.getElementById("asidePosSet").checked = false;
  }

  // 面板建好后挂上「点空白处关闭」（只挂一次，监听器绑在 document 上，pjax 换页也不会失效）
  winboxOpenedAt = Date.now();
  setTimeout(bindWinboxOutsideClose, 0);

  // 弹出动画：建窗口这一帧先压成「收起态」，下一帧由 toggleWinbox 放出来，
  // 不然会先闪一帧完整面板再开始缩（详见 winboxPopIn）
  // ★ 注意必须等 winResize() 量完尺寸再加 .wb-pop：winboxNeedSize() 用的是
  //   getBoundingClientRect()，元素被 scale(.14) 之后量出来全是缩过的值，面板会算成 420 高。
  var root = document.getElementById("meihuaBox");
  if (root) {
    // 右上角 ✕ 也走同一套收起动画：拦住 Winbox 自带的 close（那是销毁窗口），
    // 改成「动画收回到齿轮」。捕获阶段 + stopPropagation 才能在它自己的处理器之前生效。
    root.addEventListener(
      "click",
      function (e) {
        var btn = e.target && e.target.closest ? e.target.closest(".wb-close") : null;
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        hideWinbox();
      },
      true
    );
  }
}

// ── 弹出 / 收回动画（2026-10-29）──────────────────────────────────────────
// 起点 = 齿轮按钮中心。transform-origin 是相对面板左上角的坐标，齿轮通常落在面板
// 右上方，所以两个值经常是「x 比宽度大、y 是负数」，这是允许的，scale 时窗口就收在齿轮上。
function winboxSetTransformOrigin(box) {
  try {
    // 量之前必须把缩放摘掉：getBoundingClientRect() 返回的是**变换后**的框，
    // 带着 .wb-pop 的 scale(.14) 去量，算出来的原点会缩到面板中间，动画方向就错了。
    var savedInline = box.style.transform;
    box.style.transform = "none";
    var br = box.getBoundingClientRect();
    var tr = null;
    if (winboxTriggerEl && document.contains(winboxTriggerEl)) {
      var tr0 = winboxTriggerEl.getBoundingClientRect();
      if (tr0.width || tr0.height) tr = tr0;
    }
    if (!tr) {
      var gear = document.getElementById("meihua-button");
      if (gear) {
        var gr = gear.getBoundingClientRect();
        if (gr.width || gr.height) tr = gr;
      }
    }
    box.style.transform = savedInline; // 还原成 class 说了算
    var ox = br.width; // 兜底：面板右上角
    var oy = 0;
    if (tr) {
      ox = tr.left + tr.width / 2 - br.left;
      oy = tr.top + tr.height / 2 - br.top;
    }
    box.style.transformOrigin = ox.toFixed(1) + "px " + oy.toFixed(1) + "px";
  } catch (err) {}
}

// 放出来：先确保是 .wb-pop 收起态 → 强制排一次版 → 去掉类，过渡自然跑起来
function winboxPopIn() {
  var box = document.getElementById("meihuaBox");
  if (!box || box.classList.contains("hide")) return;
  winboxPopToken++;
  box.classList.remove("wb-pop-out");
  box.classList.add("wb-pop");
  winboxSetTransformOrigin(box);
  void box.offsetWidth; // 让浏览器先把 scale(.14) 这帧吃下去，去掉类才有过渡
  box.classList.remove("wb-pop");
}

// 收回：动画跑完（或 340ms 兜底）再真正 hide，期间面板还能被点开
function winboxPopOut(done) {
  var box = document.getElementById("meihuaBox");
  if (!box || box.classList.contains("hide")) {
    if (done) done();
    return;
  }
  var token = ++winboxPopToken;
  winboxSetTransformOrigin(box);
  box.classList.remove("wb-pop");
  box.classList.add("wb-pop-out");

  var finished = false;
  function fin() {
    if (finished || token !== winboxPopToken) return; // 期间又被点开 → 这次收尾作废
    finished = true;
    box.removeEventListener("transitionend", onEnd);
    if (winbox && typeof winbox.hide === "function") winbox.hide();
    box.classList.remove("wb-pop-out");
    if (done) done();
  }
  function onEnd(e) {
    if (e.target === box && e.propertyName === "transform") fin();
  }
  box.addEventListener("transitionend", onEnd);
  setTimeout(fin, 340);
}

function showWinbox() {
  if (!winbox || typeof winbox.show !== "function") return;
  winbox.show();
  winboxOpenedAt = Date.now();
  var box = document.getElementById("meihuaBox");
  if (box) {
    box.classList.remove("wb-pop-out");
    box.classList.add("wb-pop");
  }
  requestAnimationFrame(winboxPopIn);
}

function hideWinbox() {
  if (!winbox || typeof winbox.hide !== "function") return;
  var box = document.getElementById("meihuaBox");
  if (!box || box.classList.contains("hide")) return;
  if (box.classList.contains("min")) return; // 最小化中的标题条不参与收起（点它/齿轮是还原）
  if (box.classList.contains("wb-pop-out")) return; // 已经在收了
  winboxPopOut(null);
}

// 点面板外的空白处收起美化设置（2026-10-29）
//  · 用 pointerdown：鼠标和触屏都吃，比 click 早一步，不用等用户松手；
//  · capture 阶段监听，页面别处的 stopPropagation 拦不住；
//  · 只隐藏、不销毁——面板里那些开关的 DOM 状态和滚到哪一行都还在，再点齿轮是原地打开。
var winboxOutsideBound = false;
function bindWinboxOutsideClose() {
  if (winboxOutsideBound) return;
  winboxOutsideBound = true;

  // 这些位置不算「空白处」：面板自己、打开面板的齿轮按钮、其他 WinBox 窗口、
  // 右键菜单、搜索弹窗、每日一言与音乐胶囊/播放器——点它们都有各自的事要做
  var KEEP = "#meihuaBox,.winbox,#rightMenu,#search-mask,#daily-say,#ds-mini,#ds-player,#ds-list,#meihua-button";
  function isToggleTrigger(el) {
    if (!el || !el.closest) return false;
    var hit = el.closest("a,button");
    if (!hit) return false;
    // 齿轮按钮有的写 onclick="toggleWinbox()"，有的写 href="javascript:toggleWinbox();"
    var s = (hit.getAttribute("onclick") || "") + " " + (hit.getAttribute("href") || "");
    return s.indexOf("toggleWinbox") !== -1;
  }
  function visibleBox() {
    var box = document.getElementById("meihuaBox");
    if (!box || box.classList.contains("hide")) return null;
    if (box.classList.contains("min")) return null; // 最小化时点外面不该把标题条一起藏了
    return winbox && typeof winbox.hide === "function" ? box : null;
  }

  document.addEventListener(
    "pointerdown",
    function (e) {
      if (!visibleBox()) return;
      if (Date.now() - winboxOpenedAt < 260) return; // 刚点齿轮打开的这一下不算
      var t = e.target;
      if (!t || t.nodeType !== 1) return;
      if (t.closest(KEEP)) return; // 面板内部 / 其他浮层
      if (isToggleTrigger(t)) return; // 交给齿轮自己 toggle，避免「先关再开」白闪一下
      hideWinbox(); // 带弹出动画的收起（不等动画完就算「关」了，不会重复触发）
    },
    true
  );

  // Esc 同样收起（键盘党的常规预期）
  document.addEventListener(
    "keydown",
    function (e) {
      if (e.key !== "Escape" && e.key !== "Esc") return;
      if (!visibleBox()) return;
      hideWinbox();
    },
    true
  );
}

// 恢复默认背景
function resetBg() { return resetAppearanceBackground(); }

// 恢复默认设置(不刷新页面)
function reset() {
  // 窗口尺寸也回默认（这块不属于「美化项」，但用户点「恢复默认设置」时预期一切复原）
  try { localStorage.removeItem("meihuaSize"); } catch (err) {}
  if (winbox) { try { winResize(); } catch (err) {} }
  if (typeof cancelAppearanceFonts === "function") cancelAppearanceFonts();
  if (typeof cancelAppearanceBackground === "function") cancelAppearanceBackground();
  initItem();
  if (window.FOMAL_FIREFLIES) window.FOMAL_FIREFLIES.setEnabled(false);
  applyInteractionSettings();

  setFont(FONT_DEFAULT);
  setCodeFont(CODE_FONT_DEFAULT);
  setColor("green");
  document.getElementById("universe").style.display = "block";
  document.getElementById("snow").style.display = "none";
  if (window.FOMAL_SNOW) window.FOMAL_SNOW.reset();

  document.getElementById("aside-show").innerText = `:root{--layout-justify-content: unset; --aside-content-display: block;}`;
  document.getElementById("aside-pos").innerText = `:root{--first-child-order: 0; --recent-post-item-margin: 0px 1% 20px 0px;}`;

  document.getElementById("nav").classList.add("nav_fixed");
  document.getElementById("nav").classList.remove("nav_visible");
  document.getElementById("nav-display").innerText = `:root{--nav-visible-display:none;--nav-fixed-display:inline-flex;}`;

  document.getElementById("rightSide").innerText = `:root{--rightside-display: block}`;
  document.getElementById("fps").style.display = "block";
  startFps(); // 恢复默认也恢复被真正停止的采样循环。

  curTransNum = 97;
  curTransMini = curTransNum;
  document.getElementById("transPercent").innerText = `:root{--trans-light: rgba(250, 250, 250, ${curTransNum}%) !important; --trans-dark: rgba(28, 28, 28, ${curTransNum}%) !important} `;

  // 磨砂也一起回默认（initItem 只写 localStorage，变量/界面/样式都没同步）
  curFrostNum = 7;
  localStorage.setItem('frostNum', 7);
  applyFrost();
  syncFrostControls();
  resetFontColor();
  var frostSt = document.getElementById('frostStatus');
  if (frostSt) frostSt.textContent = '已恢复默认 7px';


  if (typeof resetAppearanceBackground === "function") resetAppearanceBackground();
  else resetBg_();
  changeLight(true);

  document.getElementById("green").checked = true;
  document.getElementById("universeSet").checked = true;
  document.getElementById("fpson").checked = true;
  document.getElementById("rightSideSet").checked = true;
  document.getElementById("lightSet").checked = true;
  document.getElementById("snowSet").checked = false;
  document.getElementById("navSet").checked = true;
  document.getElementById("asideSet").checked = true;
  document.getElementById("asidePosSet").checked = true;
  if (typeof syncDarkTransition === "function") syncDarkTransition("standard");
  localStorage.setItem("darkTransition", "standard");

  resetBgFilter();

  resetTrans();
  if (typeof initAppearanceFonts === "function") initAppearanceFonts();
  if (typeof initAppearanceBackgrounds === "function") initAppearanceBackgrounds();

  fomalNotify({
        title: "提示🍅",
        message: "当前已经恢复为默认设置！",
        position: 'top-left',
        offset: 50,
        showClose: true,
        type: "success",
        duration: 5000
      })
}

// 量一次「内容真正需要多大的面板」：
// 宽度采用适合预览与缩略图的阅读宽度，由内部网格响应式换行；
// 记住用户拖出来的窗口尺寸：只在「指针抬起」时量一次真实尺寸。
// 不能用 Winbox 的 onresize —— 它连程序自己调的 resize（winResize 按内容自适应）也会触发，
// 等于每次 pjax / 窗口变化都把用户调过的尺寸冲掉（2026-11-02 修）。
document.addEventListener("pointerup", function (e) {
  var box = document.getElementById("meihuaBox");
  if (!box || !e.target || !box.contains(e.target)) return;
  if (box.classList.contains("min") || box.classList.contains("max")) return;
  setTimeout(function () {
    var r = box.getBoundingClientRect();
    if (r.width < 200 || r.height < 120) return;
    try { localStorage.setItem("meihuaSize", JSON.stringify({ w: Math.round(r.width), h: Math.round(r.height) })); } catch (err) {}
  }, 60);
}, true);

// 高度刚好完整显示第一节「一、显示偏好」——比这更大只会弹出一块又宽又空的大板子
function winboxNeedSize() {
  var fallback = { w: 780, h: 540 };
  var box = document.getElementById("meihuaBox");
  var ac = box ? box.querySelector("#article-container") : null;
  if (!ac) return fallback;
  // 弹出/收起动画期间面板带 scale，getBoundingClientRect() 量出来是缩过的值，
  // 直接拿去算高度会把面板算成 420 高。量之前把变换摁回 none，量完原样还回去。
  var savedInline = box.style.transform;
  box.style.transform = "none";
  try {
    var pr = box.getBoundingClientRect();
    var acr = ac.getBoundingClientRect();
    var cs = getComputedStyle(ac);
    var padL = parseFloat(cs.paddingLeft) || 0;
    var padR = parseFloat(cs.paddingRight) || 0;
    var padB = parseFloat(cs.paddingBottom) || 0;
    var chromeW = pr.width - acr.width; // 面板边框 + body 内边距占掉的宽度
    // ① 字体改为响应式网格，不再测五个按钮的总宽。
    var needW = fallback.w;
    // ② 高度：第一节最后一行开关（侧栏位置）完整可见即可
    var needH = fallback.h;
    var lastTog = ac.querySelector("#asidePosSet");
    if (lastTog) {
      var lr = lastTog.getBoundingClientRect();
      var rowR = (lastTog.closest('.feature-panel') || lastTog.parentElement).getBoundingClientRect();
      needH = Math.ceil(Math.max(lr.bottom, rowR.bottom) - pr.top + padB) + 6;
    }
    return {
      w: Math.max(620, Math.min(needW, Math.round(document.documentElement.clientWidth * 0.95))),
      h: Math.max(420, Math.min(needH, Math.round(document.documentElement.clientHeight * 0.92)))
    };
  } catch (err) {
    return fallback;
  } finally {
    box.style.transform = savedInline;
  }
}

// 最小化停靠（2026-10-29）：Winbox 自带的最小化是把窗口缩成一条 35px 的标题条，
// 由内部 oa() 统一排到视口**左下角**。这里在 onminimize 之后把它的 left/top/width
// 改成「右上角齿轮按钮的正下方、右边和齿轮对齐」，点这条依旧能还原（Winbox 的拖拽源
// 上挂了 min → restore）。
// 注意：只改 left/top/width/height 这几个 Winbox 自己也会写的内联属性，不碰 right/bottom，
// 这样 restore() 里的 resize().move() 能把位置正常改回居中，不用额外清理。
function dockWinboxMin() {
  var box = document.getElementById("meihuaBox");
  if (!box || !box.classList.contains("min")) return;
  var vw = document.documentElement.clientWidth;
  var vh = document.documentElement.clientHeight;
  var H = 35; // 与 Winbox 标题栏同高（winbox.h 也是 35）
  var W = vw <= 768 ? Math.min(200, vw - 32) : 200;

  var right = 12; // 兜底：右上角贴边
  var top = 64;
  var gear = document.getElementById("meihua-button");
  if (gear) {
    var gr = gear.getBoundingClientRect();
    if (gr.width || gr.height) {
      right = Math.round(vw - gr.right); // 右边与齿轮右边齐
      top = Math.round(gr.bottom + 8); // 落在齿轮下方
    }
  }
  right = Math.max(8, Math.min(right, vw - W - 8));
  top = Math.max(8, Math.min(top, vh - H - 8));

  box.style.left = Math.round(vw - right - W) + "px";
  box.style.top = top + "px";
  box.style.width = W + "px";
  box.style.height = H + "px";
}

// 适应窗口大小
function winResize() {
  try {
    // 最小化状态下不要按内容重排面板（会把它从标题条又撑开），只重新贴一次齿轮下方
    var maybeMin = document.getElementById("meihuaBox");
    if (maybeMin && maybeMin.classList.contains("min")) {
      dockWinboxMin();
      return;
    }

    var vw = document.documentElement.clientWidth;
    var vh = document.documentElement.clientHeight;

    // 手机/窄屏：铺开 95% × 90%
    if (vw <= 768) {
      winbox.resize(Math.round(vw * 0.95) + "px", Math.round(vh * 0.9) + "px").move("center", "center");
      return;
    }

    // 用户拖过就沿用（超出视口才收），没拖过用作者定的默认 1000×620。
    // 早先这里无条件按内容量（winboxNeedSize），量出来 780×743 会顶满屏幕高度。
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem("meihuaSize") || "null"); } catch (err) {}
    var target = (saved && saved.w >= 300 && saved.h >= 200) ? saved : MEIHUA_BOX_DEFAULT;
    var w = Math.min(target.w, Math.round(vw * 0.95));
    var h = Math.min(target.h, Math.round(vh * 0.92));
    winbox.resize(w + "px", h + "px").move("center", "center");
  } catch (err) {
    // console.log("Pjax毒瘤抽风运行winResize方法🙄🙄🙄");
  }
}

// 切换状态，窗口已创建则控制窗口显示和隐藏，没窗口则创建窗口
// 2026-10-29：改用 winbox.show()/hide()（原来是 toggleClass("hide")）——
// 「点外面关闭」走的是 hide()，会写 winbox.hidden 标记；两套状态要是各走各的，
// 隐藏一次之后就再也关不掉了。打开 / 收起都带上从齿轮弹出的缩放动画。
function toggleWinbox() {
  var box = document.getElementById("meihuaBox");
  if (box && winbox && typeof winbox.show === "function") {
    // 最小化成右上角标题条时，点齿轮 = 还原（否则会「把一条标题条藏起来」，状态就乱了）
    if (box.classList.contains("min")) {
      winbox.restore();
      return;
    }
    // 正在收起的那 260ms 里再点，当成「重新打开」，不然会有一小段点不动
    if (box.classList.contains("hide") || box.classList.contains("wb-pop-out")) {
      showWinbox(); // 同一串事件里别被「点外面关闭」立刻收回，时间戳在 showWinbox 里写
    } else {
      hideWinbox();
    }
  } else {
    createWinbox();
    winResize(); // 面板内容写完了，按内容再量一次尺寸
    // 量完再压成收起态（这里加类不会闪：同一帧内还没绘制），下一帧放出来
    var nb = document.getElementById("meihuaBox");
    if (nb) nb.classList.add("wb-pop");
    requestAnimationFrame(winboxPopIn); // 尺寸定了再算弹出起点，不然 transform-origin 是旧位置
  };
}

/* 美化模块 end */
