/**
 * transit.js — 流年分析引擎
 * 整合五大系統的年度預測：
 * 1. 馬雅：今年的 Kin 能量
 * 2. 人類圖：行星過境啟動的臨時通道
 * 3. 西洋占星：行星過境 vs 本命相位
 * 4. 八字：流年天干地支 vs 命局
 * 5. 紫微：流年宮位 + 流年四化
 */

import { julianDay, sunLongitude, moonLongitude, northNodeLongitude } from '../lib/ephemeris.js';
import { mercuryGeoLon, venusGeoLon, marsGeoLon, jupiterGeoLon, saturnGeoLon, uranusGeoLon, neptuneGeoLon, plutoGeoLon } from '../lib/planets.js';
import { normalizeDeg, jdToJC, dateTimeToJD } from '../lib/utils.js';
import { longitudeToGate, GATES } from '../data/hd-gates.js';
import { findDefinedChannels, CHANNELS } from '../data/hd-channels.js';
import { SEALS as MAYA_SEALS, TONES as MAYA_TONES } from '../data/maya-text.js';

// === 常量 ===
const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const STEM_ELEMENT = {"甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水"};
const BRANCH_ELEMENT = {"子":"水","丑":"土","寅":"木","卯":"木","辰":"土","巳":"火","午":"火","未":"土","申":"金","酉":"金","戌":"土","亥":"水"};

const STEM_YINYANG = {"甲":"陽","乙":"陰","丙":"陽","丁":"陰","戊":"陽","己":"陰","庚":"陽","辛":"陰","壬":"陽","癸":"陰"};
const WUXING_SHENG = {"木":"火","火":"土","土":"金","金":"水","水":"木"};
const WUXING_KE = {"木":"土","土":"水","水":"火","火":"金","金":"木"};

// 十神
function getTenGod(day, other) {
  const de = STEM_ELEMENT[day], oe = STEM_ELEMENT[other];
  const dy = STEM_YINYANG[day], oy = STEM_YINYANG[other];
  const same = dy === oy;
  if (de === oe) return same ? '比肩' : '劫財';
  if (WUXING_SHENG[de] === oe) return same ? '食神' : '傷官';
  if (WUXING_KE[de] === oe) return same ? '偏財' : '正財';
  if (WUXING_KE[oe] === de) return same ? '七殺' : '正官';
  if (WUXING_SHENG[oe] === de) return same ? '偏印' : '正印';
  return '';
}

// 流年天干地支
function getYearStemBranch(year) {
  const sIdx = (year - 4) % 10;
  const bIdx = (year - 4) % 12;
  return { stem: STEMS[sIdx], branch: BRANCHES[bIdx], stemIdx: sIdx, branchIdx: bIdx };
}

// === 1. 八字流年 ===
function baziTransit(year, baziData) {
  if (!baziData) return null;
  const yy = getYearStemBranch(year);
  const dayMaster = baziData.dayMaster;
  const god = getTenGod(dayMaster, yy.stem);
  const yearElem = STEM_ELEMENT[yy.stem];
  const dayElem = baziData.dayMasterElem;
  
  // 生剋關係
  let relation = '';
  if (yearElem === dayElem) relation = '比和（平穩）';
  else if (WUXING_SHENG[dayElem] === yearElem) relation = '我生（付出、耗洩）';
  else if (WUXING_SHENG[yearElem] === dayElem) relation = '生我（得助、資源）';
  else if (WUXING_KE[dayElem] === yearElem) relation = '我剋（求財、掌控）';
  else if (WUXING_KE[yearElem] === dayElem) relation = '剋我（壓力、挑戰）';

  // 十神解讀
  const godDesc = {
    '比肩': '同類能量加持——人脈擴展、合作機會增加。但也要注意競爭和分財。',
    '劫財': '社交活躍、花錢慾望增加。適合拓展業務，但注意財務控管。',
    '食神': '才華展現的一年——創意豐沛、表達順暢。適合創作、學習新技能。身體放鬆，胃口好。',
    '傷官': '想法爆發、叛逆創新。對現狀不滿想突破。適合轉型，但注意跟上司/權威的關係。',
    '正財': '穩定進財——薪資加、理財有成。適合經營、累積。感情穩定走向承諾。',
    '偏財': '意外之財——投資、業績爆發、兼職收入。機會多但也來得快去得快。',
    '正官': '升遷、認可、考試順利。適合走體制內路線。會感受到責任加重。',
    '七殺': '壓力和挑戰——但也是突破舒適圈的動力。適合創業、轉換跑道、面對恐懼。',
    '正印': '學習、進修、考證照的好年。有長輩/貴人相助。身心修復。',
    '偏印': '靈感和直覺增強——適合研究、寫作、非主流技能。但注意鑽牛角尖。',
  };

  // 大運位置
  let dayunInfo = '';
  if (baziData.dayun) {
    const currentDayun = baziData.dayun.find(d => year >= d.yearStart && year <= d.yearEnd);
    if (currentDayun) {
      dayunInfo = `大運「${currentDayun.stem}${currentDayun.branch}」（${currentDayun.god}運）`;
    }
  }

  return { stem: yy.stem, branch: yy.branch, god, relation, godDesc: godDesc[god]||'', dayunInfo, yearElem };
}

// === 2. 人類圖 Transit ===
function hdTransit(year, hdData) {
  if (!hdData) return null;
  // 計算今年 1/1 正午的行星位置（粗估年度能量）
  const jd = dateTimeToJD(year, 7, 1, 12, 0, 0); // 年中取樣
  const transitPlanets = [
    { id: 'sun', fn: sunLongitude },
    { id: 'jupiter', fn: jupiterGeoLon },
    { id: 'saturn', fn: saturnGeoLon },
    { id: 'uranus', fn: uranusGeoLon },
    { id: 'neptune', fn: neptuneGeoLon },
    { id: 'pluto', fn: plutoGeoLon },
  ];
  
  // 取慢行星（木土天海冥）的閘門——它們今年大部分時間都在那
  const transitGates = [];
  const planetNames = { jupiter:'木星', saturn:'土星', uranus:'天王星', neptune:'海王星', pluto:'冥王星' };
  for (const p of transitPlanets) {
    if (p.id === 'sun') continue; // 太陽每月換，不算年度
    const lon = p.fn(jd);
    const { gate, line } = longitudeToGate(lon);
    transitGates.push({ planet: planetNames[p.id], gate, line });
  }
  
  // 本命啟動的閘門
  const natalGates = new Set();
  if (hdData.personalityPlanets) hdData.personalityPlanets.forEach(p => natalGates.add(p.gate));
  if (hdData.designPlanets) hdData.designPlanets.forEach(p => natalGates.add(p.gate));
  
  // 找流年行星可能跟本命形成的臨時通道
  const tempChannels = [];
  for (const tp of transitGates) {
    // 找包含此閘門的通道
    for (const ch of CHANNELS) {
      const otherGate = ch.gates[0] === tp.gate ? ch.gates[1] : ch.gates[1] === tp.gate ? ch.gates[0] : null;
      if (otherGate && natalGates.has(otherGate)) {
        // 本命有另一端，流年行星補上這一端 = 臨時通道
        const alreadyDefined = hdData.definedChannels?.some(dc => dc.gates.includes(tp.gate) && dc.gates.includes(otherGate));
        if (!alreadyDefined) {
          tempChannels.push({ planet: tp.planet, channel: ch, transitGate: tp.gate, natalGate: otherGate });
        }
      }
    }
  }
  
  return { transitGates, tempChannels };
}

// === 3. 西洋占星 Transit ===
function astroTransit(year, astroData) {
  if (!astroData) return null;
  const jd = dateTimeToJD(year, 7, 1, 12, 0, 0);
  const SIGNS_ZH = ['牡羊座','金牛座','雙子座','巨蟹座','獅子座','處女座','天秤座','天蠍座','射手座','摩羯座','水瓶座','雙魚座'];
  
  // 慢行星今年位置
  const transitPositions = [
    { id: 'jupiter', zh: '木星', fn: jupiterGeoLon },
    { id: 'saturn', zh: '土星', fn: saturnGeoLon },
    { id: 'uranus', zh: '天王星', fn: uranusGeoLon },
    { id: 'neptune', zh: '海王星', fn: neptuneGeoLon },
    { id: 'pluto', zh: '冥王星', fn: plutoGeoLon },
  ].map(p => {
    const lon = p.fn(jd);
    const signIdx = Math.floor(lon / 30);
    return { ...p, lon, sign: SIGNS_ZH[signIdx], signIdx };
  });
  
  // vs 本命行星的相位
  const aspects = [];
  const natalPlanets = astroData.planets || [];
  const ASP = [
    { name: '合', angle: 0, orb: 8 },
    { name: '對沖', angle: 180, orb: 8 },
    { name: '四分', angle: 90, orb: 6 },
    { name: '三合', angle: 120, orb: 6 },
  ];
  
  for (const tp of transitPositions) {
    for (const np of natalPlanets) {
      let diff = Math.abs(tp.lon - np.longitude);
      if (diff > 180) diff = 360 - diff;
      for (const asp of ASP) {
        if (Math.abs(diff - asp.angle) <= asp.orb) {
          aspects.push({ transit: tp.zh, natal: np.zh, type: asp.name, exact: Math.abs(diff - asp.angle).toFixed(1) });
          break;
        }
      }
    }
  }
  
  // 木星落宮（幸運領域）
  const natalAscLon = astroData.ascendant?.longitude || 0;
  const jupLon = transitPositions.find(p => p.id === 'jupiter')?.lon || 0;
  const jupHouse = Math.floor(normalizeDeg(jupLon - natalAscLon) / 30) + 1;
  
  // 土星落宮（功課領域）
  const satLon = transitPositions.find(p => p.id === 'saturn')?.lon || 0;
  const satHouse = Math.floor(normalizeDeg(satLon - natalAscLon) / 30) + 1;

  return { transitPositions, aspects, jupHouse, satHouse };
}

