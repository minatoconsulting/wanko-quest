// わんこビジネスクエスト　バトルの演出（敵の技・たおしたとき・主人公の技・敵のセリフと言い返し・ボスのオーラ）
// 2026-11-10 本人の指示「すごろくのカジノのスロット『ワンコクエスト』がかなり進化している。効果音やアニメーションを、
// わんこビジネスクエストにも入れて更新したい」。スロット（~/Desktop/コツコツすごろく/hiroba-walk/casino-quest.js・.css）の演出を、
// このゲームの場面（#arena：敵は左・仲間は右）に合わせて写したもの。
// どれも見せ方だけ。ダメージ・ハート・経験値は game.js の answer / useSpecial の計算どおりで、ここでは決めない。
// 敵ごとの技とセリフは js/foe.js の FOE（キーはステージの番号・塔のボスは 'boss'）。

const FXIMG = { star: 'img/fx_star.webp', rainbowStar: 'img/fx_star_rainbow.webp', ring: 'img/fx_ring.webp', coin: 'img/fx_coin.webp' };
const FEATHER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 16"><path d="M1 8C10 1 28 0 39 6C30 9 28 14 12 15C7 15 3 12 1 8Z" fill="#2a2042" stroke="#0b0614"/><path d="M3 8L37 6" stroke="#8a78b8" stroke-width="1.2"/><path d="M14 5L18 8M22 3.5L26 7.5M14 12L18 8.5M22 12L26 8" stroke="#463768"/></svg>');
// 敵が前に飛びださない技（すいとる・まぼろし・上から落ちる など）
const QFX_NO_LUNGE = new Set(['drain', 'subsc', 'mirage', 'weights', 'press', 'stomp', 'dark', 'curse', 'meteor']);
// 言い返されたときの敵のひとこと（スロットと同じ）
const QFX_REACTIONS = ['うっ… たしかに…', 'そ、そうなのか…', 'ぐぬぬ… 言い返せない…', 'な、なるほど…'];
// 大技を受けたときの仲間のひとこと（スロットと同じ）
const QFX_BIG_HURT = ['うわぁっ！ つ、つよい…！', 'いたたた…！ みんな だいじょうぶ！？', 'ぐっ…！ まだまだ…！', 'め、目が まわる〜…'];

const fxSleep = ms => new Promise(r => setTimeout(r, RM ? Math.min(ms, 200) : ms));

// ---------- 場面の中の位置と、演出の部品 ----------
function qa() { return $('#arena'); }
function qBox() { const a = qa(); return a ? a.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 }; }
function qRect(el) { const a = qBox(), r = el ? el.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 }; return { x: r.left - a.left, y: r.top - a.top, w: r.width, h: r.height }; }
function qEnemy() { const r = qRect($('#enemy')); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
function qHeroBox() { return qRect($('#me')); }
function qHero() { const b = qHeroBox(); return { x: b.x + b.w / 2, y: b.y + b.h * .45 }; }
function qFeet() { const b = qHeroBox(); return { x: b.x + b.w * .5, y: b.y + b.h * .86 }; }
function qMouth() { const r = qRect($('#enemy')); return { x: r.x + r.w * .7, y: r.y + r.h * .4 }; }
function qAdd(el, ms) { const a = qa(); if (!a) return el; a.appendChild(el); setTimeout(() => el.remove(), ms); return el; }
function qMk(cls, text) { const d = document.createElement('div'); d.className = 'qfx ' + cls; if (text) d.textContent = text; return d; }
function qImg(cls, src) { const im = new Image(); im.className = 'qfx ' + cls; im.src = src; im.alt = ''; return im; }
const qNear = (p, r) => ({ x: p.x + (Math.random() * 2 - 1) * r, y: p.y + (Math.random() * 2 - 1) * r });
function qPlace(el, p, ms) { el.style.left = Math.round(p.x) + 'px'; el.style.top = Math.round(p.y) + 'px'; return qAdd(el, ms); }
// from から to へ山なりにとばす（arc＝山の高さ・rot＝回る角度・start/end＝大きさ）
function qFly(el, from, to, { dur = 520, delay = 0, arc = -30, rot = 0, rot0 = 0, start = .5, end = 1, cls = '' } = {}) {
  el.classList.add('foe-fly'); if (cls) el.classList.add(...cls.split(' '));
  const s = el.style;
  s.left = Math.round(from.x) + 'px'; s.top = Math.round(from.y) + 'px';
  s.setProperty('--dx', Math.round(to.x - from.x) + 'px'); s.setProperty('--dy', Math.round(to.y - from.y) + 'px'); s.setProperty('--arc', Math.round(arc) + 'px');
  s.setProperty('--rot', Math.round(rot) + 'deg'); s.setProperty('--rot0', Math.round(rot0) + 'deg'); s.setProperty('--start', start); s.setProperty('--end', end);
  s.animationDuration = dur + 'ms'; s.animationDelay = delay + 'ms';
  return qAdd(el, dur + delay + 80);
}
function qTint(kind, ms) { const d = qMk('foe-tint ' + kind); d.style.animationDuration = ms + 'ms'; return qAdd(d, ms); }
function qPulse(el, cls, ms) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); clearTimeout(el['_' + cls]); el['_' + cls] = setTimeout(() => el.classList.remove(cls), ms); }
function qFlash() { const a = qa(); if (!a) return; a.classList.remove('qflash'); void a.offsetWidth; a.classList.add('qflash'); setTimeout(() => a.classList.remove('qflash'), 400); }
function qDmg(text, p, cls = '') { const d = qMk('qdmg ' + cls, String(text)); qPlace(d, { x: p.x + (Math.random() * 24 - 12), y: p.y - 20 }, 1150); }
function qSpark(src = FXIMG.star, n = 6) { const p = qEnemy(); for (let i = 0; i < n; i++) { const im = qImg('qspark', src); im.style.animationDelay = (i * 55) + 'ms'; qPlace(im, { x: p.x - 50 + Math.random() * 100, y: p.y - 40 + Math.random() * 46 }, 1300); } }
// 敵の体力だけをへらす（音と数字は演出の中で出す）
function qHurtEnemy(n) { if (!B) return; B.hp = Math.max(0, B.hp - n); const bar = $('#ehp'); if (bar) bar.style.width = (B.hp / B.max * 100) + '%'; }

