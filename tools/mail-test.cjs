#!/usr/bin/env node
/**
 * SMTP 发信自检 —— 定位 Twikoo 邮件通知 "535 authentication failed" 的真实原因
 * ---------------------------------------------------------------------------
 * 为什么需要它：网易企业邮对「账号不存在」和「密码错误」返回的都是
 *   535 Error: authentication failed
 * 从 Twikoo 页面上的那一行报错里根本分不出是哪一种。这个脚本把整段
 * SMTP 对话打出来，并顺手体检你的授权码本身（长度 / 首尾空白 / 全角字符）。
 *
 * 用法（授权码走环境变量，不要写进命令行历史）：
 *   MAIL_PASS='你的授权码' node tools/mail-test.cjs
 *   MAIL_PASS='授权码' node tools/mail-test.cjs --port 465
 *   MAIL_PASS='授权码' node tools/mail-test.cjs --send 收件人@example.com
 *   node tools/mail-test.cjs                      # 不给密码 → 只测网络层
 *
 * 参数：--host --port --user --pass --send
 * 默认：smtphz.qiye.163.com / 994 / root@licic.net
 */
'use strict';

const tls = require('tls');

/* ── 参数 ─────────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) { continue; }
  const k = argv[i].slice(2);
  const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
  args[k] = v;
}
const HOST = typeof args.host === 'string' ? args.host : 'smtphz.qiye.163.com';
const PORT = Number(args.port || 994);
const USER = typeof args.user === 'string' ? args.user : 'root@licic.net';
const PASS = process.env.MAIL_PASS || (typeof args.pass === 'string' ? args.pass : '');
const SEND_TO = typeof args.send === 'string' ? args.send : '';

const out = (s) => process.stdout.write(s + '\n');
const ok = (s) => out('  [OK]   ' + s);
const bad = (s) => out('  [FAIL] ' + s);
const info = (s) => out('         ' + s);

/* ── 连接 + 应答读取 ──────────────────────────────────────────────────── */
function connect() {
  return new Promise((resolve, reject) => {
    const s = tls.connect(
      { host: HOST, port: PORT, servername: HOST, timeout: 15000 },
      () => resolve(s)
    );
    s.once('error', (e) => reject(e));
    s.once('timeout', () => reject(new Error('ETIMEDOUT')));
  });
}

function makeReader(sock) {
  let buf = '';
  let waiter = null;
  sock.on('data', (d) => {
    buf += d.toString('utf8');
    if (waiter) { const w = waiter; waiter = null; w(); }
  });

  return function next(timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { waiter = null; reject(new Error('REPLY_TIMEOUT')); }, timeoutMs);

      const tryRead = () => {
        const lines = buf.split('\r\n');
        for (let i = 0; i < lines.length - 1; i++) {
          if (/^\d{3} /.test(lines[i])) {
            const block = lines.slice(0, i + 1);
            buf = lines.slice(i + 1).join('\r\n');
            clearTimeout(timer);
            resolve({ code: Number(lines[i].slice(0, 3)), text: lines[i].slice(4), raw: block });
            return true;
          }
        }
        return false;
      };

      if (!tryRead()) { waiter = () => { if (!tryRead()) { /* 继续等下一次 data */ } }; }
    });
  };
}

/* ── 授权码体检 ───────────────────────────────────────────────────────── */
function checkPass(p) {
  const problems = [];
  if (!p) { problems.push('为空'); }
  if (p !== p.trim()) { problems.push('首尾有空格或换行'); }
  if (/[\u3000-\u303f\uff00-\uffef\u4e00-\u9fa5]/.test(p)) { problems.push('含全角字符或中文'); }
  if (/[“”‘’]/.test(p)) { problems.push('含中文引号'); }
  return { len: p.length, problems };
}