// === 4. 紫微流年 ===
function ziweiTransit(year, ziweiData) {
  if (!ziweiData) return null;
  // 流年命宮位置 = 流年地支決定
  const yb = (year - 4) % 12;
  // 流年命宮 = 寅起正月，逆推
  // 簡化：流年地支決定流年走到哪個宮位
  const liunianPos = (14 - yb) % 12; // 流年命宮
  
  // 流年四化（由流年天干決定）
  const ys = (year - 4) % 10;
  const SIHUA_TABLE = [
    ['廉貞','破軍','武曲','太陽'], // 甲
    ['天機','天梁','紫微','太陰'], // 乙
    ['天同','天機','文昌','廉貞'], // 丙
    ['太陰','天同','天機','巨門'], // 丁
    ['貪狼','太陰','右弼','天機'], // 戊
    ['武曲','貪狼','天梁','文曲'], // 己
    ['太陽','武曲','太陰','天同'], // 庚
    ['巨門','太陽','文曲','文昌'], // 辛
    ['天梁','紫微','左輔','武曲'], // 壬
    ['破軍','巨門','太陰','貪狼'], // 癸
  ];
  const sh = SIHUA_TABLE[ys];
  const sihua = { lu: sh[0], quan: sh[1], ke: sh[2], ji: sh[3] };
  
  // 找流年四化落在本命哪個宮
  let sihuaPalaces = {};
  if (ziweiData.palaces) {
    for (const key of ['lu','quan','ke','ji']) {
      const starName = sihua[key];
      for (const p of ziweiData.palaces) {
        const found = p.main?.some(s => (typeof s === 'string' ? s : s.name) === starName);
        if (found) {
          sihuaPalaces[key] = p;
          break;
        }
      }
    }
  }
  
  return { liunianPos, sihua, sihuaPalaces, yearStem: STEMS[ys], yearBranch: BRANCHES[yb] };
}

// === 5. 馬雅流年 ===
function mayaTransit(year, mayaData) {
  if (!mayaData) return null;
  const ad = mayaData.annualDream;
  const ds = mayaData.dreamspell;
  if (!ad) return null;
  
  // 直接用 maya-text.js 的 SEALS/TONES 資料，確保名稱一致
  function kinToName(kin) {
    if (!kin) return null;
    const sealIdx = (kin - 1) % 20;
    const toneIdx = (kin - 1) % 13;
    return { seal: MAYA_SEALS[sealIdx].zh, tone: MAYA_TONES[toneIdx].zh, kin };
  }
  
  return { 
    yearInfo: kinToName(ad.yearKin), 
    personalInfo: kinToName(ad.personalKin), 
    galacticYear: ad.galacticYear,
    natalSeal: ds?.seal
  };
}

