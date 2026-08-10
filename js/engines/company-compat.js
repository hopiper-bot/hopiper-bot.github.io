/**
 * company-compat.js — 職場合盤引擎
 * 
 * 把公司成立日期算出八字，再跟個人命盤做合盤分析：
 * 1. 公司八字排盤（四柱、日主、五行）
 * 2. LOGO 色五行 + 產業五行
 * 3. 你 vs 公司：十神關係、喜用神匹配、互補分析
 * 4. 綜合相合度 + 文字解讀
 */

import { dateToJDN } from '../lib/utils.js';
import { getLiChunJD, getMonthByJD } from '../lib/solar-terms.js';
import { julianDay } from '../lib/ephemeris.js';

// === 基礎資料（跟 bazi.js 相同，但獨立一份避免 circular） ===
const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const STEM_ELEMENT = { "甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水" };
const STEM_YINYANG = { "甲":"陽","乙":"陰","丙":"陽","丁":"陰","戊":"陽","己":"陰","庚":"陽","辛":"陰","壬":"陽","癸":"陰" };
const BRANCH_ELEMENT = { "子":"水","丑":"土","寅":"木","卯":"木","辰":"土","巳":"火","午":"火","未":"土","申":"金","酉":"金","戌":"土","亥":"水" };
const HIDDEN_STEMS = {
  "子":["癸"], "丑":["己","癸","辛"], "寅":["甲","丙","戊"], "卯":["乙"],
  "辰":["戊","乙","癸"], "巳":["丙","庚","戊"], "午":["丁","己"], "未":["己","丁","乙"],
  "申":["庚","壬","戊"], "酉":["辛"], "戌":["戊","辛","丁"], "亥":["壬","甲"],
};
const ELEMENT_CYCLE = ["木","火","土","金","水"];

// === LOGO 色 → 五行對照 ===
const COLOR_ELEMENT = {
  '紅色': '火', '橘色': '火', '紫色': '火', '粉紅': '火',
  '綠色': '木', '青色': '木', '墨綠': '木',
  '黃色': '土', '咖啡': '土', '米色': '土', '棕色': '土',
  '白色': '金', '金色': '金', '銀色': '金', '灰色': '金',
  '黑色': '水', '藍色': '水', '深藍': '水', '淺藍': '水',
};

// === 產業 → 五行對照 ===
const INDUSTRY_ELEMENT = {
  '科技硬體': '金', '金融保險': '金', '法律': '金', '機械': '金', '汽車': '金',
  '電子製造': '金', '半導體': '金', '精密工業': '金',
  '軟體網路': '水', '貿易物流': '水', '旅遊': '水', '傳媒': '水', '清潔': '水',
  '航運': '水', '飲料': '水',
  '教育出版': '木', '文創設計': '木', '服飾紡織': '木', '農林': '木', '醫療': '木',
  '生技醫藥': '木', '花藝園藝': '木',
  '餐飲': '火', '能源電力': '火', '光電': '火', '娛樂表演': '火', '美容': '火',
  '照明': '火', '廣告行銷': '火',
  '建築營造': '土', '房地產': '土', '陶瓷': '土', '畜牧': '土', '倉儲': '土',
  '食品加工': '土', '殯葬': '土',
};

// === 四柱計算（精簡版，不需大運/神煞） ===

function getRelation(elemA, elemB) {
  const iA = ELEMENT_CYCLE.indexOf(elemA);
  const iB = ELEMENT_CYCLE.indexOf(elemB);
  if (iA === iB) return "same";
  if ((iA + 1) % 5 === iB) return "iGive";
  if ((iA + 2) % 5 === iB) return "iControl";
  if ((iA + 3) % 5 === iB) return "controlMe";
  if ((iA + 4) % 5 === iB) return "giveMe";
  return "same";
}

function getTenGod(dayStem, otherStem) {
  const dayElem = STEM_ELEMENT[dayStem];
  const dayYY = STEM_YINYANG[dayStem];
  const otherElem = STEM_ELEMENT[otherStem];
  const otherYY = STEM_YINYANG[otherStem];
  const sameYY = (dayYY === otherYY);
  const rel = getRelation(dayElem, otherElem);
  switch(rel) {
    case "same": return sameYY ? "比肩" : "劫財";
    case "iGive": return sameYY ? "食神" : "傷官";
    case "iControl": return sameYY ? "偏財" : "正財";
    case "controlMe": return sameYY ? "七殺" : "正官";
    case "giveMe": return sameYY ? "偏印" : "正印";
    default: return "";
  }
}

function dayPillar(year, month, day, hour) {
  let jdn = dateToJDN(year, month, day);
  if (hour >= 23) jdn += 1;
  const base = dateToJDN(2000, 1, 7);
  const diff = ((jdn - base) % 60 + 60) % 60;
  return { stemIdx: diff % 10, branchIdx: diff % 12 };
}

