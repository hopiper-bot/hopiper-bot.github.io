/**
 * ziwei.js — 紫微斗數引擎（完整版）
 * 14主星 + 副星 + 方格圖 + 點擊解說
 */

import { solarToLunar } from '../lib/lunar-calendar.js';

const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const PALACE_NAMES = ["命宮","兄弟","夫妻","子女","財帛","疾厄","遷移","交友","事業","田宅","福德","父母"];

// === 時辰 ===
function hourToBranch(hour) {
  if (hour >= 23 || hour < 1) return 0;
  return Math.floor((hour + 1) / 2);
}

// === 命宮定位 ===
function getMingGong(lunarMonth, hourBranch) {
  return (2 + lunarMonth - 1 - hourBranch + 12) % 12;
}

// === 五行局（納音查表）===
function getWuxingJu(yearStemIdx, mingGongPos) {
  const startStemMap = [2, 4, 6, 8, 0];
  const startStem = startStemMap[yearStemIdx % 5];
  const mingStemIdx = (startStem + mingGongPos - 2 + 20) % 10;
  const nayinLookup = {
    "0_0":4,"1_1":4,"2_2":6,"3_3":6,"4_4":3,"5_5":3,"6_6":2,"7_7":2,"8_8":5,"9_9":5,
    "0_10":6,"1_11":6,"2_0":2,"3_1":2,"4_2":5,"5_3":5,"6_4":4,"7_5":4,"8_6":3,"9_7":3,
    "0_8":2,"1_9":2,"2_10":5,"3_11":5,"4_0":6,"5_1":6,"6_2":3,"7_3":3,"8_4":4,"9_5":4,
    "0_6":6,"1_7":6,"2_8":3,"3_9":3,"4_10":4,"5_11":4,"6_0":5,"7_1":5,"8_2":6,"9_3":6,
    "0_4":3,"1_5":3,"2_6":2,"3_7":2,"4_8":5,"5_9":5,"6_10":4,"7_11":4,"8_0":5,"9_1":5,
    "0_2":5,"1_3":5,"2_4":4,"3_5":4,"4_6":6,"5_7":6,"6_8":2,"7_9":2,"8_10":3,"9_11":3,
  };
  const key = `${mingStemIdx}_${mingGongPos}`;
  const juNum = nayinLookup[key] || 2;
  const juNames = {2:"水二局",3:"木三局",4:"金四局",5:"土五局",6:"火六局"};
  return { num: juNum, name: juNames[juNum], mingStemIdx };
}

// === 紫微星定位 ===
function getZiweiPos(juNum, lunarDay) {
  const basePos = Math.ceil(lunarDay / juNum);
  return (basePos - 1 + 2) % 12;
}

// === 天府位置 ===
function getTianfuPos(ziweiPos) {
  return (12 - ziweiPos + 4) % 12;
}

// === 旺陷表（14主星在12地支的力量等級）===
// 廟=最強、旺=強、得=中上、利=中、平=普通、不=中下、閒=弱、陷=最弱
const BRIGHTNESS = {
  "紫微": ["廟","廟","廟","旺","旺","旺","廟","廟","旺","旺","旺","旺"],
  "天機": ["旺","陷","廟","廟","旺","旺","旺","陷","廟","廟","利","利"],
  "太陽": ["陷","陷","旺","廟","廟","廟","旺","旺","利","平","陷","陷"],
  "武曲": ["旺","廟","利","廟","旺","旺","旺","廟","利","廟","旺","旺"],
  "天同": ["旺","陷","平","平","陷","旺","陷","旺","平","平","利","廟"],
  "廉貞": ["平","平","旺","陷","利","廟","平","平","旺","陷","利","廟"],
  "天府": ["廟","旺","廟","得","旺","廟","旺","廟","廟","得","旺","廟"],
  "太陰": ["廟","廟","陷","陷","平","平","陷","陷","旺","旺","廟","廟"],
  "貪狼": ["旺","旺","廟","平","旺","旺","廟","旺","平","廟","旺","旺"],
  "巨門": ["旺","旺","廟","廟","旺","旺","廟","旺","陷","陷","旺","旺"],
  "天相": ["廟","旺","旺","陷","得","廟","旺","廟","旺","陷","得","廟"],
  "天梁": ["廟","廟","旺","旺","陷","旺","旺","陷","廟","旺","旺","廟"],
  "七殺": ["旺","廟","旺","平","旺","廟","旺","廟","旺","平","旺","廟"],
  "破軍": ["旺","旺","陷","旺","旺","旺","陷","旺","旺","旺","旺","旺"],
};
// 索引對應：子(0)丑(1)寅(2)卯(3)辰(4)巳(5)午(6)未(7)申(8)酉(9)戌(10)亥(11)

