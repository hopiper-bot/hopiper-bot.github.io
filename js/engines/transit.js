/**
 * transit.js — 流年分析引擎
 * 整合五大系統的年度預測：
 * 1. 馬雅：今年的 Kin 能量
 * 2. 人類圖：行星過境啟動的臨時通道
 * 3. 西洋占星：行星過境 vs 本命相位
 * 4. 八字：流年天干地支 vs 命局
 * 5. 紫微：流年宮位 + 流年四化
 */

import { dateTimeToJD, jdToJC, sunLongitude, moonLongitude, northNodeLongitude } from '../lib/ephemeris.js';
import { mercuryGeoLon, venusGeoLon, marsGeoLon, jupiterGeoLon, saturnGeoLon, uranusGeoLon, neptuneGeoLon, plutoGeoLon } from '../lib/planets.js';
import { normalizeDeg } from '../lib/utils.js';
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
  // 取今年的 Dreamspell 年度 Kin（7/26 為馬雅新年）
  // 簡化：用 mayaData 裡已有的 annualDream
  return { annualDream: mayaData.annualDream, annualGmt: mayaData.annualGmt };
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
  if (maya && maya.annualDream) {
    html += `<div class="divider"></div><h3>🌀 馬雅年度能量</h3>`;
    const ad = maya.annualDream;
    if (ad.seal && ad.tone) {
      html += `<div style="margin:8px 0;">`;
      html += `<div style="font-size:.9rem;font-weight:600;">今年的 Kin：${ad.tone.zh}的${ad.seal.zh}</div>`;
      html += `<div style="font-size:.82rem;color:var(--muted);margin-top:4px;">調性 ${ad.tone.num}（${ad.tone.kw}）× ${ad.seal.zh}（${ad.seal.kw}）</div>`;
      html += `</div>`;
    }
  }

  html += `<div class="note" style="margin-top:16px;">💡 流年是「暫時的天氣」，不是永久的改變。本命是你的硬體，流年是當年的軟體更新——它會影響你的體驗，但不會改變你是誰。</div>`;
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
