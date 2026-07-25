/**
 * 快速驗算 Piper 1982/9/11 03:05 UTC+8 的人類圖行星位置
 */

// 手動 inline 計算（不用 import，直接算）
function mod(n, m) { return ((n % m) + m) % m; }
function normalizeDeg(deg) { return mod(deg, 360); }
function sinDeg(deg) { return Math.sin(deg * Math.PI / 180); }
function cosDeg(deg) { return Math.cos(deg * Math.PI / 180); }
function atan2Deg(y, x) { return Math.atan2(y, x) * 180 / Math.PI; }

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
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sinDeg(M)
    + (0.019993 - 0.000101 * T) * sinDeg(2 * M)
    + 0.000289 * sinDeg(3 * M);
  const sunTrue = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const apparent = sunTrue - 0.00569 - 0.00478 * sinDeg(omega);
  return normalizeDeg(apparent);
}

// Gate sequence
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

// ===== 計算 =====
const jd = dateTimeToJD(1982, 9, 11, 3, 5, 8);
console.log('JD:', jd);
console.log('T:', jdToJC(jd));

const sunLon = sunLongitude(jd);
console.log('\n=== Personality ===');
console.log('Sun longitude:', sunLon.toFixed(4) + '°');
const sunGate = longitudeToGate(sunLon);
console.log('Sun Gate:', sunGate.gate + '.' + sunGate.line);
console.log('Expected: Gate 47, Line 1 (from humandesignasia)');

const earthLon = normalizeDeg(sunLon + 180);
console.log('\nEarth longitude:', earthLon.toFixed(4) + '°');
const earthGate = longitudeToGate(earthLon);
console.log('Earth Gate:', earthGate.gate + '.' + earthGate.line);
console.log('Expected: Gate 22, Line 1');

// Design time (sun - 88°)
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

const designJD = findDesignJD(jd);
const dSunLon = sunLongitude(designJD);
console.log('\n=== Design ===');
console.log('Design JD:', designJD);
console.log('Design Sun longitude:', dSunLon.toFixed(4) + '°');
const dSunGate = longitudeToGate(dSunLon);
console.log('Design Sun Gate:', dSunGate.gate + '.' + dSunGate.line);
console.log('Expected: Gate 45, Line 3 (Cross of Rulership)');

const dEarthLon = normalizeDeg(dSunLon + 180);
const dEarthGate = longitudeToGate(dEarthLon);
console.log('Design Earth Gate:', dEarthGate.gate + '.' + dEarthGate.line);
console.log('Expected: Gate 26');

console.log('\n=== Profile ===');
console.log('P Sun Line:', sunGate.line, '/ D Sun Line:', dSunGate.line);
console.log('Profile:', sunGate.line + '/' + dSunGate.line);
console.log('Expected: 1/3');

// 驗算 offset
console.log('\n=== Debug offset ===');
let sunOffset = sunLon - MANDALA_START;
if (sunOffset < 0) sunOffset += 360;
console.log('Sun offset from Mandala start:', sunOffset.toFixed(4) + '°');
console.log('Gate index:', Math.floor(sunOffset / GATE_ARC));
console.log('Gate at that index:', GATE_SEQUENCE[Math.floor(sunOffset / GATE_ARC)]);
