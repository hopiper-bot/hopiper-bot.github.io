/**
 * human-design.js — 人類圖引擎
 * 
 * 計算：
 * 1. Personality（意識面）— 出生時間的行星位置
 * 2. Design（潛意識面）— 出生前太陽退行 88° 時的行星位置
 * 3. 啟動的閘門 → 定義的通道 → 定義的能量中心
 * 4. 類型（Type）、策略（Strategy）、內在權威（Authority）
 * 5. 人生角色（Profile）、輪迴交叉（Incarnation Cross）
 */

import { julianDay, sunLongitude } from '../lib/ephemeris.js';
import {
  mercuryGeoLon, venusGeoLon, marsGeoLon,
  jupiterGeoLon, saturnGeoLon,
  uranusGeoLon, neptuneGeoLon, plutoGeoLon
} from '../lib/planets.js';
import { moonLongitude, northNodeLongitude } from '../lib/ephemeris.js';
import { normalizeDeg } from '../lib/utils.js';
import { longitudeToGate, GATES, LINE_NAMES } from '../data/hd-gates.js';
import { findDefinedChannels, CHANNELS } from '../data/hd-channels.js';
import { CENTERS, getDefinedCenters, getDefinitionType } from '../data/hd-centers.js';
import { getPlanetGateDesc } from '../data/hd-text.js';

/** 用於計算的行星列表 */
const PLANETS = [
  { id: 'sun', zh: '太陽', fn: sunLongitude },
  { id: 'earth', zh: '地球', fn: (jd) => normalizeDeg(sunLongitude(jd) + 180) },
  { id: 'moon', zh: '月亮', fn: moonLongitude },
  { id: 'northNode', zh: '北交點', fn: northNodeLongitude },
  { id: 'southNode', zh: '南交點', fn: (jd) => normalizeDeg(northNodeLongitude(jd) + 180) },
  { id: 'mercury', zh: '水星', fn: mercuryGeoLon },
  { id: 'venus', zh: '金星', fn: venusGeoLon },
  { id: 'mars', zh: '火星', fn: marsGeoLon },
  { id: 'jupiter', zh: '木星', fn: jupiterGeoLon },
  { id: 'saturn', zh: '土星', fn: saturnGeoLon },
  { id: 'uranus', zh: '天王星', fn: uranusGeoLon },
  { id: 'neptune', zh: '海王星', fn: neptuneGeoLon },
  { id: 'pluto', zh: '冥王星', fn: plutoGeoLon },
];

/**
 * 找到 Design 時間點（太陽在出生位置前 88° 的 JD）
 * 用二分搜尋法往回找
 */
function findDesignJD(birthJD) {
  const birthSunLon = sunLongitude(birthJD);
  const targetLon = normalizeDeg(birthSunLon - 88);

  // 太陽每天約移動 0.9856°，88° 約 89 天前
  let jdEstimate = birthJD - 88 / 0.9856;
  
  // 用 Newton-Raphson 精確定位
  for (let i = 0; i < 20; i++) {
    const currentLon = sunLongitude(jdEstimate);
    let diff = targetLon - currentLon;
    // 處理 360° 邊界
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    if (Math.abs(diff) < 0.001) break;
    jdEstimate += diff / 0.9856; // 每天約 0.9856°
  }

  return jdEstimate;
}

/**
 * 計算指定 JD 時所有行星的閘門位置
 */
function calcPlanetGates(jd) {
  return PLANETS.map(p => {
    const lon = p.fn(jd);
    const { gate, line } = longitudeToGate(lon);
    return { ...p, longitude: lon, gate, line };
  });
}

/**
 * 決定類型（Type）
 */
function determineType(definedCenters, definedChannels) {
  const hasSacral = definedCenters.has('sacral');
  const hasThroat = definedCenters.has('throat');
  
  // 檢查 Motor 中心是否直接連接到喉嚨
  const motorCenters = ['sacral', 'heart', 'solar', 'root'];
  const motorToThroat = definedChannels.some(ch => {
    const hasMotor = motorCenters.some(m => ch.centers.includes(m));
    const hasThroatConn = ch.centers.includes('throat');
    return hasMotor && hasThroatConn;
  });

  // 需要檢查 motor 是否有「通路」連到 throat（不只直接連接）
  const throatConnected = isMotorConnectedToThroat(definedChannels, motorCenters);

  if (hasSacral && throatConnected) {
    return { type: 'MG', zh: '顯示生產者', en: 'Manifesting Generator' };
  }
  if (hasSacral && !throatConnected) {
    return { type: 'G', zh: '生產者', en: 'Generator' };
  }
  if (!hasSacral && throatConnected) {
    return { type: 'M', zh: '顯示者', en: 'Manifestor' };
  }
  if (!hasSacral && !throatConnected && definedCenters.size > 0) {
    return { type: 'P', zh: '投射者', en: 'Projector' };
  }
  return { type: 'R', zh: '反映者', en: 'Reflector' };
}

/**
 * 檢查 motor center 是否有路徑連到 throat
 */
function isMotorConnectedToThroat(definedChannels, motorCenters) {
  // 建立鄰接表
  const adj = {};
  for (const ch of definedChannels) {
    const [c1, c2] = ch.centers;
    if (!adj[c1]) adj[c1] = new Set();
    if (!adj[c2]) adj[c2] = new Set();
    adj[c1].add(c2);
    adj[c2].add(c1);
  }

  // 從 throat BFS 看能否到達任何 motor center
  if (!adj['throat']) return false;
  const visited = new Set();
  const queue = ['throat'];
  while (queue.length > 0) {
    const node = queue.shift();
    if (visited.has(node)) continue;
    visited.add(node);
    if (motorCenters.includes(node)) return true;
    for (const neighbor of (adj[node] || [])) {
      if (!visited.has(neighbor)) queue.push(neighbor);
    }
  }
  return false;
}

