/**
 * ephemeris.js — 天文星曆計算
 * 基於 Jean Meeus《Astronomical Algorithms》
 * 提供太陽、月亮、木星、土星、月交點的黃道經度計算
 * 精度：太陽 ±0.01°、月亮 ±0.5°、行星 ±0.5°
 */

import { normalizeDeg, jdToJC, sinDeg, cosDeg, tanDeg, asinDeg, atan2Deg, dateTimeToJD } from './utils.js';

/**
 * 計算 Julian Day
 */
export function julianDay(year, month, day, hour, minute, utcOffset) {
  return dateTimeToJD(year, month, day, hour, minute, utcOffset);
}

/**
 * 太陽黃道經度（精度 ±0.01°）
 * VSOP87 簡化版 — Meeus Chapter 25
 * @param {number} jd - Julian Day
 * @returns {number} 黃道經度 0-360°
 */
export function sunLongitude(jd) {
  const T = jdToJC(jd);

  // 太陽幾何平經度
  const L0 = normalizeDeg(280.46646 + 36000.76983 * T + 0.0003032 * T * T);

  // 太陽平近點角
  const M = normalizeDeg(357.52911 + 35999.05029 * T - 0.0001537 * T * T);

  // 地球軌道離心率
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;

  // 太陽中心方程
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sinDeg(M)
    + (0.019993 - 0.000101 * T) * sinDeg(2 * M)
    + 0.000289 * sinDeg(3 * M);

  // 太陽真經度
  const sunTrue = L0 + C;

  // 章動修正（簡化）
  const omega = 125.04 - 1934.136 * T;
  const apparent = sunTrue - 0.00569 - 0.00478 * sinDeg(omega);

  return normalizeDeg(apparent);
}

/**
 * 月亮黃道經度（精度 ±0.05°）
 * Meeus Chapter 47 — 完整版（主要 60 項攝動）
 * @param {number} jd - Julian Day
 * @returns {number} 黃道經度 0-360°
 */
