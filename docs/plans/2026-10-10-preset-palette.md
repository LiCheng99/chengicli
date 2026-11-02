# 十色预设色板 Implementation Plan

**Goal:** 将用户确认的十色候选设为美化面板预设，保留四个原色与自定义圈。

**Architecture:** 在站点注入文件更新既有 RGB map、首屏 cmap 和 CSS 变量，不碰 themes/ 源码。保留现存十个 id，删除三个旧选项；旧保存键 purple→purepurple、gray/black→darkblue，在首屏、鼠标初始化与设置保存保持一致。自定义 HEX 不迁移、不丢失。

**Tech Stack:** 原生 JS/CSS/localStorage、Hexo、Node VM 测试与 Chrome Agent Window。

## 色板
- Deep pink 深粉红色 #FF1493（保留）
- red 珊瑚红 #EF5A5A（保留）
- purepurple 紫罗兰 #935ACD（保留）
- pink 樱花粉 #ED709B（保留）
- orange 暖杏橙 #D7924D
- yellow 蜂蜜金 #C4A64A
- puregreen 玉石绿 #4DAF87
- blue 晴空蓝 #4A9CC7
- heoblue 柔靛蓝 #5274CF
- darkblue 雾蓝灰 #71859C

## 实施
1. 备份 _config.fomalhaut.yml、source/js/modules/{settings,cursor}.js、source/js/inject/beauty-boot.js、source/css/site-inject.css、tools/tests/theme-color.test.cjs 至 bak/20261010-preset-palette/before/。
2. settings.js 更新十个名称及 radio列表，setColor调用 normalizeThemePreset；cursor.js 十项 map+迁移函数，Cursor初始化取规范key；boot独立同规则，在初始化前处理旧key。
3. site-inject.css 用 :root 覆盖六个新色对应 --color-*；原有四项值不变。彩虹圈保持原全色相渐变（不是预设色板）。更新四项资源URL版本，保证新CSS/JS一起加载。
4. tools/tests/theme-color.test.cjs 更新独立十色 oracle、四原色不变、十项markup、旧键迁移/首帧/鼠标/自定义保留/CSS变量与资源cache版本回归。
5. node --check JS；node --test tools/tests/*.test.cjs；git diff --check；npx hexo generate；独立Chrome Agent Window验证10色+彩虹、切换/刷新/深浅/窄窗，结束服务会话。

## 验证结果
- 三个 JS node --check 通过，完整测试 275/275，其中主题色 119/119；git diff --check 通过。
- npx hexo generate 成功（188 files generated）。
- Chrome 8ca07e26 独立后台 Agent Window：真实十个radio逐一切换且对应名称/选中状态同步；蜂蜜金刷新后保留；深浅模式颜色可见，375px手机宽度自动6+5换行，无横向溢出；恢复默认重新选中深粉红色。
- 旧键迁移/首屏/cursor SVG/CSS变量/资源版本/四原色不变由独立oracle及真实函数VM回归验证。原生自定义picker未改，此次只验证保留其控件及既有逻辑回归。
- 额外备份并更新 tools/tests/cursor-effects.test.cjs 的旧蓝色SVG断言，其余已有改动保持。未改 themes/ 源码，没有commit/push/deploy。

## 回滚
复制 bak/20261010-preset-palette/before/ 中七个文件至原位置，再 hexo generate。保留任务开始时已有改动，不提交或推送。
