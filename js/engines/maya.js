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
  { name: "紅色東方城堡", color: "red", theme: "開創期", kinRange: "KIN 1-52",
    text: "你的人生劇本基調是「開創者」。你天生是那個打開門、踏出第一步的人。別人還在猶豫的時候你已經出發了。<br><br>🔑 <b>用途</b>：當你迷惘時，記住你的角色就是「開始」— 不需要等萬全準備，先動再說。你的勇氣會感染身邊的人跟著你一起走。<br><br>⚠️ <b>注意</b>：播種後要有耐心。不是每一次開始都會馬上看到結果，但沒有你的開始，就沒有後面的一切。" },
  { name: "白色北方城堡", color: "white", theme: "磨練期", kinRange: "KIN 53-104",
    text: "你的人生劇本基調是「先苦後甜」。你比別人多了一些考驗，但每一次磨練都讓你更強。你是那種回頭看才發現自己走了很遠的人。<br><br>🔑 <b>用途</b>：遇到困難時不要覺得是壞運，這就是你的修煉場。別人跳過的課，你要補回來 — 但補完之後你比誰都穩。<br><br>⚠️ <b>注意</b>：不要逃避不舒服的感覺。白色城堡的使命就是「去蕪存菁」— 把不屬於你的放下，留下來的才是真金。" },
  { name: "藍色西方城堡", color: "blue", theme: "轉化期", kinRange: "KIN 105-156",
    text: "你的人生劇本基調是「蛻變重生」。你會經歷比別人多的「打掉重練」— 工作換跑道、關係大翻轉、想法徹底改變。但每一次重來你都升級了。<br><br>🔑 <b>用途</b>：不要抗拒變化，它是你的超能力。當你感覺「舊的我死掉了」，恭喜 — 新的你正在誕生。<br><br>⚠️ <b>注意</b>：轉化需要時間消化。給自己喘息的空間，不要一次變太多。信任過程。" },
  { name: "黃色南方城堡", color: "yellow", theme: "收穫期", kinRange: "KIN 157-208",
    text: "你的人生劇本基調是「開花結果」。你來這裡是為了把潛能變成看得見的成果。你有讓事情「成真」的能力。<br><br>🔑 <b>用途</b>：你適合收穫，但前提是有播種。選對方向然後大膽投入，結果會比你想像的好。<br><br>⚠️ <b>注意</b>：不要只享受成果而忘了感恩過程中幫過你的人。分享你的豐盛，才會有更多流向你。" },
  { name: "綠色中央城堡", color: "green", theme: "圓滿期", kinRange: "KIN 209-260",
    text: "你的人生劇本基調是「看透全局」。你站在比較高的視角看人生，有一種超越年齡的智慧。你不需要跟別人比速度。<br><br>🔑 <b>用途</b>：你的角色是整合 — 把所有經驗串起來，看見更大的意義。你適合當導師、顧問、智者。<br><br>⚠️ <b>注意</b>：不要因為「看透了」就不參與。你的智慧需要分享出去才有價值。圓滿不是退場，是提升。" },
];

