/**
 * planets.js — 行星地心黃道經度計算
 * 使用 Meeus《Astronomical Algorithms》的方法
 * 內行星(水星/金星)：日心座標→地心座標轉換
 * 外行星(火木土天海冥)：直接地心近似
 */

import { normalizeDeg, sinDeg, cosDeg, atan2Deg } from './utils.js';
import { sunLongitude } from './ephemeris.js';

/**
 * 行星軌道要素 (J2000 epoch)
 * L = 平經度, a = 半長軸(AU), e = 離心率, i = 軌道傾角
 * omega = 近日點經度, Omega = 升交點經度
 * 各值用 T（世紀）的多項式
 */

function jdToJC(jd) { return (jd - 2451545.0) / 36525.0; }

/**
 * 計算行星日心黃道座標 (longitude, latitude, radius)
 * 然後轉為地心黃道經度
 */

// === 水星地心黃道經度 ===
export function mercuryGeoLon(jd) {
  const T = jdToJC(jd);
  
  // 水星軌道要素
  const L = normalizeDeg(252.250906 + 149474.0722491 * T + 0.00030350 * T * T);
  const a = 0.387098310;
  const e = 0.20563175 + 0.000020407 * T;
  const i_deg = 7.004986 - 0.0059516 * T;
  const omega = normalizeDeg(77.456119 + 0.1588643 * T); // longitude of perihelion
  const Omega = normalizeDeg(48.330893 - 0.1254615 * T); // ascending node

  // 平近點角
  const M = normalizeDeg(L - omega);
  
  // 真近點角 (用 Kepler equation 迭代)
  const E = solveKepler(M, e);
  const nu = trueAnomaly(E, e);
  
  // 日心黃道經度 (近似: 忽略軌道傾角的影響)
  const helioLon = normalizeDeg(nu + omega);
  
  // 日心距離
  const r = a * (1 - e * e) / (1 + e * cosDeg(nu));
  
  // 地球的日心位置
  const earthLon = normalizeDeg(sunLongitude(jd) + 180); // 太陽的對面 = 地球日心經度
  const R = 1.000001018; // 地球平均距離 (AU)，簡化
  
  // 地心黃道經度 (平面近似，忽略緯度)
  const x = r * cosDeg(helioLon) - R * cosDeg(earthLon);
  const y = r * sinDeg(helioLon) - R * sinDeg(earthLon);
  
  return normalizeDeg(atan2Deg(y, x));
}

// === 金星地心黃道經度 ===
export function venusGeoLon(jd) {
  const T = jdToJC(jd);
  
  const L = normalizeDeg(181.979801 + 58519.2130302 * T + 0.00031014 * T * T);
  const a = 0.723329820;
  const e = 0.00677192 - 0.000047765 * T;
  const omega = normalizeDeg(131.563703 + 0.0048746 * T);
  const Omega = normalizeDeg(76.679920 - 0.2780134 * T);
  
  const M = normalizeDeg(L - omega);
  const E = solveKepler(M, e);
  const nu = trueAnomaly(E, e);
  
  const helioLon = normalizeDeg(nu + omega);
  const r = a * (1 - e * e) / (1 + e * cosDeg(nu));
  
  const earthLon = normalizeDeg(sunLongitude(jd) + 180);
  const R = 1.000001018;
  
  const x = r * cosDeg(helioLon) - R * cosDeg(earthLon);
  const y = r * sinDeg(helioLon) - R * sinDeg(earthLon);
  
  return normalizeDeg(atan2Deg(y, x));
}

// === 火星地心黃道經度 ===
export function marsGeoLon(jd) {
  const T = jdToJC(jd);
  
  const L = normalizeDeg(355.433000 + 19141.6964471 * T + 0.00031052 * T * T);
  const a = 1.523679342;
  const e = 0.09340065 + 0.000090484 * T;
  const omega = normalizeDeg(336.060234 + 0.4439016 * T);
  
  const M = normalizeDeg(L - omega);
  const E = solveKepler(M, e);
  const nu = trueAnomaly(E, e);
  
  const helioLon = normalizeDeg(nu + omega);
  const r = a * (1 - e * e) / (1 + e * cosDeg(nu));
  
  const earthLon = normalizeDeg(sunLongitude(jd) + 180);
  const R = 1.000001018;
  
  const x = r * cosDeg(helioLon) - R * cosDeg(earthLon);
  const y = r * sinDeg(helioLon) - R * sinDeg(earthLon);
  
  return normalizeDeg(atan2Deg(y, x));
}

// === 木星地心黃道經度 ===
export function jupiterGeoLon(jd) {
  const T = jdToJC(jd);
  
  const L = normalizeDeg(34.351519 + 3036.3027748 * T + 0.00022330 * T * T);
  const a = 5.202603209 + 0.0000001913 * T;
  const e = 0.04849793 + 0.000163225 * T;
  const omega = normalizeDeg(14.331207 + 0.2155209 * T);
  
  const M = normalizeDeg(L - omega);
  const E = solveKepler(M, e);
  const nu = trueAnomaly(E, e);
  
  const helioLon = normalizeDeg(nu + omega);
  const r = a * (1 - e * e) / (1 + e * cosDeg(nu));
  
  const earthLon = normalizeDeg(sunLongitude(jd) + 180);
  const R = 1.000001018;
  
  const x = r * cosDeg(helioLon) - R * cosDeg(earthLon);
  const y = r * sinDeg(helioLon) - R * sinDeg(earthLon);
  
  return normalizeDeg(atan2Deg(y, x));
}

