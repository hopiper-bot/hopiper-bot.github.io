/**
 * char-meaning.js — 字義五行 + 常見取名字寓意
 *
 * 姓名學傳統講「音、形、義」三塊：
 *   形 = 筆劃五格（現有）
 *   音 = 聲調順口（現有）
 *   義 = 字的本義、五行屬性、寓意褒貶 ← 這個檔補的就是「義」
 *
 * 兩個重點：
 *   1. 字義五行：跟「筆劃尾數五行」不一樣。筆劃五行是數字遊戲，
 *      字義五行看的是字的部首和本義（江河湖海屬水、松柏梅屬木、
 *      炎焱煒屬火）。做八字補救時，字義五行比筆劃五行更貼近直覺，
 *      兩者都提供給使用者參考。
 *   2. 寓意：每個字帶的意象是正面、中性還是需要留意的，
 *      以及適合的性別傾向。
 *
 * 判斷順序：先查明確字表（EXPLICIT），查不到再用部首字根推（RADICAL_ELEMENT）。
 */

// ============ 部首字根 → 五行 ============
// 用字根的代表字元組成集合，比對目標字是否「包含」該字元。
// 一個字可能命中多個，取第一個命中的為主五行。
export const RADICAL_ELEMENT = [
  { elem: '水', label: '水氵冫雨', chars: '水氵冫雨永氾池汝江汎汐汕汪沁沂沅沐沛沙沚沫河治沼沿泉泓法泰泳洋洛洲津洪流浩海涵涓淇清淞淵淼渙湘湛港游湖溢滋漢潔澄澤瀚冰冷凌霖霈霏霜露雪雯雲霓' },
  { elem: '木', label: '木艸禾竹', chars: '木本札朴李杏材村杉杞林松柏柔柯柚柳栢桂桐梅梓森楠榕楓槐樺權艾芊芝芳芬花芯芷芸苓苗英茂茉茜荷莉莎菁菊華萱葉蓉蓮蕾薇藍禾秀秉科秋秒程稜稻稼穎竹笙笛笠筠箏簫竿' },
  { elem: '火', label: '火灬日光', chars: '火灼炅炎炘炤炫炬炯烈焙焜焱煒煥煜煇照熙熹燁燦燿爍炳烽焰煦熾日旦旭旻昀昕明昌昆昇昭映昱是時晉晏晃晨普景晴智暉暐暘暖暢曄曦光輝耀煌' },
  { elem: '土', label: '土山石王', chars: '土圭在圻均坊坤垚城域培基堂堅堡塵墨壕山岑岡岱岳岸峙峒峰峻崇崧崙崴嵐嵩巍屹岫石砂研硯碩磊磐礎王玨玲珏珍玟珂珈珊珠珮珩琅理琇琉琳琦琪琴琮琬琰瑀瑄瑋瑜瑛瑞瑤瑩璇璉璘璟璨環璽瓊' },
  { elem: '金', label: '金钅刀', chars: '金釗釧鈞銘銳鋒鋅錡錦鍇鎧鏗鑫鑑刀刃分列初判別利刻剛創劍鋼鐵鐘鏡銓錠鈺' },
];