// === 14主星排盤 ===
function placeMainStars(ziweiPos) {
  const stars = {};
  const tianfuPos = getTianfuPos(ziweiPos);

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
    const brightness = BRIGHTNESS[s.name] ? BRIGHTNESS[s.name][pos] : '';
    stars[pos].push({ name: s.name, brightness });
  });

  const tianfuGroup = [
    { name:"天府", offset: 0 },
    { name:"太陰", offset: 1 },
    { name:"貪狼", offset: 2 },
    { name:"巨門", offset: 3 },
    { name:"天相", offset: 4 },
    { name:"天梁", offset: 5 },
    { name:"七殺", offset: 6 },
    { name:"破軍", offset: 10 },
  ];
  tianfuGroup.forEach(s => {
    const pos = (tianfuPos + s.offset) % 12;
    if (!stars[pos]) stars[pos] = [];
    const brightness = BRIGHTNESS[s.name] ? BRIGHTNESS[s.name][pos] : '';
    stars[pos].push({ name: s.name, brightness });
  });

  return stars;
}

// === 副星排盤 ===
function placeMinorStars(yearStemIdx, yearBranchIdx, lunarMonth, hourBranch, mingGongPos) {
  const minor = {};
  function add(pos, name) {
    if (!minor[pos]) minor[pos] = [];
    minor[pos].push(name);
  }

  // 文昌（由生時定）：時支逆數
  const wenchangPos = (10 - hourBranch + 12) % 12;
  add(wenchangPos, "文昌");

  // 文曲（由生時定）：時支順數
  const wenquPos = (4 + hourBranch) % 12;
  add(wenquPos, "文曲");

  // 左輔（由生月定）：月+3 從辰起
  const zuofuPos = (3 + lunarMonth) % 12;
  add(zuofuPos, "左輔");

  // 右弼（由生月定）：10-月 從戌起
  const youbiPos = (10 - lunarMonth + 12) % 12;
  add(youbiPos, "右弼");

  // 天魁（由年干定）
  const tiankuiMap = [1,0,11,11,1,0,1,2,3,3]; // 甲~癸 對應的地支idx
  add(tiankuiMap[yearStemIdx], "天魁");

  // 天鉞（由年干定）
  const tianyueMap = [7,8,9,9,7,8,7,6,5,5]; // 甲~癸
  add(tianyueMap[yearStemIdx], "天鉞");

  // 火星（簡化：由年支+時支定）
  const huoBase = [2,3,1,9]; // 寅午戌/申子辰/巳酉丑/亥卯未 的起始
  const huoGroup = [0,3,0,3,0,3,0,3,0,3,0,3]; // 簡化分組
  const huoStart = yearBranchIdx % 4 < 2 ? 2 : 9;
  add((huoStart + hourBranch) % 12, "火星");

  // 鈴星（簡化）
  const lingStart = yearBranchIdx % 4 < 2 ? 3 : 10;
  add((lingStart + hourBranch) % 12, "鈴星");

  // 擎羊（由年干定）：祿前一位
  const luPos = [2,3,5,6,5,6,8,9,11,0]; // 甲~癸的祿位
  add((luPos[yearStemIdx] + 1) % 12, "擎羊");

  // 陀羅（由年干定）：祿後一位
  add((luPos[yearStemIdx] - 1 + 12) % 12, "陀羅");

  // 地空（由時支定）
  add((11 - hourBranch + 12) % 12, "地空");

  // 地劫（由時支定）
  add((hourBranch + 11) % 12, "地劫");

  return minor;
}

