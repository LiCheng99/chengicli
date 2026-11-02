'use strict';
// Dependency-free: node --test tools/tests/theme-color.test.cjs
// beauty-switches.test.cjs must stub themeColorMarkup/syncThemeColorControls
// because its isolated createWinbox harness does not execute the theme section.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const settings = fs.readFileSync(path.join(root, 'source/js/modules/settings.js'), 'utf8');
const cursor = fs.readFileSync(path.join(root, 'source/js/modules/cursor.js'), 'utf8');
const boot = fs.readFileSync(path.join(root, 'source/js/inject/beauty-boot.js'), 'utf8');
const siteCss = fs.readFileSync(path.join(root, 'source/css/site-inject.css'), 'utf8');
const config = fs.readFileSync(path.join(root, '_config.fomalhaut.yml'), 'utf8');
function section(source, start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, 'real source section exists: ' + start);
  return source.slice(from, to);
}
const themeSource = section(settings, '// 设置主题色', '// 猫咪与听话鼠标');
const defaultsSource = section(settings, 'var FONT_LIST =', '// 设置字体');
const paletteSource = section(cursor, 'const map = new Map();', 'class Cursor');
// Independent ten-color oracle: expectations are not derived from implementation at runtime.
const presets = {
  red: 'rgb(239, 90, 90)', orange: 'rgb(215, 146, 77)', yellow: 'rgb(196, 166, 74)',
  green: 'rgb(255, 20, 147)', puregreen: 'rgb(77, 175, 135)', blue: 'rgb(74, 156, 199)',
  heoblue: 'rgb(82, 116, 207)', darkblue: 'rgb(113, 133, 156)',
  purepurple: 'rgb(147, 90, 205)', pink: 'rgb(237, 112, 155)'
};
const presetNames = {
  red: '珊瑚红', orange: '暖杏橙', yellow: '蜂蜜金', green: '深粉红色', puregreen: '玉石绿',
  blue: '晴空蓝', heoblue: '柔靛蓝', darkblue: '雾蓝灰', purepurple: '紫罗兰', pink: '樱花粉'
};
const legacyPresets = { purple: 'purepurple', gray: 'darkblue', black: 'darkblue' };
const controlIds = [...Object.keys(presets), 'customThemeInput', 'customThemeChoice', 'themeColorStatus'];
const invalidHexes = [undefined, null, '', '#abc', '#abcd', '#12345678', '123456',
  '#12345', '#1234567', '#gg0000', ' #123456', '#123456 ', '#123456\n',
  '#123456;--injected:red', '#123456}</style><script>alert(1)</script>',
  'rgb(1, 2, 3)', 'url(javascript:alert(1))', 123456, {}, ['#123456']];
