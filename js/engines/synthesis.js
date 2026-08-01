/**
 * synthesis.js — 人生劇本大綱
 * 
 * 從五個命理系統提取核心主題，交叉比對找出共振點，
 * 生成一份統一的「人生劇本」敘事。
 * 
 * v2: 大幅增加文案變體，根據主題組合+來源系統產出差異化劇本
 * 
 * 核心邏輯：
 * 1. 每個系統抽出「主題標籤」(themes)
 * 2. 統計主題出現頻率（≥3 系統 = 核心主題、2 系統 = 支持主題）
 * 3. 根據主題組合+來源組合生成劇本大綱
 */

// ============ 主題標籤定義 ============

const THEME_DEFS = {
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
  const { dayMasterElem, tenGods, shensha } = data;
  
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
  
  if (data.sihua && data.palaces) {
    // 四化只有落在命宮或福德宮才算個人特質
    const mingPos = data.mingPos;
    const fudePos = (mingPos + 10) % 12;  // 福德宮 = 命宮順數第11宮(index+10)
    const personalPalaces = [mingPos, fudePos];
    
    // 找出四化星各落在哪個宮
    function findStarPalace(starName) {
      for (const p of data.palaces) {
        if (p.main && p.main.some(s => (typeof s === 'string' ? s.replace(/[（(].+/,'').trim() : (s.name||'')) === starName)) return p.pos;
        if (p.minor && p.minor.some(s => (typeof s === 'string' ? s : (s.name||s)) === starName)) return p.pos;
      }
      return -1;
    }
    
    const luPos = findStarPalace(data.sihua.lu);
    const quanPos = findStarPalace(data.sihua.quan);
    const kePos = findStarPalace(data.sihua.ke);
    const jiPos = findStarPalace(data.sihua.ji);
    
    // 只有落在命宮/福德宮的四化才算個人特質
    if (data.sihua.lu && personalPalaces.includes(luPos)) {
      themes.push({ theme: 'wealth', source: `紫微化祿(${data.sihua.lu})入命/福德`, weight: 1 });
    }
    if (data.sihua.quan && personalPalaces.includes(quanPos)) {
      themes.push({ theme: 'leadership', source: `紫微化權(${data.sihua.quan})入命/福德`, weight: 1 });
    }
    if (data.sihua.ke && personalPalaces.includes(kePos)) {
      themes.push({ theme: 'wisdom', source: `紫微化科(${data.sihua.ke})入命/福德`, weight: 1 });
    }
    if (data.sihua.ji && personalPalaces.includes(jiPos)) {
      themes.push({ theme: 'transformation', source: `紫微化忌(${data.sihua.ji})入命/福德`, weight: 1 });
    }
  }
  
  return themes;
}

/** 從西洋占星提取主題 */
function extractAstroThemes(data) {
  if (!data) return [];
  const themes = [];
  
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
  
  if (data.sunSign && signThemes[data.sunSign.zh]) {
    themes.push(...signThemes[data.sunSign.zh].map(t => ({ theme: t, source: `占星太陽${data.sunSign.zh}`, weight: 2 })));
  }
  if (data.moonSign && signThemes[data.moonSign.zh]) {
    themes.push(...signThemes[data.moonSign.zh].map(t => ({ theme: t, source: `占星月亮${data.moonSign.zh}`, weight: 1 })));
  }
  if (data.risingSign && signThemes[data.risingSign.zh]) {
    themes.push(...signThemes[data.risingSign.zh].map(t => ({ theme: t, source: `占星上升${data.risingSign.zh}`, weight: 1 })));
  }
  
  if (data.aspects) {
    for (const asp of data.aspects) {
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
  
  if (data.dreamspell && data.dreamspell.tone) {
    const toneNum = data.dreamspell.tone.num || data.dreamspell.tone.number;
    const toneThemes = {
      1: ['leadership', 'independence'],
      2: ['strategy', 'patience'],
      3: ['action', 'creativity'],
      4: ['strategy', 'family'],
      5: ['leadership', 'action'],
      6: ['magnetism', 'communication'],
      7: ['intuition', 'communication'],
      8: ['resilience', 'wisdom'],
      9: ['action', 'service'],
      10: ['authenticity', 'leadership'],
      11: ['independence', 'transformation'],
      12: ['caregiving', 'magnetism'],
      13: ['intuition', 'transformation'],
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

function analyzeThemes(allThemes) {
  const stats = {};
  for (const item of allThemes) {
    if (!stats[item.theme]) {
      stats[item.theme] = { count: 0, weight: 0, sources: [], systems: new Set() };
    }
    stats[item.theme].count++;
    stats[item.theme].weight += item.weight;
    stats[item.theme].sources.push(item.source);
    const sys = item.source.match(/^(八字|紫微|占星|馬雅|人類圖)/)?.[1] || '';
    stats[item.theme].systems.add(sys);
  }
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
      if (b.systemCount !== a.systemCount) return b.systemCount - a.systemCount;
      return b.totalWeight - a.totalWeight;
    });
  return sorted;
}

function categorizeThemes(sorted) {
  const core = sorted.filter(t => t.systemCount >= 3);
  const support = sorted.filter(t => t.systemCount === 2);
  const single = sorted.filter(t => t.systemCount === 1 && t.totalWeight >= 2);
  return { core, support, single };
}

function has(list, key) { return list.some(t => t.key === key); }
function find(list, key) { return list.find(t => t.key === key); }

// ============ v2: 差異化文案系統 ============

/**
 * 天賦描述：根據主題 key + 來源系統組合，選不同文案
 * 每個主題有 3~4 個變體，依據「哪些系統觸發了這個主題」選用
 */
const GIFT_VARIANTS = {
  leadership: [
    { cond: (t) => t.systems.includes('人類圖') && t.systems.includes('紫微'), text: '你的領導力是與生俱來的氣場——人類圖給你發起的能量，紫微給你坐鎮中央的格局。你不用爭，站在那裡就會被推上去。' },
    { cond: (t) => t.systems.includes('八字') && t.systems.includes('占星'), text: '八字的官星和占星的太陽都指向同一件事：你的生命裡注定要扛責任。不是你想當頭，是事情到最後都會落到你手上。' },
    { cond: (t) => t.systems.includes('馬雅'), text: '馬雅的印記給你一種「照亮別人」的天賦——你的領導不是管人，是用你的存在讓別人看見方向。' },
    { cond: () => true, text: '多個系統都指出你有帶頭的設計。你可能不覺得自己「想當領導」，但你會發現：團隊沒你就散了。' },
  ],
  intuition: [
    { cond: (t) => t.systems.includes('人類圖') && t.systems.includes('八字'), text: '人類圖的直覺權威 + 八字的偏印，你的第六感不只是「感覺」——是一套完整的生存雷達。你就是知道，不需要理由。' },
    { cond: (t) => t.systems.includes('占星') && t.systems.includes('馬雅'), text: '占星的水象能量和馬雅的印記都在強化你的感知力。你接收訊息的方式跟大多數人不一樣——你是「整個身體在接收」。' },
    { cond: (t) => t.systems.includes('紫微'), text: '紫微命宮的星曜給你一種「看穿表面」的能力。別人在分析數據的時候，你已經知道答案了。' },
    { cond: () => true, text: '你的直覺是經過多個系統認證的硬體配備。問題不是「要不要信直覺」，而是「你有多常忽略它然後後悔」。' },
  ],
  creativity: [
    { cond: (t) => t.systems.includes('八字') && t.systems.includes('占星'), text: '八字的食傷星和占星的配置同時亮燈——你的腦袋永遠在冒新想法。不創造你會憋死。你需要的不是靈感，是出口。' },
    { cond: (t) => t.systems.includes('馬雅') && t.systems.includes('人類圖'), text: '馬雅印記 + 人類圖通道的組合：你的創造力帶有「通道」的特質——靈感不是你想出來的，是流經你的。你是管道，不是發明家。' },
    { cond: (t) => t.systems.includes('紫微'), text: '紫微命宮的星曜組合帶有強烈的藝術性和不走尋常路的特質。你的創意不是「做不一樣的事」，是「你做什麼都跟別人不一樣」。' },
    { cond: () => true, text: '你天生是創造者。可能不是畫畫寫歌那種——也可能是用全新的方式解決老問題、把兩個不相關的東西接起來。' },
  ],
  communication: [
    { cond: (t) => t.systems.includes('八字') && t.systems.includes('紫微'), text: '八字的食傷星加上紫微命宮的配置，你的表達力是帶穿透力的。你說的話會在別人腦裡迴盪。這是天賦也是責任——你的話比你以為的有份量。' },
    { cond: (t) => t.systems.includes('占星') && t.systems.includes('人類圖'), text: '占星的風象能量加上人類圖喉嚨中心的設計：你是天生的「轉譯器」，能把複雜的事講到誰都懂。' },
    { cond: (t) => t.systems.includes('馬雅'), text: '馬雅白風的能量在你身上——你的溝通帶有「傳遞訊息」的使命感。你說的不只是自己的想法，有時候你是在替某種更大的東西發聲。' },
    { cond: () => true, text: '你有話語的天賦。不只是「會說話」——是你的表達方式能真正改變別人的想法和行動。' },
  ],
  wealth: [
    { cond: (t) => t.systems.includes('八字') && t.systems.includes('紫微'), text: '八字的財星 + 紫微財帛宮的配置：你跟錢的關係是「內建」的。不是說錢會從天上掉下來，是你天生知道怎麼讓價值流動。' },
    { cond: (t) => t.systems.includes('人類圖') && t.systems.includes('占星'), text: '人類圖的金錢通道加上占星的木金配置——你的財富設計是「做對的事，錢就跟著來」。你越追錢越累，越做自己越有。' },
    { cond: (t) => t.systems.includes('馬雅'), text: '馬雅藍夜的豐盛能量：你跟物質世界的關係是「吸引」而非「追逐」。你的富足感從內在開始，外在只是反映。' },
    { cond: () => true, text: '多個系統都亮起財富訊號。你不缺賺錢的能力，關鍵是找到「讓你保持在正確頻率上」的那件事。' },
  ],
  independence: [
    { cond: (t) => t.systems.includes('人類圖') && t.systems.includes('八字'), text: '人類圖的類型設計 + 八字比劫星的能量：你天生需要「自己的空間」。不是孤僻——是你在群體裡待太久會窒息。你需要獨處來充電。' },
    { cond: (t) => t.systems.includes('馬雅') && t.systems.includes('占星'), text: '馬雅的印記和占星的配置都寫著自由。你無法在別人的框架裡活太久——你會一直想打破牆壁。' },
    { cond: (t) => t.systems.includes('紫微'), text: '紫微命宮的星曜帶有「一個人也能活得很好」的特質。你的獨立不是被迫的，是你享受的。' },
    { cond: () => true, text: '你的設計需要自主權。被管太多、被限制太死，你的能量就會斷電。自由是你的氧氣。' },
  ],
  wisdom: [
    { cond: (t) => t.systems.includes('紫微') && t.systems.includes('人類圖'), text: '紫微命宮的星曜加上人類圖的設計——你的價值在「看懂」。你不需要做最多，你需要「看到別人沒看到的」。' },
    { cond: (t) => t.systems.includes('八字') && t.systems.includes('占星'), text: '八字的印星加上占星的配置都強化了你的學習力和理解深度。你天生吃資訊的速度比別人快，而且能消化成自己的東西。' },
    { cond: (t) => t.systems.includes('馬雅'), text: '馬雅的印記給你「通往古老智慧的頻率」——你可能常覺得某些知識你「本來就知道」，只是被提醒了。' },
    { cond: () => true, text: '你的盤寫著「深度」。你不是那種淺嚐即止的人——你需要把事情搞懂到底才罷休。這是你的力量來源。' },
  ],
  action: [
    { cond: (t) => t.systems.includes('人類圖') && t.systems.includes('八字'), text: '人類圖的能量設計加上八字的行動星：你體內有一顆永不停歇的引擎。你不動會生病。但注意——你的行動力要用在「回應」而非「主動發起」。等待正確的訊號再全力出擊。' },
    { cond: (t) => t.systems.includes('占星') && t.systems.includes('馬雅'), text: '占星火象能量 + 馬雅的行動印記：你是「做了再說」型。你從行動中學到的東西比思考多十倍。' },
    { cond: (t) => t.systems.includes('紫微'), text: '紫微命宮的星曜帶有衝勁。你不是安靜等待型——你是「看到機會就撲上去」的人。' },
    { cond: () => true, text: '你有強大的執行力。別人還在想的時候你已經做了。你的風險是不會轉彎——動之前花三秒想方向。' },
  ],
  emotional: [
    { cond: (t) => t.systems.includes('人類圖') && t.systems.includes('占星'), text: '人類圖的情緒中心 + 占星的水象配置：你的情緒不是弱點——是一套精密的感知系統。你的高低起伏裡藏著真正的智慧，但前提是你不在浪頭上做決定。' },
    { cond: (t) => t.systems.includes('八字') && t.systems.includes('紫微'), text: '八字和紫微都指向情緒的深度。你感受事情的強度是一般人的三倍——這讓你能共感他人，但也容易被拖進別人的情緒裡。' },
    { cond: () => true, text: '你是情緒敏感體質。這不是需要「修復」的問題——這是你感知世界的方式。學會跟情緒共處，它就是你的超能力。' },
  ],
  transformation: [
    { cond: (t) => t.systems.includes('八字') && t.systems.includes('占星'), text: '八字七殺 + 占星冥王配置：你的人生劇本裡寫著「死而復生」。不是一次，可能好幾次。每一次你都會脫胎換骨成更強的版本。' },
    { cond: (t) => t.systems.includes('紫微') && t.systems.includes('人類圖'), text: '紫微破軍/廉貞的能量加人類圖的蛻變通道——你是「先破壞再重建」的設計。你人生中的崩塌都不是意外，是翻新工程。' },
    { cond: (t) => t.systems.includes('馬雅'), text: '馬雅的蛻變能量在你身上。你的人生像是一連串的「版本更新」——每幾年你就不再是之前那個人了。' },
    { cond: () => true, text: '你帶有強烈的轉化設計。人生不會是一條直線——你會經歷幾次「看起來全毀了」的時刻，然後發現那其實是升級。' },
  ],
  caregiving: [
    { cond: (t) => t.systems.includes('八字') && t.systems.includes('紫微'), text: '八字印星 + 紫微天同/天梁：你天生會照顧人。不是學來的——是看到別人需要，你的身體就自動動了。你的課題不是「學會照顧」，是「學會有界線地照顧」。' },
    { cond: (t) => t.systems.includes('馬雅') && t.systems.includes('人類圖'), text: '馬雅紅龍/白狗 + 人類圖的設計：你的照顧帶有「滋養」的品質——不是苦情犧牲型，是你的存在本身就讓人覺得被接住了。' },
    { cond: (t) => t.systems.includes('占星'), text: '占星的月亮/巨蟹能量：你的照顧是帶著情緒智慧的。你能感受到別人需要什麼，甚至在他們開口之前。' },
    { cond: () => true, text: '你是天生的照顧者。但記得：空了的杯子倒不出水。你的照顧能力跟「自己有沒有先被照顧好」直接相關。' },
  ],
  resilience: [
    { cond: (t) => t.systems.includes('八字') && t.systems.includes('人類圖'), text: '八字七殺/比劫 + 人類圖的設計：你是打不死的。不是不會痛——是你痛完會站起來，而且每次站起來都比上次高。你的人生成就跟你「承受過多少」成正比。' },
    { cond: (t) => t.systems.includes('占星') && t.systems.includes('紫微'), text: '占星土星/冥王的磨練加紫微的剛硬星曜——你被設計成「越壓越硬」。壓力是你的燃料，不是你的敵人。' },
    { cond: (t) => t.systems.includes('馬雅'), text: '馬雅黃戰士的韌性能量：你不是不怕——你是怕了還是會做。你的勇氣不是「不恐懼」，是「帶著恐懼前進」。' },
    { cond: () => true, text: '你的盤寫著「打不倒」。回顧你的人生——你已經撐過了多少你以為撐不過的事？那就是你的本事。' },
  ],
  magnetism: [
    { cond: (t) => t.systems.includes('紫微') && t.systems.includes('占星'), text: '紫微貪狼/紫微星 + 占星金星/木星的加持：人就是會靠近你。你可能覺得自己沒做什麼——但你的頻率天生讓人想待在你旁邊。' },
    { cond: (t) => t.systems.includes('八字') && t.systems.includes('人類圖'), text: '八字桃花/偏財 + 人類圖的磁性：你不只吸引人——你吸引「資源」。人脈、機會、錢，都是同一個頻率的不同顯化。' },
    { cond: () => true, text: '你有天生的人際磁場。不需要刻意經營——做你自己，對的人就會被吸過來。你的挑戰反而是「太多人靠近」時怎麼篩選。' },
  ],
  authenticity: [
    { cond: (t) => t.systems.includes('人類圖') && t.systems.includes('馬雅'), text: '人類圖的內在權威 + 馬雅的印記都在說一件事：你這輩子最重要的功課就是「不裝」。你的盤沒有留空間給偽裝——你越假裝越痛。' },
    { cond: (t) => t.systems.includes('八字') && t.systems.includes('占星'), text: '八字傷官 + 占星的配置：你骨子裡就不是隨波逐流的人。你對「做真實的自己」有近乎固執的堅持——而這正是你的力量來源。' },
    { cond: () => true, text: '做自己不是選項，是必要條件。你的盤寫得很清楚：偽裝=卡住，真實=通暢。就這麼直接。' },
  ],
  patience: [
    { cond: (t) => t.systems.includes('人類圖') && t.systems.includes('八字'), text: '人類圖的策略 + 八字正財的穩定能量：你不是慢——你是「在等最好的時機出手」。你一出手的效率抵過別人十次亂衝。' },
    { cond: (t) => t.systems.includes('紫微') && t.systems.includes('馬雅'), text: '紫微天同 + 馬雅的耐心印記：你的速度不在表面看得到，是在底下默默累積。別人覺得你慢的時候，你在紮根。' },
    { cond: () => true, text: '你的設計裡有一個清楚的訊息：急不得。不是叫你躺平——是你的正確節奏就是「等到對了再動」。' },
  ],
  strategy: [
    { cond: (t) => t.systems.includes('紫微') && t.systems.includes('占星'), text: '紫微天機 + 占星的風象/土象配置：你是天生的棋手。你看三步以後的能力是本能——問題只是你願不願意用這份天賦。' },
    { cond: (t) => t.systems.includes('人類圖') && t.systems.includes('八字'), text: '人類圖的策略設計 + 八字的策略星組合：你的優勢不在「做最多」，在「做最對的那一步」。少動、精準、一擊必中。' },
    { cond: () => true, text: '你有佈局的天賦。不需要跟人家比衝勁——你的強項是「想清楚再動」，一動就到位。' },
  ],
  service: [
    { cond: (t) => t.systems.includes('人類圖') && t.systems.includes('馬雅'), text: '人類圖的服務投射 + 馬雅的服務印記：你來這裡是帶著「解決問題」的任務的。別人的困難到你手上就有出路——你是天生的問題解決者。' },
    { cond: (t) => t.systems.includes('八字') && t.systems.includes('紫微'), text: '八字天德/正印 + 紫微天相/天梁：你的存在感來自「被需要」。你在幫助別人的過程中找到自己的位置和價值。' },
    { cond: () => true, text: '你有服務的天賦。不是卑微那種——是你天生有能力看到別人的需要，並且知道怎麼幫。' },
  ],
  family: [
    { cond: (t) => t.systems.includes('八字') && t.systems.includes('紫微'), text: '八字正官/正印 + 紫微天府：家庭在你的盤裡佔了很重的位置。你可能覺得被綁住——但你的安全感和力量很大一部分來自「知道自己有根」。' },
    { cond: (t) => t.systems.includes('占星') && t.systems.includes('馬雅'), text: '占星巨蟹/四宮能量 + 馬雅紅龍/白狗：你跟家族的連結很深。不一定是血緣——可能是你自己創造的「家」。' },
    { cond: () => true, text: '家庭和歸屬感是你的重要主題。你需要一個「自己人」的圈子——那是你充電的地方。' },
  ],
};

/** 取得天賦文案（根據來源系統選變體）
 * @param {object} themeItem - 主題項目（含 systems, key 等）
 * @param {object} results - 各系統計算結果（可選，用於動態替換類型描述）
 */
function getGiftText(themeItem, results) {
  const variants = GIFT_VARIANTS[themeItem.key];
  if (!variants) return themeItem.desc;
  for (const v of variants) {
    if (v.cond(themeItem)) {
      let text = v.text;
      text = applyDynamicReplacements(text, results);
      return text;
    }
  }
  return themeItem.desc;
}

/**
 * 動態替換文案中的硬寫描述（人類圖類型 + 八字十神）
 * 讓文案根據實際命盤內容顯示正確的用詞
 */
function applyDynamicReplacements(text, results) {
  // 動態替換人類圖類型描述（避免硬寫「投射者」等錯誤）
  if (results?.hd?.data?.typeInfo) {
    const hdType = results.hd.data.typeInfo.zh;
    text = text.replace(/人類圖的投射者特質/g, `人類圖${hdType}的特質`);
    text = text.replace(/人類圖投射者的觀察力/g, `人類圖${hdType}的能量模式`);
  }
  // 動態替換八字十神描述（根據實際命盤中存在的十神選字）
  if (results?.bazi?.data?.tenGods) {
    const gods = [...new Set(results.bazi.data.tenGods.map(tg => tg.god))];
    // 官殺類：官星 → 實際有正官/七殺
    const guanSha = gods.filter(g => g === '正官' || g === '七殺');
    if (guanSha.length > 0) {
      text = text.replace(/八字的官星/g, `八字的${guanSha.join('・')}`);
      text = text.replace(/八字官星/g, `八字${guanSha.join('・')}`);
    }
    // 食傷類：食傷星/食傷 → 實際有食神/傷官
    const shiShang = gods.filter(g => g === '食神' || g === '傷官');
    if (shiShang.length > 0) {
      text = text.replace(/八字的食傷星/g, `八字的${shiShang.join('・')}`);
      text = text.replace(/八字食傷星/g, `八字${shiShang.join('・')}`);
      text = text.replace(/八字食傷/g, `八字${shiShang.join('・')}`);
    }
    // 財星類：財星 → 實際有正財/偏財
    const caiXing = gods.filter(g => g === '正財' || g === '偏財');
    if (caiXing.length > 0) {
      text = text.replace(/八字的財星/g, `八字的${caiXing.join('・')}`);
      text = text.replace(/八字財星/g, `八字${caiXing.join('・')}`);
    }
    // 印星類：印星 → 實際有正印/偏印
    const yinXing = gods.filter(g => g === '正印' || g === '偏印');
    if (yinXing.length > 0) {
      text = text.replace(/八字印星/g, `八字${yinXing.join('・')}`);
      text = text.replace(/八字的印星/g, `八字的${yinXing.join('・')}`);
    }
    // 比劫類：比劫星/比劫 → 實際有比肩/劫財
    const biJie = gods.filter(g => g === '比肩' || g === '劫財');
    if (biJie.length > 0) {
      text = text.replace(/八字比劫星/g, `八字${biJie.join('・')}`);
      text = text.replace(/八字的比劫/g, `八字的${biJie.join('・')}`);
      text = text.replace(/八字比劫/g, `八字${biJie.join('・')}`);
    }
    // 單一十神直接提到的（七殺、傷官、正印等）——如果盤中沒有該神，替換為實際同類的
    if (!gods.includes('七殺') && guanSha.length > 0) {
      text = text.replace(/八字七殺/g, `八字${guanSha[0]}`);
      text = text.replace(/八字的七殺/g, `八字的${guanSha[0]}`);
    }
    if (!gods.includes('傷官') && shiShang.length > 0) {
      text = text.replace(/八字傷官/g, `八字${shiShang[0]}`);
      text = text.replace(/八字的傷官/g, `八字的${shiShang[0]}`);
    }
    if (!gods.includes('正印') && yinXing.length > 0) {
      text = text.replace(/八字正印/g, `八字${yinXing[0]}`);
      text = text.replace(/八字的正印/g, `八字的${yinXing[0]}`);
    }
    if (!gods.includes('偏印') && yinXing.length > 0) {
      text = text.replace(/八字偏印/g, `八字${yinXing[0]}`);
      text = text.replace(/八字的偏印/g, `八字的${yinXing[0]}`);
    }
    if (!gods.includes('比肩') && biJie.length > 0) {
      text = text.replace(/八字比肩/g, `八字${biJie[0]}`);
      text = text.replace(/八字的比肩/g, `八字的${biJie[0]}`);
    }
    if (!gods.includes('劫財') && biJie.length > 0) {
      text = text.replace(/八字劫財/g, `八字${biJie[0]}`);
      text = text.replace(/八字的劫財/g, `八字的${biJie[0]}`);
    }
    if (!gods.includes('食神') && shiShang.length > 0) {
      text = text.replace(/八字食神/g, `八字${shiShang[0]}`);
      text = text.replace(/八字的食神/g, `八字的${shiShang[0]}`);
    }
    if (!gods.includes('正財') && caiXing.length > 0) {
      text = text.replace(/八字正財/g, `八字${caiXing[0]}`);
      text = text.replace(/八字的正財/g, `八字的${caiXing[0]}`);
    }
    if (!gods.includes('偏財') && caiXing.length > 0) {
      text = text.replace(/八字偏財/g, `八字${caiXing[0]}`);
      text = text.replace(/八字的偏財/g, `八字的${caiXing[0]}`);
    }
    if (!gods.includes('正官') && guanSha.length > 0) {
      text = text.replace(/八字正官/g, `八字${guanSha[0]}`);
      text = text.replace(/八字的正官/g, `八字的${guanSha[0]}`);
    }
  }
  // 動態替換紫微星曜描述（根據實際命宮主星選字）
  if (results?.ziwei?.data?.palaces) {
    const zw = results.ziwei.data;
    const mingPalace = zw.palaces.find(p => p.pos === zw.mingPos);
    if (mingPalace && mingPalace.main && mingPalace.main.length > 0) {
      const mainStars = mingPalace.main.map(s => (typeof s === 'string') ? s.replace(/[（(].+/, '').trim() : (s.name || '')).filter(Boolean);
      const starStr = mainStars.join('、');
      // 通用泛稱替換
      text = text.replace(/紫微命宮的星曜/g, `紫微命宮${starStr}`);
      text = text.replace(/紫微命宮的配置/g, `紫微命宮${starStr}的配置`);
      // 所有硬寫的具體星曜 → 統一替換為實際命宮主星
      const allStarNames = ['紫微','天機','太陽','武曲','天同','廉貞','天府','太陰','貪狼','巨門','天相','天梁','七殺','破軍'];
      for (const star of allStarNames) {
        if (!mainStars.includes(star)) {
          text = text.replace(new RegExp(`紫微的${star}[/／]\\S+能量`, 'g'), `紫微命宮${starStr}的能量`);
          text = text.replace(new RegExp(`紫微${star}[/／]\\S+的能量`, 'g'), `紫微${starStr}的能量`);
          text = text.replace(new RegExp(`紫微${star}[/／]\\S+`, 'g'), `紫微${starStr}`);
          text = text.replace(new RegExp(`紫微${star}`, 'g'), `紫微${starStr}`);
        }
      }
    }
  }
  return text;
}

// ============ 衝突張力（v2: 根據來源系統+核心/支持分類給不同版本） ============

const CONFLICT_PAIRS = [
  { a: 'independence', b: 'caregiving', variants: [
    { cond: (all) => find(all,'independence')?.systems.includes('人類圖') && find(all,'caregiving')?.systems.includes('八字'), text: '人類圖要你「等待邀請、做自己」，八字說你天生帶著照顧人的基因——這兩個會打架。你不是那種犧牲式照顧者，你是「用自己的方式、在自己願意的時候」照顧人。區別在於：是你選擇的，不是被迫的。' },
    { cond: (all) => find(all,'independence')?.systems.includes('占星'), text: '占星的獨立配置碰上照顧的天賦——你需要「有退路的付出」。你可以全心照顧某人，但你需要知道隨時可以回到自己的空間。沒有退路你會窒息。' },
    { cond: () => true, text: '你同時有強烈的「我要自由」和「我要照顧人」——這不是bug，是feature。你的功課是「在自由中照顧、在照顧時保有自由」。你是用自己的方式守護你在乎的人。' },
  ]},
  { a: 'action', b: 'patience', variants: [
    { cond: (all) => find(all,'action')?.systems.includes('人類圖') && find(all,'patience')?.systems.includes('人類圖'), text: '你的人類圖裡「行動力」和「等待」同時存在——引擎很強，但策略是等待正確的訊號。解法：不主動發起，但回應來了就全力衝。平常養精蓄銳，訊號來了一秒變閃電。' },
    { cond: (all) => find(all,'action')?.systems.includes('八字'), text: '八字給你衝勁，但其他系統又說「等」。你的節奏是：觀察、觀察、觀察、然後——爆發。不是穩定輸出型，是脈衝式爆發型。' },
    { cond: () => true, text: '你的油門和煞車一樣猛。秘訣不是「學平衡」——是認出「現在是衝的時候還是等的時候」。你的身體會告訴你。' },
  ]},
  { a: 'leadership', b: 'patience', variants: [
    { cond: (all) => find(all,'leadership')?.systems.includes('人類圖'), text: '人類圖給你的領導力是「被邀請」型。你衝出去帶頭會碰壁——等人來問你「怎麼辦」的時候，你一句話就能定方向。你的權威是「別人認出來的」，不是「自己宣稱的」。' },
    { cond: (all) => find(all,'leadership')?.systems.includes('紫微'), text: '紫微給你帝王的格局但配上等待的設計——你是那種「前面十年沒人認識你，一朝被發現就直接坐上高位」的劇本。別急，位子是留給你的。' },
    { cond: () => true, text: '你有領導能量但不適合搶跑。你是「等所有人都亂了你站出來，一句話穩住全場」的類型。時機到了你會知道。' },
  ]},
  { a: 'wisdom', b: 'action', variants: [
    { cond: (all) => find(all,'wisdom')?.systems.includes('紫微') && find(all,'action')?.systems.includes('人類圖'), text: '紫微讓你想研究透徹，人類圖讓你想馬上動——折衷方案：MVP思維。先做最小可行版本，邊做邊修。你的完美主義會害你永遠停在起跑線。' },
    { cond: (all) => find(all,'action')?.systems.includes('八字'), text: '八字給你的行動力碰上深度思考的天賦——你需要「設定截止時間」。沒有 deadline 你會一直研究不動手。給自己一個時限，時間到了就衝。' },
    { cond: () => true, text: '你的腦袋跟身體在賽跑。最好的平衡：快速原型、邊做邊學。「做一個小版本看結果再決定下一步」——這就是你的最佳模式。' },
  ]},
  { a: 'independence', b: 'family', variants: [
    { cond: (all) => find(all,'family')?.systems.includes('八字'), text: '八字的家族責任壓在你身上，但你的靈魂需要自由。你不適合「犧牲自己成全家庭」的劇本——你需要在家庭責任裡保有獨立的空間。不是逃避，是「保持距離的深愛」。' },
    { cond: (all) => find(all,'independence')?.systems.includes('馬雅'), text: '馬雅給你的自由印記很強烈，同時你又重視歸屬。你的解法是：創造一種「大家各自獨立但心在一起」的關係模式。物理距離不等於情感距離。' },
    { cond: () => true, text: '你需要自由但也重視家人——這是你的深層拉扯。解法不是二選一，是找到「有自己空間又能守護家人」的結構。' },
  ]},
  { a: 'wealth', b: 'authenticity', variants: [
    { cond: (all) => find(all,'wealth')?.systems.includes('人類圖'), text: '人類圖的金錢設計跟「做自己」直接掛鉤。你越「演」越窮。你發現沒有？你賺到最多錢的時候，都是在做「你覺得理所當然」的事的時候。那就是訊號。' },
    { cond: (all) => find(all,'wealth')?.systems.includes('八字'), text: '八字的財星和你的做自己能量是正相關的。為了穩定去做你討厭的工作，那份薪水永遠不夠。走你的路，財來得比你預期的快。' },
    { cond: () => true, text: '你的財富跟真實程度成正比。越做自己越有錢，越委屈自己越窮。你不是追錢的命——你是吸引錢的命，前提是你在正確的頻率上。' },
  ]},
  { a: 'intuition', b: 'wisdom', variants: [
    { cond: (all) => find(all,'intuition')?.systems.includes('人類圖') && find(all,'wisdom')?.systems.includes('紫微'), text: '人類圖的直覺權威說「瞬間知道」，紫微天機說「需要分析」——正確用法：直覺負責「做不做」，分析負責「怎麼做」。不要用腦袋推翻直覺的第一個答案。' },
    { cond: (all) => find(all,'intuition')?.systems.includes('占星'), text: '占星的水象直覺力加上學術型智慧——你有兩套系統在運作：一套是瞬間感知，一套是慢慢消化。兩套都要用，但順序很重要：先聽直覺，再用邏輯規劃。' },
    { cond: () => true, text: '你同時有直覺和分析力。陷阱是用腦袋否定直覺。先聽直覺說什麼，再用邏輯想「怎麼執行」。不是用腦決定「做不做」。' },
  ]},
  { a: 'emotional', b: 'independence', variants: [
    { cond: (all) => find(all,'emotional')?.systems.includes('人類圖'), text: '人類圖的情緒中心被定義，但你又需要獨立空間——你需要的是「可以安全感受情緒的私密空間」。你在別人面前會壓情緒，回到自己的空間才能真正處理。尊重這個需求。' },
    { cond: (all) => find(all,'emotional')?.systems.includes('占星'), text: '占星給你的水象情緒深度加上獨立需求——你可能對自己的情緒需求覺得「煩」。不要。你的情緒是GPS，獨處是你讀取GPS的時間。兩者都不能省。' },
    { cond: () => true, text: '情緒豐富卻又不想被情緒控制。你不是要消滅情緒——你需要學會「感受到但不被帶走」。情緒是情報來源，不是指揮官。' },
  ]},
  { a: 'magnetism', b: 'independence', variants: [
    { cond: (all) => find(all,'magnetism')?.systems.includes('紫微'), text: '紫微的桃花/貪狼能量讓人不斷靠近你，但你又需要空間——你的解法是「有選擇性地靠近」。不是對所有人都敞開，而是精選你願意投入的關係。品質重於數量。' },
    { cond: (all) => find(all,'magnetism')?.systems.includes('人類圖'), text: '人類圖的磁性吸引力加上獨立需求：你天生的氣場讓人想靠近，但你需要「被邀請後再選擇接受或拒絕」的節奏。你有權利說不。' },
    { cond: () => true, text: '天生吸引人但又需要空間。人靠近了想退、退了又覺得孤單。你需要的不是「學社交」——是建立「有距離的親密」。' },
  ]},
  { a: 'resilience', b: 'caregiving', variants: [
    { cond: (all) => find(all,'resilience')?.systems.includes('八字'), text: '八字給你的硬度加上照顧人的天賦——你的模式是「自己扛一切然後去照顧別人」。但你最大的成長不是變更強，是學會讓別人也照顧你。你不示弱不是因為沒弱點，是因為你不讓人看到。' },
    { cond: () => true, text: '你自己能扛也習慣照顧別人——但你最大的盲點是不讓人照顧你。允許自己偶爾軟弱、被人接住，不會讓你變弱——反而能續航更久。' },
  ]},
  { a: 'creativity', b: 'strategy', variants: [
    { cond: (all) => find(all,'creativity')?.systems.includes('馬雅'), text: '馬雅給你的創意能量碰上策略思維——你不是那種「衝動創作」型，你是「有計劃的創造者」。你的創意需要框架才能落地——但不要讓框架殺死靈感。先放飛再收斂。' },
    { cond: () => true, text: '你的創造力和策略能力在拉鋸。一邊想天馬行空，一邊想有條有理。最佳模式：先發散不批判，然後用策略腦挑出最好的那個去執行。' },
  ]},
  { a: 'service', b: 'independence', variants: [
    { cond: (all) => find(all,'service')?.systems.includes('人類圖'), text: '人類圖的服務設計加上獨立需求——你被設計來幫助別人，但你需要「在自己準備好的時候幫」。被強迫服務會讓你burn out。你的奉獻是有條件的——條件是你自己心甘情願。' },
    { cond: () => true, text: '你想幫人但又不想被綁住。你的奉獻方式是「我來教你/給你工具/點你一下」，而不是「我全部幫你做完」。' },
  ]},
];

// ============ 誤區（v2: 擴展到 20+ 條件） ============

const PITFALL_RULES = [
  { condition: (core, sup) => has(core,'wealth') && !has(core,'action') && has(core,'patience'), text: '你的財富設計是「等到對的時機出手一次抵十次」。你不適合每天衝業績——你適合等到看準了，一次大的。急躁是你最大的財務漏洞。' },
  { condition: (core, sup) => has(core,'wealth') && !has(core,'action') && !has(core,'patience'), text: '你有財富能量但不是靠「做很多」來賺的。你的錢來自「做對的事」。你花力氣在不喜歡的事上，回報永遠不成正比。' },
  { condition: (core, sup) => has(core,'wealth') && has(core,'action'), text: '你有行動力也有財運——風險是「什麼都想做」。你需要專注：同時做五件事不如把一件事做到極致。散焦是你最大的財富漏洞。' },
  { condition: (core, sup) => has(core,'patience') && has(core,'action'), text: '「等」和「衝」同時亮燈——是叫你：平常養精蓄銳、時機到了全力爆發。不是龜速前進，是蓄力後一擊必中。你最忌諱「因為等太久煩了就隨便衝」。' },
  { condition: (core, sup) => has(core,'leadership') && has(core,'patience'), text: '你有領導能量但不是「衝在前面」型。主動搶位置會碰壁——等人來邀請你、等事情明顯需要你出面的時候，你一站出來就能定局。' },
  { condition: (core, sup) => has(core,'leadership') && has(core,'independence'), text: '你想帶頭但又不想管太多——你適合的不是「管理者」而是「方向指引者」。設方向，讓別人去執行細節。你管太細會把自己累死也把團隊逼瘋。' },
  { condition: (core, sup) => has(core,'intuition') && has(sup,'wisdom'), text: '你直覺很準但會用邏輯推翻它。注意：是不是常「早就知道答案但說服自己走另一條路然後後悔」？以後試試直覺第一、邏輯第二。' },
  { condition: (core, sup) => has(core,'intuition') && has(core,'emotional'), text: '你有直覺也有情緒波動——陷阱是「把情緒當成直覺」。區別方法：直覺是瞬間的、清晰的、平靜的；情緒是波動的、帶有重量的。在情緒高峰/低谷時做的決定，大概率是情緒，不是直覺。' },
  { condition: (core, sup) => has(core,'caregiving') && !has(core,'authenticity') && !has(sup,'authenticity'), text: '你天生會照顧人，但小心「為了照顧別人把自己搞不見了」。你不是永動機。你空了誰都救不了。先養自己再養人。' },
  { condition: (core, sup) => has(core,'caregiving') && has(core,'resilience'), text: '你能扛也願意照顧——最大的盲點是「覺得自己不需要被照顧」。你不是鋼鐵人。讓別人進來幫你，不是示弱——是智慧。' },
  { condition: (core, sup) => has(core,'transformation') && has(core,'resilience'), text: '你帶有「重來」的設計——每次覺得完蛋了，那是正常劇情。你會重來得比之前更好。不要在谷底做永久的決定（辭職、分手、搬家），等浪過了再說。' },
  { condition: (core, sup) => has(core,'transformation') && !has(core,'resilience'), text: '你帶有蛻變能量但不一定有「硬撐」的設計——你的轉化方式可能是「放下」而非「撐住」。該丟的丟，該結束的結束。你的重生在「放手」之後。' },
  { condition: (core, sup) => has(core,'communication') && has(core,'emotional'), text: '你有表達天賦但情緒波動大——注意：不要在情緒最滿的時候說話。你情緒穩定時的表達能改變世界；情緒失控時的話會傷人比你想像的深。多給自己一個呼吸的時間。' },
  { condition: (core, sup) => has(core,'magnetism') && has(core,'independence'), text: '你吸引人但又需要空間——你最容易犯的錯是「因為不想讓人失望而不設邊界」。結果：所有人都靠近你，你累到想消失。學會優雅地說「不」。' },
  { condition: (core, sup) => has(core,'creativity') && has(core,'wisdom'), text: '你有創意也有深度——風險是「永遠在構思不動手」。你的完美主義會讓你錯過時機。80分就先出手，做了再調整。' },
  { condition: (core, sup) => has(core,'strategy') && has(core,'action'), text: '你能想也能衝——但這兩個會搶主導權。想太多你焦慮，衝太快你後悔。設定一個簡單規則：想三分鐘，超過三分鐘還在想就直接動。' },
  { condition: (core, sup) => has(core,'independence') && has(core,'magnetism') && has(sup,'family'), text: '你自由、有魅力、又有家族牽掛——這三重拉扯可能讓你「每條路都走不徹底」。你的解法不是三選一，是「設定每個面向各自的時間和空間」。' },
  { condition: (core, sup) => has(core,'service') && has(core,'wealth'), text: '你想幫人又想賺錢——好消息：你的盤說這兩件事可以同時發生。你的財富來自「解決別人的問題」。壞消息：你很容易免費幫忙——學會開價。你的幫助有價值。' },
  { condition: (core, sup) => has(core,'authenticity') && has(sup,'magnetism'), text: '你做自己會吸引人、但不是所有人。你最大的坑是「為了維持人氣而微調自己」——一旦開始裝，你的磁場就弱了。真實的你才有磁性。' },
  { condition: (core, sup) => has(core,'emotional') && has(core,'patience'), text: '你的情緒有波動、決策需要等——雙重等待設計。你可能覺得自己「反應很慢」，但其實是你的決定需要時間發酵。急著在幾秒內回答「要不要」是你最大的決策失誤來源。' },
];

// ============ 一句話版本（v2: 大幅擴展組合） ============

function oneLiner(core, support, results) {
  const all = [...core, ...support];
  const hd = results.hd?.data;
  const bz = results.bazi?.data;
  
  // 嘗試根據前兩個核心主題的組合產出獨特句子
  if (core.length >= 2) {
    const k1 = core[0].key, k2 = core[1].key;
    const combos = {
      'intuition+authenticity': '「你的人生指南針只有一個：內心那個安靜但清楚的聲音。聽它的。」',
      'intuition+action': '「你是閃電型的人——直覺來了就動，別人還在分析你已經到終點了。」',
      'intuition+wisdom': '「你先知道答案，然後才找到理由。」',
      'intuition+creativity': '「你的靈感從虛空中來——你不是在創造，你是在接收。」',
      'intuition+independence': '「你天生知道自己要什麼——問題只是你願不願意忽略別人的意見。」',
      'action+resilience': '「你是戰場上最後站著的那個人——不是因為最強，是因為你就是不停。」',
      'action+authenticity': '「你做自己的方式就是——直接去做。想太多不是你的風格。」',
      'action+independence': '「你需要一條沒人走過的路，然後用你的速度跑出一條痕跡。」',
      'action+creativity': '「你是邊做邊創的人——你的創意不在腦袋裡，在手上。」',
      'action+wealth': '「你的行動力就是你的提款機——你做的每一步都在累積價值。」',
      'leadership+independence': '「你不是跟著別人走的人——你是那個走自己的路然後回頭發現一群人跟上來的人。」',
      'leadership+action': '「你是先鋒型領導——不是坐鎮後方，是衝在第一個然後大家跟上。」',
      'leadership+wisdom': '「你的領導力來自你看得比別人遠——你一句話就能讓混亂變清晰。」',
      'leadership+magnetism': '「你站在那裡就是中心——不用開口，人已經在往你的方向看了。」',
      'wisdom+patience': '「你是沉穩型的——別人在著急的時候你在思考，然後一出手就是最精準的。」',
      'wisdom+creativity': '「你把深度變成創作——你的作品不只好看，有東西在裡面。」',
      'wisdom+resilience': '「你從每次跌倒中撿起的不只是經驗，是看穿本質的眼力。」',
      'wisdom+independence': '「你是獨行的思考者——你需要安靜、需要空間，然後回來給出別人想不到的答案。」',
      'wealth+magnetism': '「你不追錢也不追人——兩者都是被你吸過來的。你的存在本身就是磁鐵。」',
      'wealth+strategy': '「你不衝動花錢也不衝動投資——你是算準了再出手，一出手就到位。」',
      'wealth+patience': '「你的財富是「慢慢變有錢」型——不是暴富，是越來越厚。時間是你最大的盟友。」',
      'creativity+authenticity': '「你不模仿任何人——你的創造力來自「你就是你」這件事本身。」',
      'creativity+magnetism': '「你創造的東西自帶吸引力——不用行銷，做出來就有人想看。」',
      'resilience+transformation': '「你的人生是一部重生記——每次以為結束了，其實是新版本的開始。」',
      'resilience+independence': '「你一個人扛過的那些，成就了別人打不倒的你。」',
      'caregiving+emotional': '「你用情緒感知別人的需要，用行動去照顧——你是用心在看的人。」',
      'caregiving+wisdom': '「你的照顧帶著智慧——不是溺愛，是精準地給對方真正需要的。」',
      'emotional+creativity': '「你的情緒就是你的創作素材——感受越深，作品越動人。」',
      'emotional+intuition': '「你的情緒和直覺交織在一起——學會分辨哪個是哪個，你就無敵了。」',
      'independence+authenticity': '「你注定走自己的路——不是叛逆，是你的設計就是「不跟」。」',
      'magnetism+communication': '「你一開口就改變氣場——你的聲音、你的表達，天生有穿透力。」',
      'patience+authenticity': '「你的節奏跟別人不一樣——不是慢，是你有自己的時區。」',
      'transformation+independence': '「你的人生每隔幾年就重來一次——每次重來你都更自由。」',
      'service+wisdom': '「你的價值在於看到別人看不到的——然後用最少的力氣指出最關鍵的那一點。」',
      'family+caregiving': '「你是家族的核心支柱——大家都知道有你在就有底氣。」',
      'strategy+independence': '「你是獨立作戰的策略家——不需要團隊，你一個人就是一支軍隊。」',
    };
    const key = `${k1}+${k2}`;
    const keyRev = `${k2}+${k1}`;
    if (combos[key]) return combos[key];
    if (combos[keyRev]) return combos[keyRev];
  }
  
  // fallback: 拼接式（但更豐富）
  const p = [];
  if (has(all,'intuition') && has(all,'action')) p.push('直覺來了就衝');
  else if (has(all,'intuition')) p.push('靠直覺走路');
  else if (has(all,'wisdom') && has(all,'strategy')) p.push('想清楚再出手');
  else if (has(all,'wisdom')) p.push('靠深度思考走路');
  else if (has(all,'action')) p.push('靠行動力開路');
  else if (has(all,'patience')) p.push('等到對的時機出手');
  
  if (has(all,'authenticity') || has(all,'independence')) p.push('走自己的路');
  else if (has(all,'leadership')) p.push('帶著別人一起走');
  
  if (has(all,'caregiving') || has(all,'family')) p.push('守護你在乎的人');
  else if (has(all,'service')) p.push('在幫助別人中找到意義');
  
  if (has(all,'wealth') && has(all,'magnetism')) p.push('錢和人都被你吸過來');
  else if (has(all,'wealth')) p.push('順便把錢吸過來');
  else if (has(all,'creativity')) p.push('用創造力養活自己');
  else if (has(all,'magnetism')) p.push('走到哪裡都有人跟');
  
  if (has(all,'resilience') && has(all,'transformation')) p.push('每次重來都更強');
  else if (has(all,'resilience')) p.push('越摔越強');
  else if (has(all,'transformation')) p.push('不斷蛻變升級');
  
  if (p.length >= 2) return `「你是一個${p.join('、')}的人。」`;
  if (hd?.typeInfo?.zh) return `「你是${hd.typeInfo.zh}，做自己就是最大的策略。」`;
  return `「你的設計獨一無二。做自己，其他的會跟上。」`;
}

// ============ 結論（v2: 根據核心主題組合產出差異化結尾） ============

function conclusion(core, support, results) {
  const all = [...core, ...support];
  const hd = results?.hd?.data;
  let c = '🎯 ';
  
  // 根據核心主題的「前兩名組合」給不同結尾
  if (core.length >= 2) {
    const k1 = core[0].key, k2 = core[1].key;
    const pair = new Set([k1, k2]);
    
    if (pair.has('authenticity') && pair.has('intuition')) {
      c += `五個系統用五種語言說同一句話：<b>做自己、信直覺</b>。這不是雞湯——這是你的硬體規格。你每次違背直覺的決定，都在跟自己整張命盤作對。回來。`;
      return c;
    }
    if (pair.has('action') && pair.has('resilience')) {
      c += `你的設計是<b>行動 + 打不死</b>。你的人生不需要「想通了才動」——先動，撞牆了爬起來再動。你的智慧來自行動中的修正，不是書本上的理論。`;
      return c;
    }
    if (pair.has('wisdom') && pair.has('patience')) {
      c += `你的節奏是<b>慢工出細活</b>。所有催你的人都不懂你——你需要的是時間和深度。急了就錯了。給自己空間慢慢來，結果會好得超出所有人的預期。`;
      return c;
    }
    if (pair.has('leadership') && pair.has('action')) {
      c += `你是<b>帶頭衝的人</b>。你的能量適合開疆闢土，不適合守成。找到值得你衝的方向，然後別回頭。跟不上的人自然會掉隊，跟得上的才是你的戰友。`;
      return c;
    }
    if (pair.has('creativity') && pair.has('independence')) {
      c += `你需要<b>一個自己的舞台</b>。在別人的框架裡你會枯萎——你得自己創造遊戲規則。你不是打工仔的命，你是「做自己的事」的命。`;
      return c;
    }
    if (pair.has('wealth') && pair.has('magnetism')) {
      c += `你的盤寫著<b>「你不需要追——只需要在正確的位置上等」</b>。錢和人都會被你吸引。你的功課不是「如何得到更多」，是「如何選擇正確的」。`;
      return c;
    }
    if (pair.has('intuition') && pair.has('action')) {
      c += `你的最佳模式：<b>直覺閃過就動</b>。不要等、不要分析太久。你猶豫的每一秒都在消耗你的正確率。相信第一個念頭。`;
      return c;
    }
    if (pair.has('caregiving') && pair.has('emotional')) {
      c += `你是<b>用心在感知世界的人</b>。你的照顧帶著情緒智慧——但最重要的一課：先照顧自己的情緒，才有能量照顧別人。你空了，周圍的人也會感受到。`;
      return c;
    }
    if (pair.has('transformation') && pair.has('independence')) {
      c += `你的人生是<b>一連串的破繭</b>。每次覺得「卡住了」，就是要你脫掉舊殼的訊號。你不是在受苦——你是在進化。每次蛻變後的自由感，就是你的獎賞。`;
      return c;
    }
    if (pair.has('wisdom') && pair.has('service')) {
      c += `你的價值是<b>「看穿問題本質然後指出方向」</b>。你不需要做最多——你需要在對的時候說對的那句話。一句話就能改變別人的人生軌跡。那就是你的天賦。`;
      return c;
    }
    if (pair.has('resilience') && pair.has('wisdom')) {
      c += `你的智慧是<b>摔出來的</b>——不是書上讀來的。你每經歷一次谷底，就多一份「過來人」的深度。你的過去不是傷疤，是資產。用它去幫助還在路上的人。`;
      return c;
    }
  }
  
  // 單一核心主題的結論
  if (has(core,'authenticity')) {
    c += `你不是「可以」做自己——你是<b>非做自己不可</b>。你的盤沒有留空間給「為了別人委屈自己」。越做自己越順，越裝越卡。就這麼簡單。`;
  } else if (has(core,'intuition')) {
    const hdType = hd?.typeInfo?.zh || '';
    c += `你的直覺是最貴的資產。${hdType ? `身為${hdType}，你的內在權威比任何外在建議都準。` : ''}多個系統都寫著：<b>你就是知道</b>。你人生所有的後悔，大概都是「明明知道答案但選了另一條路」。信它。`;
  } else if (has(core,'wealth') && has(all,'independence')) {
    c += `你的盤寫著：<b>走自己的路，錢會追著你跑</b>。為了別人的期待去賺的錢，遲早讓你想掀桌。找到你的路，財務自由是副產品。`;
  } else if (has(core,'leadership')) {
    c += `你的設計裡有<b>帶領的能量</b>。不一定是「當主管」——可能是「成為某個領域的指引者」。人們需要方向的時候會看向你。準備好。`;
  } else if (has(core,'action')) {
    c += `你的正確模式是<b>動起來</b>。想太多反而卡住。你的智慧在行動中顯現——先做、發現問題、修正、再做。停下來對你來說才是最大的風險。`;
  } else if (has(core,'caregiving')) {
    c += `你天生是照顧者，但最重要那句：<b>先把自己顧好</b>。你空了誰都救不了。你的照顧是有邊界的、有力量的——不是無止盡的消耗。`;
  } else if (has(core,'resilience')) {
    c += `你被設計成<b>打不倒的人</b>。但這不代表你不能喊痛——你可以。痛過之後站起來，那才是你真正的模式。你已經證明過很多次了。`;
  } else if (has(core,'wisdom')) {
    c += `你的核心價值在<b>深度</b>。這個淺薄的世界需要你這種「把事情搞懂到底」的人。不要覺得自己「太慢」或「太深」——那正是你不可取代的地方。`;
  } else if (has(core,'creativity')) {
    c += `你來這裡是要<b>創造</b>的。不一定是藝術——可能是創造新的做事方式、新的關係模式、新的可能性。你不創造就會枯萎。給自己出口。`;
  } else if (core.length > 0) {
    c += `你的核心是「<b>${core[0].zh}</b>」${core.length>1?`和「<b>${core[1].zh}</b>」`:''}——出廠設定。接受它、善用它、活出它。其他的會到位。`;
  } else {
    c += `你的盤能量多元，沒有單一主軸壓倒性地突出——這代表<b>你的路不是別人能定義的</b>。你有很多種活法，關鍵是哪一種讓你「覺得對」。跟著那個感覺。`;
  }
  return c;
}

// ============ v3: 融合洞見系統 ============

/** 產出交叉印證段落 — 找出不同系統指向同一件事的具體證據 */
function crossValidation(categories, results) {
  const { core } = categories;
  if (core.length === 0) return '';
  const hd = results.hd?.data;
  const bz = results.bazi?.data;
  const zw = results.ziwei?.data;
  const astro = results.astro?.data;
  const maya = results.maya?.data;

  const evidences = [];

  // 取核心主題第一名，列出哪些系統指向它（只列系統名，不列內部 source tag）
  const top = core[0];
  if (top && top.systemCount >= 3) {
    // 用真實命盤元素組裝描述（只取每個系統最代表性的一個元素）
    const systemDescs = [];
    if (top.systems.includes('八字') && bz) {
      systemDescs.push(`八字日主「${bz.dayMaster}」(${bz.dayMasterElem})`);
    }
    if (top.systems.includes('紫微') && zw) {
      const ming = zw.palaces?.find(p => p.pos === zw.mingPos);
      const stars = ming?.main?.map(s => (typeof s === 'string') ? s.replace(/[（(].+/, '').trim() : (s.name || '')).filter(Boolean) || [];
      if (stars.length) systemDescs.push(`紫微命宮${stars.join('、')}`);
      else systemDescs.push('紫微斗數');
    }
    if (top.systems.includes('占星') && astro) {
      if (astro.sunSign) systemDescs.push(`占星太陽${astro.sunSign.zh}`);
    }
    if (top.systems.includes('馬雅') && maya) {
      if (maya.dreamspell?.seal) systemDescs.push(`馬雅${maya.dreamspell.seal.zh}`);
    }
    if (top.systems.includes('人類圖') && hd) {
      if (hd.typeInfo) systemDescs.push(`人類圖${hd.typeInfo.zh}`);
    }
    if (systemDescs.length >= 3) {
      evidences.push(`<b>${top.icon} ${top.zh}</b>被 ${top.systemCount} 個系統同時印證：${systemDescs.join('、')}——不同的語言在說同一件事。`);
    }
  }

  // 如果有第二個核心主題，看它跟第一個的關係
  if (core.length >= 2) {
    const t1 = core[0], t2 = core[1];
    const shared = t1.systems.filter(s => t2.systems.includes(s));
    if (shared.length >= 2) {
      evidences.push(`「${t1.zh}」和「${t2.zh}」在 ${shared.join('、')} 中同時出現——這兩個特質不是分開的，它們在你身上是<b>同一股力量的兩個面向</b>。`);
    }
  }

  if (evidences.length === 0) return '';
  let html = `<div class="script-section" style="border-left-color:#7b6cf6;"><div class="script-title">🔗 交叉印證</div><div class="script-body">`;
  html += `<div style="font-size:.85rem;color:var(--muted);margin-bottom:10px;">以下不是推論——是多個獨立系統同時指出的事實：</div>`;
  for (const e of evidences) {
    html += `<div class="script-lesson" style="border-left-color:#7b6cf6;">${e}</div>`;
  }
  html += `</div></div>`;
  return html;
}

/** 產出融合人生洞見 — 像朋友坐在對面跟你聊天 */
function lifeInsight(categories, results) {
  const { core, support } = categories;
  const all = [...core, ...support];
  const hd = results.hd?.data;
  const bz = results.bazi?.data;
  const zw = results.ziwei?.data;
  const astro = results.astro?.data;
  const maya = results.maya?.data;

  // 收集具體命盤元素來組裝個人化段落
  const hdType = hd?.typeInfo?.zh || '';
  const hdStrategy = hd?.strategy?.desc?.split('。')[0] || '';
  const hdAuthority = hd?.authority?.zh || '';
  const hdProfile = hd?.profile?.profile || '';
  const baziDM = bz ? `${bz.dayMaster}(${bz.dayMasterElem})` : '';
  const baziGods = bz?.tenGods ? [...new Set(bz.tenGods.map(t => t.god))] : [];
  const zwMingStars = [];
  if (zw?.palaces) {
    const ming = zw.palaces.find(p => p.pos === zw.mingPos);
    if (ming?.main) {
      for (const s of ming.main) {
        const name = (typeof s === 'string') ? s.replace(/[（(].+/, '').trim() : (s.name || '');
        if (name) zwMingStars.push(name);
      }
    }
  }
  const sunSign = astro?.sunSign?.zh || '';
  const moonSign = astro?.moonSign?.zh || '';
  const mayaSeal = maya?.dreamspell?.seal?.zh || '';

  // 建構「人生模式」段落
  const paragraphs = [];

  // 段落1: 開場 — 你的五份命盤共同指向什麼
  let opener = '如果我是一位看完你全部五份命盤的朋友，坐在你對面，我會先跟你說一件事：\n\n';

  // 根據核心主題前兩名決定開場主旨
  if (core.length >= 2) {
    const k1 = core[0].key, k2 = core[1].key;
    const pair = new Set([k1, k2]);

    if (pair.has('action') && pair.has('resilience')) {
      opener += `你的五份命盤雖然來自完全不同的系統，但都在講同一件事：<b>你不是來這裡安安靜靜過日子的</b>。你是來衝的、來撞的、來摔了再爬起來的。${hdType ? `人類圖說你是${hdType}，` : ''}${zwMingStars.length ? `紫微命宮坐${zwMingStars.join('、')}，` : ''}${baziGods.includes('七殺') ? '八字帶七殺，' : baziGods.includes('劫財') ? '八字帶劫財，' : ''}每一個系統都在強調你身上那股「打不死」的能量。`;
    } else if (pair.has('intuition') && (pair.has('authenticity') || pair.has('independence'))) {
      opener += `你的命盤一直在重複一句話：<b>你就是知道答案，而且你必須照著自己的答案走</b>。${hdType ? `人類圖說你是${hdType}，內在權威是${hdAuthority}——` : ''}別人給你的建議再好聽，都比不上你自己那個安靜但清楚的聲音。${sunSign ? `太陽${sunSign}` : ''}${moonSign ? `、月亮${moonSign}` : ''}${mayaSeal ? `、馬雅${mayaSeal}` : ''}——全部指向同一件事。`;
    } else if (pair.has('wisdom') && (pair.has('patience') || pair.has('strategy'))) {
      opener += `你的五份命盤都在講一件有點反直覺的事：<b>你的力量不在快，在深</b>。${hdType ? `人類圖說你是${hdType}，策略是「${hdStrategy}」——` : ''}${zwMingStars.length ? `紫微命宮${zwMingStars.join('、')}給你分析和佈局的能力，` : ''}你不是跑百米的選手，你是下棋的人。每一步都要有意義。`;
    } else if (pair.has('leadership') && (pair.has('action') || pair.has('independence'))) {
      opener += `你的盤裡有一個反覆出現的訊號：<b>你不是來跟著別人走的，你是來開路的</b>。${hdType ? `人類圖${hdType}的設計、` : ''}${zwMingStars.length ? `紫微命宮${zwMingStars.join('、')}、` : ''}${sunSign ? `太陽${sunSign}——` : ''}每個系統都給你「帶頭」的能量。你可能不覺得自己在「帶」，但回頭看——人一直在跟著你。`;
    } else if (pair.has('creativity') && (pair.has('independence') || pair.has('authenticity'))) {
      opener += `你的五份命盤有一個共同的基調：<b>你不適合走別人的路</b>。${mayaSeal ? `馬雅${mayaSeal}、` : ''}${hdType ? `人類圖${hdType}、` : ''}${zwMingStars.length ? `紫微${zwMingStars.join('、')}——` : ''}你的設計就是「創造自己的遊戲規則」。別人的框架對你來說永遠太小。`;
    } else if (pair.has('wealth') && (pair.has('magnetism') || pair.has('action'))) {
      opener += `你的命盤裡有一個明確的財富訊號：<b>你跟物質世界的關係是「吸引」型，不是「追逐」型</b>。${zwMingStars.length ? `紫微命宮${zwMingStars.join('、')}、` : ''}${baziGods.includes('正財') || baziGods.includes('偏財') ? `八字帶${baziGods.filter(g=>g.includes('財')).join('、')}、` : ''}${hd?.definedChannels?.find(c=>c.name==='金錢線') ? '人類圖定義了金錢線通道——' : ''}多個系統同時亮起跟財富有關的燈。`;
    } else if (pair.has('caregiving') && (pair.has('emotional') || pair.has('family'))) {
      opener += `你的命盤有一個溫暖但沉重的主題：<b>你是照顧者</b>。${zwMingStars.length ? `紫微命宮${zwMingStars.join('、')}、` : ''}${moonSign ? `月亮${moonSign}、` : ''}${mayaSeal ? `馬雅${mayaSeal}——` : ''}這些系統都看見你身上那股「想把身邊的人顧好」的能量。但今天我想跟你聊的不是「你有多會照顧人」——是「誰在照顧你」。`;
    } else if (pair.has('transformation') && (pair.has('resilience') || pair.has('independence'))) {
      opener += `你的五份命盤都寫著同一個字：<b>變</b>。${zwMingStars.includes('破軍') ? '紫微破軍、' : zwMingStars.length ? `紫微${zwMingStars.join('、')}、` : ''}${baziGods.includes('七殺') ? '八字七殺、' : ''}${mayaSeal === '藍風暴' ? '馬雅藍風暴——' : mayaSeal ? `馬雅${mayaSeal}——` : ''}你的人生劇本不是一條直線，是一連串的「死而復生」。每次你以為完了的時候，其實是新版本的安裝程序。`;
    } else {
      // 通用但仍然具體的開場
      opener += `你的五份命盤雖然來自不同系統，但都在提醒同一件事：<b>你的人生有一個反覆出現的主旋律</b>——「${core[0].zh}」和「${core[1].zh}」。${hdType ? `人類圖${hdType}、` : ''}${zwMingStars.length ? `紫微${zwMingStars.join('、')}、` : ''}${sunSign ? `太陽${sunSign}、` : ''}${mayaSeal ? `馬雅${mayaSeal}` : ''}——不同的語言，同一個結論。`;
    }
  } else if (core.length === 1) {
    opener += `你的五份命盤有一個壓倒性的共識：<b>${core[0].zh}</b>。${core[0].systemCount} 個獨立系統同時指向這件事——${hdType ? `人類圖${hdType}、` : ''}${zwMingStars.length ? `紫微${zwMingStars.join('、')}、` : ''}${sunSign ? `太陽${sunSign}` : ''}——它們用不同的角度描述同一個你。`;
  } else {
    opener += `你的命盤能量分佈多元，沒有單一主題壓倒性出現。這不代表你「沒有方向」——代表你的設計比較彈性，你有更多選擇的自由。${hdType ? `身為人類圖${hdType}，` : ''}你的人生課題不是「找到唯一的路」，而是「學會在每個當下選對的那條」。`;
  }
  paragraphs.push(opener);

  // 段落2: 你最自在的活法
  let lifestyle = '';
  const elemAdvice = {
    '木': '需要成長空間',
    '火': '需要舞台和表達',
    '土': '需要穩定的根基',
    '金': '需要被磨練和淬煉',
    '水': '需要流動和變化',
  };

  if (has(all, 'patience') && has(all, 'wisdom')) {
    lifestyle = `你會過得最自在的方式，不是「努力做很多事」，而是<b>確保你做的每一件事都有深度和意義</b>。`;
    if (hdType === '投射者' || hdType === '反映者') {
      lifestyle += `你的人類圖是${hdType}——你的價值不在產出量，在品質和洞見。`;
    }
    if (bz?.dayMasterElem) lifestyle += `八字日主屬${bz.dayMasterElem}，${elemAdvice[bz.dayMasterElem] || ''}。結合起來：你${bz.dayMasterElem === '水' ? '需要在流動中找到深度——不是一直待在同一個地方，而是每到一個地方都要鑽到底' : bz.dayMasterElem === '金' ? '在壓力下反而越磨越亮——但前提是你選擇了值得的壓力' : bz.dayMasterElem === '木' ? '在有空間的環境裡才能紮根生長——被壓制你就枯了' : bz.dayMasterElem === '火' ? '需要被看見和肯定——但你的光是溫暖的不是燙的' : '先顧好自己的穩定再去照顧別人'}。`;
  } else if (has(all, 'action') && has(all, 'independence')) {
    lifestyle = `真正讓你痛苦的，往往不是工作量，而是<b>明明看見更好的做法卻沒有權限去執行</b>。`;
    if (hdType) lifestyle += `身為${hdType}，你的能量適合${hdType === '顯示者' ? '自己發起、自己決定方向' : hdType === '顯示生產者' ? '回應正確的訊號然後全力衝刺' : hdType === '生產者' ? '等到真正點燃你薦骨的事再投入' : '被看見你的專業後再出手'}。`;
    if (bz?.dayMasterElem) lifestyle += `日主${bz.dayMasterElem}——你${bz.dayMasterElem === '火' ? '需要一個能讓你發光的位置' : bz.dayMasterElem === '木' ? '需要一個不壓制你的環境' : bz.dayMasterElem === '金' ? '在挑戰中反而表現最好' : bz.dayMasterElem === '水' ? '需要自由流動不被框住' : '需要先有穩定的基礎再往外擴展'}。`;
  } else if (has(all, 'creativity') || has(all, 'authenticity')) {
    lifestyle = `你的命盤一直在暗示一件事：<b>你走別人走過的路會特別痛苦</b>。不是你不行，是你的設計就是用來開新路的。`;
    if (mayaSeal) lifestyle += `馬雅${mayaSeal}的能量讓你天生對「複製別人」感到排斥——你需要自己的表達方式。`;
    if (hdProfile) lifestyle += `人類圖 Profile ${hdProfile}${hdProfile.startsWith('3') || hdProfile.startsWith('6') ? '——你的智慧來自親身經歷，不是照本宣科' : hdProfile.includes('/5') ? '——別人對你有期待和投射，你要做的是交付「你的版本」而非模仿' : ''}。`;
  } else if (has(all, 'wealth') && (has(all, 'strategy') || has(all, 'patience'))) {
    lifestyle = `你的財富模式不是「衝業績」型——是<b>「等到看準了一次大的」</b>型。`;
    if (baziGods.includes('正財')) lifestyle += `八字正財代表穩定累積的財運——你的錢是一塊一塊疊起來的，不是一夜暴富。`;
    else if (baziGods.includes('偏財')) lifestyle += `八字偏財代表機會型財運——但你要等到真正「對」的機會，不是每個看起來能賺的都碰。`;
    if (hdType === '投射者') lifestyle += `人類圖投射者的財富來自「被認出價值然後被邀請」——你越追錢越累，被找到的時候反而最賺。`;
  } else if (has(all, 'caregiving') || has(all, 'service')) {
    lifestyle = `你天生帶著「想讓別人好」的能量——但你的命盤同時也在提醒：<b>空了的杯子倒不出水</b>。`;
    if (hdAuthority === '情緒權威') lifestyle += `你的人類圖是情緒權威——做任何重大決定（包括「要不要幫忙」）都需要等情緒清澈再說。衝動答應的代價通常是後悔。`;
    if (bz?.dayMasterElem === '土') lifestyle += `八字屬土——大地滋養萬物，但大地也需要被灌溉。你的課題不是「怎麼照顧更多人」，是「怎麼在照顧中不把自己掏空」。`;
  } else {
    // 通用
    lifestyle = `你會過得最自在的方式，是<b>把你命盤裡最強的那幾個特質放在對的位置上</b>。`;
    if (hdType) lifestyle += `身為${hdType}，遵循你的策略（${hdStrategy}）是一切的基礎。`;
    if (bz?.dayMasterElem) lifestyle += `日主屬${bz.dayMasterElem}，${elemAdvice[bz.dayMasterElem]}。`;
  }
  if (lifestyle) paragraphs.push(lifestyle);

  // 段落3: 矛盾的意義
  let tension = '';
  if (core.length >= 2) {
    const conflicts = CONFLICT_PAIRS.filter(p => has(all,p.a) && has(all,p.b));
    if (conflicts.length > 0) {
      const c = conflicts[0];
      const nameA = THEME_DEFS[c.a]?.zh || c.a;
      const nameB = THEME_DEFS[c.b]?.zh || c.b;
      const verbMap = {
        'independence': '追求自由', 'caregiving': '照顧身邊的人',
        'action': '趕快行動', 'patience': '慢慢等',
        'leadership': '帶頭衝', 'wisdom': '深入思考',
        'creativity': '天馬行空', 'strategy': '有條有理',
        'emotional': '感受一切', 'resilience': '硬撐到底',
        'wealth': '賺錢', 'authenticity': '做真實的自己',
        'magnetism': '跟人靠近', 'family': '守護家人',
        'transformation': '打掉重練', 'service': '幫助別人',
        'intuition': '跟著直覺走', 'communication': '表達出來',
      };
      const descA = verbMap[c.a] || nameA;
      const descB = verbMap[c.b] || nameB;
      tension = `你可能時常覺得自己很矛盾——一部分的你想${descA}，另一部分又想${descB}。但這不是bug。<b>你的設計就是帶著張力的</b>。這些拉扯不是要你「選一邊」，是要你學會在兩端之間找到只屬於你的平衡點。`;
    }
  }
  if (tension) paragraphs.push(tension);

  // 段落4: 最後的建議 — 具體、個人化
  let advice = '';
  if (core.length >= 1) {
    advice = `如果最近感到迷惘，也不用急著尋找答案。`;
    if (has(all, 'intuition') || has(all, 'patience')) {
      advice += `你的命盤顯示，答案通常是在<b>行動之後才逐漸浮現</b>，而不是「想清楚才開始」。`;
    } else if (has(all, 'action')) {
      advice += `你的設計是<b>先動再修正</b>——你從行動中獲得的清晰度，比思考一百遍都多。`;
    } else if (has(all, 'wisdom')) {
      advice += `你需要的是<b>安靜下來、給自己時間消化</b>——答案已經在你心裡，只是被噪音蓋住了。`;
    } else {
      advice += `你的命盤顯示，你的方向會在<b>持續做自己的過程中</b>逐漸清晰。`;
    }
    advice += `\n\n請相信那些一直反覆出現在生命中的特質——`;
    if (core.length >= 2) {
      advice += `你的「${core[0].zh}」和「${core[1].zh}」不是偶然，它們是你最重要的線索。`;
    } else {
      advice += `你的「${core[0].zh}」不是偶然，那是你最重要的線索。`;
    }
    advice += `當你活在這些特質裡面的時候，一切都會比較順——不是沒有困難，是你在正確的頻率上面對困難。`;
  }
  if (advice) paragraphs.push(advice);

  // 組裝
  let html = `<div class="script-section" style="border-left-color:#4ecdc4;"><div class="script-title">💬 五大系統對你說的話</div><div class="script-body" style="line-height:2;font-size:.92rem;">`;
  for (const p of paragraphs) {
    html += `<div style="margin-bottom:18px;">${p.replace(/\n\n/g, '<br><br>')}</div>`;
  }
  html += `</div></div>`;
  return html;
}

// ============ 劇本生成（v3） ============

function generateScript(categories, results) {
  const { core, support } = categories;
  const all = [...core, ...support];
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
    script += `你的能量分佈多元，沒有單一主題壓倒性出現——這代表你的設計不走極端。以下方向出現在兩個以上系統中：<div class="theme-badges" style="margin:10px 0;">`;
    for (const t of support.slice(0,5)) script += `<span class="theme-badge core">${t.icon} ${t.zh} <small>(${t.systemCount}系統)</small></span>`;
    script += `</div>你的人生會有更多彈性和選擇空間——好處是不容易被困住，挑戰是容易什麼都想要。`;
  }
  script += `</div></div>`;

  // === 交叉印證（v3 新增） ===
  script += crossValidation(categories, results);

  // === 天賦（v2: 用差異化文案） ===
  const giftKeys = ['creativity','intuition','communication','leadership','wisdom','magnetism','wealth','action','resilience','emotional'];
  const gifts = core.filter(t => giftKeys.includes(t.key));
  if (gifts.length > 0) {
    script += `<div class="script-section"><div class="script-title">🎁 第二章：你帶來了什麼</div><div class="script-body">你這輩子「自帶」的——不用學、天生就有：`;
    for (const t of gifts.slice(0,4)) {
      const text = getGiftText(t, results);
      script += `<div class="script-gift"><b>${t.icon} ${t.zh}</b>——${text}<br><span class="source-hint">${t.systems.join('、')}都指向這個。</span></div>`;
    }
    script += `</div></div>`;
  }

  // === 衝突（v2: 用變體文案） ===
  const conflicts = CONFLICT_PAIRS.filter(p => has(all,p.a) && has(all,p.b));
  if (conflicts.length > 0) {
    script += `<div class="script-section" style="border-left-color:#e0556b;"><div class="script-title">⚔️ 第三章：你的內在拉扯</div><div class="script-body">你可能常覺得自己很矛盾——不是你有問題，是你的設計本來就有張力。這些張力要被「駕馭」而不是「解決」：`;
    for (const c of conflicts.slice(0,3)) {
      // 選變體
      let text = c.variants[c.variants.length - 1].text; // default
      for (const v of c.variants) {
        if (v.cond(all)) { text = v.text; break; }
      }
      text = applyDynamicReplacements(text, results);
      script += `<div class="script-lesson" style="border-left-color:#e0556b;">${text}</div>`;
    }
    script += `</div></div>`;
  }
  
  // === 誤區 ===
  const pitfalls = PITFALL_RULES.filter(r => r.condition(core,support)).map(r => applyDynamicReplacements(r.text, results));
  if (pitfalls.length > 0) {
    script += `<div class="script-section" style="border-left-color:#f5c542;"><div class="script-title">⚠️ 第四章：你可能踩的坑</div><div class="script-body">根據你的盤，以下是你最容易走偏的地方——大概你已經踩過了：`;
    for (const p of pitfalls.slice(0,3)) script += `<div class="script-lesson" style="border-left-color:#f5c542;">${p}</div>`;
    script += `</div></div>`;
  }

  // === 融合洞見（v3: 取代舊版第五章） ===
  script += lifeInsight(categories, results);

  return script;
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

  // === AI 深度解讀區塊 ===
  html += `<div class="divider"></div>`;
  html += `<div class="script-section" style="border-left-color:#4ecdc4;">`;
  html += `<div class="script-title">🤖 AI 深度融合解讀</div>`;
  html += `<div class="script-body">`;
  html += `<p style="font-size:.85rem;color:var(--muted);margin-bottom:12px;">上面是規則引擎的分析。想要像「一位看完全部命盤的朋友跟你聊天」的解讀？</p>`;
  html += `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">`;
  html += `<button id="btn-ai-groq" style="padding:8px 16px;background:var(--accent);color:#000;border:none;border-radius:6px;font-weight:700;font-size:.85rem;cursor:pointer;">✨ AI 即時解讀</button>`;
  html += `<button id="btn-ai-copy" style="padding:8px 16px;background:rgba(255,255,255,.1);color:var(--text);border:1px solid rgba(255,255,255,.2);border-radius:6px;font-size:.85rem;cursor:pointer;">📋 複製 Prompt（貼到 ChatGPT）</button>`;
  html += `</div>`;
  html += `<div id="ai-result" style="display:none;"></div>`;
  html += `</div></div>`;

  html += `<div class="note" style="margin-top:16px;">💡 這份劇本大綱是五大系統的<b>交集</b>——它們用不同語言說同一件事。當你發現「每個系統都在講同一個主題」，那就是你的核心真相。<br><br>📋 <b>系統來源</b>：八字（天干地支＋十神＋神煞）、紫微斗數（命宮主星＋四化）、西洋占星（太陽/月亮/上升＋相位）、馬雅曆（主印記＋調性）、人類圖（類型＋權威＋通道＋Profile）</div>`;
  return html;
}

// ============ AI 解讀：Prompt 建構 + Groq 呼叫 ============

const AI_SYSTEM_PROMPT = `你是一位整合五大命理系統（八字、紫微斗數、西洋占星、馬雅曆、人類圖）的分析師。

你的任務：根據使用者的命盤 JSON 資料，寫一段像朋友聊天的融合分析。

規則：
1. 不要逐系統解釋。不要說「你的八字是...你的紫微是...」
2. 找出五個系統共同指向的人生主題（什麼特質一直重複出現）
3. 找出互相印證的地方（不同系統用不同語言說同一件事）
4. 找出互相矛盾的地方（內在的拉扯）
5. 用自然、溫暖但精準的語氣，像一位認識對方很久的人在聊天
6. 最後給一段具體的人生建議——不是雞湯，是根據命盤得出的結論
7. 全程用繁體中文
8. 控制在 800 字以內
9. 不要用markdown格式，直接用純文字段落`;

function buildPromptJSON(results) {
  const j = {};
  const bz = results.bazi?.data;
  if (bz) {
    j.bazi = { dayMaster: bz.dayMaster, element: bz.dayMasterElem, tenGods: bz.tenGods?.map(t => t.god) || [], shensha: bz.shensha?.map(s => s.name) || [] };
  }
  const zw = results.ziwei?.data;
  if (zw) {
    const ming = zw.palaces?.find(p => p.pos === zw.mingPos);
    const stars = ming?.main?.map(s => (typeof s === 'string') ? s.replace(/[（(].+/,'').trim() : (s.name||'')).filter(Boolean) || [];
    j.ziwei = { mingStars: stars, sihua: zw.sihua };
  }
  const astro = results.astro?.data;
  if (astro) {
    j.astro = { sun: astro.sunSign?.zh, moon: astro.moonSign?.zh, rising: astro.risingSign?.zh, aspects: astro.aspects?.slice(0,5).map(a => a.name) || [] };
  }
  const maya = results.maya?.data;
  if (maya) {
    j.maya = { seal: maya.dreamspell?.seal?.zh, tone: maya.dreamspell?.tone?.num, toneName: maya.dreamspell?.tone?.zh };
  }
  const hd = results.hd?.data;
  if (hd) {
    j.humanDesign = { type: hd.typeInfo?.zh, strategy: hd.strategy?.zh, authority: hd.authority?.zh, profile: hd.profile?.profile, channels: hd.definedChannels?.map(c => c.name) || [] };
  }
  return j;
}

function getFullPrompt(results) {
  const json = buildPromptJSON(results);
  return AI_SYSTEM_PROMPT + '\n\n---\n\n以下是這位使用者的命盤資料：\n\n```json\n' + JSON.stringify(json, null, 2) + '\n```\n\n請開始分析。';
}

export function attachAIButtons(results) {
  const btnGroq = document.getElementById('btn-ai-groq');
  const btnCopy = document.getElementById('btn-ai-copy');
  const resultDiv = document.getElementById('ai-result');
  if (!btnGroq || !btnCopy || !resultDiv) return;

  const fullPrompt = getFullPrompt(results);

  btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(fullPrompt).then(() => {
      btnCopy.textContent = '✅ 已複製！貼到 ChatGPT / Claude 即可';
      setTimeout(() => { btnCopy.textContent = '📋 複製 Prompt（貼到 ChatGPT）'; }, 3000);
    });
  });

  btnGroq.addEventListener('click', async () => {
    // Groq key 從 localStorage 讀取，沒有則提示設定
    let apiKey = localStorage.getItem('groq_api_key');
    if (!apiKey) {
      const input = prompt('首次使用需要 Groq API Key（免費申請：console.groq.com）\n貼上你的 Key：');
      if (!input) return;
      apiKey = input.trim();
      localStorage.setItem('groq_api_key', apiKey);
    }
    btnGroq.disabled = true;
    btnGroq.textContent = '⏳ AI 思考中...';
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div style="color:var(--muted);font-size:.85rem;">正在連線 AI，請稍候…</div>';
    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: AI_SYSTEM_PROMPT },
            { role: 'user', content: '以下是我的命盤資料：\n```json\n' + JSON.stringify(buildPromptJSON(results), null, 2) + '\n```\n請開始分析。' },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });
      if (!resp.ok) {
        if (resp.status === 401) { localStorage.removeItem('groq_api_key'); throw new Error('Key 無效，已清除。請重新點擊按鈕輸入正確的 Key。'); }
        throw new Error(`API 錯誤 ${resp.status}`);
      }
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || '（無回應）';
      const html = content.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
      resultDiv.innerHTML = `<div style="background:rgba(78,205,196,.08);border:1px solid rgba(78,205,196,.3);border-radius:8px;padding:16px;margin-top:8px;line-height:1.9;font-size:.9rem;"><p>${html}</p></div>`;
      btnGroq.textContent = '✨ 再生成一次';
      btnGroq.disabled = false;
    } catch (err) {
      resultDiv.innerHTML = `<div style="color:#f55;font-size:.85rem;">AI 連線失敗：${err.message}<br>可用「複製 Prompt」手動貼到 ChatGPT。</div>`;
      btnGroq.textContent = '✨ AI 即時解讀（重試）';
      btnGroq.disabled = false;
    }
  });
}

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