function hourPillar(hour, dayStemIdx) {
  let branchIdx;
  if (hour >= 23 || hour < 1) branchIdx = 0;
  else if (hour < 3) branchIdx = 1;
  else if (hour < 5) branchIdx = 2;
  else if (hour < 7) branchIdx = 3;
  else if (hour < 9) branchIdx = 4;
  else if (hour < 11) branchIdx = 5;
  else if (hour < 13) branchIdx = 6;
  else if (hour < 15) branchIdx = 7;
  else if (hour < 17) branchIdx = 8;
  else if (hour < 19) branchIdx = 9;
  else if (hour < 21) branchIdx = 10;
  else branchIdx = 11;
  const startStemMap = [0, 2, 4, 6, 8];
  const startStem = startStemMap[dayStemIdx % 5];
  const stemIdx = (startStem + branchIdx) % 10;
  return { stemIdx, branchIdx };
}

function yearPillar(year, month, day, hour, minute, utcOffset) {
  const jd = julianDay(year, month, day, hour, minute, utcOffset);
  const liChunJD = getLiChunJD(year);
  let effectiveYear = year;
  if (jd < liChunJD) effectiveYear -= 1;
  const diff = ((effectiveYear - 1984) % 60 + 60) % 60;
  return { stemIdx: diff % 10, branchIdx: diff % 12 };
}

function monthPillar(year, month, day, hour, minute, utcOffset, yearStemIdx) {
  const jd = julianDay(year, month, day, hour, minute, utcOffset);
  const { monthIndex } = getMonthByJD(jd, year);
  const startStemMap = [2, 4, 6, 8, 0];
  const startStem = startStemMap[yearStemIdx % 5];
  const stemIdx = (startStem + monthIndex - 1) % 10;
  return { stemIdx, branchIdx: (monthIndex - 1 + 2) % 12, monthIndex };
}

/** 計算公司八字 */
function companyBazi(year, month, day, hour = 9, minute = 0) {
  const utcOffset = 8; // 台灣公司預設 UTC+8
  const yp = yearPillar(year, month, day, hour, minute, utcOffset);
  const mp = monthPillar(year, month, day, hour, minute, utcOffset, yp.stemIdx);
  const dp = dayPillar(year, month, day, hour);
  const hp = hourPillar(hour + minute / 60, dp.stemIdx);

  const pillars = {
    year: { stem: STEMS[yp.stemIdx], branch: BRANCHES[yp.branchIdx] },
    month: { stem: STEMS[mp.stemIdx], branch: BRANCHES[mp.branchIdx] },
    day: { stem: STEMS[dp.stemIdx], branch: BRANCHES[dp.branchIdx] },
    hour: { stem: STEMS[hp.stemIdx], branch: BRANCHES[hp.branchIdx] },
  };

  const dayMaster = pillars.day.stem;
  const dayMasterElem = STEM_ELEMENT[dayMaster];

  // 五行統計
  const elements = { 木:0, 火:0, 土:0, 金:0, 水:0 };
  const allStems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem];
  const allBranches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch];
  allStems.forEach(s => elements[STEM_ELEMENT[s]]++);
  allBranches.forEach(b => elements[BRANCH_ELEMENT[b]]++);
  allBranches.forEach(b => HIDDEN_STEMS[b].forEach(s => elements[STEM_ELEMENT[s]]++));

  return { pillars, dayMaster, dayMasterElem, elements };
}

// === 合盤分析核心 ===

/** 個人日主 vs 公司日主的十神關係 */
function personToCompanyGod(personDayMaster, companyDayMaster) {
  return getTenGod(personDayMaster, companyDayMaster);
}

/** 公司日主 vs 個人日主（反向：公司怎麼看你） */
function companyToPersonGod(companyDayMaster, personDayMaster) {
  return getTenGod(companyDayMaster, personDayMaster);
}

/** 計算個人喜用神（簡化版，跟 bazi.js 邏輯一致） */
function getXiyong(personDayMasterElem, personElements) {
  const total = Object.values(personElements).reduce((a,b) => a+b, 0);
  const meRatio = personElements[personDayMasterElem] / total;
  const iA = ELEMENT_CYCLE.indexOf(personDayMasterElem);
  if (meRatio > 0.25) {
    // 日主偏強 → 喜洩耗
    return [ELEMENT_CYCLE[(iA+1)%5], ELEMENT_CYCLE[(iA+2)%5]];
  } else {
    // 日主偏弱 → 喜生扶
    return [ELEMENT_CYCLE[(iA+4)%5], personDayMasterElem];
  }
}

/** 五行生剋文字 */
function relationText(elemA, elemB) {
  const rel = getRelation(elemA, elemB);
  const texts = {
    same: '比和（同類）',
    iGive: '你生它（你付出）',
    iControl: '你剋它（你掌控）',
    controlMe: '它剋你（它壓制你）',
    giveMe: '它生你（它滋養你）',
  };
  return texts[rel] || '';
}

