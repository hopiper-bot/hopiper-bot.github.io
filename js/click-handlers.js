/**
 * click-handlers.js — 全域事件委派（非 ES module）
 * 從 index.html inline <script> 搬出，負責：
 * 1. 人類圖通道/中心/資訊標籤點擊
 * 2. 紫微宮格點擊
 */

// ========== 人類圖 ==========
document.addEventListener('click', function(e) {
  // 資訊標籤點擊（策略/權威/角色/定義/非自己）
  var info = e.target.closest ? e.target.closest('[data-hd-info]') : null;
  if (info && window._hdInfoDesc) {
    var key = info.getAttribute('data-hd-info');
    var html = window._hdInfoDesc[key];
    if (html) {
      var el = document.getElementById('hd-detail');
      if (el) { el.innerHTML = html; el.scrollIntoView({behavior:'smooth',block:'nearest'}); }
    }
    return;
  }
  // 通道點擊
  var line = e.target.closest ? e.target.closest('[data-hd-channel]') : null;
  if (line) {
    var idx = parseInt(line.getAttribute('data-hd-channel'));
    if (isNaN(idx) || !window._hdAllChannels) return;
    var ch = window._hdAllChannels[idx];
    if (!ch) return;
    var g1 = ch.gates[0], g2 = ch.gates[1];
    var html2 = '<div style="padding:14px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.85rem;line-height:1.9;">';
    html2 += '<div style="font-size:1rem;font-weight:700;color:var(--accent);">\u{1F517} ' + g1 + '-' + g2 + '\uFF1A' + ch.name + '</div>';
    html2 += '<div style="color:var(--muted);margin-bottom:8px;">' + ch.keyword + '</div>';
    html2 += '<div style="padding:10px;background:rgba(245,197,66,.08);border-radius:6px;white-space:pre-line;line-height:1.8;">' + window._hdChannelDesc(g1, g2) + '</div></div>';
    var el2 = document.getElementById('hd-detail');
    if (el2) { el2.innerHTML = html2; el2.scrollIntoView({behavior:'smooth',block:'nearest'}); }
    return;
  }
  // 中心點擊
  var center = e.target.closest ? e.target.closest('[data-hd-center]') : null;
  if (center && window._hdData && window._hdCenterDesc) {
    var cId = center.getAttribute('data-hd-center');
    var html3 = window._hdCenterDesc(cId);
    var el3 = document.getElementById('hd-detail');
    if (el3) { el3.innerHTML = html3; el3.scrollIntoView({behavior:'smooth',block:'nearest'}); }
  }
});

