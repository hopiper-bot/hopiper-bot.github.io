/**
 * name.js — 姓名學引擎（熊崎氏五格剖象 + 三才 + 八字五行補救）
 *
 * 三層內容：
 *   1. 五格：天格、人格、地格、外格、總格 → 81 靈動數
 *   2. 三才：天／人／地 三格的五行生剋
 *   3. 整合：跟現有八字引擎的「用神／喜神」比對，看名字有沒有補到本命的缺
 *      再算人格五行對日主的十神關係 → 名字對你本人是什麼角色
 *
 * 筆劃一律用康熙筆劃（見 data/strokes.js），不是手寫筆劃。
 *
 * 對外介面：
 *   calculate({ surname, given }, baziData?) → { status, data, html, error }
 *   splitName(fullName) → { surname, given }   // 複姓自動辨識
 */

import { STROKE_GROUPS, S2T_ONE, S2T_MANY } from '../data/strokes.js';
import {
  LUCK81, GRID_META, ELEMENT_TRAIT, REL_TEXT, SANCAI_LEVEL, COMPOUND_SURNAMES,
} from '../data/name-text.js';

// ============ 五行基礎 ============

// 相生順序：木→火→土→金→水→木
const ELEMENT_CYCLE = ['木', '火', '土', '金', '水'];

/** 筆劃尾數 → 五行（1,2木 3,4火 5,6土 7,8金 9,0水） */
function numToElement(n) {
  return ELEMENT_CYCLE[Math.floor((((n % 10) + 9) % 10) / 2)];
}

/** a 生 b？ */
function generates(a, b) {
  return ELEMENT_CYCLE[(ELEMENT_CYCLE.indexOf(a) + 1) % 5] === b;
}

/** a 剋 b？ */
function overcomes(a, b) {
  return ELEMENT_CYCLE[(ELEMENT_CYCLE.indexOf(a) + 2) % 5] === b;
}

/** a 對 b 的關係：同／生／被生／剋／被剋 */
function relation(a, b) {
  if (a === b) return '同';
  if (generates(a, b)) return '生';
  if (generates(b, a)) return '被生';
  if (overcomes(a, b)) return '剋';
  return '被剋';
}

// ============ 筆劃查表 ============

let _strokeMap = null;

/** 把「按筆劃分組的字串」展開成 Map（只做一次） */
function strokeMap() {
  if (_strokeMap) return _strokeMap;
  _strokeMap = new Map();
  for (const [n, chars] of Object.entries(STROKE_GROUPS)) {
    const num = parseInt(n, 10);
    for (const ch of chars) _strokeMap.set(ch, num);
  }
  return _strokeMap;
}

/**
 * 查單字的康熙筆劃
 * @returns {number|null} 查不到回 null
 */
export function strokesOf(ch) {
  return strokeMap().get(ch) ?? null;
}

// ============ 簡體字處理 ============

/**
 * 簡體字必須先轉正體才能算，否則會安靜地算錯 ——
 * 簡體字在康熙字典多半也查得到筆劃，但那個數字不是姓名學要的：
 *   陈 13 劃 vs 陳 16 劃、刘 6 劃 vs 劉 15 劃、叶 5 劃 vs 葉 15 劃
 *
 * 一對一的直接轉並回報；一對多的不亂猜，交給使用者選。
 *
 * @returns {{ text: string, converted: Array<{from,to}>, ambiguous: Array<{from,options}> }}
 */
export function normalizeToTraditional(str) {
  const converted = [];
  const ambiguous = [];
  let text = '';
  for (const ch of [...(str || '')]) {
    if (S2T_MANY[ch]) {
      ambiguous.push({ from: ch, options: [...S2T_MANY[ch]] });
      text += ch;
    } else if (S2T_ONE[ch]) {
      converted.push({ from: ch, to: S2T_ONE[ch] });
      text += S2T_ONE[ch];
    } else {
      text += ch;
    }
  }
  return { text, converted, ambiguous };
}

// ============ 姓名切分 ============

/**
 * 把完整姓名切成姓／名（複姓自動辨識）
 * 使用者仍可在 UI 手動調整，這裡只做合理猜測。
 */