// === 相位詳細描述 ===
// 行星組合描述表：[流年行星][本命行星][相位] = 描述
const ASPECT_DESCRIPTIONS = {
  '木星': {
    '太陽': {
      '合': '木星合太陽——今年你的自信和能見度被放大，像被聚光燈照到。適合大膽表現自我、爭取機會，外界對你特別友善。',
      '三合': '木星三合太陽——順風局。你做的事情容易被看見、被肯定，機會自然找上門。不用太用力，保持行動就好。',
      '四分': '木星四分太陽——想做太多、野心膨脹，要注意過度擴張。機會是有的，但別什麼都想抓。聚焦比發散重要。',
      '對沖': '木星對沖太陽——機會透過他人而來（合作、關係），但可能感覺被推著走。學會在擴張中保持自己的節奏。',
    },
    '月亮': {
      '合': '木星合月亮——情緒和內在感受被放大，整體安全感提升。家庭/居住可能有好的變動。今年情感面特別豐盛。',
      '三合': '木星三合月亮——內心平靜且滿足，家庭和情感關係順遂。直覺力加強，跟著感覺走不容易出錯。',
      '四分': '木星四分月亮——情緒容易波動或放大。可能在安全感和冒險之間拉扯——想走出舒適圈但又捨不得。',
      '對沖': '木星對沖月亮——外在機會和內在需求有落差。別人給的「好機會」不一定是你真正想要的。聽聽心裡的聲音。',
    },
    '水星': {
      '合': '木星合水星——學習力和溝通力爆發的一年。適合進修、寫作、考證照、學新技能。腦子特別活躍。',
      '三合': '木星三合水星——思路清晰、表達順暢，適合提案、談判、教學。說什麼別人都願意聽。',
      '四分': '木星四分水星——想法太多、計畫太雜。容易嘴比腦快、承諾太多做不完。需要刻意收斂聚焦。',
      '對沖': '木星對沖水星——接收到大量外來資訊和觀點，需要消化。別人的意見可以參考但不必全盤接受。',
    },
    '金星': {
      '合': '木星合金星——這是最幸運的相位之一。感情、財運、人緣都在高點。適合投資、社交、享受生活。',
      '三合': '木星三合金星——人際和財運順遂。關係中有甜蜜感，花錢也容易花在值得的地方。享受但別揮霍。',
      '四分': '木星四分金星——花錢慾望膨脹、關係中容易過度理想化。快樂是真的，但別讓快樂沖昏頭。',
      '對沖': '木星對沖金星——關係中可能有「太好了反而不真實」的感覺。他人帶來的享樂要適度，別迷失。',
    },
    '火星': {
      '合': '木星合火星——行動力和企圖心爆發！今年做什麼都特別有衝勁，適合啟動新計畫、運動、競爭。',
      '三合': '木星三合火星——行動力得到好運加持。做事效率高、勇氣足，出手容易成功。今年很適合主動出擊。',
      '四分': '木星四分火星——衝動和過度自信是風險。有勇氣是好事，但別魯莽。做大決定前先冷靜 24 小時。',
      '對沖': '木星對沖火星——別人激起你的戰鬥欲，容易在競爭中被激怒。把能量導向正面的目標而非對抗。',
    },
    '木星': {
      '合': '木星回歸（約每 12 年一次）——人生新章節開啟！你的人生方向被「重新設定」，新的 12 年週期開始。意義重大的一年。',
      '三合': '木星三合本命木星——擴展順利，信念和機會對齊。你相信的方向，宇宙也在支持。',
      '四分': '木星四分本命木星——成長痛。想擴張但遇到阻礙，需要調整方向或策略。不是不能成功，是方法要修正。',
      '對沖': '木星對沖本命木星（約每 6 年一次）——半週期檢視點。回頭看看 6 年前設定的目標，走到哪了？需要調整嗎？',
    },
    '土星': {
      '合': '木星合本命土星——努力終於有回報的時候。過去打下的基礎開始結果，責任和機會同時來。踏實前進。',
      '三合': '木星三合本命土星——紀律和擴張完美結合。今年做長期投資、建構制度特別有效。穩中求進。',
      '四分': '木星四分本命土星——樂觀 vs 現實的拉扯。想法很美好但執行遇到限制。需要耐心和務實的計畫。',
      '對沖': '木星對沖本命土星——機會和責任互相拉扯。想擴張但又擔心風險。找到平衡點：不冒進也不畏縮。',
    },
    '天王星': {
      '合': '木星合本命天王星——人生出現突破性的轉機！可能是意料之外的機會、科技相關的突破、或價值觀的大翻轉。',
      '三合': '木星三合本命天王星——創新和好運結合。非傳統的做法今年特別順利，適合嘗試新科技、新模式。',
      '四分': '木星四分本命天王星——躁動不安想改變，但方向還不明確。別急著亂跳，等「對的怪機會」出現再動。',
      '對沖': '木星對沖本命天王星——外在環境推你改變。可能有意外事件打破現狀，被迫適應但結果不一定壞。',
    },
    '海王星': {
      '合': '木星合本命海王星——靈性和直覺被放大。適合藝術創作、冥想、心靈探索。但也要注意不切實際的幻想。',
      '三合': '木星三合本命海王星——想像力和慈悲心增強。適合做有意義的事、幫助他人、從事創意工作。',
      '四分': '木星四分本命海王星——容易被美好的幻象迷惑。投資、關係、承諾都要看清楚再決定，別被畫大餅。',
      '對沖': '木星對沖本命海王星——理想 vs 現實的差距感。可能對某些事情失望，但這是看清真相的好機會。',
    },
    '冥王星': {
      '合': '木星合本命冥王星——力量感爆發。可能在權力、金錢、或深層轉化上有重大突破。野心被啟動。',
      '三合': '木星三合本命冥王星——深層的轉變順利進行。適合面對內心恐懼、處理權力議題，結果會比預期好。',
      '四分': '木星四分本命冥王星——擴張慾望 vs 控制慾的碰撞。想要更多，但「怎麼拿到」的方式需要注意。權力遊戲中保持正直。',
      '對沖': '木星對沖本命冥王星——他人的力量/資源 vs 你的慾望。可能在共享資源、投資、或深度關係上有拉扯。面對它而非逃避。',
    },
  },
  '土星': {
    '太陽': {
      '合': '土星合太陽（約每 29 年一次）——人生重大考驗期。你會被要求「證明你是誰」。壓力大但這是淬煉真金的時候。',
      '三合': '土星三合太陽——努力被看見、紀律帶來回報。今年穩穩做就會有成果，不需要花招。',
      '四分': '土星四分太陽——感覺被卡住、限制重重。這是在考驗你的決心。撐過去的人會升級，放棄的人原地踏步。',
      '對沖': '土星對沖太陽（約每 14 年一次）——外在環境施壓，逼你面對現實。責任加重，但也是成熟的契機。',
    },
    '月亮': {
      '合': '土星合月亮——情緒壓抑期。可能覺得孤獨、被忽略、或要獨自面對某些事情。學會自我支撐是今年的功課。',
      '三合': '土星三合月亮——情緒穩定有紀律。適合建立好的生活習慣、處理家庭事務。內心踏實。',
      '四分': '土星四分月亮——安全感被挑戰。可能在家庭、居住、情感上感到不安。面對它，建立新的安全基礎。',
      '對沖': '土星對沖月亮——情感需求 vs 現實責任的拉扯。可能覺得沒時間照顧自己的感受。記得：你的需求也重要。',
    },
    '水星': {
      '合': '土星合水星——思考變得沉重但深刻。適合做嚴肅的研究、規劃長期計畫。溝通可能變慢但更有份量。',
      '三合': '土星三合水星——邏輯清晰、思路嚴謹。適合處理合約、做重要決策、學習需要耐心的知識。',
      '四分': '土星四分水星——思考卡卡、表達受阻。可能覺得學什麼都慢、說什麼都沒人聽。耐心是唯一解法。',
      '對沖': '土星對沖水星——外界逼你的思考更嚴謹。可能被要求交報告、做評估、承擔溝通責任。少說廢話多做實事的一年。',
    },
    '金星': {
      '合': '土星合金星——感情和財務都進入「現實檢驗期」。關係中浮現真正的問題，但面對它才能進入下一階段。',
      '三合': '土星三合金星——關係穩定成熟、理財有紀律。適合做長期承諾（結婚、簽約、長期投資）。',
      '四分': '土星四分金星——感情或財務上的壓力。可能覺得付出沒回報、或花錢花得不開心。重新檢視價值觀。',
      '對沖': '土星對沖金星——關係中的責任和義務感加重。可能覺得愛變成了負擔。分辨「真正的愛」和「習慣的義務」。',
    },
    '火星': {
      '合': '土星合火星——行動力被壓制，做什麼都覺得阻力大。但這是學會「精準施力」的時候，不要蠻幹。',
      '三合': '土星三合火星——紀律配合行動力，效率最高的組合。適合執行需要耐心的長期計畫。穩紮穩打。',
      '四分': '土星四分火星——想衝又被擋，挫折感強烈。容易暴躁或身體受傷。學會忍耐，這不是衝的時候。',
      '對沖': '土星對沖火星——外在限制 vs 內在衝動的拉鋸。可能跟權威人物衝突。管好脾氣，用智慧而非蠻力。',
    },
    '木星': {
      '合': '土星合本命木星——擴張計畫被現實檢驗。那些太樂觀的想法會被修正，留下真正可行的。',
      '三合': '土星三合本命木星——穩健擴張。今年的成長是有根基的，不是泡沫。適合做有紀律的投資。',
      '四分': '土星四分本命木星——信念被質疑。你相信的東西今年會遇到挑戰。通過考驗的信念會更堅定。',
      '對沖': '土星對沖本命木星——保守 vs 冒險的拉扯。想擴張但怕失敗。找到中間路線：謹慎地向前。',
    },
    '土星': {
      '合': '土星回歸（約每 29 年一次）——人生最重要的里程碑之一。第一次約 29 歲（真正的「成年」），第二次約 58 歲。你會被迫面對「我到底是誰、想要什麼人生」。',
      '三合': '土星三合本命土星——目前人生節奏順暢。過去的努力在穩定回收中。享受這段「事情按計畫走」的時期。',
      '四分': '土星四分本命土星（約每 7 年一次）——人生結構性調整期。「七年之癢」不只是感情，是整體人生方向的重新校準。',
      '對沖': '土星對沖本命土星（約每 14-15 年一次）——半週期檢視。你正在被問：「過去 14 年打下的基礎夠不夠穩？」感覺責任加重、或對現狀產生質疑。這是認真盤點的時機。',
    },
    '天王星': {
      '合': '土星合本命天王星——穩定 vs 改變的終極拉鋸。你想維持現狀但有股力量在推你改變。接受「有控制的改變」。',
      '三合': '土星三合本命天王星——創新能在框架內落地。今年適合把天馬行空的想法變成具體的系統或制度。',
      '四分': '土星四分本命天王星——自由 vs 責任的衝突。想掙脫束縛但又放不下穩定。答案不是非此即彼，找第三條路。',
      '對沖': '土星對沖本命天王星——外在壓力逼你重新定義「自由」的意義。可能需要在獨立和配合之間找新平衡。',
    },
    '海王星': {
      '合': '土星合本命海王星——夢想遇到現實考驗。那些美好的想像需要落地執行。能撐過這關的夢想才是真的。',
      '三合': '土星三合本命海王星——靈感和紀律結合。適合把夢想化為具體計畫、把靈感轉為作品。',
      '四分': '土星四分本命海王星——理想破滅的可能。某些你一直相信的東西可能不是真的。痛但必要。',
      '對沖': '土星對沖本命海王星——現實 vs 幻想的最終清算。必須面對真相，即使真相不太美好。',
    },
    '冥王星': {
      '合': '土星合本命冥王星——深層結構性的轉變。可能涉及權力關係、財務結構、或人生根本模式的重組。',
      '三合': '土星三合本命冥王星——有紀律地進行深度轉化。適合面對心理陰影、處理權力議題、重建內在力量。',
      '四分': '土星四分本命冥王星——控制慾 vs 現實的碰撞。可能在權力結構中感到被壓制。面對恐懼才能超越它。',
      '對沖': '土星對沖本命冥王星——外在的權力結構施壓。可能遇到強勢的人或系統跟你對抗。保持正直，時間站在你這邊。',
    },
  },
  '天王星': {
    '太陽': {
      '合': '天王星合太陽——人生可能出現震盪式的轉折。你的自我認同被打破重組。擁抱改變，這是進化。',
      '三合': '天王星三合太陽——獨特的機會來敲門。今年適合做不尋常的選擇，走別人沒走過的路。',
      '四分': '天王星四分太陽——躁動想改變，但方向不明。衝動做的決定可能後悔。讓子彈飛一會兒。',
      '對沖': '天王星對沖太陽——他人或環境帶來意外衝擊。你無法控制外在，但可以選擇如何回應。彈性是關鍵。',
    },
    '月亮': {
      '合': '天王星合月亮——情感和生活模式可能突然改變。居住、家庭、情緒反應都可能跟以前不一樣了。',
      '三合': '天王星三合月亮——直覺特別靈敏，生活中出現新鮮有趣的變化。不抗拒就能享受這股新能量。',
      '四分': '天王星四分月亮——情緒不穩定，安全感被動搖。可能有突如其來的心情起伏。學會在變動中找到內在安定。',
      '對沖': '天王星對沖月亮——外在環境的突變衝擊你的安全感。家庭或私生活可能有意外事件。保持彈性。',
    },
    '水星': {
      '合': '天王星合水星——思維模式大翻新。可能突然對新領域產生興趣、或找到創新的溝通方式。',
      '三合': '天王星三合水星——靈感和洞察力爆發。適合學習新科技、探索非主流知識。腦中的奇想很值得一試。',
      '四分': '天王星四分水星——思緒混亂、注意力跳躍。好創意和壞主意同時出現，需要過濾。',
      '對沖': '天王星對沖水星——接收到顛覆性的資訊或觀點。某些你以為是事實的東西可能被推翻。',
    },
  },
  '海王星': {
    '太陽': {
      '合': '海王星合太陽——自我邊界模糊，可能感覺迷茫。但這也是靈性覺醒和慈悲心展開的時期。',
      '三合': '海王星三合太陽——直覺力和創造力增強。適合從事藝術、靈性、療癒相關的事。跟著感覺走。',
      '四分': '海王星四分太陽——容易被迷惑或自欺。看不清自己真正想要什麼。需要信任的人幫你照鏡子。',
      '對沖': '海王星對沖太陽——他人可能不是你想像的樣子。關係中的幻象被打破。痛但是必要的醒悟。',
    },
    '月亮': {
      '合': '海王星合月亮——情感極度敏感，同理心爆棚。但也容易被他人情緒影響。保護好自己的能量場。',
      '三合': '海王星三合月亮——情緒細膩且有靈性品質。直覺準確，夢境有意義。適合冥想和內在探索。',
      '四分': '海王星四分月亮——情緒混亂、容易焦慮或逃避。可能用酒精/追劇/幻想來麻痺自己。面對感受。',
      '對沖': '海王星對沖月亮——情感關係中可能有欺騙或誤解。注意分辨「真實的感受」和「投射的幻想」。',
    },
  },
  '冥王星': {
    '太陽': {
      '合': '冥王星合太陽——人生級的深度轉化。你會經歷「死亡與重生」——某個舊的自己必須死去，新版本才會誕生。',
      '三合': '冥王星三合太陽——深層力量被順利啟動。你能觸及自己內在的核心力量，做出有深度的改變。',
      '四分': '冥王星四分太陽——權力鬥爭或內在陰暗面浮現。你被迫面對自己不想看的部分。轉化的痛是成長的代價。',
      '對沖': '冥王星對沖太陽——他人的力量 vs 你的自主。可能遇到強勢的人或系統要控制你。守住自我，不屈服也不硬碰。',
    },
    '月亮': {
      '合': '冥王星合月亮——情緒深度被徹底翻攪。可能挖出很深的舊傷。療癒的過程痛但值得。',
      '三合': '冥王星三合月亮——情緒轉化順利進行。能面對內心深處的恐懼和渴望，從中獲得力量。',
      '四分': '冥王星四分月亮——情緒控制議題浮現。可能在親密關係中經歷權力拉扯。學會健康地表達需求。',
      '對沖': '冥王星對沖月亮——他人（尤其是家人/親密的人）引發你最深的情緒反應。面對依賴和控制的議題。',
    },
  },
};

