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

// === 星×宮 脈絡化解讀（主星在不同宮位的具體意義）===
const STAR_IN_PALACE = {
  // 命宮
  "紫微_命宮": "你有天生的領袖氣質，格局大、自尊心強。一生中容易走上管理或決策位置。",
  "天機_命宮": "腦袋轉得快、點子多，但容易想太多。適合做軍師角色，或走技術/策略路線。",
  "太陽_命宮": "個性熱情開朗，樂於助人。適合公眾型工作，但要注意不要燃燒過度。",
  "武曲_命宮": "做事果斷務實，執行力一流。但個性剛硬，人際上要柔軟一點。",
  "天同_命宮": "溫和有福氣，但容易安逸不思進取。需要外力推動才會衝刺。",
  "廉貞_命宮": "聰明有野心，人際手腕好。但內心複雜，容易給自己壓力。",
  "天府_命宮": "穩重保守有安全感，做事有條有理。一生物質基礎不差。",
  "太陰_命宮": "細膩敏感有品味，適合幕後或需要美感的工作。但容易情緒內耗。",
  "貪狼_命宮": "多才多藝有魅力，興趣廣泛。桃花旺，人生多采多姿但要聚焦。",
  "巨門_命宮": "口才好、分析力強，但容易得罪人。適合靠嘴巴吃飯的行業。",
  "天相_命宮": "斯文有禮善協調，適合幕僚或中間人角色。但缺乏獨自決斷力。",
  "天梁_命宮": "正派有威望，逢凶化吉。適合走專業路線（醫師、律師等）。",
  "七殺_命宮": "獨立有魄力，做事殺伐果斷。一生波折多但成就也高。",
  "破軍_命宮": "人生就是不斷打破重建的過程。前半生折騰，後半生才穩定。",
  // 疾厄宮
  "紫微_疾厄": "體質底子不差，但容易因為壓力大、要求高導致心理負擔。注意頭痛和睡眠。",
  "天機_疾厄": "神經系統敏感，容易肝膽、四肢的毛病。想太多也是一種病，要學放鬆。",
  "太陽_疾厄": "眼睛和心血管要注意。容易因為太操勞、管太多事傷到自己。",
  "武曲_疾厄": "呼吸系統和筋骨要留意。個性太硬撐，身體會先抗議。",
  "天同_疾厄": "體質偏弱但少大病，容易泌尿或腎的小毛病。不要太懶，多運動。",
  "廉貞_疾厄": "注意心臟血管和皮膚。壓力大時容易皮膚出狀況或心悸。",
  "天府_疾厄": "體質穩定，脾胃為主要關注點。容易因為飲食不節制出問題。",
  "太陰_疾厄": "婦科（女）或泌尿（男）較弱，情緒影響身體很深。保持心情穩定很重要。",
  "貪狼_疾厄": "肝膽腎要注意，生活習慣差容易出事。應酬多的話更要小心。",
  "巨門_疾厄": "腸胃和皮膚是弱點。壓力和口舌煩惱容易「氣到胃痛」。",
  "天相_疾厄": "體質中等，面部和皮膚要注意。整體健康隨心情好壞起伏。",
  "天梁_疾厄": "有病也不會太嚴重，逢凶化吉。但注意慢性病和脾胃。",
  "七殺_疾厄": "體質硬朗但容易受傷（跌打損傷）。開刀或小手術機率較高。",
  "破軍_疾厄": "身體狀況大起大落。可能經歷大病再痊癒，或對健康方式做激烈改變。",
  // 財帛宮
  "紫微_財帛": "賺大錢的格局，適合做高端事業。花錢也大方，有貴氣。",
  "天機_財帛": "靠腦袋賺錢，收入起伏大。適合顧問、技術、策劃類收入。",
  "太陽_財帛": "賺錢不藏私，容易散財。薪資收入為主，不太適合投機。",
  "武曲_財帛": "正財格，靠實力賺錢。理財能力強，適合金融業。",
  "天同_財帛": "輕鬆賺，但賺不多。不太有財務壓力，也不會特別富。",
  "廉貞_財帛": "靠人脈和手腕賺錢。收入跟人際關係品質高度相關。",
  "天府_財帛": "最好的財星組合之一。會存錢、會理財，物質基礎穩。",
  "太陰_財帛": "被動收入或房產相關收入有利。財運偏陰（慢慢累積型）。",
  "貪狼_財帛": "多管道收入，偏財運不錯。但花錢也快，要有紀律。",
  "巨門_財帛": "靠口才和專業賺錢。教學、諮詢、律師等口舌類生財。",
  "天相_財帛": "收入穩定但不太高。適合吃公家飯或大公司薪資。",
  "天梁_財帛": "不追求大富大貴，但不至於缺。有長輩或機構提供的保障。",
  "七殺_財帛": "賺錢方式比較激烈，大起大落。適合創業或業績導向工作。",
  "破軍_財帛": "賺錢模式一直在變。不適合守舊，適合不斷開發新財源。",
  // 事業宮
  "紫微_事業": "做老闆或高管的命。格局大，適合做決策而不是執行。",
  "天機_事業": "適合幕僚、企劃、資訊、研發。不適合站第一線衝鋒。",
  "太陽_事業": "適合公眾型事業（教育、傳播、政治）。要被看見才有成就感。",
  "武曲_事業": "適合金融、工程、管理。執行力強，做事有效率。",
  "天同_事業": "適合穩定環境的文職、服務業。不愛競爭但做事可靠。",
  "廉貞_事業": "適合業務、管理、政治。有野心有手段，能在複雜環境生存。",
  "天府_事業": "適合財務、行政、倉儲管理。做守成型的高管很好。",
  "太陰_事業": "適合幕後工作、文創、房地產。不愛拋頭露面但有實力。",
  "貪狼_事業": "適合演藝、行銷、餐飲、娛樂。多元發展比單一路線好。",
  "巨門_事業": "適合教育、法律、諮商、媒體。靠專業和口才吃飯。",
  "天相_事業": "適合公務員、秘書、幕僚。執行力好但需要明確指令。",
  "天梁_事業": "適合醫療、法律、社工、公益。有使命感的工作最佳。",
  "七殺_事業": "適合創業、軍警、外科。獨當一面，不喜歡被管。",
  "破軍_事業": "適合開拓型工作、新市場開發、改革推動者。待不住穩定環境。",
  // 福德宮
  "紫微_福德": "精神世界有帝王格局，自視甚高。內心追求被尊重和掌控感。",
  "天機_福德": "腦子停不下來，精神上容易焦慮。適合冥想或有興趣研究來安心。",
  "太陽_福德": "內心陽光正面，但容易過度付出導致精神疲勞。要學會自私一點。",
  "武曲_福德": "精神上追求效率和成果，閒不住。退休後可能不適應。",
  "天同_福德": "內心平和知足，精神層面有福。懂得享受生活的小確幸。",
  "廉貞_福德": "內心有慾望有衝勁，精神壓力較大。需要找到釋放出口。",
  "天府_福德": "精神生活穩定有品質，內心有安全感。不容易焦慮。",
  "太陰_福德": "內心敏感浪漫，精神世界豐富。但容易鑽牛角尖。",
  "貪狼_福德": "精神慾望多，興趣廣泛停不下來。享樂主義傾向。",
  "巨門_福德": "內心多疑多慮，容易自我辯論。安靜下來反而不舒服。",
  "天相_福德": "精神上需要和諧穩定，不喜歡衝突。內心追求體面。",
  "天梁_福德": "精神層面有貴人保佑，內心有信仰或哲學支撐。晚年福氣好。",
  "七殺_福德": "內心有戰鬥感，精神上不安於現狀。需要目標才能安心。",
  "破軍_福德": "精神上不斷重建自我認知。內心世界翻天覆地但也因此成長快。",
  // 夫妻宮
  "紫微_夫妻": "另一半有氣勢、有能力，但可能強勢。你需要能力相當的伴侶。",
  "天機_夫妻": "另一半聰明但善變。感情上容易因為想太多而產生波動。",
  "太陽_夫妻": "男命有好太太；女命老公忙但顧家。感情模式偏傳統。",
  "武曲_夫妻": "伴侶務實能幹，但可能硬邦邦缺浪漫。晚婚較佳。",
  "天同_夫妻": "感情甜蜜溫馨，但太平淡可能缺激情。適合細水長流。",
  "廉貞_夫妻": "感情路複雜，可能有三角或前任糾葛。需要成熟才能穩定。",
  "天府_夫妻": "另一半穩重可靠，家庭觀念強。婚姻質量不錯。",
  "太陰_夫妻": "另一半溫柔細膩，男命尤佳。但伴侶可能比較被動。",
  "貪狼_夫妻": "桃花旺，另一半有魅力但也有外緣。感情要花心思經營。",
  "巨門_夫妻": "伴侶間容易吵架（但可能是情趣）。溝通是最大課題。",
  "天相_夫妻": "另一半溫和體面，婚姻穩定。但可能缺乏激情。",
  "天梁_夫妻": "可能另一半年紀差距大，或有長輩介紹的緣分。感情穩但遲。",
  "七殺_夫妻": "伴侶個性強烈、獨立。婚姻中兩人都需要空間。",
  "破軍_夫妻": "感情波折大，可能經歷分合。但每次重來都更好。",
  // 兄弟宮
  "紫微_兄弟": "兄弟朋友中你是老大，大家聽你的。同事間有領導地位。",
  "天機_兄弟": "跟兄弟朋友的關係會變動，聚散無常。適合找聰明的人合作。",
  "太陽_兄弟": "對朋友很照顧，容易為朋友付出。但要注意不要被當好人利用。",
  "武曲_兄弟": "跟朋友同事間有金錢往來，合作關係偏實際。不太走感情路線。",
  "天同_兄弟": "跟朋友關係和樂融融，但深度不夠。酒肉朋友多，患難之交少。",
  "廉貞_兄弟": "人際關係複雜，朋友圈有競爭感。要小心被拖下水。",
  "天府_兄弟": "朋友品質不錯，有穩重可靠的長期夥伴。人脈是你的資產。",
  "太陰_兄弟": "朋友圈偏安靜文雅，女性朋友或幕後型夥伴多。",
  "貪狼_兄弟": "社交圈廣、朋友多元。但關係容易表面化，深交的不多。",
  "巨門_兄弟": "跟兄弟朋友間容易有口舌是非。合作時溝通要清楚，避免誤會。",
  "天相_兄弟": "朋友斯文有禮，人際和諧。但遇到大事時幫手有限。",
  "天梁_兄弟": "有長輩型的朋友照應你。兄弟中可能有人從事專業領域。",
  "七殺_兄弟": "朋友個性強烈，關係不是很好就是很差。合則聚不合則散。",
  "破軍_兄弟": "兄弟朋友圈變動大，老朋友會漸漸換一批新的。聚散是常態。",
  // 子女宮
  "紫微_子女": "子女有出息、有格局。你對下屬/子女要求高。創作力有帝王氣。",
  "天機_子女": "子女聰明機靈但靜不下來。你的創意點子多，適合動腦型的創作。",
  "太陽_子女": "跟兒子緣分較深（或男性下屬）。你對後輩很照顧。",
  "武曲_子女": "子女獨立務實，不太黏人。投資上適合實體資產或穩健標的。",
  "天同_子女": "跟子女關係溫馨，但可能太寵。創作風格偏溫暖療癒。",
  "廉貞_子女": "跟子女關係複雜，或子女個性倔強。投資方面要注意風險。",
  "天府_子女": "子女穩重乖巧，讓你省心。投資運不錯，適合長期持有。",
  "太陰_子女": "跟女兒緣分較深（或女性下屬）。創作力偏感性、藝術型。",
  "貪狼_子女": "子女有才華但貪玩。你的創造力旺盛、興趣廣泛。桃花也看這裡。",
  "巨門_子女": "跟子女之間溝通是課題，容易嘮叨或意見不合。",
  "天相_子女": "子女溫和有教養。你對下屬照顧有方，是好主管。",
  "天梁_子女": "子女有老人緣或早熟。你在教育上重視品德。",
  "七殺_子女": "子女個性剛強獨立，管不太住。你跟他們的關係需要空間。",
  "破軍_子女": "跟子女關係有起伏，或子女走非傳統路線。投資大起大落要小心。",
  // 遷移宮
  "紫微_遷移": "外出運極佳，到哪都是中心人物。適合外地發展，格局更大。",
  "天機_遷移": "在外變動多，常搬家或換環境。但適應力強，靠靈活吃飯。",
  "太陽_遷移": "在外有名聲、受歡迎。適合對外的工作（業務、公關、外派）。",
  "武曲_遷移": "外出辛苦但有財，適合在外打拼。出差或外地工作賺得到錢。",
  "天同_遷移": "外出就是享福，旅行運不錯。但不太適合在外打拼衝事業。",
  "廉貞_遷移": "外出人際複雜，有機會也有競爭。出差多的工作適合你。",
  "天府_遷移": "在外有安全感，到哪都能穩定下來。外地有靠山。",
  "太陰_遷移": "適合在安靜的環境發展。夜間或幕後工作在外更有優勢。",
  "貪狼_遷移": "在外桃花旺、人緣好。社交活動多，外地有很多機會。",
  "巨門_遷移": "在外容易惹口舌是非。但如果靠口才工作（教學、業務），反而外出有利。",
  "天相_遷移": "在外有貴人照應，人緣好。適合外交型或協調型的外派工作。",
  "天梁_遷移": "在外逢凶化吉，有長輩貴人。出遠門不太會出事。",
  "七殺_遷移": "在外獨來獨往，靠自己闖。適合開拓外地市場。",
  "破軍_遷移": "在外不斷轉換環境，居無定所但越走越開闊。外地比家鄉好。",
  // 交友宮
  "紫微_交友": "朋友多是有頭有臉的人，社交圈品質高。但你容易被捧。",
  "天機_交友": "朋友圈變動大，人來人往。適合找聰明靈活的合作夥伴。",
  "太陽_交友": "你在朋友圈裡付出多，是大家的太陽。但要注意被消耗。",
  "武曲_交友": "交友以利益為基礎，君子之交淡如水。合作重效率不重感情。",
  "天同_交友": "朋友關係輕鬆愉快，但關鍵時刻可能靠不住。",
  "廉貞_交友": "社交圈複雜有競爭，朋友中有人脈也有小人。要有識人之明。",
  "天府_交友": "朋友穩重可靠，長期經營的人脈是你的最大資產。",
  "太陰_交友": "朋友圈小而精，不愛大場面社交。閨蜜型深交多。",
  "貪狼_交友": "朋友圈極廣但深度不足。什麼圈子都能混，但知心的少。",
  "巨門_交友": "跟朋友間容易有爭議或誤會。選朋友要慎重。",
  "天相_交友": "朋友溫和有禮，社交圈和諧。但都不是能幫大忙的類型。",
  "天梁_交友": "朋友中有不少長輩或專業人士。有人罩你。",
  "七殺_交友": "朋友個性都很強，關係明快。合就合、不合就拜。",
  "破軍_交友": "朋友圈大換血是常態。每個人生階段有不同的朋友。",
  // 田宅宮
  "紫微_田宅": "住的環境要有品質，適合高級社區。房產運不錯。",
  "天機_田宅": "居住環境常變動，搬家次數多。家裡擺設常換。",
  "太陽_田宅": "家裡熱鬧、人來人往。但可能家中事務操心多。",
  "武曲_田宅": "有置產能力，適合投資不動產。家裡擺設偏簡潔實用。",
  "天同_田宅": "居家環境溫馨舒適，有福享受。喜歡待在家裡。",
  "廉貞_田宅": "居住環境有變動或糾紛。裝潢偏華麗但可能有鄰居問題。",
  "天府_田宅": "房產運極佳，一生不缺房住。家是你的安全堡壘。",
  "太陰_田宅": "適合置產（尤其女性）。喜歡安靜、有品味的居住環境。",
  "貪狼_田宅": "居家環境變化多端，裝潢常換風格。可能有多處房產。",
  "巨門_田宅": "家裡容易有紛爭或噪音問題。買房注意產權和鄰居。",
  "天相_田宅": "居家環境整潔有格調。房產方面穩定但不會暴富。",
  "天梁_田宅": "可能繼承祖產或長輩贈與。家中有傳統感。",
  "七殺_田宅": "居住環境不安定，或需要自己打拼置產。買了也想換。",
  "破軍_田宅": "搬家翻修是常態。對居住環境永遠不滿意，一直在改。",
  // 父母宮
  "紫微_父母": "父母有地位或格局大。你從小被期望高，跟父母關係偏敬而遠之。",
  "天機_父母": "跟父母溝通還行但會有代溝。父母可能比較操心或碎唸。",
  "太陽_父母": "跟父親緣分較深。父母對你有犧牲和付出。學習運不錯。",
  "武曲_父母": "父母教育方式偏嚴格實際。你在學業或文書上靠硬功夫。",
  "天同_父母": "跟父母關係融洽輕鬆。家庭氣氛好，被寵著長大。",
  "廉貞_父母": "跟父母關係有些複雜或不親近。可能早離家或叛逆期長。",
  "天府_父母": "父母穩重可靠，家庭教育好。你的學歷或資歷有保障。",
  "太陰_父母": "跟母親緣分較深。文藝學習能力好，適合考證照。",
  "貪狼_父母": "父母可能多才多藝或有桃花。你在學習上興趣廣泛。",
  "巨門_父母": "跟父母之間溝通是課題，容易有誤會或爭執。",
  "天相_父母": "父母溫和有禮，家教好。你的文書運和考試運不錯。",
  "天梁_父母": "有長輩庇蔭，父母可能從事專業領域。你受父母影響深。",
  "七殺_父母": "跟父母關係有距離，或父母個性強勢。你獨立得早。",
  "破軍_父母": "跟父母關係有波折，或離家早。學歷路線可能非傳統。",
};

