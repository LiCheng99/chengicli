/**
 * /api/music —— 音乐页的 QQ 音乐代理
 * ---------------------------------------------------------------------------
 * 为什么需要它：浏览器直接调 u.y.qq.com / c.y.qq.com 一定被 CORS 挡下来，
 * 静态站点自己算不了，所以放一层服务端中转。
 *
 * 只做「公开歌单」这一件事：不需要登录、不碰 cookie、函数完全无状态。
 * （10-30 第五版：作者要求删掉网易云 / QQ 音乐的登录模块，码表里只剩下面四个 action）
 *
 * 路由：GET /api/music?action=xxx&...
 *
 *   qq_pl&id=      → 歌单详情 + 曲目（必须是公开歌单）
 *   qq_url&mid=    → 播放地址（游客身份，VIP 曲目没有 purl，前端会提示）
 *   qq_lyric&mid=  → 歌词
 *   qq_search&kw=  → 搜索
 */

'use strict';

/* ================================ QQ 音乐 ================================ */
const QQ_HEADERS = {
  'Referer': 'https://y.qq.com/',
  'Origin': 'https://y.qq.com',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
};

async function qqGet(url) {
  const res = await fetch(url, { headers: QQ_HEADERS });
  return await res.text();
}

/** musicu.fcg 需要 JSON body 里的 data 是字符串，直接拼 query 更省事 */
async function qqFcg(data) {
  const res = await fetch(
    'https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data=' + encodeURIComponent(JSON.stringify(data)),
    { headers: Object.assign({ 'Content-Type': 'application/json' }, QQ_HEADERS) }
  );
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { return { code: -1, raw: text.slice(0, 120) }; }
}