/** 取得特定行星組合的相位描述 */
function getAspectDescription(transit, natal, type) {
  // 先嘗試精確匹配
  if (ASPECT_DESCRIPTIONS[transit]?.[natal]?.[type]) {
    return ASPECT_DESCRIPTIONS[transit][natal][type];
  }
  // fallback: 通用描述
  const generic = {
    '合': `流年${transit}的能量與你本命${natal}融合，強化了${natal}代表的生命領域。這股力量今年特別活躍。`,
    '三合': `流年${transit}順利支持你的本命${natal}——相關領域今年會感覺「事情在流動」，自然而然地推進。`,
    '四分': `流年${transit}和本命${natal}之間有張力。相關領域可能遇到挑戰，但這些摩擦會推動你成長和突破。`,
    '對沖': `流年${transit}從對面拉扯你的本命${natal}，帶來覺察。你可能透過他人或外在事件，看見自己在這個領域的盲點。`,
  };
  return generic[type] || `流年${transit}影響本命${natal}`;
}

// === 木星過境各宮描述 ===
function getJupiterHouseDesc(house) {
  const descs = {
    1: '木星照亮你的自我表達——今年你的存在感和自信心自然提升，適合重塑形象、展現新面貌。別人會覺得你整個人「發光」了。',
    2: '木星擴展你的財務領域——收入來源可能增加，適合投資理財、爭取加薪。對金錢的態度更樂觀，但也別揮霍無度。',
    3: '木星活化你的學習和溝通——今年腦子特別活、學什麼都快。適合寫作、上課、考試、短途旅行。跟兄弟姐妹/鄰居的關係也活絡。',
    4: '木星溫暖你的家庭和根基——今年可能搬家、裝修、家庭成員增加。內心安全感提升，跟家人的關係更親近。適合置產。',
    5: '木星點燃你的創造力和戀愛運——今年特別有玩心和浪漫感。適合創作、開始新戀情、或跟孩子的互動更歡樂。投資運也不錯但別賭博。',
    6: '木星改善你的工作和健康——今年工作上容易遇到好機會，工作環境改善。健康方面適合養成好習慣，但注意木星帶來的放縱（吃太多）。',
    7: '木星擴展你的合作和關係——今年適合結婚、合夥、建立重要的一對一關係。遇到的人質量好，合作容易成功。單身的人有桃花。',
    8: '木星深入共享資源領域——今年可能有遺產、保險、投資分紅等「他人的錢」入袋。也適合處理貸款、稅務。深度轉化順利進行。',
    9: '木星擴展你的視野和信念——今年適合出國、進修、考證照、接觸新文化。你的世界觀會被打開，可能找到新的人生意義。',
    10: '木星照亮你的事業頂點——今年是職涯擴展的黃金期。升遷、跳槽、創業都有好時機。社會聲望提升，貴人在職場出現。',
    11: '木星活化你的社群和理想——今年社交圈擴大，加入新社群或團體帶來機會。朋友介紹的事情容易成功。適合實現長期夢想。',
    12: '木星照入你的潛意識和靈性——今年適合靜修、冥想、心理治療、獨處充電。表面上看不到什麼大進展，但內在正在進行深層修復和準備。',
  };
  return descs[house] || '木星帶來擴展和機會。留意這個領域的新可能性。';
}

// === 土星過境各宮描述 ===
function getSaturnHouseDesc(house) {
  const descs = {
    1: '土星考驗你的自我定位——今年會被迫問「我到底是誰？」。可能覺得沉重或被限制，但這是重新定義自己的機會。外在形象變得更成熟。',
    2: '土星收緊你的財務——今年花錢需要更有紀律，可能感覺收入增長慢。但這是建立穩固財務基礎的時候。學會分辨「需要」和「想要」。',
    3: '土星考驗你的溝通和學習——今年可能覺得表達困難、學東西慢。但你正在學的東西會特別扎實。跟兄弟姐妹的關係可能需要重新定義。',
    4: '土星壓在你的家庭和根基——今年家庭可能有責任要扛（照顧長輩、房屋問題）。感覺很重，但你正在為自己建立真正穩固的「家」。',
    5: '土星限制你的玩樂和創造——今年可能覺得沒時間玩、創意被壓抑、或戀愛面臨現實考驗。但能通過這一關的作品和感情，都是認真的。',
    6: '土星考驗你的工作和健康——今年工作壓力大、可能要處理不喜歡的瑣事。健康上可能有慢性問題浮現。重點是建立可持續的工作和養生模式。',
    7: '土星考驗你的關係——今年一對一的關係（伴侶、合夥人）面臨現實考驗。不穩固的關係可能結束，但撐過去的會變得更強韌。適合認真承諾。',
    8: '土星深挖共享資源——今年在財務共享（貸款、投資、稅務）上有壓力。也可能被迫面對內心深處的恐懼或控制議題。痛但能帶來真正的蛻變。',
    9: '土星考驗你的信念——今年你一直相信的東西會被現實檢驗。出國或進修可能遇到阻礙。但通過考驗的信念會成為你真正的人生指南針。',
    10: '土星壓在你的事業頂點——今年工作責任加倍、被要求承擔更多。可能覺得升遷慢或不被認可。但你正在打的地基，是未來 10 年事業的根本。',
    11: '土星考驗你的社群和理想——今年可能感覺朋友圈縮小、或對自己的長期目標產生懷疑。留下來的朋友和目標，才是真正值得投入的。',
    12: '土星壓入潛意識——今年可能感覺莫名疲憊、孤獨、或有隱藏的焦慮。這是清理過去業債的時期。面對你一直逃避的東西，土星會在這裡待到你學會為止。',
  };
  return descs[house] || '土星帶來紀律和考驗。在這個領域你會被要求更認真、更負責。';
}

