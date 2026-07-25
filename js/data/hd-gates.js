/**
 * hd-gates.js — 人類圖 64 閘門映射表
 * 
 * Rave Mandala 標準排列（Ra Uru Hu 系統）
 * 每個閘門佔 360/64 = 5.625°，再分成 6 條爻（每爻 0.9375°）
 * 
 * 起始點：Gate 41, Line 1 = 黃道經度 303.0°（水瓶座 3°）
 * 
 * 驗證基準：Piper 1982/9/11 03:05 UTC+8
 * humandesignasia.org 結果：P Sun=47.1, P Earth=22.1
 * 太陽黃道經度 ≈ 168.1° → offset=(168.1-303+360)=225.1 → idx=40 → gate=47 ✓
 */

/**
 * GATE_SEQUENCE — Rave Mandala wheel 正確排列（64 閘門）
 * index 0 起始於 303.0°，每 index +5.625°
 */
export const GATE_SEQUENCE = [
  41, 19, 13, 49, 30, 55, 37, 63,
  22, 36, 25, 17, 21, 51, 42,  3,
  27, 24,  2, 23,  8, 20, 16, 35,
  45, 12, 15, 52, 39, 53, 62, 56,
  31, 33,  7,  4, 29, 59, 40, 64,
  47,  6, 46, 18, 48, 57, 32, 50,
  28, 44,  1, 43, 14, 34,  9,  5,
  26, 11, 10, 58, 38, 54, 61, 60
];

/** 黃道起始偏移：閘門 41 Line 1 的起始經度（水瓶座 3°） */
export const MANDALA_START = 303.0;

/** 每個閘門佔的度數 */
export const GATE_ARC = 5.625; // 360 / 64

/** 每條爻佔的度數 */
export const LINE_ARC = 0.9375; // 5.625 / 6

/**
 * 閘門名稱（易經卦名 + 人類圖關鍵字）
 * key = 閘門編號, value = { name, keyword, center }
 */
