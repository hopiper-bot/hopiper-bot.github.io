/**
 * transit.js — 流年分析引擎
 * 整合五大系統的年度預測：
 * 1. 馬雅：今年的 Kin 能量
 * 2. 人類圖：行星過境啟動的臨時通道
 * 3. 西洋占星：行星過境 vs 本命相位
 * 4. 八字：流年天干地支 vs 命局
 * 5. 紫微：流年宮位 + 流年四化
 */

import { julianDay, sunLongitude, moonLongitude, northNodeLongitude } from '../lib/ephemeris.js';
import { mercuryGeoLon, venusGeoLon, marsGeoLon, jupiterGeoLon, saturnGeoLon, uranusGeoLon, neptuneGeoLon, plutoGeoLon } from '../lib/planets.js';
import { normalizeDeg, jdToJC, dateTimeToJD } from '../lib/utils.js';
import { longitudeToGate, GATES } from '../data/hd-gates.js';
import { findDefinedChannels, CHANNELS } from '../data/hd-channels.js';

// === 常量 ===
const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const STEM_ELEMENT = {"甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水"};
const BRANCH_ELEMENT = {"子":"水","丑":"土","寅":"木","卯":"木","辰":"土","巳":"火","午":"火","未":"土","申":"金","酉":"金","戌":"土","亥":"水"};

const STEM_YINYANG = {"甲":"陽","乙":"陰","丙":"陽","丁":"陰","戊":"陽","己":"陰","庚":"陽","辛":"陰","壬":"陽","癸":"陰"};
const WUXING_SHENG = {"木":"火","火":"土","土":"金","金":"水","水":"木"};
const WUXING_KE = {"木":"土","土":"水","水":"火","火":"金","金":"木"};

// 十神
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

// 流年天干地支
function getYearStemBranch(year) {
  const sIdx = (year - 4) % 10;
  const bIdx = (year - 4) % 12;
  return { stem: STEMS[sIdx], branch: BRANCHES[bIdx], stemIdx: sIdx, branchIdx: bIdx };
}

// === 1. 八字流年 ===
function baziTransit(year, baziData) {
  if (!baziData) return null;
  const yy = getYearStemBranch(year);
  const dayMaster = baziData.dayMaster;
  const god = getTenGod(dayMaster, yy.stem);
  const yearElem = STEM_ELEMENT[yy.stem];
  const dayElem = baziData.dayMasterElem;
  
  // 生剋關係
  let relation = '';
  if (yearElem === dayElem) relation = '比和（平穩）';
  else if (WUXING_SHENG[dayElem] === yearElem) relation = '我生（付出、耗洩）';
  else if (WUXING_SHENG[yearElem] === dayElem) relation = '生我（得助、資源）';
  else if (WUXING_KE[dayElem] === yearElem) relation = '我剋（求財、掌控）';
  else if (WUXING_KE[yearElem] === dayElem) relation = '剋我（壓力、挑戰）';

  // 十神解讀
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

  // 大運位置
  let dayunInfo = '';
  if (baziData.dayun) {
    const currentDayun = baziData.dayun.find(d => year >= d.yearStart && year <= d.yearEnd);
    if (currentDayun) {
      dayunInfo = `大運「${currentDayun.stem}${currentDayun.branch}」（${currentDayun.god}運）`;
    }
  }

  return { stem: yy.stem, branch: yy.branch, god, relation, godDesc: godDesc[god]||'', dayunInfo, yearElem };
}

