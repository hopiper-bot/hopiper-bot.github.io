/**
 * bazi.js — 四柱八字引擎
 * 年柱（立春為界）、月柱（節氣邊界）、日柱（六十甲子）、時柱（時辰）
 * + 藏干、十神、五行統計
 */

import { dateTimeToJD, dateToJDN } from '../lib/utils.js';
import { getLiChunJD, getMonthByJD, getAllSolarTerms } from '../lib/solar-terms.js';
import { julianDay } from '../lib/ephemeris.js';

// === 天干地支資料 ===
const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

// 天干五行
const STEM_ELEMENT = { "甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水" };
// 天干陰陽
const STEM_YINYANG = { "甲":"陽","乙":"陰","丙":"陽","丁":"陰","戊":"陽","己":"陰","庚":"陽","辛":"陰","壬":"陽","癸":"陰" };

// 地支五行
const BRANCH_ELEMENT = { "子":"水","丑":"土","寅":"木","卯":"木","辰":"土","巳":"火","午":"火","未":"土","申":"金","酉":"金","戌":"土","亥":"水" };

// 地支藏干
const HIDDEN_STEMS = {
  "子":["癸"], "丑":["己","癸","辛"], "寅":["甲","丙","戊"], "卯":["乙"],
  "辰":["戊","乙","癸"], "巳":["丙","庚","戊"], "午":["丁","己"], "未":["己","丁","乙"],
  "申":["庚","壬","戊"], "酉":["辛"], "戌":["戊","辛","丁"], "亥":["壬","甲"],
};

// 十神對照（日主 vs 其他干）
// 同元素同陰陽=比肩, 同元素異陰陽=劫財
// 我生同陰陽=食神, 我生異陰陽=傷官
// 我剋同陰陽=偏財, 我剋異陰陽=正財
// 剋我同陰陽=七殺, 剋我異陰陽=正官
// 生我同陰陽=偏印, 生我異陰陽=正印
const ELEMENT_CYCLE = ["木","火","土","金","水"]; // 相生順序

function getRelation(elemA, elemB) {
  const iA = ELEMENT_CYCLE.indexOf(elemA);
  const iB = ELEMENT_CYCLE.indexOf(elemB);
  if (iA === iB) return "same";      // 同我
  if ((iA + 1) % 5 === iB) return "iGive";   // 我生
  if ((iA + 2) % 5 === iB) return "iControl"; // 我剋
  if ((iA + 3) % 5 === iB) return "controlMe"; // 剋我
  if ((iA + 4) % 5 === iB) return "giveMe";   // 生我
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

// === 四柱計算 ===

/** 日柱：用 JDN 基準 + 六十甲子 */
function dayPillar(year, month, day, hour) {
  // 日界：23:00 換日（子時開始）
  let jdn = dateToJDN(year, month, day);
  if (hour >= 23) jdn += 1; // 23:00後算隔天的日柱
  // 基準：1900/1/1 = 甲子日 (index 0)... 實際上 1900/1/1 是庚子日
  // 用已知基準：2000/1/7 = 甲子日
  const base = dateToJDN(2000, 1, 7); // 甲子日
  const diff = ((jdn - base) % 60 + 60) % 60;
  return { stemIdx: diff % 10, branchIdx: diff % 12 };
}

/** 時柱 */
function hourPillar(hour, dayStemIdx) {
  // 時辰：子(23-1) 丑(1-3) 寅(3-5) 卯(5-7) 辰(7-9) 巳(9-11) 午(11-13) 未(13-15) 申(15-17) 酉(17-19) 戌(19-21) 亥(21-23)
  let branchIdx;
  if (hour >= 23 || hour < 1) branchIdx = 0;      // 子
  else if (hour < 3) branchIdx = 1;  // 丑
  else if (hour < 5) branchIdx = 2;  // 寅
  else if (hour < 7) branchIdx = 3;  // 卯
  else if (hour < 9) branchIdx = 4;  // 辰
  else if (hour < 11) branchIdx = 5; // 巳
  else if (hour < 13) branchIdx = 6; // 午
  else if (hour < 15) branchIdx = 7; // 未
  else if (hour < 17) branchIdx = 8; // 申
  else if (hour < 19) branchIdx = 9; // 酉
  else if (hour < 21) branchIdx = 10; // 戌
  else branchIdx = 11; // 亥

  // 時干由日干決定（五鼠遁日起時）
  // 甲己日起甲子時、乙庚日起丙子時、丙辛日起戊子時、丁壬日起庚子時、戊癸日起壬子時
  const startStemMap = [0, 2, 4, 6, 8]; // 甲丙戊庚壬
  const startStem = startStemMap[dayStemIdx % 5];
  const stemIdx = (startStem + branchIdx) % 10;

  return { stemIdx, branchIdx };
}

/** 年柱（以立春為界） */
function yearPillar(year, month, day, hour, minute, utcOffset) {
  const jd = julianDay(year, month, day, hour, minute, utcOffset);
  const liChunJD = getLiChunJD(year);

  let effectiveYear = year;
  if (jd < liChunJD) effectiveYear -= 1;

  // 年柱：以 1984 甲子年為基準
  const diff = ((effectiveYear - 1984) % 60 + 60) % 60;
  return { stemIdx: diff % 10, branchIdx: diff % 12, effectiveYear };
}

/** 月柱 */
function monthPillar(year, month, day, hour, minute, utcOffset, yearStemIdx) {
  const jd = julianDay(year, month, day, hour, minute, utcOffset);
  const { monthIndex } = getMonthByJD(jd, year);

  // 月干由年干推算（五虎遁年起月）
  // 甲己年起丙寅月、乙庚年起戊寅月、丙辛年起庚寅月、丁壬年起壬寅月、戊癸年起甲寅月
  const startStemMap = [2, 4, 6, 8, 0]; // 丙戊庚壬甲
  const startStem = startStemMap[yearStemIdx % 5];
  const stemIdx = (startStem + monthIndex - 1) % 10;
  const branchIdx = (monthIndex + 1) % 12; // 寅月=monthIndex 1 → branch 寅=2

  return { stemIdx, branchIdx: (monthIndex - 1 + 2) % 12, monthIndex };
}

// === 大運計算 ===

function calculateDayun(monthStemIdx, monthBranchIdx, isForward, dayMaster, birthYear, birthJD) {
  const steps = [];

  // 精確起運年齡：出生日到最近「節」的天數 ÷ 3（四捨五入）
  // 順排 → 找下一個節；逆排 → 找前一個節
  let startAge = 2; // fallback
  try {
    // 取出生年前後的節氣（只取「節」，即偶數 index）
    const prevTerms = getAllSolarTerms(birthYear - 1);
    const currTerms = getAllSolarTerms(birthYear);
    const nextTerms = getAllSolarTerms(birthYear + 1);
    const allJie = [...prevTerms, ...currTerms, ...nextTerms]
      .filter(t => t.index % 2 === 0)
      .sort((a, b) => a.jd - b.jd);

    if (isForward) {
      // 找出生後最近的「節」
      const nextJie = allJie.find(t => t.jd > birthJD);
      if (nextJie) {
        const daysDiff = nextJie.jd - birthJD;
        startAge = Math.round(daysDiff / 3);
      }
    } else {
      // 找出生前最近的「節」
      const prevJie = [...allJie].reverse().find(t => t.jd <= birthJD);
      if (prevJie) {
        const daysDiff = birthJD - prevJie.jd;
        startAge = Math.round(daysDiff / 3);
      }
    }
    // 確保合理範圍
    if (startAge < 0) startAge = 0;
    if (startAge > 10) startAge = 10;
  } catch (e) {
    startAge = 2; // 計算失敗時用預設值
  }

  for (let i = 0; i < 8; i++) {
    let sIdx, bIdx;
    if (isForward) {
      sIdx = (monthStemIdx + i + 1) % 10;
      bIdx = (monthBranchIdx + i + 1) % 12;
    } else {
      sIdx = ((monthStemIdx - i - 1) % 10 + 10) % 10;
      bIdx = ((monthBranchIdx - i - 1) % 12 + 12) % 12;
    }
    const age = startAge + i * 10;
    const stem = STEMS[sIdx];
    const branch = BRANCHES[bIdx];
    const god = getTenGod(dayMaster, stem);
    const yearStart = birthYear + age;
    const yearEnd = yearStart + 9;
    steps.push({ age, stem, branch, god, yearStart, yearEnd, stemIdx: sIdx, branchIdx: bIdx });
  }
  return steps;
}

// === 神煞計算 ===

function calculateShensha(pillars) {
  const results = [];
  const dayBranch = pillars.day.branch;
  const yearBranch = pillars.year.branch;
  const dayStem = pillars.day.stem;
  const allBranches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch];

  // 天乙貴人（日干查）
  const tianyiMap = { "甲":["丑","未"], "乙":["子","申"], "丙":["亥","酉"], "丁":["亥","酉"], "戊":["丑","未"], "己":["子","申"], "庚":["丑","未"], "辛":["寅","午"], "壬":["卯","巳"], "癸":["卯","巳"] };
  const tianyiBranches = tianyiMap[dayStem] || [];
  if (allBranches.some(b => tianyiBranches.includes(b))) {
    results.push({ name: "天乙貴人", desc: "你命中帶貴人 — 遇到困難時總有人在關鍵時刻伸出援手。善用你的人脈，主動結交比你層次高的人，貴人運才會啟動。" });
  }

  // 文昌（日干查）
  const wenchangMap = { "甲":"巳", "乙":"午", "丙":"申", "丁":"酉", "戊":"申", "己":"酉", "庚":"亥", "辛":"子", "壬":"寅", "癸":"卯" };
  if (allBranches.includes(wenchangMap[dayStem])) {
    results.push({ name: "文昌", desc: "你有文昌星 — 學習能力強、考試運好、文字表達有天賦。適合從事需要知識和文字的工作：寫作、教育、研究、法律。" });
  }

  // 桃花（日支或年支查）
  const taohuaMap = { "子":"酉", "丑":"午", "寅":"卯", "卯":"子", "辰":"酉", "巳":"午", "午":"卯", "未":"子", "申":"酉", "酉":"午", "戌":"卯", "亥":"子" };
  const taohua = taohuaMap[dayBranch];
  if (allBranches.includes(taohua)) {
    results.push({ name: "桃花", desc: "你命帶桃花 — 人緣好、異性緣強、有魅力。這不一定是爛桃花，而是你天生有吸引人的氣質。善用在事業上（業務、公關、表演）效果加倍。" });
  }

  // 驛馬（年支或日支查）
  const yimaMap = { "寅":"申", "申":"寅", "巳":"亥", "亥":"巳", "子":"午", "午":"子", "卯":"酉", "酉":"卯", "辰":"戌", "戌":"辰", "丑":"未", "未":"丑" };
  // 正確驛馬：寅午戌馬在申、申子辰馬在寅、巳酉丑馬在亥、亥卯未馬在巳
  const yimaGroup = { "寅":"申","午":"申","戌":"申", "申":"寅","子":"寅","辰":"寅", "巳":"亥","酉":"亥","丑":"亥", "亥":"巳","卯":"巳","未":"巳" };
  const myYima = yimaGroup[yearBranch];
  if (myYima && allBranches.includes(myYima)) {
    results.push({ name: "驛馬", desc: "你命帶驛馬 — 一生與「動」有緣：搬家、出差、旅行、換工作。你適合不被綁在一個地方的生活方式。跨區域或國際性的工作對你有利。" });
  }

  // 華蓋（年支查）
  const huagaiGroup = { "寅":"戌","午":"戌","戌":"戌", "申":"辰","子":"辰","辰":"辰", "巳":"丑","酉":"丑","丑":"丑", "亥":"未","卯":"未","未":"未" };
  const myHuagai = huagaiGroup[yearBranch];
  if (myHuagai && allBranches.includes(myHuagai)) {
    results.push({ name: "華蓋", desc: "你命帶華蓋 — 有靈性、愛研究、喜歡獨處思考。你適合深度的知識工作、靈性修行或藝術創作。有時候會覺得跟大眾格格不入，但這是你深度的來源。" });
  }

  // 羊刃（日干查）
  const yangren = { "甲":"卯", "乙":"寅", "丙":"午", "丁":"巳", "戊":"午", "己":"巳", "庚":"酉", "辛":"申", "壬":"子", "癸":"亥" };
  if (allBranches.includes(yangren[dayStem])) {
    results.push({ name: "羊刃", desc: "你命帶羊刃 — 有魄力、膽子大、行動果斷。這是一把雙面刃：用得好是領導力和決斷力，用不好是衝動和攻擊性。適合需要魄力的工作，但要注意控制脾氣。" });
  }

  // 天德貴人（月支查）
  const tiandeMap = { "寅":"丁", "卯":"申", "辰":"壬", "巳":"辛", "午":"亥", "未":"甲", "申":"癸", "酉":"寅", "戌":"丙", "亥":"乙", "子":"巳", "丑":"庚" };
  const tiande = tiandeMap[pillars.month.branch];
  if (tiande && (allBranches.includes(tiande) || [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem].includes(tiande))) {
    results.push({ name: "天德貴人", desc: "你命帶天德 — 一生有福氣護持，逢凶化吉的能力比別人強。即使遇到困難也不會太慘，總是有轉圜餘地。心態保持善良，福氣會更強。" });
  }

  // ===== 凶煞 =====

  // 劫煞（年支查）
  const jieshaGroup = { "寅":"亥","午":"亥","戌":"亥", "申":"巳","子":"巳","辰":"巳", "巳":"寅","酉":"寅","丑":"寅", "亥":"申","卯":"申","未":"申" };
  const myJiesha = jieshaGroup[yearBranch];
  if (myJiesha && allBranches.includes(myJiesha)) {
    results.push({ name: "劫煞", type: "凶", desc: "你命帶劫煞 — 代表容易遇到突發狀況或破財風險。但換個角度看，這也讓你比一般人更有危機意識和應變能力。理財上保守一點、避免衝動消費或投機，就能把劫煞的殺傷力降到最低。" });
  }

  // 亡神（年支查）
  const wangshenGroup = { "寅":"巳","午":"巳","戌":"巳", "申":"亥","子":"亥","辰":"亥", "巳":"申","酉":"申","丑":"申", "亥":"寅","卯":"寅","未":"寅" };
  const myWangshen = wangshenGroup[yearBranch];
  if (myWangshen && allBranches.includes(myWangshen)) {
    results.push({ name: "亡神", type: "凶", desc: "你命帶亡神 — 精神容易耗損，也較容易招惹小人。好處是你的直覺很強、觀察力敏銳，能看到別人看不到的細節。學會保護自己的能量，少跟消耗你的人糾纏。" });
  }

  // 孤辰（年支查）
  const guchenGroup = { "寅":"巳","卯":"巳","辰":"巳", "巳":"申","午":"申","未":"申", "申":"亥","酉":"亥","戌":"亥", "亥":"寅","子":"寅","丑":"寅" };
  const myGuchen = guchenGroup[yearBranch];
  if (myGuchen && allBranches.includes(myGuchen)) {
    results.push({ name: "孤辰", type: "凶", desc: "你命帶孤辰 — 內心有一種不容易被理解的孤獨感，人群中也能感到疏離。但這份獨立性也是你的資產：你不依賴他人、自主性強。找到能理解你的少數人就夠了，不需要討好所有人。" });
  }

  // 寡宿（年支查）
  const guasuGroup = { "寅":"丑","卯":"丑","辰":"丑", "巳":"辰","午":"辰","未":"辰", "申":"未","酉":"未","戌":"未", "亥":"戌","子":"戌","丑":"戌" };
  const myGuasu = guasuGroup[yearBranch];
  if (myGuasu && allBranches.includes(myGuasu)) {
    results.push({ name: "寡宿", type: "凶", desc: "你命帶寡宿 — 感情路上可能比較波折，或是晚婚傾向。但這不代表注定孤單，而是你對伴侶的要求比較高、不願意將就。寧缺勿濫反而能遇到對的人。" });
  }

  // 空亡（日柱查，以日干支所在旬來定）
  const stems = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
  const branches = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
  const dayStemIdx = stems.indexOf(pillars.day.stem);
  const dayBranchIdx = branches.indexOf(pillars.day.branch);
  // 甲子旬序 = (dayStemIdx - dayBranchIdx + 12) % 12 ... 用六十甲子算
  // 簡易算法：該旬起始地支 index = (dayBranchIdx - dayStemIdx + 12) % 12
  const xunStartBranchIdx = (dayBranchIdx - dayStemIdx + 12) % 12;
  // 空亡 = 該旬缺的兩個地支（index 10 和 11 相對於旬首）
  const kongwang1 = branches[(xunStartBranchIdx + 10) % 12];
  const kongwang2 = branches[(xunStartBranchIdx + 11) % 12];
  if (allBranches.includes(kongwang1) || allBranches.includes(kongwang2)) {
    results.push({ name: "空亡", type: "凶", desc: "你命帶空亡 — 有時候會覺得努力像打到空氣，事情做了卻沒結果。但空亡也代表超脫世俗的能力：你比較不執著、想得開，適合哲學、宗教、藝術等需要跳脫框架的領域。" });
  }

  // 陰差陽錯（特定日柱）
  const yinchaList = ["丙子","丁丑","戊寅","辛卯","壬辰","癸巳","丙午","丁未","戊申","辛酉","壬戌","癸亥"];
  const dayPillarStr = pillars.day.stem + pillars.day.branch;
  if (yinchaList.includes(dayPillarStr)) {
    results.push({ name: "陰差陽錯", type: "凶", desc: "你命帶陰差陽錯 — 感情或婚姻容易有波折、誤會、陰錯陽差的狀況。溝通上要特別用心，不要讓小誤解變成大裂痕。感情中多一點耐心和坦誠，就能化解這顆星的影響。" });
  }

  // === 結果判斷 ===
  if (results.length === 0) {
    results.push({ name: "（無明顯神煞）", desc: "你的命盤中沒有特別突出的神煞，代表你的命運更多由四柱本身和大運決定。" });
  }

  return results;
}