// === 宮位意義 ===
const PALACE_INFO = {
  "命宮": "你的核心性格和人生主題（外在表現）",
  "兄弟": "兄弟姊妹、朋友、同事關係",
  "夫妻": "伴侶類型和婚姻狀態",
  "子女": "子女關係、創作、下屬",
  "財帛": "賺錢方式和財運",
  "疾厄": "健康狀況和體質弱點",
  "遷移": "外出運、社交、旅行、外地發展",
  "交友": "社交圈和人際品質",
  "事業": "事業方向和成就",
  "田宅": "房產運和居住環境",
  "福德": "精神生活和內心世界（內在本質）",
  "父母": "父母關係、學習、文書運",
};

// === 宮位角色定位提示（命宮/福德/疾厄等的關係說明）===
const PALACE_ROLE = {
  "命宮": "💡 命宮 = 你給外界的印象，是「行為模式」而非全部的你。",
  "福德": "💡 福德宮 = 你的內心世界。命宮是外在行為，福德是內在渴望。兩者常有張力。",
  "疾厄": "💡 疾厄宮看的是健康體質，星曜在此代表身體的特徵和弱點，不是性格。",
  "財帛": "💡 財帛宮 = 你怎麼賺錢、花錢。跟事業宮（做什麼工作）是兩回事。",
  "事業": "💡 事業宮 = 適合什麼類型的工作。跟財帛宮（賺多少）分開看。",
  "夫妻": "💡 夫妻宮 = 你會吸引什麼類型的伴侶，以及婚姻的模式。",
  "遷移": "💡 遷移宮 = 你離開家之後的運勢。出國、旅行、外地發展看這裡。",
  "子女": "💡 子女宮也代表創造力和投資運，不只看小孩。也看你跟下屬的關係。",
  "兄弟": "💡 兄弟宮 = 你跟平輩（同事、朋友、兄弟姊妹）的相處模式和助力。",
  "交友": "💡 交友宮 = 你吸引到什麼樣的朋友和合作夥伴。跟兄弟宮不同，這是「外面的人脈」。",
  "田宅": "💡 田宅宮 = 居住環境和不動產運。也代表你的「家」是什麼感覺。",
  "父母": "💡 父母宮 = 跟長輩的關係、學習能力、文書考試運。也看你的教養背景。",
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

  // 註冊全域點擊函數（解決 innerHTML 內 script 不執行的問題）
  try { registerGlobalClickHandler(palaces, data.sihua, data.daxian, data.birthYear); } catch(e) { console.error('registerGlobalClickHandler error:', e); }

  return `
    <div class="sig">
      <div class="kin">紫微斗數命盤</div>
      <div class="big">${mingStars.length > 0 ? mingStars.map(s=>s.name).join(' ') + ' 坐命' : '命宮無主星'}</div>
      <div style="font-size:.85rem;color:var(--muted);margin-top:6px;">
        農曆 ${lunar.lunarYear}年${lunar.isLeap?'閏':''}${lunar.lunarMonth}月${lunar.lunarDay}日 · ${ju.name} · 命宮在${BRANCHES[mingPos]}
      </div>
    </div>
    <div class="note" style="margin-bottom:12px;">💡 點擊各宮格查看星曜解讀（含對宮分析）｜⏳ = 大限年齡（★ = 當前大限）</div>
    ${renderGrid(palaces, lunar, ju, data.sihua, data.daxian, data.birthYear)}
    <div id="zw-detail" style="margin-top:12px;"></div>
    <div class="divider"></div>
    <h3 style="cursor:pointer;" onclick="document.getElementById('zw-daxian').style.display=document.getElementById('zw-daxian').style.display==='none'?'block':'none';">🚂 大限解說（十年大運）▼</h3>
    <div id="zw-daxian">
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
    let dxLabel = '';
    if (dx) {
      const dxColor = isDxCurrent ? 'color:var(--accent);font-weight:700;' : 'color:var(--muted);';
      const dxMark = isDxCurrent ? ' ★' : '';
      dxLabel = `<div style="font-size:.55rem;${dxColor}margin-top:2px;">⏳${dx.age}-${dx.ageEnd}歲${dxMark}</div>`;
    }
    return `<div class="zw-cell" style="padding:5px;background:var(--input-bg);${border}border-radius:4px;min-height:60px;cursor:pointer;display:flex;flex-direction:column;justify-content:space-between;" data-zw-pos="${branchIdx}">
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

  return `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px;font-size:.75rem;">
      ${cell(5)}${cell(6)}${cell(7)}${cell(8)}
      ${cell(4)}${centerInfo}${cell(9)}
      ${cell(3)}${cell(10)}
      ${cell(2)}${cell(1)}${cell(0)}${cell(11)}
    </div>
  `;
}


