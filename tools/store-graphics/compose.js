// Step 2 of the store graphics: marketing frames for Google Play.
//   phone:      8 × 1080×1920 (9:16)
//   tablet 7":  4 × 1080×1920 (9:16)
//   tablet 10": 4 × 1920×1080 (16:9)
//   feature graphic 1024×500, icon 512×512
// Usage: RAW_DIR=raw node compose.js   (writes ../../google-play/*.png)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RAW = path.resolve(process.env.RAW_DIR || 'raw');
const OUT = path.resolve(process.env.OUT_DIR || path.join(__dirname, '../../google-play'));
const ROOT = path.resolve(__dirname, '../..');
const font = (f) => 'file://' + path.join(ROOT, 'node_modules/@expo-google-fonts', f);
const img = (f) => 'file://' + path.join(RAW, f);

const FONTS = `
@font-face { font-family: Onest; font-weight: 800; src: url('${font('onest/800ExtraBold/Onest_800ExtraBold.ttf')}'); }
@font-face { font-family: Onest; font-weight: 600; src: url('${font('onest/600SemiBold/Onest_600SemiBold.ttf')}'); }
@font-face { font-family: Onest; font-weight: 400; src: url('${font('onest/400Regular/Onest_400Regular.ttf')}'); }
@font-face { font-family: Mono; font-weight: 700; src: url('${font('jetbrains-mono/700Bold/JetBrainsMono_700Bold.ttf')}'); }
@font-face { font-family: Mono; font-weight: 400; src: url('${font('jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf')}'); }
* { margin: 0; box-sizing: border-box; }
body { font-family: Onest; color: #F2F5F8; -webkit-font-smoothing: antialiased; }
`;

/** Dark canvas with a coloured glow and a fine grid, like premium app pages. */
const bg = (accent, w, h) => `
  background:
    radial-gradient(${Math.round(w * 0.9)}px ${Math.round(h * 0.55)}px at 50% 18%, ${accent}38, transparent 70%),
    radial-gradient(${Math.round(w * 0.8)}px ${Math.round(h * 0.4)}px at 85% 100%, ${accent}22, transparent 70%),
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px) 0 0 / 54px 54px,
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px) 0 0 / 54px 54px,
    #080B10;`;

const eyebrow = (text, accent) => `<div style="display:inline-flex;align-items:center;gap:14px;padding:12px 26px;border-radius:999px;background:${accent}22;border:2px solid ${accent}55;color:${accent};font:600 30px Onest;letter-spacing:3px">${text}</div>`;

/** A phone frame (screenshot 1170×2532 inside) of the given width. */
function phone(file, width, accent) {
  const h = Math.round(width * 2532 / 1170);
  const r = Math.round(width * 0.12);
  return `<div style="width:${width + 28}px;height:${h + 28}px;border-radius:${r + 14}px;padding:14px;background:linear-gradient(145deg,#2A3038,#0E1116);box-shadow:0 0 0 2px #3A424D, 0 40px 120px ${accent}40, 0 30px 80px rgba(0,0,0,.6)">
    <div style="width:${width}px;height:${h}px;border-radius:${r}px;overflow:hidden;background:#000 url('${img(file)}') center/cover"></div></div>`;
}

/** A tablet frame. */
function tablet(file, width, ratio, accent) {
  const h = Math.round(width * ratio);
  return `<div style="width:${width + 44}px;height:${h + 44}px;border-radius:52px;padding:22px;background:linear-gradient(145deg,#2A3038,#0E1116);box-shadow:0 0 0 2px #3A424D, 0 40px 120px ${accent}40, 0 30px 80px rgba(0,0,0,.6)">
    <div style="width:${width}px;height:${h}px;border-radius:30px;overflow:hidden;background:#000 url('${img(file)}') center/cover"></div></div>`;
}

const headline = (t, size) => `<h1 style="font:800 ${size}px/1.04 Onest;letter-spacing:-2px;margin:34px 0 22px">${t.replace(/\n/g, '<br>')}</h1>`;
const sub = (t, size) => `<p style="font:400 ${size}px/1.35 Onest;color:#AAB6C3;max-width:900px">${t}</p>`;

function phoneSlide(s) {
  return `<html><head><style>${FONTS}</style></head><body style="width:1080px;height:1920px;overflow:hidden;${bg(s.accent, 1080, 1920)}">
    <div style="padding:110px 90px 0;text-align:center;display:flex;flex-direction:column;align-items:center">
      ${eyebrow(s.eyebrow, s.accent)}${headline(s.title, 96)}${sub(s.sub, 38)}
    </div>
    <div style="position:absolute;left:50%;top:720px;transform:translateX(-50%)">${phone(s.file, 700, s.accent)}</div>
  </body></html>`;
}

