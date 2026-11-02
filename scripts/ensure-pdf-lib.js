// ensure-pdf-lib.js
// ============================================================
// 根治「PDF 预览框图纸加载失败」的本地/线上截断问题。
//
// 现象：pdf.min.js / pdf.worker.min.js 是大文件（约 340KB / 1.3MB），
//   hexo 在把 source 复制到 route（hexo s 真正 serve 的来源）或 public
//   （部署目录）时，若恰好被百度同步盘 / 杀毒软件并发读写干扰，会读到
//   不完整的文件，结果 serve 出去的是被截断的版本 → 浏览器加载 ES Module
//   失败 → 预览框走「图纸加载失败」兜底。且一旦截断，hexo 增量生成认为
//   source 未变就不会重新复制，于是长期坏下去。
//
// 对策：在 generate 完成后，用 fs 直接从 source 读「完整」内容，强制覆盖
//   public 磁盘文件与 route，保证最终 serve 的一定是全量文件。
//   对 `hexo g`、`hexo s` 同时生效；配合 gulpfile 里的 ensure-pdf-lib 任务
//   （部署路径再保险），本地预览与线上部署都不会再被截断。
// ============================================================
const fs = require('fs');
const path = require('path');

hexo.extend.filter.register('after_generate', function () {
  const pairs = [
    ['source/js/lib/pdf/pdf.min.js', 'js/lib/pdf/pdf.min.js'],
    ['source/js/lib/pdf/pdf.worker.min.js', 'js/lib/pdf/pdf.worker.min.js']
  ];
  pairs.forEach(function (p) {
    const src = path.join(hexo.base_dir, p[0]);
    if (!fs.existsSync(src)) return;
    let buf;
    try {
      buf = fs.readFileSync(src);
    } catch (e) {
      hexo.log.warn('[ensure-pdf-lib] 读取 ' + p[0] + ' 失败：' + e.message);
      return;
    }
    if (!buf || buf.length < 100000) {
      // 防呆：若 source 本身被同步盘截断（极小概率），不要拿坏内容覆盖
      hexo.log.warn('[ensure-pdf-lib] ' + p[0] + ' 体积异常(' + (buf ? buf.length : 0) + 'B)，跳过，避免覆盖成坏文件');
      return;
    }
    // 1) 覆盖磁盘 public（防止被截断的版本遗留在部署目录）
    const out = path.join(hexo.public_dir, p[1]);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
    // 2) 覆盖 route（hexo s / 部署真正 serve 的内容）
    hexo.route.set(p[1], buf);
    hexo.log.info('[ensure-pdf-lib] 已确保 ' + p[1] + ' 完整 (' + buf.length + ' 字节)');
  });
});
