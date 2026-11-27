/**
 * mbti.js — MBTI 引擎
 * - 測驗計分、型別儲存（localStorage: destiny_mbti）
 * - 渲染型別解讀卡片
 * - 與八字／人類圖／星座交叉對照（觀察角度，非科學對應）
 */

import { AXES, QUESTIONS, TYPES, ELEMENT_HINT } from '../data/mbti-data.js';

const STORE_KEY = 'destiny_mbti';

// ============ 儲存 ============

export function isValidType(t) {
  return typeof t === 'string' && Object.prototype.hasOwnProperty.call(TYPES, t);
}

/** 讀取已存的 MBTI；沒有或格式不對回 null */
export function loadMbti() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (d && isValidType(d.type)) return d;
  } catch (e) { /* ignore */ }
  return null;
}

/** 儲存 MBTI。src: 'pick' | 'test'；scores 為測驗各字母得分（選填） */
export function saveMbti(type, src = 'pick', scores = null) {
  if (!isValidType(type)) return false;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ type, src, scores, ts: Date.now() }));
    // 結果頁的快取只存 HTML，MBTI 另外即時渲染，不需清快取
    return true;
  } catch (e) { return false; }
}

export function clearMbti() {
  try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
}

// ============ 測驗計分 ============

/**
 * @param {string[]} answers 長度 = QUESTIONS.length，每項為該題選到的字母（如 'E'）
 * @returns {{type:string, scores:Object}} scores 例：{E:3,I:2,S:4,N:1,...}
 */
export function scoreAnswers(answers) {
  const scores = {};
  AXES.forEach(a => { scores[a.a] = 0; scores[a.b] = 0; });
  answers.forEach(v => { if (v in scores) scores[v] += 1; });
  // 每軸 5 題，不會平手；保險起見平手時取第一個字母
  const type = AXES.map(a => (scores[a.b] > scores[a.a] ? a.b : a.a)).join('');
  return { type, scores };
}

// ============ 渲染 ============

const BOX = 'padding:14px;border-radius:10px;margin-top:12px;';
const SOFT = 'background:rgba(123,108,246,.07);';
const WARM = 'background:rgba(245,197,66,.08);';

