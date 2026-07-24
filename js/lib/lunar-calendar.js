/**
 * lunar-calendar.js — 農曆轉換（壽星萬年曆演算法）
 * 陽曆→農曆（1900-2100）
 * 
 * 資料來源：壽星萬年曆農曆數據壓縮表
 * 每年用一個整數存儲：bit 0-11 表示每月大小（30/29天），bit 12-15 表示閏月月份（0=無閏月）
 * bit 16-19 表示閏月天數（大月30/小月29）
 */

/**
 * 農曆數據表 (1900-2100)
 * 格式：高 4 bit = 閏月天數標記(0=29天,1=30天)
 *       次 4 bit = 閏月月份(0=無閏月)
 *       低 12 bit = 12 個月大小(1=大月30天, 0=小月29天)
 */
const LUNAR_DATA = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, // 1900-1909
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, // 1910-1919
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, // 1920-1929
  0x06566, 0x0d4a0, 0x0ea50, 0x16a95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, // 1930-1939
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, // 1940-1949
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, // 1950-1959
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, // 1960-1969
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6, // 1970-1979
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, // 1980-1989
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0, // 1990-1999
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2000-2009
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, // 2010-2019
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, // 2020-2029
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, // 2030-2039
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, // 2040-2049
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06aa0, 0x1a6c4, 0x0aae0, // 2050-2059
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4, // 2060-2069
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, // 2070-2079
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160, // 2080-2089
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a4d0, 0x0d150, 0x0f252, // 2090-2099
  0x0d520, // 2100
];

/**
 * 取得某年閏月月份（0 表示無閏月）
 */
function leapMonth(year) {
  return LUNAR_DATA[year - 1900] & 0xf;
}

/**
 * 取得某年閏月天數（0=29, 非0=30）
 */
function leapDays(year) {
  if (leapMonth(year) === 0) return 0;
  return (LUNAR_DATA[year - 1900] & 0x10000) ? 30 : 29;
}

/**
 * 取得農曆某年某月天數
 * @param {number} year - 農曆年
 * @param {number} month - 農曆月 (1-12)
 * @returns {number} 29 或 30
 */
function monthDays(year, month) {
  return (LUNAR_DATA[year - 1900] & (0x10000 >> month)) ? 30 : 29;
}

/**
 * 取得農曆某年總天數
 */
function yearDays(year) {
  let sum = 348; // 12 × 29
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (LUNAR_DATA[year - 1900] & i) ? 1 : 0;
  }
  return sum + leapDays(year);
}

/**
 * 陽曆 → 農曆
 * @param {number} year - 西曆年
 * @param {number} month - 西曆月 (1-12)
 * @param {number} day - 西曆日
 * @returns {{lunarYear, lunarMonth, lunarDay, isLeap, yearStem, yearBranch}}
 */
export function solarToLunar(year, month, day) {
  if (year < 1900 || year > 2100) {
    return null;
  }

  // 計算距離 1900/1/31（農曆 1900年正月初一）的天數
  const baseDate = new Date(1900, 0, 31); // 1900-01-31
  const targetDate = new Date(year, month - 1, day);
  let offset = Math.floor((targetDate - baseDate) / 86400000);

  if (offset < 0) return null;

  // 逐年扣除
  let lunarYear = 1900;
  let daysInYear;
  for (; lunarYear < 2101 && offset > 0; lunarYear++) {
    daysInYear = yearDays(lunarYear);
    offset -= daysInYear;
  }
  if (offset < 0) {
    offset += daysInYear;
    lunarYear--;
  }

  // 逐月扣除
  const leap = leapMonth(lunarYear);
  let isLeap = false;
  let lunarMonth = 1;

  for (; lunarMonth <= 12; lunarMonth++) {
    // 先處理正常月
    let daysInMonth = monthDays(lunarYear, lunarMonth);
    if (offset < daysInMonth) break;
    offset -= daysInMonth;

    // 閏月
    if (lunarMonth === leap) {
      daysInMonth = leapDays(lunarYear);
      if (offset < daysInMonth) {
        isLeap = true;
        break;
      }
      offset -= daysInMonth;
    }
  }

  const lunarDay = offset + 1;

  // 天干地支（農曆年）
  const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

  const stemIdx = (lunarYear - 4) % 10;
  const branchIdx = (lunarYear - 4) % 12;

  return {
    lunarYear,
    lunarMonth,
    lunarDay,
    isLeap,
    yearStem: STEMS[stemIdx],
    yearBranch: BRANCHES[branchIdx],
    yearStemIdx: stemIdx,
    yearBranchIdx: branchIdx,
  };
}
