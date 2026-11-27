/**
 * mbti.js — MBTI 引擎（v2）
 * - 五段式測驗計分（含 -A／-T 第五軸），算出每軸強度
 * - 型別儲存（localStorage: destiny_mbti），相容 v1 舊格式
 * - 詳細解讀卡片：四軸強度、八維功能、壓力反應、成長、溝通、-A/-T
 * - 與八字／人類圖／星座交叉對照（觀察角度，非科學對應）
 */

import {
  AXES, QUESTIONS, ROLE_QUESTIONS, TYPES, ELEMENT_HINT, LETTER_DESC,
  FUNCS, FUNC_ROLES, IDENTITY,
} from '../data/mbti-data.js?v=4';

const STORE_KEY = 'destiny_mbti';
const PER_AXIS = 8;

// ============ 儲存 ============

export function isValidType(t) {
  return typeof t === 'string' && Object.prototype.hasOwnProperty.call(TYPES, t);
}

/**
 * 分數統一成 { EI: 0~100, ... }，數值 = 偏向該軸左邊字母（a）的百分比。
 * v1 舊格式是 {E:3, I:2, ...} 次數，這裡換算過來。
 */
function normalizeScores(s) {
  if (!s || typeof s !== 'object') return null;
  if ('EI' in s) return s;
  if ('E' in s) {
    const out = {};
    AXES.forEach(a => {
      const l = s[a.a] || 0, r = s[a.b] || 0;
      if (l + r > 0) out[a.key] = Math.round((l / (l + r)) * 100);
    });
    return out;
  }
  return null;
}

/** 讀取已存的 MBTI；沒有或格式不對回 null */
export function loadMbti() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (d && isValidType(d.type)) {
      return {
        type: d.type,
        id: d.id === 'A' || d.id === 'T' ? d.id : null,
        src: d.src || 'pick',
        scores: normalizeScores(d.scores),
        profile: d.profile && typeof d.profile === 'object' ? d.profile : null,
      };
    }
  } catch (e) { /* ignore */ }
  return null;
}

/**
 * 儲存 MBTI
 * @param {string} type 四字母
 * @param {string} src 'pick' | 'test'
 * @param {Object|null} scores { EI: 0~100, ... }
 * @param {'A'|'T'|null} id 自信型／敏感型延伸維度
 * @param {Object|null} profile 測驗答案、責任模式等可追溯資料
 */
export function saveMbti(type, src = 'pick', scores = null, id = null, profile = null) {
  if (!isValidType(type)) return false;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      v: 3, type, src, scores, id: id === 'A' || id === 'T' ? id : null,
      profile: profile && typeof profile === 'object' ? profile : null,
      ts: Date.now(),
    }));
    return true;
  } catch (e) { return false; }
}

export function clearMbti() {
  try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
}

// ============ 測驗計分 ============

/**
 * @param {number[]} answers 以 QUESTIONS 索引對應，每題 -2~2，正數 = 偏向畫面左邊選項
 * @param {{type?:string, id?:string}|null} prev 上一次的結果，平手時參考
 * @returns {{type:string, id:'A'|'T', scores:Object, ties:string[]}}
 */
export function scoreAnswers(answers, prev = null) {
  const sum = {}, cnt = {}, strongA = {}, strongB = {};
  AXES.forEach(a => { sum[a.key] = 0; cnt[a.key] = 0; strongA[a.key] = 0; strongB[a.key] = 0; });
  QUESTIONS.forEach((q, i) => {
    const raw = Number(answers[i]);
    if (!Number.isFinite(raw)) return;
    // rev 題左右對調：畫面左邊 = 該軸 b
    const v = Math.max(-2, Math.min(2, raw)) * (q.rev ? -1 : 1);
    sum[q.ax] += v;
    cnt[q.ax] += 1;
    if (v === 2) strongA[q.ax] += 1;
    if (v === -2) strongB[q.ax] += 1;
  });
  const scores = {};
  AXES.forEach(a => {
    const n = cnt[a.key] || PER_AXIS;
    // -2n ~ +2n 換算成 0~100（偏向 a 的百分比）
    scores[a.key] = Math.round(((sum[a.key] + 2 * n) / (4 * n)) * 100);
  });

  // 剛好平手：先看誰的「很像」比較多 → 再參考上次結果 → 都沒有才取左邊
  const ties = [];
  const prevLetters = prev?.type && isValidType(prev.type) ? prev.type.split('') : null;
  const pick = (a, idx) => {
    const exact = sum[a.key] === 0;
    if (!exact) return scores[a.key] > 50 ? a.a : a.b;
    ties.push(a.key);
    if (strongA[a.key] !== strongB[a.key]) return strongA[a.key] > strongB[a.key] ? a.a : a.b;
    if (idx < 4 && prevLetters) return prevLetters[idx];
    if (idx === 4 && (prev?.id === 'A' || prev?.id === 'T')) return prev.id;
    return a.a;
  };
  const type = AXES.slice(0, 4).map(pick).join('');
  const id = pick(AXES[4], 4);
  return { type, id, scores, ties };
}

