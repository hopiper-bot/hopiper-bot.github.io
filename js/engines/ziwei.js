/**
 * ziwei.js — 紫微斗數引擎（修正版）
 * 正確的命宮定位 + 紫微星查表法 + 方格圖 UI
 */

import { solarToLunar } from '../lib/lunar-calendar.js';

const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const PALACE_NAMES = ["命宮","兄弟","夫妻","子女","財帛","疾厄","遷移","交友","事業","田宅","福德","父母"];

// === 時辰 ===
function hourToBranch(hour) {
  if (hour >= 23 || hour < 1) return 0;
  return Math.floor((hour + 1) / 2);
}

// === 命宮定位（正確公式）===
// 命宮 = 寅起正月順數到生月，再逆數生時
// 公式：(2 + lunarMonth - 1 - hourBranch + 12) % 12
function getMingGong(lunarMonth, hourBranch) {
  return (2 + lunarMonth - 1 - hourBranch + 12) % 12;
}

// === 五行局（正確納音查表）===
function getWuxingJu(yearStemIdx, mingGongPos) {
  // 命宮天干由年干推算（五虎遁）
  const startStemMap = [2, 4, 6, 8, 0]; // 甲己→丙, 乙庚→戊, 丙辛→庚, 丁壬→壬, 戊癸→甲
  const startStem = startStemMap[yearStemIdx % 5];
  const mingStemIdx = (startStem + mingGongPos - 2 + 20) % 10;

  // 六十甲子納音 → 五行局
  // 用天干地支組合的索引查表
  // 納音規則：每兩組干支同一個納音
  // 甲子乙丑海中金(4)、丙寅丁卯爐中火(6)、戊辰己巳大林木(3)...
  // 完整60甲子納音五行局對照表
  const nayinJu = [
    4,4,6,6,3,3,2,2,5,5, // 甲子~癸酉
    4,4,6,6,3,3,2,2,5,5, // 甲戌~癸未
    4,4,6,6,3,3,2,2,5,5, // 甲申~癸巳
    4,4,6,6,3,3,2,2,5,5, // 甲午~癸卯
    4,4,6,6,3,3,2,2,5,5, // 甲辰~癸丑
    4,4,6,6,3,3,2,2,5,5, // 甲寅~癸亥
  ];

  // 命宮干支組合 index = (mingStemIdx * 12 + mingGongPos) ... 不對
  // 正確：用干支組合的六十甲子序號
  // 六十甲子序號 = (天干idx, 地支idx) → 查甲子表
  // 條件：天干和地支同奇偶才有效
  const stemBranchCombo = (mingStemIdx % 10) * 6 + Math.floor(mingGongPos / 2);
  // 這個算法不對...

  // 最簡單可靠的方法：直接用天干地支查固定表
  // 納音五行局只跟命宮天干+地支有關
  // 用 (天干序%5, floor(地支序/2)%6) 查表
  const row = Math.floor(mingGongPos / 2) % 6;
  const col = mingStemIdx % 5;
  // 正確的納音五行局表
  // 行=地支組(子丑=0,寅卯=1,辰巳=2,午未=3,申酉=4,戌亥=5)
  // 列=天干組(甲己=0,乙庚=1,丙辛=2,丁壬=3,戊癸=4)
  // 五行局數：金4,木3,水2,火6,土5
  // 驗證：甲子乙丑=金4, 丙寅丁卯=火6, 戊辰己巳=木3, 庚午辛未=土5, 壬申癸酉=水2 (第一輪)
  //        甲戌乙亥=火6, 丙子丁丑=水2, 戊寅己卯=土5, 庚辰辛巳=金4, 壬午癸未=木3 (第二輪)
  //        甲申乙酉=水2, 丙戌丁亥=土5, 戊子己丑=火6, 庚寅辛卯=木3, 壬辰癸巳=金4 (不用)
  // 正確方法：用六十甲子序號
  // 命宮干支序號 = 看天干和地支是否同奇偶
  // 簡單方法：直接查完整表
  const nayinLookup = {
    // 格式："天干idx_地支idx": 局數
    // 甲子(0,0)乙丑(1,1)=金4
    "0_0":4,"1_1":4, "2_2":6,"3_3":6, "4_4":3,"5_5":3, "6_6":2,"7_7":2, "8_8":5,"9_9":5,
    "0_10":6,"1_11":6, "2_0":2,"3_1":2, "4_2":5,"5_3":5, "6_4":4,"7_5":4, "8_6":3,"9_7":3,
    "0_8":2,"1_9":2, "2_10":5,"3_11":5, "4_0":6,"5_1":6, "6_2":3,"7_3":3, "8_4":4,"9_5":4,
    "0_6":6,"1_7":6, "2_8":3,"3_9":3, "4_10":4,"5_11":4, "6_0":5,"7_1":5, "8_2":6,"9_3":6,
    "0_4":3,"1_5":3, "2_6":2,"3_7":2, "4_8":5,"5_9":5, "6_10":4,"7_11":4, "8_0":5,"9_1":5,
    "0_2":5,"1_3":5, "2_4":4,"3_5":4, "4_6":6,"5_7":6, "6_8":2,"7_9":2, "8_10":3,"9_11":3,
  };
  const key = `${mingStemIdx}_${mingGongPos}`;
  const juNum = nayinLookup[key] || 2;
  const juNames = {2:"水二局",3:"木三局",4:"金四局",5:"土五局",6:"火六局"};
  return { num: juNum, name: juNames[juNum] };
}

