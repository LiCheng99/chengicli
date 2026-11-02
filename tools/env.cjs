/**
 * tools/env.cjs —— 读项目根目录的 .env
 * ---------------------------------------------------------------------------
 * 顺序：先读 .env，但**不覆盖**已经存在的环境变量 —— 线上 systemd 的
 * Environment= / 宝塔面板里配的变量优先级更高，.env 只当本地兜底。
 * 格式：# 注释、空行、KEY=VALUE，值可以用单/双引号包起来。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '..', '.env');

function loadEnv() {
  let raw = '';
  try {
    raw = fs.readFileSync(ENV_FILE, 'utf8');
  } catch (e) {
    return false;                     // 没有 .env 很正常，用现有环境变量继续
  }
  raw.split(/\r?\n/).forEach(function (line) {
    const s = String(line).trim();
    if (!s || s.charAt(0) === '#') return;
    const i = s.indexOf('=');
    if (i < 1) return;
    const key = s.slice(0, i).trim();
    let val = s.slice(i + 1).trim();
    if (val.length > 1 && ((val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') ||
        (val.charAt(0) === "'" && val.charAt(val.length - 1) === "'"))) {
      val = val.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = val;
  });
  return true;
}

module.exports = { loadEnv: loadEnv, ENV_FILE: ENV_FILE };