// === 主星解讀 ===
const STAR_INFO = {
  "紫微": "帝王星 — 領導力強、有格局、自尊心高。適合做決策者。",
  "天機": "軍師星 — 聰明善謀、反應快。適合策略規劃和研究。",
  "太陽": "光明星 — 熱心博愛、正義感強。適合利他的工作。",
  "武曲": "財星 — 果斷務實、執行力強。適合金融和管理。",
  "天同": "福星 — 溫和樂觀、知足常樂。適合穩定環境。",
  "廉貞": "政治星 — 聰明複雜、有野心。適合商業和管理。",
  "天府": "庫星 — 穩重守成、善管理。適合財務和行政。",
  "太陰": "月亮星 — 細膩有品味、感受力強。適合藝術和幕後。",
  "貪狼": "慾望星 — 多才多藝、有魅力。適合多元發展。",
  "巨門": "口舌星 — 口才好、分析力強。適合教學研究諮商。",
  "天相": "印星 — 斯文有禮、善協調。適合幕僚和公關。",
  "天梁": "蔭星 — 逢凶化吉、有長輩緣。適合醫療法律。",
  "七殺": "將軍星 — 有魄力、獨立果斷。適合創業和開拓。",
  "破軍": "改革星 — 打破重來、勇於創新。適合變革型工作。",
  "文昌": "科甲星 — 學習力強、文筆好、考試運佳。",
  "文曲": "才藝星 — 有藝術天賦、口才佳、人緣好。",
  "左輔": "助力星 — 有人幫助、善於輔佐、貴人運。",
  "右弼": "助力星 — 暗中有人支持、人緣好、做事順利。",
  "天魁": "陽貴人 — 男性貴人多、得長輩提攜。",
  "天鉞": "陰貴人 — 女性貴人多、暗中有人幫。",
  "火星": "急躁星 — 行動快但衝動、有爆發力。注意脾氣。",
  "鈴星": "暗火星 — 內心焦慮、做事急躁。學會沉穩。",
  "擎羊": "刑剋星 — 有魄力但易衝突。把鋒芒用對地方。",
  "陀羅": "拖延星 — 做事拖磨、但有韌性和耐力。",
  "地空": "空亡星 — 想法超脫、有靈性但不切實際。適合創意。",
  "地劫": "劫財星 — 財來財去、適合技術而非守財。",
};

// === 宮位意義 ===
const PALACE_INFO = {
  "命宮": "你的核心性格和人生主題",
  "兄弟": "兄弟姊妹、朋友、同事關係",
  "夫妻": "伴侶類型和婚姻狀態",
  "子女": "子女關係、創作、下屬",
  "財帛": "賺錢方式和財運",
  "疾厄": "健康狀況和體質",
  "遷移": "外出運、社交、旅行",
  "交友": "社交圈和人際品質",
  "事業": "事業方向和成就",
  "田宅": "房產運和居住環境",
  "福德": "精神生活和內心狀態",
  "父母": "父母關係、學習、文書運",
};

// === 主計算 ===
export function calculate(birthData) {
  const { year, month, day, hour, gender } = birthData;
  try {
    const lunar = solarToLunar(year, month, day);
    if (!lunar) return { status:'error', data:null, html:'', error:'無法轉換農曆日期' };

    const hourBranch = hourToBranch(hour);
    const mingPos = getMingGong(lunar.lunarMonth, hourBranch);
    const ju = getWuxingJu(lunar.yearStemIdx, mingPos);
    const ziweiPos = getZiweiPos(ju.num, lunar.lunarDay);
    const mainStars = placeMainStars(ziweiPos);
    const minorStars = placeMinorStars(lunar.yearStemIdx, lunar.yearBranchIdx, lunar.lunarMonth, hourBranch, mingPos);

    // 合併主星和副星
    const allStars = {};
    for (let i = 0; i < 12; i++) {
      allStars[i] = { main: mainStars[i] || [], minor: minorStars[i] || [] };
    }

    // 排列12宮（逆時針）
    const palaces = [];
    for (let i = 0; i < 12; i++) {
      const pos = ((mingPos - i) % 12 + 12) % 12;
      palaces.push({
        name: PALACE_NAMES[i],
        branch: BRANCHES[pos],
        pos,
        main: allStars[pos].main,
        minor: allStars[pos].minor,
      });
    }

    const data = { lunar, mingPos, ju, palaces, gender };
    const html = renderZiwei(data);
    return { status:'ok', data, html, error:null };
  } catch (err) {
    return { status:'error', data:null, html:'', error:`紫微斗數計算錯誤：${err.message}` };
  }
}

// === 渲染：方格圖 ===
function renderZiwei(data) {
  const { lunar, mingPos, ju, palaces } = data;
  const mingStars = palaces[0].main;

  return `
    <div class="sig">
      <div class="kin">紫微斗數命盤</div>
      <div class="big">${mingStars.length > 0 ? mingStars.map(s=>s.name).join(' ') + ' 坐命' : '命宮無主星'}</div>
      <div style="font-size:.85rem;color:var(--muted);margin-top:6px;">
        農曆 ${lunar.lunarYear}年${lunar.isLeap?'閏':''}${lunar.lunarMonth}月${lunar.lunarDay}日 · ${ju.name} · 命宮在${BRANCHES[mingPos]}
      </div>
    </div>
    <div class="note" style="margin-bottom:12px;">💡 點擊各宮格查看星曜解讀</div>
    ${renderGrid(palaces, lunar, ju)}
    <div id="zw-detail" style="margin-top:12px;"></div>
  `;
}