/**
 * 決定策略（Strategy）
 */
function determineStrategy(typeInfo) {
  const strategies = {
    'MG': { zh: '等待回應', en: 'Wait to Respond', desc: '跟生產者一樣等待回應，但你的回應來了之後可以直接行動，不需要按部就班。你是「等紅綠燈但一亮綠就油門到底」的人。' },
    'G':  { zh: '等待回應', en: 'Wait to Respond', desc: '不要主動發起，讓生活來問你。薦骨會用「嗯哼」或「嗯嗯」回應你 — 有感覺就去，沒感覺就不要勉強。' },
    'M':  { zh: '告知後行動', en: 'Inform then Act', desc: '你天生有發起的能量，但記得先告知相關的人你要做什麼。這不是「請求許可」而是「讓人有心理準備」，這樣阻力會小很多。' },
    'P':  { zh: '等待邀請', en: 'Wait for Invitation', desc: '在重要的人生決定上等待被邀請（工作、感情、居住）。你看得見別人的天賦，但只有被邀請時你的洞見才會被接受。' },
    'R':  { zh: '等待月循環', en: 'Wait a Lunar Cycle', desc: '你的設計是去「品嚐」環境和人。重大決定等一個月亮週期（28天），讓你充分感受所有面向後再決定。' },
  };
  return strategies[typeInfo.type] || strategies['G'];
}

/**
 * 決定內在權威（Authority）
 */
function determineAuthority(definedCenters, typeInfo) {
  // 反映者沒有內在權威
  if (typeInfo.type === 'R') {
    return { zh: '月循環權威', en: 'Lunar Authority', desc: '你沒有固定的內在權威，透過月亮週期來感受決定。給自己 28 天來重大決定。' };
  }
  
  // 情緒權威（情緒中心定義）— 最高優先
  if (definedCenters.has('solar')) {
    return { zh: '情緒權威', en: 'Emotional Authority', desc: '你的情緒有波動是正常的。不在高峰做決定、不在低谷做決定。等情緒平靜後，清晰自然浮現。「沒有情緒清明這回事，只有等待的智慧。」' };
  }
  
  // 薦骨權威（薦骨定義 + 無情緒）
  if (definedCenters.has('sacral')) {
    return { zh: '薦骨權威', en: 'Sacral Authority', desc: '你的身體會告訴你答案。「嗯哼」= yes、「嗯嗯」= no。練習用身體的即時回應做決定，不要用腦袋分析蓋過它。' };
  }
  
  // 直覺權威（脾中心定義）
  if (definedCenters.has('spleen')) {
    return { zh: '直覺權威', en: 'Splenic Authority', desc: '你有即時的直覺判斷。第一感覺通常是對的，它只說一次、不重複。信任那個突然冒出來的「就是這樣」。' };
  }
  
  // 意志力權威（心臟定義 + 連接喉嚨）
  if (definedCenters.has('heart')) {
    return { zh: '自我投射權威', en: 'Ego Authority', desc: '「我要」或「我不要」— 你的意志力就是最好的指引。不需要理由，想做就去做。' };
  }
  
  // G 中心權威（自我投射）
  if (definedCenters.has('g')) {
    return { zh: '自我投射權威', en: 'Self-Projected Authority', desc: '用說的方式找到答案。跟信任的人聊聊，聽自己說出來的話。你的真相在你的聲音裡。' };
  }

  // 環境權威（心智投射者）
  return { zh: '環境權威', en: 'Mental/Environment Authority', desc: '你的決策智慧在於感知環境。找對的環境和對的人討論，答案會從外在環境反映出來。' };
}

/**
 * 決定人生角色（Profile）
 * 由太陽 Personality 的爻 + 太陽 Design 的爻 組合
 */
function determineProfile(personalitySunLine, designSunLine) {
  const profiles = {
    '1/3': { zh: '探究烈士', desc: '你需要深入研究（1）然後透過試錯來學習（3）。你是實驗者，失敗是你最好的老師。' },
    '1/4': { zh: '探究機會主義者', desc: '你需要扎實的基礎（1），透過人脈網絡來發揮（4）。先研究透，再靠人際關係推進。' },
    '2/4': { zh: '隱士機會主義者', desc: '你有天生的天賦但不自知（2），透過朋友圈被召喚出來（4）。等人敲門，不用主動推銷。' },
    '2/5': { zh: '隱士異端者', desc: '你有天賦（2），而且別人對你有投射和期待（5）。小心名過於實，確保你真的能交付。' },
    '3/5': { zh: '烈士異端者', desc: '你透過不斷的試錯累積智慧（3），別人期待你是解決問題的人（5）。你的人生經驗是你最大的資產。' },
    '3/6': { zh: '烈士典範', desc: '前 30 年不斷試錯（3），30-50 歲在屋頂觀察，50 歲後成為有智慧的典範（6）。前半生的混亂是有意義的。' },
    '4/6': { zh: '機會主義者典範', desc: '你透過人際網絡發展（4），人生後半段成為有權威的典範（6）。人脈是你的命脈。' },
    '4/1': { zh: '機會主義者探究者', desc: '你透過人際關係推進（4），潛意識裡需要紮實的基礎（1）。你的影響力在於你既有深度又有人脈。' },
    '5/1': { zh: '異端者探究者', desc: '別人期待你解決問題（5），你確實有扎實的研究做後盾（1）。你是「有料的」問題解決者。' },
    '5/2': { zh: '異端者隱士', desc: '外界投射期待在你身上（5），你有天生才華（2）。別太在意外在評價，做好自己擅長的就夠了。' },
    '6/2': { zh: '典範隱士', desc: '你是人生後半段的智慧權威（6），加上天生的隱士才華（2）。50 歲後是你真正發光的時候。' },
    '6/3': { zh: '典範烈士', desc: '你追求人生典範（6），但透過不斷嘗試和碰撞學習（3）。你的智慧來自親身經歷。' },
  };

  const key = `${personalitySunLine}/${designSunLine}`;
  return {
    profile: key,
    ...(profiles[key] || { zh: `${LINE_NAMES[personalitySunLine]}/${LINE_NAMES[designSunLine]}`, desc: '獨特的人生角色組合。' }),
  };
}

