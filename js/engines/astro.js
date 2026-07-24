/**
 * astro.js — 西洋星座引擎（完整星盤）
 * 計算十大星體 + 12 宮位（Equal House）
 */

import {
  julianDay, sunLongitude, moonLongitude, ascendant, midheaven, longitudeToSign,
  northNodeLongitude
} from '../lib/ephemeris.js';
import {
  mercuryGeoLon, venusGeoLon, marsGeoLon,
  jupiterGeoLon, saturnGeoLon,
  uranusGeoLon, neptuneGeoLon, plutoGeoLon
} from '../lib/planets.js';
import { normalizeDeg } from '../lib/utils.js';
import { SIGNS } from '../data/astro-text.js';

/** 行星資料 */
const PLANETS = [
  { id: 'sun', zh: '太陽', symbol: '☉', calcFn: sunLongitude },
  { id: 'moon', zh: '月亮', symbol: '☽', calcFn: moonLongitude },
  { id: 'mercury', zh: '水星', symbol: '☿', calcFn: mercuryGeoLon },
  { id: 'venus', zh: '金星', symbol: '♀', calcFn: venusGeoLon },
  { id: 'mars', zh: '火星', symbol: '♂', calcFn: marsGeoLon },
  { id: 'jupiter', zh: '木星', symbol: '♃', calcFn: jupiterGeoLon },
  { id: 'saturn', zh: '土星', symbol: '♄', calcFn: saturnGeoLon },
  { id: 'uranus', zh: '天王星', symbol: '♅', calcFn: uranusGeoLon },
  { id: 'neptune', zh: '海王星', symbol: '♆', calcFn: neptuneGeoLon },
  { id: 'pluto', zh: '冥王星', symbol: '♇', calcFn: plutoGeoLon },
];

/** 宮位名稱 */
const HOUSE_NAMES = [
  '1宮（命宮）', '2宮（財帛）', '3宮（溝通）', '4宮（家庭）',
  '5宮（創造）', '6宮（服務）', '7宮（關係）', '8宮（轉化）',
  '9宮（探索）', '10宮（事業）', '11宮（社群）', '12宮（靈性）'
];

/**
 * 計算行星落入宮位（Equal House 等宮制）
 * ASC 為 1 宮頭，每宮 30°
 */
function getHouse(planetLon, ascLon) {
  const diff = normalizeDeg(planetLon - ascLon);
  return Math.floor(diff / 30) + 1;
}

/**
 * 格式化度數為 度°分'秒"
 */
function formatDegree(deg) {
  const d = Math.floor(deg % 30);
  const mFull = (deg % 30 - d) * 60;
  const m = Math.floor(mFull);
  const s = Math.floor((mFull - m) * 60);
  return `${d.toString().padStart(2, '0')}°${m.toString().padStart(2, '0')}'${s.toString().padStart(2, '0')}"`;
}

/**
 * 計算星座結果（完整星盤）
 */
export function calculate(birthData) {
  const { year, month, day, hour, minute, lat, lng, utcOffset } = birthData;

  try {
    // 計算 Julian Day
    const jd = julianDay(year, month, day, hour, minute, utcOffset);

    // 上升點
    const ascLon = ascendant(jd, lat, lng);
    const ascSignIdx = longitudeToSign(ascLon);

    // 計算所有行星
    const planets = PLANETS.map(p => {
      const lon = p.calcFn(jd);
      const signIdx = longitudeToSign(lon);
      const house = getHouse(lon, ascLon);
      return {
        ...p,
        longitude: lon,
        signIdx,
        sign: SIGNS[signIdx],
        house,
        degreeStr: formatDegree(lon),
      };
    });

    // 北交點
    const nnLon = northNodeLongitude(jd);
    const nnSignIdx = longitudeToSign(nnLon);
    const northNode = {
      id: 'northNode', zh: '北交點', symbol: '☊',
      longitude: nnLon, signIdx: nnSignIdx,
      sign: SIGNS[nnSignIdx], house: getHouse(nnLon, ascLon),
      degreeStr: formatDegree(nnLon),
    };

    // 上升點資料
    const ascData = {
      id: 'asc', zh: '上升', symbol: '⬆',
      longitude: ascLon, signIdx: ascSignIdx,
      sign: SIGNS[ascSignIdx], house: 1,
      degreeStr: formatDegree(ascLon),
    };

    // 天頂 MC
    const mcLon = midheaven(jd, lng);
    const mcSignIdx = longitudeToSign(mcLon);
    const mcData = {
      id: 'mc', zh: '天頂MC', symbol: '⊤',
      longitude: mcLon, signIdx: mcSignIdx,
      sign: SIGNS[mcSignIdx], house: 10,
      degreeStr: formatDegree(mcLon),
    };

    // 計算主要相位（太陽/月亮 vs 其他 + 任何合相）
    const aspects = calculateAspects(planets, ascLon, mcLon);

    const data = {
      planets,
      northNode,
      ascendant: ascData,
      mc: mcData,
      aspects,
      sunSign: planets[0].sign,
      moonSign: planets[1].sign,
      risingSign: SIGNS[ascSignIdx],
    };

    const html = renderAstro(data);
    return { status: 'ok', data, html, error: null };
  } catch (err) {
    return { status: 'error', data: null, html: '', error: `星座計算錯誤：${err.message}` };
  }
}

