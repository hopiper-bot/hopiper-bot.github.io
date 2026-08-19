/**
 * main.js — Orchestrator
 * 輸入驗證、引擎調度（Progressive Rendering）、結果收集→Synthesis→UI 渲染
 * 
 * v4 改進：
 * - Progressive rendering：每個引擎獨立計算、獨立渲染，壞一個不影響其他
 * - URL query 帶入：支援 ?y=1990&m=5&d=15&h=14&min=30&loc=台北&g=female 直接計算
 * - Result cache：上次結果存 localStorage，重開頁面秒顯示
 */

import * as ui from './ui.js';
import * as mayaEngine from './engines/maya.js';
import * as astroEngine from './engines/astro.js';
import * as baziEngine from './engines/bazi.js';
import * as ziweiEngine from './engines/ziwei.js';
import * as hdEngine from './engines/human-design.js';
import * as synthesisEngine from './engines/synthesis.js';
import * as transitEngine from './engines/transit.js';
import { timeGua, numberGua, textGua, renderMeihua } from './engines/meihua.js';
import { renderShareToolbar, attachShareHandlers } from './share.js';
import { calculateDaily, renderDaily } from './engines/daily-energy.js';

// 全域儲存最新的個人八字結果，供公司合盤使用（click-handlers.js 透過 window.__getLastBaziData 讀取）
let lastBaziData = null;

/** 應用程式初始化 */
function init() {
  ui.initTabs();
  initThemeToggle();
  initDailyEnergy();

  // 清除舊版殘留的 Groq API Key（AI 即時解讀功能已移除）
  try { localStorage.removeItem('groq_api_key'); } catch (e) {}

  // 綁定表單提交
  const form = document.getElementById('birth-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      calculate();
    });
  }

  // 優先檢查 URL query 帶入
  const urlData = parseURLQuery();
  if (urlData) {
    fillForm(urlData);
    // 延遲一小段時間讓 DOM 穩定後自動計算
    setTimeout(() => calculate(), 100);
  } else {
    // 從 localStorage 恢復上次輸入
    restoreInput();
    // 嘗試恢復上次計算結果（秒開）
    restoreCachedResults();
  }
}

// ============ Theme Toggle ============

function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  // 恢復上次選擇
  const saved = localStorage.getItem('destiny_theme');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    btn.textContent = '☀️';
  }

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'light') {
      document.documentElement.removeAttribute('data-theme');
      btn.textContent = '🌙';
      localStorage.setItem('destiny_theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      btn.textContent = '☀️';
      localStorage.setItem('destiny_theme', 'light');
    }
  });
}

// ============ Daily Energy ============

function initDailyEnergy() {
  try {
    const data = calculateDaily();
    const dateEl = document.getElementById('daily-energy-date');
    const contentEl = document.getElementById('daily-energy-content');
    if (dateEl) dateEl.textContent = `${data.date}（${data.weekday}）`;
    if (contentEl) contentEl.innerHTML = renderDaily(data);
  } catch (e) {
    console.warn('今日能量計算失敗:', e);
    const contentEl = document.getElementById('daily-energy-content');
    if (contentEl) contentEl.innerHTML = '<span style="color:var(--muted);font-size:.82rem;">今日能量暫時無法顯示</span>';
  }
}

// ============ URL Query 支援 ============

/**
 * 解析 URL query parameters
 * 支援格式：?y=1990&m=5&d=15&h=14&min=30&loc=台北&g=female
 */
function parseURLQuery() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('y')) return null; // 至少要有年份才視為有效

  const data = {
    year: parseInt(params.get('y')) || 0,
    month: parseInt(params.get('m')) || 0,
    day: parseInt(params.get('d')) || 0,
    hour: params.has('h') ? parseInt(params.get('h')) : -1,
    minute: parseInt(params.get('min')) || 0,
    location: params.get('loc') || '',
    gender: params.get('g') || 'male',
  };

  // 至少日期完整才算有效
  if (data.year && data.month && data.day) return data;
  return null;
}

/**
 * 將資料填入表單欄位
 */
