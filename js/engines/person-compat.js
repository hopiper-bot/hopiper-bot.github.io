/**
 * person-compat.js — 雙人合盤引擎
 * 比對兩個人的八字＋馬雅＋星座，分析關係
 */

import { mod, dateToJDN } from '../lib/utils.js';
import { SEALS, TONES } from '../data/maya-text.js';

// === 八字相關常量 ===
const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const STEM_ELEMENT = {"甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水"};
const STEM_YINYANG = {"甲":"陽","乙":"陰","丙":"陽","丁":"陰","戊":"陽","己":"陰","庚":"陽","辛":"陰","壬":"陽","癸":"陰"};
const WUXING_SHENG = {"木":"火","火":"土","土":"金","金":"水","水":"木"};
const WUXING_KE = {"木":"土","土":"水","水":"火","火":"金","金":"木"};
const ELEMENT_ZH = {"木":"🌳 木","火":"🔥 火","土":"🏔️ 土","金":"⚙️ 金","水":"💧 水"};

// 地支六合
const LIUHE = {"子":"丑","丑":"子","寅":"亥","卯":"戌","辰":"酉","巳":"申","午":"未","未":"午","申":"巳","酉":"辰","戌":"卯","亥":"寅"};
// 地支六沖
const LIUCHONG = {"子":"午","丑":"未","寅":"申","卯":"酉","辰":"戌","巳":"亥","午":"子","未":"丑","申":"寅","酉":"卯","戌":"辰","亥":"巳"};
// 地支三合局
const SANHE = [["申","子","辰"],["亥","卯","未"],["寅","午","戌"],["巳","酉","丑"]];

// 天干合
const TIANHE = {"甲":"己","乙":"庚","丙":"辛","丁":"壬","戊":"癸","己":"甲","庚":"乙","辛":"丙","壬":"丁","癸":"戊"};

// === 馬雅 ===
const MONTH_OFF = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
function dreamspellKin(y, m, d) {
  const yearVal = mod(217 + 105 * (y - 2013), 260);
  return mod(yearVal + MONTH_OFF[m - 1] + d - 1, 260) + 1;
}

// === 日柱計算 ===
function getDayPillar(y, m, d) {
  const jdn = dateToJDN(y, m, d);
  const base = dateToJDN(2000, 1, 7);
  const diff = ((jdn - base) % 60 + 60) % 60;
  return { stemIdx: diff % 10, branchIdx: diff % 12, stem: STEMS[diff % 10], branch: BRANCHES[diff % 12] };
}

// === 十神 ===
function getTenGod(dayStem, otherStem) {
  const de = STEM_ELEMENT[dayStem], oe = STEM_ELEMENT[otherStem];
  const dy = STEM_YINYANG[dayStem], oy = STEM_YINYANG[otherStem];
  const same = dy === oy;
  if (de === oe) return same ? '比肩' : '劫財';
  if (WUXING_SHENG[de] === oe) return same ? '食神' : '傷官';
  if (WUXING_KE[de] === oe) return same ? '偏財' : '正財';
  if (WUXING_KE[oe] === de) return same ? '七殺' : '正官';
  if (WUXING_SHENG[oe] === de) return same ? '偏印' : '正印';
  return '';
}

