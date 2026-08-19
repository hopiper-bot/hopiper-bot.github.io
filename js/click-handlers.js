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

  // === 評分邏輯（不變，但結果用法不同） ===
  function generateSummary(palace, pos, oppPalace, data) {
    var points = [];
    palace.main.forEach(function(s) {
      if (s.brightness === '廟' || s.brightness === '旺') points.push({ score: 1, text: s.name + '（' + s.brightness + '）加持', tag: 'star' });
      else if (s.brightness === '陷') points.push({ score: -1, text: s.name + '（陷）力量不足', tag: 'star' });
    });
    var sihuaHere = data.sihuaPalaces[palace.name];
    if (sihuaHere) {
      sihuaHere.forEach(function(item) {
        var type = item.charAt(0);
        if (type === '祿') points.push({ score: 1, text: '化祿（順利有資源）', tag: 'sihua' });
        else if (type === '權') points.push({ score: 1, text: '化權（有掌控力）', tag: 'sihua' });
        else if (type === '科') points.push({ score: 1, text: '化科（有貴人名聲）', tag: 'sihua' });
        else if (type === '忌') points.push({ score: -1, text: '化忌（需多經營）', tag: 'sihua' });
      });
    }
    var csGood = ['長生','冠帶','臨官','帝旺'];
    var csBad = ['衰','病','死','絕'];
    var csName = data.changsheng && data.changsheng[pos];
    if (csName) {
      if (csGood.indexOf(csName) >= 0) points.push({ score: 1, text: '長生位「' + csName + '」能量旺', tag: 'cs' });
      else if (csBad.indexOf(csName) >= 0) points.push({ score: -1, text: '長生位「' + csName + '」能量弱', tag: 'cs' });
    }
    var bsGood = ['博士','力士','青龍','將軍','奏書','喜神'];
    var bsJi = ['小耗','病符','大耗','伏兵','官府','飛廉'];
    var bsName = data.boshi && data.boshi[pos];
    if (bsName) {
      if (bsGood.indexOf(bsName) >= 0) points.push({ score: 1, text: '博士神「' + bsName + '」吉利', tag: 'bs' });
      else if (bsJi.indexOf(bsName) >= 0) points.push({ score: -1, text: '博士神「' + bsName + '」要留意', tag: 'bs' });
    }
    if (palace.main.length === 0) points.push({ score: -1, text: '無主星，受外在影響大', tag: 'star' });
    var totalScore = 0;
    points.forEach(function(pt) { totalScore += pt.score; });
    var good = points.filter(function(pt) { return pt.score > 0; });
    var bad = points.filter(function(pt) { return pt.score < 0; });
    var summaryColor, summaryEmoji, summaryLevel;
    if (totalScore >= 2) { summaryEmoji = '🟢'; summaryColor = '#4f4'; summaryLevel = 'great'; }
    else if (totalScore >= 0) { summaryEmoji = '🟡'; summaryColor = '#fc0'; summaryLevel = 'ok'; }
    else { summaryEmoji = '🟠'; summaryColor = '#f84'; summaryLevel = 'challenge'; }
    return { emoji: summaryEmoji, color: summaryColor, level: summaryLevel, good: good, bad: bad, totalScore: totalScore };
  }

  var summary = generateSummary(p, pos, oppP, d);

  // === 產生「綜合敘述」（不重複第二層的逐星解讀） ===
  function generateNarrative(palace, pos, data, summary, oppP) {
    var parts = [];

    // 主星人設標籤（用 STAR_PERSONA 對照表，不抄 starInfo）
    var STAR_PERSONA = {
      '紫微': '帝王星 — 天生有領袖氣場，做事大器但自尊心高',
      '天機': '軍師星 — 聰明善謀、反應快，但想太多容易猶豫',
      '太陽': '光明星 — 熱心博愛、愛面子，適合站在台前發光',
      '武曲': '財星 — 務實果斷、執行力強，做事不囉嗦',
      '天同': '福星 — 溫和好相處，但容易安逸、缺乏衝勁',
      '廉貞': '桃花殺星 — 有野心有魅力，在高壓環境如魚得水',
      '天府': '庫星 — 穩重保守、守成有餘，適合管錢管人',
      '太陰': '月亮星 — 細膩敏感、有藝術天份，內心世界豐富',
      '貪狼': '慾望星 — 多才多藝、興趣廣泛，桃花旺但不專一',
      '巨門': '暗星 — 口才犀利、分析力強，說話容易得罪人',
      '天相': '印星 — 斯文有禮、善於協調，適合輔佐角色',
      '天梁': '蔭星 — 正派有威望、逢凶化吉，適合專業路線',
      '七殺': '將星 — 有魄力有衝勁，獨當一面但不服管',
      '破軍': '破壞星 — 敢打破現狀，前半生折騰後半生穩定'
    };

    // 第一句：主星人設
    if (palace.main.length >= 2) {
      var k1 = palace.main[0].name + '+' + palace.main[1].name;
      var k2 = palace.main[1].name + '+' + palace.main[0].name;
      var combo = data.starCombos[k1] || data.starCombos[k2];
      if (combo) {
        // 取組合的「冒號後第一句」作為人設
        var colonIdx = combo.indexOf('：');
        if (colonIdx > 0) {
          var comboDesc = combo.substring(colonIdx + 1);
          var sentences = comboDesc.split('。').filter(function(s){ return s.trim().length > 0; });
          parts.push(sentences[0] + '。');
          if (sentences.length > 1) parts.push(sentences[1] + '。');
        }
      } else {
        // 沒有組合資料，用兩顆星的 persona 拼
        parts.push(palace.main.map(function(s){ return (STAR_PERSONA[s.name] || s.name); }).join('；') + '。');
      }
    } else if (palace.main.length === 1) {
      var persona = STAR_PERSONA[palace.main[0].name];
      if (persona) parts.push(persona + '。');
    } else {
      parts.push('此宮無主星，個性上比較隨環境而變，彈性大但方向感較弱。');
    }

    // 第二句：亮度評價
    if (palace.main.length > 0) {
      var brightParts = [];
      palace.main.forEach(function(s) {
        if (s.brightness === '廟') brightParts.push(s.name + '在最強位置（廟），能量全開');
        else if (s.brightness === '旺') brightParts.push(s.name + '狀態不錯（旺），發揮順暢');
        else if (s.brightness === '陷') brightParts.push(s.name + '力量偏弱（陷），特質容易走偏或被壓抑');
      });
      if (brightParts.length > 0) parts.push(brightParts.join('；') + '。');
    }

    // 第三句：四化加味
    var sihuaHere = data.sihuaPalaces[palace.name];
    if (sihuaHere && sihuaHere.length > 0) {
      var huaParts = [];
      sihuaHere.forEach(function(item) {
        var type = item.charAt(0);
        if (type === '祿') huaParts.push('化祿加持，這方面容易有好運和資源');
        else if (type === '權') huaParts.push('化權加持，掌控力強、容易當家作主');
        else if (type === '科') huaParts.push('化科加持，有貴人看見、名聲好');
        else if (type === '忌') huaParts.push('化忌提醒，這方面是今生功課，越經營越好');
      });
      parts.push(huaParts.join('。') + '。');
    }

    // 第四句：吉煞星影響（如果有顯著的）
    var jiStars = ['文昌','文曲','左輔','右弼','天魁','天鉞','祿存','天馬'];
    var shaStars = ['火星','鈴星','擎羊','陀羅','地空','地劫'];
    var jiHere = []; var shaHere = [];
    palace.minor.forEach(function(s) {
      if (jiStars.indexOf(s) >= 0) jiHere.push(s);
      else if (shaStars.indexOf(s) >= 0) shaHere.push(s);
    });
    var auxParts = [];
    if (jiHere.length > 0) auxParts.push('有 ' + jiHere.join('、') + ' 助陣，貴人運和才華加分');
    if (shaHere.length > 0) auxParts.push('但 ' + shaHere.join('、') + ' 同宮，個性上容易衝動或遇阻力');
    if (auxParts.length > 0) parts.push(auxParts.join('；') + '。');

    // 第五句：對宮補充（如果本宮無主星或對宮很強）
    if (palace.main.length === 0 && oppP && oppP.main.length > 0) {
      parts.push('借對宮 ' + oppP.main.map(function(s){return s.name;}).join('、') + ' 的能量，受對面影響大。');
    }

    return parts.join('');
  }

  var narrativeText = generateNarrative(p, pos, d, summary, oppP);

  // ============================
  // 開始組裝 HTML — 新版分層結構
  // ============================
  var html = '<div style="padding:14px;background:rgba(123,108,246,.06);border-radius:10px;font-size:.85rem;line-height:1.8;">';

  // ═══════════════════════════════════════
  // 第一層：標題 + 人設結論 + 評分展開
  // ═══════════════════════════════════════
  html += '<div style="margin-bottom:12px;">';
  // 標題行
  html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">';
  html += '<span style="font-size:1.1rem;font-weight:700;color:var(--accent);">' + p.name + '</span>';
  html += '<span style="font-size:.8rem;color:var(--muted);">（' + p.branch + '宮）</span>';
  if (d.shenPos !== undefined && pos === d.shenPos) {
    html += '<span style="font-size:.72rem;padding:1px 6px;background:#e9a;color:#000;border-radius:3px;font-weight:600;">身宮</span>';
  }
  html += '</div>';
  // 宮位一句話定位
  html += '<div style="font-size:.82rem;color:var(--muted);margin-bottom:8px;">' + (d.palaceInfo[p.name]||'') + '</div>';
  // 綜合敘述（多句段落，跟第二層的逐星解讀不重複）
  html += '<div style="font-size:.9rem;color:var(--text);margin-bottom:8px;line-height:1.7;padding:10px 12px;background:rgba(245,197,66,.06);border-radius:8px;border-left:4px solid ' + summary.color + ';">';
  html += '<div style="font-weight:700;margin-bottom:4px;">' + summary.emoji + ' 白話總結</div>';
  html += narrativeText;
  html += '</div>';
  // 評分理由（條列，但簡短）
  html += '<div style="padding:6px 10px;background:var(--input-bg);border-radius:6px;font-size:.78rem;">';
  if (summary.good.length > 0) {
    html += '<span style="color:#4f4;">';
    summary.good.forEach(function(g, i) {
      html += (i > 0 ? '｜' : '▲ ') + g.text;
    });
    html += '</span>';
  }
  if (summary.good.length > 0 && summary.bad.length > 0) html += '<br>';
  if (summary.bad.length > 0) {
    html += '<span style="color:#f84;">';
    summary.bad.forEach(function(b, i) {
      html += (i > 0 ? '｜' : '▼ ') + b.text;
    });
    html += '</span>';
  }
  html += '</div>';
  html += '</div>';

  // ═══════════════════════════════════════
  // 第二層：主星完整解讀 + 四化 + 吉煞星
  // ═══════════════════════════════════════
  html += '<div style="margin-bottom:12px;border-top:1px solid var(--card-border);padding-top:10px;">';

  if (p.main.length > 0) {
    p.main.forEach(function(s) {
      var bColor = (s.brightness === '廟' || s.brightness === '旺') ? 'var(--accent)' : s.brightness === '陷' ? '#f55' : 'var(--muted)';
      var interpKey = s.name + '_' + p.name;
      var interp = (d.starInPalace && d.starInPalace[interpKey]) || d.starInfo[s.name] || '';
      html += '<div style="margin-bottom:8px;padding:8px 10px;background:var(--input-bg);border-radius:6px;">';
      html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">';
      html += '<span style="font-size:.92rem;font-weight:700;color:var(--accent);">' + s.name + '</span>';
      html += '<span style="font-size:.72rem;padding:1px 5px;border-radius:3px;background:' + bColor + ';color:#fff;font-weight:600;">' + s.brightness + '</span>';
      // 四化標記（如果這顆星有四化）
      var sihuaHere2 = d.sihuaPalaces[p.name];
      if (sihuaHere2) {
        sihuaHere2.forEach(function(item) {
          var starInItem = item.split('→')[1];
          if (starInItem === s.name) {
            var type = item.charAt(0);
            var huaColor = type === '祿' ? '#4f4' : type === '權' ? '#f84' : type === '科' ? '#8cf' : type === '忌' ? '#f55' : 'var(--muted)';
            html += '<span style="font-size:.7rem;padding:1px 4px;border-radius:3px;background:' + huaColor + ';color:#000;font-weight:700;">化' + type + '</span>';
          }
        });
      }
      html += '</div>';
      html += '<div style="font-size:.82rem;color:var(--text);line-height:1.7;">' + interp + '</div>';
      html += '</div>';
    });
    // 雙星組合
    if (p.main.length >= 2) {
      var key1 = p.main[0].name + '+' + p.main[1].name;
      var key2 = p.main[1].name + '+' + p.main[0].name;
      var combo = d.starCombos[key1] || d.starCombos[key2];
      if (combo) {
        html += '<div style="padding:8px 10px;background:rgba(245,197,66,.08);border-radius:6px;border-left:3px solid var(--accent);margin-bottom:8px;">';
        html += '<div style="font-size:.8rem;font-weight:700;color:var(--accent);margin-bottom:2px;">⚡ 組合效應</div>';
        html += '<div style="font-size:.82rem;color:var(--text);line-height:1.6;">' + combo + '</div>';
        html += '</div>';
      }
    }
  } else {
    html += '<div style="padding:8px 10px;background:var(--input-bg);border-radius:6px;color:var(--muted);font-size:.83rem;line-height:1.6;">此宮無主星 — 借對宮星力。你在這個面向比較「看情況」，受環境和對宮影響大。彈性是優點，但方向感較弱。</div>';
  }

  // 四化落此宮（獨立於主星卡片之外）
  var sihuaHere = d.sihuaPalaces[p.name];
  if (sihuaHere) {
    html += '<div style="padding:8px 10px;background:rgba(123,108,246,.05);border-radius:6px;margin-bottom:8px;">';
    html += '<div style="font-size:.8rem;font-weight:700;color:var(--accent2);margin-bottom:3px;" title="四化 = 祿權科忌，代表今生被激活的能量方向">🔮 此宮四化</div>';
    sihuaHere.forEach(function(item) {
      var type = item.charAt(0);
      var interp = '';
      if (type === '祿' && d.sihuaPalaceInterp['祿']) interp = d.sihuaPalaceInterp['祿'][p.name] || '';
      if (type === '忌' && d.sihuaPalaceInterp['忌']) interp = d.sihuaPalaceInterp['忌'][p.name] || '';
      var color = type === '祿' ? '#4f4' : type === '權' ? '#f84' : type === '科' ? '#8cf' : type === '忌' ? '#f55' : 'var(--text)';
      html += '<div style="margin-bottom:3px;"><span style="color:' + color + ';font-weight:700;">' + item + '</span>';
      if (interp) html += '<span style="font-size:.8rem;color:var(--muted);margin-left:6px;">' + interp + '</span>';
      html += '</div>';
    });
    html += '</div>';
  }

  // 吉星 / 煞星 — 用標籤+一句話形式（比舊版緊湊但資訊不少）
  if (p.minor.length > 0) {
    var jiStars = ['文昌','文曲','左輔','右弼','天魁','天鉞','祿存','天馬'];
    var shaStars = ['火星','鈴星','擎羊','陀羅','地空','地劫'];
    var jiList = []; var shaList = []; var otherList = [];
    p.minor.forEach(function(s) {
      if (jiStars.indexOf(s) >= 0) jiList.push(s);
      else if (shaStars.indexOf(s) >= 0) shaList.push(s);
      else otherList.push(s);
    });
    if (jiList.length > 0) {
      html += '<div style="padding:6px 10px;background:rgba(79,255,79,.05);border-radius:6px;margin-bottom:4px;border-left:3px solid #4f4;">';
      html += '<span style="font-size:.78rem;font-weight:700;color:#4f4;">✨ 吉星：</span>';
      jiList.forEach(function(s, i) {
        html += '<span style="font-size:.8rem;color:var(--text);">' + (i > 0 ? '、' : '') + s + '</span>';
        var info = d.starInfo[s] || '';
        if (info) {
          var short = info.split('。')[0];
          html += '<span style="font-size:.75rem;color:var(--muted);">（' + short + '）</span>';
        }
      });
      html += '</div>';
    }
    if (shaList.length > 0) {
      html += '<div style="padding:6px 10px;background:rgba(255,85,85,.05);border-radius:6px;margin-bottom:4px;border-left:3px solid #f55;">';
      html += '<span style="font-size:.78rem;font-weight:700;color:#f55;">⚡ 煞星：</span>';
      shaList.forEach(function(s, i) {
        html += '<span style="font-size:.8rem;color:var(--text);">' + (i > 0 ? '、' : '') + s + '</span>';
        var info = d.starInfo[s] || '';
        if (info) {
          var short = info.split('。')[0];
          html += '<span style="font-size:.75rem;color:var(--muted);">（' + short + '）</span>';
        }
      });
      html += '</div>';
    }
    if (otherList.length > 0) {
      html += '<div style="padding:4px 10px;font-size:.78rem;color:var(--muted);">其他：' + otherList.join('、') + '</div>';
    }
  }
  html += '</div>';

  // ═══════════════════════════════════════
  // 第三層：三方四正 — 表格式（緊湊）
  // ═══════════════════════════════════════
  var sanhePos1 = (pos + 4) % 12;
  var sanhePos2 = (pos + 8) % 12;
  var sanheP1 = d.posMap[sanhePos1];
  var sanheP2 = d.posMap[sanhePos2];

  html += '<div style="margin-bottom:12px;border-top:1px solid var(--card-border);padding-top:10px;">';
  html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">';
  html += '<span style="font-size:.88rem;font-weight:700;color:var(--accent2);">🔮 三方四正</span>';
  html += '<span style="font-size:.7rem;color:var(--muted);cursor:help;" title="三方四正 = 本宮 + 對宮 + 兩個三合宮，四個位置的星曜互相會照構成完整格局。對宮影響力約60-70%，三合宮約30-40%。">ⓘ</span>';
  html += '</div>';

  // 表格
  html += '<div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:2px;font-size:.78rem;">';
  // header
  html += '<div style="padding:4px 6px;font-weight:600;color:var(--muted);">方位</div>';
  html += '<div style="padding:4px 6px;font-weight:600;color:var(--muted);">宮位 / 主星</div>';
  html += '<div style="padding:4px 6px;font-weight:600;color:var(--muted);">一句話</div>';
  // 對宮
  html += '<div style="padding:4px 6px;color:var(--accent2);font-weight:600;">對宮</div>';
  html += '<div style="padding:4px 6px;">' + (oppP ? oppP.name : '') + '：' + (oppP && oppP.main.length > 0 ? oppP.main.map(function(s){return '<b>' + s.name + '</b><sub style=\"color:var(--muted);\">' + s.brightness + '</sub>';}).join(' ') : '<span style="color:var(--muted);">無主星</span>') + '</div>';
  html += '<div style="padding:4px 6px;color:var(--muted);">' + (oppP && oppP.main.length > 0 ? (d.starInfo[oppP.main[0].name] || '').split('。')[0] : '自由發揮') + '</div>';
  // 三合1
  html += '<div style="padding:4px 6px;color:#c90;font-weight:600;">三合</div>';
  html += '<div style="padding:4px 6px;">' + (sanheP1 ? sanheP1.name : '') + '：' + (sanheP1 && sanheP1.main.length > 0 ? sanheP1.main.map(function(s){return '<b>' + s.name + '</b><sub style=\"color:var(--muted);\">' + s.brightness + '</sub>';}).join(' ') : '<span style="color:var(--muted);">無主星</span>') + '</div>';
  html += '<div style="padding:4px 6px;color:var(--muted);">' + (sanheP1 && sanheP1.main.length > 0 ? (d.starInfo[sanheP1.main[0].name] || '').split('。')[0] : '看環境') + '</div>';
  // 三合2
  html += '<div style="padding:4px 6px;color:#c90;font-weight:600;">三合</div>';
  html += '<div style="padding:4px 6px;">' + (sanheP2 ? sanheP2.name : '') + '：' + (sanheP2 && sanheP2.main.length > 0 ? sanheP2.main.map(function(s){return '<b>' + s.name + '</b><sub style=\"color:var(--muted);\">' + s.brightness + '</sub>';}).join(' ') : '<span style="color:var(--muted);">無主星</span>') + '</div>';
  html += '<div style="padding:4px 6px;color:var(--muted);">' + (sanheP2 && sanheP2.main.length > 0 ? (d.starInfo[sanheP2.main[0].name] || '').split('。')[0] : '看環境') + '</div>';
  html += '</div>';

  // 三方吉煞統計（一行）
  var liuji = ['文昌','文曲','左輔','右弼','天魁','天鉞'];
  var liusha = ['火星','鈴星','擎羊','陀羅','地空','地劫'];
  var allMinorInSanfang = [];
  if (oppP) oppP.minor.forEach(function(s) { allMinorInSanfang.push(s); });
  if (sanheP1) sanheP1.minor.forEach(function(s) { allMinorInSanfang.push(s); });
  if (sanheP2) sanheP2.minor.forEach(function(s) { allMinorInSanfang.push(s); });
  var jiCount = allMinorInSanfang.filter(function(s) { return liuji.indexOf(s) >= 0; }).length;
  var shaCount = allMinorInSanfang.filter(function(s) { return liusha.indexOf(s) >= 0; }).length;
  if (jiCount > 0 || shaCount > 0) {
    html += '<div style="margin-top:6px;font-size:.76rem;color:var(--muted);">';
    if (jiCount > 0) html += '<span style="color:#4f4;">三方 ' + jiCount + ' 吉星會照</span>';
    if (jiCount > 0 && shaCount > 0) html += ' · ';
    if (shaCount > 0) html += '<span style="color:#f55;">' + shaCount + ' 煞星夾攻</span>';
    html += '</div>';
  }
  html += '</div>';

  // ═══════════════════════════════════════
  // 第四層：更多資訊（收合）
  // ═══════════════════════════════════════
  var hasLayer4 = false;
  var layer4Html = '';

  // 宮位關聯
  var palaceRelations = {
    '命宮': '命宮的「裡面」是福德宮（內心世界），命宮的「身體」是疾厄宮。三者合看才完整。',
    '財帛': '財帛宮看「怎麼賺」，事業宮看「做什麼工作」，田宅宮看「存下多少」。三個一起看財務全貌。',
    '事業': '事業宮看方向，財帛宮看收入，遷移宮看外出發展機會。三方連動。',
    '夫妻': '夫妻宮看伴侶類型，福德宮看你內心想要什麼，子女宮看親密關係的延伸。',
    '子女': '子女宮也代表創造力和投資運。跟財帛宮一起看投資方向，跟夫妻宮一起看後代。',
    '疾厄': '疾厄宮看先天體質，福德宮看心理健康，命宮看整體生命力。三者交叉影響。',
    '遷移': '遷移宮看外在世界的運勢，跟命宮形成「內外對比」— 有人在家好、有人出去好。',
    '交友': '交友宮看「外面的人脈」，兄弟宮看「身邊的人」。兩個一起看人際全貌。',
    '兄弟': '兄弟宮看平輩互動（同事、手足），交友宮看社會人脈。兩個一起看合作格局。',
    '田宅': '田宅宮看居住和不動產，財帛宮看現金流，福德宮看居家安全感。三者連動。',
    '福德': '福德宮是「內在的命宮」— 命宮給別人看的，福德是你自己感受的。也影響健康和壽命。',
    '父母': '父母宮也代表學習運和文書運。跟事業宮一起看考證照/升遷，跟命宮一起看家庭背景影響。'
  };
  if (palaceRelations[p.name]) {
    hasLayer4 = true;
    layer4Html += '<div style="margin-bottom:8px;font-size:.8rem;color:var(--muted);line-height:1.6;"><b style="color:var(--accent2);">🔗 宮位關聯：</b>' + palaceRelations[p.name] + '</div>';
  }

  // 身宮說明
  if (d.shenPos !== undefined && pos === d.shenPos) {
    hasLayer4 = true;
    layer4Html += '<div style="margin-bottom:8px;font-size:.8rem;color:#e9a;line-height:1.6;"><b>🏠 身宮：</b>這裡是你的身宮，代表後天人生重心。你最花心力、最在意的領域就是這個宮位代表的事情。</div>';
  }

  // 長生十二宮
  if (d.changsheng && d.changsheng[pos]) {
    var csName = d.changsheng[pos];
    var csInterp = {
      '長生': { emoji:'🌱', tldr:'剛發芽，潛力滿滿', desc:'像嬰兒出生 — 這個宮位的事務充滿活力和可能性。容易起步、有人幫忙、發展順利。' },
      '沐浴': { emoji:'🛁', tldr:'有魅力但不穩定', desc:'像青少年叛逆期 — 這方面的事容易有誘惑、變動、桃花。不是壞事，但需要判斷力。感情宮遇到特別精彩。' },
      '冠帶': { emoji:'👔', tldr:'正在茁壯，被人看見', desc:'像剛出社會的年輕人 — 積極表現、逐漸被肯定。這方面的事正在上軌道，持續努力就會有成果。' },
      '臨官': { emoji:'📈', tldr:'穩定上升，有實力', desc:'像職場中堅 — 做事有條有理、穩定發展。這方面的事已經有基礎，容易升遷或掌權。' },
      '帝旺': { emoji:'🔥', tldr:'最旺！但小心過頭', desc:'巔峰狀態 — 這個宮位的能量最強。但物極必反，太強也可能過度執著或衝過頭。旺到頂了就該轉彎。' },
      '衰':   { emoji:'🍂', tldr:'過了高峰，需要調整', desc:'像秋天落葉 — 不是完蛋，是過了最猛的階段。這方面的事需要換個策略，硬撐不如轉型。' },
      '病':   { emoji:'🤒', tldr:'能量低，別硬撐', desc:'不是真的生病，是這方面的事容易拖延或出小問題。適合休養生息、降低期望值。養好了再出發。' },
      '死':   { emoji:'💀', tldr:'暫停，重新想方向', desc:'不是真死！是這方面的事暫時停滯、需要歸零重來。反而可能是轉機 — 舊的不去新的不來。' },
      '墓':   { emoji:'💰', tldr:'悶聲累積型，低調有實力', desc:'東西藏在倉庫裡 — 這方面的事你傾向保守、不張揚，但暗中其實有在累積。適合存錢、存實力，不適合高調。財帛宮遇到 = 悶聲發財。' },
      '絕':   { emoji:'⚡', tldr:'歸零，但絕處逢生', desc:'能量歸零 — 但「絕」的下一步就是「胎」（新生）。這方面的事可能要經歷一次砍掉重練，之後反而海闊天空。' },
      '胎':   { emoji:'🥒', tldr:'種子種下了，還沒發芽', desc:'懷孕期 — 新的可能性正在醞釀，還看不到成果但已經有東西在長。耐心等，不要太早期待收穫。' },
      '養':   { emoji:'🌤️', tldr:'慢慢養，時機未到', desc:'像花苞等著開 — 這方面的事需要時間和耐心。不能急、不能催，但只要持續投入，時間到了自然會綻放。' }
    };
    var cs = csInterp[csName];
    if (cs) {
      hasLayer4 = true;
      layer4Html += '<div style="margin-bottom:6px;font-size:.8rem;line-height:1.6;"><span style="color:#9cb;font-weight:600;">' + cs.emoji + ' 長生十二宮：' + csName + '</span> — ' + cs.tldr + '<br><span style="color:var(--muted);">' + cs.desc + '</span></div>';
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
      hasLayer4 = true;
      var bsJi = ['小耗','病符','大耗','伏兵','官府','飛廉'];
      var bsColorStyle = bsJi.indexOf(bsName) >= 0 ? '#f77' : '#ad8';
      layer4Html += '<div style="margin-bottom:6px;font-size:.8rem;line-height:1.6;"><span style="color:' + bsColorStyle + ';font-weight:600;">' + bs.emoji + ' 博士十二神：' + bsName + '</span> — ' + bs.tldr + '<br><span style="color:var(--muted);">' + bs.desc + '</span></div>';
    }
  }

  // 三方四正詳細展開（完整解讀給進階者看）
  hasLayer4 = true;
  layer4Html += '<div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--card-border);">';
  layer4Html += '<div style="font-size:.78rem;font-weight:600;color:var(--accent2);margin-bottom:4px;">三方四正詳細</div>';
  // 對宮
  if (oppP && oppP.main.length > 0) {
    layer4Html += '<div style="font-size:.78rem;margin-bottom:4px;"><span style="color:var(--accent2);">對宮 ' + oppP.name + '：</span>';
    oppP.main.forEach(function(s) { layer4Html += s.name + '（' + s.brightness + '）— ' + ((d.starInfo[s.name]||'').split('。')[0]) + '。'; });
    layer4Html += '</div>';
  }
  if (sanheP1 && sanheP1.main.length > 0) {
    layer4Html += '<div style="font-size:.78rem;margin-bottom:4px;"><span style="color:#c90;">三合 ' + sanheP1.name + '：</span>';
    sanheP1.main.forEach(function(s) { layer4Html += s.name + '（' + s.brightness + '）— ' + ((d.starInfo[s.name]||'').split('。')[0]) + '。'; });
    layer4Html += '</div>';
  }
  if (sanheP2 && sanheP2.main.length > 0) {
    layer4Html += '<div style="font-size:.78rem;margin-bottom:4px;"><span style="color:#c90;">三合 ' + sanheP2.name + '：</span>';
    sanheP2.main.forEach(function(s) { layer4Html += s.name + '（' + s.brightness + '）— ' + ((d.starInfo[s.name]||'').split('。')[0]) + '。'; });
    layer4Html += '</div>';
  }
  layer4Html += '</div>';

  // 組裝第四層
  if (hasLayer4) {
    html += '<details style="border-top:1px solid var(--card-border);padding-top:8px;">';
    html += '<summary style="cursor:pointer;font-size:.82rem;font-weight:600;color:var(--muted);padding:4px 0;">📖 更多細節（長生、博士、宮位關聯、三方四正解讀）</summary>';
    html += '<div style="padding:8px 0;font-size:.8rem;line-height:1.7;">' + layer4Html + '</div>';
    html += '</details>';
  }

  html += '</div>'; // end main container

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