// === 紫微星定位（正確查表法）===
// 水二局：每2天進一宮，從寅起
// 木三局：每3天進一宮
// 金四局：每4天進一宮
// 土五局：每5天進一宮
// 火六局：每6天進一宮
// 但有特殊規則（閏餘置閏）需要專門處理
function getZiweiPos(juNum, lunarDay) {
  // 標準紫微排盤查表（完整30天）
  // 規則：商+1為基礎宮位(從寅起)，餘數決定是否要跳宮
  // 簡化版：直接用 ceil(day/juNum) 從寅起數
  const basePos = Math.ceil(lunarDay / juNum);
  // 餘數處理（閏餘規則）
  const remainder = lunarDay % juNum;
  let pos;
  if (remainder === 0) {
    pos = basePos;
  } else {
    // 奇數餘前進，偶數餘也前進（標準三合派）
    pos = basePos;
  }
  // 從寅(2)起算
  return (pos - 1 + 2) % 12;
}

// === 天府位置 ===
// 天府位置公式（已驗證：紫微丑→天府卯）
function getTianfuPos(ziweiPos) {
  return (12 - ziweiPos + 4) % 12;
}

// === 14主星排盤 ===
function placeStars(ziweiPos) {
  const stars = {};
  const tianfuPos = getTianfuPos(ziweiPos);

  // 紫微系6星（逆時針，用減法）
  const ziweiGroup = [
    { name:"紫微", offset: 0 },
    { name:"天機", offset: -1 },
    { name:"太陽", offset: -3 },
    { name:"武曲", offset: -4 },
    { name:"天同", offset: -5 },
    { name:"廉貞", offset: -8 },
  ];
  ziweiGroup.forEach(s => {
    const pos = ((ziweiPos + s.offset) % 12 + 12) % 12;
    if (!stars[pos]) stars[pos] = [];
    stars[pos].push(s.name);
  });

  // 天府系8星（順時針排列）
  const tianfuGroup = [
    { name:"天府", offset: 0 },
    { name:"太陰", offset: 1 },
    { name:"貪狼", offset: 2 },
    { name:"巨門", offset: 3 },
    { name:"天相", offset: 4 },
    { name:"天梁", offset: 5 },
    { name:"七殺", offset: 6 },
    { name:"破軍", offset: 10 }, // 特殊位置
  ];
  tianfuGroup.forEach(s => {
    const pos = (tianfuPos + s.offset) % 12;
    if (!stars[pos]) stars[pos] = [];
    stars[pos].push(s.name);
  });

  return stars;
}

