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

// company-compat 使用 dynamic import 避免載入失敗時影響主程式
let companyCompatEngine = null;

// 全域儲存最新的個人八字結果，供公司合盤使用
let lastBaziData = null;

/** 應用程式初始化 */
function init() {
  ui.initTabs();
  initThemeToggle();
  initDailyEnergy();

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

    // 重新計算紫微以設定 window._zwData（cache 只存 HTML，不含互動 runtime data）
    try {
      const saved = JSON.parse(localStorage.getItem('destiny_birth_data') || 'null');
      if (saved && saved.year && saved.month && saved.day) {
        const birthData = {
          year: saved.year, month: saved.month, day: saved.day,
          hour: saved.hour || 12, minute: saved.minute || 0,
          gender: saved.gender || 'female',
        };
        // 紫微 — 重跑 calculate 設定 window._zwData，讓點擊解說可以運作
        try { ziweiEngine.calculate(birthData); } catch(e) { console.warn('[cache-restore] ziwei re-calc failed:', e); }
      }
    } catch(e) { console.warn('[cache-restore] re-calc failed:', e); }

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
  };

  // 儲存到 localStorage
  saveInput(formData);

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

  // 預設切換到第一個成功的 tab
  const firstOk = engineTabs.find(k => results[k]?.status === 'ok');
  if (firstOk) ui.switchTab(firstOk);

  // 綁定 AI 解讀按鈕（DOM 渲染後）
  try { synthesisEngine.attachAIButtons(results); } catch(e) {}

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

// ============ 公司合盤 UI ============

