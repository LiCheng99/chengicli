/* ---------------------------------------------------------------------------
 * 友人帐随机排序（2026-11-02）
 * ---------------------------------------------------------------------------
 * 为什么在前端做：Hexo 是静态生成，构建时打乱的话每次部署才变一次，访客反复刷新
 * 看到的永远是同一套顺序。放在前端才能「每次进页面都不一样」。
 *
 * 规则：
 *   1. 每个分组（.site-card-group）内部单独打乱，绝不跨组混排；
 *   2. link.yml 里给某人写了 pin: N，就把它固定在第 N 位，其余人随机填空位；
 *   3. 没有 pin 的纯随机 —— 每个人都有机会排到最前。
 *
 * 开关：_config.chengic.yml 的 flink_shuffle（false 关闭），
 *       模板把它写成 .flink[data-shuffle="off"]，这里读。
 * ------------------------------------------------------------------------- */
(function () {
  'use strict';

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  // 取一个容器里的「卡片」子元素（.site-card 是 volantis / flexcard 用的，
  // .flink-list-item 是 flink 标签（大括号百分号那种）生成的，两套都兼容）
  function pickCards(group) {
    var out = [];
    var kids = group.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (el.nodeType !== 1) continue;
      if (el.classList.contains('site-card') || el.classList.contains('flink-list-item')) out.push(el);
    }
    return out;
  }

  function shuffleGroup(group) {
    var cards = pickCards(group);
    if (cards.length < 2) return;

    var pinned = [];
    var rest = [];
    for (var i = 0; i < cards.length; i++) {
      var pos = parseInt(cards[i].getAttribute('data-pin'), 10);
      if (!isNaN(pos) && pos > 0) pinned.push({ el: cards[i], pos: pos });
      else rest.push(cards[i]);
    }

    // 没有 pin 就纯随机
    if (!pinned.length) {
      shuffle(rest);
      for (var a = 0; a < rest.length; a++) group.appendChild(rest[a]);
      return;
    }

    pinned.sort(function (x, y) { return x.pos - y.pos; });
    shuffle(rest);

    var ordered = rest.slice();
    for (var k = 0; k < pinned.length; k++) {
      // pin 超出长度就落到末尾，不会报错
      var idx = Math.min(Math.max(pinned[k].pos - 1, 0), ordered.length);
      ordered.splice(idx, 0, pinned[k].el);
    }

    var frag = document.createDocumentFragment();
    for (var m = 0; m < ordered.length; m++) frag.appendChild(ordered[m]);
    group.appendChild(frag);
  }

  function run() {
    var roots = document.querySelectorAll('.flink');
    if (!roots.length) return;
    for (var r = 0; r < roots.length; r++) {
      if (roots[r].getAttribute('data-shuffle') === 'off') continue;
      var groups = roots[r].querySelectorAll('.site-card-group, .flink-list');
      for (var g = 0; g < groups.length; g++) shuffleGroup(groups[g]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  // pjax 换页回来时脚本不会重新执行，补一个钩子
  document.addEventListener('pjax:complete', run);
})();
