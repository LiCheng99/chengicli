/* Global classic script. Loaded before settings.js; no DOM, Image or settings-let access at load time.
 * Catalog copied verbatim from the legacy background panel (thumbnail and full URL are distinct).
 * Only blogbg is managed here. resetBg_ / setBg remain the site's four-mode CSS contract.
 */
var AP_BACKGROUND_CATALOG = [
  {
    "id": "anime-1",
    "category": "anime",
    "name": "二次元 01",
    "thumb": "/External-link/img/bg/yuanshen1-thumb.jpg",
    "value": "url(/External-link/img/bg/yuanshen1-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "anime-2",
    "category": "anime",
    "name": "二次元 02",
    "thumb": "/External-link/img/bg/dm15-thumb.jpg",
    "value": "url(/External-link/img/bg/dm15-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "anime-3",
    "category": "anime",
    "name": "二次元 03",
    "thumb": "/External-link/img/bg/dm2-thumb.jpg",
    "value": "url(/External-link/img/bg/dm2-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "anime-4",
    "category": "anime",
    "name": "二次元 04",
    "thumb": "/External-link/img/bg/dm7-thumb.jpg",
    "value": "url(/External-link/img/bg/dm7-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "anime-5",
    "category": "anime",
    "name": "二次元 05",
    "thumb": "/External-link/img/bg/dm8-thumb.jpg",
    "value": "url(/External-link/img/bg/dm8-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "anime-6",
    "category": "anime",
    "name": "二次元 06",
    "thumb": "/External-link/img/bg/dm3-thumb.jpg",
    "value": "url(/External-link/img/bg/dm3-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "anime-7",
    "category": "anime",
    "name": "二次元 07",
    "thumb": "/External-link/img/bg/dm11-thumb.jpg",
    "value": "url(/External-link/img/bg/dm11-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "anime-8",
    "category": "anime",
    "name": "二次元 08",
    "thumb": "/External-link/img/bg/dm12-thumb.jpg",
    "value": "url(/External-link/img/bg/dm12-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "landscape-1",
    "category": "landscape",
    "name": "风景 01",
    "thumb": "/External-link/img/bg/fj1-thumb.jpg",
    "value": "url(/External-link/img/bg/fj1-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "landscape-2",
    "category": "landscape",
    "name": "风景 02",
    "thumb": "/External-link/img/bg/fj2-thumb.jpg",
    "value": "url(/External-link/img/bg/fj2-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "landscape-3",
    "category": "landscape",
    "name": "风景 03",
    "thumb": "/External-link/img/bg/fj3-thumb.jpg",
    "value": "url(/External-link/img/bg/fj3-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "landscape-4",
    "category": "landscape",
    "name": "风景 04",
    "thumb": "/External-link/img/bg/fj4-thumb.jpg",
    "value": "url(/External-link/img/bg/fj4-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "landscape-5",
    "category": "landscape",
    "name": "风景 05",
    "thumb": "/External-link/img/bg/fj5-thumb.jpg",
    "value": "url(/External-link/img/bg/fj5-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "landscape-6",
    "category": "landscape",
    "name": "风景 06",
    "thumb": "/External-link/img/bg/fj6-thumb.jpg",
    "value": "url(/External-link/img/bg/fj6-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "landscape-7",
    "category": "landscape",
    "name": "风景 07",
    "thumb": "/External-link/img/bg/fj7-thumb.jpg",
    "value": "url(/External-link/img/bg/fj7-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "landscape-8",
    "category": "landscape",
    "name": "风景 08",
    "thumb": "/External-link/img/bg/fj8-thumb.jpg",
    "value": "url(/External-link/img/bg/fj8-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "pets-1",
    "category": "pets",
    "name": "萌宠 01",
    "thumb": "/External-link/img/bg/mc1-thumb.jpg",
    "value": "url(/External-link/img/bg/mc1-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "pets-2",
    "category": "pets",
    "name": "萌宠 02",
    "thumb": "/External-link/img/bg/mc2-thumb.jpg",
    "value": "url(/External-link/img/bg/mc2-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "pets-3",
    "category": "pets",
    "name": "萌宠 03",
    "thumb": "/External-link/img/bg/mc3-thumb.jpg",
    "value": "url(/External-link/img/bg/mc3-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "pets-4",
    "category": "pets",
    "name": "萌宠 04",
    "thumb": "/External-link/img/bg/mc4-thumb.jpg",
    "value": "url(/External-link/img/bg/mc4-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "pets-5",
    "category": "pets",
    "name": "萌宠 05",
    "thumb": "/External-link/img/bg/mc5-thumb.jpg",
    "value": "url(/External-link/img/bg/mc5-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "pets-6",
    "category": "pets",
    "name": "萌宠 06",
    "thumb": "/External-link/img/bg/mc6-thumb.jpg",
    "value": "url(/External-link/img/bg/mc6-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "pets-7",
    "category": "pets",
    "name": "萌宠 07",
    "thumb": "/External-link/img/bg/mc7-thumb.jpg",
    "value": "url(/External-link/img/bg/mc7-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "pets-8",
    "category": "pets",
    "name": "萌宠 08",
    "thumb": "/External-link/img/bg/mc8-thumb.jpg",
    "value": "url(/External-link/img/bg/mc8-desktop.jpg)",
    "kind": "image"
  },
  {
    "id": "gradient-1",
    "category": "colors",
    "name": "渐变 01",
    "value": "linear-gradient(to right, #544a7d, #ffd452)",
    "kind": "gradient"
  },
  {
    "id": "gradient-2",
    "category": "colors",
    "name": "渐变 02",
    "value": "linear-gradient(to bottom, #7f7fd5, #86a8e7, #91eae4)",
    "kind": "gradient"
  },
  {
    "id": "gradient-3",
    "category": "colors",
    "name": "渐变 03",
    "value": "linear-gradient(to left, #654ea3, #eaafc8)",
    "kind": "gradient"
  },
  {
    "id": "gradient-4",
    "category": "colors",
    "name": "渐变 04",
    "value": "linear-gradient(to top, #feac5e, #c779d0, #4bc0c8)",
    "kind": "gradient"
  },
  {
    "id": "gradient-5",
    "category": "colors",
    "name": "渐变 05",
    "value": "linear-gradient(to top, #d3959b, #bfe6ba)",
    "kind": "gradient"
  },
  {
    "id": "gradient-6",
    "category": "colors",
    "name": "渐变 06",
    "value": "linear-gradient(to top, #8360c3, #2ebf91)",
    "kind": "gradient"
  },
  {
    "id": "gradient-7",
    "category": "colors",
    "name": "渐变 07",
    "value": "linear-gradient(to top, #108dc7, #ef8e38)",
    "kind": "gradient"
  },
  {
    "id": "gradient-8",
    "category": "colors",
    "name": "渐变 08",
    "value": "linear-gradient(to top, #355c7d, #6c5b7b, #c06c84)",
    "kind": "gradient"
  },
  {
    "id": "solid-1",
    "category": "colors",
    "name": "纯色 01",
    "value": "#ecb1b1",
    "kind": "solid"
  },
  {
    "id": "solid-2",
    "category": "colors",
    "name": "纯色 02",
    "value": "#d3ebac",
    "kind": "solid"
  },
  {
    "id": "solid-3",
    "category": "colors",
    "name": "纯色 03",
    "value": "#ace9ce",
    "kind": "solid"
  },
  {
    "id": "solid-4",
    "category": "colors",
    "name": "纯色 04",
    "value": "#c1ebea",
    "kind": "solid"
  },
  {
    "id": "solid-5",
    "category": "colors",
    "name": "纯色 05",
    "value": "#dee7f1",
    "kind": "solid"
  },
  {
    "id": "solid-6",
    "category": "colors",
    "name": "纯色 06",
    "value": "#e9e3f2",
    "kind": "solid"
  },
  {
    "id": "solid-7",
    "category": "colors",
    "name": "纯色 07",
    "value": "#f7eff5",
    "kind": "solid"
  },
  {
    "id": "mobile-1",
    "category": "mobile",
    "name": "手机 01",
    "thumb": "/External-link/img/bg/mb4-thumb.jpg",
    "value": "url(/External-link/img/bg/mb4-mobile.jpg)",
    "kind": "image"
  },
  {
    "id": "mobile-2",
    "category": "mobile",
    "name": "手机 02",
    "thumb": "/External-link/img/bg/mb5-thumb.jpg",
    "value": "url(/External-link/img/bg/mb5-mobile.jpg)",
    "kind": "image"
  },
  {
    "id": "mobile-3",
    "category": "mobile",
    "name": "手机 03",
    "thumb": "/External-link/img/bg/mb6-thumb.jpg",
    "value": "url(/External-link/img/bg/mb6-mobile.jpg)",
    "kind": "image"
  },
  {
    "id": "mobile-4",
    "category": "mobile",
    "name": "手机 04",
    "thumb": "/External-link/img/bg/mb7-thumb.jpg",
    "value": "url(/External-link/img/bg/mb7-mobile.jpg)",
    "kind": "image"
  },
  {
    "id": "mobile-5",
    "category": "mobile",
    "name": "手机 05",
    "thumb": "/External-link/img/bg/mb8-thumb.jpg",
    "value": "url(/External-link/img/bg/mb8-mobile.jpg)",
    "kind": "image"
  },
  {
    "id": "mobile-6",
    "category": "mobile",
    "name": "手机 06",
    "thumb": "/External-link/img/bg/mb9-thumb.jpg",
    "value": "url(/External-link/img/bg/mb9-mobile.jpg)",
    "kind": "image"
  },
  {
    "id": "mobile-7",
    "category": "mobile",
    "name": "手机 07",
    "thumb": "/External-link/img/bg/mb16-thumb.jpg",
    "value": "url(/External-link/img/bg/mb16-mobile.jpg)",
    "kind": "image"
  },
  {
    "id": "mobile-8",
    "category": "mobile",
    "name": "手机 08",
    "thumb": "/External-link/img/bg/mb19-thumb.jpg",
    "value": "url(/External-link/img/bg/mb19-mobile.jpg)",
    "kind": "image"
  }
];
var AP_BACKGROUND_CATEGORIES = [{id:'anime',name:'二次元'},{id:'landscape',name:'风景'},{id:'pets',name:'萌宠'},{id:'mobile',name:'手机'}];
var AP_BACKGROUND_APIS = [
  {id:'bingDayBg',name:'必应每日壁纸'}, {id:'bingHistoryBg',name:'必应随机壁纸'},
  {id:'EEEDog',name:'二次元随机'}, {id:'seovx',name:'随机美图'},
  {id:'picsum',name:'Picsum 随机'}, {id:'waiBizhi',name:'高清壁纸随机'},
  {id:'btstu',name:'手机二次元随机'}, {id:'unsplash',name:'横屏二次元随机'}
];
var apBackgroundState = { token:0, pending:null, current:'default', initialized:false,
  status:'idle', message:'选择背景前会先检查图片，加载失败时保留当前背景。', retry:null,
  main:'wallpaper', category:'anime', environmentListening:false, customToken:0, customPending:null, draft:null,
  customStatus:'idle', customMessage:'先预览并验证，再应用到全站。' };