// ---------- 主人公のポーズ（コツ太の1段階目だけ：攻撃とよろこびの絵がある） ----------
const KOTSUTA_POSE = { attack: 'img/kotsuta_attack.webp', joy: 'img/kotsuta_joy.webp' };
function qPose(kind, ms = 480) {
  const me = $('#me');
  if (!me || !S || S.breed !== 'kotsuta' || stageOf(levelInfo().lv) !== 1 || !KOTSUTA_POSE[kind]) return;
  me.src = KOTSUTA_POSE[kind];
  clearTimeout(me._pose); me._pose = setTimeout(() => { if (me.isConnected) me.src = heroImg(); }, RM ? 60 : ms);
}

// ---------- ふきだし（敵＝敵の横の白・主人公の言い返し＝金色） ----------
function qTalk(kind, text, ms = 1800, cls = '') {
  const a = qa(); if (!a) return;
  let el = a.querySelector('.qtalk.' + kind);
  if (!el) { el = document.createElement('div'); a.appendChild(el); }
  el.className = 'qtalk ' + kind + (cls ? ' ' + cls : '');
  el.textContent = text; el.hidden = false;
  const et = kind === 'etalk' ? el : a.querySelector('.qtalk.etalk');
  if (et && !et.hidden) qPlaceETalk(a, et);
  clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, ms);
}
// 敵のふきだしは、敵の絵のすぐ右に出して、しっぽが敵の体を指すようにする
function qPlaceETalk(a, el) {
  const e = a.querySelector('#enemy'); if (!e) return;
  let w = e.offsetWidth, h = e.offsetHeight;
  if (!w || !h) return;
  // 絵は枠の中で下ぞろえ・縮小で入っているので、実際に見えている絵の大きさを出す
  if (e.naturalWidth && e.naturalHeight) { const s = Math.min(w / e.naturalWidth, h / e.naturalHeight); w = e.naturalWidth * s; h = e.naturalHeight * s; }
  const ex = e.offsetLeft + (e.offsetWidth - w) / 2, ey = e.offsetTop + e.offsetHeight - h;
  const AW = a.clientWidth, AH = a.clientHeight;
  const nm = a.querySelector('.ename'), topMin = nm ? nm.offsetTop + nm.offsetHeight + 4 : 8;
  const st = a.querySelector('.bstat'), botMax = (st ? st.offsetTop : AH) - 4;
  // しっぽの先：敵の顔のあたり（右寄り・上から3割）
  const px = ex + w * .72, py = Math.max(topMin + 6, ey + h * .3);
  let left = px + 17, mw = Math.min(AW * .55, AW - left - 6);
  if (mw < 130) { mw = Math.min(130, AW - 12); left = AW - 6 - mw; }
  el.style.left = left + 'px'; el.style.maxWidth = mw + 'px'; el.style.top = '0px';
  const bw = el.offsetWidth, bh = el.offsetHeight;
  let top = py - 8;
  // 主人公の顔にかぶるときは、上にずらす
  const p = a.querySelector('#party'), me = a.querySelector('#me');
  if (p && me) {
    const mx = p.offsetLeft + me.offsetLeft, my = p.offsetTop + me.offsetTop + me.offsetHeight * .15;
    if (left + bw > mx && top + bh > my) top = my - bh;
  }
  // 主人公の言い返しのふきだしが出ているときは、その上へよける
  const hb = a.querySelector('.qtalk.htalk');
  if (hb && !hb.hidden && left < hb.offsetLeft + hb.offsetWidth && top + bh > hb.offsetTop - 4) top = hb.offsetTop - 4 - bh;
  top = Math.max(topMin, Math.min(botMax - bh, top));
  el.style.top = top + 'px';
  // しっぽ：先がふきだしの上半分なら上向き、下半分なら下向き
  const dn = py > top + bh / 2;
  el.classList.toggle('dn', dn);
  const ty = dn ? py - top - 17.5 : py - top - .5;
  el.style.setProperty('--ty', Math.max(3, Math.min(bh - (dn ? 15 : 19), ty)) + 'px');
}
function qHideTalk() { document.querySelectorAll('#arena .qtalk').forEach(e => { e.hidden = true; }); }
// 技の名前の札（場面のまん中に大きめ）
function qClearPlates() { document.querySelectorAll('#arena .qplate').forEach(x => x.remove()); }
function qPlate(src, sub, title, foe, ms = 1800) {
  qClearPlates();
  const d = qMk('qplate' + (foe ? ' foe' : ''));
  d.innerHTML = '<img alt=""><span><small></small><b></b></span>';
  d.querySelector('img').src = src; d.querySelector('small').textContent = sub;
  const b = d.querySelector('b'); b.textContent = title; b.classList.toggle('long', title.length > 10);
  return qAdd(d, ms);
}

