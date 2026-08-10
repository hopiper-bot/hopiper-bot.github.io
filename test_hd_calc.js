// 獨立測試腳本 - 驗算 Piper 1982/9/11 03:05 UTC+8
// 放在 KIRO 根目錄避免 destiny-reading 的 git 問題

function mod(n, m) { return ((n % m) + m) % m; }
function normalizeDeg(deg) { return mod(deg, 360); }
function sinDeg(deg) { return Math.sin(deg * Math.PI / 180); }
function cosDeg(deg) { return Math.cos(deg * Math.PI / 180); }

function dateToJDN(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function dateTimeToJD(year, month, day, hour, minute, utcOffset) {
  const utHour = hour - utcOffset + minute / 60;
  const jdn = dateToJDN(year, month, day);
  return jdn + (utHour - 12) / 24;
}

function jdToJC(jd) { return (jd - 2451545.0) / 36525.0; }

function sunLongitude(jd) {
  const T = jdToJC(jd);
  const L0 = normalizeDeg(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = normalizeDeg(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sinDeg(M)
    + (0.019993 - 0.000101 * T) * sinDeg(2 * M)
    + 0.000289 * sinDeg(3 * M);
  const sunTrue = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const apparent = sunTrue - 0.00569 - 0.00478 * sinDeg(omega);
  return normalizeDeg(apparent);
}

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

function longitudeToGate(longitude) {
  let offset = longitude - MANDALA_START;
  if (offset < 0) offset += 360;
  const gateIndex = Math.floor(offset / GATE_ARC);
  const gate = GATE_SEQUENCE[gateIndex % 64];
  const withinGate = offset - gateIndex * GATE_ARC;
  const line = Math.floor(withinGate / LINE_ARC) + 1;
  return { gate, line: Math.min(line, 6) };
}

function findDesignJD(birthJD) {
  const birthSunLon = sunLongitude(birthJD);
  const targetLon = normalizeDeg(birthSunLon - 88);
  let jdEst = birthJD - 88 / 0.9856;
  for (let i = 0; i < 20; i++) {
    const currentLon = sunLongitude(jdEst);
    let diff = targetLon - currentLon;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    if (Math.abs(diff) < 0.001) break;
    jdEst += diff / 0.9856;
  }
  return jdEst;
}

// ===== 計算 =====
const jd = dateTimeToJD(1982, 9, 11, 3, 5, 8);
const sunLon = sunLongitude(jd);
const sunGate = longitudeToGate(sunLon);

const earthLon = normalizeDeg(sunLon + 180);
const earthGate = longitudeToGate(earthLon);

const designJD = findDesignJD(jd);
const dSunLon = sunLongitude(designJD);
const dSunGate = longitudeToGate(dSunLon);
const dEarthLon = normalizeDeg(dSunLon + 180);
const dEarthGate = longitudeToGate(dEarthLon);

console.log("=== Piper 1982/9/11 03:05 UTC+8 ===");
console.log("P Sun: " + sunLon.toFixed(4) + " -> Gate " + sunGate.gate + "." + sunGate.line + " (expected 47.1)");
console.log("P Earth: " + earthLon.toFixed(4) + " -> Gate " + earthGate.gate + "." + earthGate.line + " (expected 22.1)");
console.log("D Sun: " + dSunLon.toFixed(4) + " -> Gate " + dSunGate.gate + "." + dSunGate.line + " (expected 45.3)");
console.log("D Earth: " + dEarthLon.toFixed(4) + " -> Gate " + dEarthGate.gate + "." + dEarthGate.line + " (expected 26.x)");
console.log("Profile: " + sunGate.line + "/" + dSunGate.line + " (expected 1/3)");

// offset debug
let sunOffset = sunLon - MANDALA_START;
if (sunOffset < 0) sunOffset += 360;
console.log("\nDebug: sunOffset=" + sunOffset.toFixed(4) + " gateIdx=" + Math.floor(sunOffset / GATE_ARC));
