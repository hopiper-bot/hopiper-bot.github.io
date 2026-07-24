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

// === 五大城堡 ===
const CASTLES = [
  { name: "紅色東方城堡", color: "red", theme: "誕生・啟動", kinRange: "KIN 1-52",
    text: "你的 KIN 落在「誕生城堡」。這是整個 260 天週期的起始，代表你的生命帶有強烈的開創能量。你天生是啟動者、播種者 — 你的存在本身就是一個「開始」的訊號。注意事項：不要害怕踏出第一步，你的角色就是打開門讓能量流入。但也要記得：播種後需要耐心等待發芽，不是每一次開始都會立刻看到結果。" },
  { name: "白色北方城堡", color: "white", theme: "精煉・跨越", kinRange: "KIN 53-104",
    text: "你的 KIN 落在「精煉城堡」。這是穿越挑戰、淨化自我的階段。你的生命帶有「先苦後甜」的特質 — 透過面對困難和不舒服來磨出真正的你。注意事項：遇到阻礙時不要認為是壞運氣，這是精煉的過程。白色代表去蕪存菁，把不屬於你的東西放下，留下來的才是真金。" },
  { name: "藍色西方城堡", color: "blue", theme: "轉化・蛻變", kinRange: "KIN 105-156",
    text: "你的 KIN 落在「轉化城堡」。這是深度整合和內在蛻變的領域。你的生命會經歷比別人更多的「死亡與重生」— 不是字面的死亡，而是一次又一次的自我更新。注意事項：不要抗拒變化，它是你的超能力。每一次看似失去的背後，都在孕育更大的獲得。信任轉化的過程。" },
  { name: "黃色南方城堡", color: "yellow", theme: "成熟・收穫", kinRange: "KIN 157-208",
    text: "你的 KIN 落在「成熟城堡」。這是開花結果、展現成果的階段。你的生命帶有「綻放」的能量 — 你來這裡是為了把潛能具體實現、讓世界看見你的成果。注意事項：你有收穫的能力，但前提是之前有播種。選擇值得你投入的事物，然後大膽讓它成真。" },
  { name: "綠色中央城堡", color: "green", theme: "飛升・超越", kinRange: "KIN 209-260",
    text: "你的 KIN 落在「飛升城堡」。這是整個週期的最終章，代表超越與圓滿。你的生命帶有「看透全局」的智慧 — 你能整合所有經驗，達到更高的視野。注意事項：你不需要跟別人比速度或進度，你走的是更大的弧線。有時候放鬆和允許，比努力更重要。信任你已經走到這裡的一切。" },
];

// === 13 音階（波符中的階段任務） ===
const TONE_STAGES = [
  { stage: "第1天：設定意圖", task: "這是波符的起始點。你的任務是「確立目標」— 問自己：我這趟旅程想要什麼？把意圖像磁鐵一樣清楚地設定好，接下來12天的能量都會朝這個方向運作。" },
  { stage: "第2天：辨識挑戰", task: "這是看見二元的一天。你的任務是「面對矛盾」— 什麼東西在阻擋你的目標？不要急著解決，先看清楚挑戰的全貌。承認困難的存在，才能真正跨越它。" },
  { stage: "第3天：啟動行動", task: "這是通電的一天。你的任務是「動起來」— 把前兩天的想法和觀察化為具體行動。不需要完美，只需要開始。服務他人也是一種啟動。" },
  { stage: "第4天：建立架構", task: "這是定形的一天。你的任務是「給想法一個形狀」— 把抽象的目標變成具體的步驟。是時候從「我想要」變成「我要怎麼做到」。寫下來、畫出來、列清單。" },
  { stage: "第5天：發光賦能", task: "這是綻放的一天。你的任務是「展現出來」— 讓別人看見你在做的事。這不是炫耀，是讓你的能量輻射出去，吸引盟友和資源。大膽被看見。" },
  { stage: "第6天：調整平衡", task: "這是整理的一天。你的任務是「找到節奏」— 檢視目前的進展是否平衡。哪裡做太多？哪裡被忽略？調整步調，讓一切流動得更順暢。" },
  { stage: "第7天：調頻對齊", task: "這是波符的正中間，也是最有靈性的一天。你的任務是「向內傾聽」— 停下來感受：你走在對的方向嗎？這一天的直覺特別準，信任它。" },
  { stage: "第8天：整合校準", task: "這是誠信的一天。你的任務是「言行一致」— 檢查你的行動是否符合你的初心？有沒有偏離最初設定的意圖？校準回來。" },
  { stage: "第9天：加速實現", task: "這是衝刺的一天。你的任務是「全力推進」— 你已經走了大半路程，現在是加速的時候。把意圖化為脈動，用堅定的節奏推向目標。" },
  { stage: "第10天：顯化成果", task: "這是收穫的一天。你的任務是「讓成果落地」— 前面9天的累積在這裡具體顯化。問自己：我完成了什麼？即使是小成果也值得慶祝。" },
  { stage: "第11天：釋放放手", task: "這是解放的一天。你的任務是「放下不需要的」— 成果已經拿到了，現在把過程中不再需要的東西放手。釋放舊能量，為新循環騰出空間。" },
  { stage: "第12天：分享合作", task: "這是連結的一天。你的任務是「跟別人分享」— 把你的經驗和成果與他人分享。獨樂不如眾樂，合作會帶來意想不到的加乘效果。" },
  { stage: "第13天：圓滿超越", task: "這是波符的最後一天。你的任務是「整合一切，準備下一程」— 你完成了整個13天的旅程。回顧全程，帶著領悟超越到下一個層次。結束就是新的開始。" },
];

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

/** 城堡計算 — KIN 落在哪個城堡 */
function castle(kin) {
  const idx = Math.floor((kin - 1) / 52);
  return CASTLES[idx];
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
  const c = castle(ds.kin);
  const toneStage = TONE_STAGES[w.position - 1];
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
    <h3>🏰 你的命運城堡：${c.name}</h3>
    <p style="font-size:.85rem;color:var(--muted);margin:0 0 8px;">${c.kinRange} · 主題：${c.theme}</p>
    <p class="meaning">${c.text}</p>
    <div class="divider"></div>
    <h3>🎵 你的波符音階位置：${toneStage.stage}</h3>
    <p style="font-size:.85rem;color:var(--muted);margin:0 0 8px;">你在${w.startSeal.zh}波符中站在第 ${w.position} 格</p>
    <p class="meaning">${toneStage.task}</p>
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