// === 紫微四化落宮描述 ===
function getSihuaPalaceDesc(key, pos) {
  const descs = {
    lu: {
      0: '化祿落命宮——今年整個人的狀態被加持，做什麼都比較順。氣場好、人緣好，是你的好年頭。',
      1: '化祿落兄弟宮——今年跟兄弟姐妹/同事的關係特別好，互助機會多。',
      2: '化祿落夫妻宮——今年感情運加持。有伴的更甜蜜，單身的有機會遇到對的人。合作關係也順利。',
      3: '化祿落子女宮——今年跟孩子的互動愉快，或在創作/投資上有好的產出。桃花也算子女宮的範圍。',
      4: '化祿落財帛宮——今年財運被宇宙加持！進財管道暢通，適合積極理財和爭取收入。',
      5: '化祿落疾厄宮——今年身體狀態不錯，元氣充沛。適合養生、運動、調養。',
      6: '化祿落遷移宮——今年出外運好，出差旅行順利，外在環境對你友善。適合拓展外部機會。',
      7: '化祿落交友宮——今年社交運旺，新朋友帶來好的機會和資源。人脈就是你的財脈。',
      8: '化祿落事業宮——今年職場運佳，做事順手，主管/客戶賞識。適合衝刺業績或爭取升遷。',
      9: '化祿落田宅宮——今年居住環境有好的變化，可能買房、搬家、裝修。家庭財產面穩定增長。',
      10: '化祿落福德宮——今年心情好、想得開、精神享受豐富。內心滿足感高，是快樂的一年。',
      11: '化祿落父母宮——今年跟長輩/主管的關係好，容易得到他們的幫助和照顧。學業運也不錯。',
    },
    quan: {
      0: '化權落命宮——今年你的主導力加強，氣場變強勢。做事有主見、不容易被動搖。小心別太強勢讓人不舒服。',
      1: '化權落兄弟宮——今年在同儕中有話語權，可能要帶領團隊或在合作中主導方向。',
      2: '化權落夫妻宮——今年在感情/合作關係中掌控感增強。你比較想主導，但也要注意對方的感受。',
      3: '化權落子女宮——今年在創作/投資上很有主見和執行力。跟孩子的互動中你比較強勢。',
      4: '化權落財帛宮——今年對錢有掌控感，賺錢的慾望和能力都增強。適合主動出擊搶業績。',
      5: '化權落疾厄宮——今年身體的掌控感增強，適合高強度運動或鍛鍊紀律。但也注意別過度操勞。',
      6: '化權落遷移宮——今年在外面的世界很有存在感，外出辦事有氣勢。適合開拓外部市場。',
      7: '化權落交友宮——今年在社群/團體中有領導地位。朋友圈中你是比較能做主的那個。',
      8: '化權落事業宮——今年職場上的掌控感和企圖心最強。適合爭取升遷、主導專案、展現領導力。',
      9: '化權落田宅宮——今年在居住/家產方面有主導權。可能自己做裝修決定或主導家庭財務。',
      10: '化權落福德宮——今年對自己的生活方式很有主見。精神世界強勢，不容易被外界影響心情。',
      11: '化權落父母宮——今年跟長輩可能有權力互動。在學習或工作上有「我說了算」的氣勢。',
    },
    ke: {
      0: '化科落命宮——今年你的名聲和形象加分，容易被注意和欣賞。有貴人緣，適合經營個人品牌。',
      1: '化科落兄弟宮——今年兄弟姐妹/同儕中有貴人相助，合作上容易有好的口碑。',
      2: '化科落夫妻宮——今年感情帶有「文雅」的品質，關係中互相欣賞。適合一起學習、成長。',
      3: '化科落子女宮——今年在創作上有好名聲，作品被肯定。跟孩子的互動有教育意義。',
      4: '化科落財帛宮——今年理財比較理性、有方法。雖然不是暴富，但進財管道正當且穩定。',
      5: '化科落疾厄宮——今年身體如果有狀況，容易遇到好醫生或好的治療方式。健康上有貴人。',
      6: '化科落遷移宮——今年出外容易有好的機會或遇到貴人。外在環境給你加分。',
      7: '化科落交友宮——今年社交圈中有高品質的朋友或合作對象。人脈帶來名聲。',
      8: '化科落事業宮——今年職場上有好名聲，考試順利，學歷/證照上有進展。適合走專業路線。',
      9: '化科落田宅宮——今年居住環境有品質感的提升。家庭氛圍和諧、書卷氣。',
      10: '化科落福德宮——今年精神世界豐富，適合學習、閱讀、修身養性。內心有雅致的品味。',
      11: '化科落父母宮——今年跟長輩/主管的關係好，得到他們的提拔和指導。學業運佳。',
    },
    ji: {
      0: '化忌落命宮——今年整個人容易糾結、焦慮，想太多。外在可能遇到小阻礙。放輕鬆，別跟自己過不去。',
      1: '化忌落兄弟宮——今年跟兄弟姐妹/同事之間容易有摩擦或溝通不順。耐心處理，別較真。',
      2: '化忌落夫妻宮——今年感情上容易糾結或有壓力。溝通可能有誤解。雙方都需要更多耐心。',
      3: '化忌落子女宮——今年在創作/投資上可能卡關，或跟孩子的互動需要更多耐心。別過度擔心。',
      4: '化忌落財帛宮——今年花錢的地方多、或進財不如預期。需要更嚴格的財務紀律。不是沒有錢，是管理要更用心。',
      5: '化忌落疾厄宮——今年身體可能有小毛病需要注意。定期檢查、養成好習慣。心理壓力也要找出口。',
      6: '化忌落遷移宮——今年出外運差一些，出差旅行容易有小狀況。外在機會可能需要更多努力才能抓住。',
      7: '化忌落交友宮——今年社交上可能遇到不順心的事，或被朋友的事情牽連。選擇朋友要更慎重。',
      8: '化忌落事業宮——今年工作壓力大、容易覺得付出跟回報不成比例。不是做不好，是這個領域今年要比較費力。',
      9: '化忌落田宅宮——今年居住或家庭可能有煩心事（修繕、搬家、家人健康）。耐心處理，不會是大問題。',
      10: '化忌落福德宮——今年容易想太多、精神壓力大、睡不好。需要刻意放鬆和找到紓壓管道。',
      11: '化忌落父母宮——今年跟長輩/主管之間容易有摩擦或壓力。學業上也可能比較吃力。保持耐心和尊重。',
    },
  };
  return descs[key]?.[pos] || '';
}

// === 渲染 ===
const PALACE_NAMES = ['命宮','兄弟','夫妻','子女','財帛','疾厄','遷移','交友','事業','田宅','福德','父母'];
const HOUSE_TOPICS = ['','自我/外表','金錢/資源','溝通/學習','家庭/根基','創造/戀愛','工作/健康','關係/合作','深層/共享','信念/遠方','事業/名聲','社群/理想','靈性/幕後'];