// ========== 紫微斗數 ==========
document.addEventListener('click', function(e) {
  var cell = e.target.closest ? e.target.closest('[data-zw-pos]') : null;
  if (!cell) return;
  var pos = parseInt(cell.getAttribute('data-zw-pos'));
  if (isNaN(pos) || !window._zwData) return;

  var d = window._zwData;
  var p = d.posMap[pos];
  if (!p) return;
  var oppositePos = (pos + 6) % 12;
  var oppP = d.posMap[oppositePos];

  var html = '<div style="padding:14px;background:rgba(123,108,246,.06);border-radius:8px;font-size:.85rem;line-height:1.9;">';

  // 本宮
  html += '<div style="font-size:1rem;font-weight:700;color:var(--accent);margin-bottom:4px;">\u{1F4CD} ' + p.name + '\uFF08' + p.branch + '\u5BAE\uFF09</div>';
  html += '<div style="color:var(--muted);margin-bottom:4px;">' + (d.palaceInfo[p.name]||'') + '</div>';
  // 宮位角色定位
  if (d.palaceRole && d.palaceRole[p.name]) {
    html += '<div style="font-size:.8rem;color:var(--accent2);margin-bottom:8px;padding:4px 8px;background:rgba(123,108,246,.08);border-radius:4px;">' + d.palaceRole[p.name] + '</div>';
  }

  // 身宮標記
  if (d.shenPos !== undefined && pos === d.shenPos) {
    html += '<div style="font-size:.82rem;color:#e9a;margin-bottom:8px;padding:6px 8px;background:rgba(238,153,170,.08);border-radius:4px;border-left:3px solid #e9a;">\u{1F3E0} \u9019\u88E1\u662F\u4F60\u7684<b>\u8EAB\u5BAE</b>\uFF0C\u4EE3\u8868\u5F8C\u5929\u4EBA\u751F\u91CD\u5FC3\u3002\u4F60\u6700\u82B1\u5FC3\u529B\u3001\u6700\u5728\u610F\u7684\u9818\u57DF\u5C31\u662F\u9019\u500B\u5BAE\u4F4D\u4EE3\u8868\u7684\u4E8B\u60C5\u3002</div>';
  }

  if (p.main.length > 0) {
    html += '<div style="margin-bottom:6px;"><b>\u4E3B\u661F\uFF1A</b></div>';
    p.main.forEach(function(s) {
      var bColor = (s.brightness==='\u5EDF'||s.brightness==='\u65FA') ? 'var(--accent)' : s.brightness==='\u9677' ? 'var(--red)' : 'var(--muted)';
      // 優先用「星×宮」解讀，沒有才用通用
      var interpKey = s.name + '_' + p.name;
      var interp = (d.starInPalace && d.starInPalace[interpKey]) || d.starInfo[s.name] || '';
      html += '<div style="margin-left:8px;margin-bottom:4px;"><span style="color:var(--accent);font-weight:700;">' + s.name + '</span>';
      html += '<span style="font-size:.75rem;color:' + bColor + ';">\uFF08' + s.brightness + '\uFF09</span>\uFF1A' + interp + '</div>';
    });
    // 雙星組合
    if (p.main.length >= 2) {
      var key1 = p.main[0].name + '+' + p.main[1].name;
      var key2 = p.main[1].name + '+' + p.main[0].name;
      var combo = d.starCombos[key1] || d.starCombos[key2];
      if (combo) {
        html += '<div style="margin:8px 0;padding:8px;background:rgba(245,197,66,.08);border-radius:6px;border-left:3px solid var(--accent);"><b>\u26A1 \u7D44\u5408\u6548\u61C9\uFF1A</b>' + combo + '</div>';
      }
    }
  } else {
    html += '<div style="color:var(--muted);margin-bottom:8px;">\u6B64\u5BAE\u7121\u4E3B\u661F \u2014 \u501F\u5C0D\u5BAE\u661F\u529B\u3002\u4F60\u5728\u9019\u500B\u9762\u5411\u6BD4\u8F03\u300C\u770B\u60C5\u6CC1\u300D\uFF0C\u53D7\u74B0\u5883\u548C\u5C0D\u5BAE\u5F71\u97FF\u5927\u3002</div>';
  }

  if (p.minor.length > 0) {
    html += '<div style="margin-top:8px;margin-bottom:4px;"><b>\u526F\u661F\uFF1A</b></div>';
    p.minor.forEach(function(s) {
      html += '<div style="margin-left:8px;font-size:.82rem;color:var(--muted);">' + s + '\uFF1A' + (d.starInfo[s]||'') + '</div>';
    });
  }

  // 四化落此宮
  var sihuaHere = d.sihuaPalaces[p.name];
  if (sihuaHere) {
    html += '<div style="margin-top:10px;padding:8px;background:rgba(123,108,246,.05);border-radius:6px;">';
    html += '<b>\u{1F300} \u6B64\u5BAE\u6709\u56DB\u5316\uFF1A</b><br>';
    sihuaHere.forEach(function(item) {
      var type = item.charAt(0);
      var interp = '';
      if (type === '\u797F' && d.sihuaPalaceInterp['\u797F']) interp = d.sihuaPalaceInterp['\u797F'][p.name] || '';
      if (type === '\u5FCC' && d.sihuaPalaceInterp['\u5FCC']) interp = d.sihuaPalaceInterp['\u5FCC'][p.name] || '';
      var color = type==='\u797F'?'#4f4':type==='\u6B0A'?'#f84':type==='\u79D1'?'#8cf':type==='\u5FCC'?'#f55':'var(--text)';
      html += '<span style="color:' + color + ';font-weight:700;">' + item + '</span>';
      if (interp) html += '<br><span style="font-size:.8rem;color:var(--muted);margin-left:8px;">' + interp + '</span>';
      html += '<br>';
    });
    html += '</div>';
  }

  // 長生十二宮
  if (d.changsheng && d.changsheng[pos]) {
    var csName = d.changsheng[pos];
    var csInterp = {
      '長生': { emoji:'🌱', alias:'', tldr:'剛發芽，潛力滿滿', desc:'像嬰兒出生 — 這個宮位的事務充滿活力和可能性。容易起步、有人幫忙、發展順利。' },
      '沐浴': { emoji:'🛁', alias:'又叫「桃花位」', tldr:'有魅力但不穩定', desc:'像青少年叛逆期 — 這方面的事容易有誘惑、變動、桃花。不是壞事，但需要判斷力。感情宮遇到特別精彩。' },
      '冠帶': { emoji:'👔', alias:'', tldr:'正在茁壯，被人看見', desc:'像剛出社會的年輕人 — 積極表現、逐漸被肯定。這方面的事正在上軌道，持續努力就會有成果。' },
      '臨官': { emoji:'📈', alias:'又叫「建祿」', tldr:'穩定上升，有實力', desc:'像職場中堅 — 做事有條有理、穩定發展。這方面的事已經有基礎，容易升遷或掌權。' },
      '帝旺': { emoji:'🔥', alias:'', tldr:'最旺！但小心過頭', desc:'巔峰狀態 — 這個宮位的能量最強。但物極必反，太強也可能過度執著或衝過頭。旺到頂了就該轉彎。' },
      '衰':   { emoji:'🍂', alias:'', tldr:'過了高峰，需要調整', desc:'像秋天落葉 — 不是完蛋，是過了最猛的階段。這方面的事需要換個策略，硬撐不如轉型。' },
      '病':   { emoji:'🤒', alias:'', tldr:'能量低，別硬撐', desc:'不是真的生病，是這方面的事容易拖延或出小問題。適合休養生息、降低期望值。養好了再出發。' },
      '死':   { emoji:'💀', alias:'名字嚇人但別怕', tldr:'暫停，重新想方向', desc:'不是真死！是這方面的事暫時停滯、需要歸零重來。反而可能是轉機 — 舊的不去新的不來。' },
      '墓':   { emoji:'💰', alias:'又叫「庫」= 倉庫', tldr:'悶聲累積型，低調有實力', desc:'東西藏在倉庫裡 — 這方面的事你傾向保守、不張揚，但暗中其實有在累積。適合存錢、存實力，不適合高調。財帛宮遇到 = 悶聲發財。' },
      '絕':   { emoji:'⚡', alias:'', tldr:'歸零，但絕處逢生', desc:'能量歸零 — 但「絕」的下一步就是「胎」（新生）。這方面的事可能要經歷一次砍掉重練，之後反而海闊天空。' },
      '胎':   { emoji:'🥒', alias:'', tldr:'種子種下了，還沒發芽', desc:'懷孕期 — 新的可能性正在醞釀，還看不到成果但已經有東西在長。耐心等，不要太早期待收穫。' },
      '養':   { emoji:'🌤️', alias:'', tldr:'慢慢養，時機未到', desc:'像花苞等著開 — 這方面的事需要時間和耐心。不能急、不能催，但只要持續投入，時間到了自然會綻放。' }
    };
    var cs = csInterp[csName];
    if (cs) {
      html += '<div style="margin-top:10px;padding:10px;background:rgba(156,203,187,.08);border-radius:6px;border-left:3px solid #9cb;">';
      html += '<div style="color:#9cb;font-weight:700;margin-bottom:4px;">' + cs.emoji + ' 長生十二宮：' + csName + (cs.alias ? ' <span style="font-size:.75rem;font-weight:400;color:var(--muted);">（' + cs.alias + '）</span>' : '') + '</div>';
      html += '<div style="font-size:.82rem;color:var(--accent);margin-bottom:4px;">👉 一句話：' + cs.tldr + '</div>';
      html += '<div style="font-size:.82rem;color:var(--muted);line-height:1.6;">' + cs.desc + '</div>';
      html += '</div>';
    }
  }

  // 博士十二神
  if (d.boshi && d.boshi[pos]) {
    var bsName = d.boshi[pos];
    var bsInterp = {
      '博士': { emoji:'🎓', tldr:'聰明有學問', desc:'此宮帶學識、文雅氣質。代表這方面的事務有智慧加持，適合靠腦袋和專業來發展。' },
      '力士': { emoji:'💪', tldr:'有力有氣魄', desc:'此宮有力士助陣，代表有行動力、有貴人撐腰。做事有魄力、能推動。' },
      '青龍': { emoji:'🐉', tldr:'大吉！喜慶順遂', desc:'青龍為十二神中最吉。此宮事務有喜事臨門、逢凶化吉的格局。動則有利。' },
      '小耗': { emoji:'💸', tldr:'小花費、小損耗', desc:'不是大破，但這方面容易有些小開銷或小麻煩。不影響大局，留意就好。' },
      '將軍': { emoji:'⚔️', tldr:'有威嚴、有衝勁', desc:'將軍主果斷、主威。此宮做事有氣勢但也容易衝動。適合開創，不適合靜守。' },
      '奏書': { emoji:'📜', tldr:'文書利達、有才華', desc:'主文書、考試、證照。此宮事務適合走文路、靠專業資格出頭。申請和考試有利。' },
      '飛廉': { emoji:'🌪️', tldr:'是非口舌、小人干擾', desc:'飛廉為煞神。此宮事務容易遇到非議、嫉妒或突發干擾。低調為宜，少惹事。' },
      '喜神': { emoji:'🎉', tldr:'喜氣洋洋、好事發生', desc:'此宮有喜事加持。感情宮遇到有桃花喜訊，財帛宮遇到有意外之財，整體是好事。' },
      '病符': { emoji:'🤧', tldr:'健康注意、事情拖延', desc:'此宮事務容易停滯或出狀況。不是不行，但需要耐心和注意細節。疾厄宮遇到要特別注意保養。' },
      '大耗': { emoji:'💰', tldr:'大破財、大損耗', desc:'大耗為凶星。此宮事務容易有較大的損失或意外開銷。投資和花錢要特別小心。' },
      '伏兵': { emoji:'🥷', tldr:'暗中有阻礙', desc:'表面平靜但暗藏問題。此宮事務容易有看不見的障礙或對手。做事前多調查、多防範。' },
      '官府': { emoji:'⚖️', tldr:'官非糾紛、法律注意', desc:'官府主訴訟、糾紛。此宮事務容易牽涉到規則、制度或法律問題。凡事按規矩來。' }
    };
    var bs = bsInterp[bsName];
    if (bs) {
      var bsJi = ['小耗','病符','大耗','伏兵','官府','飛廉'];
      var bsColorStyle = bsJi.indexOf(bsName) >= 0 ? '#f77' : '#ad8';
      html += '<div style="margin-top:10px;padding:10px;background:rgba(173,216,136,.08);border-radius:6px;border-left:3px solid ' + bsColorStyle + ';">';
      html += '<div style="color:' + bsColorStyle + ';font-weight:700;margin-bottom:4px;">' + bs.emoji + ' 博士十二神：' + bsName + '</div>';
      html += '<div style="font-size:.82rem;color:var(--accent);margin-bottom:4px;">👉 一句話：' + bs.tldr + '</div>';
      html += '<div style="font-size:.82rem;color:var(--muted);line-height:1.6;">' + bs.desc + '</div>';
      html += '</div>';
    }
  }

  // 對宮
  html += '<div style="margin-top:14px;padding-top:10px;border-top:1px solid var(--card-border);">';
  html += '<div style="font-size:.95rem;font-weight:700;color:var(--accent2);margin-bottom:4px;">\u{1F504} \u5C0D\u5BAE\uFF1A' + (oppP?oppP.name:'') + '\uFF08' + d.branches[oppositePos] + '\u5BAE\uFF09</div>';
  html += '<div style="font-size:.8rem;color:var(--muted);margin-bottom:6px;">\u5C0D\u5BAE\u7684\u661F\u6703\u300C\u7167\u5165\u300D\u672C\u5BAE\uFF0C\u5F71\u97FF\u529B\u7D04 60-70%\u3002\u672C\u5BAE\u7121\u4E3B\u661F\u6642\u5F71\u97FF\u66F4\u5927\u3002</div>';

  if (oppP && oppP.main.length > 0) {
    oppP.main.forEach(function(s) {
      html += '<div style="margin-left:8px;font-size:.82rem;"><span style="color:var(--accent2);">' + s.name + '</span>\uFF08' + s.brightness + '\uFF09\u7167\u5165\uFF1A' + (d.starInfo[s.name]||'') + '</div>';
    });
  } else {
    html += '<div style="font-size:.82rem;color:var(--muted);">\u5C0D\u5BAE\u4E5F\u7121\u4E3B\u661F\uFF08\u96D9\u7A7A\u5BAE\uFF09\uFF0C\u9019\u500B\u9762\u5411\u6BD4\u8F03\u81EA\u7531\u767C\u63EE\u3002</div>';
  }
  html += '</div></div>';

  var detailEl = document.getElementById('zw-detail');
  if (detailEl) {
    detailEl.innerHTML = html;
    detailEl.scrollIntoView({behavior:'smooth', block:'nearest'});
  }
});


