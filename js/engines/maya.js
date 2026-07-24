/**
 * maya.js — 馬雅曆引擎（Dreamspell + GMT）
 * 移植自 Piper 現有的馬雅曆 HTML
 */

import { mod, dateToJDN } from '../lib/utils.js';
import { SEALS, TONES } from '../data/maya-text.js';

// === 常量 ===
const COLOR_ZH = { red: "紅", white: "白", blue: "藍", yellow: "黃" };
const MONTH_OFF = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const GUIDE_OFFSET = [0, 12, 4, 16, 8];

// === 核心計算 ===

/** Dreamspell KIN 計算 */
function dreamspellKin(y, m, d) {
  const yearVal = mod(217 + 105 * (y - 2013), 260);
  const kin = mod(yearVal + MONTH_OFF[m - 1] + d - 1, 260) + 1;
  return { kin, tone: mod(kin - 1, 13) + 1, sealIdx: mod(kin - 1, 20) };
}

/** GMT Tzolkin 計算 (correlation 584283) */
function gmtTzolkin(y, m, d) {
  const diff = dateToJDN(y, m, d) - 584283;
  return { tone: mod(diff + 3, 13) + 1, sealIdx: mod(diff + 19, 20) };
}

/** 從 seal index + tone 找 KIN */
function kinFromSealTone(sealIdx, tone) {
  for (let k = 1; k <= 260; k++) {
    if (mod(k - 1, 20) === sealIdx && mod(k - 1, 13) + 1 === tone) return k;
  }
  return 1;
}

/** 神諭五角計算 */
function oracle(kin) {
  const sealNum = mod(kin - 1, 20) + 1;
  const tone = mod(kin - 1, 13) + 1;
  const guideSealIdx = mod(sealNum - 1 + GUIDE_OFFSET[(tone - 1) % 5], 20);
  let analogSealIdx = mod(19 - (sealNum - 1), 20);
  const guideKin = kinFromSealTone(guideSealIdx, tone);
  const analogKin = kinFromSealTone(analogSealIdx, tone);
  const antipodeKin = mod(kin - 1 + 130, 260) + 1;
  const occultKin = 261 - kin;
  return { destiny: kin, guide: guideKin, analog: analogKin, antipode: antipodeKin, occult: occultKin };
}

/** 波符計算 */
function wavespell(kin) {
  const idx = Math.floor(mod(kin - 1, 260) / 13);
  const start = idx * 13 + 1;
  return { start, startSeal: SEALS[mod(start - 1, 20)], position: mod(kin - 1, 13) + 1 };
}

/** KIN 完整資訊 */
function kinInfo(kin) {
  const seal = SEALS[mod(kin - 1, 20)];
  const tone = TONES[mod(kin - 1, 13)];
  return { kin, seal, tone, name: `${tone.zh}的${seal.zh}` };
}

// === 年度能量 ===

function annualDreamspell(birthMonth, birthDay) {
  const now = new Date();
  let gy = now.getFullYear();
  const m = now.getMonth() + 1, d = now.getDate();
  if (m < 7 || (m === 7 && d < 26)) gy -= 1;
  const yearKin = dreamspellKin(gy, 7, 26).kin;
  const personalKin = dreamspellKin(now.getFullYear(), birthMonth, birthDay).kin;
  return { yearKin, personalKin, galacticYear: `${gy}/7/26 – ${gy + 1}/7/25` };
}

function annualGmt(birthMonth, birthDay) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
  const todayGmt = gmtTzolkin(y, m, d);
  const todayKin = kinFromSealTone(todayGmt.sealIdx, todayGmt.tone);
  const bdayGmt = gmtTzolkin(y, birthMonth, birthDay);
  const personalKin = kinFromSealTone(bdayGmt.sealIdx, bdayGmt.tone);
  return { todayKin, personalKin };
}

// === 主計算函式 ===

/**
 * 計算馬雅曆完整結果
 * @param {{year, month, day}} birthData
 * @returns {{status: string, data: object|null, html: string, error: string|null}}
 */
export function calculate(birthData) {
  const { year: y, month: m, day: d } = birthData;

  try {
    // Dreamspell
    const ds = dreamspellKin(y, m, d);
    const dsOracle = oracle(ds.kin);
    const dsWave = wavespell(ds.kin);
    const dsInfo = kinInfo(ds.kin);

    // GMT
    const gmt = gmtTzolkin(y, m, d);
    const gmtKin = kinFromSealTone(gmt.sealIdx, gmt.tone);
    const gmtOracle = oracle(gmtKin);
    const gmtWave = wavespell(gmtKin);
    const gmtInfo = kinInfo(gmtKin);

    // 年度能量
    const annualDs = annualDreamspell(m, d);
    const annualGmtData = annualGmt(m, d);

    const data = {
      dreamspell: { kin: ds.kin, seal: SEALS[ds.sealIdx], tone: TONES[ds.tone - 1], oracle: dsOracle, wavespell: dsWave },
      gmt: { kin: gmtKin, seal: SEALS[gmt.sealIdx], tone: TONES[gmt.tone - 1], oracle: gmtOracle, wavespell: gmtWave },
      annualDream: annualDs,
      annualGmt: annualGmtData,
    };

    const html = renderMaya(data);
    return { status: 'ok', data, html, error: null };
  } catch (err) {
    return { status: 'error', data: null, html: '', error: `馬雅曆計算錯誤：${err.message}` };
  }
}