export function splitName(fullName) {
  const chars = [...(fullName || '').replace(/\s/g, '')];
  if (chars.length === 0) return { surname: '', given: '' };
  if (chars.length >= 3) {
    const first2 = chars.slice(0, 2).join('');
    if (COMPOUND_SURNAMES.includes(first2)) {
      return { surname: first2, given: chars.slice(2).join('') };
    }
  }
  return { surname: chars[0], given: chars.slice(1).join('') };
}

// ============ 81 靈動數 ============

/** 超過 81 減 80 循環（傳統做法） */
function luck(n) {
  let v = n;
  while (v > 81) v -= 80;
  if (v < 1) v = 1;
  return { n: v, raw: n, ...LUCK81[v] };
}

/** 吉凶標記 → 分數（供取名建議排序用） */
const TAG_SCORE = {
  大吉: 3, 吉: 2, 半吉: 1, 吉帶凶: 0, 凶帶吉: 0, 凶: -2, 大凶: -3,
};

// ============ 五格計算 ============

/**
 * 熊崎氏五格
 * 規則分四種情況處理，不用單一公式硬套 —— 單名和複姓的「假添一」規則不一樣，
 * 用通用公式會算錯（這也是很多線上工具出錯的地方）。
 *
 * @param {number[]} s 姓各字筆劃
 * @param {number[]} g 名各字筆劃
 */
function fiveGrids(s, g) {
  const sSum = s.reduce((a, b) => a + b, 0);
  const gSum = g.reduce((a, b) => a + b, 0);
  const zong = sSum + gSum;
  const sLast = s[s.length - 1];
  const compound = s.length >= 2;
  const singleGiven = g.length === 1;

  let tian, ren, di, wai, rule;

  if (!compound) {
    // 單姓
    tian = s[0] + 1;                        // 假添一
    ren = s[0] + g[0];
    if (singleGiven) {
      di = g[0] + 1;                        // 名也假添一
      wai = 2;                              // 單姓單名固定 2
      rule = '單姓單名（天格、地格各假添一，外格固定為 2）';
    } else {
      di = gSum;
      wai = zong - ren + 1;
      rule = '單姓複名（天格假添一）';
    }
  } else {
    // 複姓
    tian = sSum;
    ren = sLast + g[0];
    if (singleGiven) {
      di = g[0] + 1;
      wai = s[0] + 1;
      rule = '複姓單名（地格假添一）';
    } else {
      di = gSum;
      wai = zong - ren;
      rule = '複姓複名（不假添一）';
    }
  }

  return { tian, ren, di, wai, zong, rule };
}

/** 把五格數字包成含 81 數與五行的物件 */
function decorate(grids) {
  const out = {};
  for (const key of ['tian', 'ren', 'di', 'wai', 'zong']) {
    const n = grids[key];
    out[key] = { key, n, luck: luck(n), elem: numToElement(n), meta: GRID_META[key] };
  }
  out.rule = grids.rule;
  return out;
}

// ============ 三才 ============

function sancai(grids) {
  const t = grids.tian.elem;
  const r = grids.ren.elem;
  const d = grids.di.elem;

  const tianRenRel = relation(t, r);
  const renDiRel = relation(r, d);
  const a = REL_TEXT.tianRen[tianRenRel];
  const b = REL_TEXT.renDi[renDiRel];

  const goodCount = [a.level, b.level].filter(l => l === 'good').length;
  const level = goodCount === 2 ? 'good' : goodCount === 1 ? 'mixed' : 'hard';

  return {
    combo: `${t}${r}${d}`,
    tian: t, ren: r, di: d,
    tianRenRel, renDiRel,
    tianRenText: a.text, renDiText: b.text,
    level, levelInfo: SANCAI_LEVEL[level],
  };
}

// ============ 八字整合 ============

const ZODIAC = {
  子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龍', 巳: '蛇',
  午: '馬', 未: '羊', 申: '猴', 酉: '雞', 戌: '狗', 亥: '豬',
};

