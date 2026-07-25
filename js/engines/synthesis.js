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
        const name = star.replace(/[（(].+/, '').trim();
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
        const name = star.replace(/[（(].+/, '').trim();
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

// ============ 劇本大綱生成 ============

/**
 * 生成人生劇本敘事
 */
function generateScript(categories, results) {
  const { core, support } = categories;
  
  let script = '';
  
  // === 開場：你是誰 ===
  script += `<div class="script-section">`;
  script += `<div class="script-title">📖 第一章：你是誰</div>`;
  script += `<div class="script-body">`;
  
  if (core.length > 0) {
    script += `五個命理系統不約而同地指出，你的生命中有 ${core.length} 個核心主題不斷重複出現：`;
    script += `<div class="theme-badges" style="margin:10px 0;">`;
    for (const t of core) {
      script += `<span class="theme-badge core">${t.icon} ${t.zh} <small>(${t.systemCount}個系統)</small></span>`;
    }
    script += `</div>`;
    script += `這不是巧合。當多個完全不同的系統——東方的、西方的、古老的、現代的——都在說同一件事，那就是你靈魂的基調。`;
  } else {
    script += `你的能量多元分散，沒有單一主題壓倒性地主導——這代表你有多種天賦等待在不同人生階段展現。`;
  }
  script += `</div></div>`;
  
  // === 第二章：你的天賦 ===
  script += `<div class="script-section">`;
  script += `<div class="script-title">🎁 第二章：你的天賦</div>`;
  script += `<div class="script-body">`;
  
  const giftThemes = core.filter(t => 
    ['creativity', 'intuition', 'communication', 'leadership', 'wisdom', 'magnetism', 'wealth'].includes(t.key)
  );
  
  if (giftThemes.length > 0) {
    for (const t of giftThemes.slice(0, 4)) {
      script += `<div class="script-gift">`;
      script += `<b>${t.icon} ${t.zh}</b>（${t.systems.join('、')}都看到了）<br>`;
      script += `${t.desc}。<span class="source-hint">來源：${t.sources.slice(0, 3).join('、')}</span>`;
      script += `</div>`;
    }
  } else if (support.length > 0) {
    const gifts = support.filter(t => 
      ['creativity', 'intuition', 'communication', 'leadership', 'wisdom', 'magnetism', 'wealth'].includes(t.key)
    );
    for (const t of gifts.slice(0, 3)) {
      script += `<div class="script-gift">`;
      script += `<b>${t.icon} ${t.zh}</b>（${t.systems.join('、')}）<br>`;
      script += `${t.desc}。`;
      script += `</div>`;
    }
  }
  script += `</div></div>`;
  
  // === 第三章：你的功課 ===
  script += `<div class="script-section">`;
  script += `<div class="script-title">🎯 第三章：你的人生功課</div>`;
  script += `<div class="script-body">`;
  
  const lessonThemes = [...core, ...support].filter(t => 
    ['patience', 'authenticity', 'emotional', 'resilience', 'transformation'].includes(t.key)
  );
  
  if (lessonThemes.length > 0) {
    for (const t of lessonThemes.slice(0, 3)) {
      script += `<div class="script-lesson">`;
      script += `<b>${t.icon} ${t.zh}</b>——${t.desc}。`;
      if (t.key === 'authenticity') script += ` 所有系統都在告訴你：做自己不是選項，是必要。`;
      if (t.key === 'patience') script += ` 你的時機不是別人的時機。等待不是浪費時間，而是為了在正確的時刻全力出擊。`;
      if (t.key === 'emotional') script += ` 你的情緒不是障礙，而是你最精準的導航系統。學會跟它合作。`;
      if (t.key === 'resilience') script += ` 你的人生設計就是要經歷挑戰。不是因為你命苦，而是因為你有能力把它轉化為智慧。`;
      if (t.key === 'transformation') script += ` 你不是在「受苦」——你是在蛻變。每次看似崩塌的時刻，都是重新組裝的開始。`;
      script += `</div>`;
    }
  } else {
    script += `你的人生功課在各系統中分散出現，沒有壓倒性的單一挑戰。這代表你的成長是多面向的、持續的。`;
  }
  script += `</div></div>`;
  
  // === 第四章：做自己 ===
  script += `<div class="script-section">`;
  script += `<div class="script-title">✨ 第四章：做自己的方式</div>`;
  script += `<div class="script-body">`;
  
  // 從人類圖拉策略和權威
  const hdData = results.hd?.data;
  const baziData = results.bazi?.data;
  
  if (hdData) {
    script += `<div class="script-insight">`;
    script += `<b>人類圖告訴你：</b>你是${hdData.typeInfo?.zh || ''}。`;
    if (hdData.strategy) script += `策略是「${hdData.strategy.zh}」——${hdData.strategy.desc.split('。')[0]}。`;
    if (hdData.authority) script += `做決定時信任你的「${hdData.authority.zh}」。`;
    script += `</div>`;
  }
  
  if (baziData) {
    script += `<div class="script-insight">`;
    script += `<b>八字告訴你：</b>你的日主是「${baziData.dayMaster}」（${baziData.dayMasterElem}），`;
    const elemDesc = {
      '木': '像樹一樣需要空間成長，不能被壓制',
      '火': '需要表達和展現，不能被熄滅',
      '土': '需要穩定的根基，然後滋養萬物',
      '金': '需要被打磨和提煉，才能發出光芒',
      '水': '需要流動和自由，不能被堵住',
    };
    script += `${elemDesc[baziData.dayMasterElem] || ''}。`;
    script += `</div>`;
  }
  
  // 共振結論
  const hasAuth = core.find(t => t.key === 'authenticity') || support.find(t => t.key === 'authenticity');
  const hasIntuit = core.find(t => t.key === 'intuition') || support.find(t => t.key === 'intuition');
  
  if (hasAuth || hasIntuit) {
    script += `<div class="script-conclusion">`;
    script += `💡 `;
    if (hasAuth && hasIntuit) {
      script += `多個系統共同指出：<b>做自己</b>和<b>相信直覺</b>是你的核心方向。這不是雞湯——這是你的設計。當你違背這兩件事的時候，所有系統都預測你會感到阻力和不對勁。`;
    } else if (hasAuth) {
      script += `做自己是你的核心方向。不是「希望」你能做自己，而是「你必須」做自己——你的系統就是這樣設計的。`;
    } else {
      script += `相信你的直覺。多個系統都指出你有超越常人的第六感——但前提是你要信任它，而不是用腦袋蓋過它。`;
    }
    script += `</div>`;
  }
  
  script += `</div></div>`;
  
  return script;
}

// ============ 渲染 ============

function renderSynthesis(categories, script, allThemes) {
  const { core, support } = categories;
  
  let html = `
    <div class="sig">
      <div class="kin">命理交叉比對</div>
      <div class="big">人生劇本大綱</div>
      <div style="font-size:.85rem;color:var(--muted);margin-top:8px;">
        綜合八字、紫微斗數、西洋占星、馬雅曆、人類圖五大系統<br>
        找出你的生命中不斷重複出現的核心主題
      </div>
    </div>
  `;
  
  // 主題雷達圖（文字版）
  html += `<div class="divider"></div>`;
  html += `<h3>📊 主題共振分析</h3>`;
  html += `<div style="font-size:.78rem;color:var(--muted);margin-bottom:12px;">出現在越多系統 = 越是你靈魂深處的基調</div>`;
  
  // 核心主題
  if (core.length > 0) {
    html += `<div style="margin-bottom:16px;">`;
    html += `<div style="font-size:.8rem;font-weight:700;color:var(--accent);margin-bottom:8px;">🔥 核心主題（3+ 系統共振）</div>`;
    for (const t of core) {
      const barWidth = Math.min(t.systemCount * 20, 100);
      html += `<div style="display:flex;align-items:center;gap:8px;margin:6px 0;">`;
      html += `<span style="width:90px;font-size:.82rem;white-space:nowrap;">${t.icon} ${t.zh}</span>`;
      html += `<div style="flex:1;height:18px;background:rgba(255,255,255,.05);border-radius:9px;overflow:hidden;">`;
      html += `<div style="width:${barWidth}%;height:100%;background:linear-gradient(90deg,var(--accent),#f5c542);border-radius:9px;display:flex;align-items:center;padding-left:6px;">`;
      html += `<span style="font-size:.7rem;color:#000;font-weight:700;">${t.systemCount} 系統</span>`;
      html += `</div></div>`;
      html += `<span style="font-size:.7rem;color:var(--muted);width:100px;text-align:right;">${t.systems.join('/')}</span>`;
      html += `</div>`;
    }
    html += `</div>`;
  }
  
  // 支持主題
  if (support.length > 0) {
    html += `<div style="margin-bottom:16px;">`;
    html += `<div style="font-size:.8rem;font-weight:700;color:var(--muted);margin-bottom:8px;">💫 支持主題（2 系統共振）</div>`;
    for (const t of support.slice(0, 6)) {
      html += `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;">`;
      html += `<span style="width:90px;font-size:.8rem;white-space:nowrap;">${t.icon} ${t.zh}</span>`;
      html += `<div style="flex:1;height:14px;background:rgba(255,255,255,.05);border-radius:7px;overflow:hidden;">`;
      html += `<div style="width:40%;height:100%;background:rgba(123,108,246,.4);border-radius:7px;"></div></div>`;
      html += `<span style="font-size:.7rem;color:var(--muted);width:100px;text-align:right;">${t.systems.join('/')}</span>`;
      html += `</div>`;
    }
    html += `</div>`;
  }
  
  // 劇本大綱
  html += `<div class="divider"></div>`;
  html += script;
  
  // 底部說明
  html += `
    <div class="note" style="margin-top:16px;">
      💡 這份劇本大綱是五大系統的<b>交集</b>——它們各自用不同的語言在說同一件事。
      當你發現「每個系統都在跟我說一樣的話」，那就是你的核心真相。
      <br><br>
      📋 <b>系統來源</b>：八字（天干地支）、紫微斗數（命宮主星+四化）、西洋占星（太陽/月亮/上升+相位）、馬雅曆（主印記+調性）、人類圖（類型+通道+Profile+交叉）
    </div>
  `;
  
  return html;
}

// ============ 主入口 ============

/**
 * 計算綜合分析（人生劇本大綱）
 * @param {object} results - 所有系統的計算結果 { bazi, ziwei, astro, maya, hd }
 * @returns {{ status: string, html: string }}
 */
export function calculate(results) {
  try {
    // 1. 從各系統提取主題
    const allThemes = [
      ...extractBaziThemes(results.bazi?.data),
      ...extractZiweiThemes(results.ziwei?.data),
      ...extractAstroThemes(results.astro?.data),
      ...extractMayaThemes(results.maya?.data),
      ...extractHDThemes(results.hd?.data),
    ];
    
    // 2. 統計和分析
    const sorted = analyzeThemes(allThemes);
    const categories = categorizeThemes(sorted);
    
    // 3. 生成劇本大綱
    const script = generateScript(categories, results);
    
    // 4. 渲染
    const html = renderSynthesis(categories, script, allThemes);
    
    return { status: 'ok', html, error: null };
  } catch (err) {
    return { status: 'error', html: `<div class="placeholder">綜合分析錯誤：${err.message}</div>`, error: err.message };
  }
}
