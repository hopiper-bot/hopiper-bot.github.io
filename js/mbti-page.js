/**
 * mbti-page.js — mbti.html 頁面邏輯（v3）
 * 入口：直接選型別（可附 -A/-T）／40 題五段式測驗
 * 候選比較：測驗只負責縮小範圍，列出 2～4 個可能型別，
 *           逐段讀描述選「最像我」，最後由使用者決定（最適型別 best-fit）。
 * 結果存 localStorage，結果頁自動讀取。
 */

// ?v= 要跟 engines/mbti.js、main.js 裡的版本一致，否則會載到兩份不同的模組
import { QUESTIONS, ORDER, TYPES, SCALE, FUNCS, AXES } from './data/mbti-data.js?v=3';
import {
  loadMbti, saveMbti, clearMbti, scoreAnswers, renderTypeCard, candidatesFrom,
} from './engines/mbti.js?v=4';

const $ = (id) => document.getElementById(id);

let answers = [];
let step = 0;
let pickId = null;     // 選型別時的 -A/-T（null = 不確定）
let lastResult = null; // 上一次的結果（平手參考、候選比較用；清除儲存後仍保留在記憶體）

const SCREENS = ['mbti-entry', 'mbti-compare', 'mbti-result'];
function showScreen(id, scroll = true) {
  SCREENS.forEach(s => { $(s).style.display = s === id ? '' : 'none'; });
  if (scroll) $(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showMode(mode) {
  $('mbti-pick').style.display = mode === 'pick' ? '' : 'none';
  $('mbti-test').style.display = mode === 'test' ? '' : 'none';
  $('mode-pick').classList.toggle('active', mode === 'pick');
  $('mode-test').classList.toggle('active', mode === 'test');
  if (mode === 'test') startTest();
}

// ---------- 結果 ----------

function showResult(type, scores, id, scroll = true) {
  $('mbti-result').innerHTML =
    renderTypeCard(type, scores, id) +
    `<div class="mbti-actions">
       <a class="btn-primary" href="result.html">看我的命盤 × MBTI ✦</a>
       <button type="button" class="btn-ghost" id="mbti-cmp-open">覺得不太像？跟其他型別比較</button>
       <button type="button" class="btn-ghost" id="mbti-redo">重新選擇／重測</button>
     </div>
     <div class="mbti-note">結果已存在這台裝置，命盤結果頁會自動加入「MBTI」分頁與交叉解讀。</div>`;
  showScreen('mbti-result', scroll);
  $('mbti-redo').addEventListener('click', () => {
    lastResult = loadMbti() || lastResult;
    clearMbti();
    $('mbti-result').innerHTML = '';
    showScreen('mbti-entry');
    showMode('pick');
  });
  $('mbti-cmp-open').addEventListener('click', () => {
    openCompare(candidatesFrom(type, scores), { scores, id, testType: null });
  });
}

// ---------- 直接選型別 ----------

function buildPicker() {
  $('mbti-id-row').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-id]');
    if (!btn) return;
    pickId = btn.dataset.id || null;
    $('mbti-id-row').querySelectorAll('[data-id]').forEach(b => b.classList.toggle('active', b === btn));
  });

  $('mbti-grid').innerHTML = Object.keys(TYPES).map(k =>
    `<button type="button" class="mbti-type-btn" data-type="${k}"><b>${k}</b><small>${TYPES[k].name}</small></button>`
  ).join('');
  $('mbti-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-type]');
    if (!btn) return;
    const type = btn.dataset.type;
    saveMbti(type, 'pick', null, pickId);
    showResult(type, null, pickId);
  });
}

// ---------- 五段式測驗 ----------

function startTest() {
  answers = [];
  step = 0;
  renderQuestion();
}

function renderQuestion() {
  const total = ORDER.length;
  if (step >= total) { finishTest(); return; }
  const qi = ORDER[step]; // 實際題目索引（五軸輪流出題）
  const q = QUESTIONS[qi];
  $('mbti-progress-bar').style.width = `${Math.round((step / total) * 100)}%`;
  $('mbti-progress-text').textContent = `第 ${step + 1} / ${total} 題`;
  $('mbti-q').innerHTML =
    `<div>${q.q}</div>
     <div class="mbti-pair"><div class="mbti-side"><span>左</span>${q.L}</div><div class="mbti-side"><span>右</span>${q.R}</div></div>`;
  const box = $('mbti-options');
  box.innerHTML = '';
  SCALE.forEach(s => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mbti-opt' + (answers[qi] === s.v ? ' picked' : '');
    const hint = s.v > 0 ? q.L : s.v < 0 ? q.R : '兩邊都有';
    b.innerHTML = `<b>${s.label}</b><small>${hint}</small>`;
    b.addEventListener('click', () => { answers[qi] = s.v; step += 1; renderQuestion(); });
    box.appendChild(b);
  });
  $('mbti-back').style.visibility = step === 0 ? 'hidden' : 'visible';
}

