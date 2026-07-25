/**
 * synthesis.js — 人生劇本大綱
 * 
 * 從五個命理系統提取核心主題，交叉比對找出共振點，
 * 生成一份統一的「人生劇本」敘事。
 * 
 * 核心邏輯：
 * 1. 每個系統抽出「主題標籤」(themes)
 * 2. 統計主題出現頻率（≥3 系統 = 核心主題、2 系統 = 支持主題）
 * 3. 根據主題組合生成劇本大綱
 */

// ============ 主題標籤定義 ============

const THEME_DEFS = {
  // 天賦與特質
  leadership:    { zh: '領導力', icon: '👑', desc: '你天生有帶領他人的能力' },
  intuition:     { zh: '直覺力', icon: '🔮', desc: '你的第六感是你最可靠的指引' },
  creativity:    { zh: '創造力', icon: '🎨', desc: '你需要透過創造來表達自己' },
  communication: { zh: '溝通表達', icon: '🗣️', desc: '你的話語有影響力' },
  caregiving:    { zh: '照顧滋養', icon: '🤲', desc: '照顧他人是你的天職' },
  wealth:        { zh: '財富能量', icon: '💰', desc: '你與金錢有天生的緣分' },
  independence:  { zh: '獨立自主', icon: '🦅', desc: '你需要自己的空間和自由' },
  wisdom:        { zh: '智慧深度', icon: '📚', desc: '你透過學習和反思獲得力量' },
  action:        { zh: '行動力', icon: '⚡', desc: '你有強大的執行和推動能力' },
  emotional:     { zh: '情緒智慧', icon: '🌊', desc: '你的情緒波動是你的導航系統' },
  transformation:{ zh: '轉化蛻變', icon: '🦋', desc: '你的人生有重大的轉折和重生' },
  service:       { zh: '服務奉獻', icon: '🙏', desc: '你透過幫助他人找到人生意義' },
  resilience:    { zh: '韌性毅力', icon: '💎', desc: '你越挫越勇，逆境是你的養分' },
  magnetism:     { zh: '人際吸引', icon: '🧲', desc: '你天生吸引人靠近' },
  authenticity:  { zh: '做自己', icon: '✨', desc: '你的人生功課就是忠於自己' },
  patience:      { zh: '等待時機', icon: '⏳', desc: '正確的時機比行動更重要' },
  strategy:      { zh: '策略思維', icon: '♟️', desc: '你善於規劃和佈局' },
  family:        { zh: '家族責任', icon: '🏠', desc: '家庭和傳承是你的重要主題' },
};

// ============ 各系統主題提取 ============

/** 從八字提取主題 */
function extractBaziThemes(data) {
  if (!data) return [];
  const themes = [];
  const { dayMasterElem, elements, tenGods, dayun, shensha } = data;
  
  // 日主五行特質
  const elemTraits = {
    '木': ['creativity', 'independence', 'action'],
    '火': ['leadership', 'communication', 'action'],
    '土': ['caregiving', 'patience', 'family'],
    '金': ['independence', 'resilience', 'strategy'],
    '水': ['wisdom', 'intuition', 'communication'],
  };
  if (elemTraits[dayMasterElem]) {
    themes.push(...elemTraits[dayMasterElem].map(t => ({ theme: t, source: '八字日主', weight: 2 })));
  }
  
  // 十神特質
  if (tenGods) {
    const godThemes = {
      '比肩': ['independence', 'resilience'],
      '劫財': ['action', 'independence'],
      '食神': ['creativity', 'communication'],
      '傷官': ['creativity', 'independence', 'communication'],
      '正財': ['wealth', 'patience'],
      '偏財': ['wealth', 'magnetism'],
      '正官': ['leadership', 'family'],
      '七殺': ['action', 'transformation', 'resilience'],
      '正印': ['wisdom', 'caregiving'],
      '偏印': ['intuition', 'wisdom', 'independence'],
    };
    for (const tg of tenGods) {
      if (godThemes[tg.god]) {
        themes.push(...godThemes[tg.god].map(t => ({ theme: t, source: `八字${tg.god}`, weight: 1 })));
      }
    }
  }
  
  // 神煞
  if (shensha) {
    const shenshaThemes = {
      '天乙貴人': ['magnetism'],
      '文昌': ['wisdom', 'communication'],
      '華蓋': ['intuition', 'independence', 'wisdom'],
      '驛馬': ['action', 'independence'],
      '桃花': ['magnetism'],
      '將星': ['leadership'],
      '天德': ['service'],
      '月德': ['caregiving'],
      '金輿': ['wealth'],
      '天廚': ['wealth'],
    };
    for (const ss of shensha) {
      if (shenshaThemes[ss.name]) {
        themes.push(...shenshaThemes[ss.name].map(t => ({ theme: t, source: `八字${ss.name}`, weight: 1 })));
      }
    }
  }
  
  return themes;
}

