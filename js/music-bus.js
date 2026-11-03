/*!
 * music-bus.js —— 全站唯一的播放核心（单例）
 * ============================================================================
 * 【为什么要有这个文件】
 * 站里原本有两套播放器，各自 new 一个 <audio>：
 *   1) source/js/music-page.js   —— 音乐馆 /music/（歌单、搜索）
 *   2) source/js/daily-say.js    —— 侧栏悬停面板 #ds-player + 左下角胶囊 #ds-mini
 * 两套互不相通：在音乐页点播放，胶囊的 audio 根本没响过，`playing` 事件不触发，
 * 所以胶囊一直藏着；进度、歌词、上下首也全都是各走各的。
 *
 * 这个文件把「播什么、播到哪、放没放」收成一份状态，三处 UI 都只是它的视图：
 *   - 一份队列 queue + 一个下标 idx + 一个 <audio>
 *   - 谁先按播放，就把自己的歌单交给它（owner 标记来源），另外两处立刻跟着变
 *   - 事件：queue / track / lyric / line / time / state / error
 *
 * 【队列项长什么样】（两家歌源字段不一样，统一成下面这套）
 *   { id, name, artist, cover, pic, url, lrc, dur, vip }
 *   url 可以缺 —— 缺了就在真要播的时候调 resolve(item) 现取（音乐页就是这样，
 *   QQ/网易云的播放地址必须带 cookie 过 /api/music 才算得出来，不能提前批量取）。
 *   lrc 可以是「LRC 文本」也可以是「http(s) 地址」，核心自己分辨。
 *
 * 【跨页】
 * pjax 只换 body，不重跑脚本，所以这个闭包里的 <audio> 和队列在站内跳页时会一直活着
 * —— 从首页放着的歌，点进文章页还在放，胶囊也还在。整页刷新才会重来，这是对的。
 */
