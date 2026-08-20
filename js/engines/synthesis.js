/**
 * synthesis.js — 劇本大綱（時間軸版）
 * 
 * v4 重構：拿掉靜態「核心特質」（各 tab 已有），改為純時間軸敘事：
 *   1. 年度劇情 — 五系統流年共振（原 transit.js 邏輯）
 *   2. 本月節奏 — 流月干支 + 馬雅月能量 + 占星慢行星
 *   3. 今日能量 — 個人化版（對日主的十神關係）
 * 
 * 另保留 AI Prompt 建構（複製貼 ChatGPT / Gemini / Claude 用）
 */

import { julianDay, sunLongitude, moonLongitude, northNodeLongitude } from '../lib/ephemeris.js';
import { mercuryGeoLon, venusGeoLon, marsGeoLon, jupiterGeoLon, saturnGeoLon, uranusGeoLon, neptuneGeoLon, plutoGeoLon } from '../lib/planets.js';
import { normalizeDeg, dateTimeToJD, mod, dateToJDN } from '../lib/utils.js';
import { longitudeToGate, GATES } from '../data/hd-gates.js';
import { findDefinedChannels, CHANNELS } from '../data/hd-channels.js';
import { SEALS as MAYA_SEALS, TONES as MAYA_TONES } from '../data/maya-text.js';

// ============ 常量 ============

const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const STEM_ELEMENT = {"甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水"};
const STEM_YINYANG = {"甲":"陽","乙":"陰","丙":"陽","丁":"陰","戊":"陽","己":"陰","庚":"陽","辛":"陰","壬":"陽","癸":"陰"};
const BRANCH_ELEMENT = {"子":"水","丑":"土","寅":"木","卯":"木","辰":"土","巳":"火","午":"火","未":"土","申":"金","酉":"金","戌":"土","亥":"水"};
const ELEMENT_EMOJI = {"木":"🌳","火":"🔥","土":"🏔️","金":"⚙️","水":"💧"};
const WUXING_SHENG = {"木":"火","火":"土","土":"金","金":"水","水":"木"};
const WUXING_KE = {"木":"土","土":"水","水":"火","火":"金","金":"木"};

const PALACE_NAMES = ['命宮','兄弟','夫妻','子女','財帛','疾厄','遷移','交友','事業','田宅','福德','父母'];
const HOUSE_TOPICS = ['','自我/外表','金錢/資源','溝通/學習','家庭/根基','創造/戀愛','工作/健康','關係/合作','深層/共享','信念/遠方','事業/名聲','社群/理想','靈性/幕後'];

// ============ 十神計算 ============

function getTenGod(day, other) {
  const de = STEM_ELEMENT[day], oe = STEM_ELEMENT[other];
  const dy = STEM_YINYANG[day], oy = STEM_YINYANG[other];
  const same = dy === oy;
  if (de === oe) return same ? '比肩' : '劫財';
  if (WUXING_SHENG[de] === oe) return same ? '食神' : '傷官';
  if (WUXING_KE[de] === oe) return same ? '偏財' : '正財';
  if (WUXING_KE[oe] === de) return same ? '七殺' : '正官';
  if (WUXING_SHENG[oe] === de) return same ? '偏印' : '正印';
  return '';
}

function tenGodRelation(selfEl, otherEl) {
  if (selfEl === otherEl) return "比劫";
  if (WUXING_SHENG[otherEl] === selfEl) return "印";
  if (WUXING_SHENG[selfEl] === otherEl) return "食傷";
  if (WUXING_KE[selfEl] === otherEl) return "財";
  if (WUXING_KE[otherEl] === selfEl) return "官殺";
  return "比劫";
}

// ============ 年干支 / 月干支 / 日干支 ============

function getYearStemBranch(year) {
  const sIdx = (year - 4) % 10;
  const bIdx = (year - 4) % 12;
  return { stem: STEMS[sIdx], branch: BRANCHES[bIdx], stemIdx: sIdx, branchIdx: bIdx };
}

/**
 * 流月干支（以節氣為界，簡化版用固定日期近似）
 * 月柱天干 = 年干 × 2 + 月支序
 */
function getMonthStemBranch(year, month) {
  // 月支：寅月(1月)起，但農曆正月=寅，公曆近似：2月=寅,3月=卯...1月=丑
  const monthToBranch = [null, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1]; // idx1=Jan→丑(1), idx2=Feb→寅(2)...
  const branchIdx = monthToBranch[month];
  // 月柱天干公式：(年干序×2 + 月支序) % 10
  const yearStemIdx = (year - 4) % 10;
  const stemIdx = (yearStemIdx * 2 + branchIdx) % 10;
  return { stem: STEMS[stemIdx], branch: BRANCHES[branchIdx], stemIdx, branchIdx };
}

function dayPillar(y, m, d) {
  const jdn = dateToJDN(y, m, d);
  const base = dateToJDN(2000, 1, 7);
  const diff = ((jdn - base) % 60 + 60) % 60;
  return { stem: STEMS[diff % 10], branch: BRANCHES[diff % 12] };
}

// ============ 馬雅曆 ============

const MONTH_OFF = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
function dreamspellKin(y, m, d) {
  const yearVal = mod(217 + 105 * (y - 2013), 260);
  return mod(yearVal + MONTH_OFF[m - 1] + d - 1, 260) + 1;
}

function kinToInfo(kin) {
  const sealIdx = (kin - 1) % 20;
  const toneIdx = (kin - 1) % 13;
  return { kin, seal: MAYA_SEALS[sealIdx], tone: MAYA_TONES[toneIdx], sealIdx, toneIdx };
}

// ============ 流年計算（原 transit.js）============

function baziTransit(year, baziData) {
  if (!baziData) return null;
  const yy = getYearStemBranch(year);
  const dayMaster = baziData.dayMaster;
  const god = getTenGod(dayMaster, yy.stem);
  const yearElem = STEM_ELEMENT[yy.stem];
  const dayElem = baziData.dayMasterElem;

  let relation = '';
  if (yearElem === dayElem) relation = '比和（平穩）';
  else if (WUXING_SHENG[dayElem] === yearElem) relation = '我生（付出、耗洩）';
  else if (WUXING_SHENG[yearElem] === dayElem) relation = '生我（得助、資源）';
  else if (WUXING_KE[dayElem] === yearElem) relation = '我剋（求財、掌控）';
  else if (WUXING_KE[yearElem] === dayElem) relation = '剋我（壓力、挑戰）';

  const godDesc = {
    '比肩': '同類能量加持——人脈擴展、合作機會增加。但也要注意競爭和分財。',
    '劫財': '社交活躍、花錢慾望增加。適合拓展業務，但注意財務控管。',
    '食神': '才華展現的一年——創意豐沛、表達順暢。適合創作、學習新技能。身體放鬆，胃口好。',
    '傷官': '想法爆發、叛逆創新。對現狀不滿想突破。適合轉型，但注意跟上司/權威的關係。',
    '正財': '穩定進財——薪資加、理財有成。適合經營、累積。感情穩定走向承諾。',
    '偏財': '意外之財——投資、業績爆發、兼職收入。機會多但也來得快去得快。',
    '正官': '升遷、認可、考試順利。適合走體制內路線。會感受到責任加重。',
    '七殺': '壓力和挑戰——但也是突破舒適圈的動力。適合創業、轉換跑道、面對恐懼。',
    '正印': '學習、進修、考證照的好年。有長輩/貴人相助。身心修復。',
    '偏印': '靈感和直覺增強——適合研究、寫作、非主流技能。但注意鑽牛角尖。',
  };

  let dayunInfo = '';
  if (baziData.dayun) {
    const currentDayun = baziData.dayun.find(d => year >= d.yearStart && year <= d.yearEnd);
    if (currentDayun) dayunInfo = `大運「${currentDayun.stem}${currentDayun.branch}」（${currentDayun.god}運）`;
  }

  return { stem: yy.stem, branch: yy.branch, god, relation, godDesc: godDesc[god] || '', dayunInfo, yearElem };
}

