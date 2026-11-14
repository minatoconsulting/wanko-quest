// わんこクエスト　ゲームの動き
// 記録はこのスマホの中だけに保存する（研修用。行動の報告はしない）

// ================= 大会モード（セミナーのチーム対抗用。2026-11-12 本人の指示） =================
// 大会の日（TAIKAI_DAYS、日本時間）は「はじめる」画面に「大会モードではじめる」が出る。押すと大会用のまっさらな記録で始まる。ふだんの記録（wanko-quest-v1）は消えずに残る
// Claude のアーティファクトでは URL の ? や # がゲームまで届かないので、ボタンで切りかえる（手元で開くときは ?taikai=1114 でも入れる）
// 12時間たつか、宿屋の「ふだんの記録にもどる」で、ふだんの記録にもどる
// 2026-11-12 本人がチーム対抗戦をやめたので、今は大会の日なし（次に使うときは '2026-11-14': '1114' のように足す）
const TAIKAI_DAYS = {};
function taikaiToday() { const d = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); return TAIKAI_DAYS[d] || null; }
const TAIKAI_KEY = 'wanko-quest-taikai';
let TAIKAI = null, TAIKAI_MSG = '';
(function taikaiInit() {
  try {
    const t = JSON.parse(localStorage.getItem(TAIKAI_KEY));
    if (t && t.id && Date.now() - t.t < 12 * 3600e3) TAIKAI = t.id; else localStorage.removeItem(TAIKAI_KEY);
  } catch (e) {}
  const m = location.search.match(/[?&]taikai(?:=([^&]*))?/);
  if (!m) return;
  const v = decodeURIComponent(m[1] || '').trim();
  if (/^(off|0|false)$/i.test(v)) { taikaiOff(); TAIKAI_MSG = 'ふだんの記録にもどりました'; }
  else {
    TAIKAI = v.replace(/[^\w-]/g, '').slice(0, 20) || 'taikai';
    try { localStorage.setItem(TAIKAI_KEY, JSON.stringify({ id: TAIKAI, t: Date.now() })); } catch (e) {}
    TAIKAI_MSG = '大会モード　ふだんの記録は消えずに残っています';
  }
  try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
})();
function taikaiOff() { TAIKAI = null; try { localStorage.removeItem(TAIKAI_KEY); } catch (e) {} }
// ページを読みこみ直さずに、大会の記録とふだんの記録を切りかえる（アーティファクトの中では読みこみ直しを避ける）
function setTaikai(id) {
  if (id) { TAIKAI = id; try { localStorage.setItem(TAIKAI_KEY, JSON.stringify({ id, t: Date.now() })); } catch (e) {} }
  else taikaiOff();
  KEY = TAIKAI ? 'wanko-quest-taikai-' + TAIKAI : 'wanko-quest-v1';
  S = load(); TAB = 'home'; CLOUD_BEST = -1; cloudPull();
  if (TAIKAI) DEMO = false; else { try { DEMO = localStorage.getItem(DEMO_KEY) === '1'; } catch (e) {} }
}
function enterTaikai() {
  const id = taikaiToday(); if (!id) return;
  setTaikai(id);
  const d = $('#start'); if (d) d.remove();
  showStart(); toast('大会モード　ふだんの記録は消えずに残っています');
}
function leaveTaikai() {
  modal(`<h3>ふだんの記録にもどりますか？</h3><p>大会の記録はこのスマホに残ります。12時間以内なら、また「大会モードではじめる」で続きから遊べます</p>
    <div class="grid2"><button class="btn sub" onclick="closeModal()">やめる</button>
    <button class="btn" onclick="setTaikai(null);closeModal();stopBgm();render();toast('ふだんの記録にもどりました')">もどる</button></div>`);
}
let KEY = TAIKAI ? 'wanko-quest-taikai-' + TAIKAI : 'wanko-quest-v1';
const DEMO_KEY = 'wanko-quest-demo';
let S = load();
// 開いたときの「はじめる」画面を出しているあいだは曲を鳴らさない（下の showStart）
let STARTING = false, START_SND = null;
let TAB = 'home';
let pickBreed = 'kotsuta';
const $ = (sel) => document.querySelector(sel);
const CH = (no) => CHAPTERS.find(c => c.no === no);
// 章とステージ番号（第1章は1〜10、第2章は11〜、第3章は21〜、総まとめ編は31、金融基礎知識編は41〜）
// 画面に出す「ステージ〇」は番号ではなく並び順で決まる（第1章の10はアポ取り レベル2で、3のつぎ）
// 金融基礎知識編（part 5・js/data3.js）は 2026-11-14 に本人の指示で足した。ほかの章とはべつに、はじめからいつでも遊べる
const partOf = (no) => no === 'boss' ? 1 : (CH(no).part || 1);
const partStages = (p) => CHAPTERS.filter(c => (c.part || 1) === p);
const stageNo = (no) => no === 'boss' ? '塔' : partStages(partOf(no)).indexOf(CH(no)) + 1;
const partLabel = (p) => p === 4 ? '総まとめ編' : p === 5 ? '金融基礎知識編' : `第${p}章`;
const stageName = (no) => no === 'boss' ? '第1章 塔の決戦' : CH(no).final ? '総まとめ編' : `${partLabel(partOf(no))} ステージ${stageNo(no)}`;
// 修行場や宿屋の一覧に出す短い番号（1-3・金融-2 など）
const shortNo = (c) => c.final ? '総まとめ' : `${partOf(c.no) === 5 ? '金融' : partOf(c.no)}-${stageNo(c.no)}`;
const won = (no) => no === 'boss' ? !!S.boss : !!(S.ch[no] && S.ch[no].win);
// 章を終えたか（第1章は塔のボス、ほかは全部のステージ）
function partDone(p) { return p === 1 ? !!S.boss : partStages(p).length > 0 && partStages(p).every(c => won(c.no)); }
function partOpen(p) { return DEMO || p === 1 || p === 5 || partDone(p - 1) || (p === 2 && !!(S && S.open2)); }
// 第1章を1つでもクリアした人は、第2章を先に開ける（2026-11-12 本人の指示「すでにやってる人は第2章から始められるように」）
function canOpen2() { return !!S && !partOpen(2) && partStages(1).some(c => won(c.no)); }
function askOpen2() {
  modal(`<h3>第2章を先に開きますか？</h3><p>第2章は「商品を知る」。ITAエボリューション、申し込みの流れ、シミュレーターの使い方などを覚えます。第1章の続きも、いつでも遊べます</p>
    <div class="grid2"><button class="btn sub" onclick="closeModal()">やめる</button>
    <button class="btn" onclick="S.open2=true;save();MAP_PART=2;closeModal();render();toast('第2章が開きました')">開く</button></div>`);
}

// 問題に番号をつける（にがての記録と、正解率の分析に使う）
const QBANK = {};
// 消した問題は null で残してあるので、番号をつけてから取りのぞく
// ほかのステージから移した問題は、もとの id を書いてあるので、そのまま使う（にがての記録を引きつぐため）
CHAPTERS.forEach(c => { c.quiz.forEach((q, i) => { if (!q) return; q.id = q.id || c.no + '-' + i; q.no = c.no; QBANK[q.id] = q; }); c.quiz = c.quiz.filter(Boolean); });
Object.entries(HARD).forEach(([p, list]) => { list.forEach((q, i) => { if (!q) return; q.id = 'h' + p + '-' + i; q.part = +p; q.hard = true; QBANK[q.id] = q; }); HARD[p] = list.filter(Boolean); });

// ================= デモ版（作った人だけが、まだ行けない章も先に見られる） =================
// URLの最後に ?demo をつけて開くとオン、?demo=off でオフ。宿屋の「記録」のいちばん下を5回タップでも切りかえ
let DEMO = false;
try { DEMO = localStorage.getItem(DEMO_KEY) === '1'; } catch (e) {}
let DEMO_MSG = '';
(function demoParam() {
  const m = location.search.match(/[?&]demo(?:=([^&]*))?/);
  if (!m) return;
  setDemo(!/^(off|0|false)$/i.test(m[1] || ''));
  DEMO_MSG = DEMO ? 'デモ版オン　すべての章が見られます' : 'デモ版オフ';
  try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
})();
// 大会モードのあいだはデモ版を使わない（全員同じ条件にする）
if (TAIKAI) { DEMO = false; DEMO_MSG = ''; }
function setDemo(on) {
  DEMO = on;
  try { if (on) localStorage.setItem(DEMO_KEY, '1'); else localStorage.removeItem(DEMO_KEY); } catch (e) {}
}

// ================= 保存 =================
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 1) { s.companions = (s.companions || []).map(id => id === 'shibamaru' ? 'mage' : id); return fill(s); }
  } catch (e) {}
  return null;
}
// 前のバージョンの記録にない項目を足す
function fill(s) {
  s.ch = s.ch || {}; s.log = s.log || []; s.badges = s.badges || []; s.companions = s.companions || [];
  s.guide = s.guide || { open: {}, quiz: {} };
  s.streak = s.streak || { last: null, count: 0, shield: null };
  s.stars = s.stars || {}; s.qs = s.qs || {}; s.lread = s.lread || {};
  s.drill = s.drill || { ok: 0, nig: 0, days: [] };
  return s;
}
function save() { if (S) S.savedAt = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} cloudSoon(); }