// === 2. 人類圖 Transit ===
function hdTransit(year, hdData) {
  if (!hdData) return null;
  // 計算今年 1/1 正午的行星位置（粗估年度能量）
  const jd = dateTimeToJD(year, 7, 1, 12, 0, 0); // 年中取樣
  const transitPlanets = [
    { id: 'sun', fn: sunLongitude },
    { id: 'jupiter', fn: jupiterGeoLon },
    { id: 'saturn', fn: saturnGeoLon },
    { id: 'uranus', fn: uranusGeoLon },
    { id: 'neptune', fn: neptuneGeoLon },
    { id: 'pluto', fn: plutoGeoLon },
  ];
  
  // 取慢行星（木土天海冥）的閘門——它們今年大部分時間都在那
  const transitGates = [];
  const planetNames = { jupiter:'木星', saturn:'土星', uranus:'天王星', neptune:'海王星', pluto:'冥王星' };
  for (const p of transitPlanets) {
    if (p.id === 'sun') continue; // 太陽每月換，不算年度
    const lon = p.fn(jd);
    const { gate, line } = longitudeToGate(lon);
    transitGates.push({ planet: planetNames[p.id], gate, line });
  }
  
  // 本命啟動的閘門
  const natalGates = new Set();
  if (hdData.personalityPlanets) hdData.personalityPlanets.forEach(p => natalGates.add(p.gate));
  if (hdData.designPlanets) hdData.designPlanets.forEach(p => natalGates.add(p.gate));
  
  // 找流年行星可能跟本命形成的臨時通道
  const tempChannels = [];
  for (const tp of transitGates) {
    // 找包含此閘門的通道
    for (const ch of CHANNELS) {
      const otherGate = ch.gates[0] === tp.gate ? ch.gates[1] : ch.gates[1] === tp.gate ? ch.gates[0] : null;
      if (otherGate && natalGates.has(otherGate)) {
        // 本命有另一端，流年行星補上這一端 = 臨時通道
        const alreadyDefined = hdData.definedChannels?.some(dc => dc.gates.includes(tp.gate) && dc.gates.includes(otherGate));
        if (!alreadyDefined) {
          tempChannels.push({ planet: tp.planet, channel: ch, transitGate: tp.gate, natalGate: otherGate });
        }
      }
    }
  }
  
  return { transitGates, tempChannels };
}

// === 3. 西洋占星 Transit ===
function astroTransit(year, astroData) {
  if (!astroData) return null;
  const jd = dateTimeToJD(year, 7, 1, 12, 0, 0);
  const SIGNS_ZH = ['牡羊座','金牛座','雙子座','巨蟹座','獅子座','處女座','天秤座','天蠍座','射手座','摩羯座','水瓶座','雙魚座'];
  
  // 慢行星今年位置
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
  
  // vs 本命行星的相位
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
  
  // 木星落宮（幸運領域）
  const natalAscLon = astroData.ascendant?.longitude || 0;
  const jupLon = transitPositions.find(p => p.id === 'jupiter')?.lon || 0;
  const jupHouse = Math.floor(normalizeDeg(jupLon - natalAscLon) / 30) + 1;
  
  // 土星落宮（功課領域）
  const satLon = transitPositions.find(p => p.id === 'saturn')?.lon || 0;
  const satHouse = Math.floor(normalizeDeg(satLon - natalAscLon) / 30) + 1;

  return { transitPositions, aspects, jupHouse, satHouse };
}

// === 4. 紫微流年 ===
function ziweiTransit(year, ziweiData) {
  if (!ziweiData) return null;
  // 流年命宮位置 = 流年地支決定
  const yb = (year - 4) % 12;
  // 流年命宮 = 寅起正月，逆推
  // 簡化：流年地支決定流年走到哪個宮位
  const liunianPos = (14 - yb) % 12; // 流年命宮
  
  // 流年四化（由流年天干決定）
  const ys = (year - 4) % 10;
  const SIHUA_TABLE = [
    ['廉貞','破軍','武曲','太陽'], // 甲
    ['天機','天梁','紫微','太陰'], // 乙
    ['天同','天機','文昌','廉貞'], // 丙
    ['太陰','天同','天機','巨門'], // 丁
    ['貪狼','太陰','右弼','天機'], // 戊
    ['武曲','貪狼','天梁','文曲'], // 己
    ['太陽','武曲','太陰','天同'], // 庚
    ['巨門','太陽','文曲','文昌'], // 辛
    ['天梁','紫微','左輔','武曲'], // 壬
    ['破軍','巨門','太陰','貪狼'], // 癸
  ];
  const sh = SIHUA_TABLE[ys];
  const sihua = { lu: sh[0], quan: sh[1], ke: sh[2], ji: sh[3] };
  
  // 找流年四化落在本命哪個宮
  let sihuaPalaces = {};
  if (ziweiData.palaces) {
    for (const key of ['lu','quan','ke','ji']) {
      const starName = sihua[key];
      for (const p of ziweiData.palaces) {
        const found = p.main?.some(s => (typeof s === 'string' ? s : s.name) === starName);
        if (found) {
          sihuaPalaces[key] = p;
          break;
        }
      }
    }
  }
  
  return { liunianPos, sihua, sihuaPalaces, yearStem: STEMS[ys], yearBranch: BRANCHES[yb] };
}