function hdTransit(year, hdData) {
  if (!hdData) return null;
  const jd = dateTimeToJD(year, 7, 1, 12, 0, 0);
  const transitPlanets = [
    { id: 'jupiter', fn: jupiterGeoLon },
    { id: 'saturn', fn: saturnGeoLon },
    { id: 'uranus', fn: uranusGeoLon },
    { id: 'neptune', fn: neptuneGeoLon },
    { id: 'pluto', fn: plutoGeoLon },
  ];
  const planetNames = { jupiter:'木星', saturn:'土星', uranus:'天王星', neptune:'海王星', pluto:'冥王星' };

  const transitGates = [];
  for (const p of transitPlanets) {
    const lon = p.fn(jd);
    const { gate, line } = longitudeToGate(lon);
    transitGates.push({ planet: planetNames[p.id], gate, line });
  }

  const natalGates = new Set();
  if (hdData.personalityPlanets) hdData.personalityPlanets.forEach(p => natalGates.add(p.gate));
  if (hdData.designPlanets) hdData.designPlanets.forEach(p => natalGates.add(p.gate));

  const tempChannels = [];
  for (const tp of transitGates) {
    for (const ch of CHANNELS) {
      const otherGate = ch.gates[0] === tp.gate ? ch.gates[1] : ch.gates[1] === tp.gate ? ch.gates[0] : null;
      if (otherGate && natalGates.has(otherGate)) {
        const alreadyDefined = hdData.definedChannels?.some(dc => dc.gates.includes(tp.gate) && dc.gates.includes(otherGate));
        if (!alreadyDefined) {
          tempChannels.push({ planet: tp.planet, channel: ch, transitGate: tp.gate, natalGate: otherGate });
        }
      }
    }
  }

  return { transitGates, tempChannels };
}

function astroTransit(year, astroData) {
  if (!astroData) return null;
  const jd = dateTimeToJD(year, 7, 1, 12, 0, 0);
  const SIGNS_ZH = ['牡羊座','金牛座','雙子座','巨蟹座','獅子座','處女座','天秤座','天蠍座','射手座','摩羯座','水瓶座','雙魚座'];

  const transitPositions = [
    { id: 'jupiter', zh: '木星', fn: jupiterGeoLon },
    { id: 'saturn', zh: '土星', fn: saturnGeoLon },
    { id: 'uranus', zh: '天王星', fn: uranusGeoLon },
    { id: 'neptune', zh: '海王星', fn: neptuneGeoLon },
    { id: 'pluto', zh: '冥王星', fn: plutoGeoLon },
  ].map(p => {
    const lon = p.fn(jd);
    const signIdx = Math.floor(lon / 30);
    return { ...p, lon, sign: SIGNS_ZH[signIdx], signIdx };
  });

  const aspects = [];
  const natalPlanets = astroData.planets || [];
  const ASP = [
    { name: '合', angle: 0, orb: 8 },
    { name: '對沖', angle: 180, orb: 8 },
    { name: '四分', angle: 90, orb: 6 },
    { name: '三合', angle: 120, orb: 6 },
  ];

  for (const tp of transitPositions) {
    for (const np of natalPlanets) {
      let diff = Math.abs(tp.lon - np.longitude);
      if (diff > 180) diff = 360 - diff;
      for (const asp of ASP) {
        if (Math.abs(diff - asp.angle) <= asp.orb) {
          aspects.push({ transit: tp.zh, natal: np.zh, type: asp.name, exact: Math.abs(diff - asp.angle).toFixed(1) });
          break;
        }
      }
    }
  }

  const natalAscLon = astroData.ascendant?.longitude || 0;
  const jupLon = transitPositions.find(p => p.id === 'jupiter')?.lon || 0;
  const jupHouse = Math.floor(normalizeDeg(jupLon - natalAscLon) / 30) + 1;
  const satLon = transitPositions.find(p => p.id === 'saturn')?.lon || 0;
  const satHouse = Math.floor(normalizeDeg(satLon - natalAscLon) / 30) + 1;

  return { transitPositions, aspects, jupHouse, satHouse };
}

function ziweiTransit(year, ziweiData) {
  if (!ziweiData) return null;
  const yb = (year - 4) % 12;
  const liunianPos = (14 - yb) % 12;
  const ys = (year - 4) % 10;
  const SIHUA_TABLE = [
    ['廉貞','破軍','武曲','太陽'],['天機','天梁','紫微','太陰'],
    ['天同','天機','文昌','廉貞'],['太陰','天同','天機','巨門'],
    ['貪狼','太陰','右弼','天機'],['武曲','貪狼','天梁','文曲'],
    ['太陽','武曲','太陰','天同'],['巨門','太陽','文曲','文昌'],
    ['天梁','紫微','左輔','武曲'],['破軍','巨門','太陰','貪狼'],
  ];
  const sh = SIHUA_TABLE[ys];
  const sihua = { lu: sh[0], quan: sh[1], ke: sh[2], ji: sh[3] };

  let sihuaPalaces = {};
  if (ziweiData.palaces) {
    for (const key of ['lu','quan','ke','ji']) {
      const starName = sihua[key];
      for (const p of ziweiData.palaces) {
        const found = p.main?.some(s => (typeof s === 'string' ? s : s.name) === starName);
        if (found) { sihuaPalaces[key] = p; break; }
      }
    }
  }

  return { liunianPos, sihua, sihuaPalaces, yearStem: STEMS[ys], yearBranch: BRANCHES[yb] };
}

function mayaTransit(year, mayaData) {
  if (!mayaData) return null;
  const ad = mayaData.annualDream;
  const ds = mayaData.dreamspell;
  if (!ad) return null;

  function kinToName(kin) {
    if (!kin) return null;
    const sealIdx = (kin - 1) % 20;
    const toneIdx = (kin - 1) % 13;
    return { seal: MAYA_SEALS[sealIdx].zh, tone: MAYA_TONES[toneIdx].zh, kin };
  }

  return {
    yearInfo: kinToName(ad.yearKin),
    personalInfo: kinToName(ad.personalKin),
    galacticYear: ad.galacticYear,
    natalSeal: ds?.seal,
  };
}

// ============ 流月計算（新增）============

function baziMonth(year, month, baziData) {
  if (!baziData) return null;
  const mm = getMonthStemBranch(year, month);
  const dayMaster = baziData.dayMaster;
  const god = getTenGod(dayMaster, mm.stem);
  const monthElem = STEM_ELEMENT[mm.stem];

  const godDesc = {
    '比肩': '本月能量跟你同頻——同事互助、交友活絡，但也有競爭壓力。',
    '劫財': '本月花錢機會多、社交活躍。適合拓展人脈，但別衝動消費。',
    '食神': '本月表達力和食慾都旺——適合創作、發表、享受美食。',
    '傷官': '本月想法多、不想被管。適合創新，但注意跟主管的互動。',
    '正財': '本月進財穩定，適合理財規劃、穩步推進計畫。',
    '偏財': '本月有意外收入機會。投資運不錯，但見好就收。',
    '正官': '本月責任加重、有正式場合或評估。適合表現紀律面。',
    '七殺': '本月壓力感明顯，但也是突破的好時機。面對它。',
    '正印': '本月適合學習、休息、找貴人。長輩緣好。',
    '偏印': '本月直覺強、適合研究鑽研。但別想太多。',
  };

  return { stem: mm.stem, branch: mm.branch, god, monthElem, godDesc: godDesc[god] || '' };
}

function astroMonth(year, month, astroData) {
  if (!astroData) return null;
  // 用月中（15號）取樣慢行星位置
  const jd = dateTimeToJD(year, month, 15, 12, 0, 0);
  const SIGNS_ZH = ['牡羊座','金牛座','雙子座','巨蟹座','獅子座','處女座','天秤座','天蠍座','射手座','摩羯座','水瓶座','雙魚座'];

  const planets = [
    { id: 'jupiter', zh: '木星', fn: jupiterGeoLon },
    { id: 'saturn', zh: '土星', fn: saturnGeoLon },
  ].map(p => {
    const lon = p.fn(jd);
    return { ...p, lon, sign: SIGNS_ZH[Math.floor(lon / 30)] };
  });

  // 本月太陽進入的星座
  const sunLon = sunLongitude(jd);
  const sunSign = SIGNS_ZH[Math.floor(sunLon / 30)];

  return { planets, sunSign };
}

function mayaMonth(year, month) {
  // 取該月 1 號的 KIN 作為月能量代表
  const kin = dreamspellKin(year, month, 1);
  const info = kinToInfo(kin);
  return info;
}

// ============ 今日（個人化）============