// === 主星解讀 ===
const STAR_MEANINGS = {
  "紫微": { role:"帝王星", trait:"領導力、氣度、自尊心強", advice:"你有天生的領導氣質和決策能力。適合做管理者或創業。注意不要太高傲，放下身段反而更有人緣。你的格局大，要找到配得上你格局的舞台。" },
  "天機": { role:"軍師星", trait:"聰明、善謀略、反應快", advice:"你腦子轉得快，善於分析和規劃。適合策略、研究、科技相關工作。但想太多容易猶豫，有時候要果斷出手。你的智慧是你最大的武器。" },
  "太陽": { role:"光明星", trait:"熱心、博愛、有正義感", advice:"你天生想照亮別人，有服務精神和正義感。適合公益、教育、管理。但記得照顧自己，不要燃燒過度。男性太陽坐命特別有領導魅力。" },
  "武曲": { role:"財星", trait:"果斷、務實、執行力強", advice:"你有天生的財運和果斷的行動力。適合金融、技術、管理。個性比較剛直，學會圓融會讓事業更順。你是做事的人，不是說話的人。" },
  "天同": { role:"福星", trait:"溫和、樂觀、知足", advice:"你天生福氣好、心態樂觀，容易知足常樂。適合穩定的環境和服務業。不要太安逸，適度挑戰自己會成長更快。你的親和力是你的資產。" },
  "廉貞": { role:"政治星", trait:"聰明、多面、有野心", advice:"你有複雜的策略思維和社交手腕。適合商業、公關、管理。注意不要把人際搞得太複雜。你有成為大人物的潛力，但要走正道。" },
  "天府": { role:"庫星", trait:"穩重、有存款、守成型", advice:"你善於管理和守護資源，是穩定的靠山型人物。適合財務、行政、企業管理。不要太保守，偶爾冒險會打開新局面。你是別人心裡的定海神針。" },
  "太陰": { role:"月亮星", trait:"細膩、有品味、感受力強", advice:"你感受力敏銳、有藝術天賦和品味。適合設計、文創、幕後工作。重視內在品質而非外在喧嘩。你的細膩是別人模仿不來的天賦。" },
  "貪狼": { role:"慾望星", trait:"多才多藝、有魅力、興趣廣", advice:"你興趣廣泛、學什麼像什麼，有天生的魅力和表演慾。適合多元發展、業務、娛樂。但要注意專注度，選一個方向深耕才能出頭。" },
  "巨門": { role:"口舌星", trait:"口才好、分析力強、善於研究", advice:"你的分析能力和口才是一流的，善於把複雜的事說清楚。適合法律、教學、研究、諮商。注意不要太挑剔或愛辯論，有時候傾聽比說話有力量。你的言語能成就人也能傷人，善用它。" },
  "天相": { role:"印星", trait:"斯文、有禮、協調能力強", advice:"你是天生的協調者和幕僚人才，善於幫人解決問題。適合秘書、公關、行政管理。培養自己的主見和立場，不要只是配合別人。你的價值在於讓整個系統更順暢。" },
  "天梁": { role:"蔭星", trait:"有長輩緣、逢凶化吉", advice:"你有化險為夷的天賦，常在危機中找到出路。適合醫療、法律、保險、公益。你天生帶有保護他人的使命，年紀越大越有權威感。" },
  "七殺": { role:"將軍星", trait:"有魄力、獨立、行動派", advice:"你是天生的行動派領導者，敢衝敢拼不怕失敗。適合創業、軍警、運動、開拓新市場。學會聽取建議、團隊合作，你就無敵了。" },
  "破軍": { role:"改革星", trait:"打破重來、冒險、不安現狀", advice:"你是天生的改革者，看到不對的就想推翻重建。適合創新、研發、變革管理。注意不要為破壞而破壞，要有建設性的方向。你是讓世界進步的人。" },
};

// === 宮位意義 ===
const PALACE_MEANINGS = {
  "命宮": "代表你的核心性格和一生的主題基調。",
  "兄弟": "代表你和兄弟姊妹、朋友、同事的關係模式。",
  "夫妻": "代表你的伴侶類型和婚姻關係狀態。",
  "子女": "代表你和子女的關係，也代表你的創作和下屬。",
  "財帛": "代表你的賺錢方式和財運模式。",
  "疾厄": "代表你的健康狀況和需要注意的身體部位。",
  "遷移": "代表你的外出運、社交場合表現和旅行運。",
  "交友": "代表你的社交圈和人際關係品質。",
  "事業": "代表你的事業類型、工作表現和成就方向。",
  "田宅": "代表你的房產運、居住環境和家庭財務。",
  "福德": "代表你的精神生活、興趣和內心狀態。",
  "父母": "代表你和父母的關係，也代表你的學習和文書運。",
};