function list(items) {
  return `<ul style="margin:6px 0 0;padding-left:1.2em;line-height:1.9;font-size:.86rem;">${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
}

/** 四軸傾向條（測驗結果有分數時才畫） */
export function renderAxisBars(scores) {
  if (!scores) return '';
  const total = QUESTIONS.length / AXES.length; // 每軸題數
  return AXES.map(a => {
    const l = scores[a.a] || 0;
    const r = scores[a.b] || 0;
    const lp = Math.round((l / total) * 100);
    const rp = 100 - lp;
    const leftWins = l >= r;
    return `<div style="display:flex;align-items:center;gap:8px;margin:6px 0;font-size:.8rem;">
      <span style="width:52px;text-align:right;${leftWins ? 'font-weight:700;color:var(--accent);' : 'color:var(--muted);'}">${a.aZh} ${a.a}</span>
      <div style="flex:1;height:12px;background:rgba(255,255,255,.07);border-radius:6px;overflow:hidden;display:flex;">
        <div style="width:${lp}%;background:${leftWins ? 'var(--accent)' : 'rgba(255,255,255,.18)'};"></div>
        <div style="width:${rp}%;background:${leftWins ? 'rgba(255,255,255,.18)' : 'var(--accent)'};"></div>
      </div>
      <span style="width:52px;${leftWins ? 'color:var(--muted);' : 'font-weight:700;color:var(--accent);'}">${a.b} ${a.bZh}</span>
    </div>`;
  }).join('');
}

/** 型別解讀卡片 */
export function renderTypeCard(type, scores = null) {
  const t = TYPES[type];
  if (!t) return '';
  return `
    <div class="sig">
      <div class="kin">MBTI・${t.stack}</div>
      <div class="big" style="font-size:1.6rem;letter-spacing:.08em;">${type}</div>
      <div style="font-size:.95rem;margin-top:4px;">${t.name}</div>
    </div>
    ${renderAxisBars(scores)}
    <div class="meaning" style="margin-top:12px;line-height:1.9;">${t.sum}</div>
    <div style="${BOX}${SOFT}"><b>✦ 天賦優勢</b>${list(t.pros)}</div>
    <div style="${BOX}${SOFT}"><b>⚠ 容易卡住的地方</b>${list(t.cons)}</div>
    <div style="${BOX}${SOFT}"><b>💼 工作風格</b><div style="font-size:.86rem;line-height:1.9;margin-top:6px;">${t.work}</div></div>
    <div style="${BOX}${SOFT}"><b>💗 親密關係</b><div style="font-size:.86rem;line-height:1.9;margin-top:6px;">${t.love}</div></div>
    <div style="${BOX}${WARM}"><b>🔮 近期運勢建議</b><div style="font-size:.86rem;line-height:1.9;margin-top:6px;">${t.luck}</div></div>`;
}

// ============ 命盤交叉對照 ============

const SIGN_ELEMENT = [
  ['牡羊', '火'], ['獅子', '火'], ['射手', '火'],
  ['金牛', '土'], ['處女', '土'], ['摩羯', '土'],
  ['雙子', '風'], ['天秤', '風'], ['水瓶', '風'],
  ['巨蟹', '水'], ['天蠍', '水'], ['雙魚', '水'],
];

function signElement(zh) {
  const hit = SIGN_ELEMENT.find(([k]) => (zh || '').includes(k));
  return hit ? hit[1] : null;
}

/** 八字：身強弱 × 內外向，加上用神行動建議 */
function crossBazi(type, data) {
  const ys = data?.yongshen;
  if (!ys) return null;
  const ext = type[0] === 'E';
  const lines = [];
  const lvl = ys.strengthLevel || (ys.strength === '身強' ? 'strong' : ys.strength === '身弱' ? 'weak' : 'neutral');
  const dm = `日主${data.dayMasterElem}${ys.strength || ''}`;
  if (lvl === 'strong') {
    lines.push(ext
      ? `${dm}，氣勢足，加上外向的 ${type}：你的能量天生往外走，適合擔綱、帶頭，但要留意壓過別人的聲音。`
      : `${dm}，內在能量其實很足，但 ${type} 的你習慣內斂：實力比外界看到的多，值得更主動展現。`);
  } else if (lvl === 'weak') {
    lines.push(ext
      ? `${dm}，需要補給，但外向的 ${type} 容易社交到耗盡：熱鬧之後安排固定的休息，才不會透支。`
      : `${dm}，需要支撐；內向的 ${type} 本來就懂得保存能量，找對的貴人與可靠夥伴，會比單打獨鬥走得遠。`);
  } else {
    lines.push(`${dm}，五行大致平衡；${type} 的特質可以依場合調整，彈性是你的優勢。`);
  }
  const el = ys.yongshen;
  if (el && ELEMENT_HINT[el]) {
    lines.push(`用神「${el}」代表${ELEMENT_HINT[el]}。對 ${type} 來說，具體做法是：${elementAction(el, type)}`);
  }
  return { title: '🀄 八字 × MBTI', lines };
}

function elementAction(el, type) {
  const ext = type[0] === 'E';
  const map = {
    '木': ext ? '多參加新的聚會或課程，把人脈與學習一起拓展。' : '固定安排閱讀或線上學習，一點一點讓視野長大。',
    '火': ext ? '多上台、多發聲，把想法大方地讓人看見。' : '挑一個小範圍的表達管道（寫作、作品），讓自己被看見。',
    '土': ext ? '讓社交圈沉澱下來，經營少數長期關係與固定節奏。' : '建立穩定的日常節奏與存款、居住等安全感的基礎。',
    '金': ext ? '社交上練習取捨，把時間留給真正重要的場合與人。' : '把想法整理成清楚的規則與清單，讓決斷更俐落。',
    '水': ext ? '社交之間安排留白與獨處，讓直覺與智慧有時間浮現。' : '多給自己安靜與流動的時間（散步、泡澡、旅行），靈感會自己來。',
  };
  return map[el] || '';
}

/** 人類圖：策略 × MBTI 的 J/P、E/I */
function crossHd(type, data) {
  const ht = data?.typeInfo?.type;
  if (!ht) return null;
  const ext = type[0] === 'E';
  const judge = type[3] === 'J';
  const zh = data.typeInfo.zh;
  let line;
  if (ht === 'G' || ht === 'MG') {
    line = judge
      ? `人類圖是「${zh}」，策略是先回應再行動；而 ${type} 偏愛先規劃、主動推進。建議計畫留出空檔，優先做「有感覺、有回應」的事，效率會更高。`
      : `人類圖是「${zh}」，策略是回應；${type} 本來就順勢而為。兩者同向：跟著當下有感覺的方向走，通常最順。`;
  } else if (ht === 'P') {
    line = ext
      ? `人類圖是「${zh}」，策略是等邀請；外向的 ${type} 很想主動出擊。與其硬衝，不如先讓人看見你的專長，再等對的邀請。`
      : `人類圖是「${zh}」，需要被看見、被邀請；內向的 ${type} 偏安靜，更要用作品或專業讓對的人找到你。`;
  } else if (ht === 'M') {
    line = judge
      ? `人類圖是「${zh}」，策略是先告知再行動；${type} 本來就有決斷力。行動前多一句告知，阻力會少很多。`
      : `人類圖是「${zh}」，策略是先告知；${type} 偏彈性，臨時起意時記得讓身邊的人知道你要做什麼。`;
  } else if (ht === 'R') {
    line = judge
      ? `人類圖是「${zh}」，重大決定適合等一個月循環；${type} 習慣快速定案。重要選擇試著多給自己一段觀察期。`
      : `人類圖是「${zh}」，重大決定適合等一個月循環；${type} 的彈性很搭，放心多觀察再下決定。`;
  } else {
    return null;
  }
  return { title: '🧭 人類圖 × MBTI', lines: [line] };
}

/** 星座：太陽星座元素 × 四個字母 */
function crossAstro(type, data) {
  const zh = data?.sunSign?.zh;
  const el = signElement(zh);
  if (!zh || !el) return null;
  const [ei, sn, tf, jp] = type.split('');
  const hits = [];
  if (el === '火' && (ei === 'E' || sn === 'N')) hits.push('火象的熱情與你的外向／直覺方向一致');
  if (el === '風' && (tf === 'T' || ei === 'E')) hits.push('風象的思辨與社交性，和你的思考或外向特質相呼應');
  if (el === '水' && (tf === 'F' || ei === 'I')) hits.push('水象的細膩與你的情感或內向特質相呼應');
  if (el === '土' && (sn === 'S' || jp === 'J')) hits.push('土象的務實與你的實感或規劃傾向一致');
  const line = hits.length
    ? `太陽${zh}（${el}象）：${hits.join('；')}，內外風格比較一致，別人看到的你和你認識的自己差距不大。`
    : `太陽${zh}（${el}象）與 ${type} 的風格有些反差，這代表你有兩種面向可以切換：${el}象的底色加上 ${type} 的處事方式，是你獨特的組合。`;
  return { title: '🪐 星座 × MBTI', lines: [line] };
}

/** 取得可用的交叉對照區塊 */
export function buildCross(type, results = {}) {
  const ok = k => (results[k]?.status === 'ok' ? results[k].data : null);
  return [
    crossBazi(type, ok('bazi')),
    crossHd(type, ok('hd')),
    crossAstro(type, ok('astro')),
  ].filter(Boolean);
}

function renderCross(blocks) {
  return blocks.map(b => `
    <div style="${BOX}${SOFT}">
      <b>${b.title}</b>
      <div style="font-size:.85rem;line-height:1.9;margin-top:6px;">${b.lines.join('<br>')}</div>
    </div>`).join('');
}

// ============ 結果頁 Tab / 劇本大綱 ============

const NOTE = '<div style="font-size:.72rem;color:var(--muted);margin-top:14px;line-height:1.7;">交叉對照是依各系統特徵做的觀察角度，不是科學上的一對一對應。MBTI 為自我探索工具，非臨床評估。</div>';

/** MBTI tab 完整內容 */
export function renderMbtiTab(results) {
  const saved = loadMbti();
  if (!saved) {
    return `<div class="placeholder" style="line-height:2;">還沒有你的 MBTI。<br>
      <a href="mbti.html" class="btn-primary" style="display:inline-block;text-decoration:none;margin-top:10px;">做 20 題小測驗，或直接選你的型別 ✦</a></div>`;
  }
  const cross = buildCross(saved.type, results);
  return renderTypeCard(saved.type, saved.scores) +
    (cross.length ? `<div style="margin-top:18px;font-weight:700;">🔗 與你的命盤交叉對照</div>${renderCross(cross)}` : '') +
    `<div style="text-align:center;margin-top:16px;"><a href="mbti.html" style="font-size:.82rem;color:var(--muted);border-bottom:1px dashed var(--muted);text-decoration:none;">重測或更改型別 ›</a></div>` +
    NOTE;
}

/** 劇本大綱尾端的 MBTI 區塊（沒有 MBTI 時回空字串，不干擾原有內容） */
export function renderSynthesisBlock(results) {
  const saved = loadMbti();
  if (!saved) return '';
  const t = TYPES[saved.type];
  const cross = buildCross(saved.type, results);
  if (!cross.length) return '';
  return `<div id="mbti-synth" style="margin-top:20px;padding:14px;border-radius:10px;background:rgba(245,197,66,.08);">
    <div style="font-weight:700;margin-bottom:4px;">🧩 性格層：${saved.type} ${t.name}</div>
    <div style="font-size:.8rem;color:var(--muted);margin-bottom:8px;">把你的 MBTI 放進命盤，看性格與命運設定怎麼互動</div>
    ${cross.map(b => `<div style="font-size:.85rem;line-height:1.9;margin-top:8px;"><b>${b.title}</b><br>${b.lines.join('<br>')}</div>`).join('')}
  </div>`;
}