/** 綜合評分 */
function calculateScore(personData, companyData, logoElem, industryElem) {
  let score = 50; // 基礎分
  const personElem = personData.dayMasterElem;
  const companyElem = companyData.dayMasterElem;
  const xiyong = getXiyong(personElem, personData.elements);

  // 1. 公司日主五行 vs 個人喜用神（最重 30 分）
  if (xiyong.includes(companyElem)) score += 25;
  else {
    const rel = getRelation(personElem, companyElem);
    if (rel === 'giveMe') score += 20;       // 公司生你
    else if (rel === 'same') score += 10;     // 同類
    else if (rel === 'iGive') score -= 5;     // 你付出（消耗）
    else if (rel === 'controlMe') score -= 10; // 它壓制你
    else if (rel === 'iControl') score += 5;  // 你掌控（偏財緣）
  }

  // 2. LOGO 色五行 vs 喜用神（15 分）
  if (logoElem) {
    if (xiyong.includes(logoElem)) score += 15;
    else if (logoElem === personElem) score += 8;
    else {
      const rel = getRelation(personElem, logoElem);
      if (rel === 'giveMe') score += 12;
      else if (rel === 'controlMe') score -= 5;
    }
  }

  // 3. 產業五行 vs 喜用神（10 分）
  if (industryElem) {
    if (xiyong.includes(industryElem)) score += 10;
    else if (industryElem === personElem) score += 5;
  }

  // 4. 公司五行缺什麼 vs 你有什麼（你能補公司的缺）→ 5 分
  const companyTotal = Object.values(companyData.elements).reduce((a,b)=>a+b,0);
  const companyWeak = Object.entries(companyData.elements)
    .filter(([,v]) => v / companyTotal < 0.08)
    .map(([k]) => k);
  if (companyWeak.includes(personElem)) score += 5;

  // 5. 十神關係加分
  const god = personToCompanyGod(personData.dayMaster, companyData.dayMaster);
  const godScore = {
    '正印': 8, '偏印': 5, '正官': 3, '比肩': 4, '劫財': -2,
    '食神': 6, '傷官': 2, '正財': 7, '偏財': 6, '七殺': -3,
  };
  score += (godScore[god] || 0);

  return Math.max(0, Math.min(100, Math.round(score)));
}

// === 十神關係解讀（公司對你是什麼角色） ===

const GOD_READING = {
  '比肩': {
    title: '戰友型',
    desc: '公司跟你是同類能量。你在這裡不會格格不入，氛圍跟你的頻率接近。但也意味著——你不會被「拉著成長」，需要自己推自己。',
    advice: '適合：喜歡自主、不想被管太多的人。不太適合：需要人帶著走的階段。'
  },
  '劫財': {
    title: '競爭型',
    desc: '公司跟你是同類但帶有競爭性。環境激烈、資源搶奪。你要夠強才能生存，但這種壓力也會磨出你最好的表現。',
    advice: '適合：抗壓性強、享受競爭快感的人。注意：別被環境吃掉你的本質。'
  },
  '食神': {
    title: '舞台型',
    desc: '公司是讓你發揮才華的舞台。你在這裡可以「做自己擅長的事」，環境支持你表達和創造。幸福感高。',
    advice: '適合：想用天賦賺錢、重視工作成就感的人。'
  },
  '傷官': {
    title: '突破型',
    desc: '公司激發你的叛逆和創新。你在這裡會一直想打破現狀、嘗試新東西。充滿能量但也容易跟體制衝突。',
    advice: '適合：有創新想法、不怕得罪人的角色。注意：別讓個人主義蓋過團隊合作。'
  },
  '正財': {
    title: '穩定收入型',
    desc: '公司對你來說是穩定的財源。你能在這裡踏實賺錢、累積資源。關係務實，彼此各取所需。',
    advice: '適合：追求穩定收入、不想冒太大風險的階段。'
  },
  '偏財': {
    title: '機會型',
    desc: '公司帶給你人脈和意外機會。你在這裡能接觸到各式各樣的資源和可能性。',
    advice: '適合：善於社交、靈活應變的人。把握機會比死守崗位重要。'
  },
  '正官': {
    title: '被管理型',
    desc: '公司帶給你結構和壓力。它會要求你符合規矩、承擔責任。對你是一種「正面壓力」——幫你建立紀律。',
    advice: '適合：需要外在結構幫你聚焦的階段。你會在規矩中找到成長。'
  },
  '七殺': {
    title: '高壓型',
    desc: '公司對你壓力山大。環境嚴苛、要求高、可能感覺被壓著喘不過氣。但——如果你撐住了，成長幅度會是最大的。',
    advice: '適合：人生需要突破瓶頸的階段（短期衝刺）。不適合：已經很疲累、需要喘息的時候。'
  },
  '正印': {
    title: '貴人型',
    desc: '公司對你來說像「學校」——滋養你、教你新東西、有人照顧你。你在這裡能被培養和提攜。相合度最高的關係之一。',
    advice: '適合：想學習成長、需要被支持的階段。珍惜這個環境。'
  },
  '偏印': {
    title: '轉型催化型',
    desc: '公司會推動你往「不一樣的方向」走。你在這裡會接觸到非主流的觀點和做法，思維會被打開。',
    advice: '適合：想轉型、想脫離舒適圈的人。但別待太久——學到就該走。'
  },
};

