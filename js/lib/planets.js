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

/**
 * 計算地球到太陽距離 R（AU）— 地球軌道是橢圓
 */
function earthRadius(jd) {
  const T = jdToJC(jd);
  const M = normalizeDeg(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T);
  const e = 0.016708634 - 0.000042037 * T;
  // R = a(1-e²)/(1+e*cos(v)) ≈ 1 - e*cos(M) 簡化
  // 更精確的版本：
  const C = (1.914602 - 0.004817 * T) * sinDeg(M)
    + 0.019993 * sinDeg(2 * M);
  const v = M + C; // 真近點角（近似）
  return 1.000001018 * (1 - e * e) / (1 + e * cosDeg(v));
}

/**
 * 通用地心經度計算（含地球橢圓軌道修正）
 */
function helioToGeo(jd, helioLon, r) {
  const earthLon = normalizeDeg(sunLongitude(jd) + 180);
  const R = earthRadius(jd);
  const x = r * cosDeg(helioLon) - R * cosDeg(earthLon);
  const y = r * sinDeg(helioLon) - R * sinDeg(earthLon);
  return normalizeDeg(atan2Deg(y, x));
}

// === 水星地心黃道經度（含軌道傾角投影 + 攝動修正） ===
export function mercuryGeoLon(jd) {
  const T = jdToJC(jd);
  
  const L = normalizeDeg(252.250906 + 149474.0722491 * T + 0.00030350 * T * T);
  const a = 0.387098310;
  const e = 0.20563175 + 0.000020407 * T;
  const omega = normalizeDeg(77.456119 + 0.1588643 * T);
  const i_rad = (7.00487 - 0.00594 * T) * Math.PI / 180;
  const node = normalizeDeg(48.3309 + 1.1862 * T);

  const M = normalizeDeg(L - omega);
  const E = solveKepler(M, e);
  const nu = trueAnomaly(E, e);
  const r = a * (1 - e * e) / (1 + e * cosDeg(nu));
  
  // 含軌道傾角的日心黃道經度
  const argPeri = normalizeDeg(omega - node);
  const u = argPeri + nu;
  const helioLon = normalizeDeg(node + atan2Deg(sinDeg(u) * Math.cos(i_rad), cosDeg(u)));
  
  const geo = helioToGeo(jd, helioLon, r);
  // 攝動修正
  const dL = 1.5100 * sinDeg(M + (-44.0));
  return normalizeDeg(geo + dL);
}

// === 金星地心黃道經度 ===
export function venusGeoLon(jd) {
  const T = jdToJC(jd);
  
  const L = normalizeDeg(181.979801 + 58519.2130302 * T + 0.00031014 * T * T);
  const a = 0.723329820;
  const e = 0.00677192 - 0.000047765 * T;
  const omega = normalizeDeg(131.563703 + 0.0048746 * T);
  
  const M = normalizeDeg(L - omega);
  const E = solveKepler(M, e);
  const nu = trueAnomaly(E, e);
  
  const helioLon = normalizeDeg(nu + omega);
  const r = a * (1 - e * e) / (1 + e * cosDeg(nu));
  
  return helioToGeo(jd, helioLon, r);
}

// === 火星地心黃道經度（含木星攝動） ===
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
  
  // 木星攝動
  const Mj = normalizeDeg(20.020564 + 3034.6874893 * T);
  const Mm = M;
  const dL = 0.584 * sinDeg(2 * Mj - Mm - 41.0)
           + 0.048 * sinDeg(Mj + 32.0);
  const helioLon2 = normalizeDeg(helioLon + dL);
  
  return helioToGeo(jd, helioLon2, r);
}

// === 木星地心黃道經度（含土星攝動 Great Inequality） ===
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
  
  // 土星攝動（Meeus Table 31 + 校正項）
  const Mj = normalizeDeg(20.020564 + 3034.6874893 * T);
  const Ms = normalizeDeg(316.967 + 1222.114 * T);
  const dL = -0.332 * sinDeg(2 * Mj - 5 * Ms - 67.6)
           - 0.056 * sinDeg(2 * Mj - 2 * Ms + 21)
           + 0.042 * sinDeg(3 * Mj - 5 * Ms + 21)
           - 0.036 * sinDeg(Mj - 2 * Ms)
           + 0.022 * cosDeg(Mj - Ms)
           + 0.023 * sinDeg(2 * Mj - 2 * Ms + 53)
           + 0.705 * sinDeg(Mj - 2 * Ms + 32);
  const helioLon2 = normalizeDeg(helioLon + dL);
  
  return helioToGeo(jd, helioLon2, r);
}

// === 土星地心黃道經度（含木星攝動） ===
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
  
  // 木星攝動
  const Mj = normalizeDeg(20.020564 + 3034.6874893 * T);
  const Ms = normalizeDeg(316.967 + 1222.114 * T);
  const dL = 0.440 * sinDeg(2 * Mj - 5 * Ms - 67.6)
           + 0.034 * sinDeg(2 * Mj - 2 * Ms + 21)
           - 0.026 * sinDeg(3 * Mj - 5 * Ms + 21.1);
  const helioLon2 = normalizeDeg(helioLon + dL);
  
  return helioToGeo(jd, helioLon2, r);
}

// === 天王星地心黃道經度（含攝動修正） ===
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
  
  // 攝動修正（木星+土星+海王星效應）
  const Mu = M;
  const dL = -0.711 * sinDeg(Mu);
  const helioLon2 = normalizeDeg(helioLon + dL);
  
  return helioToGeo(jd, helioLon2, r);
}

// === 海王星地心黃道經度（含木星攝動） ===
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
  
  // 木星攝動
  const Mj = normalizeDeg(20.020564 + 3034.6874893 * T);
  const Mn = M;
  const dL = 1.3254 * sinDeg(Mj - Mn + 25)
           - 0.136 * sinDeg(2 * (Mj - Mn) - 16)
           - 1.0940 * sinDeg(Mj + 134);
  const helioLon2 = normalizeDeg(helioLon + dL);
  
  return helioToGeo(jd, helioLon2, r);
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
  
  return helioToGeo(jd, helioLon, r);
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