// ============ 明確字表：字 → { elem, tone, hint } ============
// elem: 字義五行
// tone: good（正面意象）/ neutral（中性）/ caution（需留意，多為過剛/過烈/生僻）
// gender: m（偏陽剛）/ f（偏陰柔）/ n（中性）
// hint: 一句寓意說明
export const CHAR_MEANING = {
  // —— 木 ——
  松: { elem: '木', tone: 'good', gender: 'm', hint: '松柏長青，堅忍挺拔、有節操。' },
  柏: { elem: '木', tone: 'good', gender: 'm', hint: '常綠喬木，堅毅高潔。' },
  梅: { elem: '木', tone: 'good', gender: 'f', hint: '凌寒獨開，堅忍中帶清雅。' },
  楠: { elem: '木', tone: 'good', gender: 'n', hint: '楠木貴重，穩重可靠、成材之意。' },
  楓: { elem: '木', tone: 'good', gender: 'n', hint: '楓紅似錦，才華外顯、有情調。' },
  芸: { elem: '木', tone: 'good', gender: 'f', hint: '香草名，才藝、勤勉（芸芸亦指眾多）。' },
  芳: { elem: '木', tone: 'good', gender: 'f', hint: '花草芬芳，美好名聲、品德留香。' },
  蓉: { elem: '木', tone: 'good', gender: 'f', hint: '芙蓉出水，清麗脫俗。' },
  萱: { elem: '木', tone: 'good', gender: 'f', hint: '萱草忘憂，樂觀、療癒。' },
  茜: { elem: '木', tone: 'good', gender: 'f', hint: '茜草染紅，鮮明亮眼。' },
  梓: { elem: '木', tone: 'good', gender: 'n', hint: '梓為良木，故鄉、成材之意。' },
  柔: { elem: '木', tone: 'good', gender: 'f', hint: '溫柔和順，以柔克剛。' },
  芯: { elem: '木', tone: 'good', gender: 'f', hint: '燈芯、核心，內在、專注。' },

  // —— 火 ——
  炎: { elem: '火', tone: 'caution', gender: 'm', hint: '雙火為炎，熱情旺盛，但過烈易衝、宜配水/土調和。' },
  焱: { elem: '火', tone: 'caution', gender: 'm', hint: '三火，能量極旺，取名偏烈，須留意情緒與健康的平衡。' },
  煒: { elem: '火', tone: 'good', gender: 'm', hint: '火光明亮，光明磊落、有朝氣。' },
  煜: { elem: '火', tone: 'good', gender: 'n', hint: '照耀、光彩，前途光明。' },
  昭: { elem: '火', tone: 'good', gender: 'n', hint: '昭明、彰顯，光明正大。' },
  晨: { elem: '火', tone: 'good', gender: 'n', hint: '清晨朝陽，朝氣、希望。' },
  暉: { elem: '火', tone: 'good', gender: 'n', hint: '陽光溫暖，光輝、照拂。' },
  晴: { elem: '火', tone: 'good', gender: 'f', hint: '天朗氣清，開朗明快。' },
  智: { elem: '火', tone: 'good', gender: 'n', hint: '智慧、聰明，見識過人。' },
  熙: { elem: '火', tone: 'good', gender: 'n', hint: '光明興盛，和樂、繁榮。' },

  // —— 土 ——
  峰: { elem: '土', tone: 'good', gender: 'm', hint: '高峰，志向高遠、登峰造極。' },
  嵐: { elem: '土', tone: 'good', gender: 'f', hint: '山中霧氣，靈秀、飄逸。' },
  磊: { elem: '土', tone: 'good', gender: 'm', hint: '光明磊落，坦蕩正直。' },
  堅: { elem: '土', tone: 'good', gender: 'm', hint: '堅固、堅定，意志力強。' },
  培: { elem: '土', tone: 'good', gender: 'n', hint: '培育、栽培，厚積薄發。' },
  珍: { elem: '土', tone: 'good', gender: 'f', hint: '珍貴、珍惜，稀有可貴。' },
  瑜: { elem: '土', tone: 'good', gender: 'n', hint: '美玉，才德兼備、瑕不掩瑜。' },
  瑞: { elem: '土', tone: 'good', gender: 'n', hint: '祥瑞、吉兆，福氣。' },
  琳: { elem: '土', tone: 'good', gender: 'f', hint: '美玉，珍貴、清雅（琳瑯滿目）。' },
  瑩: { elem: '土', tone: 'good', gender: 'f', hint: '玉色晶瑩，明淨、聰慧。' },
  璇: { elem: '土', tone: 'good', gender: 'f', hint: '美玉、北斗星名，尊貴。' },

  // —— 金 ——
  鑫: { elem: '金', tone: 'good', gender: 'm', hint: '三金，財富興盛（多用於商號、命名）。' },
  銳: { elem: '金', tone: 'caution', gender: 'm', hint: '鋒利、敏銳，才氣逼人，但過銳易傷、宜藏鋒。' },
  鋒: { elem: '金', tone: 'caution', gender: 'm', hint: '刀鋒，先鋒、銳氣，同樣需留意鋒芒的收放。' },
  錦: { elem: '金', tone: 'good', gender: 'n', hint: '錦繡，前程似錦、華美。' },
  鈞: { elem: '金', tone: 'good', gender: 'm', hint: '古重量單位，貴重、有份量。' },
  銘: { elem: '金', tone: 'good', gender: 'n', hint: '銘記、銘刻，深刻、不忘本。' },
  鎧: { elem: '金', tone: 'good', gender: 'm', hint: '鎧甲，堅強、有保護力。' },

  // —— 水 ——
  江: { elem: '水', tone: 'good', gender: 'n', hint: '大江，氣度恢弘、源遠流長。' },
  海: { elem: '水', tone: 'good', gender: 'n', hint: '大海，胸襟寬廣、包容。' },
  泉: { elem: '水', tone: 'good', gender: 'n', hint: '泉源，源源不絕、清澈。' },
  浩: { elem: '水', tone: 'good', gender: 'm', hint: '浩瀚，正氣、格局大。' },
  涵: { elem: '水', tone: 'good', gender: 'f', hint: '涵養、包容，內斂有度。' },
  淇: { elem: '水', tone: 'good', gender: 'f', hint: '淇水，清雅、柔美。' },
  清: { elem: '水', tone: 'good', gender: 'n', hint: '清澈、清白，正直、明淨。' },
  澤: { elem: '水', tone: 'good', gender: 'n', hint: '恩澤、潤澤，惠及他人。' },
  瀚: { elem: '水', tone: 'good', gender: 'm', hint: '浩瀚，博大、學識淵博。' },
  雨: { elem: '水', tone: 'good', gender: 'f', hint: '甘霖，滋潤、及時。' },
  雯: { elem: '水', tone: 'good', gender: 'f', hint: '雲彩紋理，柔美、有文采。' },

  // —— 常見但需留意的字 ——
  龍: { elem: '土', tone: 'caution', gender: 'm', hint: '尊貴、氣勢強，但能量極大，需相應的德行承接（傳統認為壓不住易反）。' },
  虎: { elem: '木', tone: 'caution', gender: 'm', hint: '威猛、有氣勢，但過剛、生肖非虎者用之易犯沖，宜斟酌。' },
  霸: { elem: '水', tone: 'caution', gender: 'm', hint: '霸氣、稱雄，但鋒芒太露、樹敵，取名偏強勢。' },

  // —— 高頻取名字（補覆蓋率）——
  志: { elem: '火', tone: 'good', gender: 'm', hint: '志向、心之所向，有目標、有抱負。' },
  誌: { elem: '火', tone: 'good', gender: 'm', hint: '志向、銘記（「志」的正體之一），有目標、不忘本。' },
  明: { elem: '火', tone: 'good', gender: 'n', hint: '光明、聰明，明白事理、前途明朗。' },
  華: { elem: '木', tone: 'good', gender: 'n', hint: '光華、才華，繁盛、出眾。' },
  文: { elem: '水', tone: 'good', gender: 'n', hint: '文采、文雅，有學識、溫文。' },
  宇: { elem: '土', tone: 'good', gender: 'n', hint: '天地屋宇，胸襟寬廣、氣度不凡。' },
  軒: { elem: '土', tone: 'good', gender: 'm', hint: '高軒、器宇軒昂，氣質出眾。' },
  婷: { elem: '火', tone: 'good', gender: 'f', hint: '亭亭玉立，體態娟秀、優雅。' },
  欣: { elem: '木', tone: 'good', gender: 'f', hint: '欣喜、欣欣向榮，樂觀有生氣。' },
  怡: { elem: '土', tone: 'good', gender: 'f', hint: '怡然自得，和悅、安適。' },
  彤: { elem: '火', tone: 'good', gender: 'f', hint: '朱紅色，熱情、喜氣。' },
  庭: { elem: '火', tone: 'good', gender: 'f', hint: '門庭、大方得體，端正有規矩。' },
  宏: { elem: '土', tone: 'good', gender: 'm', hint: '宏大、恢弘，格局遠大。' },
  偉: { elem: '土', tone: 'good', gender: 'm', hint: '偉大、卓越，有作為。' },
  傑: { elem: '木', tone: 'good', gender: 'm', hint: '傑出、豪傑，才能過人。' },
  勇: { elem: '土', tone: 'good', gender: 'm', hint: '勇敢、有膽識，不畏難。' },
  豪: { elem: '水', tone: 'caution', gender: 'm', hint: '豪邁、氣派，但也帶張揚，宜配內斂的字平衡。' },
  雅: { elem: '木', tone: 'good', gender: 'f', hint: '雅致、高雅，品味不俗。' },
  筑: { elem: '木', tone: 'good', gender: 'f', hint: '古樂器、築基，藝術氣息、有根基。' },
  恩: { elem: '土', tone: 'good', gender: 'n', hint: '恩德、感恩，寬厚、有福。' },
  睿: { elem: '金', tone: 'good', gender: 'n', hint: '睿智、明智，深謀遠慮。' },
  翔: { elem: '土', tone: 'good', gender: 'm', hint: '飛翔、翱翔，自由、志向高遠。' },
  騰: { elem: '火', tone: 'good', gender: 'm', hint: '奔騰、飛騰，向上、有氣勢。' },
  芊: { elem: '木', tone: 'good', gender: 'f', hint: '草木茂盛，生機盎然、清新。' },
  妍: { elem: '水', tone: 'good', gender: 'f', hint: '美好、巧慧，秀麗聰穎。' },
};