function fillForm(data) {
  if (data.year) document.getElementById('birth-year').value = data.year;
  if (data.month) document.getElementById('birth-month').value = data.month;
  if (data.day) document.getElementById('birth-day').value = data.day;
  if (data.hour >= 0) document.getElementById('birth-hour').value = data.hour;
  if (data.minute >= 0) document.getElementById('birth-minute').value = data.minute;
  if (data.location) document.getElementById('birth-location').value = data.location;
  if (data.gender) document.getElementById('birth-gender').value = data.gender;
}

/**
 * 產生分享用 URL（含 query parameters）
 */
function generateShareURL(formData) {
  const base = window.location.origin + window.location.pathname;
  const params = new URLSearchParams();
  if (formData.year) params.set('y', formData.year);
  if (formData.month) params.set('m', formData.month);
  if (formData.day) params.set('d', formData.day);
  if (formData.hour >= 0) params.set('h', formData.hour);
  if (formData.minute > 0) params.set('min', formData.minute);
  if (formData.location) params.set('loc', formData.location);
  if (formData.gender && formData.gender !== 'male') params.set('g', formData.gender);
  return `${base}?${params.toString()}`;
}

// ============ Result Cache ============

/** 儲存計算結果到 localStorage（HTML cache） */
function cacheResults(results) {
  try {
    const cache = {};
    const keys = ['maya', 'astro', 'bazi', 'ziwei', 'hd', 'transit', 'synthesis'];
    keys.forEach(k => {
      if (results[k]) {
        cache[k] = { status: results[k].status, html: results[k].html || '', error: results[k].error || '' };
      }
    });
    cache._ts = Date.now();
    localStorage.setItem('destiny_result_cache', JSON.stringify(cache));
  } catch (e) { /* quota exceeded or other */ }
}

/** 從 localStorage 恢復上次計算結果 */
function restoreCachedResults() {
  try {
    const raw = localStorage.getItem('destiny_result_cache');
    if (!raw) return;
    const cache = JSON.parse(raw);
    // 超過 7 天的 cache 不用
    if (cache._ts && (Date.now() - cache._ts > 7 * 24 * 3600 * 1000)) return;

    // 至少要有一個有效結果
    const hasAny = ['maya', 'astro', 'bazi', 'ziwei', 'hd'].some(k => cache[k]?.status === 'ok');
    if (!hasAny) return;

    // 渲染 cached results
    ui.showResults();
    const keys = ['maya', 'astro', 'bazi', 'ziwei', 'hd', 'transit', 'synthesis'];
    keys.forEach(k => {
      if (cache[k]?.status === 'ok' && cache[k].html) {
        ui.setViewContent(k, cache[k].html);
      } else if (cache[k]?.status === 'error') {
        ui.setViewContent(k, ui.renderError(cache[k].error));
      }
    });

    // 重新計算各引擎 runtime data（cache 只存 HTML，不含互動所需的 runtime state）
    try {
      const saved = JSON.parse(localStorage.getItem('destiny_birth_data') || 'null');
      if (saved && saved.year && saved.month && saved.day) {
        const birthData = {
          year: saved.year, month: saved.month, day: saved.day,
          hour: saved.hour || 12, minute: saved.minute || 0,
          gender: saved.gender || 'female',
        };
        // 重跑各引擎設定 runtime state（紫微點擊解說 + 流年年份切換）
        const reResults = {};
        try { reResults.ziwei = ziweiEngine.calculate(birthData); } catch(e) { console.warn('[cache-restore] ziwei re-calc failed:', e); }
        try { reResults.bazi = baziEngine.calculate(birthData); } catch(e) {}
        try { reResults.hd = hdEngine.calculate(birthData); } catch(e) {}
        try { reResults.astro = astroEngine.calculate(birthData); } catch(e) {}
        try { reResults.maya = mayaEngine.calculate(birthData); } catch(e) {}
        try { transitEngine.calculate(reResults); } catch(e) { console.warn('[cache-restore] transit re-calc failed:', e); }
      }
    } catch(e) { console.warn('[cache-restore] re-calc failed:', e); }

    // 綁定流年年份切換按鈕
    try { transitEngine.attachYearSwitcher(); } catch(e) {}

    ui.switchTab('maya');

    // 顯示 cached 提示
    const shareEl = document.getElementById('share-toolbar-slot');
    if (shareEl) {
      shareEl.innerHTML = renderShareToolbar() +
        '<div class="cache-hint">📌 顯示上次的計算結果。重新輸入可更新。</div>';
    }
    attachShareHandlers();
  } catch (e) { /* ignore */ }
}