// ========== 公司合盤 + 雙人合盤 ==========

var COMPANY_PRESETS = {
  inventec:  { name: '英業達', year: 1975, month: 6, day: 9, logo: '紅色', industry: '電子製造' },
  tsmc:      { name: '台積電', year: 1987, month: 2, day: 21, logo: '紅色', industry: '半導體' },
  foxconn:   { name: '鴻海', year: 1974, month: 2, day: 20, logo: '藍色', industry: '電子製造' },
  asus:      { name: '華碩', year: 1989, month: 4, day: 2, logo: '藍色', industry: '科技硬體' },
  acer:      { name: '宏碁', year: 1976, month: 8, day: 1, logo: '綠色', industry: '科技硬體' },
  mediatek:  { name: '聯發科', year: 1997, month: 5, day: 28, logo: '綠色', industry: '半導體' },
  delta:     { name: '台達電', year: 1971, month: 4, day: 4, logo: '紅色', industry: '電子製造' },
  quanta:    { name: '廣達', year: 1988, month: 5, day: 9, logo: '藍色', industry: '電子製造' },
  pegatron:  { name: '和碩', year: 2008, month: 1, day: 1, logo: '藍色', industry: '電子製造' },
  wistron:   { name: '緯創', year: 2001, month: 7, day: 1, logo: '藍色', industry: '電子製造' },
  compal:    { name: '仁寶', year: 1984, month: 6, day: 1, logo: '藍色', industry: '電子製造' },
  google:    { name: 'Google', year: 1998, month: 9, day: 4, logo: '紅色', industry: '軟體網路' },
  apple:     { name: 'Apple', year: 1976, month: 4, day: 1, logo: '灰色', industry: '科技硬體' },
  microsoft: { name: 'Microsoft', year: 1975, month: 4, day: 4, logo: '藍色', industry: '軟體網路' },
  nvidia:    { name: 'NVIDIA', year: 1993, month: 1, day: 22, logo: '綠色', industry: '半導體' },
  samsung:   { name: '三星', year: 1969, month: 1, day: 13, logo: '藍色', industry: '電子製造' },
  sony:      { name: 'Sony', year: 1946, month: 5, day: 7, logo: '黑色', industry: '電子製造' },
  amazon:    { name: 'Amazon', year: 1994, month: 7, day: 5, logo: '橘色', industry: '軟體網路' },
  meta:      { name: 'Meta', year: 2004, month: 2, day: 4, logo: '藍色', industry: '軟體網路' },
  tesla:     { name: 'Tesla', year: 2003, month: 7, day: 1, logo: '紅色', industry: '汽車' },
};