// ---------- 敵のセリフと、主人公の言い返し ----------
function foeData() { return B && typeof FOE !== 'undefined' ? FOE[String(B.no)] : null; }
// 問題のときに、ときどき敵がわるいくせを言う
function qTaunt(ms = 2600) {
  const d = foeData(); if (!d || !d.talks || !d.talks.length || RM) return;
  let i = Math.floor(Math.random() * d.talks.length);
  if (B.taunt === i && d.talks.length > 1) i = (i + 1) % d.talks.length;
  B.taunt = i;
  qTalk('etalk', d.talks[i][0], ms);
}
// 連続正解のボーナスのとき、主人公が金色のふきだしで言い返す（そのステージで学んだ正しいやり方）
async function qReply() {
  const d = foeData(), tok = B; if (!d || !d.talks || !d.talks.length || RM) return;
  if (B.taunt == null) { B.taunt = Math.floor(Math.random() * d.talks.length); qTalk('etalk', d.talks[B.taunt][0], 1600); await fxSleep(900); if (B !== tok) return; }
  const t = d.talks[B.taunt];
  se('select', 1.3, .6); qPose('joy', 2600);
  qTalk('htalk', `${S.name}「${t[1]}」`, 3400, 'reply');
  await fxSleep(2200); if (B !== tok) return;
  if (B.hp > 0) qTalk('etalk', QFX_REACTIONS[Math.floor(Math.random() * QFX_REACTIONS.length)], 1500);
  B.taunt = null;
}

