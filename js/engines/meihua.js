/**
 * meihua.js — 梅花易數起卦引擎
 * 
 * 支援三種起卦方式：
 * 1. 時間起卦（自動用當下時間）
 * 2. 報數起卦（使用者輸入 1~2 個數字）
 * 3. 文字起卦（用字數/筆畫概算起卦）
 * 
 * 核心邏輯：
 * - 上卦（外卦）、下卦（內卦）、動爻
 * - 體卦 = 不含動爻的那個卦，用卦 = 含動爻的那個卦
 * - 互卦 = 主卦 2,3,4 爻為下、3,4,5 爻為上
 * - 變卦 = 動爻變後的卦
 * - 五行生剋斷吉凶
 */

import { BAGUA, WUXING, GUA64, TIYONG_INTERP } from '../data/meihua-text.js';
import { solarToLunar } from '../lib/lunar-calendar.js';

// ============ 起卦核心 ============

/**
 * 從兩個數字 + 動爻數起卦
 * @param {number} upperNum - 上卦數（取餘 8，0 當 8）
 * @param {number} lowerNum - 下卦數
 * @param {number} yaoNum - 動爻數（取餘 6，0 當 6）
 * @returns {object} 完整卦象資料
 */
function buildGua(upperNum, lowerNum, yaoNum) {
  // 取餘得卦序（1~8）
  const upperIdx = ((upperNum - 1) % 8 + 8) % 8; // 0-indexed
  const lowerIdx = ((lowerNum - 1) % 8 + 8) % 8;
  const yao = ((yaoNum - 1) % 6 + 6) % 6 + 1; // 1~6

  const upperGua = BAGUA[upperIdx];
  const lowerGua = BAGUA[lowerIdx];

  // 主卦（本卦）
  const mainGuaIdx = upperIdx * 8 + lowerIdx;
  const mainGua = GUA64[mainGuaIdx];

  // 動爻在上卦還是下卦（1~3 下卦，4~6 上卦）
  const yaoInUpper = yao > 3;

  // 體用判定：動爻所在 = 用卦，另一個 = 體卦
  const tiGua = yaoInUpper ? lowerGua : upperGua;
  const yongGua = yaoInUpper ? upperGua : lowerGua;

  // 互卦：主卦六爻中 2,3,4 為下卦；3,4,5 為上卦
  // 先建出主卦六爻（從下到上：下卦3爻 + 上卦3爻）
  const mainYaos = getYaos(lowerIdx).concat(getYaos(upperIdx));
  const huLowerYaos = mainYaos.slice(1, 4); // 爻 2,3,4（0-indexed: 1,2,3）
  const huUpperYaos = mainYaos.slice(2, 5); // 爻 3,4,5（0-indexed: 2,3,4）
  const huLowerIdx = yaosToGuaIdx(huLowerYaos);
  const huUpperIdx = yaosToGuaIdx(huUpperYaos);
  const huGuaIdx = huUpperIdx * 8 + huLowerIdx;
  const huGua = GUA64[huGuaIdx];

  // 變卦：動爻陰陽互換
  const bianYaos = [...mainYaos];
  bianYaos[yao - 1] = bianYaos[yao - 1] === 1 ? 0 : 1;
  const bianLowerIdx = yaosToGuaIdx(bianYaos.slice(0, 3));
  const bianUpperIdx = yaosToGuaIdx(bianYaos.slice(3, 6));
  const bianGuaIdx = bianUpperIdx * 8 + bianLowerIdx;
  const bianGua = GUA64[bianGuaIdx];

  // 體用五行生剋
  const tiyongRel = getTiyongRelation(tiGua.element, yongGua.element);

  return {
    method: null, // 由呼叫端填入
    upperGua,
    lowerGua,
    mainGua,
    mainGuaIdx,
    yao,
    yaoInUpper,
    tiGua,
    yongGua,
    huGua: { ...huGua, upper: BAGUA[huUpperIdx], lower: BAGUA[huLowerIdx] },
    bianGua: { ...bianGua, upper: BAGUA[bianUpperIdx], lower: BAGUA[bianLowerIdx] },
    tiyongRel,
    tiyongInterp: TIYONG_INTERP[tiyongRel],
  };
}