// 公司合盤：preset 選擇自動帶入
document.addEventListener('change', function(e) {
  if (e.target.id !== 'company-preset') return;
  var key = e.target.value;
  if (!key || !COMPANY_PRESETS[key]) return;
  var p = COMPANY_PRESETS[key];
  document.getElementById('company-name').value = p.name;
  document.getElementById('company-year').value = p.year;
  document.getElementById('company-month').value = p.month;
  document.getElementById('company-day').value = p.day;
  document.getElementById('company-logo-color').value = p.logo;
  document.getElementById('company-industry').value = p.industry;
});

// 公司合盤 + 雙人合盤：按鈕點擊
document.addEventListener('click', function(e) {
  var target = e.target.closest ? e.target.closest('button') : e.target;
  if (!target) return;
  var id = target.id;

  // 清除結果
  if (id === 'company-compat-clear') {
    var r = document.getElementById('company-compat-result');
    if (r) r.innerHTML = '';
    return;
  }

  // 公司合盤 — 開始
  if (id === 'company-compat-go') {
    doCompanyCompat();
    return;
  }

  // 雙人合盤 — 開始
  if (id === 'person-compat-go') {
    doPersonCompat();
    return;
  }
});

async function doCompanyCompat() {
  var errorDiv = document.getElementById('company-compat-error');
  var resultDiv = document.getElementById('company-compat-result');
  if (!errorDiv || !resultDiv) { console.warn('company-compat: 找不到 error/result div'); return; }
  errorDiv.textContent = '計算中...';
  resultDiv.innerHTML = '';

  // 取得 lastBaziData
  var lastBaziData = window.__getLastBaziData ? window.__getLastBaziData() : null;

  if (!lastBaziData) {
    // 嘗試從 localStorage 重算
    try {
      var saved = JSON.parse(localStorage.getItem('destiny_birth_data') || 'null');
      if (saved && saved.year && saved.month && saved.day) {
        var baziMod = await import('./engines/bazi.js');
        var baziResult = baziMod.calculate({
          year: saved.year, month: saved.month, day: saved.day,
          hour: saved.hour || 12, minute: saved.minute || 0,
          gender: saved.gender || 'female',
        });
        if (baziResult && baziResult.status === 'ok' && baziResult.data) {
          lastBaziData = baziResult.data;
          if (window.__setLastBaziData) window.__setLastBaziData(lastBaziData);
        }
      }
    } catch(ex) { console.warn('重算八字失敗:', ex); }
  }

  if (!lastBaziData) {
    errorDiv.textContent = '請先在上方計算個人命盤，才能做合盤分析。';
    return;
  }

  var year = parseInt(document.getElementById('company-year').value);
  var month = parseInt(document.getElementById('company-month').value);
  var day = parseInt(document.getElementById('company-day').value);
  var companyName = (document.getElementById('company-name').value || '').trim();
  var logoColor = document.getElementById('company-logo-color').value || '';
  var industry = document.getElementById('company-industry').value || '';

  if (!year || year < 1800 || year > 2100) { errorDiv.textContent = '請輸入公司成立年份'; return; }
  if (!month || month < 1 || month > 12) { errorDiv.textContent = '請選擇成立月份'; return; }
  if (!day || day < 1 || day > 31) { errorDiv.textContent = '請輸入成立日期'; return; }

  try {
    var engine = await import('./engines/company-compat.js');
    var result = engine.calculate(lastBaziData, {
      year: year, month: month, day: day, hour: 9,
      logoColor: logoColor, industry: industry, companyName: companyName,
    });

    var astroHtml = '';
    var personAstro = window.__lastAstroData || null;
    var personMonth = 0, personDay = 0;
    try {
      var s = JSON.parse(localStorage.getItem('destiny_birth_data') || '{}');
      personMonth = s.month || 0;
      personDay = s.day || 0;
    } catch(ex2) {}
    if (!personAstro) {
      try { var ss = JSON.parse(localStorage.getItem('destiny_astro_signs') || 'null'); if(ss) personAstro = ss; } catch(ex3) {}
    }
    try {
      var astroResult = engine.calculateAstro(personAstro, { month: month, day: day, companyName: companyName, personMonth: personMonth, personDay: personDay });
      if (astroResult.status === 'ok') astroHtml = astroResult.html;
    } catch(ex4) {}

    var mayaHtml = '';
    if (window.__lastMayaData) {
      try {
        var mayaResult = engine.calculateMaya(window.__lastMayaData, { year: year, month: month, day: day, companyName: companyName });
        if (mayaResult.status === 'ok') mayaHtml = mayaResult.html;
      } catch(ex5) {}
    }

    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'border-bottom:1px solid var(--card-border);padding-bottom:20px;margin-bottom:20px;';
    wrapper.innerHTML = result.html + astroHtml + mayaHtml;
    resultDiv.prepend(wrapper);
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    errorDiv.textContent = '計算錯誤：' + err.message;
    console.error('公司合盤錯誤:', err);
  }
}