// 十神與關係的解讀
const TENGOD_RELATION = {
  partner: {
    '正財': { score: 95, desc: '天生的正緣配對，彼此吸引又能穩定相處' },
    '偏財': { score: 85, desc: '有吸引力但較偏浪漫激情型，需要用心經營' },
    '正官': { score: 90, desc: '對方是你的貴人伴侶，能讓你變得更好' },
    '七殺': { score: 70, desc: '愛恨分明、張力大，好的時候很好壞的時候很衝' },
    '正印': { score: 80, desc: '被照顧的感覺，對方像母親般呵護你' },
    '偏印': { score: 65, desc: '相處需要空間，彼此都比較獨立' },
    '食神': { score: 85, desc: '開心甜蜜，一起吃喝玩樂很快樂' },
    '傷官': { score: 60, desc: '互相嫌棄但又離不開，需要很多包容' },
    '比肩': { score: 75, desc: '像朋友一樣的伴侶，平等但少了點浪漫' },
    '劫財': { score: 55, desc: '競爭感強，容易搶對方的資源或注意力' },
  },
  friend: {
    '比肩': { score: 95, desc: '知己等級！價值觀一致，互相理解不費力' },
    '劫財': { score: 75, desc: '亦敵亦友，有競爭但也能互相激勵' },
    '食神': { score: 90, desc: '玩在一起超開心，是吃喝玩樂的最佳夥伴' },
    '傷官': { score: 70, desc: '互相吐槽但真心，嘴上不饒人心裡很在乎' },
    '正財': { score: 80, desc: '務實的友情，能互相幫助解決實際問題' },
    '偏財': { score: 80, desc: '一起做事有財緣，合作愉快' },
    '正官': { score: 70, desc: '有點壓力但能成長，對方是督促你變好的朋友' },
    '七殺': { score: 60, desc: '相處有張力，不太能放鬆但能逼你進步' },
    '正印': { score: 85, desc: '被照顧的感覺，對方是你的心靈支柱' },
    '偏印': { score: 65, desc: '獨處型友情，偶爾見面但心有靈犀' },
  },
  colleague: {
    '正財': { score: 85, desc: '工作上配合度高，互補互利' },
    '偏財': { score: 80, desc: '一起做事有成果，尤其業務或專案合作' },
    '正官': { score: 75, desc: '對方規矩多但能讓你更專業' },
    '七殺': { score: 60, desc: '壓力大，需要找到彼此的界線' },
    '食神': { score: 85, desc: '工作氣氛輕鬆，創意點子多' },
    '傷官': { score: 65, desc: '意見不同的時候多，但能碰出火花' },
    '比肩': { score: 80, desc: '良性競爭，互相學習成長快' },
    '劫財': { score: 55, desc: '容易搶功勞或資源，保持距離比較好' },
    '正印': { score: 90, desc: '工作上的貴人，願意教你帶你' },
    '偏印': { score: 70, desc: '有默契但不太說，安靜的好搭檔' },
  },
  family: {
    '正印': { score: 95, desc: '深厚的照顧緣分，互相牽掛' },
    '偏印': { score: 75, desc: '有緣但表達方式不同，需要理解' },
    '正財': { score: 85, desc: '家庭責任感強，互相付出' },
    '偏財': { score: 80, desc: '大方對彼此，物質上不匱乏' },
    '食神': { score: 90, desc: '家庭氣氛溫暖愉快，常一起吃飯聊天' },
    '傷官': { score: 65, desc: '嘴上不饒人但心裡愛著，吵吵鬧鬧的感情' },
    '比肩': { score: 85, desc: '像兄弟姊妹一樣平等，互相支持' },
    '劫財': { score: 60, desc: '會搶資源或注意力，需要各退一步' },
    '正官': { score: 70, desc: '管教型關係，有壓力但出發點是好的' },
    '七殺': { score: 55, desc: '衝突較多，需要很多空間和界線' },
  },
  boss: {
    '正官': { score: 90, desc: '正緣主管，嚴格但公正，跟著能成長' },
    '七殺': { score: 65, desc: '壓力山大但能力飛速成長，高壓高成長' },
    '正印': { score: 95, desc: '貴人老闆！願意栽培你，遇到是福氣' },
    '偏印': { score: 70, desc: '會給機會但不太教，需要自己悟' },
    '食神': { score: 80, desc: '好相處的老闆，氣氛輕鬆但別太散漫' },
    '傷官': { score: 55, desc: '看不慣對方但又不敢說，壓抑感重' },
    '正財': { score: 75, desc: '務實型老闆，跟著能賺錢但要付出' },
    '偏財': { score: 75, desc: '大方的老闆，機會多但要自己抓' },
    '比肩': { score: 70, desc: '平起平坐的感覺，不太有上下之分' },
    '劫財': { score: 50, desc: '容易被搶功或資源被分走，保護自己' },
  },
};

