/**
 * 音乐馆播放器（/music/）
 * ============================================================================
 * 只放站内那张 QQ 音乐公开歌单（9676728276），不需要登录：
 *   - 歌单、播放地址、歌词、搜索全部走 /api/music 代理（qq_pl / qq_url / qq_lyric / qq_search）
 *   - 为什么要有这个代理：浏览器直连 u.y.qq.com 必被 CORS 挡，服务端转发一次就行
 *
 * 发声的 <audio> 不在这个文件里，而在 source/js/music-bus.js（window.fomalPlayer）——
 * 全站只有一个播放核心，侧栏悬停面板和左下角胶囊都是它的视图，三处状态天然同步。
 *
 * 10-30 第五版：作者要求删掉网易云 / QQ 音乐登录模块，音源固定为本站在线。
 *
 * 注意：这个文件同时被 hexo 页面和 pjax 复用，所有绑定都要能重复执行而不叠加。
 */
(function () {
  'use strict';

  /* ------------------------------- 配置 -------------------------------- */
  var DEFAULT_API = '/api/music';

  /* 站点自带的那张 QQ 公开歌单（和侧栏胶囊同一份） */
  var PLAYLIST_ID = '9676728276';

  var IMG_EMPTY =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23d9d9d9'/%3E%3C/svg%3E";

  /* 循环顺序按作者要求：顺序播放 → 随机播放 → 单曲循环 → 再回到顺序播放。
     每种模式配一个图标，按钮图标要跟着模式变（光变标题看不出来）。 */
  var ICON_REPEAT =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h9.5v2.2L21 6l-4.5-3.2V5H7a4 4 0 0 0-4 4v2h2V9a2 2 0 0 1 2-2zm10 10H7.5v-2.2L3 18l4.5 3.2V19H17a4 4 0 0 0 4-4v-2h-2v2a2 2 0 0 1-2 2z"/></svg>';
  var ICON_SHUFFLE =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>';
  var ICON_REPEAT_ONE =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>' +
    '<text x="12" y="14.6" text-anchor="middle" font-size="8.5" font-weight="700">1</text></svg>';

  var MODES = [
    { key: 'order', title: '顺序播放', icon: ICON_REPEAT },
    { key: 'shuffle', title: '随机播放', icon: ICON_SHUFFLE },
    { key: 'one', title: '单曲循环', icon: ICON_REPEAT_ONE }
  ];

  /* 音量两态：正常喇叭 / 静音喇叭 */
  var ICON_SOUND =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.2L12 18.6V5.4L7.2 9.5H4zm11.2-.9a4.6 4.6 0 0 1 0 6.8l1.4 1.4a6.6 6.6 0 0 0 0-9.6l-1.4 1.4zm2.8-2.8a8.6 8.6 0 0 1 0 12.4l1.4 1.4a10.6 10.6 0 0 0 0-15.2l-1.4 1.4z"/></svg>';
  var ICON_MUTE =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.2L12 18.6V5.4L7.2 9.5H4zm15.5 1.4L21 9.4l-1.4-1.4-2.6 2.6-2.6-2.6-1.4 1.4 2.6 2.6-2.6 2.6 1.4 1.4 2.6-2.6 2.6 2.6 1.4-1.4-2.6-2.6z"/></svg>';

  /* ------------------------------- 状态 -------------------------------- */
  var st = {
    tracks: [],
    idx: -1,
    mode: 0,
    playing: false,
    listing: false,          // 列表是否处于「搜索结果」状态
    lyric: [],
    lyricAt: -1,
    seq: 0                   // 防止并发加载互相覆盖
  };

  var el = {};              // 缓存的 DOM
  /* 播放核心（music-bus.js）：全站唯一的 <audio>。本页只是它的视图。 */
  var bus = window.fomalPlayer || null;
  var adoptedList = null;   // 已经交给核心的那份歌单（用引用比对，换歌单/换搜索必不等）

  /* ---------------------------- 本地存储 ------------------------------ */
  function ls(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key) || '';
      if (val === null) localStorage.removeItem(key);
      else localStorage.setItem(key, val);
    } catch (e) { /* 隐私模式忽略 */ }
    return '';
  }

  function apiBase() {
    return ls('mpApi') || DEFAULT_API;
  }

  /* ------------------------------ 网络 -------------------------------- */
  function api(action, params) {
    var qs = 'action=' + encodeURIComponent(action);
    Object.keys(params || {}).forEach(function (k) {
      if (params[k] === undefined || params[k] === null) return;
      qs += '&' + k + '=' + encodeURIComponent(params[k]);
    });
    return fetch(apiBase() + '?' + qs, { credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) {
        if (!d || d.ok === false) throw new Error((d && d.message) || '接口错误');
        return d;
      });
  }

  /* --------------------------- 歌单数据源 ------------------------------ */
  /* 只有一处歌源，留成对象是为了调用处读起来还是「源.动作」，以后再加源也顺手 */
  var SOURCE = {
    label: '本站在线',
    load: function () {
      return api('qq_pl', { id: PLAYLIST_ID }).then(function (d) {
        return { name: d.name, cover: d.cover, tracks: d.tracks || [] };
      });
    },
    url: function (t) {
      return api('qq_url', { mid: t.id }).then(function (d) { return d.url; });
    },
    lyric: function (t) {
      /* 带上歌名/歌手：QQ 对部分歌不返回歌词（只回版权提示），后端会用网易云公开接口兜底 */
      return api('qq_lyric', { mid: t.id, name: t.name, artist: t.artist })
        .then(function (d) { return d.lrc || ''; });
    },
    search: function (kw) {
      return api('qq_search', { kw: kw }).then(function (d) { return d.tracks || []; });
    }
  };

  /* ------------------------------ 工具 -------------------------------- */
  function fmt(s) {
    if (!isFinite(s) || s < 0) s = 0;
    s = Math.floor(s);
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ------------------------------ 渲染 -------------------------------- */
  function setTitle(name, artist) {
    if (!el.name) return;
    var n = name || '还没开始';
    var a = artist || '';
    el.name.textContent = n;
    el.artist.textContent = a;
    /* 歌名过长会在版面上截断，这里把全文放进 title，鼠标悬停还能看到完整名字 */
    el.name.title = n;
    el.artist.title = a;
  }

  function renderList() {
    if (!el.list) return;
    el.count.textContent = st.tracks.length ? st.tracks.length + ' 首' : '—';
    if (!st.tracks.length) {
      el.list.innerHTML = '<li class="mp-empty">没有曲目</li>';
      return;
    }
    var html = '';
    for (var i = 0; i < st.tracks.length; i++) {
      var t = st.tracks[i];
      html += '<li class="mp-row' + (i === st.idx ? ' is-on' : '') + '" data-i="' + i + '">' +
        '<span class="mp-row-idx">' + (i + 1) + '</span>' +
        '<span class="mp-row-name">' + esc(t.name) + '</span>' +
        (t.vip ? '<span class="mp-vip">VIP</span>' : '') +
        '<span class="mp-row-artist">' + esc(t.artist) + '</span>' +
        '<span class="mp-row-dur">' + (t.dur ? fmt(t.dur) : '') + '</span>' +
        '</li>';
    }
    el.list.innerHTML = html;
  }

  function markRow() {
    if (!el.list) return;
    var rows = el.list.querySelectorAll('.mp-row');
    for (var i = 0; i < rows.length; i++) {
      var on = Number(rows[i].getAttribute('data-i')) === st.idx;
      rows[i].classList.toggle('is-on', on);
      if (on && !st.listing) {
        var r = rows[i].getBoundingClientRect();
        var box = el.list.getBoundingClientRect();
        if (r.top < box.top || r.bottom > box.bottom) {
          el.list.scrollTop = rows[i].offsetTop - el.list.clientHeight / 2 + 20;
        }
      }
    }
  }

  /* ---------------------- 歌词框与封面的对齐 ----------------------
     作者要求（10-30 第十八版）：
       · 手机端当前句往下移，与专辑封面**垂直居中**
       · 电脑端当前句也居中
       · 电脑端后两句再往下移，与专辑封面**下边对齐**，字号再大 1 号
     「居中 / 对齐封面下边」取决于封面的实际位置，而封面高度、标题行数、
     窗口宽度都会变 —— 写死像素迟早错位。所以这里按封面的实际矩形算出
     三个歌词框的 top 值，写进 CSS 变量（--mp-top-cur / -nx1 / -nx2），
     CSS 只管用 var() 取值。改窗口、标题换行都不用再调数值。 */
  function layoutLyricRows() {
    if (!el.lyricStage || !el.page) return;
    var cover = el.page.querySelector('.mp-cover-wrap');
    if (!cover) return;
    var cRect = cover.getBoundingClientRect();
    var lRect = el.lyricStage.getBoundingClientRect();
    if (!cRect.height || !lRect.height) return;

    var cs = window.getComputedStyle(el.lyricStage);
    var fsCur = parseFloat(cs.getPropertyValue('--mp-fs-cur')) || 23;
    var fsNx = parseFloat(cs.getPropertyValue('--mp-fs-nx')) || 18;
    var gap = parseFloat(cs.getPropertyValue('--mp-nx-gap')) || 10;

    /* 行高按 CSS 的 line-height: 1.35 折算 */
    var lhCur = fsCur * 1.35;
    var lhNx = fsNx * 1.35;

    /* 封面中心 / 下边，相对于歌词舞台顶部的偏移 */
    var coverMid = cRect.top + cRect.height / 2 - lRect.top;
    var coverBottom = cRect.bottom - lRect.top;

    /* 当前句：与封面垂直居中 */
    var topCur = Math.round(coverMid - lhCur / 2);

    var topNx1, topNx2;
    if (isNarrow()) {
      /* 手机端只有两行：当前句在上、下一句在下面（跟着当前句走） */
      topNx1 = Math.round(topCur + lhCur + gap);
      topNx2 = topNx1;
    } else {
      /* 桌面端（作者 10-30 第十八版要求）：
         · 当前句与封面垂直居中；
         · 右上那句挪到**当前句的上方**（只上下动，左右不动）；
         · 右下那句的**下边**与封面下边对齐。 */
      topNx1 = Math.round(topCur - lhNx - gap);
      /* 别让右上那句顶出歌词区 */
      if (topNx1 < 0) topNx1 = 0;
      topNx2 = Math.round(coverBottom - lhNx);
      /* 三句别叠在一起 */
      if (topNx2 < topNx1 + lhNx + 4) topNx2 = Math.round(topNx1 + lhNx + 4);
    }

    el.lyricStage.style.setProperty('--mp-top-cur', topCur + 'px');
    el.lyricStage.style.setProperty('--mp-top-nx1', topNx1 + 'px');
    el.lyricStage.style.setProperty('--mp-top-nx2', topNx2 + 'px');
  }

  /* ------------------------------ 歌词 --------------------------------
     LRC 解析统一放在核心（fomalPlayer.parseLrc），侧栏面板和这一页共用一套规则。
     这里是「三框轮播」：三行 DOM 在换角色 —— 唱到下一句时，右上那句滑到左边当当前句、
     右下那句滑到右上、原来的当前句淡出，所以是滚动过渡而不是直接换字。 */
  var lyricRows = [];

  /* 手机端只显示两句（当前句 + 下一句），桌面端显示三句（当前 + 接下来两句）。
     断点跟 CSS 的 @media (max-width: 700px) 保持一致。 */
  var LYRIC_NARROW_Q = '(max-width: 700px)';

  function isNarrow() {
    return !!(window.matchMedia && window.matchMedia(LYRIC_NARROW_Q).matches);
  }

  function buildLyricRows(i) {
    var roles = ['is-cur', 'is-nx1', 'is-nx2'];
    /* 窄屏两行：is-cur 在上、is-nx1 在下（纵向排列），is-nx2 不用 */
    var n = isNarrow() ? 2 : 3;
    var rows = [];
    for (var k = 0; k < n; k++) {
      var p = document.createElement('p');
      p.className = 'mp-lyric-row is-fade ' + roles[k];
      var line = st.lyric[i + k];
      p.textContent = line ? line.text : '';
      rows.push(p);
    }
    return rows;
  }

  function renderLyricLines(list) {
    st.lyric = list || [];
    st.lyricAt = -1;
    if (!el.lyricStage) return;
    el.lyricStage.innerHTML = '';
    lyricRows = [];
    if (!st.lyric.length) {
      var idle = document.createElement('p');
      idle.className = 'mp-lyric-row is-cur mp-lyric-idle';
      idle.textContent = '纯音乐，请欣赏';
      el.lyricStage.appendChild(idle);
      lyricRows = [idle, null, null];
      return;
    }
    var rows = buildLyricRows(0);
    rows.forEach(function (r) { el.lyricStage.appendChild(r); });
    lyricRows = rows;
    /* 先透明再亮起，避免第一帧就「啪」地出现 */
    requestAnimationFrame(function () {
      rows.forEach(function (r) { r.classList.remove('is-fade'); });
      layoutLyricRows();
    });
  }

  function syncLyric(t) {
    if (!st.lyric.length || !el.lyricStage) return;
    var i = -1;
    for (var k = 0; k < st.lyric.length; k++) {
      if (st.lyric[k].t <= t + 0.25) i = k; else break;
    }
    if (i === st.lyricAt) return;
    var prev = st.lyricAt;
    st.lyricAt = i;

    /* 首帧定位，或者拖进度跳播：直接重排，不做滚动动画 */
    if (prev < 0 || i !== prev + 1) {
      var rows = buildLyricRows(i);
      el.lyricStage.innerHTML = '';
      rows.forEach(function (r) { el.lyricStage.appendChild(r); });
      lyricRows = rows;
      requestAnimationFrame(function () {
        rows.forEach(function (r) { r.classList.remove('is-fade'); });
        layoutLyricRows();
      });
      return;
    }

    /* 正常前进一句：整列向上滚一行。
       桌面端三框：当前句淡出上移、右上→左下（并放大）、右下→右上、新句进右下。
       窄屏两框：当前句上滑出顶、下一句从下面滑上来占第一行、新句从更下面滑进第二行。 */
    var out = lyricRows[0], r1 = lyricRows[1], r2 = lyricRows[2];
    var narrow = isNarrow();
    if (out) {
      out.classList.remove('is-cur');
      out.classList.add('is-out');
      setTimeout(function () { if (out.parentNode) out.parentNode.removeChild(out); }, 720);
    }
    if (r1) { r1.classList.remove('is-nx1'); r1.classList.add('is-cur'); }
    if (r2) { r2.classList.remove('is-nx2'); r2.classList.add('is-nx1'); }
    var nxt = document.createElement('p');
    /* 窄屏的新句先进第二行（is-enter 把它放在更下面，再过渡上来） */
    nxt.className = 'mp-lyric-row ' + (narrow ? 'is-nx1 is-enter is-fade' : 'is-nx2 is-fade');
    var line2 = st.lyric[i + 2];
    nxt.textContent = line2 ? line2.text : '';
    el.lyricStage.appendChild(nxt);
    requestAnimationFrame(function () { nxt.classList.remove('is-fade', 'is-enter'); });
    lyricRows = narrow ? [r1, nxt, null] : [r1, r2, nxt];
  }

  /* 宽窄屏切换时重排歌词：桌面三框 ↔ 手机两框 */
  function rebindLyricLayout() {
    if (!el.lyricStage) return;
    if (!st.lyric.length) { renderLyricLines(st.lyric); return; }
    var i = st.lyricAt >= 0 ? st.lyricAt : 0;
    var rows = buildLyricRows(i);
    el.lyricStage.innerHTML = '';
    rows.forEach(function (r) { el.lyricStage.appendChild(r); });
    lyricRows = rows;
    requestAnimationFrame(function () {
      rows.forEach(function (r) { r.classList.remove('is-fade'); });
      layoutLyricRows();
    });
  }

  /* ----------------------------- 播放控制 ------------------------------
     发声的 <audio> 在 window.fomalPlayer（music-bus.js）里，全站只有那一个。
     本页只是它的视图：点播放 / 切歌 / 拖进度都是给它发指令，再把它的状态画出来。
     这样音乐页一出声，侧栏面板和左下角胶囊会立刻跟着亮（它们的 audio 就是同一个）。 */
  function bindBus() {
    if (!bus || bindBus.done) return;
    bindBus.done = true;

    bus.on(function (type, d) {
      if (type === 'track') {
        applyTrack(d.track);
        if (d.owner === 'page') { st.idx = d.index; markRow(); }
        else { st.idx = -1; markRow(); }      // 侧栏在放：本页列表不高亮，避免指错
      } else if (type === 'lyric') {
        renderLyricLines(d.lines || []);
      } else if (type === 'time') {
        onTime(d);
      } else if (type === 'buffer') {
        if (el.buf) el.buf.style.width = Math.round((d.ratio || 0) * 100) + '%';
      } else if (type === 'state') {
        setPlaying(!!d.playing);
        if (d.playing) setTip('');     // 真响起来了就把「正在取播放地址…」收掉
      } else if (type === 'mute') {
        paintMute(!!d.muted);
      } else if (type === 'error') {
        if (d.message) setTip(d.message);
      } else if (type === 'blocked') {
        setPlaying(false);
        setTip(d.message || '');
      }
    });
  }

  /* 把 st.tracks 交给核心。用列表引用判断「换没换过歌单」：重新加载、搜索都会换一份新数组。 */
  function adopt() {
    if (!bus) return;
    if (adoptedList === st.tracks) return;
    adoptedList = st.tracks;
    bus.setQueue({
      owner: 'page',
      name: (el.plname && el.plname.textContent) || '歌单',
      list: st.tracks,
      mode: MODES[st.mode].key,
      /* 播放地址要过 /api/music 才拿得到（要带 vkey 签名），所以拖到要播时再取；
         取到的 url/lrc 会回填进队列项，同一首再播不再打接口。 */
      resolve: function (item) {
        return SOURCE.url(item).then(function (url) {
          if (!url) throw new Error(item.vip ? '这首要会员，这里放不了' : '这首没有可用的播放地址');
          return SOURCE.lyric(item).then(function (lrc) {
            return { url: url, lrc: lrc || '', pic: item.cover || '' };
          }).catch(function () {
            return { url: url, pic: item.cover || '' };
          });
        });
      }
    });
  }

  /* ---------------------------- 空格键：播放 / 暂停 ---------------------------
     作者要求（10-31）：在音乐馆页面按空格就播放 / 暂停。
     统一交给核心的空格调度器（music-bus.js）派发，别自己再绑一个 keydown ——
     两处都监听的话同一次按键会被响应两遍（播放+暂停 = 看着像没反应）。

     条件：当前 DOM 里有 #mp-page（即人在音乐馆页面）。用 scope 动态判断，
     pjax 换页后不用重新注册也依然准。 */
  function bindSpaceKey() {
    if (!bus || !bus.registerSpace) return;
    /* pjax 换页会重跑 boot()，这里只注册一次 —— 注册多次的话同一次空格会被响应多遍。
       条件本身是动态的（看 DOM 里有没有 #mp-page），所以不重新注册也不会失效。 */
    if (bindSpaceKey.done) return;
    bindSpaceKey.done = true;
    bus.registerSpace({
      /* el 留空：音乐页不看鼠标位置，在页面任何地方按空格都算 */
      scope: function () { return !!document.getElementById('mp-page'); },
      /* 优先级比侧栏面板/胶囊（20）高：音乐页上即使鼠标正好停在侧栏面板里，
         这时按空格也该按**本页**的语义来（播放/暂停本页这一份），
         不能让侧栏抢过去 —— 侧栏抢过去会用它自己那张歌单，行为就串了。 */
      priority: 30,
      fn: function () {
        if (!st.tracks.length) { setTip('歌单还没加载好，稍等一下'); return; }
        togglePlay();
      }
    });
  }

  function applyTrack(t) {
    if (!t) return;
    setTitle(t.name, t.artist);
    if (el.cover) el.cover.src = t.cover || t.pic || IMG_EMPTY;
    if (el.dur) el.dur.textContent = t.dur ? fmt(t.dur) : '0:00';
    if (el.fill) el.fill.style.width = '0%';
    if (el.buf) el.buf.style.width = '0%';
    if (el.knob) el.knob.style.left = '0%';
    if (el.cur) el.cur.textContent = '0:00';
  }

  function setPlaying(on) {
    st.playing = on;
    if (el.playBtn) {
      el.playBtn.classList.toggle('is-on', on);
      el.playBtn.innerHTML = on
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
      el.playBtn.title = on ? '暂停' : '播放';
    }
    if (el.coverWrap) el.coverWrap.classList.toggle('is-playing', on);
    if (el.page) el.page.classList.toggle('is-playing', on);
  }

  function onTime(d) {
    var dur = d.dur || 0, cur = d.cur || 0;
    var p = dur ? (cur / dur) * 100 : 0;
    if (el.fill) el.fill.style.width = p + '%';
    if (el.knob) el.knob.style.left = p + '%';
    if (el.cur) el.cur.textContent = fmt(cur);
    if (el.dur && dur) el.dur.textContent = fmt(dur);
    if (el.bar) el.bar.setAttribute('aria-valuenow', Math.round(p));
    syncLyric(cur);
  }

  function setTip(msg) {
    if (el.tip) el.tip.textContent = msg || '';
  }

  /* 模式键 / 音量键的图标要跟着状态变，只改 title 的话看不出来 */
  function paintMode() {
    if (!el.modeBtn) return;
    var m = MODES[st.mode] || MODES[0];
    el.modeBtn.innerHTML = m.icon;
    el.modeBtn.title = m.title;
    el.modeBtn.setAttribute('aria-label', m.title);
    el.modeBtn.classList.toggle('is-on', st.mode !== 0);
  }

  function paintMute(muted) {
    if (!el.muteBtn) return;
    el.muteBtn.innerHTML = muted ? ICON_MUTE : ICON_SOUND;
    el.muteBtn.title = muted ? '已静音' : '音量';
    el.muteBtn.setAttribute('aria-label', muted ? '取消静音' : '静音');
    el.muteBtn.classList.toggle('is-on', !!muted);
  }

  /* ------------------------------ 歌单加载 ----------------------------- */
  function loadPlaylist(opt) {
    opt = opt || {};
    st.listing = false;
    setTip('正在加载歌单…');
    el.plname.textContent = '加载中…';

    var seq = ++st.seq;
    SOURCE.load().then(function (res) {
      if (seq !== st.seq) return;
      st.tracks = res.tracks || [];
      st.idx = -1;
      el.plname.textContent = res.name || '歌单';
      renderList();
      setTip('');
      if (!st.tracks.length) {
        el.list.innerHTML = '<li class="mp-empty">这个歌单是空的，或者接口没取到</li>';
        return;
      }
      if (opt.play) playIndex(opt.index || 0);
      else if (!bus || !bus.track()) {
        /* 不主动出声：先把封面和歌名摆上，等用户点播放。
           核心已经在放别处的歌时（pjax 进来最常见）就别抢，继续显示正在放的那首。 */
        st.idx = 0;
        applyTrack(st.tracks[0]);
        renderLyricLines([]);
        markRow();
      }
    }).catch(function (e) {
      if (seq !== st.seq) return;
      st.tracks = [];
      st.idx = -1;
      renderList();
      el.plname.textContent = '歌单取不到';
      setTip(e && e.message ? e.message : '接口不可用');
    });
  }

  function playIndex(i) {
    if (!bus || !st.tracks.length) return;
    adopt();                                  // 歌单先交给核心（换过才重新交）
    var n = st.tracks.length;
    st.idx = ((i % n) + n) % n;
    setTip('正在取播放地址…');
    bus.playIndex(st.idx);
  }

  function togglePlay() {
    if (!bus || !st.tracks.length) return;
    /* 语义统一成「对当前正在放的东西按播放/暂停」：
       正在放（不管队列是谁的）→ 暂停；暂停中 → 继续；什么都没放 → 从本页这张歌单开始。
       以前是「队列不属于本页就接管并从头播」，于是用户点暂停反而响起一首歌。 */
    var s = bus.state();
    if (s.track) { bus.toggle(); return; }
    playIndex(st.idx >= 0 ? st.idx : 0);
  }

  function step(dir) {
    if (!bus) return;
    if (!bus.queue().length) { playIndex(st.idx < 0 ? 0 : st.idx + dir); return; }
    if (dir > 0) bus.next(); else bus.prev();
  }

  function next() { step(1); }
  function prev() { step(-1); }

  function seek(clientX) {
    if (!el.bar || !bus) return;
    var r = el.bar.getBoundingClientRect();
    var ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    /* 拖不动就明说，别让浏览器自己去重拉流（那会变成「自动播放」） */
    if (bus.seekRatio(ratio) === false) setTip('这首歌的音源不支持拖动进度');
  }

  /* ------------------------------- 搜索 ------------------------------- */
  function doSearch(kw) {
    kw = String(kw || '').trim();
    if (!kw) return;
    st.seq++;                 // 作废还在路上的歌单请求，免得回来把搜索结果盖掉
    setTip('正在搜索…');
    SOURCE.search(kw).then(function (list) {
      st.tracks = list || [];
      st.idx = -1;
      st.listing = true;
      el.plname.textContent = '搜索：' + kw;
      renderList();
      setTip(st.tracks.length ? '点一下搜索结果就播' : '没搜到');
      if (!st.tracks.length) el.list.innerHTML = '<li class="mp-empty">没搜到「' + esc(kw) + '」</li>';
    }).catch(function (e) {
      setTip('搜索失败：' + (e && e.message ? e.message : '接口不可用'));
    });
  }

  /* ------------------------------ 初始化 ------------------------------ */
  function bind() {
    var page = document.getElementById('mp-page');
    if (!page) return false;
    if (page.getAttribute('data-mp-bound') === '1') { el.page = page; return true; }
    page.setAttribute('data-mp-bound', '1');

    el.page = page;
    el.coverWrap = document.querySelector('.mp-cover-wrap');
    el.cover = document.getElementById('mp-cover');
    el.name = document.getElementById('mp-name');
    el.artist = document.getElementById('mp-artist');
    el.bar = document.getElementById('mp-bar');
    el.fill = document.getElementById('mp-fill');
    el.buf = document.getElementById('mp-buf');
    el.knob = document.getElementById('mp-knob');
    el.cur = document.getElementById('mp-cur');
    el.dur = document.getElementById('mp-dur');
    el.playBtn = page.querySelector('.mp-play');
    el.modeBtn = page.querySelector('[data-act="mode"]');
    el.muteBtn = page.querySelector('[data-act="mute"]');
    el.lyric = document.getElementById('mp-lyric');
    el.lyricStage = document.getElementById('mp-lyric-stage');
    el.list = document.getElementById('mp-list');
    el.count = document.getElementById('mp-plcount');
    el.plname = document.getElementById('mp-plname');
    el.tip = document.getElementById('mp-pltip');
    el.search = document.getElementById('mp-search');

    /* --- 播放器按键 --- */
    page.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!btn) return;
      e.preventDefault();
      switch (btn.getAttribute('data-act')) {
        case 'play': togglePlay(); break;
        case 'prev': prev(); break;
        case 'next': next(); break;
        case 'mode':
          st.mode = (st.mode + 1) % MODES.length;
          paintMode();
          /* 单曲循环 / 随机播放由核心统一处理（侧栏、胶囊切歌也走同一套规则） */
          if (bus) bus.setMode(MODES[st.mode].key);
          break;
        case 'mute':
          if (!bus) break;
          paintMute(bus.toggleMute());
          break;
        case 'inlist':
          document.getElementById('mp-list-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
      }
    });

    /* --- 进度条：点/拖 --- */
    if (el.bar) {
      el.bar.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        seek(e.clientX);
        var move = function (ev) { seek(ev.clientX); };
        var up = function () {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      });
      el.bar.addEventListener('keydown', function (e) {
        if (!bus) return;
        var s = bus.state();
        if (!s.dur) return;
        if (e.key === 'ArrowRight') { bus.seekTo(s.cur + 5); e.preventDefault(); }
        if (e.key === 'ArrowLeft') { bus.seekTo(s.cur - 5); e.preventDefault(); }
      });
    }

    /* --- 列表点歌 --- */
    if (el.list) {
      el.list.addEventListener('click', function (e) {
        var row = e.target.closest ? e.target.closest('.mp-row') : null;
        if (!row) return;
        playIndex(Number(row.getAttribute('data-i')));
      });
    }
    /* 点歌单名从「搜索结果」回到原歌单 */
    if (el.plname) {
      el.plname.style.cursor = 'pointer';
      el.plname.addEventListener('click', function () { if (st.listing) loadPlaylist({ play: false }); });
    }

    /* --- 搜索 --- */
    if (el.search) {
      el.search.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); doSearch(el.search.value); }
        if (e.key === 'Escape') { el.search.value = ''; el.search.blur(); }
      });
    }

    paintMode();
    paintMute(bus && bus.state() ? bus.state().muted : false);

    loadPlaylist({ play: false });
    return true;
  }

  /* 换页 / 重新绑定时，把核心当前状态拉回来画一遍：
     否则从别的页面放着歌点进音乐页，页面会显示「还没开始」，和胶囊对不上。 */
  function syncFromBus() {
    if (!bus) return;
    var s = bus.state();
    for (var i = 0; i < MODES.length; i++) if (MODES[i].key === s.mode) st.mode = i;
    paintMode();
    if (s.track) {
      applyTrack(s.track);
      renderLyricLines(s.lines || []);
      if (s.dur) onTime(s);
    }
    setPlaying(!!s.playing);
  }

  function boot() {
    if (!bind()) return;
    /* 窗口宽窄变化时重排歌词（桌面三框 ↔ 手机两框）并重算与封面的对齐 */
    if (window.matchMedia) {
      var mq = window.matchMedia('(max-width: 700px)');
      var onChange = function () { rebindLyricLayout(); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
    /* 窗口尺寸变化（拖动/缩放）后，封面位置变了 → 重算对齐 */
    var rt = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { layoutLyricRows(); }, 120);
    });
    /* 封面是异步加载的，加载完高度/位置会变 → 重算 */
    if (el.cover) el.cover.addEventListener('load', function () { layoutLyricRows(); });
    /* 字体加载完字宽会变 → 重算 */
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
      document.fonts.ready.then(function () { layoutLyricRows(); });
    }
    layoutLyricRows();
    bindBus();
    bindSpaceKey();
    syncFromBus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  /* pjax 换页不重载脚本，DOM 变了要重新绑一次 */
  ['pjax:complete', 'pjax:success'].forEach(function (ev) {
    document.addEventListener(ev, function () { setTimeout(boot, 60); });
  });
})();