// === 用神/喜忌判定（正式版）===

/**
 * 月令五行力量表：地支本氣五行在該月令中的旺衰
 * key = 月支, value = 各五行的月令得分(0-3)
 * 3=當令(旺), 2=相, 1=休, 0=囚/死
 */
const MONTH_ELEMENT_SCORE = {
  "寅": { "木":3, "火":2, "土":0, "金":0, "水":1 }, // 春月
  "卯": { "木":3, "火":2, "土":0, "金":0, "水":1 },
  "辰": { "土":3, "木":1, "火":1, "金":1, "水":0 }, // 季月(土旺)
  "巳": { "火":3, "土":2, "木":0, "金":0, "水":0 }, // 夏月
  "午": { "火":3, "土":2, "木":0, "金":0, "水":0 },
  "未": { "土":3, "火":1, "木":0, "金":1, "水":0 }, // 季月
  "申": { "金":3, "水":2, "土":1, "木":0, "火":0 }, // 秋月
  "酉": { "金":3, "水":2, "土":1, "木":0, "火":0 },
  "戌": { "土":3, "金":1, "火":1, "木":0, "水":0 }, // 季月
  "亥": { "水":3, "木":2, "金":1, "土":0, "火":0 }, // 冬月
  "子": { "水":3, "木":2, "金":1, "土":0, "火":0 },
  "丑": { "土":3, "水":1, "金":1, "木":0, "火":0 }, // 季月
};

/**
 * 十二長生表：天干在各地支的長生狀態得分
 * 長生3, 沐浴1, 冠帶2, 臨官3, 帝旺3, 衰1, 病0, 死0, 墓1, 絕0, 胎0, 養1
 */
const CHANGSHENG_SCORE = [3, 1, 2, 3, 3, 1, 0, 0, 1, 0, 0, 1];
// 天干長生起始地支（陽干順行，陰干逆行）
const CHANGSHENG_START = {
  "甲": 11, // 亥
  "乙": 6,  // 午（逆）
  "丙": 2,  // 寅
  "丁": 9,  // 酉（逆）
  "戊": 2,  // 寅（同丙）
  "己": 9,  // 酉（同丁）
  "庚": 5,  // 巳
  "辛": 0,  // 子（逆）
  "壬": 8,  // 申
  "癸": 3,  // 卯（逆）
};

function getChangshengScore(stem, branchIdx) {
  const start = CHANGSHENG_START[stem];
  const yy = STEM_YINYANG[stem];
  let pos;
  if (yy === '陽') {
    pos = ((branchIdx - start) % 12 + 12) % 12;
  } else {
    pos = ((start - branchIdx) % 12 + 12) % 12;
  }
  return CHANGSHENG_SCORE[pos];
}

/**
 * 計算用神 — 基於月令得令、得地（長生）、得生、得助的完整評分
 * @returns { score, strength, yongshen, xishen, jishen, choushen, description }
 */
function calculateYongshen(pillars, dayMaster, dayMasterElem, elements) {
  const monthBranch = pillars.month.branch;
  const monthScores = MONTH_ELEMENT_SCORE[monthBranch] || {};

  // --- Step 1: 日主力量評分 ---

  // (A) 得令：月令對日主五行的支持度 (0-3)
  const deLing = monthScores[dayMasterElem] || 0;

  // (B) 得地：日主在四柱地支的十二長生得分
  const allBranchIdx = [
    BRANCHES.indexOf(pillars.year.branch),
    BRANCHES.indexOf(pillars.month.branch),
    BRANCHES.indexOf(pillars.day.branch),
    BRANCHES.indexOf(pillars.hour.branch),
  ];
  const deDi = allBranchIdx.reduce((sum, bIdx) => sum + getChangshengScore(dayMaster, bIdx), 0);

  // (C) 得生：生我的五行在命局中的個數（天干+藏干主氣）
  const shengWoElem = ELEMENT_CYCLE[(ELEMENT_CYCLE.indexOf(dayMasterElem) + 4) % 5]; // 生我的
  const allStems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem];
  const deSheng = allStems.filter(s => STEM_ELEMENT[s] === shengWoElem).length;

  // (D) 得助：同我五行在命局中的個數（天干）
  const deZhu = allStems.filter(s => STEM_ELEMENT[s] === dayMasterElem).length - 1; // 扣掉日主自己

  // 綜合得分
  const totalScore = deLing * 3 + deDi + deSheng * 2 + deZhu * 2;
  // 閾值：>= 12 算強，<= 5 算弱，中間中和
  let strength, strengthLevel;
  if (totalScore >= 12) { strength = '身強'; strengthLevel = 'strong'; }
  else if (totalScore <= 5) { strength = '身弱'; strengthLevel = 'weak'; }
  else { strength = '中和'; strengthLevel = 'neutral'; }

  // --- Step 2: 根據強弱判定用神 ---
  const iA = ELEMENT_CYCLE.indexOf(dayMasterElem);
  const woSheng = ELEMENT_CYCLE[(iA + 1) % 5]; // 食傷（我生）
  const woKe = ELEMENT_CYCLE[(iA + 2) % 5];   // 財（我剋）
  const keWo = ELEMENT_CYCLE[(iA + 3) % 5];   // 官殺（剋我）
  const shengWo = ELEMENT_CYCLE[(iA + 4) % 5]; // 印（生我）

  let yongshen, xishen, jishen, choushen, description;

  if (strengthLevel === 'strong') {
    // 身強 → 用神取洩耗：食傷(洩) > 財(耗) > 官殺(剋)
    yongshen = woSheng;  // 食傷洩秀
    xishen = woKe;       // 財星耗身
    jishen = shengWo;    // 印星生身（忌）
    choushen = dayMasterElem; // 比劫幫身（仇）
    description = `日主${dayMasterElem}${strength}，氣勢充足。用神取「${yongshen}」洩秀——把多餘的能量導向創造和表達。喜「${xishen}」耗身——用精力去追求目標和回報。忌「${jishen}」印星再生——太多支持反而讓你懶散。`;
  } else if (strengthLevel === 'weak') {
    // 身弱 → 用神取生扶：印(生) > 比劫(助)
    yongshen = shengWo;  // 印星生身
    xishen = dayMasterElem; // 比劫幫身
    jishen = woKe;       // 財星耗身（忌）
    choushen = keWo;     // 官殺剋身（仇）
    description = `日主${dayMasterElem}${strength}，需要支撐。用神取「${yongshen}」印星——知識、貴人、長輩的支持是你最大的靠山。喜「${xishen}」比劫——找志同道合的夥伴一起走。忌「${jishen}」財星——太多慾望和追逐反而耗損你的根基。`;
  } else {
    // 中和 → 用神取調候或月令所缺
    // 調候用神簡化：看季節缺什麼
    const season = { "寅":"春","卯":"春","辰":"春", "巳":"夏","午":"夏","未":"夏", "申":"秋","酉":"秋","戌":"秋", "亥":"冬","子":"冬","丑":"冬" };
    const s = season[monthBranch] || '春';
    if (s === '夏') {
      yongshen = '水'; xishen = '金';
    } else if (s === '冬') {
      yongshen = '火'; xishen = '木';
    } else if (s === '春') {
      yongshen = '金'; xishen = '土';
    } else {
      yongshen = '木'; xishen = '火';
    }
    jishen = null; choushen = null;
    description = `日主${dayMasterElem}${strength}，五行不偏枯。以調候取用：生於${s}季，取「${yongshen}」調和氣候、「${xishen}」輔助平衡，讓命局運行更順暢。`;
  }

  return {
    score: totalScore,
    detail: { deLing, deDi, deSheng, deZhu },
    strength, strengthLevel,
    yongshen, xishen, jishen, choushen,
    description,
  };
}