// === 馬雅圖騰關係 ===
function mayaRelation(kin1, kin2) {
  const seal1 = (kin1 - 1) % 20;
  const seal2 = (kin2 - 1) % 20;
  const tone1 = (kin1 - 1) % 13;
  const tone2 = (kin2 - 1) % 13;

  const results = [];

  // 同圖騰
  if (seal1 === seal2) {
    results.push({ type: '同圖騰', score: 90, desc: '你們擁有相同的靈魂印記，像照鏡子一樣理解對方' });
  }

  // 互為引導（同色系，seal差4）
  if (Math.abs(seal1 - seal2) % 4 === 0 && seal1 !== seal2) {
    results.push({ type: '同色系', score: 80, desc: '同一個色彩家族，能量頻率接近' });
  }

  // 互為挑戰（對面的圖騰，seal差10）
  if (Math.abs(seal1 - seal2) === 10) {
    results.push({ type: '互為挑戰', score: 65, desc: '你們是彼此的鏡子和課題，相處有磨擦但成長快' });
  }

  // 同調性
  if (tone1 === tone2) {
    results.push({ type: '同調性', score: 85, desc: `都是${TONES[tone1].zh}，做事節奏一致` });
  }

  // KIN 差 = 組合頻率
  const kinDiff = Math.abs(kin1 - kin2);
  if (kinDiff <= 4) {
    results.push({ type: '靈魂近鄰', score: 88, desc: '你們的宇宙編號非常接近，有深厚的共振' });
  }

  if (results.length === 0) {
    // 通用解讀
    const sealName1 = SEALS[seal1].zh;
    const sealName2 = SEALS[seal2].zh;
    results.push({ type: '互補能量', score: 72, desc: `${sealName1}與${sealName2}能量互補，各自帶來不同的視角` });
  }

  return results;
}

// === 星座元素合盤 ===
function zodiacCompat(month1, day1, month2, day2) {
  const signs = [
    { name: '摩羯', elem: '土', start: [1,1], end: [1,19] },
    { name: '水瓶', elem: '風', start: [1,20], end: [2,18] },
    { name: '雙魚', elem: '水', start: [2,19], end: [3,20] },
    { name: '牡羊', elem: '火', start: [3,21], end: [4,19] },
    { name: '金牛', elem: '土', start: [4,20], end: [5,20] },
    { name: '雙子', elem: '風', start: [5,21], end: [6,20] },
    { name: '巨蟹', elem: '水', start: [6,21], end: [7,22] },
    { name: '獅子', elem: '火', start: [7,23], end: [8,22] },
    { name: '處女', elem: '土', start: [8,23], end: [9,22] },
    { name: '天秤', elem: '風', start: [9,23], end: [10,22] },
    { name: '天蠍', elem: '水', start: [10,23], end: [11,21] },
    { name: '射手', elem: '火', start: [11,22], end: [12,21] },
    { name: '摩羯', elem: '土', start: [12,22], end: [12,31] },
  ];

  function getSign(m, d) {
    for (const s of signs) {
      const [sm, sd] = s.start;
      const [em, ed] = s.end;
      if ((m === sm && d >= sd) || (m === em && d <= ed)) return s;
      if (sm === em && m === sm && d >= sd && d <= ed) return s;
    }
    return signs[0];
  }

  const s1 = getSign(month1, day1);
  const s2 = getSign(month2, day2);

  // 元素相性
  const compat = {
    '火火': { score: 80, desc: '雙火 — 激情四射但容易吵架' },
    '火風': { score: 90, desc: '火+風 — 風助火勢，互相激發能量' },
    '火土': { score: 60, desc: '火+土 — 土滅火，需要磨合' },
    '火水': { score: 55, desc: '火+水 — 水剋火，相處有壓力但能互補' },
    '土土': { score: 85, desc: '雙土 — 穩定踏實，可能缺乏刺激' },
    '土風': { score: 60, desc: '土+風 — 一個要穩定一個要自由' },
    '土水': { score: 75, desc: '土+水 — 水滋潤土，照顧型關係' },
    '風風': { score: 80, desc: '雙風 — 聊不完但可能都不著地' },
    '風水': { score: 70, desc: '風+水 — 變化多，需要定錨' },
    '水水': { score: 85, desc: '雙水 — 深度連結，情感豐沛' },
  };

  const key1 = s1.elem + s2.elem;
  const key2 = s2.elem + s1.elem;
  const match = compat[key1] || compat[key2] || { score: 70, desc: '需要更多資料分析' };

  return { sign1: s1, sign2: s2, ...match };
}