/** 人格五行對日主的十神角色 */
function tenGodRole(dayElem, nameElem) {
  const rel = relation(dayElem, nameElem);
  const map = {
    同: {
      god: '比肩／劫財',
      text: '名字跟你本命同一個五行，是「加強版的你自己」。優點是性格很一致、辨識度高；代價是原本的偏向也會被放大，該收的地方不容易收。',
    },
    生: {
      god: '食神／傷官',
      text: '名字把你往「表達和創造」的方向推。你會比八字原本更愛輸出、更想被看見，適合走需要作品和發聲的路。要注意能量外洩過多會累。',
    },
    被生: {
      god: '正印／偏印',
      text: '名字是你的靠山。它給你學習力、貴人和心理支撐，是五種關係裡最「養」你的一種。要注意的是靠山太舒服，容易少了向外衝的動力。',
    },
    剋: {
      god: '正財／偏財',
      text: '名字讓你更務實、更會追求實際成果。你比八字原本更懂得把想法換成錢和資源。代價是容易一直在追，忘了停下來。',
    },
    被剋: {
      god: '正官／七殺',
      text: '名字給你紀律和壓力。它會逼你自律、守規矩、把事情做完，成就感來得比別人扎實。代價是內在標準很高，容易對自己嚴厲。',
    },
  };
  return { rel, ...map[rel] };
}

/**
 * 名字 × 八字：五行補救判定
 * @param {object} grids decorate() 的輸出
 * @param {object} baziData bazi.js calculate() 的 data
 */
function baziMatch(grids, baziData) {
  const ys = baziData.yongshen || {};
  const { yongshen, xishen, jishen, choushen, strength } = ys;
  const dayElem = baziData.dayMasterElem;

  // 名字帶的五行（五格各一票，人格算兩票 —— 人格是主運）
  const nameElements = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  ['tian', 'ren', 'di', 'wai', 'zong'].forEach(k => {
    nameElements[grids[k].elem] += (k === 'ren' ? 2 : 1);
  });

  const renElem = grids.ren.elem;
  const hasYong = nameElements[yongshen] > 0;
  const hasXi = xishen ? nameElements[xishen] > 0 : false;
  const renIsYong = renElem === yongshen;
  const renIsXi = renElem === xishen;
  const renIsJi = jishen ? renElem === jishen : false;

  // 補救評級
  let verdict, verdictText;
  if (renIsYong) {
    verdict = 'best';
    verdictText = `人格正好是用神「${yongshen}」。這是最有力的補法 —— 主運那一格直接補在本命最需要的地方，名字跟八字是同一個方向。`;
  } else if (renIsXi) {
    verdict = 'good';
    verdictText = `人格是喜神「${xishen}」。雖然不是最需要的那一味，但方向對，屬於幫得上忙的配置。`;
  } else if (hasYong || hasXi) {
    const which = [hasYong ? `用神「${yongshen}」` : '', hasXi ? `喜神「${xishen}」` : ''].filter(Boolean).join('、');
    verdict = 'ok';
    verdictText = `五格裡有帶到${which}，但不在人格（主運）上。補得到，力道比較溫和 —— 會在特定人生階段或特定場合發揮。`;
  } else if (renIsJi) {
    verdict = 'weak';
    verdictText = `人格是忌神「${jishen}」，名字沒補到本命缺的地方，反而加強了已經過多的那一邊。這不代表名字不好 —— 五格本身的吉凶是另一回事 —— 而是它幫不上八字的忙，你得靠環境和習慣自己補。`;
  } else {
    verdict = 'neutral';
    verdictText = `五格沒帶到用神「${yongshen}」，但也沒踩到忌神。名字對八字算中性，影響主要看五格本身的組合。`;
  }

  // 怎麼自己補
  const supplement = {
    木: '多接觸植物和綠色、往東邊走、做需要長期栽培的事（帶人、種東西、寫長篇）。',
    火: '曬太陽、穿暖色、往南邊走、做需要曝光和表達的事（分享、教學、上台）。',
    土: '接地（走路、園藝）、穿大地色、待在中部或平原、做需要累積和守成的事。',
    金: '整理和斷捨離、穿白色金屬色、往西邊走、做需要決斷和標準的事。',
    水: '靠水（游泳、泡湯、海邊）、穿深藍黑、往北邊走、多讀書和移動。',
  };

  const zodiac = baziData.pillars?.year?.branch ? ZODIAC[baziData.pillars.year.branch] : null;

  return {
    strength, yongshen, xishen, jishen, choushen, dayElem,
    timeAssumed: !!baziData._timeAssumed,
    dayMaster: baziData.dayMaster,
    baziElements: baziData.elements,
    nameElements,
    renElem,
    verdict, verdictText,
    supplement: supplement[yongshen] || '',
    role: tenGodRole(dayElem, renElem),
    zodiac,
  };
}