/**
 * 16 題責任／工作模式計分。只計正式 MBTI 四軸，不含 -A/-T。
 * 結果描述「採取的模式」，不宣稱是第二個人格或另一個真正型別。
 */
export function scoreRoleAnswers(answers, prevType = null) {
  const sum = {}, cnt = {};
  AXES.slice(0, 4).forEach(a => { sum[a.key] = 0; cnt[a.key] = 0; });
  ROLE_QUESTIONS.forEach((q, i) => {
    const raw = Number(answers[i]);
    if (!Number.isFinite(raw)) return;
    const v = Math.max(-2, Math.min(2, raw)) * (q.rev ? -1 : 1);
    sum[q.ax] += v;
    cnt[q.ax] += 1;
  });
  const scores = {};
  const prev = isValidType(prevType) ? prevType.split('') : null;
  const type = AXES.slice(0, 4).map((a, idx) => {
    const n = cnt[a.key] || 1;
    scores[a.key] = Math.round(((sum[a.key] + 2 * n) / (4 * n)) * 100);
    if (sum[a.key] === 0 && prev) return prev[idx];
    return sum[a.key] >= 0 ? a.a : a.b;
  }).join('');
  return { type, scores };
}

// ============ 渲染工具 ============

const BOX = 'padding:14px;border-radius:10px;margin-top:12px;';
const SOFT = 'background:rgba(123,108,246,.07);';
const WARM = 'background:rgba(245,197,66,.08);';
const TXT = 'font-size:.86rem;line-height:1.9;margin-top:6px;';

