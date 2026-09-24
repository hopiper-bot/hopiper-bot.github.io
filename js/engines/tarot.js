import { TAROT_CARDS } from '../data/tarot-cards.js';
import { calculate as calculateBazi } from './bazi.js';

const ZODIAC_SIGNS = [
  { name: '摩羯座', element: '土', from: [12, 22], to: [1, 19] },
  { name: '水瓶座', element: '風', from: [1, 20], to: [2, 18] },
  { name: '雙魚座', element: '水', from: [2, 19], to: [3, 20] },
  { name: '牡羊座', element: '火', from: [3, 21], to: [4, 19] },
  { name: '金牛座', element: '土', from: [4, 20], to: [5, 20] },
  { name: '雙子座', element: '風', from: [5, 21], to: [6, 21] },
  { name: '巨蟹座', element: '水', from: [6, 22], to: [7, 22] },
  { name: '獅子座', element: '火', from: [7, 23], to: [8, 22] },
  { name: '處女座', element: '土', from: [8, 23], to: [9, 22] },
  { name: '天秤座', element: '風', from: [9, 23], to: [10, 23] },
  { name: '天蠍座', element: '水', from: [10, 24], to: [11, 22] },
  { name: '射手座', element: '火', from: [11, 23], to: [12, 21] },
];

const ZODIAC_TONES = {
  火: '你習慣靠行動確認方向；今天先把牌意落成一個可執行的小動作，能量才不會只停在熱情。',
  土: '你重視可掌握的結果；今天把牌意放進現實節奏，不必一次到位，穩定調整就有效。',
  風: '你會從不同角度理解事情；今天別讓分析取代決定，選一個最重要的念頭去實驗。',
  水: '你很容易先感受到氣氛與情緒；今天尊重直覺，也記得用事實替感受找到邊界。',
};

const DAY_MASTER_TONES = {
  木: '木日主的你擅長成長與延伸。這張牌要你分辨：現在該繼續培養，還是修剪一條已經分散養分的枝線。',
  火: '火日主的你靠熱度與感染力推動事情。這張牌提醒你把光照向重點，不必燃燒自己來證明投入。',
  土: '土日主的你重承諾，也容易把責任留在身上。這張牌邀請你確認：哪些值得承接，哪些應該放回原位。',
  金: '金日主的你善於判斷、整理與定界線。這張牌要你在果斷之外，保留一點讓新答案進來的空間。',
  水: '水日主的你能讀懂變化、順勢找路。這張牌提醒你流動不等於沒有方向，今天需要替自己選一個出口。',
};

function toInt(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : NaN;
}