// ============ 取名／改名建議 ============

/**
 * 給定姓，掃出五格最順的名字筆劃組合
 * 天格由姓決定、改不了，所以不列入評分。
 * @returns {Array<{n1,n2,score,ren,di,wai,zong,sancai}>}
 */
function suggestCombos(s, need) {
  const results = [];
  // 1~2 劃的字幾乎沒人拿來取名（一、乙、丁…），列出來只是佔位；
  // 24 劃以上的字太罕見，寫起來也麻煩。
  const MIN = 3;
  const MAX = 24;

  for (let n1 = MIN; n1 <= MAX; n1++) {
    for (let n2 = MIN; n2 <= MAX; n2++) {
      const grids = decorate(fiveGrids(s, [n1, n2]));
      const sc = sancai(grids);

      // 加權順序照傳統的看重程度：人格 > 三才 > 總格 > 地格 > 外格。
      // 三才給的權重刻意偏高 —— 命理師排名字時三才不順通常直接刷掉，
      // 不會因為五格數字漂亮就放行。
      let score =
        TAG_SCORE[grids.ren.luck.tag] * 3 +
        TAG_SCORE[grids.zong.luck.tag] * 2 +
        TAG_SCORE[grids.di.luck.tag] * 1.5 +
        TAG_SCORE[grids.wai.luck.tag] * 1;

      score += sc.level === 'good' ? 8 : sc.level === 'mixed' ? 2 : -6;

      // 有八字資料就把用神補救也算進去
      if (need) {
        if (grids.ren.elem === need.yongshen) score += 5;
        else if (grids.ren.elem === need.xishen) score += 3;
        else if (need.jishen && grids.ren.elem === need.jishen) score -= 3;
      }

      results.push({
        n1, n2, score,
        ren: grids.ren, di: grids.di, wai: grids.wai, zong: grids.zong,
        sancai: sc,
      });
    }
  }

  results.sort((a, b) => b.score - a.score || (a.n1 + a.n2) - (b.n1 + b.n2));

  // 讓建議有變化：同一個首字筆劃最多出兩組，避免整張表都是「3＋x」
  const picked = [];
  const n1Count = {};
  for (const r of results) {
    if (picked.length >= 8) break;
    if ((n1Count[r.n1] || 0) >= 2) continue;
    if (picked.some(p => p.n1 === r.n1 && Math.abs(p.n2 - r.n2) <= 2)) continue;
    n1Count[r.n1] = (n1Count[r.n1] || 0) + 1;
    picked.push(r);
  }
  return picked;
}

// ============ 主計算 ============

/**
 * @param {{surname:string, given:string}} input
 * @param {object|null} baziData bazi.js 的 data（可選，有就做五行補救分析）
 */
export function calculate(input, baziData = null) {
  try {
    const rawSurname = (input?.surname || '').replace(/\s/g, '');
    const rawGiven = (input?.given || '').replace(/\s/g, '');

    if (!rawSurname) return { status: 'error', data: null, html: '', error: '請輸入姓氏' };
    if (!rawGiven) return { status: 'error', data: null, html: '', error: '請輸入名字' };

    // 簡體先轉正體（姓名學一定要用正體筆劃）
    const ns = normalizeToTraditional(rawSurname);
    const ng = normalizeToTraditional(rawGiven);
    const ambiguous = [...ns.ambiguous, ...ng.ambiguous];
    if (ambiguous.length > 0) {
      const list = ambiguous.map(a => `「${a.from}」可能是 ${a.options.join(' 或 ')}`).join('；');
      return {
        status: 'error', data: null, html: '',
        error: `${list}。這個簡體字對應多個正體字，筆劃不一樣，我不猜 —— 請直接輸入你要的正體字。`,
      };
    }
    const converted = [...ns.converted, ...ng.converted];
    const surname = ns.text;
    const given = ng.text;

    const sChars = [...surname];
    const gChars = [...given];
    if (sChars.length > 3 || gChars.length > 3) {
      return { status: 'error', data: null, html: '', error: '姓和名各限 3 個字以內' };
    }

    // 查筆劃，記下查不到的字
    const all = [...sChars, ...gChars].map(ch => ({ ch, strokes: strokesOf(ch) }));
    const missing = all.filter(x => x.strokes === null).map(x => x.ch);
    if (missing.length > 0) {
      return {
        status: 'error', data: null, html: '',
        error: `查不到「${missing.join('、')}」的康熙筆劃。這通常是簡體字、罕用字或非漢字 —— 姓名學要用正體字才算得準，請改用正體字輸入。`,
      };
    }

    const s = sChars.map(ch => strokesOf(ch));
    const g = gChars.map(ch => strokesOf(ch));

    const grids = decorate(fiveGrids(s, g));
    const sc = sancai(grids);

    const bz = (baziData && baziData.yongshen && baziData.dayMasterElem)
      ? baziMatch(grids, baziData)
      : null;

    const suggestions = suggestCombos(s, bz);

    const data = {
      surname, given,
      rawSurname, rawGiven, converted,
      chars: all,
      surnameStrokes: s, givenStrokes: g,
      grids, sancai: sc, bazi: bz, suggestions,
    };

    return { status: 'ok', data, html: render(data), error: null };
  } catch (err) {
    return { status: 'error', data: null, html: '', error: `姓名學計算錯誤：${err.message}` };
  }
}

