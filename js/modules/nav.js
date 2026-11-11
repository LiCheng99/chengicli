/* ============================================================================
 * modules/nav.js —— 导航栏 / 访客定位 / 随便逛逛 / 分享按钮
 * ----------------------------------------------------------------------------
 * 本文件由 source/js/fomal.js 拆出（2026-10-03 屎山重构）。
 * 【重要】这里故意不套 IIFE：主题 pug 模板里有大量内联 onclick="xxx()"，
 *        以及别的脚本会直接调全局函数，所以本文件里的声明必须留在全局作用域。
 * ----------------------------------------------------------------------------
 * 包含的模块（括号内为拆分前在 fomal.js 里的行号）：
 *   · 导航栏显示标题（37-66）—— 滚动到正文后，顶栏中间淡入文章标题（原来只有站点名）
 *   · 访客定位（99-348）—— 按访客 IP 取经纬度（腾讯 → zxinc → ipwho.is 三源降级），写进
 *                          global.ipLoacation，供日历卡的日出日落 / 日夜模式自动切换使用。
 *                          ⚠️ 2026-10-28 起这里**不再渲染任何文字**：侧栏那张「欢迎信息」卡片
 *                          已经换成「每日一言」（source/js/daily-say.js）。
 *   · 随便逛逛（504-525）—— 右下角"随便逛逛"按钮，随机跳一篇文章
 *   · 分享按钮（1237-1267）—— 文章页分享：复制链接 / 调起系统分享面板
 * ----------------------------------------------------------------------------
 * 和「顶栏 + 首屏 + 分享」有关的交互都在这。
 * 加载方式：_config.chengic.yml 的 inject.bottom 列表里以 <script defer> 引用。
 * ----------------------------------------------------------------------------
 * 【本文件目录】（行号可能随后续编辑漂移，找不到就 Ctrl+F 搜函数名）
 *     43  document 监听（pjax / DOMContentLoaded → tonav）
 *     46  tonav()
 *     72  scrollToTop()
 *    107  TENCENT_MAP_KEY / 111 SITE_LAT / 115 SOURCES_ENABLED（三个开关）
 *    132  getDistance()
 *    149  escHtml()
 *    156  fetchTencent()        源㈠ 腾讯位置服务
 *    187  fetchJson()           带超时的 JSON fetch
 *    213  parseZxinc()          源㈡ 中文省市
 *    224  parseIpwho()          源㈢ 英文+经纬度
 *    240  applyPlace()          结果落地 / 写缓存 / 兼容 ipLoacation
 *    258  readPlaceCache()
 *    268  failPlace()           三源全挂 → 静默降级（控制台一条 warn）
 *    285  loadPlace()           取数主流程（缓存 → 三源 → 降级）
 *    343  kickPlace()           启动入口：有侧栏才取，取完只写 ipLoacation
 *    356  randomPost()
 *    379  share_()
 *    403  share()
 * ========================================================================== */

/* ------------------------------ 导航栏显示标题 ------------------------------ */
/* 原 fomal.js 37-66 行，原样搬运，未改逻辑 */
/* 导航栏显示标题 start */

