'use strict';
/**
 * deploy-json.js —— 生成 /deploy.json（站点「最近一次部署时间」）
 *
 * 为什么需要：
 *   source/js/inject/webinfo-card.js 会 fetch 同源的 /deploy.json，取里面的 at
 *   作为「小站资讯卡 → 时间条 → 更新」那一格的真实值；拿不到就用模板渲染时的
 *   构建时刻（data-deploy-build）兜底。
 *   这个文件原本设计成由部署工作流在 generate 之后写进 public/，但本项目没有
 *   .github/workflows（部署走 vercel），所以 public/deploy.json 从来不存在：
 *   本地预览和线上每次都会打一个 404，DevTools 控制台留一条红字。
 *
 * 做法：挂在 generator 上，hexo generate / hexo server 每次构建都产出一份，
 *   内容就是本次构建时刻 —— 语义上正好等于「这次构建/部署的时间」。
 *   线上是构建产物，所以 at 就是那次部署的时刻；本地 server 下则是服务启动或
 *   最近一次文件变动触发的构建时刻，都是合理值。
 *
 * 注意：
 *   1. public/ 在 .gitignore 里，生成的 deploy.json 不会进版本库，没有提交噪音。
 *   2. 前端有 10 分钟 localStorage 缓存（wi-deploy-at），不会每页都请求。
 *   3. 卸载：删掉本文件 + 删 public/deploy.json 即可，卡片会自动回落到兜底值。
 */

hexo.extend.generator.register('deploy_json', function (locals) {
  return {
    path: 'deploy.json',
    data: JSON.stringify({
      at: new Date().toISOString(),   // ISO 8601 (UTC)，前端 Date.parse 直接用
      source: 'hexo-generator',
      version: (hexo.env && hexo.env.version) || ''
    })
  };
});