// ============ 渲染 ============

const TONE_CLASS = { good: 'nm-good', mixed: 'nm-mixed', hard: 'nm-hard' };

function render(d) {
  return `
    ${d.converted.length > 0 ? `<div class="nm-notice">📝 偵測到簡體字，已自動轉成正體再算：${d.converted.map(c => `${c.from} → <b>${c.to}</b>`).join('、')}。姓名學的筆劃一定要用正體字，用簡體會整盤算錯。</div>` : ''}
    ${renderHeader(d)}
    ${renderGrids(d)}
    <div class="divider"></div>
    ${renderSancai(d)}
    <div class="divider"></div>
    ${renderBazi(d)}
    <div class="divider"></div>
    ${renderSuggest(d)}
    <div class="note">
      💡 <b>關於筆劃</b>：這裡用的是<b>康熙字典筆劃</b>，跟手寫筆劃不一樣。例如陳＝阜(8)＋8＝16、華＝艸(6)＋8＝14、江＝水(4)＋3＝7。
      姓名學算的就是這一套，用手寫筆劃算出來的五格全部會偏。<br><br>
      💡 <b>關於吉凶</b>：81 靈動數的傳統說法很重（「大凶」「破家」之類），但名字通常改不了，丟結論沒有幫助。
      這裡一律改寫成「性格傾向 ＋ 要練的課題」，原始標記保留在旁邊給你參考。凡事本無吉凶，端看自己如何詮釋。
    </div>
  `;
}

function renderHeader(d) {
  const chars = d.chars.map(c =>
    `<span class="nm-char"><b>${c.ch}</b><small>${c.strokes}</small></span>`
  ).join('');
  const ren = d.grids.ren;
  return `
    <div class="sig">
      <div class="kin">熊崎氏五格 · 康熙筆劃</div>
      <div class="big" style="font-size:1.4rem;">${d.surname}${d.given}</div>
      <div class="nm-chars">${chars}</div>
      <div style="font-size:.82rem;color:var(--muted);margin-top:8px;">
        主運（人格）<b style="color:var(--accent);">${ren.n} 劃 · ${ren.elem}</b> · ${ren.luck.title}
      </div>
    </div>
  `;
}