export const GATES = {
  1:  { name: '乾/創造力', keyword: '自我表達', center: 'g' },
  2:  { name: '坤/接收', keyword: '自我方向', center: 'g' },
  3:  { name: '屯/秩序', keyword: '突變', center: 'sacral' },
  4:  { name: '蒙/公式', keyword: '答案', center: 'ajna' },
  5:  { name: '需/等待', keyword: '固定節奏', center: 'sacral' },
  6:  { name: '訟/摩擦', keyword: '情緒波', center: 'solar' },
  7:  { name: '師/軍隊', keyword: '自我角色', center: 'g' },
  8:  { name: '比/貢獻', keyword: '創意典範', center: 'throat' },
  9:  { name: '小畜/專注', keyword: '專注力', center: 'sacral' },
  10: { name: '履/行為', keyword: '自我行為', center: 'g' },
  11: { name: '泰/和平', keyword: '想法', center: 'ajna' },
  12: { name: '否/謹慎', keyword: '社交謹慎', center: 'throat' },
  13: { name: '同人/傾聽', keyword: '傾聽者', center: 'g' },
  14: { name: '大有/權力', keyword: '富足能力', center: 'sacral' },
  15: { name: '謙/極端', keyword: '人類節奏', center: 'g' },
  16: { name: '豫/技能', keyword: '熱忱', center: 'throat' },
  17: { name: '隨/見解', keyword: '意見', center: 'ajna' },
  18: { name: '蠱/修正', keyword: '修正', center: 'spleen' },
  19: { name: '臨/需求', keyword: '接近', center: 'root' },
  20: { name: '觀/當下', keyword: '當下', center: 'throat' },
  21: { name: '噬嗑/咬合', keyword: '掌控', center: 'heart' },
  22: { name: '賁/優雅', keyword: '恩典', center: 'solar' },
  23: { name: '剝/同化', keyword: '同化', center: 'throat' },
  24: { name: '復/回歸', keyword: '合理化', center: 'ajna' },
  25: { name: '無妄/天真', keyword: '無妄', center: 'g' },
  26: { name: '大畜/馴服', keyword: '利己者', center: 'heart' },
  27: { name: '頤/滋養', keyword: '照顧', center: 'sacral' },
  28: { name: '大過/偉大', keyword: '掙扎', center: 'spleen' },
  29: { name: '坎/深淵', keyword: '承諾', center: 'sacral' },
  30: { name: '離/烈火', keyword: '命運之輪', center: 'solar' },
  31: { name: '咸/影響', keyword: '領導', center: 'throat' },
  32: { name: '恆/持久', keyword: '持續', center: 'spleen' },
  33: { name: '遯/退隱', keyword: '隱私', center: 'throat' },
  34: { name: '大壯/力量', keyword: '力量', center: 'sacral' },
  35: { name: '晉/進步', keyword: '冒險', center: 'throat' },
  36: { name: '明夷/幽暗', keyword: '危機', center: 'solar' },
  37: { name: '家人/友誼', keyword: '友誼', center: 'solar' },
  38: { name: '睽/戰士', keyword: '鬥士', center: 'root' },
  39: { name: '蹇/阻礙', keyword: '挑釁', center: 'root' },
  40: { name: '解/遞送', keyword: '單獨', center: 'heart' },
  41: { name: '損/減少', keyword: '幻想', center: 'root' },
  42: { name: '益/增加', keyword: '成長', center: 'sacral' },
  43: { name: '夬/突破', keyword: '洞見', center: 'ajna' },
  44: { name: '姤/相遇', keyword: '警覺', center: 'spleen' },
  45: { name: '萃/聚集', keyword: '王者', center: 'throat' },
  46: { name: '升/推進', keyword: '身體之愛', center: 'g' },
  47: { name: '困/困惑', keyword: '領悟', center: 'ajna' },
  48: { name: '井/深度', keyword: '深度', center: 'spleen' },
  49: { name: '革/革命', keyword: '原則', center: 'solar' },
  50: { name: '鼎/價值', keyword: '價值', center: 'spleen' },
  51: { name: '震/震驚', keyword: '震驚', center: 'heart' },
  52: { name: '艮/靜止', keyword: '靜止', center: 'root' },
  53: { name: '漸/開始', keyword: '發展', center: 'root' },
  54: { name: '歸妹/少女', keyword: '野心', center: 'root' },
  55: { name: '豐/豐盛', keyword: '精神', center: 'solar' },
  56: { name: '旅/旅行', keyword: '刺激', center: 'throat' },
  57: { name: '巽/直覺', keyword: '直覺', center: 'spleen' },
  58: { name: '兌/喜悅', keyword: '活力', center: 'root' },
  59: { name: '渙/開放', keyword: '親密', center: 'sacral' },
  60: { name: '節/限制', keyword: '接受', center: 'root' },
  61: { name: '中孚/真理', keyword: '奧秘', center: 'head' },
  62: { name: '小過/細節', keyword: '細節', center: 'throat' },
  63: { name: '既濟/完成', keyword: '懷疑', center: 'head' },
  64: { name: '未濟/未完', keyword: '困惑', center: 'head' },
};

/**
 * 黃道經度 → 閘門 + 爻
 * @param {number} longitude - 黃道經度 0-360°
 * @returns {{ gate: number, line: number }}
 */
export function longitudeToGate(longitude) {
  // 計算相對於 Mandala 起點的偏移
  let offset = longitude - MANDALA_START;
  if (offset < 0) offset += 360;

  // 確定是第幾個閘門
  const gateIndex = Math.floor(offset / GATE_ARC);
  const gate = GATE_SEQUENCE[gateIndex % 64];

  // 確定爻（1-6）
  const withinGate = offset - gateIndex * GATE_ARC;
  const line = Math.floor(withinGate / LINE_ARC) + 1;

  return { gate, line: Math.min(line, 6) };
}

/**
 * 閘門的爻線名稱
 */
export const LINE_NAMES = {
  1: '調查者',
  2: '隱士',
  3: '烈士',
  4: '機會主義者',
  5: '異端者',
  6: '典範',
};
