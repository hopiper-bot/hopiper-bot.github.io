/**
 * ziwei.js — 紫微斗數引擎
 * 農曆轉換 → 命宮定位 → 五行局 → 14主星排盤
 */

import { solarToLunar } from '../lib/lunar-calendar.js';

// === 常量 ===
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const PALACE_NAMES = ["命宮","兄弟","夫妻","子女","財帛","疾厄","遷移","交友","事業","田宅","福德","父母"];

// 14 主星
const MAIN_STARS = ["紫微","天機","太陽","武曲","天同","廉貞","天府","太陰","貪狼","巨門","天相","天梁","七殺","破軍"];

// === 時辰轉換 ===
function hourToBranch(hour) {
  if (hour >= 23 || hour < 1) return 0;  // 子
  return Math.floor((hour + 1) / 2);
}

// === 命宮定位 ===
// 命宮 = 寅宮起正月，順數到生月，再逆數到生時
function getMingGong(lunarMonth, hourBranch) {
  // 從寅(index 2)起正月，順數月份
  const monthPos = (2 + lunarMonth - 1) % 12;
  // 再從該位置逆數時辰
  const mingPos = ((monthPos - hourBranch) % 12 + 12) % 12;
  return mingPos;
}

// === 五行局 ===
// 根據命宮地支 + 農曆年天干 查納音表得五行局
const WUXING_JU_TABLE = {
  // [yearStemIdx % 5][命宮地支對應的組] → 局數
  // 簡化：根據命宮天干地支納音
  // 實際上是用命宮的天干（由年干起）+ 命宮地支 查納音
  // 命宮天干由年干和命宮位置推算
};

function getWuxingJu(yearStemIdx, mingGongPos) {
  // 命宮天干：從年干起，按宮位推算
  // 甲己年起丙寅、乙庚年起戊寅...
  const startStemMap = [2, 4, 6, 8, 0]; // 丙戊庚壬甲
  const startStem = startStemMap[yearStemIdx % 5];
  const mingStemIdx = (startStem + mingGongPos - 2 + 20) % 10; // 從寅開始算

  // 納音五行局查表（簡化版）
  // 天干地支組合 → 五行局
  const combo = (mingStemIdx % 5) * 12 + mingGongPos;
  // 用固定查表（30組對應5種局）
  const juTable = [
    2,6,5,3,4,2,6,5,3,4,2,6, // 甲/己
    5,3,4,2,6,5,3,4,2,6,5,3, // 乙/庚
    4,2,6,5,3,4,2,6,5,3,4,2, // 丙/辛
    6,5,3,4,2,6,5,3,4,2,6,5, // 丁/壬
    3,4,2,6,5,3,4,2,6,5,3,4, // 戊/癸
  ];
  const juIdx = (mingStemIdx % 5) * 12 + mingGongPos;
  const juNum = juTable[juIdx] || 2;
  const juNames = { 2:"水二局", 3:"木三局", 4:"金四局", 5:"土五局", 6:"火六局" };
  return { num: juNum, name: juNames[juNum] || `${juNum}局` };
}

// === 紫微星定位 ===
// 紫微星位置由五行局數和農曆日決定
function getZiweiPos(juNum, lunarDay) {
  // 公式：紫微星宮位 = (農曆日 - 1) / 局數 的商+餘處理
  // 標準算法：從寅宮起，每局數天進一宮
  let pos = Math.ceil(lunarDay / juNum) + 1; // 簡化近似
  // 還需要根據餘數調整（標準紫微排盤有專門的對照表）
  // 這裡用簡化公式
  const remainder = lunarDay % juNum;
  if (remainder === 0) {
    pos = Math.floor(lunarDay / juNum) + 1;
  } else {
    // 標準規則：奇數餘往前，偶數餘往後
    pos = Math.floor(lunarDay / juNum) + 1;
    if (remainder % 2 === 0) pos += remainder;
    else pos += remainder;
  }
  return ((pos - 1) % 12 + 2) % 12; // 從寅宮開始
}

// === 14主星排盤 ===
// 紫微系：紫微、天機、太陽、武曲、天同、廉貞（固定偏移）
// 天府系：天府、太陰、貪狼、巨門、天相、天梁、七殺、破軍（固定偏移）

const ZIWEI_OFFSETS = [0, -1, -3, -4, -5, -7]; // 紫微系6星偏移(逆時針)
const TIANFU_OFFSETS = [0, 1, 2, 3, 4, 5, 6, 7]; // 天府系偏移