// === 地支合沖刑害破 ===

/**
 * 計算命局中所有地支之間的合/沖/刑/害/破關係
 */
function calculateBranchRelations(pillars) {
  const results = [];
  const positions = ['year', 'month', 'day', 'hour'];
  const posZh = { year: '年', month: '月', day: '日', hour: '時' };
  const branchList = positions.map(p => ({ pos: p, branch: pillars[p].branch, idx: BRANCHES.indexOf(pillars[p].branch) }));

  // 六合
  const liuHe = [
    ["子","丑","土"], ["寅","亥","木"], ["卯","戌","火"],
    ["辰","酉","金"], ["巳","申","水"], ["午","未","火"],
  ];

  // 三合局
  const sanHe = [
    ["申","子","辰","水"], ["寅","午","戌","火"],
    ["巳","酉","丑","金"], ["亥","卯","未","木"],
  ];

  // 六沖
  const liuChong = [
    ["子","午"], ["丑","未"], ["寅","申"], ["卯","酉"], ["辰","戌"], ["巳","亥"],
  ];

  // 三刑
  const sanXing = [
    { branches: ["寅","巳","申"], name: "無恩之刑" },
    { branches: ["丑","未","戌"], name: "恃勢之刑" },
    { branches: ["子","卯"], name: "無禮之刑" },
    { branches: ["辰","辰"], name: "自刑" },
    { branches: ["午","午"], name: "自刑" },
    { branches: ["酉","酉"], name: "自刑" },
    { branches: ["亥","亥"], name: "自刑" },
  ];

  // 六害
  const liuHai = [
    ["子","未"], ["丑","午"], ["寅","巳"], ["卯","辰"], ["申","亥"], ["酉","戌"],
  ];

  // 六破
  const liuPo = [
    ["子","酉"], ["午","卯"], ["寅","亥"], ["申","巳"], ["辰","丑"], ["戌","未"],
  ];

  // 檢查六合
  for (let i = 0; i < branchList.length; i++) {
    for (let j = i + 1; j < branchList.length; j++) {
      const b1 = branchList[i].branch, b2 = branchList[j].branch;
      const p1 = posZh[branchList[i].pos], p2 = posZh[branchList[j].pos];

      for (const [a, b, elem] of liuHe) {
        if ((b1 === a && b2 === b) || (b1 === b && b2 === a)) {
          results.push({ type: '合', subtype: '六合', pair: `${p1}${b1}—${p2}${b2}`, element: elem,
            desc: `${b1}${b2}六合化${elem}：兩柱之間有吸引、親和的力量。代表這兩個人生領域互相支持。` });
        }
      }

      // 檢查六沖
      for (const [a, b] of liuChong) {
        if ((b1 === a && b2 === b) || (b1 === b && b2 === a)) {
          results.push({ type: '沖', subtype: '六沖', pair: `${p1}${b1}—${p2}${b2}`,
            desc: `${b1}${b2}相沖：兩股力量正面對撞。代表這兩個人生領域之間有衝突或變動，但也帶來改變的動力。` });
        }
      }

      // 檢查六害
      for (const [a, b] of liuHai) {
        if ((b1 === a && b2 === b) || (b1 === b && b2 === a)) {
          results.push({ type: '害', subtype: '六害', pair: `${p1}${b1}—${p2}${b2}`,
            desc: `${b1}${b2}相害：暗中的阻礙和損傷。這兩個領域之間容易有誤會或被動的傷害，需要主動溝通化解。` });
        }
      }

      // 檢查六破
      for (const [a, b] of liuPo) {
        if ((b1 === a && b2 === b) || (b1 === b && b2 === a)) {
          results.push({ type: '破', subtype: '六破', pair: `${p1}${b1}—${p2}${b2}`,
            desc: `${b1}${b2}相破：原有的結構被打破。代表這兩個領域可能要經歷解構再重建的過程。` });
        }
      }

      // 檢查三刑（兩支先記錄，後面再查三支）
      for (const xing of sanXing) {
        if (xing.branches.length === 2 && xing.branches[0] !== xing.branches[1]) {
          // 無禮之刑（子卯）等非自刑的兩支刑
          const [a, b] = xing.branches;
          if ((b1 === a && b2 === b) || (b1 === b && b2 === a)) {
            results.push({ type: '刑', subtype: xing.name, pair: `${p1}${b1}—${p2}${b2}`,
              desc: `${b1}${b2}${xing.name}：帶有摩擦和考驗的互動。刑代表被逼著成長——不舒服但會變強。` });
          }
        }
        // 自刑（辰辰、午午、酉酉、亥亥）
        if (xing.branches.length === 2 && xing.branches[0] === xing.branches[1]) {
          if (b1 === xing.branches[0] && b2 === xing.branches[0]) {
            results.push({ type: '刑', subtype: '自刑', pair: `${p1}${b1}—${p2}${b2}`,
              desc: `${b1}${b2}自刑：自己跟自己過不去，容易鑽牛角尖。學會放過自己是人生課題。` });
          }
        }
      }
    }
  }

  // 三合局檢查（需三個地支同時出現）
  const allBr = branchList.map(b => b.branch);
  for (const [a, b, c, elem] of sanHe) {
    const has = [a, b, c].filter(x => allBr.includes(x));
    if (has.length >= 3) {
      results.push({ type: '合', subtype: '三合局', pair: `${has.join('')}`,  element: elem,
        desc: `${a}${b}${c}三合${elem}局：三個位置的能量匯聚成強大的${elem}行力量。這是命局中非常有力的結構。` });
    } else if (has.length === 2) {
      // 半合（只有兩個）
      results.push({ type: '合', subtype: '半合', pair: `${has.join('')}`, element: elem,
        desc: `${has.join('')}半合${elem}局：兩個位置有合化${elem}的趨勢。力量不如三合完整但仍有引動作用。` });
    }
  }

  // 三刑三支檢查
  for (const xing of sanXing) {
    if (xing.branches.length === 3) {
      const [a, b, c] = xing.branches;
      const hasAll = [a, b, c].every(x => allBr.includes(x));
      if (hasAll) {
        results.push({ type: '刑', subtype: xing.name + '（三刑全）', pair: `${a}${b}${c}`,
          desc: `${a}${b}${c}三刑齊聚（${xing.name}）：命局中壓力和考驗的結構完整呈現。這是需要特別注意的組合，但也代表巨大的成長潛力。` });
      }
    }
  }

  return results;
}

// === 納音五行 ===

const NAYIN_TABLE = [
  "海中金","海中金","爐中火","爐中火","大林木","大林木", // 甲子~己巳
  "路旁土","路旁土","劍鋒金","劍鋒金","山頭火","山頭火", // 庚午~乙亥
  "澗下水","澗下水","城頭土","城頭土","白蠟金","白蠟金", // 丙子~辛巳
  "楊柳木","楊柳木","泉中水","泉中水","屋上土","屋上土", // 壬午~丁亥
  "霹靂火","霹靂火","松柏木","松柏木","長流水","長流水", // 戊子~癸巳
  "沙中金","沙中金","山下火","山下火","平地木","平地木", // 甲午~己亥
  "壁上土","壁上土","金箔金","金箔金","覆燈火","覆燈火", // 庚子~乙巳
  "天河水","天河水","大驛土","大驛土","釵釧金","釵釧金", // 丙午~辛亥
  "桑柘木","桑柘木","大溪水","大溪水","沙中土","沙中土", // 壬子~丁巳
  "天上火","天上火","石榴木","石榴木","大海水","大海水", // 戊午~癸亥
];

function getNayin(stemIdx, branchIdx) {
  // 六十甲子序號（中國剩餘定理）：n = (6*s + 5*b) % 60
  const s = stemIdx % 10;
  const b = branchIdx % 12;
  const n = (6 * s + 5 * b) % 60;
  return NAYIN_TABLE[Math.floor(n / 2)] || '';
}

/**
 * 計算胎元、命宮、身宮
 */
function calculateExtras(pillars, hourBranchIdx) {
  // 胎元：月干進一位 + 月支進三位
  const monthStemIdx = STEMS.indexOf(pillars.month.stem);
  const monthBranchIdx = BRANCHES.indexOf(pillars.month.branch);
  const taiyuanStemIdx = (monthStemIdx + 1) % 10;
  const taiyuanBranchIdx = (monthBranchIdx + 3) % 12;
  const taiyuan = { stem: STEMS[taiyuanStemIdx], branch: BRANCHES[taiyuanBranchIdx], nayin: getNayin(taiyuanStemIdx, taiyuanBranchIdx) };

  // 命宮：月支 + 時支 合計從寅推
  // 公式：命宮地支 idx = (14 - monthBranchIdx - hourBranchIdx) % 12
  // 如果 idx 是從子開始(0=子)：命宮支 = (14 - 月支idx - 時支idx) % 12... 
  // 正統算法：月支數 + 時支數（從寅起算）... 用「逆推法」
  // 命宮地支 = 寅起逆數(月建數+時辰數-2)
  // 簡化公式：mingIdx = (月支idx + 時支idx) 然後反推
  // 正確：令 m=月支在寅起的序(寅=1,卯=2,...丑=12), h=時支在子起的序(子=1,...亥=12)
  // 命宮地支 = 從「卯」起逆數 (m + h - 2) 位
  // 另一個常用公式：命宮支idx = (2 + 2 - monthBranchIdx - hourBranchIdx + 24) % 12
  // 最常用公式：命宮地支 = (14 - 月支 - 時支) % 12（0=子）
  const mingBranchIdx = ((14 - monthBranchIdx - hourBranchIdx) % 12 + 12) % 12;
  // 命宮天干：由年干推（五虎遁）
  const yearStemIdx = STEMS.indexOf(pillars.year.stem);
  const startStemMap = [2, 4, 6, 8, 0]; // 丙戊庚壬甲（寅月起始干）
  const yinStartStem = startStemMap[yearStemIdx % 5];
  // 命宮干 = 寅起始干 + (命宮支idx - 2)
  const mingStemIdx = (yinStartStem + ((mingBranchIdx - 2 + 12) % 12)) % 10;
  const minggong = { stem: STEMS[mingStemIdx], branch: BRANCHES[mingBranchIdx], nayin: getNayin(mingStemIdx, mingBranchIdx) };

  // 身宮：月支 + 時支 順數
  // 公式：身宮地支 = (月支 + 時支 - 2) % 12 （從寅起順數）
  // 正確公式：身宮支idx = (monthBranchIdx + hourBranchIdx - 2 + 12) % 12
  const shenBranchIdx = (monthBranchIdx + hourBranchIdx + 2) % 12;
  const shenStemIdx = (yinStartStem + ((shenBranchIdx - 2 + 12) % 12)) % 10;
  const shengong = { stem: STEMS[shenStemIdx], branch: BRANCHES[shenBranchIdx], nayin: getNayin(shenStemIdx, shenBranchIdx) };

  // 四柱納音
  const yearSIdx = STEMS.indexOf(pillars.year.stem);
  const yearBIdx = BRANCHES.indexOf(pillars.year.branch);
  const monthSIdx = STEMS.indexOf(pillars.month.stem);
  const monthBIdx = BRANCHES.indexOf(pillars.month.branch);
  const daySIdx = STEMS.indexOf(pillars.day.stem);
  const dayBIdx = BRANCHES.indexOf(pillars.day.branch);
  const hourSIdx = STEMS.indexOf(pillars.hour.stem);
  const hourBIdx = BRANCHES.indexOf(pillars.hour.branch);

  const nayinPillars = {
    year: getNayin(yearSIdx, yearBIdx),
    month: getNayin(monthSIdx, monthBIdx),
    day: getNayin(daySIdx, dayBIdx),
    hour: getNayin(hourSIdx, hourBIdx),
  };

  return { taiyuan, minggong, shengong, nayinPillars };
}