// ================= 記録をスマホの外にも残す =================
// 1) Claude のアカウント（2026-11-13）：アーティファクトの中で、Claude にサインインして開いた人（db の data/users/<id>/）
// 2) 名前＋合言葉（2026-11-14 本人の指示）：GitHub Pages に移したあとの本番。Supabase（sugoroku プロジェクト）の wq_saves に
//    名前＋4けたの合言葉で残し、LINE・Safari・パソコンのどれで開いても続きから遊べるようにした
//    （アーティファクトの中からは外のサーバーにつなげないので、合言葉はアーティファクトでは使わない）
// どちらも、開いたときに読みこんで、進んでいるほうを使う。手元のほうが進んでいれば送る
// save() は上のほうでも呼ばれるので var にしておく（let だと宣言より前で呼ばれたときにエラーになる）
var CLOUD = null, CLOUD_BEST = -1, CLOUD_T = null, CLOUD_BUSY = false, CLOUD_AGAIN = false;
// どれだけ進んでいるか（どちらの記録を使うか決めるのに使う。経験値は減らないので、多いほうが新しい）
function prog(s) {
  if (!s) return -1;
  let n = (s.xp || 0) * 100 + (s.boss ? 50 : 0);
  for (const k in (s.ch || {})) { const c = s.ch[k] || {}; n += (c.win ? 3 : 0) + (c.lesson ? 1 : 0) + (c.clear ? 5 : 0); }
  return n;
}
// ---- 名前＋合言葉 ----
const NEW_URL = 'https://minatoconsulting.github.io/wanko-quest/';
const SB_RPC = 'https://axaxqgvvezvhffopggba.supabase.co/rest/v1/rpc/';
const SB_KEY = 'sb_publishable_Fqiwpwq3y7VBDyzBXNheRA_KVo1lHBQ';
const PASS_KEY = 'wanko-quest-pass';
// 合言葉の保存が使える場所（GitHub Pages と手元の確認用。アーティファクトの中は外につなげないので false）
const PASS_HOST = /(^|\.)github\.io$|^localhost$|^127\.0\.0\.1$/.test(location.hostname);
async function sbCall(fn, body) {
  const r = await fetch(SB_RPC + fn, { method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}
function passGet() { try { const p = JSON.parse(localStorage.getItem(PASS_KEY)); return p && p.name && /^\d{4}$/.test(p.pin) ? p : null; } catch (e) { return null; } }
function passSet(p) { try { if (p) localStorage.setItem(PASS_KEY, JSON.stringify(p)); else localStorage.removeItem(PASS_KEY); } catch (e) {} }
// 送る記録：経験値の記録（log）は画面に出すのが30件なので200件まで。ガイドから戻る位置（back）は送らない
function cloudData(s) { return JSON.stringify(Object.assign({}, s, { log: (s.log || []).slice(0, 200), back: null })); }
function passCloud(p) {
  const who = { p_name: p.name, p_pin: p.pin };
  return {
    kind: 'pass', name: p.name,
    async get() {
      const r = await sbCall('wq_load', who);
      if (r.ok) return r.data;
      if (r.err === 'none') return null;
      if (r.err === 'pin') { passSet(null); CLOUD = null; toast('合言葉が合わなくなりました。宿屋の「記録の残しかた」から入れ直してね'); }
      throw new Error(r.err);
    },
    async put(str, t, pg) {
      let r = await sbCall('wq_save', Object.assign({ p_data: str, p_prog: pg, p_saved_at: t }, who));
      // サーバーの記録が消えていたら（はじめからやり直した直後など）作り直す
      if (!r.ok && r.err === 'none') r = await sbCall('wq_save', Object.assign({ p_data: str, p_prog: pg, p_saved_at: t, p_create: true }, who));
      if (!r.ok && r.err === 'older') { CLOUD_BEST = Math.max(CLOUD_BEST, r.prog || 0); return; }
      if (!r.ok) throw new Error(r.err);
    },
    async del() { await sbCall('wq_forget', who); },
  };
}
// ---- Claude のアカウント（アーティファクトの db） ----
function dbCloud(db, uid) {
  const doc = () => db.collection('data/users/' + uid).doc(KEY);
  return {
    kind: 'db',
    async get() { const snap = await doc().get(); return snap.exists ? snap.data().s : null; },
    async put(str, t) { await doc().set({ s: str, t }); },
    async del() { await doc().delete(); },
  };
}
async function cloudInit() {
  try {
    if (PASS_HOST) {
      const p = passGet();
      if (p && !TAIKAI) { CLOUD = passCloud(p); await cloudPull(); }
      return;
    }
    if (!window.claude || !window.claude.use) return;
    const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
    if (!db || !user) return;
    const uid = await user.id();
    if (!uid) return;
    CLOUD = dbCloud(db, uid);
    await cloudPull();
  } catch (e) { if (!(CLOUD && CLOUD.kind === 'pass')) CLOUD = null; }
}
// 外の記録を読み、そちらが進んでいれば入れかえる。手元のほうが進んでいれば送る
async function cloudPull() {
  if (!CLOUD) return;
  if (CLOUD.kind === 'pass' && TAIKAI) return; // 大会の記録は合言葉には残さない
  const key = KEY, cl = CLOUD;
  let str;
  try { str = await cl.get(); } catch (e) { return; }
  if (key !== KEY || cl !== CLOUD) return;
  let c = null;
  if (str) { try { const s = JSON.parse(str); if (s && s.v === 1) c = fill(s); } catch (e) {} }
  CLOUD_BEST = prog(c);
  const pc = prog(c), ps = prog(S);
  if (c && (pc > ps || (pc === ps && (c.savedAt || 0) > (S.savedAt || 0)))) {
    if (B) return; // バトル中は入れかえない（終わって保存するときも、外のほうが進んでいれば上書きしない）
    if (START_SND !== null) { c.sound = START_SND; c.music = START_SND; }
    c.back = null;
    S = c;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    if (!$('#start')) { closeModal(); TAB = 'home'; }
    render();
    toast(cl.kind === 'pass' ? '合言葉の記録から続きを読みこみました' : 'Claudeのアカウントから続きを読みこみました');
  } else if (S && !(c && pc === ps && (c.savedAt || 0) === (S.savedAt || 0))) cloudPush();
}
function cloudSoon() { if (!CLOUD) return; clearTimeout(CLOUD_T); CLOUD_T = setTimeout(cloudPush, 2000); }
async function cloudPush() {
  clearTimeout(CLOUD_T); CLOUD_T = null;
  if (!CLOUD || !S) return;
  if (CLOUD.kind === 'pass' && TAIKAI) return;
  if (prog(S) < CLOUD_BEST) return; // ほかのスマホやパソコンのほうが進んでいる（古い画面からは上書きしない）
  if (CLOUD_BUSY) { CLOUD_AGAIN = true; return; }
  CLOUD_BUSY = true;
  try {
    await CLOUD.put(cloudData(S), S.savedAt || Date.now(), prog(S));
    CLOUD_BEST = Math.max(CLOUD_BEST, prog(S));
  } catch (e) {}
  CLOUD_BUSY = false;
  if (CLOUD_AGAIN) { CLOUD_AGAIN = false; cloudPush(); }
}
// 「はじめからやり直す」で消したときは、外の記録も消す（合言葉も忘れる）
function cloudForget() {
  clearTimeout(CLOUD_T); CLOUD_T = null; CLOUD_BEST = -1;
  if (CLOUD) CLOUD.del().catch(() => {});
  if (CLOUD && CLOUD.kind === 'pass') { passSet(null); CLOUD = null; }
}
// 画面にもどってきたら、ほかのスマホやパソコンで進めた分を読みこむ。画面を離れるときは、まだ送っていない分をすぐ送る
document.addEventListener('visibilitychange', () => {
  if (!CLOUD) return;
  if (document.visibilityState === 'hidden') { if (CLOUD_T) cloudPush(); }
  else cloudPull();
});

// ---- 記録を文字にして持ち運ぶ（アーティファクトから新しい場所へ引っ越すとき・引き継ぎコード） ----
function b64u(bytes) { let t = ''; for (let i = 0; i < bytes.length; i += 0x8000) t += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64u(str) { const t = atob(str.replace(/-/g, '+').replace(/_/g, '/')); const b = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) b[i] = t.charCodeAt(i); return b; }
async function packSave(s) {
  let bytes = new TextEncoder().encode(JSON.stringify(Object.assign({}, s, { log: (s.log || []).slice(0, 50), back: null })));
  if (window.CompressionStream) {
    try { const z = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); return 'z' + b64u(z); } catch (e) {}
  }
  return 'j' + b64u(bytes);
}
async function unpackSave(code) {
  code = String(code || '').replace(/\s+/g, '');
  let bytes = unb64u(code.slice(1));
  if (code[0] === 'z') bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  else if (code[0] !== 'j') throw new Error('code');
  const s = JSON.parse(new TextDecoder().decode(bytes));
  if (!s || s.v !== 1 || !s.name) throw new Error('code');
  return fill(s);
}
// どのアプリで開いているか。記録は開いたアプリの中にだけ残るので、つぎも同じ開き方で開いてもらう（遊び方・宿屋・お知らせで使う）
const OPENED_IN = (() => {
  const u = navigator.userAgent || '';
  if (/\bLine\//i.test(u)) return 'LINE';
  if (/Instagram/i.test(u)) return 'Instagram';
  if (/FBAN|FBAV/.test(u)) return 'Facebook';
  if (/EdgiOS|EdgA|Edg\//.test(u)) return 'Edge';
  if (/FxiOS|Firefox/.test(u)) return 'Firefox';
  if (/CriOS|Chrome\//.test(u)) return 'Chrome';
  if (/Safari/.test(u) && /iPhone|iPad|Macintosh/.test(u)) return 'Safari';
  return '';
})();
// 記録をなるべく消さないようにブラウザに頼む（Firefox は確認の画面が出るので頼まない）
try { if (navigator.storage && navigator.storage.persist && OPENED_IN !== 'Firefox') navigator.storage.persist().catch(() => {}); } catch (e) {}
function newState(name, breed) {
  return fill({
    v: 1, name, breed, xp: 0, boss: false, goals: null, tup: '', why: '', apo: '',
    sound: true, created: Date.now(),
  });
}

// ================= 小さな道具 =================
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function ymd(d = new Date()) { const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
function addDays(s, n) { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d); }
function weekKey(s) { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return ymd(d); }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function has(id) { return S.companions.includes(id); }
function mdLabel(s) { if (!s) return ''; const [, m, d] = s.split('-'); return `${+m}/${+d}`; }
const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

// ================= 音 =================
let AC = null;
// 効果音は録音した音（js/se.js）を鳴らす。コツコツすごろくのワンコクエスト（スロット）と同じ音で、どれも Openverse の CC0（2026-11-04 本人の指示）
// 元の音と作者は ~/Desktop/コツコツすごろく/tools/casino-quest-audio/音源記録.md。se.js は最初のタップのあとで読みこむ
// 読みこむ前や鳴らせないときは、前からの電子音（SFX）を鳴らす
const SE = { buf: new Map(), out: null, loading: false };
// 音ごとの大きさ（スロットと同じ）
const SE_GAIN = { select: .5, gauge: .5, poke: .55, coin: .6, omen: .7, omenRainbow: .75, reachHot: .8, slash: .85, hit: .85, bigHit: .95, clang: .8, magic: .8, special: .85, gaugeMax: .8, combo: .75, defeat: .85, bossAppear: .95, fanfare: .95, finalFanfare: .95, join: .9, chapter: .9,
  cutHero: .85, cutMage: .85, cutGoldio: .85, cutScout: .85, cutYell: .85, cutHeartn: .85, cutMemory: .85, swish: .85,
  // 2026-11-10 スロットから足した音（大きさもスロットと同じ）
  coins: .75, heal: .8, magicHit: .76, rainbow: .85, reach: .75, scoutHit: .85, stop: .65,
  tsumiCoin: .9, tsumiCharge: .75, tsumiWave: .85, tsumiHit: .85, iaiGleam: .8, iaiDash: .85, iaiSheath: .9, iaiCut: .95 };
// 必殺技のカットインの音は仲間ごと（2026-11-04 本人が聞きくらべて選んだ）
const CUT_SE = { hero: 'cutHero', mage: 'cutMage', goldio: 'cutGoldio', scout: 'cutScout', yell: 'cutYell', heartn: 'cutHeartn', memory: 'cutMemory' };
function loadSE() {
  if (SE.loading || !AC) return;
  SE.loading = true;
  const go = () => Object.entries(window.WANKO_SE || {}).forEach(([k, v]) => {
    try {
      const bytes = Uint8Array.from(atob(v), c => c.charCodeAt(0)).buffer;
      const p = AC.decodeAudioData(bytes, b => SE.buf.set(k, b), () => {});
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  });
  if (window.WANKO_SE) { go(); return; }
  const el = document.createElement('script');
  el.src = 'js/se.js'; el.onload = go; el.onerror = () => { SE.loading = false; };
  document.head.appendChild(el);
}
// 録音した音を鳴らす（鳴らせたら true）。rate は高さ、vol は大きさ
function se(name, rate = 1, vol = 1) {
  if (!S || !S.sound || !AC || document.hidden) return false;
  const b = SE.buf.get(name);
  if (!b) return false;
  try {
    if (!SE.out) {
      // スロットと同じく、全体の大きさをしぼってから、大きすぎる音をおさえる
      SE.out = AC.createGain(); SE.out.gain.value = .55;
      const lim = AC.createDynamicsCompressor();
      lim.threshold.value = -14; lim.knee.value = 16; lim.ratio.value = 5;
      SE.out.connect(lim).connect(AC.destination);
    }
    const src = AC.createBufferSource(), g = AC.createGain();
    src.buffer = b; src.playbackRate.value = rate; g.gain.value = (SE_GAIN[name] || .8) * vol;
    src.connect(g).connect(SE.out); src.start();
    return true;
  } catch (e) { return false; }
}
// 場面ごとの録音した音：[音, 高さ, 大きさ]
const SE_OF = {
  tap: ['select'], xp: ['coin'], correct: ['coin'], wrong: ['poke'],
  slash: ['slash'], hit: ['hit'], bigHit: ['bigHit'], hurt: ['bigHit'], angry: ['bigHit', .75],
  charge: ['reachHot'], gaugeMax: ['gaugeMax'], guard: ['clang'], special: ['special'], boss: ['bossAppear'],
  lvl: ['combo'], join: ['join'], win: ['defeat'], bossWin: ['fanfare'], finalWin: ['finalFanfare'], perfect: ['fanfare'],
};
// 敵のこうげき音。big はためた力の大こうげき（録音がないときは、ザシュッという風の音＋ドンという低い音）
function sfxAttack(big) {
  if (!S || !S.sound) return;
  if (se('slash', big ? .7 : .8, big ? 1 : .8)) return;
  try {
    ensureAC();
    const t = AC.currentTime, len = big ? .3 : .18;
    const buf = AC.createBuffer(1, Math.ceil(AC.sampleRate * len), AC.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = AC.createBufferSource(), bp = AC.createBiquadFilter(), g = AC.createGain();
    src.buffer = buf; bp.type = 'bandpass'; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(big ? 400 : 800, t); bp.frequency.exponentialRampToValueAtTime(big ? 2600 : 3800, t + len * .8);
    g.gain.setValueAtTime(.001, t); g.gain.exponentialRampToValueAtTime(big ? .5 : .35, t + len * .45); g.gain.exponentialRampToValueAtTime(.001, t + len);
    src.connect(bp).connect(g).connect(AC.destination); src.start(t); src.stop(t + len);
    const t2 = t + len * .6, o = AC.createOscillator(), g2 = AC.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(big ? 150 : 210, t2); o.frequency.exponentialRampToValueAtTime(40, t2 + .26);
    g2.gain.setValueAtTime(big ? .3 : .2, t2); g2.gain.exponentialRampToValueAtTime(.001, t2 + .28);
    o.connect(g2).connect(AC.destination); o.start(t2); o.stop(t2 + .3);
  } catch (e) {}
}
const SFX = {
  tap: [[660, .04]], type: [[660, .04]], xp: [[880, .05], [1320, .08]], tick: [[1250, .03]],
  hit: [[330, .04], [660, .06], [990, .08]], hurt: [[180, .1, 'sawtooth'], [110, .16, 'sawtooth']],
  win: [[523, .1], [659, .1], [784, .1], [0, .05], [1047, .3]],
  lose: [[392, .15], [330, .15], [262, .35]],
  lvl: [[523, .08], [659, .08], [784, .08], [1047, .08], [0, .06], [784, .08], [1047, .35]],
  join: [[392, .1], [523, .1], [659, .1], [784, .1], [659, .1], [784, .3]],
  charge: [[660, .05], [880, .05], [1175, .1]], guard: [[300, .06], [600, .12]],
  special: [[523, .05], [659, .05], [784, .05], [1047, .05], [1319, .05], [1568, .25]],
};
// 録音にだけある場面は、近い電子音を鳴らす
Object.assign(SFX, { correct: SFX.hit, wrong: SFX.hurt, slash: SFX.hit, bigHit: SFX.hit, angry: SFX.hurt, gaugeMax: SFX.charge, bossWin: SFX.win, finalWin: SFX.win, perfect: SFX.win });
function ensureAC() {
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) {}
  if (S && S.sound) loadSE();
  return AC;
}
function sfx(name) {
  if (!S || !S.sound) return;
  const r = SE_OF[name];
  if (r && se(...r)) return;
  if (!SFX[name]) return;
  try {
    ensureAC();
    let t = AC.currentTime;
    for (const [f, d, type] of SFX[name]) {
      if (f) {
        const o = AC.createOscillator(), g = AC.createGain();
        o.type = type || 'square'; o.frequency.value = f;
        g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
        o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + .02);
      }
      t += d;
    }
  } catch (e) {}
}

// 章クリアのファンファーレ（メロディ・和音・ベース・きらきら・シンバルを重ねて豪華に）
function sfxFanfare() {
  if (!S || !S.sound) return;
  if (se('chapter')) return;
  try {
    ensureAC();
    const t0 = AC.currentTime + .05;
    const note = (n, at, len, type, vol) => {
      const o = AC.createOscillator(), g = AC.createGain(), t = t0 + at;
      o.type = type; o.frequency.value = freq(n);
      g.gain.setValueAtTime(vol, t); g.gain.setValueAtTime(vol, t + len * .6); g.gain.exponentialRampToValueAtTime(.001, t + len);
      o.connect(g).connect(AC.destination); o.start(t); o.stop(t + len + .02);
    };
    const line = (seq, type, vol) => { let at = 0; for (const [n, len] of seq) { if (n !== '.') note(n, at, len, type, vol); at += len; } };
    line([['C5', .12], ['E5', .12], ['G5', .12], ['C6', .42], ['.', .06], ['A5', .14], ['B5', .14], ['C6', .14], ['E6', 1.6]], 'square', .045);
    line([['.', .36], ['E5', .42], ['.', .06], ['F5', .42], ['G5', 1.6]], 'square', .025);
    line([['C3', .36], ['C3', .48], ['F3', .42], ['C3', 1.6]], 'triangle', .14);
    // 最後の和音
    ['C5', 'E5', 'G5', 'C6'].forEach(n => note(n, 1.26, 1.8, 'triangle', .06));
    // きらきら（高い音の分散和音）
    ['C7', 'E7', 'G7', 'C8', 'G7', 'E7', 'C7', 'E7', 'G7', 'C8', 'E8'].forEach((n, i) => note(n, 1.3 + i * .07, .16, 'sine', .035));
    // シンバル
    const len = 1.4, buf = AC.createBuffer(1, Math.ceil(AC.sampleRate * len), AC.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = AC.createBufferSource(), hp = AC.createBiquadFilter(), g = AC.createGain(), t = t0 + 1.26;
    src.buffer = buf; hp.type = 'highpass'; hp.frequency.value = 6000;
    g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + len);
    src.connect(hp).connect(g).connect(AC.destination); src.start(t); src.stop(t + len);
  } catch (e) {}
}

// ---------- 音楽 ----------
const NOTE_I ={ C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function freq(n) { const m = n.match(/^([A-G][#b]?)(\d)$/); return 440 * Math.pow(2, (NOTE_I[m[1]] + (+m[2] + 1) * 12 - 69) / 12); }
function parseSeq(str) {
  const out = [];
  for (const t of str.replace(/\|/g, ' ').split(/\s+/).filter(Boolean)) {
    if (t === '~' && out.length) out[out.length - 1].len++;
    else out.push({ f: t === '.' || t === '~' ? 0 : freq(t), len: 1 });
  }
  return out;
}
// Google Flow Music で作った曲。ここにある曲は mp3 を鳴らし、ない曲（地図・オープニングなど）は data.js の BGM（8ビット）を鳴らす
const BGM_FILE = {
  town: 'bgm/home2a.mp3',
  battle1: 'bgm/battle1.mp3', battle2: 'bgm/battle2.mp3', battle3: 'bgm/battle3.mp3', battle4: 'bgm/battle4.mp3', battle5: 'bgm/battle5.mp3',
  boss1: 'bgm/boss1.mp3', boss2: 'bgm/boss2.mp3', boss3: 'bgm/boss3.mp3', boss4: 'bgm/boss4.mp3',
  final2: 'bgm/final2.mp3', final3: 'bgm/final3.mp3', final4: 'bgm/final4.mp3', final5: 'bgm/final5.mp3',
};
// ステージごとのバトルの曲（本人の指示）
// 章の1つ目の敵＝戦闘3、2つ目＝戦闘1、3つ目＝戦闘4、最後のボスの3つ前＝ボス1、1つ前＝ボス2〜4、最後のボス＝大ボス2〜5
// 指定のない敵は戦闘2と戦闘5を順番に。第3章のもうけ話ギツネは「2つ目」と「3つ前」が重なるのでボス1にした
const STAGE_BGM = {
  1: 'battle3', 2: 'battle1', 3: 'battle4', 10: 'battle5', 4: 'battle2', 5: 'battle5', 6: 'battle2', 7: 'boss1', 8: 'battle5', 9: 'boss2', boss: 'final2',
  11: 'battle3', 12: 'battle1', 13: 'battle4', 14: 'boss1', 15: 'battle2', 16: 'boss3', 17: 'final4',
  21: 'battle3', 22: 'boss1', 23: 'battle4', 24: 'boss4', 25: 'final5',
  31: 'final3',
  41: 'battle3', 42: 'battle1', 43: 'battle4', 44: 'boss1', 45: 'battle5', 46: 'boss2', 47: 'final2',
};
// 戦闘1（章の2つ目の敵の曲）は本人のお気に入り。ボスの曲（ボス1〜4・大ボス）のバトルはそのままで、ふつうのバトルの3回に1回は戦闘1にする（2026-11-12 本人の指示）
// S.favN＝前に戦闘1が流れてから、ふつうのバトルを何回したか（2つ目の敵で戦闘1が流れたときも0にもどす。続けて流れすぎないように）
const FAV_BGM = 'battle1', FAV_EVERY = 3;
function battleBgm(no, big) {
  const name = STAGE_BGM[no] || (big ? 'boss' : 'battle');
  if (big || !/^battle/.test(name)) return name;
  if (name === FAV_BGM) { S.favN = 0; return name; }
  S.favN = (S.favN || 0) + 1;
  if (S.favN < FAV_EVERY) return name;
  S.favN = 0;
  return FAV_BGM;
}
const MUS = { name: null, gain: null, timer: null, el: null, on: false, tok: 0 };
function musicOn() { return S && S.music !== false; }
function playBgm(name) {
  if (MUS.name === name && (MUS.gain || MUS.on)) return;
  stopBgm();
  MUS.name = name;
  if (!musicOn() || document.hidden) return;
  if (BGM_FILE[name]) { playFile(name); return; }
  const tr = BGM[name];
  if (!tr || !AC || AC.state !== 'running') return;
  const unit = 60 / tr.bpm / 2;
  // ベースは1オクターブ上げる（スマホのスピーカーでも聞こえるように）
  const voices = [[parseSeq(tr.mel), 'square', .03, 1], [parseSeq(tr.bas), 'triangle', .1, 2]];
  const loopLen = Math.max(...voices.map(([seq]) => seq.reduce((a, n) => a + n.len, 0))) * unit;
  const g = AC.createGain(); g.connect(AC.destination); MUS.gain = g;
  const schedule = (t0) => {
    for (const [seq, type, vol, mul] of voices) {
      let t = t0;
      for (const n of seq) {
        const d = n.len * unit;
        if (n.f) {
          const o = AC.createOscillator(), e = AC.createGain();
          o.type = type; o.frequency.value = n.f * mul;
          e.gain.setValueAtTime(vol, t); e.gain.setValueAtTime(vol, t + d * .7); e.gain.linearRampToValueAtTime(.0001, t + d * .95);
          o.connect(e).connect(g); o.start(t); o.stop(t + d);
        }
        t += d;
      }
    }
    MUS.timer = setTimeout(() => { if (MUS.gain === g) schedule(t0 + loopLen); }, Math.max(0, (t0 + loopLen - AC.currentTime - .4) * 1000));
  };
  schedule(AC.currentTime + .08);
}
// mp3 の曲は audio を1つだけ使い回す（iPhoneは、一度タップで鳴らした audio なら、あとで曲を変えても鳴らせる）
function playFile(name) {
  const el = MUS.el || (MUS.el = new Audio());
  el.loop = true; el.volume = .45;
  if (!el.src.endsWith(BGM_FILE[name])) el.src = BGM_FILE[name];
  try { el.currentTime = 0; } catch (e) {}
  MUS.on = true;
  // 鳴らせなかったら次のタップでやり直す（あとから別の曲を始めたときの古い失敗は無視する）
  const tok = MUS.tok = (MUS.tok || 0) + 1;
  const p = el.play();
  if (p) p.catch(() => { if (MUS.tok === tok) MUS.on = false; });
}
function stopBgm() {
  clearTimeout(MUS.timer); MUS.timer = null;
  if (MUS.el) MUS.el.pause();
  MUS.on = false;
  const g = MUS.gain; MUS.gain = null; MUS.name = null;
  if (g) { try { g.gain.setTargetAtTime(0, AC.currentTime, .05); setTimeout(() => g.disconnect(), 400); } catch (e) {} }
}
// 音は最初にタップしたあとでないと鳴らせないので、タップのたびに止まっている曲を始める
function unlockAudio() {
  if (!S || (!S.sound && !musicOn())) return;
  ensureAC();
  if (MUS.name && !MUS.gain && !MUS.on) {
    const n = MUS.name; MUS.name = null;
    // mp3 はタップの中で鳴らさないと止められることがあるので、待たずに始める
    if (BGM_FILE[n]) playBgm(n); else setTimeout(() => playBgm(n), 60);
  }
}
// iPhoneは「タップを離したとき」でないと音を出せないことがあるので、いくつかのきっかけで試す
['pointerdown', 'touchend', 'click'].forEach(ev => document.addEventListener(ev, unlockAudio, true));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { const n = MUS.name; stopBgm(); MUS.name = n; }
  else if (MUS.name) { const n = MUS.name; MUS.name = null; playBgm(n); }
  // ガイドを別の画面で開いて、読みこみ直しなしで戻ってきたときは、覚えた画面を消しておく
  if (!document.hidden && S && S.back) { S.back = null; save(); }
  // 別のアプリを見ているあいだは、バトルの時間制限を止めておく
  if (typeof B === 'undefined' || !B || B.answered) return;
  if (document.hidden && B.tm) { B.tpause = Math.max(1, (B.tend - Date.now()) / 1000); stopTimer(); }
  else if (!document.hidden && B.tpause) { const t = B.tpause; B.tpause = 0; startTimer(t, B.ttotal); }
});

// ================= レベル・経験値 =================
function levelInfo(xp = S.xp) {
  let lv = 1, rem = xp;
  while (rem >= xpForNext(lv) && lv < 99) { rem -= xpForNext(lv); lv++; }
  return { lv, cur: rem, need: xpForNext(lv) };
}
function titleOf(lv) { let t = TITLES[0][1]; for (const [l, n] of TITLES) if (lv >= l) t = n; return t; }
function stageOf(lv) { let s = 1; STAGES.forEach(([l], i) => { if (lv >= l) s = i + 1; }); return s; }
function heroImg(lv = levelInfo().lv, breed = S.breed) { return `img/hero_${breed}_${stageOf(lv)}.webp`; }

function gain(type, amount, label) {
  const before = levelInfo().lv;
  S.xp += amount;
  S.log.unshift({ t: Date.now(), d: ymd(), type, xp: amount, label });
  if (S.log.length > 1500) S.log.length = 1500;
  touchStreak();
  save();
  toast(`＋${amount}　${label}`);
  sfx('xp');
  const after = levelInfo().lv;
  if (after > before) levelUp(before, after);
}

function levelUp(before, after) {
  const st1 = stageOf(before), st2 = stageOf(after);
  const t1 = titleOf(before), t2 = titleOf(after);
  setTimeout(() => sfx('lvl'), 250);
  modal(`
    <div class="lvup">レベルアップ</div>
    <img class="bigimg" src="${heroImg(after)}" alt="">
    <p class="center">${esc(S.name)}は <b>Lv${after}</b> になった！</p>
    ${t2 !== t1 ? `<p class="center">称号が「${t2}」になった</p>` : ''}
    ${st2 !== st1 ? `<p class="center">見た目が「${STAGES[st2 - 1][1]}」になった！</p>` : ''}
    <button class="btn w" onclick="closeModal()">やったね</button>`);
}

// 連続記録（1日1回でも経験値が入ったらつながる）
function touchStreak() {
  const d = ymd(), st = S.streak;
  if (st.last === d) return;
  if (st.last === addDays(d, -1)) st.count++;
  else if (st.last === addDays(d, -2) && has('heartn') && st.shield !== weekKey(d)) {
    st.count++; st.shield = weekKey(d);
    setTimeout(() => toast('ハートンが連続記録を守ってくれた'), 600);
  } else st.count = 1;
  st.last = d;
}
function streakNow() {
  const st = S.streak, d = ymd();
  if (!st.last) return 0;
  if (st.last === d || st.last === addDays(d, -1)) return st.count;
  if (st.last === addDays(d, -2) && has('heartn') && st.shield !== weekKey(d)) return st.count;
  return 0;
}

// ================= 問題の記録（にがて・正解率） =================
function track(q, ok) {
  if (!q || !q.id) return;
  const r = S.qs[q.id] || (S.qs[q.id] = { o: 0, n: 0 });
  if (ok) r.o++; else { r.n++; r.m = 1; }
}
function nigateIds() { return Object.keys(S.qs).filter(id => S.qs[id].m && QBANK[id]); }
// 作戦会議を聞いたステージ
function learnedStages() { return CHAPTERS.filter(c => S.ch[c.no] && S.ch[c.no].lesson); }
function stageQs(c) { return c.quiz.concat(...(c.hard || []).map(p => HARD[p])); }
function accOf(list) {
  let o = 0, n = 0;
  for (const q of list) { const r = S.qs[q.id]; if (r) { o += r.o; n += r.n; } }
  return { o, n, all: o + n, pct: o + n ? Math.round(o / (o + n) * 100) : null };
}
function drilledToday() { return S.drill.days.includes(ymd()); }

// ================= ミッション・ステージクリア =================
function missionProgress(m, no) {
  switch (m.type) {
    case 'none': return { cur: no && won(no) ? 1 : 0, n: 1 };
    case 'tool': return { cur: S.guide.open[m.id] ? 1 : 0, n: 1 };
    case 'goals': return { cur: S.goals && S.goals.long && S.goals.short ? 1 : 0, n: 1 };
    case 'tup': return { cur: S.tup ? 1 : 0, n: 1 };
    case 'why': return { cur: S.why ? 1 : 0, n: 1 };
    case 'apo': return { cur: S.apo ? 1 : 0, n: 1 };
    case 'guide': return { cur: Object.keys(S.guide.quiz).length, n: m.n };
    case 'star': return { cur: (S.stars[no] || 0) >= m.n ? 1 : 0, n: 1 };
    case 'drill': return { cur: S.drill.ok, n: m.n };
    case 'days': return { cur: S.drill.days.length, n: m.n };
  }
  return { cur: 0, n: 1 };
}
function missionDo(no) {
  const m = CH(no).mission;
  closeModal();
  const map = {
    goals: () => openGoals(), tup: () => openText('tup'), why: () => openText('why'), apo: () => openText('apo'),
    guide: () => go('shop'), tool: () => go('shop'), star: () => startBattle(no),
    drill: () => go('guild'), days: () => go('guild'), none: () => {},
  };
  map[m.type]();
}
const MISSION_BTN = {
  goals: '目標を書く', tup: '一言を書く', why: '想いを書く', apo: '一言を書く', guide: '道具屋へ', tool: '道具屋で開く',
  star: 'ノーミスに挑戦', drill: '修行場へ', days: '修行場へ',
};

function unlocked(no) {
  if (DEMO) return true;
  // あとからステージを足しても、勝ったことがある・作戦会議を聞いたことがある場所は閉じない
  if (no === 'boss') return !!S.boss || allWon();
  if (S.ch[no] && (S.ch[no].win || S.ch[no].lesson)) return true;
  const p = partOf(no), list = partStages(p), i = list.indexOf(CH(no));
  return i > 0 ? won(list[i - 1].no) : partOpen(p);
}
// 第1章のステージを全部終えたか（塔へ行ける）
function allWon() { return partStages(1).every(c => won(c.no)); }

function checkClears() {
  for (const ch of CHAPTERS) {
    const st = S.ch[ch.no] || {};
    if (st.clear || !st.lesson || !st.win) continue;
    const p = missionProgress(ch.mission, ch.no);
    if (p.cur < p.n) continue;
    st.clear = true; S.ch[ch.no] = st;
    const r = ch.reward;
    let html = `<div class="lvup">ステージクリア</div><p class="center">${stageName(ch.no)}　${ch.place}の冒険をやりとげた！</p>`;
    if (r.companion && !has(r.companion)) {
      S.companions.push(r.companion);
      const c = COMPANIONS[r.companion];
      html += `<img class="bigimg" src="${c.img}" alt=""><p class="center"><b>${c.name}</b>（${c.role}）が仲間になった！</p><p class="muted center">${c.effect}</p>`;
      setTimeout(() => sfx('join'), 300);
    }
    if (r.badge && !S.badges.includes(r.badge)) {
      S.badges.push(r.badge);
      html += `<p class="center"><span class="badge">🏅${r.badge}</span>を手に入れた！</p><p class="muted center">${ch.title}をクリアした記念のしるし。宿屋に飾られるよ</p>`;
    }
    modal(html + `<button class="btn w" onclick="closeModal()">やったね</button>`);
    gain('clear', XP.chapterClear, `${stageName(ch.no)}クリア`);
  }
}
function afterChange() { checkClears(); save(); render(); }
// バッジは、ステージや章をクリアした記念のしるし（宿屋に並ぶ）
function badgeFrom(b) {
  const c = CHAPTERS.find(x => x.reward.badge === b);
  if (c) return `${stageName(c.no)}「${c.title}」をクリアしたしるし`;
  const pp = PARTS.find(x => x.badge === b);
  if (!pp) return '';
  return pp.no === 4 ? 'すべての冒険をやりとげたしるし' : `${partLabel(pp.no)}「${pp.title}」をクリアしたしるし`;
}
function rewardText(ch) {
  return ch.reward.companion ? `${COMPANIONS[ch.reward.companion].name}が仲間になる` : `🏅${ch.reward.badge}（クリアの記念のしるし。宿屋に飾られるよ）`;
}

// ================= 書きこみ（目標・T-UP・想い） =================
function openGoals() {
  const g = S.goals || { long: '', longD: '', short: '', shortD: '' };
  modal(`<div class="plain"><h3>目標を書こう</h3>
    <p class="muted">期限を決めて具体的に　書いたら紙にも書いて貼っておこう</p>
    <div class="gbox"><b class="gttl">🏔️ 長期目標<small>ずっと先のゴール</small></b>
      <textarea id="gl" placeholder="例 1年後までに〇〇になる">${esc(g.long)}</textarea>
      <label class="gdate">期限<input type="date" id="gld" value="${esc(g.longD)}"></label></div>
    <div class="gbox"><b class="gttl">🚩 短期目標<small>もうすぐのゴール</small></b>
      <textarea id="gs" placeholder="例 今月中に〇〇する">${esc(g.short)}</textarea>
      <label class="gdate">期限<input type="date" id="gsd" value="${esc(g.shortD)}"></label></div>
    <div class="grid2" style="margin-top:14px"><button class="btn sub" onclick="closeModal()">やめる</button>
    <button class="btn" onclick="saveGoals()">保存</button></div></div>`);
}
function saveGoals() {
  const g = { long: $('#gl').value.trim(), longD: $('#gld').value, short: $('#gs').value.trim(), shortD: $('#gsd').value };
  if (!g.long || !g.short || !g.longD || !g.shortD) { toast('目標と期限を両方入れてね'); return; }
  S.goals = g; save(); closeModal(); toast('目標を保存しました'); afterChange();
}
const TEXTS = {
  tup: { title: 'T-UPの一言', hint: 'CさんにAさんを紹介する一言を書こう', ph: '例 金融に詳しくて　すごく分かりやすく教えてくれる人だよ' },
  why: { title: 'なぜ自分が始めたのか', hint: 'Bプッシュで伝える、あなたの想いを書こう', ph: '例 家族に〇〇してあげたくて始めたんだ' },
  apo: { title: 'アポの一言', hint: '「そういえば」から始まる、あなたのアポの一言を書こう。〇〇のところは、アップ（リーダー）と相談して決めよう', ph: '例 そういえば最近資産運用始めてさー　簡単に言うと〇〇なんだけど　すごく内容良くてさ' },
};
function openText(k) {
  const t = TEXTS[k];
  modal(`<div class="plain"><h3>${t.title}</h3><p class="muted">${t.hint}</p>
    <textarea id="tx" placeholder="${t.ph}">${esc(S[k])}</textarea>
    <div class="grid2" style="margin-top:14px"><button class="btn sub" onclick="closeModal()">やめる</button>
    <button class="btn" onclick="saveText('${k}')">保存</button></div></div>`);
}
function saveText(k) {
  const v = $('#tx').value.trim();
  if (v.length < 8) { toast('もう少しくわしく書いてみよう'); return; }
  S[k] = v; save(); closeModal(); toast('保存しました'); afterChange();
}

// ================= ポップアップ・お知らせ =================
const MQ = [];
let mOpen = false;
function modal(html, onClose) { MQ.push({ html, onClose }); if (!mOpen) nextModal(); }
function nextModal() {
  const el = $('#modal'), m = MQ.shift();
  if (!m) { mOpen = false; el.classList.remove('show'); el.innerHTML = ''; el._onClose = null; return; }
  mOpen = true;
  el.innerHTML = `<div class="mbox">${m.html}</div>`;
  el.classList.add('show');
  el._onClose = m.onClose;
}
function closeModal() { const f = $('#modal')._onClose; nextModal(); if (f) f(); }
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  const box = $('#toasts');
  box.appendChild(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => t.remove(), 2500);
}
function sayHTML(who, text, btn) {
  const c = COMPANIONS[who];
  return `<div class="say" style="margin-bottom:12px"><img src="${c.img}" alt=""><div class="sbub"><b>${c.name}</b>${text}${btn ? `<div style="margin-top:8px"><button class="btn sm" onclick="${btn[1]}">${btn[0]}</button></div>` : ''}</div></div>`;
}

// ================= 画面 =================
function go(tab) {
  TAB = tab; sfx('tap'); render(); window.scrollTo(0, 0);
  if (tab === 'shop' && !S.memoIntro) {
    S.memoIntro = true; save();
    setTimeout(() => startTalk('道具屋のメモリー', 'memory', MEMORY_INTRO, guideMap), 250);
  }
  const app = $('#app'); app.classList.remove('fade'); void app.offsetWidth; app.classList.add('fade');
}

function render() {
  const app = $('#app');
  if (!S) { app.innerHTML = viewCreate(); return; }
  const v = { home: viewHome, map: viewMap, guild: viewGuild, shop: viewShop, inn: viewParty, record: viewRecord, post: viewPost }[TAB] || viewHome;
  app.innerHTML = topbar() + v();
  if (!FX && !STARTING && !$('#scene').classList.contains('show')) playBgm(TAB === 'map' ? 'map' : 'town');
}

function topbar() {
  const L = levelInfo();
  return `<div class="topbar"><img src="${heroImg(L.lv)}" alt="">
    <div class="grow"><div class="row" style="gap:8px"><span class="lv">Lv${L.lv}</span><span class="nm">${esc(S.name)}　${titleOf(L.lv)}</span>${DEMO ? '<span class="demo">デモ版</span>' : ''}${TAIKAI ? '<span class="demo taikai">大会</span>' : ''}</div>
    <div class="bar"><i style="width:${Math.floor(L.cur / L.need * 100)}%"></i></div>
    <div class="muted" style="font-size:11px;color:#b8b0d6">次のレベルまで ${L.need - L.cur}</div></div>
    <button class="hlp" onclick="sfx('tap');howTo()" aria-label="遊び方"><b>？</b>遊び方</button>
    <button class="snd" onclick="toggleSound()" aria-label="音のオンオフ">${S.sound || musicOn() ? '🔊' : '🔇'}</button>
    <div class="streak"><b>${streakNow()}</b>日連続</div></div>`;
}
function toggleSound() {
  const on = !(S.sound || musicOn());
  S.sound = on; S.music = on; save();
  if (!on) stopBgm(); else ensureAC();
  render();
}
// 各画面の上の見出し（町の絵の切り抜き＋町へもどるボタン）
function banner(key) {
  const [x, y, w, h] = BANNERS[key];
  return `<div class="banner" style="aspect-ratio:${w}/${h};background-size:${1024 / w * 100}% auto;background-position:${x / (1024 - w) * 100}% ${y / (1536 - h) * 100}%"></div>`;
}
function subHead(title, key) {
  return `<div class="subhead">${key ? banner(key) : ''}<div class="bar2"><button class="back" onclick="go('home')">◀ 町へ</button><span>${title}</span></div></div>`;
}
function segTabs(items, on) {
  return `<div class="seg">${items.map(([k, l]) => `<button class="${on === k ? 'on' : ''}" onclick="go('${k}')">${l}</button>`).join('')}</div>`;
}
function enter(id) { if (id === 'gate') MAP_PART = null; go(id === 'gate' ? 'map' : id); }

// ---------- はじめの画面 ----------
function viewCreate() {
  return `<div class="titlehero"><img class="tbg" src="img/title.webp" alt="" onerror="this.remove()">
      <div class="tlogo">わんこ<br>ビジネスクエスト<small>ビジネスの基礎を冒険しながら覚えよう</small></div></div>
    <div class="pad">
      ${TAIKAI ? `<div class="card"><h3>大会モード</h3><p style="margin:0;font-size:14px">大会用のまっさらな記録で始まります。ふだんの記録は消えずに残っています</p></div>` : ''}
      ${PASS_HOST && !TAIKAI ? `<div class="card plain passin"><h3>前に遊んだことがある人</h3>
        <p class="muted" style="margin:0 0 8px">名前と合言葉を入れると、続きから遊べます</p>
        <button class="btn grn w" onclick="passLogin()">名前と合言葉で続きから</button>
        <button class="btn sub sm w" style="margin-top:8px" onclick="codeImport()">引き継ぎコードで続きから</button></div>` : ''}
      <div class="card"><h3>相棒の犬種をえらぶ</h3>
        <div class="breeds">${BREEDS.map(b => `<button class="${pickBreed === b.id ? 'on' : ''}" onclick="pickBreed='${b.id}';render()"><img src="img/hero_${b.id}_1.webp" alt=""><br>${b.name}</button>`).join('')}</div>
      </div>
      <div class="card plain"><h3>名前をつける</h3>
        <input type="text" id="nm" maxlength="10" placeholder="例 コツ太">
        <p class="muted">あなた自身の名前でもOK</p>
      </div>
      ${PASS_HOST && !TAIKAI ? `<div class="card plain"><h3>合言葉を決める（数字4けた）</h3>
        <input type="tel" id="pin" inputmode="numeric" maxlength="4" placeholder="例 0814" autocomplete="off">
        <p class="muted">名前と合言葉で、ほかのスマホやアプリからも続きから遊べます。忘れないようにメモしておいてね</p>
      </div>` : ''}
      <button class="btn w" id="startbtn" onclick="startGame()">冒険をはじめる</button>
    </div>`;
}
async function startGame() {
  const name = $('#nm').value.trim().slice(0, 10);
  if (!name) { toast('名前を入れてね'); return; }
  const s = newState(name, pickBreed);
  if (START_SND === false) { s.sound = false; s.music = false; }
  // 合言葉を決めて、サーバーに記録を作る（同じ名前がほかの合言葉で使われていたら、名前を変えてもらう）
  if (PASS_HOST && !TAIKAI) {
    const pin = toHalf($('#pin').value).trim();
    if (!/^\d{4}$/.test(pin)) { toast('合言葉は数字4けたで入れてね'); return; }
    const btn = $('#startbtn'); btn.disabled = true;
    s.savedAt = Date.now();
    let r = null;
    try { r = await sbCall('wq_save', { p_name: name, p_pin: pin, p_data: cloudData(s), p_prog: prog(s), p_saved_at: s.savedAt, p_create: true }); } catch (e) {}
    btn.disabled = false;
    if (r && !r.ok && r.err === 'taken') { toast('この名前はもう使われています。ちがう名前にしてね'); return; }
    if (r && !r.ok && (r.err === 'older' || r.err === 'locked')) { toast('この名前の記録があります。上の「名前と合言葉で続きから」から入ってね'); return; }
    if (r && r.ok) { const p = { name, pin }; passSet(p); CLOUD = passCloud(p); CLOUD_BEST = prog(s); }
    else toast('合言葉の登録に失敗しました。あとで宿屋から登録できます');
  }
  S = s;
  save();
  TAB = 'home'; render(); sfx('join');
  startOpening();
}
// 全角の数字を半角に（スマホで全角になっていても通るように）
function toHalf(t) { return String(t || '').replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)); }
// 名前と合言葉で続きから（ほかのスマホやアプリで遊んでいた記録を呼び出す）
function passLogin() {
  modal(`<div class="plain"><h3>名前と合言葉で続きから</h3>
    <p class="muted" style="margin:0 0 10px">冒険をはじめたときの名前と、数字4けたの合言葉を入れてね</p>
    <input type="text" id="lnm" maxlength="10" placeholder="名前" value="${esc(S ? S.name : '')}">
    <input type="tel" id="lpin" inputmode="numeric" maxlength="4" placeholder="合言葉（数字4けた）" autocomplete="off" style="margin-top:8px">
    ${S ? '<p class="muted" style="margin:8px 0 0">このスマホの今の記録は、呼び出した記録に入れかわります</p>' : ''}
    <div class="grid2" style="margin-top:12px"><button class="btn sub" onclick="closeModal()">やめる</button>
    <button class="btn grn" id="lgo" onclick="passLoginGo()">続きから</button></div></div>`);
}
async function passLoginGo() {
  const name = $('#lnm').value.trim(), pin = toHalf($('#lpin').value).trim();
  if (!name) { toast('名前を入れてね'); return; }
  if (!/^\d{4}$/.test(pin)) { toast('合言葉は数字4けたで入れてね'); return; }
  const btn = $('#lgo'); btn.disabled = true;
  let r = null;
  try { r = await sbCall('wq_load', { p_name: name, p_pin: pin }); } catch (e) {}
  btn.disabled = false;
  if (!r) { toast('つながりませんでした。電波のよいところでもう一度'); return; }
  if (!r.ok) { toast(r.err === 'none' ? 'その名前の記録が見つかりません' : r.err === 'pin' ? '合言葉がちがいます' : r.err === 'locked' ? 'まちがいが多いので、30分ほど待ってね' : '名前と合言葉を確かめてね'); return; }
  let c = null;
  try { const x = JSON.parse(r.data); if (x && x.v === 1) c = fill(x); } catch (e) {}
  if (!c) { toast('記録を読みこめませんでした'); return; }
  if (START_SND !== null) { c.sound = START_SND; c.music = START_SND; }
  c.back = null; c.passAsk = true;
  S = c;
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  const p = { name: r.name || name, pin }; passSet(p); CLOUD = passCloud(p); CLOUD_BEST = prog(c);
  closeModal(); TAB = 'home'; render(); sfx('join');
  toast(`おかえり、${S.name}！続きから遊べます`);
}
// 前から遊んでいる人（このスマホの記録はあるが、合言葉をまだ決めていない）に合言葉を決めてもらう
function passSetup() {
  if (!S) return;
  S.passAsk = true; save();
  modal(`<div class="plain"><h3>合言葉を決めよう</h3>
    ${sayHTML('mage', '名前と合言葉を決めておくと、ほかのスマホやアプリで開いても続きから遊べるよ！')}
    <input type="text" id="snm" maxlength="10" placeholder="名前" value="${esc(S.name)}">
    <input type="tel" id="spin" inputmode="numeric" maxlength="4" placeholder="合言葉（数字4けた）" autocomplete="off" style="margin-top:8px">
    <p class="muted" style="margin:8px 0 0">忘れないようにメモしておいてね</p>
    <div class="grid2" style="margin-top:12px"><button class="btn sub" onclick="closeModal()">あとで</button>
    <button class="btn grn" id="sgo" onclick="passSetupGo()">決める</button></div></div>`);
}
async function passSetupGo() {
  const name = $('#snm').value.trim().slice(0, 10), pin = toHalf($('#spin').value).trim();
  if (!name) { toast('名前を入れてね'); return; }
  if (!/^\d{4}$/.test(pin)) { toast('合言葉は数字4けたで入れてね'); return; }
  const btn = $('#sgo'); btn.disabled = true;
  S.savedAt = Date.now();
  let r = null;
  try { r = await sbCall('wq_save', { p_name: name, p_pin: pin, p_data: cloudData(S), p_prog: prog(S), p_saved_at: S.savedAt, p_create: true }); } catch (e) {}
  btn.disabled = false;
  if (!r) { toast('つながりませんでした。電波のよいところでもう一度'); return; }
  if (!r.ok && r.err === 'taken') { toast('この名前はもう使われています。ちがう名前にしてね'); return; }
  if (!r.ok && r.err === 'locked') { toast('まちがいが多いので、30分ほど待ってね'); return; }
  if (!r.ok && r.err !== 'older') { toast('名前と合言葉を確かめてね'); return; }
  const p = { name, pin }; passSet(p); CLOUD = passCloud(p);
  closeModal();
  // 同じ名前と合言葉で、このスマホより進んだ記録があった：そちらを読みこむ
  if (!r.ok && r.err === 'older') { CLOUD_BEST = -1; await cloudPull(); return; }
  CLOUD_BEST = prog(S);
  render(); toast('合言葉を決めました。ほかのスマホでも続きから遊べます');
}
// 引き継ぎコード（前の Claude のページから持ってきた記録）を貼りつけて続きから
function codeImport() {
  modal(`<div class="plain"><h3>引き継ぎコードで続きから</h3>
    <p class="muted" style="margin:0 0 8px">前のページの「記録ごと新しい場所へ」でコピーしたコードを貼りつけてね</p>
    <textarea id="icode" style="min-height:110px" placeholder="ここに貼りつけ"></textarea>
    <div class="grid2" style="margin-top:12px"><button class="btn sub" onclick="closeModal()">やめる</button>
    <button class="btn grn" onclick="codeImportGo($('#icode').value)">続きから</button></div></div>`);
}
async function codeImportGo(code, auto) {
  let c = null;
  try { c = await unpackSave(code); } catch (e) {}
  if (!c) { if (!auto) toast('コードを読みこめませんでした。全部コピーできているか確かめてね'); return false; }
  // このスマホに、もっと進んだ記録があれば上書きしない
  if (S && prog(S) > prog(c)) { if (!auto) toast('このスマホの記録のほうが進んでいるので、そのままにしました'); return false; }
  if (START_SND !== null) { c.sound = START_SND; c.music = START_SND; }
  c.back = null; c.passAsk = false; c.saveTip = true;
  S = c; save();
  if (!auto) { closeModal(); TAB = 'home'; render(); toast(`おかえり、${S.name}！続きから遊べます`); }
  return true;
}
// アーティファクト（前の場所）から、記録ごと新しい場所へ引っ越す
async function moveOut() {
  // はじめる画面から押したときは、はじめる画面を閉じる（開いたままだと、この案内がうしろに隠れる）
  const st = $('#start'); if (st) { STARTING = false; st.remove(); render(); }
  let url = NEW_URL, code = '';
  if (S) { try { code = await packSave(S); url = NEW_URL + '#import=' + code; } catch (e) {} }
  modal(`<div class="plain"><h3>新しい場所へ引っ越し</h3>
    ${sayHTML('mage', '新しい場所では「名前と合言葉」で、どのスマホやアプリからでも続きから遊べるよ！')}
    <a class="btn grn w" href="${url}" target="_blank" rel="noopener" style="text-decoration:none">${S ? '記録ごと新しい場所を開く' : '新しい場所を開く'}</a>
    ${code ? `<p class="muted" style="margin:12px 0 4px">うまく開けないときは、下のコードをコピーして、新しい場所の「引き継ぎコードで続きから」に貼りつけてね</p>
    <textarea id="mcode" readonly style="min-height:70px;font-size:12px">${code}</textarea>
    <button class="btn sub sm w" style="margin-top:6px" onclick="copyCode()">コードをコピー</button>
    <p class="muted" style="margin:10px 0 0;word-break:break-all">新しい場所：${NEW_URL}</p>` : ''}
    <button class="btn sub w" style="margin-top:12px" onclick="closeModal()">とじる</button></div>`);
}
function copyCode() {
  const t = $('#mcode'); if (!t) return;
  t.select();
  const done = () => toast('コピーしました');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(done, () => { try { document.execCommand('copy'); done(); } catch (e) {} });
  else { try { document.execCommand('copy'); done(); } catch (e) {} }
}

// ---------- ホーム ----------
function nextNode() {
  for (const ch of partStages(1)) if (!won(ch.no)) return ch.no;
  if (!S.boss) return 'boss';
  for (const ch of CHAPTERS) if ((ch.part || 1) > 1 && unlocked(ch.no) && !won(ch.no)) return ch.no;
  return null;
}
// 左上のガイド：いま何をすればいいか
function nextGoal() {
  const nx = nextNode();
  if (nx === 'boss') return { icon: '🏰', text: '町の門を出て<br>先のばしの塔で決戦', sub: '冒険の地図のいちばん上', spot: 'gate', act: "openChapter('boss')" };
  if (nx) {
    const ch = CH(nx), st = S.ch[nx] || {};
    if (!st.lesson) return { icon: '📜', text: `町の門を出て<br>${ch.place}で作戦会議`, sub: `${stageName(nx)}「${ch.title}」`, spot: 'gate', act: `openChapter(${nx})` };
    return { icon: '⚔️', text: `町の門を出て<br>${ch.enemy.name}をたおす`, sub: `${ch.place}「${ch.title}」`, spot: 'gate', act: `openChapter(${nx})` };
  }
  const open = CHAPTERS.find(c => !(S.ch[c.no] && S.ch[c.no].clear));
  if (open) return { icon: '🎯', text: 'ミッションをやりとげる', sub: `${stageName(open.no)}「${open.title}」`, spot: 'gate', act: `openChapter(${open.no})` };
  return { icon: '🏋️', text: '修行場で毎日おさらい', sub: 'レベルを上げて伝説のワンコへ', spot: 'guild', act: "go('guild')" };
}
function unreadLetters() { return CHAPTERS.filter(c => won(c.no) && !S.lread[c.no]).map(c => c.no); }
function homeGuide() {
  const g = nextGoal(), un = unreadLetters().length, learned = learnedStages().length;
  const subs = [];
  // 寄り道（修行・手紙）は見出しの横に小さく。札が高くなって看板に重ならないように
  if (learned && !drilledToday()) subs.push(`<button onclick="go('guild')" aria-label="今日の修行">🏋️<span class="qst">修行</span></button>`);
  if (un) subs.push(`<button onclick="go('post')" aria-label="手紙${un}通">📮${un}</button>`);
  return `<div class="qguide">
    <div class="qtop"><span class="qh" onclick="sfx('tap');${g.act}">${g.icon} つぎにやること</span>${subs.length ? `<span class="qsub">${subs.join('')}</span>` : ''}</div>
    <button class="qmain" onclick="sfx('tap');${g.act}"><span class="qrow"><span class="qtx"><b>${g.text}</b><small>${g.sub}</small></span><span class="qgo">▶</span></span></button>
  </div>`;
}
function homeTips() {
  const tips = [], learned = learnedStages();
  if (learned.length && !drilledToday()) tips.push(['goldio', `ギルドの修行場で「今日の修行」をしよう。作戦会議をしたステージから${DRILL_N}問のおさらいだ。毎日続けると連続記録がのびるぞ`, ['修行場へ', "go('guild')"]]);
  const ng = nigateIds().length;
  if (has('scout') && ng) tips.push(['scout', `まちがえた問題が${ng}問あるよ。「にがて克服」でやっつけちゃおう！`, ['にがて克服', "startDrill('nigate')"]]);
  // バトルに勝ったのに、書くミッションなどが残っているステージ（修行のミッションは上の修行の案内で足りる）
  const left = CHAPTERS.find(c => won(c.no) && !(S.ch[c.no] || {}).clear && !['none', 'drill', 'days'].includes(c.mission.type) && missionProgress(c.mission, c.no).cur < missionProgress(c.mission, c.no).n);
  if (left) tips.push([left.guide, `${left.place}のミッションが残っているよ。「${left.mission.text}」`, [MISSION_BTN[left.mission.type], `missionDo(${left.no})`]]);
  const un = unreadLetters();
  if (un.length) { const c = CH(un[0]); tips.push([c.guide, `${c.place}から手紙が届いているよ。大事なポイントをまとめておいたからね`, ['郵便へ', "go('post')"]]); }
  // 今日のおさらい：お話を聞いたステージのポイントから、日付ごとに1つ選ぶ
  const pts = learned.flatMap(c => c.points.map(t => [c, t]));
  if (pts.length) {
    const [c, t] = pts[+ymd().replace(/-/g, '') % pts.length];
    tips.push([c.guide, `今日のおさらい（${stageName(c.no)} ${c.title}）<br><b style="color:var(--ink);font-size:15px">${t}</b>`]);
  }
  if (!tips.length) {
    const g = nextGoal();
    tips.push(['mage', `${g.text.replace('<br>', '')}！${g.sub}`, ['冒険に出る', g.act]]);
  }
  return tips.slice(0, 3);
}
function viewHome() {
  const L = levelInfo(), g = nextGoal();
  const marks = { guild: learnedStages().length > 0 && !drilledToday(), post: unreadLetters().length > 0, gate: !!nextNode() };
  const pals = S.companions.map((id, i) => {
    const [x, y] = PAL_POS[i % PAL_POS.length];
    return `<img class="tpal" style="left:${x}%;top:${y}%;animation-delay:${i * .25}s" src="${COMPANIONS[id].img}" alt="">`;
  }).join('');
  return `<div class="town">
      <img class="townimg" src="img/town.webp" alt="拠点の町">
      ${TOWN_SPOTS.map(t => `<button class="spot" style="left:${t.box[0]}%;top:${t.box[1]}%;width:${t.box[2]}%;height:${t.box[3]}%" onclick="enter('${t.id}')" aria-label="${t.name}"></button>`).join('')}
      ${pals}
      <img class="thero" src="${heroImg(L.lv)}" alt="${esc(S.name)}" onclick="go('record')">
      ${TOWN_SPOTS.map(t => `<div class="sign ${g.spot === t.id ? 'target' : ''}" style="left:${t.label[0]}%;top:${t.label[1]}%">${t.name}${marks[t.id] && g.spot !== t.id ? '<i>!</i>' : ''}<small>${t.sub}</small></div>`).join('')}
      ${homeGuide()}
    </div>
    ${drillBar()}
    <div class="pad"><div class="stack">${homeTips().map(([w, t, b]) => sayHTML(w, t, b)).join('')}</div></div>`;
}
function drillBar() {
  const learned = learnedStages().length, done = drilledToday();
  return `<div class="today"><div class="tnum"><span>今日の修行</span><b>${done ? 'クリア' : 'まだ'}</b></div>
    <div class="tnum"><span>修行した日</span><b>${S.drill.days.length}日</b></div>
    ${learned ? `<button class="btn sm" onclick="go('guild')">${done ? 'もっと修行する' : '今日の修行へ'}</button>`
      : `<button class="btn sm" onclick="enter('gate')">まずは冒険へ</button>`}</div>`;
}

// ---------- ギルドの修行場 ----------
function viewGuild() {
  const learned = learnedStages(), done = drilledToday(), ng = nigateIds();
  const boost = has('yell') && streakNow() >= 3;
  const all = accOf([...new Set(learned.flatMap(stageQs))]);
  // まちがえた問題があるときは「にがて克服」をいちばん上に大きく出す
  const nigMain = has('scout') && ng.length > 0;
  const today = `<div class="${nigMain ? 'card' : 'win'}"><h3>🏋️ 今日の修行</h3>
      <p class="muted" style="margin:0 0 8px">作戦会議をしたステージから${DRILL_N}問。にがて問題もまざって出るよ</p>
      <div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:10px"><span class="badge">${done ? '✅ 今日はクリア' : '⬜ 今日はまだ'}</span><span class="badge">🔥 ${streakNow()}日連続</span>${boost ? '<span class="badge">エールンの応援 経験値2倍</span>' : ''}</div>
      <button class="btn w" ${learned.length ? '' : 'disabled'} onclick="startDrill('daily')">${done ? 'もう一度修行する' : '修行をはじめる'}　＋${XP.drill}×正解${done ? '' : `＋${XP.drillDay}`}</button>
      ${learned.length ? '' : '<p class="muted" style="margin:8px 0 0">冒険で作戦会議をすると、修行ができるようになります</p>'}
    </div>`;
  const nig = `<div class="${nigMain ? 'win' : 'card'}"><h3>💥 にがて克服</h3>
      ${has('scout') ? (ng.length ? `<p style="margin:0 0 8px">まちがえた問題が <b>${ng.length}問</b> あります。正解すると「にがて」から消えます</p>
        <button class="btn w grn" onclick="startDrill('nigate')">にがてに挑む　1問＋${XP.nigate}</button>`
        : '<p class="muted" style="margin:0">にがて問題はありません。バトルや修行でまちがえると、ここに集まります</p>')
      : sayHTML('scout', 'ステージ2で仲間になったら、まちがえた問題を集めて「にがて克服」を作ってあげるよ')}
    </div>`;
  return subHead('ギルドの修行場', 'guild') + `<div class="pad">
    ${nigMain ? nig + today : today + nig}
    <div class="card"><h3>📚 ステージを選んでおさらい</h3>
      ${learned.length ? learned.map(c => {
        const a = accOf(stageQs(c));
        return `<button class="srow" onclick="startDrill('stage',${c.no})"><span class="sno">${shortNo(c)}</span><b>${c.title}</b><small>${a.pct == null ? 'まだ' : '正解率' + a.pct + '%'}</small></button>`;
      }).join('') : '<p class="muted" style="margin:0">作戦会議をしたステージがここに並びます</p>'}
    </div>
    <div class="card"><h3>修行の記録</h3>
      <div class="grid2" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat"><b>${S.drill.ok}</b><span>修行の正解</span></div>
        <div class="stat"><b>${S.drill.days.length}</b><span>修行の日数</span></div>
        <div class="stat"><b>${all.pct == null ? '-' : all.pct + '%'}</b><span>正解率</span></div>
      </div></div>
  </div>`;
}

// 修行の問題をえらぶ
function drillPool(mode, no) {
  if (mode === 'stage') return shuffle(stageQs(CH(no))).slice(0, DRILL_N);
  if (mode === 'nigate') return shuffle(nigateIds().map(id => QBANK[id])).slice(0, DRILL_N);
  const all = [...new Set(learnedStages().flatMap(stageQs))];
  const ng = shuffle(all.filter(q => S.qs[q.id] && S.qs[q.id].m)).slice(0, 2);
  return shuffle(ng.concat(shuffle(all.filter(q => !ng.includes(q))).slice(0, DRILL_N - ng.length)));
}
let D = null;
const DRILL_TITLE = { daily: '今日の修行', nigate: 'にがて克服', stage: 'おさらい' };
function startDrill(mode, no) {
  if (mode === 'nigate' && !nigateIds().length) { toast('にがて問題はありません'); return; }
  const qs = drillPool(mode, no);
  if (!qs.length) { toast('まずは冒険で作戦会議をしよう'); return; }
  D = { mode, no, qs, i: 0, ok: 0, res: [] };
  const sc = $('#scene');
  sc.className = 'scene show battle drill';
  sc.onclick = null;
  playBgm('map');
  renderDrill();
}
// 修行を始めた画面の名前（終わったらそこへ戻る）
function backName() { return { guild: '修行場', post: '郵便', inn: '宿屋', record: '宿屋', map: '地図', shop: '道具屋' }[TAB] || '町'; }
function drillTeacher(q) { return q.hard ? 'goldio' : CH(q.no).guide; }
function renderDrill() {
  const q = D.qs[D.i], who = COMPANIONS[drillTeacher(q)];
  D.order = shuffle(q.a.map((_, i) => i)); D.done = false;
  const from = q.hard ? `${partLabel(q.part)}の難問` : `${stageName(q.no)} ${CH(q.no).title}`;
  const title = DRILL_TITLE[D.mode] + (D.mode === 'stage' ? `　${CH(D.no).title}` : '');
  $('#scene').innerHTML = sceneHead(title) + `
    <div class="arena" id="arena"><div class="placebg2 drillbg"></div>
      <div class="dprog">${D.qs.map((_, i) => `<i class="${i < D.res.length ? (D.res[i] ? 'ok' : 'ng') : i === D.i ? 'now' : ''}">${i < D.res.length ? (D.res[i] ? '○' : '✕') : i + 1}</i>`).join('')}</div>
      <img class="trainer" src="${who.img}" alt="">
      <div class="dfrom">${from}</div>
    </div>
    ${bwinHTML(`<div class="q">${q.hard ? '<span class="hardtag">難問</span>' : ''}${esc(q.q)}</div>
      ${D.order.map(k => `<button class="ans" data-k="${k}" onclick="drillAnswer(${k})">${esc(q.a[k])}</button>`).join('')}`)}`;
  moreSoon();
}
function drillAnswer(k) {
  if (!D || D.done) return;
  D.done = true;
  const q = D.qs[D.i], ok = k === 0;
  document.querySelectorAll('.bwin .ans').forEach(b => {
    b.disabled = true;
    if (+b.dataset.k === 0) b.classList.add('ok'); else if (+b.dataset.k === k) b.classList.add('ng');
  });
  track(q, ok);
  D.res.push(ok);
  let extra = '';
  if (ok) {
    D.ok++; sfx('correct');
    if (D.mode === 'nigate' && S.qs[q.id]) { delete S.qs[q.id].m; S.drill.nig = (S.drill.nig || 0) + 1; extra = '<div class="ok-t">にがてを1つ克服した！</div>'; }
  } else sfx('wrong');
  save();
  const last = D.i >= D.qs.length - 1;
  appendMsg(`<div class="${ok ? 'ok-t' : 'ng-t'}" style="margin-top:8px">${ok ? 'せいかい！' : `ざんねん　こたえは「${esc(q.a[0])}」`}</div><div class="ex">${esc(q.e)}</div>${extra}
    <button class="btn w go" onclick="${last ? 'drillEnd()' : 'D.i++;renderDrill()'}">${last ? '結果を見る' : 'つぎへ'}</button>`);
}
function drillEnd() {
  const n = D.qs.length, ok = D.ok, today = ymd();
  const first = !S.drill.days.includes(today);
  const boost = has('yell') && streakNow() >= 3;
  if (first) S.drill.days.push(today);
  S.drill.ok += ok;
  let xp = ok * (D.mode === 'nigate' ? XP.nigate : XP.drill) + (first ? XP.drillDay : 0);
  if (boost) xp *= 2;
  const perfect = ok === n;
  sfx(perfect ? 'perfect' : 'xp');
  bmsg(`<div class="dres"><div class="dbig">${n}問中 ${ok}問 正解</div>
      <div class="wstars">${'●'.repeat(ok)}<span>${'●'.repeat(n - ok)}</span></div>
      <div class="ex">${perfect ? 'パーフェクト！この調子！' : ok >= n - 1 ? 'おしい！あと少し' : 'まちがえた問題は「にがて」に集まるよ'}</div>
      ${first ? `<div class="ok-t">今日の修行クリア！ ＋${XP.drillDay}</div>` : ''}
      ${boost ? '<div class="ok-t">エールンの応援で経験値2倍！</div>' : ''}
      <div class="ok-t">けいけんち ＋${xp}</div></div>
    <div class="grid2 go" style="margin-top:10px"><button class="btn sub" onclick="startDrill('${D.mode}'${D.no ? ',' + D.no : ''})">もう一度</button><button class="btn" onclick="closeScene()">${backName()}へもどる</button></div>`);
  if (xp) gain('drill', xp, `${DRILL_TITLE[D.mode]}　${ok}/${n}問正解`);
  checkClears(); save();
}

// ---------- 郵便（仲間の手紙） ----------
function viewPost() {
  const list = CHAPTERS.filter(c => won(c.no)).reverse();
  return subHead('郵便', 'post') + `<div class="pad">
    ${sayHTML('heartn', 'バトルに勝つと、そのステージの先生から手紙が届きます。大事なポイントをいつでも読み返せますよ')}
    ${list.length ? list.map(c => {
      const g = COMPANIONS[c.guide], rd = S.lread[c.no];
      return `<button class="lrow ${rd ? '' : 'new'}" onclick="readLetter(${c.no})"><img src="${g.img}" alt=""><span><b>${c.place}からの手紙</b><small>${stageName(c.no)}「${c.title}」　${g.name}より</small></span>${rd ? '' : '<i>NEW</i>'}</button>`;
    }).join('') : '<p class="muted">まだ手紙はありません。冒険でバトルに勝つと届くよ</p>'}
  </div>`;
}
function readLetter(no) {
  const c = CH(no), g = COMPANIONS[c.guide];
  sfx('tap');
  modal(`<div class="letter">
      <div class="lhead"><img src="${g.img}" alt=""><span>${esc(S.name)}へ</span></div>
      <p style="margin:6px 0">${c.place}での冒険、おつかれさま！「${c.title}」の大事なポイントをまとめておくね。</p>
      <div class="lpoint"><b class="lpt">🐾 大事なポイント 🐾</b><ul>${c.points.map(t => `<li><span>${t}</span></li>`).join('')}</ul></div>
      <p class="lsign">${g.name}より</p></div>
    <div class="grid2"><button class="btn sub" onclick="closeModal()">とじる</button>
    <button class="btn grn" onclick="closeModal();startDrill('stage',${no})">おさらい${DRILL_N}問</button></div>`);
  if (!S.lread[no]) { S.lread[no] = 1; gain('letter', XP.letter, `${c.place}からの手紙を読んだ`); render(); }
}

// ---------- 地図 ----------
// 地図は章ごとに1枚。上のタブで章を切りかえる
let MAP_PART = null;
function viewMap() {
  const nx = nextNode();
  const p = MAP_PART && partOpen(MAP_PART) ? MAP_PART : nx ? partOf(nx) : PARTS.length;
  const part = PARTS[p - 1], stages = partStages(p);
  const lit = stages.filter(c => won(c.no)).map(c => MAP_POS[c.no]);
  if (p === 1 && S.boss) lit.push(MAP_POS.boss);
  const mask = lit.map(([x, y]) => `radial-gradient(ellipse 26% 14% at ${x}% ${y}%,#000 50%,transparent 100%)`).join(',');
  // 章を全部クリアしたら、地図のすみまで明るくする
  const full = partDone(p);
  const nodes = stages.map(ch => ({ key: ch.no, name: ch.place, open: unlocked(ch.no), st: S.ch[ch.no] || {}, big: ch.enemy.big, final: ch.final }));
  if (p === 1) nodes.push({ key: 'boss', name: FINAL_BOSS.place, open: unlocked('boss'), st: { win: S.boss, clear: S.boss }, boss: true });
  const glow = S.justLit; S.justLit = null; save();
  const tabs = `<div class="seg ptabs">${PARTS.map(pp => { const o = partOpen(pp.no), c2 = pp.no === 2 && canOpen2();
    return `<button class="${pp.no === p ? 'on' : ''}" onclick="${o ? `MAP_PART=${pp.no};render()` : c2 ? 'askOpen2()' : `toast('${partLabel(pp.no - 1)}を終えると行けるよ')`}">${o ? '' : c2 ? '🔓' : '🔒'}${pp.no === 4 ? '最終章' : pp.no === 5 ? '金融基礎' : `第${pp.no}章`}<small>${o ? pp.title : c2 ? '押すと開ける' : '？？？'}</small></button>`; }).join('')}</div>`;
  return subHead('冒険の地図') + `<div class="pad" style="padding-bottom:0">${tabs}</div><div class="worldmap ${p === 4 ? 'final' : ''}">
      <img class="base" src="${part.map}" alt="${part.title}の地図">
      ${full && !FX ? '' : '<div class="fog"></div><div class="fog f2"></div>'}
      ${lit.length && !(full && !FX) ? `<img class="lit" src="${part.map}" alt="" style="-webkit-mask-image:${mask};mask-image:${mask}">` : ''}
      ${full ? `<img class="lit all" src="${part.map}" alt="">` : ''}
      ${nodes.map(n => {
        const [x, y] = MAP_POS[n.key];
        const cls = n.st.win ? 'won' : n.open ? 'open' : 'lock';
        const sc = S.stars[n.key] || 0;
        return `<button class="pin ${cls} ${n.boss || n.big ? 'boss' : ''} ${glow === n.key ? 'glow' : ''}" style="left:${x}%;top:${y}%" onclick="${n.open ? `openChapter(${n.boss ? "'boss'" : n.key})` : "toast('前の町のあかりを取り戻すと進めるよ')"}">
          ${n.key === nx ? `<img class="me ${y < 16 ? 'side' : ''}" src="${heroImg()}" alt="">` : ''}
          <span class="dot">${n.boss ? '塔' : n.final ? '終' : stageNo(n.key)}${n.st.clear && !n.boss ? '<b class="star">⭐</b>' : ''}</span>
          <span class="tag">${n.open || n.st.win ? n.name : '？？？'}${sc ? `<small class="pst">${starText(sc)}</small>` : ''}</span></button>`;
      }).join('')}
    </div>
    <div class="pad"><p class="muted" style="margin:0">${p === 4 ? '総まとめ編' : `${partLabel(p)} ${part.title}`}　あかりが戻った町 ${stages.filter(c => won(c.no)).length} / ${stages.length}　　⭐はミッションまでクリア　★はバトルの最高記録</p></div>`;
}

// 敵のレベル：第1章は並び順の1〜10と塔の11、第2章は11〜17、第3章は18〜22、総まとめ編は30、金融基礎知識編は4〜10
function enemyLv(no) {
  if (no === 'boss') return 11;
  const p = partOf(no);
  return p === 1 ? stageNo(no) : p === 2 ? 10 + stageNo(no) : p === 3 ? 17 + stageNo(no) : p === 5 ? 3 + stageNo(no) : 30;
}
function power(no) {
  const lv = enemyLv(no), n = Math.min(5, Math.ceil(lv / 4.4)), pw = ENEMY_POWER[no];
  const hard = (no === 'boss' ? FINAL_BOSS.hard : CH(no).hard) || [];
  const warn = [pw.time ? `⏱ 1問${pw.time}秒` : '', hard.length ? '4択の難問' : '', pw.rage ? '本気モード' : ''].filter(Boolean);
  return `<div class="muted" style="margin:2px 0 6px">敵の強さ <span style="color:#c8483c;letter-spacing:1px">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>　Lv${lv}</div>
    ${warn.length ? `<div class="danger">${warn.join('・')}</div>` : ''}`;
}
function openChapter(no) {
  sfx('tap');
  const best = S.stars[no] || 0;
  const bestLine = best ? `<p class="center bestst">最高記録 <span>${starText(best)}</span></p>` : '';
  if (no === 'boss') {
    modal(`<div class="center"><span class="label">第1章 最後の決戦</span><h3>${FINAL_BOSS.place}</h3>
      <img class="bigimg" src="${FINAL_BOSS.img}" alt=""><p style="margin:0">${FINAL_BOSS.name}</p>${power('boss')}</div>
      <p class="muted">第1章のすべてのステージと難問から出題。仲間が多いほどハートが増えるよ（今 ${3 + Math.min(S.companions.length, 3)}）</p>
      ${bestLine}${S.boss ? '<p class="center">⭐ たおした</p>' : ''}
      <button class="btn w" onclick="closeModal();startBattle('boss')">${S.boss ? 'もう一度たたかう' : 'たたかう'}</button>
      <button class="btn sub w" style="margin-top:10px" onclick="closeModal()">とじる</button>`);
    return;
  }
  const ch = CH(no), st = S.ch[no] || {}, m = ch.mission, p = missionProgress(m, no);
  const done = p.cur >= p.n, canFight = st.lesson || DEMO;
  const reward = rewardText(ch);
  const step = (ok, n, t) => `<div class="row" style="margin:6px 0"><span style="width:26px">${ok ? '✅' : '⬜'}</span><span>${n}　${t}</span></div>`;
  const prog = m.type === 'star' ? `<div class="muted" style="margin-left:32px">いまの最高記録 ${starText(best)}</div>`
    : p.n > 1 ? `<div class="bar" style="margin:4px 0 2px 32px;border-color:var(--ink)"><i style="width:${Math.min(100, p.cur / p.n * 100)}%"></i></div>
      <div class="muted" style="margin-left:32px">${Math.min(p.cur, p.n)} / ${p.n}</div>` : '';
  // ミッションは作戦会議とバトルのあと（先に押せると順番が分かりにくいため）
  const showMission = !done && m.type !== 'none' && (st.win || DEMO);
  modal(`<div class="center"><span class="label">${stageName(no)}</span><h3>${ch.place}　${ch.title}</h3>
      ${ch.about ? `<p class="about">${ch.about}</p>` : ''}
      <img class="${ch.final ? 'evil' : ''}" src="${ch.enemy.img}" alt="" style="width:${ch.enemy.big ? 130 : 96}px"><p style="margin:0">${ch.enemy.name}</p>${power(no)}</div>
    ${step(st.lesson, '①', '作戦会議（図で学ぶ）')}
    ${step(st.win, '②', 'クイズバトル')}
    ${m.type === 'none' ? '' : `${step(done, '③', `ミッション　${m.text}${st.win || done ? '' : '<small class="after">バトルに勝つとできるよ</small>'}`)}${prog}`}
    <p class="muted">クリアのごほうび：${reward}　＋${XP.chapterClear}</p>
    ${bestLine}
    ${st.lesson ? `<div class="points"><b>${ch.title}のポイント</b><ul>${ch.points.map(t => `<li>${t}</li>`).join('')}</ul></div>` : ''}
    ${st.clear ? '<p class="center">⭐ このステージはクリアずみ</p>' : ''}
    <div class="stack">
      <button class="btn w ${st.lesson ? 'sub' : ''}" onclick="closeModal();startLesson(${no})">${st.lesson ? 'もう一度作戦会議' : '作戦会議をする'}</button>
      <button class="btn w ${st.win || !st.lesson ? 'sub' : ''}" ${canFight ? '' : 'disabled'} onclick="closeModal();startBattle(${no})">${st.win ? 'もう一度たたかう' : st.lesson ? 'バトルへ' : DEMO ? 'バトルへ（デモ版）' : 'バトルへ（作戦会議のあと）'}</button>
      ${showMission ? `<button class="btn w grn" onclick="missionDo(${no})">${MISSION_BTN[m.type]}</button>` : ''}
      <button class="btn sub w" onclick="closeModal()">とじる</button>
    </div>`);
}

// ---------- 宿屋（仲間・冒険の記録） ----------
const INN_TABS = [['inn', '仲間'], ['record', '冒険の記録']];
function viewParty() {
  const lv = levelInfo().lv;
  return subHead('宿屋', 'inn') + `<div class="pad">${segTabs(INN_TABS, 'inn')}
    <div class="card"><span class="label">${esc(S.name)}（${BREEDS.find(b => b.id === S.breed).name}）</span>
      <div class="stages">${STAGES.map(([l, n], i) => `<div class="${lv >= l ? '' : 'off'}"><img src="img/hero_${S.breed}_${i + 1}.webp" alt=""><br>${n}<br><span class="muted">Lv${l}〜</span></div>`).join('')}</div>
    </div>
    <div class="card"><h3>称号</h3>
      ${PARTS.map(pp => S.shogo && S.shogo[pp.no] ? `<div class="shogo"><b>${pp.shogo}</b><span class="muted">${partLabel(pp.no)}クリア</span><button class="btn sm" onclick="showCert(${pp.no})">賞状を見る</button></div>`
        : `<div class="shogo off"><b>？？？</b><span class="muted">${partLabel(pp.no)}をクリアするともらえる</span></div>`).join('')}
    </div>
    <div class="grid2">${Object.entries(COMPANIONS).map(([id, c]) => {
      const on = has(id);
      return `<div class="card pal ${on ? '' : 'no'}"><img src="${c.img}" alt="">
        <div class="nm">${on ? c.name : '？？？'}</div><div class="muted">${on ? c.role : `ステージ${stageNo(c.from)}で仲間に`}</div>
        ${on ? `<div class="ef">${c.effect}</div><div class="ef sp">必殺技　${SPECIALS[id].name}（${SPECIALS[id].role}）<br>${SPECIALS[id].desc}</div>` : ''}</div>`;
    }).join('')}</div>
    <div class="card"><h3>バッジ</h3><p class="muted" style="margin:0 0 8px">ステージや章をクリアした記念のしるしです</p>
      ${S.badges.length ? S.badges.map(b => `<div class="bdg"><span class="badge">🏅${b}</span><small>${badgeFrom(b)}</small></div>`).join('') : '<p class="muted">ステージをクリアすると手に入るよ</p>'}</div>
    <p class="muted">バトルでは仲間1匹ごとにハートが1つ増えます（最大＋3）。正解を${SPECIAL_NEED}回すると必殺技が使えます。必殺技は1人1回ずつで、全員が使い終わるとまた全員の技が使えます。${esc(S.name)}の必殺技は「${SPECIALS.hero.name}」</p>
  </div>`;
}

// ---------- 道具屋 ----------
function viewShop() {
  const n = Object.keys(S.guide.quiz).length;
  const mm = COMPANIONS.memory;
  return subHead('道具屋', 'shop') + `<div class="pad">
    <div class="card memo"><div class="person"><img src="${mm.img}" alt="">
      <div class="body"><div class="pname">メモリー<span class="muted">　道具屋の案内係</span></div>
      <div class="muted" style="line-height:1.5">記録と分析が得意なサポーター。ビジネスガイドの使い方を教えてくれる。ステージ${stageNo(9)}で旅の仲間になる</div></div></div>
      <div class="grid2" style="margin-top:10px"><button class="btn sm ${S.guideTalk ? 'sub' : 'grn'}" onclick="guideMap()">🗺️ ガイドの地図${S.guideTalk ? '' : '<br>＋' + XP.guideTalk}</button>
      <button class="btn sm sub" onclick="memoryTalk()">自己紹介を聞く</button></div></div>
    <a class="btn w" href="${GUIDE_URL}" target="_blank" rel="noopener" style="text-decoration:none;margin-bottom:16px" onclick="markBack()">📘 ビジネスガイドを開く</a>
    <p class="muted">クリア ${n} / ${GUIDE_QUESTS.length}</p>
    ${GUIDE_QUESTS.map(g => {
      const op = S.guide.open[g.id], ok = S.guide.quiz[g.id];
      return `<div class="card quest"><div class="head"><div class="ico">${g.icon}</div><div>${g.name}</div>${ok ? '<span class="stamp">クリア</span>' : ''}</div>
        <div class="where">ガイドの場所：${secNo(g.sec)}${g.where}</div>
        <p style="margin:6px 0 10px;font-size:14px">${g.what}</p>
        <div class="grid2"><a class="btn sm ${op ? 'sub' : ''}" href="${g.url}" target="_blank" rel="noopener" style="text-decoration:none" onclick="openTool('${g.id}')">開いてみる${op ? '' : '　＋' + XP.guideOpen}</a>
        <button class="btn sm ${ok ? 'sub' : 'grn'}" onclick="guideQuiz('${g.id}')">${ok ? 'クイズ（正解ずみ）' : 'クイズ　＋' + XP.guideQuiz}</button></div></div>`;
    }).join('')}
  </div>`;
}
// 道具屋のメモリー：自己紹介とガイドの使い方を、お話の場面で
let TK = null;
const SHOP_BG = '<div class="placebg2" style="background:url(img/town.webp) no-repeat 0% 33%/213% auto"></div>';
function startTalk(title, who, lines, onEnd) {
  TK = { title, who, lines, onEnd, i: 0 };
  $('#scene').className = 'scene show lesson';
  renderTalk();
}
function renderTalk() {
  const sc = $('#scene'), c = COMPANIONS[TK.who];
  const dots = `<div class="dots">${TK.lines.map((_, i) => `<i class="${i <= TK.i ? 'on' : ''}"></i>`).join('')}</div>`;
  const head = sceneHead(TK.title).replace('<button class="x"', `${TK.i > 0 ? '<button class="x" onclick="event.stopPropagation();talkBack()">◀ もどる</button>' : ''}<button class="x"`) + dots;
  sc.innerHTML = head + `<div class="stagebg">${SHOP_BG}<div class="sign">道具屋</div><img class="speaker" src="${c.img}" alt=""></div>
    <div class="win talk"><div class="who">${c.name}</div><div class="txt" id="ltxt"></div><div class="tri">▼</div></div>`;
  typeText($('#ltxt'), TK.lines[TK.i].replace('{name}', S.name));
  sc.onclick = talkTap;
}
function talkBack() { typeFinish(); if (TK && TK.i > 0) { TK.i--; renderTalk(); } }
function talkTap() {
  if (TY.on) { typeFinish(); return; }
  TK.i++;
  if (TK.i < TK.lines.length) { renderTalk(); return; }
  const f = TK.onEnd; TK = null; closeScene(); if (f) f();
}
function memoryTalk() { sfx('tap'); startTalk('メモリーの自己紹介', 'memory', MEMORY_INTRO); }
// ガイドの地図：ビジネスガイドの並びを、スマホの画面の形で見せる
function guideMap() {
  sfx('tap');
  modal(`<h3>ガイドの地図</h3>
    ${sayHTML('memory', 'ビジネスガイドを開くと、上からこの順に並んでいます')}
    <div class="gphone"><div class="gtop">ビジネスガイド</div>
      ${GUIDE_MAP.map((g, i) => `<div class="gsec"><b class="gn">${i + 1}</b><span class="gi">${g.icon}</span><span class="gt"><b>${g.name}</b><small>${g.when}</small></span></div>`).join('')}
    </div>
    <p class="muted" style="margin:10px 0">まよったら、1の「案件まるわかりガイド」と7の「勉強用資料」から</p>
    <button class="btn w" onclick="closeModal()">とじる</button>`);
  if (!S.guideTalk) { S.guideTalk = true; gain('guideTalk', XP.guideTalk, 'ガイドの地図を見た'); afterChange(); }
}
// ガイドを開いてから戻ると、スマホによってはページが読みこみ直されて町に戻ってしまう
// そこで開く前に今の画面を覚えておき、読みこみ直されたらその画面（道具屋）に戻す
function markBack() { S.back = { tab: TAB, y: Math.round(window.scrollY), t: Date.now() }; save(); }
// クエストに出す「ガイドの場所」に、地図の番号をつける
function secNo(id) { const i = GUIDE_MAP.findIndex(g => g.id === id); return i >= 0 ? `<b class="gn sm">${i + 1}</b>` : ''; }

function openTool(id) {
  // リンク先を開くのはaタグにまかせ、記録は少しあとで（先に画面を描き直すとリンクが開かないため）
  const g = GUIDE_QUESTS.find(x => x.id === id);
  markBack();
  setTimeout(() => {
    if (!S.guide.open[id]) { S.guide.open[id] = true; gain('guideOpen', XP.guideOpen, `${g.name}を開いた`); }
    afterChange();
  }, 60);
}
function guideQuiz(id) {
  const g = GUIDE_QUESTS.find(x => x.id === id);
  const order = shuffle([0, 1, 2]);
  modal(`<span class="label g">${g.name}</span><h3>${g.q}</h3>
    ${order.map(k => `<button class="btn choice" onclick="answerGuide('${id}',${k})">${g.a[k]}</button>`).join('')}
    <button class="btn sub w" style="margin-top:14px" onclick="closeModal()">とじる</button>`);
}
function answerGuide(id, k) {
  const g = GUIDE_QUESTS.find(x => x.id === id);
  closeModal();
  if (k === 0) {
    if (S.guide.quiz[id]) sfx('correct');
    if (!S.guide.quiz[id]) { S.guide.quiz[id] = true; gain('guideQuiz', XP.guideQuiz, `${g.name}クイズ正解`); }
    else toast('せいかい');
    afterChange();
  } else {
    sfx('wrong');
    modal(`<h3>ざんねん</h3><p>こたえは「${g.a[0]}」</p><p class="muted">${g.what}</p>
      <button class="btn w" onclick="closeModal();guideQuiz('${id}')">もう一度</button>`);
  }
}

// ---------- 冒険の記録 ----------
function viewRecord() {
  const g = S.goals;
  const stat = (n, l) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`;
  const all = accOf(Object.keys(S.qs).map(id => QBANK[id]).filter(Boolean));
  const wins = CHAPTERS.filter(c => won(c.no)).length + (S.boss ? 1 : 0);
  const star3 = Object.values(S.stars).filter(v => v >= 3).length;
  return subHead('宿屋', 'inn') + `<div class="pad">${segTabs(INN_TABS, 'record')}
    <div class="card"><h3>これまでの記録</h3>
      <div class="grid2" style="grid-template-columns:repeat(3,1fr)">
        ${stat(wins, '勝った数')}${stat(star3, '★3の数')}${stat(all.pct == null ? '-' : all.pct + '%', '正解率')}
        ${stat(S.drill.ok, '修行の正解')}${stat(S.drill.days.length, '修行の日数')}${stat(nigateIds().length, 'にがて')}
      </div><p class="muted" style="margin:8px 0 0">経験値の合計 ${S.xp}　答えた問題 ${all.all}問</p></div>
    ${has('memory') ? analysisCard() : `<div class="card">${sayHTML('memory', `ステージ${stageNo(9)}で仲間になったら、ステージごとの正解率を分析して、苦手なところを教えてあげます`)}</div>`}
    <div class="card"><h3>目標</h3>
      ${g ? `<p style="margin:0"><span class="chip">長期</span> ${esc(g.long)}<br><span class="muted">期限 ${esc(g.longD)}</span></p>
        <p><span class="chip">短期</span> ${esc(g.short)}<br><span class="muted">期限 ${esc(g.shortD)}</span></p>` : '<p class="muted">まだ書いていません</p>'}
      <button class="btn sm sub" onclick="openGoals()">${g ? '書き直す' : '書く'}</button></div>
    <div class="card"><h3>アポの一言</h3><p style="margin:0 0 8px">${S.apo ? esc(S.apo) : `<span class="muted">ステージ${stageNo(10)}で書きます</span>`}</p>
      <button class="btn sm sub" onclick="openText('apo')">書く</button></div>
    <div class="card"><h3>T-UPの一言</h3><p style="margin:0 0 8px">${S.tup ? esc(S.tup) : `<span class="muted">ステージ${stageNo(5)}で書きます</span>`}</p>
      <button class="btn sm sub" onclick="openText('tup')">書く</button></div>
    <div class="card"><h3>なぜ自分が始めたのか</h3><p style="margin:0 0 8px">${S.why ? esc(S.why) : `<span class="muted">ステージ${stageNo(6)}で書きます</span>`}</p>
      <button class="btn sm sub" onclick="openText('why')">書く</button></div>
    <div class="card"><h3>最近の記録</h3>
      ${S.log.slice(0, 30).map(l => `<div class="log"><span>${mdLabel(l.d)}　${esc(l.label)}</span><b>＋${l.xp}</b></div>`).join('') || '<p class="muted">まだありません</p>'}</div>
    ${TAIKAI ? `<div class="card"><h3>大会モード</h3><p style="margin:0 0 8px;font-size:14px">いまは大会用の記録で遊んでいます。ふだんの記録は消えずに残っています</p>
      <button class="btn sm sub" onclick="leaveTaikai()">ふだんの記録にもどる</button></div>` : ''}
    ${DEMO ? `<div class="card"><h3>デモ版</h3><p style="margin:0 0 8px;font-size:14px">いまはデモ版です。まだ行けない章やステージも見られます</p>
      <button class="btn sm sub" onclick="setDemo(false);toast('デモ版オフ');render()">デモ版をやめる</button></div>` : ''}
    <div class="card"><h3>記録の残しかた</h3>
      ${PASS_HOST ? (CLOUD && CLOUD.kind === 'pass' ? `<p style="margin:0 0 6px;font-size:14px">☁️ 名前「<b>${esc(CLOUD.name)}</b>」と合言葉で記録を残しています。ほかのスマホやアプリで開いたときは、はじめの画面の「名前と合言葉で続きから」で入ってね</p>
      <button class="btn sm sub" onclick="toast('合言葉は ${passGet() ? passGet().pin : ''} です')">合言葉を見る</button></div>`
      : `<p style="margin:0 0 6px;font-size:14px">いまは記録がこのスマホの中だけにあります。名前と合言葉を決めると、ほかのスマホやアプリからも続きから遊べます</p>
      <button class="btn sm grn" onclick="passSetup()">合言葉を決める</button></div>`) : `
      <div style="background:#fff3d6;border-radius:8px;padding:8px 10px;margin:0 0 10px"><p style="margin:0 0 6px;font-size:14px">🏠 ゲームは新しい場所に引っ越しました。新しい場所では、名前と合言葉でどのスマホからでも続きから遊べます</p>
      <button class="btn sm grn" onclick="moveOut()">記録ごと新しい場所へ</button></div>
      ${CLOUD ? `<p style="margin:0 0 6px;font-size:14px">☁️ 記録は <b>Claudeのアカウント</b>にも残しています。Claudeにサインインしていれば、スマホのClaudeアプリでもパソコンでも続きから遊べます</p>
      <p class="muted" style="margin:0;font-size:13px">サインインしないで開いたときは、記録はそのスマホの中だけに残ります</p></div>` : `
      <p style="margin:0 0 6px;font-size:14px">記録はこのスマホの中に残ります。${OPENED_IN ? `いまは <b>${OPENED_IN}</b> で開いているので、つぎも <b>${OPENED_IN}</b> から開いてね` : 'つぎも同じ開き方で開いてね（LINEで開いたなら、つぎもLINEから）'}</p>
      <p class="muted" style="margin:0;font-size:13px">最初からになってしまうとき</p>
      <ul style="margin:2px 0 0;padding-left:20px;font-size:14px">
        <li>ほかのスマホやアプリで開いたとき</li>
        <li>シークレットモードで開いたとき</li>
        <li>ブラウザの履歴を消したとき</li>
        <li>1週間以上開かなかったとき</li>
      </ul></div>`}`}
    <div class="card"><h3>設定</h3>
      <div class="stack">
        <button class="btn sub w" onclick="S.sound=!S.sound;save();render()">効果音 ${S.sound ? 'オン' : 'オフ'}</button>
        <button class="btn sub w" onclick="S.music=!musicOn();save();if(!S.music)stopBgm();render()">音楽 ${musicOn() ? 'オン' : 'オフ'}</button>
        <button class="btn sub w" onclick="howTo()">遊び方を見る</button>
        <button class="btn sub w" onclick="startOpening()">物語をもう一度見る</button>
        <button class="btn red w" onclick="resetAll()">はじめからやり直す</button>
      </div></div>
    <p class="muted center ver" onclick="verTap()">わんこビジネスクエスト　研修版</p>
  </div>`;
}
// メモリー：ステージごとの正解率の分析
function analysisCard() {
  const rows = learnedStages().map(c => ({ c, a: accOf(stageQs(c)) })).filter(r => r.a.all >= 3).sort((x, y) => x.a.pct - y.a.pct);
  const weak = rows.filter(r => r.a.pct < 80);
  return `<div class="card">${sayHTML('memory', rows.length ? (weak.length ? `分析しました。いちばん苦手なのは「${weak[0].c.title}」です。おさらいしておきましょう` : 'どのステージも正解率80%以上。すばらしいです！') : 'バトルや修行で問題に答えると、ここで正解率を分析します')}
    ${rows.slice(0, 6).map(r => `<div class="arow"><span>${shortNo(r.c)}　${r.c.title}</span>
      <span class="abar ${r.a.pct < 80 ? 'low' : ''}"><i style="width:${r.a.pct}%"></i></span><b>${r.a.pct}%</b>
      ${r.a.pct < 80 ? `<button class="btn sm sub" onclick="startDrill('stage',${r.c.no})">おさらい</button>` : ''}</div>`).join('')}</div>`;
}
// 記録のいちばん下を5回タップすると、デモ版を切りかえる
let VTAP = 0, VTIMER = null;
function verTap() {
  VTAP++; clearTimeout(VTIMER); VTIMER = setTimeout(() => { VTAP = 0; }, 1500);
  if (VTAP < 5) return;
  VTAP = 0; setDemo(!DEMO);
  toast(DEMO ? 'デモ版オン　すべての章が見られます' : 'デモ版オフ');
  render();
}
function resetAll() {
  modal(`<h3>はじめからやり直しますか？</h3><p>レベル・記録・仲間がすべて消えます。元にはもどせません</p>
    <div class="grid2"><button class="btn sub" onclick="closeModal()">やめる</button>
    <button class="btn red" onclick="try{localStorage.removeItem(KEY)}catch(e){};cloudForget();S=null;TAB='home';closeModal();render()">消す</button></div>`);
}

// ================= お話 =================
let LS = null;
const TY = { on: false, timer: null, el: null, text: '' };
function typeText(el, text) {
  clearInterval(TY.timer);
  TY.on = true; TY.el = el; TY.text = text;
  let i = 0;
  TY.timer = setInterval(() => {
    i++; el.textContent = text.slice(0, i);
    if (i % 3 === 0) sfx('type');
    if (i >= text.length) { clearInterval(TY.timer); TY.on = false; }
  }, 32);
}
function typeFinish() { clearInterval(TY.timer); TY.on = false; if (TY.el) TY.el.textContent = TY.text; }

function startLesson(no) {
  LS = { no, i: 0 };
  $('#scene').className = 'scene show lesson';
  playBgm('town');
  renderLesson();
}
function lessonBack() { typeFinish(); if (LS && LS.i > 0) { LS.i--; renderLesson(); } }
function sceneHead(title) {
  return `<div class="shead"><span class="t">${title}</span><button class="x" onclick="event.stopPropagation();closeScene()">やめる</button></div>`;
}
function renderLesson() {
  const ch = CH(LS.no), pg = ch.lesson[LS.i], sc = $('#scene');
  const dots = `<div class="dots">${ch.lesson.map((_, i) => `<i class="${i <= LS.i ? 'on' : ''}"></i>`).join('')}</div>`;
  const head = sceneHead(`<small>作戦会議</small>${ch.title}`).replace('<button class="x"', `${LS.i > 0 ? '<button class="x" onclick="event.stopPropagation();lessonBack()">◀ もどる</button>' : ''}<button class="x"`) + dots;
  if (pg.chat) {
    sc.innerHTML = head + `<div class="chatbox ${pg.good ? 'good' : ''}"><div class="chat-label">${pg.good ? '良い例' : 'よくない例　' + pg.chat}</div>
      ${pg.lines.map(([w, t]) => `<div class="bub ${w}">${w === 'you' ? '<span class="who">友だち</span>' : ''}<span>${esc(t)}</span>${w === 'me' ? '<span class="who">あなた</span>' : ''}</div>`).join('')}</div>
      <div class="tapnext">タップでつぎへ ▼</div>`;
    TY.on = false;
  } else {
    const c = COMPANIONS[pg.s], fig = pg.f ? figHTML(pg.f, ch) : '';
    sc.innerHTML = head + `<div class="stagebg ${fig ? 'hasfig' : ''}">${placeBg(ch.no, fig ? 'dim' : '')}${fig ? '' : `<div class="sign">${ch.place}</div>`}<img class="speaker" src="${c.img}" alt="">${fig}</div>
      <div class="win talk"><img class="face" src="${c.img}" alt=""><div class="who">${c.name}</div><div class="txt" id="ltxt"></div><div class="tri">▼</div></div>`;
    typeText($('#ltxt'), pg.t);
  }
  sc.onclick = lessonTap;
}
function lessonTap() {
  if (TY.on) { typeFinish(); return; }
  LS.i++;
  if (LS.i >= CH(LS.no).lesson.length) {
    const no = LS.no;
    S.ch[no] = Object.assign({}, S.ch[no], { lesson: true }); save();
    $('#scene').onclick = null;
    startBattle(no);
  } else renderLesson();
}

// ---------- 作戦会議の図解 ----------
// 絵：絵文字、'hero'（主人公）、'enemy'（そのステージの敵）、仲間の名前、画像のパス
function figIcon(x, ch, cls = '') {
  const pic = (src, c2 = '') => `<span class="ic pic ${cls} ${c2}"><img src="${src}" alt=""></span>`;
  if (x === 'hero') return pic(heroImg());
  if (x === 'enemy') return pic(ch.enemy.img, ch.final ? 'evil' : '');
  if (COMPANIONS[x]) return pic(COMPANIONS[x].img);
  if (/^img\//.test(x)) return pic(x);
  return `<span class="ic ${cls} ${/^[0-9０-９%…]+%?$|^…$/.test(x) ? 'num' : ''}">${x}</span>`;
}
const delay = (k, s = .1) => `style="animation-delay:${(k * s).toFixed(2)}s"`;
function figHTML(f, ch) {
  const title = f.title || f.t === 'road' ? `<div class="ft">${f.title || '資産運用の話を契約までつなげる流れ'}</div>` : '';
  const note = f.note ? `<div class="fnote">${f.note}</div>` : '';
  const side = (x, kind) => `<div class="fside ${kind}"><span class="fmark">${kind === 'bad' ? '✕ よくない' : '○ よい'}</span>${figIcon(x[0], ch)}<b>${x[1]}</b>${x[2] ? `<small>${x[2]}</small>` : ''}</div>`;
  const T = {
    big: () => `<div class="fbig ${f.warn ? 'warn' : ''}"><span class="fbi">${figIcon(f.icon, ch, 'xl')}${f.no ? '<i class="fno">✕</i>' : ''}</span><b>${f.text}</b>${f.sub ? `<small>${f.sub}</small>` : ''}</div>`,
    cards: () => `<div class="fcards n${f.items.length}">${f.items.map(([i, t, s], k) => `<div class="fc" ${delay(k)}>${figIcon(i, ch)}<b>${t}</b>${s ? `<small>${s}</small>` : ''}</div>`).join('')}</div>`,
    vs: () => `<div class="fvs">${side(f.bad, 'bad')}${side(f.good, 'good')}</div>`,
    flow: () => {
      const v = f.items.length > 4 || (f.items.length === 4 && f.items.some(x => x[1].length > 5));
      return `<div class="fflow ${v ? 'v' : ''}">${f.items.map(([i, t], k) => `${k ? `<span class="farr">${v ? '▼' : '▶'}</span>` : ''}<div class="fstep" ${delay(k, .14)}>${figIcon(i, ch)}<b>${t}</b></div>`).join('')}</div>`;
    },
    steps: () => `<div class="fsteps">${f.items.map(([i, t, s], k) => `<div class="frow ${(f.hi || []).includes(k) ? 'hi' : f.hi ? 'dim' : ''}"><span class="fn">${k + 1}</span>${figIcon(i, ch, 'sm')}<span class="ftx"><b>${t}</b>${s ? `<small>${s}</small>` : ''}</span></div>`).join('')}</div>`,
    check: () => `<ul class="fcheck">${f.items.map((t, k) => `<li ${delay(k, .08)}>${t}</li>`).join('')}</ul>`,
    ng: () => `<ul class="fng">${f.items.map((t, k) => `<li ${delay(k, .1)}>「${t}」</li>`).join('')}</ul>`,
    tags: () => `<div class="ftags">${f.items.map((t, k) => `<span ${delay(k, .05)}>${t}</span>`).join('')}</div>`,
    chain: () => `<div class="fchain">${f.items.map((t, k) => `${k ? '<i>▶</i>' : ''}<span ${delay(k, .06)}>${t}</span>`).join('')}</div>`,
    bars: () => {
      // 「割」は10割で満タン（いちばん長い棒に合わせると、3割が7割以上に見えてしまう）
      const mx = f.max || (f.unit === '割' ? 10 : Math.max(...f.items.map(x => x[1]), 1));
      return `<div class="fbars">${f.items.map(([l, v, h], k) => `<div class="fbar ${h ? 'hi' : ''}"><span class="fl">${l}</span><span class="ftrack"><i style="width:${Math.max(v / mx * 100, v ? 0 : 2)}%;animation-delay:${k * .12}s"></i></span>${f.nonum ? '' : `<b>${v}${f.unit || ''}</b>`}</div>`).join('')}</div>`;
    },
    stairs: () => `<div class="fstairs">${f.items.map(([i, t], k) => `<div class="fst ${k === f.items.length - 1 ? 'top' : ''}">${figIcon(i, ch)}<span class="fblk" style="--h:${((k + 1) / f.items.length).toFixed(3)};animation-delay:${k * .15}s"><b>${t}</b></span></div>`).join('')}</div>`,
    calc: () => `<div class="fcalc">${f.items.map((t, k) => /^[×−=＋+÷]$/.test(t) ? `<i>${t}</i>` : `<span class="${k === f.items.length - 1 ? 'ans' : ''}" ${delay(k, .12)}>${t}</span>`).join('')}</div>`,
    abc: () => {
      const P = [['A', '🧙', 'アドバイザー', '教える人'], ['B', 'hero', 'ブリッジ', 'つなぐ人'], ['C', '🧑', 'クライアント', '聞く人']];
      return `<div class="fabc">${P.map(([k, i, n, s], j) => `${j ? '<span class="farr">⇄</span>' : ''}<div class="fabc1 ${f.hi === k ? 'hi' : f.hi ? 'dim' : ''}"><span class="fk">${k}</span>${figIcon(i, ch)}<b>${n}</b><small>${s}</small>${k === 'B' ? '<em class="fme">あなた</em>' : ''}</div>`).join('')}</div>`;
    },
    // 3人の場面：左からA・C・あなた。吹き出しは lines の順に1つずつ出る（そろえるため、吹き出し→絵→名前の3段に並べる）
    trio: () => {
      const P = [['A', '🧙', 'Aさん'], ['C', '🧑', 'Cさん'], ['B', 'hero', 'あなた']];
      const at = k => .3 + k * 1.1;
      const line = p => { const k = f.lines.findIndex(x => x[0] === p); return k < 0 ? null : [k, ...f.lines[k].slice(1)]; };
      const bubs = P.map(([p]) => { const l = line(p); return l ? `<div class="tq ${l[2] || ''}" style="animation-delay:${at(l[0])}s"><i class="tn">${l[0] + 1}</i>${esc(l[1]).replace(/\n/g, '<br>')}</div>` : '<div></div>'; }).join('');
      const pics = P.map(([p, i]) => { const l = line(p); return `<div class="ti ${p === 'B' && l ? 'push' : ''}" ${l ? `style="--d:${at(l[0]) + .3}s"` : ''}>${figIcon(i, ch)}</div>`; }).join('');
      const names = P.map(([p, , n]) => `<div class="tnm ${p === 'B' ? 'me' : ''}"><span class="tk">${p}</span><b>${n}</b>${f.sub && f.sub[p] ? `<small>${f.sub[p]}</small>` : ''}</div>`).join('');
      return `<div class="ftrio">${bubs}${pics}${names}</div>`;
    },
    say: () => `<div class="fsay">${figIcon(f.who || 'hero', ch)}<div class="fbub">${esc(f.text).replace(/\n/g, '<br>')}</div></div>`,
    talk: () => `<div class="ftalk">${f.lines.map(([w, t], k) => `<div class="tl ${w}" ${delay(k, .45)}>${w === 'me' ? '' : '<span class="tw">🧑</span>'}<span class="tb">${t}</span>${w === 'me' ? `<span class="tw"><img src="${heroImg()}" alt=""></span>` : ''}</div>`).join('')}</div>`,
    time: () => `<div class="ftime">${f.items.map(([a, b, c], k) => `<div class="tseg ${k === f.hi ? 'hi' : ''}"><span class="tt">${a}</span><b>${b}</b><small>${c}</small></div>`).join('<span class="farr">▶</span>')}</div>`,
    rank: () => `<div class="frank">${[1, 2, 3, 4, 5, 6, 7, 8].map(i => `<div class="fr"><small>${f.labels && f.labels[i - 1] ? esc(f.labels[i - 1]).replace(/\n/g, '<br>') : ''}</small><span class="frb" style="--h:${i / 8};animation-delay:${i * .06}s">M${i}</span></div>`).join('')}</div>`,
    img: () => `<div class="fimg"><img class="${f.cls || ''}" src="${f.src === 'enemy' ? ch.enemy.img : f.src}" alt=""><b>${f.cap || ''}</b></div>`,
    road: () => {
      const cur = ROAD.findIndex(r => r[0] === f.at);
      return `<div class="froad">${ROAD.map(([n, i, t], k) => `<div class="rd ${k === cur ? 'now' : k < cur ? 'done' : ''} ${n ? '' : 'goal'}" ${delay(k, .05)}>${k === cur ? '<em>いまここ</em>' : ''}${figIcon(i, ch, 'sm')}<b>${t}</b></div>`).join('')}</div>`;
    },
    battle: () => `<div class="fbattle"><img class="fe ${ch.final ? 'evil' : ''}" src="${ch.enemy.img}" alt=""><span class="fvs2">VS</span><img class="fh" src="${heroImg()}" alt=""></div><b class="fen">${ch.enemy.name}があらわれた</b>`,
  };
  return `<div class="figwrap"><div class="fig fig-${f.t}">${title}${(T[f.t] || (() => ''))()}${note}</div></div>`;
}

function hideScene() {
  clearInterval(TY.timer); TY.on = false;
  stopTimer();
  const sc = $('#scene'); sc.className = 'scene'; sc.innerHTML = ''; sc.onclick = null;
  B = null; LS = null; TK = null; D = null;
}
function closeScene() { hideScene(); afterChange(); }
// お話・バトルの背景（あかりが戻る前は灰色。総まとめ編は赤い闇）
function placeBg(no, extra = '') {
  const [x, y] = MAP_POS[no];
  const fin = no !== 'boss' && CH(no).final;
  // 塔はもともと暗い場所なので灰色にしない
  const lit = no === 'boss' || fin ? true : !!(S.ch[no] && S.ch[no].win);
  if (PLACE_BG[no]) return `<img class="placebg2 ${lit ? '' : 'gray'} ${fin ? 'crimson' : ''} ${extra}" src="${PLACE_BG[no]}" alt="">`;
  return `<img class="placebg ${lit ? '' : 'gray'} ${extra}" src="${PARTS[partOf(no) - 1].map}" style="transform:translate(-${x}%,-${Math.max(y, 15)}%)" alt="">`;
}

// ================= オープニング =================
let OP = null;
function startOpening() {
  if ($('#modal').classList.contains('show')) closeModal();
  OP = { i: 0 };
  $('#scene').className = 'scene show opening';
  playBgm('map');
  renderOpening();
}
function renderOpening() {
  const pg = OPENING[OP.i], sc = $('#scene');
  const src = pg.bg.startsWith('map') ? 'img/map.webp' : 'img/town.webp';
  const filt = pg.bg.endsWith('gray') ? 'grayscale(1) brightness(.7)' : pg.bg.endsWith('dark') ? 'brightness(.35) saturate(.6)' : 'none';
  const who = pg.who ? COMPANIONS[pg.who] : null;
  const fig = pg.hero ? heroImg(1) : pg.img || (who && who.img);
  sc.innerHTML = `<div class="shead"><span class="t">わんこ王国の物語</span><button class="x" onclick="event.stopPropagation();endOpening()">とばす</button></div>
    <div class="dots">${OPENING.map((_, i) => `<i class="${i <= OP.i ? 'on' : ''}"></i>`).join('')}</div>
    <div class="opbg"><img class="opimg" src="${src}" style="filter:${filt}" alt="">${fig ? `<img class="opfig ${pg.img ? 'boss' : ''}" src="${fig}" alt="">` : ''}</div>
    <div class="win talk">${who ? `<div class="who">${who.name}</div>` : ''}<div class="txt" id="ltxt"></div><div class="tri">▼</div></div>`;
  typeText($('#ltxt'), pg.t.replace('{name}', S.name));
  sc.onclick = () => {
    if (TY.on) { typeFinish(); return; }
    OP.i++; sfx('tap');
    if (OP.i >= OPENING.length) endOpening(); else renderOpening();
  };
}
function endOpening() {
  hideScene(); OP = null; TAB = 'home'; render();
  if (!S.howto) { S.howto = true; S.saveTip = true; save(); howTo(true); }
}
// 記録の残しかたのお知らせ（遊び方の「記録はこのスマホに残るよ」を1枚だけ見せる）
function saveTip() {
  S.saveTip = true; save();
  const p = HOWTO.find(h => h.save);
  modal(`<div class="hw"><div class="hwhead"><span class="hwn">お知らせ</span></div>
    <h3 class="hwttl">${p.title}</h3>
    ${figHTML(p.f, CHAPTERS[0])}
    ${sayHTML('mage', p.say)}
    <div class="hwbtn"><button class="btn grn" onclick="closeModal()">わかった</button></div></div>`);
}
// 遊び方：長い説明は読まれないので、1枚にひとつだけ。ルミンが話して、めくって進む
const HOWTO = [
  { title: 'このゲームで学ぶこと', f: { t: 'road', at: -1 },
    say: '知り合いに資産運用の話をつなげて、<em>契約してもらうまでの流れ</em>を、冒険しながら覚えるよ！' },
  { title: 'ステージの進め方', f: { t: 'flow', items: [['📜', '作戦会議'], ['⚔️', 'バトル'], ['🎯', 'ミッション']] },
    say: '<em>作戦会議</em>で学んで、<em>バトル</em>で敵をたおす。<em>ミッション</em>までやるとクリアだよ！' },
  { title: '町でできること', town: [['guild', 'ギルド', '毎日のおさらい'], ['post', '郵便', '仲間の手紙'], ['inn', '宿屋', '仲間と記録'], ['shop', '道具屋', 'ビジネスガイド']],
    say: 'まちがえた問題は、<em>ギルド</em>でおさらいできるよ。' },
  // 記録の残しかた（2026-11-10 本人の指示。前から遊んでいる人には saveTip で1回だけお知らせする）
  PASS_HOST ? { save: true, title: '名前と合言葉で続きから', f: { t: 'big', icon: '🔑', text: '名前＋合言葉（数字4けた）', sub: 'どのスマホ・アプリからでも続きから' },
    say: 'ほかのスマホや<em>ほかのアプリ</em>で開いたら、はじめの画面の<em>名前と合言葉で続きから</em>で入ってね！' }
  : { save: true, title: '記録はこのスマホに残るよ', f: { t: 'big', icon: '📱', text: 'つぎも同じ開き方で', sub: OPENED_IN ? `いまは ${OPENED_IN} で開いています` : 'LINEで開いたなら つぎもLINEから' },
    say: 'とちゅうでとじても大丈夫。<em>ほかのアプリ</em>や<em>シークレットモード</em>で開くと、最初からになるから気をつけてね！' },
  { title: '迷ったらここをタップ', f: { t: 'big', icon: '👆', text: '左上の「つぎにやること」', sub: 'いまやることに すぐ進める' },
    say: 'この説明は、右上の<em>遊び方</em>でいつでも見られるよ。さあ、出発しよう！' },
];
let HW = { i: 0, first: false };
function howTo(first) {
  HW = { i: 0, first: !!first };
  modal(`<div class="hw" id="hw">${howToPage()}</div>`);
}
function howToPage() {
  const p = HOWTO[HW.i], last = HW.i === HOWTO.length - 1;
  const fig = p.town
    ? `<div class="hwtown">${p.town.map(([k, n, s], j) => `<div class="hwt" ${delay(j, .08)}>${banner(k)}<b>${n}</b><small>${s}</small></div>`).join('')}</div>`
    : figHTML(p.f, CHAPTERS[0]);
  const endLabel = S.boss || learnedStages().length ? 'とじる' : '冒険をはじめる';
  return `<div class="hwhead"><span class="hwn">遊び方 ${HW.i + 1} / ${HOWTO.length}</span>${HW.first ? '' : '<button class="hwx" onclick="closeModal()" aria-label="とじる">✕</button>'}</div>
    <h3 class="hwttl">${p.title}</h3>
    ${fig}
    ${sayHTML('mage', p.say)}
    <div class="hwdots">${HOWTO.map((_, j) => `<i class="${j === HW.i ? 'on' : ''}"></i>`).join('')}</div>
    <div class="hwbtn">${HW.i ? '<button class="btn sub" onclick="howToGo(-1)">もどる</button>' : ''}
      <button class="btn ${last ? 'grn' : ''}" onclick="${last ? 'closeModal()' : 'howToGo(1)'}">${last ? endLabel : 'つぎへ ▶'}</button></div>`;
}
function howToGo(d) {
  HW.i = Math.max(0, Math.min(HOWTO.length - 1, HW.i + d));
  sfx('tap');
  const el = $('#hw');
  if (el) { el.innerHTML = howToPage(); el.closest('.mbox').scrollTop = 0; }
}

// ================= バトル =================
let B = null;
// 同じ問題か（文が同じ、または答えが同じで文もよく似ている）。ステージの問題と難問に同じ問題があるため
const qNorm = s => s.replace(/[\s　、。？！?!「」『』（）()・…]/g, '');
function qGrams(q) {
  if (!q._g) { const s = qNorm(q.q); q._g = new Set(); for (let i = 0; i < s.length - 1; i++) q._g.add(s.slice(i, i + 2)); }
  return q._g;
}
function sameQ(a, b) {
  if (a === b || qNorm(a.q) === qNorm(b.q)) return true;
  if (qNorm(a.a[0]) !== qNorm(b.a[0])) return false;
  const x = qGrams(a), y = qGrams(b);
  let n = 0; x.forEach(t => y.has(t) && n++);
  return n / (x.size + y.size - n) >= 0.3;
}
// from の頭から、have とかぶらない問題を n 問とり出す（from は減る）
function takeQ(from, have, n) {
  const out = [];
  while (from.length && out.length < n) {
    const q = from.shift();
    if (!have.some(p => sameQ(p, q)) && !out.some(p => sameQ(p, q))) out.push(q);
  }
  return out;
}
function battlePool(no) {
  const base = no === 'boss' ? partStages(1).flatMap(c => c.quiz) : CH(no).quiz;
  const hard = (no === 'boss' ? FINAL_BOSS.hard : CH(no).hard) || [];
  const own = takeQ(shuffle(base.concat(...hard.map(p => HARD[p]))), [], Infinity);
  if (no === 'boss') return { pool: own, rest: [] };
  // 問題が足りないと同じ問題が2回出てしまうので、前のステージの問題を「おさらい」として後ろに足す
  // 足りる数 = 敵の体力 ＋ まちがえてもいい回数（ハートの数）。それでも出しきったら nextQ で rest から足す
  const need = ENEMY_POWER[no].hp + 3 + Math.min(S.companions.length, 3) - own.length;
  const i = CHAPTERS.indexOf(CH(no)), p = partOf(no);
  const before = CHAPTERS.slice(0, i).filter(c => !c.final);
  // 同じ章の前のステージから先に使う
  const near = shuffle(before.filter(c => partOf(c.no) === p).flatMap(c => c.quiz));
  // 金融基礎知識編は、ビジネスの章の問題をまぜない（ほかの章とはべつに遊べる章なので）
  const far = p === 5 ? [] : shuffle(before.filter(c => partOf(c.no) !== p).flatMap(c => c.quiz));
  const rest = near.concat(far);
  return { pool: own.concat(takeQ(rest, own, Math.max(0, need))), rest };
}
function startBattle(no) {
  const boss = no === 'boss', ch = boss ? null : CH(no);
  const fin = !!(ch && ch.final);
  const en = boss ? FINAL_BOSS : ch.enemy;
  const pw = ENEMY_POWER[no], lv = enemyLv(no);
  const hearts = 3 + Math.min(S.companions.length, 3);
  const bp = battlePool(no);
  B = { no, boss, fin, en, lv, pool: bp.pool, rest: bp.rest, qi: 0, hp: pw.hp, max: pw.hp, atk: pw.atk, every: pw.charge, rage: pw.rage, time: pw.time || 0,
    angry: false, turn: 0, charged: false, hearts, maxH: hearts, gauge: 0, shield: has('goldio') ? 1 : 0, hint: 0, dbl: 0, reveal: 0, seal: 0, boost: false, miss: 0, combo: 0, spUsed: [], spLast: null };
  const sc = $('#scene');
  sc.className = 'scene show battle' + (boss || fin ? ' boss' : '') + (fin ? ' final' : '');
  sc.onclick = null;
  sc.innerHTML = sceneHead(boss ? `第1章 塔の決戦　${FINAL_BOSS.place}` : `${partOf(no) === 5 ? `金融基礎 ステージ${stageNo(no)}` : stageName(no)}　${ch.place}`) + `
    <div class="arena" id="arena">${placeBg(no, 'dim')}
      <div class="ename"><div class="nm"><span class="elv">Lv${lv}</span>${en.name}</div><div class="bar hp"><i id="ehp" style="width:100%"></i></div></div>
      ${qAuraHTML(boss || fin || en.big)}
      <img class="enemy ${en.big ? 'big' : ''} ${en.still ? 'still' : ''}" id="enemy" src="${en.img}" alt="">
      <div class="party" id="party">${S.companions.slice(-3).reverse().map((id, i) => `<img class="pm p${i + 1}" id="pm_${id}" src="${COMPANIONS[id].img}" alt="">`).join('')}
        <img class="me" id="me" src="${heroImg()}" alt=""></div>
      <div class="bstat"><div class="gauge" id="gauge"><span>必殺技</span>${'<i></i>'.repeat(SPECIAL_NEED)}</div>
        <div class="buffs" id="buffs"></div><div class="hearts2" id="hearts"></div></div>
    </div>
    ${bwinHTML()}`;
  drawHearts(); drawGauge(); drawBuffs();
  // 必殺技の絵は先に読みこんでおく（カットインがすぐ出るように）
  [...heroSpecials(), ...S.companions].forEach(id => { new Image().src = spImg(id); });
  playBgm(battleBgm(no, boss || fin)); save();
  if (boss || fin || en.big) setTimeout(() => sfx('boss'), 150);
  // 敵の特ちょうは短い札にする（長い説明は読まれないため。くわしくはその場面で出る）
  const tips = [`まちがえると♥-${pw.atk}`];
  if (pw.charge) tips.push('⚡ 力ため');
  if (pw.rage) tips.push('😡 本気モード');
  if (pw.time) tips.push(`⏱ 1問${pw.time}秒`);
  if ((boss ? FINAL_BOSS.hard : ch.hard)) tips.push('4択の難問');
  if (!Object.values(S.ch).some(c => c && c.win)) tips.push(`正解${SPECIAL_NEED}回で必殺技`);
  bmsg(`<div>${en.name}があらわれた！</div><div class="ex">「${esc(en.line)}」</div>
    <div class="etips">${tips.map(t => `<span>${t}</span>`).join('')}</div>
    <button class="btn w go" onclick="nextQ()">たたかう</button>`);
}
function drawHearts() { $('#hearts').innerHTML = '<span style="color:#ff6b7a">' + '♥'.repeat(B.hearts) + '</span><span style="color:#5a5478">' + '♥'.repeat(Math.max(0, B.maxH - B.hearts)) + '</span>'; }
function drawGauge() {
  const g = $('#gauge'); if (!g) return;
  g.querySelectorAll('i').forEach((el, i) => el.classList.toggle('on', i < B.gauge));
  g.classList.toggle('full', B.gauge >= SPECIAL_NEED);
}
// 今かかっている必殺技の効果
function drawBuffs() {
  const el = $('#buffs'); if (!el) return;
  const b = [];
  // 敵の力ための予告（どの仲間の技を使うか考えられるように。2026-11-11 本人の指示）
  const k = chargeIn();
  if (B.charged) b.push(['⚡ 力ため中！', 'chg']);
  else if (k === 1 && !B.seal) b.push(['⚡ つぎの問題で力ため！', 'chg']);
  else if (k > 1) b.push([`⚡ 力ためまで あと${k}問`, 'chg2']);
  if (B.boost) b.push(['📣 つぎの技2倍', 'boost']);
  if (B.combo >= 2) b.push(`🔥 ${B.combo}連続`);
  if (B.shield) b.push(`🛡 あと${B.shield}回`);
  if (B.dbl) b.push(`💪 2倍 あと${B.dbl}回`);
  if (B.hint) b.push(`📊 分析 あと${B.hint}問${B.time ? '・時間停止' : ''}`);
  if (B.reveal) b.push(B.reveal > 1 ? `🔍 答えが光る あと${B.reveal}問` : '🔍 つぎの答えが光る');
  if (B.seal) b.push(`🔮 力ため封じ${B.seal > 1 ? ' ×' + B.seal : ''}`);
  el.innerHTML = b.map(t => Array.isArray(t) ? `<span class="${t[1]}">${t[0]}</span>` : `<span>${t}</span>`).join('');
  $('#party').classList.toggle('fired', B.dbl > 0 || B.boost);
}
// 敵があと何問で力をためるか（1＝つぎの問題）。力ためをしない敵は 0。nextQ と同じ決まりで数える
function chargeIn() {
  if (!B || !B.every) return 0;
  const every = B.angry ? Math.max(2, B.every - 1) : B.every;
  for (let k = 1; k <= every; k++) { const t = B.turn + k; if (t > 1 && t % every === 0) return k; }
  return 0;
}
function bmsg(html) { const w = $('#bwin'); w.innerHTML = html; w.scrollTop = 0; moreSoon(); }
// 下の窓（上の絵は動かさず、窓の中だけをスクロールする。続きがあるときは ▼ を出す）
function bwinHTML(inner = '') {
  return `<div class="bbox"><div class="win bwin" id="bwin" onscroll="moreCheck()">${inner}</div><button class="bmore" onclick="moreDown()" aria-label="下へ">▼</button></div>`;
}
function moreCheck() {
  const w = $('#bwin'), box = w && w.parentNode;
  if (box && box.classList.contains('bbox')) box.classList.toggle('more', w.scrollHeight - w.scrollTop - w.clientHeight > 6);
}
// 絵や文字があとから読みこまれて高さが変わることがあるので、少しあとにもう一度見る
function moreSoon() { moreCheck(); setTimeout(moreCheck, 400); }
function moreDown() { const w = $('#bwin'); if (w) w.scrollBy({ top: Math.max(80, w.clientHeight - 70), behavior: 'smooth' }); }
addEventListener('resize', moreCheck);
function nextQ() {
  if (!B) return;
  // 全部出しきったら（盾や回復で長いバトルになったとき）、まだ出していない前のステージの問題を足す
  // それもなければ混ぜ直す（さっきと同じ問題が続けて出ないように）
  if (B.qi >= B.pool.length) {
    const more = takeQ(B.rest, B.pool, 5);
    if (more.length) B.pool.push(...more);
    else {
      B.pool = shuffle(B.pool); B.qi = 0;
      if (B.pool.length > 1 && B.pool[0] === B.q) B.pool.push(B.pool.shift());
    }
  }
  const q = B.pool[B.qi++];
  const rev = !B.boss && !q.hard && q.no !== B.no;
  B.q = q; B.order = shuffle(q.a.map((_, i) => i)); B.answered = false;
  let gone = -1, frozen = false;
  // メモリーの分析：まちがいを1つ消して、時間制限を止める（2026-11-11）
  if (B.hint > 0) { B.hint--; frozen = !!B.time; const wrong = B.order.filter(k => k !== 0); gone = wrong[Math.floor(Math.random() * wrong.length)]; }
  const reveal = B.reveal > 0; if (reveal) B.reveal--;
  // 敵が力をためる（数問ごと。本気になると間かくが短くなる）
  B.turn++;
  const every = B.angry ? Math.max(2, B.every - 1) : B.every;
  B.charged = !!every && B.turn > 1 && B.turn % every === 0;
  let sealed = false;
  if (B.charged && B.seal > 0) { B.charged = false; B.seal--; sealed = true; }
  drawBuffs();
  $('#enemy').classList.toggle('charging', B.charged);
  if (B.charged) setTimeout(() => sfx('charge'), 100);
  const warn = B.charged ? `<div class="warn">⚡ ${esc(B.en.name)}が力をためている！まちがえるとハートが${B.atk * 2}つへる</div>`
    : sealed ? `<div class="ex">ルミンの魔法で、${esc(B.en.name)}は力をためられない！</div>` : '';
  // 時間制限（本気になると短くなる）
  const sec = B.time && !frozen ? (B.angry ? Math.max(10, B.time - 4) : B.time) : 0;
  bmsg(`${warn}${sec ? `<div class="trow">⏱<span class="tbar"><i id="tbar"></i></span><b id="tsec">${sec}</b></div>` : ''}<div class="q">${q.hard ? '<span class="hardtag">難問</span>' : rev ? `<span class="hardtag rev">おさらい ${CH(q.no).title}</span>` : ''}${esc(q.q)}</div>${B.order.map(k => `<button class="ans ${k === gone ? 'gone' : ''} ${reveal && k === 0 ? 'hintok' : ''}" data-k="${k}" onclick="answer(${k})" ${k === gone ? 'disabled' : ''}>${esc(q.a[k])}</button>`).join('')}
    ${gone >= 0 ? `<div class="ex">メモリーの分析で、まちがいを1つ消しました${frozen ? '。時間も止まっている' : ''}</div>` : ''}${reveal ? '<div class="ex">スカウトンが見つけた！光っているのが正解</div>' : ''}`);
  if (sec) startTimer(sec);
  // ときどき敵がわるいくせを言う（連続正解のボーナスで主人公が言い返す。js/fx.js）
  if (Math.random() < (B.turn === 1 ? .6 : .35)) setTimeout(() => { if (B && B.q === q && !B.answered) qTaunt(); }, 250);
}
// 1問ごとの時間制限
function startTimer(sec, total = sec) {
  stopTimer();
  const bar = $('#tbar'), num = $('#tsec');
  if (!bar) return;
  const tok = B, q = B.q, end = Date.now() + sec * 1000;
  B.tend = end; B.ttotal = total;
  bar.style.transition = 'none'; bar.style.width = (sec / total * 100) + '%'; void bar.offsetWidth;
  bar.style.transition = `width ${sec}s linear`; bar.style.width = '0%';
  let shown = sec;
  const tick = () => {
    if (B !== tok || B.q !== q || B.answered) return;
    const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    if (left !== shown) { shown = left; if (num) num.textContent = left; if (left <= 5 && left > 0) sfx('tick'); }
    bar.parentNode.classList.toggle('hurry', left <= 5);
    if (left <= 0) { B.tm = null; answer(-1); return; }
    B.tm = setTimeout(tick, 150);
  };
  B.tm = setTimeout(tick, 150);
}
function stopTimer() {
  if (B && B.tm) { clearTimeout(B.tm); B.tm = null; }
  const bar = $('#tbar');
  if (bar) { bar.style.width = getComputedStyle(bar).width; bar.style.transition = 'none'; }
}
function anim(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 600); }
// snd：当たったときの録音の音（ルミン＝magicHit・スカウトン＝scoutHit。スロットと同じ。2026-11-10）
function hitEnemy(n, quiet, snd) {
  if (quiet) { if (!(snd && se(snd))) sfx(n > 1 ? 'bigHit' : 'hit'); }
  else { sfx('slash'); if (SE.buf.has('hit')) setTimeout(() => sfx(n > 1 ? 'bigHit' : 'hit'), 130); }
  if (!quiet) { anim($('#me'), 'lunge'); qPose('attack', 520); }
  setTimeout(() => { anim($('#enemy'), 'shake'); anim($('#enemy'), 'flash'); qSpark(FXIMG.star, n > 1 ? 7 : 4); }, quiet ? 0 : 150);
  const d = document.createElement('div'); d.className = 'dmg'; d.textContent = n;
  d.style.marginLeft = (Math.random() * 40 - 20) + 'px';
  $('#arena').appendChild(d); setTimeout(() => d.remove(), 800);
  B.hp = Math.max(0, B.hp - n); $('#ehp').style.width = (B.hp / B.max * 100) + '%';
}
// 正解したら仲間もぴょんと喜ぶ
function partyHop() { document.querySelectorAll('#party .pm').forEach((el, i) => setTimeout(() => anim(el, 'hop'), 120 + i * 90)); }
function nextBtns() {
  if (B.gauge < SPECIAL_NEED) return `<button class="btn w go" onclick="nextQ()">つぎへ</button>`;
  return `<div class="grid2 go"><button class="btn sp" onclick="specialMenu()">✨ 必殺技</button><button class="btn" onclick="nextQ()">つぎへ</button></div>`;
}
function answer(k) {
  if (!B || B.answered) return;
  B.answered = true; stopTimer();
  const q = B.q, ok = k === 0, timeout = k === -1;
  document.querySelectorAll('.bwin .ans').forEach(b => {
    b.disabled = true;
    if (+b.dataset.k === 0) b.classList.add('ok'); else if (+b.dataset.k === k) b.classList.add('ng');
  });
  track(q, ok);
  const charged = B.charged;
  B.charged = false; $('#enemy').classList.remove('charging');
  if (ok) {
    B.combo++;
    let n = 1;
    if (B.dbl > 0) { B.dbl--; n = 2; }
    if (charged) n++;
    const combo = B.combo % 3 === 0;
    if (combo) n++;
    drawBuffs();
    hitEnemy(n); partyHop();
    const was = B.gauge;
    B.gauge = Math.min(SPECIAL_NEED, B.gauge + 1); drawGauge();
    if (B.hp <= 0) { setTimeout(battleWin, 700); return; }
    const filled = was < SPECIAL_NEED && B.gauge >= SPECIAL_NEED;
    if (filled) setTimeout(() => sfx('gaugeMax'), 300);
    appendMsg(`<div class="ok-t" style="margin-top:8px">${charged ? 'カウンター！ ためた力をはね返した　' : 'せいかい！ '}${B.en.name}に${n}ダメージ</div>${combo ? `<div class="ok-t">🔥 ${B.combo}問連続正解！ボーナス＋1</div>` : ''}<div class="ex">${esc(q.e)}</div>${filled ? '<div class="ok-t">必殺技ゲージがたまった！</div>' : ''}${angryCheck()}${nextBtns()}`);
    drawBuffs();
    // 連続正解のボーナスのときは、主人公が敵のセリフに言い返す（js/fx.js）
    if (combo) setTimeout(() => { if (B && B.hp > 0) qReply(); }, 650);
  } else {
    // 敵の技（2026-11-10 スロット「ワンコクエスト」の演出を写した。js/fx.js）。
    // セリフと技の名前を見せてから技を出し、当たったときにハートをへらして見せる。へる数は前と同じ（力ためのあとは2倍）
    B.combo = 0; B.miss++; drawBuffs();
    const dmg = B.atk * (charged ? 2 : 1);
    const guarded = B.shield > 0;
    if (guarded) B.shield--; else B.hearts = Math.max(0, B.hearts - dmg);
    const lose = !guarded && B.hearts <= 0;
    // 力をためたあと・最後のハートをうばう一撃は大技（赤いカットイン）
    const sk = foePick(charged, lose);
    const extra = guarded ? `<div class="ok-t">${esc(B.en.name)}の${esc(sk.name)}！でもゴルディオの盾が守った！ハートはへらない</div>`
      : `<div class="ng-t">${charged ? 'ためた力の大技！' : ''}${esc(B.en.name)}の${esc(sk.name)}！ハートが${dmg}つへった</div>`;
    appendMsg(`<div class="ng-t" style="margin-top:8px">${timeout ? '⏱ 時間切れ！' : 'ざんねん'}　こたえは「${esc(q.a[0])}」</div><div class="ex">${esc(q.e)}</div>${extra}`);
    const tok = B;
    foeAttack(sk).then(hit => {
      if (B !== tok || !hit) return;
      if (guarded) {
        sfx('guard'); drawBuffs();
        const dm = $('#dome');
        if (dm) { if (B.shield > 0) anim(dm, 'block'); else { dm.classList.add('out'); setTimeout(() => dm.remove(), 500); } }
      } else {
        sfx('hurt'); anim($('#arena'), 'hurt'); partyHurt(sk.big); if (dmg > 1 && !sk.big) quake();
        drawHearts();
        const d = document.createElement('div'); d.className = 'dmg mine'; d.textContent = '♥-' + dmg; $('#arena').appendChild(d); setTimeout(() => d.remove(), 800);
      }
      if (lose) { setTimeout(battleLose, 900); return; }
      appendMsg(nextBtns());
    });
  }
}
// 体力が半分になったら本気モード
function angryCheck() {
  if (!B.rage || B.angry || B.hp > B.max / 2) return '';
  B.angry = true;
  $('#enemy').classList.add('angry');
  setTimeout(() => { sfx('angry'); quake(); }, 300);
  return `<div class="warn">${esc(B.en.name)}が本気になった！力をためる回数がふえる${B.time ? '。時間制限も短くなる' : ''}</div>`;
}
// 必殺技は1人1回ずつ。全員が使い終わるまで、同じ技は使えない（2026-11-12 本人の指示「技を一度使ったら一周するまで使えないように」）
// B.spUsed＝この一周で使った技。一周したら空にもどす。B.spLast＝一周の最後に使った技（つぎの一周で、すぐにまた同じ技にならないように、ほかの技を1つ使うまで休み）
function spList() { return [...heroSpecials(), ...S.companions]; }
function spLocked(id) {
  if (B.spUsed.includes(id)) return 'この一周ではもう使った';
  if (id === B.spLast && spList().length > 1) return 'さっき使ったばかり';
  return '';
}
function spMark(id) {
  if (id !== B.spLast) B.spLast = null;
  if (!B.spUsed.includes(id)) B.spUsed.push(id);
  const list = spList();
  if (!list.every(x => B.spUsed.includes(x))) return false;
  B.spUsed = []; B.spLast = id;
  // 主人公だけ（仲間がいない）のときは、いつでも連続斬りが使えるので「一周した」とは言わない
  return list.length > 1;
}
// 技の名前は長いので（攻撃魔法エボリューションなど）、言葉の切れめ（・のあと、漢字→カタカナ、数字→かな）でだけ折り返す。CSS の word-break:keep-all とセット
function spWrap(n) {
  return n.replace(/・/g, '・<wbr>').replace(/([一-龯])(?=[ァ-ヶー])/g, '$1<wbr>').replace(/([0-9A-Za-z])(?=[ぁ-んァ-ヶ])/g, '$1<wbr>');
}
function specialMenu() {
  sfx('tap');
  const list = spList();
  const rec = spRecommend(), k = chargeIn();
  const left = list.filter(id => !spLocked(id)).length;
  const head = (k === 1 && !B.seal ? `<div class="warn">⚡ つぎの問題で、${esc(B.en.name)}が力をためる！</div>` : '')
    + (B.boost ? '<div class="ok-t">📣 エールンの応援中！つぎの技は効果が2倍</div>' : '');
  bmsg(`${head}<div class="q">だれの必殺技を使う？</div>${list.length > 1 ? `<div class="ex">技は1人1回ずつ。全員が使うと、また使えるよ（のこり${left}人）</div>` : ''}<div class="sps">${list.map(id => {
    const hero = id === 'hero', used = spLocked(id);
    // 主人公の必殺技は、場面で見せ方が変わる（積立スラッシュ・72の法則ぎり。js/fx.js の heroMove）
    const sp = hero ? Object.assign({}, SPECIALS.hero, heroMove()) : SPECIALS[id];
    const r = !used && rec[id];
    return `<button class="spbtn${r ? ' rec' : ''}" ${used ? 'disabled' : `onclick="useSpecial('${id}')"`}><b>${spWrap(sp.name)}</b><img src="${hero ? heroImg() : COMPANIONS[id].img}" alt=""><span><small>${hero ? esc(S.name) : COMPANIONS[id].name}（${SPECIALS[id].role}）<br>${used || sp.short}</small>${r ? `<em>おすすめ：${r}</em>` : ''}</span></button>`;
  }).join('')}</div>${list.length === 1 ? '<div class="ex">仲間が増えると、いろいろな必殺技が使えるよ</div>' : ''}
    <button class="btn sub w" style="margin-top:10px" onclick="nextQ()">使わずにつぎへ</button>`);
}
// いまの場面に合う仲間（おすすめの札）。2026-11-11 本人の指示「仲間の必殺技を駆使できるゲームに」
function spRecommend() {
  const r = {}, k = chargeIn(), nq = B.pool[B.qi], hard = !!(nq && nq.hard);
  if (B.hp <= (B.boost ? 4 : 2)) r.hero = 'とどめ！';
  if (k === 1 && !B.seal) {
    r.mage = '力ためを封じる';
    if (!B.shield) r.goldio = '大技を盾で守る';
    if (!B.reveal) r.scout = '答えを光らせてカウンター';
  }
  if (hard && !B.reveal && !r.scout) r.scout = '難問の答えが光る';
  if (B.hearts * 2 <= B.maxH) r.heartn = 'ハートがピンチ！';
  if (!B.hint) { if (B.time) r.memory = '時間を止める'; else if (hard) r.memory = 'まちがいを消す'; }
  return r;
}
function spImg(id) { return id === 'hero' ? `img/sp_slash_${S.breed}.webp` : `img/sp_${id}.webp`; }
// 主人公の必殺技は連続斬りだけ（前はLv10でかけ橋アタックも覚えたが、2026-11-04 本人の指示で連続斬りだけにした）
function heroSpecials() { return ['hero']; }
function useSpecial(id) {
  if (B.gauge < SPECIAL_NEED || spLocked(id)) return;
  const round = spMark(id);
  // 主人公は、連続斬り・積立スラッシュ（2回目から）・72の法則ぎり（とどめ）のどれか。どれも2ダメージで、見せ方だけちがう（2026-11-10）
  const mv = id === 'hero' ? heroMove() : null;
  if (mv) B.heroUses = (B.heroUses || 0) + 1;
  const sp = mv ? Object.assign({}, SPECIALS.hero, mv) : SPECIALS[id];
  // エールンの応援のあとは、つぎの1回だけ効果が2倍（pw = 2）
  const pw = B.boost && id !== 'yell' ? 2 : 1;
  if (pw > 1) B.boost = false;
  B.gauge = 0; drawGauge(); drawBuffs();
  qHideTalk();
  bmsg(`<div class="ok-t">${sp.name}！${pw > 1 ? '（応援で2倍）' : ''}</div>`);
  cutIn(id, sp.name);
  palEl(id);
  const tok = B;
  setTimeout(async () => {
    if (B !== tok) return;
    let msg = SP_FX[id](mv, pw), wait = 1100;
    // 長い演出（積立スラッシュ・72の法則ぎり）は、終わるのを待ってから文を出す
    if (msg && msg.then) { msg = await msg; wait = 250; }
    setTimeout(async () => {
      if (B !== tok) return;
      // 応援で2倍のときは、技のダメージをもう1回ぶん足す（効果の2倍は SP_FX の中）
      if (pw > 1 && B.hp > 0) { msg += '<br>' + await boostHit(id === 'hero' ? 2 : 1); if (B !== tok) return; }
      if (round) msg += '<div class="ok-t" style="margin-top:6px">🔄 全員の必殺技を使った！また全員の技が使えるよ</div>';
      drawBuffs();
      if (B.hp <= 0) { bmsg(`<div class="ok-t">${sp.name}！</div><div>${msg}</div>`); setTimeout(battleWin, 500); return; }
      bmsg(`<div class="ok-t">${sp.name}！</div><div>${msg}</div>${angryCheck()}${nextBtns()}`);
      drawBuffs();
    }, wait);
  }, 1650);
}
function cutIn(id, name) {
  if (!(S && S.sound && se(CUT_SE[id] || 'special'))) sfx('special');
  const who = COMPANIONS[id] ? COMPANIONS[id].name : S.name;
  const fb = COMPANIONS[id] ? COMPANIONS[id].img : heroImg();
  const c = document.createElement('div');
  c.className = 'cutin c-' + id;
  c.innerHTML = `<div class="cband"><img src="${spImg(id)}" alt="" onerror="this.onerror=null;this.src='${fb}';this.classList.add('fb')"><i class="lines"></i></div>
    <div class="cname"><small>${esc(who)}の</small>${spWrap(name)}</div>`;
  $('#arena').appendChild(c);
  setTimeout(() => c.remove(), 1700);
}

// ---------- 必殺技ごとの演出 ----------
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
// 場面の中での位置（％ではなくpx）
function spot(el, ax = .5, ay = .5) {
  const a = $('#arena').getBoundingClientRect(), r = el.getBoundingClientRect();
  return { x: r.left - a.left + r.width * ax, y: r.top - a.top + r.height * ay, w: r.width, h: r.height };
}
function fxAdd(cls, x, y, style = '', html = '', life = 1200) {
  const d = document.createElement('div');
  d.className = 'fx ' + cls;
  d.style.cssText = (x == null ? '' : `left:${x}px;top:${y}px;`) + style;
  d.innerHTML = html;
  $('#arena').appendChild(d);
  setTimeout(() => d.remove(), life);
  return d;
}
function move(el, frames, ms, ease = 'ease-in-out') { if (el && el.animate && !RM) el.animate(frames, { duration: ms, easing: ease }); }
function quake() { anim($('#arena'), 'quake'); }
function tone(list) { SFX._t = list; sfx('_t'); }
// 技を出す仲間が場面にいなければ、いちばん前に出てくる
function palEl(id) {
  let el = $('#pm_' + id);
  if (!el && COMPANIONS[id]) {
    el = $('#party .pm.p1');
    if (el) { el.id = 'pm_' + id; el.src = COMPANIONS[id].img; }
  }
  return el;
}

const SP_FX = {
  // こつこつ剣（前の名前は連続斬り）：主人公が飛びこんで2回斬る（1回1ダメージ、合わせて2ダメージ）
  // mv は js/fx.js の heroMove の結果（move という名前は下の動きの関数と同じなので使わない）
  hero(mv) {
    if (mv && mv.kind === 'iai') return heroIai();
    if (mv && mv.kind === 'tsumi') return heroTsumi(B.heroUses);
    const e = spot($('#enemy')), pal = $('#me');
    qPose('attack', 900);
    if (pal) { const p = spot(pal); move(pal, [{ transform: 'translate(0,0)' }, { transform: `translate(${e.x - p.x + 40}px,${e.y - p.y}px)`, offset: .25 }, { transform: `translate(${e.x - p.x + 40}px,${e.y - p.y}px)`, offset: .8 }, { transform: 'translate(0,0)' }], 800); }
    [-28, 24].forEach((r, i) => setTimeout(() => {
      fxAdd('fx-slash', e.x + (i - 1) * 10, e.y + (i - 1) * 18, `--r:${r}deg`, '', 400);
      if (!se('swish', 1 + i * .12)) tone([[1400 - i * 200, .03, 'sawtooth'], [700, .05, 'sawtooth']]);
      quake(); hitEnemy(1, true);
    }, 220 + i * 190));
    return `${B.en.name}に2連続で、合わせて2ダメージ！`;
  },
  // 攻撃魔法エボリューション（前の名前はきらぼしの魔法）：足もとに魔法陣、空から星がふって、力ためを封じる（封じ役・1ダメージ。2026-11-11）
  mage(mv, pw = 1) {
    const e = spot($('#enemy')), pal = palEl('mage');
    if (pal) anim(pal, 'hop');
    fxAdd('fx-circle', e.x, e.y + e.h * .38, '', '', 1100);
    const smp = se('magic');
    if (!smp) tone([[784, .05], [988, .05], [1175, .05], [1568, .1]]);
    for (let i = 0; i < 7; i++) setTimeout(() => {
      const x = e.x + (Math.random() - .5) * e.w * .9, y = e.y + (Math.random() - .5) * e.h * .6;
      const st = fxAdd('fx-star', x, y - 160, '', '★', 700);
      if (st.animate && !RM) st.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(0,160px) rotate(220deg)', opacity: 1 }], { duration: 380, easing: 'ease-in', fill: 'forwards' });
      setTimeout(() => fxAdd('fx-burst', x, y, 'width:70px;height:70px;margin:-35px 0 0 -35px;filter:hue-rotate(200deg)', '', 500), 380);
    }, 150 + i * 80);
    setTimeout(() => { quake(); hitEnemy(1, true, 'magicHit'); if (!smp) tone([[1319, .04], [1760, .12]]); }, 700);
    B.seal = Math.max(B.seal || 0, pw);
    return `${B.en.name}に1ダメージ！${pw > 1 ? 'このあと2回、力ためを封じる' : 'つぎの力ためを封じた'}`;
  },
  // S&P500スコープ（前の名前は索敵）：スコープで場面をさがして、答えを見つける（偵察役。力ためのときに使うとカウンターが決まる）
  scout(mv, pw = 1) {
    const e = spot($('#enemy')), pal = palEl('scout'), from = pal ? spot(pal) : spot($('#me'));
    const sc = fxAdd('fx-scope', from.x, from.y, '', '', 1050);
    if (sc.animate && !RM) sc.animate([{ left: from.x + 'px', top: from.y + 'px' }, { left: e.x + 70 + 'px', top: e.y - 60 + 'px' }, { left: e.x - 40 + 'px', top: e.y + 30 + 'px' }, { left: e.x + 'px', top: e.y + 'px' }], { duration: 750, easing: 'ease-in-out', fill: 'forwards' });
    [0, 1, 2].forEach(i => setTimeout(() => { if (!se('gauge', 1.2 + i * .15, .8)) tone([[1200, .03], [0, .05], [1200, .03]]); }, i * 220));
    setTimeout(() => { fxAdd('fx-ping', e.x, e.y, '', '', 1300); fxAdd('fx-mark', e.x, e.y, '', '！', 900); if (!se('omen')) tone([[880, .05], [1760, .15]]); }, 760);
    setTimeout(() => { fxAdd('fx-burst', e.x, e.y, 'filter:hue-rotate(80deg)', '', 500); hitEnemy(1, true, 'scoutHit'); }, 900);
    B.reveal = Math.max(B.reveal || 0, pw);
    return `${B.en.name}の弱点をついて1ダメージ！${pw > 1 ? 'つぎの2問' : 'つぎの問題'}の答えが光って見える`;
  },
  // プラチナプラス・シールド（前の名前はガーディアンシールド）：仲間を金色のバリアでつつむ（守り役）
  goldio(mv, pw = 1) {
    const pal = palEl('goldio');
    if (pal) anim(pal, 'hop');
    const old = $('#dome'); if (old) old.remove();
    const d = document.createElement('div'); d.className = 'dome'; d.id = 'dome';
    $('#party').appendChild(d);
    if (!se('clang')) tone([[262, .06], [392, .06], [523, .06], [784, .2]]);
    const e = spot($('#enemy'));
    if (pal) { const p = spot(pal); setTimeout(() => move(pal, [{ transform: 'translate(0,0)' }, { transform: `translate(${(e.x - p.x) * .6}px,${(e.y - p.y) * .4}px)`, offset: .4 }, { transform: 'translate(0,0)' }], 500), 350); }
    setTimeout(() => { fxAdd('fx-burst', e.x, e.y, 'filter:hue-rotate(170deg)', '', 500); hitEnemy(1, true); }, 560);
    B.shield = Math.max(B.shield, 2 * pw);
    return `シールドアタックで${B.en.name}に1ダメージ！つぎの${2 * pw}回まちがえても、ハートがへらない`;
  },
  // ドルコスト・エール（前の名前はやる気アップ）：メガホンの声が広がって、ゲージがもう一度満タンになり、つぎの技の効果が2倍になる（応援役・1回のバトルで1回だけ）
  // 2026-11-05 に「すぐもう1回」にしたが、ゲージを1回分使って1回分戻すだけで意味がなかったので、2026-11-11 本人の指示で「つぎの技が2倍」を足した
  yell() {
    const pal = palEl('yell'), p = pal ? spot(pal) : spot($('#me'));
    const smp = se('combo');
    [0, 1, 2].forEach(i => setTimeout(() => { fxAdd('fx-ring', p.x, p.y, '', '', 850); if (!smp) tone([[440 + i * 110, .05], [660 + i * 110, .08]]); }, i * 200));
    setTimeout(() => fxAdd('fx-pop', null, null, '', 'つぎの技が2倍！', 1100), 450);
    document.querySelectorAll('#party img').forEach((el, i) => setTimeout(() => anim(el, 'hop'), i * 80));
    B.boost = true;
    setTimeout(() => { if (!B) return; B.gauge = SPECIAL_NEED; drawGauge(); drawBuffs(); sfx('gaugeMax'); }, 750);
    return 'みんなのやる気が満タン！ゲージがすぐたまった。つぎに使う必殺技は、効果が2倍になる';
  },
  // イデコ・ヒール（前の名前はいやしの光）：空から光がふって、ハートが元どおり（回復役。応援で2倍のときはハートの最大も1つふえる）
  heartn(mv, pw = 1) {
    const pt = spot($('#party')), e = spot($('#enemy')), pal = palEl('heartn');
    if (pal) anim(pal, 'hop');
    [.15, .45, .75].forEach((k, i) => setTimeout(() => fxAdd('fx-beam', pt.x - pt.w / 2 + pt.w * k, 0, `height:${pt.y + pt.h / 2}px`, '', 900), i * 120));
    for (let i = 0; i < 9; i++) setTimeout(() => fxAdd('fx-heart', pt.x - pt.w / 2 + Math.random() * pt.w, pt.y + pt.h * .3 + Math.random() * pt.h * .2, '', '♥', 1100), 250 + i * 70);
    // 回復の音はスロットのハートンと同じ heal（2026-11-10）
    if (!se('heal') && !se('omenRainbow')) tone([[523, .08], [659, .08], [784, .08], [1047, .08], [1319, .2]]);
    if (pw > 1) B.maxH++;
    setTimeout(() => { B.hearts = B.maxH; drawHearts(); }, 500);
    setTimeout(() => {
      const o = fxAdd('fx-orb', pt.x - pt.w / 2, pt.y, '', '', 500);
      if (o.animate && !RM) o.animate([{ left: pt.x - pt.w / 2 + 'px', top: pt.y + 'px' }, { left: e.x + 'px', top: e.y + 'px' }], { duration: 300, fill: 'forwards' });
      setTimeout(() => { fxAdd('fx-burst', e.x, e.y, 'filter:hue-rotate(-60deg)', '', 600); hitEnemy(1, true); }, 300);
    }, 700);
    return pw > 1 ? 'ハートの最大が1つふえて、全部回復した！敵にも1ダメージ' : 'ハートが全部回復した！敵にも1ダメージ';
  },
  // オルカン・スキャン（前の名前はデータ分析）：敵をスキャンして、まちがいを見ぬく（分析役。時間制限も止める）
  memory(mv, pw = 1) {
    const en = $('#enemy'), e = spot(en), pal = palEl('memory');
    if (pal) anim(pal, 'hop');
    const box = fxAdd('fx-scan', e.x - e.w / 2, e.y - e.h / 2, `width:${e.w}px;height:${e.h}px`, '<i></i><b>分析中…</b>', 1100);
    [0, 1, 2, 3].forEach(i => setTimeout(() => { if (!se('gauge', 1.4 + i * .12, .7)) tone([[1600 + i * 120, .02], [0, .03]]); }, i * 140));
    [.7, .45, .9].forEach((w, i) => setTimeout(() => fxAdd('fx-bar', e.x + e.w / 2 + 8, e.y - 20 + i * 14, `width:${w * 60}px`, '', 900), 200 + i * 120));
    setTimeout(() => { const b = box.querySelector('b'); if (b) b.textContent = '弱点を発見！'; if (!se('omen')) tone([[988, .05], [1319, .15]]); }, 650);
    setTimeout(() => { fxAdd('fx-burst', e.x, e.y, 'filter:hue-rotate(150deg)', '', 500); hitEnemy(1, true); }, 850);
    B.hint = Math.max(B.hint, 3 * pw);
    return `${B.en.name}の弱点をついて1ダメージ！つぎの${3 * pw}問、${B.time ? '時間制限が止まって、' : ''}まちがいの選択肢が1つ消える`;
  },
};
// エールンの応援で2倍：技のあとに、応援の力でもう一度同じだけダメージ（2026-11-11）
function boostHit(n) {
  return new Promise(res => {
    const e = spot($('#enemy')), y = $('#pm_yell'), p = spot(y || $('#me'));
    if (y) anim(y, 'hop');
    fxAdd('fx-ring', p.x, p.y, '', '', 850);
    fxAdd('fx-pop', null, null, '', '応援で2倍！', 1100);
    if (!se('combo')) tone([[660, .05], [880, .08]]);
    setTimeout(() => { fxAdd('fx-burst', e.x, e.y, 'filter:hue-rotate(20deg)', '', 500); quake(); hitEnemy(n, true); }, 450);
    setTimeout(() => res(`エールンの応援で、さらに${n}ダメージ！`), 950);
  });
}
function appendMsg(html) {
  const w = $('#bwin'), at = w.scrollHeight - 12;
  w.insertAdjacentHTML('beforeend', html);
  // あとから出た文の頭が見えるところまで、窓の中だけを送る
  w.scrollTo({ top: Math.min(at - 50, w.scrollHeight - w.clientHeight), behavior: 'smooth' });
  moreSoon();
}
function battleWin() {
  if (!B) return;
  const { no, boss, fin, en } = B;
  stopTimer(); stopBgm();
  // たおした演出（白く点滅→光のすじ・星→「たおした！」→紙ふぶき。js/fx.js）。勝ちの音もこの中で鳴らす
  qDefeat(fin ? 'final' : boss || en.big ? 'boss' : 'normal', boss || fin ? 'finalWin' : en.big ? 'bossWin' : 'win');
  const first = !won(no);
  const big = !boss && !fin && en.big;
  const stars = B.miss === 0 ? 3 : B.hearts * 2 >= B.maxH ? 2 : 1;
  const prev = S.stars[no] || 0;
  if (stars > prev) S.stars[no] = stars;
  let xp = first ? (fin ? XP.finalWin : boss ? XP.bossWin : big ? XP.bigWin : XP.quizWin) : XP.quizRetry;
  if (has('mage')) xp += XP.mage;
  const star3First = stars === 3 && prev < 3;
  if (star3First) xp += XP.star3;
  if (boss) S.boss = true; else S.ch[no] = Object.assign({}, S.ch[no], { win: true });
  if (first) S.justLit = no;
  save();
  const litMsg = first ? `<div class="ok-t">${fin ? '王国に本当の平和が戻った！' : boss ? '王国じゅうにあかりが戻った！' : CH(no).place + 'にあかりが戻った！'}</div>` : '';
  bmsg(`<div>${en.name}をやっつけた！</div>
    <div class="wstars">${'★'.repeat(stars)}<span>${'★'.repeat(3 - stars)}</span></div>
    <div class="ex">${stars === 3 ? 'ノーミス！パーフェクト！' : stars === 2 ? 'ハートを半分以上のこして勝った' : 'ギリギリの勝利！つぎはノーミスで★3をねらおう'}</div>
    ${litMsg}${first && !boss ? '<div class="ok-t">📮 郵便に手紙が届いた</div>' : ''}
    ${B.miss && has('scout') ? '<div class="ex">まちがえた問題は、修行場の「にがて克服」に集まったよ</div>' : ''}
    <div class="ok-t">けいけんち ＋${xp}${star3First ? '（★3ボーナスこみ）' : ''}</div>
    <button class="btn w go" onclick="winClose()">つづける</button>`);
  B.reward = { xp, first };
}
// 敵をたおしたら、主人公と仲間がぴょんぴょん喜ぶ（紙ふぶきと「やった！」）
function cheer() {
  const ar = $('#arena'), me = $('#me');
  if (!ar || !me || RM) return;
  [me, ...document.querySelectorAll('#party .pm')].forEach((el, i) => { el.style.animationDelay = (i * .14) + 's'; el.classList.add('cheer'); });
  const m = spot(me, .5, 0);
  setTimeout(() => fxAdd('fx-yatta', m.x, m.y - 4, '', 'やった！', 2600), 200);
  // 紙ふぶきは js/fx.js の qConfetti（小さな色紙がくるくる落ちる。スロットと同じ。2026-11-10）
}
function winClose() {
  const { no, boss, en, reward } = B;
  hideScene();
  const getXp = () => gain(boss ? 'boss' : 'quiz', reward.xp, boss ? `${en.name}をたおした` : `${stageName(no)}のクイズに勝った`);
  // 章の最後の敵をはじめてたおした：地図じゅうにあかりが戻る演出のあとで、経験値と賞状
  const pc = !reward.first ? 0 : boss ? 1 : partOf(no) > 1 && partDone(partOf(no)) ? partOf(no) : 0;
  if (pc) { partBloom(pc, no, () => { getXp(); afterChange(); partEnding(pc, boss ? null : no); }); return; }
  if (reward.first) TAB = 'map';
  getXp();
  afterChange();
  // ミッションが残っていたら、そのまま案内する（地図に戻るだけだと忘れてしまうため）
  if (!boss) setTimeout(() => { if (!$('#scene').classList.contains('show')) missionPrompt(no); }, reward.first ? 1500 : 0);
}
// ハートがなくなったら、主人公と仲間がばたんと倒れて目を回す（敵は勝ちほこって跳ねる・場面が暗くなる）
function downed() {
  const ar = $('#arena'), me = $('#me');
  if (!ar || !me) return;
  anim(ar, 'hurt'); quake();
  if (RM) { ar.classList.add('lost'); return; }
  // 前のめりにたおれたあとの頭の上（たおれる前の位置から計算する）
  const m = spot(me), hx = m.x - m.h * .36, hy = m.y - m.h * .12;
  [me, ...document.querySelectorAll('#party .pm')].forEach((el, i) => setTimeout(() => el.classList.add('down'), 150 + i * 120));
  setTimeout(() => { if (S && S.sound) se('bigHit', .5, .6); }, 700);
  const en = $('#enemy');
  setTimeout(() => { if (en && !en.classList.contains('still')) en.classList.add('gloat'); ar.classList.add('lost'); }, 600);
  setTimeout(() => {
    fxAdd('fx-dizzy', hx, hy, '', '<i>★</i><i>★</i><i>★</i>', 60000);
    fxAdd('fx-lost', null, null, '', 'やられた…', 60000);
  }, 1000);
}
function missionPrompt(no) {
  const ch = CH(no), m = ch.mission, p = missionProgress(m, no), st = S.ch[no] || {};
  if (m.type === 'none' || st.clear || p.cur >= p.n) return;
  modal(`<div class="lvup">のこりはミッション</div>
    ${sayHTML(ch.guide, `${ch.enemy.name}をたおしたね！このミッションをやりとげると、${ch.place}はクリアだよ`)}
    <div class="mtask">🎯 ${m.text}${p.n > 1 ? `<small>いま ${Math.min(p.cur, p.n)} / ${p.n}</small>` : ''}</div>
    <p class="muted center">クリアのごほうび：${rewardText(ch)}　＋${XP.chapterClear}</p>
    <button class="btn w grn" onclick="missionDo(${no})">${MISSION_BTN[m.type]}</button>
    <button class="btn sub w" style="margin-top:10px" onclick="closeModal()">あとでやる</button>`);
}
function battleLose() {
  if (!B) return;
  stopTimer(); stopBgm(); sfx('lose');
  downed();
  const no = B.no;
  bmsg(`<div>やられてしまった…</div><div class="ex">作戦会議をやり直したり、修行場でおさらいしたりしてから、もう一度ちょうせんしよう</div>
    <div class="grid2" style="margin-top:10px">
      <button class="btn sub" onclick="startBattle(${no === 'boss' ? "'boss'" : no})">もう一度</button>
      ${no === 'boss' ? `<button class="btn" onclick="closeScene()">地図へ</button>` : `<button class="btn" onclick="startLesson(${no})">作戦会議へ</button>`}
    </div>
    ${has('scout') && nigateIds().length ? `<button class="btn grn w" style="margin-top:10px" onclick="closeScene();go('guild')">修行場でにがてをおさらい</button>` : ''}`);
}
// 章をクリア：称号をもらって、賞状の画面を出す（スクショしてアップ（リーダー）に送る）
function partEnding(p, no) {
  const part = PARTS[p - 1];
  if (!S.badges.includes(part.badge)) S.badges.push(part.badge);
  S.shogo = S.shogo || {};
  const first = !S.shogo[p];
  if (first) S.shogo[p] = ymd();
  save();
  if (first) gain('part', XP.partClear, `${partLabel(p)}クリア`);
  // レベルアップなどのお知らせを閉じてから、賞状を出す（スクショのじゃまにならないように）
  const wait = () => { if (mOpen) { setTimeout(wait, 300); return; } sfx('join'); showCert(p, after); };
  const after = () => {
    // 金融基礎知識編（part 5）はほかの章とはべつなので、総まとめ編のつぎには出さない
    const next = p < 4 ? PARTS[p] : null;
    modal(`<div class="lvup">${partLabel(p)}クリア</div>
      <div class="center">${S.companions.map(id => `<img src="${COMPANIONS[id].img}" alt="" style="width:60px">`).join('')}</div>
      <p>${p === 4 ? 'すべての冒険' : `${partLabel(p)}「${part.title}」`}をやりとげて、称号「${part.shogo}」を手に入れた！</p>
      <p class="center"><span class="badge">${part.badge}</span>も手に入れた</p>
      ${next ? `<p>${next.story || (p === 1 ? '王国に新しい地図が届いた。' : '新しい地図が開いたよ。') + `次は${partLabel(next.no)}「${next.title}」`}</p>
      <button class="btn w" onclick="closeModal();MAP_PART=${next.no};go('map')">${partLabel(next.no)}へ</button>`
      : p === 5 ? `<p>お金のしくみの基本をマスターした！お客様に話す前に、修行場でときどきおさらいしよう</p>
      <button class="btn w" onclick="closeModal();go('home')">ホームへ</button>`
      : `<p>すべての章をクリア！ここからは修行場で毎日おさらいして、伝説のワンコを目指そう</p>
      <button class="btn w" onclick="closeModal();go('home')">ホームへ</button>`}`);
    // 最後のステージのミッションが残っていたら、そのあとに案内する
    if (no) missionPrompt(no);
  };
  wait();
}
// 章を全部クリアしたとき：地図じゅうにあかりが戻って、きらきら光る（タップでつぎへ）
let FX = false;
function partBloom(p, no, next) {
  FX = true; stopBgm();
  MAP_PART = p; TAB = 'map'; render(); window.scrollTo(0, 0);
  const [x, y] = p === 1 ? MAP_POS.boss : MAP_POS[no];
  const img = $('.worldmap .lit.all');
  if (img && img.animate && !RM) {
    const c0 = `circle(0% at ${x}% ${y}%)`, c1 = `circle(150% at ${x}% ${y}%)`;
    // 総まとめ編の地図は色を変えてあるので、その色に重ねて光らせる
    const f = getComputedStyle(img).filter, f1 = f === 'none' ? '' : f + ' ';
    img.animate([{ clipPath: c0, webkitClipPath: c0, filter: f1 + 'brightness(2.4) saturate(1.5)' }, { clipPath: `circle(60% at ${x}% ${y}%)`, webkitClipPath: `circle(60% at ${x}% ${y}%)`, filter: f1 + 'brightness(1.4) saturate(1.2)', offset: .7 }, { clipPath: c1, webkitClipPath: c1, filter: f }],
      { duration: 2800, delay: 300, easing: 'cubic-bezier(.3,.1,.3,1)', fill: 'backwards' });
  }
  sfxFanfare();
  const msg = p === 1 ? '王国じゅうにあかりが戻った！' : p === 4 ? '王国に本当の平和が戻った！' : `${PARTS[p - 1].title}の地図に、すべてのあかりが戻った！`;
  const r = () => Math.random();
  const ov = document.createElement('div');
  ov.className = 'pclear';
  ov.innerHTML = Array.from({ length: 30 }, () => `<i style="left:${(r() * 96).toFixed(1)}%;top:${(8 + r() * 84).toFixed(1)}%;font-size:${(12 + r() * 22).toFixed(0)}px;animation-delay:${(r() * 2.6).toFixed(2)}s">✦</i>`).join('')
    + `<div class="pcb"><b>${partLabel(p)}クリア</b><span>${msg}</span><em>タップしてつぎへ</em></div>`;
  document.body.appendChild(ov);
  const t0 = Date.now();
  ov.onclick = () => { if (Date.now() - t0 < 2800) return; ov.remove(); FX = false; next(); };
}
// 賞状の画面（宿屋からも見られる）
let CERT_DONE = null;
function showCert(p, after) {
  const part = PARTS[p - 1], day = (S.shogo && S.shogo[p]) || ymd();
  const cleared = CHAPTERS.filter(c => won(c.no)).length + (S.boss ? 1 : 0);
  CERT_DONE = after || null;
  const sc = $('#scene');
  sc.className = 'scene show cert';
  sc.onclick = null;
  sc.innerHTML = `<div class="certwrap">
    <div class="certcard">
      <div class="ctop">${partLabel(p)}クリア</div>
      <div class="cpart">${p === 4 ? 'すべての冒険をやりとげた' : part.title}</div>
      <div class="chero"><i class="ray"></i><img src="${heroImg()}" alt=""></div>
      <div class="cname">${esc(S.name)}</div>
      <div class="cshogo"><small>称号</small>${part.shogo}</div>
      <div class="cstats"><span>Lv${levelInfo().lv}</span><span>クリアしたステージ ${cleared}</span><span>仲間 ${S.companions.length}匹</span></div>
      <div class="cpals">${S.companions.map(id => `<img src="${COMPANIONS[id].img}" alt="">`).join('')}</div>
      <div class="cdate">${day.replace(/-/g, '.')}　わんこビジネスクエスト</div>
    </div>
    <div class="chint">📸 スクショして、アップ（リーダー）に送ろう！</div>
    <button class="btn w" onclick="closeCert()">${after ? 'つぎへ' : 'とじる'}</button>
  </div>`;
}
function closeCert() { const f = CERT_DONE; CERT_DONE = null; hideScene(); afterChange(); if (f) f(); }

// ================= はじまり =================
// 開いたときの「はじめる」画面。ホームに入る前に「BGMも楽しみながら」と伝え、このタップで曲を鳴らしはじめる（2026-11-05 本人の指示）
function showStart() {
  STARTING = true;
  const d = document.createElement('div');
  d.id = 'start'; d.className = 'start';
  d.innerHTML = `<div class="stbox">
      <div class="titlehero"><img class="tbg" src="img/title.webp" alt="" onerror="this.remove()"><div class="tlogo">わんこ<br>ビジネスクエスト</div></div>
      <div class="stin">
        ${!TAIKAI && taikaiToday() ? `<button class="btn w taikaibtn" onclick="enterTaikai()">🏆 大会モードではじめる</button>
        <p class="muted" style="text-align:center;margin:6px 0 14px">今日のチーム対抗戦はこちら<br>いつもの記録は消えません</p>` : ''}
        ${TAIKAI ? `<p style="text-align:center;margin:0 0 10px"><span class="demo taikai" style="font-size:14px;padding:2px 10px">大会モード</span></p>` : ''}
        ${!PASS_HOST ? `<div style="background:#fff3d6;border:3px solid var(--gold2);border-radius:10px;padding:10px;margin:0 0 12px;text-align:center">
          <b style="font-weight:normal;font-size:16px">🏠 新しい場所に引っ越しました</b>
          <p style="margin:4px 0 8px;font-size:13px;line-height:1.5">新しい場所では、名前と合言葉で<br>どのスマホからでも続きから遊べます</p>
          <button class="btn grn w" onclick="moveOut()">${S ? '記録ごと新しい場所へ' : '新しい場所を開く'}</button></div>` : ''}
        ${sayHTML('mage', 'BGMも楽しみながらやってみてね！')}
        <button class="btn w grn" onclick="startTap(true)">🔊 音を出してはじめる</button>
        <button class="btn sub w" onclick="startTap(false)">音なしではじめる</button>
        <p class="muted" style="text-align:center;margin:10px 0 0">音が出ないときは、マナーモードを切ってね</p>
      </div></div>`;
  document.body.appendChild(d);
}
function startTap(on) {
  STARTING = false; START_SND = on;
  const d = $('#start'); if (d) d.remove();
  if (S) { S.sound = on; S.music = on; save(); }
  if (on) ensureAC(); else stopBgm();
  render(); sfx('tap');
  // 新しい場所（合言葉が使える）：合言葉をまだ決めていない人に1回だけ聞く
  if (PASS_HOST) { if (S && !TAIKAI && !(CLOUD && CLOUD.kind === 'pass') && !passGet() && !S.passAsk) passSetup(); return; }
  // 前から遊んでいる人には、記録の残しかたを1回だけお知らせする
  if (S && S.howto && !S.saveTip) saveTip();
}
// ガイドから戻ってきた（3時間以内）なら、開く前の画面とスクロール位置に戻す（このときは「はじめる」画面を出さない）
const BACK = S && S.back;
if (BACK) { S.back = null; save(); if (Date.now() - BACK.t < 3 * 3600e3) TAB = BACK.tab; }
if (!BACK) showStart();
render();
if (BACK && TAB === BACK.tab && BACK.y) setTimeout(() => window.scrollTo(0, BACK.y), 80);
if (DEMO_MSG) setTimeout(() => toast(DEMO_MSG), 300);
if (TAIKAI_MSG) setTimeout(() => toast(TAIKAI_MSG), 300);
// 前の場所（アーティファクト）から「記録ごと新しい場所へ」で来たときは、URL の #import= の記録を読みこむ
// それから外の記録（合言葉・Claude のアカウント）とつなぐ
(async () => {
  const m = PASS_HOST && location.hash.match(/[#&]import=([\w-]+)/);
  if (m) {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    if (await codeImportGo(m[1], true)) { render(); setTimeout(() => toast(`おかえり、${S.name}！記録を引っ越しました`), 300); }
  }
  cloudInit();
})();