document.addEventListener('pjax:complete', tonav);
document.addEventListener('DOMContentLoaded', tonav);
//响应pjax
function tonav() {
  // Replace only this module's listener; keep other scroll handlers intact.
  var $window = $(window);
  $window.off('scroll.fomalNavTitle');
  var nameContainer = document.getElementById("name-container");
  var menusItems = document.getElementsByClassName("menus_items")[1];
  var pageName = document.getElementById("page-name");
  if (!nameContainer || !menusItems || !pageName) return;

  nameContainer.setAttribute("style", "display:none");
  var position = $window.scrollTop();
  $window.on('scroll.fomalNavTitle', function () {
    var scroll = $window.scrollTop();
    // 位置没变就什么都不做（2026-11-02 修闪烁）。
    // 原来这里只有「大于 = 下滑，否则 = 上滑」两分支，而 Chrome 在平滑滚动 / 布局抖动时
    // 会连续吐出 scrollTop 相同的 scroll 事件，一进 else 就把菜单项放回来，下一次 scroll
    // 又切回标题 —— 快速滑动时中间那排就在「菜单项 ↔ 文章标题」之间来回跳，看着一闪一闪。
    // 等值直接返回，状态保持不变。
    if (scroll === position) return;
    if (scroll > position) {
      nameContainer.setAttribute("style", "");
      menusItems.setAttribute("style", "display:none!important");
    } else {
      menusItems.setAttribute("style", "");
      nameContainer.setAttribute("style", "display:none");
    }
    position = scroll;
  });

  // 滚轮兜底（2026-10-31）：页面里有独立滚动容器时（例如音乐馆的歌单 #mp-list，
  // 固定 460px 高、自己可滚），向下滚到容器底会「滚动链」传给 window → 菜单收起；
  // 往回滚时只滚容器、window 不动，scroll 事件不触发，菜单就永远回不来。
  // wheel 会冒泡到 window（scroll 不会），所以在这里补一次「向上滚就恢复菜单」。
  // ⚠️ 2026-11-02：这里**绝对不要**再回写 position（原先有 `position = $window.scrollTop()`）。
  //    wheel 回调读到的 scrollTop 往往已经等于下一次 scroll 事件的值，把 position 提前顶上去后，
  //    上面那段就会收到 scroll === position，被判成「上滑」→ 菜单项回弹 → 反复闪。
  //    position 只由上面那个 scroll 处理器独占维护。
  $window.off('wheel.fomalNavTitle').on('wheel.fomalNavTitle', function (e) {
    var oe = e.originalEvent || e;
    if (!oe || typeof oe.deltaY !== 'number') return;
    if (oe.deltaY < 0) {
      menusItems.setAttribute("style", "");
      nameContainer.setAttribute("style", "display:none");
    }
  });

  // 顶栏兜底（2026-11-02）：内层滚动容器（音乐馆歌单 #mp-list）吞掉滚轮时 window 不滚，
  // 主题的 scrollCollect 只监听 scroll，压根不跑 → 顶栏一直停在「藏起来」的状态，
  // 在容器里怎么往上滑都调不出来。这里用 wheel 再补一刀：向上滚、且顶栏**当前真的看不见**时，
  // 加 nav-visible 让它滑出来。
  // ⚠️ 必须先用 display 判断，不能无条件加：
  //   站点 custom.css 把顶栏做成两个互斥模式（跟着设置里的「顶栏常驻」走）——
  //     常驻：  --nav-fixed-display:inline-flex / --nav-visible-display:none
  //     非常驻：--nav-fixed-display:none        / --nav-visible-display:inline-flex
  //   在常驻模式下无条件加 nav-visible，反而会把本来显示着的顶栏**藏掉**。
  //   所以这里只处理「现在看不见」的情况，看得见就一律不动。
  $window.off('wheel.fomalNavShow').on('wheel.fomalNavShow', function (e) {
    var oe = e.originalEvent || e;
    if (!oe || typeof oe.deltaY !== 'number' || oe.deltaY >= 0) return;
    var header = document.getElementById('page-header');
    var nav = document.getElementById('nav');
    if (!header || !nav || !header.classList.contains('nav-fixed')) return;
    if (getComputedStyle(nav).display !== 'none') return;
    header.classList.add('nav-visible');
  });
  //修复没有弄右键菜单的童鞋无法回顶部的问题
  pageName.innerText = document.title.split(" | chengicli")[0];
}

function scrollToTop() {
  document.getElementsByClassName("menus_items")[1].setAttribute("style", "");
  document.getElementById("name-container").setAttribute("style", "display:none");
  btf.scrollToDest(0, 500);
}

/* 导航栏显示标题 end */