function qqCover(albumMid) {
  if (!albumMid) return '';
  // 歌单的 logo 字段本身就是完整 URL，只有曲目的 albummid 才需要拼
  if (/^https?:\/\//.test(albumMid)) return albumMid;
  return 'https://y.qq.com/music/photo_new/T002R300x300M000' + albumMid + '.jpg';
}

function qqNormSongs(list) {
  return (Array.isArray(list) ? list : [])
    .filter((s) => s && s.songmid)
    .map((s) => ({
      id: s.songmid,
      name: String(s.songname || s.name || '').trim(),
      artist: (Array.isArray(s.singer) ? s.singer : []).map((x) => x.name).filter(Boolean).join(' / '),
      album: String(s.albumname || '').trim(),
      cover: qqCover(s.albummid),
      dur: Number(s.interval) || 0
    }));
}

/** 游客身份取某首歌的播放地址 */
async function qqPlayUrl(mid) {
  const j = await qqFcg({
    req_0: {
      module: 'vkey.GetVkeyServer',
      method: 'CgiGetVkey',
      param: { guid: '10000', songmid: [mid], songtype: [0], uin: '0', loginflag: 1, platform: '20' }
    },
    comm: { uin: 0, format: 'json', ct: 24, cv: 0 }
  });
  const d = (j.req_0 && j.req_0.data) || {};
  const info = (d.midurlinfo || [])[0] || {};
  const sip = (d.sip || [])[0] || '';
  const purl = info.purl || '';
  return { url: purl ? sip + purl : '', vip: purl ? 0 : 1 };
}

/* --------------------------- 歌词兜底（网易云） ---------------------------
   QQ 音乐有一部分歌不返回歌词，只回一句「未经许可,不得翻唱或使用」（实测 12 首里有 3 首）。
   这些歌在别的平台是有点阵歌词的，所以用网易云的公开接口兜一下：
   先按「歌名 + 歌手」搜到 id，再取带时间轴的 lrc。这两个接口都是公开 GET，不需要登录。 */
const NC_PUB_HEADERS = {
  'Referer': 'https://music.163.com/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
};

async function ncLyricFallback(name, artist) {
  const nm = String(name || '').trim();
  if (!nm) return '';
  try {
    const kw = encodeURIComponent((nm + ' ' + String(artist || '').trim()).trim());
    const sr = await fetch(
      'https://music.163.com/api/search/get/?s=' + kw + '&type=1&limit=5',
      { headers: NC_PUB_HEADERS }
    );
    const sj = await sr.json();
    const songs = (sj.result && sj.result.songs) || [];
    if (!songs.length) return '';
    /* 优先挑歌手名对得上的那首，否则用第一条 */
    let pick = songs[0];
    const token = String(artist || '').split(/[\/、,&]/)[0].trim();
    if (token) {
      const hit = songs.find((x) => (x.artists || []).some((a) => {
        const an = String(a.name || '');
        return an && (an.indexOf(token) >= 0 || token.indexOf(an) >= 0);
      }));
      if (hit) pick = hit;
    }
    const lr = await fetch(
      'https://music.163.com/api/song/lyric/?id=' + pick.id + '&lv=1&kv=1&tv=-1',
      { headers: NC_PUB_HEADERS }
    );
    const lj = await lr.json();
    return (lj.lrc && lj.lrc.lyric) || '';
  } catch (e) {
    return '';
  }
}

/* ================================ 动作表 ================================ */
async function handle(action, q) {
  switch (action) {
    case 'qq_pl': {
      const id = String(q.id || '');
      if (!id) return { body: { code: 400, message: '缺少歌单 id' } };
      const url =
        'https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?type=1&json=1&utf8=1&onlysong=0' +
        '&disstid=' + encodeURIComponent(id) +
        '&format=json&g_tk=5381&loginUin=0&hostUin=0&inCharset=utf8&outCharset=utf-8&notice=0' +
        '&platform=yqq.json&needNewCode=0';
      const text = await qqGet(url);
      let json = null;
      try { json = JSON.parse(text.replace(/^callback\(/, '').replace(/\)$/, '')); } catch (e) { json = null; }
      const cd = json && json.cdlist && json.cdlist[0];
      if (!cd) return { body: { code: -1, message: '歌单取不到（多半不是公开歌单）' } };
      const tracks = qqNormSongs(cd.songlist);
      return {
        body: {
          code: 0,
          name: cd.dissname || '',
          cover: qqCover(cd.logo),
          count: cd.songnum || tracks.length,
          tracks
        }
      };
    }

    case 'qq_url': {
      const mid = String(q.mid || '');
      if (!mid) return { body: { code: 400, message: '缺少 songmid' } };
      const u = await qqPlayUrl(mid);
      return { body: { code: 0, url: u.url, vip: u.vip } };
    }


    case 'qq_lyric': {
      const mid = String(q.mid || '');
      if (!mid) return { body: { code: 400, message: '缺少 songmid' } };
      const url =
        'https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=' + encodeURIComponent(mid) +
        '&format=json&nobase64=1&g_tk=5381';
      const text = await qqGet(url);
      let json = null;
      try { json = JSON.parse(text.replace(/^MusicJsonCallback\(/, '').replace(/\)$/, '')); } catch (e) { json = null; }
      let lrc = (json && json.lyric) || '';
      let from = 'qq';
      /* QQ 没给真歌词（只有一句版权提示）时，用网易云的公开接口兜一下 */
      if (!/\[\d{1,3}:\d{1,2}/.test(lrc)) {
        const alt = await ncLyricFallback(q.name, q.artist);
        if (alt && /\[\d{1,3}:\d{1,2}/.test(alt)) { lrc = alt; from = 'nc'; }
      }
      return { body: { code: 0, lrc: lrc, tlyric: (json && json.trans) || '', from: from } };
    }

    case 'qq_search': {
      const kw = String(q.kw || '').trim();
      if (!kw) return { body: { code: 400, message: '缺少关键词' } };
      const url =
        'https://c.y.qq.com/soso/fcgi-bin/client_search_cp?format=json&p=1&n=30&w=' + encodeURIComponent(kw);
      const text = await qqGet(url);
      let json = null;
      try { json = JSON.parse(text); } catch (e) { json = null; }
      const list = json && json.data && json.data.song && json.data.song.list;
      return { body: { code: 0, tracks: qqNormSongs(list) } };
    }

    default:
      return { body: { code: 404, message: '未知 action：' + action } };
  }
}

/* ================================ 入口 ================================ */
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const q = req.query || {};
  const action = String(q.action || '');
  const t0 = Date.now();
  try {
    const out = await handle(action, q);
    res.status(200).json(Object.assign({ ok: true, action, ms: Date.now() - t0 }, out.body));
  } catch (e) {
    res.status(200).json({ ok: false, action, message: (e && e.message) || String(e) });
  }
};
