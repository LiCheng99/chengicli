/*!
 * 每日一言 + QQ 音乐播放器（侧栏「公告栏」卡片底部）
 * ---------------------------------------------------------------------------
 * 替换掉原来的「欢迎信息」：不再按 IP 定位、不再显示地区/距离/IP，
 * 改成一句一言（24 秒换一条，淡入淡出），鼠标移到卡片（含卡片上方 16px 热区）
 * 就从卡片正上方浮出播放器和歌词。
 *
 * 一言：hitokoto（https://hitokoto.cn）—— CORS 友好、免 key、CC0。
 *       一天抓一次、抓 8 条存 localStorage，当天每次进站看到的是同一批句子（才叫「每日」一言）。
 * 音乐：和音乐馆共用同一张 QQ 音乐公开歌单（id 见 MUSIC.playlist）。
 *       歌源统一走本站 /api/music 代理，和音乐馆 page 完全一致（不再用第三方 Meting——
 *       它的公共实例经常挂 / 超时，首页第一次进就卡在「正在加载歌单…」）。
 *       取流 / 歌词在要播时才现取（qq_url / qq_lyric），字段和音乐馆对齐。
 *
 * 【歌单必须是公开歌单】私密歌单（接口返回 songlist 为空）谁都取不到。
 *       QQ 音乐里「歌单 → 编辑 → 隐私设置 → 公开」。
 * ---------------------------------------------------------------------------
 * 结构：模板里的骨架在 themes/fomalhaut/layout/includes/widget/card_announcement.pug，
 *       播放器面板由本文件建在 <body> 末尾（fixed 定位，不受卡片 overflow 影响）。
 *       样式在 source/css/daily-say.css。改完记得把 _config.fomalhaut.yml 里这行的 ?v= 提一版。
 */
