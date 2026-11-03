/* ---------------------------------------------------------------------------
 * 友人帐 · 快速申请按钮
 * 作用：点按钮 → 把友链申请模板填进下方评论框（Twikoo），光标停在第一个空位上。
 *
 * 2026-11-02 重写：原版只认 .el-textarea__inner（老 Twikoo / Element UI 的类名），
 * 而现在的 Twikoo 用的是 .tk-input__inner + .tk-textarea，选择器扑空 → 按钮点了没反应。
 * 另外评论区是懒加载（滚动到才渲染），所以这里加了「滚过去 + 轮询等待」。
 * ------------------------------------------------------------------------- */
var leonus = {
  linkCom: function (style) {
    var isBF = style === 'bf';

    // 用数组 + join 拼，避免长字符串里的转义被各种编辑器/工具改写
    var NL = String.fromCharCode(10);
    var BF_LINES = ['```yml', '- name: ', '  link: ', '  avatar: ', '  descr: ', '```'];
    var DEF_LINES = ['站点名称：', '站点地址：', '头像链接：', '站点描述：'];
    var text = (isBF ? BF_LINES : DEF_LINES).join(NL);

    // 光标落点：Butterfly 模板停在 "- name: " 之后，默认模板停在 "站点名称：" 之后
    var caret = isBF ? text.indexOf('- name: ') + '- name: '.length : '站点名称：'.length;

    function findBox() {
      var sels = [
        '.twikoo textarea',
        '#twikoo textarea',
        '#twikoo-wrap textarea',
        'textarea.tk-input__inner',
        '.tk-textarea textarea',
        '.el-textarea__inner'          // 兼容旧版 Twikoo
      ];
      for (var i = 0; i < sels.length; i++) {
        var el = document.querySelector(sels[i]);
        if (el) return el;
      }
      return null;
    }

    function fill(el) {
      // Twikoo 是 Vue 渲染的：直接改 value 不会同步到组件状态，
      // 必须走原生 setter 再派发 input 事件，否则文字看着有、提交却是空的。
      var proto = Object.getPrototypeOf(el);
      var desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && desc.set) desc.set.call(el, text);
      else el.value = text;

      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      el.focus();
      try { el.setSelectionRange(caret, caret); } catch (e) {}
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    var box = findBox();
    if (box) { fill(box); return; }

    // 评论区还没加载：滚到评论区触发懒加载，然后轮询等输入框出现
    var anchor = document.getElementById('twikoo-wrap') ||
                 document.getElementById('post-comment') ||
                 document.querySelector('.comment-wrap');
    if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });

    var tries = 0;
    var timer = setInterval(function () {
      var el = findBox();
      if (el) {
        clearInterval(timer);
        fill(el);
        return;
      }
      if (++tries > 40) {          // 约 6 秒还没出来
        clearInterval(timer);
        try {
          navigator.clipboard.writeText(text);
          window.alert('评论区加载较慢，模板已复制到剪贴板，直接粘贴到评论框即可。');
        } catch (e) {
          window.alert('评论区加载失败，请刷新页面后重试。');
        }
      }
    }, 150);
  }
};

/* ---------------------------------------------------------------------------
 * 离开友人帐时清掉「模板草稿」
 * Twikoo 的草稿存在 localStorage 的 twikoo-draft 里（纯字符串，全局唯一一个键，
 * 不分页面），所以点了快速申请再切到留言板/文章页，模板会跟着跑过去。
 * 这里只在离开本页时、且草稿确实是我们的模板（开头能对上）才清，不动用户自己写的内容。
 * ------------------------------------------------------------------------- */
(function () {
  function isTemplate(s) {
    return s.indexOf('```yml') === 0 || s.indexOf('站点名称：') === 0;
  }
  function clearTemplateDraft() {
    try {
      var d = localStorage.getItem('twikoo-draft');
      if (d && isTemplate(d)) localStorage.removeItem('twikoo-draft');
    } catch (e) {}
  }
  window.addEventListener('pagehide', clearTemplateDraft);
  window.addEventListener('beforeunload', clearTemplateDraft);
  // 主题走 pjax：站内跳转不会触发 pagehide，要单独听这两个事件
  document.addEventListener('pjax:send', clearTemplateDraft);
  document.addEventListener('pjax:click', clearTemplateDraft);
})();