// ---------- 敵の技 ----------
// どの技か：力をためた大こうげき、または最後のハートをうばう一撃は大技（いちばん最後の技）。ふだんは小さい技を順番に
function foePick(charged, finishing) {
  const d = foeData(), list = d && d.skills && d.skills.length ? d.skills : [{ name: 'こうげき', line: 'くらえ〜！', fx: 'claw' }];
  if (list.length > 1 && (charged || finishing)) return { ...list[list.length - 1], big: true };
  const small = list.length > 1 ? list.slice(0, -1) : list;
  B.fsi = (B.fsi || 0) + 1;
  return { ...small[(B.fsi - 1) % small.length], big: false };
}
function wordsFly(list, n, from, to, cls, gap) {
  for (let i = 0; i < n; i++) {
    qFly(qMk('foe-word' + (cls ? ' ' + cls : ''), list[i % list.length]), qNear(from, 10), qNear(to, 26), { dur: 600, delay: i * gap, arc: -30 - Math.random() * 40, rot: Math.random() * 30 - 15, start: .6, end: 1.1 });
    setTimeout(() => se('select', 1.35 + Math.random() * .45, .5), i * gap);
  }
}
async function foeFx(sk) {
  const from = qEnemy(), to = qHero(), big = sk.big, en = $('#enemy');
  switch (sk.fx) {
    case 'goo': { // ねばねばを なげつける
      for (let i = 0; i < (big ? 8 : 5); i++) qFly(qMk('foe-goo'), qNear(from, 14), qNear(to, 22), { dur: 520, delay: i * 70, arc: -50 - Math.random() * 30, rot: 220, start: .5, end: 1.15 });
      se('poke', .55, .9); setTimeout(() => se('poke', .5, .7), 140); await fxSleep(500);
      for (let i = 0; i < 3; i++) { const s = qMk('foe-splat'); s.style.animationDelay = (i * 70) + 'ms'; qPlace(s, qNear(to, 24), 1000); }
      return; }
    case 'drain': { // 仲間の「やる気」を すいとる
      qPlace(qMk('foe-ring'), to, 900); se('magic', .6, .75);
      for (let i = 0; i < 10; i++) qFly(qMk('foe-orb'), qNear(to, 30), qNear(from, 16), { dur: 720, delay: 150 + i * 60, arc: -20 - Math.random() * 40, start: 1, end: .4 });
      for (let i = 0; i < 3; i++) qFly(qMk('foe-word yaruki', 'やる気'), qNear(to, 20), qNear(from, 12), { dur: 760, delay: 120 + i * 170, arc: -50, rot: Math.random() * 30 - 15, start: 1, end: .5 });
      setTimeout(() => { qPulse(en, 'qpowered', 900); se('select', .6, .6); }, 950);
      await fxSleep(300); return; }
    case 'fog': case 'rain': { // モヤモヤの霧（どしゃぶりは 雨も）
      se('omen', .55, .85);
      for (let i = 0; i < 4; i++) qFly(qMk('foe-fog'), qNear(from, 20), qNear(to, 30), { dur: 760, delay: i * 90, arc: -10, start: .4, end: 1.6 });
      await fxSleep(700); qPlace(qMk('foe-fogcover'), to, 1400); qPulse($('#party'), 'qfogged', 1300);
      if (sk.fx === 'rain') { for (let i = 0; i < 34; i++) { const d = qMk('foe-rain'); d.style.animationDelay = (i * 35) + 'ms'; qPlace(d, { x: to.x - 90 + Math.random() * 190, y: to.y - 110 + Math.random() * 40 }, 1100); } se('omen', .4, .5); }
      return; }
    case 'words': case 'tags': // ことば（ねふだ）を まくしたてる
      wordsFly(sk.words && sk.words.length ? sk.words : ['えいっ！'], big ? 8 : 5, from, to, sk.fx === 'tags' ? 'tag' : '', big ? 90 : 130); await fxSleep(big ? 560 : 620); return;
    case 'feather': { // 黒い羽（うわさの ことばも）
      for (let i = 0; i < (big ? 12 : 7); i++) qFly(qImg('foe-feather', FEATHER), qNear(from, 24), qNear(to, 34), { dur: 600, delay: i * 60, arc: -20 - Math.random() * 40, rot: 360 + Math.random() * 360, start: .6, end: 1.1 });
      se('slash', 1.5, .6); setTimeout(() => se('slash', 1.3, .5), 200);
      if (sk.words) wordsFly(sk.words, 5, from, to, 'rumor', 120);
      await fxSleep(big ? 640 : 580); return; }
    case 'subsc': { // 「月額」の ふだが 仲間から敵へ すいこまれる
      for (let i = 0; i < 6; i++) { qFly(qMk('foe-word bill', '月額'), qNear(to, 26), qNear(from, 10), { dur: 640, delay: 80 + i * 110, arc: -40, rot: Math.random() * 40 - 20, start: 1, end: .5 }); setTimeout(() => se('coin', .75 - i * .04, .45), 80 + i * 110); }
      setTimeout(() => qPulse(en, 'qpowered', 800), 720);
      await fxSleep(260); return; }
    case 'wave': { // ちょうおんぱの わっか
      se('omen', 1.7, .6);
      for (let i = 0; i < (big ? 6 : 4); i++) qFly(qMk('foe-wave'), from, to, { dur: 560, delay: i * 110, arc: 0, start: .4, end: 1.9 });
      await fxSleep(560); setTimeout(() => qPulse($('#party'), 'qdizzyp', 950), 450); return; }
    case 'stamp': { // 「契約」の ハンコを ポンポン
      for (let i = 0; i < (big ? 6 : 4); i++) setTimeout(() => { const s = qMk('foe-stamp', '契約'); s.style.setProperty('--r', Math.round(Math.random() * 36 - 24) + 'deg'); qPlace(s, qNear(to, 36), 1100); se('poke', .75, .9); se('clang', 1.5, .35); if (i) quake(); }, 120 + i * 170);
      await fxSleep(140); return; }
    case 'fire': { // 口から 火をはく（大技は 画面も 赤く）
      const m = qMouth(); se('magic', .5, .8); if (big) setTimeout(() => se('bigHit', .6, .7), 320);
      for (let i = 0; i < (big ? 18 : 11); i++) qFly(qMk('foe-fire'), qNear(m, 6), qNear(to, big ? 40 : 24), { dur: 520, delay: i * 40, arc: -8 + Math.random() * 16, start: .35, end: big ? 2.1 : 1.5 });
      await fxSleep(500); if (big) qTint('fire', 1000); return; }
    case 'wisp': { // あおい きつね火が まわりに うかんでから とんでくる
      const n = big ? 7 : 5; se('magic', 1.25, .6);
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, st = { x: from.x + Math.cos(a) * 44, y: from.y + Math.sin(a) * 30 }; const w = qMk('foe-wisp still'); w.style.animationDelay = (i * 40) + 'ms,0ms'; qPlace(w, st, 260 + i * 80); qFly(qMk('foe-wisp'), st, qNear(to, 22), { dur: 600, delay: 260 + i * 80, arc: -30, start: .8, end: 1.1 }); }
      await fxSleep(820); return; }
    case 'mirage': { // 金色の「元本保証」と コインが うかぶ → けむりになって ドカン
      const g = qMk('foe-mirage'); g.innerHTML = '<b>元本保証</b><i></i><i></i><i></i><i></i><i></i>'; qPlace(g, { x: to.x - 20, y: to.y - 62 }, 1600); se('omenRainbow', 1.2, .55);
      await fxSleep(950); g.classList.add('pop'); se('poke', .6, .9);
      for (let i = 0; i < 6; i++) { const s = qMk('foe-smoke'); s.style.animationDelay = (i * 50) + 'ms'; qPlace(s, qNear(to, 30), 1000); }
      await fxSleep(150); return; }
    case 'pinch': { // ハサミで チョキン×2
      for (let k = 0; k < 2; k++) setTimeout(() => { for (const r of [35, -35]) { const c = qMk('foe-cut'); c.style.setProperty('--r', r + 'deg'); qPlace(c, { x: to.x - 55, y: to.y - 8 + k * 14 }, 520); } se('slash', 1.25, .65); se('clang', 1.35, .45); }, k * 210);
      qPlace(qMk('foe-onoma', 'チョキン！'), { x: to.x - 12, y: to.y - 62 }, 950);
      await fxSleep(220); return; }
    case 'bubble': { // あわを ぷかぷか とばして パチン
      const n = big ? 10 : 6; for (let i = 0; i < n; i++) { qFly(qMk('foe-bubble'), qNear(from, 20), qNear(to, 30), { dur: 880, delay: i * 70, arc: -40 - Math.random() * 30, start: .4, end: 1.2 + Math.random() * .5 }); setTimeout(() => se('select', 1.7 + Math.random() * .4, .35), i * 70); }
      await fxSleep(860); for (let i = 0; i < 4; i++) { const r = qMk('foe-pop'); r.style.animationDelay = (i * 60) + 'ms'; qPlace(r, qNear(to, 30), 650); } se('poke', 1.6, .7); return; }
    case 'paper': { // 書類（大技は 空から どさっと）
      if (!big) for (let i = 0; i < 5; i++) qFly(qMk('foe-paper'), qNear(from, 12), qNear(to, 24), { dur: 560, delay: i * 110, arc: -30, rot: 540, start: .5, end: 1.05 });
      else for (let i = 0; i < 14; i++) qFly(qMk('foe-paper'), { x: to.x - 130 + Math.random() * 210, y: -30 }, qNear(to, 40), { dur: 620, delay: i * 55, arc: 0, rot: 200 + Math.random() * 400, start: 1, end: 1.05 });
      for (let i = 0; i < (big ? 6 : 3); i++) setTimeout(() => se('slash', 1.7, .4), i * 110);
      await fxSleep(big ? 600 : 560); return; }
    case 'stomp': { // 大きく ジャンプして ふみつけ → 地面に ひび・石が とぶ
      qPulse(en, 'qstomp', 760); se('slash', .5, .5);
      await fxSleep(430); quake(); se('bigHit', .55, .9); se('clang', .5, .4);
      const f = qFeet(); qPlace(qMk('foe-crack'), f, 1250); qPlace(qMk('foe-dust'), f, 850);
      for (let i = 0; i < (big ? 10 : 5); i++) { const st = qNear(f, 40); qFly(qMk('foe-rock'), st, { x: st.x + (Math.random() * 70 - 35), y: st.y + 12 }, { dur: 720, delay: i * 30, arc: -60 - Math.random() * 50, rot: Math.random() * 360, start: 1, end: 1 }); }
      if (big) setTimeout(() => { quake(); se('bigHit', .5, .7); qPlace(qMk('foe-crack'), { x: f.x - 30, y: f.y + 6 }, 1000); }, 260);
      return; }
    case 'press': { // 敵が とびあがって 仲間の上に どすん
      const r = qRect(en), c = qImg('foe-jumper', en.src);
      c.style.left = Math.round(r.x) + 'px'; c.style.top = Math.round(r.y) + 'px'; c.style.width = Math.round(r.w) + 'px';
      c.style.setProperty('--dx', Math.round(to.x - (r.x + r.w / 2)) + 'px'); c.style.setProperty('--dy', Math.round(to.y - 45 - (r.y + r.h / 2)) + 'px');
      en.style.visibility = 'hidden'; qAdd(c, 1300); setTimeout(() => { en.style.visibility = ''; }, 1260); se('slash', .45, .6);
      await fxSleep(560); quake(); setTimeout(quake, 160); se('bigHit', .6, .95); se('clang', .6, .5); qPlace(qMk('foe-dust'), qFeet(), 850);
      return; }
    case 'weights': { // 「なやみ」の重りが 上から どすん
      for (let i = 0; i < 3; i++) { const x = to.x - 42 + i * 40; qFly(qMk('foe-weight', 'なやみ'), { x, y: -40 }, { x, y: to.y - 6 }, { dur: 700, delay: i * 150, arc: 0, rot: (i - 1) * 14, start: 1, end: 1, cls: 'drop' }); setTimeout(() => { se('clang', .55, .6); quake(); }, 420 + i * 150); }
      await fxSleep(430); return; }
    case 'dark': { // 闇の玉が まわりから あつまる
      qTint('dark', 1300); se('omen', .5, .8);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; qFly(qMk('foe-dark'), { x: to.x + Math.cos(a) * 110, y: to.y + Math.sin(a) * 80 }, to, { dur: 520, delay: 150 + i * 40, arc: 0, start: 1.3, end: .5 }); }
      await fxSleep(660); se('bigHit', .7, .7); qPlace(qMk('foe-blast'), to, 600); return; }
    case 'curse': { // のろいの わっかが しめつける
      qTint('dark', 1600); se('omen', .45, .9);
      for (let i = 0; i < 3; i++) { const c = qMk('foe-curse'); c.style.animationDelay = (i * 160) + 'ms'; qPlace(c, to, 1150); }
      qPlace(qMk('foe-onoma dark', 'あした… あした…'), { x: to.x - 70, y: to.y - 78 }, 1400);
      await fxSleep(680); se('hit', .6, .8); return; }
    case 'meteor': { // 闇のメテオが つぎつぎ ふってくる
      qTint('dark', 2000); se('omen', .5, .8);
      for (let i = 0; i < 5; i++) {
        const p = qNear(to, 42), st = { x: p.x - 170, y: -40 }, deg = Math.atan2(p.y - st.y, p.x - st.x) * 180 / Math.PI;
        qFly(qMk('foe-meteor'), st, p, { dur: 460, delay: i * 150, arc: 0, rot0: deg, start: .8, end: 1.2 });
        setTimeout(() => { qPlace(qMk('foe-blast'), p, 600); se('bigHit', .6 + Math.random() * .2, .6); quake(); }, 460 + i * 150);
      }
      await fxSleep(470); return; }
    default: { // ひっかく
      for (let i = 0; i < 3; i++) { const s = qMk('foe-claw'); s.style.animationDelay = (i * 50) + 'ms'; qPlace(s, { x: to.x - 40 + i * 16, y: to.y - 40 }, 600); }
      se('slash', .8, .8); await fxSleep(330);
    }
  }
}
// 敵の大技のカットイン（主人公たちの必殺技と同じ帯を、赤くして敵の絵で）
function foeCutin(en, sk) {
  return new Promise(res => {
    const a = qa(); if (!a) { res(); return; }
    const c = document.createElement('div');
    c.className = 'cutin foe';
    c.innerHTML = `<div class="cband"><img src="${en.img}" alt=""><i class="lines"></i></div><div class="cname"><small>${esc(en.name)}の大技</small>${esc(sk.name)}！</div>`;
    a.appendChild(c);
    setTimeout(() => { c.remove(); res(); }, RM ? 300 : 1700);
  });
}
// まちがえたときの敵のこうげき。セリフと技の名前を読んでから技を出し、当たった瞬間に resolve（ハートをへらす見せ方は game.js）
async function foeAttack(sk) {
  const tok = B, en = $('#enemy'), e = B.en;
  qHideTalk();
  if (sk.big) {
    qTalk('etalk', sk.line, 1400); se('omen', .55, .9);
    await fxSleep(1000); if (B !== tok) return false;
    qHideTalk(); qPulse(en, 'qcharge', 900); qPlace(qMk('foe-ring charge'), qEnemy(), 900);
    await fxSleep(700); if (B !== tok) return false;
    se('bossAppear', 1.25, .45); await foeCutin(e, sk); if (B !== tok) return false;
    qPlate(e.img, e.name + 'の大技', sk.name + '！', true, 900); await fxSleep(900); qClearPlates();
  } else {
    qTalk('etalk', sk.line, 1500); qPlate(e.img, e.name + 'の技', sk.name + '！', true, 1500);
    await fxSleep(1200); qHideTalk(); qClearPlates();
  }
  if (B !== tok) return false;
  if (!QFX_NO_LUNGE.has(sk.fx)) anim(en, 'elunge');
  await foeFx(sk);
  return B === tok;
}
// 当たったときの仲間の見せ方（小さい技＝ゆれる、大技＝ふきとんで目を回す）
function partyHurt(big) {
  const p = $('#party'); if (!p) return;
  qPulse(p, 'qhurt', 500);
  if (!big) return;
  qPulse(p, 'qbighurt', 1250); qTint('red', 420); setTimeout(quake, 170);
  p.querySelectorAll('img').forEach((im, i) => {
    const r = qRect(im); if (!r.w) return;
    const d = qMk('qdizzy'); d.innerHTML = '<span>★</span><span>★</span><span>★</span>';
    d.style.animationDelay = (250 + i * 70) + 'ms';
    qPlace(d, { x: r.x + r.w / 2 - 14, y: r.y + r.h * .08 - 8 }, 2000);
  });
  setTimeout(() => qTalk('htalk', QFX_BIG_HURT[Math.floor(Math.random() * QFX_BIG_HURT.length)], 1700), 350);
}

