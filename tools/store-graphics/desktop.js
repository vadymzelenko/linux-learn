// Desktop screenshots (1920×1080) and a promo video (1920×1080 MP4) from the real web build.
// Serve the web build with an SPA fallback on :8801 first (see README.md).
// Usage: OUT_DIR=out node desktop.js [--video]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OUT = path.resolve(process.env.OUT_DIR || 'desktop');
const URL = process.env.APP_URL || 'http://127.0.0.1:8801';
fs.mkdirSync(OUT, { recursive: true });
// 1280×720 CSS px at 1.5× = 1920×1080 image: larger, easier to read UI than a raw 1080p window.
const VP = { width: 1280, height: 720 };
const SCALE = 1.5;

const done = ['nav-where-am-i','nav-look-around','nav-moving','nav-hidden-and-details','nav-paths','nav-superpowers','files-create','files-read-write','files-copy-move','files-delete','files-wildcards','text-head-tail','text-wc-grep','gt-why','gt-setup','dk-why','dk-hello','noc-role'];
// every achievement already earned, so no 'Achievement unlocked' toasts cover the shots
const ACH = ['first-command', 'first-lesson', 'first-pipe', 'grep-master', 'no-hints-module', 'module-done', 'all-modules', 'first-mission', 'all-missions', 'streak-3', 'streak-7', 'daily-challenge', 'level-root', 'sudo-user', 'explorer', 'night-owl', 'rm-rf-root', 'fork-bomb', 'exam-passed'];
const dk = (d) => d.toISOString().slice(0, 10);
const progress = () => ({
  xp: 1240,
  lessons: Object.fromEntries(done.map((id, i) => [id, { step: 0, hints: 0, xp: 40 + (i % 3) * 10, completedAt: 1700000000000 + i }])),
  achievements: Object.fromEntries(ACH.map((a, i) => [a, i + 1])),
  streak: { current: 12, best: 12, last: dk(new Date()), freezes: 1 },
  stats: { commands: 486, grep: 31, pipes: 22, sudo: 4, dirs: [] },
  srs: { grep: { ef: 2.5, interval: 0, reps: 0, due: '2026-01-01' }, wc: { ef: 2.5, interval: 0, reps: 0, due: '2026-01-01' } },
});

async function open(b, extra = {}) {
  const ctx = await b.newContext({ viewport: VP, deviceScaleFactor: SCALE, ...extra });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await p.goto(URL + '/');
  await p.evaluate((pr) => localStorage.setItem('linux-trainer', JSON.stringify({ state: { settings: { onboarded: true, lang: 'en', theme: 'classic', certName: 'Alex', keyboard: { mode: 'system' } }, progress: pr }, version: 1 })), progress());
  return { ctx, p };
}
const typeLine = async (p, line, delay = 0) => { await p.keyboard.type(line, { delay }); await p.keyboard.press('Enter'); await p.waitForTimeout(delay ? 900 : 300); };
const go = async (p, route, wait = 1500) => { await p.goto(URL + route); await p.waitForTimeout(wait); };
const next = async (p) => { await p.getByRole('button', { name: /^(Continue|Next|Start)/ }).last().click(); await p.waitForTimeout(1200); };

const SHOTS = [
  ['1-home', async (p) => go(p, '/')],
  ['2-lesson', async (p) => { await go(p, '/lesson/text-pipes'); await next(p); for (const l of ['ls data', 'cat data/names.txt | sort', 'sort data/names.txt | uniq -c | sort -rn']) await typeLine(p, l); }],
  ['3-explain', async (p) => go(p, `/explain?cmd=${encodeURIComponent("find /var/log -name '*.log' -mtime +7 | xargs gzip")}`)],
  ['4-mission', async (p) => { await go(p, '/mission/noc-shop-502'); for (const l of ['curl -I localhost', 'systemctl status api']) await typeLine(p, l); }],
  ['5-courses', async (p) => go(p, '/courses')],
  ['6-predict', async (p) => { await go(p, '/lesson/text-sort-uniq'); await next(p); }],
];

