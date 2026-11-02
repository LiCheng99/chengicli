---
title: 音乐馆
date: 2023-08-10 18:54:31
comments: false
---

<!-- 音乐馆专用：样式 + 播放器脚本只在本页加载（脚本仍在全局，因为 pjax 会丢弃动态插入的 script） -->
<link rel="stylesheet" href="/css/music-page.css?v=20261030s">

<div class="mp-page" id="mp-page">
<section class="mp-deck-card mp-card">
<div class="mp-top">
<div class="mp-cover-wrap" data-act="play" role="button" tabindex="0" aria-label="播放 / 暂停"><img class="mp-cover" id="mp-cover" alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23d9d9d9'/%3E%3C/svg%3E"><span class="mp-cover-eq"><i></i><i></i><i></i></span></div>
<div class="mp-meta">
<h2 class="mp-title"><b id="mp-name">还没开始</b><span class="mp-artist" id="mp-artist">挑一首歌</span></h2>
<div class="mp-lyric" id="mp-lyric"><div class="mp-lyric-stage" id="mp-lyric-stage"><p class="mp-lyric-row is-cur mp-lyric-idle">♪</p></div></div>
</div>
</div>
<div class="mp-seek">
<span class="mp-time" id="mp-cur">0:00</span>
<div class="mp-bar" id="mp-bar" role="slider" tabindex="0" aria-label="播放进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="mp-buf" id="mp-buf"></span><i class="mp-fill" id="mp-fill"></i><b class="mp-knob" id="mp-knob"></b></div>
<span class="mp-time" id="mp-dur">0:00</span>
</div>
<div class="mp-keys">
<button class="mp-key" type="button" data-act="mode" title="顺序播放" aria-label="循环模式"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h9.5v2.2L21 6l-4.5-3.2V5H7a4 4 0 0 0-4 4v2h2V9a2 2 0 0 1 2-2zm10 10H7.5v-2.2L3 18l4.5 3.2V19H17a4 4 0 0 0 4-4v-2h-2v2a2 2 0 0 1-2 2z"/></svg></button>
<button class="mp-key" type="button" data-act="mute" title="音量" aria-label="音量"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.2L12 18.6V5.4L7.2 9.5H4zm11.2-.9a4.6 4.6 0 0 1 0 6.8l1.4 1.4a6.6 6.6 0 0 0 0-9.6l-1.4 1.4zm2.8-2.8a8.6 8.6 0 0 1 0 12.4l1.4 1.4a10.6 10.6 0 0 0 0-15.2l-1.4 1.4z"/></svg></button>
<button class="mp-key" type="button" data-act="prev" title="上一首" aria-label="上一首"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zm14 0v14L9.5 12z"/></svg></button>
<button class="mp-key mp-play" type="button" data-act="play" title="播放" aria-label="播放"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></button>
<button class="mp-key" type="button" data-act="next" title="下一首" aria-label="下一首"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5v14l10.5-7z"/></svg></button>
<button class="mp-key" type="button" data-act="inlist" title="歌单" aria-label="歌单"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.6" y="5.4" width="16.8" height="2.4" rx="1.2"/><rect x="3.6" y="10.8" width="16.8" height="2.4" rx="1.2"/><rect x="3.6" y="16.2" width="10.6" height="2.4" rx="1.2"/></svg></button>
</div>
</section>
<section class="mp-list-card mp-card" id="mp-list-card">
<div class="mp-list-head"><span class="mp-dot"></span><b class="mp-list-name" id="mp-plname">歌单</b><span class="mp-list-count" id="mp-plcount">—</span><span class="mp-list-tip" id="mp-pltip"></span></div>
<div class="mp-list-tools"><input class="mp-search" id="mp-search" type="search" placeholder="搜歌名或歌手，回车搜索当前音源" autocomplete="off"></div>
<ol class="mp-list" id="mp-list"></ol>
</section>
</div>