/* ------------------------------ 访客定位 ------------------------------ */
/* 按访客 IP 粗略定位，只为一件事：把经纬度写进 global.ipLoacation，
 * 给 aside-calendar.js（日历卡日出日落）和 inject/daynight-boot.js（日夜模式自动切换）用。
 *
 * ⚠️ 2026-10-28：侧栏那张「欢迎信息」卡片已经删掉，换成每日一言（source/js/daily-say.js）。
 *    这里**不再渲染任何文字**，只负责取坐标 + 缓存。想彻底关掉：把下面 SOURCES_ENABLED 三项都设 false，
 *    两个消费者会自动回退到「按时区估经度」，功能不报错。
 *
 * 【为什么要三个源】这类免费接口有三种真实翻车方式，本机都踩过：
 *   ① 主题文档里流传的示例 key（5EVBZ-…）全网共用，配额天天爆 → {"status":121}
 *   ② 自己新申请的 key，如果账号没做「个人实名认证」，IP定位这一项配额就是 0，
 *      调用照样返回 121（同一把 key 打地点搜索却是 status 0，很容易误判成 key 写错了）
 *   ③ 部分免 key 接口被 CORS 拦、被运营商 DNS 污染、或者服务直接跑路
 * 所以按 腾讯 → zxinc → ipwho.is 的顺序取，谁先给出结果用谁；腾讯 1.2 秒不回就先并行上备用源。
 * 三个全挂就静默放弃（控制台一条 info/warn），消费者自己回退，读者完全无感。
 *
 *   ㈠ apis.map.qq.com  中文 · 有经纬度   —— 配额正常时的最优解
 *   ㈡ ip.zxinc.org     中文 · 无经纬度   —— 免 key，CORS 友好
 *   ㈢ ipwho.is         英文 · 有经纬度   —— 兜底
 *
 * 【换 key】改 TENCENT_MAP_KEY；【站长坐标】SITE_LAT / SITE_LNG 现在只用于历史遗留的 getDistance()。
 */

/* 腾讯位置服务 Key（WebServiceAPI 类型）。
 * 申请：https://lbs.qq.com/dev/console/application/mine → 新建应用 → 添加 Key → 勾 WebServiceAPI
 * 注意：新账号要先在 https://lbs.qq.com/dev/console/account/auth 做个人实名认证，
 *       否则「IP定位」每日配额是 0，一调用就返回 status=121（配额管理页面能直接看到这一行）。
 * Key 是明文下发到浏览器的，务必在控制台限制域名/配额，不然会被别人盗用。 */
const TENCENT_MAP_KEY = 'DV3BZ-J6R6T-XCNXP-VGCNP-AN6V7-XCB2G';

/* 站长坐标：只用来算「你目前距站长约 N 公里」。默认北京天安门，改成你自己的经纬度。
 * 取不到访客经纬度（走的是 ㈡ zxinc 源）时这段会整段不显示，不会出现 0 公里或 NaN。 */
const SITE_LAT = 116.397428;
const SITE_LNG = 39.90923;

/* 三个源的总开关，按需关掉（比如想省配额只留 zxinc） */
const SOURCES_ENABLED = { qqmap: true, zxinc: true, ipwho: true };

/* 定位结果缓存：sessionStorage，30 分钟内 pjax 反复切页不再重复请求（省配额、也更快）。
 * 用 sessionStorage 而不是 localStorage：关掉标签页就忘，IP 归属变化能重新取。 */
const PLACE_CACHE_KEY = 'fomalPlace';
const PLACE_CACHE_TTL = 30 * 60 * 1000;

/* ipLoacation 保持成腾讯接口的原始形状：aside-calendar.js 与 inject/daynight-boot.js 都读
 * global.ipLoacation.result.location.{lat,lng} 去算访客当地的日出日落，形状别改。
 * （原先这个变量从没声明过，靠 success 里隐式赋全局；「赋值前读」直接 ReferenceError，
 *   把整个函数打断，卡片就永远停在「加载中」——所以这里显式声明、给 null 初值。） */
var ipLoacation = null;

/* 展示用结构，三个源统一成 { ip, pos, lat, lng, isp, src } 再渲染 */
var placeInfo = null;
var placeState = 'idle';   // idle | loading | ok | fail

function getDistance(e1, n1, e2, n2) {
  const R = 6371
  const { sin, cos, asin, PI, hypot } = Math
  let getPoint = (e, n) => {
    e *= PI / 180
    n *= PI / 180
    return { x: cos(n) * cos(e), y: cos(n) * sin(e), z: sin(n) }
  }

  let a = getPoint(e1, n1)
  let b = getPoint(e2, n2)
  let c = hypot(a.x - b.x, a.y - b.y, a.z - b.z)
  let r = asin(c / 2) * 2 * R
  return Math.round(r);
}