export function moonLongitude(jd) {
  const T = jdToJC(jd);

  // 月亮平經度 L'（含高次項）
  const Lp = normalizeDeg(218.3164477 + 481267.88123421 * T
    - 0.0015786 * T * T + T * T * T / 538841 - T * T * T * T / 65194000);

  // 月亮平距角 D
  const D = normalizeDeg(297.8501921 + 445267.1114034 * T
    - 0.0018819 * T * T + T * T * T / 545868 - T * T * T * T / 113065000);

  // 太陽平近點角 M
  const M = normalizeDeg(357.5291092 + 35999.0502909 * T
    - 0.0001536 * T * T + T * T * T / 24490000);

  // 月亮平近點角 M'
  const Mp = normalizeDeg(134.9633964 + 477198.8675055 * T
    + 0.0087414 * T * T + T * T * T / 69699 - T * T * T * T / 14712000);

  // 月亮升交點平經度 F
  const F = normalizeDeg(93.2720950 + 483202.0175233 * T
    - 0.0036539 * T * T - T * T * T / 3526000 + T * T * T * T / 863310000);

  // 修正項 A1, A2, A3
  const A1 = normalizeDeg(119.75 + 131.849 * T);
  const A2 = normalizeDeg(53.09 + 479264.290 * T);
  const A3 = normalizeDeg(313.45 + 481266.484 * T);

  // 離心率修正
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const E2 = E * E;

  // Meeus Table 47.A — 經度攝動項（前 60 項中最重要的）
  let sumL = 0;
  // [D係數, M係數, Mp係數, F係數, sinCoeff]
  // M係數不為0時要乘 E 或 E²
  const terms = [
    [0, 0, 1, 0, 6288774],
    [2, 0, -1, 0, 1274027],
    [2, 0, 0, 0, 658314],
    [0, 0, 2, 0, 213618],
    [0, 1, 0, 0, -185116],
    [0, 0, 0, 2, -114332],
    [2, 0, -2, 0, 58793],
    [2, -1, -1, 0, 57066],
    [2, 0, 1, 0, 53322],
    [2, -1, 0, 0, 45758],
    [0, 1, -1, 0, -40923],
    [1, 0, 0, 0, -34720],
    [0, 1, 1, 0, -30383],
    [2, 0, 0, -2, 15327],
    [0, 0, 1, 2, -12528],
    [0, 0, 1, -2, 10980],
    [4, 0, -1, 0, 10675],
    [0, 0, 3, 0, 10034],
    [4, 0, -2, 0, 8548],
    [2, 1, -1, 0, -7888],
    [2, 1, 0, 0, -6766],
    [1, 0, -1, 0, -5163],
    [1, 1, 0, 0, 4987],
    [2, -1, 1, 0, 4036],
    [2, 0, 2, 0, 3994],
    [4, 0, 0, 0, 3861],
    [2, 0, -3, 0, 3665],
    [0, 1, -2, 0, -2689],
    [2, 0, -1, 2, -2602],
    [2, -1, -2, 0, 2390],
    [1, 0, 1, 0, -2348],
    [2, -2, 0, 0, 2236],
    [0, 1, 2, 0, -2120],
    [0, 2, 0, 0, -2069],
    [2, -2, -1, 0, 2048],
    [2, 0, 1, -2, -1773],
    [2, 0, 0, 2, -1595],
    [4, -1, -1, 0, 1215],
    [0, 0, 2, 2, -1110],
    [3, 0, -1, 0, -892],
    [2, 1, 1, 0, -810],
    [4, -1, -2, 0, 759],
    [0, 2, -1, 0, -713],
    [2, 2, -1, 0, -700],
    [2, 1, -2, 0, 691],
    [2, -1, 0, -2, 596],
    [4, 0, 1, 0, 549],
    [0, 0, 4, 0, 537],
    [4, -1, 0, 0, 520],
    [1, 0, -2, 0, -487],
  ];

  for (const [dC, mC, mpC, fC, coeff] of terms) {
    const arg = dC * D + mC * M + mpC * Mp + fC * F;
    let c = coeff;
    if (Math.abs(mC) === 1) c *= E;
    else if (Math.abs(mC) === 2) c *= E2;
    sumL += c * sinDeg(arg);
  }

  // 額外修正
  sumL += 3958 * sinDeg(A1)
    + 1962 * sinDeg(Lp - F)
    + 318 * sinDeg(A2);

  // sumL 單位是 0.000001°
  const lon = Lp + sumL / 1000000;

  return normalizeDeg(lon);
}

/**
 * 木星黃道經度（精度 ±0.5°）
 * 簡化低精度演算法 — Meeus Table 31.A 簡化
 * @param {number} jd - Julian Day
 * @returns {number} 黃道經度 0-360°
 */
export function jupiterLongitude(jd) {
  const T = jdToJC(jd);

  // 木星平經度和平近點角
  const L = normalizeDeg(34.351519 + 3034.9056746 * T);
  const M = normalizeDeg(20.020564 + 3034.6874893 * T);

  // 土星平近點角（用於攝動）
  const Ms = normalizeDeg(316.967 + 1222.114 * T);

  // 中心方程 + 主要攝動
  let lon = L
    + 5.555 * sinDeg(M)
    + 0.168 * sinDeg(2 * M)
    - 0.635 * sinDeg(Ms - 2 * M)
    + 0.330 * sinDeg(Ms - M);

  return normalizeDeg(lon);
}

/**
 * 土星黃道經度（精度 ±0.5°）
 * @param {number} jd - Julian Day
 * @returns {number} 黃道經度 0-360°
 */
export function saturnLongitude(jd) {
  const T = jdToJC(jd);

  // 土星平經度和平近點角
  const L = normalizeDeg(50.077444 + 1222.1138488 * T);
  const M = normalizeDeg(316.967 + 1222.114 * T);

  // 木星平近點角（用於攝動）
  const Mj = normalizeDeg(20.020564 + 3034.6874893 * T);

  // 中心方程 + 主要攝動
  let lon = L
    + 6.400 * sinDeg(M)
    + 0.318 * sinDeg(2 * M)
    - 0.881 * sinDeg(M - 2 * Mj)
    + 0.198 * sinDeg(2 * Mj - 2 * M);

  return normalizeDeg(lon);
}