function renderGrid(palaces, lunar, ju) {
  // 標準紫微盤方格：4x4，地支位置固定
  // 上排：巳(5) 午(6) 未(7) 申(8)
  // 左列：辰(4)               酉(9)
  // 左列：卯(3)               戌(10)
  // 下排：寅(2) 丑(1) 子(0) 亥(11)
  // 中間放基本資料

  // 先建一個 pos → palace 的映射
  const posMap = {};
  palaces.forEach(p => { posMap[p.pos] = p; });

  function cell(branchIdx) {
    const p = posMap[branchIdx];
    if (!p) return `<div style="padding:6px;background:var(--input-bg);border:1px solid var(--card-border);border-radius:4px;min-height:60px;"></div>`;
    const isMing = p.name === "命宮";
    const border = isMing ? 'border:2px solid var(--accent);' : 'border:1px solid var(--card-border);';
    const mainStr = p.main.length > 0 ? `<div style="font-weight:700;font-size:.8rem;${isMing?'color:var(--accent);':''}">${p.main.map(s=>s.name+'<sub style=\"font-size:.55rem;color:var(--muted)\">'+s.brightness+'</sub>').join(' ')}</div>` : '';
    const minorStr = p.minor.length > 0 ? `<div style="font-size:.65rem;color:var(--muted);">${p.minor.join(' ')}</div>` : '';
    const palaceLabel = `<div style="font-size:.6rem;color:var(--muted);margin-bottom:2px;">${p.name}</div>`;
    const detail = JSON.stringify({name:p.name,branch:p.branch,main:p.main,minor:p.minor}).replace(/"/g,'&quot;');
    return `<div style="padding:5px;background:var(--input-bg);${border}border-radius:4px;min-height:60px;cursor:pointer;display:flex;flex-direction:column;justify-content:space-between;" onclick="showZwDetail(this)" data-palace="${detail}">
      ${palaceLabel}${mainStr}${minorStr}
      <div style="font-size:.55rem;color:var(--muted);text-align:right;">${BRANCHES[branchIdx]}</div>
    </div>`;
  }

  const centerInfo = `<div style="grid-column:span 2;grid-row:span 2;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;background:var(--card);border-radius:8px;text-align:center;">
    <div style="font-size:.75rem;color:var(--muted);">命盤總覽</div>
    <div style="font-size:.85rem;margin:4px 0;">${lunar.lunarYear}年${lunar.lunarMonth}月${lunar.lunarDay}日</div>
    <div style="font-size:.85rem;">${ju.name}</div>
    <div style="font-size:.7rem;color:var(--muted);margin-top:4px;">點宮位看詳情</div>
  </div>`;

  // 4x4 grid
  return `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px;font-size:.75rem;">
      ${cell(5)}${cell(6)}${cell(7)}${cell(8)}
      ${cell(4)}${centerInfo}${cell(9)}
      ${cell(3)}${cell(10)}
      ${cell(2)}${cell(1)}${cell(0)}${cell(11)}
    </div>
    <script>
      function showZwDetail(el) {
        const data = JSON.parse(el.dataset.palace.replace(/&quot;/g,'"'));
        const info = ${JSON.stringify(STAR_INFO)};
        const pInfo = ${JSON.stringify(PALACE_INFO)};
        let html = '<div style="padding:12px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.85rem;line-height:1.8;">';
        html += '<b>' + data.name + '（' + data.branch + '宮）</b><br>';
        html += '<span style="color:var(--muted);">' + (pInfo[data.name]||'') + '</span><br><br>';
        if (data.main.length > 0) {
          html += '<b>主星：</b><br>';
          data.main.forEach(function(s) {
            var bColor = s.brightness==='廟'||s.brightness==='旺' ? 'var(--accent)' : s.brightness==='陷' ? 'var(--red)' : 'var(--muted)';
            html += '<span style="color:var(--accent);font-weight:700;">' + s.name + '</span>';
            html += '<span style="font-size:.75rem;color:' + bColor + ';">（' + s.brightness + '）</span>：';
            html += (info[s.name]||'') + '<br>';
          });
        } else {
          html += '<span style="color:var(--muted);">此宮無主星（借對宮星力，性格在此面向受環境影響較大）</span><br>';
        }
        if (data.minor.length > 0) {
          html += '<br><b>副星：</b><br>';
          data.minor.forEach(function(s) { html += '<span style="color:var(--muted);">' + s + '</span>：' + (info[s]||'') + '<br>'; });
        }
        html += '</div>';
        document.getElementById('zw-detail').innerHTML = html;
      }
    </script>
  `;
}