function renderTransit(year, bazi, hd, astro, ziwei, maya) {
  const currentYear = new Date().getFullYear();
  let html = `<div class="sig"><div class="kin">流年分析</div><div class="big">${year} 年度能量</div><div style="font-size:.85rem;color:var(--muted);margin-top:8px;">五大系統看你的運勢主題</div></div>`;
  // 年份切換按鈕
  html += `<div style="display:flex;gap:8px;justify-content:center;margin:12px 0 4px;">`;
  for (let y = currentYear - 1; y <= currentYear + 2; y++) {
    const isActive = y === year;
    html += `<button class="transit-year-btn${isActive ? ' active' : ''}" data-year="${y}" style="padding:6px 14px;border-radius:16px;border:1px solid ${isActive ? 'var(--accent)' : 'rgba(255,255,255,.12)'};background:${isActive ? 'var(--accent)' : 'transparent'};color:${isActive ? '#000' : 'var(--text)'};font-size:.82rem;cursor:pointer;font-weight:${isActive ? '700' : '400'};transition:all .2s;">${y}${y === currentYear ? '（今年）' : ''}</button>`;
  }
  html += `</div>`;

  // 八字流年
  if (bazi) {
    html += `<div class="divider"></div><h3>🀄 八字流年</h3>`;
    html += `<div style="display:flex;gap:12px;align-items:center;margin:8px 0;">`;
    html += `<div style="text-align:center;padding:8px 16px;background:rgba(123,108,246,.1);border-radius:8px;"><div style="font-size:1.2rem;font-weight:700;">${bazi.stem}${bazi.branch}</div><div style="font-size:.75rem;color:var(--muted);">${bazi.yearElem}年</div></div>`;
    html += `<div><div style="font-size:.9rem;font-weight:600;color:var(--accent);">流年十神：${bazi.god}</div>`;
    html += `<div style="font-size:.8rem;color:var(--muted);">${bazi.relation}</div>`;
    if (bazi.dayunInfo) html += `<div style="font-size:.78rem;color:var(--muted);margin-top:2px;">目前${bazi.dayunInfo}</div>`;
    html += `</div></div>`;
    html += `<div class="meaning" style="line-height:1.9;">${bazi.godDesc}</div>`;
  }

  // 占星流年
  if (astro) {
    html += `<div class="divider"></div><h3>🪐 占星流年（行星過境）</h3>`;
    html += `<div style="font-size:.82rem;color:var(--muted);margin-bottom:8px;">慢行星今年的位置 vs 你的本命盤</div>`;
    // 木星（幸運）
    html += `<div class="script-gift"><b>♃ 木星過境 ${astro.jupHouse} 宮</b>（${HOUSE_TOPICS[astro.jupHouse]||''}）<br>${getJupiterHouseDesc(astro.jupHouse)}</div>`;
    // 土星（功課）
    html += `<div class="script-gift"><b>♄ 土星過境 ${astro.satHouse} 宮</b>（${HOUSE_TOPICS[astro.satHouse]||''}）<br>${getSaturnHouseDesc(astro.satHouse)}</div>`;
    // 重要相位
    if (astro.aspects.length > 0) {
      html += `<div style="margin-top:10px;font-size:.82rem;"><b>今年重要相位：</b></div>`;
      for (const a of astro.aspects.slice(0, 8)) {
        const emoji = a.type === '合' ? '☌' : a.type === '對沖' ? '☍' : a.type === '三合' ? '△' : '□';
        const aspDesc = getAspectDescription(a.transit, a.natal, a.type);
        html += `<div style="font-size:.85rem;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);color:var(--text);">`;
        html += `${emoji} <b>流年${a.transit} ${a.type} 本命${a.natal}</b>`;
        html += `<div style="font-size:.8rem;color:var(--muted);margin-top:2px;line-height:1.6;">${aspDesc}</div>`;
        html += `</div>`;
      }
    }
  }

  // 人類圖流年
  if (hd) {
    html += `<div class="divider"></div><h3>△ 人類圖流年（行星通道）</h3>`;
    html += `<div style="font-size:.82rem;color:var(--muted);margin-bottom:8px;">慢行星今年停留的閘門——這些能量整年都在背景運作</div>`;
    if (hd.transitGates.length > 0) {
      for (const tg of hd.transitGates) {
        const gInfo = GATES[tg.gate] || {};
        html += `<div style="font-size:.82rem;padding:3px 0;">${tg.planet} → 閘門 <b>${tg.gate}</b>「${gInfo.keyword||''}」</div>`;
      }
    }
    if (hd.tempChannels.length > 0) {
      html += `<div style="margin-top:10px;padding:12px;background:rgba(245,197,66,.08);border-radius:8px;"><div style="font-weight:700;color:#f5c542;margin-bottom:6px;">⚡ 今年臨時啟動的通道</div>`;
      html += `<div style="font-size:.82rem;color:var(--muted);margin-bottom:8px;">流年行星補上你本命的另一端 = 今年會額外感受到的能量（平常沒有，今年暫時打開）</div>`;
      const chDescMap = {
        '抽象思維': '思緒特別多，腦中不斷浮現畫面和記憶。從這些混亂的思緒中找到意義是今年的主題。適合寫日記、回顧過去。',
        '覺察': '內在洞察力加強——會有「啊哈！」的頓悟時刻。適合冥想、靈性探索。答案會突然從內在冒出來。',
        '邏輯': '邏輯思考力增強，會自然想要找出「公式」和「規律」。適合研究、分析、建立系統。',
        '接受': '表達變得更有組織性。適合教學、寫作、做簡報。你說的話今年特別有說服力和條理。',
        '架構': '獨特的洞見想被說出來。今年你腦中會冒出很多「我知道了！」的東西，關鍵是找到被聽見的時機。',
        '好奇心': '會更想分享想法、學新東西、到處問為什麼。適合旅行、上課、跟不同領域的人聊天。',
        '創始者': '領導能量被啟動——別人會自然想跟隨你的方向。適合提出新計畫、帶領團隊。',
        '啟發': '你做的事會啟發別人。有「創意角色典範」的能量——活出你的獨特性，本身就是對世界的貢獻。',
        '浪子': '適合回顧和分享人生經驗。你的故事有價值，說出來能幫助別人。適合寫作、口述歷史、分享智慧。',
        '覺醒': '活在當下的能力增強。不需要計畫太多，專注眼前的事就好。存在本身就有力量。',
        '金錢線': '跟「掌握資源」有關——控制感加強，可能在金錢或權力上有變化。適合做生意、管理財務。',
        '開放': '社交表達力打開——適合公開場合說話、表演、分享情感。你的情緒表達今年特別能觸動人。',
        '無常': '體驗慾望強——想到什麼就想去做，渴望多樣化。適合嘗試新事物，但不需要每個都堅持到底。',
        '魅力': '行動力和存在感爆發，別人更容易注意到你。做事效率很高，即知即行的能量很強。',
        '腦波': '直覺和表達連結加強——腦中一閃的念頭更值得信任。適合靠直覺做決定，然後馬上行動。',
        '才華': '深度技能被啟動。今年適合精進某個專業領域，把深度的能力轉化為可被看見的表達。',
        '發現': '對人生方向有新的決心。今年適合投入一個需要承諾的事情——一旦決定了就會有驚人的持續力。',
        '探索': '適合嘗試新行為、新身份——做以前不會做的事。你的行動會引導你找到「我到底是誰」的答案。',
        '韻律': '生活節奏和固定模式的能量。今年適合建立好的日常習慣和規律，找到屬於你的自然韻律。',
        '脈動': '方向感和資源整合的能量。今年你會更清楚自己要往哪裡去，而且手邊會有資源支持你。',
        '發起': '震撼和創新的能量。可能會經歷一些「被嚇到」的事件，但那些衝擊會打開全新的可能性。',
        '投降': '商業直覺增強。適合做交易、談判、找到互利的合作模式。信任你的嗅覺。',
        '社群': '社群和團體互動增加——注意你在群體中的角色。付出和回報的平衡是今年的主題。',
        '保存': '照顧和保護的能量。今年可能會更想照顧他人或某個「值得守護的東西」。負責任的愛。',
        '力量原型': '直覺配合行動力，「感覺對就做」的效率極高。身體的智慧今年特別可靠。',
        '親密': '情感連結加深的能量。關係中的親密度增加，也可能帶來新的情感開始或深化。',
        '突變': '能量有開關的感覺——有時候全力爆發，有時候完全靜止。接受這個節奏，不要在「關」的時候逼自己。',
        '成熟': '完成循環的能量。今年適合把手上未完成的事情做一個收尾，體驗從開始到結束的完整過程。',
        '專注': '專注力增強，適合投入需要耐心和持續力的事情。靜下來做一件事的能力是今年的禮物。',
        '掙扎': '為有意義的事情奮鬥的能量。今年可能會遇到挑戰，但那些掙扎會讓你確認什麼是真正值得為之而活的。',
        '批判': '對完美的追求增強——看到什麼都想改得更好。這股能量適合用在改善系統和流程，別用在批判自己。',
        '蛻變': '轉型的能量——舊的結束、新的開始。適合為更好的未來做準備，放手不再服務你的東西。',
        '綜合': '對原則和需求特別敏感。今年你會更清楚什麼是你可以接受的、什麼不行。革命性的能量。',
        '情緒': '情緒波動加強——多愁善感但也更能感受美好。讓情緒流動，不要壓抑。創作力跟情緒深度成正比。',
        '辨認': '夢想和渴望被啟動。今年會有「我想要體驗那個」的強烈感覺。讓渴望引導你，但不要急著實現。',
      };
      for (const tc of hd.tempChannels) {
        const desc = chDescMap[tc.channel.name] || `「${tc.channel.keyword||tc.channel.name}」的能量今年暫時開通`;
        html += `<div style="font-size:.85rem;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);"><b>${tc.planet}</b> 開通 ${tc.channel.gates[0]}-${tc.channel.gates[1]}「${tc.channel.name}」<br><span style="font-size:.8rem;color:var(--muted);">${desc}</span></div>`;
      }
      html += `</div>`;
    } else {
      html += `<div style="font-size:.82rem;color:var(--muted);margin-top:8px;">今年沒有慢行星為你臨時開通新通道。能量穩定運行，照著你本命的設計走就好。</div>`;
    }
  }

  // 紫微流年
  if (ziwei) {
    html += `<div class="divider"></div><h3>🌟 紫微流年</h3>`;
    html += `<div style="font-size:.82rem;color:var(--muted);margin-bottom:8px;">流年四化 = 今年的能量分配，化祿是順風、化忌是功課</div>`;
    html += `<div style="display:flex;gap:12px;align-items:center;margin:8px 0;">`;
    html += `<div style="text-align:center;padding:8px 16px;background:rgba(123,108,246,.1);border-radius:8px;"><div style="font-size:1rem;font-weight:700;">${ziwei.yearStem}${ziwei.yearBranch}年</div></div>`;
    html += `<div style="font-size:.85rem;">化祿<b>${ziwei.sihua.lu}</b>、化權<b>${ziwei.sihua.quan}</b>、化科<b>${ziwei.sihua.ke}</b>、化忌<b>${ziwei.sihua.ji}</b></div>`;
    html += `</div>`;
    // 四化落宮 + 白話解說
    const huaIcon = { lu:'🟢', quan:'🔵', ke:'🟡', ji:'🔴' };
    const huaLabel = { lu:'祿', quan:'權', ke:'科', ji:'忌' };
    for (const key of ['lu','quan','ke','ji']) {
      const p = ziwei.sihuaPalaces[key];
      if (p) {
        const palaceName = PALACE_NAMES[p.pos] || `${p.pos}宮`;
        const desc = getSihuaPalaceDesc(key, p.pos);
        html += `<div style="font-size:.85rem;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);">${huaIcon[key]} <b>${ziwei.sihua[key]}</b>化${huaLabel[key]} → <b>${palaceName}</b><br><span style="font-size:.8rem;color:var(--muted);line-height:1.6;">${desc}</span></div>`;
      }
    }
  }

  // 馬雅流年
  if (maya) {
    html += `<div class="divider"></div><h3>🌀 馬雅年度能量</h3>`;
    if (maya.yearInfo) {
      const yi = maya.yearInfo;
      const pi = maya.personalInfo;
      // 動態查詢印記與調性的解說
      const yiSealData = MAYA_SEALS.find(s => s.zh === yi.seal);
      const yiToneData = MAYA_TONES.find(t => t.zh === yi.tone);
      html += `<div style="margin:8px 0;">`;
      html += `<div style="font-size:.9rem;font-weight:600;">當前馬雅年（${maya.galacticYear || ''}）= <span style="color:var(--accent);">${yi.tone}的${yi.seal}</span>（KIN ${yi.kin}）</div>`;
      html += `<div style="font-size:.82rem;color:var(--muted);margin-top:6px;">集體共享的年度能量主題：今年整個世界都在「${yi.seal}」的頻率中運作。</div>`;
      if (yiSealData) {
        html += `<div style="font-size:.82rem;margin-top:6px;line-height:1.5;"><b>「${yi.seal}」的頻率</b>：${yiSealData.text.split("。")[0]}。</div>`;
      }
      if (pi) {
        const piSealData = MAYA_SEALS.find(s => s.zh === pi.seal);
        const piToneData = MAYA_TONES.find(t => t.zh === pi.tone);
        html += `<div style="margin-top:10px;font-size:.9rem;font-weight:600;">你今年生日的 KIN = <span style="color:var(--accent);">${pi.tone}的${pi.seal}</span>（KIN ${pi.kin}）</div>`;
        html += `<div style="font-size:.82rem;color:var(--muted);margin-top:4px;">你這一年的個人能量色彩：${pi.seal}的品質 + ${pi.tone}的行動方式。</div>`;
        if (piSealData) {
          html += `<div style="font-size:.82rem;margin-top:4px;line-height:1.5;"><b>「${pi.seal}」的品質</b>（關鍵字：${piSealData.glyph}）：${piSealData.text.split("。")[0]}。</div>`;
        }
        if (piToneData) {
          html += `<div style="font-size:.82rem;margin-top:4px;line-height:1.5;"><b>「${pi.tone}」的行動方式</b>（關鍵字：${piToneData.kw}）：${piToneData.text.split("。")[0]}。</div>`;
        }
      }
      html += `</div>`;
    }
  }

  // === 流年綜合交叉比對 ===
  html += `<div class="divider"></div>`;
  html += renderTransitSynthesis(year, bazi, hd, astro, ziwei, maya);

  html += `<div class="note" style="margin-top:16px;">💡 流年是「暫時的天氣」，不是永久的改變。本命是你的硬體，流年是當年的軟體更新——它會影響你的體驗，但不會改變你是誰。</div>`;
  return html;
}