/* ── 主流程 ───────────────────────────────────────────────────────────── */
(async () => {
  out('');
  out('SMTP 自检  ' + HOST + ':' + PORT + '  用户 ' + USER);
  out('─'.repeat(64));

  /* 1. 网络层 */
  out('1/4 建立 TLS 连接');
  let sock;
  try {
    sock = await connect();
  } catch (e) {
    bad('连不上：' + (e.code || e.message));
    info('端口或 HOST 不对、被防火墙挡、或出口被限。');
    info('换 --port 465 再试一次；仍连不上说明网络位置被挡（Vercel 海外出口常见）。');
    process.exit(1);
  }
  ok('TLS 已建立，协议 ' + sock.getProtocol() + ' / ' + (sock.getCipher() || {}).name);

  const next = makeReader(sock);

  /* 2. 服务器握手 */
  out('2/4 读取服务器标识');
  let r;
  try {
    r = await next();
  } catch (e) {
    bad('没收到欢迎语：' + e.message);
    process.exit(1);
  }
  if (r.code !== 220) {
    bad('欢迎语异常 ' + r.code + ' ' + r.text);
    process.exit(1);
  }
  ok('220 ' + r.text);
  info('这是哪台服务器认准这一行。企业邮是 gyproxy-*.gy.ntes，');
  info('如果你想看到 smtp.163.com 的字样，说明 Twikoo 的 SMTP_SERVICE 没留空。');

  sock.write('EHLO lichengic-check\r\n');
  let ehlo;
  try {
    ehlo = await next();
  } catch (e) {
    bad('EHLO 无响应');
    process.exit(1);
  }
  if (ehlo.code !== 250) {
    bad('EHLO 被拒绝 ' + ehlo.code + ' ' + ehlo.text);
    process.exit(1);
  }
  const mech = Array.from(new Set(
    ehlo.raw
      .map((l) => l.replace(/^\d{3}[ -]/, ''))
      .filter((l) => /^AUTH/i.test(l))
      .reduce((acc, l) => acc.concat(l.replace(/^AUTH[= ]/i, '').trim().split(/\s+/)), [])
  )).join(' ');
  const authLine = mech || '';
  ok('EHLO 通过，服务器支持的认证方式：' + (mech || '未广告'));
  if (!authLine) {
    bad('这台服务器没有广告 AUTH —— 可能连到了非发信端口。');
    info('检查 SMTP_PORT：网易企业邮的发信端口是 994（SSL）或 465（SSL），不是 25。');
    sock.destroy();
    process.exit(1);
  }

  /* 3. 不填密码时到此为止 */
  if (!PASS) {
    out('3/4 认证 —— 已跳过（没有提供授权码）');
    info('网络层完全正常：能连、能握 TLS、能 EHLO、服务器愿意收认证。');
    info('加上授权码再跑一次即可验证凭据：MAIL_PASS=\'授权码\' node tools/mail-test.cjs');
    sock.write('QUIT\r\n');
    sock.destroy();
    out('');
    out('结论：网络没问题，535 只可能是「账号 / 授权码」这一侧的问题。');
    process.exit(0);
  }

  out('3/4 提交认证');
  const pd = checkPass(PASS);
  info('授权码长度 ' + pd.len + (pd.problems.length ? '，异常：' + pd.problems.join('、') : '，格式看着正常(仅查不可见字符与全角)'));

  sock.write('AUTH LOGIN\r\n');
  const a1 = await next();
  if (a1.code !== 334) {
    bad('AUTH LOGIN 未被接受：' + a1.code + ' ' + a1.text);
    info('说明服务器要求别的认证方式，或该账号的客户端登录被禁用。');
    sock.destroy();
    process.exit(1);
  }
  sock.write(Buffer.from(USER).toString('base64') + '\r\n');
  await next();                                  /* 334 等待密码 */
  sock.write(Buffer.from(PASS).toString('base64') + '\r\n');

  let res;
  try {
    res = await next();
  } catch (e) {
    bad('认证阶段连接被断开（' + e.message + '），服务器没有返回错误码。');
    info('这通常是网易的风控：短时间内失败太多次会直接掐断连接。');
    info('等 10 分钟再试，且先确认下面几项再试，不要反复重试。');
    sock.destroy();
    process.exit(1);
  }

  if (res.code === 235) {
    ok('认证成功 235 ' + res.text);
  } else {
    bad('认证失败 ' + res.code + ' 「' + res.text + '」');
    out('');
    out('  这个码怎么读：');
    const tips = {
      535: [
        '账号或授权码不对。按顺序查：',
        '  a) Twikoo 的 SMTP_SERVICE 必须留空（选了 163 会去连 smtp.163.com）',
        '  b) SMTP_PASS 要填「客户端授权码」，不是邮箱登录密码',
        '  c) 授权码生成时必须勾选了 SMTP（只勾 IMAP 时发信会 535）',
        '  d) 授权码里混进了空格 / 全角字符（复制自截图或微信最常见）',
        '  e) SMTP_USER 必须是完整邮箱 root@licic.net，不能只写 root',
        '  f) 企业邮管理后台把「客户端登录 / SMTP 服务」关了'
      ],
      534: ['账号被判定为不安全登录，需要在邮箱设置里开启客户端授权，或改用授权码。'],
      550: ['账号不存在，或发件地址不允许。确认 SMTP_USER 拼写与域名。'],
      530: ['需要先认证。检查是否把认证步骤跳过了。'],
      421: ['服务器临时拒绝（连接过多 / 被限流），等几分钟再试。'],
      454: ['临时认证失败（风控），通常是异地登录被拦，去企业邮后台看登录日志。']
    };
    (tips[res.code] || ['未知错误码，把这一行完整发给服务商客服。']).forEach((t) => out('  ' + t));
    sock.destroy();
    process.exit(2);
  }

  /* 4. 可选：真发一封 */
  out('4/4 ' + (SEND_TO ? '试投一封邮件给 ' + SEND_TO : '试投 —— 已跳过（没给 --send）'));
  if (!SEND_TO) {
    sock.write('QUIT\r\n');
    sock.destroy();
    out('');
    out('结论：认证通过。如果 Twikoo 那边还报 535，那就是 Twikoo 里的值没存上，');
    out('      或者改了 Vercel 环境变量却没点 Redeploy。');
    return;
  }

  const step = async (cmd, expect, label) => {
    sock.write(cmd + '\r\n');
    const rr = await next();
    if (!expect.includes(rr.code)) {
      bad(label + ' 失败 ' + rr.code + ' ' + rr.text);
      sock.destroy();
      process.exit(3);
    }
    ok(label + ' ' + rr.code);
    return rr;
  };

  try {
    await step('MAIL FROM:<' + USER + '>', [250], 'MAIL FROM');
    await step('RCPT TO:<' + SEND_TO + '>', [250, 251], 'RCPT TO');
    await step('DATA', [354], 'DATA');
    const body = [
      'From: =?UTF-8?B?' + Buffer.from('LICHENG 自检').toString('base64') + '?= <' + USER + '>',
      'To: <' + SEND_TO + '>',
      'Subject: =?UTF-8?B?' + Buffer.from('SMTP 自检 ' + new Date().toLocaleString('zh-CN')).toString('base64') + '?=',
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from('这封是 mail-test.cjs 发出的自检邮件，收到说明整条链路都通。').toString('base64')
    ].join('\r\n');
    sock.write(body + '\r\n.\r\n');
    const fin = await next();
    if (fin.code === 250) {
      ok('邮件已被服务器接收 ' + fin.text);
      out('');
      out('结论：整条链路通。去收件箱（和垃圾箱）确认一下。');
    } else {
      bad('投递被拒 ' + fin.code + ' ' + fin.text);
    }
  } catch (e) {
    bad('投递过程中出错：' + e.message);
  }
  try { sock.write('QUIT\r\n'); } catch (e) {}
  sock.destroy();
})();