function todayPersonal(baziData) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();

  // 日柱
  const { stem, branch } = dayPillar(y, m, d);
  const todayElem = STEM_ELEMENT[stem];

  // 馬雅
  const kin = dreamspellKin(y, m, d);
  const mayaInfo = kinToInfo(kin);

  // 個人化十神
  let personal = null;
  if (baziData?.dayMaster) {
    const selfEl = STEM_ELEMENT[baziData.dayMaster];
    const relation = tenGodRelation(selfEl, todayElem);
    personal = { selfStem: baziData.dayMaster, selfEl, relation, todayElem };
  }

  const DAY_ADVICE = {
    "甲": { good: "開始新計畫、拜訪新客戶", avoid: "結束或斷捨離", vibe: "開創" },
    "乙": { good: "溝通協商、藝術創作", avoid: "激進變動", vibe: "柔和" },
    "丙": { good: "展現自我、公開演講", avoid: "低調行事", vibe: "光芒" },
    "丁": { good: "精細工作、學習研究", avoid: "大動作行銷", vibe: "溫暖" },
    "戊": { good: "穩定推進、建立制度", avoid: "冒險投機", vibe: "穩重" },
    "己": { good: "整理收納、照顧他人", avoid: "急躁催促", vibe: "包容" },
    "庚": { good: "決斷執行、處理積壓", avoid: "猶豫不決", vibe: "果斷" },
    "辛": { good: "談判簽約、精品選購", avoid: "粗枝大葉", vibe: "精緻" },
    "壬": { good: "腦力激盪、旅行移動", avoid: "固守不變", vibe: "流動" },
    "癸": { good: "冥想反省、深度對話", avoid: "過度社交", vibe: "沉靜" },
  };

  const RELATION_ADVICE = {
    "比劫": { title: "兄弟日", icon: "🤝", text: "今天能量跟你同國。合作、競爭並存。" },
    "印":   { title: "貴人日", icon: "🌱", text: "有資源和長輩緣靠近。適合學習和休息。" },
    "食傷": { title: "才華日", icon: "🎨", text: "表達力爆發。適合創作、發表、秀點子。" },
    "財":   { title: "財氣日", icon: "💰", text: "掌控力強、目標感清楚。適合談錢推計畫。" },
    "官殺": { title: "考驗日", icon: "🛡️", text: "壓力責任較重。適合守規矩、按部就班。" },
  };

  return {
    date: `${y}/${m}/${d}`,
    weekday: ['日','一','二','三','四','五','六'][now.getDay()],
    stem, branch, todayElem,
    advice: DAY_ADVICE[stem],
    maya: mayaInfo,
    personal,
    relationAdvice: personal ? RELATION_ADVICE[personal.relation] : null,
  };
}

// ============ 流年綜合交叉比對（共振分析）============

const YEAR_THEMES = {
  money: { zh: '財運', icon: '💰' },
  career: { zh: '事業', icon: '📈' },
  growth: { zh: '成長', icon: '🌱' },
  pressure: { zh: '壓力', icon: '🏋️' },
  change: { zh: '變動', icon: '🔄' },
  relationship: { zh: '關係', icon: '💕' },
  creativity: { zh: '創造', icon: '🎨' },
  lucky: { zh: '幸運', icon: '🍀' },
  spiritual: { zh: '靈性', icon: '🔮' },
  health: { zh: '身心', icon: '🧘' },
};

function extractYearThemes(bazi, hd, astro, ziwei, maya) {
  const themes = [];

  if (bazi) {
    const godToTheme = {
      '正財': ['money','career'], '偏財': ['money','lucky'],
      '正官': ['career','pressure'], '七殺': ['pressure','change'],
      '食神': ['creativity','lucky'], '傷官': ['creativity','change'],
      '正印': ['growth','spiritual'], '偏印': ['spiritual','growth'],
      '比肩': ['relationship'], '劫財': ['money','change'],
    };
    if (godToTheme[bazi.god]) themes.push(...godToTheme[bazi.god].map(t => ({ theme: t, source: '八字' })));
  }

  if (astro) {
    const houseTheme = { 1:'health', 2:'money', 3:'growth', 4:'relationship', 5:'creativity', 6:'health', 7:'relationship', 8:'change', 9:'spiritual', 10:'career', 11:'relationship', 12:'spiritual' };
    if (houseTheme[astro.jupHouse]) themes.push({ theme: houseTheme[astro.jupHouse], source: '占星木星' }, { theme: 'lucky', source: '占星木星' });
    if (houseTheme[astro.satHouse]) themes.push({ theme: houseTheme[astro.satHouse], source: '占星土星' }, { theme: 'pressure', source: '占星土星' });
  }

  if (hd && hd.tempChannels.length > 0) {
    themes.push({ theme: 'change', source: '人類圖' });
    for (const tc of hd.tempChannels) {
      if (['金錢線','脈動','投降','蛻變'].includes(tc.channel.name)) themes.push({ theme: 'money', source: '人類圖' });
      if (['創始者','發起'].includes(tc.channel.name)) themes.push({ theme: 'career', source: '人類圖' });
      if (['啟發','無常','好奇心'].includes(tc.channel.name)) themes.push({ theme: 'creativity', source: '人類圖' });
    }
  }

  if (ziwei) {
    const palaceTheme = { 0:'health', 1:'relationship', 2:'relationship', 3:'relationship', 4:'money', 5:'health', 6:'change', 7:'relationship', 8:'career', 9:'money', 10:'spiritual', 11:'relationship' };
    if (ziwei.sihuaPalaces.lu) themes.push({ theme: palaceTheme[ziwei.sihuaPalaces.lu.pos] || 'lucky', source: '紫微化祿' }, { theme: 'lucky', source: '紫微化祿' });
    if (ziwei.sihuaPalaces.ji) themes.push({ theme: palaceTheme[ziwei.sihuaPalaces.ji.pos] || 'pressure', source: '紫微化忌' }, { theme: 'pressure', source: '紫微化忌' });
    if (ziwei.sihuaPalaces.quan) themes.push({ theme: 'career', source: '紫微化權' });
  }

  if (maya && maya.natalSeal) {
    const sealTheme = { '紅龍':'relationship', '白風':'creativity', '藍夜':'money', '黃種子':'growth', '紅蛇':'change', '白世界橋':'change', '藍手':'creativity', '黃星':'creativity', '紅月':'spiritual', '白狗':'relationship', '藍猴':'creativity', '黃人':'growth', '紅天行者':'change', '白巫師':'spiritual', '藍鷹':'career', '黃戰士':'career', '紅地球':'health', '白鏡':'spiritual', '藍風暴':'change', '黃太陽':'lucky' };
    const seal = maya.personalInfo?.seal || maya.natalSeal?.zh;
    if (seal && sealTheme[seal]) themes.push({ theme: sealTheme[seal], source: '馬雅' });
  }

  return themes;
}

function generateSpecificAdvice(bazi, hd, astro, ziwei, sorted) {
  let adv = '';

  if (sorted.some(t => t.key === 'money')) {
    let d = [];
    if (bazi && ['正財','偏財'].includes(bazi.god)) d.push(bazi.god === '偏財' ? '八字走偏財——意外收入型' : '八字走正財——穩定累積型');
    if (hd?.tempChannels?.some(tc => ['金錢線','脈動','投降','蛻變'].includes(tc.channel.name))) d.push('人類圖有財富相關通道開通');
    if (astro && astro.jupHouse === 2) d.push('木星過境財帛宮');
    if (d.length > 0) adv += `<div style="margin-bottom:10px;">💰 <b>財運：</b>${d.join('；')}。<br><span style="color:var(--muted);font-size:.82rem;">→ 今年跟錢有關的訊號是真的。${bazi?.god === '偏財' ? '把握機會但不梭哈。' : '穩紮穩打。'}</span></div>`;
  }

  if (sorted.some(t => t.key === 'career')) {
    let d = [];
    if (bazi && ['正官','七殺'].includes(bazi.god)) d.push(bazi.god === '正官' ? '八字走正官——升遷認可' : '八字走七殺——壓力型突破');
    if (astro && astro.jupHouse === 10) d.push('木星過境事業宮');
    if (d.length > 0) adv += `<div style="margin-bottom:10px;">📈 <b>事業：</b>${d.join('；')}。</div>`;
  }

  if (sorted.some(t => t.key === 'pressure')) {
    let d = [];
    if (bazi && ['七殺','正官'].includes(bazi.god)) d.push(`八字走${bazi.god}`);
    if (astro?.satHouse) d.push(`土星在 ${astro.satHouse} 宮（${HOUSE_TOPICS[astro.satHouse]||''}）`);
    if (ziwei?.sihuaPalaces?.ji) d.push(`化忌落${PALACE_NAMES[ziwei.sihuaPalaces.ji.pos]||''}`);
    if (d.length > 0) adv += `<div style="margin-bottom:10px;">🏋️ <b>壓力點：</b>${d.join('；')}。<br><span style="color:var(--muted);font-size:.82rem;">→ 壓力是升級的前奏。</span></div>`;
  }

  if (sorted.some(t => t.key === 'change')) {
    let d = [];
    if (bazi && ['傷官','七殺','劫財'].includes(bazi.god)) d.push(`八字走${bazi.god}——內在躁動`);
    if (hd?.tempChannels?.length > 2) d.push(`人類圖開了 ${hd.tempChannels.length} 條臨時通道`);
    if (d.length > 0) adv += `<div style="margin-bottom:10px;">🔄 <b>變動：</b>${d.join('；')}。<br><span style="color:var(--muted);font-size:.82rem;">→ 適合轉型，但等感覺對了再動。</span></div>`;
  }

  if (adv === '') adv = '今年能量分散，沒有壓倒性主題。保持本命策略，見機行事。';
  return adv;
}