const COMPANY_PRESETS = {
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

/** 渲染公司合盤表單到 tab view 裡 */
function renderCompanyCompatForm() {
  const html = `
    <div class="sig" style="margin-bottom:12px;">
      <div class="kin">職場能量</div>
      <div class="big" style="font-size:1.3rem;">公司合盤</div>
      <div style="font-size:.82rem;color:var(--muted);margin-top:4px;">你跟公司的八字合不合？LOGO 色是不是你的幸運色？選一家公司來看看。</div>
    </div>

    <label>快速選擇（或自行輸入）</label>
    <div class="form-row">
      <div class="form-group wide">
        <select id="company-preset" aria-label="預設公司">
          <option value="">— 自行輸入 —</option>
          <option value="inventec">英業達 Inventec</option>
          <option value="tsmc">台積電 TSMC</option>
          <option value="foxconn">鴻海 Foxconn</option>
          <option value="asus">華碩 ASUS</option>
          <option value="acer">宏碁 Acer</option>
          <option value="mediatek">聯發科 MediaTek</option>
          <option value="delta">台達電 Delta</option>
          <option value="quanta">廣達 Quanta</option>
          <option value="pegatron">和碩 Pegatron</option>
          <option value="wistron">緯創 Wistron</option>
          <option value="compal">仁寶 Compal</option>
          <option value="google">Google</option>
          <option value="apple">Apple</option>
          <option value="microsoft">Microsoft</option>
          <option value="nvidia">NVIDIA</option>
          <option value="samsung">三星 Samsung</option>
          <option value="sony">Sony</option>
          <option value="amazon">Amazon</option>
          <option value="meta">Meta (Facebook)</option>
          <option value="tesla">Tesla</option>
        </select>
      </div>
    </div>

    <label>公司名稱（選填）</label>
    <div class="form-row">
      <div class="form-group wide">
        <input type="text" id="company-name" placeholder="如：英業達" maxlength="30" aria-label="公司名稱">
      </div>
    </div>

    <label>公司成立日期</label>
    <div class="form-row">
      <div class="form-group">
        <input type="number" id="company-year" placeholder="年份" min="1800" max="2100" aria-label="成立年份">
      </div>
      <div class="form-group">
        <select id="company-month" aria-label="成立月份">
          <option value="">月</option>
          <option value="1">1月</option><option value="2">2月</option><option value="3">3月</option>
          <option value="4">4月</option><option value="5">5月</option><option value="6">6月</option>
          <option value="7">7月</option><option value="8">8月</option><option value="9">9月</option>
          <option value="10">10月</option><option value="11">11月</option><option value="12">12月</option>
        </select>
      </div>
      <div class="form-group">
        <input type="number" id="company-day" placeholder="日" min="1" max="31" aria-label="成立日">
      </div>
    </div>

    <label>LOGO 主色</label>
    <div class="form-row">
      <div class="form-group wide">
        <select id="company-logo-color" aria-label="LOGO主色">
          <option value="">（選填）</option>
          <option value="紅色">🔴 紅色</option><option value="橘色">🟠 橘色</option>
          <option value="黃色">🟡 黃色</option><option value="綠色">🟢 綠色</option>
          <option value="藍色">🔵 藍色</option><option value="紫色">🟣 紫色</option>
          <option value="白色">⚪ 白色</option><option value="黑色">⚫ 黑色</option>
          <option value="金色">🥇 金色</option><option value="銀色">🥈 銀色</option>
          <option value="粉紅">💗 粉紅</option><option value="咖啡">🟤 咖啡/棕</option>
          <option value="灰色">🩶 灰色</option>
        </select>
      </div>
    </div>

    <label>產業類別</label>
    <div class="form-row">
      <div class="form-group wide">
        <select id="company-industry" aria-label="產業類別">
          <option value="">（選填）</option>
          <option value="半導體">半導體</option>
          <option value="科技硬體">科技硬體</option>
          <option value="電子製造">電子製造</option>
          <option value="軟體網路">軟體/網路</option>
          <option value="金融保險">金融/保險</option>
          <option value="建築營造">建築/營造</option>
          <option value="房地產">房地產</option>
          <option value="餐飲">餐飲</option>
          <option value="教育出版">教育/出版</option>
          <option value="醫療">醫療</option>
          <option value="生技醫藥">生技/醫藥</option>
          <option value="文創設計">文創/設計</option>
          <option value="貿易物流">貿易/物流</option>
          <option value="能源電力">能源/電力</option>
          <option value="廣告行銷">廣告/行銷</option>
          <option value="娛樂表演">娛樂/表演</option>
          <option value="法律">法律</option>
          <option value="旅遊">旅遊</option>
          <option value="服飾紡織">服飾/紡織</option>
          <option value="食品加工">食品加工</option>
          <option value="機械">機械</option>
          <option value="汽車">汽車</option>
        </select>
      </div>
    </div>

    <button id="company-compat-go" class="btn-primary" type="button" onclick="window._companyCompatGo()" style="width:100%;margin-top:14px;">開始合盤 ✦</button>
    <button id="company-compat-clear" type="button" onclick="window._companyCompatClear()" style="width:100%;margin-top:8px;padding:8px;background:transparent;border:1px solid var(--card-border);border-radius:8px;color:var(--text);font-size:.82rem;cursor:pointer;opacity:.7;">清除全部結果</button>
    <div id="company-compat-error" style="color:#e74c3c;font-size:.85rem;margin-top:8px;min-height:1.2em;" role="alert"></div>
    <div id="company-compat-result" style="margin-top:16px;"></div>
  `;
  ui.setViewContent('company-compat', html);
  // 綁定全域函式
  bindCompanyCompatEvents();
}

/** 綁定公司合盤事件（掛到 window 上供 onclick 呼叫） */
function bindCompanyCompatEvents() {
  // preset change（用傳統 onchange）
  const presetEl = document.getElementById('company-preset');
  if (presetEl) {
    presetEl.onchange = () => {
      const key = presetEl.value;
      if (!key) return;
      const p = COMPANY_PRESETS[key];
      if (!p) return;
      document.getElementById('company-name').value = p.name;
      document.getElementById('company-year').value = p.year;
      document.getElementById('company-month').value = p.month;
      document.getElementById('company-day').value = p.day;
      document.getElementById('company-logo-color').value = p.logo;
      document.getElementById('company-industry').value = p.industry;
    };
  }

  window._companyCompatClear = () => {
    const resultDiv = document.getElementById('company-compat-result');
    if (resultDiv) resultDiv.innerHTML = '';
  };

  window._companyCompatGo = async () => {
    const errorDiv = document.getElementById('company-compat-error');
    const resultDiv = document.getElementById('company-compat-result');
    if (!errorDiv || !resultDiv) return;
    errorDiv.textContent = '';
    resultDiv.innerHTML = '';

    if (!lastBaziData) {
      // 嘗試從 localStorage 重新計算八字
      try {
        const saved = JSON.parse(localStorage.getItem('destiny_birth_data') || 'null');
        if (saved && saved.year && saved.month && saved.day) {
          const baziMod = await import('./engines/bazi.js');
          const baziResult = baziMod.calculate({
            year: saved.year, month: saved.month, day: saved.day,
            hour: saved.hour || 12, minute: saved.minute || 0,
            gender: saved.gender || 'female',
          });
          if (baziResult?.status === 'ok' && baziResult.data) {
            lastBaziData = baziResult.data;
          }
        }
      } catch(ex) { console.warn('重算八字失敗:', ex); }
    }

    if (!lastBaziData) {
      errorDiv.textContent = '請先在上方計算個人命盤，才能做合盤分析。';
      return;
    }

    if (!companyCompatEngine) {
      try {
        companyCompatEngine = await import('./engines/company-compat.js');
      } catch (e2) {
        errorDiv.textContent = '引擎載入失敗：' + e2.message;
        console.error('company-compat load error:', e2);
        return;
      }
    }

    const year = parseInt(document.getElementById('company-year')?.value);
    const month = parseInt(document.getElementById('company-month')?.value);
    const day = parseInt(document.getElementById('company-day')?.value);
    const companyName = document.getElementById('company-name')?.value?.trim() || '';
    const logoColor = document.getElementById('company-logo-color')?.value || '';
    const industry = document.getElementById('company-industry')?.value || '';

    if (!year || year < 1800 || year > 2100) { errorDiv.textContent = '請輸入公司成立年份'; return; }
    if (!month || month < 1 || month > 12) { errorDiv.textContent = '請選擇成立月份'; return; }
    if (!day || day < 1 || day > 31) { errorDiv.textContent = '請輸入成立日期'; return; }

    try {
      const result = companyCompatEngine.calculate(lastBaziData, {
        year, month, day, hour: 9,
        logoColor, industry, companyName,
      });

      let astroHtml = '';
      let personAstro = window.__lastAstroData || null;
      let personMonth = 0, personDay = 0;
      try {
        const saved = JSON.parse(localStorage.getItem('destiny_birth_data') || '{}');
        personMonth = saved.month || 0;
        personDay = saved.day || 0;
      } catch(ex) {}
      let savedSigns = null;
      try { savedSigns = JSON.parse(localStorage.getItem('destiny_astro_signs') || 'null'); } catch(ex) {}
      if (!personAstro && savedSigns) {
        personAstro = { sunSign: savedSigns.sunSign, moonSign: savedSigns.moonSign, risingSign: savedSigns.risingSign };
      }
      const astroInput = { month, day, companyName, personMonth, personDay };
      try {
        const astroResult2 = companyCompatEngine.calculateAstro(personAstro, astroInput);
        if (astroResult2.status === 'ok') astroHtml = astroResult2.html;
      } catch(ex) { console.warn('星座合盤錯誤:', ex); }

      let mayaHtml = '';
      const personMaya = window.__lastMayaData || null;
      if (personMaya) {
        const mayaResult = companyCompatEngine.calculateMaya(personMaya, { year, month, day, companyName });
        if (mayaResult.status === 'ok') mayaHtml = mayaResult.html;
      }

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'border-bottom:1px solid var(--card-border);padding-bottom:20px;margin-bottom:20px;';
      wrapper.innerHTML = result.html + astroHtml + mayaHtml;
      resultDiv.prepend(wrapper);
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      errorDiv.textContent = '計算錯誤：' + err.message;
      console.error('公司合盤錯誤:', err);
    }
  };
}

// ============ 雙人合盤 UI ============

/** 渲染雙人合盤表單到 tab view 裡 */
function renderPersonCompatForm() {
  const html = `
    <div class="sig" style="margin-bottom:12px;">
      <div class="kin">人際能量</div>
      <div class="big" style="font-size:1.3rem;">雙人合盤</div>
      <div style="font-size:.82rem;color:var(--muted);margin-top:4px;">和另一個人的命盤做比對 — 情侶、朋友、同事都可以。</div>
    </div>

    <label>對方出生日期</label>
    <div class="form-row">
      <div class="form-group">
        <input type="number" id="person2-year" placeholder="年份" min="1900" max="2100" aria-label="對方出生年份">
      </div>
      <div class="form-group">
        <select id="person2-month" aria-label="對方出生月份">
          <option value="">月</option>
          <option value="1">1月</option><option value="2">2月</option><option value="3">3月</option>
          <option value="4">4月</option><option value="5">5月</option><option value="6">6月</option>
          <option value="7">7月</option><option value="8">8月</option><option value="9">9月</option>
          <option value="10">10月</option><option value="11">11月</option><option value="12">12月</option>
        </select>
      </div>
      <div class="form-group">
        <input type="number" id="person2-day" placeholder="日" min="1" max="31" aria-label="對方出生日">
      </div>
    </div>

    <label>對方出生時間（選填，有助更精準分析）</label>
    <div class="form-row">
      <div class="form-group">
        <input type="number" id="person2-hour" placeholder="時（0-23）" min="0" max="23" aria-label="對方出生小時">
      </div>
      <div class="form-group">
        <input type="number" id="person2-minute" placeholder="分（0-59）" min="0" max="59" aria-label="對方出生分鐘">
      </div>
    </div>

    <label>對方性別</label>
    <div class="form-row">
      <div class="form-group">
        <select id="person2-gender" aria-label="對方性別">
          <option value="male">男</option>
          <option value="female">女</option>
        </select>
      </div>
    </div>

    <label>關係類型</label>
    <div class="form-row">
      <div class="form-group wide">
        <select id="person2-relation" aria-label="關係類型">
          <option value="partner">情侶/伴侶</option>
          <option value="friend">朋友</option>
          <option value="colleague">同事</option>
          <option value="family">家人</option>
          <option value="boss">主管/老闆</option>
        </select>
      </div>
    </div>

    <button id="person-compat-go" class="btn-primary" type="button" onclick="window._personCompatGo()" style="width:100%;margin-top:14px;">開始合盤 ✦</button>
    <div id="person-compat-error" style="color:#e74c3c;font-size:.85rem;margin-top:8px;min-height:1.2em;" role="alert"></div>
    <div id="person-compat-result" style="margin-top:16px;"></div>
  `;
  ui.setViewContent('person-compat', html);
  bindPersonCompatEvents();
}

/** 綁定雙人合盤事件（掛到 window 上供 onclick 呼叫） */
function bindPersonCompatEvents() {
  window._personCompatGo = async () => {
    const errorDiv = document.getElementById('person-compat-error');
    const resultDiv = document.getElementById('person-compat-result');
    if (!errorDiv || !resultDiv) return;
    errorDiv.textContent = '';
    resultDiv.innerHTML = '';

    let person1;
    try {
      person1 = JSON.parse(localStorage.getItem('destiny_birth_data') || 'null');
    } catch(ex) {}
    if (!person1 || !person1.year || !person1.month || !person1.day) {
      errorDiv.textContent = '請先在上方計算個人命盤。';
      return;
    }

    const year = parseInt(document.getElementById('person2-year')?.value);
    const month = parseInt(document.getElementById('person2-month')?.value);
    const day = parseInt(document.getElementById('person2-day')?.value);
    const hourVal = document.getElementById('person2-hour')?.value;
    const hour = (hourVal !== '' && hourVal != null) ? parseInt(hourVal) : 12;
    const minuteVal = document.getElementById('person2-minute')?.value;
    const minute = (minuteVal !== '' && minuteVal != null) ? parseInt(minuteVal) : 0;
    const gender = document.getElementById('person2-gender')?.value || 'male';
    const relation = document.getElementById('person2-relation')?.value || 'friend';

    if (!year || year < 1900 || year > 2100) { errorDiv.textContent = '請輸入對方出生年份'; return; }
    if (!month || month < 1 || month > 12) { errorDiv.textContent = '請選擇對方出生月份'; return; }
    if (!day || day < 1 || day > 31) { errorDiv.textContent = '請輸入對方出生日期'; return; }

    try {
      const personCompatEngine = await import('./engines/person-compat.js');
      const person2 = { year, month, day, hour, minute, gender };
      const result = personCompatEngine.calculate(person1, person2, relation);

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
  };
}

// ============ 合盤支援 ============
// 暴露 lastBaziData 給 click-handlers.js（非 module script）使用
window.__getLastBaziData = () => lastBaziData;
window.__setLastBaziData = (d) => { lastBaziData = d; };