// === 主計算 ===

export function calculate(birthData) {
  const { year, month, day, hour, minute, utcOffset } = birthData;

  try {
    const hourDecimal = hour + minute / 60;

    // 年柱
    const yp = yearPillar(year, month, day, hour, minute, utcOffset);
    // 月柱
    const mp = monthPillar(year, month, day, hour, minute, utcOffset, yp.stemIdx);
    // 日柱
    const dp = dayPillar(year, month, day, hour);
    // 時柱
    const hp = hourPillar(hourDecimal, dp.stemIdx);

    const pillars = {
      year: { stem: STEMS[yp.stemIdx], branch: BRANCHES[yp.branchIdx], hidden: HIDDEN_STEMS[BRANCHES[yp.branchIdx]] },
      month: { stem: STEMS[mp.stemIdx], branch: BRANCHES[mp.branchIdx], hidden: HIDDEN_STEMS[BRANCHES[mp.branchIdx]] },
      day: { stem: STEMS[dp.stemIdx], branch: BRANCHES[dp.branchIdx], hidden: HIDDEN_STEMS[BRANCHES[dp.branchIdx]] },
      hour: { stem: STEMS[hp.stemIdx], branch: BRANCHES[hp.branchIdx], hidden: HIDDEN_STEMS[BRANCHES[hp.branchIdx]] },
    };

    // 日主
    const dayMaster = pillars.day.stem;
    const dayMasterElem = STEM_ELEMENT[dayMaster];

    // 五行統計
    const elements = { 木:0, 火:0, 土:0, 金:0, 水:0 };
    const allStems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem];
    const allBranches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch];

    allStems.forEach(s => elements[STEM_ELEMENT[s]]++);
    allBranches.forEach(b => elements[BRANCH_ELEMENT[b]]++);
    // 藏干也計入
    allBranches.forEach(b => HIDDEN_STEMS[b].forEach(s => elements[STEM_ELEMENT[s]]++));

    // 十神
    const tenGods = [];
    ['year','month','hour'].forEach(p => {
      tenGods.push({ pillar: p, stem: pillars[p].stem, god: getTenGod(dayMaster, pillars[p].stem) });
    });

    // 大運計算（男命陽年順排，男命陰年逆排）
    const isMale = birthData.gender !== 'female';
    const yearStemYY = STEM_YINYANG[pillars.year.stem];
    const isForward = (isMale && yearStemYY === '陽') || (!isMale && yearStemYY === '陰');
    const birthJD = julianDay(year, month, day, hour, minute, utcOffset);
    const dayun = calculateDayun(mp.stemIdx, mp.branchIdx, isForward, dayMaster, year, birthJD);

    // 神煞計算
    const shensha = calculateShensha(pillars);

    // 用神/喜忌計算
    const yongshen = calculateYongshen(pillars, dayMaster, dayMasterElem, elements);

    // 地支合沖刑害
    const branchRelations = calculateBranchRelations(pillars);

    // 納音、胎元、命宮、身宮
    const extras = calculateExtras(pillars, hp.branchIdx);

    const data = { pillars, dayMaster, dayMasterElem, elements, tenGods, dayun, shensha, yongshen, branchRelations, extras, birthYear: year };
    const html = renderBazi(data);
    return { status: 'ok', data, html, error: null };
  } catch (err) {
    return { status: 'error', data: null, html: '', error: `八字計算錯誤：${err.message}` };
  }
}

// === 渲染 ===

