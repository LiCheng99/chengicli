# 萤火虫微光（默认关闭）

用户确认试加一种氛围效果。使用低密度暖金/深粉红色微光作为下方近景，保留已有远景星空、霓虹与雪花。仅站点注入层，不改主题源文件，不添加依赖，不提交推送部署。

## 实现
- `fireflies.js` 独立幂等模块，导出 FOMAL_FIREFLIES.setEnabled/refresh/syncControls；CSS 微光呼吸与慢漂，无 RAF、canvas、定时器轮询。
- 默认关闭，不创建节点；桌面 14 个、<=600px 8 个，底部 44vh，负层级位于正文卡片后，pointer-events:none。
- 开启萤火虫关闭雪花；开启雪花关闭萤火虫。勾选及保存同步。页面恢复/PJAX/resize 不重复监听或图层。
- 后台、pagehide、减少动态偏好暂停，恢复后继续；关闭删除节点，减少动态保留用户偏好；storage 异常使用内存回退。
- global reset 默认关闭，CSS/settings/new module 版本 fireflies1，既有字体/背景模块版本不动。

## 验证计划
真实模块 VM 验证默认值、节点数量、storage异常/移除/跨页、互斥、暂停、重置及集成。node --check、全套 node tests、git diff --check、hexo generate。Chrome 8ca07e26/noFocus 独立AgentWindow验证实际效果、开关、雪花互斥、保存、手机、默认恢复；结束后关闭预览。

## 验证结果
- 两个修改 JS 语法通过；全套 354/354 测试通过，萤火虫独立测试 35/35，git diff --check 通过；Hexo 187 files generated，只有既有 CRLF/store-dir 警告。
- 独立 Chrome 8ca07e26、btnw、18086 预览：桌面夜间下方金/深粉红色光点及浅色手机 375x667 实际可见；手机开关竖排无溢出。
- 真实开关验证默认关闭、开启雪花会关微光、开启微光会关雪花、刷新后保存、全局恢复默认关微光。后台/减少动态/PJAX/storage异常与清理通过真实模块 VM 可控事件验证，不假称全部外部浏览器模拟。
- 浏览器截图由工具直接展示；工具临时 screenshot 路径已不存在，未生成可下载图片文件（尝试复制失败，测试结果不受影响）。
- 不提交、推送或部署。验收后关闭临时浏览器与服务。

## 回滚
将 bak/20261010-fireflies/before/ 中五个备份（config/settings/css/theme-color.test.cjs/beauty-switches.test.cjs）恢复到对应位置；移除新模块、萤火虫测试和本计划，再生成。备份保留本任务前全部未提交修改，不用 git reset 覆盖。