function renderGrids(d) {
  const order = ['ren', 'zong', 'di', 'wai', 'tian'];
  const cards = order.map(k => {
    const gr = d.grids[k];
    const cls = TONE_CLASS[gr.luck.tone];
    const star = k === 'ren' ? ' nm-primary' : '';
    return `
      <div class="nm-grid-card${star}" data-nm-toggle="nm-detail-${k}">
        <div class="nm-grid-top">
          <span class="nm-grid-name">${gr.meta.icon} ${gr.meta.zh}</span>
          <span class="nm-grid-span">${gr.meta.span}</span>
        </div>
        <div class="nm-grid-num">${gr.n}<small>劃</small></div>
        <div class="nm-grid-elem ${cls}">${ELEMENT_TRAIT[gr.elem].icon} ${gr.elem} · ${gr.luck.title}</div>
        <div class="nm-grid-tag ${cls}">${gr.luck.tag}</div>
      </div>
      <div class="nm-detail" id="nm-detail-${k}">
        <b>${gr.meta.zh}　${gr.n} 劃${gr.luck.raw !== gr.luck.n ? `（${gr.luck.raw} 超過 81，減 80 取 ${gr.luck.n}）` : ''}</b><br>
        <span style="color:var(--muted);">${gr.meta.desc}</span><br><br>
        <b>${gr.luck.n} · ${gr.luck.title}</b>（傳統標記：${gr.luck.tag}）<br>${gr.luck.text}<br><br>
        <b>五行 ${gr.elem}　${ELEMENT_TRAIT[gr.elem].kw}</b><br>${ELEMENT_TRAIT[gr.elem].text}
      </div>
    `;
  }).join('');

  return `
    <h3>🧮 五格</h3>
    <p class="meaning">${d.surname}（${d.surnameStrokes.join('＋')}）＋ ${d.given}（${d.givenStrokes.join('＋')}）
    ＝ 總筆劃 <span class="kw">${d.grids.zong.n}</span>。計算方式：${d.grids.rule}。點卡片看詳解 ▼</p>
    <div class="nm-grid-wrap">${cards}</div>
  `;
}

function renderSancai(d) {
  const sc = d.sancai;
  const chain = [
    { label: '天', elem: sc.tian },
    { label: '人', elem: sc.ren },
    { label: '地', elem: sc.di },
  ].map(x => `<span class="nm-sancai-node">${ELEMENT_TRAIT[x.elem].icon}<b>${x.elem}</b><small>${x.label}格</small></span>`)
    .join(`<span class="nm-sancai-arrow">→</span>`);

  return `
    <h3>🔺 三才配置：${sc.combo}　<span class="nm-tag ${TONE_CLASS[sc.level]}">${sc.levelInfo.label}</span></h3>
    <div class="nm-sancai">${chain}</div>
    <p class="meaning">${sc.levelInfo.text}</p>
    <div class="nm-rel">
      <div><b>天格 ${sc.tian} ${sc.tianRenRel} 人格 ${sc.ren}</b><br>${sc.tianRenText}</div>
      <div><b>人格 ${sc.ren} ${sc.renDiRel} 地格 ${sc.di}</b><br>${sc.renDiText}</div>
    </div>
  `;
}