// ============ 渲染：年度 ============

function renderYear(year, bazi, hd, astro, ziwei, maya) {
  const currentYear = new Date().getFullYear();
  let html = '';

  // 年份切換按鈕
  html += `<div style="display:flex;gap:8px;justify-content:center;margin:8px 0 16px;">`;
  for (let y = currentYear - 1; y <= currentYear + 2; y++) {
    const isActive = y === year;
    html += `<button class="transit-year-btn${isActive ? ' active' : ''}" data-year="${y}" style="padding:6px 14px;border-radius:16px;border:1px solid ${isActive ? 'var(--accent)' : 'rgba(255,255,255,.12)'};background:${isActive ? 'var(--accent)' : 'transparent'};color:${isActive ? '#000' : 'var(--text)'};font-size:.82rem;cursor:pointer;font-weight:${isActive ? '700' : '400'};transition:all .2s;">${y}${y === currentYear ? '（今年）' : ''}</button>`;
  }
  html += `</div>`;

  // 流年共振分析
  const themes = extractYearThemes(bazi, hd, astro, ziwei, maya);
  const stats = {};
  for (const t of themes) {
    if (!stats[t.theme]) stats[t.theme] = { count: 0, sources: [] };
    stats[t.theme].count++;
    if (!stats[t.theme].sources.includes(t.source)) stats[t.theme].sources.push(t.source);
  }
  const sorted = Object.entries(stats)
    .map(([key, val]) => ({ key, ...YEAR_THEMES[key], systemCount: val.sources.length, sources: val.sources }))
    .filter(t => t.systemCount >= 2)
    .sort((a, b) => b.systemCount - a.systemCount);

  if (sorted.length > 0) {
    const top3 = sorted.slice(0, 3).map(t => t.zh);
    html += `<div style="padding:14px;background:rgba(245,197,66,.08);border-radius:10px;margin-bottom:14px;">`;
    html += `<div style="font-size:1rem;font-weight:700;margin-bottom:6px;">⚡ ${year} 年度關鍵字：${top3.join('、')}</div>`;
    html += `<div style="font-size:.8rem;color:var(--muted);">多個系統同時指向 = 今年的重點方向</div>`;
    html += `</div>`;

    for (const t of sorted.slice(0, 4)) {
      const barW = Math.min(t.systemCount * 25, 100);
      html += `<div style="display:flex;align-items:center;gap:8px;margin:6px 0;">`;
      html += `<span style="width:70px;font-size:.82rem;white-space:nowrap;">${t.icon} ${t.zh}</span>`;
      html += `<div style="flex:1;height:16px;background:rgba(255,255,255,.05);border-radius:8px;overflow:hidden;"><div style="width:${barW}%;height:100%;background:linear-gradient(90deg,var(--accent),#f5c542);border-radius:8px;display:flex;align-items:center;padding-left:6px;"><span style="font-size:.68rem;color:#000;font-weight:700;">${t.systemCount}系統</span></div></div>`;
      html += `<span style="font-size:.7rem;color:var(--muted);">${t.sources.join('/')}</span>`;
      html += `</div>`;
    }

    html += `<div style="margin-top:14px;padding:14px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.88rem;line-height:2;">`;
    html += `<b>💡 ${year} 操作建議：</b><br>`;
    html += generateSpecificAdvice(bazi, hd, astro, ziwei, sorted);
    html += `</div>`;
  } else {
    html += `<div class="meaning">各系統今年訊號分散，沒有壓倒性單一主題。保持開放、見機行事。</div>`;
  }

  // 各系統細節（可收合）
  if (bazi) {
    html += `<details class="transit-section" style="margin-top:14px;"><summary class="transit-summary"><span style="font-weight:600;">🀄 八字流年：${bazi.stem}${bazi.branch}年（${bazi.god}）</span></summary>`;
    html += `<div class="transit-content"><div class="meaning" style="line-height:1.9;">${bazi.godDesc}</div>`;
    if (bazi.dayunInfo) html += `<div style="font-size:.8rem;color:var(--muted);margin-top:4px;">目前${bazi.dayunInfo}</div>`;
    html += `</div></details>`;
  }

  if (astro) {
    html += `<details class="transit-section"><summary class="transit-summary"><span style="font-weight:600;">🪐 占星：木星 ${astro.jupHouse} 宮 / 土星 ${astro.satHouse} 宮</span></summary>`;
    html += `<div class="transit-content">`;
    html += `<div style="font-size:.85rem;margin-bottom:6px;"><b>♃ 木星 ${astro.jupHouse} 宮</b>（${HOUSE_TOPICS[astro.jupHouse]||''}）— ${getJupiterHouseDesc(astro.jupHouse)}</div>`;
    html += `<div style="font-size:.85rem;"><b>♄ 土星 ${astro.satHouse} 宮</b>（${HOUSE_TOPICS[astro.satHouse]||''}）— ${getSaturnHouseDesc(astro.satHouse)}</div>`;
    if (astro.aspects.length > 0) {
      html += `<div style="margin-top:10px;font-size:.82rem;"><b>重要相位：</b></div>`;
      for (const a of astro.aspects.slice(0, 6)) {
        const emoji = a.type === '合' ? '☌' : a.type === '對沖' ? '☍' : a.type === '三合' ? '△' : '□';
        html += `<div style="font-size:.82rem;padding:4px 0;">${emoji} 流年${a.transit} ${a.type} 本命${a.natal}</div>`;
      }
    }
    html += `</div></details>`;
  }

  if (hd && (hd.transitGates.length > 0 || hd.tempChannels.length > 0)) {
    html += `<details class="transit-section"><summary class="transit-summary"><span style="font-weight:600;">△ 人類圖：${hd.tempChannels.length} 條臨時通道</span></summary>`;
    html += `<div class="transit-content">`;
    if (hd.tempChannels.length > 0) {
      for (const tc of hd.tempChannels) {
        html += `<div style="font-size:.82rem;padding:4px 0;"><b>${tc.planet}</b> → ${tc.channel.gates[0]}-${tc.channel.gates[1]}「${tc.channel.name}」</div>`;
      }
    } else {
      html += `<div style="font-size:.82rem;color:var(--muted);">今年沒有臨時通道開通。</div>`;
    }
    html += `</div></details>`;
  }

  if (ziwei) {
    const huaLabel = { lu:'祿', quan:'權', ke:'科', ji:'忌' };
    html += `<details class="transit-section"><summary class="transit-summary"><span style="font-weight:600;">🌟 紫微：${ziwei.sihua.lu}化祿 / ${ziwei.sihua.ji}化忌</span></summary>`;
    html += `<div class="transit-content">`;
    for (const key of ['lu','quan','ke','ji']) {
      const p = ziwei.sihuaPalaces[key];
      if (p) {
        const palaceName = PALACE_NAMES[p.pos] || `${p.pos}宮`;
        html += `<div style="font-size:.82rem;padding:3px 0;"><b>${ziwei.sihua[key]}</b>化${huaLabel[key]} → ${palaceName}</div>`;
      }
    }
    html += `</div></details>`;
  }

  if (maya && maya.yearInfo) {
    html += `<details class="transit-section"><summary class="transit-summary"><span style="font-weight:600;">🌀 馬雅：${maya.yearInfo.tone}的${maya.yearInfo.seal}（KIN ${maya.yearInfo.kin}）</span></summary>`;
    html += `<div class="transit-content">`;
    const yiSealData = MAYA_SEALS.find(s => s.zh === maya.yearInfo.seal);
    if (yiSealData) html += `<div style="font-size:.82rem;line-height:1.6;">${yiSealData.glyph}「${maya.yearInfo.seal}」：${yiSealData.text.split("。")[0]}。</div>`;
    if (maya.personalInfo) {
      html += `<div style="font-size:.82rem;margin-top:6px;">你今年個人 KIN = <b>${maya.personalInfo.tone}的${maya.personalInfo.seal}</b>（KIN ${maya.personalInfo.kin}）</div>`;
    }
    html += `</div></details>`;
  }

  return html;
}

