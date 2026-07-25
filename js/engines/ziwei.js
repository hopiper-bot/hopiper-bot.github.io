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
// 三合派標準（《紫微斗數全書》）
// 廟=最強、旺=強、得=中上、利=中、平=普通、閒=弱、陷=最弱
// 索引：子(0)丑(1)寅(2)卯(3)辰(4)巳(5)午(6)未(7)申(8)酉(9)戌(10)亥(11)
const BRIGHTNESS = {
  "紫微": ["旺","廟","廟","旺","得","旺","廟","廟","旺","得","旺","得"],
  "天機": ["廟","陷","利","廟","旺","旺","廟","陷","利","廟","旺","旺"],
  "太陽": ["陷","陷","旺","廟","廟","廟","旺","得","利","平","陷","陷"],
  "武曲": ["旺","廟","得","利","旺","旺","廟","廟","得","旺","旺","利"],
  "天同": ["廟","陷","平","平","陷","利","陷","旺","旺","平","利","旺"],
  "廉貞": ["平","平","廟","陷","利","旺","平","平","廟","陷","利","旺"],
  "天府": ["廟","旺","廟","得","旺","旺","廟","旺","廟","得","旺","旺"],
  "太陰": ["廟","廟","陷","陷","平","平","陷","陷","旺","旺","廟","廟"],
  "貪狼": ["旺","廟","廟","旺","平","旺","旺","廟","廟","旺","平","旺"],
  "巨門": ["旺","廟","廟","旺","旺","平","旺","廟","陷","旺","旺","平"],
  "天相": ["廟","旺","旺","陷","得","廟","旺","廟","旺","陷","得","廟"],
  "天梁": ["廟","旺","廟","旺","陷","旺","旺","陷","旺","旺","廟","旺"],
  "七殺": ["旺","廟","旺","平","旺","廟","旺","廟","旺","平","旺","廟"],
  "破軍": ["陷","旺","平","旺","旺","平","陷","旺","平","旺","旺","平"],
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

  // 火星（由年支三合局+時支定）
  // 寅午戌年：起丑，順數時辰
  // 申子辰年：起寅，順數時辰
  // 巳酉丑年：起卯，順數時辰
  // 亥卯未年：起酉，順數時辰
  const huoStartMap = { 2:1,6:1,10:1, 8:2,0:2,4:2, 5:3,9:3,1:3, 11:9,3:9,7:9 };
  const huoStart = huoStartMap[yearBranchIdx] || 2;
  add((huoStart + hourBranch) % 12, "火星");

  // 鈴星（由年支三合局+時支定）
  // 寅午戌年：起卯，順數時辰
  // 申子辰年：起戌，順數時辰
  // 巳酉丑年：起戌，順數時辰
  // 亥卯未年：起戌，順數時辰
  const lingStartMap = { 2:3,6:3,10:3, 8:10,0:10,4:10, 5:10,9:10,1:10, 11:10,3:10,7:10 };
  const lingStart = lingStartMap[yearBranchIdx] || 10;
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

  // 祿存（由年干定）：直接在祿位
  add(luPos[yearStemIdx], "祿存");

  // 天馬（由年支定）
  // 寅午戌年在申、申子辰年在寅、巳酉丑年在亥、亥卯未年在巳
  const tianmaMap = { 2:8,6:8,10:8, 8:2,0:2,4:2, 5:11,9:11,1:11, 11:5,3:5,7:5 };
  if (tianmaMap[yearBranchIdx] !== undefined) {
    add(tianmaMap[yearBranchIdx], "天馬");
  }

  return minor;
}

// === 四化（由年干決定）===
const SIHUA_TABLE = {
  // yearStemIdx: [化祿星, 化權星, 化科星, 化忌星]
  0: ["廉貞","破軍","武曲","太陽"],   // 甲
  1: ["天機","天梁","紫微","太陰"],   // 乙
  2: ["天同","天機","文昌","廉貞"],   // 丙
  3: ["太陰","天同","天機","巨門"],   // 丁
  4: ["貪狼","太陰","右弼","天機"],   // 戊
  5: ["武曲","貪狼","天梁","文曲"],   // 己
  6: ["太陽","武曲","太陰","天同"],   // 庚
  7: ["巨門","太陽","文曲","文昌"],   // 辛
  8: ["天梁","紫微","左輔","武曲"],   // 壬
  9: ["破軍","巨門","太陰","貪狼"],   // 癸
};