// === 渲染 ===

function renderMaya(data) {
  const { dreamspell, gmt, annualDream, annualGmt } = data;
  const dsSeal = dreamspell.seal;
  const dsTone = dreamspell.tone;
  const dsInfo2 = kinInfo(dreamspell.kin);
  const gmtInfo2 = kinInfo(gmt.kin);

  return `
    <div class="tabs" style="margin-bottom:12px;">
      <div class="tab active" onclick="this.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));this.classList.add('active');this.parentElement.nextElementSibling.style.display='block';this.parentElement.nextElementSibling.nextElementSibling.style.display='none';">Dreamspell</div>
      <div class="tab" onclick="this.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));this.classList.add('active');this.parentElement.nextElementSibling.style.display='none';this.parentElement.nextElementSibling.nextElementSibling.style.display='block';">GMT 傳統曆</div>
    </div>
    <div>
      ${renderDreamspell(dreamspell, annualDream)}
    </div>
    <div style="display:none;">
      ${renderGmt(gmt, annualGmt)}
    </div>
    <div class="note">💡 <b>兩套系統為何不同？</b>Dreamspell 是 1987 年荷西·阿圭列斯創的「13 月亮曆」，會跳過 2/29，是台港最常玩的 KIN 系統；GMT（584283）則是考古學界公認、真正對得上馬雅石碑的傳統曆。</div>
  `;
}

function renderDreamspell(ds, annual) {
  const seal = ds.seal;
  const tone = ds.tone;
  const info = kinInfo(ds.kin);
  const o = ds.oracle;
  const w = ds.wavespell;
  const yearInfo = kinInfo(annual.yearKin);
  const personalInfo = kinInfo(annual.personalKin);

  return `
    <div class="sig">
      <div class="kin">KIN ${ds.kin} · Galactic Signature</div>
      <div class="big">${info.name}</div>
      <div class="glyphs">${sealGlyph(seal)}</div>
      <span class="tag tag-${seal.color}">${COLOR_ZH[seal.color]}色能量</span>
    </div>
    <h3>圖騰：${seal.zh}（${seal.en}）</h3>
    <p class="meaning">${seal.text}</p>
    <h3>調性：${tone.num} · ${tone.zh}（<span class="kw">${tone.kw}</span>）</h3>
    <p class="meaning">${tone.text}</p>
    <div class="divider"></div>
    <h3>綜合解讀</h3>
    <p class="meaning">你是 <span class="kw">KIN ${ds.kin}·${info.name}</span>。這是一股「以<span class="kw">${tone.kw}</span>為主軸、帶著${seal.zh}特質」的生命能量：${seal.text.split("。")[0]}，同時，${tone.text.split("。")[0]}。把這兩股力量結合，就是你此生擅長發揮的方向。</p>
    <div class="divider"></div>
    ${renderOracle(o)}
    <div class="divider"></div>
    ${renderWavespell(w, "波符")}
    <div class="divider"></div>
    <h3>📅 流年能量</h3>
    <p class="meaning"><b>當前馬雅年</b>（${annual.galacticYear}）＝ <span class="kw">${yearInfo.name}</span>（KIN ${annual.yearKin}）。集體共享的能量主題：${yearInfo.seal.text.split("。")[0]}；${yearInfo.tone.text.split("。")[0]}。</p>
    <p class="meaning"><b>你今年生日的 KIN</b> ＝ <span class="kw">${personalInfo.name}</span>（KIN ${annual.personalKin}）。你這一年的個人能量色彩：${personalInfo.seal.text.split("。")[0]}。</p>
  `;
}

