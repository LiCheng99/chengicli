# External-link —— 站点外部静态资源（自托管副本）

本目录是**外链本地化**的落地位置：原来从 npmmirror / elemecdn / jsdelivr / baomitu /
picsum / alicdn 等第三方加载的文件，全部下载到这里，由自己的域名提供。

> 目的：**不再依赖任何第三方 CDN**。这些文件在网络上的存亡与本站无关，
> 唯一能弄坏它们的操作就是你自己删除或改名。

## 现状（2026-10-31 完成）

构建产物 `public/**/*.html` 里**已经没有任何第三方资源请求**，只剩：

| 仍然外部的 | 类型 | 为什么 |
|---|---|---|
| `sdk.51.la` | 统计脚本 | 统计要回连服务端；想彻底不连就删掉 `inject.bottom` 里那两行与 `/js/51la.js` |
| 一言 `v1.hitokoto.cn`、IP 定位、QQ 音乐、DeepSeek | 动态接口 | 数据本身在别人服务器，搬不走；已按「超时 + 兜底」处理 |
| 文章正文外链、友链、导航站 | 超链接 | 是链接不是资源，不影响页面加载 |

实测结果：图片 / 脚本 / 样式 / 字体 **0 个外部请求**；`/External-link` 引用 **0 个缺失**；
`hexo generate` 与 `hexo server` 两条路径都返回 200（含 `.woff2` 的 `font/woff2` MIME）。
## 目录结构

| 目录 | 文件数 | 体积 |
|---|---|---|
| `audio/` | 1 | 0.11 MB |
| `css/` | 410 | 23.97 MB |
| `img/` | 123 | 15.71 MB |
| `js/` | 23 | 6.16 MB |
| `json/` | 3 | 0.01 MB |

```
External-link/
├── _manifest.json        下载清单（原始 URL + 大小 + sha256 前 16 位）
├── README.md             本文件（不会发布到站点）
├── js/                   脚本：jquery 除外（jquery 用站内已有的 /js/jquery.min.js）
│   ├── iconfont/         阿里 iconfont 的 4 个图标库（原 //at.alicdn.com）
│   ├── mathjax/          MathJax tex-svg.js（SVG 输出，不需要额外字体文件）
│   └── ...
├── css/
│   ├── fontawesome/      all.min.css + webfonts/（相对路径 ../webfonts/ 不能拆）
│   └── lxgw/             霞鹜文楷 CSS + files/（./files/*.woff2 相对引用，不能拆）
├── img/
│   ├── cover/            24 张默认封面池（原 picsum 252 条随机直链）
│   ├── bg/               背景图库（原 picsum seed / id 直链）
│   ├── badge/            页脚徽章（原 hexo.io / butterfly.js.org / api.zxki.cn）
│   ├── link/             友链头像与站点截图（原 picsum / fomal.cc）
│   └── reward/           打赏二维码（功能当前关闭）
├── json/holiday/         节假日数据 2025–2027（未知年份仍会回落到远端）
├── audio/aowu.m4a        打赏金币音效（功能当前关闭）
└── img/festival/         春节卡片背景 + 雪花贴图（原素材已 404，现为本地生成）
```

## 它怎么被发布出去

Hexo 只发布 `source/` 下的文件，根目录的 `External-link/` 默认不会被复制。
所以仓库里有 `scripts/external-assets.js`：一个 Hexo 生成器，把本目录映射到
`/External-link/...`。

- `hexo server`：走路由，改文件后刷新即可（不用重启）；
- `hexo generate`：写进 `public/External-link/...`；
- 以 `_` 开头的文件和 `README.md` 不会发布。

## 引用位置（改了要一起改）

| 配置 / 文件 | 用到的资源 |
|---|---|
| `_config.fomalhaut.yml` → `CDN.option` | algolia、instantsearch、pjax、mathjax、lazyload、instantpage、typed、fancybox、fontawesome、aplayer、meting |
| `_config.fomalhaut.yml` → `tag_plugins.CDN` / `wowjs` | tag_plugins、wow、animate、图标动画 |
| `_config.fomalhaut.yml` → `inject.head` / `inject.bottom` | 霞鹜文楷 CSS、clipboard、pace、4 个 iconfont |
| `_config.fomalhaut.yml` → `cover.default_cover` | 24 张封面 |
| `themes/fomalhaut/layout/includes/footer.pug` | 页脚 3 张徽章 |
| `source/js/modules/settings.js`、`appearance-backgrounds.js` | 背景图库与默认背景 |
| `source/_data/link.yml` | 友链头像 / 截图 |
| `source/js/data/holidays.js` | 节假日 JSON（本地优先 + 远端兜底） |

## 更新某个库

1. 用新版本覆盖对应文件（保持**文件名和路径不变**，尤其是 `fontawesome/webfonts/`、
   `lxgw/files/` 这种相对引用目录的整体性）；
2. 更新 `_manifest.json` 里的 `source` 与 `sha256`；
3. `hexo clean; hexo generate`，再按下方命令自检。

## 自检

```powershell
# 1) 构建产物里不应再出现这些域名
Get-ChildItem public -Recurse -Filter *.html |
  Select-String -Pattern 'registry\.npmmirror|npm\.elemecdn|lib\.baomitu|cdn\.jsdelivr|picsum\.photos|at\.alicdn|api\.zxki'

# 2) 本目录每个文件都应在 public/External-link 下有一份
$missing = Get-ChildItem External-link -Recurse -File |
  Where-Object { $_.Name -notlike '_*' -and $_.Name -ne 'README.md' } |
  Where-Object { -not (Test-Path (Join-Path 'public/External-link' $_.FullName.Substring((Resolve-Path 'External-link').Path.Length + 1))) }
$missing | Select-Object -First 10 FullName
"missing: $($missing.Count)"
```

## 注意

- **文件名大小写不要改**：Windows 本地不区分，Vercel（Linux）区分。
- `gulpfile.js` 会对 `public/**/*.js`、`*.css` 做二次压缩——本目录里 `*.min.js` 会被跳过，
  其余（如 `fancybox.umd.js`、`issues.js`、`wow_init.js`）会被 terser 再压一次，属正常。
- 许可证：FontAwesome（CC BY 4.0 / MIT / SIL OFL）、霞鹜文楷（SIL OFL）、jQuery（MIT）、
  各库原始 LICENSE 随包，勿删。
