// Step 1 of the store graphics: raw app screens (1170x2532 phone, 7" and 10" tablets).
// Serve the two web builds first (see README.md): free on :8801, pro on :8802.
// Output: $RAW_DIR (default ./raw)
const { chromium } = require('playwright');
const fs = require('fs');
const RAW = process.env.RAW_DIR || 'raw';
fs.mkdirSync(RAW, { recursive: true });
const done = ['nav-where-am-i','nav-look-around','nav-moving','nav-hidden-and-details','nav-paths','nav-superpowers','files-create','files-read-write','files-copy-move','files-delete','files-wildcards','text-head-tail','text-wc-grep'];
const today = new Date(); const dk = (d) => d.toISOString().slice(0, 10);
const progress = (extra = []) => ({
  xp: 1240,
  lessons: Object.fromEntries([...done, ...extra].map((id, i) => [id, { step: 0, hints: 0, xp: 40 + (i % 3) * 10, completedAt: 1700000000000 + i }])),
  achievements: Object.fromEntries(["first-command", "first-lesson", "first-pipe", "grep-master", "no-hints-module", "module-done", "all-modules", "first-mission", "all-missions", "streak-3", "streak-7", "daily-challenge", "level-root", "sudo-user", "explorer", "night-owl", "rm-rf-root", "fork-bomb", "exam-passed"].map((a, i) => [a, i + 1])),
  streak: { current: 12, best: 12, last: dk(today), freezes: 1 },
  stats: { commands: 486, grep: 31, pipes: 22, sudo: 4, dirs: [] },
  srs: { grep: { ef: 2.5, interval: 0, reps: 0, due: '2026-01-01' }, wc: { ef: 2.5, interval: 0, reps: 0, due: '2026-01-01' }, tail: { ef: 2.5, interval: 0, reps: 0, due: '2026-01-01' } },
});
async function page(b, port, vp, scale, extra, theme = 'classic') {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: scale, hasTouch: true, isMobile: vp.width < 900 });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await p.goto(`http://127.0.0.1:${port}/`);
  await p.evaluate(([pr, theme]) => localStorage.setItem('linux-trainer', JSON.stringify({ state: { settings: { onboarded: true, lang: 'en', theme, certName: 'Alex', keyboard: { mode: 'custom' } }, progress: pr }, version: 1 })), [progress(extra), theme]);
  return { ctx, p };
}
const type = async (p, lines) => { const input = p.locator('input').first(); for (const l of lines) { await input.fill(l); await input.press('Enter'); await p.waitForTimeout(250); } };
async function shoot(b, ed, port, name, vp, scale, fn, extra = []) {
  const { ctx, p } = await page(b, port, vp, scale, extra);
  await fn(p);
  await p.waitForTimeout(900);
  // no toasts in marketing shots
  await p.screenshot({ path: `${RAW}/${ed}_${name}.png` });
  await ctx.close();
}
(async () => {
  const b = await chromium.launch();
  const phone = { width: 390, height: 844 };
  for (const [ed, port] of [['free', 8801], ['pro', 8802]]) {
    const extra = ed === 'pro' ? ['gt-why', 'gt-setup', 'dk-why', 'dk-hello', 'noc-role'] : [];
    const P = (name, fn, vp = phone, scale = 3) => shoot(b, ed, port, name, vp, scale, fn, extra);
    await P('home', async (p) => { await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(1500); });
    await P('courses', async (p) => { await p.goto(`http://127.0.0.1:${port}/courses?course=${ed === 'pro' ? 'git' : 'linux'}`); await p.waitForTimeout(1500); await p.evaluate(() => { for (const el of document.querySelectorAll('div')) { const s = getComputedStyle(el); if (s.overflowY === 'auto' && el.scrollHeight > el.clientHeight + 10) el.scrollTop = 330; } }); });
    await P('task', async (p) => {
      await p.goto(`http://127.0.0.1:${port}/lesson/text-pipes`); await p.waitForTimeout(1500);
      await p.getByRole('button', { name: /Continue/ }).last().click(); await p.waitForTimeout(1200);
      await type(p, ['ls data', 'cat data/names.txt | sort', 'sort data/names.txt | uniq -c | sort -rn']);
    });
    await P('explain', async (p) => { await p.goto(`http://127.0.0.1:${port}/explain?cmd=${encodeURIComponent("find /var/log -name '*.log' -mtime +7 | xargs gzip")}`); await p.waitForTimeout(1500); });
    await P('sandbox', async (p) => {
      await p.goto(`http://127.0.0.1:${port}/sandbox`); await p.waitForTimeout(1200);
      await p.getByRole('button', { name: /Home with files/ }).first().click(); await p.waitForTimeout(1300);
      await p.mouse.click(195, 300); await p.waitForTimeout(500);
      await type(p, ['ls -la ~/docs', 'grep -rn "TODO" ~/projects | head -3', 'echo "Hello, $USER" > hi.txt && cat hi.txt', 'cat nope.txt']);
      await p.getByRole('button', { name: /Hide keyboard/ }).first().click().catch(() => {});
    });
    await P('predict', async (p) => { await p.goto(`http://127.0.0.1:${port}/lesson/text-sort-uniq`); await p.waitForTimeout(1400); await p.getByRole('button', { name: /Continue/ }).last().click(); await p.waitForTimeout(1300); });
    await P('review', async (p) => { await p.goto(`http://127.0.0.1:${port}/review`); await p.waitForTimeout(1200); await p.getByRole('button', { name: /Show answer/ }).click(); await p.waitForTimeout(600); });
    await P('practice', async (p) => { await p.goto(`http://127.0.0.1:${port}/practice`); await p.waitForTimeout(1300); });
    if (ed === 'pro') {
      await P('mission', async (p) => { await p.goto(`http://127.0.0.1:${port}/mission/noc-shop-502`); await p.waitForTimeout(1500); await p.getByRole('button', { name: /Hide keyboard/ }).first().click().catch(() => {}); await p.waitForTimeout(400); await type(p, ['curl -I localhost', 'systemctl status api']); });
      await P('git', async (p) => {
        await p.goto(`http://127.0.0.1:${port}/lesson/gt-merge`); await p.waitForTimeout(1400);
        await p.getByRole('button', { name: /Continue/ }).last().click(); await p.waitForTimeout(1300);
        await type(p, ['git log --oneline --graph --all', 'git merge dark-theme']);
      });
    } else {
      await P('pro', async (p) => { await p.goto(`http://127.0.0.1:${port}/pro`); await p.waitForTimeout(1500); });
      await P('glossary', async (p) => { await p.goto(`http://127.0.0.1:${port}/glossary`); await p.waitForTimeout(1300); });
    }
    // tablets: 7" portrait (600x960) and 10" landscape (1280x800, split view)
    const T7 = { width: 600, height: 960 }, T10 = { width: 1280, height: 800 };
    await P('t7_home', async (p) => { await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(1500); }, T7, 2);
    await P('t7_task', async (p) => { await p.goto(`http://127.0.0.1:${port}/lesson/text-pipes`); await p.waitForTimeout(1400); await p.getByRole('button', { name: /Continue/ }).last().click(); await p.waitForTimeout(1200); await type(p, ['cat data/names.txt | sort | uniq']); }, T7, 2);
    await P('t10_task', async (p) => { await p.goto(`http://127.0.0.1:${port}/lesson/text-wc-grep`); await p.waitForTimeout(1400); await p.getByRole('button', { name: /Continue/ }).last().click(); await p.waitForTimeout(1200); await type(p, ['grep -c error logs/app.log', 'grep -i warn logs/app.log | wc -l']); }, T10, 2);
    await P('t10_courses', async (p) => { await p.goto(`http://127.0.0.1:${port}/courses`); await p.waitForTimeout(1500); }, T10, 2);
    await P('t10_explain', async (p) => { await p.goto(`http://127.0.0.1:${port}/explain?cmd=${encodeURIComponent('sudo chown -R www-data:www-data /var/www && chmod 750 deploy.sh')}`); await p.waitForTimeout(1500); }, T10, 2);
    await P('t7_courses', async (p) => { await p.goto(`http://127.0.0.1:${port}/courses`); await p.waitForTimeout(1500); }, T7, 2);
  }
  await b.close();
})();