// === 渲染 ===

function renderAstro(data) {
  const { planets, northNode, ascendant: asc, mc, aspects } = data;
  const sun = planets[0];
  const moon = planets[1];

  return `
    <div class="sig">
      <div class="kin">完整星盤</div>
      <div class="big">${sun.sign.symbol} ${sun.sign.zh} / ${moon.sign.symbol} ${moon.sign.zh} / ${asc.sign.symbol} ${asc.sign.zh}</div>
      <div style="display:flex;justify-content:center;gap:12px;margin-top:10px;flex-wrap:wrap;">
        <span class="tag tag-${elementColor(sun.sign.elementEn)}">☉ 太陽${sun.sign.zh}</span>
        <span class="tag tag-${elementColor(moon.sign.elementEn)}">☽ 月亮${moon.sign.zh}</span>
        <span class="tag tag-${elementColor(asc.sign.elementEn)}">⬆ 上升${asc.sign.zh}</span>
        <span class="tag tag-${elementColor(mc.sign.elementEn)}">⊤ 天頂${mc.sign.zh}</span>
      </div>
    </div>

    <h3>📋 星體位置表</h3>
    <p style="font-size:.8rem;color:var(--muted);margin:0 0 8px;">點擊任一行查看具體解讀 ▼</p>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:.9rem;">
        <thead>
          <tr style="border-bottom:1px solid var(--card-border);color:var(--muted);font-size:.8rem;">
            <th style="padding:8px 6px;text-align:left;">星體</th>
            <th style="padding:8px 6px;text-align:left;">落入星座</th>
            <th style="padding:8px 6px;text-align:left;">度數</th>
            <th style="padding:8px 6px;text-align:left;">落入宮位</th>
          </tr>
        </thead>
        <tbody>
          ${renderPlanetRow(asc)}
          ${renderPlanetRow(mc)}
          ${planets.map(p => renderPlanetRow(p)).join('')}
          ${renderPlanetRow(northNode)}
        </tbody>
      </table>
    </div>

    <div class="divider"></div>
    ${renderAspects(aspects)}
    <div class="divider"></div>
    ${renderThreeBig(data)}
    <div class="divider"></div>
    ${renderElementSummary(planets)}

    <div class="note">💡 使用等宮制（Equal House）。相位容許度：合相/對沖/三合 8°，六合/四分 6°。行星位置基於軌道力學計算。</div>
  `;
}

function renderPlanetRow(planet) {
  const signColor = elementColor(planet.sign.elementEn);
  const detailId = `detail-${planet.id}`;
  // 根據星體生成解說文字
  const detail = getPlanetDetail(planet);
  return `
    <tr style="border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer;" onclick="const el=document.getElementById('${detailId}');el.style.display=el.style.display==='none'?'table-row':'none';">
      <td style="padding:8px 6px;font-weight:600;">${planet.symbol} ${planet.zh}</td>
      <td style="padding:8px 6px;"><span class="tag tag-${signColor}" style="font-size:.75rem;">${planet.sign.zh}</span></td>
      <td style="padding:8px 6px;font-family:monospace;font-size:.85rem;">${planet.degreeStr}</td>
      <td style="padding:8px 6px;">${planet.house}宮</td>
    </tr>
    <tr id="${detailId}" style="display:none;">
      <td colspan="4" style="padding:12px 10px;background:rgba(123,108,246,.08);border-radius:8px;">
        <div style="font-size:.85rem;color:var(--text);line-height:1.7;">${detail}</div>
      </td>
    </tr>
  `;
}