// === 土星地心黃道經度 ===
export function saturnGeoLon(jd) {
  const T = jdToJC(jd);
  
  const L = normalizeDeg(50.077444 + 1223.5110686 * T + 0.00051908 * T * T);
  const a = 9.554909192 - 0.0000021390 * T;
  const e = 0.05554814 - 0.000346641 * T;
  const omega = normalizeDeg(93.057237 + 0.5665415 * T);
  
  const M = normalizeDeg(L - omega);
  const E = solveKepler(M, e);
  const nu = trueAnomaly(E, e);
  
  const helioLon = normalizeDeg(nu + omega);
  const r = a * (1 - e * e) / (1 + e * cosDeg(nu));
  
  const earthLon = normalizeDeg(sunLongitude(jd) + 180);
  const R = 1.000001018;
  
  const x = r * cosDeg(helioLon) - R * cosDeg(earthLon);
  const y = r * sinDeg(helioLon) - R * sinDeg(earthLon);
  
  return normalizeDeg(atan2Deg(y, x));
}

// === 天王星地心黃道經度 ===
export function uranusGeoLon(jd) {
  const T = jdToJC(jd);
  
  const L = normalizeDeg(314.055005 + 429.8640561 * T + 0.00030390 * T * T);
  const a = 19.218446062 - 0.0000000372 * T;
  const e = 0.04638122 - 0.000027293 * T;
  const omega = normalizeDeg(173.005291 + 0.0893212 * T);
  
  const M = normalizeDeg(L - omega);
  const E = solveKepler(M, e);
  const nu = trueAnomaly(E, e);
  
  const helioLon = normalizeDeg(nu + omega);
  const r = a * (1 - e * e) / (1 + e * cosDeg(nu));
  
  const earthLon = normalizeDeg(sunLongitude(jd) + 180);
  const R = 1.000001018;
  
  const x = r * cosDeg(helioLon) - R * cosDeg(earthLon);
  const y = r * sinDeg(helioLon) - R * sinDeg(earthLon);
  
  return normalizeDeg(atan2Deg(y, x));
}

// === 海王星地心黃道經度 ===
export function neptuneGeoLon(jd) {
  const T = jdToJC(jd);
  
  const L = normalizeDeg(304.348665 + 219.8833092 * T + 0.00030882 * T * T);
  const a = 30.110386869 - 0.0000001663 * T;
  const e = 0.00945575 + 0.000006064 * T;
  const omega = normalizeDeg(48.120276 + 0.0291866 * T);
  
  const M = normalizeDeg(L - omega);
  const E = solveKepler(M, e);
  const nu = trueAnomaly(E, e);
  
  const helioLon = normalizeDeg(nu + omega);
  const r = a * (1 - e * e) / (1 + e * cosDeg(nu));
  
  const earthLon = normalizeDeg(sunLongitude(jd) + 180);
  const R = 1.000001018;
  
  const x = r * cosDeg(helioLon) - R * cosDeg(earthLon);
  const y = r * sinDeg(helioLon) - R * sinDeg(earthLon);
  
  return normalizeDeg(atan2Deg(y, x));
}

// === 冥王星地心黃道經度（低精度） ===
export function plutoGeoLon(jd) {
  const T = jdToJC(jd);
  
  // 冥王星軌道極不規則，用簡化近似
  const L = normalizeDeg(238.956785 + 145.1780752 * T);
  const a = 39.48168677;
  const e = 0.24880766 + 0.00006465 * T;
  const omega = normalizeDeg(224.066930 + 0.0041013 * T);
  
  const M = normalizeDeg(L - omega);
  const E = solveKepler(M, e);
  const nu = trueAnomaly(E, e);
  
  const helioLon = normalizeDeg(nu + omega);
  const r = a * (1 - e * e) / (1 + e * cosDeg(nu));
  
  const earthLon = normalizeDeg(sunLongitude(jd) + 180);
  const R = 1.000001018;
  
  const x = r * cosDeg(helioLon) - R * cosDeg(earthLon);
  const y = r * sinDeg(helioLon) - R * sinDeg(earthLon);
  
  return normalizeDeg(atan2Deg(y, x));
}

// === 輔助函式 ===

/**
 * 解 Kepler 方程: M = E - e*sin(E)
 * 用 Newton-Raphson 迭代
 * @param {number} M - 平近點角 (degrees)
 * @param {number} e - 離心率
 * @returns {number} E - 偏近點角 (degrees)
 */
function solveKepler(M, e) {
  const M_rad = M * Math.PI / 180;
  let E = M_rad; // 初始值
  
  for (let i = 0; i < 15; i++) {
    const dE = (M_rad - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  
  return E * 180 / Math.PI;
}

/**
 * 從偏近點角計算真近點角
 * @param {number} E - 偏近點角 (degrees)
 * @param {number} e - 離心率
 * @returns {number} nu - 真近點角 (degrees)
 */
function trueAnomaly(E, e) {
  const E_rad = E * Math.PI / 180;
  const y = Math.sqrt(1 + e) * Math.sin(E_rad / 2);
  const x = Math.sqrt(1 - e) * Math.cos(E_rad / 2);
  return normalizeDeg(2 * Math.atan2(y, x) * 180 / Math.PI);
}