/* 第三方返回的地区串直接拼进 innerHTML 前先转义，免得返回体里被塞标签 */
function escHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* ---------------- 源 ㈠ 腾讯位置服务（jsonp，天然绕开 CORS） ---------------- */
function fetchTencent(cb) {
  $.ajax({
    type: 'get',
    url: 'https://apis.map.qq.com/ws/location/v1/ip',
    data: { key: TENCENT_MAP_KEY, output: 'jsonp' },
    dataType: 'jsonp',
    timeout: 5000,
    success: function (res) {
      // status 非 0 是「通了但没结果」：121 配额用尽/未实名、110 域名未授权、311 key 格式错…
      // 这种 res 不能当数据用（showWelcome 只认 result.location），原样交给调用方去写日志。
      if (!res || res.status !== 0 || !res.result || !res.result.location) { cb(null, res); return; }
      var ad = res.result.ad_info || {};
      var pos = ad.nation && ad.nation !== '中国'
        ? ad.nation
        : [ad.province, ad.city, ad.district].filter(Boolean).join(' ');
      cb({
        ip: res.result.ip || '',
        pos: pos || '',
        lat: +res.result.location.lat,
        lng: +res.result.location.lng,
        isp: '',
        src: 'qqmap'
      });
    },
    error: function (xhr, status) { cb(null, null, status); }
  });
}

/* ---------------- 带超时的 JSON fetch（CORS 源用） ----------------
 * 原生 fetch 没有 timeout，用 AbortController 也够，但这里源站可能很久才回 TCP，
 * 干脆用 setTimeout 抢答：超时就当这条源失败，继续下一个，别把整条链拖住。 */
