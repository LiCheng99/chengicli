/* ==========================================================================
   关于页 · 体检面板  source/js/inject/about-live.js
   --------------------------------------------------------------------------
   作用：把访客自己这一趟的真实数字填进 /about/ 的 .ab2-vital 格子。
         全部来自浏览器自带的 PerformanceNavigationTiming + navigator，不做估算、
         不打网络请求（探针另有 about-route-probe.js）。
   字段：data-live="dns|conn|ttfb|size|proto|cache|net|tz"，另有一行 [data-live-src]。
   兼容：pjax 换页进来时 navigation entry 是首次加载那条（对不上当前路径），
         自动退到 resource entry 里找同路径那条，取到的仍是真实耗时。
         页面上没有这些字段时整段直接 return —— 别的页面零开销。
   回滚：删掉 _config.fomalhaut.yml → inject.bottom 那一行 <script> 再删本文件。
   ========================================================================== */
(function () {
  "use strict";

  function each(sel, fn) {
    var list = document.querySelectorAll(sel);
    for (var i = 0; i < list.length; i++) { fn(list[i]); }
  }

  function box(el) {
    var n = el;
    while (n && n.nodeType === 1) {
      if (n.className && String(n.className).indexOf("ab2-vital") > -1) { return n; }
      n = n.parentNode;
    }
    return null;
  }

  function set(name, html, state) {
    each('[data-live="' + name + '"]', function (el) {
      el.innerHTML = html;
      var b = box(el);
      if (b) { b.setAttribute("data-state", state || "ok"); }
    });
  }

  function pathOf(u) {
    try {
      var a = new URL(u, location.href);
      return a.origin + a.pathname.replace(/\/+$/, "");
    } catch (e) { return ""; }
  }

  function pick() {
    var here = pathOf(location.href);
    var perf = window.performance;
    if (!perf || !perf.getEntriesByType) { return null; }
    var nav = perf.getEntriesByType("navigation")[0];
    if (nav && pathOf(nav.name) === here) { return nav; }
    /* pjax 进来时：找 resource 里同路径的那条（pjax 用 XHR 取的 HTML） */
    var res = perf.getEntriesByType("resource");
    for (var i = res.length - 1; i >= 0; i--) {
      if (pathOf(res[i].name) === here && res[i].responseStart > 0) { return res[i]; }
    }
    return nav || null;
  }

  function kb(n) {
    if (!n && n !== 0) { return ""; }
    return n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
  }

  function uaInfo() {
    var ua = navigator.userAgent || "";
    var name = "浏览器";
    var m;
    if ((m = /Edg\/(\d+)/.exec(ua))) { name = "Edge " + m[1]; }
    else if ((m = /OPR\/(\d+)/.exec(ua))) { name = "Opera " + m[1]; }
    else if ((m = /Firefox\/(\d+)/.exec(ua))) { name = "Firefox " + m[1]; }
    else if ((m = /Chrome\/(\d+)/.exec(ua))) { name = "Chrome " + m[1]; }
    else if ((m = /Version\/(\d+)[\d.]* .*Safari/.exec(ua))) { name = "Safari " + m[1]; }
    var os = "未知系统";
    if (/Windows NT 10/.test(ua)) { os = "Windows 10/11"; }
    else if (/Windows/.test(ua)) { os = "Windows"; }
    else if (/iPhone|iPad/.test(ua)) { os = "iOS"; }
    else if (/Android/.test(ua)) { os = "Android"; }
    else if (/Mac OS X/.test(ua)) { os = "macOS"; }
    else if (/Linux/.test(ua)) { os = "Linux"; }
    return name + " · " + os;
  }

  function tzInfo() {
    var off = -new Date().getTimezoneOffset();
    var sign = off >= 0 ? "+" : "-";
    var abs = Math.abs(off);
    var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
    var label = "UTC" + sign + (abs % 60 === 0 ? abs / 60 : Math.floor(abs / 60) + ":" + pad(abs % 60));
    var zone = "";
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { zone = ""; }
    return { label: label, zone: zone };
  }

  var retried = false;

  function run() {
    if (!document.querySelector("[data-live]")) { return; }

    var e = pick();
    if (!e || !(e.responseStart > 0)) {
      if (!retried) { retried = true; setTimeout(run, 700); return; }
      each("[data-live]", function (el) { set(el.getAttribute("data-live"), "取不到", "warn"); });
      return;
    }

    /* DNS */
    var dnsMs = Math.round(e.domainLookupEnd - e.domainLookupStart);
    set("dns", dnsMs > 0 ? dnsMs + " <em>ms</em>" : "复用 <em>无需解析</em>", "ok");

    /* 建连（含 TLS） */
    var connMs = Math.round(e.connectEnd - e.connectStart);
    if (connMs > 0) {
      var tlsMs = (e.secureConnectionStart > 0 && e.connectEnd > e.secureConnectionStart)
        ? Math.round(e.connectEnd - e.secureConnectionStart) : 0;
      set("conn", String(connMs) + " <em>ms</em>" + (tlsMs > 0 ? " <em>· TLS " + tlsMs + "</em>" : ""), "ok");
    } else {
      set("conn", "复用 <em>已建连</em>", "ok");
    }

    /* 服务端响应（发出请求 → 第一个字节） */
    var reqStart = e.requestStart > 0 ? e.requestStart : e.startTime;
    var ttfb = e.responseStart - reqStart;
    if (ttfb > 0) {
      set("ttfb", String(Math.round(ttfb)) + " <em>ms</em>", ttfb > 1500 ? "warn" : "ok");
    } else {
      set("ttfb", "—", "warn");
    }

    /* 体积：transferSize 是网线上真正跑的字节，decodedBodySize 是解压后的原大小 */
    var raw = (e.decodedBodySize || e.encodedBodySize || 0);
    var wire = e.transferSize || 0;
    if (raw) {
      var sizeTxt = wire && wire < raw
        ? kb(wire) + " <em>压后 · 原件 " + kb(raw) + "</em>"
        : kb(raw) + " <em>" + (wire ? "未压缩" : "本机直出") + "</em>";
      set("size", sizeTxt, "ok");
    } else {
      set("size", "—", "warn");
    }

    /* 协议 */
    var proto = String(e.nextHopProtocol || "").toLowerCase();
    var protoTxt = "HTTP/1.1";
    if (/^h2$/.test(proto)) { protoTxt = "HTTP/2"; }
    else if (/^h3/.test(proto)) { protoTxt = "HTTP/3"; }
    else if (/^http\/1\.0$/.test(proto)) { protoTxt = "HTTP/1.0"; }
    else if (/^http\/1\.1$/.test(proto)) { protoTxt = "HTTP/1.1"; }
    else if (proto) { protoTxt = proto.toUpperCase(); }
    set("proto", protoTxt, "ok");

    /* 缓存 */
    if (e.transferSize === 0 && (e.decodedBodySize || e.encodedBodySize)) {
      set("cache", "命中 <em>0 字节上行</em>", "ok");
    } else {
      set("cache", "未命中 <em>走了网络</em>", "ok");
    }

    /* 你的网络 */
    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (c && (c.effectiveType || c.downlink)) {
      var bits = [];
      if (c.effectiveType) { bits.push(c.effectiveType.toUpperCase()); }
      if (c.downlink) { bits.push("≈" + c.downlink + " Mbps"); }
      set("net", bits[0] + (bits[1] ? " <em>" + bits[1] + "</em>" : ""), "ok");
    } else {
      set("net", "未提供 <em>浏览器隐藏了</em>", "warn");
    }

    /* 你的时区 */
    var tz = tzInfo();
    set("tz", tz.label + (tz.zone ? " <em>" + tz.zone + "</em>" : ""), "ok");

    /* 底部一行来源说明 */
    var now = new Date();
    var hh = ("0" + now.getHours()).slice(-2);
    var mm = ("0" + now.getMinutes()).slice(-2);
    var ss = ("0" + now.getSeconds()).slice(-2);
    var text = "你这台设备：" + uaInfo()
      + " · 视口 " + window.innerWidth + "×" + window.innerHeight
      + " · " + (window.devicePixelRatio || 1) + "x"
      + " · 语言 " + (navigator.language || "—")
      + " · 采样于 " + hh + ":" + mm + ":" + ss;
    each("[data-live-src]", function (el) { el.textContent = text; });
  }

  function schedule() {
    if (!document.querySelector("[data-live]")) { return; }
    if (window.requestIdleCallback) {
      requestIdleCallback(run, { timeout: 1800 });
    } else {
      setTimeout(run, 300);
    }
  }

  /* 注意：不能只挂 window.load —— 本站外链了一堆第三方资源（统计、字体图标、CDN），
     任何一个卡住 load 就永远不来，体检面板会一直停在「测量中…」。所以 DOM 就绪就跑，
     load 来了再补一次（数字只会更准），pjax 换页后重跑。 */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule);
  } else {
    schedule();
  }
  window.addEventListener("load", schedule);
  document.addEventListener("pjax:complete", schedule);
})();