// Runtime-only access: settings.js owns these lexical variables and can update their URLs.
function appearanceBackgroundApiValue(id) {
  try {
    switch(id) {
      case 'bingDayBg': return bingDayBg;
      case 'bingHistoryBg': return bingHistoryBg;
      case 'EEEDog': return EEEDog;
      case 'seovx': return seovx;
      case 'picsum': return picsum;
      case 'waiBizhi': return waiBizhi;
      case 'btstu': return btstu;
      case 'unsplash': return unsplash;
    }
  } catch (error) { /* Unavailable until settings has initialized. */ }
  return '';
}
function appearanceBackgroundEscape(value) {
  return String(value).replace(/[&<>"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
function appearanceBackgroundSafeUrl(value, httpsOnly) {
  if(typeof value !== 'string' || !value || value.length > 2000 || /[\s"'()\\;{}<>`]/.test(value)) return '';
  try {
    var u = new URL(value);
    if(!/^https?:$/.test(u.protocol) || (httpsOnly && u.protocol !== 'https:') || !u.hostname || u.username || u.password) return '';
    return u.href;
  } catch(error) { return ''; }
}
function appearanceBackgroundParse(value) {
  if(typeof value !== 'string') return null;
  value = value.trim();
  if(value === 'default') return {kind:'default',css:'default',url:''};
  if(/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) return {kind:'solid',css:value.toLowerCase(),url:''};
  if(AP_BACKGROUND_CATALOG.some(function(item) { return item.kind === 'gradient' && item.value === value; })) return {kind:'gradient',css:value,url:''};
  var match = value.match(/^url\((['"]?)(.*?)\1\)$/);
  var raw = match ? match[2] : value;
  var url = appearanceBackgroundSafeUrl(raw, false);
  // 图库预设用的是站内相对路径（/External-link/img/bg/xxx.jpg），new URL() 无 base 会抛错。
  // 这里按当前站点补成绝对地址，否则点预设会被判成「背景值无效」。
  if(!url && typeof location !== 'undefined' && /^\//.test(raw) && !/^\/\//.test(raw)) {
    try { url = appearanceBackgroundSafeUrl(new URL(raw, location.origin).href, false); } catch(error) { url = ''; }
  }
  return url ? {kind:'image',css:'url("'+url+'")',url:url} : null;
}
// 站点默认背景直链（第三处副本：与 _config.chengic.yml 的 #defineBg、settings.js 的 resetBg_() 同源，改地址要三处一起改）
//   PC 日间    → /Background-wallpaper/computer-Daytime-background.webp
//   PC 夜间    → /Background-wallpaper/computer-Night-background.webp
//   移动端日间  → /Background-wallpaper/phone-Daytime-background.webp
//   移动端夜间  → /Background-wallpaper/phone-Night-background.webp
// 只在「默认背景」被选中时用，负责让面板里的预览图/名称跟随当前 设备宽度 + data-theme 变化
function appearanceBackgroundDefaultUrl() {
  var root=document.documentElement;
  var dark=!!(root && root.getAttribute('data-theme') === 'dark');
  var width=typeof window !== 'undefined' ? window.innerWidth : (root && root.clientWidth);
  var mobile=typeof width === 'number' && width <= 768;
  return mobile ? (dark ? '/Background-wallpaper/phone-Night-background.webp' : '/Background-wallpaper/phone-Daytime-background.webp') : (dark ? '/Background-wallpaper/computer-Night-background.webp' : '/Background-wallpaper/computer-Daytime-background.webp');
}
function appearanceBackgroundWatchEnvironment() {
  if(apBackgroundState.environmentListening) return;
  apBackgroundState.environmentListening=true;
  var refresh=function() {
    if(apBackgroundState.current === 'default' && appearanceBackgroundElement('ap-background-panel')) syncAppearanceBackground();
  };
  // Install only after the settings panel opens; no homepage preview requests or observers.
  if(typeof window !== 'undefined' && window.addEventListener) window.addEventListener('resize',refresh);
  if(typeof MutationObserver !== 'undefined' && document.documentElement) {
    var observer=new MutationObserver(refresh);
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  }
}
function appearanceBackgroundMetadata(value) {
  var parsed = appearanceBackgroundParse(value);
  if(!parsed) return {name:'无效背景',category:'invalid',kind:'invalid',url:'',value:value};
  if(parsed.kind === 'default') return {name:'默认背景',category:'默认 · 随深浅模式和屏幕切换',kind:'default',url:appearanceBackgroundDefaultUrl(),value:'default'};
  // 图库里存在相对路径条目（如 /External-link/img/bg/xxx.jpg），parse 会返回 null；
  // 这里必须判空，否则 candidate.css 抛错会让整个 syncAppearanceBackground 中断，
  // 表现为「自定义背景后，背景设置不更新/像空了」。
  var item = AP_BACKGROUND_CATALOG.find(function(entry) {
    var candidate = appearanceBackgroundParse(entry.value);
    return candidate && candidate.css === parsed.css;
  });
  if(item) {
    var cat = AP_BACKGROUND_CATEGORIES.find(function(c){return c.id === item.category;});
    return {id:item.id,name:item.name,category:item.kind === 'image' ? ((cat && cat.name) || '壁纸') : (item.kind === 'solid' ? '纯色' : '渐变'),kind:item.kind,url:parsed.url,thumb:item.thumb,value:parsed.css};
  }
  var api = AP_BACKGROUND_APIS.find(function(entry) { var candidate=appearanceBackgroundParse(appearanceBackgroundApiValue(entry.id)); return candidate && candidate.css === parsed.css; });
  if(api) return {id:'api-'+api.id,name:api.name,category:'动态 API · 刷新可能返回不同图片',kind:'image',url:parsed.url,value:parsed.css};
  return {name:parsed.kind === 'solid' ? '自定义纯色 '+parsed.css : '自定义图片',category:parsed.kind === 'solid' ? '纯色' : '自定义 · 图片链接',kind:parsed.kind,url:parsed.url,value:parsed.css};
}
function appearanceBackgroundElement(id) { return document.getElementById(id); }
function appearanceBackgroundOptionMarkup(item) {
  var esc=appearanceBackgroundEscape;
  return '<button type="button" class="ap-bg-option" data-ap-bg-id="'+esc(item.id)+'" aria-pressed="false" onclick="selectAppearanceBackground(this.dataset.apBgId)">'+
    '<span class="ap-bg-thumb ap-bg-swatch" style="background:'+esc(item.value)+'" aria-hidden="true"></span><span class="ap-bg-name">'+esc(item.name)+'</span><span class="ap-bg-check" hidden aria-hidden="true">✓</span></button>';
}
function appearanceBackgroundMarkup() {
  var esc=appearanceBackgroundEscape;
  var main=[['wallpaper','壁纸'],['colors','颜色'],['custom','自定义']];
  var tabs=main.map(function(t){return '<button type="button" class="ap-btn" data-ap-bg-main="'+t[0]+'" aria-controls="ap-bg-main-'+t[0]+'" aria-pressed="'+(t[0] === 'wallpaper')+'" onclick="showAppearanceBackgroundTab(this.dataset.apBgMain)">'+t[1]+'</button>';}).join('');
  var categoryTabs=AP_BACKGROUND_CATEGORIES.map(function(c){return '<button type="button" class="ap-btn" data-ap-bg-category="'+c.id+'" aria-controls="ap-bg-category-'+c.id+'" aria-pressed="'+(c.id === 'anime')+'" onclick="showAppearanceBackgroundCategory(this.dataset.apBgCategory)">'+esc(c.name)+'</button>';}).join('');
  var categoryPanels=AP_BACKGROUND_CATEGORIES.map(function(c){return '<div id="ap-bg-category-'+c.id+'" class="ap-bg-grid" aria-label="'+esc(c.name)+'壁纸"'+(c.id === 'anime' ? '' : ' hidden')+'></div>';}).join('');
  var colors=AP_BACKGROUND_CATALOG.filter(function(item){return item.category === 'colors';}).map(appearanceBackgroundOptionMarkup).join('');
  var apis=AP_BACKGROUND_APIS.map(function(api){return '<button type="button" class="ap-btn" data-ap-bg-id="api-'+api.id+'" aria-pressed="false" onclick="selectAppearanceBackgroundApi(this.dataset.apBgId.slice(4))">'+esc(api.name)+'<span class="ap-bg-check" hidden aria-hidden="true">✓</span></button>';}).join('');
  return '<section id="ap-background-panel" class="ap-panel ap-background-panel" aria-label="背景设置">'+
    '<div class="ap-bg-current"><div id="ap-bg-current-preview" class="ap-bg-thumb ap-bg-placeholder"></div><div><strong id="ap-bg-current-name" class="ap-bg-name">当前背景</strong><p id="ap-bg-current-meta" class="ap-bg-meta"></p></div><button type="button" class="ap-btn" onclick="resetAppearanceBackground()">恢复默认背景</button></div>'+
    '<p id="ap-bg-status" class="ap-status" role="status" aria-live="polite"></p><button type="button" id="ap-bg-retry" class="ap-btn" onclick="retryAppearanceBackground()" hidden>重试加载</button>'+
    '<div class="ap-tabs" aria-label="背景类型">'+tabs+'</div><div id="ap-bg-main-wallpaper"><div class="ap-tabs" aria-label="壁纸分类">'+categoryTabs+'</div>'+categoryPanels+
    '<details class="ap-bg-advanced"><summary>高级：动态壁纸 API</summary><p class="ap-bg-meta">仅点击后加载。动态链接刷新可能返回不同图片；有些第三方服务可能暂时不可用。</p><div class="ap-bg-actions">'+apis+'</div></details></div>'+
    '<div id="ap-bg-main-colors" hidden><div class="ap-bg-grid">'+colors+'</div><label class="ap-bg-meta" for="define_colors">自定义纯色</label> <input type="color" id="define_colors" value="#f4d88a" oninput="changeBgColor()" aria-label="自定义背景颜色"></div>'+
    '<div id="ap-bg-main-custom" hidden><label for="pic-link">HTTPS 图片链接</label><input type="url" id="pic-link" maxlength="1000" placeholder="https://example.com/background.webp" oninput="invalidateCustomBackground()" autocomplete="off"><div class="ap-bg-actions"><button type="button" class="ap-btn" onclick="previewCustomBackground()">预览并验证</button><button type="button" class="ap-btn" id="ap-bg-custom-apply" onclick="applyCustomBackground()" disabled>应用到全站</button></div><p id="ap-bg-custom-status" class="ap-status" role="status" aria-live="polite"></p><div id="ap-bg-custom-preview" class="ap-bg-thumb ap-bg-placeholder"></div></div></section>';
}
function appearanceBackgroundRenderPreview(container, metadata) {
  if(!container) return;
  container.replaceChildren();
  container.style.background='';
  if(metadata.url) {
    var image=document.createElement('img'); image.className='ap-bg-thumb'; image.alt=metadata.name;
    image.referrerPolicy='no-referrer'; image.src=metadata.thumb || metadata.url; container.appendChild(image);
  } else if(metadata.kind === 'solid' || metadata.kind === 'gradient') {
    var parsed=appearanceBackgroundParse(metadata.value);
    if(parsed) container.style.background=parsed.css;
  }
}
function syncAppearanceBackground() {
  var meta=appearanceBackgroundMetadata(apBackgroundState.current);
  var name=appearanceBackgroundElement('ap-bg-current-name'), info=appearanceBackgroundElement('ap-bg-current-meta');
  if(name) name.textContent=meta.name;
  if(info) info.textContent=meta.category;
  var preview=appearanceBackgroundElement('ap-bg-current-preview');
  var previewKey=apBackgroundState.current+'|'+meta.url;
  if(preview && preview.getAttribute('data-ap-current') !== previewKey) {
    appearanceBackgroundRenderPreview(preview,meta); preview.setAttribute('data-ap-current',previewKey);
  }
  var panel=appearanceBackgroundElement('ap-background-panel');
  if(panel) panel.querySelectorAll('[data-ap-bg-id]').forEach(function(button) {
    var selected=button.getAttribute('data-ap-bg-id') === meta.id;
    button.setAttribute('aria-pressed',String(selected));
    var check=button.querySelector('.ap-bg-check'); if(check) check.hidden=!selected;
  });
  var picker=appearanceBackgroundElement('define_colors');
  var parsed=appearanceBackgroundParse(apBackgroundState.current);
  if(picker && parsed && parsed.kind === 'solid' && /^#[0-9a-f]{6}$/i.test(parsed.css)) picker.value=parsed.css;
  var status=appearanceBackgroundElement('ap-bg-status');
  if(status) { status.textContent=apBackgroundState.message; status.setAttribute('data-state',apBackgroundState.status); }
  var retry=appearanceBackgroundElement('ap-bg-retry'); if(retry) retry.hidden=!apBackgroundState.retry;
  syncCustomBackground();
}
function syncCustomBackground() {
  var status=appearanceBackgroundElement('ap-bg-custom-status');
  if(status) { status.textContent=apBackgroundState.customMessage; status.setAttribute('data-state',apBackgroundState.customStatus); }
  var field=appearanceBackgroundElement('pic-link'), apply=appearanceBackgroundElement('ap-bg-custom-apply');
  if(apply) apply.disabled=!(apBackgroundState.draft && field && field.value === apBackgroundState.draft.field);
}
function appearanceBackgroundStatus(state,message,retry) {
  apBackgroundState.status=state; apBackgroundState.message=message; apBackgroundState.retry=retry || null; syncAppearanceBackground();
}
function initAppearanceBackgrounds() {
  if(!appearanceBackgroundElement('ap-background-panel')) return;
  appearanceBackgroundWatchEnvironment();
  // Global reset owns storage; mirror its final default without restarting a probe.
  var saved=localStorage.getItem('blogbg');
  if(!apBackgroundState.pending && (saved === null || saved === 'default')) apBackgroundState.current='default';
  var field=appearanceBackgroundElement('pic-link');
  if(apBackgroundState.draft && (!field || field.value !== apBackgroundState.draft.field)) invalidateCustomBackground();
  showAppearanceBackgroundTab(apBackgroundState.main); syncAppearanceBackground();
}
function showAppearanceBackgroundTab(tab) {
  if(['wallpaper','colors','custom'].indexOf(tab) < 0) return;
  apBackgroundState.main=tab;
  var panel=appearanceBackgroundElement('ap-background-panel'); if(!panel) return;
  panel.querySelectorAll('[data-ap-bg-main]').forEach(function(button){button.setAttribute('aria-pressed',String(button.getAttribute('data-ap-bg-main') === tab));});
  ['wallpaper','colors','custom'].forEach(function(id){var el=appearanceBackgroundElement('ap-bg-main-'+id);if(el)el.hidden=id!==tab;});
  if(tab === 'wallpaper') showAppearanceBackgroundCategory(apBackgroundState.category);
}
function showAppearanceBackgroundCategory(category) {
  if(!AP_BACKGROUND_CATEGORIES.some(function(c){return c.id === category;})) return;
  apBackgroundState.category=category;
  var panel=appearanceBackgroundElement('ap-background-panel'); if(!panel) return;
  panel.querySelectorAll('[data-ap-bg-category]').forEach(function(button){button.setAttribute('aria-pressed',String(button.getAttribute('data-ap-bg-category') === category));});
  AP_BACKGROUND_CATEGORIES.forEach(function(c){var el=appearanceBackgroundElement('ap-bg-category-'+c.id);if(el)el.hidden=c.id!==category;});
  var grid=appearanceBackgroundElement('ap-bg-category-'+category);
  if(grid && !grid.getAttribute('data-ap-built')) {
    AP_BACKGROUND_CATALOG.filter(function(item){return item.category === category;}).forEach(function(item){
      var button=document.createElement('button'); button.type='button'; button.className='ap-bg-option'; button.setAttribute('data-ap-bg-id',item.id); button.setAttribute('aria-pressed','false');
      button.onclick=function(){return selectAppearanceBackground(item.id);};
      var image=document.createElement('img'); image.className='ap-bg-thumb'; image.alt=''; image.loading='lazy'; image.decoding='async'; image.referrerPolicy='no-referrer'; image.src=item.thumb;
      var label=document.createElement('span'); label.className='ap-bg-name'; label.textContent=item.name;
      var check=document.createElement('span'); check.className='ap-bg-check'; check.textContent='✓'; check.hidden=true; check.setAttribute('aria-hidden','true');
      button.appendChild(image);button.appendChild(label);button.appendChild(check);grid.appendChild(button);
    }); grid.setAttribute('data-ap-built','true');
  } syncAppearanceBackground();
}
function selectAppearanceBackground(id) {
  var item=AP_BACKGROUND_CATALOG.find(function(entry){return entry.id === id;});
  return item ? changeAppearanceBackground(item.value) : Promise.resolve(false);
}
function selectAppearanceBackgroundApi(id) {
  return AP_BACKGROUND_APIS.some(function(api){return api.id === id;}) ? changeAppearanceBackground(appearanceBackgroundApiValue(id)) : Promise.resolve(false);
}
// A cancellable, settling probe: all terminal paths detach handlers, cancel src and clear the timer.
function appearanceBackgroundProbe(url) {
  var image=new Image(), timer, settle, done=false;
  var promise=new Promise(function(resolve) {
    settle=function(success){
      if(done) return; done=true; clearTimeout(timer); image.onload=null;image.onerror=null;
      image.removeAttribute ? image.removeAttribute('src') : (image.src=''); resolve(success);
    };
    image.onload=function(){settle(true);}; image.onerror=function(){settle(false);};
    timer=setTimeout(function(){settle(false);},12000); image.src=url;
  });
  return {promise:promise,cancel:function(){settle(false);}};
}
function appearanceBackgroundCancelPending() {
  apBackgroundState.token++;
  if(apBackgroundState.pending) apBackgroundState.pending.cancel();
  apBackgroundState.pending=null;
}
function appearanceBackgroundCommit(parsed, persist) {
  if(parsed.kind === 'default') resetBg_(); else setBg(parsed.css);
  if(persist) localStorage.setItem('blogbg',parsed.css);
  apBackgroundState.current=parsed.css; apBackgroundState.initialized=true;
  if(typeof defineColor !== 'undefined') defineColor=parsed.kind === 'solid' ? parsed.css : '#F4D88A';
  appearanceBackgroundStatus('success','背景已应用。');
}
function appearanceBackgroundRequest(value, persist) {
  appearanceBackgroundCancelPending();
  var token=apBackgroundState.token, parsed=appearanceBackgroundParse(value);
  if(!parsed) { appearanceBackgroundStatus('error','背景值无效，请使用预设颜色或合法图片链接。');return Promise.resolve(false); }
  if(parsed.kind !== 'image') { appearanceBackgroundCommit(parsed,persist);return Promise.resolve(true); }
  appearanceBackgroundStatus('loading','正在检查图片，当前背景保持不变…');
  var probe=appearanceBackgroundProbe(parsed.url); apBackgroundState.pending=probe;
  return probe.promise.then(function(success){
    if(token !== apBackgroundState.token) return false;
    apBackgroundState.pending=null;
    if(!success) { appearanceBackgroundStatus('error','图片加载失败或超时，已保留当前背景和原有偏好。',function(){return appearanceBackgroundRequest(value,persist);});return false; }
    appearanceBackgroundCommit(parsed,persist);return true;
  });
}
function changeAppearanceBackground(value) { return appearanceBackgroundRequest(value,true); }
function retryAppearanceBackground() { return apBackgroundState.retry ? apBackgroundState.retry() : Promise.resolve(false); }
function restoreAppearanceBackground() {
  appearanceBackgroundCancelPending();
  var saved=localStorage.getItem('blogbg');
  // 2026-10-11 修复「刷新先闪默认壁纸」：原来这里先 resetBg_() 写默认背景，再走异步图片探针，
  // 探针回来才 setBg() 写自定义 —— 中间那段时间（实测 1763ms→load 之后）页面挂的是默认壁纸。
  // 现在改成：先把本地保存的背景同步写上屏（首帧前 beauty-boot.js 写的也是同一个值），
  // 再在后台探针校验；只有图片这次真的加载不出来，才退回默认，并且不抹掉存储的偏好。
  if(!saved || saved === 'default') {
    resetBg_(); apBackgroundState.current='default'; apBackgroundState.initialized=true;
    if(saved === null) localStorage.setItem('blogbg','default');
    appearanceBackgroundStatus('idle','默认背景随深浅模式和屏幕切换。');return Promise.resolve(true);
  }
  var parsed=appearanceBackgroundParse(saved);
  if(!parsed) {
    resetBg_(); apBackgroundState.current='default'; apBackgroundState.initialized=true;
    appearanceBackgroundStatus('error','本地保存的背景值无效，已显示默认背景（偏好保留）。');
    return Promise.resolve(false);
  }
  appearanceBackgroundCommit(parsed,false);
  if(parsed.kind !== 'image') return Promise.resolve(true);
  var token=apBackgroundState.token, probe=appearanceBackgroundProbe(parsed.url);
  apBackgroundState.pending=probe;
  return probe.promise.then(function(success){
    if(token !== apBackgroundState.token) return false;
    apBackgroundState.pending=null;
    if(success) { appearanceBackgroundStatus('success','背景已应用。');return true; }
    resetBg_(); apBackgroundState.current='default';
    appearanceBackgroundStatus('error','本地保存的背景图片这次加载失败，已临时显示默认背景（偏好保留，下次仍会尝试）。',function(){return appearanceBackgroundRequest(saved,false);});
    return false;
  });
}
function invalidateCustomBackground() {
  apBackgroundState.customToken++;
  if(apBackgroundState.customPending) apBackgroundState.customPending.cancel();
  apBackgroundState.customPending=null; apBackgroundState.draft=null;
  apBackgroundState.customStatus='idle';apBackgroundState.customMessage='链接已更改，请重新预览并验证。';
  var preview=appearanceBackgroundElement('ap-bg-custom-preview');if(preview)preview.replaceChildren();
  syncCustomBackground();
}
function previewCustomBackground() {
  invalidateCustomBackground();
  var field=appearanceBackgroundElement('pic-link'), raw=field ? field.value : '';
  var url=appearanceBackgroundSafeUrl(raw,true), token=apBackgroundState.customToken;
  if(!url) { apBackgroundState.customStatus='error';apBackgroundState.customMessage='请输入无账号信息的 HTTPS 图片链接。';syncCustomBackground();return Promise.resolve(false); }
  apBackgroundState.customStatus='loading';apBackgroundState.customMessage='正在加载自定义预览，不会更改全站背景…';syncCustomBackground();
  var probe=appearanceBackgroundProbe(url);apBackgroundState.customPending=probe;
  return probe.promise.then(function(success){
    var currentField=appearanceBackgroundElement('pic-link');
    if(token !== apBackgroundState.customToken) return false;
    if(!currentField || currentField.value !== raw) { invalidateCustomBackground();return false; }
    apBackgroundState.customPending=null;
    apBackgroundState.customStatus=success ? 'success' : 'error';
    apBackgroundState.customMessage=success ? '预览已验证，可以应用到全站。' : '图片加载失败或超时，请检查链接后重试预览。';
    if(success) {
      apBackgroundState.draft={field:raw,url:url};
      appearanceBackgroundRenderPreview(appearanceBackgroundElement('ap-bg-custom-preview'),{url:url,name:'自定义背景预览',kind:'image'});
    } syncCustomBackground();return success;
  });
}
function applyCustomBackground() {
  var field=appearanceBackgroundElement('pic-link'), draft=apBackgroundState.draft;
  if(!draft || !field || field.value !== draft.field || !appearanceBackgroundSafeUrl(draft.url,true)) {
    invalidateCustomBackground();return Promise.resolve(false);
  }
  // Already probed: no second network validation and no TOCTOU field read in a later callback.
  appearanceBackgroundCancelPending();
  appearanceBackgroundCommit(appearanceBackgroundParse(draft.url),true);return Promise.resolve(true);
}
function cancelAppearanceBackground() {
  appearanceBackgroundCancelPending();invalidateCustomBackground();
  var saved=localStorage.getItem('blogbg');
  if(saved === 'default' || saved === null) apBackgroundState.current='default';
  appearanceBackgroundStatus('idle','背景加载已取消。');
}
function resetAppearanceBackground() {
  cancelAppearanceBackground();
  var field=appearanceBackgroundElement('pic-link');if(field)field.value='';
  appearanceBackgroundCommit(appearanceBackgroundParse('default'),true);
  apBackgroundState.customMessage='先预览并验证，再应用到全站。';syncCustomBackground();
}