// === 對宮關係（每個位置的對宮 = 位置 +6 mod 12）===
function getOppositePos(pos) { return (pos + 6) % 12; }

// === 雙星同宮組合解讀 ===
const STAR_COMBOS = {
  "紫微+貪狼": "紫貪同宮：有領袖魅力又多才多藝，桃花旺但也有格局。適合演藝、行銷、管理。",
  "紫微+天府": "紫府同宮：帝星+庫星，穩重有格局，適合高階管理和財務決策。一生少災。",
  "紫微+天相": "紫相同宮：有領導力又善協調，適合幕僚型主管或制度建立者。",
  "紫微+七殺": "紫殺同宮：帝星+將星，有魄力有格局，適合獨當一面。一生多大起大落。",
  "紫微+破軍": "紫破同宮：敢想敢做又有格局，適合開創新局。前半生波折，後半生穩定。",
  "武曲+天府": "武府同宮：雙財星，理財能力極強，適合金融業、會計、投資。物質運佳。",
  "武曲+貪狼": "武貪同宮：有財有慾，中年後發達。適合多角化經營。",
  "武曲+天相": "武相同宮：做事有魄力又條理清楚，適合金融管理、行政主管。",
  "武曲+七殺": "武殺同宮：果斷殺伐，行動力爆表。適合創業、軍警、工程。辛苦但有成。",
  "武曲+破軍": "武破同宮：打破舊局找新財路。前半生辛苦，後半生有成。",
  "太陽+太陰": "日月同宮：陰陽平衡，性格溫和有人緣。但容易左右為難、猶豫不決。",
  "太陽+巨門": "日巨同宮：口才好又有正義感。適合教育、法律、媒體。化暗為明。",
  "太陽+天梁": "日梁同宮：正派有威望，逢凶化吉。適合公職、醫療、社工。",
  "天機+太陰": "機月同宮：聰明細膩，適合幕後策劃、研究、科技業。",
  "天機+巨門": "機巨同宮：腦袋轉得快又會說。適合顧問、分析師、教師。",
  "天機+天梁": "機梁同宮：聰明又有長輩緣，適合走專業路線（醫師、律師、工程師）。",
  "天同+太陰": "同陰同宮：溫和有藝術天份，但容易過於被動。適合文創、設計。",
  "天同+巨門": "同巨同宮：外表溫和但內心有主見。適合服務業、諮商。",
  "天同+天梁": "同梁同宮：福氣好又有貴人。適合穩定發展，不宜冒險。",
  "廉貞+貪狼": "廉貪同宮：野心大又有魅力，桃花很旺。適合業務、公關、演藝。",
  "廉貞+七殺": "廉殺同宮：有野心有魄力，適合高壓環境（金融、業務主管）。",
  "廉貞+破軍": "廉破同宮：勇於打破現狀，適合創業。但感情路比較曲折。",
  "廉貞+天府": "廉府同宮：有野心又懂守成。適合企業中高階。穩中求進。",
  "廉貞+天相": "廉相同宮：外表斯文有禮但內在有算計。適合公關、政治、法律。",
};

