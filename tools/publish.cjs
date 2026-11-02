#!/usr/bin/env node
'use strict';
/**
 * publish —— 一条命令发布站点
 * ---------------------------------------------------------------------------
 * 用法：
 *   npm run publish            提交 + 推 GitHub + 部署 Vercel（默认）
 *   npm run publish -- --src   只提交 + 推 GitHub（不动 Vercel）
 *   npm run publish -- --src-only  同上（别名）
 *   node tools/publish.cjs --dry-run   只看会做什么，不执行
 *
 * 说明：
 *   · 提交信息自动生成（ASCII，避免 Windows 下中文参数的编码问题）：
 *       chore: site update 2026-11-02 13:20
 *   · 没有改动时跳过 commit，但仍然会 push（可能只是本地落后）和部署。
 *   · push 失败会重试 3 次（github.com 偶发 502 / SSL eof）。
 *   · push 遇到 non-fast-forward 时提示先 `git pull --rebase`，不会自动改写历史。
 */
const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const SRC_ONLY = argv.includes('--src') || argv.includes('--src-only');

function sh(cmd, args, opts) {
  return spawnSync(cmd, args, Object.assign({ cwd: ROOT, encoding: 'utf8' }, opts || {}));
}

function step(name) {
  console.log('\n> ' + name);
}

function git(args, quiet) {
  const r = sh('git', args, { stdio: quiet ? 'pipe' : 'inherit' });
  return r;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function now() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
    ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

function fail(msg, hint) {
  console.error('\n✗ ' + msg);
  if (hint) console.error('  ' + hint);
  process.exit(1);
}

// ── 1. 有没有改动 ──────────────────────────────────────────────────────────
step('检查工作区');
const st = sh('git', ['status', '--porcelain']);
if (st.status !== 0) fail('git status 执行失败', String(st.stderr || '').trim());
const dirty = (st.stdout || '').trim();
const changedCount = dirty ? dirty.split('\n').length : 0;

if (changedCount) {
  console.log('  ' + changedCount + ' 个文件有改动');
  // 敏感文件兜底：这些一旦出现直接停下（正常被 .gitignore 挡住，出现说明规则被改了）
  const risky = dirty.split('\n').filter(l => /\.ai-chat-key|\.env($|\.)|assets\/drawings|\.vercel\//.test(l));
  if (risky.length) {
    console.error('  ⚠ 发现敏感文件被跟踪：');
    risky.forEach(l => console.error('    ' + l));
    fail('已中止，请先检查 .gitignore');
  }
} else {
  console.log('  没有改动');
}

// ── 2. 提交 ────────────────────────────────────────────────────────────────
const msg = 'chore: site update ' + now();
if (changedCount) {
  step('提交：' + msg);
  if (DRY) {
    console.log('  (dry-run) 跳过');
  } else {
    if (git(['add', '-A']).status !== 0) fail('git add 失败');
    const c = git(['commit', '-m', msg]);
    if (c.status !== 0) fail('git commit 失败');
  }
}

// ── 3. 推送（重试 3 次）───────────────────────────────────────────────────
step('推送到 GitHub');
if (DRY) {
  console.log('  (dry-run) 跳过');
} else {
  let ok = false;
  for (let i = 1; i <= 3; i++) {
    const r = sh('git', ['push'], { env: Object.assign({}, process.env, { GIT_TERMINAL_PROMPT: '0' }) });
    const out = (r.stdout || '') + (r.stderr || '');
    if (r.status === 0) { ok = true; break; }
    if (/non-fast-forward|rejected|fetch first/i.test(out)) {
      fail('远端有新提交，本地落后', '先跑： git pull --rebase  然后再 npm run publish');
    }
    console.error('  第 ' + i + ' 次失败：' + out.split('\n').filter(Boolean).slice(-1)[0]);
    if (i < 3) sleep(3000);
  }
  if (!ok) fail('推送失败（github.com 连接不稳）', '换网络重试，或稍后再跑一次');
  console.log('  ✓ 已推送');
}

// ── 4. 部署 Vercel ─────────────────────────────────────────────────────────
if (SRC_ONLY) {
  console.log('\n(--src) 跳过 Vercel 部署');
} else {
  step('部署到 Vercel');
  if (DRY) {
    console.log('  (dry-run) 跳过');
  } else {
    const r = sh('npx', ['vercel', '--prod'], { stdio: 'inherit', shell: true });
    if (r.status !== 0) fail('Vercel 部署失败', '看上面的日志；可单独重跑 npx vercel --prod');
    console.log('  ✓ 已部署');
  }
}

console.log('\n完成。');