function tablet7Slide(s) {
  return `<html><head><style>${FONTS}</style></head><body style="width:1080px;height:1920px;overflow:hidden;${bg(s.accent, 1080, 1920)}">
    <div style="padding:100px 90px 0;text-align:center;display:flex;flex-direction:column;align-items:center">
      ${eyebrow(s.eyebrow, s.accent)}${headline(s.title, 92)}${sub(s.sub, 36)}
    </div>
    <div style="position:absolute;left:50%;top:660px;transform:translateX(-50%)">${tablet(s.file, 860, 960 / 600, s.accent)}</div>
  </body></html>`;
}

function tablet10Slide(s) {
  return `<html><head><style>${FONTS}</style></head><body style="width:1920px;height:1080px;overflow:hidden;${bg(s.accent, 1920, 1080)}">
    <div style="position:absolute;left:100px;top:0;bottom:0;width:560px;display:flex;flex-direction:column;justify-content:center">
      <div>${eyebrow(s.eyebrow, s.accent)}</div>${headline(s.title, 78)}${sub(s.sub, 32)}
    </div>
    <div style="position:absolute;right:-60px;top:150px">${tablet(s.file, 1240, 800 / 1280, s.accent)}</div>
  </body></html>`;
}

function featureGraphic(ed) {
  const pro = false; // one app: green accent, the Git line in the terminal
  const accent = pro ? '#F5C451' : '#3DDC84';
  const icon = 'file://' + path.join(ROOT, 'apps/mobile/assets', pro ? 'pro/icon.png' : 'icon.png');
  const lines = [
    ['student@trainer', '~', 'ls -la ~/projects'],
    ['student@trainer', '~/projects', 'grep -rn TODO . | wc -l'],
    ['student@trainer', '~/projects', 'git push -u origin main'],
  ];
  const term = lines
    .map(([u, p, c]) => `<div><span style="color:#3DDC84">${u}</span><span style="color:#8A97A6">:</span><span style="color:#5EA9FF">${p}</span><span style="color:#3DDC84">$ </span><b style="color:#5AF78E">${c.split(' ')[0]}</b> <span style="color:#F3F99D">${c.split(' ').slice(1).join(' ')}</span></div>`)
    .join('');
  return `<html><head><style>${FONTS}</style></head><body style="width:1024px;height:500px;overflow:hidden;${bg(accent, 1024, 500)}">
    <div style="position:absolute;left:60px;top:0;bottom:0;width:520px;display:flex;flex-direction:column;justify-content:center;gap:18px">
      <div style="display:flex;align-items:center;gap:18px">
        <img src="${icon}" style="width:84px;height:84px;border-radius:22px"/>
        ${pro ? `<div style="padding:6px 16px;border-radius:999px;background:${accent};color:#2A1E00;font:800 22px Onest;letter-spacing:2px">PRO</div>` : ''}
      </div>
      <h1 style="font:800 54px/1.02 Onest;letter-spacing:-1.5px">Linux Terminal<br>Trainer${pro ? ' <span style="color:' + accent + '">Pro</span>' : ''}</h1>
      <p style="font:400 22px/1.35 Onest;color:#AAB6C3">Linux, networks, Docker and Git — learn by typing real commands. Free.</p>
    </div>
    <div style="position:absolute;right:-40px;top:70px;width:500px;height:350px;border-radius:26px;background:#05080A;border:2px solid #2A323C;box-shadow:0 30px 90px ${accent}38;padding:28px 26px;font:400 14.5px/1.9 Mono;white-space:nowrap;transform:rotate(-4deg)">
      <div style="display:flex;gap:9px;margin-bottom:18px"><i style="width:13px;height:13px;border-radius:7px;background:#FF5C57"></i><i style="width:13px;height:13px;border-radius:7px;background:#F3F99D"></i><i style="width:13px;height:13px;border-radius:7px;background:#5AF78E"></i></div>
      ${term}
      <div style="color:#B8F5C8">docs  notes.txt  <span style="color:#5AF78E">run.sh</span></div>
      <div><span style="color:#3DDC84">student@trainer</span><span style="color:#8A97A6">:</span><span style="color:#5EA9FF">~</span><span style="color:#3DDC84">$ </span><span style="background:#3DDC84">&nbsp;</span></div>
    </div>
  </body></html>`;
}

