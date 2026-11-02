'use strict';
/**
 * external-assets.js —— 把仓库根目录的 External-link/ 发布到 /External-link/ 下
 *
 * 背景：Hexo 只发布 source/ 里的文件，根目录的 External-link/ 默认不会进 public/，
 * 页面里写 /External-link/xxx 会 404（local server 也一样）。
 * 这里注册一个生成器，把整棵目录按原结构注册成路由：
 *   hexo generate  → 写进 public/External-link/...
 *   hexo server    → 直接从路由读，无需等构建
 *
 * 目录里以 _ 开头的文件/目录（如 _manifest.json）和 README.md 不发布。
 * 改文件后不需要重启 server（每次请求现读）；但 hexo generate 需要重跑。
 */

const fs = require('fs');
const path = require('path');

const PREFIX = 'External-link/';

function walk(dir, base) {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('_') || entry.name === 'README.md') continue;
    const abs = path.join(dir, entry.name);
    const rel = base ? base + '/' + entry.name : entry.name;
    if (entry.isDirectory()) {
      out.push(...walk(abs, rel));
    } else if (entry.isFile()) {
      out.push({ abs, rel });
    }
  }
  return out;
}

hexo.extend.generator.register('external_link_assets', function () {
  const root = path.join(hexo.base_dir, 'External-link');
  const files = walk(root, '');
  if (this && typeof this.log === 'object') {
    // 静默：避免每次 generate 刷屏，出问题再看数量
  }
  return files.map(function (f) {
    return {
      path: PREFIX + f.rel,
      data: function () {
        return fs.createReadStream(f.abs);
      },
    };
  });
});