/** 取得星體的解說文字 — 具體方向 + 行動建議 */
function getPlanetDetail(planet) {
  const sign = planet.sign;
  const house = planet.house;
  const planetInSign = getPlanetInSign(planet.id, sign);
  const inHouse = getHouseDirection(house);
  return `<b>${planet.symbol} ${planet.zh}在${sign.zh} ${house}宮</b><br><br>${planetInSign}<br><br>${inHouse}`;
}

function getPlanetInSign(planetId, sign) {
  const meanings = {
    sun: `你的核心生命力透過<b>${sign.zh}</b>的方式表達。${sign.sun.split("。").slice(0,2).join("。")}。`,
    moon: `你的情緒安全感需要<b>${sign.zh}</b>的方式來滿足。${sign.moon.split("。").slice(0,2).join("。")}。`,
    asc: `你面對世界的方式帶有<b>${sign.zh}</b>的色彩。${sign.rising.split("。").slice(0,2).join("。")}。`,
    mercury: getMercuryText(sign),
    venus: getVenusText(sign),
    mars: getMarsText(sign),
    jupiter: getJupiterText(sign),
    saturn: getSaturnText(sign),
    uranus: `天王星在<b>${sign.zh}</b>：你這一代人在${sign.element}象領域追求突破創新。`,
    neptune: `海王星在<b>${sign.zh}</b>：你這一代人透過${sign.element}象能量尋找靈性意義。`,
    pluto: `冥王星在<b>${sign.zh}</b>：你這一代人在${sign.element}象領域經歷深層轉化重生。`,
    northNode: getNorthNodeText(sign),
  };
  return meanings[planetId] || `${sign.zh}的${sign.element}象能量。`;
}

function renderThreeBig(data) {
  const { planets, ascendant: asc } = data;
  const sun = planets[0];
  const moon = planets[1];

  return `
    <h3>☉ 太陽星座：${sun.sign.zh}</h3>
    <p style="font-size:.85rem;color:var(--muted);margin:0 0 8px;">核心自我 · ${sun.sign.element}象${sun.sign.modality}星座 · ${sun.house}宮</p>
    <p class="meaning">${sun.sign.sun}</p>

    <h3>☽ 月亮星座：${moon.sign.zh}</h3>
    <p style="font-size:.85rem;color:var(--muted);margin:0 0 8px;">內在情緒 · ${moon.sign.element}象${moon.sign.modality}星座 · ${moon.house}宮</p>
    <p class="meaning">${moon.sign.moon}</p>

    <h3>⬆ 上升星座：${asc.sign.zh}</h3>
    <p style="font-size:.85rem;color:var(--muted);margin:0 0 8px;">外在面具 · ${asc.sign.element}象${asc.sign.modality}星座 · 1宮</p>
    <p class="meaning">${asc.sign.rising}</p>
  `;
}

function renderElementSummary(planets) {
  const elements = { fire: 0, earth: 0, air: 0, water: 0 };
  planets.forEach(p => { elements[p.sign.elementEn]++; });

  const elementZh = { fire: "🔥 火", earth: "🌍 土", air: "💨 風", water: "💧 水" };
  const total = planets.length;

  // 找主導元素
  const sorted = Object.entries(elements).sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0];
  const weak = sorted[sorted.length - 1];

  let summary = `你的星盤中 <span class="kw">${elementZh[dominant[0]]}</span> 元素最強（${dominant[1]}/${total} 顆星），`;
  if (dominant[0] === 'fire') summary += "代表你行動力強、有開創精神。";
  else if (dominant[0] === 'earth') summary += "代表你務實穩健、重視物質安全感。";
  else if (dominant[0] === 'air') summary += "代表你善於思考溝通、重視人際連結。";
  else summary += "代表你情感豐富、直覺敏銳。";

  if (weak[1] === 0) {
    summary += `<br><span class="kw">${elementZh[weak[0]]}</span> 元素缺乏——這可能是你需要有意識去發展的面向。`;
  }

  // 模式統計
  const modalities = { cardinal: 0, fixed: 0, mutable: 0 };
  planets.forEach(p => { modalities[p.sign.modalityEn]++; });
  const modalZh = { cardinal: "基本（開創）", fixed: "固定（穩定）", mutable: "變動（適應）" };
  const dominantMod = Object.entries(modalities).sort((a, b) => b[1] - a[1])[0];

  return `
    <h3>📊 元素與模式分佈</h3>
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin:8px 0 12px;">
      ${Object.entries(elements).map(([k, v]) =>
        `<div style="text-align:center;"><div style="font-size:1.2rem;">${elementZh[k].split(' ')[0]}</div><div style="font-weight:700;color:var(--accent);">${v}</div><div style="font-size:.75rem;color:var(--muted);">${elementZh[k].split(' ')[1]}</div></div>`
      ).join('')}
    </div>
    <p class="meaning">${summary}</p>
    <p class="meaning">模式分佈：基本 ${modalities.cardinal} / 固定 ${modalities.fixed} / 變動 ${modalities.mutable}。你的主導模式是<span class="kw">${modalZh[dominantMod[0]]}</span>。</p>
  `;
}

