// 驗算各行星的正確經度 vs 我們程式算出來的
// 用 Node.js 直接跑，不用 import

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
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sinDeg(M)
    + (0.019993 - 0.000101 * T) * sinDeg(2 * M) + 0.000289 * sinDeg(3 * M);
  const sunTrue = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  return normalizeDeg(sunTrue - 0.00569 - 0.00478 * sinDeg(omega));
}

function moonLongitude(jd) {
  const T = jdToJC(jd);
  const Lp = normalizeDeg(218.3165 + 481267.8813 * T);
  const Mp = normalizeDeg(134.9634 + 477198.8676 * T);
  const M = normalizeDeg(357.5291 + 35999.0503 * T);
  const D = normalizeDeg(297.8502 + 445267.1115 * T);
  const F = normalizeDeg(93.2720 + 483202.0175 * T);
  return normalizeDeg(Lp + 6.289*sinDeg(Mp) - 1.274*sinDeg(2*D-Mp) + 0.658*sinDeg(2*D)
    + 0.214*sinDeg(2*Mp) - 0.186*sinDeg(M) - 0.114*sinDeg(2*F));
}

function northNodeLongitude(jd) {
  const T = jdToJC(jd);
  return normalizeDeg(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T);
}

// Kepler solver
function solveKepler(M, e) {
  const M_rad = M * Math.PI / 180;
  let E = M_rad;
  for (let i = 0; i < 15; i++) {
    const dE = (M_rad - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E * 180 / Math.PI;
}
function trueAnomaly(E, e) {
  const E_rad = E * Math.PI / 180;
  const y = Math.sqrt(1 + e) * Math.sin(E_rad / 2);
  const x = Math.sqrt(1 - e) * Math.cos(E_rad / 2);
  return normalizeDeg(2 * Math.atan2(y, x) * 180 / Math.PI);
}
function geoLon(jd, L, a, e, omega) {
  const M = normalizeDeg(L - omega);
  const E = solveKepler(M, e);
  const nu = trueAnomaly(E, e);
  const helioLon = normalizeDeg(nu + omega);
  const r = a * (1 - e * e) / (1 + e * cosDeg(nu));
  const earthLon = normalizeDeg(sunLongitude(jd) + 180);
  const R = 1.0;
  const x = r * cosDeg(helioLon) - R * cosDeg(earthLon);
  const y = r * sinDeg(helioLon) - R * sinDeg(earthLon);
  return normalizeDeg(atan2Deg(y, x));
}

function mercuryGeoLon(jd) {
  const T = jdToJC(jd);
  const L = normalizeDeg(252.250906 + 149474.0722491 * T);
  const e = 0.20563175 + 0.000020407 * T;
  const omega = normalizeDeg(77.456119 + 0.1588643 * T);
  return geoLon(jd, L, 0.387098310, e, omega);
}
function venusGeoLon(jd) {
  const T = jdToJC(jd);
  const L = normalizeDeg(181.979801 + 58519.2130302 * T);
  const e = 0.00677192 - 0.000047765 * T;
  const omega = normalizeDeg(131.563703 + 0.0048746 * T);
  return geoLon(jd, L, 0.723329820, e, omega);
}
function marsGeoLon(jd) {
  const T = jdToJC(jd);
  const L = normalizeDeg(355.433000 + 19141.6964471 * T);
  const e = 0.09340065 + 0.000090484 * T;
  const omega = normalizeDeg(336.060234 + 0.4439016 * T);
  return geoLon(jd, L, 1.523679342, e, omega);
}
function jupiterGeoLon(jd) {
  const T = jdToJC(jd);
  const L = normalizeDeg(34.351519 + 3036.3027748 * T);
  const e = 0.04849793 + 0.000163225 * T;
  const omega = normalizeDeg(14.331207 + 0.2155209 * T);
  return geoLon(jd, L, 5.202603209, e, omega);
}
function saturnGeoLon(jd) {
  const T = jdToJC(jd);
  const L = normalizeDeg(50.077444 + 1223.5110686 * T);
  const e = 0.05554814 - 0.000346641 * T;
  const omega = normalizeDeg(93.057237 + 0.5665415 * T);
  return geoLon(jd, L, 9.554909192, e, omega);
}
function uranusGeoLon(jd) {
  const T = jdToJC(jd);
  const L = normalizeDeg(314.055005 + 429.8640561 * T);
  const e = 0.04638122 - 0.000027293 * T;
  const omega = normalizeDeg(173.005291 + 0.0893212 * T);
  return geoLon(jd, L, 19.218446062, e, omega);
}
function neptuneGeoLon(jd) {
  const T = jdToJC(jd);
  const L = normalizeDeg(304.348665 + 219.8833092 * T);
  const e = 0.00945575 + 0.000006064 * T;
  const omega = normalizeDeg(48.120276 + 0.0291866 * T);
  return geoLon(jd, L, 30.110386869, e, omega);
}
function plutoGeoLon(jd) {
  const T = jdToJC(jd);
  const L = normalizeDeg(238.956785 + 145.1780752 * T);
  const e = 0.24880766 + 0.00006465 * T;
  const omega = normalizeDeg(224.066930 + 0.0041013 * T);
  return geoLon(jd, L, 39.48168677, e, omega);
}

// Gate lookup
const GATE_SEQUENCE = [41,19,13,49,30,55,37,63,22,36,25,17,21,51,42,3,27,24,2,23,8,20,16,35,45,12,15,52,39,53,62,56,31,33,7,4,29,59,40,64,47,6,46,18,48,57,32,50,28,44,1,43,14,34,9,5,26,11,10,58,38,54,61,60];
const MANDALA_START = 303.0;
const GATE_ARC = 5.625;
const LINE_ARC = 0.9375;

function longitudeToGate(lon) {
  let offset = lon - MANDALA_START;
  if (offset < 0) offset += 360;
  const gateIndex = Math.floor(offset / GATE_ARC);
  const gate = GATE_SEQUENCE[gateIndex % 64];
  const withinGate = offset - gateIndex * GATE_ARC;
  const line = Math.min(Math.floor(withinGate / LINE_ARC) + 1, 6);
  return { gate, line };
}

function gateToLonCenter(gate, line) {
  const idx = GATE_SEQUENCE.indexOf(gate);
  const startDeg = MANDALA_START + idx * GATE_ARC + (line - 1) * LINE_ARC + LINE_ARC / 2;
  return normalizeDeg(startDeg);
}

// ===== 主程式 =====
const jd = dateTimeToJD(1982, 9, 11, 3, 5, 8);
console.log("JD:", jd.toFixed(6), "  T:", jdToJC(jd).toFixed(8));

// Design JD
const birthSunLon = sunLongitude(jd);
const targetLon = normalizeDeg(birthSunLon - 88);
let designJD = jd - 88 / 0.9856;
for (let i = 0; i < 20; i++) {
  const cur = sunLongitude(designJD);
  let diff = targetLon - cur;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  if (Math.abs(diff) < 0.001) break;
  designJD += diff / 0.9856;
}

// Expected values from humandesignasia.org
const expected = {
  personality: [
    ['Sun',    47, 1, sunLongitude],
    ['Earth',  22, 1, (jd) => normalizeDeg(sunLongitude(jd) + 180)],
    ['Moon',   45, 2, moonLongitude],
    ['NNode',  39, 2, northNodeLongitude],
    ['SNode',  38, 2, (jd) => normalizeDeg(northNodeLongitude(jd) + 180)],
    ['Mercury',48, 5, mercuryGeoLon],
    ['Venus',  59, 4, venusGeoLon],
    ['Mars',   43, 6, marsGeoLon],
    ['Jupiter',44, 1, jupiterGeoLon],
    ['Saturn', 57, 6, saturnGeoLon],
    ['Uranus', 34, 1, uranusGeoLon],
    ['Neptune',11, 2, neptuneGeoLon],
    ['Pluto',  32, 5, plutoGeoLon],
  ],
  design: [
    ['Sun',    45, 3, sunLongitude],
    ['Earth',  26, 3, (jd) => normalizeDeg(sunLongitude(jd) + 180)],
    ['Moon',   41, 5, moonLongitude],
    ['NNode',  39, 5, northNodeLongitude],
    ['SNode',  38, 5, (jd) => normalizeDeg(northNodeLongitude(jd) + 180)],
    ['Mercury',16, 2, mercuryGeoLon],
    ['Venus',  24, 6, venusGeoLon],
    ['Mars',   18, 2, marsGeoLon],
    ['Jupiter',50, 5, jupiterGeoLon],
    ['Saturn', 57, 1, saturnGeoLon],
    ['Uranus', 34, 2, uranusGeoLon],
    ['Neptune',11, 4, neptuneGeoLon],
    ['Pluto',  32, 4, plutoGeoLon],
  ],
};

console.log("\n========== PERSONALITY (JD=" + jd.toFixed(3) + ") ==========");
console.log("Planet     | Expected  | Got       | ExpLon    | GotLon    | Diff");
console.log("-".repeat(75));
let pErrors = 0;
for (const [name, expGate, expLine, fn] of expected.personality) {
  const gotLon = fn(jd);
  const got = longitudeToGate(gotLon);
  const expLon = gateToLonCenter(expGate, expLine);
  let diff = gotLon - expLon;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  const ok = (got.gate === expGate && got.line === expLine) ? '  OK' : ' *** WRONG';
  if (got.gate !== expGate || got.line !== expLine) pErrors++;
  console.log(
    name.padEnd(10) + " | " +
    (expGate + "." + expLine).padEnd(9) + " | " +
    (got.gate + "." + got.line).padEnd(9) + " | " +
    expLon.toFixed(2).padStart(7) + "   | " +
    gotLon.toFixed(2).padStart(7) + "   | " +
    diff.toFixed(2).padStart(7) + ok
  );
}

console.log("\n========== DESIGN (JD=" + designJD.toFixed(3) + ") ==========");
console.log("Planet     | Expected  | Got       | ExpLon    | GotLon    | Diff");
console.log("-".repeat(75));
let dErrors = 0;
for (const [name, expGate, expLine, fn] of expected.design) {
  const gotLon = fn(designJD);
  const got = longitudeToGate(gotLon);
  const expLon = gateToLonCenter(expGate, expLine);
  let diff = gotLon - expLon;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  const ok = (got.gate === expGate && got.line === expLine) ? '  OK' : ' *** WRONG';
  if (got.gate !== expGate || got.line !== expLine) dErrors++;
  console.log(
    name.padEnd(10) + " | " +
    (expGate + "." + expLine).padEnd(9) + " | " +
    (got.gate + "." + got.line).padEnd(9) + " | " +
    expLon.toFixed(2).padStart(7) + "   | " +
    gotLon.toFixed(2).padStart(7) + "   | " +
    diff.toFixed(2).padStart(7) + ok
  );
}

console.log("\n=== SUMMARY ===");
console.log("Personality errors: " + pErrors + "/13");
console.log("Design errors: " + dErrors + "/13");
console.log("Total: " + (pErrors + dErrors) + "/26 wrong");