// === 流年綜合交叉比對 ===
const YEAR_THEMES = {
  money: { zh: '財運', icon: '💰' },
  career: { zh: '事業', icon: '📈' },
  growth: { zh: '成長', icon: '🌱' },
  pressure: { zh: '壓力', icon: '🏋️' },
  change: { zh: '變動', icon: '🔄' },
  relationship: { zh: '關係', icon: '💕' },
  creativity: { zh: '創造', icon: '🎨' },
  lucky: { zh: '幸運', icon: '🍀' },
  spiritual: { zh: '靈性', icon: '🔮' },
  health: { zh: '身心', icon: '🧘' },
};

function extractYearThemes(bazi, hd, astro, ziwei, maya) {
  const themes = [];
  
  // 八字
  if (bazi) {
    const godToTheme = {
      '正財': ['money','career'], '偏財': ['money','lucky'],
      '正官': ['career','pressure'], '七殺': ['pressure','change'],
      '食神': ['creativity','lucky'], '傷官': ['creativity','change'],
      '正印': ['growth','spiritual'], '偏印': ['spiritual','growth'],
      '比肩': ['relationship'], '劫財': ['money','change'],
    };
    if (godToTheme[bazi.god]) themes.push(...godToTheme[bazi.god].map(t => ({ theme: t, source: '八字' })));
  }
  
  // 占星
  if (astro) {
    const houseTheme = { 1:'health', 2:'money', 3:'growth', 4:'relationship', 5:'creativity', 6:'health', 7:'relationship', 8:'change', 9:'spiritual', 10:'career', 11:'relationship', 12:'spiritual' };
    if (houseTheme[astro.jupHouse]) themes.push({ theme: houseTheme[astro.jupHouse], source: '占星木星' }, { theme: 'lucky', source: '占星木星' });
    if (houseTheme[astro.satHouse]) themes.push({ theme: houseTheme[astro.satHouse], source: '占星土星' }, { theme: 'pressure', source: '占星土星' });
  }
  
  // 人類圖
  if (hd && hd.tempChannels.length > 0) {
    themes.push({ theme: 'change', source: '人類圖' });
    for (const tc of hd.tempChannels) {
      if (['金錢線','脈動','投降','蛻變'].includes(tc.channel.name)) themes.push({ theme: 'money', source: '人類圖' });
      if (['創始者','發起'].includes(tc.channel.name)) themes.push({ theme: 'career', source: '人類圖' });
      if (['啟發','無常','好奇心'].includes(tc.channel.name)) themes.push({ theme: 'creativity', source: '人類圖' });
    }
  }
  
  // 紫微
  if (ziwei) {
    const palaceTheme = { 0:'health', 1:'relationship', 2:'relationship', 3:'relationship', 4:'money', 5:'health', 6:'change', 7:'relationship', 8:'career', 9:'money', 10:'spiritual', 11:'relationship' };
    if (ziwei.sihuaPalaces.lu) themes.push({ theme: palaceTheme[ziwei.sihuaPalaces.lu.pos] || 'lucky', source: '紫微化祿' }, { theme: 'lucky', source: '紫微化祿' });
    if (ziwei.sihuaPalaces.ji) themes.push({ theme: palaceTheme[ziwei.sihuaPalaces.ji.pos] || 'pressure', source: '紫微化忌' }, { theme: 'pressure', source: '紫微化忌' });
    if (ziwei.sihuaPalaces.quan) themes.push({ theme: 'career', source: '紫微化權' });
  }
  
  // 馬雅
  if (maya && maya.natalSeal) {
    const sealTheme = { '紅龍':'relationship', '白風':'creativity', '藍夜':'money', '黃種子':'growth', '紅蛇':'change', '白世界橋':'change', '藍手':'creativity', '黃星':'creativity', '紅月':'spiritual', '白狗':'relationship', '藍猴':'creativity', '黃人':'growth', '紅天行者':'change', '白巫師':'spiritual', '藍鷹':'career', '黃戰士':'career', '紅地球':'health', '白鏡':'spiritual', '藍風暴':'change', '黃太陽':'lucky' };
    const seal = maya.personalInfo?.seal || maya.natalSeal?.zh;
    if (seal && sealTheme[seal]) themes.push({ theme: sealTheme[seal], source: '馬雅' });
  }
  
  return themes;
}

function renderTransitSynthesis(year, bazi, hd, astro, ziwei, maya) {
  const themes = extractYearThemes(bazi, hd, astro, ziwei, maya);
  
  // 統計
  const stats = {};
  for (const t of themes) {
    if (!stats[t.theme]) stats[t.theme] = { count: 0, sources: [] };
    stats[t.theme].count++;
    if (!stats[t.theme].sources.includes(t.source)) stats[t.theme].sources.push(t.source);
  }
  
  const sorted = Object.entries(stats)
    .map(([key, val]) => ({ key, ...YEAR_THEMES[key], systemCount: val.sources.length, sources: val.sources }))
    .filter(t => t.systemCount >= 2)
    .sort((a, b) => b.systemCount - a.systemCount);
  
  if (sorted.length === 0) return `<h3>🔮 流年綜合</h3><div class="meaning">各系統今年的訊號分散，沒有壓倒性的單一主題。保持開放、見機行事。</div>`;
  
  let html = `<h3>🔮 ${year} 流年綜合：多系統共振</h3>`;
  html += `<div style="font-size:.78rem;color:var(--muted);margin-bottom:10px;">當多個系統同時指向同一個方向——那就是今年的重點</div>`;
  
  // 今年一句話
  const top3 = sorted.slice(0, 3).map(t => t.zh);
  html += `<div style="padding:12px;background:rgba(245,197,66,.08);border-radius:8px;margin-bottom:12px;font-size:.95rem;font-weight:600;line-height:1.8;">`;
  html += `⚡ 今年的關鍵字：${top3.join('、')}`;
  html += `</div>`;
  
  // 各主題
  for (const t of sorted.slice(0, 4)) {
    const barW = Math.min(t.systemCount * 25, 100);
    html += `<div style="display:flex;align-items:center;gap:8px;margin:6px 0;">`;
    html += `<span style="width:70px;font-size:.82rem;white-space:nowrap;">${t.icon} ${t.zh}</span>`;
    html += `<div style="flex:1;height:16px;background:rgba(255,255,255,.05);border-radius:8px;overflow:hidden;">`;
    html += `<div style="width:${barW}%;height:100%;background:linear-gradient(90deg,var(--accent),#f5c542);border-radius:8px;display:flex;align-items:center;padding-left:6px;">`;
    html += `<span style="font-size:.68rem;color:#000;font-weight:700;">${t.systemCount}系統</span>`;
    html += `</div></div>`;
    html += `<span style="font-size:.7rem;color:var(--muted);">${t.sources.join('/')}</span>`;
    html += `</div>`;
  }
  
  // 建議（結合具體數據）
  html += `<div style="margin-top:14px;padding:14px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.88rem;line-height:2;">`;
  html += `<b>💡 ${year} 年操作建議：</b><br>`;
  html += generateSpecificAdvice(bazi, hd, astro, ziwei, sorted);
  html += `</div>`;
  
  return html;
}