// === 13 音階（波符中的角色定位） ===
const TONE_STAGES = [
  { stage: "第1格：隊長", task: "你是「設定方向」的人。在團隊中你的角色是確立目標、凝聚共識。你天生會吸引資源和人朝你的方向靠攏。善用這份磁力：先想清楚你要什麼，其他的會自然聚集過來。" },
  { stage: "第2格：觀察者", task: "你是「看見問題」的人。別人看不到的矛盾和挑戰，你一眼就發現。這不是悲觀，是你的天賦。善用它：先看清全貌再行動，你的分析能力能幫團隊避開很多坑。" },
  { stage: "第3格：發動機", task: "你是「啟動行動」的人。想法到你這裡就會變成動作。你的能量是「做」— 不是想、不是等，是直接動起來。善用它：當大家還在討論時，你先跑出第一步讓大家跟上。" },
  { stage: "第4格：建築師", task: "你是「給想法骨架」的人。抽象的願景到你手裡就會變成具體的計畫和步驟。你的價值是把空中樓閣變成蓋得出來的建築。善用它：幫別人把夢想落地為可執行的方案。" },
  { stage: "第5格：明星", task: "你是「被看見」的人。你不需要特別努力就會吸引注意力，你的存在自帶光芒。這不是虛榮，是你的能量場本來就比較亮。善用它：用你的能見度去帶動好的事情發生。" },
  { stage: "第6格：調度者", task: "你是「安排節奏」的人。你知道什麼時候該加速、什麼時候該休息。你的天賦是讓系統流暢運轉。善用它：當事情卡住時，你知道是哪裡失衡了。調一調，一切又動起來。" },
  { stage: "第7格：軍師", task: "你是「靠直覺判斷」的人。站在波符正中間，你能感應到整體的頻率。你的直覺比別人準，你的建議往往一語中的。善用它：信任你的「感覺」，它是你最好的導航系統。" },
  { stage: "第8格：校準者", task: "你是「確保方向正確」的人。你在意言行一致、表裡如一。當事情偏離初衷時，你第一個發現。善用它：做團隊的誠信守門人，把走偏的拉回正軌。" },
  { stage: "第9格：推進器", task: "你是「全力衝刺」的人。你的意志力和節奏感讓你能穩定地把事情推向完成。不是爆發型，是持續型的強。善用它：在接近終點時你的能量最強，堅持到底就是你的勝利。" },
  { stage: "第10格：完成者", task: "你是「把事情做出來」的人。你的價值不在於想了什麼，而在於做了什麼。你產出的東西看得見、用得到、有實際價值。善用它：選值得做的事，然後做出成果讓世界看見。" },
  { stage: "第11格：拆除者", task: "你是「打破舊規」的人。你不怕說「這個不行了」，然後把它拆掉重建。你的能量是釋放和解放。善用它：幫自己和別人從過時的模式中解脫。拆是為了重建更好的。" },
  { stage: "第12格：連結者", task: "你是「凝聚大家」的人。你的力量來自合作和分享。有你在的團隊就是比較有凝聚力。善用它：你不需要獨自完成所有事，找到夥伴一起做，效果加倍。" },
  { stage: "第13格：畢業生", task: "你是「整合一切」的人。站在波符的最後一格，你有看見全程的智慧。你的格局大、層次高，能把零碎的經驗整合成有意義的全貌。善用它：分享你的領悟，幫助別人看見更大的可能。" },
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
    ${renderOracle(o)}
    <div class="divider"></div>
    ${renderWavespell(w, "波符")}
    <div class="divider"></div>
    <h3>🏰 你的人生劇本：${c.name}</h3>
    <p style="font-size:.85rem;color:var(--muted);margin:0 0 8px;">${c.kinRange} · 基調：${c.theme}</p>
    <p class="meaning">${c.text}</p>
    <div class="divider"></div>
    <h3>🎵 你在團隊中的角色：${toneStage.stage}</h3>
    <p style="font-size:.85rem;color:var(--muted);margin:0 0 8px;">你在${w.startSeal.zh}波符中站在第 ${w.position} 格（共 13 格）</p>
    <p class="meaning">${toneStage.task}</p>
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
  const c = castle(gmt.kin);
  const toneStage = TONE_STAGES[w.position - 1];
  const todayInfo = kinInfo(annual.todayKin);
  const personalInfo = kinInfo(annual.personalKin);
  const now = new Date();

  return `
    <div class="sig">
      <div class="kin">GMT 584283 · 真實馬雅 Tzolk'in</div>
      <div class="big">${tone.num} ${seal.en}（${seal.zh}）</div>
      <div class="glyphs">${sealGlyph(seal)}</div>
    </div>
    ${renderOracle(o)}
    <div class="divider"></div>
    ${renderWavespell(w, "13 天週期（Trecena）")}
    <div class="divider"></div>
    <h3>🏰 你的人生劇本：${c.name}</h3>
    <p style="font-size:.85rem;color:var(--muted);margin:0 0 8px;">${c.kinRange} · 基調：${c.theme}</p>
    <p class="meaning">${c.text}</p>
    <div class="divider"></div>
    <h3>🎵 你在團隊中的角色：${toneStage.stage}</h3>
    <p style="font-size:.85rem;color:var(--muted);margin:0 0 8px;">你在${w.startSeal.zh}波符中站在第 ${w.position} 格（共 13 格）</p>
    <p class="meaning">${toneStage.task}</p>
    <div class="divider"></div>
    <h3>📅 流年能量（GMT）</h3>
    <p class="meaning"><b>今天的馬雅日</b>（${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}）＝ <span class="kw">${todayInfo.name}</span>。當下的集體能量：${todayInfo.seal.text.split("。")[0]}。</p>
    <p class="meaning"><b>你今年生日</b> ＝ <span class="kw">${personalInfo.name}</span>。你這一年的個人能量：${personalInfo.seal.text.split("。")[0]}。</p>
    <p class="sub" style="color:var(--muted);font-size:.82rem;">※ GMT 為考古學界通用對照，是真正對得上馬雅碑文的曆法。</p>
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
  const detailId = `oracle-${info.kin}`;
  // 根據角色產生解說
  const roleDetail = getOracleRoleDetail(role, info);
  return `<div style="background:var(--input-bg);border:1px solid rgba(123,108,246,.4);border-radius:14px;padding:12px 10px;width:150px;text-align:center;cursor:pointer;${borderStyle}" onclick="const el=document.getElementById('${detailId}');el.style.display=el.style.display==='none'?'block':'none';">
    <div style="font-size:.75rem;color:var(--muted);letter-spacing:1px;">${role}</div>
    <div style="font-size:1.7rem;margin:4px 0;">${info.seal.glyph}</div>
    <div style="font-weight:700;font-size:.95rem;">${info.name}</div>
    <div style="font-size:.72rem;color:var(--muted);margin-top:2px;">KIN ${info.kin}</div>
  </div>
  <div id="${detailId}" style="display:none;width:100%;max-width:320px;margin:6px auto;padding:10px 12px;background:rgba(123,108,246,.08);border-radius:10px;font-size:.83rem;line-height:1.7;text-align:left;">
    ${roleDetail}
  </div>`;
}

/** 神諭角色解說 */
function getOracleRoleDetail(role, info) {
  const sealText = info.seal.text.split("。").slice(0, 2).join("。") + "。";
  const roleTexts = {
    "主印記": `<b>主印記（你的本質）</b><br>這就是「你」— 你最核心的能量特質。<br><br>${sealText}`,
    "引導": `<b>引導（你的方向）</b><br>當你迷路時，往這個方向走就對了。這是你的內在 GPS。<br><br>${sealText}`,
    "支持": `<b>支持（你的助力）</b><br>這是你背後最大的靠山。這股能量天生就支持你，不需要努力就有。<br><br>${sealText}`,
    "挑戰": `<b>挑戰（你的功課）</b><br>這是你這輩子要學會的東西。一開始可能不舒服，但學會了就是你最大的力量。<br><br>${sealText}`,
    "隱藏推動": `<b>隱藏推動（你的深層動力）</b><br>這是你自己可能都沒意識到的內在驅動力。它在潛意識推動你前進。<br><br>${sealText}`,
  };
  return roleTexts[role] || sealText;
}

function renderWavespell(w, label) {
  let strip = '';
  for (let i = 0; i < 13; i++) {
    const k = w.start + i;
    const seal = SEALS[mod(k - 1, 20)];
    const tone = TONES[i];
    const cur = (i + 1 === w.position);
    const curStyle = cur ? 'border-color:var(--accent);background:linear-gradient(135deg,rgba(245,197,66,.22),rgba(123,108,246,.16));transform:translateY(-3px);' : '';
    const toneStyle = cur ? 'color:var(--accent);font-weight:700;' : 'color:var(--muted);';
    const detailId = `wave-${w.start}-${i}`;
    const stageInfo = TONE_STAGES[i];
    strip += `<div style="width:46px;padding:7px 2px;border-radius:10px;background:var(--input-bg);border:1px solid rgba(123,108,246,.3);text-align:center;cursor:pointer;${curStyle}" onclick="const el=document.getElementById('${detailId}');el.style.display=el.style.display==='none'?'block':'none';">
      <div style="font-size:.7rem;${toneStyle}">${i + 1}</div>
      <div style="font-size:1.25rem;">${seal.glyph}</div>
    </div>`;
  }

  // 波符格子的展開詳情（放在格子條下方）
  let details = '';
  for (let i = 0; i < 13; i++) {
    const k = w.start + i;
    const seal = SEALS[mod(k - 1, 20)];
    const stageInfo = TONE_STAGES[i];
    const cur = (i + 1 === w.position);
    const detailId = `wave-${w.start}-${i}`;
    const highlight = cur ? '<span style="color:var(--accent);font-weight:700;">← 你在這裡</span><br>' : '';
    details += `<div id="${detailId}" style="display:none;padding:10px 12px;margin:6px 0;background:rgba(123,108,246,.08);border-radius:10px;font-size:.83rem;line-height:1.7;">
      ${highlight}<b>${stageInfo.stage}</b> · ${seal.glyph} ${seal.zh}<br>${stageInfo.task}
    </div>`;
  }

  const pt = TONES[w.position - 1];
  return `
    <h3>🌊 ${label}：${w.startSeal.zh}波符</h3>
    <p class="meaning">${label}是 13 天一組的能量之浪。你屬於「<span class="kw">${w.startSeal.zh}波符</span>」。點擊格子看每個位置的角色 ▼</p>
    <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:12px 0;">${strip}</div>
    ${details}
    <p class="meaning">你站在第 <span class="kw">${w.position}</span> 格 · <span class="kw">${pt.zh}（${pt.kw}）</span>：${pt.text.split("。")[0]}。</p>
  `;
}

function sealGlyph(seal) {
  return `<div class="glyph">${seal.glyph}</div>`;
}