function renderBazi(data) {
  const { pillars, dayMaster, dayMasterElem, elements, tenGods, dayun, shensha, yongshen, branchRelations, extras, birthYear } = data;
  const p = pillars;

  return `
    <div class="sig">
      <div class="kin">四柱八字</div>
      <div class="big">${p.year.stem}${p.year.branch}　${p.month.stem}${p.month.branch}　${p.day.stem}${p.day.branch}　${p.hour.stem}${p.hour.branch}</div>
      <div style="font-size:.85rem;color:var(--muted);margin-top:6px;">日主：<span style="color:var(--accent);font-weight:700;">${dayMaster}（${dayMasterElem}）</span></div>
    </div>

    <div class="note" style="margin-bottom:16px;">💡 點擊表格中的各柱查看詳細解說。點擊下方標題展開大運和神煞。</div>

    <h3>📋 四柱排盤</h3>
    <p style="font-size:.8rem;color:var(--muted);margin:0 0 8px;">點擊各柱查看詳細解讀 ▼</p>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;text-align:center;font-size:.9rem;">
        <thead>
          <tr style="color:var(--muted);font-size:.75rem;border-bottom:1px solid var(--card-border);">
            <th style="padding:6px;width:60px;"></th>
            <th style="padding:6px;cursor:pointer;" onclick="document.querySelectorAll('.bz-exp').forEach(e=>e.style.display='none');document.getElementById('bz-y').style.display='block';">年柱</th>
            <th style="padding:6px;cursor:pointer;" onclick="document.querySelectorAll('.bz-exp').forEach(e=>e.style.display='none');document.getElementById('bz-m').style.display='block';">月柱</th>
            <th style="padding:6px;color:var(--accent);cursor:pointer;" onclick="document.querySelectorAll('.bz-exp').forEach(e=>e.style.display='none');document.getElementById('bz-d').style.display='block';">日柱（你）</th>
            <th style="padding:6px;cursor:pointer;" onclick="document.querySelectorAll('.bz-exp').forEach(e=>e.style.display='none');document.getElementById('bz-h').style.display='block';">時柱</th>
          </tr>
        </thead>
        <tbody>
          <tr style="font-size:.75rem;color:var(--muted);">
            <td style="padding:4px;">主星</td>
            <td style="padding:4px;">${tenGods.find(t=>t.pillar==='year')?.god||''}</td>
            <td style="padding:4px;">${tenGods.find(t=>t.pillar==='month')?.god||''}</td>
            <td style="padding:4px;color:var(--accent);">日主</td>
            <td style="padding:4px;">${tenGods.find(t=>t.pillar==='hour')?.god||''}</td>
          </tr>
          <tr style="font-size:1.4rem;font-weight:700;cursor:pointer;">
            <td style="padding:6px;font-size:.75rem;color:var(--muted);">天干</td>
            <td style="padding:6px;" onclick="document.querySelectorAll('.bz-exp').forEach(e=>e.style.display='none');document.getElementById('bz-y').style.display='block';">${p.year.stem}<sub style="font-size:.6rem;color:var(--muted);">${STEM_ELEMENT[p.year.stem]}</sub></td>
            <td style="padding:6px;" onclick="document.querySelectorAll('.bz-exp').forEach(e=>e.style.display='none');document.getElementById('bz-m').style.display='block';">${p.month.stem}<sub style="font-size:.6rem;color:var(--muted);">${STEM_ELEMENT[p.month.stem]}</sub></td>
            <td style="padding:6px;color:var(--accent);" onclick="document.querySelectorAll('.bz-exp').forEach(e=>e.style.display='none');document.getElementById('bz-d').style.display='block';">${p.day.stem}<sub style="font-size:.6rem;">${STEM_ELEMENT[p.day.stem]}</sub></td>
            <td style="padding:6px;" onclick="document.querySelectorAll('.bz-exp').forEach(e=>e.style.display='none');document.getElementById('bz-h').style.display='block';">${p.hour.stem}<sub style="font-size:.6rem;color:var(--muted);">${STEM_ELEMENT[p.hour.stem]}</sub></td>
          </tr>
          <tr style="font-size:1.4rem;font-weight:700;cursor:pointer;">
            <td style="padding:6px;font-size:.75rem;color:var(--muted);">地支</td>
            <td style="padding:6px;" onclick="document.querySelectorAll('.bz-exp').forEach(e=>e.style.display='none');document.getElementById('bz-y').style.display='block';">${p.year.branch}<sub style="font-size:.6rem;color:var(--muted);">${BRANCH_ELEMENT[p.year.branch]}</sub></td>
            <td style="padding:6px;" onclick="document.querySelectorAll('.bz-exp').forEach(e=>e.style.display='none');document.getElementById('bz-m').style.display='block';">${p.month.branch}<sub style="font-size:.6rem;color:var(--muted);">${BRANCH_ELEMENT[p.month.branch]}</sub></td>
            <td style="padding:6px;" onclick="document.querySelectorAll('.bz-exp').forEach(e=>e.style.display='none');document.getElementById('bz-d').style.display='block';">${p.day.branch}<sub style="font-size:.6rem;color:var(--muted);">${BRANCH_ELEMENT[p.day.branch]}</sub></td>
            <td style="padding:6px;" onclick="document.querySelectorAll('.bz-exp').forEach(e=>e.style.display='none');document.getElementById('bz-h').style.display='block';">${p.hour.branch}<sub style="font-size:.6rem;color:var(--muted);">${BRANCH_ELEMENT[p.hour.branch]}</sub></td>
          </tr>
          <tr style="font-size:.75rem;color:var(--muted);">
            <td style="padding:4px;">藏干</td>
            <td style="padding:4px;">${p.year.hidden.join(' ')}</td>
            <td style="padding:4px;">${p.month.hidden.join(' ')}</td>
            <td style="padding:4px;">${p.day.hidden.join(' ')}</td>
            <td style="padding:4px;">${p.hour.hidden.join(' ')}</td>
          </tr>
          <tr style="font-size:.7rem;color:var(--muted);border-top:1px solid rgba(255,255,255,.04);">
            <td style="padding:4px;">藏干十神</td>
            <td style="padding:4px;cursor:pointer;" onclick="document.querySelectorAll('.hid-exp').forEach(e=>e.style.display='none');document.getElementById('hid-y').style.display='block';">${p.year.hidden.map(h=>getTenGod(dayMaster,h).slice(0,1)).join(' ')}</td>
            <td style="padding:4px;cursor:pointer;" onclick="document.querySelectorAll('.hid-exp').forEach(e=>e.style.display='none');document.getElementById('hid-m').style.display='block';">${p.month.hidden.map(h=>getTenGod(dayMaster,h).slice(0,1)).join(' ')}</td>
            <td style="padding:4px;cursor:pointer;" onclick="document.querySelectorAll('.hid-exp').forEach(e=>e.style.display='none');document.getElementById('hid-d').style.display='block';">${p.day.hidden.map(h=>getTenGod(dayMaster,h).slice(0,1)).join(' ')}</td>
            <td style="padding:4px;cursor:pointer;" onclick="document.querySelectorAll('.hid-exp').forEach(e=>e.style.display='none');document.getElementById('hid-h').style.display='block';">${p.hour.hidden.map(h=>getTenGod(dayMaster,h).slice(0,1)).join(' ')}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div id="hid-y" class="hid-exp" style="display:none;margin-top:6px;padding:8px 10px;background:rgba(123,108,246,.05);border-radius:8px;font-size:.82rem;line-height:1.7;">
      <b>年柱藏干十神：</b><br>${p.year.hidden.map(h=>`${h}（${STEM_ELEMENT[h]}）→ <span style="color:var(--accent)">${getTenGod(dayMaster,h)}</span>：${getGodInPillar(getTenGod(dayMaster,h),'year')}`).join('<br>')}
    </div>
    <div id="hid-m" class="hid-exp" style="display:none;margin-top:6px;padding:8px 10px;background:rgba(123,108,246,.05);border-radius:8px;font-size:.82rem;line-height:1.7;">
      <b>月柱藏干十神：</b><br>${p.month.hidden.map(h=>`${h}（${STEM_ELEMENT[h]}）→ <span style="color:var(--accent)">${getTenGod(dayMaster,h)}</span>：${getGodInPillar(getTenGod(dayMaster,h),'month')}`).join('<br>')}
    </div>
    <div id="hid-d" class="hid-exp" style="display:none;margin-top:6px;padding:8px 10px;background:rgba(123,108,246,.05);border-radius:8px;font-size:.82rem;line-height:1.7;">
      <b>日柱藏干十神：</b><br>${p.day.hidden.map(h=>`${h}（${STEM_ELEMENT[h]}）→ <span style="color:var(--accent)">${getTenGod(dayMaster,h)}</span>：${getGodInPillar(getTenGod(dayMaster,h),'day')}`).join('<br>')}
    </div>
    <div id="hid-h" class="hid-exp" style="display:none;margin-top:6px;padding:8px 10px;background:rgba(123,108,246,.05);border-radius:8px;font-size:.82rem;line-height:1.7;">
      <b>時柱藏干十神：</b><br>${p.hour.hidden.map(h=>`${h}（${STEM_ELEMENT[h]}）→ <span style="color:var(--accent)">${getTenGod(dayMaster,h)}</span>：${getGodInPillar(getTenGod(dayMaster,h),'hour')}`).join('<br>')}
    </div>
    <div id="bz-y" class="bz-exp" style="display:none;margin-top:8px;padding:10px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.85rem;line-height:1.7;">
      <b>年柱（祖上・童年）：${p.year.stem}${p.year.branch}</b><br><br>
      <b>天干 ${p.year.stem}（${STEM_ELEMENT[p.year.stem]}）→ ${tenGods.find(t=>t.pillar==='year')?.god||''}</b><br>
      ${getGodInPillar(tenGods.find(t=>t.pillar==='year')?.god, 'year')}<br><br>
      <b>地支 ${p.year.branch}（${BRANCH_ELEMENT[p.year.branch]}）</b><br>
      ${getBranchMeaning(p.year.branch, 'year')}<br><br>
      <b>藏干：</b>${p.year.hidden.map(h=>`${h}(${getTenGod(dayMaster,h)})`).join(' ')}<br>
      <span style="color:var(--muted);">潛在能量：</span>${p.year.hidden.map(h=>`${getTenGod(dayMaster,h)} — ${getGodInPillar(getTenGod(dayMaster,h),'year')}`).join('<br>')}
    </div>
    <div id="bz-m" class="bz-exp" style="display:none;margin-top:8px;padding:10px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.85rem;line-height:1.7;">
      <b>月柱（事業・青年）：${p.month.stem}${p.month.branch}</b><br><br>
      <b>天干 ${p.month.stem}（${STEM_ELEMENT[p.month.stem]}）→ ${tenGods.find(t=>t.pillar==='month')?.god||''}</b><br>
      ${getGodInPillar(tenGods.find(t=>t.pillar==='month')?.god, 'month')}<br><br>
      <b>地支 ${p.month.branch}（${BRANCH_ELEMENT[p.month.branch]}）</b><br>
      ${getBranchMeaning(p.month.branch, 'month')}<br><br>
      <b>藏干：</b>${p.month.hidden.map(h=>`${h}(${getTenGod(dayMaster,h)})`).join(' ')}<br>
      <span style="color:var(--muted);">潛在能量：</span>${p.month.hidden.map(h=>`${getTenGod(dayMaster,h)} — ${getGodInPillar(getTenGod(dayMaster,h),'month')}`).join('<br>')}
    </div>
    <div id="bz-d" class="bz-exp" style="display:none;margin-top:8px;padding:10px;background:rgba(245,197,66,.06);border-radius:8px;border-left:3px solid var(--accent);font-size:.85rem;line-height:1.7;">
      <b>日柱（自己・中年）：${p.day.stem}${p.day.branch}</b><br><br>
      <b>天干 ${p.day.stem}（${dayMasterElem}）— 日主</b><br>
      ${getDayMasterText(dayMaster)}<br><br>
      <b>地支 ${p.day.branch}（${BRANCH_ELEMENT[p.day.branch]}）— 日支（婚姻宮）</b><br>
      ${getBranchMeaning(p.day.branch, 'day')}<br><br>
      <b>藏干：</b>${p.day.hidden.map(h=>`${h}(${getTenGod(dayMaster,h)})`).join(' ')}<br>
      <span style="color:var(--muted);">潛在能量：</span>${p.day.hidden.map(h=>`${getTenGod(dayMaster,h)} — ${getGodInPillar(getTenGod(dayMaster,h),'day')}`).join('<br>')}
    </div>
    <div id="bz-h" class="bz-exp" style="display:none;margin-top:8px;padding:10px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.85rem;line-height:1.7;">
      <b>時柱（子女・晚年）：${p.hour.stem}${p.hour.branch}</b><br><br>
      <b>天干 ${p.hour.stem}（${STEM_ELEMENT[p.hour.stem]}）→ ${tenGods.find(t=>t.pillar==='hour')?.god||''}</b><br>
      ${getGodInPillar(tenGods.find(t=>t.pillar==='hour')?.god, 'hour')}<br><br>
      <b>地支 ${p.hour.branch}（${BRANCH_ELEMENT[p.hour.branch]}）</b><br>
      ${getBranchMeaning(p.hour.branch, 'hour')}<br><br>
      <b>藏干：</b>${p.hour.hidden.map(h=>`${h}(${getTenGod(dayMaster,h)})`).join(' ')}<br>
      <span style="color:var(--muted);">潛在能量：</span>${p.hour.hidden.map(h=>`${getTenGod(dayMaster,h)} — ${getGodInPillar(getTenGod(dayMaster,h),'hour')}`).join('<br>')}
    </div>

    <div class="divider"></div>
    <h3>🔥 五行分佈</h3>
    ${renderElements(elements, dayMasterElem, yongshen)}

    <div class="divider"></div>
    <h3 style="cursor:pointer;" onclick="document.getElementById('pattern-detail').style.display=document.getElementById('pattern-detail').style.display==='none'?'block':'none';">⚖️ 命盤格局 ▼</h3>
    <div id="pattern-detail" style="display:none;">
      ${renderPattern(tenGods, dayMaster, pillars)}
    </div>

    <div class="divider"></div>
    <h3 style="cursor:pointer;" onclick="document.getElementById('dayun-detail').style.display=document.getElementById('dayun-detail').style.display==='none'?'block':'none';">🚂 大運（每10年的人生主題）▼</h3>
    <div id="dayun-detail" style="display:none;">
      ${renderDayun(dayun, birthYear)}
    </div>

    <div class="divider"></div>
    <h3 style="cursor:pointer;" onclick="document.getElementById('shensha-detail').style.display=document.getElementById('shensha-detail').style.display==='none'?'block':'none';">⭐ 神煞 ▼</h3>
    <div id="shensha-detail" style="display:none;">
      ${renderShensha(shensha)}
    </div>

    <div class="divider"></div>
    <h3 style="cursor:pointer;" onclick="document.getElementById('branch-rel-detail').style.display=document.getElementById('branch-rel-detail').style.display==='none'?'block':'none';">🔗 地支合沖刑害 ▼</h3>
    <div id="branch-rel-detail" style="display:none;">
      ${renderBranchRelations(branchRelations)}
    </div>

    <div class="divider"></div>
    <h3 style="cursor:pointer;" onclick="document.getElementById('extras-detail').style.display=document.getElementById('extras-detail').style.display==='none'?'block':'none';">📜 納音・胎元・命宮・身宮 ▼</h3>
    <div id="extras-detail" style="display:none;">
      ${renderExtras(extras, pillars)}
    </div>

    <div class="note">💡 日主 ${dayMaster}（${dayMasterElem}）就是「你」。喜用神的顏色和方位可以用在日常穿搭、辦公桌擺設。</div>
  `;
}

/** 日主性格解讀 */
function getDayMasterText(stem) {
  const texts = {
    "甲": "甲木人像大樹 — 正直、有擔當、堅定不移。你有領導者的氣質，適合做組織的核心支柱。性格直來直往，不善於彎腰，但可靠度極高。發展方向：管理、教育、公益、任何需要正直和擔當的角色。",
    "乙": "乙木人像藤蔓 — 柔軟、適應力強、善於借力。你看似溫柔但韌性驚人，懂得在逆境中找到出路。善於人際關係，能屈能伸。發展方向：外交、藝術、諮商、公關、任何需要柔軟和靈活的工作。",
    "丙": "丙火人像太陽 — 熱情、大方、照亮周圍。你天生有感染力和領導魅力，走到哪裡都是焦點。做事光明磊落，不喜歡陰暗面。發展方向：表演、教學、業務、領導、任何需要熱情和舞台感的領域。",
    "丁": "丁火人像燭光 — 細膩、溫暖、照亮重點。你不像丙火那樣強烈外放，而是用穩定的溫度溫暖身邊的人。觀察力敏銳，能看見別人看不到的細節。發展方向：研究、寫作、諮商、技術、任何需要深度觀察和精準判斷的工作。你的溫暖是持久型的，不是一時的熱度。",
    "戊": "戊土人像大山 — 穩重、包容、值得信賴。你給人安全感，是別人心裡的定海神針。做事不急不躁，有耐心等待成果。發展方向：管理、投資、房地產、任何需要穩定和長期建設的領域。",
    "己": "己土人像田園 — 滋養、細心、默默付出。你擅長照顧人、整合資源，把複雜的事情梳理乾淨。看似平凡但實則不可或缺。發展方向：行政、規劃、照護、農業、任何需要細心整合的工作。",
    "庚": "庚金人像刀劍 — 果斷、有魄力、效率高。你做事講求效率和結果，不拖泥帶水。有正義感和行動力，適合需要快速決斷的環境。發展方向：法律、金融、運動、軍警、任何需要果斷和執行力的領域。",
    "辛": "辛金人像珠寶 — 精緻、有品味、追求完美。你對品質有極高要求，眼光獨到，善於鑑別事物的價值。外表可能低調但內在豐富。發展方向：設計、珠寶、精品、品管、任何需要精準眼光和品味的工作。",
    "壬": "壬水人像大海 — 智慧、包容、深不可測。你的思維寬廣，能從多角度看問題，包容力強。有時候讓人覺得捉摸不定，但其實你只是視野比別人寬。發展方向：策略、研究、旅行、國際事務、任何需要大格局思考的領域。",
    "癸": "癸水人像雨露 — 敏感、直覺、滋養萬物。你的感受力極強，直覺準確，能感知到別人沒察覺的變化。看似柔弱但生命力旺盛。發展方向：諮商、靈性、藝術、療癒、任何需要直覺和同理心的工作。",
  };
  return texts[stem] || "";
}

