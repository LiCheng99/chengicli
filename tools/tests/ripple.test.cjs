'use strict';
// No browser or dependencies: node --test tools/tests/ripple.test.cjs
// 覆盖第 4 个互动挂件「点击涟漪」：默认关、只认显式 '1'、按下才画两圈、700ms 回收、同屏上限、
// 关掉后撤监听、减少动态效果偏好下不画，以及 CSS 契约（pointer-events:none / z-index 低于光标 / 动画不超出兜底回收）。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'source/js/modules/ripple.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'source/css/site-inject.css'), 'utf8');
const settings = fs.readFileSync(path.join(root, 'source/js/modules/settings.js'), 'utf8');
const CURSOR_Z = 10086; // #cursor-position（source/js/modules/cursor.js）—— 涟漪必须比它低

function harness(saved = {}, options = {}) {
  const store = new Map(Object.entries(saved));
  const timers = new Map();
  const docListeners = new Map(), winListeners = new Map(), motionListeners = [];
  const matches = { value: options.reduced === true };
  let nextTimer = 0;
  function bind(map) { return (type, fn) => { if (!map.has(type)) map.set(type, []); map.get(type).push(fn); }; }
  function unbind(map) { return (type, fn) => { const list = map.get(type) || []; const i = list.indexOf(fn); if (i >= 0) list.splice(i, 1); }; }
  function makeNode(tag) {
    const node = { tagName: tag, id: '', className: '', style: {}, attributes: {}, children: [], parentNode: null, textContent: '',
      setAttribute(name, value) { node.attributes[name] = value; },
      appendChild(child) { child.parentNode = node; node.children.push(child); return child; },
      removeChild(child) { const i = node.children.indexOf(child); if (i >= 0) node.children.splice(i, 1); child.parentNode = null; return child; } };
    return node;
  }
  const body = makeNode('body'), control = makeNode('input'), hint = makeNode('small');
  hint.textContent = '点一下，泛起一圈小波纹 · 默认关闭';
  const document = {
    body, hidden: false, createElement: makeNode,
    getElementById(id) {
      if (options.noControl) return null;
      if (id === 'rippleSet') return control;
      if (id === 'rippleHint') return hint;
      return null;
    },
    addEventListener: bind(docListeners), removeEventListener: unbind(docListeners)
  };
  const window = {
    localStorage: options.blockedStorage ? { getItem() { throw new Error('storage blocked'); } } : { getItem: key => store.get(key) ?? null },
    setTimeout(fn, ms) { const id = ++nextTimer; timers.set(id, { fn, ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
    addEventListener: bind(winListeners), removeEventListener: unbind(winListeners)
  };
  // matches 必须是活取值：真实 matchMedia 返回的 MediaQueryList 会随系统偏好变化，快照布尔值测不出"撤销后恢复"。
  if (!options.noMotion) window.matchMedia = () => ({ get matches() { return matches.value; }, addEventListener: (type, fn) => motionListeners.push(fn) });
  const ctx = vm.createContext({ window, document, console });
  vm.runInContext(source, ctx);
  function layer() { return body.children.find(child => child.id === 'ripple-layer') || null; }
  function bursts() { const host = layer(); return host ? host.children : []; }
  function press(overrides) {
    for (const fn of (docListeners.get('pointerdown') || []).slice()) {
      fn(Object.assign({ isPrimary: true, button: 0, clientX: 10, clientY: 20 }, overrides || {}));
    }
  }
  function fire(map, type, event) { for (const fn of (map.get(type) || []).slice()) fn(event); }
  function runTimers() { const pending = [...timers.values()]; timers.clear(); for (const timer of pending) timer.fn(); }
  return { ctx, api: ctx.window.FOMAL_RIPPLE, body, control, hint, store, timers, docListeners, winListeners, motionListeners, matches,
    layer, bursts, press, fire, runTimers, bound: () => (docListeners.get('pointerdown') || []).length };
}

test('默认关闭：不写键、不挂监听、点了也没有涟漪', () => {
  const h = harness();
  assert.ok(h.api, 'FOMAL_RIPPLE 暴露 setEnabled / refresh / syncControls');
  assert.equal(typeof h.api.setEnabled, 'function');
  assert.equal(typeof h.api.refresh, 'function');
  assert.equal(typeof h.api.syncControls, 'function');
  assert.equal(h.bound(), 0, '默认关就不该有 pointerdown 监听');
  assert.equal(h.control.checked, false);
  h.press();
  assert.equal(h.layer(), null);
});

for (const value of [undefined, '1', 'true', '0', '', 'on', 'undefined']) {
  test('只有显式存过 "1" 才算开：' + value, () => {
    const h = harness(value === undefined ? {} : { rippleOn: value });
    assert.equal(h.control.checked, value === '1');
    assert.equal(h.bound() > 0, value === '1');
  });
}

test('按下才建层：一次按下 = 1 个 burst + 2 圈，坐标直接写进 transform', () => {
  const h = harness({ rippleOn: '1' });
  assert.equal(h.layer(), null, '没点之前不留常驻元素');
  h.press({ clientX: 12, clientY: 34 });
  const host = h.layer();
  assert.ok(host, '按下后才有 #ripple-layer');
  assert.equal(host.parentNode, h.body);
  assert.equal(host.attributes['aria-hidden'], 'true');
  assert.equal(h.bursts().length, 1);
  const burst = h.bursts()[0];
  assert.equal(burst.className, 'ripple-burst');
  assert.equal(burst.style.transform, 'translate3d(12px,34px,0)');
  assert.equal(burst.children.length, 2);
  assert.equal(burst.children[0].className, 'ripple-ring');
  assert.equal(burst.children[1].className, 'ripple-ring is-late', '第二环错开出发，两圈同心');
  assert.equal(h.timers.size, 1);
  assert.equal([...h.timers.values()][0].ms, 700);
});

test('定时器到点回收：整枚 burst 连壳移除，层不残留', () => {
  const h = harness({ rippleOn: '1' });
  h.press(); h.press({ clientX: 40 });
  assert.equal(h.bursts().length, 2);
  h.runTimers();
  assert.equal(h.bursts().length, 0);
  assert.equal(h.timers.size, 0);
  h.press();
  assert.equal(h.bursts().length, 1, '回收后还能继续画');
});

test('同屏上限 6：连点只保留最新的六枚，最老的先回收', () => {
  const h = harness({ rippleOn: '1' });
  for (let i = 1; i <= 8; i++) h.press({ clientX: i });
  assert.equal(h.bursts().length, 6);
  assert.equal(h.bursts()[0].style.transform, 'translate3d(3px,20px,0)', '保留的是第 3~8 次');
  assert.equal(h.bursts()[5].style.transform, 'translate3d(8px,20px,0)');
  assert.equal(h.timers.size, 6);
});

test('只认主指针左键：右键 / 中键 / 非主指针都不画', () => {
  const h = harness({ rippleOn: '1' });
  h.press({ button: 2 });
  h.press({ button: 1 });
  h.press({ isPrimary: false });
  assert.equal(h.layer(), null, '右键留给 #rightMenu，多指只取第一指');
  h.press({ button: 0 });
  assert.equal(h.bursts().length, 1);
});

test('关掉开关立刻撤监听并清干净', () => {
  const h = harness({ rippleOn: '1' });
  h.press();
  assert.equal(h.bursts().length, 1);
  h.api.setEnabled(false);
  assert.equal(h.bound(), 0);
  assert.equal(h.layer(), null);
  assert.equal(h.control.checked, false);
  h.press();
  assert.equal(h.layer(), null);
});

test('减少动态效果偏好：默认关的人不受影响，开着的人暂停并改说明文案', () => {
  const idle = harness({}, { reduced: true });
  assert.equal(idle.bound(), 0);
  const h = harness({ rippleOn: '1' }, { reduced: true });
  assert.equal(h.bound(), 0, '偏好下连监听都不挂');
  assert.equal(h.control.checked, true, '偏好不该偷偷改用户的选择');
  assert.match(h.hint.textContent, /减少动态效果偏好下暂停/);
  h.press();
  assert.equal(h.layer(), null);
  h.matches.value = false;
  for (const fn of h.motionListeners.slice()) fn();
  assert.ok(h.bound() > 0, '偏好撤销后自动恢复');
  h.press();
  assert.equal(h.bursts().length, 1);
  assert.equal(h.hint.textContent, '点一下，泛起一圈小波纹 · 默认关闭');
});

test('pjax 换页与跨标签页改动都会按最新存储重读', () => {
  const h = harness();
  h.store.set('rippleOn', '1');
  h.fire(h.winListeners, 'storage', { key: 'rippleOn' });
  assert.ok(h.bound() > 0);
  h.store.set('rippleOn', '0');
  h.fire(h.winListeners, 'storage', { key: 'nekoOn' });
  assert.ok(h.bound() > 0, '别人的键不管');
  h.fire(h.docListeners, 'pjax:complete');
  assert.equal(h.bound(), 0);
  h.store.set('rippleOn', '1');
  h.fire(h.docListeners, 'pjax:complete');
  assert.ok(h.bound() > 0);
});

test('localStorage 被拦或面板不在场都不炸', () => {
  const blocked = harness({}, { blockedStorage: true });
  assert.equal(blocked.control.checked, false);
  assert.equal(blocked.bound(), 0);
  assert.doesNotThrow(() => blocked.api.refresh());
  const noControl = harness({ rippleOn: '1' }, { noControl: true });
  assert.doesNotThrow(() => noControl.api.syncControls());
});

test('CSS 契约：0×0 层 + 不参与命中 + z-index 低于光标 + 颜色跟随主题色', () => {
  const layerRule = css.match(/\.ripple-layer\s*\{[^}]*\}/);
  assert.ok(layerRule, '.ripple-layer 规则存在');
  assert.match(layerRule[0], /pointer-events:none/, '不参与命中测试，链接与按钮照常拿到点击');
  assert.match(layerRule[0], /position:fixed/);
  const z = Number((layerRule[0].match(/z-index:(\d+)/) || [])[1]);
  assert.ok(z > 0 && z < CURSOR_Z, 'z-index ' + z + ' 必须低于 #cursor-position 的 ' + CURSOR_Z);
  assert.ok(css.includes('@keyframes ripple-out'));
  assert.match(css, /color-mix\(in srgb, var\(--theme-color, #FF1493\)/, '颜色从主题色派生，不写死深粉红色');
});

test('CSS 动画不超出模块的兜底回收时间（否则涟漪会在中途凭空消失）', () => {
  const ttl = Number((source.match(/var TTL = (\d+);/) || [])[1]);
  assert.ok(ttl > 0, 'TTL 常量存在');
  const base = Number((css.match(/animation:ripple-out ([\d.]+)s/) || [])[1]);
  const delay = Number((css.match(/animation-delay:([\d.]+)s/) || [])[1]);
  const late = Number((css.match(/animation-duration:([\d.]+)s/) || [])[1]);
  assert.ok(base > 0 && late > 0, '两圈都有动画时长');
  assert.ok(ttl >= base * 1000 && ttl >= (delay + late) * 1000, 'TTL ' + ttl + 'ms 要覆盖 ' + Math.max(base, delay + late) * 1000 + 'ms');
});

test('面板接线：开关存在、默认关、写键只写 1/0', () => {
  assert.ok(settings.includes('id="rippleSet" aria-describedby="rippleHint" onchange="setRipple()"'));
  assert.ok(settings.includes('localStorage.setItem("rippleOn", "0")'), 'initItem 里默认关（复位靠它）');
  assert.ok(settings.includes("if (rippleToggle) rippleToggle.checked = localStorage.getItem('rippleOn') === '1';"));
  assert.ok(settings.includes("if (window.FOMAL_RIPPLE) window.FOMAL_RIPPLE.setEnabled("));
});