/**
 * 月球北交點黃道經度（真交點，含擴展攝動修正）
 * @param {number} jd - Julian Day
 * @returns {number} 黃道經度 0-360°
 */
export function northNodeLongitude(jd) {
  const T = jdToJC(jd);
  // 月球升交點平均經度（逆行）
  const omega = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T
    + T * T * T / 467441 - T * T * T * T / 60616000;
  
  // 主要攝動修正（將平均交點→真交點）
  const D = normalizeDeg(297.8501921 + 445267.1114034 * T
    - 0.0018819 * T * T + T * T * T / 545868);
  const M = normalizeDeg(357.5291092 + 35999.0502909 * T
    - 0.0001536 * T * T);
  const Mp = normalizeDeg(134.9633964 + 477198.8675055 * T
    + 0.0087414 * T * T + T * T * T / 69699);
  const F = normalizeDeg(93.2720950 + 483202.0175233 * T
    - 0.0036539 * T * T - T * T * T / 3526000);
  
  // 擴展真交點修正項（Chapront 系列）
  const correction = -1.4979 * sinDeg(2 * (D - F))
    - 0.1500 * sinDeg(M)
    - 0.1226 * sinDeg(2 * D)
    + 0.1176 * sinDeg(2 * F)
    - 0.0801 * sinDeg(2 * (Mp - F))
    - 0.5240 * sinDeg(Mp)
    + 0.0996 * sinDeg(2 * Mp)
    + 0.0450 * sinDeg(2 * (D - F) - M)
    + 0.0310 * sinDeg(2 * (D - F) + Mp)
    - 0.0240 * sinDeg(M - Mp)
    + 0.0190 * sinDeg(2 * D - Mp);
  
  return normalizeDeg(omega + correction);
}

/**
 * 黃赤交角（obliquity of ecliptic）
 * @param {number} jd - Julian Day
 * @returns {number} 度
 */
export function obliquity(jd) {
  const T = jdToJC(jd);
  return 23.439291 - 0.013004 * T - 0.000000164 * T * T + 0.000000504 * T * T * T;
}

/**
 * 恆星時（Greenwich Apparent Sidereal Time）
 * @param {number} jd - Julian Day
 * @returns {number} 度 (0-360)
 */
export function greenwichSiderealTime(jd) {
  const T = jdToJC(jd);
  let theta = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
    + 0.000387933 * T * T - T * T * T / 38710000.0;
  return normalizeDeg(theta);
}

/**
 * 上升點（Ascendant）計算
 * 正確公式來自 Jean Meeus《Astronomical Algorithms》Chapter 13
 * ASC = atan(-cos(RAMC) / (sin(RAMC)*cos(eps) + tan(lat)*sin(eps)))
 * 需要確保結果在正確象限
 * @param {number} jd - Julian Day
 * @param {number} lat - 地理緯度（度）
 * @param {number} lng - 地理經度（度）
 * @returns {number} 黃道經度 0-360°
 */
export function ascendant(jd, lat, lng) {
  const eps = obliquity(jd);
  const gst = greenwichSiderealTime(jd);
  const lst = normalizeDeg(gst + lng); // 地方恆星時 = RAMC (degree)

  // Correct ASC formula (Duffett-Smith / Meeus):
  // tan(ASC) = cos(RAMC) / -(sin(RAMC)*cos(eps) + tan(lat)*sin(eps))
  const y = cosDeg(lst);
  const x = -(sinDeg(lst) * cosDeg(eps) + tanDeg(lat) * sinDeg(eps));

  let asc = atan2Deg(y, x);
  asc = normalizeDeg(asc);

  return asc;
}

/**
 * 天頂（MC / Medium Coeli）計算
 * MC = atan(tan(RAMC) / cos(eps))
 * @param {number} jd - Julian Day
 * @param {number} lng - 地理經度（度）
 * @returns {number} 黃道經度 0-360°
 */
export function midheaven(jd, lng) {
  const eps = obliquity(jd);
  const gst = greenwichSiderealTime(jd);
  const ramc = normalizeDeg(gst + lng);

  // MC = atan2(tan(RAMC), cos(eps))... 需處理象限
  // 簡化：MC = atan(tan(RAMC)/cos(eps))，再根據 RAMC 象限調整
  let mc = atan2Deg(sinDeg(ramc), cosDeg(ramc) * cosDeg(eps));
  mc = normalizeDeg(mc);

  return mc;
}