/** 從表單取得輸入值 */
function getFormData() {
  const hourVal = document.getElementById('birth-hour')?.value;
  const minuteVal = document.getElementById('birth-minute')?.value;
  return {
    year: parseInt(document.getElementById('birth-year')?.value) || 0,
    month: parseInt(document.getElementById('birth-month')?.value) || 0,
    day: parseInt(document.getElementById('birth-day')?.value) || 0,
    hour: (hourVal !== '' && hourVal != null) ? parseInt(hourVal) : -1,
    minute: (minuteVal !== '' && minuteVal != null) ? parseInt(minuteVal) : 0,
    location: document.getElementById('birth-location')?.value?.trim() || '',
    gender: document.getElementById('birth-gender')?.value || 'male',
  };
}

/** 驗證輸入資料 */
function validateInput(data) {
  const errors = [];

  // 日期驗證
  if (!data.year || data.year < 1900 || data.year > 2100) {
    errors.push({ field: 'date', msg: '請輸入有效的出生年份（1900-2100）' });
  }
  if (!data.month || data.month < 1 || data.month > 12) {
    errors.push({ field: 'date', msg: '請選擇出生月份' });
  }
  if (!data.day || data.day < 1 || data.day > 31) {
    errors.push({ field: 'date', msg: '請輸入出生日期' });
  }

  // 檢查日期是否存在
  if (data.year && data.month && data.day) {
    const d = new Date(data.year, data.month - 1, data.day);
    if (d.getFullYear() !== data.year || d.getMonth() !== data.month - 1 || d.getDate() !== data.day) {
      errors.push({ field: 'date', msg: `${data.year}/${data.month}/${data.day} 不是有效日期` });
    }
  }

  // 時間驗證
  if (data.hour === -1 || data.hour < 0 || data.hour > 23) {
    errors.push({ field: 'time', msg: '請輸入出生時間（小時 0-23）' });
  }
  if (data.minute < 0 || data.minute > 59) {
    errors.push({ field: 'time', msg: '分鐘需為 0-59' });
  }

  // 地點驗證
  if (!data.location) {
    errors.push({ field: 'location', msg: '請輸入出生地點（城市名稱或經緯度）' });
  }

  return errors;
}

/** 解析地點（城市→經緯度→UTC offset） */
async function resolveLocation(locationStr) {
  // 先嘗試解析經緯度格式 (lat, lng)
  const coordMatch = locationStr.match(/^(-?\d+\.?\d*)\s*[,，]\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      // 簡化 UTC offset 計算（經度/15）
      const utcOffset = Math.round(lng / 15);
      return { lat, lng, utcOffset };
    }
    return null;
  }

  // 城市名稱查詢（待 Task 2 實作 geo-timezone.js）
  // 暫時用 placeholder
  const { resolveCity } = await import('./lib/geo-timezone.js');
  return resolveCity(locationStr);
}