/**
 * 決定輪迴交叉（Incarnation Cross）— 簡化版
 * 由 Personality Sun Gate + Earth Gate + Design Sun Gate + Earth Gate 組成
 */
function determineIncarnationCross(pSun, pEarth, dSun, dEarth) {
  // 輪迴交叉的完整資料庫有 768 種，這裡只提供基本框架
  const angle = getAngleType(pSun.line, dSun.line);
  return {
    gates: [pSun.gate, pEarth.gate, dSun.gate, dEarth.gate],
    angle,
    desc: `你的輪迴交叉是「${GATES[pSun.gate]?.keyword || ''}」的${angle}。這代表你此生的大方向和目的。Personality 太陽閘門 ${pSun.gate}（${GATES[pSun.gate]?.name || ''}）是你最核心的人生主題。`,
  };
}

function getAngleType(pLine, dLine) {
  // 輪迴交叉角度由 Profile（P Sun line / D Sun line）決定
  // Profile 1/3, 1/4, 2/4, 2/5, 3/5, 3/6 → 右角度（Right Angle）—— 個人命運
  // Profile 4/6, 4/1 → 並列（Juxtaposition）—— 固定命運
  // Profile 5/1, 5/2, 6/2, 6/3 → 左角度（Left Angle）—— 超個人命運
  if (pLine <= 3) return '右角度（個人命運）';
  if (pLine === 4) return '並列（固定命運）';
  return '左角度（超個人命運）';
}

/**
 * 主計算函式
 */
export function calculate(birthData) {
  const { year, month, day, hour, minute, lat, lng, utcOffset } = birthData;

  try {
    // 1. 計算出生時間的 JD（Personality）
    const personalityJD = julianDay(year, month, day, hour, minute, utcOffset);
    
    // 2. 找到 Design 時間點（太陽前 88°）
    const designJD = findDesignJD(personalityJD);
    
    // 3. 計算兩組行星位置
    const personalityPlanets = calcPlanetGates(personalityJD);
    const designPlanets = calcPlanetGates(designJD);
    
    // 4. 收集所有啟動的閘門
    const allGates = [];
    const pGates = personalityPlanets.map(p => p.gate);
    const dGates = designPlanets.map(p => p.gate);
    allGates.push(...pGates, ...dGates);
    
    // 5. 找出定義的通道
    const definedChannels = findDefinedChannels([...new Set(allGates)]);
    
    // 6. 找出定義的中心
    const definedCenters = getDefinedCenters(definedChannels);
    
    // 7. 計算定義類型（單一/二分/三分）
    const defType = getDefinitionType(definedChannels);
    
    // 8. 決定 Type, Strategy, Authority
    const typeInfo = determineType(definedCenters, definedChannels);
    const strategy = determineStrategy(typeInfo);
    const authority = determineAuthority(definedCenters, typeInfo);
    
    // 9. Profile（人生角色）
    const pSun = personalityPlanets[0]; // personality sun
    const dSun = designPlanets[0]; // design sun
    const profileInfo = determineProfile(pSun.line, dSun.line);
    
    // 10. 輪迴交叉
    const pEarth = personalityPlanets[1]; // personality earth
    const dEarth = designPlanets[1]; // design earth
    const cross = determineIncarnationCross(pSun, pEarth, dSun, dEarth);

    const data = {
      personalityPlanets,
      designPlanets,
      definedChannels,
      definedCenters: [...definedCenters],
      openCenters: Object.keys(CENTERS).filter(c => !definedCenters.has(c)),
      definitionType: defType,
      typeInfo,
      strategy,
      authority,
      profile: profileInfo,
      cross,
    };

    const html = renderHD(data);
    
    // 存到 window 供點擊事件使用
    if (typeof window !== 'undefined') {
      const defTypeZh = ['無定義', '單一定義', '二分定義', '三分定義', '四分定義'][defType] || '';
      window._hdData = data;
      window._hdAllChannels = CHANNELS;
      window._hdChannelDesc = getChannelDesc;
      window._hdCenterDesc = getCenterDetail;
      window._hdInfoDesc = {
        strategy: `<div style="padding:14px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.85rem;line-height:1.9;"><div style="font-size:1rem;font-weight:700;color:var(--accent);">🎯 策略：${strategy.zh}</div><div style="margin-top:6px;">${strategy.desc}</div></div>`,
        authority: `<div style="padding:14px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.85rem;line-height:1.9;"><div style="font-size:1rem;font-weight:700;color:var(--accent);">🧭 內在權威：${authority.zh}</div><div style="margin-top:6px;">${authority.desc}</div></div>`,
        profile: `<div style="padding:14px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.85rem;line-height:1.9;"><div style="font-size:1rem;font-weight:700;color:var(--accent);">🎭 人生角色：${profileInfo.profile} ${profileInfo.zh}</div><div style="margin-top:6px;">${profileInfo.desc}</div></div>`,
        definition: `<div style="padding:14px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.85rem;line-height:1.9;"><div style="font-size:1rem;font-weight:700;color:var(--accent);">🔗 定義：${defTypeZh}</div><div style="margin-top:6px;">${defType === 1 ? '你的所有定義中心都互相連接，能量流暢。你不需要別人來「橋接」你的能量。你是自給自足的。' : defType === 2 ? '你的定義分成兩塊，有時會覺得自己「內在有兩個人」。你會被能橋接這兩塊的人吸引。' : defType === 3 ? '你的定義分成三塊。你需要多元的環境和人際來感覺完整。公共場所是你的充電站。' : defType === 0 ? '你沒有固定定義，完全反映環境。你是最稀有的類型（約 1%），你的天賦是品嚐和感知。' : '你的定義形態獨特。'}</div></div>`,
        notself: `<div style="padding:14px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.85rem;line-height:1.9;"><div style="font-size:1rem;font-weight:700;color:var(--red);">⚠️ 非自己主題</div><div style="margin-top:6px;">${typeInfo.type === 'G' || typeInfo.type === 'MG' ? '挫敗感——當你主動發起而不是等待回應時，事情不順利就會感到挫敗。這是你偏離軌道的信號。回到等待回應，挫敗感會消失。' : typeInfo.type === 'M' ? '憤怒——當你行動前沒有告知，或被人阻擋時會生氣。這是信號：你需要先告知再行動。' : typeInfo.type === 'P' ? '苦澀——當你主動出擊而不是等待邀請時，成果不被認可就會感到苦澀。等待正確的邀請。' : '失望——當你太快做決定，沒有等完月循環，結果不如預期就會失望。'}</div></div>`,
      };
    }

    return { status: 'ok', data, html, error: null };
  } catch (err) {
    return { status: 'error', data: null, html: '', error: `人類圖計算錯誤：${err.message}` };
  }
}