/** 格局分析 — 看十神分佈判斷人生主軸 */
function renderPattern(tenGods, dayMaster, pillars) {
  const monthGod = tenGods.find(t => t.pillar === 'month')?.god || '';

  const patternTexts = {
    "正官": "你的命盤以<b>正官</b>為主軸 — 代表你重視規則、責任和社會地位。你適合在體制內發展，透過穩定的努力獲得認可。事業方向：公務員、管理層、法律、任何有明確晉升路徑的工作。",
    "七殺": "你的命盤以<b>七殺</b>為主軸 — 代表你有壓力但也有魄力。你能在高壓環境中生存，適合競爭激烈的領域。事業方向：創業、業務、運動、軍警、任何需要抗壓和突破的工作。",
    "正印": "你的命盤以<b>正印</b>為主軸 — 代表你受貴人照顧、學習能力強。你透過知識和人脈獲得成功。事業方向：教育、學術、出版、任何需要持續學習的專業領域。",
    "偏印": "你的命盤以<b>偏印</b>為主軸 — 代表你思維獨特、有冷門才能。你適合走非主流的路，在別人沒注意到的領域發光。事業方向：研究、技術、靈性、獨立創作。",
    "比肩": "你的命盤以<b>比肩</b>為主軸 — 代表你重視獨立和平等合作。你適合跟志同道合的人一起打拼，不喜歡被管。事業方向：合夥創業、自由業、社群經營。",
    "劫財": "你的命盤以<b>劫財</b>為主軸 — 代表你行動力強、競爭心旺。你敢搶敢衝，適合需要魄力的環境。事業方向：業務、投資、運動、創業。注意：守財比賺錢更重要。",
    "食神": "你的命盤以<b>食神</b>為主軸 — 代表你有才華、懂享受、性格溫和。你的天賦在於創作和表達。事業方向：餐飲、藝術、教學、內容創作、任何能展現才華的工作。",
    "傷官": "你的命盤以<b>傷官</b>為主軸 — 代表你聰明過人、不服權威、有革新精神。你適合打破規則、創造新東西。事業方向：設計、科技、表演、任何需要原創性的領域。注意：管好你的嘴。",
    "偏財": "你的命盤以<b>偏財</b>為主軸 — 代表你人緣好、社交力強、有意外之財的機會。你適合跟人打交道的工作。事業方向：業務、投資、社交電商、公關。",
    "正財": "你的命盤以<b>正財</b>為主軸 — 代表你務實穩健、重視安全感。你適合穩定累積財富的方式。事業方向：會計、理財、穩定薪資工作、長期投資。",
  };

  const text = patternTexts[monthGod] || `你的月柱十神是 <b>${monthGod}</b>，這代表你在事業發展上帶有這股能量的特質。`;
  return `<p class="meaning">${text}</p>`;
}

/** 各柱意義解讀 — 針對不同柱位分開寫 */
function renderPillarMeaning(tenGods, pillars) {
  const godByPillar = {
    "year": {
      "正官": "你出身的家庭有規矩、重視教育。從小被期待要表現好、要懂事。這個成長背景讓你天生有責任感。",
      "七殺": "你的童年環境有壓力或競爭。可能家境不是最順，但這讓你很早就學會了堅強和獨立。",
      "正印": "你從小受到長輩的疼愛和保護。家庭環境支持你學習，有人照顧你。這給了你穩定的根基。",
      "偏印": "你小時候可能比較孤獨或想法跟同齡人不太一樣。但這培養了你獨立思考的能力。",
      "比肩": "你的家庭環境平等、開放。兄弟姊妹或同輩的影響大。從小就習慣跟人平起平坐。",
      "劫財": "你的童年可能有競爭或資源分配的議題。這讓你很早就學會爭取自己想要的東西。",
      "食神": "你的家庭環境溫暖、重視生活品質。從小就有才藝或創意方面的培養。",
      "傷官": "你小時候就很聰明、有主見，可能不太聽話。這份叛逆精神是你後來創新能力的根源。",
      "偏財": "你的家庭可能有經商背景或社交活躍。從小就看著大人做人情世故，學會了社交技巧。",
      "正財": "你的家庭重視節儉和務實。從小就有金錢觀念和儲蓄習慣。",
    },
    "month": {
      "正官": "你的事業適合在有結構的組織裡發展。你能得到上司的賞識和提拔，適合走管理路線。",
      "七殺": "你的事業需要在壓力和競爭中成長。適合創業、業務或需要魄力的領域。壓力越大你越強。",
      "正印": "你的事業有貴人幫忙。適合學術、教育、專業服務。持續學習是你事業成長的關鍵。",
      "偏印": "你的事業適合走非主流路線。獨立研究、技術、靈性、自媒體 — 跟別人不一樣反而是你的優勢。",
      "比肩": "你的事業適合跟朋友或同輩合作。獨立創業或平等合夥比替人打工更適合你。",
      "劫財": "你的事業環境競爭激烈。需要行動力和搶佔先機的能力。注意合夥人選擇和財務管理。",
      "食神": "你的事業跟才華和創意有關。餐飲、藝術、教學、內容創作 — 用天賦賺錢是最好的路。",
      "傷官": "你的事業需要原創性和突破力。設計、科技、表演 — 越需要打破規則的領域你越發光。",
      "偏財": "你的事業跟人脈和社交有關。業務、投資、公關 — 你的財富來自認識對的人。",
      "正財": "你的事業適合穩定累積。固定收入的專業工作、長期投資理財是你的路。",
    },
    "hour": {
      "正官": "你的晚年會越來越受人尊重、有社會地位。子女可能比較守規矩、有出息。老了之後是受人敬重的長者。",
      "七殺": "你的晚年可能還是閒不下來，保持一定的壓力和挑戰反而讓你活得有勁。子女可能有領導氣質。",
      "正印": "你的晚年有人照顧、有學習的樂趣。子女孝順或有靈性傾向。老了之後適合做學問或教學。",
      "偏印": "你的晚年可能走向靈性或研究。子女想法獨特。你適合晚年發展冷門興趣或寫書留下思想。",
      "比肩": "你的晚年朋友多、社交活躍。子女獨立、平等相處。老了之後還是很有精神的活躍長者。",
      "劫財": "你的晚年要注意理財，不要太大方把錢都花掉或被人借走。保持適度的警覺心。",
      "食神": "你的晚年有口福、有創作。子女可能有藝術天賦。老了之後就是享受生活、發揮興趣。",
      "傷官": "你的晚年思維依然活躍、不服老。可能會有「第二春」的創作或發明。子女聰明但有主見。",
      "偏財": "你的晚年人緣很好、社交豐富。可能會有意外的收穫或投資回報。",
      "正財": "你的晚年穩定踏實、衣食無憂。子女務實可靠。是安穩享福的晚年。",
    },
  };

  return tenGods.map(tg => {
    const pillarZh = tg.pillar === 'year' ? '年柱（童年/祖上）' : tg.pillar === 'month' ? '月柱（事業/青年）' : '時柱（子女/晚年）';
    const detail = godByPillar[tg.pillar]?.[tg.god] || '';
    return `<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04);">
      <div><span style="font-weight:600;">${pillarZh}</span>：<span style="color:var(--accent);font-weight:700;">${tg.god}</span>（${tg.stem}）</div>
      <div style="font-size:.85rem;color:var(--text);margin-top:4px;line-height:1.7;">${detail}</div>
    </div>`;
  }).join('');
}

