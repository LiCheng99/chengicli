# 自定义主题色 Implementation Plan

**Goal:** 美化设置增加五彩渐变自定义色圈，打开原生取色器；适度放大色圈，不改变任何预设色值。

**Architecture:** 沿用站点注入的 settings.js 与 site-inject.css，不改 themes/。themeColor 保存预设键或 custom，themeCustomColor 保存经过严格校验的六位 HEX。转换 RGB 后继续使用既有 setColor 派生透明色、鼠标刷新和 GitCalendarRefresh；beauty-boot 在首帧恢复 custom。

**Tech Stack:** 原生 HTML color input / radio、CSS conic-gradient、localStorage、Node test / vm、Hexo。

## 方案
推荐原生调色板：无依赖、支持键盘、浏览器负责取色。自制 HSV 弹层更统一但维护/可访问性成本偏高；仅 HEX 文本输入不够直观。色圈视觉直径 24px，点击区域 44px，环宽 3px；桌面和窄窗按面板实际宽度自动换行。选中自定义时彩虹环中间显示当前色，预设的名称和颜色不变。

## Task 1: 备份与回归测试
- 备份 source/js/modules/settings.js、source/js/inject/beauty-boot.js、source/css/site-inject.css 到 bak/20261010-custom-theme-color/before/，保留任务开始时未提交改动。
- 创建 tools/tests/theme-color.test.cjs：真实函数 VM 测试预设、自定义、透明色、鼠标刷新、无效值、保存恢复、重置、面板同步和首屏 boot。
- node --test tools/tests/theme-color.test.cjs，先确认新增行为尚未实现。

## Task 2: 功能与样式
- source/js/modules/settings.js: initItem() 设 custom 默认值；setColor() 校验并解析 RGB；添加 setCustomColor()/syncThemeColorControls()/themeColorMarkup()；createWinbox() 插入新标记和同步。
- source/js/inject/beauty-boot.js: 严格校验 custom HEX；无效键回落 green，禁止拼接不可信颜色到样式。
- source/css/site-inject.css: 24px 色圈、44px 热区、五彩静态渐变环、焦点/选中状态、自动换行；不改变预设 RGB。

## Task 3: 验证
- node --test tools/tests/*.test.cjs，node --check 两个 JS，git diff --check。
- npx hexo generate；临时 Hexo server 预览；Chrome 独立 Agent Window 验证预设切换、自定义变更、刷新恢复、重置、窄窗和深浅模式。原生 picker 若自动化无法操作，单独声明验证边界，不伪称通过。
- 不 commit/push，不动既有未提交改动；结束临时服务器和 Agent Window。

## 验证结果
- 两个 JS 的 node --check 通过；全部 Node 测试 250/250（新增主题色测试 94/94），git diff --check 通过。
- npx hexo generate 成功。Chrome Agent Window 实测预设切换、刷新仍保留紫罗兰、恢复默认深粉红色、深/浅色显示和窄窗自动换行；实际 color label 热区 44×44px。
- 原生 color picker 的浏览器弹窗不属于网页 DOM，BrowserSkill fill 不支持 color 类型；未完成原生弹窗中的端到端选色手工测试，须用户复核。自定义值更新/保存/首帧恢复/鼠标与透明衍生色由真实函数 VM 回归验证。
- 未修改任何预设 RGB 和 themes/ 源码，没有提交或推送。

## 回滚
仅把 bak/20261010-custom-theme-color/before/ 下三份文件复制回对应位置，再 hexo generate。此次新增计划和测试文件可独立移除。