export function normalizeBirthData(input) {
  const birthData = input && typeof input === 'object' ? input : {};
  const year = toInt(birthData.year);
  const month = toInt(birthData.month);
  const day = toInt(birthData.day);
  const date = new Date(year, month - 1, day);
  const valid = year >= 1900 && year <= 2100
    && month >= 1 && month <= 12
    && day >= 1 && day <= 31
    && date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;

  if (!valid) throw new Error('請輸入有效的出生日期。');

  return {
    ...birthData,
    year,
    month,
    day,
    hour: Number.isInteger(Number(birthData.hour)) ? Number(birthData.hour) : -1,
    minute: Number.isInteger(Number(birthData.minute)) ? Number(birthData.minute) : 0,
    gender: birthData.gender === 'female' ? 'female' : 'male',
    utcOffset: Number.isFinite(Number(birthData.utcOffset)) ? Number(birthData.utcOffset) : 8,
  };
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getSunSign(month, day) {
  const point = month * 100 + day;
  if (point >= 1222 || point <= 119) return ZODIAC_SIGNS[0];
  return ZODIAC_SIGNS.find((sign) => {
    const from = sign.from[0] * 100 + sign.from[1];
    const to = sign.to[0] * 100 + sign.to[1];
    return point >= from && point <= to;
  }) || ZODIAC_SIGNS[0];
}

export function hashString(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getBirthFingerprint(input) {
  const birthData = normalizeBirthData(input);
  return `${birthData.year}-${String(birthData.month).padStart(2, '0')}-${String(birthData.day).padStart(2, '0')}`;
}

export function getBirthProfile(input) {
  const birthData = normalizeBirthData(input);
  const sunSign = getSunSign(birthData.month, birthData.day);
  let dayMaster = null;
  let dayMasterElement = null;

  try {
    const baziResult = calculateBazi(birthData);
    if (baziResult.status === 'ok' && baziResult.data) {
      dayMaster = baziResult.data.dayMaster;
      dayMasterElement = baziResult.data.dayMasterElem;
    }
  } catch (error) {
    // 塔羅仍可使用太陽星座完成個人化，不讓單一系統失敗阻斷頁面。
  }

  return { sunSign, dayMaster, dayMasterElement };
}

export function drawDailyTarot({ birthData: input, dateKey = getLocalDateKey() }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error('日期格式不正確。');

  const birthData = normalizeBirthData(input);
  const birthFingerprint = getBirthFingerprint(birthData);
  const seed = `destiny-tarot-v1|${dateKey}|${birthFingerprint}`;
  const card = TAROT_CARDS[hashString(`${seed}|card`) % TAROT_CARDS.length];
  const orientation = hashString(`${seed}|orientation`) % 100 < 70 ? 'upright' : 'reversed';
  const meaning = card[orientation];
  const profile = getBirthProfile(birthData);
  const isResonant = profile.sunSign.element === card.element;
  const resonance = isResonant
    ? `你的太陽星座與這張牌同屬「${card.element}」元素，今天的主題會更容易被你感受到；優點會被放大，過度反應也更明顯。`
    : `這張牌帶來「${card.element}」元素，與你太陽星座的「${profile.sunSign.element}」形成不同視角；今天最有價值的，正是嘗試不那麼習慣的反應。`;

  return {
    dateKey,
    birthFingerprint,
    card,
    orientation,
    orientationLabel: orientation === 'upright' ? '正位' : '逆位',
    meaning,
    profile,
    personalReading: {
      zodiac: `${profile.sunSign.name}｜${ZODIAC_TONES[profile.sunSign.element]}`,
      dayMaster: profile.dayMasterElement
        ? `${profile.dayMaster}${profile.dayMasterElement}日主｜${DAY_MASTER_TONES[profile.dayMasterElement]}`
        : '日主資料暫時無法取得，今天先以太陽星座完成個人化解讀。',
      resonance,
    },
  };
}

const QUESTION_POSITIONS = [
  { id: 'situation', label: '現況', prompt: '這張牌映照問題目前真正的核心。' },
  { id: 'blind-spot', label: '盲點', prompt: '這張牌提醒你可能忽略、壓抑或高估的部分。' },
  { id: 'guidance', label: '建議', prompt: '這張牌提供現在最值得採取的方向。' },
];

export function normalizeQuestion(value) {
  const question = String(value || '').trim().replace(/\s+/g, ' ');
  if (question.length < 2) throw new Error('請把想問的事情寫清楚一點。');
  if (question.length > 120) throw new Error('問題請控制在 120 字以內。');
  return question;
}

export function drawQuestionTarot({ birthData: input, question: rawQuestion, dateKey = getLocalDateKey() }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error('日期格式不正確。');

  const birthData = normalizeBirthData(input);
  const question = normalizeQuestion(rawQuestion);
  const birthFingerprint = getBirthFingerprint(birthData);
  const normalizedSeedQuestion = question.toLocaleLowerCase('zh-Hant');
  const seed = `destiny-tarot-question-v1|${dateKey}|${birthFingerprint}|${normalizedSeedQuestion}`;
  const usedCardIds = new Set();

  const spread = QUESTION_POSITIONS.map((position, index) => {
    let probe = 0;
    let card;
    do {
      card = TAROT_CARDS[hashString(`${seed}|card-${index}|${probe}`) % TAROT_CARDS.length];
      probe += 1;
    } while (usedCardIds.has(card.id));
    usedCardIds.add(card.id);

    const orientation = hashString(`${seed}|orientation-${index}`) % 100 < 70 ? 'upright' : 'reversed';
    return {
      position,
      card,
      orientation,
      orientationLabel: orientation === 'upright' ? '正位' : '逆位',
      meaning: card[orientation],
    };
  });

  const profile = getBirthProfile(birthData);
  const guidance = spread[2];
  return {
    dateKey,
    birthFingerprint,
    question,
    questionFingerprint: hashString(normalizedSeedQuestion).toString(36),
    spread,
    profile,
    personalReading: {
      zodiac: `${profile.sunSign.name}｜${ZODIAC_TONES[profile.sunSign.element]}`,
      dayMaster: profile.dayMasterElement
        ? `${profile.dayMaster}${profile.dayMasterElement}日主｜${DAY_MASTER_TONES[profile.dayMasterElement]}`
        : '日主資料暫時無法取得，這次先以太陽星座完成個人化解讀。',
      finalAction: guidance.meaning.action,
      finalReflection: guidance.meaning.reflection,
    },
  };
}