// === 四化落宮的完整解讀 ===
const SIHUA_PALACE_INTERP = {
  "祿": {
    "命宮": "化祿入命：今生自帶好運氣場，做事容易順利。",
    "兄弟": "化祿入兄弟：跟朋友同事間財運好，合作有利。",
    "夫妻": "化祿入夫妻：感情運順，另一半帶財或帶好運。",
    "子女": "化祿入子女：創作有成、跟子女緣份好、投資運佳。",
    "財帛": "化祿入財帛：最直接的財運加持，收入管道暢通。",
    "疾厄": "化祿入疾厄：身體底子好、或是花錢在養生享樂上。",
    "遷移": "化祿入遷移：外出有好運、貴人在外面、適合發展外地。",
    "交友": "化祿入交友：朋友幫忙多、社交圈帶來機會。",
    "事業": "化祿入事業：工作順利、容易有好職位或好項目。",
    "田宅": "化祿入田宅：有房產運、家裡環境好。",
    "福德": "化祿入福德：精神層面滿足、懂享受生活。",
    "父母": "化祿入父母：長輩庇蔭、學習運好、文書順利。",
  },
  "忌": {
    "命宮": "化忌入命：自己容易想太多、操心勞碌。轉念很重要。",
    "兄弟": "化忌入兄弟：跟同儕間容易有摩擦或金錢糾紛。",
    "夫妻": "化忌入夫妻：感情上付出多、伴侶關係是功課。",
    "子女": "化忌入子女：為子女操心、或投資要小心。",
    "財帛": "化忌入財帛：錢進來也出去、要注意理財紀律。",
    "疾厄": "化忌入疾厄：要注意健康，特別是過勞和壓力。",
    "遷移": "化忌入遷移：外出容易不順、出差有阻礙。多留意交通。",
    "交友": "化忌入交友：交友要謹慎、容易遇到不對的人。",
    "事業": "化忌入事業：工作壓力大、容易碰到瓶頸。但壓力是成長。",
    "田宅": "化忌入田宅：居家不太安穩、房產事務多操心。",
    "福德": "化忌入福德：內心容易焦慮不安、要學放鬆。",
    "父母": "化忌入父母：跟長輩關係要經營、文書考試多波折。",
  },
};

