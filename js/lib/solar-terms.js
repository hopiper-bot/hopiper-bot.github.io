/**
 * solar-terms.js — 24 節氣計算
 * 用於八字月柱邊界（節）和年柱邊界（立春）
 * 基於太陽黃道經度反推日期
 */

import { sunLongitude, julianDay } from './ephemeris.js';
import { normalizeDeg } from './utils.js';

/**
 * 24 節氣對應的太陽黃道經度
 * 從春分 (0°) 開始，每 15° 一個節氣
 * 節（奇數）用於八字月柱分界
 */
export const SOLAR_TERM_DEGREES = [
  315, // 立春 (節) — 年柱 & 1月柱起點
  330, // 雨水 (氣)
  345, // 驚蟄 (節) — 2月柱起點
  0,   // 春分 (氣)
  15,  // 清明 (節) — 3月柱起點
  30,  // 穀雨 (氣)
  45,  // 立夏 (節) — 4月柱起點
  60,  // 小滿 (氣)
  75,  // 芒種 (節) — 5月柱起點
  90,  // 夏至 (氣)
  105, // 小暑 (節) — 6月柱起點
  120, // 大暑 (氣)
  135, // 立秋 (節) — 7月柱起點
  150, // 處暑 (氣)
  165, // 白露 (節) — 8月柱起點
  180, // 秋分 (氣)
  195, // 寒露 (節) — 9月柱起點
  210, // 霜降 (氣)
  225, // 立冬 (節) — 10月柱起點
  240, // 小雪 (氣)
  255, // 大雪 (節) — 11月柱起點
  270, // 冬至 (氣)
  285, // 小寒 (節) — 12月柱起點
  300, // 大寒 (氣)
];

export const SOLAR_TERM_NAMES = [
  "立春", "雨水", "驚蟄", "春分", "清明", "穀雨",
  "立夏", "小滿", "芒種", "夏至", "小暑", "大暑",
  "立秋", "處暑", "白露", "秋分", "寒露", "霜降",
  "立冬", "小雪", "大雪", "冬至", "小寒", "大寒"
];

/**
 * 用二分法找太陽到達特定黃道經度的 Julian Day
 * @param {number} targetDeg - 目標黃道經度
 * @param {number} jdStart - 搜尋起始 JD
 * @param {number} jdEnd - 搜尋結束 JD
 * @returns {number} Julian Day
 */
function findSunAtDegree(targetDeg, jdStart, jdEnd) {
  let lo = jdStart;
  let hi = jdEnd;

  for (let i = 0; i < 50; i++) { // 50 次二分足夠精確到秒
    const mid = (lo + hi) / 2;
    const sunDeg = sunLongitude(mid);

    // 處理跨 0°/360° 的情況
    let diff = normalizeDeg(sunDeg - targetDeg);
    if (diff > 180) diff -= 360;

    if (Math.abs(diff) < 0.0001) return mid; // 精度足夠

    if (diff < 0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return (lo + hi) / 2;
}

/**
 * 計算指定年份的立春精確 Julian Day
 * @param {number} year - 西曆年份
 * @returns {number} Julian Day
 */
export function getLiChunJD(year) {
  // 立春大約在 2 月 3-5 日
  const jdStart = julianDay(year, 2, 1, 0, 0, 0);
  const jdEnd = julianDay(year, 2, 8, 0, 0, 0);
  return findSunAtDegree(315, jdStart, jdEnd);
}

/**
 * 計算指定年份所有 24 節氣的 Julian Day
 * @param {number} year - 西曆年份
 * @returns {Array<{name: string, degree: number, jd: number}>}
 */
export function getAllSolarTerms(year) {
  const results = [];

  for (let i = 0; i < 24; i++) {
    const deg = SOLAR_TERM_DEGREES[i];
    const name = SOLAR_TERM_NAMES[i];

    // 估算月份（每個節氣大約間隔半個月）
    let estMonth;
    if (i < 2) estMonth = 2;       // 立春、雨水 → 2月
    else if (i < 4) estMonth = 3;  // 驚蟄、春分 → 3月
    else if (i < 6) estMonth = 4;
    else if (i < 8) estMonth = 5;
    else if (i < 10) estMonth = 6;
    else if (i < 12) estMonth = 7;
    else if (i < 14) estMonth = 8;
    else if (i < 16) estMonth = 9;
    else if (i < 18) estMonth = 10;
    else if (i < 20) estMonth = 11;
    else if (i < 22) estMonth = 12;
    else estMonth = 1; // 小寒、大寒 → 隔年1月

    const searchYear = estMonth === 1 ? year + 1 : year;
    const jdStart = julianDay(searchYear, estMonth, 1, 0, 0, 0);
    const jdEnd = julianDay(searchYear, estMonth, 28, 0, 0, 0);

    const jd = findSunAtDegree(deg, jdStart, jdEnd);
    results.push({ name, degree: deg, jd, index: i });
  }

  return results;
}

/**
 * 判斷某個 JD 落在哪個「節」之間（用於八字月柱）
 * 只看「節」（index 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22）
 * @param {number} jd - 目標 Julian Day
 * @param {number} year - 年份（用於計算當年節氣）
 * @returns {{monthIndex: number, termName: string}} monthIndex: 1-12（寅月=1）
 */
export function getMonthByJD(jd, year) {
  // 取前一年和當年的節氣（處理跨年）
  const prevTerms = getAllSolarTerms(year - 1);
  const currTerms = getAllSolarTerms(year);

  // 只取「節」(偶數 index: 0=立春, 2=驚蟄, 4=清明...)
  const jieTerms = [];
  for (const t of prevTerms) {
    if (t.index % 2 === 0) jieTerms.push(t);
  }
  for (const t of currTerms) {
    if (t.index % 2 === 0) jieTerms.push(t);
  }

  // 排序
  jieTerms.sort((a, b) => a.jd - b.jd);

  // 找到 jd 落在哪兩個「節」之間
  for (let i = jieTerms.length - 1; i >= 0; i--) {
    if (jd >= jieTerms[i].jd) {
      // monthIndex: 立春=1(寅月), 驚蟄=2(卯月), ..., 小寒=12(丑月)
      const monthIndex = (jieTerms[i].index / 2) % 12 + 1;
      return { monthIndex, termName: jieTerms[i].name };
    }
  }

  // fallback
  return { monthIndex: 12, termName: "小寒" };
}
