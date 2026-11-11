/* 字体选择器：与 settings.js 的同步 setter 分离；只加载当前选择的字体。 */
/* 默认正文 = 霞鹜文楷**屏幕阅读版**（'LXGW WenKai Screen'，GB 简体字集分片版）。
   'LXGWScreen' 已删：全站没有任何 @font-face 声明它，点「恢复字体默认」会把 --global-font
   写成一个不存在的名字 → 整站掉回系统字体（这也是「全站字体不一」的来源之一）。
   10-29 补记：装饰三款（筑紫A丸 / 汉仪唐美人 / 甜甜圈海报）原本指向 data-static.netdun.net，
   那个域名已经失效（DNS 都解析不到），所以它们一直是「点了没反应」。现在改为站内自托管
   source/fonts/*-substitute.woff2（Google Fonts 开源字体裁子集，family 名沿用原来的），
   见 themes/chengic/source/css/_custom/custom.css 的 @font-face 段。 */
var APPEARANCE_TEXT_FONTS = [
  ['LXGW WenKai Screen', '霞鹜文楷Screen', '屏幕阅读 · 默认', 'reading'],
  ['LXGWNeoXiHei', '霞鹜新晰黑', '清晰黑体 · 技术文章', 'reading'],
  ['SourceHanSerif', '思源宋体', '书卷气 · 随笔', 'reading'],
  ['default', '系统默认', '无需下载 · 跟随设备', 'reading'],
  ['ZhuZiAWan', '筑紫A丸', '圆润可爱 · 短句', 'decorative'],
  ['HYTMR', '汉仪唐美人', '个性书写 · 标题', 'decorative'],
  ['TTQHB', '甜甜圈海报', '装饰字体 · 标题', 'decorative']
];
/* 代码字体（10-29 与 settings.js 的 CODE_FONT_LIST 对齐）。
   原来这里是 Monaco_1/Consolas_1/MapleMono_1/Hack_1 四个**系统**字体，而 settings.js 的白名单却是
   JetBrainsMono/FiraCode/SourceCodePro 三个**webfont** —— 两份名单没有任何交集，后果是：
   面板永远显示「当前 · 默认字体」、没有一项高亮；在面板里选什么都存不进去（重载就被白名单改回 JetBrainsMono）。
   现在两份名单合在一起，默认仍是 JetBrains Mono（webfont，任何机器都一定有）。 */
