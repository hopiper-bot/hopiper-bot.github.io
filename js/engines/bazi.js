/**
 * bazi.js — 四柱八字引擎
 * 年柱（立春為界）、月柱（節氣邊界）、日柱（六十甲子）、時柱（時辰）
 * + 藏干、十神、五行統計
 */

import { dateTimeToJD, dateToJDN } from '../lib/utils.js';
import { getLiChunJD, getMonthByJD } from '../lib/solar-terms.js';
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

    const data = { pillars, dayMaster, dayMasterElem, elements, tenGods };
    const html = renderBazi(data);
    return { status: 'ok', data, html, error: null };
  } catch (err) {
    return { status: 'error', data: null, html: '', error: `八字計算錯誤：${err.message}` };
  }
}

// === 渲染 ===

function renderBazi(data) {
  const { pillars, dayMaster, dayMasterElem, elements, tenGods } = data;
  const p = pillars;

  return `
    <div class="sig">
      <div class="kin">四柱八字</div>
      <div class="big">${p.year.stem}${p.year.branch}　${p.month.stem}${p.month.branch}　${p.day.stem}${p.day.branch}　${p.hour.stem}${p.hour.branch}</div>
      <div style="font-size:.85rem;color:var(--muted);margin-top:6px;">日主：<span style="color:var(--accent);font-weight:700;">${dayMaster}（${dayMasterElem}）</span></div>
    </div>

    <h3>📋 四柱排盤</h3>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;text-align:center;font-size:.95rem;">
        <thead>
          <tr style="color:var(--muted);font-size:.8rem;border-bottom:1px solid var(--card-border);">
            <th style="padding:8px;">年柱</th><th style="padding:8px;">月柱</th><th style="padding:8px;color:var(--accent);">日柱（你）</th><th style="padding:8px;">時柱</th>
          </tr>
        </thead>
        <tbody>
          <tr style="font-size:1.3rem;font-weight:700;">
            <td style="padding:8px;">${p.year.stem}</td><td style="padding:8px;">${p.month.stem}</td><td style="padding:8px;color:var(--accent);">${p.day.stem}</td><td style="padding:8px;">${p.hour.stem}</td>
          </tr>
          <tr style="font-size:1.3rem;">
            <td style="padding:8px;">${p.year.branch}</td><td style="padding:8px;">${p.month.branch}</td><td style="padding:8px;">${p.day.branch}</td><td style="padding:8px;">${p.hour.branch}</td>
          </tr>
          <tr style="font-size:.8rem;color:var(--muted);">
            <td style="padding:6px;">${p.year.hidden.join(' ')}</td><td style="padding:6px;">${p.month.hidden.join(' ')}</td><td style="padding:6px;">${p.day.hidden.join(' ')}</td><td style="padding:6px;">${p.hour.hidden.join(' ')}</td>
          </tr>
          <tr style="font-size:.75rem;color:var(--muted);border-top:1px solid rgba(255,255,255,.05);">
            <td style="padding:6px;">${tenGods.find(t=>t.pillar==='year')?.god||''}</td><td style="padding:6px;">${tenGods.find(t=>t.pillar==='month')?.god||''}</td><td style="padding:6px;">日主</td><td style="padding:6px;">${tenGods.find(t=>t.pillar==='hour')?.god||''}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="divider"></div>
    <h3>🔥 五行分佈</h3>
    ${renderElements(elements, dayMasterElem)}

    <div class="divider"></div>
    <h3>⚖️ 十神解讀</h3>
    ${renderTenGods(tenGods, dayMaster)}

    <div class="note">💡 日柱天干（${dayMaster}）就是「你」。其他柱跟你的關係形成十神，反映人生中不同面向的能量。年柱=長輩/社會、月柱=事業/父母、時柱=子女/晚年。</div>
  `;
}

function renderElements(elements, dayMasterElem) {
  const total = Object.values(elements).reduce((a,b) => a+b, 0);
  const emojis = { 木:'🌳', 火:'🔥', 土:'⛰️', 金:'⚔️', 水:'💧' };

  let bars = Object.entries(elements).map(([elem, count]) => {
    const pct = Math.round(count / total * 100);
    const isMe = elem === dayMasterElem;
    const highlight = isMe ? 'color:var(--accent);font-weight:700;' : '';
    return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
      <span style="width:50px;${highlight}">${emojis[elem]} ${elem}</span>
      <div style="flex:1;height:16px;background:var(--input-bg);border-radius:8px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${isMe?'var(--accent)':'var(--accent2)'};border-radius:8px;"></div>
      </div>
      <span style="width:30px;font-size:.8rem;color:var(--muted);">${count}</span>
    </div>`;
  }).join('');

  // 判斷強弱
  const meCount = elements[dayMasterElem];
  const meRatio = meCount / total;
  let strength = meRatio > 0.3 ? '偏強' : meRatio < 0.15 ? '偏弱' : '中和';

  return `${bars}<p class="meaning" style="margin-top:12px;">你的日主 <span class="kw">${dayMasterElem}</span> 在命盤中${strength}。${strength==='偏強'?'你本身能量足夠，適合往外發展、做利他的事。':''}${strength==='偏弱'?'你需要外在支持，團隊合作比單打獨鬥更適合你。':''}${strength==='中和'?'你的五行分佈平衡，適應力強，各種發展方向都可以嘗試。':''}</p>`;
}

function renderTenGods(tenGods, dayMaster) {
  const godMeaning = {
    "比肩": "朋友、同儕、競爭者。代表獨立、自主、平等合作。",
    "劫財": "搶奪、行動、魄力。代表競爭心、衝勁、有時也帶破財傾向。",
    "食神": "才華、創作、享受。代表天賦表達、食祿豐富、性格溫和。",
    "傷官": "創新、叛逆、鋒芒。代表聰明過人、不服權威、有藝術天賦。",
    "偏財": "意外之財、社交、人緣。代表慷慨、會賺也會花、人脈廣。",
    "正財": "穩定收入、節儉、務實。代表踏實理財、重視安全感。",
    "七殺": "壓力、權威、突破。代表有魄力、能承壓、適合開創和管理。",
    "正官": "規矩、地位、責任。代表守規矩、有社會責任感、適合體制內工作。",
    "偏印": "獨立思考、冷門才能。代表思維獨特、適合研究和技術、有時較孤僻。",
    "正印": "貴人、學習、保護。代表受長輩照顧、學習能力強、有人脈支持。",
  };

  return tenGods.map(tg => {
    const meaning = godMeaning[tg.god] || '';
    const pillarZh = tg.pillar === 'year' ? '年柱' : tg.pillar === 'month' ? '月柱' : '時柱';
    return `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04);">
      <span style="font-weight:600;">${pillarZh} ${tg.stem}</span> → <span style="color:var(--accent);font-weight:700;">${tg.god}</span>
      <div style="font-size:.83rem;color:var(--muted);margin-top:4px;">${meaning}</div>
    </div>`;
  }).join('');
}