/** 主計算流程（Progressive Rendering） */
async function calculate() {
  ui.clearErrors();
  ui.hideResults();

  const formData = getFormData();
  const errors = validateInput(formData);

  if (errors.length > 0) {
    errors.forEach(e => ui.showError(e.field, e.msg));
    return;
  }

  // 解析地點
  const geo = await resolveLocation(formData.location);
  if (!geo) {
    ui.showError('location', '無法辨識此地點，請輸入城市名稱（如「台北」）或經緯度（如「25.03, 121.56」）');
    return;
  }

  // 計算年齡
  const now = new Date();
  const age = now.getFullYear() - formData.year - (
    (now.getMonth() + 1 < formData.month ||
      (now.getMonth() + 1 === formData.month && now.getDate() < formData.day)) ? 1 : 0
  );

  // 構建驗證後的 birthData
  const birthData = {
    year: formData.year,
    month: formData.month,
    day: formData.day,
    hour: formData.hour,
    minute: formData.minute,
    lat: geo.lat,
    lng: geo.lng,
    utcOffset: geo.utcOffset,
    gender: formData.gender,
    age,
  };

  // 儲存到 localStorage
  saveInput(formData);

  // 重新渲染今日能量，讓「今天對你」立刻個人化（不用等下次開頁）
  try { initDailyEnergy(); } catch(e) {}

  // 顯示 loading，同時先顯示結果容器（用 placeholder）
  ui.showLoading();
  ui.showResults();

  // 渲染分享工具列 + 分享連結
  const shareUrl = generateShareURL(formData);
  const shareEl = document.getElementById('share-toolbar-slot');
  if (shareEl) {
    shareEl.innerHTML = renderShareToolbar(shareUrl);
  }
  attachShareHandlers();

  // 各 tab 先放 loading placeholder
  const engineTabs = ['maya', 'astro', 'bazi', 'ziwei', 'hd', 'transit', 'synthesis'];
  engineTabs.forEach(k => ui.setViewContent(k, '<div class="view-loading"><div class="loading-spinner"></div><span>計算中⋯</span></div>'));
  // 合盤 tab 保留現有表單（不覆蓋）

  // === Progressive Rendering: 每個引擎獨立 try/catch ===
  const results = {};

  // Phase 1: 五大核心引擎（獨立計算，逐個渲染）
  const coreEngines = [
    { key: 'maya', engine: mayaEngine, label: '馬雅曆' },
    { key: 'astro', engine: astroEngine, label: '星座' },
    { key: 'bazi', engine: baziEngine, label: '八字' },
    { key: 'ziwei', engine: ziweiEngine, label: '紫微' },
    { key: 'hd', engine: hdEngine, label: '人類圖' },
  ];

  for (const { key, engine, label } of coreEngines) {
    try {
      results[key] = engine.calculate(birthData);
      if (results[key]?.status === 'ok') {
        ui.setViewContent(key, results[key].html);
      } else if (results[key]?.status === 'error') {
        ui.setViewContent(key, ui.renderError(results[key].error));
      }
    } catch (err) {
      console.error(`${label}計算錯誤:`, err);
      results[key] = { status: 'error', error: `${label}計算時發生錯誤：${err.message}` };
      ui.setViewContent(key, ui.renderError(results[key].error));
    }
    // 讓 UI 有機會更新（不阻塞渲染）
    await microYield();
  }

  // 保存八字結果供公司合盤使用
  if (results.bazi?.status === 'ok' && results.bazi.data) {
    lastBaziData = results.bazi.data;
  }

  // 保存星座和馬雅結果供合盤使用
  if (results.astro?.status === 'ok' && results.astro.data) {
    window.__lastAstroData = results.astro.data;
    try {
      const astroSave = {};
      if (results.astro.data.sunSign) astroSave.sunSign = results.astro.data.sunSign.zh || '';
      if (results.astro.data.moonSign) astroSave.moonSign = results.astro.data.moonSign.zh || '';
      if (results.astro.data.risingSign) astroSave.risingSign = results.astro.data.risingSign.zh || '';
      localStorage.setItem('destiny_astro_signs', JSON.stringify(astroSave));
    } catch(e) {}
  }
  if (results.maya?.status === 'ok' && results.maya.data) {
    window.__lastMayaData = results.maya.data;
  }

  // Phase 2: 流年分析（需要所有系統結果）
  try {
    results.transit = transitEngine.calculate(results);
    if (results.transit?.status === 'ok') {
      ui.setViewContent('transit', results.transit.html);
    } else if (results.transit?.status === 'error') {
      ui.setViewContent('transit', ui.renderError(results.transit.error));
    }
  } catch (err) {
    console.error('流年計算錯誤:', err);
    results.transit = { status: 'error', error: `流年計算時發生錯誤：${err.message}` };
    ui.setViewContent('transit', ui.renderError(results.transit.error));
  }

  // Phase 3: 綜合分析（需要所有系統結果）
  try {
    results.synthesis = synthesisEngine.calculate(results);
    if (results.synthesis?.status === 'ok') {
      ui.setViewContent('synthesis', results.synthesis.html);
    } else if (results.synthesis?.status === 'error') {
      ui.setViewContent('synthesis', ui.renderError(results.synthesis.error));
    }
  } catch (err) {
    console.error('劇本大綱計算錯誤:', err);
    results.synthesis = { status: 'error', error: `劇本大綱計算時發生錯誤：${err.message}` };
    ui.setViewContent('synthesis', ui.renderError(results.synthesis.error));
  }

  // 隱藏 loading
  ui.hideLoading();

  // === 核心摘要卡片 + 跨系統共振 badge ===
  try {
    if (results.synthesis?.status === 'ok' && results.synthesis.categories) {
      renderCoreSummary(results.synthesis.categories);
      injectResonanceBadges(results.synthesis.categories, results.synthesis.allThemes);
    }
  } catch(e) { console.error('核心摘要/共振badge渲染錯誤:', e); }

  // 預設切換到第一個成功的 tab
  const firstOk = engineTabs.find(k => results[k]?.status === 'ok');
  if (firstOk) ui.switchTab(firstOk);

  // AI 解讀複製鈕改用 click-handlers.js 事件委派（連快取重開也能複製）

  // 綁定流年年份切換按鈕（DOM 渲染後）
  try { transitEngine.attachYearSwitcher(); } catch(e) {}

  // Cache results for next visit
  cacheResults(results);

  // 更新 URL（不重新載入頁面）
  try {
    const newUrl = generateShareURL(formData);
    window.history.replaceState(null, '', newUrl);
  } catch(e) {}
}