// ===== 渲染 =====

function renderHD(data) {
  const { typeInfo, strategy, authority, profile, cross,
    definedChannels, definedCenters, openCenters, definitionType,
    personalityPlanets, designPlanets } = data;

  const defTypeZh = ['無定義', '單一定義', '二分定義', '三分定義', '四分定義'][definitionType] || '';
  const typeColor = { M: '#e0556b', G: '#f5c542', MG: '#f5c542', P: '#5a86e0', R: '#a99fd6' };

  return `
    <div class="sig">
      <div class="kin">人類圖 Human Design</div>
      <div class="big" style="color:${typeColor[typeInfo.type] || 'var(--accent)'}">
        ${typeInfo.zh}
      </div>
      <div style="font-size:.9rem;color:var(--muted);margin-top:4px;">${typeInfo.en}</div>
      <div style="display:flex;justify-content:center;gap:8px;margin-top:12px;flex-wrap:wrap;">
        <span class="tag tag-yellow" data-hd-info="profile" style="cursor:pointer;">${profile.profile} ${profile.zh}</span>
        <span class="tag tag-blue" data-hd-info="authority" style="cursor:pointer;">${authority.zh}</span>
        <span class="tag tag-white" data-hd-info="definition" style="cursor:pointer;">${defTypeZh}</span>
      </div>
      <div style="display:flex;justify-content:center;gap:12px;margin-top:8px;font-size:.82rem;color:var(--muted);">
        <span data-hd-info="strategy" style="cursor:pointer;">策略：${strategy.zh}</span><span>｜</span><span data-hd-info="notself" style="cursor:pointer;">非自己：${typeInfo.type === 'G' || typeInfo.type === 'MG' ? '挫敗感' : typeInfo.type === 'M' ? '憤怒' : typeInfo.type === 'P' ? '苦澀' : '失望'}</span>
      </div>
    </div>

    <div id="hd-detail" style="margin:12px 0;"></div>

    ${renderBodyGraph(data)}

    <div class="divider"></div>
    ${renderPlanetTable(personalityPlanets, designPlanets)}

    <div class="divider"></div>
    ${renderCross(cross)}

    <div class="note">💡 點擊圖上的中心或通道線查看解說。人類圖整合了易經、卡巴拉、印度脈輪、天文學。Design = 出生前太陽退行 88° 的位置。</div>
  `;
}

