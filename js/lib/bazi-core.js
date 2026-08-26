/**
 * bazi-core.js — 八字共用常量與基礎計算函式
 * 
 * 各引擎（bazi.js, company-compat.js, person-compat.js, daily-energy.js, synthesis.js）
 * 應逐步改為從此模組 import，避免重複定義。
 */

import { dateToJDN } from './utils.js';

// === 天干地支 ===
export const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
export const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

// === 五行映射 ===
export const STEM_ELEMENT = { "甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水" };
export const STEM_YINYANG = { "甲":"陽","乙":"陰","丙":"陽","丁":"陰","戊":"陽","己":"陰","庚":"陽","辛":"陰","壬":"陽","癸":"陰" };
export const BRANCH_ELEMENT = { "子":"水","丑":"土","寅":"木","卯":"木","辰":"土","巳":"火","午":"火","未":"土","申":"金","酉":"金","戌":"土","亥":"水" };
export const ELEMENT_EMOJI = { "木":"🌳", "火":"🔥", "土":"🏔️", "金":"⚙️", "水":"💧" };
export const ELEMENT_CYCLE = ["木","火","土","金","水"];

// === 地支藏干 ===
export const HIDDEN_STEMS = {
  "子":["癸"], "丑":["己","癸","辛"], "寅":["甲","丙","戊"], "卯":["乙"],
  "辰":["戊","乙","癸"], "巳":["丙","庚","戊"], "午":["丁","己"], "未":["己","丁","乙"],
  "申":["庚","壬","戊"], "酉":["辛"], "戌":["戊","辛","丁"], "亥":["壬","甲"],
};

// === 五行生剋關係 ===
export function getRelation(elemA, elemB) {
  const iA = ELEMENT_CYCLE.indexOf(elemA);
  const iB = ELEMENT_CYCLE.indexOf(elemB);
  if (iA === iB) return "same";
  if ((iA + 1) % 5 === iB) return "iGive";     // 我生
  if ((iA + 2) % 5 === iB) return "iControl";   // 我剋
  if ((iA + 3) % 5 === iB) return "controlMe";  // 剋我
  if ((iA + 4) % 5 === iB) return "giveMe";     // 生我
  return "same";
}

/**
 * 十神判斷
 * @param {string} dayStem - 日主天干
 * @param {string} otherStem - 要比對的天干
 * @returns {string} 十神名稱
 */
export function getTenGod(dayStem, otherStem) {
  const dayElem = STEM_ELEMENT[dayStem];
  const dayYY = STEM_YINYANG[dayStem];
  const otherElem = STEM_ELEMENT[otherStem];
  const otherYY = STEM_YINYANG[otherStem];
  const sameYY = (dayYY === otherYY);
  const rel = getRelation(dayElem, otherElem);
  switch(rel) {
    case "same": return sameYY ? "比肩" : "劫財";
    case "iGive": return sameYY ? "食神" : "傷官";
    case "iControl": return sameYY ? "偏財" : "正財";
    case "controlMe": return sameYY ? "七殺" : "正官";
    case "giveMe": return sameYY ? "偏印" : "正印";
    default: return "";
  }
}

/**
 * 日柱計算（含 23:00 換日）
 * @returns {{ stemIdx: number, branchIdx: number, stem: string, branch: string }}
 */
export function dayPillar(year, month, day, hour = 12) {
  let jdn = dateToJDN(year, month, day);
  if (typeof hour === 'number' && hour >= 23) jdn += 1;
  const base = dateToJDN(2000, 1, 7); // 甲子日
  const diff = ((jdn - base) % 60 + 60) % 60;
  const stemIdx = diff % 10;
  const branchIdx = diff % 12;
  return { stemIdx, branchIdx, stem: STEMS[stemIdx], branch: BRANCHES[branchIdx] };
}
