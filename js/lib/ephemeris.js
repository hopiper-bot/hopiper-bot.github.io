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
 * 月亮黃道經度（精度 ±0.5°）
 * Meeus Chapter 47 簡化版
 * @param {number} jd - Julian Day
 * @returns {number} 黃道經度 0-360°
 */
export function moonLongitude(jd) {
  const T = jdToJC(jd);

  // 月亮平經度 L'
  const Lp = normalizeDeg(218.3165 + 481267.8813 * T);

  // 月亮平近點角 M'
  const Mp = normalizeDeg(134.9634 + 477198.8676 * T);

  // 太陽平近點角 M
  const M = normalizeDeg(357.5291 + 35999.0503 * T);

  // 月亮到太陽的平均距角 D
  const D = normalizeDeg(297.8502 + 445267.1115 * T);

  // 月亮升交點平經度 F
  const F = normalizeDeg(93.2720 + 483202.0175 * T);

  // 主要攝動項（簡化到主要 6 項）
  let lon = Lp
    + 6.289 * sinDeg(Mp)
    - 1.274 * sinDeg(2 * D - Mp)
    + 0.658 * sinDeg(2 * D)
    + 0.214 * sinDeg(2 * Mp)
    - 0.186 * sinDeg(M)
    - 0.114 * sinDeg(2 * F);

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
 * 月球北交點黃道經度
 * @param {number} jd - Julian Day
 * @returns {number} 黃道經度 0-360°
 */
export function northNodeLongitude(jd) {
  const T = jdToJC(jd);
  // 月球升交點平均經度（逆行）
  const omega = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T;
  return normalizeDeg(omega);
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
 * @param {number} jd - Julian Day
 * @param {number} lat - 地理緯度（度）
 * @param {number} lng - 地理經度（度）
 * @returns {number} 黃道經度 0-360°
 */
export function ascendant(jd, lat, lng) {
  const eps = obliquity(jd);
  const gst = greenwichSiderealTime(jd);
  const lst = normalizeDeg(gst + lng); // 地方恆星時

  // RAMC (Right Ascension of Medium Coeli) = LST
  // ASC = atan2(-cos(RAMC), sin(RAMC)*cos(eps) + tan(lat)*sin(eps))
  const numerator = -cosDeg(lst);
  const denominator = sinDeg(lst) * cosDeg(eps) + tanDeg(lat) * sinDeg(eps);
  let asc = atan2Deg(numerator, denominator);
  asc = normalizeDeg(asc);

  return asc;
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