/** 讓出控制權給瀏覽器渲染 */
function microYield() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// ============ 核心摘要卡片 ============

/**
 * 在 tabs 上方渲染一張摘要卡片，顯示 3~5 句「你這個人最核心的特質」
 */
function renderCoreSummary(categories) {
  const el = document.getElementById('core-summary');
  if (!el) return;

  const { core, support } = categories;
  // 取前 5 個最強主題（core 優先，不足補 support）
  const top = [...core, ...support].slice(0, 5);
  if (top.length === 0) { el.style.display = 'none'; return; }

  // 為每個主題產出一句精煉描述
  const lines = top.map(t => {
    const systemLabel = t.systemCount >= 3
      ? `<span class="cs-badge-count">${t.systemCount}系統共振</span>`
      : `<span class="cs-badge-count support">${t.systemCount}系統</span>`;
    return `<div class="cs-line"><span class="cs-icon">${t.icon}</span><span class="cs-text"><b>${t.zh}</b> — ${t.desc || ''}</span>${systemLabel}</div>`;
  });

  el.innerHTML = `
    <div class="cs-header">
      <div class="cs-title">✦ 你的核心特質</div>
      <div class="cs-subtitle">五大命理系統交叉比對，以下是最確定的你</div>
    </div>
    <div class="cs-body">${lines.join('')}</div>
  `;
  el.style.display = '';
}

// ============ 跨系統共振 Badge ============

/**
 * 在各引擎 tab 的最上方注入共振 badge，
 * 告訴使用者哪些主題被 ≥3 個系統同時提到
 */
function injectResonanceBadges(categories, allThemes) {
  const { core } = categories;
  if (!core || core.length === 0) return;

  // 建立 system → themes 的對照（用於判斷哪個 tab 要顯示哪些 badge）
  const systemMap = {
    maya: '馬雅',
    astro: '占星',
    bazi: '八字',
    ziwei: '紫微',
    hd: '人類圖',
  };

  for (const [tabKey, systemName] of Object.entries(systemMap)) {
    const viewEl = document.getElementById(`view-${tabKey}`);
    if (!viewEl) continue;

    // 找出本系統有貢獻的核心主題
    const relevant = core.filter(t => t.systems.includes(systemName));
    if (relevant.length === 0) continue;

    // 建構 badge HTML
    const badges = relevant.map(t =>
      `<span class="resonance-badge">⚡ ${t.systemCount}系統共振：${t.zh}</span>`
    ).join('');

    const badgeBar = document.createElement('div');
    badgeBar.className = 'resonance-bar';
    badgeBar.innerHTML = badges;

    // 插入到 view 最前面（在現有內容之前）
    viewEl.insertBefore(badgeBar, viewEl.firstChild);
  }
}

/** 儲存輸入到 localStorage */
function saveInput(data) {
  try {
    localStorage.setItem('destiny_birth_data', JSON.stringify(data));
  } catch (e) { /* ignore */ }
}