var APPEARANCE_CODE_FONTS = [
  ['JetBrainsMono', 'JetBrains Mono', '等宽 · 默认'],
  ['FiraCode', 'Fira Code', '等宽 · 连字'],
  ['SourceCodePro', 'Source Code Pro', '等宽 · 紧凑'],
  ['Consolas_1', 'Consolas', '系统 · 清晰'],
  ['Monaco_1', 'Monaco', '系统 · 经典'],
  ['MapleMono_1', 'Maple Mono', '系统 · 圆润'],
  ['Hack_1', 'Hack', '系统 · 辨识度']
];
var appearanceFontStates = { text: { seq: 0, cancel: null }, code: { seq: 0, cancel: null } };
var APPEARANCE_FONT_TIMEOUT = 12000;
function appearanceFontList(kind) { return kind === 'code' ? APPEARANCE_CODE_FONTS : APPEARANCE_TEXT_FONTS; }
function appearanceFontKey(kind) { return kind === 'code' ? 'codeFont' : 'font'; }
function appearanceFontFamily(key) {
  return key === 'default' ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Lato, Roboto, 'PingFang SC', 'Microsoft JhengHei', 'Microsoft YaHei', sans-serif" : '"' + key + '", system-ui, sans-serif';
}
function appearanceFontStatus(kind, message, error) {
  var el = document.getElementById('ap-' + kind + '-status');
  if (el) { el.textContent = message; el.dataset.state = error ? 'error' : 'ready'; }
}
function syncAppearanceFonts() {
  ['text', 'code'].forEach(function(kind) {
    var selected = localStorage.getItem(appearanceFontKey(kind));
    var item = appearanceFontList(kind).find(function(f) { return f[0] === selected; });
    appearanceFontList(kind).forEach(function(f) {
      var el = document.getElementById((kind === 'code' ? 'swfc_' : 'swf_') + f[0]);
      if (el) el.setAttribute('aria-pressed', String(selected === f[0]));
    });
    var current = document.getElementById('ap-' + kind + '-current');
    if (current) current.textContent = '当前 · ' + (item ? item[1] : '默认字体');
    var preview = document.getElementById('ap-' + kind + '-preview');
    if (preview && item) preview.style.fontFamily = appearanceFontFamily(selected);
  });
}
function initAppearanceFonts() {
  syncAppearanceFonts();
  ['text', 'code'].forEach(function(kind) {
    appearanceFontStatus(kind, appearanceFontStates[kind].cancel ? '字体加载中，当前字体保持不变…' : '点击选项加载并应用，自动保存；失败时可重新点击重试。');
  });
}
function cancelAppearanceFont(kind) {
  var state = appearanceFontStates[kind];
  state.seq++;
  if (state.cancel) state.cancel();
}
function cancelAppearanceFonts() { cancelAppearanceFont('text'); cancelAppearanceFont('code'); }
function chooseAppearanceFont(key, kind) {
  if (typeof kind === 'undefined') kind = 'text';
  if (kind !== 'text' && kind !== 'code') return Promise.resolve(false);
  var item = appearanceFontList(kind).find(function(f) { return f[0] === key; });
  if (!item) return Promise.resolve(false);
  cancelAppearanceFont(kind);
  var state = appearanceFontStates[kind], seq = state.seq;
  function apply() {
    if (state.seq !== seq) return false;
    if (kind === 'code') setCodeFont(key); else setFont(key);
    syncAppearanceFonts();
    appearanceFontStatus(kind, item[1] + '已应用，自动保存。');
    return true;
  }
  if (key === localStorage.getItem(appearanceFontKey(kind)) || key === 'default') return Promise.resolve(apply());
  if (!document.fonts || typeof document.fonts.load !== 'function') {
    appearanceFontStatus(kind, '此浏览器无法确认字体加载，已保留当前字体；可选择系统默认。', true);
    return Promise.resolve(false);
  }
  appearanceFontStatus(kind, '正在加载 ' + item[1] + '，当前字体保持不变…');
  return new Promise(function(resolve) {
    var settled = false, timer;
    function finish(ok, message) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (state.cancel === cancel) state.cancel = null;
      if (state.seq !== seq) { resolve(false); return; }
      if (ok) resolve(apply());
      else { if (message) appearanceFontStatus(kind, message, true); resolve(false); }
    }
    function cancel() { finish(false, ''); }
    state.cancel = cancel;
    timer = setTimeout(function() { finish(false, '字体加载超时，已保留当前字体；点击同一选项可重试。'); }, APPEARANCE_FONT_TIMEOUT);
    var sample = kind === 'code' ? 'const value = 0; // 0O 1lI {} [] () => 中文' : '清风翻书，阅读让世界更清晰。 Abc 0123456789';
    try {
      Promise.resolve(document.fonts.load('16px "' + key + '"', sample)).then(function(faces) {
        finish(!!faces && faces.length > 0, '字体未能加载，已保留当前字体；点击同一选项可重试。');
      }, function() { finish(false, '字体加载失败，已保留当前字体；点击同一选项可重试。'); });
    } catch (err) { finish(false, '字体加载失败，已保留当前字体；点击同一选项可重试。'); }
  });
}
function resetAppearanceFonts() {
  cancelAppearanceFonts();
  setFont('LXGW WenKai Screen');   // 10-29：原来写 'LXGWScreen'（不存在），一点就整站掉回系统字体
  setCodeFont('JetBrainsMono');    // 10-29：原来恢复成 'Monaco_1'，Windows 上没装 Monaco 就等于把代码字体清空
  initAppearanceFonts();
  appearanceFontStatus('text', '已恢复霞鹜文楷Screen，仅重置字体。');
  appearanceFontStatus('code', '已恢复 JetBrains Mono，不影响背景、主题色及其他偏好。');
}
function appearanceFontOptions(items, kind) {
  return items.map(function(f) {
    var prefix = kind === 'code' ? 'swfc_' : 'swf_';
    return '<button type="button" class="ap-font-option" id="' + prefix + f[0] + '" data-font-kind="' + kind + '" aria-pressed="false" onclick="chooseAppearanceFont(&quot;' + f[0] + '&quot;,&quot;' + kind + '&quot;)"><span class="ap-font-name">' + f[1] + '</span><small>' + f[2] + '</small><span class="ap-check" aria-hidden="true">✓</span></button>';
  }).join('');
}
function appearanceFontMarkup() {
  return '<section class="ap-panel ap-font-panel" aria-label="字体选择">' +
    '<div class="ap-section-head"><div><p class="ap-eyebrow">阅读的声音</p><p class="ap-hint">先看同一段文字，再选喜欢的字体；预览区随当前选择更新。</p></div><button type="button" class="ap-btn" onclick="resetAppearanceFonts()">恢复字体默认</button></div>' +
    '<h3 class="ap-subtitle">阅读优先</h3><div id="swfs" class="ap-font-grid">' + appearanceFontOptions(APPEARANCE_TEXT_FONTS.filter(function(f) { return f[3] === 'reading'; }), 'text') + '</div>' +
    // 装饰字体：只有列表里真有 decorative 项才渲染这块折叠区（10-29 曾清空过一次，现在三项已接站内字体文件，故恢复）
    (APPEARANCE_TEXT_FONTS.some(function(f) { return f[3] === 'decorative'; })
      ? '<details class="ap-details"><summary>个性装饰 · 更适合标题与短句</summary><div class="ap-font-grid">' + appearanceFontOptions(APPEARANCE_TEXT_FONTS.filter(function(f) { return f[3] === 'decorative'; }), 'text') + '</div></details>'
      : '') +
    '<div class="ap-preview"><p id="ap-text-current" class="ap-current"></p><p id="ap-text-preview" class="ap-text-sample">清风翻书，阅读让世界更清晰。<br>每一次停顿，都让文字有了呼吸。<br>Abc · 0123456789</p></div><p id="ap-text-status" class="ap-status" role="status" aria-live="polite"></p>' +
    '<h3 class="ap-subtitle">代码字体</h3><div id="swfs_code" class="ap-font-grid ap-code-grid">' + appearanceFontOptions(APPEARANCE_CODE_FONTS, 'code') + '</div>' +
    '<div class="ap-preview"><p id="ap-code-current" class="ap-current"></p><pre id="ap-code-preview" class="ap-code-sample">const greeting = "Hello, 世界";\n// 字形对比：0O · 1lI · {} [] ()\nconst values = [0, 1, 10];\nvalues.map(value =&gt; value + 1);</pre></div><p id="ap-code-status" class="ap-status" role="status" aria-live="polite"></p>' +
    // 文字颜色（2026-11-02：从「一、显示偏好」搬到这儿 —— 选字体和选字色本就是一件事）
    '<h3 class="ap-subtitle">文字颜色</h3>' +
    '<p class="ap-hint">点色环换色，会同步到全站文字；深色模式自动提亮。代码块与按钮保持原色。</p>' +
    '<div class="fc-row ap-fc-row">' +
    '<button type="button" class="fc-dot" data-fc="#1f1f1f" style="--fc:#1f1f1f" title="墨黑" aria-label="墨黑" onclick="setFontColor(&quot;#1f1f1f&quot;,true)"></button>' +
    '<button type="button" class="fc-dot" data-fc="#4c4948" style="--fc:#4c4948" title="深灰" aria-label="深灰" onclick="setFontColor(&quot;#4c4948&quot;,true)"></button>' +
    '<button type="button" class="fc-dot" data-fc="#5b6cff" style="--fc:#5b6cff" title="靛蓝" aria-label="靛蓝" onclick="setFontColor(&quot;#5b6cff&quot;,true)"></button>' +
    '<button type="button" class="fc-dot" data-fc="#1e88e5" style="--fc:#1e88e5" title="天蓝" aria-label="天蓝" onclick="setFontColor(&quot;#1e88e5&quot;,true)"></button>' +
    '<button type="button" class="fc-dot" data-fc="#0f9d58" style="--fc:#0f9d58" title="森绿" aria-label="森绿" onclick="setFontColor(&quot;#0f9d58&quot;,true)"></button>' +
    '<button type="button" class="fc-dot" data-fc="#f57c00" style="--fc:#f57c00" title="橙" aria-label="橙" onclick="setFontColor(&quot;#f57c00&quot;,true)"></button>' +
    '<button type="button" class="fc-dot" data-fc="#d81b60" style="--fc:#d81b60" title="玫红" aria-label="玫红" onclick="setFontColor(&quot;#d81b60&quot;,true)"></button>' +
    '<button type="button" class="fc-dot" data-fc="#7b1fa2" style="--fc:#7b1fa2" title="紫" aria-label="紫" onclick="setFontColor(&quot;#7b1fa2&quot;,true)"></button>' +
    '<label class="fc-dot fc-rainbow" title="自定义颜色">' +
    '<input id="fontColorPick" type="color" value="#1f1f1f" oninput="setFontColor(this.value,false)" onchange="setFontColor(this.value,true)" aria-label="自定义字体颜色">' +
    '</label>' +
    '</div>' +
    '<p id="fontColorStatus" class="ap-status" role="status" aria-live="polite">未自定义，用主题默认文字颜色</p>' +
    '<div class="ap-btn-row"><button type="button" class="ap-btn" onclick="resetFontColor()">恢复默认字色</button></div>' +
    '<details class="ap-details ap-license"><summary>字体来源与授权说明</summary><p class="ap-hint">字体授权以各字体发布方许可为准。装饰字体更适合标题或短句；本站保留现有选项，如有授权问题请联系站长处理。</p></details></section>';
}