function generateSpecificAdvice(bazi, hd, astro, ziwei, sorted) {
  let adv = '';
  
  // 財運具體建議
  if (sorted.some(t => t.key === 'money')) {
    let moneyDetails = [];
    if (bazi && ['正財','偏財'].includes(bazi.god)) {
      moneyDetails.push(bazi.god === '偏財' ? '八字走偏財——意外收入、投資、業績爆發型的財' : '八字走正財——穩定加薪、經營累積型的財');
    }
    if (hd?.tempChannels?.some(tc => ['金錢線','脈動','投降','蛻變'].includes(tc.channel.name))) {
      const mCh = hd.tempChannels.find(tc => ['金錢線','脈動','投降','蛻變'].includes(tc.channel.name));
      moneyDetails.push(`人類圖${mCh.planet}開通「${mCh.channel.name}」——${mCh.channel.name === '金錢線' ? '掌控資源的能量被啟動' : '財富轉化的能量在運作'}`);
    }
    if (astro && astro.jupHouse === 2) moneyDetails.push('木星過境 2 宮（財帛）——擴展收入的機會之窗');
    if (ziwei?.sihuaPalaces?.lu?.pos === 4) moneyDetails.push('紫微化祿落財帛宮——今年財運被宇宙加持');
    if (moneyDetails.length > 0) {
      adv += `<div style="margin-bottom:10px;">💰 <b>財運：</b>${moneyDetails.join('；')}。<br><span style="color:var(--muted);font-size:.82rem;">→ 結論：今年跟錢有關不是你想太多，是真的有訊號。${bazi?.god === '偏財' ? '適合把握意外機會，但不要梭哈。' : '穩紮穩打就好，急不來。'}</span></div>`;
    }
  }
  
  // 事業具體建議
  if (sorted.some(t => t.key === 'career')) {
    let careerDetails = [];
    if (bazi && ['正官','七殺'].includes(bazi.god)) {
      careerDetails.push(bazi.god === '正官' ? '八字走正官——升遷、被認可、體制內加分' : '八字走七殺——壓力型成長，適合創業或轉換跑道');
    }
    if (astro && astro.jupHouse === 10) careerDetails.push('木星過境 10 宮（事業）——今年是事業擴展的黃金年');
    if (astro && astro.satHouse === 10) careerDetails.push('土星過境 10 宮——事業上有硬仗要打，但撐過去就升級');
    if (ziwei?.sihuaPalaces?.quan) {
      const qp = PALACE_NAMES[ziwei.sihuaPalaces.quan.pos] || '';
      if (qp === '事業') careerDetails.push('紫微化權落事業宮——今年在職場的掌控感增強');
      else if (qp === '命宮') careerDetails.push('紫微化權落命宮——今年整個人的氣場和主導力加強');
    }
    if (careerDetails.length > 0) {
      adv += `<div style="margin-bottom:10px;">📈 <b>事業：</b>${careerDetails.join('；')}。<br><span style="color:var(--muted);font-size:.82rem;">→ 結論：今年在工作上會有明確的推進。${bazi?.god === '七殺' ? '壓力大但回報也大，適合做大決定。' : '順水推舟，把握升遷機會。'}</span></div>`;
    }
  }
  
  // 壓力/挑戰具體建議
  if (sorted.some(t => t.key === 'pressure')) {
    let pressureDetails = [];
    if (bazi && ['七殺','正官'].includes(bazi.god)) pressureDetails.push(`八字走${bazi.god}——${bazi.god === '七殺' ? '外在環境施壓，逼你突破' : '責任加重，被要求扛更多'}`);
    if (astro) {
      if (astro.satHouse) pressureDetails.push(`土星在你的 ${astro.satHouse} 宮（${HOUSE_TOPICS[astro.satHouse]||''}）——這個領域今年要「交作業」`);
    }
    if (ziwei?.sihuaPalaces?.ji) {
      const jp = PALACE_NAMES[ziwei.sihuaPalaces.ji.pos] || '';
      pressureDetails.push(`化忌落${jp}——今年在「${jp}」容易卡關或過度執著`);
    }
    if (pressureDetails.length > 0) {
      adv += `<div style="margin-bottom:10px;">🏋️ <b>壓力點：</b>${pressureDetails.join('；')}。<br><span style="color:var(--muted);font-size:.82rem;">→ 這不是壞事——壓力是升級的前奏。重點是：不要硬撐，用你本命的權威判斷哪些壓力值得接、哪些該放。</span></div>`;
    }
  }
  
  // 變動具體建議
  if (sorted.some(t => t.key === 'change')) {
    let changeDetails = [];
    if (bazi && ['傷官','七殺','劫財'].includes(bazi.god)) changeDetails.push(`八字走${bazi.god}——內在有「不想再這樣下去」的躁動`);
    if (hd?.tempChannels?.length > 2) changeDetails.push(`人類圖今年開了 ${hd.tempChannels.length} 條臨時通道——大量新能量湧入，變化是必然的`);
    if (changeDetails.length > 0) {
      adv += `<div style="margin-bottom:10px;">🔄 <b>變動：</b>${changeDetails.join('；')}。<br><span style="color:var(--muted);font-size:.82rem;">→ 今年適合轉型，但不要亂轉。等到「感覺對了」再動，不要因為焦慮而隨便跳。</span></div>`;
    }
  }
  
  // 關係具體建議
  if (sorted.some(t => t.key === 'relationship')) {
    let relDetails = [];
    if (astro && (astro.jupHouse === 7 || astro.satHouse === 7)) {
      relDetails.push(astro.jupHouse === 7 ? '木星過境 7 宮——合作和親密關係擴展' : '土星過境 7 宮——關係中被要求更認真、更負責');
    }
    if (ziwei?.sihuaPalaces?.lu?.pos === 2) relDetails.push('化祿落夫妻宮——感情運加分');
    if (relDetails.length > 0) {
      adv += `<div style="margin-bottom:10px;">💕 <b>關係：</b>${relDetails.join('；')}。</div>`;
    }
  }
  
  // 如果什麼都沒觸發，給個通用但不廢的建議
  if (adv === '') {
    adv = `今年的能量分散在多個面向，沒有壓倒性的單一主題。保持你本命的策略（等待回應/告知後行動/等待邀請），見機行事就好。不需要主動追什麼，該來的會來。`;
  }
  
  return adv;
}

// === 主入口 ===
let _cachedResults = null;

export function calculate(results, targetYear) {
  try {
    const year = targetYear || new Date().getFullYear();
    _cachedResults = results;
    
    const bazi = baziTransit(year, results.bazi?.data);
    const hd = hdTransit(year, results.hd?.data);
    const astro = astroTransit(year, results.astro?.data);
    const ziwei = ziweiTransit(year, results.ziwei?.data);
    const maya = mayaTransit(year, results.maya?.data);
    
    const html = renderTransit(year, bazi, hd, astro, ziwei, maya);
    return { status: 'ok', html, error: null };
  } catch (err) {
    return { status: 'error', html: `<div class="placeholder">流年分析錯誤：${err.message}</div>`, error: err.message };
  }
}

/** 重新計算指定年份（for 年份切換按鈕） */
export function recalculate(year) {
  if (!_cachedResults) return null;
  return calculate(_cachedResults, year);
}

/** 綁定年份切換事件（在 DOM 渲染後呼叫） */
export function attachYearSwitcher() {
  const btns = document.querySelectorAll('.transit-year-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const year = parseInt(btn.dataset.year);
      const result = recalculate(year);
      if (result?.status === 'ok') {
        const el = document.getElementById('view-transit');
        if (el) el.innerHTML = result.html;
        // 重新綁定按鈕事件
        attachYearSwitcher();
      }
    });
  });
}
