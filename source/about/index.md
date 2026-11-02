---
title: 关于
date: 2023-08-10 16:05:11
description: chengicli —— 做机加工的人，把自己干活要用的东西做成一个站：螺纹速查、42 个 Fanuc 宏程序、零件图纸，外加一些互联网与工具的笔记。不登录、不弹广告。
comments: false
---

<link rel="stylesheet" href="/css/about-page.css?v=20261102a">

<div class="ab3">

  <header class="ab3-hero">
    <div class="ab3-ava">
      <img src="/assets/avatar.webp" alt="chengicli 的头像">
    </div>
    <div class="ab3-hero-main">
      <p class="ab3-hello">你好，我是</p>
      <h1 class="ab3-name">chengicli</h1>
      <p class="ab3-role"><span>CNC 加工</span><span>铣床 / 车床</span><span>互联网笔记</span><span>自建工具站</span></p>
      <p class="ab3-bio">白天在车间跟铁屑打交道，下班后把「这件破事我上周才查过」的东西做成页面。查表、算程序、看图纸，打开就能用——不登录、不弹广告，手机在机床边上也打得开。除了车间的事，也写点互联网上的东西：工具、自建、踩过的坑。</p>
      <div class="ab3-links">
        <a class="ab3-btn" href="mailto:root@licic.net">写信给我</a>
        <a class="ab3-btn is-ghost" href="https://github.com/LiCheng99" target="_blank" rel="noopener">GitHub</a>
        <a class="ab3-btn is-ghost" href="/message/">留言板</a>
      </div>
    </div>
  </header>

  <section class="ab3-stats" aria-label="站内数据">
    <div class="ab3-stat"><b>42</b><span>宏程序模板</span></div>
    <div class="ab3-stat"><b>7</b><span>类螺纹速查</span></div>
    <div class="ab3-stat"><b>47</b><span>首歌在音乐馆</span></div>
    <div class="ab3-stat"><b>2023</b><span>开始建站</span></div>
  </section>

  <section class="ab3-sec">
    <h2 class="ab3-h2">这是干什么的</h2>
    <p>一句话：<b>我自己的工具箱</b>，顺手挂在网上。车间里要用什么，我就把那个东西做成一个页面——不是内容站，也没打算靠它赚钱。</p>
    <p>起因很土：查螺纹底孔要翻那本被借走的册子，手机上搜到的又是零散几张表、还带弹窗。所以第一件事是把螺纹表做成能搜、能筛、手机上能看的一页。后来宏程序、图纸、开机前要注意的事，慢慢都搬到了一起。</p>
    <p>不只是机加工。互联网上的工具、自建服务、折腾过的坑，也会写成笔记放上来——同一套标准：自己用得上，才值得写成页面。</p>
    <p class="ab3-quote">技术上一直守着一条：能用静态文件解决的，绝不加后端。</p>
  </section>

  <section class="ab3-sec">
    <h2 class="ab3-h2">站里有什么</h2>
    <div class="ab3-cards">
      <a class="ab3-card" href="/thread/">
        <span class="ab3-card-ico">⌀</span>
        <b>螺纹规格速查</b>
        <em>公制 / UNC / UNF / BSW / G / Tr / NPT，附底孔钻头</em>
      </a>
      <a class="ab3-card" href="/macro/">
        <span class="ab3-card-ico">#</span>
        <b>Fanuc 宏程序</b>
        <em>42 个 B 类宏模板，填参数实时出 NC</em>
      </a>
      <a class="ab3-card" href="/archives/">
        <span class="ab3-card-ico">▤</span>
        <b>图纸与笔记</b>
        <em>零件图、NC 程序，以及互联网工具与知识的笔记</em>
      </a>
      <a class="ab3-card" href="/music/">
        <span class="ab3-card-ico">♪</span>
        <b>音乐馆</b>
        <em>47 首歌，换页不断</em>
      </a>
      <a class="ab3-card" href="/astronomy/">
        <span class="ab3-card-ico">✦</span>
        <b>天文馆</b>
        <em>旅行者号现在飞到哪了</em>
      </a>
      <a class="ab3-card" href="/nav/">
        <span class="ab3-card-ico">⌘</span>
        <b>网址导航</b>
        <em>一路攒下来的站点</em>
      </a>
    </div>
  </section>

  <section class="ab3-sec">
    <h2 class="ab3-h2">怎么搭的</h2>
    <div class="ab3-tags">
      <span class="ab3-tag"><i>生成</i>Hexo 6.3</span>
      <span class="ab3-tag"><i>模板</i>Pug · Stylus</span>
      <span class="ab3-tag"><i>构建</i>gulp</span>
      <span class="ab3-tag"><i>前端</i>Pjax · 原生 JS</span>
      <span class="ab3-tag"><i>服务</i>nginx · TLS 1.3</span>
      <span class="ab3-tag"><i>接口</i>Node（音乐 / AI 转发）</span>
      <span class="ab3-tag"><i>数据</i>无数据库</span>
      <span class="ab3-tag"><i>版权</i>CC BY-NC-SA 4.0</span>
    </div>
    <p class="ab3-note">没有 CMS、没有后台、没有数据库。文章是 Markdown，统计交给 51LA，页面本身不存任何用户数据。</p>
  </section>

  <section class="ab3-sec">
    <h2 class="ab3-h2">时间线</h2>
    <ol class="ab3-tl">
      <li><time>2023.08</time><b>建站</b><span>第一版，只有几页</span></li>
      <li><time>2026.10</time><b>整站重做</b><span>换主题、加宏程序与音乐馆，清掉历史包袱</span></li>
      <li><time>2026.11</time><b>评论与手感</b><span>接 Twikoo，补滚动、选中这些细节</span></li>
      <li class="is-next"><time>往后</time><b>还会加</b><span>缺什么补什么，不排期</span></li>
    </ol>
  </section>

  <footer class="ab3-end">
    <p>站里不接广告、不弹订阅框、不要求登录。表格里的数字、宏程序里的公式，都是我自己干活时会用的——写错了欢迎写信指出，改得比谁都快。</p>
    <div class="ab3-links">
      <a class="ab3-btn" href="mailto:root@licic.net">root@licic.net</a>
      <a class="ab3-btn is-ghost" href="https://github.com/LiCheng99" target="_blank" rel="noopener">GitHub</a>
    </div>
    <p class="ab3-copy">© 2023–2026 chengicli · 最后更新 2026-11-02</p>
  </footer>

</div>
