/**
 * mbti-page.js — mbti.html 頁面邏輯
 * 兩種入口：直接選型別 / 20 題小測驗；結果存 localStorage，結果頁自動讀取。
 */

import { QUESTIONS, TYPES } from './data/mbti-data.js';
import { loadMbti, saveMbti, clearMbti, scoreAnswers, renderTypeCard } from './engines/mbti.js';

const $ = (id) => document.getElementById(id);

let answers = [];
let step = 0;

function showMode(mode) {
  $('mbti-pick').style.display = mode === 'pick' ? '' : 'none';
  $('mbti-test').style.display = mode === 'test' ? '' : 'none';
  $('mode-pick').classList.toggle('active', mode === 'pick');
  $('mode-test').classList.toggle('active', mode === 'test');
  if (mode === 'test') startTest();
}

// ---------- 結果 ----------

function showResult(type, scores) {
  $('mbti-entry').style.display = 'none';
  $('mbti-result').innerHTML =
    renderTypeCard(type, scores) +
    `<div class="mbti-actions">
       <a class="btn-primary" href="result.html">看我的命盤 × MBTI ✦</a>
       <button type="button" class="btn-ghost" id="mbti-redo">重新選擇／重測</button>
     </div>
     <div class="mbti-note">結果已存在這台裝置，命盤結果頁會自動加入「MBTI」分頁與交叉解讀。</div>`;
  $('mbti-result').style.display = '';
  $('mbti-redo').addEventListener('click', () => {
    clearMbti();
    $('mbti-result').style.display = 'none';
    $('mbti-result').innerHTML = '';
    $('mbti-entry').style.display = '';
    showMode('pick');
  });
  $('mbti-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- 直接選型別 ----------

function buildPicker() {
  $('mbti-grid').innerHTML = Object.keys(TYPES).map(k =>
    `<button type="button" class="mbti-type-btn" data-type="${k}"><b>${k}</b><small>${TYPES[k].name}</small></button>`
  ).join('');
  $('mbti-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-type]');
    if (!btn) return;
    const type = btn.dataset.type;
    saveMbti(type, 'pick');
    showResult(type, null);
  });
}

// ---------- 小測驗 ----------

function startTest() {
  answers = [];
  step = 0;
  renderQuestion();
}

function renderQuestion() {
  const total = QUESTIONS.length;
  if (step >= total) { finishTest(); return; }
  const q = QUESTIONS[step];
  $('mbti-progress-bar').style.width = `${Math.round((step / total) * 100)}%`;
  $('mbti-progress-text').textContent = `第 ${step + 1} / ${total} 題`;
  $('mbti-q').textContent = q.q;
  const box = $('mbti-options');
  box.innerHTML = '';
  [q.A, q.B].forEach(opt => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mbti-opt';
    b.textContent = opt.t;
    b.addEventListener('click', () => { answers[step] = opt.v; step += 1; renderQuestion(); });
    box.appendChild(b);
  });
  $('mbti-back').style.visibility = step === 0 ? 'hidden' : 'visible';
}

function finishTest() {
  const { type, scores } = scoreAnswers(answers);
  saveMbti(type, 'test', scores);
  showResult(type, scores);
}

// ---------- 初始化 ----------

document.addEventListener('DOMContentLoaded', () => {
  buildPicker();
  $('mode-pick').addEventListener('click', () => showMode('pick'));
  $('mode-test').addEventListener('click', () => showMode('test'));
  $('mbti-back').addEventListener('click', () => {
    if (step > 0) { step -= 1; answers.length = step; renderQuestion(); }
  });

  const saved = loadMbti();
  if (saved) showResult(saved.type, saved.scores);
  else showMode('pick');
});