// ---------- 敵をたおしたとき ----------
function qRays(at, rainbow) { const d = qMk('qrays' + (rainbow ? ' rainbow' : '')); qPlace(d, at, 1900); }
function qRings(at, n = 3) { for (let i = 0; i < n; i++) { const r = qImg('qring', FXIMG.ring); r.style.animationDelay = (i * 140) + 'ms'; qPlace(r, at, 1000 + i * 140); } }
function qBurst(at, n = 16, dist = 110) {
  for (let i = 0; i < n; i++) {
    const im = qImg('qburst', i % 4 === 0 ? FXIMG.rainbowStar : FXIMG.star), a = i / n * Math.PI * 2 + Math.random() * .3, r = dist * (.7 + Math.random() * .6);
    im.style.setProperty('--dx', Math.cos(a) * r + 'px'); im.style.setProperty('--dy', Math.sin(a) * r + 'px'); im.style.animationDelay = Math.round(Math.random() * 80) + 'ms';
    qPlace(im, { x: at.x - 15, y: at.y - 15 }, 1100);
  }
}
function qStamp(text, cls = '') { qAdd(qMk('qstamp' + (cls ? ' ' + cls : ''), text), 1200); }
// 紙ふぶき（小さな色紙を1枚ずつ、くるくる ひらひら）
function qConfetti(n = 12, rainbow = false) {
  const a = qa(); if (!a || RM) return;
  const w = a.clientWidth, cols = rainbow ? ['#ff5c7a', '#ffb347', '#fff35c', '#59f08a', '#4dd2ff', '#a77bff', '#ff7ad9'] : ['#ffd34d', '#fff0b3', '#ff8fb1', '#7fd8ff', '#9cf0b0', '#ffffff', '#ffb36b'];
  for (let i = 0; i < n * 3; i++) {
    const d = qMk('qpaper' + (i % 4 === 0 ? ' long' : ''));
    d.style.background = cols[i % cols.length]; d.style.left = Math.round(Math.random() * (w - 8)) + 'px';
    d.style.animationDuration = (2.3 + Math.random() * 1.5).toFixed(2) + 's'; d.style.animationDelay = (Math.random() * .9).toFixed(2) + 's';
    d.style.setProperty('--sway', Math.round(Math.random() * 70 - 35) + 'px'); d.style.setProperty('--spin', (Math.random() < .5 ? '-' : '') + Math.round(200 + Math.random() * 400) + 'deg'); d.style.setProperty('--flip', Math.round(540 + Math.random() * 900) + 'deg');
    qAdd(d, 4800);
  }
}
// とどめで一瞬止まって白く点滅 → 光のすじ・光の輪・星がとびちる → 「たおした！」（ボスは「大勝利！」・総まとめ編は「伝説の勝利！」）→ 紙ふぶき
async function qDefeat(kind, winSound) {
  const en = $('#enemy'), a = qa(); if (!en || !a) return;
  const boss = kind !== 'normal', at = qEnemy(), tok = B;
  qHideTalk(); qClearPlates();
  if (RM) { en.classList.add('vanish'); sfx(winSound); cheer(); return; }
  a.classList.add('qfinish'); en.classList.add('qfinishing'); se('bigHit', .8, .8);
  await fxSleep(boss ? 420 : 380);
  if (boss) for (let i = 0; i < 3; i++) { const q = { x: at.x + Math.random() * 90 - 45, y: at.y + Math.random() * 70 - 35 }; qBurst(q, 8, 70); qRings(q, 1); quake(); se('hit', .8 + i * .12); await fxSleep(260); }
  if (B !== tok) return;
  a.classList.remove('qfinish'); en.classList.remove('qfinishing'); en.classList.add('qdefeated');
  const aura = $('#qaura'); if (aura) aura.classList.add('out');
  qFlash(); quake(); qRays(at, boss); qRings(at, 3); qBurst(at, boss ? 28 : 18, boss ? 150 : 120);
  sfx(winSound); se('bigHit', .7, .6);
  qStamp(kind === 'final' ? '伝説の勝利！' : boss ? '大勝利！' : 'たおした！', boss ? 'boss' : '');
  setTimeout(() => se('combo', .9, .8), 160);
  qPose('joy', 2600);
  setTimeout(() => { cheer(); qConfetti(boss ? 26 : 16, boss); }, 450);
}