(function (global) {
  'use strict';

  var VOLUME = 0.8;
  var MAX_ERR_SKIP = 6;          // 连错 6 首就停手，别在死链歌单里空转

  var audio = null;
  var queue = [];
  var idx = -1;
  var owner = '';                // 'page'（音乐页） / 'side'（侧栏）
  var ownerName = '';            // 歌单名，给面板显示
  var mode = 'order';            // order | one | shuffle
  var muted = false;
  var lines = [];                // 当前歌词已解析 [{t, text}]
  var lineIdx = -1;
  var resolveFn = null;          // 当前 owner 提供的「取播放地址」函数
  var subs = [];
  var seq = 0;                   // 异步解析回来时用它判断「是不是已经切歌了」
  var errCount = 0;
  /* 用户主动暂停过的标记：自动路径（出错跳歌、播完自动下一首）不许违背用户的暂停意图，
     只有用户自己再点播放/切歌才解除。 */
  var holdPaused = false;
  /* 「用户想让它在放吗」。和 audio.paused 不是一回事：页面要卸载 / 进 bfcache 时，
     浏览器会自己把媒体暂停掉（'pause' 事件照样派发），如果拿实时状态去写快照，
     存下来的就是「暂停」—— 下一个页面就不会续播了。所以快照里记的是这个意图标记：
     只有用户自己按暂停才置 false。 */
  var wantPlaying = false;

  /* ---------------------- 跨整页导航续播（2026-11-02） ----------------------
   * 【症状】放歌的时候，选中一段链接 → 右键菜单「转到 xxx」/ 点外链 / 地址栏回车 / F5，
   *        音乐立刻停，胶囊也没了，像刚刷过页面。
   *
   * 【根因】这些操作都是**整页导航**：document 被销毁，本文件闭包里的 <audio> 和队列
   *        必然跟着没。这是浏览器硬限制 —— 页面既拦不住跨文档导航，也没法把 <audio>
   *        搬到新文档里（pjax 能保住，因为那压根不换文档；右键菜单不产生 click 事件，
   *        走不了 pjax）。同源的「随便逛逛」已在 nav.js 改成 pjax，这里补的是剩下的路。
   *
   * 【做法】导航前把「哪首、第几秒、队列、播放模式」写进 sessionStorage，
   *        新文档里读回来、seek 回同一秒、接着播。中间有一次约 0.3~1 秒的换页空档，
   *        但不再是从头静音。
   *
   * 【什么时候不恢复】
   *   · 当时是暂停态 —— 用户自己按的暂停，跨页不该自作主张响起来
   *   · 超过 30 分钟 —— 播放地址是带 vkey 签名的，早就过期了
   *   · 落点是 /music/ —— 那页有自己的歌单，它 setQueue 会覆盖，抢了反而乱
   *   · 当前这首没有播放地址
   * 【回滚】RESUME_ON 改 false（或整段删掉）即可，其它逻辑不依赖它。
   * ---------------------------------------------------------------------- */
  var RESUME_ON = true;
  var RESUME_KEY = 'fomalPlayerResume';
  var RESUME_TTL = 30 * 60 * 1000;   // 只认 30 分钟内的快照
  var RESUME_MAX = 300;              // 队列最多存 300 首，别把 sessionStorage 撑爆
  var resumeSavedAt = 0;
  var resuming = false;              // 正在恢复（这期间别回写快照）
  var fromResume = false;            // 本曲是「续播」来的：出错时不许自动跳歌

  /* ------------------------------ 事件 ------------------------------ */
  function emit(type, data) {
    for (var i = 0; i < subs.length; i++) {
      try { subs[i](type, data || {}); } catch (e) { /* 一个视图出错不能拖垮其它视图 */ }
    }
  }

  function on(fn) {
    if (typeof fn === 'function' && subs.indexOf(fn) < 0) subs.push(fn);
    return fn;
  }
  function off(fn) {
    var i = subs.indexOf(fn);
    if (i >= 0) subs.splice(i, 1);
  }

  /* ------------------------------ 工具 ------------------------------ */
  function parseLrc(text) {
    var out = [];
    String(text || '').split(/\r?\n/).forEach(function (line) {
      /* 一行可以有多个时间戳（副歌唱回同一句），全部展开 */
      var stamps = line.match(/\[\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?\]/g);
      if (!stamps) return;
      var body = line.replace(/\[[^\]]*\]/g, '').trim();
      if (!body) return;
      stamps.forEach(function (s) {
        var m = s.match(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/);
        if (!m) return;
        var frac = m[3] ? parseFloat('0.' + m[3]) : 0;
        out.push({ t: parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + frac, text: body });
      });
    });
    out.sort(function (a, b) { return a.t - b.t; });
    return out;
  }

  function lineAt(t) {
    var i = -1;
    for (var k = 0; k < lines.length; k++) {
      if (lines[k].t <= t + 0.2) i = k; else break;
    }
    return i;
  }

  /* ------------------------------ audio ------------------------------ */
  /* 全站只允许有一个播放器在响：把页面上别的 <audio>（主题插件、别的脚本留下的）停掉。
     否则会出现「页面显示暂停、旁边那个还在放」——声音和界面各说各话。 */
  function silenceOthers() {
    var list = document.querySelectorAll('audio');
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o === audio) continue;
      try { o.pause(); o.removeAttribute('src'); o.load(); } catch (e) { }
    }
  }

  function attach() {
    if (audio) return audio;
    audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.volume = VOLUME;
    audio.muted = muted;
    audio.style.display = 'none';
    document.body.appendChild(audio);

    audio.addEventListener('playing', function () {
      errCount = 0;
      wantPlaying = true;
      emit('state', { playing: true });
      saveResume(true);          // 开始响：记一笔（跨页续播要用）
    });
    audio.addEventListener('pause', function () {
      emit('state', { playing: false });
      /* 这里不动 wantPlaying：卸载 / 进 bfcache / 出错跳歌都会走到 pause，
         只有 toggle() 里用户自己按暂停才该把它置 false。 */
      saveResume(true);
    });
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onTime);
    audio.addEventListener('progress', onBuffer);
    audio.addEventListener('ended', function () { autoNext(); });
    audio.addEventListener('error', onError);
    silenceOthers();
    return audio;
  }

  function onTime() {
    if (!audio) return;
    var dur = isFinite(audio.duration) ? audio.duration : 0;
    emit('time', { cur: audio.currentTime || 0, dur: dur });
    saveResume(false);           // 节流写播放进度，跨页续播靠它对齐到「同一秒」
    if (!lines.length) return;
    var i = lineAt(audio.currentTime || 0);
    if (i !== lineIdx) { lineIdx = i; emit('line', { index: i }); }
  }

  function onBuffer() {
    if (!audio || !isFinite(audio.duration) || !audio.duration) return;
    var r = 0;
    if (audio.buffered && audio.buffered.length) {
      r = audio.buffered.end(audio.buffered.length - 1) / audio.duration;
    }
    emit('buffer', { ratio: Math.min(1, Math.max(0, r)) });
  }

  function onError() {
    errCount++;
    /* 续播回来的这首一出错，八成是 vkey 签名过期（快照超过有效期 / 换了网络出口）。
       这种情况**不能**按常规跳下一首：整张队列的地址可能一起过期，会连环跳 6 首、
       弹一串报错。直接收手，清掉快照等用户自己点。 */
    if (fromResume) {
      fromResume = false;
      clearResume();
      emit('error', { index: idx, track: queue[idx] || null, message: '续播失败（播放地址已过期），点播放重试' });
      /* 把死掉的地址扔掉：这样用户点播放时 toggle() 看到 a.src 为空，会走 playIndex(idx)
         → ensureUrl 用 resumeResolve 重新取一次地址，而不是拿旧 src 再报一次错。 */
      try { audio.removeAttribute('src'); audio.load(); } catch (e) { }
      return;
    }
    emit('error', { index: idx, track: queue[idx] || null, message: '这首放不出来（可能没有版权或需要登录）' });
    /* 出错自动跳下一首：只在没有暂停意图时才继续播，否则跳过去停在暂停态等用户 */
    if (queue.length > 1 && errCount <= MAX_ERR_SKIP) {
      setTimeout(function () {
        if (holdPaused) { playIndex(idx + 1, { autoplay: false }); return; }
        step(1);
      }, 420);
    }
  }

  /* 播完自动下一首；mode 决定顺序 / 单曲 / 随机 */
  function autoNext() {
    /* 用户已经按过暂停，就别自作主张接着放 */
    if (holdPaused) {
      if (audio) { audio.currentTime = 0; }
      return;
    }
    if (mode === 'one') {
      if (!audio) return;
      audio.currentTime = 0;
      play().catch(function () { });
      return;
    }
    step(1);
  }

  /* --------------------------- 队列 / 播放 --------------------------- */
  function setQueue(o) {
    queue = (o && o.list ? o.list : []).slice();
    owner = (o && o.owner) || '';
    ownerName = (o && o.name) || '';
    resolveFn = (o && typeof o.resolve === 'function') ? o.resolve : null;
    if (o && o.mode) mode = o.mode;
    idx = -1;
    /* 换了歌单、又不是在放歌：上一份跨页快照作废，免得下次进站莫名其妙放起旧歌。
       （正在放的时候不动它 —— 那是当前正在响的这一首，别把有效快照删了。） */
    if (!(audio && audio.src && !audio.paused)) clearResume();
    emit('queue', { owner: owner, name: ownerName, list: queue, mode: mode });
  }

  function setLines(arr) {
    lines = arr || [];
    lineIdx = -1;
    emit('lyric', { lines: lines });
  }

  function loadLyric(item, mySeq) {
    if (!item) return;
    if (item._lines) { if (mySeq === seq) setLines(item._lines); return; }
    var src = item.lrc;
    if (!src) { setLines([]); return; }
    if (/^https?:\/\//i.test(src)) {
      fetch(src, { credentials: 'omit' })
        .then(function (r) { return r.text(); })
        .then(function (txt) {
          item._lines = parseLrc(txt);
          if (mySeq === seq) setLines(item._lines);
        })
        .catch(function () { if (mySeq === seq) setLines([]); });
    } else {
      item._lines = parseLrc(src);
      if (mySeq === seq) setLines(item._lines);
    }
  }

  /* 播放地址可能不在队列里（音乐页的 QQ/网易云要现取），取到后回填进队列项，
     同一首再播就不用再打接口了。 */
  function ensureUrl(item) {
    if (item.url) return Promise.resolve(item);
    if (!resolveFn) return Promise.reject(new Error('这首没有可用的播放地址'));
    return Promise.resolve(resolveFn(item)).then(function (r) {
      if (!r || !r.url) throw new Error('这首歌暂时放不了（可能受版权限制）');
      item.url = r.url;
      if (r.pic && !item.pic) item.pic = r.pic;
      if (r.cover && !item.cover) item.cover = r.cover;
      if (r.lrc && !item.lrc) item.lrc = r.lrc;
      return item;
    });
  }

  /* ------------------------ 续播：存 / 取 / 恢复 ------------------------ */

  /* 队列项瘦身：只留能重建播放所需的最小字段。
     歌词是文本时整张歌单能到 MB 级，而 sessionStorage 只有 5 MB —— 所以只留 URL 形式的，
     文本歌词仅在「当前这一首」上单独补（见 saveResume）。 */
  function packItem(it) {
    if (!it) return null;
    var o = {
      id: it.id, name: it.name, artist: it.artist,
      cover: it.cover, pic: it.pic, url: it.url, dur: it.dur, vip: it.vip
    };
    if (typeof it.lrc === 'string' && /^https?:\/\//i.test(it.lrc)) o.lrc = it.lrc;
    return o;
  }

  /* force=false：只在「真的在响」时按 1.5 秒节流写，给 timeupdate 用
     force=true ：状态变化 / 页面要走时立刻写，暂停态也要写（写 p:false，
                   这样下次读到时不会自作主张响起来） */
  function saveResume(force) {
    if (!RESUME_ON || resuming) return;
    try {
      if (!queue.length || idx < 0) return;
      var a = audio;
      var playing = !!(a && a.src && !a.paused);
      var now = Date.now();
      if (!force && (!playing || now - resumeSavedAt < 1500)) return;
      resumeSavedAt = now;
      var cut = Math.min(queue.length, RESUME_MAX);
      var list = [];
      for (var k = 0; k < cut; k++) list.push(packItem(queue[k]));

      var cur = queue[idx];
      if (cur && idx < cut && typeof cur.lrc === 'string' &&
        !/^https?:\/\//i.test(cur.lrc) && cur.lrc.length < 4000) {
        list[idx].lrc = cur.lrc;      // 当前曲的歌词文本带上，续播回来才有词
      }

      sessionStorage.setItem(RESUME_KEY, JSON.stringify({
        at: now, i: idx, t: a ? (a.currentTime || 0) : 0,
        /* p 记的是「用户意图」，不是「此刻有没有声音」：卸载时浏览器会自己暂停媒体，
           拿实时状态写就会把正在放的歌记成暂停，下一个页面便不再续播。 */
        p: wantPlaying && !!(a && a.src), m: mode, o: owner, n: ownerName, q: list
      }));
    } catch (e) { /* 存不下就当没这功能，绝不能影响播放 */ }
  }

  function clearResume() {
    try { sessionStorage.removeItem(RESUME_KEY); } catch (e) { }
  }

  /* 普通页续播时没有 owner 提供的 resolve（那是音乐页 / 侧栏各自闭包里的），
     所以这里给一份兜底：直接打本站 /api/music，参数和 music-page.js 完全一致。
     不然续上之后按「下一首」会因为没有播放地址而报错跳歌。 */
  function resumeResolve(item) {
    var base = '/api/music';
    try { base = localStorage.getItem('mpApi') || base; } catch (e) { }
    if (!item || !item.id) return Promise.reject(new Error('这首没有可用的播放地址'));
    function get(action, params) {
      var qs = 'action=' + encodeURIComponent(action);
      Object.keys(params || {}).forEach(function (k) {
        if (params[k] == null) return;
        qs += '&' + k + '=' + encodeURIComponent(params[k]);
      });
      return fetch(base + '?' + qs, { credentials: 'omit' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (d) {
        if (!d || d.ok === false) throw new Error((d && d.message) || '接口错误');
        return d;
      });
    }
    return get('qq_url', { mid: item.id }).then(function (d) {
      if (!d.url) throw new Error(item.vip ? '这首要会员，这里放不了' : '这首没有可用的播放地址');
      return get('qq_lyric', { mid: item.id, name: item.name, artist: item.artist })
        .then(function (l) { return { url: d.url, lrc: (l && l.lrc) || '', pic: item.cover || '' }; })
        .catch(function () { return { url: d.url, pic: item.cover || '' }; });
    });
  }

  /* 新文档里把上一次的快照接回来。只在「没人抢队列」时动手：
     音乐页会在 /api/music 回来后 setQueue，侧栏面板要等用户点播放才抢，所以默认是空的。 */
  function restoreResume() {
    if (!RESUME_ON || resuming || queue.length) return;
    if (document.getElementById('mp-page')) return;      // 音乐馆：它自己的歌单说了算
    /* 从本站其它标签页 window.open / target=_blank 打开出来的新标签页，浏览器会把
       sessionStorage **整份复制**过去（实测：opener=true，快照在，恢复后两边同时在响）。
       原标签页还在放，这里不该再起一份。 */
    if (window.opener) { clearResume(); return; }   // 复制品快照作废，免得这页下次跳转又想起来
    var raw = null;
    try { raw = JSON.parse(sessionStorage.getItem(RESUME_KEY) || 'null'); } catch (e) { return; }
    if (!raw || !raw.q || !raw.q.length) return;
    if (!raw.p) return;                                   // 当时是暂停的：别自己响
    if (Date.now() - (raw.at || 0) > RESUME_TTL) { clearResume(); return; }
    var i = raw.i | 0;
    if (i < 0 || i >= raw.q.length) { clearResume(); return; }
    if (!raw.q[i] || !raw.q[i].url) { clearResume(); return; }

    /* 再问一声「同源还有别的标签页在放吗」—— 上面那条只能拦住带 opener 的，
       浏览器以后要是改了 sessionStorage 的复制规则，这里还能兜住。 */
    probeOtherTabs(function (busy) {
      if (queue.length) return;
      if (busy) { clearResume(); return; }   // 别留一份「幽灵快照」，否则这页下次跳转又会想恢复
      applyResume(raw);
    });
  }

  /* ------------------ 同源多标签页「谁在放」的握手 ------------------
   * 用 BroadcastChannel（不投递给发送者自己），150ms 内没人应答才认为可以续播。
   * 不支持 BC 的浏览器直接放行 —— 那边还有 window.opener 那道闸。 */
  var bc = null;
  try {
    if (typeof BroadcastChannel === 'function') {
      bc = new BroadcastChannel('fomalPlayerTabs');
      bc.onmessage = function (ev) {
        if (ev.data === 'ping' && audio && audio.src && !audio.paused) {
          try { bc.postMessage('yes'); } catch (e) { }
        }
      };
    }
  } catch (e) { bc = null; }

  function probeOtherTabs(cb) {
    if (!bc) { cb(false); return; }
    var answered = false;
    function onMsg(ev) { if (ev.data === 'yes') answered = true; }
    bc.addEventListener('message', onMsg);
    try { bc.postMessage('ping'); } catch (e) { }
    setTimeout(function () {
      bc.removeEventListener('message', onMsg);
      cb(answered);
    }, 150);
  }

  /* 真正把快照装进播放器 */
  function applyResume(raw) {
    var i = raw.i | 0;
    var item = raw.q[i];

    resuming = true;
    fromResume = true;
    queue = raw.q;
    idx = i;
    owner = raw.o || '';
    ownerName = raw.n || '';
    mode = (raw.m === 'one' || raw.m === 'shuffle') ? raw.m : 'order';
    resolveFn = resumeResolve;

    emit('queue', { owner: owner, name: ownerName, list: queue, mode: mode });
    emit('track', { index: idx, track: item, owner: owner, name: ownerName });
    setLines([]);
    if (item.lrc) loadLyric(item, seq);

    var a = attach();
    a.src = item.url;
    errCount = 0;

    var want = +raw.t || 0;
    var done = false;
    function seekBack() {
      if (done) return;
      done = true;
      try {
        var d = isFinite(a.duration) ? a.duration : 0;
        if (d > 0) want = Math.min(want, Math.max(0, d - 1));
        a.currentTime = Math.max(0, want);
      } catch (e) { }
      resuming = false;
    }
    if (a.readyState >= 1) seekBack();
    else a.addEventListener('loadedmetadata', seekBack, { once: true });
    setTimeout(seekBack, 1200);   // 元数据迟迟不来也别一直挂着 resuming

    play().then(function () {
      resuming = false;
      saveResume(true);           // 位置可能和快照差几十毫秒，立刻校正一次
    });
  }

  function play() {
    var a = attach();
    if (!a.src) return Promise.resolve();
    silenceOthers();
    var p = a.play();
    if (p && p.catch) {
      return p.catch(function (e) {
        emit('blocked', { message: '浏览器拦了自动播放，点一下播放键' });
      });
    }
    return Promise.resolve();
  }

  function playIndex(i, opts) {
    opts = opts || {};
    if (!queue.length) return Promise.resolve();
    fromResume = false;                  // 用户自己切的歌，出错就按常规跳下一首
    var n = queue.length;
    idx = ((i % n) + n) % n;
    var item = queue[idx];
    var my = ++seq;

    emit('track', { index: idx, track: item, owner: owner, name: ownerName });
    setLines([]);

    return ensureUrl(item).then(function (it) {
      if (my !== seq) return;             // 期间已经切到别的歌，这次结果作废
      /* 歌词要等 resolve 把 lrc 带回来才能解析，所以放在这里。
         早一步调用 loadLyric 的话 item.lrc 还是空的 —— 这首歌就永远显示不出歌词，
         要等第二次播（item.lrc 缓存住了）才有，这就是之前「有时有歌词有时没有」的根因。 */
      loadLyric(item, my);
      var a = attach();
      a.src = it.url;
      errCount = 0;
      if (opts.autoplay === false) {
        /* 只换源、不出声（出错跳歌且用户已暂停时走这条） */
        wantPlaying = false;
        emit('time', { cur: 0, dur: it.dur || 0 });
        return;
      }
      return play();
    }).catch(function (e) {
      if (my !== seq) return;
      emit('error', { index: idx, track: item, message: (e && e.message) || '播放失败' });
    });
  }

  function step(dir) {
    if (!queue.length) return;
    if (mode === 'shuffle' && queue.length > 1) {
      var i;
      do { i = Math.floor(Math.random() * queue.length); } while (i === idx);
      playIndex(i);
      return;
    }
    playIndex(idx + dir);
  }

  function next() { holdPaused = false; step(1); }

  /* 和主流播放器一致：播过 3 秒以上，按「上一首」先回本曲开头 */
  function prev() {
    holdPaused = false;
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
    step(-1);
  }

  function toggle() {
    var a = attach();
    if (!a.src || idx < 0) { holdPaused = false; wantPlaying = true; playIndex(idx >= 0 ? idx : 0); return; }
    if (a.paused) { holdPaused = false; wantPlaying = true; play(); }
    else { holdPaused = true; wantPlaying = false; a.pause(); }
  }

  function seekTo(t) {
    var a = attach();
    if (!a.src || !isFinite(a.duration)) return false;
    /* 不可 seek 的流（部分公共代理接口给的是一次性响应）设 currentTime 会让浏览器
       重新拉流并**自动接着播** —— 表现就是「我只是拖了下进度条，音乐却自己放起来了」。
       这种源只能整首换（换 src），不能原地拖。 */
    var seekable = (a.seekable && a.seekable.length) ? a.seekable.end(a.seekable.length - 1) : 0;
    if (!seekable || seekable < 1) return false;
    var wasPaused = a.paused;
    a.currentTime = Math.max(0, Math.min(seekable, t));
    /* 兜底：拖之前是暂停的，拖完必须还是暂停。
       某些流在 seek 之后浏览器会自己恢复播放（它要重新拉一次流），这里强行按回去，
       免得出现「我只是拖了下进度条，音乐却自己放起来了」。 */
    if (wasPaused) {
      setTimeout(function () { if (!a.paused) a.pause(); }, 80);
    }
    onTime();
    return true;
  }

  function seekRatio(r) {
    var a = attach();
    if (!a.src || !isFinite(a.duration) || !a.duration) return false;
    return seekTo(r * a.duration);
  }

  function setMode(m) {
    if (m !== 'order' && m !== 'one' && m !== 'shuffle') return;
    mode = m;
    emit('mode', { mode: mode });
  }

  function toggleMute() {
    var a = attach();
    muted = !muted;
    a.muted = muted;
    emit('mute', { muted: muted });
    return muted;
  }

  /* ---------------------------- 空格键调度 ----------------------------
     作者要求（10-31）：
       · 音乐馆页面（/music/）：按空格 = 播放 / 暂停
       · 其它页面：鼠标焦点在「侧栏播放器面板」或「左下角胶囊」上时，按空格 = 播放 / 暂停

     为什么放在核心而不是各 UI 自己监听：
     空格键是全局的，如果音乐页、侧栏面板、胶囊各绑一个 keydown，
     同一次按键会被**多个处理器同时响应** —— 一次「播放」变「播放+暂停」，
     看起来就是「按了没反应」。所以这里统一收口：
     各 UI 通过 registerSpace 注册一个「我这会儿该不该响应空格」的判定，
     核心每次只把事件派给**第一个判定通过**的 UI，并且只派一次。

     注册参数（opts）：
       el       鼠标悬停判定元素，可以是元素，也可以是「返回元素」的函数
                （面板/胶囊是懒创建 + pjax 会重建 DOM，写死元素会失效）
       scope    返回 true 表示当前该由它响应。动态判断，pjax 换页后依然准
       priority 数值大的先响应
       fn       真正的响应动作
  */
  var spaceHandlers = [];

  function registerSpace(opts) {
    if (!opts || typeof opts.fn !== 'function') return;
    spaceHandlers.push({
      el: opts.el || null,
      scope: typeof opts.scope === 'function' ? opts.scope : null,
      priority: opts.priority || 0,
      fn: opts.fn
    });
  }

  /* 判定「鼠标当前是否悬停在某个播放器 UI 上」。
     用 :hover 而不是自己记鼠标坐标 —— :hover 由浏览器维护，
     元素被重建（面板/胶囊懒创建）也照样准，还不用多跑一个 mousemove 监听。
     鼠标停在面板里的按钮上时，面板本身也匹配 :hover（hover 会冒到祖先），一样算数。 */
  function hoverUI(el) {
    if (!el || !el.isConnected) return false;
    try {
      return el.matches(':hover');
    } catch (e) {
      return false;
    }
  }

  /* 焦点是否落在可编辑控件里（输入框 / 文本域 / 下拉）。
     这种地方必须放行，否则搜索框里就打不出空格了。 */
  function inEditable(target) {
    if (!target || !target.tagName) return false;
    var tag = target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (target.isContentEditable) return true;
    return false;
  }

  /* 按下空格时，浏览器会自己「激活」当前聚焦的按钮 / 链接（keyup 时补一次 click）。
     这种元素上我们不能再插一脚 —— 否则一次按键触发两遍动作（播放变播放+暂停）。
     所以焦点在这些元素上时，把空格完全交给浏览器。 */
  function nativeSpaceTarget(target) {
    if (!target || !target.tagName) return false;
    var tag = target.tagName.toLowerCase();
    if (tag === 'button' || tag === 'a' || tag === 'summary') return true;
    if (target.getAttribute && target.getAttribute('role') === 'button') return true;
    return false;
  }

  function onSpace(e) {
    /* 只认真正的空格键；按住不放（e.repeat）时不要反复切歌，
       否则长按一次会在播放/暂停之间来回跳。 */
    if (e.code !== 'Space' && e.key !== ' ' && e.key !== 'Spacebar') return;
    if (e.repeat) return;
    /* 组合键（Ctrl/Alt/Shift + 空格）不接管，交给浏览器/系统 */
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

    /* 焦点在输入框 / 文本域里 → 放行，让用户正常打空格 */
    if (inEditable(e.target) || inEditable(document.activeElement)) return;
    /* 焦点在按钮 / 链接上 → 浏览器会自己激活它，别重复触发 */
    if (nativeSpaceTarget(e.target)) return;

    /* 优先级高的先试；同优先级按注册先后 */
    var list = spaceHandlers.slice().sort(function (a, b) { return b.priority - a.priority; });

    for (var i = 0; i < list.length; i++) {
      var h = list[i];
      if (h.scope && !h.scope()) continue;
      var el = null;
      if (h.el) {
        el = (typeof h.el === 'function') ? h.el() : h.el;
        if (!hoverUI(el)) continue;
      }
      h.fn(e);
      /* 派发成功后要拦掉默认行为，否则页面会跟着往下滚一屏 */
      if (e.preventDefault) e.preventDefault();
      return;
    }
  }

  function bindSpace() {
    if (bindSpace.done) return;
    bindSpace.done = true;
    document.addEventListener('keydown', onSpace);
  }

  /* 空格键监听在核心里挂一次就够了，各 UI 只注册「响应条件」。 */
  bindSpace();

  /* ------------------ 跨页续播：走之前存、进来之后接着放 ------------------
   * pagehide 是「页面即将被销毁」时唯一可靠的钩子（beforeunload 在 Chrome 里
   * 可能被跳过，尤其没绑 onbeforeunload 的页面）；visibilitychange→hidden
   * 再补一刀，覆盖切后台被丢弃、手机端后台回收这些情况。 */
  window.addEventListener('pagehide', function () { saveResume(true); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') saveResume(true);
  });
  /* 浏览器后退走 bfcache 回来：<audio> 元素还在，但播放是停的 —— 接着放。
     用户自己按过暂停（holdPaused）就不动。 */
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted || !audio || !audio.src || !audio.paused || holdPaused) return;
    play();
  });
  /* 恢复必须等其它 defer 脚本跑完（daily-say / music-page 要先订阅事件，
     否则 emit 出去的 queue / track / state 没人接，胶囊不会亮），所以延后一拍。 */
  setTimeout(restoreResume, 60);

  /* ------------------------------ 只读 ------------------------------ */
  function state() {
    var a = audio;
    return {
      owner: owner,
      name: ownerName,
      list: queue,
      index: idx,
      track: idx >= 0 ? queue[idx] : null,
      mode: mode,
      muted: muted,
      playing: !!(a && !a.paused && a.src),
      cur: a ? (a.currentTime || 0) : 0,
      dur: a && isFinite(a.duration) ? a.duration : 0,
      lines: lines,
      lineIndex: lineIdx
    };
  }

  global.fomalPlayer = {
    on: on,
    off: off,
    attach: attach,
    setQueue: setQueue,
    playIndex: playIndex,
    toggle: toggle,
    play: play,
    next: next,
    prev: prev,
    seekTo: seekTo,
    seekRatio: seekRatio,
    setMode: setMode,
    toggleMute: toggleMute,
    state: state,
    /* 空格键：各 UI 注册「我这会儿该不该响应空格」 */
    registerSpace: registerSpace,
    /* 给 UI 层用的零碎读取，免得每次都 state() 拷一份 */
    queue: function () { return queue; },
    track: function () { return idx >= 0 ? queue[idx] : null; },
    index: function () { return idx; },
    owner: function () { return owner; },
    lines: function () { return lines; },
    lineIndex: function () { return lineIdx; },
    isPlaying: function () { return !!(audio && !audio.paused && audio.src); },
    parseLrc: parseLrc,
    /* 跨页续播：控制台调试用 —— fomalPlayer.resume.peek() 看快照，
       .save() 立刻存一次，.clear() 清掉（下次进站不会自动接着放）。 */
    resume: {
      save: function () { saveResume(true); },
      clear: clearResume,
      peek: function () {
        try { return JSON.parse(sessionStorage.getItem(RESUME_KEY) || 'null'); } catch (e) { return null; }
      }
    }
  };
})(window);
