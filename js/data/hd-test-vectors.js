/**
 * hd-test-vectors.js — 人類圖計算驗證基準
 * 
 * 來源：humandesignasia.org
 * 用途：比對我們的天文計算結果是否正確
 * 
 * 使用方式：在 console 跑 verifyHD() 即可比對
 */

export const TEST_CASES = [
  {
    name: 'Piper',
    birth: { year: 1982, month: 9, day: 11, hour: 3, minute: 5, utcOffset: 8 },
    // Profile 1/3, 右角度交叉之統領
    expected: {
      profile: '1/3',
      crossAngle: '右角度',
      personality: {
        sun:       { gate: 47, line: 1 },
        earth:     { gate: 22, line: 1 },
        moon:      { gate: 45, line: 2 },
        northNode: { gate: 39, line: 2 },
        southNode: { gate: 38, line: 2 },
        mercury:   { gate: 48, line: 5 },
        venus:     { gate: 59, line: 4 },
        mars:      { gate: 43, line: 6 },
        jupiter:   { gate: 44, line: 1 },
        saturn:    { gate: 57, line: 6 },
        uranus:    { gate: 34, line: 1 },
        neptune:   { gate: 11, line: 2 },
        pluto:     { gate: 32, line: 5 },
      },
      design: {
        sun:       { gate: 45, line: 3 },
        earth:     { gate: 26, line: 3 },
        moon:      { gate: 41, line: 5 },
        northNode: { gate: 39, line: 5 },
        southNode: { gate: 38, line: 5 },
        mercury:   { gate: 16, line: 2 },
        venus:     { gate: 24, line: 6 },
        mars:      { gate: 18, line: 2 },
        jupiter:   { gate: 50, line: 5 },
        saturn:    { gate: 57, line: 1 },
        uranus:    { gate: 34, line: 2 },
        neptune:   { gate: 11, line: 4 },
        pluto:     { gate: 32, line: 4 },
      },
      // 從以上閘門推導出的通道和中心
      definedChannels: [
        // 兩端閘門都有被啟動（P 或 D 皆可）
        // Gate 45 (P moon + D sun) + Gate 21 → 需確認 21 有沒有被啟動... 
        // 先列確定的配對：
        // 57 (P saturn, D saturn) + 34 (P uranus, D uranus) → 57-34 力量原型 ✓
        // 48 (P mercury) + 16 (D mercury) → 48-16 才華 ✓
        // 32 (P pluto, D pluto) + 54? → 要看有沒有 54
        // 44 (P jupiter) + 26 (D earth) → 44-26 投降 ✓
        // 38 (P southNode, D southNode) + 28? → 要看
        // 39 (P northNode, D northNode) + 55? → 要看
        // 45 (P moon, D sun) + 21? → 要看有沒有 21
      ],
    },
  },
];

/**
 * 從閘門號碼反推大約的黃道經度範圍
 * 用於驗證行星計算是否落在正確區間
 */
const GATE_SEQUENCE = [
  41, 19, 13, 49, 30, 55, 37, 63,
  22, 36, 25, 17, 21, 51, 42,  3,
  27, 24,  2, 23,  8, 20, 16, 35,
  45, 12, 15, 52, 39, 53, 62, 56,
  31, 33,  7,  4, 29, 59, 40, 64,
  47,  6, 46, 18, 48, 57, 32, 50,
  28, 44,  1, 43, 14, 34,  9,  5,
  26, 11, 10, 58, 38, 54, 61, 60
];

const MANDALA_START = 303.0;
const GATE_ARC = 5.625;
const LINE_ARC = 0.9375;

/**
 * 閘門+爻 → 黃道經度中心值
 */
export function gateLineToLongitude(gate, line) {
  const idx = GATE_SEQUENCE.indexOf(gate);
  if (idx === -1) return null;
  const startDeg = MANDALA_START + idx * GATE_ARC + (line - 1) * LINE_ARC;
  const centerDeg = startDeg + LINE_ARC / 2;
  return ((centerDeg % 360) + 360) % 360;
}

/**
 * 列出 Piper 各行星的正確黃道經度目標值
 */
export function printExpectedLongitudes() {
  const tc = TEST_CASES[0];
  console.log('=== Personality 正確經度 ===');
  for (const [planet, data] of Object.entries(tc.expected.personality)) {
    const lon = gateLineToLongitude(data.gate, data.line);
    console.log(`${planet}: Gate ${data.gate}.${data.line} → ~${lon.toFixed(2)}°`);
  }
  console.log('\n=== Design 正確經度 ===');
  for (const [planet, data] of Object.entries(tc.expected.design)) {
    const lon = gateLineToLongitude(data.gate, data.line);
    console.log(`${planet}: Gate ${data.gate}.${data.line} → ~${lon.toFixed(2)}°`);
  }
}