function placeStars(ziweiPos) {
  const stars = {};

  // 天府位置 = 12 - 紫微位置 + 4（對稱）
  // 簡化：天府在紫微的對宮附近
  const tianfuPos = (12 - ziweiPos + 4) % 12;

  // 紫微系
  const ziweiStars = ["紫微","天機","太陽","武曲","天同","廉貞"];
  const zOffsets = [0, 11, 9, 8, 7, 5]; // 逆時針偏移
  ziweiStars.forEach((name, i) => {
    const pos = (ziweiPos + zOffsets[i]) % 12;
    if (!stars[pos]) stars[pos] = [];
    stars[pos].push(name);
  });

  // 天府系
  const tianfuStars = ["天府","太陰","貪狼","巨門","天相","天梁","七殺","破軍"];
  const tOffsets = [0, 1, 2, 3, 4, 5, 6, 10]; // 順時針偏移
  tianfuStars.forEach((name, i) => {
    const pos = (tianfuPos + tOffsets[i]) % 12;
    if (!stars[pos]) stars[pos] = [];
    stars[pos].push(name);
  });

  return stars;
}

// === 主星解讀 ===
const STAR_MEANINGS = {
  "紫微": { role:"帝王星", trait:"領導力、氣度、自尊心強", advice:"你有天生的領導氣質，適合做決策者。但要注意不要太高傲，放下身段反而更有人緣。" },
  "天機": { role:"軍師星", trait:"聰明、善謀略、多變", advice:"你腦子轉得快，適合做策略和規劃。但想太多容易猶豫不決，有時候要果斷一點。" },
  "太陽": { role:"光明星", trait:"熱心、博愛、有正義感", advice:"你天生有照亮他人的能量，適合做利他的工作。但要注意不要燃燒過度，記得照顧自己。" },
  "武曲": { role:"財星", trait:"果斷、務實、有財運", advice:"你有賺錢的天賦和果斷的行動力。適合金融、管理或技術。性格可能較剛硬，學會柔軟會更好。" },
  "天同": { role:"福星", trait:"溫和、享受、知足常樂", advice:"你天生福氣好、容易知足。適合穩定的環境。但不要太安逸，適度的挑戰讓你成長更快。" },
  "廉貞": { role:"政治星", trait:"聰明、複雜、有野心", advice:"你有政治頭腦和複雜的策略思維。適合商業或管理。注意不要把人際關係搞得太複雜。" },
  "天府": { role:"庫星", trait:"穩重、有庫存、守成", advice:"你善於管理和守護資源，是穩定的靠山。適合財務管理或行政。不要太保守，偶爾冒險會有驚喜。" },
  "太陰": { role:"月亮星", trait:"細膩、有品味、內向", advice:"你感受力強、有藝術天賦。適合設計、文創或幕後工作。重視內在生活品質，不需要活在聚光燈下。" },
  "貪狼": { role:"慾望星", trait:"多才多藝、有魅力、貪心", advice:"你興趣廣泛、人緣好、有表演天賦。適合多元發展。但要注意專注，什麼都想要可能什麼都做不深。" },
  "巨門": { role:"口舌星", trait:"口才好、分析力強、多疑", advice:"你善於分析和溝通，適合法律、研究或教學。但要注意不要太挑剔或愛爭辯，有時候沉默是金。" },
  "天相": { role:"印星", trait:"斯文、有禮、善於協調", advice:"你是天生的協調者，善於幫人解決問題。適合幕僚、秘書或公關。培養自己的主見，不要只配合別人。" },
  "天梁": { role:"蔭星", trait:"有長輩緣、化解災厄", advice:"你有逢凶化吉的能力，常在危機中轉為機會。適合醫療、法律或公益。天生帶有保護他人的使命。" },
  "七殺": { role:"將軍星", trait:"有魄力、獨立、不服輸", advice:"你是行動派的領導者，敢衝敢拼。適合創業、軍警或運動。注意不要太獨斷，學會聽取建議。" },
  "破軍": { role:"破壞星", trait:"改革、冒險、不安現狀", advice:"你是天生的改革者，看到不好的就想打掉重來。適合創新或變革型工作。但要注意不要為了破壞而破壞。" },
};