// === 反向解讀（你對公司是什麼角色） ===

const REVERSE_GOD_READING = {
  '比肩': '你跟公司是同頻的存在。你融入不費力，但也不會被特別凸顯。',
  '劫財': '你是公司裡的攪局者（好的那種）——你的存在帶來競爭和活力。',
  '食神': '你是公司的創意來源。你產出的東西對公司有滋養作用。',
  '傷官': '你是公司的挑戰者——你會指出問題、推動改變。',
  '正財': '你是公司的穩定資產。你帶來實質的貢獻和效益。',
  '偏財': '你為公司帶來人脈和機會。你的社交力是公司的外交武器。',
  '正官': '你是公司的管理力量。你帶來秩序和結構。',
  '七殺': '你是公司的壓力源（正面的）——你推著公司進步和改變。',
  '正印': '你是公司的導師型存在。你的知識和經驗滋養著公司。',
  '偏印': '你為公司帶來非主流的觀點和創新思路。',
};

// === 主要計算函數 ===

export function calculate(personBaziData, companyInput) {
  const { year, month, day, hour, logoColor, industry, companyName } = companyInput;

  // 1. 算公司八字
  const cBazi = companyBazi(year, month, day, hour || 9);

  // 2. LOGO / 產業五行
  const logoElem = COLOR_ELEMENT[logoColor] || null;
  const industryElem = INDUSTRY_ELEMENT[industry] || null;

  // 3. 十神關係
  const godToYou = personToCompanyGod(personBaziData.dayMaster, cBazi.dayMaster);
  const youToCompany = companyToPersonGod(cBazi.dayMaster, personBaziData.dayMaster);

  // 4. 喜用神
  const xiyong = getXiyong(personBaziData.dayMasterElem, personBaziData.elements);

  // 5. 評分
  const score = calculateScore(personBaziData, cBazi, logoElem, industryElem);

  // 6. 五行互補分析
  const companyTotal = Object.values(cBazi.elements).reduce((a,b)=>a+b,0);
  const companyWeak = Object.entries(cBazi.elements)
    .filter(([,v]) => v / companyTotal < 0.1)
    .map(([k]) => k);
  const youCanFill = companyWeak.includes(personBaziData.dayMasterElem);

  return {
    status: 'ok',
    companyName: companyName || '該公司',
    companyBazi: cBazi,
    logoElem,
    industryElem,
    godToYou,
    youToCompany,
    xiyong,
    score,
    companyWeak,
    youCanFill,
    personElem: personBaziData.dayMasterElem,
    html: renderCompat({
      companyName: companyName || '該公司',
      cBazi, logoElem, industryElem,
      godToYou, youToCompany, xiyong, score,
      companyWeak, youCanFill,
      personDayMaster: personBaziData.dayMaster,
      personElem: personBaziData.dayMasterElem,
    }),
  };
}

// === 渲染 ===