/** 從 localStorage 恢復輸入 */
function restoreInput() {
  try {
    const saved = localStorage.getItem('destiny_birth_data');
    if (!saved) return;
    const data = JSON.parse(saved);
    fillForm(data);
  } catch (e) { /* ignore */ }
}

// 頁面載入後初始化
document.addEventListener('DOMContentLoaded', init);

// ============ 地點 Autocomplete ============

document.addEventListener('DOMContentLoaded', async () => {
  const input = document.getElementById('birth-location');
  const datalist = document.getElementById('city-list');
  if (!input || !datalist) return;

  // 動態載入城市資料
  let cities = null;
  try {
    const mod = await import('./data/cities.js');
    cities = mod.CITIES;
  } catch (e) { return; }

  // 預填常用城市
  const popular = ['台北', '新北', '桃園', '台中', '台南', '高雄', '新竹', '北京', '上海', '東京', '香港'];
  popular.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    datalist.appendChild(opt);
  });

  // 輸入時動態過濾
  input.addEventListener('input', () => {
    const val = input.value.trim().toLowerCase();
    if (!val || val.length < 1) return;

    // 清除舊選項
    datalist.innerHTML = '';

    // 匹配城市（最多顯示 10 個）
    const matches = cities.filter(c =>
      c.zh.includes(val) || c.en.toLowerCase().includes(val)
    ).slice(0, 10);

    matches.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.zh;
      opt.label = `${c.zh} (${c.en})`;
      datalist.appendChild(opt);
    });
  });
});

// ============ 梅花易數 UI ============

document.addEventListener('DOMContentLoaded', () => {
  const btnTime = document.getElementById('meihua-time');
  const btnNumber = document.getElementById('meihua-number');
  const btnText = document.getElementById('meihua-text');
  const btnGo = document.getElementById('meihua-go');
  const timeHint = document.getElementById('meihua-time-hint');
  const numInput = document.getElementById('meihua-number-input');
  const txtInput = document.getElementById('meihua-text-input');
  const resultDiv = document.getElementById('meihua-result');

  if (!btnGo) return;

  let mode = 'time';

  function setMode(m) {
    mode = m;
    [btnTime, btnNumber, btnText].forEach(b => b?.classList.remove('active'));
    if (m === 'time') { btnTime?.classList.add('active'); timeHint.style.display = ''; numInput.style.display = 'none'; txtInput.style.display = 'none'; }
    if (m === 'number') { btnNumber?.classList.add('active'); timeHint.style.display = 'none'; numInput.style.display = ''; txtInput.style.display = 'none'; }
    if (m === 'text') { btnText?.classList.add('active'); timeHint.style.display = 'none'; numInput.style.display = 'none'; txtInput.style.display = ''; }
  }

  btnTime?.addEventListener('click', () => setMode('time'));
  btnNumber?.addEventListener('click', () => setMode('number'));
  btnText?.addEventListener('click', () => setMode('text'));

  btnGo.addEventListener('click', () => {
    let gua;
    if (mode === 'time') {
      gua = timeGua();
    } else if (mode === 'number') {
      const val = document.getElementById('meihua-num')?.value?.trim();
      if (!val) { gua = timeGua(); }
      else {
        const parts = val.split(/[,，\s]+/).map(Number).filter(n => !isNaN(n) && n > 0);
        if (parts.length >= 2) gua = numberGua(parts[0], parts[1]);
        else if (parts.length === 1) gua = numberGua(parts[0]);
        else gua = timeGua();
      }
    } else {
      const val = document.getElementById('meihua-txt')?.value?.trim();
      if (!val) { gua = timeGua(); }
      else { gua = textGua(val); }
    }
    resultDiv.innerHTML = renderMeihua(gua);
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// ============ 合盤支援 ============
// 公司合盤 / 雙人合盤的表單與計算邏輯統一在 click-handlers.js（唯一來源）。
// 這裡只保留 lastBaziData 的存取橋接，供該非 module script 讀取。
// 暴露 lastBaziData 給 click-handlers.js（非 module script）使用
window.__getLastBaziData = () => lastBaziData;
window.__setLastBaziData = (d) => { lastBaziData = d; };
