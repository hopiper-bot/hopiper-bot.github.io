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
  const ad = mayaData.annualDream;
  const ds = mayaData.dreamspell;
  if (!ad) return null;
  
  // 從 kin 算出 seal/tone 名稱
  const SEALS_ZH = ['紅龍','白風','藍夜','黃種子','紅蛇','白世界橋','藍手','黃星星','紅月','白狗','藍猴','黃人','紅天行者','白巫師','藍鷹','黃戰士','紅地球','白鏡','藍風暴','黃太陽'];
  const TONES_ZH = ['磁性','月亮','電力','自我存在','超頻','韻律','共振','銀河星系','太陽','行星','光譜','水晶','宇宙'];
  
  function kinToName(kin) {
    if (!kin) return null;
    const sealIdx = (kin - 1) % 20;
    const toneIdx = (kin - 1) % 13;
    return { seal: SEALS_ZH[sealIdx], tone: TONES_ZH[toneIdx], kin };
  }
  
  return { 
    yearInfo: kinToName(ad.yearKin), 
    personalInfo: kinToName(ad.personalKin), 
    galacticYear: ad.galacticYear,
    natalSeal: ds?.seal
  };
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
      html += `<div style="margin-top:10px;font-size:.82rem;"><b>今年重要相位：</b></div>`;
      for (const a of astro.aspects.slice(0, 5)) {
        const emoji = a.type === '合' ? '☌' : a.type === '對沖' ? '☍' : a.type === '三合' ? '△' : '□';
        const aspDesc = a.type === '合' ? '能量融合加強' : a.type === '對沖' ? '拉扯但帶來覺察' : a.type === '三合' ? '順流支持' : '摩擦但推動成長';
        html += `<div style="font-size:.82rem;padding:3px 0;color:var(--text);">${emoji} 流年${a.transit} ${a.type} 本命${a.natal} <span style="color:var(--muted);">— ${aspDesc}</span></div>`;
      }
    }
  }

  // 人類圖流年
  if (hd) {
    html += `<div class="divider"></div><h3>△ 人類圖流年（行星通道）</h3>`;
    html += `<div style="font-size:.82rem;color:var(--muted);margin-bottom:8px;">慢行星今年停留的閘門——這些能量整年都在背景運作</div>`;
    if (hd.transitGates.length > 0) {
      for (const tg of hd.transitGates) {
        const gInfo = GATES[tg.gate] || {};
        html += `<div style="font-size:.82rem;padding:3px 0;">${tg.planet} → 閘門 <b>${tg.gate}</b>「${gInfo.keyword||''}」</div>`;
      }
    }
    if (hd.tempChannels.length > 0) {
      html += `<div style="margin-top:10px;padding:12px;background:rgba(245,197,66,.08);border-radius:8px;"><div style="font-weight:700;color:#f5c542;margin-bottom:6px;">⚡ 今年臨時啟動的通道</div>`;
      html += `<div style="font-size:.82rem;color:var(--muted);margin-bottom:8px;">流年行星補上你本命的另一端 = 今年會額外感受到的能量（平常沒有，今年暫時打開）</div>`;
      const chDescMap = { '好奇心':'今年會更想分享想法、學新東西、到處問為什麼', '金錢線':'今年跟「掌握資源」有關——控制感加強，可能在金錢或權力上有變化', '魅力':'今年行動力和存在感爆發，別人更容易注意到你', '腦波':'今年直覺和表達連結加強——腦中一閃的念頭更值得信任', '啟發':'今年有「創意角色典範」的能量——你做的事會啟發別人', '力量原型':'今年直覺配合行動力，「感覺對就做」的效率極高', '蛻變':'今年有轉型的能量——舊的結束、新的開始', '無常':'今年體驗慾望強——想到什麼就想去做，渴望多樣化', '探索':'今年適合嘗試新行為、新身份——做以前不會做的事', '社群':'今年社群和團體互動增加——注意你在群體中的角色', '抽象思維':'今年思緒特別多，從混亂中找到意義是主題', '覺察':'今年內在洞察力加強——會有「啊哈！」的頓悟時刻' };
      for (const tc of hd.tempChannels) {
        const desc = chDescMap[tc.channel.name] || `「${tc.channel.keyword||tc.channel.name}」的能量今年暫時開通`;
        html += `<div style="font-size:.85rem;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);"><b>${tc.planet}</b> 開通 ${tc.channel.gates[0]}-${tc.channel.gates[1]}「${tc.channel.name}」<br><span style="font-size:.8rem;color:var(--muted);">${desc}</span></div>`;
      }
      html += `</div>`;
    } else {
      html += `<div style="font-size:.82rem;color:var(--muted);margin-top:8px;">今年沒有慢行星為你臨時開通新通道。能量穩定運行，照著你本命的設計走就好。</div>`;
    }
  }

  // 紫微流年
  if (ziwei) {
    html += `<div class="divider"></div><h3>🌟 紫微流年</h3>`;
    html += `<div style="font-size:.82rem;color:var(--muted);margin-bottom:8px;">流年四化 = 今年的能量分配，化祿是順風、化忌是功課</div>`;
    html += `<div style="display:flex;gap:12px;align-items:center;margin:8px 0;">`;
    html += `<div style="text-align:center;padding:8px 16px;background:rgba(123,108,246,.1);border-radius:8px;"><div style="font-size:1rem;font-weight:700;">${ziwei.yearStem}${ziwei.yearBranch}年</div></div>`;
    html += `<div style="font-size:.85rem;">化祿<b>${ziwei.sihua.lu}</b>、化權<b>${ziwei.sihua.quan}</b>、化科<b>${ziwei.sihua.ke}</b>、化忌<b>${ziwei.sihua.ji}</b></div>`;
    html += `</div>`;
    // 四化落宮 + 白話解說
    const huaDesc = { lu:'今年最順的領域，能量加持', quan:'今年掌控感最強的地方', ke:'今年有貴人/名聲的方向', ji:'今年最容易卡住的地方（也是成長點）' };
    const huaIcon = { lu:'🟢', quan:'🔵', ke:'🟡', ji:'🔴' };
    for (const key of ['lu','quan','ke','ji']) {
      const p = ziwei.sihuaPalaces[key];
      if (p) {
        const palaceName = PALACE_NAMES[p.pos] || `${p.pos}宮`;
        html += `<div style="font-size:.85rem;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.03);">${huaIcon[key]} <b>${ziwei.sihua[key]}</b>化${key==='lu'?'祿':key==='quan'?'權':key==='ke'?'科':'忌'} → <b>${palaceName}</b><br><span style="font-size:.8rem;color:var(--muted);">${huaDesc[key]}</span></div>`;
      }
    }
  }

  // 馬雅流年
  if (maya) {
    html += `<div class="divider"></div><h3>🌀 馬雅年度能量</h3>`;
    if (maya.yearInfo) {
      const yi = maya.yearInfo;
      const pi = maya.personalInfo;
      html += `<div style="margin:8px 0;">`;
      html += `<div style="font-size:.9rem;font-weight:600;">當前馬雅年（${maya.galacticYear || ''}）= <span style="color:var(--accent);">${yi.tone}的${yi.seal}</span>（KIN ${yi.kin}）</div>`;
      html += `<div style="font-size:.82rem;color:var(--muted);margin-top:6px;">集體共享的年度能量主題：今年整個世界都在「${yi.seal}」的頻率中運作。</div>`;
      if (pi) {
        html += `<div style="margin-top:10px;font-size:.9rem;font-weight:600;">你今年生日的 KIN = <span style="color:var(--accent);">${pi.tone}的${pi.seal}</span>（KIN ${pi.kin}）</div>`;
        html += `<div style="font-size:.82rem;color:var(--muted);margin-top:4px;">你這一年的個人能量色彩：${pi.seal}的品質 + ${pi.tone}的行動方式。</div>`;
      }
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
    const seal = maya.personalInfo?.seal || maya.natalSeal?.zh;
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
  
  // 建議（結合具體數據）
  html += `<div style="margin-top:14px;padding:14px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.88rem;line-height:2;">`;
  html += `<b>💡 ${year} 年操作建議：</b><br>`;
  html += generateSpecificAdvice(bazi, hd, astro, ziwei, sorted);
  html += `</div>`;
  
  return html;
}

function generateSpecificAdvice(bazi, hd, astro, ziwei, sorted) {
  let adv = '';
  
  // 財運具體建議
  if (sorted.some(t => t.key === 'money')) {
    let moneyDetails = [];
    if (bazi && ['正財','偏財'].includes(bazi.god)) {
      moneyDetails.push(bazi.god === '偏財' ? '八字走偏財——意外收入、投資、業績爆發型的財' : '八字走正財——穩定加薪、經營累積型的財');
    }
    if (hd?.tempChannels?.some(tc => ['金錢線','脈動','投降','蛻變'].includes(tc.channel.name))) {
      const mCh = hd.tempChannels.find(tc => ['金錢線','脈動','投降','蛻變'].includes(tc.channel.name));
      moneyDetails.push(`人類圖${mCh.planet}開通「${mCh.channel.name}」——${mCh.channel.name === '金錢線' ? '掌控資源的能量被啟動' : '財富轉化的能量在運作'}`);
    }
    if (astro && astro.jupHouse === 2) moneyDetails.push('木星過境 2 宮（財帛）——擴展收入的機會之窗');
    if (ziwei?.sihuaPalaces?.lu?.pos === 4) moneyDetails.push('紫微化祿落財帛宮——今年財運被宇宙加持');
    if (moneyDetails.length > 0) {
      adv += `<div style="margin-bottom:10px;">💰 <b>財運：</b>${moneyDetails.join('；')}。<br><span style="color:var(--muted);font-size:.82rem;">→ 結論：今年跟錢有關不是你想太多，是真的有訊號。${bazi?.god === '偏財' ? '適合把握意外機會，但不要梭哈。' : '穩紮穩打就好，急不來。'}</span></div>`;
    }
  }
  
  // 事業具體建議
  if (sorted.some(t => t.key === 'career')) {
    let careerDetails = [];
    if (bazi && ['正官','七殺'].includes(bazi.god)) {
      careerDetails.push(bazi.god === '正官' ? '八字走正官——升遷、被認可、體制內加分' : '八字走七殺——壓力型成長，適合創業或轉換跑道');
    }
    if (astro && astro.jupHouse === 10) careerDetails.push('木星過境 10 宮（事業）——今年是事業擴展的黃金年');
    if (astro && astro.satHouse === 10) careerDetails.push('土星過境 10 宮——事業上有硬仗要打，但撐過去就升級');
    if (ziwei?.sihuaPalaces?.quan) {
      const qp = PALACE_NAMES[ziwei.sihuaPalaces.quan.pos] || '';
      if (qp === '事業') careerDetails.push('紫微化權落事業宮——今年在職場的掌控感增強');
      else if (qp === '命宮') careerDetails.push('紫微化權落命宮——今年整個人的氣場和主導力加強');
    }
    if (careerDetails.length > 0) {
      adv += `<div style="margin-bottom:10px;">📈 <b>事業：</b>${careerDetails.join('；')}。<br><span style="color:var(--muted);font-size:.82rem;">→ 結論：今年在工作上會有明確的推進。${bazi?.god === '七殺' ? '壓力大但回報也大，適合做大決定。' : '順水推舟，把握升遷機會。'}</span></div>`;
    }
  }
  
  // 壓力/挑戰具體建議
  if (sorted.some(t => t.key === 'pressure')) {
    let pressureDetails = [];
    if (bazi && ['七殺','正官'].includes(bazi.god)) pressureDetails.push(`八字走${bazi.god}——${bazi.god === '七殺' ? '外在環境施壓，逼你突破' : '責任加重，被要求扛更多'}`);
    if (astro) {
      if (astro.satHouse) pressureDetails.push(`土星在你的 ${astro.satHouse} 宮（${HOUSE_TOPICS[astro.satHouse]||''}）——這個領域今年要「交作業」`);
    }
    if (ziwei?.sihuaPalaces?.ji) {
      const jp = PALACE_NAMES[ziwei.sihuaPalaces.ji.pos] || '';
      pressureDetails.push(`化忌落${jp}——今年在「${jp}」容易卡關或過度執著`);
    }
    if (pressureDetails.length > 0) {
      adv += `<div style="margin-bottom:10px;">🏋️ <b>壓力點：</b>${pressureDetails.join('；')}。<br><span style="color:var(--muted);font-size:.82rem;">→ 這不是壞事——壓力是升級的前奏。重點是：不要硬撐，用你本命的權威判斷哪些壓力值得接、哪些該放。</span></div>`;
    }
  }
  
  // 變動具體建議
  if (sorted.some(t => t.key === 'change')) {
    let changeDetails = [];
    if (bazi && ['傷官','七殺','劫財'].includes(bazi.god)) changeDetails.push(`八字走${bazi.god}——內在有「不想再這樣下去」的躁動`);
    if (hd?.tempChannels?.length > 2) changeDetails.push(`人類圖今年開了 ${hd.tempChannels.length} 條臨時通道——大量新能量湧入，變化是必然的`);
    if (changeDetails.length > 0) {
      adv += `<div style="margin-bottom:10px;">🔄 <b>變動：</b>${changeDetails.join('；')}。<br><span style="color:var(--muted);font-size:.82rem;">→ 今年適合轉型，但不要亂轉。等到「感覺對了」再動，不要因為焦慮而隨便跳。</span></div>`;
    }
  }
  
  // 關係具體建議
  if (sorted.some(t => t.key === 'relationship')) {
    let relDetails = [];
    if (astro && (astro.jupHouse === 7 || astro.satHouse === 7)) {
      relDetails.push(astro.jupHouse === 7 ? '木星過境 7 宮——合作和親密關係擴展' : '土星過境 7 宮——關係中被要求更認真、更負責');
    }
    if (ziwei?.sihuaPalaces?.lu?.pos === 2) relDetails.push('化祿落夫妻宮——感情運加分');
    if (relDetails.length > 0) {
      adv += `<div style="margin-bottom:10px;">💕 <b>關係：</b>${relDetails.join('；')}。</div>`;
    }
  }
  
  // 如果什麼都沒觸發，給個通用但不廢的建議
  if (adv === '') {
    adv = `今年的能量分散在多個面向，沒有壓倒性的單一主題。保持你本命的策略（等待回應/告知後行動/等待邀請），見機行事就好。不需要主動追什麼，該來的會來。`;
  }
  
  return adv;
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