function finishTest() {
  const { type, id, scores } = scoreAnswers(answers, lastResult);
  const extra = lastResult?.type ? [lastResult.type] : [];
  const cands = candidatesFrom(type, scores, extra);
  if (cands.length >= 2) {
    openCompare(cands, { scores, id, testType: type });
  } else {
    saveMbti(type, 'test', scores, id);
    showResult(type, scores, id);
  }
}

// ---------- 候選比較 ----------

const SECTIONS = [
  { key: 'sum', title: '核心性格', get: t => `<p>${t.sum}</p>` },
  { key: 'pros', title: '天賦優勢', get: t => ul(t.pros) },
  { key: 'cons', title: '容易卡住的地方', get: t => ul(t.cons) },
  { key: 'stress', title: '壓力大時', get: t => `<p>${FUNCS[t.stack.split('-')[3]]?.inf || ''}</p>` },
  { key: 'comm', title: '溝通方式', get: t => `<p>${t.comm}</p>` },
  { key: 'work', title: '工作風格', get: t => `<p>${t.work}</p>` },
  { key: 'love', title: '親密關係', get: t => `<p>${t.love}</p>` },
];
const NONE = '__none__';

function ul(items) { return `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`; }

/**
 * cmp.types：候選（已打亂順序）
 * cmp.votes：{ sectionKey: type | NONE }
 * cmp.blind：是否隱藏型別名稱（避免被名稱先入為主）
 * cmp.ctx：{ scores, id, testType } 測驗資料，存檔時一起保留
 */
let cmp = null;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function openCompare(types, ctx) {
  cmp = { types: shuffle(types), votes: {}, blind: true, ctx };
  renderCompare();
  showScreen('mbti-compare');
}

const tagOf = (i) => `候選 ${'ABCD'[i]}`;
function labelOf(type, i) {
  return cmp.blind ? tagOf(i) : `${tagOf(i)}・${type} ${TYPES[type].name}`;
}

function tally() {
  const c = {};
  cmp.types.forEach(t => { c[t] = 0; });
  Object.values(cmp.votes).forEach(v => { if (v in c) c[v] += 1; });
  return c;
}

/** 兩個型別差在哪幾軸 → 「外向 vs 內向」 */
function diffText(a, b) {
  return AXES.slice(0, 4)
    .map((ax, i) => (a[i] !== b[i] ? `${a[i] === ax.a ? ax.aZh : ax.bZh} vs ${b[i] === ax.a ? ax.aZh : ax.bZh}` : null))
    .filter(Boolean).join('、');
}