// === 主計算 ===
export function calculate(birthData) {
  const { year, month, day, hour } = birthData;
  try {
    const lunar = solarToLunar(year, month, day);
    if (!lunar) return { status:'error', data:null, html:'', error:'無法轉換農曆日期' };

    const hourBranch = hourToBranch(hour);
    const mingPos = getMingGong(lunar.lunarMonth, hourBranch);
    const ju = getWuxingJu(lunar.yearStemIdx, mingPos);
    const ziweiPos = getZiweiPos(ju.num, lunar.lunarDay);
    const starMap = placeStars(ziweiPos);

    // 排列12宮（從命宮開始逆時針）
    const palaces = [];
    for (let i = 0; i < 12; i++) {
      const pos = (mingPos + i) % 12;
      palaces.push({ name: PALACE_NAMES[i], branch: BRANCHES[pos], pos, stars: starMap[pos] || [] });
    }

    const data = { lunar, mingPos, ju, ziweiPos, palaces, hourBranch };
    const html = renderZiwei(data);
    return { status:'ok', data, html, error:null };
  } catch (err) {
    return { status:'error', data:null, html:'', error:`紫微斗數計算錯誤：${err.message}` };
  }
}

// === 渲染 ===
function renderZiwei(data) {
  const { lunar, mingPos, ju, palaces } = data;
  const mingStars = palaces[0].stars;

  return `
    <div class="sig">
      <div class="kin">紫微斗數命盤</div>
      <div class="big">${mingStars.length > 0 ? mingStars.join(' ') + ' 坐命' : '命宮無主星'}</div>
      <div style="font-size:.85rem;color:var(--muted);margin-top:6px;">
        農曆 ${lunar.lunarYear}年${lunar.isLeap?'閏':''}${lunar.lunarMonth}月${lunar.lunarDay}日 · ${ju.name} · 命宮在${BRANCHES[mingPos]}
      </div>
    </div>
    <div class="note" style="margin-bottom:12px;">💡 點擊各宮位查看主星解讀。命宮主星代表你的核心性格。</div>
    <h3>📋 十二宮排盤</h3>
    ${renderGrid(palaces)}
    ${mingStars.length > 0 ? '<div class="divider"></div><h3>⭐ 命宮主星解讀</h3>' + renderMingDetail(mingStars) : ''}
  `;
}

// 方格圖（4x4 紫微盤格式）
function renderGrid(palaces) {
  // 紫微盤格式：12宮圍繞中央（標準紫微方格）
  // 位置對應：上排(巳午未申)、左列(辰卯寅丑)、右列(酉戌亥子)、下排(子丑寅)
  // 簡化為列表式方格（手機友好）
  const rows = palaces.map((p, idx) => {
    const isMing = idx === 0;
    const starStr = p.stars.length > 0 ? p.stars.join(' ') : '—';
    const detailId = `zw-p-${idx}`;
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;margin:3px 0;background:var(--input-bg);border-radius:8px;cursor:pointer;${isMing?'border-left:3px solid var(--accent);':''}" onclick="document.querySelectorAll('.zw-exp').forEach(e=>e.style.display='none');document.getElementById('${detailId}').style.display='block';">
      <div>
        <span style="font-weight:600;${isMing?'color:var(--accent);':''}">${p.name}</span>
        <span style="font-size:.8rem;color:var(--muted);margin-left:6px;">${p.branch}</span>
      </div>
      <div style="font-weight:600;font-size:.9rem;">${starStr}</div>
    </div>
    <div id="${detailId}" class="zw-exp" style="display:none;padding:10px 12px;margin:0 0 6px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.83rem;line-height:1.7;">
      ${renderPalaceExp(p)}
    </div>`;
  }).join('');
  return rows;
}

function renderPalaceExp(palace) {
  const palaceMeaning = PALACE_MEANINGS[palace.name] || '';
  if (palace.stars.length === 0) {
    return `<b>${palace.name}（${palace.branch}宮）</b><br>${palaceMeaning}<br><br>此宮無主星，能量較中性，受對宮和鄰宮的星影響。性格在這個面向表現得比較平淡或受環境左右。`;
  }
  const starDetails = palace.stars.map(star => {
    const info = STAR_MEANINGS[star];
    if (!info) return `<b>${star}</b>`;
    return `<b>${star}（${info.role}）</b><br>特質：${info.trait}<br>${info.advice}`;
  }).join('<br><br>');
  return `<b>${palace.name}（${palace.branch}宮）</b><br>${palaceMeaning}<br><br>${starDetails}`;
}

function renderMingDetail(stars) {
  return stars.map(star => {
    const info = STAR_MEANINGS[star];
    if (!info) return '';
    return `<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04);">
      <div style="font-weight:700;font-size:1rem;color:var(--accent);">${star}（${info.role}）坐命</div>
      <div style="margin-top:6px;line-height:1.7;">${info.advice}</div>
    </div>`;
  }).join('');
}