function list(items) {
  return `<ul style="margin:6px 0 0;padding-left:1.2em;line-height:1.9;font-size:.86rem;">${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
}

function box(title, inner, tone = SOFT) {
  return `<div style="${BOX}${tone}"><b>${title}</b>${inner}</div>`;
}

function letterDesc(axisKey, letter) {
  if (axisKey === 'AT' && letter === 'T') return LETTER_DESC.AT_T;
  return LETTER_DESC[letter] || '';
}

/** 強度文字：依勝出那一邊的百分比 */
function strength(pct) {
  if (pct <= 55) return '兩邊接近平衡';
  if (pct <= 65) return '輕微偏向';
  if (pct <= 80) return '明顯偏向';
  return '非常強烈';
}

/** 每軸傾向條 + 強度說明 */
export function renderAxisBars(scores) {
  if (!scores) return '';
  const rows = AXES.filter(a => typeof scores[a.key] === 'number').map(a => {
    const lp = scores[a.key];
    const rp = 100 - lp;
    const leftWins = lp >= 50;
    const win = leftWins ? a.a : a.b;
    const winPct = leftWins ? lp : rp;
    const hi = 'font-weight:700;color:var(--accent);';
    const lo = 'color:var(--muted);';
    return `<div style="margin:10px 0;">
      <div style="display:flex;align-items:center;gap:8px;font-size:.8rem;">
        <span style="width:58px;text-align:right;${leftWins ? hi : lo}">${a.aZh} ${a.a}</span>
        <div style="flex:1;height:12px;background:rgba(255,255,255,.07);border-radius:6px;overflow:hidden;display:flex;">
          <div style="width:${lp}%;background:${leftWins ? 'var(--accent)' : 'rgba(255,255,255,.18)'};"></div>
          <div style="width:${rp}%;background:${leftWins ? 'rgba(255,255,255,.18)' : 'var(--accent)'};"></div>
        </div>
        <span style="width:58px;${leftWins ? lo : hi}">${a.b} ${a.bZh}</span>
      </div>
      <div style="font-size:.74rem;color:var(--muted);text-align:center;margin-top:2px;">${winPct}% ${win}・${strength(winPct)}：${letterDesc(a.key, win)}</div>
    </div>`;
  });
  return rows.length ? `<div style="margin-top:12px;">${rows.join('')}</div>` : '';
}

/**
 * 候選型別（給「候選比較」用）
 * 取測驗結果本身，加上「最接近中間的 1～2 軸」各翻一個字母的型別，
 * 再加上 extra（例如上次結果、使用者原本認定的型別），最多 4 個。
 * @param {string} type 測驗算出的四字母
 * @param {Object|null} scores { EI: 0~100, ... }
 * @param {string[]} extra 額外想放進來比較的型別
 */
export function candidatesFrom(type, scores, extra = []) {
  const out = [type];
  if (scores) {
    AXES.slice(0, 4)
      .map((a, idx) => ({ a, idx, win: typeof scores[a.key] === 'number' ? Math.max(scores[a.key], 100 - scores[a.key]) : 100 }))
      .filter(x => x.win <= 62)           // 62% 以內視為「可能翻過去」
      .sort((x, y) => x.win - y.win)
      .slice(0, 2)
      .forEach(({ a, idx }) => {
        const flip = type.split('');
        flip[idx] = flip[idx] === a.a ? a.b : a.a;
        out.push(flip.join(''));
      });
  }
  extra.forEach(t => out.push(t));
  return [...new Set(out.filter(isValidType))].slice(0, 4);
}

/** 接近中間的軸：不把 50/50 附近包裝成確定字母。 */
function renderUncertainty(type, scores) {
  if (!scores) return '';
  const uncertain = AXES.slice(0, 4).filter(a => {
    const p = scores[a.key];
    return typeof p === 'number' && Math.max(p, 100 - p) < 60;
  });
  if (!uncertain.length) return '';
  const names = uncertain.map(a => `${a.a}/${a.b} ${a.aZh}／${a.bZh}`).join('、');
  return box('⚖ 接近中間，不硬判', `<div style="${TXT}">${names}的分數不到 60%，容易隨情境改變。上方型別是你最後選定的「最適型別」，不是測驗替你下的定論。</div>`, WARM);
}

/**
 * 顯示每個字母的主要判定依據。profile.answers 必須以 QUESTIONS 索引儲存。
 * 只列方向一致且影響最大（「很像」優先）的題目，讓使用者能檢查結果怎麼來。
 */
export function renderEvidence(type, scores, profile) {
  const answers = profile?.answers;
  if (!scores || !Array.isArray(answers)) return '';
  const rows = AXES.slice(0, 4).map((a, idx) => {
    const p = scores[a.key];
    if (typeof p !== 'number') return '';
    const measured = p >= 50 ? a.a : a.b;
    const pct = Math.max(p, 100 - p);
    const evidence = [];
    QUESTIONS.forEach((q, qi) => {
      if (q.ax !== a.key || !Number.isFinite(Number(answers[qi]))) return;
      const raw = Number(answers[qi]);
      const normalized = raw * (q.rev ? -1 : 1);
      const supports = measured === a.a ? normalized > 0 : normalized < 0;
      if (!supports) return;
      evidence.push({
        weight: Math.abs(normalized),
        q: q.q,
        choice: raw > 0 ? q.L : q.R,
      });
    });
    evidence.sort((x, y) => y.weight - x.weight);
    const why = evidence.slice(0, 3).map(e => `<li><b>${e.q}</b><br><span style="color:var(--muted);">你選：${e.choice}</span></li>`).join('');
    return `<details class="mbti-evidence"><summary>${measured} ${measured === a.a ? a.aZh : a.bZh} ${pct}%：主要依據</summary>${why ? `<ul>${why}</ul>` : '<div style="margin-top:6px;color:var(--muted);">兩邊回答接近，沒有單一明顯依據。</div>'}</details>`;
  }).join('');
  return rows ? box('🔎 為什麼測出這個輪廓？', `<div style="${TXT}">這裡顯示影響各軸最大的答案。覺得答錯可以回 MBTI 頁修改，不必整份重做。</div>${rows}`) : '';
}

/** 自然型態 vs 責任模式。責任模式是環境下的行為策略，不另宣稱一個人格。 */
export function renderContextProfile(type, scores, profile) {
  const ad = profile?.adaptive;
  if (!ad || !isValidType(ad.type) || !ad.scores) {
    return box('🌓 自然型態／責任模式', `<div style="${TXT}">目前只有自然狀態資料。到 MBTI 頁加做 16 題「責任模式」，可以看工作、照顧或需要扛責任時，你會切換成什麼做事方式。</div>`);
  }
  const diffs = AXES.slice(0, 4).map((a, i) => type[i] !== ad.type[i]
    ? `${a.a}/${a.b}：${type[i] === a.a ? a.aZh : a.bZh} → ${ad.type[i] === a.a ? a.aZh : a.bZh}`
    : null).filter(Boolean);
  return box('🌓 自然型態／責任模式', `
    <div class="mbti-context-grid">
      <div><small>放鬆、無壓力時</small><b>${type} ${TYPES[type]?.name || ''}</b></div>
      <div><small>工作、照顧、扛責任時</small><b>${ad.type} ${TYPES[ad.type]?.name || ''}</b></div>
    </div>
    <div style="${TXT}">${diffs.length
      ? `你在責任情境會切換：${diffs.join('；')}。這表示你會因角色調整做法，不代表人格變來變去。`
      : '兩種情境的四軸方向一致，表示你的自然偏好和工作方式差距不大。'}</div>
    <details style="margin-top:8px;"><summary style="cursor:pointer;font-size:.82rem;">查看責任模式四軸</summary>${renderAxisBars(ad.scores)}</details>`);
}

/** 接近平衡（≤55%）的軸 → 提示也可以參考翻轉那個字母的型別 */
function neighborHint(type, scores) {
  if (!scores) return '';
  const near = [];
  AXES.slice(0, 4).forEach((a, idx) => {
    const p = scores[a.key];
    if (typeof p !== 'number') return;
    if (Math.max(p, 100 - p) <= 55) {
      const flip = type.split('');
      flip[idx] = flip[idx] === a.a ? a.b : a.a;
      const alt = flip.join('');
      if (TYPES[alt]) near.push(`<b>${alt}</b> ${TYPES[alt].name}（${a.aZh}／${a.bZh}接近）`);
    }
  });
  if (!near.length) return '';
  return box('🔀 你也可能是', `<div style="${TXT}">有軸線兩邊分數很接近，下面的型別也可能很像你。覺得不準時，到 MBTI 頁「我知道我的型別」點它看看：<br>${near.join('<br>')}</div>`);
}

/** 八維功能堆疊 */
function renderStack(t) {
  const fs = t.stack.split('-');
  const rows = fs.map((f, i) => {
    const info = FUNCS[f];
    if (!info) return '';
    const role = FUNC_ROLES[i];
    const body = i === 0 ? info.dom : info.desc;
    return `<div style="margin-top:8px;"><b>${role.zh}｜${f} ${info.zh}</b> <span style="font-size:.72rem;color:var(--muted);">${role.hint}</span><div style="font-size:.84rem;line-height:1.8;">${body}</div></div>`;
  }).join('');
  return `<details style="${BOX}${SOFT}"><summary style="cursor:pointer;font-weight:700;">🧠 你的大腦怎麼運作（八維功能）</summary>${rows}</details>`;
}

/** -A／-T 區塊 */
function renderIdentity(id) {
  if (!id || !IDENTITY[id]) {
    return box('🌗 -A／-T 延伸維度（非正式 MBTI）', `<div style="${TXT}">「很在意別人評價」「容易焦慮、反覆想」這類特質不屬於 MBTI 四個字母。-A／-T 是 16Personalities 加入的延伸設計；做測驗或選型別時可另外標示。</div>`);
  }
  const d = IDENTITY[id];
  return box(`🌗 ${d.name}`, `<div style="${TXT}">${d.sum}</div><div style="font-size:.84rem;margin-top:6px;"><b>加分：</b>${d.pros.join('、')}<br><b>留意：</b>${d.cons.join('、')}</div>`);
}

/** 型別解讀卡片（測驗頁、結果頁共用） */
export function renderTypeCard(type, scores = null, id = null) {
  const t = TYPES[type];
  if (!t) return '';
  const fs = t.stack.split('-');
  const inf = FUNCS[fs[3]];
  const full = id ? `${type}-${id}` : type;
  return `
    <div class="sig">
      <div class="kin">MBTI・${t.stack}</div>
      <div class="big" style="font-size:1.6rem;letter-spacing:.08em;">${full}</div>
      <div style="font-size:.95rem;margin-top:4px;">${t.name}${id && IDENTITY[id] ? `・${IDENTITY[id].name}` : ''}</div>
    </div>
    ${renderAxisBars(scores)}
    ${renderUncertainty(type, scores)}
    <div class="meaning" style="margin-top:12px;line-height:1.9;">${t.sum}</div>
    ${neighborHint(type, scores)}
    ${box('✦ 天賦優勢', list(t.pros))}
    ${box('⚠ 容易卡住的地方', list(t.cons))}
    ${renderIdentity(id)}
    ${renderStack(t)}
    ${inf ? box('🌪 壓力大時的你', `<div style="${TXT}">你的劣勢功能是 ${fs[3]} ${inf.zh}。長期累積壓力時，${inf.inf}這不是你變了，是電量見底的訊號，先休息再做決定。</div>`) : ''}
    ${box('🌱 成長方向', `<div style="${TXT}">${t.grow}</div>`)}
    ${box('💬 溝通方式', `<div style="${TXT}">${t.comm}</div>`)}
    ${box('💼 工作風格', `<div style="${TXT}">${t.work}</div>`)}
    ${box('💗 親密關係', `<div style="${TXT}">${t.love}</div>`)}
    ${box('🔮 近期運勢建議', `<div style="${TXT}">${t.luck}</div>`, WARM)}
    <div style="font-size:.72rem;color:var(--muted);margin-top:12px;line-height:1.7;">16 型描述的是同一類人的共同傾向，不會每一條都中。不像你的地方，常是 -A/-T、成長環境或某一軸接近平衡造成的。</div>`;
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
  return blocks.map(b => box(b.title, `<div style="font-size:.85rem;line-height:1.9;margin-top:6px;">${b.lines.join('<br>')}</div>`)).join('');
}

// ============ 結果頁 Tab / 劇本大綱 ============

const NOTE = '<div style="font-size:.72rem;color:var(--muted);margin-top:14px;line-height:1.7;">交叉對照是依各系統特徵做的觀察角度，不是科學上的一對一對應。MBTI 為自我探索工具，非臨床評估。</div>';

/** MBTI tab 完整內容 */
export function renderMbtiTab(results) {
  const saved = loadMbti();
  if (!saved) {
    return `<div class="placeholder" style="line-height:2;">還沒有你的 MBTI。<br>
      <a href="mbti.html" class="btn-primary" style="display:inline-block;text-decoration:none;margin-top:10px;">做 40 題測驗，或直接選你的型別 ✦</a></div>`;
  }
  const cross = buildCross(saved.type, results);
  return renderTypeCard(saved.type, saved.scores, saved.id) +
    renderContextProfile(saved.type, saved.scores, saved.profile) +
    renderEvidence(saved.type, saved.scores, saved.profile) +
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
  const full = saved.id ? `${saved.type}-${saved.id}` : saved.type;
  return `<div id="mbti-synth" style="margin-top:20px;padding:14px;border-radius:10px;background:rgba(245,197,66,.08);">
    <div style="font-weight:700;margin-bottom:4px;">🧩 性格層：${full} ${t.name}</div>
    <div style="font-size:.8rem;color:var(--muted);margin-bottom:8px;">把你的 MBTI 放進命盤，看性格與命運設定怎麼互動</div>
    ${cross.map(b => `<div style="font-size:.85rem;line-height:1.9;margin-top:8px;"><b>${b.title}</b><br>${b.lines.join('<br>')}</div>`).join('')}
  </div>`;
}