function fetchJson(url, ms, cb) {
  var done = false;
  var timer = setTimeout(function () {
    if (done) return;
    done = true;
    cb(null, 'timeout ' + ms + 'ms');
  }, ms);
  var finish = function (d, e) {
    if (done) return;
    done = true;
    clearTimeout(timer);
    cb(d, e);
  };
  try {
    fetch(url, { mode: 'cors', cache: 'no-store', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
      .then(function (j) { finish(j); })
      .catch(function (e) { finish(null, String(e).slice(0, 80)); });
  } catch (e) {
    finish(null, 'fetch unavailable');
  }
}

/* ---------------- 源 ㈡ ip.zxinc.org：中文省市，没有经纬度 ----------------
 * 返回 {"code":0,"data":{"myip":"…","country":"中国\t江苏省\t\t常州市","local":"中国电信\t公众宽带"}}
 * 字段是 \t 分隔的字符串（连续制表符表示该级缺失），所以要拆开、trim、过滤空串。 */
function parseZxinc(d) {
  if (!d || d.code !== 0 || !d.data) return null;
  var parts = String(d.data.country || '').split('\t').map(function (s) { return s.trim(); }).filter(Boolean);
  if (parts[0] === '中国') parts.shift();    // 卡片上写「江苏省 常州市」就够，不必前缀「中国」
  var isp = String(d.data.local || '').split('\t').map(function (s) { return s.trim(); }).filter(Boolean).join(' ');
  var ip = d.data.myip || (d.data.ip && d.data.ip.query) || '';
  if (!parts.length) return null;
  return { ip: ip, pos: parts.join(' '), lat: null, lng: null, isp: isp, src: 'zxinc' };
}

/* ---------------- 源 ㈢ ipwho.is：英文，但带经纬度 ---------------- */
function parseIpwho(d) {
  if (!d || d.success === false || !d.country) return null;
  var pos = (d.country === 'China')
    ? [d.region, d.city].filter(Boolean).join(' ')
    : [d.city, d.region, d.country].filter(Boolean).join(' ');
  return {
    ip: d.ip || '',
    pos: pos || d.country,
    lat: isFinite(d.latitude) ? +d.latitude : null,
    lng: isFinite(d.longitude) ? +d.longitude : null,
    isp: (d.connection && d.connection.isp) || '',
    src: 'ipwho'
  };
}

/* ---------------- 结果落地 / 缓存 ---------------- */
function applyPlace(p, fromCache) {
  if (!p || !p.pos) { failPlace(); return; }
  placeInfo = p;
  placeState = 'ok';

  // 兼容老消费者（aside-calendar.js / daynight-boot.js）：有经纬度才写 ipLoacation，
  // 没有就让它是 null，那些脚本自己会回退到时区估算，不会崩。
  ipLoacation = (p.lat != null && p.lng != null && isFinite(p.lat) && isFinite(p.lng))
    ? { result: { ip: p.ip, location: { lat: p.lat, lng: p.lng }, ad_info: { nation: '中国' } } }
    : null;

  if (!fromCache) {
    try {
      sessionStorage.setItem(PLACE_CACHE_KEY, JSON.stringify({ at: Date.now(), p: p }));
    } catch (e) { }
  }
}

function readPlaceCache() {
  try {
    var c = JSON.parse(sessionStorage.getItem(PLACE_CACHE_KEY) || 'null');
    if (c && c.p && c.p.pos && (Date.now() - c.at) < PLACE_CACHE_TTL) return c.p;
  } catch (e) { }
  return null;
}

/* 三个源都不可用：只显示问候语 + 时间。控制台留一条说明（黄字，不吓人也不刷屏）。 */
var welcomeFailed = false;
function failPlace(res, reason) {
  placeState = 'fail';
  if (!welcomeFailed) {
    welcomeFailed = true;
    try {
      if (res && res.status !== undefined && res.status !== 0) {
        console.warn('[定位] 腾讯位置服务返回 status=' + res.status + '：' + (res.message || '') +
          '（IP定位配额为 0 时就是这条：控制台看「配额管理」，或先给账号做个人实名认证）');
      } else {
        console.warn('[定位] IP 定位源都不可用' + (reason ? '：' + reason : '') + '，日夜模式改用按时区估算');
      }
    } catch (e) { }
  }
}
function welcomeFallback() { failPlace(); }   // 旧名字保留：外部脚本若喊它，行为一致

/* ---------------- 取数主流程：缓存 → 腾讯 → zxinc → ipwho.is → 降级 ---------------- */
function loadPlace() {
  var cached = readPlaceCache();
  if (cached) { applyPlace(cached, true); return; }   // 半小时内用过：直接渲染，不再打接口
  if (placeState === 'loading') return;
  // 本次会话已经确认「所有源都不可用」就不要再试：pjax 每切一页都会喊一次 loadPlace，
  // 不拦的话每页都白打两三个请求、卡片还要闪一下「加载中」。IP 归属同一会话里基本不变。
  if (placeState === 'fail') return;
  placeState = 'loading';

  var altStarted = false;
  var qqAnswered = false;
  // 腾讯 1.2 秒没回应就先并行上备用源：sd 正常情况下 200~600ms 就回了，
  // 迟迟不回多半是配额/域名问题或网络被拦，没必要让读者盯着「加载中」。
  var watchdog = setTimeout(function () { if (!qqAnswered && !placeInfo) startAlt(); }, 1200);

  function startAlt(qqRes, qqErr) {
    if (altStarted) return;
    altStarted = true;
    if (SOURCES_ENABLED.zxinc) {
      fetchJson('https://ip.zxinc.org/api.php?type=json', 4000, function (d, e1) {
        var p = parseZxinc(d);
        if (p && !placeInfo) { applyPlace(p); return; }
        nextIpwho(qqRes, qqErr, e1);
      });
    } else {
      nextIpwho(qqRes, qqErr);
    }
  }

  function nextIpwho(qqRes, qqErr, e1) {
    if (placeInfo) return;
    if (!SOURCES_ENABLED.ipwho) { failPlace(qqRes, [qqErr, e1].filter(Boolean).join(' / ')); return; }
    fetchJson('https://ipwho.is/', 4000, function (d, e2) {
      var p = parseIpwho(d);
      if (p && !placeInfo) { applyPlace(p); return; }
      if (!placeInfo) failPlace(qqRes, [qqErr, e1, e2].filter(Boolean).join(' / '));
    });
  }

  if (!SOURCES_ENABLED.qqmap) { qqAnswered = true; clearTimeout(watchdog); startAlt(); return; }

  fetchTencent(function (p, res, err) {
    qqAnswered = true;
    clearTimeout(watchdog);
    if (placeInfo) return;             // 备用源已经先出了结果，别再用腾讯的把它换掉（避免文字闪一下）
    if (p) { applyPlace(p); return; }
    console.info('[定位] 腾讯位置服务不可用' + (res && res.status !== undefined ? '(status=' + res.status + ' ' + (res.message || '') + ')' : '') + '，改用备用源');
    startAlt(res, err);
  });
}

/* ---------------- 启动 ----------------
 * 2026-10-28 起侧栏那张「欢迎信息」卡片已删除（换成 source/js/daily-say.js 的每日一言），
 * 所以这里不再渲染任何文字。但 aside-calendar.js 与 inject/daynight-boot.js 仍在读
 * global.ipLoacation 的经纬度去算访客当地的日出日落，所以定位照取，只是静默进行。
 * 取不到（或 SOURCES_ENABLED 全关）时 ipLoacation 保持 null，那两个脚本自己会按时区估算。
 * 没有侧栏的页面（404、纯文档页）直接 return，不打接口。
 */
function kickPlace() {
  if (!document.getElementById('aside-content')) return;
  loadPlace();
}
document.addEventListener('pjax:complete', kickPlace);
kickPlace();   // 本文件是 defer，执行时 DOM 已解析，立刻开始取（有 sessionStorage 缓存就秒过）

/* ------------------------------ 随便逛逛 ------------------------------ */
/* 原 fomal.js 504-525 行，原样搬运，未改逻辑 */
/* 随便逛逛 start */
// 随便逛逛
// sitemap 里的 <loc> 是绝对地址（域名由 _config.yml 的 url 决定），
// 直接跳转会导致本地预览 / 镜像域名下跳到生产站，所以统一转成同源相对路径。
function randomPost() {
  fetch('/baidusitemap.xml').then(res => res.text()).then(str => (new window.DOMParser()).parseFromString(str, "text/xml")).then(data => {
    const ls = [...data.querySelectorAll('url loc')].map(el => {
      try {
        const u = new URL(el.textContent.trim(), location.origin);
        return u.pathname + u.search + u.hash;
      } catch (e) { return null }
    }).filter(Boolean);
    if (!ls.length) return;
    // 发现有时会和当前页面重复，加一个判断
    let url = ls[Math.floor(Math.random() * ls.length)];
    for (let i = 0; i < 20 && url === decodeURI(location.pathname); i++) {
      url = ls[Math.floor(Math.random() * ls.length)];
    }
    /* 2026-11-02：这里原本是 location.href = url —— 整页跳转会把 document 连同所有脚本
       一起销毁，music-bus.js 里那个单例 <audio> 也跟着没了，表现就是「正在放的歌突然
       消失、像刚刷过页面」。改走 pjax（只换 body、不重跑脚本），audio 和队列原样活着。
       没有 pjax 时（脚本挂了、或浏览器不支持 history API）再退回整页跳转。 */
    if (window.pjax && typeof window.pjax.loadUrl === 'function') {
      window.pjax.loadUrl(url);
    } else {
      location.href = url;
    }
  })
}
/* 随便逛逛 end */

/* ------------------------------ 分享按钮 ------------------------------ */
/* 原 fomal.js 1237-1267 行，原样搬运，未改逻辑 */
/* 分享按钮 start */
// 分享本页
function share_() {
  let url = window.location.origin + window.location.pathname
  try {
    // 截取标题
    var title = document.title;
    var subTitle = title.endsWith("| chengicli") ? title.substring(0, title.length - 9) : title;
    navigator.clipboard.writeText('chengicli的站内分享\n标题：' + subTitle + '\n链接：' + url + '\n欢迎来访！🍭🍭🍭');
    fomalNotify({
          title: "成功复制分享信息🎉",
          message: "您现在可以通过粘贴直接跟小伙伴分享了！",
          position: 'top-left',
          offset: 50,
          showClose: true,
          type: "success",
          duration: 5000
        })
  } catch (err) {
    console.error('复制失败！', err);
  }
  // new ClipboardJS(".share", { text: function () { return '标题：' + document.title + '\n链接：' + url } });
  // btf.snackbarShow("本页链接已复制到剪切板，快去分享吧~")
}

// 防抖
function share() {
  debounce(share_, 300);
}

/* 分享按钮 end */