// === 5. 馬雅流年 ===
function mayaTransit(year, mayaData) {
  if (!mayaData) return null;
  // annualDream = { yearKin, personalKin, galacticYear }
  // 需要從 kin 解出 seal/tone
  const ad = mayaData.annualDream;
  const ds = mayaData.dreamspell; // 本命的 dreamspell 有完整的 seal/tone
  if (!ad) return null;
  return { yearKin: ad.yearKin, personalKin: ad.personalKin, galacticYear: ad.galacticYear, natalSeal: ds?.seal, natalTone: ds?.tone };
}

// === 渲染 ===
const PALACE_NAMES = ['命宮','兄弟','夫妻','子女','財帛','疾厄','遷移','交友','事業','田宅','福德','父母'];
const HOUSE_TOPICS = ['','自我/外表','金錢/資源','溝通/學習','家庭/根基','創造/戀愛','工作/健康','關係/合作','深層/共享','信念/遠方','事業/名聲','社群/理想','靈性/幕後'];

function renderTransit(year, bazi, hd, astro, ziwei, maya) {
  let html = `<div class="sig"><div class="kin">流年分析</div><div class="big">${year} 年度能量</div><div style="font-size:.85rem;color:var(--muted);margin-top:8px;">五大系統看你今年的運勢主題</div></div>`;

  // 八字流年
  if (bazi) {
    html += `<div class="divider"></div><h3>🀄 八字流年</h3>`;
    html += `<div style="display:flex;gap:12px;align-items:center;margin:8px 0;">`;
    html += `<div style="text-align:center;padding:8px 16px;background:rgba(123,108,246,.1);border-radius:8px;"><div style="font-size:1.2rem;font-weight:700;">${bazi.stem}${bazi.branch}</div><div style="font-size:.75rem;color:var(--muted);">${bazi.yearElem}年</div></div>`;
    html += `<div><div style="font-size:.9rem;font-weight:600;color:var(--accent);">流年十神：${bazi.god}</div>`;
    html += `<div style="font-size:.8rem;color:var(--muted);">${bazi.relation}</div>`;
    if (bazi.dayunInfo) html += `<div style="font-size:.78rem;color:var(--muted);margin-top:2px;">目前${bazi.dayunInfo}</div>`;
    html += `</div></div>`;
    html += `<div class="meaning" style="line-height:1.9;">${bazi.godDesc}</div>`;
  }

  // 占星流年
  if (astro) {
    html += `<div class="divider"></div><h3>🪐 占星流年（行星過境）</h3>`;
    html += `<div style="font-size:.82rem;color:var(--muted);margin-bottom:8px;">慢行星今年的位置 vs 你的本命盤</div>`;
    // 木星（幸運）
    html += `<div class="script-gift"><b>♃ 木星過境 ${astro.jupHouse} 宮</b>（${HOUSE_TOPICS[astro.jupHouse]||''}）<br>木星帶來擴展和機會的領域。今年在這個生活領域你會感覺「門打開了」。</div>`;
    // 土星（功課）
    html += `<div class="script-gift"><b>♄ 土星過境 ${astro.satHouse} 宮</b>（${HOUSE_TOPICS[astro.satHouse]||''}）<br>土星帶來責任和考驗的領域。今年在這裡會被要求「認真面對」。撐過去就是成長。</div>`;
    // 重要相位
    if (astro.aspects.length > 0) {
      html += `<div style="margin-top:8px;font-size:.82rem;"><b>今年重要相位：</b></div>`;
      for (const a of astro.aspects.slice(0, 5)) {
        const emoji = a.type === '合' ? '☌' : a.type === '對沖' ? '☍' : a.type === '三合' ? '△' : '□';
        html += `<div style="font-size:.82rem;padding:2px 0;color:var(--text);">${emoji} 流年${a.transit} ${a.type} 本命${a.natal}（容許度 ${a.exact}°）</div>`;
      }
    }
  }

  // 人類圖流年
  if (hd) {
    html += `<div class="divider"></div><h3>△ 人類圖流年（行星通道）</h3>`;
    if (hd.transitGates.length > 0) {
      html += `<div style="font-size:.82rem;color:var(--muted);margin-bottom:8px;">慢行星今年啟動的閘門</div>`;
      for (const tg of hd.transitGates) {
        const gInfo = GATES[tg.gate] || {};
        html += `<div style="font-size:.82rem;padding:2px 0;">${tg.planet} → 閘門 <b>${tg.gate}</b>（${gInfo.keyword||''}）${tg.line}爻</div>`;
      }
    }
    if (hd.tempChannels.length > 0) {
      html += `<div style="margin-top:10px;padding:10px;background:rgba(245,197,66,.08);border-radius:8px;"><div style="font-weight:700;color:#f5c542;margin-bottom:6px;">⚡ 今年臨時啟動的通道</div>`;
      html += `<div style="font-size:.82rem;color:var(--muted);margin-bottom:6px;">流年行星補上你本命的另一端 = 今年會額外感受到的能量</div>`;
      for (const tc of hd.tempChannels) {
        html += `<div style="font-size:.85rem;padding:4px 0;"><b>${tc.planet}</b> 啟動 ${tc.channel.gates[0]}-${tc.channel.gates[1]}「${tc.channel.name}」通道</div>`;
      }
      html += `</div>`;
    } else {
      html += `<div style="font-size:.82rem;color:var(--muted);">今年沒有慢行星為你臨時開通新通道。能量穩定運行中。</div>`;
    }
  }

  // 紫微流年
  if (ziwei) {
    html += `<div class="divider"></div><h3>🌟 紫微流年</h3>`;
    html += `<div style="display:flex;gap:12px;align-items:center;margin:8px 0;">`;
    html += `<div style="text-align:center;padding:8px 16px;background:rgba(123,108,246,.1);border-radius:8px;"><div style="font-size:1rem;font-weight:700;">${ziwei.yearStem}${ziwei.yearBranch}年</div></div>`;
    html += `<div style="font-size:.85rem;">流年四化：化祿<b>${ziwei.sihua.lu}</b>、化權<b>${ziwei.sihua.quan}</b>、化科<b>${ziwei.sihua.ke}</b>、化忌<b>${ziwei.sihua.ji}</b></div>`;
    html += `</div>`;
    // 四化落宮
    const huaNames = { lu:'化祿（財運/順利）', quan:'化權（掌控/升遷）', ke:'化科（名聲/貴人）', ji:'化忌（執著/卡關）' };
    for (const key of ['lu','quan','ke','ji']) {
      const p = ziwei.sihuaPalaces[key];
      if (p) {
        const palaceName = PALACE_NAMES[p.pos] || `${p.pos}宮`;
        const color = key === 'ji' ? 'var(--red)' : 'var(--accent)';
        html += `<div style="font-size:.85rem;padding:3px 0;"><span style="color:${color};font-weight:600;">${ziwei.sihua[key]}${huaNames[key].split('（')[0]}</span> 落入 <b>${palaceName}</b>（${huaNames[key].split('（')[1]||''}）</div>`;
      }
    }
  }

  // 馬雅流年
  if (maya) {
    html += `<div class="divider"></div><h3>🌀 馬雅年度能量</h3>`;
    if (maya.yearKin) {
      html += `<div style="margin:8px 0;">`;
      html += `<div style="font-size:.9rem;font-weight:600;">銀河年度 Kin：${maya.yearKin}</div>`;
      if (maya.galacticYear) html += `<div style="font-size:.82rem;color:var(--muted);margin-top:4px;">銀河年：${maya.galacticYear}</div>`;
      if (maya.personalKin) html += `<div style="font-size:.82rem;color:var(--muted);margin-top:2px;">你的今年個人 Kin：${maya.personalKin}</div>`;
      html += `</div>`;
    }
  }

  // === 流年綜合交叉比對 ===
  html += `<div class="divider"></div>`;
  html += renderTransitSynthesis(year, bazi, hd, astro, ziwei, maya);

  html += `<div class="note" style="margin-top:16px;">💡 流年是「暫時的天氣」，不是永久的改變。本命是你的硬體，流年是當年的軟體更新——它會影響你的體驗，但不會改變你是誰。</div>`;
  return html;
}