function getSihua(yearStemIdx) {
  const stars = SIHUA_TABLE[yearStemIdx] || [];
  return {
    lu: stars[0],    // 化祿
    quan: stars[1],  // 化權
    ke: stars[2],    // 化科
    ji: stars[3],    // 化忌
  };
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
  "祿存": "財祿星 — 穩定的財源和物質保障。代表你天生有某方面的資源保底。",
  "天馬": "驛馬星 — 奔波、活動力強。跟祿存同宮形成「祿馬交馳」格局更佳。",
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

// === 大限計算 ===
function calculateDaxian(mingPos, juNum, isForward, palaces) {
  // 大限起始年齡 = 五行局數 + 1（水二局從2歲起，木三局從3歲起...）
  // 不對，標準是：起始年齡 = 局數 + 1... 實際上各派不同
  // 通用：水二局2歲起、木三局3歲起、金四局4歲起、土五局5歲起、火六局6歲起
  const startAge = juNum;
  const steps = [];

  for (let i = 0; i < 12; i++) {
    const age = startAge + i * 10;
    // 大限宮位：從命宮開始，順行或逆行
    let pos;
    if (isForward) {
      pos = ((mingPos - i) % 12 + 12) % 12; // 順行 = 逆時針（跟宮位排列同方向）
    } else {
      pos = (mingPos + i) % 12; // 逆行 = 順時針
    }
    const palace = palaces.find(p => p.pos === pos);
    steps.push({
      age,
      ageEnd: age + 9,
      pos,
      branch: BRANCHES[pos],
      palaceName: palace ? palace.name : '',
      main: palace ? palace.main : [],
    });
  }
  return steps;
}

// === 流年計算 ===
function calculateLiunian(currentYear, mingPos) {
  // 流年命宮：當年地支 = 流年命宮所在地支
  // 不對，流年命宮定位更複雜。簡化版：流年地支就是流年命宮
  // 正確：流年命宮 = 流年地支
  const yearBranchIdx = ((currentYear - 4) % 12 + 12) % 12;
  const yearStemIdx = ((currentYear - 4) % 10 + 10) % 10;

  // 流年四化
  const lnSihua = getSihua(yearStemIdx);

  return {
    year: currentYear,
    branch: BRANCHES[yearBranchIdx],
    branchIdx: yearBranchIdx,
    stem: ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"][yearStemIdx],
    sihua: lnSihua,
  };
}

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
    const sihua = getSihua(lunar.yearStemIdx);

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

    const data = { lunar, mingPos, ju, palaces, gender, sihua, year };

    // 大限計算
    const isMale = (gender !== 'female');
    const yearStemYY = lunar.yearStemIdx % 2 === 0 ? 'yang' : 'yin';
    const isForward = (isMale && yearStemYY === 'yang') || (!isMale && yearStemYY === 'yin');
    const daxian = calculateDaxian(mingPos, ju.num, isForward, palaces);

    // 流年計算
    const currentYear = new Date().getFullYear();
    const liunian = calculateLiunian(currentYear, mingPos);

    data.daxian = daxian;
    data.liunian = liunian;
    data.currentYear = currentYear;
    data.birthYear = year;

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
    <div class="note" style="margin-bottom:12px;">💡 點擊各宮格查看星曜解讀｜格子內 ⏳ = 大限年齡（★ = 現在走的大限）</div>
    ${renderGrid(palaces, lunar, ju, data.sihua, data.daxian, data.birthYear)}
    <div id="zw-detail" style="margin-top:12px;"></div>
    <div class="divider"></div>
    <h3 style="cursor:pointer;" onclick="document.getElementById('zw-daxian').style.display=document.getElementById('zw-daxian').style.display==='none'?'block':'none';">🚂 大限解說（十年大運）▼</h3>
    <div id="zw-daxian" style="display:none;">
      ${renderDaxian(data.daxian, data.birthYear)}
    </div>
    <div class="divider"></div>
    <h3 style="cursor:pointer;" onclick="document.getElementById('zw-liunian').style.display=document.getElementById('zw-liunian').style.display==='none'?'block':'none';">📅 ${data.currentYear} 流年 ▼</h3>
    <div id="zw-liunian" style="display:none;">
      ${renderLiunian(data.liunian, palaces)}
    </div>
  `;
}

function renderGrid(palaces, lunar, ju, sihua, daxian, birthYear) {
  // 標準紫微盤方格：4x4，地支位置固定
  // 上排：巳(5) 午(6) 未(7) 申(8)
  // 左列：辰(4)               酉(9)
  // 左列：卯(3)               戌(10)
  // 下排：寅(2) 丑(1) 子(0) 亥(11)
  // 中間放基本資料

  // 先建一個 pos → palace 的映射
  const posMap = {};
  palaces.forEach(p => { posMap[p.pos] = p; });

  // pos → 大限 的映射
  const daxianMap = {};
  const now = new Date().getFullYear();
  const currentAge = now - birthYear;
  if (daxian) {
    daxian.forEach(d => { daxianMap[d.pos] = d; });
  }

  function cell(branchIdx) {
    const p = posMap[branchIdx];
    if (!p) return `<div style="padding:6px;background:var(--input-bg);border:1px solid var(--card-border);border-radius:4px;min-height:60px;"></div>`;
    const isMing = p.name === "命宮";
    const dx = daxianMap[branchIdx];
    const isDxCurrent = dx && (currentAge >= dx.age && currentAge <= dx.ageEnd);
    const border = isMing ? 'border:2px solid var(--accent);' : isDxCurrent ? 'border:2px solid var(--accent2);' : 'border:1px solid var(--card-border);';
    const mainStr = p.main.length > 0 ? `<div style="font-weight:700;font-size:.8rem;${isMing?'color:var(--accent);':''}">${p.main.map(s=>{
      let hua='';
      if(s.name===sihua.lu) hua='<span style=\"color:#4f4;font-size:.55rem;\">祿</span>';
      else if(s.name===sihua.quan) hua='<span style=\"color:#f84;font-size:.55rem;\">權</span>';
      else if(s.name===sihua.ke) hua='<span style=\"color:#8cf;font-size:.55rem;\">科</span>';
      else if(s.name===sihua.ji) hua='<span style=\"color:#f55;font-size:.55rem;\">忌</span>';
      return s.name+'<sub style=\"font-size:.55rem;color:var(--muted)\">'+s.brightness+'</sub>'+hua;
    }).join(' ')}</div>` : '';
    const minorStr = p.minor.length > 0 ? `<div style="font-size:.65rem;color:var(--muted);">${p.minor.map(s=>{
      let hua='';
      if(s===sihua.lu) hua='<span style=\"color:#4f4;font-size:.55rem;\">祿</span>';
      else if(s===sihua.quan) hua='<span style=\"color:#f84;font-size:.55rem;\">權</span>';
      else if(s===sihua.ke) hua='<span style=\"color:#8cf;font-size:.55rem;\">科</span>';
      else if(s===sihua.ji) hua='<span style=\"color:#f55;font-size:.55rem;\">忌</span>';
      return s+hua;
    }).join(' ')}</div>` : '';
    const palaceLabel = `<div style="font-size:.6rem;color:var(--muted);margin-bottom:2px;">${p.name}</div>`;
    // 大限標籤放格子底部
    let dxLabel = '';
    if (dx) {
      const dxColor = isDxCurrent ? 'color:var(--accent);font-weight:700;' : 'color:var(--muted);';
      const dxMark = isDxCurrent ? ' ★' : '';
      dxLabel = `<div style="font-size:.55rem;${dxColor}margin-top:2px;">⏳${dx.age}-${dx.ageEnd}歲${dxMark}</div>`;
    }
    const detail = JSON.stringify({name:p.name,branch:p.branch,main:p.main,minor:p.minor}).replace(/"/g,'&quot;');
    return `<div style="padding:5px;background:var(--input-bg);${border}border-radius:4px;min-height:60px;cursor:pointer;display:flex;flex-direction:column;justify-content:space-between;" onclick="showZwDetail(this)" data-palace="${detail}">
      ${palaceLabel}${mainStr}${minorStr}
      <div style="display:flex;justify-content:space-between;align-items:flex-end;">
        ${dxLabel}
        <div style="font-size:.55rem;color:var(--muted);">${BRANCHES[branchIdx]}</div>
      </div>
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


// === 大限解讀資料（主星×宮位的十年運勢概述）===
const DAXIAN_INTERP = {
  // 宮位面向的大限意義
  "命宮": "這十年是自我重塑期，人生方向和自我認知會有大轉變。",
  "兄弟": "這十年人際合作運強，適合團隊協作、拓展社交圈。",
  "夫妻": "這十年感情運活躍，伴侶關係是重點。單身者有機會遇到對象。",
  "子女": "這十年創造力和後代運突出，適合創新、創作或培育下一代。",
  "財帛": "這十年財運是主軸，收入和理財方式會有明顯變化。",
  "疾厄": "這十年要留意健康，但也是認識自己身體、培養好習慣的時機。",
  "遷移": "這十年外出運旺，可能有搬遷、旅行或外派的機會。社交圈擴大。",
  "交友": "這十年社交圈是重點，可能遇到對人生有重大影響的朋友或合作夥伴。",
  "事業": "這十年事業運是核心，適合衝刺職涯、展現能力。",
  "田宅": "這十年居住環境和家庭生活是重點，可能有購屋或搬家。",
  "福德": "這十年精神生活是焦點，適合修身養性、找到內心平靜。",
  "父母": "這十年與長輩的互動增多，學習運也不錯。可能承擔照顧責任。",
};

// 主星在大限的特質加成
const DAXIAN_STAR_BOOST = {
  "紫微": "紫微坐鎮，這十年有領導機會，貴人運不錯，大事自己做主。",
  "天機": "天機主智慧變動，這十年腦子轉得快，適合學新東西、做策略規劃。",
  "太陽": "太陽照耀，這十年適合對外發展、幫助他人，名聲可能上升。",
  "武曲": "武曲主財星入限，這十年財運實在，付出有回報，適合務實的理財行動。",
  "天同": "天同入限，這十年生活步調放緩，有福可享，但要避免過於安逸。",
  "廉貞": "廉貞入限，這十年有野心和衝勁，人際關係複雜但有機會往上爬。",
  "天府": "天府坐鎮，這十年穩定有保障，適合守成和穩健發展。",
  "太陰": "太陰入限，這十年感受力增強，內在世界豐富，有房產運或被動收入。",
  "貪狼": "貪狼入限，這十年慾望多、機會也多，桃花旺，多元發展有利。",
  "巨門": "巨門入限，這十年口舌是非可能多，但也代表用嘴巴賺錢的機會。",
  "天相": "天相入限，這十年貴人運佳，適合做輔佐角色或與人合作。",
  "天梁": "天梁入限，這十年有化解災厄的能力，長輩緣好，適合走專業路線。",
  "七殺": "七殺入限，這十年有大破大立的機會，變動大但成長也大。要有魄力。",
  "破軍": "破軍入限，這十年舊的會打破、新的會重建。變化劇烈但是必要的成長。",
};

function renderDaxian(daxian, birthYear) {
  const now = new Date().getFullYear();
  const currentAge = now - birthYear;
  return `<p style="font-size:.83rem;color:var(--muted);margin-bottom:12px;">大限 = 紫微版的「十年大運」。每十年走一個宮位的能量，格子裡的 ⏳ 就是你的大限分佈。</p>` +
    daxian.map(d => {
      const isCurrent = (currentAge >= d.age && currentAge <= d.ageEnd);
      const hl = isCurrent ? 'border-left:3px solid var(--accent);padding-left:10px;background:rgba(245,197,66,.06);' : 'padding-left:10px;';
      const marker = isCurrent ? ' <span style="color:var(--accent);font-weight:700;">← 目前走這步</span>' : '';
      const starStr = d.main.length > 0 ? d.main.map(s=>s.name).join('、') : '無主星';
      // 解讀
      const palaceInterp = DAXIAN_INTERP[d.palaceName] || '';
      const starInterp = d.main.length > 0 
        ? d.main.map(s => DAXIAN_STAR_BOOST[s.name] || '').filter(x=>x).join(' ')
        : '此限無主星坐守，受對宮和鄰宮星力影響，性格表現較隨環境變化。';
      const interpBlock = isCurrent 
        ? `<div style="margin-top:6px;padding:8px;background:rgba(123,108,246,.08);border-radius:6px;font-size:.8rem;line-height:1.7;color:var(--text);">${palaceInterp}<br>${starInterp}</div>`
        : `<div style="margin-top:4px;font-size:.78rem;color:var(--muted);line-height:1.6;">${palaceInterp} ${starInterp}</div>`;
      return `<div style="padding:8px 10px;margin:4px 0;border-radius:6px;${hl}">
        <b>${d.age}-${d.ageEnd}歲</b>（${d.branch}宮 · ${d.palaceName}）${marker}<br>
        <span style="font-size:.83rem;color:var(--muted);">主星：${starStr}</span>
        ${interpBlock}
      </div>`;
    }).join('');
}

function renderLiunian(liunian, palaces) {
  const lnPalace = palaces.find(p => p.pos === liunian.branchIdx);
  const lnStars = lnPalace ? lnPalace.main.map(s=>s.name).join('、') || '無主星' : '無主星';
  return `<div style="padding:10px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.85rem;line-height:1.8;">
    <b>${liunian.year} 年（${liunian.stem}${liunian.branch}年）</b><br><br>
    <b>流年命宮在：${liunian.branch}宮</b>（${lnPalace?lnPalace.name:''}）<br>
    主星：${lnStars}<br><br>
    <b>流年四化：</b><br>
    <span style="color:#4f4;">祿</span> → ${liunian.sihua.lu}　
    <span style="color:#f84;">權</span> → ${liunian.sihua.quan}　
    <span style="color:#8cf;">科</span> → ${liunian.sihua.ke}　
    <span style="color:#f55;">忌</span> → ${liunian.sihua.ji}<br><br>
    <span style="color:var(--muted);">流年四化飛入哪個宮，那個宮今年就被激活。化祿=有好事、化忌=要注意。</span>
  </div>`;
}
