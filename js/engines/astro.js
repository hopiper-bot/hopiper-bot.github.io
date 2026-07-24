/**
 * astro.js — 西洋星座引擎（完整星盤）
 * 計算十大星體 + 12 宮位（Equal House）
 */

import {
  julianDay, sunLongitude, moonLongitude, ascendant, longitudeToSign,
  mercuryLongitude, venusLongitude, marsLongitude,
  jupiterLongitude, saturnLongitude,
  uranusLongitude, neptuneLongitude, plutoLongitude,
  northNodeLongitude
} from '../lib/ephemeris.js';
import { normalizeDeg } from '../lib/utils.js';
import { SIGNS } from '../data/astro-text.js';

/** 行星資料 */
const PLANETS = [
  { id: 'sun', zh: '太陽', symbol: '☉', calcFn: sunLongitude },
  { id: 'moon', zh: '月亮', symbol: '☽', calcFn: moonLongitude },
  { id: 'mercury', zh: '水星', symbol: '☿', calcFn: mercuryLongitude },
  { id: 'venus', zh: '金星', symbol: '♀', calcFn: venusLongitude },
  { id: 'mars', zh: '火星', symbol: '♂', calcFn: marsLongitude },
  { id: 'jupiter', zh: '木星', symbol: '♃', calcFn: jupiterLongitude },
  { id: 'saturn', zh: '土星', symbol: '♄', calcFn: saturnLongitude },
  { id: 'uranus', zh: '天王星', symbol: '♅', calcFn: uranusLongitude },
  { id: 'neptune', zh: '海王星', symbol: '♆', calcFn: neptuneLongitude },
  { id: 'pluto', zh: '冥王星', symbol: '♇', calcFn: plutoLongitude },
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

    const data = {
      planets,
      northNode,
      ascendant: ascData,
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
  const { planets, northNode, ascendant: asc } = data;
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
      </div>
    </div>

    <h3>📋 星體位置表</h3>
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
          ${planets.map(p => renderPlanetRow(p)).join('')}
          ${renderPlanetRow(northNode)}
        </tbody>
      </table>
    </div>

    <div class="divider"></div>
    ${renderThreeBig(data)}
    <div class="divider"></div>
    ${renderElementSummary(planets)}

    <div class="note">💡 使用等宮制（Equal House），以上升點為 1 宮頭，每宮 30°。行星位置基於 Jean Meeus 天文演算法，精度：太陽 ±0.01°、月亮 ±0.5°、外行星 ±1°。</div>
  `;
}

function renderPlanetRow(planet) {
  const signColor = elementColor(planet.sign.elementEn);
  return `
    <tr style="border-bottom:1px solid rgba(255,255,255,.05);">
      <td style="padding:8px 6px;font-weight:600;">${planet.symbol} ${planet.zh}</td>
      <td style="padding:8px 6px;"><span class="tag tag-${signColor}" style="font-size:.75rem;">${planet.sign.zh}</span></td>
      <td style="padding:8px 6px;font-family:monospace;font-size:.85rem;">${planet.degreeStr}</td>
      <td style="padding:8px 6px;">${planet.house}宮</td>
    </tr>
  `;
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

function elementColor(element) {
  switch (element) {
    case 'fire': return 'red';
    case 'earth': return 'yellow';
    case 'air': return 'white';
    case 'water': return 'blue';
    default: return 'white';
  }
}