// === 註冊全域點擊處理器 ===
function registerGlobalClickHandler(palaces, sihua, daxian, birthYear) {
  const posMap = {};
  palaces.forEach(p => { posMap[p.pos] = p; });

  // 找出四化落在哪個宮
  const sihuaPalaces = {};
  palaces.forEach(p => {
    p.main.forEach(s => {
      if (s.name === sihua.lu) sihuaPalaces[p.name] = (sihuaPalaces[p.name]||[]).concat(['祿→'+s.name]);
      if (s.name === sihua.quan) sihuaPalaces[p.name] = (sihuaPalaces[p.name]||[]).concat(['權→'+s.name]);
      if (s.name === sihua.ke) sihuaPalaces[p.name] = (sihuaPalaces[p.name]||[]).concat(['科→'+s.name]);
      if (s.name === sihua.ji) sihuaPalaces[p.name] = (sihuaPalaces[p.name]||[]).concat(['忌→'+s.name]);
    });
    p.minor.forEach(s => {
      if (s === sihua.lu) sihuaPalaces[p.name] = (sihuaPalaces[p.name]||[]).concat(['祿→'+s]);
      if (s === sihua.quan) sihuaPalaces[p.name] = (sihuaPalaces[p.name]||[]).concat(['權→'+s]);
      if (s === sihua.ke) sihuaPalaces[p.name] = (sihuaPalaces[p.name]||[]).concat(['科→'+s]);
      if (s === sihua.ji) sihuaPalaces[p.name] = (sihuaPalaces[p.name]||[]).concat(['忌→'+s]);
    });
  });

  // 把完整資料序列化到 window 上，供全域 script 使用
  window._zwData = {
    posMap: posMap,
    sihuaPalaces: sihuaPalaces,
    starInfo: STAR_INFO,
    starInPalace: STAR_IN_PALACE,
    palaceInfo: PALACE_INFO,
    palaceRole: PALACE_ROLE,
    starCombos: STAR_COMBOS,
    sihuaPalaceInterp: SIHUA_PALACE_INTERP,
    branches: BRANCHES,
  };
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
