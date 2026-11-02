'use strict';
/**
 * noindex-secret.js —— 给加密文章的 HTML 自动加 <meta name="robots" content="noindex">
 *
 * 为什么需要：robots.txt 只能禁止搜索引擎抓取「文件」，但如果别人已经把文章
 * URL 交给了搜索引擎，页面本身还是可能被收录。noindex 是更直接的"别收录我"。
 *
 * 判断依据：hexo-blog-encrypt 生成的页面里一定有 id="hexo-blog-encrypt"，
 * 普通文章没有，不会误伤。
 *
 * 卸载：删除本文件即可。
 */

hexo.extend.filter.register('after_render:html', function (html) {
  if (html.indexOf('hexo-blog-encrypt') === -1) return html;
  if (html.indexOf('name="robots"') !== -1) return html; // 已有 robots 标签，别重复加
  return html.replace(/<head([^>]*)>/i, '<head$1><meta name="robots" content="noindex, nofollow">');
});