function renderElements(elements, dayMasterElem, yongshen) {
  const total = Object.values(elements).reduce((a,b) => a+b, 0);
  const emojis = { 木:'🌳', 火:'🔥', 土:'⛰️', 金:'⚔️', 水:'💧' };

  let bars = Object.entries(elements).map(([elem, count]) => {
    const pct = Math.round(count / total * 100);
    const isMe = elem === dayMasterElem;
    const isYong = elem === yongshen.yongshen;
    const isXi = elem === yongshen.xishen;
    const highlight = isMe ? 'color:var(--accent);font-weight:700;' : '';
    const tag = isYong ? ' <span style="font-size:.65rem;color:#4ade80;">用</span>' : isXi ? ' <span style="font-size:.65rem;color:#60a5fa;">喜</span>' : '';
    return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
      <span style="width:60px;${highlight}">${emojis[elem]} ${elem}${tag}</span>
      <div style="flex:1;height:16px;background:var(--input-bg);border-radius:8px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${isMe?'var(--accent)':isYong?'#4ade80':isXi?'#60a5fa':'var(--accent2)'};border-radius:8px;"></div>
      </div>
      <span style="width:30px;font-size:.8rem;color:var(--muted);">${count}</span>
    </div>`;
  }).join('');

  // 用正式版用神結果
  const { strength, yongshen: yong, xishen: xi, jishen: ji, choushen: chou, description, score, detail } = yongshen;

  const xyColors = { '木':'綠色、青色', '火':'紅色、紫色、橘色', '土':'黃色、咖啡色、米色', '金':'白色、金色、銀色', '水':'黑色、藍色、深灰' };
  const xyDir = { '木':'東方', '火':'南方', '土':'中央', '金':'西方', '水':'北方' };
  const xyIndustry = { '木':'教育、出版、花藝、木業、文創', '火':'餐飲、科技、能源、表演、照明', '土':'房地產、農業、建築、陶瓷、保險', '金':'金融、法律、五金、珠寶、科技硬體', '水':'貿易、物流、旅遊、清潔、漁業' };
  const xyFood = { '木':'綠色蔬菜、酸味食物', '火':'紅色食物、苦味', '土':'根莖類、甜味', '金':'白色食物、辛辣', '水':'黑色食物、鹹味' };

  const xiyong = [yong, xi].filter(Boolean);
  const xyText = xiyong.map(e => `<div style="margin:6px 0;padding:8px;background:rgba(123,108,246,.05);border-radius:6px;">
    <b>${emojis[e]} ${e}</b>（${e === yong ? '用神' : '喜神'}）：顏色 ${xyColors[e]} / 方位 ${xyDir[e]} / 行業 ${xyIndustry[e]} / 飲食 ${xyFood[e]}
  </div>`).join('');

  const jiText = [ji, chou].filter(Boolean).map(e => `<span style="color:var(--muted);">${emojis[e]} ${e}</span>`).join('、');

  // 評分詳情
  const scoreDetail = `<div style="font-size:.78rem;color:var(--muted);margin:8px 0;padding:8px;background:rgba(255,255,255,.02);border-radius:6px;">
    判定依據：得令 ${detail.deLing}/3 ＋ 得地 ${detail.deDi}/12 ＋ 得生 ${detail.deSheng} ＋ 得助 ${detail.deZhu}　→　綜合分 ${score}（≥12 身強 / ≤5 身弱）
  </div>`;

  return `${bars}
    <div style="margin-top:14px;padding:12px;background:rgba(123,108,246,.06);border-radius:10px;border-left:3px solid var(--accent);">
      <div style="font-weight:700;font-size:.95rem;margin-bottom:6px;">⚖️ ${strength}</div>
      <div style="font-size:.85rem;line-height:1.7;">${description}</div>
      ${scoreDetail}
    </div>
    <h3 style="cursor:pointer;margin-top:14px;" onclick="document.getElementById('xiyong-detail').style.display=document.getElementById('xiyong-detail').style.display==='none'?'block':'none';">💎 用神：${emojis[yong]} ${yong}　喜神：${emojis[xi]} ${xi} ▼</h3>
    <div id="xiyong-detail" style="display:none;">
      <p style="font-size:.83rem;color:var(--muted);margin-bottom:8px;">用神 = 命局最需要的五行。喜神 = 輔助用神的五行。多接觸這些顏色、方位、行業能幫你順流。</p>
      ${xyText}
      ${jiText ? `<p style="font-size:.82rem;margin-top:8px;">忌避：${jiText}（對你不利的五行能量，少碰為妙）</p>` : ''}
    </div>`;
}

/** 渲染大運 */
function renderDayun(dayun, birthYear) {
  const now = new Date().getFullYear();
  const currentAge = now - birthYear;

  const godThemes = {
    "比肩": { brief: "獨立發展、平等合作", child: "童年環境中有跟你同齡的夥伴影響你，你很早就學會獨立。", youth: "這段時間適合自主發展，跟志同道合的人合作。不要依賴別人。", mid: "事業上適合獨立或平等合夥，你的能量足以自己做主。", elder: "晚年交友活躍、精神獨立，不會寂寞。保持社交就是保持活力。" },
    "劫財": { brief: "行動力爆發、競爭", child: "童年可能有兄弟姊妹的競爭，或環境中有搶資源的壓力，讓你學會了爭取。", youth: "這段時間環境競爭激烈，但你的行動力也最強。注意理財別太衝動。", mid: "職場競爭高峰期，把精力導向正面競爭。注意合夥人和借貸。", elder: "晚年注意被人借錢或花費過大。但你到這歲數還有行動力是好事。" },
    "食神": { brief: "才華展現、享受生活", child: "童年快樂、有才藝的培養，家庭給你展現自我的空間。", youth: "這段時間適合發展才華、享受生活。創作和表達會帶來好運。", mid: "事業靠才華和創意走出一條路。心態放鬆反而成果更好。", elder: "晚年有口福、有創作，享受生活的美好。是幸福的退休時光。" },
    "傷官": { brief: "突破框架、表達自我", child: "童年就很聰明、有主見，可能不太聽話但很有想法。", youth: "這段時間想打破現狀、嘗試新路。創新能力最強，但注意說話方式。", mid: "事業上的叛逆期 — 想轉型或開創新東西。勇氣是對的但要有策略。", elder: "晚年思維不老化，可能有新發明或創作。不服老是你的特色。" },
    "偏財": { brief: "人脈擴張、機會多", child: "童年接觸面廣，可能常搬家或認識很多不同的人。", youth: "這段時間社交運好，意外機會從人際中來。多出去認識人。", mid: "事業上靠人脈拓展，適合需要社交的工作。投資機會多但要謹慎。", elder: "晚年人緣好、有意外之喜。之前累積的人脈會在這時回報你。" },
    "正財": { brief: "穩定累積、務實", child: "童年環境穩定、物質基本不缺。你從小就有安全感和務實的性格。", youth: "這段時間適合穩定累積，腳踏實地走每一步。不要投機。", mid: "事業穩健期，收入穩定成長。適合長期規劃和投資。", elder: "晚年衣食無憂，之前的踏實在這時結出果實。安穩享福。" },
    "七殺": { brief: "壓力大但成長快", child: "童年可能有嚴格的管教或環境壓力，讓你比同齡人早熟。", youth: "這段時間壓力大、挑戰多，但也是你成長最快的時期。撐住。", mid: "事業上的高壓期 — 可能遇到權力鬥爭或重大挑戰。頂住就升級。", elder: "晚年保持一定的挑戰反而有活力。太安逸你反而不舒服。" },
    "正官": { brief: "事業穩定上升", child: "童年在有規矩的環境中成長，被教導要守規矩、有責任感。", youth: "這段時間適合在正式體制中發展，容易得到認可和晉升。", mid: "事業上有正式舞台，適合升遷或承擔更大的責任。", elder: "晚年受人尊敬、有社會地位。你一輩子的累積在這時被認可。" },
    "偏印": { brief: "獨立思考、轉型期", child: "童年可能比較安靜、喜歡獨處或思考，跟其他小孩不太一樣。", youth: "這段時間適合學習新技能、探索非主流方向。你的獨特性是資產。", mid: "事業上可能有轉型的念頭。適合進修、研究或發展新技能。", elder: "晚年走向內在深度，適合寫書、研究或靈性發展。" },
    "正印": { brief: "貴人運旺、受支持", child: "童年被照顧得好、有學習的環境。可能有特別疼你的長輩。", youth: "這段時間有貴人出現幫你。適合學習進修，接受別人的幫助。", mid: "事業上有人提攜、有好的學習機會。保持謙虛。", elder: "晚年有人照顧、心靈平靜。子女或晚輩很照顧你。" },
  };

  const rows = dayun.map((d, idx) => {
    const isCurrent = (currentAge >= d.age && currentAge < d.age + 10);
    const highlight = isCurrent ? 'border-left:3px solid var(--accent);padding-left:10px;background:rgba(245,197,66,.06);' : '';
    const marker = isCurrent ? '<span style="color:var(--accent);font-weight:700;"> ← 現在</span>' : '';
    const theme = godThemes[d.god] || { brief: '', child: '', youth: '', mid: '', elder: '' };
    // 根據年齡選擇對應的解讀
    let detail;
    if (d.age < 12) detail = theme.child;
    else if (d.age < 32) detail = theme.youth;
    else if (d.age < 62) detail = theme.mid;
    else detail = theme.elder;
    const detailId = `dayun-${idx}`;
    return `<div style="padding:8px 10px;margin:4px 0;border-radius:8px;cursor:pointer;${highlight}" onclick="document.querySelectorAll('.dayun-exp').forEach(e=>e.style.display='none');const el=document.getElementById('${detailId}');el.style.display=el.style.display==='none'?'block':'none';">
      <span style="font-weight:700;">${d.age}-${d.age+9}歲</span>（${d.yearStart}-${d.yearEnd}）
      <span style="margin-left:8px;font-size:1.1rem;">${d.stem}${d.branch}</span>
      <span style="color:var(--accent);margin-left:8px;">${d.god}運</span>${marker}
      <div style="font-size:.82rem;color:var(--muted);margin-top:3px;">${theme.brief}</div>
    </div>
    <div id="${detailId}" class="dayun-exp" style="display:none;padding:8px 12px;margin:0 10px 8px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.83rem;line-height:1.7;">
      ${detail}
    </div>`;
  }).join('');

  return `<p style="font-size:.83rem;color:var(--muted);margin-bottom:8px;">點擊各步大運查看詳細解讀</p>${rows}`;
}

/** 渲染神煞 */
function renderShensha(shensha) {
  const jiList = shensha.filter(s => s.type !== '凶');
  const xiongList = shensha.filter(s => s.type === '凶');
  let html = '';
  if (jiList.length > 0) {
    html += `<div style="margin-bottom:8px;font-size:.8rem;color:var(--muted);opacity:.7;">✨ 吉神</div>`;
    html += jiList.map(s => `<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04);">
      <span style="color:var(--accent);font-weight:700;font-size:1rem;">${s.name}</span>
      <div style="font-size:.85rem;color:var(--text);margin-top:4px;line-height:1.7;">${s.desc}</div>
    </div>`).join('');
  }
  if (xiongList.length > 0) {
    html += `<div style="margin-top:16px;margin-bottom:8px;font-size:.8rem;color:var(--muted);opacity:.7;">⚠️ 凶煞（提醒，非定論）</div>`;
    html += xiongList.map(s => `<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04);">
      <span style="color:#e8a87c;font-weight:700;font-size:1rem;">${s.name}</span>
      <div style="font-size:.85rem;color:var(--text);margin-top:4px;line-height:1.7;">${s.desc}</div>
    </div>`).join('');
  }
  if (jiList.length === 0 && xiongList.length === 0) {
    html += `<div style="padding:10px 0;">
      <span style="color:var(--accent);font-weight:700;font-size:1rem;">（無明顯神煞）</span>
      <div style="font-size:.85rem;color:var(--text);margin-top:4px;line-height:1.7;">你的命盤中沒有特別突出的神煞，代表你的命運更多由四柱本身和大運決定。</div>
    </div>`;
  }
  return html;
}

/** 渲染地支合沖刑害 */
function renderBranchRelations(relations) {
  if (!relations || relations.length === 0) {
    return `<div style="padding:10px 0;font-size:.85rem;color:var(--muted);">你的四柱地支之間沒有明顯的合沖刑害關係。四柱相安無事，人生各領域之間比較獨立、不互相拉扯。</div>`;
  }

  const typeIcon = { '合': '🤝', '沖': '⚡', '刑': '🔥', '害': '🗡️', '破': '💔' };
  const typeColor = { '合': '#4ade80', '沖': '#f87171', '刑': '#fb923c', '害': '#a78bfa', '破': '#94a3b8' };

  return relations.map(r => `<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04);">
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="font-size:1.1rem;">${typeIcon[r.type]}</span>
      <span style="color:${typeColor[r.type]};font-weight:700;">${r.subtype}</span>
      <span style="font-size:.85rem;color:var(--muted);">${r.pair}</span>
      ${r.element ? `<span style="font-size:.75rem;padding:2px 6px;background:rgba(123,108,246,.1);border-radius:4px;">→ ${r.element}</span>` : ''}
    </div>
    <div style="font-size:.83rem;color:var(--text);margin-top:4px;line-height:1.6;">${r.desc}</div>
  </div>`).join('');
}

/** 渲染納音・胎元・命宮・身宮 */
function renderExtras(extras, pillars) {
  const { taiyuan, minggong, shengong, nayinPillars } = extras;

  let html = '';

  // 納音表
  html += `<div style="margin-bottom:14px;">
    <div style="font-size:.82rem;color:var(--muted);margin-bottom:6px;">四柱納音（古法五行歸類）</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center;">
      <div style="padding:8px;background:rgba(123,108,246,.04);border-radius:6px;">
        <div style="font-size:.7rem;color:var(--muted);">年柱</div>
        <div style="font-weight:600;font-size:.85rem;">${nayinPillars.year}</div>
      </div>
      <div style="padding:8px;background:rgba(123,108,246,.04);border-radius:6px;">
        <div style="font-size:.7rem;color:var(--muted);">月柱</div>
        <div style="font-weight:600;font-size:.85rem;">${nayinPillars.month}</div>
      </div>
      <div style="padding:8px;background:rgba(123,108,246,.04);border-radius:6px;">
        <div style="font-size:.7rem;color:var(--muted);">日柱</div>
        <div style="font-weight:600;font-size:.85rem;">${nayinPillars.day}</div>
      </div>
      <div style="padding:8px;background:rgba(123,108,246,.04);border-radius:6px;">
        <div style="font-size:.7rem;color:var(--muted);">時柱</div>
        <div style="font-weight:600;font-size:.85rem;">${nayinPillars.hour}</div>
      </div>
    </div>
    <div style="font-size:.78rem;color:var(--muted);margin-top:6px;">年柱納音「${nayinPillars.year}」是坊間常說的「你屬什麼命」的由來。</div>
  </div>`;

  // 胎元命宮身宮解說
  const stemTraits = {
    '甲': '積極進取、有領導力', '乙': '柔韌適應、重人際',
    '丙': '熱情開朗、有感染力', '丁': '細膩溫暖、重精神',
    '戊': '穩重踏實、重信用', '己': '包容務實、善經營',
    '庚': '果斷剛毅、重義氣', '辛': '精緻敏銳、重品味',
    '壬': '聰慧靈活、不受拘束', '癸': '內斂深沉、直覺強',
  };
  const branchTraits = {
    '子': '機敏、善謀劃', '丑': '沉穩、能積累', '寅': '衝勁強、敢開創',
    '卯': '溫和、重感受', '辰': '志大、有野心', '巳': '精明、善變通',
    '午': '熱烈、行動力強', '未': '細緻、重情義', '申': '靈活、善交際',
    '酉': '精準、重細節', '戌': '忠厚、有原則', '亥': '包容、想法多',
  };

  function getExtraDesc(label, obj) {
    const st = stemTraits[obj.stem] || '';
    const bt = branchTraits[obj.branch] || '';
    return `${label}${obj.stem}${obj.branch}（${obj.nayin}）— ${st}，${bt}。`;
  }

  const taiyuanDesc = getExtraDesc('胎元', taiyuan);
  const minggongDesc = getExtraDesc('命宮', minggong);
  const shengongDesc = getExtraDesc('身宮', shengong);

  // 胎元命宮身宮卡片
  html += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;">
    <div style="padding:10px;background:rgba(123,108,246,.04);border-radius:8px;text-align:center;">
      <div style="font-size:.72rem;color:var(--muted);">胎元</div>
      <div style="font-size:1.1rem;font-weight:700;">${taiyuan.stem}${taiyuan.branch}</div>
      <div style="font-size:.72rem;color:var(--muted);">${taiyuan.nayin}</div>
    </div>
    <div style="padding:10px;background:rgba(123,108,246,.04);border-radius:8px;text-align:center;">
      <div style="font-size:.72rem;color:var(--muted);">命宮</div>
      <div style="font-size:1.1rem;font-weight:700;">${minggong.stem}${minggong.branch}</div>
      <div style="font-size:.72rem;color:var(--muted);">${minggong.nayin}</div>
    </div>
    <div style="padding:10px;background:rgba(123,108,246,.04);border-radius:8px;text-align:center;">
      <div style="font-size:.72rem;color:var(--muted);">身宮</div>
      <div style="font-size:1.1rem;font-weight:700;">${shengong.stem}${shengong.branch}</div>
      <div style="font-size:.72rem;color:var(--muted);">${shengong.nayin}</div>
    </div>
  </div>`;

  // 白話解說
  html += `<div style="font-size:.78rem;color:var(--text);margin-top:12px;line-height:1.7;padding:10px;background:rgba(123,108,246,.03);border-radius:8px;">
    <div style="margin-bottom:6px;"><b>🌒 胎元</b>（先天稟賦，受胎月的干支）</div>
    <div style="margin-bottom:8px;padding-left:8px;">${taiyuanDesc}</div>
    <div style="margin-bottom:6px;"><b>🏠 命宮</b>（不拿出來示人的真實性格）</div>
    <div style="margin-bottom:8px;padding-left:8px;">${minggongDesc}</div>
    <div style="margin-bottom:6px;"><b>🚀 身宮</b>（後天努力的方向和成就）</div>
    <div style="padding-left:8px;">${shengongDesc}</div>
  </div>`;

  return html;
}