/** 渲染 Body Graph（大型互動式 SVG） */
function renderBodyGraph(data) {
  const { definedCenters, definedChannels, personalityPlanets, designPlanets } = data;
  const defSet = new Set(definedCenters);
  
  // 收集各閘門的啟動來源
  const gateActivation = {}; // gate -> 'personality' | 'design' | 'both'
  personalityPlanets.forEach(p => {
    gateActivation[p.gate] = 'personality';
  });
  designPlanets.forEach(p => {
    if (gateActivation[p.gate]) gateActivation[p.gate] = 'both';
    else gateActivation[p.gate] = 'design';
  });

  // Center 位置 (SVG 座標 — 更大的畫布)
  // 參考標準 Body Graph 佈局
  const centerPos = {
    head:   { x: 250, y: 50 },
    ajna:   { x: 250, y: 130 },
    throat: { x: 250, y: 220 },
    g:      { x: 250, y: 330 },
    heart:  { x: 345, y: 275 },
    solar:  { x: 345, y: 420 },
    sacral: { x: 250, y: 460 },
    spleen: { x: 140, y: 420 },
    root:   { x: 250, y: 560 },
  };

  // 通道連線 — 畫所有 36 條通道
  // 同一對中心之間有多條通道要偏移避免重疊
  const centerPairCount = {};
  const centerPairIdx = {};
  CHANNELS.forEach((ch) => {
    const key = [ch.centers[0], ch.centers[1]].sort().join('-');
    centerPairCount[key] = (centerPairCount[key] || 0) + 1;
  });

  const channelLines = CHANNELS.map((ch, idx) => {
    const p1 = centerPos[ch.centers[0]];
    const p2 = centerPos[ch.centers[1]];
    if (!p1 || !p2) return '';
    const g1 = ch.gates[0], g2 = ch.gates[1];
    const a1 = gateActivation[g1] || '';
    const a2 = gateActivation[g2] || '';
    const bothActive = a1 && a2;
    const oneActive = (a1 && !a2) || (!a1 && a2);
    
    // 同中心對偏移
    const key = [ch.centers[0], ch.centers[1]].sort().join('-');
    if (!centerPairIdx[key]) centerPairIdx[key] = 0;
    const pairTotal = centerPairCount[key];
    const pairI = centerPairIdx[key]++;
    const offsetPx = pairTotal > 1 ? (pairI - (pairTotal - 1) / 2) * 8 : 0;
    
    // 計算偏移方向（垂直於通道線）
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len * offsetPx, ny = dx / len * offsetPx;
    const x1 = p1.x + nx, y1 = p1.y + ny;
    const x2 = p2.x + nx, y2 = p2.y + ny;

    let color, width;
    if (bothActive) {
      width = 5;
      if (a1 === 'design' && a2 === 'design') color = '#e0556b';
      else if (a1 === 'personality' && a2 === 'personality') color = 'var(--text)';
      else color = 'url(#hdStripe)';
    } else if (oneActive) {
      width = 3;
      const active = a1 || a2;
      if (active === 'design') color = 'rgba(224,85,107,0.6)';
      else if (active === 'personality') color = 'rgba(236,231,255,0.5)';
      else color = 'rgba(245,197,66,0.5)';
    } else {
      width = 1;
      color = 'rgba(169,159,214,0.12)';
    }

    // 只有完整通道可點擊
    const clickAttr = bothActive ? `data-hd-channel="${idx}"` : '';
    const cursor = bothActive ? 'style="cursor:pointer;"' : '';
    const hitArea = bothActive ? `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="24" data-hd-channel="${idx}" style="cursor:pointer;"/>` : '';
    
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" ${clickAttr} ${cursor}/>
      ${hitArea}`;
  }).join('');

  // Center 圖形（可點擊）
  const centerShapes = Object.entries(centerPos).map(([id, pos]) => {
    const isDefined = defSet.has(id);
    // 定義的 = 實色填滿，未定義的 = 透明空心
    const fill = isDefined ? getCenterColor(id) : 'none';
    const stroke = isDefined ? getCenterStroke(id) : 'rgba(169,159,214,0.4)';
    const opacity = isDefined ? '1' : '0.5';
    const centerInfo = CENTERS[id];
    const label = centerInfo ? centerInfo.zh.replace('中心', '').replace('（', '').replace('）', '').split('/')[0] : id;
    
    // 列出此中心被啟動的閘門
    const centerGates = centerInfo ? centerInfo.gates : [];
    const activeGatesHere = centerGates.filter(g => gateActivation[g]);
    const gateLabels = activeGatesHere.map(g => {
      const act = gateActivation[g];
      const color = act === 'personality' ? 'var(--text)' : act === 'design' ? '#e0556b' : 'var(--accent)';
      return `<tspan fill="${color}">${g}</tspan>`;
    }).join(' ');

    const size = 36;
    let shape = '';
    if (id === 'head') {
      const pts = `${pos.x},${pos.y - size} ${pos.x - size},${pos.y + size} ${pos.x + size},${pos.y + size}`;
      shape = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="2.5" opacity="${opacity}" data-hd-center="${id}" style="cursor:pointer;"/>`;
    } else if (id === 'ajna') {
      const pts = `${pos.x - size},${pos.y - size} ${pos.x + size},${pos.y - size} ${pos.x},${pos.y + size}`;
      shape = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="2.5" opacity="${opacity}" data-hd-center="${id}" style="cursor:pointer;"/>`;
    } else if (id === 'throat' || id === 'g') {
      shape = `<rect x="${pos.x - size}" y="${pos.y - size}" width="${size * 2}" height="${size * 2}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="2.5" opacity="${opacity}" data-hd-center="${id}" style="cursor:pointer;"/>`;
    } else if (id === 'heart') {
      const s = 30;
      const pts = `${pos.x},${pos.y - s} ${pos.x - s},${pos.y + s} ${pos.x + s},${pos.y + s}`;
      shape = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="2.5" opacity="${opacity}" data-hd-center="${id}" style="cursor:pointer;"/>`;
    } else {
      shape = `<rect x="${pos.x - size}" y="${pos.y - size}" width="${size * 2}" height="${size * 2}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="2.5" opacity="${opacity}" data-hd-center="${id}" style="cursor:pointer;"/>`;
    }

    return `${shape}
      <text x="${pos.x}" y="${pos.y - 2}" text-anchor="middle" fill="var(--text)" font-size="10" font-weight="700" pointer-events="none">${label}</text>
      <text x="${pos.x}" y="${pos.y + 14}" text-anchor="middle" font-size="9" pointer-events="none">${gateLabels}</text>`;
  }).join('');

  return `
    <div style="text-align:center;margin:8px 0;">
      <svg viewBox="0 0 500 620" width="100%" style="max-width:600px;">
        <defs>
          <pattern id="hdStripe" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--text)" stroke-width="3"/>
            <line x1="3" y1="0" x2="3" y2="6" stroke="#e0556b" stroke-width="3"/>
          </pattern>
        </defs>
        ${channelLines}
        ${centerShapes}
      </svg>
      <div style="display:flex;justify-content:center;gap:14px;margin-top:6px;font-size:.75rem;color:var(--muted);">
        <span>⬛ 意識（黑）</span><span style="color:#e0556b;">🟥 潛意識（紅）</span><span style="color:var(--accent);">🟨 兩者</span>
      </div>
      <p style="font-size:.78rem;color:var(--muted);margin:6px 0 0;">💡 點擊中心或通道線查看解說</p>
    </div>
  `;
}