// === 主計算 ===
export function calculate(birthData) {
  const { year, month, day, hour } = birthData;

  try {
    // 農曆轉換
    const lunar = solarToLunar(year, month, day);
    if (!lunar) return { status: 'error', data: null, html: '', error: '無法轉換農曆日期' };

    // 時辰
    const hourBranch = hourToBranch(hour);

    // 命宮位置
    const mingPos = getMingGong(lunar.lunarMonth, hourBranch);

    // 五行局
    const ju = getWuxingJu(lunar.yearStemIdx, mingPos);

    // 紫微星位置
    const ziweiPos = getZiweiPos(ju.num, lunar.lunarDay);

    // 排列14主星
    const starMap = placeStars(ziweiPos);

    // 排列12宮
    const palaces = [];
    for (let i = 0; i < 12; i++) {
      const pos = (mingPos + i) % 12;
      palaces.push({
        name: PALACE_NAMES[i],
        branch: BRANCHES[pos],
        pos: pos,
        stars: starMap[pos] || [],
      });
    }

    const data = { lunar, mingPos, ju, ziweiPos, palaces, hourBranch };
    const html = renderZiwei(data);
    return { status: 'ok', data, html, error: null };
  } catch (err) {
    return { status: 'error', data: null, html: '', error: `紫微斗數計算錯誤：${err.message}` };
  }
}

// === 渲染 ===
function renderZiwei(data) {
  const { lunar, mingPos, ju, palaces } = data;

  return `
    <div class="sig">
      <div class="kin">紫微斗數命盤</div>
      <div class="big">${palaces[0].stars.join(' ')} 坐命</div>
      <div style="font-size:.85rem;color:var(--muted);margin-top:6px;">
        農曆 ${lunar.lunarYear}年${lunar.isLeap?'閏':''}${lunar.lunarMonth}月${lunar.lunarDay}日 · ${ju.name} · 命宮在${BRANCHES[mingPos]}
      </div>
    </div>

    <div class="note" style="margin-bottom:12px;">💡 點擊各宮位查看主星解讀。命宮的星最重要，代表你的核心性格。</div>

    <h3>📋 十二宮排盤</h3>
    ${renderPalaceGrid(palaces)}

    <div class="divider"></div>
    <h3>⭐ 命宮主星解讀</h3>
    ${renderMingStars(palaces[0])}
  `;
}

function renderPalaceGrid(palaces) {
  const rows = palaces.map((p, idx) => {
    const isMing = idx === 0;
    const highlight = isMing ? 'color:var(--accent);font-weight:700;' : '';
    const starStr = p.stars.length > 0 ? p.stars.join('、') : '—';
    const detailId = `zw-palace-${idx}`;
    return `<div style="padding:10px;margin:4px 0;background:var(--input-bg);border-radius:8px;cursor:pointer;${isMing?'border-left:3px solid var(--accent);':''}" onclick="document.querySelectorAll('.zw-exp').forEach(e=>e.style.display='none');document.getElementById('${detailId}').style.display='block';">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="${highlight}">${p.name}</span>
        <span style="font-size:.8rem;color:var(--muted);">${p.branch}宮</span>
      </div>
      <div style="margin-top:4px;font-weight:600;">${starStr}</div>
    </div>
    <div id="${detailId}" class="zw-exp" style="display:none;padding:10px 12px;margin:0 0 8px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.83rem;line-height:1.7;">
      ${renderPalaceDetail(p)}
    </div>`;
  }).join('');
  return rows;
}

function renderPalaceDetail(palace) {
  if (palace.stars.length === 0) {
    return `<b>${palace.name}（${palace.branch}宮）</b><br>此宮無主星，能量較為中性。主要受對宮和鄰宮的星影響。`;
  }
  return palace.stars.map(star => {
    const info = STAR_MEANINGS[star] || { role:'', trait:'', advice:'' };
    return `<b>${star}（${info.role}）在${palace.name}</b><br>
      特質：${info.trait}<br>
      ${info.advice}`;
  }).join('<br><br>');
}

function renderMingStars(mingPalace) {
  if (mingPalace.stars.length === 0) {
    return `<p class="meaning">你的命宮無主星（借對宮星力）。代表你的性格比較受環境影響，適應力強但需要找到自己的定位。</p>`;
  }
  return mingPalace.stars.map(star => {
    const info = STAR_MEANINGS[star] || { role:'', trait:'', advice:'' };
    return `<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04);">
      <div style="font-weight:700;font-size:1rem;color:var(--accent);">${star}（${info.role}）坐命</div>
      <div style="margin-top:6px;line-height:1.7;">${info.advice}</div>
    </div>`;
  }).join('');
}
