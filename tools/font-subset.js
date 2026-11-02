// 把三款「免费商用近似体」裁成本站实际用到的字，输出到 source/fonts/ 自托管。
// 为什么要有这个脚本：原来的装饰字体托管在 data-static.netdun.net（域名已失效），
// 换成 Google Fonts 的开源字体后整库 1.5~8 MB，直接放站里太重，裁到 1200 多个字只有几百 KB。
//
// 用法（新增大量生僻字后重新跑一次）：
//   npm i --no-save subset-font        # 只在本地装，不进 package.json
//   node tools/font-subset.js          # 自动扫描 public/ 里出现过的汉字
// 字体原文件放在 tools/fonts-src/，或用 TTF_DIR 指定目录。
const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const subsetFont = require('subset-font');

const TTF_DIR = process.env.TTF_DIR || path.join(cwd, 'tools', 'fonts-src');
const OUT = path.join(cwd, 'source', 'fonts');

const JOBS = [
  // 站内 family 名 → Google Fonts 开源字体（SIL OFL 1.1）
  { ttf: 'ZCOOLQingKeHuangYou-Regular.ttf', out: 'round-substitute.woff2' }, // 接 ZhuZiAWan · 圆体
  { ttf: 'ZCOOLXiaoWei-Regular.ttf', out: 'script-substitute.woff2' },       // 接 HYTMR · 书写体
  { ttf: 'ZCOOLKuaiLe-Regular.ttf', out: 'poster-substitute.woff2' }         // 接 TTQHB · 海报体
];

// 1) 扫 public/ 里所有可见汉字（脚本/样式里的字不算）
function collectChars() {
  const set = new Set();
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, name.name);
      if (name.isDirectory()) walk(p);
      else if (name.name.endsWith('.html')) {
        const s = fs.readFileSync(p, 'utf8')
          .replace(/<script[\s\S]*?<\/script>/g, '')
          .replace(/<style[\s\S]*?<\/style>/g, '');
        for (const ch of s) {
          const o = ch.codePointAt(0);
          if (o >= 0x4e00 && o <= 0x9fff) set.add(ch);
        }
      }
    }
  };
  walk(path.join(cwd, 'public'));
  return set;
}

const chars = collectChars();
// 2) 补上 ASCII 与中英标点：标题里混排的字母数字也要同一套字形
let text = Array.from(chars).join('');
for (let c = 0x20; c <= 0x7e; c++) text += String.fromCharCode(c);
for (let c = 0x3000; c <= 0x303f; c++) text += String.fromCharCode(c);
for (let c = 0xff01; c <= 0xff65; c++) text += String.fromCharCode(c);
text += '·—…‘’“”';
text = Array.from(new Set(Array.from(text))).join('');

(async () => {
  if (!chars.size) {
    console.error('public/ 里没扫到汉字，先跑 hexo generate');
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  console.log('汉字 %d 个，合计字符 %d 个', chars.size, text.length);
  for (const job of JOBS) {
    const src = path.join(TTF_DIR, job.ttf);
    if (!fs.existsSync(src)) {
      console.error('缺少原字体：%s', src);
      process.exit(1);
    }
    const out = await subsetFont(fs.readFileSync(src), text, { targetFormat: 'woff2' });
    fs.writeFileSync(path.join(OUT, job.out), out);
    console.log('%s → %s KB', job.out, Math.round(out.length / 1024));
  }
})();