function getCenterColor(centerId) {
  // 定義時的實色填滿
  const colors = {
    head: '#f5c542',
    ajna: '#5ac85a',
    throat: '#8b7355',
    g: '#f5c542',
    heart: '#e0556b',
    solar: '#8b6b3a',
    sacral: '#e05555',
    spleen: '#8b6b3a',
    root: '#8b6b3a',
  };
  return colors[centerId] || '#7b6cf6';
}

function getCenterStroke(centerId) {
  const colors = {
    head: '#d4a420',
    ajna: '#3da03d',
    throat: '#6e5a42',
    g: '#d4a420',
    heart: '#c03050',
    solar: '#6e5530',
    sacral: '#c03030',
    spleen: '#6e5530',
    root: '#6e5530',
  };
  return colors[centerId] || '#5a4cc6';
}

/** 渲染通道區塊 */
function renderChannels(definedChannels, pPlanets, dPlanets) {
  if (definedChannels.length === 0) {
    return `<h3>🔗 定義的通道</h3><p class="meaning" style="color:var(--muted);">無定義通道 — 你是反映者，完全開放的設計。你的天賦是品嘗和反映環境。</p>`;
  }

  const rows = definedChannels.map(ch => {
    const g1Info = GATES[ch.gates[0]] || {};
    const g2Info = GATES[ch.gates[1]] || {};
    return `
      <div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);">
        <div style="font-weight:700;color:var(--accent);">
          ${ch.gates[0]}-${ch.gates[1]}：${ch.name}
        </div>
        <div style="font-size:.85rem;color:var(--text);margin-top:4px;">
          ${g1Info.keyword || ''} ↔ ${g2Info.keyword || ''}
        </div>
        <div style="font-size:.82rem;color:var(--muted);margin-top:2px;">
          ${ch.keyword}
        </div>
      </div>`;
  }).join('');

  return `
    <h3>🔗 定義的通道（${definedChannels.length} 條）</h3>
    ${rows}
  `;
}

/** 渲染能量中心區塊 */
function renderCenters(definedCentersList, openCenters) {
  let html = '<h3>⚡ 能量中心</h3>';
  
  if (definedCentersList.length > 0) {
    html += '<div style="margin-bottom:12px;"><b style="color:var(--accent);">定義的中心</b>（固定的能量）</div>';
    definedCentersList.forEach(cId => {
      const c = CENTERS[cId];
      if (!c) return;
      html += `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04);">
        <div style="font-weight:600;color:var(--accent2);">${c.zh}</div>
        <div style="font-size:.85rem;color:var(--text);margin-top:2px;">${c.defined}</div>
      </div>`;
    });
  }

  if (openCenters.length > 0) {
    html += '<div style="margin:16px 0 12px;"><b style="color:var(--muted);">開放的中心</b>（接收放大的能量 — 你的智慧學校）</div>';
    openCenters.forEach(cId => {
      const c = CENTERS[cId];
      if (!c) return;
      html += `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04);">
        <div style="font-weight:600;color:var(--muted);">${c.zh}</div>
        <div style="font-size:.85rem;color:var(--text);margin-top:2px;">${c.open}</div>
        <div style="font-size:.8rem;color:var(--red);margin-top:2px;">⚠️ 非自己主題：${c.notSelf}</div>
      </div>`;
    });
  }

  return html;
}