function renderCompat(data) {
  const { companyName, cBazi, logoElem, industryElem, godToYou, youToCompany,
          xiyong, score, companyWeak, youCanFill, personDayMaster, personElem } = data;

  const p = cBazi.pillars;
  const emojis = { 木:'🌳', 火:'🔥', 土:'⛰️', 金:'⚔️', 水:'💧' };

  // 評分顏色
  let scoreColor, scoreLabel;
  if (score >= 80) { scoreColor = '#4ade80'; scoreLabel = '極度契合'; }
  else if (score >= 65) { scoreColor = '#a78bfa'; scoreLabel = '相合度高'; }
  else if (score >= 50) { scoreColor = '#fbbf24'; scoreLabel = '中性偏合'; }
  else if (score >= 35) { scoreColor = '#fb923c'; scoreLabel = '略有摩擦'; }
  else { scoreColor = '#f87171'; scoreLabel = '張力明顯'; }

  const godInfo = GOD_READING[godToYou] || { title: '—', desc: '', advice: '' };
  const reverseText = REVERSE_GOD_READING[youToCompany] || '';

  // 公司五行 bar
  const cTotal = Object.values(cBazi.elements).reduce((a,b)=>a+b,0);
  const elemBars = Object.entries(cBazi.elements).map(([elem, count]) => {
    const pct = Math.round(count / cTotal * 100);
    return `<div style="display:flex;align-items:center;gap:6px;margin:3px 0;">
      <span style="width:42px;font-size:.8rem;">${emojis[elem]} ${elem}</span>
      <div style="flex:1;height:12px;background:var(--input-bg);border-radius:6px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:var(--accent2);border-radius:6px;"></div>
      </div>
      <span style="width:26px;font-size:.75rem;color:var(--muted);">${count}</span>
    </div>`;
  }).join('');

  // LOGO 色匹配
  let logoNote = '';
  if (logoElem) {
    if (xiyong.includes(logoElem)) {
      logoNote = `<span style="color:#4ade80;">✓ LOGO 色（${logoElem}）是你的喜用神！每天看到就在補運。</span>`;
    } else if (logoElem === personElem) {
      logoNote = `<span style="color:#a78bfa;">≈ LOGO 色（${logoElem}）跟你同屬${personElem}，比肩能量 — 你跟公司頻率共振。</span>`;
    } else {
      const rel = getRelation(personElem, logoElem);
      if (rel === 'giveMe') {
        logoNote = `<span style="color:#4ade80;">✓ LOGO 色（${logoElem}）生你的${personElem} — 公司視覺形象在滋養你。</span>`;
      } else if (rel === 'controlMe') {
        logoNote = `<span style="color:#fb923c;">△ LOGO 色（${logoElem}）剋你的${personElem} — 有壓力感，但壓力也是動力。</span>`;
      } else {
        logoNote = `<span style="color:var(--muted);">LOGO 色（${logoElem}）vs 你（${personElem}）：${relationText(personElem, logoElem)}</span>`;
      }
    }
  }

  // 產業五行匹配
  let industryNote = '';
  if (industryElem) {
    if (xiyong.includes(industryElem)) {
      industryNote = `<span style="color:#4ade80;">✓ 這個產業五行（${industryElem}）是你的喜用神！你在這個行業自帶 buff。</span>`;
    } else {
      const rel = getRelation(personElem, industryElem);
      if (rel === 'giveMe') industryNote = `<span style="color:#4ade80;">✓ 產業五行（${industryElem}）生你 — 行業本身在餵養你。</span>`;
      else if (rel === 'same') industryNote = `<span style="color:#a78bfa;">≈ 產業五行（${industryElem}）跟你同類 — 你天生理解這個行業的運作。</span>`;
      else if (rel === 'iGive') industryNote = `<span style="color:#fbbf24;">○ 產業五行（${industryElem}）消耗你的能量 — 你在付出，要確保有回報。</span>`;
      else if (rel === 'controlMe') industryNote = `<span style="color:#fb923c;">△ 產業五行（${industryElem}）壓制你 — 這行業對你有壓力，但壓力也可以是成長。</span>`;
      else industryNote = `<span style="color:var(--muted);">產業五行（${industryElem}）vs 你（${personElem}）：${relationText(personElem, industryElem)}</span>`;
    }
  }

  // 你能補什麼
  let fillNote = '';
  if (youCanFill) {
    fillNote = `<div style="margin-top:10px;padding:8px 12px;background:rgba(74,222,128,.08);border-radius:8px;font-size:.85rem;">
      💎 公司五行缺 <b>${companyWeak.join('、')}</b>，而你是 <b>${personElem}</b> 人 — 你的存在本身就在幫公司補缺。你對這家公司的價值不只是工作能力，是「體質」上的互補。
    </div>`;
  } else if (companyWeak.length > 0) {
    fillNote = `<div style="margin-top:10px;padding:8px 12px;background:rgba(255,255,255,.03);border-radius:8px;font-size:.85rem;color:var(--muted);">
      公司五行偏弱：${companyWeak.join('、')}。你的${personElem}不直接補這個缺，但不代表不適合 — 看十神關係更準。
    </div>`;
  }

  return `
    <div class="sig" style="margin-bottom:16px;">
      <div class="kin">職場合盤</div>
      <div class="big" style="font-size:1.3rem;">${personDayMaster}（你）× ${cBazi.dayMaster}（${companyName}）</div>
    </div>

    <!-- 相合度評分 -->
    <div style="text-align:center;margin:20px 0;">
      <div style="font-size:3rem;font-weight:700;color:${scoreColor};">${score}</div>
      <div style="font-size:1rem;color:${scoreColor};font-weight:600;">${scoreLabel}</div>
      <div style="font-size:.8rem;color:var(--muted);margin-top:4px;">綜合相合度（滿分 100）</div>
    </div>

    <div class="divider"></div>

    <!-- 公司八字 -->
    <h3>🏢 ${companyName}的八字</h3>
    <div style="overflow-x:auto;margin:10px 0;">
      <table style="width:100%;border-collapse:collapse;text-align:center;font-size:.9rem;">
        <thead>
          <tr style="color:var(--muted);font-size:.75rem;border-bottom:1px solid var(--card-border);">
            <th style="padding:6px;">年柱</th><th style="padding:6px;">月柱</th>
            <th style="padding:6px;color:var(--accent);">日柱</th><th style="padding:6px;">時柱</th>
          </tr>
        </thead>
        <tbody>
          <tr style="font-size:1.3rem;font-weight:700;">
            <td style="padding:6px;">${p.year.stem}${p.year.branch}</td>
            <td style="padding:6px;">${p.month.stem}${p.month.branch}</td>
            <td style="padding:6px;color:var(--accent);">${p.day.stem}${p.day.branch}</td>
            <td style="padding:6px;">${p.hour.stem}${p.hour.branch}</td>
          </tr>
          <tr style="font-size:.75rem;color:var(--muted);">
            <td>${STEM_ELEMENT[p.year.stem]}/${BRANCH_ELEMENT[p.year.branch]}</td>
            <td>${STEM_ELEMENT[p.month.stem]}/${BRANCH_ELEMENT[p.month.branch]}</td>
            <td style="color:var(--accent);">${STEM_ELEMENT[p.day.stem]}/${BRANCH_ELEMENT[p.day.branch]}</td>
            <td>${STEM_ELEMENT[p.hour.stem]}/${BRANCH_ELEMENT[p.hour.branch]}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p style="font-size:.85rem;color:var(--muted);">公司日主：<b style="color:var(--accent);">${cBazi.dayMaster}（${cBazi.dayMasterElem}）</b></p>

    <h3 style="margin-top:14px;">公司五行分佈</h3>
    ${elemBars}

    ${fillNote}

    <div class="divider"></div>

    <!-- 十神關係 -->
    <h3>🤝 你和${companyName}的關係</h3>
    <div style="margin:12px 0;padding:12px;background:rgba(123,108,246,.06);border-radius:10px;">
      <div style="font-size:.8rem;color:var(--muted);margin-bottom:4px;">公司對你來說是...</div>
      <div style="font-size:1.2rem;font-weight:700;color:var(--accent);">${godToYou}（${godInfo.title}）</div>
      <p style="font-size:.88rem;margin-top:8px;line-height:1.7;">${godInfo.desc}</p>
      <p style="font-size:.82rem;color:var(--muted);margin-top:6px;">${godInfo.advice}</p>
    </div>
    <div style="margin:12px 0;padding:12px;background:rgba(255,255,255,.03);border-radius:10px;">
      <div style="font-size:.8rem;color:var(--muted);margin-bottom:4px;">你對公司來說是...</div>
      <div style="font-size:1rem;font-weight:600;">${youToCompany}</div>
      <p style="font-size:.85rem;margin-top:6px;line-height:1.6;">${reverseText}</p>
    </div>

    <div class="divider"></div>

    <!-- LOGO / 產業 -->
    <h3>🎨 視覺與產業能量</h3>
    ${logoElem ? `<div style="margin:8px 0;font-size:.88rem;line-height:1.7;">${logoNote}</div>` : ''}
    ${industryElem ? `<div style="margin:8px 0;font-size:.88rem;line-height:1.7;">${industryNote}</div>` : ''}

    <div class="divider"></div>

    <!-- 喜用神對照 -->
    <h3>💎 你的喜用神 vs 公司環境</h3>
    <p style="font-size:.88rem;line-height:1.7;">
      你的喜用五行：<b style="color:var(--accent);">${xiyong.join('、')}</b><br>
      公司主要能量：<b>${cBazi.dayMasterElem}</b>
      ${xiyong.includes(cBazi.dayMasterElem) 
        ? '<span style="color:#4ade80;"> ✓ 公司核心五行正好是你的喜用神！在這裡待著本身就在「補運」。</span>'
        : `<span style="color:var(--muted);"> — ${relationText(personElem, cBazi.dayMasterElem)}</span>`}
    </p>

    <div class="note" style="margin-top:16px;">
      💡 合盤看的是「體質合不合」，不是「能不能做好工作」。分數低不代表不該待，可能代表你在那裡是磨練模式。分數高代表你在那裡「自然舒服」，流動順暢。
    </div>
  `;
}