const SLIDES = {
  app: {
    phone: [
      { file: 'app_home.png', accent: '#3DDC84', eyebrow: 'LINUX TERMINAL TRAINER', title: 'Linux, networks,\nDocker & Git', sub: '4 courses · 118 lessons · 250+ hands-on tasks. Free.' },
      { file: 'app_task.png', accent: '#5EA9FF', eyebrow: 'HANDS-ON', title: 'Real tasks,\nchecked instantly', sub: 'Any correct solution counts — just like on a real server.' },
      { file: 'app_mission.png', accent: '#FF6B6B', eyebrow: 'MISSIONS', title: 'Real incidents,\nreal fixes', sub: 'A 502 on Black Friday, a full disk, a bad deploy — on call, safely.' },
      { file: 'app_git.png', accent: '#F1502F', eyebrow: 'GIT & GITHUB', title: 'Git the way\nteams use it', sub: 'Branches, conflicts, pull requests and releases on a simulated GitHub.' },
      { file: 'app_courses.png', accent: '#3DDC84', eyebrow: 'YOUR PATH', title: 'From first command\nto on-call engineer', sub: 'Every lesson mapped out, with progress you can see.' },
      { file: 'app_explain.png', accent: '#B48EF5', eyebrow: 'EXPLAIN A COMMAND', title: 'Understand\nevery command', sub: 'Paste any command and see what each part does.' },
      { file: 'app_sandbox.png', accent: '#4DD0E1', eyebrow: 'SANDBOX', title: 'Three machines.\nZero risk.', sub: 'Docker host, web server, Git project and more templates.' },
      { file: 'app_practice.png', accent: '#F5C451', eyebrow: 'PRACTICE', title: 'Practice\nthat sticks', sub: '14 real-world tasks, spaced repetition, a final exam and certificate.' },
    ],
    t7: [
      { file: 'app_t7_home.png', accent: '#3DDC84', eyebrow: 'LINUX TERMINAL TRAINER', title: 'Linux, networks,\nDocker & Git', sub: 'Made for phones and tablets.' },
      { file: 'app_t7_task.png', accent: '#5EA9FF', eyebrow: 'HANDS-ON', title: 'Real tasks,\nchecked instantly', sub: 'Any correct solution counts.' },
      { file: 'app_t7_courses.png', accent: '#3DDC84', eyebrow: 'YOUR PATH', title: 'Four courses,\none clear path', sub: 'Linux, NOC engineer, Docker, Git & GitHub.' },
      { file: 'app_mission.png', accent: '#FF6B6B', eyebrow: 'MISSIONS', title: 'Real incidents,\nreal fixes', sub: 'Practise on-call work safely.', phone: true },
    ],
    t10: [
      { file: 'app_t10_task.png', accent: '#5EA9FF', eyebrow: 'TABLET', title: 'Task and terminal\nside by side', sub: 'Read the goal on the left, type on the right.' },
      { file: 'app_t10_courses.png', accent: '#3DDC84', eyebrow: 'YOUR PATH', title: 'Four courses,\none clear path', sub: 'Linux, NOC engineer, Docker, Git & GitHub.' },
      { file: 'app_t10_explain.png', accent: '#B48EF5', eyebrow: 'EXPLAIN A COMMAND', title: 'Understand\nevery command', sub: 'Paste any command and see what each part does.' },
      { file: 'app_t10_task.png', accent: '#F5C451', eyebrow: 'FREE · OFFLINE · NO ADS', title: 'Everything,\nfor everyone', sub: 'Every course and mission is free. No account needed.' },
    ],
  },
};

/** 7" slide that shows a phone screen inside the tablet-shaped canvas. */
function t7PhoneSlide(s) {
  return phoneSlide({ ...s });
}

(async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  for (const ed of ['app']) {
    const dir = OUT;
    fs.mkdirSync(dir, { recursive: true });
    const render = async (html, w, h, file) => {
      const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      // a file:// page may load the local fonts and screenshots (setContent may not)
      const tmp = path.join(require('os').tmpdir(), `store-${process.pid}.html`);
      fs.writeFileSync(tmp, html);
      await p.goto('file://' + tmp, { waitUntil: 'load' });
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(150);
      await p.screenshot({ path: path.join(dir, file), type: 'png' });
      await p.close();
    };
    for (const [i, s] of SLIDES[ed].phone.entries()) await render(phoneSlide(s), 1080, 1920, `phone-${i + 1}.png`);
    for (const [i, s] of SLIDES[ed].t7.entries()) await render(s.phone ? t7PhoneSlide(s) : tablet7Slide(s), 1080, 1920, `tablet7-${i + 1}.png`);
    for (const [i, s] of SLIDES[ed].t10.entries()) await render(tablet10Slide(s), 1920, 1080, `tablet10-${i + 1}.png`);
    await render(featureGraphic(ed), 1024, 500, 'feature-graphic.png');
    console.log(ed, 'done →', dir);
  }
  await b.close();
})();