// ---------- 主人公の必殺技（こつこつ剣・積立スラッシュ・72の法則ぎり） ----------
// どれも2ダメージ（前の連続斬りと同じ）。見せ方だけが変わる：
//   72の法則ぎり＝敵の体力がのこり2以下のとき（とどめ）／積立スラッシュ＝そのバトルで2回目からの必殺技／それ以外はこつこつ剣（SPECIALS.hero.name）
function heroMove() {
  if (RM) return { kind: 'slash', name: SPECIALS.hero.name };
  if (B && B.hp <= 2) return { kind: 'iai', name: '72の法則ぎり', short: 'とどめの一撃・2ダメージ' };
  if (B && (B.heroUses || 0) >= 1) return { kind: 'tsumi', name: '積立スラッシュ', short: `積立${(B.heroUses || 0) + 1}回目・2ダメージ` };
  return { kind: 'slash', name: SPECIALS.hero.name };
}
// 積立スラッシュ：使った回数ぶん コインが頭の上につみあがる → 剣にすいこまれて金色に光る → 金色の三日月の斬撃がとぶ
async function heroTsumi(k) {
  const tok = B, me = $('#me'), n = Math.min(5, k), hb = qHeroBox(), base = { x: hb.x + hb.w * .52, y: Math.max(64, hb.y - 6) };
  const tag = qPlace(qMk('tsumi-power'), { x: base.x - 58, y: base.y - 26 }, 4200); tag.innerHTML = `<small>積立</small><b>${k}回目</b>`;
  const coins = [];
  for (let i = 0; i < n; i++) {
    coins.push(qPlace(qImg('tsumi-coin', FXIMG.coin), { x: base.x + (i % 2 ? 2 : -2), y: base.y - i * 11 }, 4200));
    await fxSleep(170); se('tsumiCoin', 1 + i * .08, .9);
    await fxSleep(i < n - 1 ? 110 : 260);
  }
  if (B !== tok) return '';
  se('tsumiCharge', 1, .8); qPulse(me, 'qgold', 1300);
  const tip = { x: hb.x + hb.w * .1, y: hb.y + hb.h * .16 };
  coins.forEach((c, i) => { const p = { x: parseFloat(c.style.left), y: parseFloat(c.style.top) }; c.remove(); qFly(qImg('tsumi-fly', FXIMG.coin), p, tip, { dur: 420, delay: (n - 1 - i) * 70, arc: -18, start: 1, end: .3 }); });
  setTimeout(() => { qPlace(qMk('sword-glint'), tip, 900); tag.classList.add('gone'); }, 300 + n * 70);
  await fxSleep(560 + n * 70); if (B !== tok) return '';
  qPose('attack', 900); anim(me, 'lunge'); se('tsumiWave', 1, .9);
  const from = { x: hb.x + hb.w * .2, y: hb.y + hb.h * .45 }, to = qEnemy();
  qFly(qMk('tsumi-wave'), from, to, { dur: 460, arc: -14, rot0: -8, start: .55 + n * .07, end: .8 + n * .12 });
  await fxSleep(400); if (B !== tok) return '';
  se('tsumiHit', 1, .85); anim($('#enemy'), 'shake'); anim($('#enemy'), 'flash'); quake();
  qPlace(qMk('tsumi-cross'), to, 700); qSpark(FXIMG.coin, 3 + n);
  qHurtEnemy(2); qDmg(2, to, 'gold big');
  await fxSleep(600);
  return `積立${k}回目！ コツコツ積み上げた力で${B.en.name}に2ダメージ！`;
}
// 72の法則ぎり：まわりが暗くなる → 敵にねらいをさだめる → 居合いでひと息に切りぬける → 刀をおさめた「カチン」で敵がまっぷたつ
async function heroIai() {
  const tok = B, ar = qa(), me = $('#me'), hb = qHeroBox(), bb = qBox(), ep = qEnemy(), hpNow = B.hp;
  const dark = qMk('iai-dark'); ar.appendChild(dark);
  const n72 = [qMk('iai72 top', '72'), qMk('iai72 bottom', '72')];
  n72.forEach(d => { d.style.left = Math.round(bb.width * .42) + 'px'; d.style.top = Math.round(bb.height * .42) + 'px'; });
  const clean = () => { dark.remove(); n72.forEach(d => d.remove()); if (me) me.classList.remove('iai-gone'); const en = $('#enemy'); if (en) en.style.visibility = ''; };
  await fxSleep(120); se('iaiGleam', 1, .8); qPlace(qMk('sword-glint blue'), { x: hb.x + hb.w * .1, y: hb.y + hb.h * .16 }, 900);
  await fxSleep(260); if (B !== tok) { clean(); return ''; }
  n72.forEach(d => ar.appendChild(d));
  const lock = qPlace(qMk('iai-lock'), ep, 1300); lock.innerHTML = `<span>体力 のこり ${hpNow}</span>`;
  await fxSleep(950); if (B !== tok) { clean(); return ''; }
  // 居合い：主人公が消えて、ひと息に敵を切りぬけ、敵のむこうにあらわれる（背中を向けたまま）
  lock.remove(); if (me) me.classList.add('iai-gone'); se('iaiDash', 1, .85);
  const land = { x: Math.max(40, ep.x - 54), y: Math.min(bb.height - 50, ep.y + 64) };
  const sx = hb.x + hb.w * .4, sy = hb.y + hb.h * .55;
  const streak = qPlace(qMk('iai-streak'), { x: (sx + land.x) / 2, y: (sy + land.y) / 2 }, 700);
  streak.style.width = Math.round(Math.hypot(sx - land.x, sy - land.y) + 40) + 'px'; streak.style.setProperty('--a', Math.atan2(sy - land.y, sx - land.x) + 'rad');
  const line = qPlace(qMk('iai-line'), ep, 1600);
  const ghost = qImg('iai-ghost', S.breed === 'kotsuta' && stageOf(levelInfo().lv) === 1 ? KOTSUTA_POSE.attack : heroImg());
  ghost.style.height = Math.round(hb.h * .92) + 'px'; qPlace(ghost, land, 2400);
  await fxSleep(620); // しーんと止まる
  se('iaiSheath', 1, 1); await fxSleep(450); // 刀をおさめた「カチン」の瞬間に切れる
  if (B !== tok) { clean(); return ''; }
  const img = $('#enemy'), r = qRect(img);
  const halves = ['top', 'bottom'].map(side => {
    const h = qImg('iai-half ' + side, img.src);
    h.style.left = Math.round(r.x) + 'px'; h.style.top = Math.round(r.y) + 'px'; h.style.width = Math.round(r.w) + 'px'; h.style.height = Math.round(r.h) + 'px';
    const d = Math.tan(22 * Math.PI / 180) * r.w / 2 / Math.max(1, r.h) * 100;
    h.style.setProperty('--yl', (50 + d).toFixed(1) + '%'); h.style.setProperty('--yr', (50 - d).toFixed(1) + '%');
    return qAdd(h, 1000);
  });
  img.style.visibility = 'hidden'; line.classList.add('cut'); n72.forEach(d => d.classList.add('cut'));
  qFlash(); quake(); se('iaiCut', 1, 1); qHurtEnemy(2); qDmg(2, ep, 'big iai');
  await fxSleep(820);
  img.style.visibility = ''; halves.forEach(h => h.remove()); n72.forEach(d => d.remove()); dark.classList.add('gone');
  ghost.classList.add('gone'); await fxSleep(140); if (me) me.classList.remove('iai-gone'); qPose('joy', 900);
  await fxSleep(200); dark.remove();
  return `72の法則ぎり！ とどめの一撃で${B.en.name}に2ダメージ！`;
}

// ---------- ボス戦：景色を暗く・敵にまがまがしいオーラ ----------
function qAuraHTML(on) { return on ? '<div class="qaura" id="qaura" aria-hidden="true"></div>' : ''; }