/** 十神在特定柱位的解讀 */
function getGodInPillar(god, pillar) {
  const pillarContext = { year: '童年/根基', month: '事業/社交', day: '內在/婚姻', hour: '晚年/子女' };
  const ctx = pillarContext[pillar];
  const base = {
    "比肩": { year:"你從小就有獨立自主的傾向，可能很早就學會自己處理事情。", month:"工作上你適合平等合作，不喜歡被壓著做事。", day:"你的內在追求獨立，伴侶關係中需要個人空間。", hour:"晚年獨立有精神，子女跟你性格相似。" },
    "劫財": { year:"童年環境有競爭，讓你養成了爭取的本能。", month:"職場上行動力強，但要注意跟同事的競爭關係。", day:"內在有衝勁，但伴侶關係中要注意過度爭勝。", hour:"晚年要注意理財，保持行動力但別太衝動。" },
    "食神": { year:"你從小就有表達天賦，可能很早展現某種才藝。", month:"工作上靠才華和創意發展，適合內容創作或教學。", day:"內心追求享受和美好，伴侶關係中重視生活品質。", hour:"晚年有口福有樂趣，適合發展興趣創作。" },
    "傷官": { year:"你從小就聰明有主見，思維跟同齡人不太一樣。", month:"工作上有創新能力，適合打破規則的領域。注意跟上司的關係。", day:"內在不服輸，伴侶關係中需要被尊重和被認可。", hour:"晚年思維活躍，可能有第二春的創作。" },
    "偏財": { year:"你天生對人際有敏感度，從小就能讀懂人的情緒。", month:"工作上善於建立人脈和發現機會，社交是你的資產。", day:"內在善於連結他人，伴侶關係可能透過社交認識。", hour:"晚年人緣好，可能有意外的人脈回報。" },
    "正財": { year:"你從小有務實的價值觀，可能很早就有金錢意識。", month:"工作上踏實穩健，適合需要長期累積的領域。", day:"內在重視安全感和穩定，伴侶關係中重視承諾。", hour:"晚年穩定踏實，財務安全有保障。" },
    "七殺": { year:"童年可能有壓力或嚴格的環境，但這磨練了你的韌性。", month:"工作上能承受高壓，適合競爭激烈或需要魄力的領域。", day:"內在有強烈的驅動力，伴侶關係可能帶有張力。", hour:"晚年不會安逸，保持挑戰反而有活力。" },
    "正官": { year:"你從小在有規矩的環境長大，養成了責任感。", month:"工作上適合體制內發展，容易得到正式的認可。", day:"內在重視秩序和責任，伴侶關係中是可靠的人。", hour:"晚年受人尊重，子女有教養。" },
    "偏印": { year:"你從小思維就跟別人不太一樣，有獨立思考的天賦。", month:"工作上適合走非主流路線，獨立研究或技術。", day:"內在追求獨特和深度，可能對靈性有興趣。", hour:"晚年適合研究和寫作，發展冷門興趣。" },
    "正印": { year:"你從小被照顧得好，有學習的環境和貴人的支持。", month:"工作上有人提攜，適合學術或專業發展。", day:"內在渴望被理解和支持，伴侶關係中需要溫暖。", hour:"晚年有人照顧，適合教學或傳承。" },
  };
  return base[god]?.[pillar] || getGodBrief(god);
}
function getGodBrief(god) {
  const briefs = {
    "比肩": "代表獨立自主的能量。你在這方面有「自己來」的傾向，不喜歡被指揮，適合平等合作。",
    "劫財": "代表行動和競爭的能量。你在這方面有衝勁和搶先的本能，適合需要魄力的場合。",
    "食神": "代表創作和享受的能量。你在這方面有表達天賦，能把想法轉化為作品或服務。",
    "傷官": "代表聰明和突破的能量。你在這方面不服從權威，有獨到見解，適合創新。",
    "偏財": "代表人際敏感度的能量。你在這方面天生能讀懂人，善於建立連結和發現機會。",
    "正財": "代表務實累積的能量。你在這方面穩健踏實，善於管理和維持。",
    "七殺": "代表承壓和突破的能量。你在這方面能頂住壓力做出成果，越難越有動力。",
    "正官": "代表責任和秩序的能量。你在這方面重視規矩和結構，適合體制內發展。",
    "偏印": "代表獨立思考的能量。你在這方面思維獨特，可能對冷門或靈性領域有天賦。",
    "正印": "代表學習和被支持的能量。你在這方面容易得到幫助，也擅長吸收知識。",
  };
  return briefs[god] || '';
}

/** 地支在特定柱位的含義 */
function getBranchMeaning(branch, pillar) {
  const branchTraits = {
    "子": "子水 — 聰明、靈活、有潛力。像冬天的種子，力量藏在地下等待時機。",
    "丑": "丑土 — 穩重、耐心、能承載。像冬末的凍土，看似不動但底下醞釀著春天。",
    "寅": "寅木 — 有衝勁、敢開始、有生命力。像初春的大樹開始抽芽，帶有開創能量。",
    "卯": "卯木 — 溫和、有彈性、善於交際。像春天的花草，柔軟但生命力旺盛。",
    "辰": "辰土 — 多變、有包容力、帶有水氣。像春雨後的濕土，能滋養萬物。",
    "巳": "巳火 — 思維敏銳、善變、有文采。像初夏的熱力開始升騰，頭腦靈活。",
    "午": "午火 — 熱情、外放、有領導力。像正午的太陽，能量最旺、最引人注目。",
    "未": "未土 — 溫厚、有品味、滋養型。像夏末的花園，豐盛而美好。",
    "申": "申金 — 果斷、有執行力、善於變通。像秋天的鐮刀，收割時毫不猶豫。",
    "酉": "酉金 — 精緻、有品味、追求完美。像打磨好的金器，閃亮但需要被欣賞。",
    "戌": "戌土 — 忠誠、守護、有原則。像守門的狗，對信任的人全心付出。",
    "亥": "亥水 — 包容、深沉、有智慧。像冬天的大海，表面平靜但深不可測。",
  };
  const pillarContext = {
    "year": "在年柱代表你的家族根基帶有這個能量底色。",
    "month": "在月柱代表你的事業環境和社交圈帶有這個氛圍。",
    "day": "在日柱（婚姻宮）代表你的另一半或親密關係帶有這個特質。",
    "hour": "在時柱代表你的子女或晚年環境帶有這個能量。",
  };
  return (branchTraits[branch] || '') + ' ' + (pillarContext[pillar] || '');
}

/** 取得特定柱位+十神的解讀文字 */
function getPillarText(pillar, god) {
  const texts = {
    "year": { "正官":"你出身的家庭有規矩、重視教育。從小被期待要表現好。","七殺":"童年有壓力或競爭，讓你很早學會堅強。","正印":"從小受長輩疼愛保護，家庭支持你學習。","偏印":"小時候想法跟同齡人不太一樣，培養了獨立思考。","比肩":"家庭平等開放，兄弟姊妹影響大。","劫財":"童年有競爭或資源分配議題，學會爭取。","食神":"家庭溫暖，從小有才藝培養。","傷官":"小時候聰明有主見，不太聽話但有創意。","偏財":"家庭可能有經商背景，學會了社交。","正財":"家庭重視節儉務實，從小有金錢觀念。" },
    "month": { "正官":"事業適合有結構的組織，容易得上司賞識。","七殺":"事業在壓力競爭中成長，適合創業或業務。","正印":"事業有貴人幫，適合學術教育專業。","偏印":"事業適合非主流路線，獨立研究或技術。","比肩":"事業適合跟朋友合作或獨立創業。","劫財":"事業環境競爭激烈，需要行動力和魄力。","食神":"事業跟才華創意有關，用天賦賺錢最好。","傷官":"事業需要原創性，打破規則的領域最發光。","偏財":"事業跟人脈社交有關，財富來自認識對的人。","正財":"事業適合穩定累積，長期投資是你的路。" },
    "hour": { "正官":"晚年受人尊重有地位，子女守規矩有出息。","七殺":"晚年閒不下來，保持挑戰反而有活力。","正印":"晚年有人照顧，子女孝順，適合做學問。","偏印":"晚年走向靈性研究，適合寫書留思想。","比肩":"晚年朋友多社交活躍，子女獨立。","劫財":"晚年注意理財，不要太大方被借走。","食神":"晚年有口福有創作，享受生活發揮興趣。","傷官":"晚年思維活躍不服老，可能有第二春創作。","偏財":"晚年人緣好，可能有意外收穫。","正財":"晚年穩定踏實衣食無憂，安穩享福。" },
  };
  return texts[pillar]?.[god] || '';
}

/** 排盤詳細展開（藏干 + 藏干十神 + 各柱意義） */
function renderPillarDetail(pillars, dayMaster, tenGods) {
  const pillarNames = ['year', 'month', 'day', 'hour'];
  const pillarZh = { year: '年柱（祖上・童年）', month: '月柱（事業・青年）', day: '日柱（自己・中年）', hour: '時柱（子女・晚年）' };

  return pillarNames.map(name => {
    const p = pillars[name];
    const stemGod = name === 'day' ? '日主' : getTenGod(dayMaster, p.stem);
    const stemElem = STEM_ELEMENT[p.stem];
    const branchElem = BRANCH_ELEMENT[p.branch];

    // 藏干十神
    const hiddenGods = p.hidden.map(h => {
      const god = (h === dayMaster) ? '比肩' : getTenGod(dayMaster, h);
      return `${h}(${god})`;
    }).join(' ');

    const isDay = name === 'day';
    const highlight = isDay ? 'border-left:3px solid var(--accent);padding-left:10px;' : '';

    return `<div style="padding:10px 8px;margin:6px 0;background:rgba(123,108,246,.05);border-radius:8px;${highlight}">
      <div style="font-weight:700;margin-bottom:6px;">${pillarZh[name]}</div>
      <div style="font-size:.9rem;">天干：<b>${p.stem}</b>（${stemElem}）${isDay ? ' — 日主' : ' — ' + stemGod}</div>
      <div style="font-size:.9rem;">地支：<b>${p.branch}</b>（${branchElem}）</div>
      <div style="font-size:.85rem;color:var(--muted);margin-top:4px;">藏干：${hiddenGods}</div>
    </div>`;
  }).join('');
}
