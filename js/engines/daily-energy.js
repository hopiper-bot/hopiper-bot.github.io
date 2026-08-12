/**
 * daily-energy.js — 今日能量 Widget
 * 結合馬雅曆日能量 + 流日八字天干，給出今天的建議
 */

import { mod, dateToJDN } from '../lib/utils.js';
import { SEALS, TONES } from '../data/maya-text.js';

// === 馬雅曆 Dreamspell KIN（同 maya.js 邏輯）===
const MONTH_OFF = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const COLOR_ZH = { red: "紅", white: "白", blue: "藍", yellow: "黃" };

function dreamspellKin(y, m, d) {
  const yearVal = mod(217 + 105 * (y - 2013), 260);
  return mod(yearVal + MONTH_OFF[m - 1] + d - 1, 260) + 1;
}

// === 八字流日 ===
const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const STEM_ELEMENT = {"甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水"};
const ELEMENT_EMOJI = {"木":"🌳","火":"🔥","土":"🏔️","金":"⚙️","水":"💧"};

function dayPillarToday(y, m, d) {
  const jdn = dateToJDN(y, m, d);
  const base = dateToJDN(2000, 1, 7); // 甲子日
  const diff = ((jdn - base) % 60 + 60) % 60;
  return { stem: STEMS[diff % 10], branch: BRANCHES[diff % 12] };
}

// === 今日適合做什麼 ===
const DAY_ADVICE = {
  "甲": { good: "開始新計畫、拜訪新客戶", avoid: "結束或斷捨離", vibe: "開創" },
  "乙": { good: "溝通協商、藝術創作", avoid: "激進變動", vibe: "柔和" },
  "丙": { good: "展現自我、公開演講", avoid: "低調行事", vibe: "光芒" },
  "丁": { good: "精細工作、學習研究", avoid: "大動作行銷", vibe: "溫暖" },
  "戊": { good: "穩定推進、建立制度", avoid: "冒險投機", vibe: "穩重" },
  "己": { good: "整理收納、照顧他人", avoid: "急躁催促", vibe: "包容" },
  "庚": { good: "決斷執行、處理積壓", avoid: "猶豫不決", vibe: "果斷" },
  "辛": { good: "談判簽約、精品選購", avoid: "粗枝大葉", vibe: "精緻" },
  "壬": { good: "腦力激盪、旅行移動", avoid: "固守不變", vibe: "流動" },
  "癸": { good: "冥想反省、深度對話", avoid: "過度社交", vibe: "沉靜" },
};

// === 馬雅圖騰日能量 ===
function sealDayAdvice(sealIdx) {
  const advices = [
    "勇敢啟動，今天適合跨出第一步",
    "信任直覺，靜下心聽內在聲音",
    "大膽表達，讓別人看見你的想法",
    "接納一切，今天適合修復關係",
    "發號施令，掌握今天的節奏",
    "順流而行，今天會有意外收穫",
    "專注完成手上的事，不要分心",
    "追求美感，今天適合打扮和佈置",
    "面對恐懼，它反而會消失",
    "帶著愛做事，今天給出去的會回來",
    "保持簡單，複雜的事今天先放著",
    "與人連結，今天適合找朋友聊天",
    "保持靈活，計畫趕不上變化",
    "發揮智慧，今天腦子特別清楚",
    "鷹的視角，站高一點看全局",
    "願意嘗試，今天適合做沒做過的事",
    "導航方向，幫自己也幫別人定位",
    "映照真相，今天適合面對真實的自己",
    "感受風暴，情緒是今天最好的老師",
    "無條件的愛，今天對自己溫柔一點",
  ];
  return advices[sealIdx] || "活在當下";
}

/**
 * 計算今日能量
 */
export function calculateDaily() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();

  // 馬雅日能量
  const kin = dreamspellKin(y, m, d);
  const sealIdx = (kin - 1) % 20;
  const toneIdx = (kin - 1) % 13;
  const seal = SEALS[sealIdx];
  const tone = TONES[toneIdx];
  const colorKey = ["red", "white", "blue", "yellow"][sealIdx % 4];

  // 八字日柱
  const { stem, branch } = dayPillarToday(y, m, d);
  const element = STEM_ELEMENT[stem];
  const advice = DAY_ADVICE[stem];
  const mayaAdvice = sealDayAdvice(sealIdx);

  return {
    date: `${y}/${m}/${d}`,
    weekday: ['日','一','二','三','四','五','六'][now.getDay()],
    maya: {
      kin, seal, tone,
      color: COLOR_ZH[colorKey],
      colorClass: colorKey,
      advice: mayaAdvice,
    },
    bazi: {
      stem, branch, element,
      emoji: ELEMENT_EMOJI[element],
      advice,
    },
  };
}

/**
 * 渲染今日能量 HTML
 */
export function renderDaily(data) {
  const { maya, bazi } = data;
  let html = '<div class="daily-grid">';

  // 馬雅能量
  html += '<div class="daily-card">';
  html += `<div class="daily-card-label">馬雅能量</div>`;
  html += `<div class="daily-card-main"><span class="daily-kin">KIN ${maya.kin}</span> ${maya.color}${maya.seal.zh}・${maya.tone.zh}</div>`;
  html += `<div class="daily-card-advice">${maya.advice}</div>`;
  html += '</div>';

  // 八字日柱
  html += '<div class="daily-card">';
  html += `<div class="daily-card-label">流日能量</div>`;
  html += `<div class="daily-card-main">${bazi.emoji} ${bazi.stem}${bazi.branch}日（${bazi.element}）</div>`;
  html += `<div class="daily-card-advice">✓ ${bazi.advice.good}<br><span style="color:var(--muted);">✗ ${bazi.advice.avoid}</span></div>`;
  html += '</div>';

  html += '</div>';

  // 一句話總結
  html += `<div class="daily-summary-text">今日氣場：<b>${bazi.advice.vibe}</b> × <b>${maya.color}${maya.seal.zh}</b> — 用「${bazi.advice.vibe}」的態度去「${maya.advice.replace(/今天/g, '')}」</div>`;

  return html;
}