function getMercuryText(sign) {
  const t = { "牡羊座":"思考快速直接，適合業務、即興演講、危機處理。行動：善用反應速度，重要決定給自己10秒緩衝。","金牛座":"思考穩健實際，適合財務分析、品質管理。行動：信任慢思考，別被快節奏催促。","雙子座":"思考靈活多變，適合媒體、教學、寫作。行動：找一個主題深耕，把廣度變專業。","巨蟹座":"思考帶情感直覺，適合諮商、內容創作。行動：信任直覺判斷，它比你以為的準。","獅子座":"溝通有舞台感，適合演講、教學、社群經營。行動：用話語激勵他人。","處女座":"思考精密有條理，適合編輯、數據分析、程式。行動：分析力是天賦，但也要看全貌。","天秤座":"思考公正客觀，溝通優雅有說服力，適合公關、法律、設計。行動：善用外交天賦，你天生懂得怎麼說比說什麼重要。","天蠍座":"思考深入本質，適合研究、調查、心理學。行動：穿透力是武器，用在值得深入的事上。","射手座":"思考宏觀自由，適合出版、教育、跨文化工作。行動：把大格局落地成具體方案。","摩羯座":"思考務實有結構，適合管理、財務規劃。行動：邏輯力很強，偶爾允許直覺發言。","水瓶座":"思考前衛獨立，適合科技、社會創新。行動：找能理解你的社群很重要。","雙魚座":"思考充滿想像力，適合藝術、靈性工作。行動：把感受力轉化為創作。" };
  return `<b>水星在${sign.zh}</b>：你的思考和溝通方式。${t[sign.zh]||""}`;
}

function getVenusText(sign) {
  const t = { "牡羊座":"愛情中主動大膽，被有活力的人吸引。","金牛座":"愛情中忠誠專一，重視感官和安全感。","雙子座":"愛情中需要心智交流和新鮮感。","巨蟹座":"愛情中溫柔體貼，需要情感安全感。","獅子座":"愛情中熱情大方，喜歡被珍視。","處女座":"愛情中細心實際，用行動表達愛。","天秤座":"愛情中優雅浪漫，追求平衡美感。","天蠍座":"愛情中深沉強烈，全心投入。","射手座":"愛情中自由開朗，需要精神共鳴。","摩羯座":"愛情中認真負責，重視長期承諾。","水瓶座":"愛情中獨立理性，需要友誼基礎。","雙魚座":"愛情中浪漫敏感，能感知對方情緒。" };
  return `<b>金星在${sign.zh}</b>：你的愛情模式和價值觀。${t[sign.zh]||""}`;
}

function getMarsText(sign) {
  const t = { "牡羊座":"行動力極強，決定了馬上做。發揮：開創、競爭領域。","金牛座":"行動力穩定持久，一旦啟動很難阻擋。發揮：長期建設。","雙子座":"行動力靈活多變，擅長多工。發揮：策略而非蠻力。","巨蟹座":"為保護在乎的人可爆發驚人力量。發揮：為家人團隊而戰。","獅子座":"做事有風格有創意。發揮：展現獨特才華的舞台。","處女座":"行動精準有效率。發揮：優化流程、解決問題。","天秤座":"在合作中發揮最大。發揮：談判、需平衡各方的工作。","天蠍座":"深沉強大，全力以赴。發揮：深度專注、研究、轉型。","射手座":"由理想驅動，越有意義越有動力。發揮：教育、拓展。","摩羯座":"有紀律有策略，願為長期目標忍耐。發揮：管理、建制度。","水瓶座":"為改變現狀而行動。發揮：社會改革、科技創新。","雙魚座":"由直覺和慈悲驅動。發揮：療癒、藝術、靈性服務。" };
  return `<b>火星在${sign.zh}</b>：你的行動模式。${t[sign.zh]||""}`;
}