function renderGmt(gmt, annual) {
  const seal = gmt.seal;
  const tone = gmt.tone;
  const info = kinInfo(gmt.kin);
  const o = gmt.oracle;
  const w = gmt.wavespell;
  const todayInfo = kinInfo(annual.todayKin);
  const personalInfo = kinInfo(annual.personalKin);
  const now = new Date();

  return `
    <div class="sig">
      <div class="kin">GMT 584283 · 真實馬雅 Tzolk'in</div>
      <div class="big">${tone.num} ${seal.en}（${seal.zh}）</div>
      <div class="glyphs">${sealGlyph(seal)}</div>
    </div>
    <h3>日印：${seal.en} ${seal.zh}</h3>
    <p class="meaning">${seal.text}</p>
    <h3>調性數字：${tone.num}（${tone.zh}·<span class="kw">${tone.kw}</span>）</h3>
    <p class="meaning">${tone.text}</p>
    <p class="sub" style="color:var(--muted);font-size:.85rem;">※ GMT 為考古學界通用對照，是真正對得上馬雅碑文的曆法。</p>
    <div class="divider"></div>
    ${renderOracle(o)}
    <div class="divider"></div>
    ${renderWavespell(w, "13 天週期（Trecena）")}
    <div class="divider"></div>
    <h3>📅 流年能量（GMT）</h3>
    <p class="meaning"><b>今天的馬雅日</b>（${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}）＝ <span class="kw">${todayInfo.name}</span>。當下的集體能量：${todayInfo.seal.text.split("。")[0]}。</p>
    <p class="meaning"><b>你今年生日</b> ＝ <span class="kw">${personalInfo.name}</span>。你這一年的個人能量：${personalInfo.seal.text.split("。")[0]}。</p>
  `;
}

function renderOracle(o) {
  const guide = kinInfo(o.guide);
  const analog = kinInfo(o.analog);
  const antipode = kinInfo(o.antipode);
  const occult = kinInfo(o.occult);
  const destiny = kinInfo(o.destiny);

  return `
    <h3>🔮 神諭五角</h3>
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;margin:6px 0 8px;">
      ${oracleCell("引導", guide)}
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        ${oracleCell("挑戰", antipode)}
        ${oracleCell("主印記", destiny, true)}
        ${oracleCell("支持", analog)}
      </div>
      ${oracleCell("隱藏推動", occult)}
    </div>
    <p class="meaning" style="font-size:.8rem;color:var(--muted);"><b>主印記</b>＝本質　·　<b>引導</b>＝方向指引　·　<b>支持</b>＝背後助力　·　<b>挑戰</b>＝要學習的功課　·　<b>隱藏</b>＝深層驅動力</p>
  `;
}

function oracleCell(role, info, center = false) {
  const borderStyle = center ? 'border-color:var(--accent);background:linear-gradient(135deg,rgba(245,197,66,.16),rgba(123,108,246,.16));' : '';
  return `<div style="background:var(--input-bg);border:1px solid rgba(123,108,246,.4);border-radius:14px;padding:12px 10px;width:150px;text-align:center;${borderStyle}">
    <div style="font-size:.75rem;color:var(--muted);letter-spacing:1px;">${role}</div>
    <div style="font-size:1.7rem;margin:4px 0;">${info.seal.glyph}</div>
    <div style="font-weight:700;font-size:.95rem;">${info.name}</div>
    <div style="font-size:.72rem;color:var(--muted);margin-top:2px;">KIN ${info.kin}</div>
  </div>`;
}

function renderWavespell(w, label) {
  let strip = '';
  for (let i = 0; i < 13; i++) {
    const k = w.start + i;
    const seal = SEALS[mod(k - 1, 20)];
    const cur = (i + 1 === w.position);
    const curStyle = cur ? 'border-color:var(--accent);background:linear-gradient(135deg,rgba(245,197,66,.22),rgba(123,108,246,.16));transform:translateY(-3px);' : '';
    const toneStyle = cur ? 'color:var(--accent);font-weight:700;' : 'color:var(--muted);';
    strip += `<div style="width:46px;padding:7px 2px;border-radius:10px;background:var(--input-bg);border:1px solid rgba(123,108,246,.3);text-align:center;${curStyle}">
      <div style="font-size:.7rem;${toneStyle}">${i + 1}</div>
      <div style="font-size:1.25rem;">${seal.glyph}</div>
    </div>`;
  }

  const pt = TONES[w.position - 1];
  return `
    <h3>🌊 ${label}：${w.startSeal.zh}波符</h3>
    <p class="meaning">${label}是 13 天一組的能量之浪，主題由第 1 格決定。你屬於「<span class="kw">${w.startSeal.zh}波符</span>」——這一浪的使命：${w.startSeal.text.split("。")[0]}。</p>
    <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:12px 0;">${strip}</div>
    <p class="meaning">你站在第 <span class="kw">${w.position}</span> 格 · <span class="kw">${pt.zh}（${pt.kw}）</span>：${pt.text.split("。")[0]}。這是你在這股浪潮中扮演的角色。</p>
  `;
}

function sealGlyph(seal) {
  return `<div class="glyph">${seal.glyph}</div>`;
}
