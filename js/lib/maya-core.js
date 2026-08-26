/**
 * maya-core.js — 馬雅曆共用計算函式
 * 
 * Dreamspell KIN 計算被 maya.js, daily-energy.js, company-compat.js, person-compat.js 共用。
 */

import { mod } from './utils.js';

// 月份偏移量（非閏年）
const MONTH_OFF = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

/**
 * 計算 Dreamspell KIN（1-260）
 * @param {number} y - 年
 * @param {number} m - 月
 * @param {number} d - 日
 * @returns {number} KIN 1-260
 */
export function dreamspellKin(y, m, d) {
  const yearVal = mod(217 + 105 * (y - 2013), 260);
  return mod(yearVal + MONTH_OFF[m - 1] + d - 1, 260) + 1;
}
