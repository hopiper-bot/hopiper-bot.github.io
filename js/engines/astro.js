/**
 * astro.js — 西洋星座引擎
 * 計算太陽星座、月亮星座、上升星座
 */

import { julianDay, sunLongitude, moonLongitude, ascendant, longitudeToSign } from '../lib/ephemeris.js';
import { SIGNS } from '../data/astro-text.js';

/**
 * 計算星座結果
 * @param {{year, month, day, hour, minute, lat, lng, utcOffset}} birthData
 * @returns {{status: string, data: object|null, html: string, error: string|null}}
 */
export function calculate(birthData) {
  const { year, month, day, hour, minute, lat, lng, utcOffset } = birthData;

  try {
    // 計算 Julian Day
    const jd = julianDay(year, month, day, hour, minute, utcOffset);

    // 太陽黃道經度 → 星座
    const sunLon = sunLongitude(jd);
    const sunSignIdx = longitudeToSign(sunLon);

    // 月亮黃道經度 → 星座
    const moonLon = moonLongitude(jd);
    const moonSignIdx = longitudeToSign(moonLon);

    // 上升點黃道經度 → 星座
    const ascLon = ascendant(jd, lat, lng);
    const risingSignIdx = longitudeToSign(ascLon);

    const data = {
      sun: { sign: SIGNS[sunSignIdx], degree: sunLon, signIdx: sunSignIdx },
      moon: { sign: SIGNS[moonSignIdx], degree: moonLon, signIdx: moonSignIdx },
      rising: { sign: SIGNS[risingSignIdx], degree: ascLon, signIdx: risingSignIdx },
    };

    const html = renderAstro(data);
    return { status: 'ok', data, html, error: null };
  } catch (err) {
    return { status: 'error', data: null, html: '', error: `星座計算錯誤：${err.message}` };
  }
}

// === 渲染 ===

function renderAstro(data) {
  const { sun, moon, rising } = data;

  return `
    <div class="sig">
      <div class="kin">你的星盤三巨頭</div>
      <div class="big">${sun.sign.symbol} ${sun.sign.zh} / ${moon.sign.symbol} ${moon.sign.zh} / ${rising.sign.symbol} ${rising.sign.zh}</div>
      <div style="display:flex;justify-content:center;gap:12px;margin-top:10px;flex-wrap:wrap;">
        <span class="tag tag-${elementColor(sun.sign.elementEn)}">☀️ 太陽${sun.sign.zh}</span>
        <span class="tag tag-${elementColor(moon.sign.elementEn)}">🌙 月亮${moon.sign.zh}</span>
        <span class="tag tag-${elementColor(rising.sign.elementEn)}">⬆️ 上升${rising.sign.zh}</span>
      </div>
    </div>

    ${renderSign("☀️ 太陽星座", "你的核心自我", sun)}
    <div class="divider"></div>
    ${renderSign("🌙 月亮星座", "你的內在情緒", moon)}
    <div class="divider"></div>
    ${renderSign("⬆️ 上升星座", "你的外在面具", rising)}
    <div class="divider"></div>
    ${renderElementSummary(data)}

    <div class="note">💡 太陽 = 你的核心意志（30歲後越來越明顯）；月亮 = 你的情緒需求和安全感來源；上升 = 別人第一眼看見的你。三者合看才是完整的你。</div>
  `;
}

function renderSign(title, subtitle, signData) {
  const { sign, degree } = signData;
  const degInSign = (degree % 30).toFixed(1);
  const text = title.includes("太陽") ? sign.sun :
               title.includes("月亮") ? sign.moon : sign.rising;

  return `
    <h3>${title}：${sign.zh}（${sign.en}）</h3>
    <p style="font-size:.85rem;color:var(--muted);margin:0 0 8px;">${subtitle} · ${sign.element}象${sign.modality}星座 · ${degInSign}°</p>
    <p class="meaning">${text}</p>
  `;
}

function renderElementSummary(data) {
  const elements = { fire: 0, earth: 0, air: 0, water: 0 };
  [data.sun, data.moon, data.rising].forEach(s => {
    elements[s.sign.elementEn]++;
  });

  const elementZh = { fire: "🔥 火", earth: "🌍 土", air: "💨 風", water: "💧 水" };
  let dominant = Object.entries(elements).filter(([_, v]) => v >= 2);

  let summary = '';
  if (dominant.length > 0) {
    const domNames = dominant.map(([k]) => elementZh[k]).join("、");
    summary = `你的三巨頭以<span class="kw">${domNames}元素</span>為主導。`;
    if (dominant[0][0] === 'fire') summary += "這代表你的行動力和熱情是核心驅動力，做事果斷、有衝勁。";
    else if (dominant[0][0] === 'earth') summary += "這代表你務實穩定，重視安全感和實際成果。";
    else if (dominant[0][0] === 'air') summary += "這代表你重視思考和溝通，善於分析和建立連結。";
    else if (dominant[0][0] === 'water') summary += "這代表你情感豐富、直覺敏銳，擅長感知他人。";
  } else {
    summary = "你的三巨頭涵蓋三種不同元素——你是多面向的人，能在不同情境中靈活切換。";
  }

  return `
    <h3>🌍 元素分佈</h3>
    <p class="meaning">${summary}</p>
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