/**
 * 計算雙人合盤
 */
export function calculate(person1Data, person2Data, relation) {
  const { year: y1, month: m1, day: d1 } = person1Data;
  const { year: y2, month: m2, day: d2 } = person2Data;

  // 1. 八字日柱比對
  const dp1 = getDayPillar(y1, m1, d1);
  const dp2 = getDayPillar(y2, m2, d2);

  const tenGod = getTenGod(dp1.stem, dp2.stem);
  const tenGodReverse = getTenGod(dp2.stem, dp1.stem);

  const relationData = TENGOD_RELATION[relation] || TENGOD_RELATION['friend'];
  const baziResult = relationData[tenGod] || { score: 70, desc: '關係中性，需要多相處才能判斷' };

  // 天干合
  const tianheMatch = TIANHE[dp1.stem] === dp2.stem;
  // 地支六合
  const liuheMatch = LIUHE[dp1.branch] === dp2.branch;
  // 地支六沖
  const liuchongMatch = LIUCHONG[dp1.branch] === dp2.branch;
  // 三合局
  const sanheMatch = SANHE.some(group => group.includes(dp1.branch) && group.includes(dp2.branch));

  // 2. 馬雅合盤
  const kin1 = dreamspellKin(y1, m1, d1);
  const kin2 = dreamspellKin(y2, m2, d2);
  const mayaResults = mayaRelation(kin1, kin2);

  // 3. 星座合盤
  const zodiac = zodiacCompat(m1, d1, m2, d2);

  // 4. 綜合評分
  let totalScore = baziResult.score;
  if (tianheMatch) totalScore += 10;
  if (liuheMatch) totalScore += 8;
  if (liuchongMatch) totalScore -= 10;
  if (sanheMatch) totalScore += 5;
  totalScore = Math.round((totalScore + zodiac.score + (mayaResults[0]?.score || 70)) / 3);
  totalScore = Math.max(30, Math.min(100, totalScore));

  return { status: 'ok', html: renderResult({
    dp1, dp2, tenGod, tenGodReverse, baziResult,
    tianheMatch, liuheMatch, liuchongMatch, sanheMatch,
    kin1, kin2, mayaResults,
    zodiac, totalScore, relation,
  })};
}