// Export helpers for UI
export { COLOR_ELEMENT, INDUSTRY_ELEMENT };

// ============ 星座合盤 ============

const ZODIAC_DATES = [
  { sign: '摩羯座', start: [1,1], end: [1,19] },
  { sign: '水瓶座', start: [1,20], end: [2,18] },
  { sign: '雙魚座', start: [2,19], end: [3,20] },
  { sign: '牡羊座', start: [3,21], end: [4,19] },
  { sign: '金牛座', start: [4,20], end: [5,20] },
  { sign: '雙子座', start: [5,21], end: [6,20] },
  { sign: '巨蟹座', start: [6,21], end: [7,22] },
  { sign: '獅子座', start: [7,23], end: [8,22] },
  { sign: '處女座', start: [8,23], end: [9,22] },
  { sign: '天秤座', start: [9,23], end: [10,22] },
  { sign: '天蠍座', start: [10,23], end: [11,21] },
  { sign: '射手座', start: [11,22], end: [12,21] },
  { sign: '摩羯座', start: [12,22], end: [12,31] },
];

const ZODIAC_ELEMENT = {
  '牡羊座':'火', '獅子座':'火', '射手座':'火',
  '金牛座':'土', '處女座':'土', '摩羯座':'土',
  '雙子座':'風', '天秤座':'風', '水瓶座':'風',
  '巨蟹座':'水', '天蠍座':'水', '雙魚座':'水',
};