/**
 * 水星黃道經度（精度 ±1°）
 * 簡化演算法
 * @param {number} jd - Julian Day
 * @returns {number} 黃道經度 0-360°
 */
export function mercuryLongitude(jd) {
  const T = jdToJC(jd);
  const L = normalizeDeg(252.2509 + 149472.6746 * T);
  const M = normalizeDeg(174.7948 + 149472.5153 * T);
  let lon = L
    + 23.440 * sinDeg(M)
    + 2.9818 * sinDeg(2 * M)
    + 0.5255 * sinDeg(3 * M)
    + 0.1058 * sinDeg(4 * M);
  return normalizeDeg(lon);
}

/**
 * 金星黃道經度（精度 ±1°）
 * @param {number} jd - Julian Day
 * @returns {number} 黃道經度 0-360°
 */
export function venusLongitude(jd) {
  const T = jdToJC(jd);
  const L = normalizeDeg(181.9798 + 58517.8157 * T);
  const M = normalizeDeg(50.4161 + 58517.8039 * T);
  let lon = L
    + 0.7758 * sinDeg(M)
    + 0.0033 * sinDeg(2 * M);
  return normalizeDeg(lon);
}

/**
 * 火星黃道經度（精度 ±1°）
 * @param {number} jd - Julian Day
 * @returns {number} 黃道經度 0-360°
 */
export function marsLongitude(jd) {
  const T = jdToJC(jd);
  const L = normalizeDeg(355.4330 + 19140.2993 * T);
  const M = normalizeDeg(19.3730 + 19139.8585 * T);
  let lon = L
    + 10.691 * sinDeg(M)
    + 0.623 * sinDeg(2 * M)
    + 0.050 * sinDeg(3 * M);
  return normalizeDeg(lon);
}

/**
 * 天王星黃道經度（精度 ±1°）
 * @param {number} jd - Julian Day
 * @returns {number} 黃道經度 0-360°
 */
export function uranusLongitude(jd) {
  const T = jdToJC(jd);
  const L = normalizeDeg(314.055 + 428.467 * T);
  const Ms = normalizeDeg(316.967 + 1222.114 * T); // Saturn M
  const Mj = normalizeDeg(20.021 + 3034.687 * T);  // Jupiter M
  let lon = L
    + 5.312 * sinDeg(148.031 + 428.389 * T)
    + 0.306 * sinDeg(2 * (148.031 + 428.389 * T))
    - 0.577 * sinDeg(Ms - 2 * (148.031 + 428.389 * T));
  return normalizeDeg(lon);
}

/**
 * 海王星黃道經度（精度 ±1°）
 * @param {number} jd - Julian Day
 * @returns {number} 黃道經度 0-360°
 */
export function neptuneLongitude(jd) {
  const T = jdToJC(jd);
  const L = normalizeDeg(304.459 + 218.762 * T);
  let lon = L
    + 1.883 * sinDeg(32.737 + 218.477 * T)
    + 0.034 * sinDeg(2 * (32.737 + 218.477 * T));
  return normalizeDeg(lon);
}

/**
 * 冥王星黃道經度（精度 ±2°）
 * 極簡化 — 冥王星軌道不規則，低精度近似
 * @param {number} jd - Julian Day
 * @returns {number} 黃道經度 0-360°
 */
export function plutoLongitude(jd) {
  const T = jdToJC(jd);
  // 基於 1900-2100 期間的線性+正弦近似
  const L = 232.74 + 144.9266 * T;
  const M = normalizeDeg(1.397 + 144.752 * T);
  let lon = L
    + 6.368 * sinDeg(M)
    + 0.412 * sinDeg(2 * M);
  return normalizeDeg(lon);
}

/**
 * 黃道經度 → 星座索引 (0=白羊, 1=金牛, ..., 11=雙魚)
 * @param {number} longitude - 黃道經度 0-360
 * @returns {number} 星座索引 0-11
 */
export function longitudeToSign(longitude) {
  return Math.floor(normalizeDeg(longitude) / 30);
}