// === 渲染 ===
function renderResult(data) {
  const {
    dp1, dp2, tenGod, tenGodReverse, baziResult,
    tianheMatch, liuheMatch, liuchongMatch, sanheMatch,
    kin1, kin2, mayaResults,
    zodiac, totalScore, relation,
  } = data;

  const relationLabel = { partner: '情侶', friend: '朋友', colleague: '同事', family: '家人', boss: '主管' }[relation] || '關係';
  const scoreColor = totalScore >= 80 ? 'var(--accent)' : totalScore >= 60 ? 'var(--yellow)' : 'var(--red)';
  const scoreEmoji = totalScore >= 85 ? '💖' : totalScore >= 70 ? '✨' : totalScore >= 55 ? '🤝' : '⚡';

  let html = '';

  // 總分
  html += `<div class="sig" style="margin-bottom:16px;">`;
  html += `<div class="kin">${relationLabel}合盤</div>`;
  html += `<div class="big" style="font-size:2rem;color:${scoreColor};">${scoreEmoji} ${totalScore}分</div>`;
  html += `<div style="font-size:.82rem;color:var(--muted);">綜合八字・馬雅・星座三系統評估</div>`;
  html += `</div>`;

  // 八字合盤
  html += `<h3>八字日柱合盤</h3>`;
  html += `<div class="meaning">`;
  html += `<div style="display:flex;justify-content:center;gap:20px;margin-bottom:12px;">`;
  html += `<div style="text-align:center;"><span style="font-size:1.4rem;font-weight:700;">${dp1.stem}${dp1.branch}</span><br><span style="font-size:.78rem;color:var(--muted);">你（${ELEMENT_ZH[STEM_ELEMENT[dp1.stem]]}）</span></div>`;
  html += `<div style="text-align:center;font-size:1.4rem;padding-top:4px;">⟷</div>`;
  html += `<div style="text-align:center;"><span style="font-size:1.4rem;font-weight:700;">${dp2.stem}${dp2.branch}</span><br><span style="font-size:.78rem;color:var(--muted);">對方（${ELEMENT_ZH[STEM_ELEMENT[dp2.stem]]}）</span></div>`;
  html += `</div>`;
  html += `<div style="padding:10px;background:rgba(var(--accent-rgb),.08);border-radius:8px;margin-bottom:8px;">`;
  html += `<b>你看對方 →</b> <span class="kw">${tenGod}</span>：${baziResult.desc}`;
  html += `</div>`;
  html += `<div style="padding:10px;background:rgba(92,141,137,.08);border-radius:8px;">`;
  html += `<b>對方看你 →</b> <span class="kw">${tenGodReverse}</span>`;
  html += `</div>`;

  // 特殊格局
  const specials = [];
  if (tianheMatch) specials.push('💍 天干相合 — 天生有緣，磁場互吸');
  if (liuheMatch) specials.push('🤝 地支六合 — 默契十足，相處和諧');
  if (sanheMatch) specials.push('🔺 地支三合 — 大局觀一致，合作有成');
  if (liuchongMatch) specials.push('⚡ 地支六沖 — 衝突點多，需要包容與空間');
  if (specials.length > 0) {
    html += `<div style="margin-top:10px;padding:10px;background:rgba(123,108,246,.06);border-radius:8px;">`;
    html += `<b>特殊格局：</b><br>${specials.join('<br>')}`;
    html += `</div>`;
  }
  html += `</div>`;

  // 馬雅合盤
  html += `<h3>馬雅能量合盤</h3>`;
  html += `<div class="meaning">`;
  html += `<div style="display:flex;justify-content:center;gap:20px;margin-bottom:12px;">`;
  html += `<div style="text-align:center;"><span style="font-size:1.1rem;font-weight:700;">KIN ${kin1}</span><br><span style="font-size:.78rem;color:var(--muted);">你</span></div>`;
  html += `<div style="text-align:center;font-size:1.2rem;padding-top:4px;">✦</div>`;
  html += `<div style="text-align:center;"><span style="font-size:1.1rem;font-weight:700;">KIN ${kin2}</span><br><span style="font-size:.78rem;color:var(--muted);">對方</span></div>`;
  html += `</div>`;
  mayaResults.forEach(r => {
    html += `<div style="padding:8px;background:rgba(var(--accent-rgb),.06);border-radius:6px;margin-bottom:6px;">`;
    html += `<span class="kw">${r.type}</span>（${r.score}分）：${r.desc}`;
    html += `</div>`;
  });
  html += `</div>`;

  // 星座合盤
  html += `<h3>星座元素合盤</h3>`;
  html += `<div class="meaning">`;
  html += `<div style="display:flex;justify-content:center;gap:20px;margin-bottom:12px;">`;
  html += `<div style="text-align:center;"><span style="font-size:1.1rem;font-weight:700;">${zodiac.sign1.name}座</span><br><span style="font-size:.78rem;color:var(--muted);">你（${zodiac.sign1.elem}象）</span></div>`;
  html += `<div style="text-align:center;font-size:1.2rem;padding-top:4px;">×</div>`;
  html += `<div style="text-align:center;"><span style="font-size:1.1rem;font-weight:700;">${zodiac.sign2.name}座</span><br><span style="font-size:.78rem;color:var(--muted);">對方（${zodiac.sign2.elem}象）</span></div>`;
  html += `</div>`;
  html += `<div style="padding:10px;background:rgba(var(--accent-rgb),.08);border-radius:8px;">`;
  html += `<span class="kw">${zodiac.score}分</span> — ${zodiac.desc}`;
  html += `</div>`;
  html += `</div>`;

  return html;
}