function renderCompare() {
  const { types, votes, blind, ctx } = cmp;
  const answered = SECTIONS.filter(s => votes[s.key]).length;
  const counts = tally();
  const ranked = types.slice().sort((x, y) => counts[y] - counts[x]);
  const top = ranked[0];
  const others = Object.keys(TYPES).filter(t => !types.includes(t));

  const head = `
    <div class="sig"><div class="kin">BEST-FIT TYPE</div><div class="big" style="font-size:1.3rem;">🔍 候選比較</div></div>
    <div class="mbti-tip">${ctx.testType ? `測驗算出來是 <b>${blind ? '其中一個候選' : ctx.testType}</b>，但有幾軸很接近中間。` : ''}
      下面每一段都有 ${types.length} 種描述，<b>選最像平常的你</b>的那個；都不像就按「都不像」。
      型別名稱先藏起來，避免被名字影響。</div>
    <div class="cmp-tools">
      <button type="button" class="btn-ghost" data-act="blind">${blind ? '👁 顯示型別名稱' : '🙈 隱藏型別名稱'}</button>
      ${types.length < 4 ? `<select data-act="add" aria-label="加入其他型別比較"><option value="">＋ 加入其他型別</option>${others.map(t => `<option value="${t}">${t} ${TYPES[t].name}</option>`).join('')}</select>` : ''}
    </div>`;

  const secs = SECTIONS.map(s => `
    <div class="cmp-sec">
      <div class="cmp-title">${s.title}${votes[s.key] ? ' <span class="cmp-done">✓</span>' : ''}</div>
      <div class="cmp-row">
        ${types.map((t, i) => `
          <div class="cmp-card${votes[s.key] === t ? ' on' : ''}" role="button" tabindex="0" data-sec="${s.key}" data-type="${t}">
            <span class="cmp-tag">${labelOf(t, i)}</span>${s.get(TYPES[t])}
            <span class="cmp-pick">${votes[s.key] === t ? '✓ 像我' : '這個像我'}</span>
          </div>`).join('')}
      </div>
      <button type="button" class="cmp-none${votes[s.key] === NONE ? ' on' : ''}" data-sec="${s.key}" data-type="${NONE}">都不像</button>
    </div>`).join('');

  const bars = ranked.map(t => {
    const i = types.indexOf(t);
    const pct = answered ? Math.round((counts[t] / SECTIONS.length) * 100) : 0;
    return `<div class="cmp-bar"><span>${labelOf(t, i)}</span><div><i style="width:${pct}%"></i></div><b>${counts[t]}</b></div>`;
  }).join('');

  const second = ranked[1];
  const close = second && counts[top] - counts[second] <= 1 && answered >= 3;
  const summary = `
    <div class="cmp-summary">
      <div style="font-weight:700;margin-bottom:6px;">目前統計（已選 ${answered} / ${SECTIONS.length} 段）</div>
      ${bars}
      ${blind
        ? `<button type="button" class="btn-primary" data-act="reveal" ${answered < SECTIONS.length ? 'style="opacity:.75"' : ''}>揭曉並選擇 ✦</button>
           ${answered < SECTIONS.length ? '<div class="mbti-note">建議每一段都選完再揭曉，結果比較準。</div>' : ''}`
        : `${close ? `<div class="mbti-note" style="text-align:left;">前兩名很接近，差別在：<b>${diffText(top, second)}</b>。想想哪一邊是你「不用刻意」就會做的。</div>` : ''}
           <div class="cmp-confirm">${ranked.map(t => `<button type="button" class="${t === top && counts[t] > 0 ? 'btn-primary' : 'btn-ghost'}" data-act="choose" data-type="${t}">就是 ${t} ${TYPES[t].name}（${counts[t]} 票）</button>`).join('')}</div>`}
      ${ctx.testType ? `<button type="button" class="cmp-skip" data-act="skip">不比了，直接用測驗結果</button>` : `<button type="button" class="cmp-skip" data-act="cancel">返回</button>`}
    </div>`;

  $('mbti-compare').innerHTML = head + secs + summary;
}

function onCompareClick(e) {
  if (!cmp) return;
  const act = e.target.closest('[data-act]');
  if (act && act.tagName !== 'SELECT') {
    const a = act.dataset.act;
    if (a === 'blind' || a === 'reveal') { cmp.blind = a === 'reveal' ? false : !cmp.blind; renderCompare(); return; }
    if (a === 'choose') { chooseType(act.dataset.type); return; }
    if (a === 'skip') { chooseType(cmp.ctx.testType, 'test'); return; }
    if (a === 'cancel') {
      const s = loadMbti();
      if (s) showResult(s.type, s.scores, s.id); else showScreen('mbti-entry');
      return;
    }
  }
  const card = e.target.closest('[data-sec]');
  if (!card) return;
  const { sec, type } = card.dataset;
  cmp.votes[sec] = cmp.votes[sec] === type ? undefined : type; // 再點一次取消
  if (!cmp.votes[sec]) delete cmp.votes[sec];
  const y = window.scrollY;
  renderCompare();
  window.scrollTo(0, y); // 重畫後保持捲動位置
}

function chooseType(type, src = 'fit') {
  if (!TYPES[type]) return;
  const { scores, id } = cmp.ctx;
  saveMbti(type, src, scores, id);
  cmp = null;
  showResult(type, scores, id);
}

// ---------- 初始化 ----------

document.addEventListener('DOMContentLoaded', () => {
  buildPicker();
  $('mode-pick').addEventListener('click', () => showMode('pick'));
  $('mode-test').addEventListener('click', () => showMode('test'));
  $('mbti-back').addEventListener('click', () => {
    if (step > 0) { step -= 1; renderQuestion(); }
  });

  const box = $('mbti-compare');
  box.addEventListener('click', onCompareClick);
  box.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.cmp-card')) { e.preventDefault(); onCompareClick(e); }
  });
  box.addEventListener('change', (e) => {
    const sel = e.target.closest('select[data-act="add"]');
    if (!sel || !sel.value || !cmp) return;
    if (!cmp.types.includes(sel.value) && cmp.types.length < 4) cmp.types.push(sel.value);
    renderCompare();
  });

  const saved = loadMbti();
  lastResult = saved;
  if (saved) showResult(saved.type, saved.scores, saved.id, false);
  else { showScreen('mbti-entry', false); showMode('pick'); }
});