/** 從紫微斗數提取主題 */
function extractZiweiThemes(data) {
  if (!data) return [];
  const themes = [];
  
  // 命宮主星特質
  if (data.palaces) {
    const mingPalace = data.palaces.find(p => p.pos === data.mingPos);
    if (mingPalace && mingPalace.main) {
      const starThemes = {
        '紫微': ['leadership', 'independence', 'magnetism'],
        '天機': ['wisdom', 'strategy', 'intuition'],
        '太陽': ['leadership', 'communication', 'service'],
        '武曲': ['wealth', 'action', 'resilience'],
        '天同': ['patience', 'emotional', 'caregiving'],
        '廉貞': ['action', 'transformation', 'independence'],
        '天府': ['wealth', 'leadership', 'family'],
        '太陰': ['intuition', 'emotional', 'wisdom'],
        '貪狼': ['magnetism', 'creativity', 'action'],
        '巨門': ['communication', 'wisdom', 'independence'],
        '天相': ['service', 'strategy', 'caregiving'],
        '天梁': ['wisdom', 'caregiving', 'service'],
        '七殺': ['action', 'independence', 'transformation'],
        '破軍': ['transformation', 'action', 'resilience'],
      };
      for (const star of mingPalace.main) {
        const name = (typeof star === 'string') ? star.replace(/[（(].+/, '').trim() : (star.name || '');
        if (starThemes[name]) {
          themes.push(...starThemes[name].map(t => ({ theme: t, source: `紫微命宮${name}`, weight: 2 })));
        }
      }
    }
    
    // 財帛宮主星
    const caiPos = (data.mingPos + 4) % 12;
    const caiPalace = data.palaces.find(p => p.pos === caiPos);
    if (caiPalace && caiPalace.main) {
      for (const star of caiPalace.main) {
        const name = (typeof star === 'string') ? star.replace(/[（(].+/, '').trim() : (star.name || '');
        if (['武曲', '天府', '太陰', '貪狼'].includes(name)) {
          themes.push({ theme: 'wealth', source: `紫微財帛宮${name}`, weight: 1 });
        }
      }
    }
  }
  
  // 四化
  if (data.sihua) {
    if (data.sihua.lu) themes.push({ theme: 'wealth', source: `紫微化祿(${data.sihua.lu})`, weight: 1 });
    if (data.sihua.quan) themes.push({ theme: 'leadership', source: `紫微化權(${data.sihua.quan})`, weight: 1 });
    if (data.sihua.ke) themes.push({ theme: 'wisdom', source: `紫微化科(${data.sihua.ke})`, weight: 1 });
    if (data.sihua.ji) themes.push({ theme: 'transformation', source: `紫微化忌(${data.sihua.ji})`, weight: 1 });
  }
  
  return themes;
}

/** 從西洋占星提取主題 */
function extractAstroThemes(data) {
  if (!data) return [];
  const themes = [];
  
  // 太陽星座特質
  const signThemes = {
    '白羊座': ['action', 'leadership', 'independence'],
    '金牛座': ['wealth', 'patience', 'resilience'],
    '雙子座': ['communication', 'wisdom', 'strategy'],
    '巨蟹座': ['caregiving', 'emotional', 'family'],
    '獅子座': ['leadership', 'creativity', 'magnetism'],
    '處女座': ['service', 'wisdom', 'strategy'],
    '天秤座': ['magnetism', 'communication', 'strategy'],
    '天蠍座': ['transformation', 'intuition', 'resilience'],
    '射手座': ['wisdom', 'independence', 'action'],
    '摩羯座': ['leadership', 'resilience', 'wealth'],
    '水瓶座': ['independence', 'creativity', 'wisdom'],
    '雙魚座': ['intuition', 'emotional', 'creativity'],
  };
  
  // 太陽
  if (data.sunSign && signThemes[data.sunSign.zh]) {
    themes.push(...signThemes[data.sunSign.zh].map(t => ({ theme: t, source: `占星太陽${data.sunSign.zh}`, weight: 2 })));
  }
  
  // 月亮
  if (data.moonSign && signThemes[data.moonSign.zh]) {
    themes.push(...signThemes[data.moonSign.zh].map(t => ({ theme: t, source: `占星月亮${data.moonSign.zh}`, weight: 1 })));
  }
  
  // 上升
  if (data.risingSign && signThemes[data.risingSign.zh]) {
    themes.push(...signThemes[data.risingSign.zh].map(t => ({ theme: t, source: `占星上升${data.risingSign.zh}`, weight: 1 })));
  }
  
  // 主要相位
  if (data.aspects) {
    for (const asp of data.aspects) {
      // 太陽/月亮的合相、刑衝
      if (asp.type === '合' || asp.type === '對衝') {
        if (asp.planet1 === 'sun' || asp.planet2 === 'sun') {
          if (['jupiter', 'venus'].includes(asp.planet1) || ['jupiter', 'venus'].includes(asp.planet2)) {
            themes.push({ theme: 'wealth', source: `占星${asp.name}`, weight: 1 });
            themes.push({ theme: 'magnetism', source: `占星${asp.name}`, weight: 1 });
          }
          if (['pluto', 'saturn'].includes(asp.planet1) || ['pluto', 'saturn'].includes(asp.planet2)) {
            themes.push({ theme: 'transformation', source: `占星${asp.name}`, weight: 1 });
            themes.push({ theme: 'resilience', source: `占星${asp.name}`, weight: 1 });
          }
        }
      }
    }
  }
  
  return themes;
}

/** 從馬雅曆提取主題 */
function extractMayaThemes(data) {
  if (!data) return [];
  const themes = [];
  
  // Dreamspell 主印記
  const sealThemes = {
    '紅龍': ['caregiving', 'family', 'action'],
    '白風': ['communication', 'intuition', 'creativity'],
    '藍夜': ['intuition', 'wealth', 'wisdom'],
    '黃種子': ['patience', 'wisdom', 'service'],
    '紅蛇': ['action', 'intuition', 'transformation'],
    '白世界橋': ['transformation', 'service', 'magnetism'],
    '藍手': ['creativity', 'action', 'service'],
    '黃星星': ['creativity', 'wisdom', 'authenticity'],
    '紅月': ['emotional', 'intuition', 'transformation'],
    '白狗': ['caregiving', 'family', 'magnetism'],
    '藍猴': ['creativity', 'independence', 'wisdom'],
    '黃人': ['independence', 'wisdom', 'authenticity'],
    '紅天行者': ['independence', 'action', 'wisdom'],
    '白巫師': ['intuition', 'patience', 'wisdom'],
    '藍鷹': ['wisdom', 'strategy', 'creativity'],
    '黃戰士': ['action', 'strategy', 'resilience'],
    '紅地球': ['intuition', 'patience', 'service'],
    '白鏡': ['authenticity', 'wisdom', 'independence'],
    '藍風暴': ['transformation', 'action', 'independence'],
    '黃太陽': ['leadership', 'authenticity', 'service'],
  };
  
  if (data.dreamspell && data.dreamspell.seal) {
    const seal = data.dreamspell.seal.zh || data.dreamspell.seal.name;
    if (seal && sealThemes[seal]) {
      themes.push(...sealThemes[seal].map(t => ({ theme: t, source: `馬雅主印記${seal}`, weight: 2 })));
    }
  }
  
  // 調性特質
  if (data.dreamspell && data.dreamspell.tone) {
    const toneNum = data.dreamspell.tone.num || data.dreamspell.tone.number;
    const toneThemes = {
      1: ['leadership', 'independence'],       // 磁性
      2: ['strategy', 'patience'],             // 月亮
      3: ['action', 'creativity'],             // 電力
      4: ['strategy', 'family'],               // 自我存在
      5: ['leadership', 'action'],             // 超頻
      6: ['magnetism', 'communication'],       // 韻律
      7: ['intuition', 'communication'],       // 共振
      8: ['resilience', 'wisdom'],             // 銀河
      9: ['action', 'service'],                // 太陽
      10: ['authenticity', 'leadership'],      // 行星
      11: ['independence', 'transformation'],  // 光譜
      12: ['caregiving', 'magnetism'],         // 水晶
      13: ['intuition', 'transformation'],     // 宇宙
    };
    if (toneNum && toneThemes[toneNum]) {
      themes.push(...toneThemes[toneNum].map(t => ({ theme: t, source: `馬雅調性${toneNum}`, weight: 1 })));
    }
  }
  
  return themes;
}

/** 從人類圖提取主題 */
function extractHDThemes(data) {
  if (!data) return [];
  const themes = [];
  
  // 類型
  const typeThemes = {
    'MG': ['action', 'resilience', 'authenticity'],
    'G': ['patience', 'action', 'authenticity'],
    'M': ['leadership', 'action', 'independence'],
    'P': ['wisdom', 'patience', 'strategy'],
    'R': ['intuition', 'patience', 'wisdom'],
  };
  if (data.typeInfo && typeThemes[data.typeInfo.type]) {
    themes.push(...typeThemes[data.typeInfo.type].map(t => ({ theme: t, source: `人類圖${data.typeInfo.zh}`, weight: 2 })));
  }
  
  // 權威
  const authThemes = {
    '情緒權威': ['emotional', 'patience'],
    '薦骨權威': ['intuition', 'action', 'authenticity'],
    '直覺權威': ['intuition'],
    '自我投射權威': ['independence', 'authenticity'],
    '環境權威': ['intuition', 'wisdom'],
    '月循環權威': ['patience', 'intuition'],
  };
  if (data.authority && authThemes[data.authority.zh]) {
    themes.push(...authThemes[data.authority.zh].map(t => ({ theme: t, source: `人類圖${data.authority.zh}`, weight: 1 })));
  }
  
  // 定義通道的能量
  if (data.definedChannels) {
    const channelThemeMap = {
      '金錢線': ['wealth', 'leadership'],
      '啟發': ['creativity', 'leadership'],
      '魅力': ['action', 'magnetism'],
      '力量原型': ['action', 'intuition'],
      '探索': ['authenticity', 'action'],
      '韻律': ['patience', 'authenticity'],
      '脈動': ['wealth', 'intuition'],
      '社群': ['family', 'caregiving'],
      '才華': ['creativity', 'wisdom'],
      '蛻變': ['transformation', 'wealth'],
      '批判': ['service', 'wisdom'],
      '掙扎': ['resilience', 'independence'],
      '情緒': ['emotional', 'resilience'],
      '親密': ['emotional', 'magnetism'],
      '創始者': ['leadership', 'communication'],
      '架構': ['wisdom', 'communication'],
      '保存': ['caregiving', 'family'],
      '突變': ['transformation', 'creativity'],
      '專注': ['patience', 'resilience'],
      '發現': ['action', 'resilience'],
      '覺醒': ['authenticity', 'action'],
      '開放': ['communication', 'emotional'],
      '無常': ['action', 'creativity'],
      '發起': ['leadership', 'transformation'],
      '投降': ['strategy', 'wealth'],
      '辨認': ['emotional', 'creativity'],
      '浪子': ['wisdom', 'communication'],
      '成熟': ['patience', 'transformation'],
      '腦波': ['intuition', 'communication'],
      '綜合': ['emotional', 'family'],
      '抽象思維': ['wisdom', 'intuition'],
      '覺察': ['intuition', 'wisdom'],
      '邏輯': ['strategy', 'wisdom'],
      '接受': ['communication', 'strategy'],
      '好奇心': ['communication', 'creativity'],
    };
    for (const ch of data.definedChannels) {
      if (channelThemeMap[ch.name]) {
        themes.push(...channelThemeMap[ch.name].map(t => ({ theme: t, source: `人類圖${ch.name}通道`, weight: 1 })));
      }
    }
  }
  
  // Profile
  if (data.profile) {
    const profileThemes = {
      '1/3': ['wisdom', 'resilience', 'independence'],
      '1/4': ['wisdom', 'magnetism'],
      '2/4': ['creativity', 'magnetism'],
      '2/5': ['creativity', 'service'],
      '3/5': ['resilience', 'service', 'transformation'],
      '3/6': ['resilience', 'wisdom', 'transformation'],
      '4/6': ['magnetism', 'wisdom'],
      '4/1': ['magnetism', 'wisdom'],
      '5/1': ['service', 'wisdom'],
      '5/2': ['service', 'creativity'],
      '6/2': ['wisdom', 'authenticity'],
      '6/3': ['wisdom', 'resilience'],
    };
    if (profileThemes[data.profile.profile]) {
      themes.push(...profileThemes[data.profile.profile].map(t => ({ theme: t, source: `人類圖Profile ${data.profile.profile}`, weight: 1 })));
    }
  }
  
  return themes;
}

// ============ 主題統計與分析 ============

/**
 * 統計各主題的出現頻率和來源系統數
 */
function analyzeThemes(allThemes) {
  const stats = {};
  
  for (const item of allThemes) {
    if (!stats[item.theme]) {
      stats[item.theme] = { count: 0, weight: 0, sources: [], systems: new Set() };
    }
    stats[item.theme].count++;
    stats[item.theme].weight += item.weight;
    stats[item.theme].sources.push(item.source);
    // 提取系統名稱（八字/紫微/占星/馬雅/人類圖）
    const sys = item.source.match(/^(八字|紫微|占星|馬雅|人類圖)/)?.[1] || '';
    stats[item.theme].systems.add(sys);
  }
  
  // 轉為陣列並排序
  const sorted = Object.entries(stats)
    .map(([key, val]) => ({
      key,
      ...THEME_DEFS[key],
      systemCount: val.systems.size,
      totalWeight: val.weight,
      sources: val.sources,
      systems: [...val.systems],
    }))
    .sort((a, b) => {
      // 先按系統數排，再按權重排
      if (b.systemCount !== a.systemCount) return b.systemCount - a.systemCount;
      return b.totalWeight - a.totalWeight;
    });
  
  return sorted;
}

/**
 * 分類主題
 */
function categorizeThemes(sorted) {
  const core = sorted.filter(t => t.systemCount >= 3);      // 核心主題（≥3 系統共振）
  const support = sorted.filter(t => t.systemCount === 2);  // 支持主題（2 系統）
  const single = sorted.filter(t => t.systemCount === 1 && t.totalWeight >= 2); // 單系統但權重高
  
  return { core, support, single };
}

// ============ 劇本大綱生成（尖銳版） ============

const CONFLICT_PAIRS = [
  { a: 'independence', b: 'caregiving', insight: '你同時有強烈的「我要自由」和「我要照顧人」——這兩個會打架。你的人生功課不是二選一，而是找到「在自由中照顧人、在照顧人時保有自由」的姿態。你不是傳統那種犧牲式的照顧者，你是用自己的方式守護你在乎的人。' },
  { a: 'action', b: 'patience', insight: '你的油門和煞車一樣強——一腳踩下去就想衝，但另一個聲音說「等一下」。這不是矛盾，這是你的超能力：你有爆發力，也有等待最佳時機的智慧。秘訣是聽身體——身體說衝就衝，身體說等就等。' },
  { a: 'leadership', b: 'patience', insight: '你有領導能量，但不是衝出去的那種——你是「等到所有人都亂了然後你站出來，一句話定方向」的那種。你的權威不是搶來的，是等到正確時機自然浮現的。' },
  { a: 'wisdom', b: 'action', insight: '你的腦袋跟身體在賽跑。一邊想深入研究、一邊又想立刻動手。最好的平衡是：快速原型、邊做邊學。你適合「做一個小版本，看結果，再決定下一步」。' },
  { a: 'independence', b: 'family', insight: '你需要自由但你也重視家人——這是你最深的拉扯之一。你不適合「犧牲自己成全家庭」。你需要一種讓你有自己空間、同時又能守護家人的架構。物理距離不等於情感距離。' },
  { a: 'wealth', b: 'authenticity', insight: '你的財富能量和「做自己」是綁在一起的。你越做自己、越走自己的路，錢越會來。反過來，你越為了錢去做不是自己的事，財路越卡。你不是追錢的命，你是吸引錢的命。' },
  { a: 'intuition', b: 'wisdom', insight: '你同時有直覺和分析力。陷阱是用腦袋否定直覺。正確用法：先聽直覺給第一個答案，然後用腦袋規劃「怎麼執行」。不是用腦袋決定「做不做」，而是決定「怎麼做」。' },
  { a: 'emotional', b: 'independence', insight: '你的情緒很豐富但又不想被情緒綁住。你不是要消滅情緒——你是要學會「感受到但不被帶走」。情緒是情報來源，不是指揮官。' },
  { a: 'magnetism', b: 'independence', insight: '你天生吸引人但又需要空間。人靠近了你想退、退了又覺得孤單。不是你有問題，是你需要「有距離的親密」。找能給你空間的人。' },
  { a: 'resilience', b: 'caregiving', insight: '你自己能扛也習慣照顧別人——但你最大的盲點是不讓人照顧你。允許自己偶爾軟弱、偶爾被照顧，不會讓你變弱——反而能續航更久。' },
];

const PITFALL_RULES = [
  { condition: (core, sup) => has(core,'wealth') && !has(core,'action'), text: '你的盤有財富能量，但沒叫你「衝」。你的錢不是拼命賺來的——是做對的事之後自然到手的。你越追錢越累，越做自己越有錢。' },
  { condition: (core, sup) => has(core,'patience') && has(core,'action'), text: '你同時有「等」和「衝」的訊號——是叫你：平常等、時機到了全力衝。不是龜速前進，是蓄力後一擊必中。' },
  { condition: (core, sup) => has(core,'leadership') && has(core,'patience'), text: '你有領導能量但不是「主動出擊型」。一直衝在前面找人跟你會累死。等人來問你、等機會來敲門——你的領導力是被邀請出來的。' },
  { condition: (core, sup) => has(core,'intuition') && has(sup,'wisdom'), text: '你直覺很準但會用邏輯推翻它。注意是不是常「早就知道答案但說服自己走另一條路然後後悔」？直覺第一、邏輯第二。' },
  { condition: (core, sup) => has(core,'caregiving') && !has(core,'authenticity'), text: '你天生會照顧人，但小心「為了照顧別人把自己搞不見了」。空了的杯子倒不出水。先顧好自己。' },
  { condition: (core, sup) => has(core,'transformation') && has(core,'resilience'), text: '你的命帶有「重來」的設計——每次覺得完蛋了，那是正常劇情。你會重來得比之前更好。不要在谷底做永久的決定。' },
];

function has(list, key) { return list.some(t => t.key === key); }

function generateScript(categories, results) {
  const { core, support } = categories;
  let script = '';
  
  // === 一句話 ===
  script += `<div class="script-section" style="border-left-color:#f5c542;"><div class="script-title">⚡ 一句話版本</div><div class="script-body" style="font-size:1rem;font-weight:600;line-height:1.8;">${oneLiner(core,support,results)}</div></div>`;

  // === 核心設定 ===
  script += `<div class="script-section"><div class="script-title">📖 第一章：你的核心設定</div><div class="script-body">`;
  if (core.length > 0) {
    script += `五個系統用五種語言說同一件事。你有 ${core.length} 個主題不斷出現：<div class="theme-badges" style="margin:10px 0;">`;
    for (const t of core) script += `<span class="theme-badge core">${t.icon} ${t.zh} <small>(${t.systemCount}系統)</small></span>`;
    script += `</div>這些不是「你可以選擇發展的方向」——這是你的出廠設定。回顧人生，它們一直都在。`;
  } else if (support.length > 0) {
    script += `你的能量多元，以下方向出現在兩個以上系統中：<div class="theme-badges" style="margin:10px 0;">`;
    for (const t of support.slice(0,5)) script += `<span class="theme-badge core">${t.icon} ${t.zh} <small>(${t.systemCount}系統)</small></span>`;
    script += `</div>`;
  }
  script += `</div></div>`;

  // === 天賦 ===
  const gifts = core.filter(t => ['creativity','intuition','communication','leadership','wisdom','magnetism','wealth','action'].includes(t.key));
  if (gifts.length > 0) {
    script += `<div class="script-section"><div class="script-title">🎁 第二章：你帶來了什麼</div><div class="script-body">你這輩子「自帶」的——不用學、天生就有：`;
    for (const t of gifts.slice(0,4)) script += `<div class="script-gift"><b>${t.icon} ${t.zh}</b>——${t.desc}。<br><span class="source-hint">${t.systems.join('、')}都指向這個。</span></div>`;
    script += `</div></div>`;
  }

  // === 衝突 ===
  const all = [...core, ...support];
  const conflicts = CONFLICT_PAIRS.filter(p => has(all,p.a) && has(all,p.b));
  if (conflicts.length > 0) {
    script += `<div class="script-section" style="border-left-color:#e0556b;"><div class="script-title">⚔️ 第三章：你的內在拉扯</div><div class="script-body">你可能常覺得自己很矛盾——不是你有問題，是你的設計本來就有張力。這些張力要被「駕馭」而不是「解決」：`;
    for (const c of conflicts.slice(0,3)) script += `<div class="script-lesson" style="border-left-color:#e0556b;">${c.insight}</div>`;
    script += `</div></div>`;
  }
  
  // === 誤區 ===
  const pitfalls = PITFALL_RULES.filter(r => r.condition(core,support)).map(r => r.text);
  if (pitfalls.length > 0) {
    script += `<div class="script-section" style="border-left-color:#f5c542;"><div class="script-title">⚠️ 第四章：你可能踩的坑</div><div class="script-body">根據你的盤，以下是你最容易走偏的地方——大概你已經踩過了：`;
    for (const p of pitfalls.slice(0,3)) script += `<div class="script-lesson" style="border-left-color:#f5c542;">${p}</div>`;
    script += `</div></div>`;
  }

  // === 怎麼活 ===
  script += `<div class="script-section"><div class="script-title">✨ 第五章：活出你的原廠設定</div><div class="script-body">`;
  const hd = results.hd?.data;
  const bz = results.bazi?.data;
  if (hd) {
    let s = `<div class="script-insight"><b>人類圖：</b>你是${hd.typeInfo?.zh||''}。`;
    if (hd.strategy) s += `${hd.strategy.desc.split('。')[0]}。`;
    if (hd.authority) s += `做決定用「${hd.authority.zh}」——${hd.authority.desc.split('。')[0]}。`;
    script += s + `</div>`;
  }
  if (bz) {
    const adv = { '木':'給自己空間成長，不接受被壓制的環境。你枯萎的原因永遠是空間不夠。', '火':'你需要表達和被看見。壓抑自己等於慢性自殺。找到你的舞台。', '土':'先穩住自己的根基再去養別人。你是大地，但大地也需要被滋養。', '金':'你是被磨出來的鑽石。每次痛苦的打磨都讓你更值錢。相信過程。', '水':'你需要流動。一個地方待太久你就死了。流動不一定是搬家——也可以是換思路、換做法。' };
    script += `<div class="script-insight"><b>八字：</b>日主「${bz.dayMaster}」屬${bz.dayMasterElem}。${adv[bz.dayMasterElem]||''}</div>`;
  }
  script += `<div class="script-conclusion">${conclusion(core,support)}</div></div></div>`;
  return script;
}

function oneLiner(core, support, results) {
  const all = [...core, ...support];
  const p = [];
  if (has(all,'intuition')) p.push('靠直覺走路');
  else if (has(all,'wisdom')) p.push('靠深度思考走路');
  else if (has(all,'action')) p.push('靠行動力開路');
  if (has(all,'authenticity') || has(all,'independence')) p.push('走自己的路');
  if (has(all,'caregiving') || has(all,'family')) p.push('守護身邊的人');
  if (has(all,'wealth')) p.push('順便把錢吸過來');
  else if (has(all,'creativity')) p.push('用創造力養活自己');
  if (has(all,'resilience')) p.push('越摔越強');
  if (p.length >= 2) return `「你是一個${p.join('、')}的人。」`;
  const hd = results.hd?.data;
  if (hd) return `「你是${hd.typeInfo?.zh||''}，做自己就是最大的策略。」`;
  return `「你的設計獨一無二。做自己，其他的會跟上。」`;
}

function conclusion(core, support) {
  const all = [...core, ...support];
  let c = '🎯 ';
  if (has(core,'authenticity') && has(all,'intuition')) c += `五個系統說同一句話：<b>做自己、信直覺</b>。這不是雞湯——這是你的硬體規格。你每一次違背直覺的決定，都在跟自己整張命盤作對。所有「不對勁」的時刻，都是你在偏離軌道。回來。`;
  else if (has(core,'authenticity')) c += `你不是「可以」做自己——你是<b>非做自己不可</b>。你的盤沒有留空間給「為了別人委屈自己」。你越做自己越順，越裝越卡。就這麼簡單。`;
  else if (has(core,'intuition')) c += `你的直覺是最貴的資產。多個系統都寫著：<b>你就是知道</b>。你人生中所有的後悔，大概都是「明明知道答案但選了另一條路」的時候。信它。`;
  else if (has(core,'wealth') && has(all,'independence')) c += `你的盤寫著：<b>走自己的路，錢會追著你跑</b>。為了別人的期待去賺的錢，遲早讓你想掀桌。`;
  else if (has(core,'caregiving')) c += `你天生是照顧者，但最重要那句：<b>先把自己顧好</b>。你空了誰都救不了。你的照顧是有邊界的、有力量的。`;
  else if (core.length > 0) c += `你的核心是「<b>${core[0].zh}</b>」${core.length>1?`和「${core[1].zh}」`:''}——出廠設定，不需要改。接受它、善用它。其他的會到位。`;
  else c += `你的盤說：<b>沒有標準答案</b>。你的路是你自己走出來的。但你已經知道方向了，對吧？`;
  return c;
}

// ============ 渲染 ============
function renderSynthesis(categories, script) {
  const { core, support } = categories;
  let html = `<div class="sig"><div class="kin">命理交叉比對</div><div class="big">人生劇本大綱</div><div style="font-size:.85rem;color:var(--muted);margin-top:8px;">綜合八字、紫微斗數、西洋占星、馬雅曆、人類圖五大系統<br>找出你的生命中不斷重複出現的核心主題</div></div>`;
  html += `<div class="divider"></div><h3>📊 主題共振分析</h3><div style="font-size:.78rem;color:var(--muted);margin-bottom:12px;">出現在越多系統 = 越是你靈魂深處的基調</div>`;
  if (core.length > 0) {
    html += `<div style="margin-bottom:16px;"><div style="font-size:.8rem;font-weight:700;color:var(--accent);margin-bottom:8px;">🔥 核心主題（3+ 系統共振）</div>`;
    for (const t of core) { const w = Math.min(t.systemCount*20,100); html += `<div style="display:flex;align-items:center;gap:8px;margin:6px 0;"><span style="width:90px;font-size:.82rem;white-space:nowrap;">${t.icon} ${t.zh}</span><div style="flex:1;height:18px;background:rgba(255,255,255,.05);border-radius:9px;overflow:hidden;"><div style="width:${w}%;height:100%;background:linear-gradient(90deg,var(--accent),#f5c542);border-radius:9px;display:flex;align-items:center;padding-left:6px;"><span style="font-size:.7rem;color:#000;font-weight:700;">${t.systemCount} 系統</span></div></div><span style="font-size:.7rem;color:var(--muted);width:100px;text-align:right;">${t.systems.join('/')}</span></div>`; }
    html += `</div>`;
  }
  if (support.length > 0) {
    html += `<div style="margin-bottom:16px;"><div style="font-size:.8rem;font-weight:700;color:var(--muted);margin-bottom:8px;">💫 支持主題（2 系統共振）</div>`;
    for (const t of support.slice(0,6)) html += `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;"><span style="width:90px;font-size:.8rem;white-space:nowrap;">${t.icon} ${t.zh}</span><div style="flex:1;height:14px;background:rgba(255,255,255,.05);border-radius:7px;overflow:hidden;"><div style="width:40%;height:100%;background:rgba(123,108,246,.4);border-radius:7px;"></div></div><span style="font-size:.7rem;color:var(--muted);width:100px;text-align:right;">${t.systems.join('/')}</span></div>`;
    html += `</div>`;
  }
  html += `<div class="divider"></div>${script}`;
  html += `<div class="note" style="margin-top:16px;">💡 這份劇本大綱是五大系統的<b>交集</b>——它們各自用不同語言說同一件事。當你發現「每個系統都在跟我說一樣的話」，那就是你的核心真相。<br><br>📋 <b>系統來源</b>：八字（天干地支）、紫微斗數（命宮主星+四化）、西洋占星（太陽/月亮/上升+相位）、馬雅曆（主印記+調性）、人類圖（類型+通道+Profile+交叉）</div>`;
  return html;
}

// ============ 主入口 ============
export function calculate(results) {
  try {
    const allThemes = [
      ...extractBaziThemes(results.bazi?.data),
      ...extractZiweiThemes(results.ziwei?.data),
      ...extractAstroThemes(results.astro?.data),
      ...extractMayaThemes(results.maya?.data),
      ...extractHDThemes(results.hd?.data),
    ];
    const sorted = analyzeThemes(allThemes);
    const categories = categorizeThemes(sorted);
    const script = generateScript(categories, results);
    const html = renderSynthesis(categories, script);
    return { status: 'ok', html, error: null };
  } catch (err) {
    return { status: 'error', html: `<div class="placeholder">綜合分析錯誤：${err.message}</div>`, error: err.message };
  }
}
