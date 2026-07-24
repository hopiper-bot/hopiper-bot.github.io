/**
 * utils.js — 共用工具函式
 */

/** 正整數模運算（避免 JS 負數 % 問題） */
export function mod(n, m) {
  return ((n % m) + m) % m;
}

/** 角度正規化到 0-360 */
export function normalizeDeg(deg) {
  return mod(deg, 360);
}

/** 度 → 弧度 */
export function degToRad(deg) {
  return deg * Math.PI / 180;
}

/** 弧度 → 度 */
export function radToDeg(rad) {
  return rad * 180 / Math.PI;
}

/**
 * 西曆日期 → Julian Day Number (JDN)
 * 公式來自 Jean Meeus《Astronomical Algorithms》
 */
export function dateToJDN(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

/**
 * 西曆日期時間 → Julian Day (含小數)
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @param {number} hour - 0-23
 * @param {number} minute - 0-59
 * @param {number} utcOffset - UTC offset in hours (e.g. +8)
 * @returns {number} Julian Day
 */
export function dateTimeToJD(year, month, day, hour, minute, utcOffset) {
  // 轉為 UT (UTC)
  const utHour = hour - utcOffset + minute / 60;
  const jdn = dateToJDN(year, month, day);
  return jdn + (utHour - 12) / 24;
}

/**
 * Julian Day → Julian Century (T) from J2000.0
 */
export function jdToJC(jd) {
  return (jd - 2451545.0) / 36525.0;
}

/**
 * sin/cos 以度數為參數
 */
export function sinDeg(deg) {
  return Math.sin(degToRad(deg));
}

export function cosDeg(deg) {
  return Math.cos(degToRad(deg));
}

export function tanDeg(deg) {
  return Math.tan(degToRad(deg));
}

export function asinDeg(x) {
  return radToDeg(Math.asin(x));
}

export function acosDeg(x) {
  return radToDeg(Math.acos(x));
}

export function atan2Deg(y, x) {
  return radToDeg(Math.atan2(y, x));
}