async function doPersonCompat() {
  var errorDiv = document.getElementById('person-compat-error');
  var resultDiv = document.getElementById('person-compat-result');
  if (!errorDiv || !resultDiv) return;
  errorDiv.textContent = '';
  resultDiv.innerHTML = '';

  var person1;
  try { person1 = JSON.parse(localStorage.getItem('destiny_birth_data') || 'null'); } catch(ex) {}
  if (!person1 || !person1.year || !person1.month || !person1.day) {
    errorDiv.textContent = '請先在上方計算個人命盤。';
    return;
  }

  var year = parseInt(document.getElementById('person2-year').value);
  var month = parseInt(document.getElementById('person2-month').value);
  var day = parseInt(document.getElementById('person2-day').value);
  var hourVal = document.getElementById('person2-hour').value;
  var hour = (hourVal !== '' && hourVal != null) ? parseInt(hourVal) : 12;
  var minuteVal = document.getElementById('person2-minute').value;
  var minute = (minuteVal !== '' && minuteVal != null) ? parseInt(minuteVal) : 0;
  var gender = document.getElementById('person2-gender').value || 'male';
  var relation = document.getElementById('person2-relation').value || 'friend';

  if (!year || year < 1900 || year > 2100) { errorDiv.textContent = '請輸入對方出生年份'; return; }
  if (!month || month < 1 || month > 12) { errorDiv.textContent = '請選擇對方出生月份'; return; }
  if (!day || day < 1 || day > 31) { errorDiv.textContent = '請輸入對方出生日期'; return; }

  try {
    var engine = await import('./engines/person-compat.js');
    var person2 = { year: year, month: month, day: day, hour: hour, minute: minute, gender: gender };
    var result = engine.calculate(person1, person2, relation);

    if (result.status === 'ok') {
      resultDiv.innerHTML = result.html;
      resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      errorDiv.textContent = result.error || '計算失敗';
    }
  } catch (err) {
    errorDiv.textContent = '計算錯誤：' + err.message;
    console.error('雙人合盤錯誤:', err);
  }
}

// ========== AI 深度解讀：複製 Prompt ==========
// 用事件委派，讀取頁面上嵌入的 #ai-prompt-text，連快取重開也能複製
document.addEventListener('click', function(e) {
  var btn = e.target.closest ? e.target.closest('#btn-ai-copy') : null;
  if (!btn) return;

  var ta = document.getElementById('ai-prompt-text');
  var text = ta ? ta.value : '';
  if (!text) { btn.textContent = '⚠️ 找不到內容，請重新計算'; return; }

  var done = function() {
    btn.textContent = '✅ 已複製！貼到任何 AI 就能解讀';
    setTimeout(function() { btn.textContent = '📋 複製完整解讀 Prompt'; }, 3000);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(function() {
      // fallback
      ta && ta.select();
      try { document.execCommand('copy'); done(); } catch (err) { btn.textContent = '⚠️ 複製失敗，請手動選取'; }
    });
  } else {
    ta && ta.select();
    try { document.execCommand('copy'); done(); } catch (err) { btn.textContent = '⚠️ 複製失敗，請手動選取'; }
  }
});