function node(id, mutations) {
  const properties = new Map(), classes = new Set();
  const el = { id, checked: false, value: '', title: '', innerText: '', textContent: '',
    style: {
      setProperty(key, value) { properties.set(key, String(value)); mutations.push(['style', id, key, String(value)]); },
      getPropertyValue: key => properties.get(key) || ''
    },
    classList: {
      toggle(name, force) {
        const enabled = force === undefined ? !classes.has(name) : !!force;
        if (enabled) classes.add(name); else classes.delete(name);
        mutations.push(['class', id, name, enabled]);
        return enabled;
      },
      contains: name => classes.has(name)
    },
    state: () => ({ checked: el.checked, value: el.value, title: el.title,
      innerText: el.innerText, textContent: el.textContent,
      properties: [...properties], classes: [...classes] })
  };
  return el;
}
function harness(saved = {}, options = {}) {
  const store = new Map(Object.entries(saved)), writes = [], calls = [], mutations = [], nodes = new Map();
  const localStorage = {
    getItem: key => store.get(key) ?? null,
    setItem(key, value) { store.set(key, String(value)); writes.push([key, String(value)]); }
  };
  const document = {
    documentElement: node('root', mutations), getElementById: id => nodes.get(id) || null,
    createElement: () => node('created', mutations), head: { appendChild() {} }, body: { appendChild() {} }
  };
  nodes.set('themeColor', node('themeColor', mutations));
  for (const id of controlIds) {
    if (options.controls !== false && !(options.missing || []).includes(id)) nodes.set(id, node(id, mutations));
  }
  const window = { localStorage, GitCalendarRefresh: () => calls.push('calendar') };
  const ctx = vm.createContext({ document, localStorage, window, CURSOR: { refresh: () => calls.push('cursor') } });
  vm.runInContext(paletteSource + '\n' + themeSource, ctx, { filename: 'theme-color-section.js' });
  const h = { ctx, document, window, nodes, store, writes, calls, mutations,
    palette: () => Array.from(vm.runInContext('Array.from(map.entries())', ctx), pair => Array.from(pair)),
    clear() { writes.length = 0; calls.length = 0; mutations.length = 0; },
    snapshot() { return { store: [...store], writes: [...writes], calls: [...calls], mutations: [...mutations],
      color: window.__cursorColor, palette: h.palette(), root: document.documentElement.state(),
      nodes: [...nodes].map(([id, el]) => [id, el.state()]) }; }
  };
  return h;
}
function assertColor(h, rgb) {
  assert.equal(h.nodes.get('themeColor').innerText, ':root{--theme-color:' + rgb + ' !important}');
  assert.equal(h.window.__cursorColor, rgb);
  const channels = rgb.slice(4, -1);
  for (const [key, alpha] of [['--text-bg-hover', '0.7'], ['--high-trans-color', '0.5'], ['--hh-trans-color', '0.1']]) {
    assert.equal(h.document.documentElement.style.getPropertyValue(key), 'rgba(' + channels + ', ' + alpha + ')');
  }
}
function assertSelection(h, selected) {
  for (const id of Object.keys(presets)) {
    if (h.nodes.has(id)) assert.equal(h.nodes.get(id).checked, id === selected, id + ' radio selection');
  }
  if (h.nodes.has('customThemeChoice')) {
    assert.equal(h.nodes.get('customThemeChoice').classList.contains('is-selected'), selected === 'custom');
  }
}
function bootHarness(saved = {}) {
  const store = new Map(Object.entries(saved)), writes = [], mutations = [], theme = node('themeColor', mutations);
  const localStorage = {
    getItem: key => store.get(key) ?? null,
    setItem(key, value) { writes.push([key, String(value)]); store.set(key, String(value)); }
  };
  const ctx = vm.createContext({ localStorage, window: { localStorage }, document: {
    documentElement: node('root', mutations), getElementById: id => id === 'themeColor' ? theme : null,
    createElement: () => node('created', mutations), head: { appendChild() {} }
  } });
  vm.runInContext(boot, ctx, { filename: 'beauty-boot.js' });
  return { css: theme.textContent, store, writes };
}
function assertBootColor(h, color) {
  assert.equal(h.css, ':root{--theme-color:' + color + ' !important}');
  assert.deepEqual(h.writes, [], 'first-paint boot must not mutate saved settings');
}
// Exercise the real Cursor.create method without starting animation/listener setup.
function cursorHarness(saved = {}) {
  const store = new Map(Object.entries(saved)), writes = [];
  const ctx = vm.createContext({ localStorage: {
    getItem: key => store.get(key) ?? null,
    setItem(key, value) { writes.push([key, String(value)]); store.set(key, String(value)); }
  } });
  const createSource = section(cursor, '  create() {', '  setClass(');
  vm.runInContext(paletteSource + '\n' +
    'const target = { cursor: {}, layer: { isConnected: true, style: {} }, ' +
    'scr: { isConnected: true, textContent: "" }, enabled: true, ' + createSource +
    '}; target.create(); globalThis.result = { color: target.color, css: target.scr.textContent };', ctx);
  return { color: ctx.result.color, css: ctx.result.css, store, writes };
}
function assertCursorColor(h, rgb) {
  assert.equal(h.color, rgb);
  assert.ok(decodeURIComponent(h.css).includes('fill="' + rgb + '"'), 'cursor SVG uses the same RGB');
  assert.deepEqual(h.writes, [], 'cursor color application does not rewrite preferences');
}
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/g)].map(match => [match[1], match[3]]));
}