/** 八卦轉三爻陣列（陽=1, 陰=0），從下到上 */
function getYaos(guaIdx) {
  // 乾=111, 兌=011, 離=101, 震=001, 巽=110, 坎=010, 艮=100, 坤=000
  const patterns = [
    [1, 1, 1], // 乾
    [0, 1, 1], // 兌
    [1, 0, 1], // 離
    [0, 0, 1], // 震
    [1, 1, 0], // 巽
    [0, 1, 0], // 坎
    [1, 0, 0], // 艮
    [0, 0, 0], // 坤
  ];
  return patterns[guaIdx];
}

/** 三爻陣列轉八卦 index */
function yaosToGuaIdx(yaos) {
  const key = yaos.join('');
  const map = { '111': 0, '011': 1, '101': 2, '001': 3, '110': 4, '010': 5, '100': 6, '000': 7 };
  return map[key] ?? 0;
}

/** 判斷體用五行關係 */
function getTiyongRelation(tiElem, yongElem) {
  if (tiElem === yongElem) return '體用同';
  if (WUXING.generates[tiElem] === yongElem) return '體生用';
  if (WUXING.generates[yongElem] === tiElem) return '用生體';
  if (WUXING.overcomes[tiElem] === yongElem) return '體剋用';
  if (WUXING.overcomes[yongElem] === tiElem) return '用剋體';
  return '體用同';
}

// ============ 三種起卦方式 ============

/** 時間起卦：用當下年月日時（農曆） */
export function timeGua(date = new Date()) {
  // 正統梅花易數：農曆年地支數 + 農曆月 + 農曆日 = 上卦數
  //               農曆年地支數 + 農曆月 + 農曆日 + 時辰 = 下卦數
  //               總數 / 6 餘數 = 動爻
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const shichen = Math.floor((hour + 1) / 2) % 12 + 1;

  // 轉農曆
  const lunar = solarToLunar(year, month, day);
  let lYear, lMonth, lDay;
  if (lunar) {
    lYear = lunar.lunarYear;
    lMonth = lunar.lunarMonth;
    lDay = lunar.lunarDay;
  } else {
    // fallback：農曆轉換失敗時用西曆近似
    lYear = year;
    lMonth = month;
    lDay = day;
  }

  // 年地支數（1~12）
  const yearBranch = ((lYear - 4) % 12 + 12) % 12 + 1; // 子=1...亥=12

  const upperNum = yearBranch + lMonth + lDay;
  const lowerNum = yearBranch + lMonth + lDay + shichen;
  const yaoNum = lowerNum;

  const result = buildGua(upperNum, lowerNum, yaoNum);
  result.method = '時間起卦';
  result.methodDetail = `農曆${lYear}年${lMonth}月${lDay}日 ${hour}時（${getShichenName(shichen)}時）`;
  return result;
}

/** 報數起卦：使用者報一或兩個數 */
export function numberGua(num1, num2 = null) {
  let upperNum, lowerNum, yaoNum;
  if (num2 === null || num2 === undefined) {
    // 單數：前半為上卦，後半為下卦（如 538 → 5 上、38 下）
    const s = String(num1);
    if (s.length <= 1) {
      upperNum = num1;
      lowerNum = num1;
    } else {
      const mid = Math.ceil(s.length / 2);
      upperNum = parseInt(s.slice(0, mid)) || 1;
      lowerNum = parseInt(s.slice(mid)) || 1;
    }
    yaoNum = upperNum + lowerNum;
  } else {
    // 雙數：第一個=上卦，第二個=下卦
    upperNum = num1;
    lowerNum = num2;
    yaoNum = num1 + num2;
  }

  const result = buildGua(upperNum, lowerNum, yaoNum);
  result.method = '報數起卦';
  result.methodDetail = num2 ? `數字 ${num1}, ${num2}` : `數字 ${num1}`;
  return result;
}

/** 文字起卦：用字數起卦 */
export function textGua(text) {
  const chars = [...text.replace(/\s/g, '')];
  const len = chars.length;
  if (len === 0) return timeGua(); // fallback

  let upperNum, lowerNum;
  if (len === 1) {
    // 單字：用字的 charCode 拆
    const code = text.charCodeAt(0);
    upperNum = code;
    lowerNum = code;
  } else {
    // 多字：前半字數=上卦，後半字數=下卦
    const mid = Math.ceil(len / 2);
    upperNum = mid;
    lowerNum = len - mid;
  }
  const yaoNum = upperNum + lowerNum;

  const result = buildGua(upperNum, lowerNum, yaoNum);
  result.method = '文字起卦';
  result.methodDetail = `「${text}」（${len}字）`;
  return result;
}

