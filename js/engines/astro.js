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

    // 南交點（北交 + 180°）
    const snLon = normalizeDeg(nnLon + 180);
    const snSignIdx = longitudeToSign(snLon);
    const southNode = {
      id: 'southNode', zh: '南交點', symbol: '☋',
      longitude: snLon, signIdx: snSignIdx,
      sign: SIGNS[snSignIdx], house: getHouse(snLon, ascLon),
      degreeStr: formatDegree(snLon),
    };

    // 上升點資料
    const ascData = {
      id: 'asc', zh: '上升', symbol: '⬆',
      longitude: ascLon, signIdx: ascSignIdx,
      sign: SIGNS[ascSignIdx], house: 1,
      degreeStr: formatDegree(ascLon),
    };

    // 下降點 DSC（ASC + 180°）
    const dscLon = normalizeDeg(ascLon + 180);
    const dscSignIdx = longitudeToSign(dscLon);
    const dscData = {
      id: 'dsc', zh: '下降', symbol: '⬇',
      longitude: dscLon, signIdx: dscSignIdx,
      sign: SIGNS[dscSignIdx], house: 7,
      degreeStr: formatDegree(dscLon),
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

    // 天底 IC（MC + 180°）
    const icLon = normalizeDeg(mcLon + 180);
    const icSignIdx = longitudeToSign(icLon);
    const icData = {
      id: 'ic', zh: '天底IC', symbol: '⊥',
      longitude: icLon, signIdx: icSignIdx,
      sign: SIGNS[icSignIdx], house: 4,
      degreeStr: formatDegree(icLon),
    };

    // 福點 Part of Fortune
    // 日間盤（太陽在地平線上）：ASC + Moon - Sun
    // 夜間盤（太陽在地平線下）：ASC + Sun - Moon
    const sunLon = planets[0].longitude;
    const moonLon = planets[1].longitude;
    const isDaytime = getHouse(sunLon, ascLon) <= 6; // 1-6宮 = 地平線上
    const fortuneLon = isDaytime
      ? normalizeDeg(ascLon + moonLon - sunLon)
      : normalizeDeg(ascLon + sunLon - moonLon);
    const fortuneSignIdx = longitudeToSign(fortuneLon);
    const fortune = {
      id: 'fortune', zh: '福點', symbol: '⊗',
      longitude: fortuneLon, signIdx: fortuneSignIdx,
      sign: SIGNS[fortuneSignIdx], house: getHouse(fortuneLon, ascLon),
      degreeStr: formatDegree(fortuneLon),
    };

    // 計算主要相位（太陽/月亮 vs 其他 + 任何合相）
    const aspects = calculateAspects(planets, ascLon, mcLon);

    const data = {
      planets,
      northNode,
      southNode,
      ascendant: ascData,
      dsc: dscData,
      mc: mcData,
      ic: icData,
      fortune,
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
  const { planets, northNode, southNode, ascendant: asc, dsc, mc, ic, fortune, aspects } = data;
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
          ${renderPlanetRow(dsc)}
          ${renderPlanetRow(mc)}
          ${renderPlanetRow(ic)}
          ${planets.map(p => renderPlanetRow(p)).join('')}
          ${renderPlanetRow(northNode)}
          ${renderPlanetRow(southNode)}
          ${renderPlanetRow(fortune)}
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
    dsc: getDSCText(sign),
    mc: getMCText(sign),
    ic: getICText(sign),
    mercury: getMercuryText(sign),
    venus: getVenusText(sign),
    mars: getMarsText(sign),
    jupiter: getJupiterText(sign),
    saturn: getSaturnText(sign),
    uranus: getUranusText(sign),
    neptune: getNeptuneText(sign),
    pluto: getPlutoText(sign),
    northNode: getNorthNodeText(sign),
    southNode: getSouthNodeText(sign),
    fortune: getFortuneText(sign),
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

function getMCText(sign) {
  const t = {
    "牡羊座": "你的事業形象是<b>開創者、先鋒、行動派領導</b>。社會看你的方式是「這個人敢做第一個」。你適合的職場角色是帶頭衝鋒、開疆闢土——不管在哪個產業，你都需要掌握主導權。你不適合當乖乖配合的角色，你需要一個能讓你自己做主、快速決策的位置。創業、獨立接案、部門主管都適合你。行動建議：主動爭取領導機會，不要等別人指派，你天生就該帶隊。",
    "金牛座": "你的事業形象是<b>穩健可靠的建設者</b>。社會看你的方式是「這個人值得信任、做事穩當」。你適合需要耐心經營、長期累積的領域——金融、不動產、設計、美食、品質管理。你的職場優勢是持久力和品味，不急不躁地把一件事做到最好。你不適合變動太快的環境，但在任何需要「守住品質」的崗位上你都是王牌。行動建議：選一個領域深耕，用時間證明你的價值，你的事業是越老越值錢的類型。",
    "雙子座": "你的事業形象是<b>多才多藝的溝通者</b>。社會看你的方式是「這個人什麼都懂、反應超快」。你適合需要動腦筋、跨領域整合、大量溝通的工作——媒體、行銷、教學、顧問、寫作、業務。你的職場優勢是資訊整合力和表達力，能把複雜的東西翻譯成人話。你可能會有不只一個職涯方向，或同時做好幾件事——這不是不專心，是你的天賦。行動建議：不要勉強自己只做一件事，但要找到串連不同領域的核心敘事。",
    "巨蟹座": "你的事業形象是<b>溫暖的守護者與照顧者</b>。社會看你的方式是「這個人讓人安心、有家的感覺」。你適合營造安全感和情感連結的工作——HR、照護、教育、餐飲、房地產、心理諮商。你的職場優勢是同理心和直覺力，你知道別人需要什麼，而且真心想幫。你不適合冷冰冰的純數字環境，你需要「跟人有關」的工作。行動建議：把你天生的照顧能力變成職業優勢，不要覺得這是軟實力——在現在的職場它是硬通貨。",
    "獅子座": "你的事業形象是<b>耀眼的領袖與創作者</b>。社會看你的方式是「這個人有舞台感、天生有範」。你適合需要展現個人魅力的工作——管理、表演、創業、品牌經營、娛樂、教學。你的職場優勢是領導力和感染力，你能讓團隊士氣高昂、讓觀眾買單。你需要被看見、被認可——不是虛榮，是你發光的方式。行動建議：找一個舞台，用你的光芒帶動別人。你不適合躲在幕後，大膽站出來。",
    "處女座": "你的事業形象是<b>精密可靠的專家</b>。社會看你的方式是「這個人超專業、什麼都想得到」。你適合需要精確、分析、品質控管的工作——技術、醫療、編輯、數據分析、系統優化、財務。你的職場優勢是別人看不到的細節你都能抓到，把60分做到95分是你的日常。你不需要大舞台，但在任何需要專業判斷的場景都不可或缺。行動建議：找到一個值得你精雕細琢的專業領域，你的事業會靠實力說話。",
    "天秤座": "你的事業形象是<b>優雅的外交官與合作者</b>。社會看你的方式是「這個人很有品味、人脈很廣、什麼場合都hold得住」。你適合需要協調、美感、人際手腕的工作——公關、設計、法律、藝術、顧問、業務合作。你的職場優勢是看起來毫不費力的人際能力和審美判斷。你需要美的環境和和諧的團隊才能發揮最好。行動建議：善用你的人脈和品味，在需要「連結人和人」或「呈現美好」的崗位上你如魚得水。",
    "天蠍座": "你的事業形象是<b>深度掌控的策略家</b>。社會看你的方式是「這個人看起來很深沉、不好惹、但很有能力」。你適合需要深入調查、掌握核心資源、處理敏感事務的工作——金融、心理學、研究、投資、危機管理、偵查。你的職場優勢是穿透力和掌控力——別人只看表面，你看到底層邏輯。你不怕複雜、不怕黑暗面，這讓你在別人退縮的地方能繼續前進。行動建議：找需要深度和勇氣的崗位，表面光鮮但淺薄的工作會讓你窒息。",
    "射手座": "你的事業形象是<b>啟發者與探索家</b>。社會看你的方式是「這個人視野很開、到處跑、說話很有啟發性」。你適合跨文化、有擴展性的工作——教育、出版、旅遊、國際貿易、哲學、宗教、法律。你的職場優勢是格局大、能看到別人看不到的可能性，也能用熱情感染他人相信願景。你不適合被困在小空間裡做重複的事。行動建議：讓自己的工作保有「往外擴展」的可能——出國、跨領域、接觸新知識都是你的職場養分。",
    "摩羯座": "你的事業形象是<b>沉穩的權威與建築師</b>。社會看你的方式是「這個人很有企圖心、專業、值得尊敬」。你適合需要長期規劃、層層往上的工作——管理、工程、政治、金融、傳統產業高層。你的職場優勢是耐力和紀律，你願意花十年做到別人三年就放棄的目標。你的事業是大器晚成型——前期可能辛苦，但越到後面越穩、越高。行動建議：不要被短期不順擊倒，你的設計是越老越有力量。設定十年目標，一步一步走。",
    "水瓶座": "你的事業形象是<b>前衛的革新者</b>。社會看你的方式是「這個人想法很跳、走在前面、不走尋常路」。你適合需要創新、打破框架、服務集體的工作——科技、社會企業、新媒體、非營利組織、未來產業。你的職場優勢是原創性和對未來的嗅覺，你能看到三年後的趨勢。你不適合傳統階層嚴明的環境，你需要扁平、自由、能容許「怪點子」的工作文化。行動建議：不要試圖融入體制，找到欣賞你獨特性的組織或自己建一個。",
    "雙魚座": "你的事業形象是<b>靈性創作者與療癒者</b>。社會看你的方式是「這個人有一種說不出的氣質，很有靈性」。你適合需要感受力、想像力、同理心的工作——藝術、音樂、影像、心理諮商、靈性療癒、社會服務、護理。你的職場優勢是能感知到無形的東西——氣氛、情緒、美——並把它轉化成有形的作品或服務。你不適合純邏輯冷硬的環境。行動建議：信任你的直覺走，選擇讓你「有感覺」的工作方向，你的事業跟靈魂是連動的。"
  };
  return `<b>天頂MC在${sign.zh}</b>：天頂代表你的社會角色和事業天命——別人在公領域怎麼認識你、你適合往哪走。<br><br>${t[sign.zh]||""}`;
}

function getDSCText(sign) {
  const t = {
    "牡羊座": "你在關係中需要一個有活力、敢衝的夥伴。你被獨立自主、行動力強的人吸引——對方的果斷和勇氣能激發你走出舒適圈。你的關係課題是學會接受對方的直接和衝勁，而不是把它當成威脅。",
    "金牛座": "你在關係中需要穩定、忠誠、有安全感的夥伴。你被踏實可靠、懂得享受生活的人吸引。你的關係課題是學會信任慢慢來的節奏，不要急著改變對方。",
    "雙子座": "你在關係中需要聊得來、腦子活的夥伴。你被聰明、有趣、會溝通的人吸引。你的關係課題是接受關係中需要輕鬆和多樣性，不必每件事都很嚴肅。",
    "巨蟹座": "你在關係中需要溫暖、有情感深度的夥伴。你被會照顧人、重視家庭的人吸引。你的關係課題是允許自己被照顧，學會展現脆弱。",
    "獅子座": "你在關係中需要有光芒、有自信的夥伴。你被熱情大方、有舞台感的人吸引。你的關係課題是給對方表現的空間，學會欣賞而不是競爭。",
    "處女座": "你在關係中需要細心、靠譜、願意為關係付出實際行動的夥伴。你被務實認真的人吸引。你的關係課題是接受對方用「做事」而非「說情話」來表達愛。",
    "天秤座": "你在關係中需要有品味、懂得平衡的夥伴。你被優雅、會溝通、重視公平的人吸引。你的關係課題是學會在合作中保有自我。",
    "天蠍座": "你在關係中需要深度連結、全心投入的夥伴。你被強烈、有穿透力的人吸引。你的關係課題是學會信任和放手控制。",
    "射手座": "你在關係中需要有視野、愛自由的夥伴。你被樂觀、有理想的人吸引。你的關係課題是給彼此空間，在自由中建立承諾。",
    "摩羯座": "你在關係中需要成熟、有責任感的夥伴。你被有目標、穩重的人吸引。你的關係課題是接受關係也需要付出時間經營，不能只靠效率。",
    "水瓶座": "你在關係中需要獨立、有想法的夥伴。你被有個性、不從眾的人吸引。你的關係課題是在親密和獨立之間找到平衡。",
    "雙魚座": "你在關係中需要溫柔、有靈性的夥伴。你被敏感、有同理心的人吸引。你的關係課題是分清楚同理和失去自我的界線。"
  };
  return `<b>下降點DSC在${sign.zh}</b>：下降點代表你在親密關係中需要什麼樣的人、你被什麼特質吸引。<br><br>${t[sign.zh]||""}`;
}

function getICText(sign) {
  const t = {
    "牡羊座": "你的內在根基有一股開創的衝勁。原生家庭可能充滿競爭或強調獨立，讓你很早就學會自己來。你的安全感來自「我能靠自己」。回家充電的方式：運動、一個人做決定、不被打擾地行動。",
    "金牛座": "你的內在根基是穩定和感官滿足。原生家庭可能重視物質安全或傳統價值。你的安全感來自「有穩固的根」。回家充電的方式：好吃的、舒服的環境、接觸大自然。",
    "雙子座": "你的內在根基是好奇和交流。原生家庭可能話很多或搬家頻繁。你的安全感來自「能溝通、能理解」。回家充電的方式：看書、聊天、學新東西。",
    "巨蟹座": "你的內在根基是情感和歸屬。原生家庭對你影響極深，家的感覺是你一切的基礎。你的安全感來自「被愛、有人在乎」。回家充電的方式：待在熟悉的空間、和親近的人在一起。",
    "獅子座": "你的內在根基是被看見和自信。原生家庭可能鼓勵你表現，或你從小就需要在家中發光。你的安全感來自「我是特別的」。回家充電的方式：創作、玩樂、被讚賞。",
    "處女座": "你的內在根基是秩序和實用。原生家庭可能注重規矩或服務他人。你的安全感來自「一切在掌控中」。回家充電的方式：整理環境、照顧植物或寵物、做有用的事。",
    "天秤座": "你的內在根基是和諧和美感。原生家庭可能重視禮貌或避免衝突。你的安全感來自「環境和平」。回家充電的方式：佈置空間、聽音樂、和喜歡的人安靜待著。",
    "天蠍座": "你的內在根基是深度和隱私。原生家庭可能有秘密或情感強烈。你的安全感來自「能掌控自己的內在世界」。回家充電的方式：獨處、深入思考、不被打擾。",
    "射手座": "你的內在根基是自由和意義。原生家庭可能開放多元或與異文化有關。你的安全感來自「人生有方向」。回家充電的方式：計畫旅行、學哲學、追求精神滿足。",
    "摩羯座": "你的內在根基是責任和成就。原生家庭可能嚴格或期望很高。你的安全感來自「我有用、我做到了」。回家充電的方式：完成一件事、規劃未來、感受自己的成長。",
    "水瓶座": "你的內在根基是獨立和獨特。原生家庭可能不太傳統或你很早就覺得自己跟家裡不一樣。你的安全感來自「做自己」。回家充電的方式：跟朋友交流奇怪的想法、做自己的事。",
    "雙魚座": "你的內在根基是靈性和感受。原生家庭可能情緒流動大或有藝術氛圍。你的安全感來自「被理解、被接納」。回家充電的方式：冥想、聽音樂、泡澡、做白日夢。"
  };
  return `<b>天底IC在${sign.zh}</b>：天底代表你的內在根基、原生家庭印記、以及什麼讓你有安全感。<br><br>${t[sign.zh]||""}`;
}

function getSouthNodeText(sign) {
  const t = {
    "牡羊座": "你的靈魂舒適圈是獨立行動、自己來。前世記憶讓你習慣衝第一、不等人。這一世的課題是學會合作和考慮他人。",
    "金牛座": "你的靈魂舒適圈是穩定和物質安全。前世記憶讓你執著於擁有。這一世的課題是學會放手和接受變化。",
    "雙子座": "你的靈魂舒適圈是收集資訊、什麼都知道一點。前世記憶讓你停在表面。這一世的課題是深入學習、找到信念。",
    "巨蟹座": "你的靈魂舒適圈是照顧人、待在安全的殼裡。前世記憶讓你過度保護自己和他人。這一世的課題是走出去、承擔社會責任。",
    "獅子座": "你的靈魂舒適圈是成為焦點、被崇拜。前世記憶讓你習慣舞台中心。這一世的課題是服務群體、不只為自己。",
    "處女座": "你的靈魂舒適圈是分析、批判、追求完美。前世記憶讓你困在細節。這一世的課題是信任直覺、接受不完美。",
    "天秤座": "你的靈魂舒適圈是討好他人、維持和平。前世記憶讓你失去自我。這一世的課題是找回自己的聲音和立場。",
    "天蠍座": "你的靈魂舒適圈是掌控和深度。前世記憶讓你習慣在暗處操作。這一世的課題是簡單化、享受表面的美好。",
    "射手座": "你的靈魂舒適圈是追求宏大哲學和自由。前世記憶讓你活在理想中。這一世的課題是落地、學會傾聽和溝通。",
    "摩羯座": "你的靈魂舒適圈是工作、地位、承擔責任。前世記憶讓你過度嚴肅。這一世的課題是打開心、照顧情感需求。",
    "水瓶座": "你的靈魂舒適圈是理性和群體。前世記憶讓你保持距離。這一世的課題是勇敢表達個人熱情、站上舞台。",
    "雙魚座": "你的靈魂舒適圈是逃避和犧牲。前世記憶讓你習慣模糊邊界。這一世的課題是落地、精進技能、面對現實。"
  };
  return `<b>南交點在${sign.zh}</b>：你的靈魂舒適圈——前世帶來的天賦，也是需要放下的慣性。${t[sign.zh]||""}`;
}

function getFortuneText(sign) {
  const t = {
    "牡羊座": "你的幸運透過主動出擊來啟動。坐著等不會有好事，動起來才會遇到機會。",
    "金牛座": "你的幸運透過穩定經營來累積。耐心和堅持是你的財富密碼。",
    "雙子座": "你的幸運透過交流和學習來觸發。多認識人、多接觸新資訊就會帶來好運。",
    "巨蟹座": "你的幸運透過情感連結來啟動。照顧他人的同時，好事也會回到你身上。",
    "獅子座": "你的幸運透過自信展現來吸引。不要藏著——你越敢秀自己，機會越多。",
    "處女座": "你的幸運透過精進專業來累積。把一件事做到極致，好運自然跟上。",
    "天秤座": "你的幸運透過合作來啟動。找對夥伴、建立好關係就是你的幸運開關。",
    "天蠍座": "你的幸運透過深度投入來啟動。全力以赴做一件事，回報會超乎預期。",
    "射手座": "你的幸運透過擴展視野來觸發。旅行、學習、接觸不同文化都能帶來好運。",
    "摩羯座": "你的幸運透過長期規劃來實現。有紀律地朝目標前進，時間會給你答案。",
    "水瓶座": "你的幸運透過創新和社群來啟動。做別人沒做過的事，加入有意義的群體。",
    "雙魚座": "你的幸運透過直覺和信任來觸發。跟著感覺走，宇宙會在你放鬆時送禮。"
  };
  return `<b>福點在${sign.zh}</b>：福點代表你此生最容易感到幸福和豐盛的領域。${t[sign.zh]||""}`;
}

function getUranusText(sign) {
  const t = { "牡羊座":"你跟別人不一樣的地方在於行動模式——你做事的節奏和方法總是出人意料，不按牌理出牌反而是你的優勢。","金牛座":"你跟別人不一樣的地方在於對物質的態度——傳統的賺錢存錢模式不適合你，你需要找到非典型的財務路線。","雙子座":"你跟別人不一樣的地方在於思考方式——你的腦袋接收資訊的方式跟主流不同，這是獨創性的來源。","巨蟹座":"你跟別人不一樣的地方在於「家」的定義——傳統家庭模式可能不適合你，你需要重新定義什麼叫歸屬感。","獅子座":"你跟別人不一樣的地方在於自我表達——你展現自己的方式獨特且前衛，有可能成為時代的先驅。","處女座":"你跟別人不一樣的地方在於工作方法——你用自己的系統做事，雖然別人看不懂但效率驚人。","天秤座":"你跟別人不一樣的地方在於經營關係——你的社交模式不走傳統路線，更重視真實而非禮數。","天蠍座":"你跟別人不一樣的地方在於面對深層議題的方式——別人逃避的你直視，這是你轉化的超能力。","射手座":"你跟別人不一樣的地方在於追求自由和意義的方式——你對「有意義的人生」有自己獨到的定義，不接受現成的答案。","摩羯座":"你跟別人不一樣的地方在於建構事業的方式——傳統的升遷路徑不適合你，你會走出自己的路。","水瓶座":"天王星守護水瓶，力量加倍——你的獨特性是天生的、深層的。你就是跟別人不一樣，而且這種不同是你最大的禮物。","雙魚座":"你跟別人不一樣的地方在於靈性直覺——你對看不見的世界有異於常人的感知能力。" };
  return `<b>天王星在${sign.zh}</b>（世代行星，重點看宮位）：${t[sign.zh]||""}`;
}

function getNeptuneText(sign) {
  const t = { "牡羊座":"你的靈感和迷惑來自行動和競爭領域。你這一代人容易理想化「勇敢」和「獨立」，也可能在追求自由時迷失方向。","金牛座":"你的靈感和迷惑來自物質和感官。你這一代人對金錢和舒適有不切實際的幻想，也能透過感官體驗連結靈性。","雙子座":"你的靈感和迷惑來自資訊和溝通。你這一代人容易被資訊洪流淹沒，也能在多元觀點中找到靈性真理。","巨蟹座":"你的靈感和迷惑來自家庭和情感。你這一代人對「完美的家」有浪漫幻想，也能用直覺深度照顧他人。","獅子座":"你的靈感和迷惑來自創作和舞台。你這一代人對名氣和認可有幻想，也能透過創作表達靈性。","處女座":"你的靈感和迷惑來自工作和健康。你這一代人對完美生活有不切實際的追求，也能在日常中體悟靈性。","天秤座":"你的靈感和迷惑來自關係和美。你這一代人對愛情有過度浪漫的投射，也能在藝術中找到靈魂的共鳴。","天蠍座":"你的靈感和迷惑來自深層心理。你這一代人對神秘事物特別著迷，直覺力極強但也容易被強烈情緒帶走。","射手座":"你的靈感和迷惑來自哲學和遠方。你這一代人渴望找到人生的「終極意義」，容易被玄學或宗教吸引，也可能在追求意義的路上找到真正的靈性智慧。","摩羯座":"你的靈感和迷惑來自權力和制度。你這一代人對成功有不切實際的幻想，也能用靈性視角重新定義什麼是成就。","水瓶座":"你的靈感和迷惑來自科技和集體。你這一代人可能迷失在網路虛擬世界中，也能透過科技傳遞靈性訊息。","雙魚座":"海王星守護雙魚，力量極強——你這一代人靈性感知極為敏銳，但也容易逃避現實。邊界感是你們的集體功課。" };
  return `<b>海王星在${sign.zh}</b>（世代行星，重點看宮位）：${t[sign.zh]||""}`;
}

function getPlutoText(sign) {
  const t = { "牡羊座":"你們這一代人在「自我」和「個人力量」的議題上經歷深層轉化。學會正確使用個人意志力是集體課題。","金牛座":"你們這一代人在「金錢」和「價值觀」上經歷徹底重建。什麼是真正有價值的——這一代會重新定義。","雙子座":"你們這一代人在「資訊」和「溝通」上經歷徹底轉型。媒體和知識的運作方式會被你們顛覆。","巨蟹座":"你們這一代人在「家庭」和「歸屬感」上經歷重建。家庭結構和情感連結的定義會被你們改寫。","獅子座":"你們這一代人在「自我表達」和「權力」上經歷轉化。你們重新定義什麼是領導力、什麼是創造力。","處女座":"你們這一代人在「健康」和「工作模式」上經歷革命。身心靈整合、工作型態的轉變是你們帶來的。","天秤座":"你們這一代人在「關係」和「公平」上經歷深層變革。婚姻制度、性別平等的議題被你們推向新的層次。","天蠍座":"冥王星守護天蠍，力量頂點——你們這一代人是真正的轉化者。生死、權力、性、心理深層議題是你們的集體主題。你們不怕黑暗因為你們就在黑暗中重生。","射手座":"你們這一代人在「信仰」和「真理」上經歷瓦解重建。傳統宗教、教育體系、國際秩序——都被你們重新質疑和重塑。","摩羯座":"你們這一代人在「制度」和「權威」上經歷徹底轉型。政府、企業、社會結構的老舊模式被你們推倒重建。","水瓶座":"你們這一代人在「科技」和「集體意識」上帶來革命性改變。AI、去中心化、新型社群——這些是你們的集體使命。","雙魚座":"你們這一代人在「靈性」和「同理心」上經歷深層進化。集體潛意識的覺醒、慈悲的力量重建是你們的主題。" };
  return `<b>冥王星在${sign.zh}</b>（世代行星，重點看宮位）：${t[sign.zh]||""}`;
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

  const rows = aspects.map((a, idx) => {
    const strength = parseFloat(a.exactDelta) < 2 ? '（精準相位⚡）' : '';
    const detail = getAspectDetail(a);
    const detailId = `aspect-${idx}`;
    return `<div style="border-bottom:1px solid rgba(255,255,255,.04);">
      <div style="display:flex;align-items:center;gap:8px;padding:8px 0;cursor:pointer;" onclick="const el=document.getElementById('${detailId}');el.style.display=el.style.display==='none'?'block':'none';">
        <span style="font-weight:600;min-width:60px;">${a.planet1.symbol}${a.planet1.zh}</span>
        <span style="color:var(--accent);font-size:1.1rem;">${a.type.symbol}</span>
        <span style="font-weight:600;min-width:60px;">${a.planet2.symbol}${a.planet2.zh}</span>
        <span style="color:var(--muted);font-size:.8rem;">${a.type.name}（${a.type.meaning}）${strength}</span>
      </div>
      <div id="${detailId}" style="display:none;padding:8px 12px 12px;background:rgba(123,108,246,.08);border-radius:8px;margin-bottom:6px;font-size:.85rem;line-height:1.7;color:var(--text);">
        ${detail}
      </div>
    </div>`;
  }).join('');

  return `
    <h3>🔗 主要相位</h3>
    <p style="font-size:.8rem;color:var(--muted);margin:0 0 8px;">點擊查看具體解讀 ▼</p>
    ${rows}
  `;
}

/** 取得相位的具體解讀 */
function getAspectDetail(aspect) {
  const p1 = aspect.planet1.zh;
  const p2 = aspect.planet2.zh;
  const type = aspect.type.name;
  
  // 先查有沒有專屬組合解讀
  const combo = getComboDetail(p1, p2, type);
  if (combo) return combo;
  
  // 通用模板
  const energies = {
    '太陽': '核心自我、意志力',
    '月亮': '情緒、安全感',
    '水星': '思考、溝通',
    '金星': '愛情、價值觀',
    '火星': '行動力、慾望',
    '木星': '擴展、幸運',
    '土星': '責任、功課',
    '天王星': '突破、獨特性',
    '海王星': '靈性、想像力',
    '冥王星': '轉化、深層力量',
  };
  
  const aspectEffect = {
    '合': `<b>${p1}與${p2}融合</b>：這兩股能量在你身上合為一體。${energies[p1]||p1}和${energies[p2]||p2}不分彼此地一起運作。`,
    '對沖': `<b>${p1}與${p2}互補拉扯</b>：${energies[p1]||p1}和${energies[p2]||p2}形成張力，需要你學會平衡。這不是壞事，克服的人更有深度。`,
    '三合': `<b>${p1}與${p2}和諧天賦</b>：${energies[p1]||p1}和${energies[p2]||p2}自然配合，是你輕鬆就能發揮的領域。`,
    '四分': `<b>${p1}與${p2}成長動力</b>：${energies[p1]||p1}和${energies[p2]||p2}有摩擦，但正是這份張力推動你成長。`,
    '六合': `<b>${p1}與${p2}輕鬆配合</b>：${energies[p1]||p1}和${energies[p2]||p2}之間有自然的機會，主動去用它。`,
  };
  
  let bonus = '';
  if (p2==='土星' || p1==='土星') bonus += '<br><br>🪨 土星相位：需要耐心修煉的領域，30歲後逐漸看到成果。';
  if (p2==='天王星' || p1==='天王星') bonus += '<br><br>⚡ 天王星相位：你與眾不同的地方，可能帶來突然的改變或獨特才能。';
  
  return (aspectEffect[type] || `${p1}和${p2}之間有${type}的能量互動。`) + bonus;
}

/** 常見行星組合的專屬解讀 */
function getComboDetail(p1, p2, type) {
  const key = `${p1}_${p2}_${type}`;
  const key2 = `${p2}_${p1}_${type}`;
  
  const combos = {
    // 日月相位
    '太陽_月亮_合': '日月合相（新月人）：你的意志和情感高度一致，目標明確、內外統一。你知道自己要什麼，而且頭和心說同一件事。優勢是專注力極強，適合創業和開創新局。',
    '太陽_月亮_對沖': '日月對沖（滿月人）：你的理性和感性常常拔河。頭說「應該」但心說「我想要」。這份內在張力讓你能看見事物的兩面，也讓你比一般人更有包容力。學會不二選一而是兩者兼容，是你的人生功課。',
    '太陽_月亮_四分': '日月四分（半月人）：你的內在有持續的動力在推動你改變現狀。想要的和需要的有落差，但這份不滿足感正是你前進的燃料。你比一般人更有動力去打破現狀、創造新局。',
    '太陽_月亮_三合': '日月三合：你的意志和情緒自然和諧，做決定時頭和心能配合。壓力下依然穩定，別人會覺得你「很做自己」。善用這份內在一致性，在需要果斷的時候你比別人更有優勢。',
    
    // 水星組合
    '水星_土星_合': '水星合土星：你的思考嚴謹、有深度、有紀律。說出來的話有份量，別人會當真。你不會講廢話，但有時候太嚴肅。適合做需要精確和邏輯的工作 — 分析、法律、策略規劃。30歲後溝通能力會越來越被認可。',
    '水星_天王星_合': '水星合天王星：你的腦袋跟別人不一樣 — 想法超前、直覺型思考、常有別人沒想到的切入角度。適合科技、創新、研究。缺點是別人可能跟不上你的思路，學會把想法翻譯成大家聽得懂的話。',
    '月亮_水星_三合': '月亮三合水星：你的感受和表達自然連結 — 能把情緒清楚地說出來，也能用文字觸動人心。適合寫作、諮商、教學。你的溝通帶有溫度，讓人覺得被理解。',
    
    // 火星組合
    '火星_天王星_合': '火星合天王星：你的行動模式「不按牌理出牌」。做事方式跟別人不一樣，有時候突然爆發驚人的能量。適合需要獨創性和快速反應的工作。⚠️ 注意衝動，特別是生氣的時候。把這股爆發力導向創新而非破壞。',
    '火星_土星_合': '火星合土星：行動力搭配紀律 — 你能為目標持續努力很久。不是爆發型而是馬拉松型。適合需要長期堅持的事業。年輕時可能覺得被壓抑，但30歲後你的執行力會超越大部分人。',
    
    // 土冥組合（世代相位但個人也有感）
    '土星_冥王星_合': '土星合冥王星：這是你們這一代（1982-1983年出生）共有的印記。代表面對權力結構的轉變 — 你們經歷了社會制度從舊到新的過渡期。個人層面：你對「權力」和「控制」的議題特別敏感，人生中會經歷組織/制度的重大變革。你有能力在困難中建立新秩序。',
    
    // 月亮組合
    '月亮_土星_三合': '月亮三合土星：你的情緒穩定而有紀律。面對壓力時你能保持冷靜，不會被情緒沖走。別人覺得你很成熟、很可靠。適合需要情緒穩定度的角色 — 管理、危機處理、長期照顧工作。',
    '月亮_海王星_對沖': '月亮對沖海王星：你的感受力極強，容易吸收周遭的情緒。有時候分不清哪些感覺是自己的、哪些是別人的。天賦：極強的同理心和藝術感受力。功課：建立清晰的情緒邊界，定期淨化自己的能量場。',
    '月亮_冥王星_三合': '月亮三合冥王星：你的情感深度超乎常人，能感知到表面之下的暗流。這讓你對人性有深刻的理解。適合心理學、療癒、危機諮商。你的直覺在情感領域特別準，信任它。',
  };
  
  return combos[key] || combos[key2] || null;
}

function getHouseDirection(house) {
  const d = ['',
    `<b>1宮（自我）</b>：這股能量直接寫在你臉上，是別人第一眼就感受到的你。你不需要刻意表現——它就是你日常的樣子。`,
    `<b>2宮（資源）</b>：這股能量直接跟你賺錢的方式有關。它是你的生財工具——用對了就是源源不絕的收入來源。`,
    `<b>3宮（溝通）</b>：這股能量展現在你的日常對話、寫作、學習中。你說話的方式、思考的角度帶有這個色彩。自媒體、教學、寫作都是你的舞台。`,
    `<b>4宮（家庭/根基）</b>：這股能量跟你的家、你的根有關。你的原生家庭、居住環境、內在安全感都帶有這個印記。你「回到家」的感覺跟別人不一樣。`,
    `<b>5宮（創造/快樂）</b>：這股能量在你做開心的事時被啟動——創作、戀愛、玩樂、任何讓你「進入心流」的活動。追求快樂是你啟動這股力量的鑰匙。`,
    `<b>6宮（日常/健康）</b>：這股能量要在每天的工作和身體習慣中落實。你的日常routine、工作方式、照顧身體的方式都帶有這個色彩。把它變成習慣，不是偶爾想到才做。`,
    `<b>7宮（伴侶/合作）</b>：這股能量在一對一關係中最強烈——不只愛情，也包括商業夥伴。你會吸引到帶有這種能量的人，或在關係中被激發出這一面。`,
    `<b>8宮（深層/共享資源）</b>：這股能量在深層轉化的時刻被啟動——面對生死議題、管理別人的錢、親密關係中的脆弱時刻。你在「不得不面對」的時刻最強大。`,
    `<b>9宮（遠方/信念）</b>：這股能量推你往更遠的地方走——出國、進修、跨文化交流、建立人生哲學。你的世界觀和信仰帶有這個色彩。`,
    `<b>10宮（事業/公眾形象）</b>：這股能量直接影響你的事業方向和公眾看你的眼光。它是你的職場王牌——大膽用它往頂峰走。`,
    `<b>11宮（社群/理想）</b>：這股能量在團體和社群中被放大。你在朋友圈、社群、組織中扮演的角色帶有這個印記。經營人脈和加入社群是啟動它的方式。`,
    `<b>12宮（潛意識/幕後）</b>：這股能量在幕後和獨處時運作。別人可能看不見，但你自己知道它在。靈性修行、獨處創作、療癒工作是你啟動它的方式。`,
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