// === 流年綜合交叉比對 ===
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
  
  // 八字
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
  
  // 占星
  if (astro) {
    const houseTheme = { 1:'health', 2:'money', 3:'growth', 4:'relationship', 5:'creativity', 6:'health', 7:'relationship', 8:'change', 9:'spiritual', 10:'career', 11:'relationship', 12:'spiritual' };
    if (houseTheme[astro.jupHouse]) themes.push({ theme: houseTheme[astro.jupHouse], source: '占星木星' }, { theme: 'lucky', source: '占星木星' });
    if (houseTheme[astro.satHouse]) themes.push({ theme: houseTheme[astro.satHouse], source: '占星土星' }, { theme: 'pressure', source: '占星土星' });
  }
  
  // 人類圖
  if (hd && hd.tempChannels.length > 0) {
    themes.push({ theme: 'change', source: '人類圖' });
    for (const tc of hd.tempChannels) {
      if (['金錢線','脈動','投降','蛻變'].includes(tc.channel.name)) themes.push({ theme: 'money', source: '人類圖' });
      if (['創始者','發起'].includes(tc.channel.name)) themes.push({ theme: 'career', source: '人類圖' });
      if (['啟發','無常','好奇心'].includes(tc.channel.name)) themes.push({ theme: 'creativity', source: '人類圖' });
    }
  }
  
  // 紫微
  if (ziwei) {
    const palaceTheme = { 0:'health', 1:'relationship', 2:'relationship', 3:'relationship', 4:'money', 5:'health', 6:'change', 7:'relationship', 8:'career', 9:'money', 10:'spiritual', 11:'relationship' };
    if (ziwei.sihuaPalaces.lu) themes.push({ theme: palaceTheme[ziwei.sihuaPalaces.lu.pos] || 'lucky', source: '紫微化祿' }, { theme: 'lucky', source: '紫微化祿' });
    if (ziwei.sihuaPalaces.ji) themes.push({ theme: palaceTheme[ziwei.sihuaPalaces.ji.pos] || 'pressure', source: '紫微化忌' }, { theme: 'pressure', source: '紫微化忌' });
    if (ziwei.sihuaPalaces.quan) themes.push({ theme: 'career', source: '紫微化權' });
  }
  
  // 馬雅
  if (maya && maya.natalSeal) {
    const sealTheme = { '紅龍':'relationship', '白風':'creativity', '藍夜':'money', '黃種子':'growth', '紅蛇':'change', '白世界橋':'change', '藍手':'creativity', '黃星星':'creativity', '紅月':'spiritual', '白狗':'relationship', '藍猴':'creativity', '黃人':'growth', '紅天行者':'change', '白巫師':'spiritual', '藍鷹':'career', '黃戰士':'career', '紅地球':'health', '白鏡':'spiritual', '藍風暴':'change', '黃太陽':'lucky' };
    const seal = maya.natalSeal?.zh;
    if (seal && sealTheme[seal]) themes.push({ theme: sealTheme[seal], source: '馬雅' });
  }
  
  return themes;
}