function getJupiterText(sign) {
  const t = { "牡羊座":"幸運來自大膽行動。擴展：創業、帶頭做第一個。","金牛座":"幸運來自穩定累積。擴展：投資、美食餐飲、藝術。","雙子座":"幸運來自溝通學習。擴展：教育、媒體、寫作。","巨蟹座":"幸運來自家庭連結。擴展：房地產、照護、餐飲。","獅子座":"幸運來自展現自我。擴展：表演、娛樂、領導。","處女座":"幸運來自服務精進。擴展：健康產業、專業服務。","天秤座":"幸運來自合作美學。擴展：合夥、設計、法律。","天蠍座":"幸運來自深度投入。擴展：投資、心理學、資源整合。","射手座":"幸運來自探索知識。擴展：國際事務、出版、高等教育。","摩羯座":"幸運來自紀律建設。擴展：企業管理、傳統產業升級。","水瓶座":"幸運來自創新社群。擴展：科技、社會企業、社群經營。","雙魚座":"幸運來自直覺慈悲。擴展：藝術、靈性產業、療癒。" };
  return `<b>木星在${sign.zh}</b>：你的幸運方向。${t[sign.zh]||""}`;
}

function getSaturnText(sign) {
  const t = { "牡羊座":"功課：學會有耐心地行動，不衝動。突破：控制住衝動、有策略出手時就修完了。","金牛座":"功課：建立真正的安全感，區分需要和想要。突破：不用物質填補不安時，內在自然富足。","雙子座":"功課：深度思考，選一個主題真正學透。突破：話語有份量時，影響力就來了。","巨蟹座":"功課：處理家庭情感，學會自己給自己安全感。突破：不需要別人給歸屬感時，你成為別人的避風港。","獅子座":"功課：用實力而非表演贏得認可。突破：真正的自信來自對自己的誠實。","處女座":"功課：接受不完美，夠好就是好。突破：對自己溫柔時，效率反而更高。","天秤座":"功課：在關係中保有自我，學會說不。突破：真正的和諧建立在誠實上。","天蠍座":"功課：面對恐懼，放下控制欲。突破：能信任過程時，轉化自然發生。","射手座":"功課：把理想落地，學會承諾貫徹。突破：有紀律的自由才是真自由。","摩羯座":"功課：找到工作與生活的平衡。突破：成就不是唯一價值，學會享受過程。","水瓶座":"功課：融入群體同時保有個性。突破：你的獨特是禮物不是詛咒。","雙魚座":"功課：建立清晰邊界，分清自己和別人的情緒。突破：有邊界的慈悲才可持續。" };
  return `<b>土星在${sign.zh}</b>：你的人生功課。${t[sign.zh]||""}`;
}

function getNorthNodeText(sign) {
  const t = { "牡羊座":"靈魂方向：<b>從依賴走向獨立</b>。學會為自己做主、勇敢行動。行動：練習自己做決定。","金牛座":"靈魂方向：<b>從動盪走向穩定</b>。建立安全感、享受簡單美好。行動：投資穩定基礎。","雙子座":"靈魂方向：<b>從大道理走向生活溝通</b>。學傾聽和交流。行動：多聽少講，寫作分享。","巨蟹座":"靈魂方向：<b>從獨自承擔走向情感連結</b>。打開心、照顧人、被照顧。行動：建立深度友誼，允許脆弱。","獅子座":"靈魂方向：<b>從融入群體走向展現自我</b>。站上舞台展現才華。行動：找一件熱愛的事大膽展現。","處女座":"靈魂方向：<b>從夢想走向實際</b>。落地執行、精進技能。行動：選一個專業深耕。","天秤座":"靈魂方向：<b>從獨行走向合作</b>。在關係中成長。行動：學妥協和雙贏思維。","天蠍座":"靈魂方向：<b>從舒適走向轉化</b>。放下執著、深入內在。行動：面對逃避的議題。","射手座":"靈魂方向：<b>從細節走向大格局</b>。追求意義和智慧。行動：旅行、學哲學。","摩羯座":"靈魂方向：<b>從情感依賴走向自我實現</b>。建立事業、承擔責任。行動：設定長期目標並執行。","水瓶座":"靈魂方向：<b>從個人走向社群服務</b>。用才華改善集體。行動：加入有意義的社群。","雙魚座":"靈魂方向：<b>從控制走向信任</b>。放手、信任直覺。行動：發展靈性練習。" };
  return `<b>北交點在${sign.zh}</b>：你此生的成長方向。${t[sign.zh]||""}`;
}

