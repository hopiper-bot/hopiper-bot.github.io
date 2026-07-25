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

// === 大運計算 ===

function calculateDayun(monthStemIdx, monthBranchIdx, isForward, dayMaster, birthYear) {
  const steps = [];
  // 起運年齡簡化：男命陽年約 2-3 歲起運（用固定值簡化，精確計算需要節氣距離）
  let startAge = 2; // 簡化，實際應根據出生日到下一個節的天數/3

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

  if (results.length === 0) {
    results.push({ name: "（無明顯神煞）", desc: "你的命盤中沒有特別突出的神煞，代表你的命運更多由四柱本身和大運決定。" });
  }

  return results;
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
    // 暫時假設男命（TODO: 加性別輸入）
    const isMale = true;
    const yearStemYY = STEM_YINYANG[pillars.year.stem];
    const isForward = (isMale && yearStemYY === '陽') || (!isMale && yearStemYY === '陰');
    const dayun = calculateDayun(mp.stemIdx, mp.branchIdx, isForward, dayMaster, year);

    // 神煞計算
    const shensha = calculateShensha(pillars);

    const data = { pillars, dayMaster, dayMasterElem, elements, tenGods, dayun, shensha, birthYear: year };
    const html = renderBazi(data);
    return { status: 'ok', data, html, error: null };
  } catch (err) {
    return { status: 'error', data: null, html: '', error: `八字計算錯誤：${err.message}` };
  }
}

// === 渲染 ===

function renderBazi(data) {
  const { pillars, dayMaster, dayMasterElem, elements, tenGods, dayun, shensha, birthYear } = data;
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
    <h3>👤 你的日主：${dayMaster}（${dayMasterElem}）</h3>
    <p class="meaning">${getDayMasterText(dayMaster)}</p>

    <div class="divider"></div>
    <h3>🔥 五行分佈</h3>
    ${renderElements(elements, dayMasterElem)}

    <div class="divider"></div>
    <h3>⚖️ 命盤格局</h3>
    ${renderPattern(tenGods, dayMaster, pillars)}

    <div class="divider"></div>
    <h3>📖 各柱解讀</h3>
    ${renderPillarMeaning(tenGods, pillars)}

    <div class="divider"></div>
    <h3>🚂 大運（每10年的人生主題）</h3>
    ${renderDayun(dayun, birthYear)}

    <div class="divider"></div>
    <h3>⭐ 副星（神煞）</h3>
    ${renderShensha(shensha)}

    <div class="note">💡 日柱天干（${dayMaster}）就是「你」。年柱=祖上/童年、月柱=事業/青年、日柱=自己/中年、時柱=子女/晚年。十神反映你跟周圍能量的關係。</div>
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

/** 各柱意義解讀 */
function renderPillarMeaning(tenGods, pillars) {
  const godDetail = {
    "正官": "有人管你、也給你舞台。代表來自社會/上司的期待和機會。你適合在有結構的環境中發揮。",
    "七殺": "有壓力推著你走。代表外在的競爭和挑戰，但也是你成長最快的動力來源。",
    "正印": "有人罩你。代表貴人運、學習機會、被保護的感覺。善用學習資源。",
    "偏印": "有獨特的才能在運作。代表非主流的技能或思維方式，可能讓你感覺跟別人不太一樣。",
    "比肩": "有同伴並肩。代表平等的合作關係、朋友的支持。但也要注意資源分散。",
    "劫財": "有人跟你搶。代表競爭者或消耗，但也給你動力。把這份能量導向正面競爭。",
    "食神": "有才華要展現。代表創造力和享受生活的能力。讓你的天賦被看見。",
    "傷官": "有話要說。代表表達欲和不服輸的精神。管理好這股能量，它可以是利器也可以傷人。",
    "偏財": "有意外收穫。代表社交機會和非固定收入。人脈是你的財富。",
    "正財": "有穩定進帳。代表踏實的收入來源和務實的價值觀。",
  };

  return tenGods.map(tg => {
    const pillarZh = tg.pillar === 'year' ? '年柱（童年/祖上）' : tg.pillar === 'month' ? '月柱（事業/青年）' : '時柱（子女/晚年）';
    const detail = godDetail[tg.god] || '';
    return `<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04);">
      <div><span style="font-weight:600;">${pillarZh}</span>：<span style="color:var(--accent);font-weight:700;">${tg.god}</span>（${tg.stem}）</div>
      <div style="font-size:.85rem;color:var(--text);margin-top:4px;line-height:1.7;">${detail}</div>
    </div>`;
  }).join('');
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

/** 渲染大運 */
function renderDayun(dayun, birthYear) {
  const now = new Date().getFullYear();
  const currentAge = now - birthYear;

  const godThemes = {
    "比肩": "獨立發展、平等合作、自主創業",
    "劫財": "競爭激烈、破財風險、行動力爆發",
    "食神": "才華展現、享受生活、創作豐收",
    "傷官": "突破框架、表達自我、注意口舌",
    "偏財": "社交擴張、意外收穫、投資機會",
    "正財": "穩定累積、務實理財、踏實收入",
    "七殺": "壓力大但成長快、權力鬥爭、突破極限",
    "正官": "事業穩定上升、獲得認可、承擔責任",
    "偏印": "獨立思考、學習冷門技能、適合轉型",
    "正印": "貴人運旺、學業順利、受人提攜",
  };

  const rows = dayun.map(d => {
    const isCurrent = (currentAge >= d.age && currentAge < d.age + 10);
    const highlight = isCurrent ? 'border-left:3px solid var(--accent);padding-left:10px;background:rgba(245,197,66,.06);' : '';
    const marker = isCurrent ? '<span style="color:var(--accent);font-weight:700;"> ← 現在</span>' : '';
    const theme = godThemes[d.god] || '';
    return `<div style="padding:8px 10px;margin:4px 0;border-radius:8px;${highlight}">
      <span style="font-weight:700;">${d.age}-${d.age+9}歲</span>（${d.yearStart}-${d.yearEnd}）
      <span style="margin-left:8px;font-size:1.1rem;">${d.stem}${d.branch}</span>
      <span style="color:var(--accent);margin-left:8px;">${d.god}運</span>${marker}
      <div style="font-size:.82rem;color:var(--muted);margin-top:3px;">${theme}</div>
    </div>`;
  }).join('');

  return `<p style="font-size:.83rem;color:var(--muted);margin-bottom:8px;">每10年換一步大運，代表那段時間的人生能量主題</p>${rows}`;
}

/** 渲染神煞 */
function renderShensha(shensha) {
  return shensha.map(s => {
    return `<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04);">
      <span style="color:var(--accent);font-weight:700;font-size:1rem;">${s.name}</span>
      <div style="font-size:.85rem;color:var(--text);margin-top:4px;line-height:1.7;">${s.desc}</div>
    </div>`;
  }).join('');
}