// ============ 渲染：本月 ============

function renderMonth(year, month, baziData, astroData) {
  const MONTH_ZH = ['','一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  let html = '';

  const bm = baziMonth(year, month, baziData);
  const am = astroMonth(year, month, astroData);
  const mm = mayaMonth(year, month);

  html += `<div style="font-size:.85rem;color:var(--muted);margin-bottom:8px;">${year} 年 ${MONTH_ZH[month]}</div>`;

  // 月干支 + 十神
  if (bm) {
    html += `<div style="display:flex;gap:12px;align-items:center;margin-bottom:10px;">`;
    html += `<div style="text-align:center;padding:8px 14px;background:rgba(123,108,246,.1);border-radius:8px;"><div style="font-size:1.1rem;font-weight:700;">${bm.stem}${bm.branch}</div><div style="font-size:.72rem;color:var(--muted);">${STEM_ELEMENT[bm.stem]}月</div></div>`;
    html += `<div><div style="font-size:.9rem;font-weight:600;color:var(--accent);">本月十神：${bm.god}</div>`;
    html += `<div style="font-size:.82rem;color:var(--muted);margin-top:2px;">${bm.godDesc}</div></div>`;
    html += `</div>`;
  }

  // 馬雅月能量
  if (mm && mm.seal) {
    html += `<div style="font-size:.85rem;margin-bottom:8px;">🌀 馬雅月能量：<b>${mm.tone.zh}的${mm.seal.zh}</b>（KIN ${mm.kin}）`;
    if (mm.seal.text) html += ` — ${mm.seal.text.split("。")[0]}。`;
    html += `</div>`;
  }

  // 占星太陽星座季節
  if (am) {
    html += `<div style="font-size:.85rem;margin-bottom:4px;">☀️ 太陽目前在 <b>${am.sunSign}</b>`;
    for (const p of am.planets) {
      html += ` ｜ ${p.zh} ${p.sign}`;
    }
    html += `</div>`;
  }

  return html;
}

// ============ 渲染：今日 ============

function renderToday(baziData) {
  const t = todayPersonal(baziData);
  let html = '';

  html += `<div style="font-size:.85rem;color:var(--muted);margin-bottom:8px;">${t.date}（${t.weekday}）</div>`;

  // 個人化十神
  if (t.personal && t.relationAdvice) {
    html += `<div style="padding:12px;background:rgba(123,108,246,.08);border-radius:8px;margin-bottom:10px;">`;
    html += `<div style="font-size:.95rem;font-weight:700;">${t.relationAdvice.icon} ${t.relationAdvice.title}</div>`;
    html += `<div style="font-size:.82rem;color:var(--muted);margin-top:4px;">今日${t.stem}${t.branch}（${ELEMENT_EMOJI[t.todayElem]}${t.todayElem}）vs 你的日主${t.personal.selfStem}（${ELEMENT_EMOJI[t.personal.selfEl]}${t.personal.selfEl}）</div>`;
    html += `<div style="font-size:.85rem;margin-top:6px;">${t.relationAdvice.text}</div>`;
    html += `</div>`;
  }

  // 通用日能量
  if (t.advice) {
    html += `<div style="font-size:.82rem;">✅ 適合：${t.advice.good}</div>`;
    html += `<div style="font-size:.82rem;">⚠️ 避免：${t.advice.avoid}</div>`;
  }

  // 馬雅日能量
  if (t.maya && t.maya.seal) {
    html += `<div style="font-size:.82rem;margin-top:6px;">🌀 ${t.maya.seal.glyph || ''} ${t.maya.tone.zh}的${t.maya.seal.zh}（KIN ${t.maya.kin}）</div>`;
  }

  return html;
}

// ============ 木星/土星宮位描述（精簡版）============

function getJupiterHouseDesc(house) {
  const d = { 1:'自信提升，形象發光', 2:'收入來源擴展', 3:'學習溝通活絡', 4:'家庭運好，適合置產', 5:'創造力和桃花旺', 6:'工作機會增加', 7:'合作關係擴展', 8:'可能有意外資源', 9:'適合進修、出國', 10:'事業擴展黃金期', 11:'社群人脈帶來機會', 12:'內在修復、靈性成長' };
  return d[house] || '木星帶來擴展機會。';
}

function getSaturnHouseDesc(house) {
  const d = { 1:'被要求重新定義自己', 2:'財務需要更有紀律', 3:'溝通學習需要耐心', 4:'家庭責任加重', 5:'創造力需要更認真', 6:'工作壓力大但能升級', 7:'關係面臨現實考驗', 8:'財務共享有壓力', 9:'信念被現實檢驗', 10:'事業有硬仗但值得', 11:'社群和目標需要篩選', 12:'清理內在積累的疲憊' };
  return d[house] || '土星帶來紀律和考驗。';
}

// ============ AI Prompt 建構（保留）============

const AI_SYSTEM_PROMPT = `你是一位同時精通五大命理系統（八字、紫微斗數、西洋占星、馬雅曆、人類圖）的資深分析師，也是一位擅長說人話的心理諮商者。

你的任務：根據下方使用者的命盤 JSON 資料，寫一份「像是一位看完全部命盤的老朋友，坐下來慢慢跟你聊」的深度融合解讀。

【核心手法】
1. 不要逐系統解釋。把五個系統當成同一個人的不同側寫，交叉比對後說出「同一件事」。
2. 特別注意 yearThemes（今年跨系統共振主題）——這些是多個系統同時指向的年度重點。
3. 每個論點要「落地」：不只給形容詞，要說出在工作、感情、日常決策裡的具體樣子。

【輸出結構】
🧭 一句話定義今年的你
🔥 年度主題展開（根據 yearThemes 深入分析）
📅 本月具體建議
💡 5 條可以立刻執行的行動建議
🎯 一段溫暖給力量的結語

【語氣與格式】
- 自然、溫暖、精準，像朋友聊天但有專業底氣。
- 全程繁體中文。純文字 + emoji 分段。
- 篇幅 1500~2500 字。不要免責聲明、不要客套。`;

function buildPromptJSON(results) {
  const j = {};

  const bz = results.bazi?.data;
  if (bz) {
    const p = bz.pillars || {};
    const pill = (x) => x ? `${x.stem || ''}${x.branch || ''}` : '';
    j.bazi = {
      fourPillars: [pill(p.year), pill(p.month), pill(p.day), pill(p.hour)].filter(Boolean).join(' '),
      dayMaster: bz.dayMaster,
      dayMasterElement: bz.dayMasterElem,
    };
  }

  const zw = results.ziwei?.data;
  if (zw) {
    const ming = zw.palaces?.find(p => p.pos === zw.mingPos);
    const stars = ming?.main?.map(s => (typeof s === 'string') ? s.replace(/[（(].+/, '').trim() : (s.name || '')).filter(Boolean) || [];
    j.ziwei = { mingStars: stars };
  }

  const astro = results.astro?.data;
  if (astro) {
    j.astro = { sun: astro.sunSign?.zh, moon: astro.moonSign?.zh, rising: astro.risingSign?.zh };
  }

  const maya = results.maya?.data;
  if (maya) {
    j.maya = { seal: maya.dreamspell?.seal?.zh, tone: maya.dreamspell?.tone?.num };
  }

  const hd = results.hd?.data;
  if (hd) {
    j.humanDesign = { type: hd.typeInfo?.zh, strategy: hd.strategy?.zh, authority: hd.authority?.zh, profile: hd.profile?.profile };
  }

  return j;
}

function getFullPrompt(results, yearThemes) {
  const json = buildPromptJSON(results);
  if (yearThemes) json.yearThemes = yearThemes;
  return AI_SYSTEM_PROMPT + '\n\n---\n\n以下是這位使用者的命盤資料：\n\n```json\n' + JSON.stringify(json, null, 2) + '\n```\n\n請依照上面的結構，開始寫這份解讀。';
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ============ 人生共振主題（跨系統交叉驗證）============

const LIFE_THEMES = {
  leadership:    { zh: '領導力', icon: '👑' },
  intuition:     { zh: '直覺力', icon: '🔮' },
  creativity:    { zh: '創造力', icon: '🎨' },
  communication: { zh: '溝通表達', icon: '🗣️' },
  caregiving:    { zh: '照顧滋養', icon: '🤲' },
  wealth:        { zh: '財富能量', icon: '💰' },
  independence:  { zh: '獨立自主', icon: '🦅' },
  wisdom:        { zh: '智慧深度', icon: '📚' },
  action:        { zh: '行動力', icon: '⚡' },
  emotional:     { zh: '情緒智慧', icon: '🌊' },
  transformation:{ zh: '轉化蛻變', icon: '🦋' },
  service:       { zh: '服務奉獻', icon: '🙏' },
  resilience:    { zh: '韌性毅力', icon: '💎' },
  magnetism:     { zh: '人際吸引', icon: '🧲' },
  authenticity:  { zh: '做自己', icon: '✨' },
  patience:      { zh: '等待時機', icon: '⏳' },
  strategy:      { zh: '策略思維', icon: '♟️' },
  family:        { zh: '家族責任', icon: '🏠' },
};

// 結論文案：根據主題 key 給出一句「人話翻譯」
const THEME_CONCLUSION = {
  leadership: '不管用什麼語言算，你就是有帶人的命。不一定要當老闆，但你在的地方，別人會自然看向你。',
  intuition: '你的第六感不是玄學，是你的導航系統。所有系統都在說：相信你的直覺。',
  creativity: '你需要創造才會活起來。不是「興趣」的層次，是靈魂等級的需要。',
  communication: '你的話有份量。這不是讚美，是所有系統都看到的設計。用好它。',
  caregiving: '照顧別人不是犧牲，是你本來就該做的事。你在做的時候反而最有力量。',
  wealth: '你跟錢天生有緣。不是說躺著就有錢，是你對資源的敏感度比一般人高。',
  independence: '你不需要變成別人。所有系統都在講同一句話：做你自己就夠了。',
  wisdom: '你是靠「想通了」才能前進的人。別人靠行動，你靠理解。這不是慢，是深。',
  action: '你是做了再說的人。所有系統都在催你動——想太多對你反而是阻力。',
  emotional: '你的情緒不是弱點，是你最精密的感測器。學會讀懂它而不是壓抑它。',
  transformation: '你的人生不走直線，而是一段一段地死去重生。每次蛻變後都升級。',
  service: '你透過幫助別人找到自己的意義。這不是工具人，是你的人生劇本。',
  resilience: '你越挫越勇——這不是雞湯，是你的盤寫死的。逆境是你的養分。',
  magnetism: '你天生吸引人靠近。這是設計，不是努力的結果。好好用。',
  authenticity: '不管哪個系統都在跟你說同一件事：做自己。你不需要符合任何人的期待。',
  patience: '你的設計不是主動出擊型。等待正確時機比盲目行動有效一百倍。',
  strategy: '你是佈局的人，不是衝鋒的人。先想清楚再動手，效率會好很多。',
  family: '家庭和傳承是你的重要主題。不管你喜不喜歡，這是寫在盤裡的功課。',
};

/**
 * 從各系統提取「人生主題」+ 每個系統的具體證據描述
 */
function extractLifeThemes(results) {
  const themes = []; // { theme, system, evidence }

  // === 八字 ===
  const bz = results.bazi?.data;
  if (bz) {
    const elemTraits = {
      '木': [['creativity','日主屬木——天生需要成長和創造'],['independence','木主仁、向上——獨立性強']],
      '火': [['leadership','日主屬火——天生發光、有領袖氣質'],['communication','火主禮——表達能力強']],
      '土': [['caregiving','日主屬土——包容、滋養、照顧'],['patience','土主信——穩重踏實']],
      '金': [['independence','日主屬金——果斷、自主性強'],['resilience','金主義——越鍛越強']],
      '水': [['wisdom','日主屬水——善思考、有深度'],['intuition','水主智——直覺敏銳']],
    };
    if (bz.dayMasterElem && elemTraits[bz.dayMasterElem]) {
      for (const [theme, evidence] of elemTraits[bz.dayMasterElem]) {
        themes.push({ theme, system: '八字', evidence });
      }
    }

    // 十神
    if (bz.tenGods) {
      const godThemes = {
        '食神': [['creativity','命帶食神——才華橫溢、創意源源不絕']],
        '傷官': [['creativity','命帶傷官——叛逆創新、不走尋常路'],['independence','傷官——不服管、要走自己的路']],
        '正印': [['wisdom','命帶正印——好學、有長輩緣'],['caregiving','正印——有照顧人的天性']],
        '偏印': [['intuition','命帶偏印——第六感強、思維獨特'],['independence','偏印——想法跟主流不一樣']],
        '正官': [['leadership','命帶正官——有管理能力、受人敬重']],
        '七殺': [['action','命帶七殺——行動力爆發、敢衝'],['resilience','七殺——壓力下反而更強']],
        '比肩': [['independence','命帶比肩——自主性強、不依賴人']],
        '正財': [['wealth','命帶正財——理財能力好、穩定進財']],
        '偏財': [['wealth','命帶偏財——財路廣、機會多'],['magnetism','偏財——人緣好、社交能力強']],
      };
      for (const tg of bz.tenGods) {
        if (godThemes[tg.god]) {
          for (const [theme, evidence] of godThemes[tg.god]) {
            themes.push({ theme, system: '八字', evidence });
          }
        }
      }
    }

    // 神煞
    if (bz.shensha) {
      const shMap = {
        '天乙貴人': [['magnetism','天乙貴人——天生有貴人緣']],
        '文昌': [['wisdom','文昌——讀書考試運好'],['communication','文昌——文字表達有天分']],
        '華蓋': [['intuition','華蓋——靈感強、適合研究和藝術'],['authenticity','華蓋——孤高、做自己']],
        '驛馬': [['action','驛馬——閒不住、適合動態生活']],
        '將星': [['leadership','將星——有將帥之才']],
        '天德': [['service','天德——有服務精神、積德']],
        '月德': [['caregiving','月德——心地善良、照顧人']],
      };
      for (const sh of bz.shensha) {
        if (shMap[sh.name]) {
          for (const [theme, evidence] of shMap[sh.name]) {
            themes.push({ theme, system: '八字', evidence });
          }
        }
      }
    }
  }

  // === 紫微斗數 ===
  const zw = results.ziwei?.data;
  if (zw && zw.palaces) {
    const ming = zw.palaces.find(p => p.pos === zw.mingPos);
    if (ming?.main) {
      const starThemes = {
        '紫微': [['leadership','命宮紫微——帝王星、天生有氣場']],
        '天機': [['wisdom','命宮天機——聰明善變、腦子轉很快'],['strategy','天機——善於規劃佈局']],
        '太陽': [['leadership','命宮太陽——發光發熱、喜歡照顧人'],['caregiving','太陽——照亮他人']],
        '武曲': [['wealth','命宮武曲——財星、對錢有天分'],['action','武曲——果斷執行力強']],
        '天同': [['emotional','命宮天同——感受力強、重感情'],['caregiving','天同——溫和包容']],
        '廉貞': [['action','命宮廉貞——衝勁十足、不服輸']],
        '天府': [['wealth','命宮天府——庫星、善於累積和管理']],
        '太陰': [['intuition','命宮太陰——直覺力強、內心細膩'],['creativity','太陰——有藝術天分']],
        '貪狼': [['magnetism','命宮貪狼——桃花星、人見人愛'],['creativity','貪狼——多才多藝']],
        '巨門': [['communication','命宮巨門——口才好、適合表達類工作']],
        '天相': [['service','命宮天相——印星、適合輔佐和服務']],
        '天梁': [['caregiving','命宮天梁——蔭星、天生照顧人'],['wisdom','天梁——老成持重、有智慧']],
        '七殺': [['action','命宮七殺——敢衝敢闖、開創格'],['resilience','七殺——壓力下反彈力強']],
        '破軍': [['transformation','命宮破軍——破舊立新、人生多轉折'],['independence','破軍——不走尋常路']],
      };
      for (const star of ming.main) {
        const name = (typeof star === 'string') ? star.replace(/[（(].+/, '').trim() : (star.name || '');
        if (starThemes[name]) {
          for (const [theme, evidence] of starThemes[name]) {
            themes.push({ theme, system: '紫微', evidence });
          }
        }
      }
    }
  }

  // === 西洋占星 ===
  const astro = results.astro?.data;
  if (astro) {
    const signThemes = {
      '牡羊座': [['action','主星落牡羊——行動派、衝第一'],['leadership','牡羊能量——天生的開創者']],
      '金牛座': [['patience','主星落金牛——穩定踏實'],['wealth','金牛能量——對物質有天分']],
      '雙子座': [['communication','主星落雙子——溝通達人'],['wisdom','雙子能量——資訊吸收力強']],
      '巨蟹座': [['caregiving','主星落巨蟹——照顧人是本能'],['emotional','巨蟹能量——情緒敏感度高'],['family','巨蟹——家庭是核心']],
      '獅子座': [['leadership','主星落獅子——天生的舞台主角'],['creativity','獅子能量——創造力和表現慾強']],
      '處女座': [['service','主星落處女——完美主義、樂於服務'],['strategy','處女能量——分析規劃能力強']],
      '天秤座': [['magnetism','主星落天秤——人際和諧大師'],['creativity','天秤能量——審美天分']],
      '天蠍座': [['transformation','主星落天蠍——深度轉化、死而復生'],['intuition','天蠍能量——看穿本質']],
      '射手座': [['wisdom','主星落射手——追求意義和真理'],['independence','射手能量——自由靈魂']],
      '摩羯座': [['resilience','主星落摩羯——越挫越勇'],['leadership','摩羯能量——長期經營、最終登頂']],
      '水瓶座': [['authenticity','主星落水瓶——做自己、不隨波逐流'],['independence','水瓶能量——獨立思考']],
      '雙魚座': [['intuition','主星落雙魚——直覺和靈感超強'],['emotional','雙魚能量——同理心深厚'],['creativity','雙魚——藝術和靈性天分']],
    };

    // 太陽星座（核心自我）
    if (astro.sunSign?.zh && signThemes[astro.sunSign.zh]) {
      for (const [theme, evidence] of signThemes[astro.sunSign.zh]) {
        themes.push({ theme, system: '占星', evidence: `太陽${astro.sunSign.zh} — ${evidence.split('——')[1] || evidence}` });
      }
    }
    // 月亮星座（內在需求）
    if (astro.moonSign?.zh && signThemes[astro.moonSign.zh]) {
      for (const [theme, evidence] of signThemes[astro.moonSign.zh]) {
        themes.push({ theme, system: '占星', evidence: `月亮${astro.moonSign.zh} — ${evidence.split('——')[1] || evidence}` });
      }
    }
    // 上升星座（外在形象）
    if (astro.risingSign?.zh && signThemes[astro.risingSign.zh]) {
      for (const [theme] of signThemes[astro.risingSign.zh]) {
        themes.push({ theme, system: '占星', evidence: `上升${astro.risingSign.zh}` });
      }
    }
  }

  // === 馬雅曆 ===
  const maya = results.maya?.data;
  if (maya?.dreamspell?.seal) {
    const sealThemes = {
      '紅龍': [['caregiving','紅龍——滋養、誕生、照顧']],
      '白風': [['communication','白風——溝通、靈感、傳遞訊息']],
      '藍夜': [['wealth','藍夜——豐盛、夢想、直覺'],['intuition','藍夜——夢境和潛意識']],
      '黃種子': [['patience','黃種子——耐心等待、向下扎根'],['wisdom','黃種子——開花需要時間']],
      '紅蛇': [['action','紅蛇——本能、行動力、身體智慧']],
      '白世界橋': [['transformation','白世界橋——放下、跨越、連結兩端']],
      '藍手': [['creativity','藍手——實作、療癒、把想法做出來']],
      '黃星': [['creativity','黃星——美感、藝術、和諧']],
      '紅月': [['emotional','紅月——情緒流動、淨化'],['intuition','紅月——跟著感覺走']],
      '白狗': [['caregiving','白狗——愛、忠誠、照顧'],['family','白狗——重視親密關係']],
      '藍猴': [['creativity','藍猴——玩耍、幽默、打破框架']],
      '黃人': [['independence','黃人——自由意志、做自己的選擇'],['authenticity','黃人——智慧和自主']],
      '紅天行者': [['independence','紅天行者——探索、移動、不被框住']],
      '白巫師': [['intuition','白巫師——超時空、魔法、直覺']],
      '藍鷹': [['strategy','藍鷹——全局觀、看見大圖'],['wisdom','藍鷹——高維度視角']],
      '黃戰士': [['resilience','黃戰士——無懼、質問、面對挑戰'],['action','黃戰士——勇氣和行動']],
      '紅地球': [['patience','紅地球——跟著地球節奏、導航'],['authenticity','紅地球——回到中心']],
      '白鏡': [['authenticity','白鏡——面對真相、映照自己'],['wisdom','白鏡——無盡的清澈']],
      '藍風暴': [['transformation','藍風暴——催化、蛻變、打破重來']],
      '黃太陽': [['leadership','黃太陽——照亮、開悟、無條件的光']],
    };
    const sealZh = maya.dreamspell.seal.zh;
    if (sealThemes[sealZh]) {
      for (const [theme, evidence] of sealThemes[sealZh]) {
        themes.push({ theme, system: '馬雅', evidence: `主印記${sealZh} — ${evidence.split('——')[1] || evidence}` });
      }
    }
  }

  // === 人類圖 ===
  const hd = results.hd?.data;
  if (hd) {
    // 類型
    const typeThemes = {
      'G': [['patience','生產者——等待回應再行動'],['action','薦骨動力——做對的事時能量無限']],
      'MG': [['action','顯示生產者——快速回應 + 執行力'],['independence','MG——多重興趣、不走直線']],
      'M': [['leadership','顯示者——發起者、開創者'],['independence','顯示者——不需要等待許可']],
      'P': [['wisdom','投射者——看見別人看不到的'],['patience','投射者——等待邀請'],['authenticity','投射者——被正確看見時才發揮']],
      'R': [['wisdom','反映者——感知環境的智慧'],['patience','反映者——等待月循環']],
    };
    if (hd.typeInfo?.type && typeThemes[hd.typeInfo.type]) {
      for (const [theme, evidence] of typeThemes[hd.typeInfo.type]) {
        themes.push({ theme, system: '人類圖', evidence: `${hd.typeInfo.zh} — ${evidence.split('——')[1] || evidence}` });
      }
    }

    // 通道
    if (hd.definedChannels) {
      const chThemes = {
        '抽象思維': ['wisdom','在混亂中找到意義'],
        '邏輯': ['strategy','找出規律和公式'],
        '創始者': ['leadership','帶領方向'],
        '啟發': ['creativity','活出獨特性就是貢獻'],
        '金錢線': ['wealth','掌控資源的天分'],
        '覺察': ['intuition','突然的洞見和頓悟'],
        '好奇心': ['communication','分享和探索'],
        '開放': ['emotional','情緒表達觸動人心'],
        '探索': ['authenticity','透過行動找到自己'],
        '保存': ['caregiving','負責任的照顧和保護'],
        '社群': ['service','在群體中付出和回收'],
        '魅力': ['action','即知即行的執行力'],
        '力量原型': ['intuition','身體的直覺最可靠'],
        '專注': ['resilience','持續投入的耐力'],
        '蛻變': ['transformation','為更好的未來而改變'],
        '突變': ['transformation','能量的開關切換'],
      };
      for (const ch of hd.definedChannels) {
        if (chThemes[ch.name]) {
          const [theme, desc] = chThemes[ch.name];
          themes.push({ theme, system: '人類圖', evidence: `${ch.gates[0]}-${ch.gates[1]}「${ch.name}」— ${desc}` });
        }
      }
    }

    // Profile
    if (hd.profile) {
      const pLines = hd.profile.profile; // e.g. "5/1"
      if (pLines?.includes('5')) themes.push({ theme: 'magnetism', system: '人類圖', evidence: `人生角色 ${pLines} — 5 爻自帶投射場` });
      if (pLines?.includes('1')) themes.push({ theme: 'wisdom', system: '人類圖', evidence: `人生角色 ${pLines} — 1 爻需要研究到底` });
      if (pLines?.includes('3')) themes.push({ theme: 'resilience', system: '人類圖', evidence: `人生角色 ${pLines} — 3 爻從跌倒中學習` });
      if (pLines?.includes('4')) themes.push({ theme: 'magnetism', system: '人類圖', evidence: `人生角色 ${pLines} — 4 爻人脈是一切` });
      if (pLines?.includes('6')) themes.push({ theme: 'wisdom', system: '人類圖', evidence: `人生角色 ${pLines} — 6 爻人生三階段` });
    }
  }

  return themes;
}

/**
 * 分析主題頻率，回傳按系統數排序的結果
 */
function analyzeLifeThemes(themes) {
  const map = {};
  for (const t of themes) {
    if (!map[t.theme]) map[t.theme] = { systems: {}, evidences: [] };
    if (!map[t.theme].systems[t.system]) map[t.theme].systems[t.system] = [];
    // 避免同系統重複證據
    if (!map[t.theme].systems[t.system].includes(t.evidence)) {
      map[t.theme].systems[t.system].push(t.evidence);
    }
    map[t.theme].evidences.push(t);
  }

  return Object.entries(map)
    .map(([key, val]) => {
      const systemCount = Object.keys(val.systems).length;
      const info = LIFE_THEMES[key] || { zh: key, icon: '•' };
      return { key, ...info, systemCount, systems: val.systems };
    })
    .filter(t => t.systemCount >= 3) // 只保留 3 系統以上的
    .sort((a, b) => b.systemCount - a.systemCount);
}

/**
 * 渲染「你的人生一直在說同一件事」區塊
 */
function renderLifeThemes(results) {
  const themes = extractLifeThemes(results);
  const analyzed = analyzeLifeThemes(themes);

  if (analyzed.length === 0) return '';

  let html = `<h3>✦ 你的人生一直在說同一件事</h3>`;
  html += `<div style="font-size:.8rem;color:var(--muted);margin-bottom:14px;">五個完全不同的系統，用不同的語言，卻指向同一個結論。</div>`;

  for (const t of analyzed.slice(0, 4)) {
    html += `<div style="margin-bottom:18px;padding:14px;background:rgba(123,108,246,.04);border-radius:10px;border-left:3px solid var(--accent);">`;
    html += `<div style="font-size:1rem;font-weight:700;margin-bottom:8px;">${t.icon} ${t.zh}（${t.systemCount} 系統共振）</div>`;

    // 各系統證據
    for (const [sys, evidences] of Object.entries(t.systems)) {
      const label = { '八字':'🀄', '紫微':'🌟', '占星':'🪐', '馬雅':'🌀', '人類圖':'△' }[sys] || '';
      // 只取每系統第一條最有代表性的
      html += `<div style="font-size:.82rem;padding:3px 0;color:var(--text);">${label} <b>${sys}</b>：${evidences[0]}</div>`;
    }

    // 結論
    const conclusion = THEME_CONCLUSION[t.key] || '';
    if (conclusion) {
      html += `<div style="margin-top:8px;font-size:.85rem;font-style:italic;color:var(--accent);line-height:1.6;">→ ${conclusion}</div>`;
    }

    html += `</div>`;
  }

  return html;
}

// ============ 主渲染 ============

function render(year, results) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const baziData = results.bazi?.data;
  const astroData = results.astro?.data;

  const bazi = baziTransit(year, baziData);
  const hd = hdTransit(year, results.hd?.data);
  const astro = astroTransit(year, astroData);
  const ziwei = ziweiTransit(year, results.ziwei?.data);
  const maya = mayaTransit(year, results.maya?.data);

  let html = `<div class="sig"><div class="kin">時間軸</div><div class="big">劇本大綱</div><div style="font-size:.85rem;color:var(--muted);margin-top:8px;">五大系統交叉驗證你的人生主題，再看今年、本月、今天在演什麼</div></div>`;

  // === 人生共振主題 ===
  html += `<div class="divider"></div>`;
  html += renderLifeThemes(results);

  // === 年度 ===
  html += `<div class="divider"></div>`;
  html += `<h3>📖 ${year} 年度劇情</h3>`;
  html += renderYear(year, bazi, hd, astro, ziwei, maya);

  // === 本月 ===
  html += `<div class="divider"></div>`;
  html += `<h3>📅 本月節奏</h3>`;
  html += renderMonth(year, month, baziData, astroData);

  // === 今日 ===
  html += `<div class="divider"></div>`;
  html += `<h3>✦ 今日能量</h3>`;
  html += renderToday(baziData);

  // === AI Prompt ===
  const yearThemes = extractYearThemes(bazi, hd, astro, ziwei, maya)
    .reduce((acc, t) => { acc[t.theme] = (acc[t.theme] || []).concat(t.source); return acc; }, {});
  const fullPrompt = getFullPrompt(results, yearThemes);

  html += `<div class="divider"></div>`;
  html += `<div class="script-section" style="border-left-color:#4ecdc4;">`;
  html += `<div class="script-title">🤖 想要更深的解讀？</div>`;
  html += `<div class="script-body">`;
  html += `<p style="font-size:.85rem;color:var(--muted);margin-bottom:8px;">下面這顆按鈕把你的命盤 + 流年資料打包成 Prompt，複製後貼到任何 AI 就能得到深度解讀。</p>`;
  html += `<button id="btn-ai-copy" type="button" style="width:100%;padding:12px 16px;background:var(--accent);color:var(--btn-text,#000);border:none;border-radius:8px;font-weight:700;font-size:.9rem;cursor:pointer;">📋 複製完整解讀 Prompt</button>`;
  html += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">`;
  html += `<a href="https://chatgpt.com/" target="_blank" rel="noopener" class="ai-launch-link">開 ChatGPT ↗</a>`;
  html += `<a href="https://gemini.google.com/app" target="_blank" rel="noopener" class="ai-launch-link">開 Gemini ↗</a>`;
  html += `<a href="https://claude.ai/new" target="_blank" rel="noopener" class="ai-launch-link">開 Claude ↗</a>`;
  html += `</div>`;
  html += `<details style="margin-top:12px;"><summary style="font-size:.78rem;color:var(--muted);cursor:pointer;">預覽 Prompt</summary>`;
  html += `<textarea id="ai-prompt-text" readonly style="width:100%;height:140px;margin-top:8px;padding:10px;font-size:.75rem;line-height:1.5;border-radius:8px;border:1px solid var(--card-border);background:var(--chip-bg,rgba(0,0,0,.15));color:var(--text);resize:vertical;">${escapeHtml(fullPrompt)}</textarea>`;
  html += `</details></div></div>`;

  html += `<div class="note" style="margin-top:16px;">💡 流年是「暫時的天氣」，本命是你的硬體。天氣會影響體驗，但不會改變你是誰。各 tab 看你的本命設計，這裡看「現在在演什麼戲」。</div>`;

  return html;
}

// ============ 主入口 ============

let _cachedResults = null;
let _cachedYear = null;

export function calculate(results, targetYear) {
  try {
    const year = targetYear || new Date().getFullYear();
    _cachedResults = results;
    _cachedYear = year;
    const html = render(year, results);
    return { status: 'ok', html, error: null };
  } catch (err) {
    return { status: 'error', html: `<div class="placeholder">劇本大綱錯誤：${err.message}</div>`, error: err.message };
  }
}

export function recalculate(year) {
  if (!_cachedResults) return null;
  return calculate(_cachedResults, year);
}

export function attachYearSwitcher() {
  const btns = document.querySelectorAll('.transit-year-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const year = parseInt(btn.dataset.year);
      const result = recalculate(year);
      if (result?.status === 'ok') {
        const el = document.getElementById('view-synthesis');
        if (el) el.innerHTML = result.html;
        attachYearSwitcher();
      }
    });
  });
}