;(function () {
  'use strict';

  /* ======================= 可调参数 ======================= */

  /* 一言接口：c=d 文学 / c=i 诗词 / c=k 哲学，想要别的品类改这里（见 https://developer.hitokoto.cn/sentence/） */
  var SAY = {
    api: 'https://v1.hitokoto.cn/?encode=json&c=d&c=i&c=k',
    count: 8,                 // 一天抓多少条来轮播（够 3 条就用，不够用内置兜底）
    interval: 14000,          // 轮播间隔：14 秒
    cache: 'fomalDailySays.v2'
  };

  /* QQ 音乐歌单：和音乐馆共用同一张公开歌单（id 见下）。
   * 歌源统一走本站 /api/music 代理（和音乐馆 page 完全一致），不再依赖第三方 Meting ——
   * Meting 公共实例经常挂、且有时 CORS/超时把歌单卡在「正在加载」，首页第一次进来就放不出来。
   * /api/music 是自己的 Node 服务，音乐馆一直用它、稳定。
   * 歌单只回曲目 id，播放地址 / 歌词在要播时才现取（qq_url / qq_lyric），字段和音乐馆对齐，
   * 核心 playIndex 会调这里的 resolve 回填 url/lrc，同一首再播不打第二遍接口。 */
  var MUSIC = {
    playlist: '9676728276',    // ← 换歌单改这里（必须是公开歌单；音乐馆也是这张）
    cache: 'fomalQQList.v1',   // 实际键是 cache + ':' + playlist，换 ID 就不会命中旧缓存
    ttl: 30 * 60 * 1000       // 歌单缓存 30 分钟：pjax 反复切页不重复打接口
  };

  /* 接口全挂时的兜底句子：保证卡片永远有字，不要出现空白框 */
  var FALLBACK = [
    { t: '躲了一辈子雨，雨会不会难过。', f: '网络' },
    { t: '我们一路奋战，不是为了改变世界，而是为了不让世界改变我们。', f: '熔炉' },
    { t: '生活明朗，万物可爱，人间值得，未来可期。', f: '网络' },
    { t: 'Autumn asks for nothing but shows us everything.', f: '网络' },
    { t: '所有命运馈赠的礼物，早已在暗中标好了价格。', f: '断头皇后' }
  ];

  /* ======================= 图标 ======================= */
  var ICON = {
    prev: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 5h2v14H6zm14 0v14L9.5 12z"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5v14l10.5-7z"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
    /* 播放列表：三条圆角横线（末条短一截，和「汉堡菜单」区分开）。
       10-29 第一版是「三个圆点 + 三条线」，面板 18px 下还行，胶囊 17px 下圆点糊成点阵，
       所以改成纯横线：小尺寸只关心「看得出是列表」，细节越少越清楚。 */
    list: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
      '<rect x="3.6" y="5.4" width="16.8" height="2.4" rx="1.2"/>' +
      '<rect x="3.6" y="10.8" width="16.8" height="2.4" rx="1.2"/>' +
      '<rect x="3.6" y="16.2" width="11.4" height="2.4" rx="1.2"/></svg>',
    hall: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 3v9.28a4.39 4.39 0 0 0-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z"/></svg>'
  };

  /* ======================= 状态 ======================= */
  var card = null, quoteEl = null, fromEl = null;
  var says = [], sayIdx = 0, sayTimer = null;

  /* 播放核心（music-bus.js）：全站唯一的 <audio> 和队列都在它那儿。
     本文件只负责「面板 + 胶囊 + 歌曲列表」这三块视图，不再自己 new Audio()。
     10-30 改：原来这里各自一个 audio，导致音乐页点播放时胶囊收不到任何事件、永远不出现。 */
  var bus = window.fomalPlayer || null;

  var panel = null, ui = {};
  var pl = [], plIdx = -1, plState = 'idle';
  var lrc = [], lrcEls = [], lrcIdx = -1, lyricBox = null, lyricIn = null;
  var isOpen = false, closeTimer = null, errCount = 0, rafScroll = 0, winBound = false;
  /* 用户主动按过暂停 → 之后明确动作（点喇叭）也不自动续播，只开面板。
     没有这个标记时，「暂停 → 鼠标移开 → 再点喇叭」会自己响起来。
     （10-30 起悬停本身已不再触发播放，这个标记只剩「点喇叭」这一条路径在用。） */
  var userPaused = false;
  /* 歌单还在路上的时候用户已经按了播放（悬停刚开面板那 1~2 秒内很常见）：
     先记下来，等歌单就绪再补放，不然点了像没反应（10-30 加，配合「悬停不再自动播放」）。
     只在「还没有 audio.src」时置位，所以不会和暂停状态打架。 */
  var pendingPlay = false;

  /* 左下角迷你胶囊：第一次真的播出声才出现（.is-on 加上就不再摘），暂停也留着，
     正文跟当前歌词，鼠标移入才展开上一首/播放暂停/下一首。 */
  var mini = null, miniText = null, miniCur = null, miniPlay = null, miniOn = false, miniLast = '';
  var miniRollTimer = 0;        /* 换句滚动的收尾定时器 */
  var miniRollAnims = [];       /* 本次滚动用的 WAAPI 动画（结束时统一 cancel） */

  /* 歌曲列表浮层（10-29 加）：面板底栏那颗「歌曲列表」和胶囊右列最下面那颗共用同一个，
     listFor 记住这次是从哪儿打开的（'panel' / 'mini'），只影响定位。 */
  var listBox = null, listFor = '', listOpen = false;
  /* 列表内部的点击时间戳：点歌会 renderList() 重建整块 DOM，
     等事件冒到 document 时 e.target 已经脱离文档，listBox.contains() 判不出来，
     于是会被「点页面别处就关列」那条误杀 —— 用时间戳认这一次点击（见 bindListGlobal）。 */
  var listClickTs = 0;

  /* ======================= 小工具 ======================= */
  function readJson(k) {
    try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; }
  }
  function writeJson(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { }
  }
  function dayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function fmtTime(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  }
  function connected() { return !!(card && card.isConnected); }

  /* ======================= 一言 ======================= */
  function fetchOne() {
    return fetch(SAY.api, { cache: 'no-store', credentials: 'omit' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.hitokoto) return null;
        return { t: String(d.hitokoto).trim(), f: String(d.from || d.from_who || '').trim() };
      })
      .catch(function () { return null; });
  }

  function loadSays() {
    var c = readJson(SAY.cache);
    if (c && c.day === dayKey() && c.list && c.list.length >= 3) { says = c.list; sayIdx = 0; renderSay(false); return; }

    /* 串行取、每次间隔 320ms。
     * 一开始写的是 Promise.all 并发 8 个，实测会被一言接口限流：8 个里大半返回 429，
     * 拿到的少于 3 条就整体降级成兜底句 —— 表现就是「卡片永远是同一个内置句子」。
     * 串行不但不触发限流，还能做到「第一条到手就先上屏」，用户不用等全部回来。 */
    var got = [], tries = 0, maxTries = SAY.count * 3;

    function isDup(t) {
      for (var i = 0; i < got.length; i++) if (got[i].t === t) return true;
      return false;
    }

    function step() {
      if (got.length >= SAY.count || tries >= maxTries) { finish(); return; }
      tries++;
      fetchOne().then(function (x) {
        if (x && x.t && !isDup(x.t)) {
          got.push(x);
          if (!says.length) { says = [x]; sayIdx = 0; renderSay(false); }   // 第一条先上屏，别等
        }
        setTimeout(step, 320);
      });
    }

    function finish() {
      if (!got.length) {            // 一条都没拿到：用内置句子，卡片不能空着
        says = FALLBACK.slice(); sayIdx = 0; renderSay(true); return;
      }
      says = got; sayIdx = 0;
      if (got.length >= 3) writeJson(SAY.cache, { day: dayKey(), list: got });
      renderSay(true);
    }

    step();
  }

  function renderSay(fade) {
    if (!connected() || !quoteEl || !says.length) return;
    var s = says[sayIdx % says.length];
    var apply = function () {
      quoteEl.textContent = s.t;
      fromEl.textContent = s.f ? '—「' + s.f + '」' : '';
    };
    if (!fade) { apply(); return; }
    card.classList.add('is-fading');
    setTimeout(function () {
      apply();
      if (connected()) card.classList.remove('is-fading');
    }, 260);
  }

  function startRotate() {
    if (sayTimer) clearInterval(sayTimer);
    sayTimer = setInterval(function () {
      if (document.hidden) return;          // 切到别的标签页就别空转了
      if (says.length < 2) return;
      sayIdx = (sayIdx + 1) % says.length;
      renderSay(true);
    }, SAY.interval);
  }

  /* ======================= 播放器面板 ======================= */
  function ensurePanel() {
    if (panel && panel.isConnected) return;
    panel = document.createElement('div');
    panel.id = 'ds-player';
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', '音乐播放器');
    panel.innerHTML =
      '<div class="ds-p-head">' +
        '<img class="ds-cover" alt="" referrerpolicy="no-referrer">' +
        '<div class="ds-meta"><div class="ds-name">正在加载歌单…</div><div class="ds-artist">QQ 音乐</div></div>' +
        '<div class="ds-eq"><i></i><i></i><i></i></div>' +
      '</div>' +
      '<div class="ds-lyric"><div class="ds-lyric-in"></div></div>' +
      '<div class="ds-prog">' +
        '<span class="ds-cur">0:00</span>' +
        '<div class="ds-bar"><div class="ds-bar-f"></div></div>' +
        '<span class="ds-dur">0:00</span>' +
      '</div>' +
      '<div class="ds-ctl">' +
        '<button type="button" data-act="prev" title="上一首" aria-label="上一首">' + ICON.prev + '</button>' +
        '<button type="button" data-act="play" class="ds-play" title="播放 / 暂停" aria-label="播放或暂停">' + ICON.play + '</button>' +
        '<button type="button" data-act="next" title="下一首" aria-label="下一首">' + ICON.next + '</button>' +
        /* 10-29：歌曲列表按钮，放在「2 / 44」计数的左边（作者指定位置） */
        '<button type="button" data-act="list" class="ds-list-btn" title="歌曲列表" aria-label="打开歌曲列表">' + ICON.list + '</button>' +
        '<button type="button" data-act="gohall" class="ds-hall-btn" title="前往音乐馆" aria-label="前往音乐馆">' + ICON.hall + '</button>' +
        '<span class="ds-count">0 / 0</span>' +
      '</div>';
    document.body.appendChild(panel);

    ui = {
      cover: panel.querySelector('.ds-cover'),
      name: panel.querySelector('.ds-name'),
      artist: panel.querySelector('.ds-artist'),
      cur: panel.querySelector('.ds-cur'),
      dur: panel.querySelector('.ds-dur'),
      bar: panel.querySelector('.ds-bar'),
      fill: panel.querySelector('.ds-bar-f'),
      play: panel.querySelector('.ds-play'),
      count: panel.querySelector('.ds-count'),
      listBtn: panel.querySelector('.ds-list-btn')
    };
    lyricBox = panel.querySelector('.ds-lyric');
    lyricIn = panel.querySelector('.ds-lyric-in');

    // 鼠标进面板就别关；出去再延迟关（给一点余量，从卡片挪到面板不容易断）
    panel.addEventListener('mouseenter', function () { clearTimeout(closeTimer); });
    panel.addEventListener('mouseleave', scheduleClose);

    panel.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-act]') : null;
      if (btn) handleAct(btn.getAttribute('data-act'), 'panel');
    });

    ui.bar.addEventListener('click', function (e) {
      if (!bus) return;
      if (!bus.state().dur) return;
      var r = ui.bar.getBoundingClientRect();
      bus.seekRatio(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
    });

    /* 面板是悬停时才建的：建之前发生的 track/lyric/time 事件它一条都没收到，
       不补一次就会显示模板默认的「正在加载歌单…」「0 / 0」。 */
    syncPanel();
  }

  function syncPanel() {
    if (!bus || !ui.name) return;
    var s = bus.state();
    if (!s.track) return;
    setMeta(s.track.name, s.track.artist);
    if (ui.cover) {
      var pic = s.track.pic || s.track.cover || '';
      if (pic) { ui.cover.src = pic; ui.cover.style.visibility = 'visible'; }
      else { ui.cover.removeAttribute('src'); ui.cover.style.visibility = 'hidden'; }
    }
    plIdx = s.index;
    updateCount();
    renderList();
    renderLyricLines(s.lines || []);
    renderTime(s.cur, s.dur);
    setPlayIcon(!!s.playing);
    if (panel) panel.classList.toggle('is-playing', !!s.playing);
    syncMini();
  }

  function setMeta(name, artist) {
    if (!ui.name) return;
    ui.name.textContent = name || '';
    ui.artist.textContent = artist || '';
  }
  function updateCount() {
    if (ui.count) ui.count.textContent = pl.length ? (Math.max(0, plIdx) + 1) + ' / ' + pl.length : '0 / 0';
  }
  function setPlayIcon(playing) {
    if (!ui.play) return;
    ui.play.innerHTML = playing ? ICON.pause : ICON.play;
    ui.play.classList.remove('is-hint');
  }

  /* 播放器上的三个键（面板、胶囊共用）：上一首 / 播放暂停 / 下一首；外加 10-29 的歌曲列表。
     from 只用来决定列表浮层贴着谁弹（'panel' / 'mini'）。 */
  function goMusicHall() {
    /* 面板和列表挂在 body 上，pjax 换页不会带走它们 —— 不先收起来会浮在音乐馆页面上盖住内容（11-02） */
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
    if (typeof hideList === 'function') hideList()
    if (panel) panel.classList.remove('is-open')
    isOpen = false
    var u = '/music/'
    if (window.pjax && typeof window.pjax.loadUrl === 'function') { window.pjax.loadUrl(u); return }
    window.location.href = u
  }

  function handleAct(act, from) {
    if (act === 'gohall') { goMusicHall(); return }
    if (!bus) return;
    if (act === 'play') togglePlay();
    else if (act === 'next') bus.next();
    else if (act === 'list') toggleList(from === 'mini' ? 'mini' : 'panel');
    /* 播过 3 秒以上按「上一首」先回本曲开头（和主流播放器一致），逻辑在核心的 prev() 里 */
    else if (act === 'prev') bus.prev();
  }

  /* ======================= 歌曲列表浮层（10-29 加） ======================= */
  /* 面板底栏「2 / 44」左边那颗，和胶囊右列最下面那颗，共用这一个浮层：
     歌名 + 歌手一行一条，当前曲高亮，点一条就播那条。
     关掉的时机：再点一次按钮 / 鼠标移出列表 / 面板收起 / 点页面别处 / Esc。
     为什么挂在 <body>：面板和胶囊都是 fixed，浮层跟着它们定位，挂在卡片里会被 overflow 裁掉。 */
  function ensureList() {
    if (listBox && listBox.isConnected) return;
    listBox = document.createElement('div');
    listBox.id = 'ds-list';
    listBox.setAttribute('role', 'listbox');
    listBox.setAttribute('aria-label', '歌曲列表');
    document.body.appendChild(listBox);

    /* 鼠标进浮层先别收：从面板挪到列表要跨 10px 空隙，靠这个接力 */
    listBox.addEventListener('mouseenter', function () { clearTimeout(closeTimer); });
    listBox.addEventListener('mouseleave', function () {
      hideList();
      if (listFor === 'panel') scheduleClose();
    });
    listBox.addEventListener('click', function (e) {
      listClickTs = Date.now();      // 见 bindListGlobal：这一次点击不算「点在外面」
      if (e.target.closest && e.target.closest('[data-close]')) { hideList(); return; }
      var item = e.target.closest ? e.target.closest('[data-idx]') : null;
      if (!item) return;
      var i = parseInt(item.getAttribute('data-idx'), 10);
      if (!isFinite(i) || i === plIdx) return;
      playAt(i);              // 点列表是明确的播放意图，playAt 内部会清掉「用户暂停过」
      renderList();
    });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderList() {
    if (!listBox) return;
    if (!pl.length) {
      listBox.innerHTML = '<div class="ds-list-tip">' + (plState === 'fail' ? '歌单没加载出来' : '歌单加载中…') + '</div>';
      return;
    }
    var rows = '';
    for (var i = 0; i < pl.length; i++) {
      var s = pl[i];
      rows += '<button type="button" class="ds-list-item' + (i === plIdx ? ' is-cur' : '') + '"' +
        ' data-idx="' + i + '" role="option" aria-selected="' + (i === plIdx ? 'true' : 'false') + '"' +
        ' title="' + esc(s.name) + (s.artist ? ' - ' + esc(s.artist) : '') + '">' +
          '<span class="ds-list-no">' + (i + 1) + '</span>' +
          '<span class="ds-list-t">' + esc(s.name) + '</span>' +
          '<span class="ds-list-a">' + esc(s.artist) + '</span>' +
        '</button>';
    }
    listBox.innerHTML =
      '<div class="ds-list-head">' +
        '<span>歌曲列表</span>' +
        '<span class="ds-list-n">' + pl.length + ' 首</span>' +
        /* 关闭键（10-29）：手机上列表会盖住面板，没有 hover 可以「移开就收」，得有个明面上的出口 */
        '<button type="button" class="ds-list-x" data-close="1" title="关闭" aria-label="关闭歌曲列表">' +
          '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="ds-list-body">' + rows + '</div>';

    var cur = listBox.querySelector('.ds-list-item.is-cur');
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
  }

  /* 位置：面板打开 → 贴在面板左侧（放不下就贴右侧），与面板顶边对齐；
     胶囊打开 → 贴在胶囊右侧，底部对齐。
     窄屏（≤768，跟 CSS 同一档）：屏幕就那么大，旁边放不下，改成「与面板同宽同位」——
     视觉上等于面板翻到列表页，退出靠头部那个 ×（手机没有 hover 可以移开就收）。 */
  function positionList() {
    if (!listBox) return;
    var narrow = window.innerWidth <= 768;
    var base = (panel && panel.isConnected) ? panel.getBoundingClientRect() : null;
    var w = Math.min(246, Math.round(window.innerWidth * 0.86));
    var left, top;

    if (listFor === 'mini' && mini) {
      var mr = mini.getBoundingClientRect();
      w = Math.min(w, Math.round(window.innerWidth - mr.right - 18));   // 别顶出右边
      listBox.style.width = Math.max(180, w) + 'px';
      listBox.style.maxHeight = '';
      var h = listBox.offsetHeight || 300;
      left = mr.right + 10;
      if (left + w > window.innerWidth - 8) left = Math.max(8, mr.left - w - 10);
      top = mr.bottom - h;
      if (top < 8) top = 8;
      if (top + h > window.innerHeight - 8) top = Math.max(8, window.innerHeight - h - 8);
      listBox.style.left = Math.round(left) + 'px';
      listBox.style.top = Math.round(top) + 'px';
      return;
    }

    if (!base) return;
    if (narrow) {
      /* 手机：跟面板对齐、同高，看起来就是「面板的列表页」 */
      listBox.style.width = Math.round(base.width) + 'px';
      listBox.style.maxHeight = Math.round(base.height) + 'px';
      listBox.style.left = Math.round(base.left) + 'px';
      listBox.style.top = Math.round(base.top) + 'px';
      return;
    }

    listBox.style.maxHeight = '';
    listBox.style.width = w + 'px';
    var h2 = listBox.offsetHeight || 300;
    left = base.left - w - 10;                       // 优先放左边，别压住正文
    if (left < 8) left = Math.min(base.right - w, window.innerWidth - w - 8);
    top = Math.max(8, Math.min(base.top, window.innerHeight - h2 - 8));
    listBox.style.left = Math.round(left) + 'px';
    listBox.style.top = Math.round(top) + 'px';
  }

  function toggleList(from) {
    ensureList();
    if (listOpen && listFor === from) { hideList(); return; }
    if (listOpen) hideList();
    listFor = from;
    renderList();
    listOpen = true;
    listBox.classList.add('is-open');
    markListBtns(true);
    positionList();
    if (from === 'panel') clearTimeout(closeTimer);   // 列表开着时别让面板自己收起来
  }

  function hideList() {
    listOpen = false;
    if (listBox) listBox.classList.remove('is-open');
    markListBtns(false);
  }

  /* 两个入口按钮的高亮状态（列表开着时亮成主题色，和「正在播」的喇叭按钮同一套语义） */
  function markListBtns(on) {
    if (ui.listBtn) ui.listBtn.classList.toggle('is-on', on);
    var mb = mini && mini.isConnected ? mini.querySelector('.dm-list') : null;
    if (mb) mb.classList.toggle('is-on', on);
  }

  /* ======================= 左下角迷你胶囊 ======================= */
  /* 位置写死在 CSS（#fps 上方 8px，left 12px），不跟卡片走：卡片在右侧栏，
     胶囊要一直留在左下角。DOM 同样挂 <body>，避免被容器裁切。 */
  function ensureMini() {
    if (mini && mini.isConnected) return;
    mini = document.createElement('div');
    mini.id = 'ds-mini';
    mini.setAttribute('role', 'group');
    mini.setAttribute('aria-label', '正在播放');
    /* 内部两列（10-28 四改：三个键同列、整体搬到歌词右边，不再上下夹着歌词）：
         .dm-main = 左列（52 宽，收起态就是整个胶囊）
             .dm-top   音符（常驻，悬停也不消失 —— 它是这枚胶囊的身份标记）
             .dm-text  竖排歌词，高度跟着歌词长度走
         .dm-keys = 右列（46 宽，收起时被胶囊的 overflow:hidden 裁掉）
             上一首 / 播放暂停 / 下一首 竖着排成一列，垂直居中
       胶囊宽度 52 → 98（左 52 + 右 46），只动 width，所以下方 #fps 不跳。 */
    mini.innerHTML =
      '<div class="dm-main">' +
        '<div class="dm-top">' +
          '<svg class="dm-ico" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
            '<path d="M12 3v9.28a4.39 4.39 0 0 0-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z"/>' +
          '</svg>' +
        '</div>' +
        '<span class="dm-text"><span class="dm-cur"></span></span>' +
      '</div>' +
      '<div class="dm-keys">' +
        '<button type="button" data-mact="prev" class="dm-side" title="上一首" aria-label="上一首">' + ICON.prev + '</button>' +
        '<button type="button" data-mact="play" class="dm-play" title="播放 / 暂停" aria-label="播放或暂停">' + ICON.play + '</button>' +
        '<button type="button" data-mact="next" class="dm-side" title="下一首" aria-label="下一首">' + ICON.next + '</button>' +
        /* 10-29：歌曲列表键放在三个键的最下面（作者指定），图标不跟着上一首/下一首转 90° */
        '<button type="button" data-mact="list" class="dm-side dm-list" title="歌曲列表" aria-label="打开歌曲列表">' + ICON.list + '</button>' +
        '<button type="button" data-mact="gohall" class="dm-side dm-hall" title="前往音乐馆" aria-label="前往音乐馆">' + ICON.hall + '</button>' +
      '</div>';
    document.body.appendChild(mini);
    miniText = mini.querySelector('.dm-text');
    miniCur = mini.querySelector('.dm-cur');
    miniPlay = mini.querySelector('.dm-play');
    mini.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-mact]') : null;
      if (btn) {
        handleAct(btn.getAttribute('data-mact'), 'mini');
        /* 鼠标点完把焦点还回去：不然 :focus-within 会让三个键一直摊着，鼠标都移开了还收不回去。
           e.detail === 0 是键盘触发的（回车/空格），那种情况要留住焦点。 */
        if (e.detail !== 0) btn.blur();
        return;
      }
      /* 点歌词/空白不做任何事：三个键靠 :hover / :focus-within 显形，桌面和手机一样。
         （10-28 这里曾有个 isNarrow() → toggleMiniOpen() 的手机展开分支，作者否掉已删除） */
    });
  }

  /* 第一次播出声就把胶囊露出来；一次露、永不自动收起（暂停也留着）。
     用 playing 事件而不是「点了播放键」：被浏览器拦下的那次点击根本没响，不该出现空胶囊。 */
  function revealMini() {
    ensureMini();
    miniOn = true;
    mini.classList.add('is-on');   // 幂等：每首歌唱起来都会调一次，重建的 DOM 也靠这里挂回 .is-on
    syncMini();
  }

  function syncMini() {
    if (!mini) return;
    var playing = !!(bus && bus.isPlaying());
    if (miniPlay) {
      miniPlay.innerHTML = playing ? ICON.pause : ICON.play;
      mini.classList.toggle('is-paused', !playing);
    }
    /* 重建 DOM 后正文是空的：优先补回上一句歌词（暂停时不会再触发 timeupdate，
       只靠 songLabel 会把正文变成歌名），实在没有再退回歌名 */
    if (!miniCur || !miniCur.textContent) setMiniText(miniLast || songLabel() || '每日一言 · 音乐');
  }

  function songLabel() {
    var s = plIdx >= 0 ? pl[plIdx] : null;
    return s ? String(s.name || '').trim() : '';
  }

  /* ======================= 胶囊歌词：换句滚动 =======================
     作者要求（10-30）：「当前这句歌词唱完了 然后向上滑动消失，紧接着下一句歌词
     同步从胶囊底部滑上来」。
     结构：
       .dm-cur  = 当前句，**留在文档流里** —— 它的高度就是胶囊的高度，
                  所以「胶囊高度随歌词长短变化」这个原有行为一点没动。
       .dm-line = 动画覆盖层（absolute，铺满整盒），只在换句那半秒存在。
                  它和 .dm-cur 用**完全相同**的居中规则（同一个 flex 容器写法），
                  所以新旧两句的水平基线严格对齐 —— 这是上一版「歌词跑到一边去」的病根：
                  竖排（vertical-rl）里绝对定位的 left 是**物理左边缘**，
                  和流内居中的文字根本不在一条基线上。
     行程：按「可见盒高」算 —— 旧句上滑一整个盒高（正好出顶消失），
          新句从盒底下面滑上来，落到盒内居中位置。
     高度：换句时盒高从旧值平滑长到新值（跟着歌词长短走），不写死。 */

  function setMiniText(t) {
    if (!miniText) return;
    t = String(t || '').trim();
    miniLast = t;
    if (!t) return;
    if (!miniCur) miniCur = miniText.querySelector('.dm-cur');
    if (!miniCur) return;
    if (miniCur.textContent === t) return;
    /* 上一段滚动还没结束又来新句：先把旧的立刻收尾，再滚新的（不然两层叠着滑） */
    if (miniRollTimer) endMiniRoll();
    var noAnim = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (noAnim || !miniCur.textContent) {
      /* 第一句、或者用户要求减少动画：直接换字 */
      miniCur.textContent = t;
      miniText.title = t;
      fitMiniText();
      return;
    }
    startMiniRoll(t);
  }

  /* ── 换句滚动：旧句上滑消失 + 新句同步从胶囊底部滑上来 ──────────────
     作者要求（10-30）：「当前这句歌词唱完了 然后向上滑动消失，紧接着下一句歌词
     同步从胶囊底部滑上来」。

     几何（上一版就栽在这儿，所以把账算清楚）：
       · 胶囊是**底部固定、向上长**的（CSS bottom:72px），所以 .dm-text 窗口的
         **下边缘在视口里是钉死的**。覆盖层一律用 bottom 锚定 → 盒高伸缩时文字不漂。
       · 覆盖层 .dm-line 与 .dm-cur 用**完全相同**的写法（同样的 left/right + 同样的
         font/line-height/letter-spacing/竖排），横向基线严格对齐。
         上一版「歌词跑到一边去」的病根：竖排（vertical-rl）里绝对定位的 left 是
         **物理左边缘**，跟流内居中的文字列根本不在一条基线上。
       · 位移一律用**固定像素**，不写百分比 —— 盒高在动画期间会变，
         百分比行程会跟着变 → 文字就会「跳来跳去」。
       · 旧句/新句用**同一个 d**、同一条缓动 → 看上去是一整条匀速上滚。
       · 胶囊高度用 WAAPI 从旧高补到新高（跟着歌词长短平滑伸缩），
         收尾时动画 cancel、高度交回 auto —— 静止态高度仍完全由歌词长度决定。
       · 动画用 WAAPI 显式写死 from/to，不依赖 CSS 过渡对前后样式的推断。 */
  function startMiniRoll(newText) {
    var oldText = miniCur.textContent;
    var oldFont = window.getComputedStyle(miniCur).fontSize;
    var W0 = miniText.clientHeight;                        /* 旧可见窗口高 */
    var H0 = miniCur.getBoundingClientRect().height;       /* 旧句高（整根竖列） */
    var capH0 = mini.getBoundingClientRect().height;       /* 旧胶囊高 */

    /* 1) 旧句搬进覆盖层：height = 句高、bottom = (窗口高-句高)/2，
          正好是它在流内居中时的位置 → 动画第 0 帧与原来分毫不差。 */
    var oldLine = document.createElement('span');
    oldLine.className = 'dm-line';
    oldLine.textContent = oldText;
    oldLine.style.fontSize = oldFont;                     /* 旧句保持原字号 */
    oldLine.style.height = H0 + 'px';
    oldLine.style.bottom = ((W0 - H0) / 2) + 'px';
    miniText.appendChild(oldLine);

    /* 2) 新句进 .dm-cur（留在文档流里 → 盒高照旧由歌词长短决定）。
          量新高度时先让胶囊回到 auto 的自然高度，量完立刻交给动画接管，
          全程在同一个同步块里完成 —— 浏览器还没绘制，不会有可见的中间态。 */
    miniCur.textContent = newText;
    miniCur.style.visibility = 'hidden';                  /* 动画期间交给覆盖层显示 */
    mini.style.height = '';
    fitMiniText();                                        /* 超长句先缩字号 */
    var capH1 = mini.getBoundingClientRect().height;       /* 新胶囊高（自然值） */
    var W1 = miniText.clientHeight;                        /* 新可见窗口高 */
    var H1 = miniCur.getBoundingClientRect().height;       /* 新句高 */
    miniText.title = newText;

    /* 3) 新句覆盖层：终点 = 新窗口里的居中位置（= .dm-cur 换完后的落位），
          起点 = 窗口下方（完全看不见）。 */
    var newLine = document.createElement('span');
    newLine.className = 'dm-line';
    newLine.textContent = newText;
    newLine.style.fontSize = window.getComputedStyle(miniCur).fontSize;
    newLine.style.height = H1 + 'px';
    newLine.style.bottom = ((W1 - H1) / 2) + 'px';
    miniText.appendChild(newLine);

    /* 4) 行程 d（窗口底边在视口里是钉死的，窗口向上长）：
          · 新句起点要完全在窗口底边之下 → d ≥ (新窗口高 + 新句高)/2
          · 旧句终点要完全在窗口顶边之上 → d ≥ 新窗口高 - (旧窗口高 + 旧句高)/2
          取较大者；两层同用这个 d、同一条缓动 → 匀速同步上滚。 */
    var d = Math.max((W1 + H1) / 2, W1 - (W0 + H0) / 2) + 2;
    var dur = 600;
    var ease = 'cubic-bezier(.22, .61, .36, 1)';
    miniRollAnims = [
      oldLine.animate([
        { transform: 'translateY(0px)', opacity: 1 },
        { transform: 'translateY(' + (-d) + 'px)', opacity: 0 }
      ], { duration: dur, easing: ease, fill: 'both' }),
      newLine.animate([
        { transform: 'translateY(' + d + 'px)', opacity: 0 },
        { transform: 'translateY(0px)', opacity: 1 }
      ], { duration: dur, easing: ease, fill: 'both' }),
      mini.animate([
        { height: capH0 + 'px' },
        { height: capH1 + 'px' }
      ], { duration: dur, easing: ease, fill: 'both' })
    ];

    miniRollTimer = setTimeout(function () { endMiniRoll(); }, dur + 80);
  }

  function endMiniRoll() {
    if (miniRollTimer) { clearTimeout(miniRollTimer); miniRollTimer = 0; }
    for (var a = 0; a < miniRollAnims.length; a++) {
      try { miniRollAnims[a].cancel(); } catch (e) { }
    }
    miniRollAnims = [];
    if (!miniText) return;
    var lines = miniText.querySelectorAll('.dm-line');
    for (var i = 0; i < lines.length; i++) lines[i].parentNode.removeChild(lines[i]);
    if (miniCur) miniCur.style.visibility = '';
    mini.style.height = '';        /* 交回 auto —— 高度继续由歌词长度决定 */
    fitMiniText();
  }

  /* 超长句的兜底：胶囊最高 500px（CSS max-height），再长的句子硬撑就会顶到屏幕上半、
     把正文挡掉。所以装不下时**缩字号**，0.5px 一档往下试，最小 10px。
     每次都先清掉 inline 字号 —— 让 CSS / 手机媒体查询的字号恢复原值再重新量，
     否则一路改小之后短句回来也还是小字。
     量的是 .dm-cur 自己（当前句那根竖列）的高度，
     **不能**用容器的 scrollHeight —— 绝对定位的覆盖层也算进去，
     会让字号一路乱缩（这就是上一版「跳来跳去」的另一个原因）。
     字号落在 .dm-cur 上而不是容器上 —— 这样旧句的覆盖层能保持自己的原字号。 */
  function fitMiniText() {
    if (!miniText || !miniCur) return;
    miniCur.style.fontSize = '';
    var guard = 0;
    while (miniCur.getBoundingClientRect().height > miniText.clientHeight + 1 && guard++ < 8) {
      var cur = parseFloat(window.getComputedStyle(miniCur).fontSize) || 12.5;
      if (cur <= 10) break;
      miniCur.style.fontSize = Math.max(10, cur - 0.5) + 'px';
    }
  }

  /* 面板位置：贴卡片正上方 10px；上面放不下就翻到卡片下方。宽度跟卡片一致（最小 280）。 */
  function positionPanel() {
    if (!connected() || !panel) return;
    var r = card.getBoundingClientRect();
    var w = Math.max(280, Math.round(r.width));
    if (window.innerWidth < 768) w = Math.min(w, Math.round(window.innerWidth * 0.88));
    panel.style.width = w + 'px';

    var h = panel.offsetHeight || 240;
    var left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
    panel.style.left = Math.round(left) + 'px';

    var top = r.top - h - 10;
    var above = top >= 8;
    if (!above) top = Math.min(r.bottom + 10, window.innerHeight - h - 8);
    panel.style.top = Math.round(Math.max(8, top)) + 'px';
    panel.style.transformOrigin = above ? '50% 100%' : '50% 0';
  }

  function openPanel(autoplay) {
    ensurePanel();
    isOpen = true;
    panel.classList.add('is-open');
    positionPanel();
    /* auto：只有**明确的用户动作**（点喇叭 / fomalMusic.open()）才传 true。
       悬停（mouseenter）与键盘 focus 一律传 false —— 只把面板露出来，不出声（10-30 作者要求）。 */
    var auto = autoplay !== false && !userPaused;
    if (!pl.length && plState !== 'fail') { loadPlaylist(auto); return; }
    /* auto=出声。但如果本页还没把侧栏这张歌单交给核心（队列是空的、或 owner 不是 side），
       直接 bus.playIndex(0) 在空队列上就是个 no-op —— 表现就是「点了播放没反应、一直卡着」。
       所以 auto 时先 adoptSideQueue 把队列接管过来，再播；
       唯一例外：核心正播着音乐馆的歌（isPlaying）就别打断它。 */
    if (auto && bus && !bus.isPlaying()) {
      adoptSideQueue();
      if (bus.index() < 0) bus.playIndex(0); else bus.toggle();
    }
  }

  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () {
      if (!panel) return;
      panel.classList.remove('is-open');
      isOpen = false;
      /* 面板收起，贴在它旁边的歌曲列表也一起收（10-29）—— 否则会留下一块悬空的列表 */
      if (listOpen && listFor === 'panel') hideList();
      // 上次歌单没拉下来，收起后把状态复位，下次悬停重新试（不然一次失败就再也不试了）
      if (plState === 'fail') plState = 'idle';
    }, 420);
  }

  /* ======================= 音频（全部交给 music-bus） =======================
     本文件不再持有 <audio>：发声的是 window.fomalPlayer 里那唯一一个。
     这里只订阅它的事件，把状态画到「面板 / 胶囊 / 歌曲列表」上。
     好处是音乐页点播放时同样会派发 state/track/time —— 胶囊自动亮，不用谁去唤醒谁。 */
  function bindBus() {
    if (!bus || bindBus.done) return;
    bindBus.done = true;

    bus.on(function (type, d) {
      if (type === 'state') {
        var on = !!d.playing;
        if (panel) panel.classList.toggle('is-playing', on);
        if (connected()) card.classList.toggle('is-playing', on);
        setPlayIcon(on);
        if (on) revealMini();      // 真的响起来才露出胶囊（含音乐页触发的）
        syncMini();
      } else if (type === 'queue') {
        pl = d.list || [];
        plIdx = bus.index();
        plState = pl.length ? 'ok' : 'idle';
        updateCount();
        renderList();
      } else if (type === 'track') {
        plIdx = d.index;
        var s = d.track || {};
        setMeta(s.name, s.artist);
        if (ui.cover) {
          var pic = s.pic || s.cover || '';
          if (pic) { ui.cover.src = pic; ui.cover.style.visibility = 'visible'; }
          else { ui.cover.removeAttribute('src'); ui.cover.style.visibility = 'hidden'; }
        }
        setMiniText(s.name || '');
        updateCount();
        renderList();
      } else if (type === 'lyric') {
        renderLyricLines(d.lines || []);
      } else if (type === 'line') {
        markLine(d.index);
      } else if (type === 'time') {
        renderTime(d.cur || 0, d.dur || 0);
      } else if (type === 'error') {
        if (d.message) renderLyricTip(d.message);
      } else if (type === 'blocked') {
        /* 跨页续播时 play() 可能被浏览器的自动播放策略拦下（新文档还没有手势）。
           这时候至少把胶囊露出来：歌已经装好、停在原来那一秒，点一下播放就能接着放，
           比「页面什么都没发生、音乐凭空消失」清楚得多。 */
        revealMini();
        syncMini();
      }
    });
  }

  function togglePlay() {
    if (!bus) return;
    /* 核心还是空队列（本页第一次用侧栏播放）：先把侧栏这张歌单交给它再播 */
    if (!bus.queue().length) {
      userPaused = false;
      if (!pl.length) {
        /* 还没歌单：去拉（已在拉的话 loadPlaylist 会标记 pendingPlay，就绪后补播） */
        pendingPlay = true;
        if (plState !== 'loading' && plState !== 'fail') loadPlaylist(true);
        return;
      }
      /* 歌单已就绪但还没交给核心（悬停预载时 wantPlay=false 不 setQueue）：现在补交并播 */
      adoptSideQueue();
      bus.playIndex(0);
      return;
    }
    if (bus.index() < 0) { userPaused = false; bus.playIndex(0); return; }
    userPaused = bus.isPlaying();
    bus.toggle();
  }

  /* ======================= 空格键：播放 / 暂停 =======================
     作者要求（10-31）：在别的页面时，鼠标焦点在「侧栏播放器面板」或「左下角胶囊」
     上，按空格同样能播放 / 暂停。

     统一交给核心的空格调度器（music-bus.js 的 registerSpace）派发，不自己绑 keydown ——
     三处 UI 各绑一个的话，同一次空格会被响应多遍（播放+暂停 = 看着像没反应）。

     两个要点：
       1. 面板和胶囊都是**懒创建**的（悬停才建），pjax 换页还会重建 DOM，
          所以 el 要用函数动态取，不能写死元素引用。
       2. 面板在关闭时是 pointer-events:none，:hover 不会命中；
          胶囊没出现时同理。所以「鼠标在上面」这个条件天然只在这两个可见时成立。 */
  function bindSpaceKey() {
    if (!bus || !bus.registerSpace) return;
    if (bindSpaceKey.done) return;
    bindSpaceKey.done = true;

    /* 侧栏悬停弹出的播放器面板 */
    bus.registerSpace({
      el: function () { return panel; },
      priority: 20,
      fn: function () { togglePlay(); }
    });

    /* 左下角迷你胶囊 */
    bus.registerSpace({
      el: function () { return mini; },
      priority: 20,
      fn: function () { togglePlay(); }
    });

    /* 每日一言卡片本身（10-31 补）：
       悬停它时播放器面板是**浮现在卡片上方**的，鼠标还在卡片上、不在面板里，
       所以光注册面板的话，停在每日一言上按空格没反应 —— 看着面板明明就在眼前。
       卡片上方还有 16px 的 ::before 热区（CSS 里探出去的那块），
       悬停那块时 :hover 同样落在卡片上，一并生效。
       这里按 id 现取，不用 card 变量 —— pjax 换页后 card 可能指向已脱离文档的旧节点。 */
    bus.registerSpace({
      el: function () { return document.getElementById('daily-say'); },
      priority: 20,
      fn: function () { togglePlay(); }
    });
  }

  /* ======================= 歌单 ======================= */
  /* ======================= 歌单 =======================
     歌单 + 取流 + 歌词统一走本站 /api/music（和音乐馆 page 同款）。
     不再用第三方 Meting —— 它的公共实例经常挂 / 超时，首页第一次进就卡在「正在加载歌单…」，
     而音乐馆一直用 /api/music 好好的。两者用同一张公开歌单（MUSIC.playlist）。

     和音乐馆的差别只在「播放地址 / 歌词是现取的」：qq_pl 只回曲目 id（没有直链），
     要播时才由 resolveSide 调 qq_url / qq_lyric 现取，核心 playIndex 会把 url/lrc 回填进队列项，
     同一首再播不打第二遍接口。 */

  /* 歌源：优先用音乐馆存的 mpApi（用户可能在设置里改过），否则走相对路径 /api/music，
     这样无论整站挂在根目录还是子目录、本地 mpserve 还是线上 Nginx 反代都一样通。 */
  var SIDE_API = (function () {
    try { return localStorage.getItem('mpApi') || '/api/music'; } catch (e) { return '/api/music'; }
  })();

  function sideApi(action, params) {
    var qs = 'action=' + encodeURIComponent(action);
    Object.keys(params || {}).forEach(function (k) {
      if (params[k] === undefined || params[k] === null) return;
      qs += '&' + k + '=' + encodeURIComponent(params[k]);
    });
    return fetch(SIDE_API + '?' + qs, { credentials: 'omit' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        if (!d || d.ok === false) throw new Error((d && d.message) || '接口错误');
        return d;   // /api/music 把 body 字段扁平化到顶层（见 api/music.js handler），直接取即可
      });
  }

  /* 播放地址 + 歌词都在要播时才现取。返回 { url, lrc, pic, cover }，
     核心 playIndex 会回填空好，同一首再播不打第二遍。
     歌词拿不到（部分歌只有版权提示）不致命：catch 掉、留空，核心显示「纯音乐，请欣赏」。 */
  function resolveSide(item) {
    return sideApi('qq_url', { mid: item.id }).then(function (u) {
      if (!u.url) throw new Error('这首没有可用的播放地址');
      return sideApi('qq_lyric', { mid: item.id, name: item.name, artist: item.artist })
        .then(function (l) {
          return { url: u.url, lrc: (l && l.lrc) || '', pic: item.cover || '', cover: item.cover || '' };
        })
        .catch(function () {
          return { url: u.url, lrc: '', pic: item.cover || '', cover: item.cover || '' };
        });
    });
  }

  /* 把侧栏这张歌单交给核心。已经是侧栏队列就别重设（会 idx 清零、把正在放的从头放）；
     若是音乐页的队列（owner='page'，其实同一张歌单），点播放就是要播侧栏视角，重设无妨。 */
  function adoptSideQueue() {
    if (!bus) return;
    if (bus.owner() === 'side') return;
    bus.setQueue({ owner: 'side', name: 'QQ 音乐', list: pl, mode: 'order', resolve: resolveSide });
  }

  function loadPlaylist(wantPlay) {
    /* 已经在拉歌单了：别重复请求，但要把「用户想放」记下来，就绪后补上 */
    if (plState === 'loading') { if (wantPlay) pendingPlay = true; return; }
    if (pl.length) {
      if (wantPlay || pendingPlay) {
        pendingPlay = false;
        if (!bus) return;
        adoptSideQueue();
        if (bus.index() < 0) bus.playIndex(0);
        else if (!bus.isPlaying()) bus.toggle();
      }
      return;
    }

    var c = readJson(musicCacheKey());
    if (c && c.id === MUSIC.playlist && c.list && c.list.length && Date.now() - (c.at || 0) < MUSIC.ttl) {
      pl = c.list; plState = 'ok';
      onPlaylistReady(wantPlay);
      return;
    }

    plState = 'loading';
    setMeta('正在加载歌单…', 'QQ 音乐');
    sideApi('qq_pl', { id: MUSIC.playlist })
      .then(function (d) {
        var list = (d.tracks || []).filter(function (x) { return x && x.id && x.name; });
        if (!list.length) throw new Error('empty');
        pl = list.map(function (x) {
          return {
            id: x.id,
            name: String(x.name || '').trim(),
            artist: String(x.artist || '').trim(),
            cover: x.cover || '',
            pic: x.cover || '',
            dur: Number(x.dur || 0),
            lrc: ''
          };
        });
        plState = 'ok';
        writeJson(musicCacheKey(), { at: Date.now(), id: MUSIC.playlist, list: pl });
        onPlaylistReady(wantPlay);
      })
      .catch(function (e) {
        plState = 'fail';
        pendingPlay = false;   // 歌单没拉下来，别再留着「等会儿补放」的念头
        /* 区分「歌单本身取不到（多半不是公开歌单）」和「接口暂时挂了」两类失败 */
        var msg = (e && e.message) || '';
        var bad = /公开|privacy|unknown|not found|取不到/i.test(msg);
        setMeta(bad ? '歌单取不到' : '歌单加载失败',
                bad ? '先把它设为公开歌单' : '鼠标移开再回来会重试');
        renderLyricTip(bad ? 'QQ 音乐里把这个歌单设为「公开」后刷新' : '歌单接口暂时不可用');
      });
  }

  /* 缓存键带上歌单 ID：以前两种歌单共用 'fomalQQList.v1'，换了 playlist 之后
     30 分钟内照样命中旧歌单的缓存 —— 界面上看就是「改了根本不生效」。
     现在换 ID = 换键，第一次打开就会真去拉新歌单。 */
  function musicCacheKey() { return MUSIC.cache + ':' + MUSIC.playlist; }

  function onPlaylistReady(wantPlay) {
    updateCount();
    /* 悬停时拉歌单是「不播」（wantPlay=false），但期间用户可能已经点了播放：
       两条来源合并成一次判断，否则点了播放要等下次悬停才生效。 */
    var want = !!wantPlay || pendingPlay;
    pendingPlay = false;
    if (!want) { plIdx = -1; return; }   // 歌单先备着，别因为一次悬停就把正在放的顶掉
    adoptSideQueue();                     // 真正接管播放器：owner='side'
    playAt(0);
  }

  function playAt(i, noPlay) {
    if (!bus || !pl.length) return;
    if (!noPlay) userPaused = false;   // 切歌是明确的播放意图，清掉「用户暂停过」的记忆
    bus.playIndex(i, { autoplay: noPlay !== true });
  }

  /* ======================= 歌词 ======================= */
  /* 解析在核心（fomalPlayer.parseLrc）里做，这里只管把行渲染出来 + 跟着当前行滚动。 */

  function renderLyricTip(text) {
    if (!lyricIn) return;
    lyricIn.innerHTML = '';
    var p = document.createElement('p');
    p.className = 'ds-line is-tip';
    p.textContent = text;
    lyricIn.appendChild(p);
    lyricElsReset();
  }
  function lyricElsReset() { lrcEls = []; lrcIdx = -1; }

  function renderLyricLines(list) {
    lrc = list || [];
    lyricElsReset();
    if (!lyricIn) return;
    lyricIn.innerHTML = '';
    lyricIn.style.transform = 'none';
    if (!lrc.length) { renderLyricTip('纯音乐，请欣赏'); return; }
    lrcEls = lrc.map(function (l) {
      var p = document.createElement('p');
      p.className = 'ds-line';
      p.textContent = l.text;
      lyricIn.appendChild(p);
      return p;
    });
    /* 第一句先上，别等 250ms 后第一次 timeupdate 才出现文字 */
    markLine(0);
  }

  function markLine(idx) {
    if (idx === lrcIdx && idx >= 0) return;
    lrcIdx = idx;
    setMiniText(idx >= 0 && lrc[idx] ? lrc[idx].text : songLabel());
    for (var k = 0; k < lrcEls.length; k++) lrcEls[k].classList.toggle('is-cur', k === idx);
    var curEl = lrcEls[idx];
    if (curEl && lyricBox && lyricIn) {
      var off = curEl.offsetTop + curEl.offsetHeight / 2;
      lyricIn.style.transform = 'translate3d(0,' + Math.round(lyricBox.clientHeight / 2 - off) + 'px,0)';
    }
  }

  function renderTime(cur, dur) {
    if (ui.cur) ui.cur.textContent = fmtTime(cur);
    if (ui.dur) ui.dur.textContent = dur ? fmtTime(dur) : '0:00';
    if (ui.fill) ui.fill.style.width = dur > 0 ? (cur / dur * 100).toFixed(2) + '%' : '0%';
  }

  /* ======================= 初始化 ======================= */
  function bindCard(c) {
    c.addEventListener('mouseenter', function () {
      clearTimeout(closeTimer);
      /* 11-02 改回：悬停即播放（openPanel(true)）。
         10-30 曾改成「悬停只露面板、点按钮才出声」，作者 11-02 要求恢复悬停播放。 */
      openPanel(true);
    });
    c.addEventListener('mouseleave', scheduleClose);

    var btn = c.querySelector('.ds-music');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        /* 这里是**用户点击**，可以放：面板已经开着（悬停开的）就直接播/停，没开就开面板并播 */
        if (isOpen) togglePlay(); else openPanel(true);
      });
    }

    // 键盘可达：Tab 到喇叭按钮时只把面板露出来，别一按 Tab 就出声
    if (btn) btn.addEventListener('focus', function () { openPanel(false); });
  }

  /* 浮层的全局关闭手势：Esc、点页面别处、换页。只绑一次（挂 document，跟卡片无关）。 */
  var listBound = false;
  function bindListGlobal() {
    if (listBound) return;
    listBound = true;
    document.addEventListener('keydown', function (e) {
      if (!listOpen) return;
      if (e.key === 'Escape' || e.key === 'Esc') hideList();
    });
    document.addEventListener('click', function (e) {
      if (!listOpen) return;
      if (listBox && listBox.contains(e.target)) return;
      if (Date.now() - listClickTs < 400) return;      // 刚点过列表里的条目（DOM 可能已重建）
      // 两个入口按钮自己的点击已经交给 toggleList 处理，别在这里又关一次
      if (e.target.closest && e.target.closest('[data-act="list"], [data-mact="list"]')) return;
      hideList();
    });
    document.addEventListener('pjax:complete', function () { if (listOpen) hideList(); });
  }

  function init() {
    /* 订阅核心事件要在「卡片检查」之前：文章页没有 #daily-say，但胶囊和音乐页照样要联动 */
    bindBus();
    /* 空格键：鼠标在面板/胶囊上时播放暂停。注册一次就够（条件是动态的） */
    bindSpaceKey();

    /* 先把胶囊补回来：pjax 换页可能换掉 <body> 里的东西，而文章页根本没有 #daily-say，
       所以这一步必须放在下面的卡片检查之前 —— 否则从首页进文章，音乐还在放、胶囊却没了。 */
    if (miniOn || (bus && bus.isPlaying())) revealMini();

    var c = document.getElementById('daily-say');
    if (!c || c.getAttribute('data-ds') === '1') return;
    c.setAttribute('data-ds', '1');

    card = c;
    quoteEl = c.querySelector('.ds-quote');
    fromEl = c.querySelector('.ds-from');

    bindCard(c);
    loadSays();
    startRotate();

    // 侧栏是 sticky 的，页面滚动时面板位置会飘：重新贴一次；卡片滚出视口就收起。
    // pjax 换页会重跑 init，这两个监听挂 window 上，所以只绑一次。
    if (!winBound) {
      winBound = true;
      window.addEventListener('scroll', function () {
        if (!isOpen) return;
        if (rafScroll) return;
        rafScroll = requestAnimationFrame(function () {
          rafScroll = 0;
          if (!isOpen || !connected()) return;
          var r = card.getBoundingClientRect();
          if (r.bottom < 0 || r.top > window.innerHeight) { scheduleClose(); return; }
          positionPanel();
          if (listOpen) positionList();
        });
      }, { passive: true });
      window.addEventListener('resize', function () {
        if (isOpen) positionPanel();
        if (listOpen) positionList();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('pjax:complete', init);
  bindListGlobal();

  // 给调试留个口子：控制台里 fomalMusic.stop() 就能立刻静音
  window.fomalMusic = {
    stop: function () {
      if (!bus) return;
      bus.seekTo(0);
      if (bus.isPlaying()) bus.toggle();
    },
    open: function () { openPanel(true); },
    playlist: function () { return pl; },
    /* 别处（音乐页）想催出胶囊时用；正常播放会自动露，不用手动调 */
    reveal: function () { revealMini(); }
  };
})();