function renderTransitSynthesis(year, bazi, hd, astro, ziwei, maya) {
  const themes = extractYearThemes(bazi, hd, astro, ziwei, maya);
  
  // 統計
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
  
  if (sorted.length === 0) return `<h3>🔮 流年綜合</h3><div class="meaning">各系統今年的訊號分散，沒有壓倒性的單一主題。保持開放、見機行事。</div>`;
  
  let html = `<h3>🔮 ${year} 流年綜合：多系統共振</h3>`;
  html += `<div style="font-size:.78rem;color:var(--muted);margin-bottom:10px;">當多個系統同時指向同一個方向——那就是今年的重點</div>`;
  
  // 今年一句話
  const top3 = sorted.slice(0, 3).map(t => t.zh);
  html += `<div style="padding:12px;background:rgba(245,197,66,.08);border-radius:8px;margin-bottom:12px;font-size:.95rem;font-weight:600;line-height:1.8;">`;
  html += `⚡ 今年的關鍵字：${top3.join('、')}`;
  html += `</div>`;
  
  // 各主題
  for (const t of sorted.slice(0, 4)) {
    const barW = Math.min(t.systemCount * 25, 100);
    html += `<div style="display:flex;align-items:center;gap:8px;margin:6px 0;">`;
    html += `<span style="width:70px;font-size:.82rem;white-space:nowrap;">${t.icon} ${t.zh}</span>`;
    html += `<div style="flex:1;height:16px;background:rgba(255,255,255,.05);border-radius:8px;overflow:hidden;">`;
    html += `<div style="width:${barW}%;height:100%;background:linear-gradient(90deg,var(--accent),#f5c542);border-radius:8px;display:flex;align-items:center;padding-left:6px;">`;
    html += `<span style="font-size:.68rem;color:#000;font-weight:700;">${t.systemCount}系統</span>`;
    html += `</div></div>`;
    html += `<span style="font-size:.7rem;color:var(--muted);">${t.sources.join('/')}</span>`;
    html += `</div>`;
  }
  
  // 建議
  html += `<div style="margin-top:14px;padding:12px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.88rem;line-height:1.9;">`;
  html += `<b>💡 今年的操作建議：</b><br>`;
  if (stats.money?.sources.length >= 2) html += `• 財運有訊號——${stats.money.sources.join('和')}都提示今年跟錢有關。主動出擊或被動等待取決於你的本命策略。<br>`;
  if (stats.pressure?.sources.length >= 2) html += `• 壓力也有訊號——但壓力不是壞事，是宇宙在逼你升級。用你本命的權威來決定要不要接受挑戰。<br>`;
  if (stats.change?.sources.length >= 2) html += `• 變動能量強——今年適合轉型、改變、打破現狀。不要抗拒改變，順著走。<br>`;
  if (stats.career?.sources.length >= 2) html += `• 事業重點年——今年在工作上會有明顯的推進或轉折。把握機會。<br>`;
  if (stats.relationship?.sources.length >= 2) html += `• 關係年——今年人際互動頻繁，注意經營重要關係。<br>`;
  if (stats.creativity?.sources.length >= 2) html += `• 創造力爆發年——適合開始新專案、學新東西、表達自己。<br>`;
  if (stats.spiritual?.sources.length >= 2) html += `• 靈性成長年——今年適合內在修煉、學習命理玄學、探索生命意義。<br>`;
  if (stats.lucky?.sources.length >= 2) html += `• 幸運訊號強——今年有貴人和機會，保持開放接收。<br>`;
  html += `</div>`;
  
  return html;
}

// === 主入口 ===
export function calculate(results, targetYear) {
  try {
    const year = targetYear || new Date().getFullYear();
    
    const bazi = baziTransit(year, results.bazi?.data);
    const hd = hdTransit(year, results.hd?.data);
    const astro = astroTransit(year, results.astro?.data);
    const ziwei = ziweiTransit(year, results.ziwei?.data);
    const maya = mayaTransit(year, results.maya?.data);
    
    const html = renderTransit(year, bazi, hd, astro, ziwei, maya);
    return { status: 'ok', html, error: null };
  } catch (err) {
    return { status: 'error', html: `<div class="placeholder">流年分析錯誤：${err.message}</div>`, error: err.message };
  }
}