test('real cursor palette and themeColorPresets contain exactly the ten approved presets', () => {
  const h = harness({ themeColor: 'green' });
  assert.deepEqual(Object.fromEntries(h.palette()), presets);
  const choices = Array.from(h.ctx.themeColorPresets, pair => Array.from(pair));
  assert.equal(choices.length, 10);
  assert.deepEqual(choices, Object.entries(presetNames), 'approved ids, order and Chinese names');
  for (const id of Object.keys(legacyPresets)) assert.equal(Object.hasOwn(Object.fromEntries(h.palette()), id), false);
});
for (const [id, rgb] of Object.entries(presets)) {
  test('preset applies approved RGB, rgba derivatives and synced controls: ' + id, () => {
    const h = harness({ themeColor: id, themeCustomColor: '#123456' });
    assertColor(h, rgb); assertSelection(h, id);
    assert.equal(h.store.get('themeColor'), id);
    assert.equal(h.store.get('themeCustomColor'), '#123456');
    assert.deepEqual(h.calls, ['calendar', 'cursor']);
    h.clear(); h.ctx.setColor(id);
    assert.deepEqual(h.calls, ['calendar'], 'same actual RGB does not refresh cursor');
    const name = h.ctx.themeColorPresets.find(pair => pair[0] === id)[1];
    assert.ok(h.nodes.get('themeColorStatus').textContent.includes(name));
    assert.equal(h.nodes.get('customThemeInput').value, '#123456');
    assert.equal(h.nodes.get('customThemeChoice').style.getPropertyValue('--custom-theme-color'), '#123456');
  });
  test('first-paint boot preserves preset RGB: ' + id, () => {
    assertBootColor(bootHarness({ themeColor: id, themeCustomColor: '#abcdef' }), rgb);
  });
}
test('four original accent colors retain their independent historical RGB oracle', () => {
  const originals = { red: 'rgb(239, 90, 90)', green: 'rgb(255, 20, 147)',
    purepurple: 'rgb(147, 90, 205)', pink: 'rgb(237, 112, 155)' };
  for (const [id, rgb] of Object.entries(originals)) {
    assert.equal(presets[id], rgb);
    assertColor(harness({ themeColor: id }), rgb);
    assertBootColor(bootHarness({ themeColor: id }), rgb);
    assertCursorColor(cursorHarness({ themeColor: id }), rgb);
  }
});
test('normalizer migrates only removed preset keys and preserves other keys', () => {
  const h = harness();
  for (const [oldKey, newKey] of Object.entries(legacyPresets)) assert.equal(h.ctx.normalizeThemePreset(oldKey), newKey);
  for (const key of [...Object.keys(presets), 'custom', 'unknown', '__proto__', 'constructor', '', null, undefined]) {
    assert.equal(h.ctx.normalizeThemePreset(key), key);
  }
});
for (const [oldKey, newKey] of Object.entries(legacyPresets)) {
  test('legacy stored preset migrates on settings load and retains custom HEX: ' + oldKey, () => {
    const h = harness({ themeColor: oldKey, themeCustomColor: '#ABCDEF', unrelated: 'keep' });
    assertColor(h, presets[newKey]); assertSelection(h, newKey);
    assert.equal(h.store.get('themeColor'), newKey);
    assert.deepEqual(h.writes, [['themeColor', newKey]]);
    assert.equal(h.store.get('themeCustomColor'), '#ABCDEF');
    assert.equal(h.store.get('unrelated'), 'keep');
    assert.equal(h.nodes.get('customThemeInput').value, '#abcdef');
    h.ctx.setColor('custom'); assertColor(h, 'rgb(171, 205, 239)'); assertSelection(h, 'custom');
  });
  test('explicit setColor migrates removed preset and remembers custom selection: ' + oldKey, () => {
    const h = harness({ themeColor: 'custom', themeCustomColor: '#123456' }); h.clear();
    h.ctx.setColor(oldKey); assertColor(h, presets[newKey]); assertSelection(h, newKey);
    assert.equal(h.store.get('themeColor'), newKey);
    assert.equal(h.store.get('themeCustomColor'), '#123456');
    assert.deepEqual(h.writes, [['themeColor', newKey]]);
    assert.deepEqual(h.calls, ['calendar', 'cursor']);
    h.clear(); h.ctx.setColor(oldKey);
    assert.deepEqual(h.calls, ['calendar'], 'repeat migration preserves actual-RGB refresh behavior');
    h.ctx.setColor('custom'); assertColor(h, 'rgb(18, 52, 86)'); assertSelection(h, 'custom');
  });
  test('first-paint boot maps legacy preset without persisting or dropping custom HEX: ' + oldKey, () => {
    const saved = { themeColor: oldKey, themeCustomColor: '#ABCDEF', unrelated: 'keep' };
    const h = bootHarness(saved); assertBootColor(h, presets[newKey]);
    assert.deepEqual(Object.fromEntries(h.store), saved);
    assertCursorColor(cursorHarness(saved), presets[newKey]);
    assertColor(harness(saved), presets[newKey]);
  });
}
for (const [id, rgb] of Object.entries(presets)) {
  test('real Cursor.create applies approved preset RGB: ' + id, () => {
    assertCursorColor(cursorHarness({ themeColor: id }), rgb);
  });
}
for (const id of ['orange', 'yellow', 'puregreen', 'blue', 'heoblue', 'darkblue']) {
  test('site injection CSS variable agrees with map and independent RGB oracle: ' + id, () => {
    const declarations = [...siteCss.matchAll(new RegExp('--color-' + id + '\\s*:\\s*([^;}]+)', 'g'))];
    assert.ok(declarations.length > 0, '--color-' + id + ' injection override exists');
    const rgb = Object.fromEntries(harness().palette())[id];
    assert.equal(rgb, presets[id]);
    for (const match of declarations) {
      assert.equal(match[1].replace(/\s+/g, ''), presets[id].replace(/\s+/g, ''));
    }
  });
}
for (const resource of ['/css/site-inject.css', '/js/inject/beauty-boot.js', '/js/modules/cursor.js', '/js/modules/settings.js']) {
  test('configuration cache-busts palette injection resource: ' + resource, () => {
    const lines = config.split(/\r?\n/).filter(line => /^\s*-\s*</.test(line) && line.includes('"' + resource + '?'));
    assert.equal(lines.length, 1, 'exactly one active resource injection');
    const version = resource === '/css/site-inject.css' || resource === '/js/modules/settings.js' ? '20261010-snow1' : '20261010-palette1';
    assert.ok(lines[0].includes('"' + resource + '?v=' + version + '"'), 'current release cache-bust matches');
  });
}