// ============ 輔助 ============

function getShichenName(n) {
  const names = ['', '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  return names[n] || '';
}

// ============ 渲染 HTML ============

export function renderMeihua(gua) {
  const levelColors = {
    '大吉': '#4f4', '中吉': '#8cf', '小吉': '#8cf', '平': '#f5c542', '凶': '#f55',
  };
  const levelColor = levelColors[gua.tiyongInterp.level] || 'var(--text)';

  let html = '';

  // 標題
  html += `<div class="sig"><div class="kin">梅花易數</div><div class="big">${gua.mainGua.name}</div>`;
  html += `<div style="font-size:.85rem;color:var(--muted);margin-top:6px;">${gua.method}｜${gua.methodDetail}</div></div>`;

  // 吉凶總覽
  html += `<div style="text-align:center;margin:16px 0;"><span style="display:inline-block;padding:6px 18px;border-radius:20px;font-weight:700;font-size:1.1rem;color:${levelColor};background:rgba(255,255,255,.05);border:1px solid ${levelColor};">${gua.tiyongInterp.level}</span></div>`;

  // 卦象結構
  html += `<div class="divider"></div>`;
  html += `<h3>🔮 卦象結構</h3>`;
  html += `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:12px 0;">`;

  // 本卦
  html += renderGuaCard('本卦', gua.upperGua, gua.lowerGua, gua.mainGua, gua.yao, gua.tiGua, gua.yongGua);
  // 互卦
  html += renderGuaCard('互卦（過程）', gua.huGua.upper, gua.huGua.lower, gua.huGua, null, null, null);
  // 變卦
  html += renderGuaCard('變卦（結果）', gua.bianGua.upper, gua.bianGua.lower, gua.bianGua, null, null, null);

  html += `</div>`;

  // 體用分析
  html += `<div class="divider"></div>`;
  html += `<h3>⚖️ 體用分析</h3>`;
  html += `<div style="background:rgba(123,108,246,.06);border-radius:8px;padding:14px;margin:12px 0;line-height:1.9;">`;
  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">`;
  html += `<div><span style="color:var(--accent);font-weight:700;">體卦</span>（我方）：${gua.tiGua.symbol} ${gua.tiGua.name}（${gua.tiGua.element}）</div>`;
  html += `<div><span style="color:var(--accent2,#f5c542);font-weight:700;">用卦</span>（對方/事）：${gua.yongGua.symbol} ${gua.yongGua.name}（${gua.yongGua.element}）</div>`;
  html += `</div>`;
  html += `<div style="text-align:center;padding:10px;background:rgba(255,255,255,.03);border-radius:6px;">`;
  html += `<div style="font-size:.9rem;margin-bottom:4px;"><b>${gua.tiyongRel}</b>（${gua.tiGua.element} vs ${gua.yongGua.element}）</div>`;
  html += `<div style="color:${levelColor};font-weight:700;font-size:1rem;">${gua.tiyongInterp.level}</div>`;
  html += `<div style="font-size:.85rem;color:var(--muted);margin-top:4px;">${gua.tiyongInterp.desc}</div>`;
  html += `</div></div>`;

  // 逐步解讀
  html += `<div class="divider"></div>`;
  html += `<h3>📖 解讀</h3>`;
  html += `<div style="line-height:1.9;font-size:.9rem;">`;

  html += `<div style="margin-bottom:14px;padding:10px;border-left:3px solid var(--accent);background:rgba(123,108,246,.04);border-radius:0 6px 6px 0;">`;
  html += `<div style="font-weight:700;margin-bottom:4px;">📌 本卦：${gua.mainGua.name}（${gua.mainGua.short}）</div>`;
  html += `<div>動爻：第 ${gua.yao} 爻（在${gua.yaoInUpper ? '上（外）' : '下（內）'}卦）</div>`;
  html += `<div style="color:var(--muted);font-size:.85rem;margin-top:4px;">${gua.mainGua.advice}</div>`;
  html += `</div>`;

  html += `<div style="margin-bottom:14px;padding:10px;border-left:3px solid #4ecdc4;background:rgba(78,205,196,.04);border-radius:0 6px 6px 0;">`;
  html += `<div style="font-weight:700;margin-bottom:4px;">🔄 互卦：${gua.huGua.name}（${gua.huGua.short}）</div>`;
  html += `<div style="color:var(--muted);font-size:.85rem;">${gua.huGua.advice}</div>`;
  html += `</div>`;

  html += `<div style="margin-bottom:14px;padding:10px;border-left:3px solid #f5c542;background:rgba(245,197,66,.04);border-radius:0 6px 6px 0;">`;
  html += `<div style="font-weight:700;margin-bottom:4px;">🎯 變卦：${gua.bianGua.name}（${gua.bianGua.short}）</div>`;
  html += `<div style="color:var(--muted);font-size:.85rem;">${gua.bianGua.advice}</div>`;
  html += `</div>`;

  html += `</div>`;

  // 綜合建議
  html += `<div class="divider"></div>`;
  html += `<h3>💡 綜合建議</h3>`;
  html += `<div style="background:rgba(245,197,66,.08);border-radius:8px;padding:14px;line-height:1.9;font-size:.9rem;">`;
  html += generateAdvice(gua);
  html += `</div>`;

  // 提示
  html += `<div class="note" style="margin-top:16px;">💡 梅花易數重「一事一占」。問事時心念專注，起卦結果才有參考性。同一件事不要反覆占問。</div>`;

  return html;
}

function renderGuaCard(title, upper, lower, guaInfo, yao, ti, yong) {
  let html = `<div style="background:rgba(255,255,255,.03);border-radius:8px;padding:12px;text-align:center;">`;
  html += `<div style="font-size:.75rem;color:var(--muted);margin-bottom:6px;">${title}</div>`;
  html += `<div style="font-size:1.5rem;letter-spacing:2px;">${upper.symbol}<br>${lower.symbol}</div>`;
  html += `<div style="font-size:.85rem;font-weight:700;margin-top:6px;">${guaInfo.name}</div>`;
  html += `<div style="font-size:.75rem;color:var(--muted);">${guaInfo.short}</div>`;
  if (ti && yong) {
    html += `<div style="font-size:.7rem;margin-top:6px;color:var(--accent);">體:${ti.name} 用:${yong.name}</div>`;
  }
  if (yao) {
    html += `<div style="font-size:.7rem;color:var(--accent2,#f5c542);">動爻:${yao}</div>`;
  }
  html += `</div>`;
  return html;
}

function generateAdvice(gua) {
  let advice = '';
  const rel = gua.tiyongRel;

  // 根據體用關係 + 本卦 + 變卦組合建議
  if (rel === '用生體') {
    advice += `<b>整體有利。</b>外在條件在幫助你，可以放心推進。`;
    advice += `本卦「${gua.mainGua.short}」提示目前狀態；變卦「${gua.bianGua.short}」指向最終走向——`;
    advice += `事情的發展對你有利，保持當前方向就好。`;
  } else if (rel === '體剋用') {
    advice += `<b>你有能力搞定，但需要出力。</b>`;
    advice += `本卦「${gua.mainGua.short}」，你掌握主動權。`;
    advice += `變卦走向「${gua.bianGua.short}」——用行動去推動，結果可控。`;
  } else if (rel === '體生用') {
    advice += `<b>事情可成，但你會消耗比較多。</b>`;
    advice += `你在付出、在投入資源。問自己：這個投入值不值得？`;
    advice += `變卦「${gua.bianGua.short}」暗示結果——如果方向對了，付出有回報。`;
  } else if (rel === '用剋體') {
    advice += `<b>目前對你不利，宜守不宜攻。</b>`;
    advice += `外在壓力或對手比你強。本卦「${gua.mainGua.short}」描述現況的壓迫感。`;
    advice += `建議：退一步，等待變卦「${gua.bianGua.short}」的轉機出現再動。`;
  } else {
    advice += `<b>勢均力敵，需要靠時機或貴人來突破。</b>`;
    advice += `目前雙方力量相當，僵持中。`;
    advice += `互卦「${gua.huGua.short}」提示過程中的轉折；變卦「${gua.bianGua.short}」是最終方向。耐心等待破局點。`;
  }

  return advice;
}