/** 計算主要相位 */
function calculateAspects(planets, ascLon, mcLon) {
  const ASPECT_TYPES = [
    { name: '合', symbol: '☌', angle: 0, orb: 8, meaning: '融合、強化' },
    { name: '對沖', symbol: '☍', angle: 180, orb: 8, meaning: '對立、互補' },
    { name: '三合', symbol: '△', angle: 120, orb: 8, meaning: '和諧、流動' },
    { name: '四分', symbol: '□', angle: 90, orb: 6, meaning: '挑戰、成長動力' },
    { name: '六合', symbol: '⚹', angle: 60, orb: 6, meaning: '機會、輕鬆配合' },
  ];

  const aspects = [];
  const sunIdx = 0, moonIdx = 1;

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      // 只保留：太陽或月亮相關 + 任何合相
      const isSunMoon = (i === sunIdx || i === moonIdx || j === sunIdx || j === moonIdx);

      let diff = Math.abs(planets[i].longitude - planets[j].longitude);
      if (diff > 180) diff = 360 - diff;

      for (const asp of ASPECT_TYPES) {
        const delta = Math.abs(diff - asp.angle);
        if (delta <= asp.orb) {
          // 合相全保留，其他只保留太陽/月亮相關
          if (asp.angle === 0 || isSunMoon) {
            aspects.push({
              planet1: planets[i],
              planet2: planets[j],
              type: asp,
              exactDelta: delta.toFixed(1),
            });
          }
          break;
        }
      }
    }
  }

  return aspects;
}

/** 渲染相位區塊 */
function renderAspects(aspects) {
  if (aspects.length === 0) return '';

  const rows = aspects.map(a => {
    const strength = parseFloat(a.exactDelta) < 2 ? '（精準相位⚡）' : '';
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:.85rem;">
      <span style="font-weight:600;min-width:60px;">${a.planet1.symbol}${a.planet1.zh}</span>
      <span style="color:var(--accent);font-size:1.1rem;">${a.type.symbol}</span>
      <span style="font-weight:600;min-width:60px;">${a.planet2.symbol}${a.planet2.zh}</span>
      <span style="color:var(--muted);font-size:.8rem;">${a.type.name}（${a.type.meaning}）${strength}</span>
    </div>`;
  }).join('');

  return `
    <h3>🔗 主要相位</h3>
    <p style="font-size:.8rem;color:var(--muted);margin:0 0 8px;">太陽/月亮的相位 + 其他行星合相</p>
    ${rows}
  `;
}

function getHouseDirection(house) {
  const d = ['',
    `<b>1宮（自我）</b>：這股能量就是你的招牌特質，大膽做自己。`,
    `<b>2宮（資源）</b>：用這個特質來創造收入，它是你的生財工具。`,
    `<b>3宮（溝通）</b>：在日常交流和學習中發揮。寫作、教學、自媒體是你的舞台。`,
    `<b>4宮（根基）</b>：與家庭和內在安全感連結。打造身心安定的環境。`,
    `<b>5宮（創造）</b>：在創意表達和快樂中綻放。用在創作、娛樂、任何讓你開心的事。`,
    `<b>6宮（日常）</b>：需要在每天的工作和健康習慣中落實。建立好routine。`,
    `<b>7宮（夥伴）</b>：在一對一關係中被激活。找對的夥伴，透過關係成長。`,
    `<b>8宮（深層）</b>：在深層轉化和共享資源中運作。面對恐懼、管理他人資源。`,
    `<b>9宮（遠方）</b>：推動你走向更廣闊的世界。出國、進修、跨文化工作。`,
    `<b>10宮（成就）</b>：直接影響事業和公眾形象。大膽往頂峰走，這是你的職場優勢。`,
    `<b>11宮（社群）</b>：在團體和社群中發揮最大。加入或建立社群、經營人脈。`,
    `<b>12宮（幕後）</b>：在幕後和潛意識中運作。獨處時發揮、靈性修行、療癒工作。`,
  ];
  return d[house] || '';
}

function elementColor(element) {
  switch (element) {
    case 'fire': return 'red';
    case 'earth': return 'yellow';
    case 'air': return 'white';
    case 'water': return 'blue';
    default: return 'white';
  }
}