/** 渲染行星閘門表 */
function renderPlanetTable(pPlanets, dPlanets) {
  const headerRow = `
    <tr style="border-bottom:1px solid var(--card-border);color:var(--muted);font-size:.8rem;">
      <th style="padding:8px 4px;text-align:left;">星體</th>
      <th style="padding:8px 4px;text-align:left;">意識 (P)<br><span style="font-weight:400;font-size:.7rem;">你知道的自己</span></th>
      <th style="padding:8px 4px;text-align:left;">潛意識 (D)<br><span style="font-weight:400;font-size:.7rem;">別人看到的你</span></th>
    </tr>`;

  const planetMeaning = {
    sun: '你最核心的生命主題，佔能量的 ~70%。這是你「為何而活」的答案。',
    earth: '支撐太陽主題的穩定基礎。你需要「站在」這個能量上，太陽才能發光。',
    moon: '推動你前進的動力。你做事的「油門」來自這裡。',
    northNode: '你的環境主題——什麼樣的環境讓你正確運作。',
    southNode: '你的舒適圈——你習慣的能量，但不一定是正確方向。',
    mercury: '你的溝通和思考方式。你如何處理和傳達資訊。',
    venus: '你的價值觀和道德觀。你認為什麼重要、什麼值得。',
    mars: '你的行動力和未成熟的能量。你如何衝刺和競爭。',
    jupiter: '你的法則和保護。你天生有什麼好運和信仰。',
    saturn: '你的紀律和人生功課。你需要學會什麼才能成熟。',
    uranus: '你的非凡之處。你跟別人不一樣的地方。',
    neptune: '你的幻覺和靈性。你容易被什麼迷惑或啟發。',
    pluto: '你的真相和轉化。你人生中不可避免要面對的深層議題。',
  };

  const rows = PLANETS.map((planet, i) => {
    const p = pPlanets[i];
    const d = dPlanets[i];
    const pGate = GATES[p.gate];
    const dGate = GATES[d.gate];
    const pLineName = LINE_NAMES[p.line] || '';
    const dLineName = LINE_NAMES[d.line] || '';
    const detailId = `hd-planet-${i}`;
    const meaning = planetMeaning[planet.id] || '';
    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer;" onclick="var el=document.getElementById('${detailId}');el.style.display=el.style.display==='none'?'table-row':'none';">
        <td style="padding:8px 4px;font-weight:600;font-size:.85rem;">${planet.zh}</td>
        <td style="padding:8px 4px;">
          <div style="font-family:monospace;font-size:.9rem;">
            <span style="color:var(--text);font-weight:700;">${p.gate}</span><span style="color:var(--muted);font-size:.75rem;">.${p.line}</span>
          </div>
          <div style="font-size:.78rem;color:var(--accent);margin-top:2px;">${pGate?.keyword || ''}</div>
          <div style="font-size:.72rem;color:var(--muted);">${pGate?.name || ''} ｜ ${p.line}爻${pLineName}</div>
        </td>
        <td style="padding:8px 4px;">
          <div style="font-family:monospace;font-size:.9rem;">
            <span style="color:#e0556b;font-weight:700;">${d.gate}</span><span style="color:var(--muted);font-size:.75rem;">.${d.line}</span>
          </div>
          <div style="font-size:.78rem;color:var(--accent);margin-top:2px;">${dGate?.keyword || ''}</div>
          <div style="font-size:.72rem;color:var(--muted);">${dGate?.name || ''} ｜ ${d.line}爻${dLineName}</div>
        </td>
      </tr>
      <tr id="${detailId}" style="display:none;">
        <td colspan="3" style="padding:12px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.82rem;line-height:1.8;">
          ${p.gate === d.gate ? `
            <div style="font-weight:700;color:var(--accent);margin-bottom:4px;">閘門 ${p.gate}「${pGate?.keyword || ''}」（意識 ${p.line}爻 + 潛意識 ${d.line}爻）</div>
            <div style="margin-bottom:8px;">${getPlanetGateDesc(planet.id, p.gate, p.line)}</div>
            <div style="font-size:.8rem;color:var(--muted);padding:6px 8px;background:rgba(224,85,107,.08);border-radius:4px;">
              💡 你的意識和潛意識啟動了同一個閘門，表示這股能量在你身上特別強烈——你自己知道它，別人也看得到。差別只在爻的表達方式不同（${p.line}爻${LINE_NAMES[p.line]} vs ${d.line}爻${LINE_NAMES[d.line]}）。
            </div>
          ` : `
            <div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.08);">
              <div style="font-weight:700;color:var(--accent);margin-bottom:4px;">意識面 — 閘門 ${p.gate}「${pGate?.keyword || ''}」（你知道的自己）</div>
              ${getPlanetGateDesc(planet.id, p.gate, p.line)}
            </div>
            <div>
              <div style="font-weight:700;color:#e0556b;margin-bottom:4px;">潛意識面 — 閘門 ${d.gate}「${dGate?.keyword || ''}」（別人看到的你，你不一定察覺）</div>
              ${getPlanetGateDesc(planet.id, d.gate, d.line)}
            </div>
          `}
        </td>
      </tr>`;
  }).join('');

  return `
    <h3>🪐 閘門啟動表</h3>
    <div style="font-size:.8rem;color:var(--muted);margin:0 0 8px;line-height:1.6;">
      每顆星啟動一個閘門（易經卦），格式：<b>閘門號.爻</b><br>
      閘門 = 你的天賦能量主題 ｜ 爻 = 你表達這個能量的方式（1-6）<br>
      <span style="color:var(--accent);">💡 點擊任一行查看解說</span>
    </div>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;">
        ${headerRow}
        ${rows}
      </table>
    </div>
    <div style="font-size:.75rem;color:var(--muted);margin-top:10px;padding:8px;background:rgba(123,108,246,.04);border-radius:6px;line-height:1.7;">
      <b>太陽</b> = 你最核心的能量（佔 ~70%）<br>
      <b>地球</b> = 支撐太陽主題的基礎 ｜ <b>月亮</b> = 驅動力<br>
      <b>北/南交點</b> = 環境方向 / 舒適圈 ｜ <b>水金火</b> = 內行星（溝通、價值、動力）<br>
      <b>木土天海冥</b> = 外行星（世代主題，影響較慢但深）
    </div>
  `;
}

/** 渲染輪迴交叉 */
function renderCross(cross) {
  const gateNames = cross.gates.map(g => `${g}（${GATES[g]?.keyword || ''}）`);
  return `
    <h3>✝️ 輪迴交叉</h3>
    <div style="font-size:.8rem;color:var(--muted);margin:0 0 8px;line-height:1.6;">
      輪迴交叉 = 你此生的目的方向，由太陽＋地球的意識/潛意識四個閘門組成
    </div>
    <p style="font-size:.9rem;color:var(--accent);font-weight:700;margin:0 0 8px;">${cross.angle}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
      <span class="tag tag-white" style="font-size:.75rem;">☉ 意識太陽 ${gateNames[0]}</span>
      <span class="tag tag-white" style="font-size:.75rem;">🌍 意識地球 ${gateNames[1]}</span>
      <span class="tag tag-red" style="font-size:.75rem;">☉ 潛意識太陽 ${gateNames[2]}</span>
      <span class="tag tag-red" style="font-size:.75rem;">🌍 潛意識地球 ${gateNames[3]}</span>
    </div>
    <p class="meaning">${cross.desc}</p>
    <div style="font-size:.75rem;color:var(--muted);margin-top:6px;padding:8px;background:rgba(123,108,246,.04);border-radius:6px;line-height:1.7;">
      <b>右角度</b> = 個人命運，你的人生目的是自我探索（Profile 1-3 爻）<br>
      <b>並列</b> = 固定命運，你走在一條既定軌道上（Profile 4 爻）<br>
      <b>左角度</b> = 超個人命運，你透過與他人互動完成使命（Profile 5-6 爻）
    </div>
  `;
}

/** 通道解說（點擊時顯示） */
function getChannelDesc(g1, g2) {
  const descs = {
    '64-47': '抽象思維通道——你的腦袋裡有一堆畫面和記憶片段，它們會突然拼成有意義的理解。不要急，讓它們自己組裝。',
    '61-24': '覺察通道——你會從內在深處突然徒出一個「啊哈」的領悟。這不是邏輯思考的結果，而是真理自己走到你面前。',
    '63-4': '邏輯通道——你天生會質疑並尋找公式。「這真的對嗎？」是你的口頭禪，且通常你最後真的能找到答案。',
    '17-62': '接受通道——你能將想法組織成別人聽得懂的樣子。適合教學、寫作、組織資訊。',
    '43-23': '架構通道——你有獨特的洞見，可以表達出來。但要等到被問才說，否則別人要嘛覺得你怪，要嘛無感。',
    '11-56': '好奇心通道——你有一籮筐想法和故事想分享。你是天生的說故事達人。',
    '31-7': '創始者通道——民主式領導。你引導別人的方式是「我知道方向，跟我來」，但需要被選主才能成事。',
    '8-1': '啟發通道——你透過做自己來啟發別人。不需要教，只要活出自己的樣子，別人就會被你吸引。',
    '33-13': '浪子通道——你是見證者和傾聽者。你將人生經驗收集起來，成為智慧。適合寫回憶錄、談人生。',
    '45-21': '金錢線通道——你有掌控物質世界的能力。「我要」是你的力量來源。適合經營、管理資源。',
    '12-22': '開放通道——你的社交能力隨情緒波動。狀態好的時候你超有魅力，狀態不好就需要獨處。尊重自己的節奏。',
    '35-36': '無常通道——你想嘗試所有事情，是萬事通。但不是每個經驗都需要去踩，等情緒清明再決定。',
    '20-34': '魅力通道——即知即行的忙碌。你能在當下就把事情做完，不需要計畫。你是「做就對了」的人。',
    '57-20': '腦波通道——當下的覺知。你有立即感知然後立即說出來的能力。直覺很準但只說一次。',
    '48-16': '才華通道——你有深度的技能加上表達的熱忱。練習讓你越來越強，而且你能將專業讓大家聽懂。',
    '46-29': '發現通道——你一旦承諾了就會全力投入。你的身體會帶你去對的地方。相信身體的回應。',
    '10-34': '探索通道——你用行動表達信念。「我就是要這樣做」是你的特徵。很有力量但需要等待回應。',
    '15-5': '韻律通道——你有固定的生活節奏。別人可能覺得你很「固定」，但這就是你的力量來源。穩定的節奏讓你產能最高。',
    '2-14': '脈動通道——你知道方向，而且有資源去執行。這是「有錢有方向」的通道。回應對的事就能豐盛。',
    '25-51': '發起通道——你需要被震撼才能啟動創新。競爭和挑戰是你的燃料。你是「被逼到絕境反而爆發」的人。',
    '26-44': '投降通道——你有傳遞訊息和推銷的天賦。你知道如何讓別人「買單」。但要確保你賣的是真的有價值的東西。',
    '40-37': '社群通道——你需要「交易」：我付出，但你也要回報。家庭和社群裡的核心人物，但不能無條件付出。',
    '50-27': '保存通道——你是天生的監護人。照顧別人是你的本能，但要確保你照顧的對象值得你的能量。',
    '57-34': '力量原型通道——直覺式的力量。你的身體會直接告訴你該走還是該動。信任那個立即的身體反應。',
    '59-6': '親密通道——你在親密關係中有強大的繫絆能力。但情緒波動會影響你的開放程度。等清明再決定是否讓人進入你的世界。',
    '3-60': '突變通道——能量的開關。有時候變化突然就來，有時候它就是不來。不要強求變化，它有自己的時間表。',
    '42-53': '成熟通道——從開始到完成的循環。你需要把事情做完才能開始下一個。半途而廢會讓你很不舒服。',
    '9-52': '專注通道——你有集中精神的壓力和能力。適合需要專注的工作。但是要讓身體告訴你該專注在哪裡。',
    '28-38': '掙扎通道——你為了意義而戰。「這到底值不值得？」是你的核心問題。找到值得的事，你會用盡全力。',
    '18-58': '批判通道——不知足的力量。你看得到哪裡可以更好，而且你會去修正它。這是用來改善世界的能量。',
    '32-54': '蛻變通道——野心和變革的驅動力。你有強烈的上進心，而且你知道哪些變化能持久。適合創業、轉型。',
    '49-19': '綜合通道——你對人的需求很敏感，而且有原則。你知道什麼時候該接受、什麼時候該革命。',
    '55-39': '情緒通道——多愁善感。你的情緒波動是有目的的：用挑釁來找到真正的精神。等波動過去再行動。',
    '30-41': '辨認通道——夢想家。你有強烈的渴望想體驗新事物，但不是每個幻想都要去踩。等情緒清明再決定。',
  };
  const key1 = g1 + '-' + g2;
  const key2 = g2 + '-' + g1;
  return descs[key1] || descs[key2] || '這條通道將兩個中心的能量連接起來，形成你固定的生命力。';
}

/** 中心點擊解說 */
function getCenterDetail(centerId) {
  const c = CENTERS[centerId];
  if (!c) return '';
  const d = window._hdData;
  const isDefined = d.definedCenters.includes(centerId);
  const status = isDefined ? '已定義（著色）' : '開放（空白）';
  const statusColor = isDefined ? 'var(--accent)' : 'var(--muted)';
  const desc = isDefined ? c.defined : c.open;
  
  let html = `<div style="padding:14px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.85rem;line-height:1.9;">`;
  html += `<div style="font-size:1rem;font-weight:700;color:${statusColor};">${c.zh}</div>`;
  html += `<div style="font-size:.8rem;color:var(--muted);margin-bottom:6px;">${status} ｜ ${c.theme} ｜ ${c.bio}</div>`;
  html += `<div style="margin-bottom:8px;">${desc}</div>`;
  if (!isDefined) {
    html += `<div style="color:var(--red);font-size:.82rem;">⚠️ 非自己主題：${c.notSelf}</div>`;
  }
  html += `</div>`;
  return html;
}