function renderBazi(d) {
  const b = d.bazi;
  if (!b) {
    return `
      <h3>🔗 跟你的本命合起來看</h3>
      <p class="meaning">姓名學單獨看只有一半。填了出生資料之後，這裡會多出三段分析：</p>
      <ul class="nm-list">
        <li><b>五行補救</b> — 你八字缺的那一味，名字有沒有補到</li>
        <li><b>名字對你的角色</b> — 人格五行對日主的十神關係（是靠山、是壓力、還是推你往外衝）</li>
        <li><b>取名建議會更準</b> — 下面的筆劃建議會把用神一起算進去</li>
      </ul>
      <p style="text-align:center;margin-top:14px;">
        <a href="index.html" class="btn-primary" style="display:inline-block;text-decoration:none;">去填出生資料 ✦</a>
      </p>
    `;
  }

  const VERDICT = {
    best: { label: '補得最到位', cls: 'nm-good' },
    good: { label: '方向對', cls: 'nm-good' },
    ok: { label: '有補到，力道溫和', cls: 'nm-mixed' },
    neutral: { label: '中性', cls: 'nm-mixed' },
    weak: { label: '沒補到', cls: 'nm-hard' },
  }[b.verdict];

  // 五行對照條：八字原局 vs 名字帶的
  const maxBazi = Math.max(1, ...Object.values(b.baziElements));
  const maxName = Math.max(1, ...Object.values(b.nameElements));
  const bars = ELEMENT_CYCLE.map(el => {
    const bw = Math.round((b.baziElements[el] / maxBazi) * 100);
    const nw = Math.round((b.nameElements[el] / maxName) * 100);
    const role = el === b.yongshen ? '用神' : el === b.xishen ? '喜神'
      : el === b.jishen ? '忌神' : el === b.choushen ? '仇神' : '';
    const roleCls = (el === b.yongshen || el === b.xishen) ? 'nm-good'
      : (el === b.jishen || el === b.choushen) ? 'nm-hard' : '';
    return `
      <div class="nm-bar-row">
        <span class="nm-bar-label">${ELEMENT_TRAIT[el].icon} ${el}${role ? `<em class="${roleCls}">${role}</em>` : ''}</span>
        <span class="nm-bar-track"><i style="width:${bw}%"></i><span>${b.baziElements[el]}</span></span>
        <span class="nm-bar-track nm-bar-name"><i style="width:${nw}%"></i><span>${b.nameElements[el] || '–'}</span></span>
      </div>
    `;
  }).join('');

  return `
    <h3>🔗 名字 × 你的八字</h3>
    <p class="meaning">
      你的日主是 <span class="kw">${b.dayMaster}（${b.dayElem}）</span>，命局 <span class="kw">${b.strength}</span>，
      用神取 <span class="kw">${b.yongshen}</span>${b.xishen ? `、喜神 <span class="kw">${b.xishen}</span>` : ''}
      ${b.zodiac ? `　·　生肖 <span class="kw">${b.zodiac}</span>（以立春為界）` : ''}
    </p>

    ${b.timeAssumed ? `<div class="nm-notice">⚠️ 你沒填出生時間，這裡用中午 12 點推算。時柱會影響身強／身弱的判定，用神有可能不一樣 —— 下面關於「補救」的結論請當參考，知道出生時間後回首頁補上會準得多。</div>` : ''}

    <div class="nm-verdict ${VERDICT.cls}">
      <div class="nm-verdict-label">五行補救：${VERDICT.label}</div>
      <div>${b.verdictText}</div>
    </div>

    <div class="nm-bars">
      <div class="nm-bar-head"><span></span><span>八字原局</span><span>名字五格</span></div>
      ${bars}
    </div>
    <p class="source-hint">左邊是八字裡各五行的數量（含藏干），右邊是五格帶的五行（人格算兩票，因為它是主運）。</p>

    <div class="script-section">
      <div class="script-title">🎭 名字對你本人是什麼角色：${b.role.god}</div>
      <div class="script-body">
        人格五行 <b>${b.renElem}</b> 對日主 <b>${b.dayElem}</b> 的關係是「<b>${b.role.rel}</b>」。<br><br>
        ${b.role.text}
      </div>
    </div>

    ${b.verdict === 'weak' || b.verdict === 'neutral' ? `
    <div class="script-section">
      <div class="script-title">🛠 名字沒補到，可以這樣自己補</div>
      <div class="script-body">要補的是 <b>${b.yongshen}</b>：${b.supplement}<br><br>
      五行不是只能靠名字補。環境、習慣、往哪個方向走、做什麼類型的工作，影響都比名字直接。</div>
    </div>` : ''}
  `;
}

function renderSuggest(d) {
  const rows = d.suggestions.map(r => `
    <tr>
      <td><b>${r.n1}＋${r.n2}</b></td>
      <td>${r.ren.n}<small> ${r.ren.elem}</small></td>
      <td>${r.di.n}</td>
      <td>${r.wai.n}</td>
      <td>${r.zong.n}</td>
      <td><span class="nm-tag ${TONE_CLASS[r.sancai.level]}">${r.sancai.combo}</span></td>
      <td style="color:var(--muted);font-size:.78rem;">${r.ren.luck.title}</td>
    </tr>
  `).join('');

  const withBazi = !!d.bazi;

  return `
    <h3>✍️ 如果要取名或改名</h3>
    <p class="meaning">
      姓「${d.surname}」（${d.surnameStrokes.join('＋')} 劃）是固定的，天格改不了。
      下面是配這個姓最順的<b>名字筆劃組合</b>（雙名），評分把人格、總格、地格、外格的吉凶和三才配置都算進去
      ${withBazi ? `，<b>並且把你八字的用神「${d.bazi.yongshen}」一起加權</b>` : ''}。
    </p>
    <div class="nm-table-wrap">
      <table class="nm-table">
        <thead><tr><th>名筆劃</th><th>人格</th><th>地格</th><th>外格</th><th>總格</th><th>三才</th><th>主運</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="source-hint">
      用法：挑一組筆劃，再去找符合那個筆劃的字。記得筆劃要用康熙筆劃查（例如 12 劃的「凱」、11 劃的「彬」）。
      ${withBazi ? '' : '填了出生資料之後，這張表會把八字用神一起考慮，建議會更貼你。'}
    </p>
  `;
}