const ZODIAC_MODALITY = {
  '牡羊座':'開創', '巨蟹座':'開創', '天秤座':'開創', '摩羯座':'開創',
  '金牛座':'固定', '獅子座':'固定', '天蠍座':'固定', '水瓶座':'固定',
  '雙子座':'變動', '處女座':'變動', '射手座':'變動', '雙魚座':'變動',
};

function getZodiacSign(month, day) {
  for (const z of ZODIAC_DATES) {
    const [sm, sd] = z.start;
    const [em, ed] = z.end;
    if (month === sm && day >= sd && month === em && day <= ed) return z.sign;
    if (month === sm && day >= sd && sm !== em) return z.sign;
    if (month === em && day <= ed && sm !== em) return z.sign;
  }
  return '摩羯座';
}

function zodiacCompat(sign1, sign2) {
  const e1 = ZODIAC_ELEMENT[sign1];
  const e2 = ZODIAC_ELEMENT[sign2];
  if (e1 === e2) return { level: '極合', score: 95, desc: '同元素！你們是同一個頻道的存在，溝通零障礙。' };
  const harmonious = { '火':'風', '風':'火', '水':'土', '土':'水' };
  if (harmonious[e1] === e2) return { level: '相合', score: 80, desc: '互補元素，彼此激發對方的優勢。' };
  if (e1 === '火' && e2 === '水' || e1 === '水' && e2 === '火') return { level: '有張力', score: 45, desc: '水火對沖——衝突也可以是成長的摩擦力。' };
  if (e1 === '風' && e2 === '土' || e1 === '土' && e2 === '風') return { level: '需磨合', score: 50, desc: '風土差異大——一個飛一個穩，需要互相理解。' };
  return { level: '中性', score: 60, desc: '不特別合也不特別衝，端看其他因素。' };
}

export function calculateAstro(personAstroData, companyInput) {
  const { month, day, companyName, personMonth, personDay } = companyInput;
  const companySign = getZodiacSign(month, day);
  const companyElem = ZODIAC_ELEMENT[companySign];
  const companyModality = ZODIAC_MODALITY[companySign];

  // 個人太陽星座：優先用 astro engine 結果，fallback 用出生日期直接算
  let personSign = '';
  if (personAstroData && personAstroData.sunSign) {
    personSign = typeof personAstroData.sunSign === 'string' ? personAstroData.sunSign : (personAstroData.sunSign.zh || '');
  }
  if (!personSign && personMonth && personDay) {
    personSign = getZodiacSign(personMonth, personDay);
  }
  const personElem = ZODIAC_ELEMENT[personSign] || '';

  const compat = personSign ? zodiacCompat(personSign, companySign) : null;

  return {
    status: 'ok',
    html: renderAstroCompat({ companyName: companyName || '該公司', companySign, companyElem, companyModality, personSign, personElem, compat }),
  };
}

function renderAstroCompat(data) {
  const { companyName, companySign, companyElem, companyModality, personSign, personElem, compat } = data;
  const signEmoji = { '牡羊座':'♈', '金牛座':'♉', '雙子座':'♊', '巨蟹座':'♋', '獅子座':'♌', '處女座':'♍', '天秤座':'♎', '天蠍座':'♏', '射手座':'♐', '摩羯座':'♑', '水瓶座':'♒', '雙魚座':'♓' };

  let compatHtml = '';
  if (compat) {
    const color = compat.score >= 80 ? '#4ade80' : compat.score >= 60 ? '#fbbf24' : '#fb923c';
    compatHtml = `
      <div style="margin-top:12px;padding:12px;background:rgba(123,108,246,.06);border-radius:10px;">
        <div style="font-size:.8rem;color:var(--muted);">星座相合度</div>
        <div style="font-size:1.5rem;font-weight:700;color:${color};">${compat.score} — ${compat.level}</div>
        <p style="font-size:.85rem;margin-top:6px;">${personSign}（${personElem}）× ${companySign}（${companyElem}）：${compat.desc}</p>
      </div>`;
  }

  return `
    <div style="margin-top:16px;padding:14px;background:rgba(255,255,255,.02);border-radius:10px;border:1px solid var(--card-border);">
      <div style="font-size:.8rem;color:var(--muted);margin-bottom:4px;">🌟 星座合盤</div>
      <div style="font-size:1.1rem;font-weight:600;">${signEmoji[companySign]||''} ${companyName}是${companySign}</div>
      <div style="font-size:.82rem;color:var(--muted);margin-top:4px;">元素：${companyElem} ｜ 模式：${companyModality}</div>
      ${compatHtml}
    </div>`;
}