test('setCustomColor persists lower-case HEX and applies RGB to palette, styles and cursor', () => {
  const h = harness({ themeColor: 'green' }); h.clear();
  assert.equal(h.ctx.setCustomColor('#Aa00FF'), true);
  assert.equal(h.store.get('themeCustomColor'), '#aa00ff');
  assert.equal(h.store.get('themeColor'), 'custom');
  assert.deepEqual(h.writes, [['themeCustomColor', '#aa00ff'], ['themeColor', 'custom']]);
  assert.equal(Object.fromEntries(h.palette()).custom, 'rgb(170, 0, 255)');
  assertColor(h, 'rgb(170, 0, 255)'); assertSelection(h, 'custom');
  assert.deepEqual(h.calls, ['calendar', 'cursor']);
  assert.equal(h.nodes.get('customThemeInput').value, '#aa00ff');
  assert.equal(h.nodes.get('customThemeChoice').style.getPropertyValue('--custom-theme-color'), '#aa00ff');
  assert.match(h.nodes.get('themeColorStatus').textContent, /自定义/);
  assert.match(h.nodes.get('themeColorStatus').textContent.toLowerCase(), /#aa00ff/);
});
test('cursor refresh counts follow RGB across custom updates, repeat events and equivalent preset', () => {
  const h = harness({ themeColor: 'green' }); h.clear();
  h.ctx.setCustomColor('#112233'); h.ctx.setCustomColor('#445566');
  assert.equal(h.calls.filter(call => call === 'cursor').length, 2);
  assertColor(h, 'rgb(68, 85, 102)');
  h.ctx.setCustomColor('#445566'); h.ctx.setColor('custom');
  assert.equal(h.calls.filter(call => call === 'cursor').length, 2, 'oninput/onchange repeat is cheap');
  h.ctx.setCustomColor('#FF1493');
  assert.equal(h.calls.filter(call => call === 'cursor').length, 3);
  h.ctx.setColor('green');
  assert.equal(h.calls.filter(call => call === 'cursor').length, 3, 'same RGB across keys is cheap');
  assertSelection(h, 'green');
});
test('saved custom is restored on load and remembered after switching to a preset', () => {
  const h = harness({ themeColor: 'custom', themeCustomColor: '#ABCDEF', unrelated: 'keep' });
  assertColor(h, 'rgb(171, 205, 239)'); assertSelection(h, 'custom');
  h.ctx.setColor('red'); assertColor(h, presets.red); assertSelection(h, 'red');
  assert.equal(h.store.get('themeCustomColor'), '#ABCDEF');
  h.ctx.setColor('custom'); assertColor(h, 'rgb(171, 205, 239)'); assertSelection(h, 'custom');
  assert.equal(h.nodes.get('customThemeInput').value, '#abcdef');
  assert.equal(h.store.get('unrelated'), 'keep');
});
for (const [index, value] of invalidHexes.entries()) {
  test('invalid custom HEX is rejected with zero side effects #' + index, () => {
    const h = harness({ themeColor: 'custom', themeCustomColor: '#123456' }); h.clear();
    const before = h.snapshot();
    assert.equal(h.ctx.validThemeHex(value), false);
    assert.equal(h.ctx.setCustomColor(value), false);
    assert.deepEqual(h.snapshot(), before);
  });
}
test('validThemeHex accepts only six-digit HEX and converter preserves channel boundaries', () => {
  const h = harness();
  for (const [hex, rgb] of [['#000000', 'rgb(0, 0, 0)'], ['#FFFFFF', 'rgb(255, 255, 255)'],
    ['#0102Fe', 'rgb(1, 2, 254)'], ['#FF1493', presets.green]]) {
    assert.equal(h.ctx.validThemeHex(hex), true);
    assert.equal(h.ctx.themeHexToRGB(hex), rgb);
    assert.equal(h.ctx.setCustomColor(hex), true); assertColor(h, rgb);
  }
});
for (const key of [undefined, null, '', 'unknown', '__proto__', 'constructor', 'toString', 'CUSTOM']) {
  test('unknown stored key falls back to green and persists selection: ' + String(key), () => {
    const h = harness(key == null ? {} : { themeColor: key });
    assert.equal(h.store.get('themeColor'), 'green');
    assert.deepEqual(h.writes, [['themeColor', 'green']]);
    assertColor(h, presets.green); assertSelection(h, 'green');
    h.ctx.setColor(key); assertColor(h, presets.green);
    assert.equal(h.store.get('themeColor'), 'green');
  });
  test('first-paint boot rejects unknown/prototype key: ' + String(key), () => {
    assertBootColor(bootHarness(key == null ? {} : { themeColor: key }), presets.green);
  });
}
test('invalid saved custom falls back to green despite earlier valid custom palette entry', () => {
  const h = harness({ themeColor: 'custom', themeCustomColor: '#112233' });
  h.store.set('themeCustomColor', '#bad'); h.clear(); h.ctx.setColor('custom');
  assert.equal(h.store.get('themeColor'), 'green'); assertColor(h, presets.green); assertSelection(h, 'green');
  assert.equal(h.nodes.get('customThemeInput').value, '#FF1493');
  assert.equal(h.nodes.get('customThemeChoice').style.getPropertyValue('--custom-theme-color'), '#FF1493');
  assert.deepEqual(h.writes, [['themeColor', 'green']]);
});

test('sync clears stale radios without touching persistence or cursor', () => {
  const h = harness({ themeColor: 'blue', themeCustomColor: '#FEDCBA' });
  for (const id of Object.keys(presets)) h.nodes.get(id).checked = true;
  h.nodes.get('customThemeChoice').classList.toggle('is-selected', true); h.clear();
  h.ctx.syncThemeColorControls(); assertSelection(h, 'blue');
  assert.equal(h.nodes.get('customThemeInput').value, '#fedcba');
  assert.deepEqual(h.writes, []); assert.deepEqual(h.calls, []);
});
test('all missing controls and each individual missing control are safe on load and updates', () => {
  for (const options of [{ controls: false }, ...controlIds.map(id => ({ missing: [id] }))]) {
    let h;
    assert.doesNotThrow(() => {
      h = harness({ themeColor: 'custom', themeCustomColor: '#123456' }, options);
      h.ctx.syncThemeColorControls(); h.ctx.setColor('blue'); h.ctx.setCustomColor('#010203');
    }, JSON.stringify(options));
    assertColor(h, 'rgb(1, 2, 3)'); assertSelection(h, 'custom');
  }
});
test('sync invalid/missing HEX uses default picker color without writing settings', () => {
  for (const value of [undefined, '', '#abc', '#123456; color:red']) {
    const h = harness({ themeColor: 'green', ...(value === undefined ? {} : { themeCustomColor: value }) }); h.clear();
    const before = [...h.store]; h.ctx.syncThemeColorControls();
    assert.equal(h.nodes.get('customThemeInput').value, '#FF1493');
    assert.equal(h.nodes.get('customThemeChoice').style.getPropertyValue('--custom-theme-color'), '#FF1493');
    assertSelection(h, 'green'); assert.deepEqual([...h.store], before); assert.deepEqual(h.writes, []);
  }
});
test('initItem defaults themeCustomColor without requiring DOM or cursor globals', () => {
  const store = new Map([['themeCustomColor', '#abcdef'], ['themeColor', 'custom']]);
  const ctx = vm.createContext({ localStorage: { setItem: (key, value) => store.set(key, String(value)) } });
  vm.runInContext(defaultsSource, ctx); ctx.initItem();
  assert.equal(store.get('themeColor'), 'green'); assert.equal(store.get('themeCustomColor'), '#FF1493');
});
test('markup keeps ten accessible preset radios and puts custom picker last', () => {
  const h = harness(), markup = h.ctx.themeColorMarkup();
  const labels = [...markup.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/g)];
  assert.equal(labels.length, 11);
  const choices = Array.from(h.ctx.themeColorPresets, pair => Array.from(pair)), radioIds = [];
  for (const [index, [id, name]] of choices.entries()) {
    const outer = attributes(labels[index][1]);
    assert.ok(outer.class.split(/\s+/).includes('theme-choice')); assert.equal(outer.title, name);
    const input = labels[index][2].match(/<input\b[^>]*>/); assert.ok(input, id + ' wrapped by label');
    const attrs = attributes(input[0]);
    assert.equal(attrs.type, 'radio'); assert.equal(attrs.id, id); assert.equal(attrs.name, 'colors');
    assert.equal(attrs['aria-label'], name); assert.equal(attrs.onclick, "setColor('" + id + "')");
    radioIds.push(attrs.id);
  }
  assert.deepEqual(radioIds.sort(), Object.keys(presets).sort());
  const custom = labels.at(-1), attrs = attributes(custom[1]);
  assert.equal(attrs.id, 'customThemeChoice'); assert.ok(attrs.class.split(/\s+/).includes('theme-choice'));
  assert.match(custom[2], /<span\b[^>]*class=["'][^"']*\btheme-rainbow\b/);
  const picker = attributes(custom[2].match(/<input\b[^>]*>/)[0]);
  assert.equal(picker.id, 'customThemeInput'); assert.equal(picker.type, 'color');
  assert.equal(picker.oninput, 'setCustomColor(this.value)'); assert.equal(picker.onchange, 'setCustomColor(this.value)');
  assert.match(picker['aria-label'], /自定义/); assert.equal(picker['aria-describedby'], 'themeColorStatus');
  assert.match(markup, /\bid=["']themeColorStatus["']/);
  assert.equal([...markup.matchAll(/<input\b[^>]*type=["']radio["']/g)].length, 10);
  for (const id of Object.keys(legacyPresets)) assert.equal(radioIds.includes(id), false, id + ' legacy radio removed');
});
for (const hex of ['#123456', '#ABCDEF', '#000000', '#FFFFFF']) {
  test('first-paint boot accepts strictly valid custom HEX: ' + hex, () => {
    const h = bootHarness({ themeColor: 'custom', themeCustomColor: hex });
    assert.equal(h.css.toLowerCase(), ':root{--theme-color:' + hex.toLowerCase() + ' !important}');
    assert.deepEqual(h.writes, []);
  });
}
// localStorage.getItem returns only strings/null; non-string setter inputs are
// covered above, not used as impossible boot storage values.
for (const [index, value] of invalidHexes.filter(value => value == null || typeof value === 'string').entries()) {
  test('first-paint boot rejects invalid custom HEX and injection payload #' + index, () => {
    assertBootColor(bootHarness({ themeColor: 'custom', ...(value === undefined ? {} : { themeCustomColor: value }) }), presets.green);
    const h = harness({ themeColor: 'custom', ...(value === undefined ? {} : { themeCustomColor: value }) });
    assertColor(h, presets.green); assert.equal(h.store.get('themeColor'), 'green');
  });
}