(async () => {
  const b = await chromium.launch();
  const only = process.argv.includes('--video') ? [] : SHOTS;
  for (const [name, fn] of only) {
    const { ctx, p } = await open(b);
    await fn(p);
    await p.waitForTimeout(900);
    await p.screenshot({ path: path.join(OUT, `desktop-${name}.png`) });
    console.log('shot', name);
    await ctx.close();
  }
  if (process.argv.includes('--video')) {
    // High-quality frames from the DevTools screencast, then a constant 30 fps H.264 file.
    const fdir = path.join(OUT, 'frames');
    fs.rmSync(fdir, { recursive: true, force: true });
    fs.mkdirSync(fdir);
    const { ctx, p } = await open(b);
    await p.addStyleTag({ content: 'html,body{background:#0B0F14}' }).catch(() => {});
    const cdp = await ctx.newCDPSession(p);
    const frames = [];
    cdp.on('Page.screencastFrame', async (f) => {
      const file = path.join(fdir, `f${String(frames.length).padStart(5, '0')}.jpg`);
      fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
      frames.push({ file, t: f.metadata.timestamp });
      await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    });
    const card = (title, sub) => p.setContent(`<html><body style="margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;background:#0B0F14;color:#F2F5F8;font-family:Onest,system-ui,sans-serif">
      <div style="font:700 26px monospace;color:#3DDC84">$ _</div>
      <div style="font-weight:800;font-size:56px;letter-spacing:-1px">${title}</div>
      <div style="font-size:26px;color:#93A1B0">${sub}</div></body></html>`);
    let ticking = true;
    // keep frames coming while the screen is still (the screencast only sends changes)
    const tick = (async () => { while (ticking) { await p.evaluate(() => { document.body && document.body.setAttribute('data-t', Date.now()); }).catch(() => {}); await p.waitForTimeout(100); } })();
    // title cards are still images with a fixed duration
    const still = async (name, title, sub) => { await card(title, sub); await p.waitForTimeout(300); const file = path.join(fdir, name + '.jpg'); await p.screenshot({ path: file, type: 'jpeg', quality: 95 }); return file; };
    const intro = await still('intro', 'Linux Terminal Trainer', 'Learn the Linux terminal by typing real commands');
    const outro = await still('outro', 'Free on Google Play', 'Linux · NOC · Docker · Git — offline, no account, no ads');
    await go(p, '/', 1500);
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
    await p.waitForTimeout(3000);
    await go(p, '/lesson/text-pipes', 2000);
    await next(p); await p.waitForTimeout(800);
    for (const l of ['ls data', 'cat data/names.txt | sort', 'sort data/names.txt | uniq -c | sort -rn']) await typeLine(p, l, 70);
    await p.waitForTimeout(2500);
    await go(p, `/explain?cmd=${encodeURIComponent("find /var/log -name '*.log' -mtime +7 | xargs gzip")}`, 4500);
    await p.mouse.wheel(0, 500); await p.waitForTimeout(2000);
    await go(p, '/mission/noc-shop-502', 2500);
    for (const l of ['curl -I localhost', 'systemctl status api']) await typeLine(p, l, 70);
    await p.waitForTimeout(3500);
    await go(p, '/courses', 3000);
    ticking = false; await tick;
    await cdp.send('Page.stopScreencast');
    const stopped = Date.now() / 1000;
    await ctx.close();
    // concat list with real frame durations
    const lines = [];
    for (let i = 0; i < frames.length; i++) {
      const d = i + 1 < frames.length ? frames[i + 1].t - frames[i].t : stopped - frames[i].t;
      lines.push(`file '${frames[i].file}'`, `duration ${Math.min(5, Math.max(0.001, d)).toFixed(4)}`);
    }
    lines.push(`file '${frames[frames.length - 1].file}'`);
    fs.writeFileSync(path.join(fdir, 'list.txt'), lines.join('\n'));
    const enc = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30'];
    const vf = 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0B0F14,fps=30,format=yuv420p';
    const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
    const seg = (n) => path.join(fdir, `seg${n}.mp4`);
    ff(['-loop', '1', '-t', '3', '-i', intro, '-vf', vf + ',fade=t=in:st=0:d=0.6', ...enc, seg(1)]);
    ff(['-f', 'concat', '-safe', '0', '-i', path.join(fdir, 'list.txt'), '-vf', vf, ...enc, seg(2)]);
    ff(['-loop', '1', '-t', '4', '-i', outro, '-vf', vf + ',fade=t=out:st=3.3:d=0.7', ...enc, seg(3)]);
    fs.writeFileSync(path.join(fdir, 'segs.txt'), [1, 2, 3].map((n) => `file '${seg(n)}'`).join('\n'));
    ff(['-f', 'concat', '-safe', '0', '-i', path.join(fdir, 'segs.txt'), '-c', 'copy', '-movflags', '+faststart', path.join(OUT, 'promo-1920x1080.mp4')]);
    fs.rmSync(fdir, { recursive: true, force: true });
    console.log('video done:', frames.length, 'frames');
  }
  await b.close();
})();