// ============ 馬雅合盤 ============

const MAYA_SEALS = ['紅龍','白風','藍夜','黃種子','紅蛇','白世界橋','藍手','黃星','紅月','白狗','藍猴','黃人','紅天行者','白巫師','藍鷹','黃戰士','紅地球','白鏡','藍風暴','黃太陽'];
const MAYA_COLORS = ['紅','白','藍','黃'];
const MAYA_MONTH_OFF = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

function mayaKin(y, m, d) {
  const yearVal = ((217 + 105 * (y - 2013)) % 260 + 260) % 260;
  const kin = ((yearVal + MAYA_MONTH_OFF[m - 1] + d - 1) % 260 + 260) % 260 + 1;
  return kin;
}

function kinToSealTone(kin) {
  const sealIdx = (kin - 1) % 20;
  const tone = ((kin - 1) % 13) + 1;
  return { seal: MAYA_SEALS[sealIdx], sealIdx, tone, color: MAYA_COLORS[sealIdx % 4] };
}

// 馬雅合盤：看兩個 Kin 的關係
function mayaRelation(seal1Idx, seal2Idx) {
  const diff = ((seal2Idx - seal1Idx) % 20 + 20) % 20;
  if (diff === 0) return { type: '相同印記', desc: '你們是同一個印記！頻率完全一致，幾乎是照鏡子。', score: 95 };
  if (diff === 10) return { type: '挑戰擴展', desc: '互為挑戰——你們在一起會被推出舒適圈，但成長最快。', score: 55 };
  if (diff === 2 || diff === 18) return { type: '類似支持', desc: '相似頻率，互相支持、容易理解彼此。', score: 85 };
  if (diff === 6 || diff === 14) return { type: '神秘夥伴', desc: '說不出為什麼就是被吸引——神秘的共振頻率。', score: 75 };
  if (diff === 4 || diff === 16) return { type: '引導關係', desc: '其中一方會引導另一方前進。', score: 80 };
  if (diff === 8 || diff === 12) return { type: '互補關係', desc: '彼此互補，一個人的弱點是另一個的強項。', score: 70 };
  // 同色系
  if (seal1Idx % 4 === seal2Idx % 4) return { type: '同色家族', desc: '同屬一個色彩家族，底層動力相似。', score: 72 };
  return { type: '各自獨立', desc: '沒有特定的馬雅連結，各跑各的軌道。', score: 60 };
}

export function calculateMaya(personMayaData, companyInput) {
  const { year, month, day, companyName } = companyInput;
  const companyKin = mayaKin(year, month, day);
  const company = kinToSealTone(companyKin);

  // 個人馬雅
  const personSeal = personMayaData?.dreamspell?.seal?.zh || '';
  const personSealIdx = MAYA_SEALS.indexOf(personSeal);
  const personKin = personMayaData?.dreamspell?.kin || 0;
  const personTone = personMayaData?.dreamspell?.tone?.num || 0;

  const relation = personSealIdx >= 0 ? mayaRelation(personSealIdx, company.sealIdx) : null;

  return {
    status: 'ok',
    html: renderMayaCompat({ companyName: companyName || '該公司', companyKin, company, personSeal, personKin, personTone, relation }),
  };
}

function renderMayaCompat(data) {
  const { companyName, companyKin, company, personSeal, personKin, personTone, relation } = data;
  const colorEmoji = { '紅':'🔴', '白':'⚪', '藍':'🔵', '黃':'🟡' };

  let relationHtml = '';
  if (relation) {
    const color = relation.score >= 80 ? '#4ade80' : relation.score >= 60 ? '#fbbf24' : '#fb923c';
    relationHtml = `
      <div style="margin-top:12px;padding:12px;background:rgba(123,108,246,.06);border-radius:10px;">
        <div style="font-size:.8rem;color:var(--muted);">馬雅印記關係</div>
        <div style="font-size:1.2rem;font-weight:700;color:${color};">${relation.type}</div>
        <p style="font-size:.85rem;margin-top:6px;">${personSeal} × ${company.seal}：${relation.desc}</p>
      </div>`;
  }

  return `
    <div style="margin-top:16px;padding:14px;background:rgba(255,255,255,.02);border-radius:10px;border:1px solid var(--card-border);">
      <div style="font-size:.8rem;color:var(--muted);margin-bottom:4px;">🌀 馬雅合盤</div>
      <div style="font-size:1.1rem;font-weight:600;">${colorEmoji[company.color]||''} ${companyName}是 KIN ${companyKin}：${company.color}${company.seal}・調性 ${company.tone}</div>
      <div style="font-size:.82rem;color:var(--muted);margin-top:4px;">你是 KIN ${personKin}：${personSeal}・調性 ${personTone}</div>
      ${relationHtml}
    </div>`;
}
