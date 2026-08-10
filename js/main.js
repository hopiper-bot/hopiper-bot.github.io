/**
 * main.js — Orchestrator
 * 輸入驗證、引擎調度（並行）、結果收集→Synthesis→UI 渲染
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

// company-compat 使用 dynamic import 避免載入失敗時影響主程式
let companyCompatEngine = null;

// 全域儲存最新的個人八字結果，供公司合盤使用
let lastBaziData = null;

/** 應用程式初始化 */
function init() {
  ui.initTabs();

  // 綁定表單提交
  const form = document.getElementById('birth-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      calculate();
    });
  }

  // 從 localStorage 恢復上次輸入
  restoreInput();
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

/** 主計算流程 */
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

  // 顯示 loading
  ui.showLoading();

  try {
    // 計算各系統
    const mayaResult = mayaEngine.calculate(birthData);
    const astroResult = astroEngine.calculate(birthData);
    const baziResult = baziEngine.calculate(birthData);
    const ziweiResult = ziweiEngine.calculate(birthData);

    const hdResult = hdEngine.calculate(birthData);

    const results = {
      maya: mayaResult,
      astro: astroResult,
      bazi: baziResult,
      ziwei: ziweiResult,
      hd: hdResult,
    };

    // 保存八字結果供公司合盤使用
    if (baziResult.status === 'ok') {
      lastBaziData = baziResult.data;
      // 顯示公司合盤區塊
      const ccEl = document.getElementById('company-compat-container');
      if (ccEl) ccEl.style.display = '';
    }

    // 流年分析（需要所有系統結果）
    results.transit = transitEngine.calculate(results);

    // 綜合分析（需要所有系統結果）
    results.synthesis = synthesisEngine.calculate(results);

    ui.render(results);

    // 渲染分享工具列（插入到結果容器頂部）
    const shareEl = document.getElementById('share-toolbar-slot');
    if (shareEl) shareEl.innerHTML = renderShareToolbar();
    attachShareHandlers();

    // 綁定 AI 解讀按鈕（DOM 渲染後）
    synthesisEngine.attachAIButtons(results);

    // 綁定流年年份切換按鈕（DOM 渲染後）
    transitEngine.attachYearSwitcher();
  } catch (err) {
    ui.hideLoading();
    console.error('計算錯誤:', err);
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
    if (data.year) document.getElementById('birth-year').value = data.year;
    if (data.month) document.getElementById('birth-month').value = data.month;
    if (data.day) document.getElementById('birth-day').value = data.day;
    if (data.hour >= 0) document.getElementById('birth-hour').value = data.hour;
    if (data.minute >= 0) document.getElementById('birth-minute').value = data.minute;
    if (data.location) document.getElementById('birth-location').value = data.location;
    if (data.gender) document.getElementById('birth-gender').value = data.gender;
  } catch (e) { /* ignore */ }
}

// 頁面載入後初始化
document.addEventListener('DOMContentLoaded', init);

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
  delta:     { name: '台達電', year: 1971, month: 4, day: 1, logo: '紅色', industry: '電子製造' },
  quanta:    { name: '廣達', year: 1988, month: 5, day: 9, logo: '藍色', industry: '電子製造' },
  pegatron:  { name: '和碩', year: 2008, month: 1, day: 1, logo: '藍色', industry: '電子製造' },
  wistron:   { name: '緯創', year: 2001, month: 7, day: 1, logo: '藍色', industry: '電子製造' },
  compal:    { name: '仁寶', year: 1984, month: 6, day: 1, logo: '藍色', industry: '電子製造' },
  google:    { name: 'Google', year: 1998, month: 9, day: 4, logo: '紅色', industry: '軟體網路' },
  apple:     { name: 'Apple', year: 1976, month: 4, day: 1, logo: '灰色', industry: '科技硬體' },
  microsoft: { name: 'Microsoft', year: 1975, month: 4, day: 4, logo: '藍色', industry: '軟體網路' },
  nvidia:    { name: 'NVIDIA', year: 1993, month: 1, day: 22, logo: '綠色', industry: '半導體' },
  samsung:   { name: '三星', year: 1938, month: 3, day: 1, logo: '藍色', industry: '電子製造' },
  sony:      { name: 'Sony', year: 1946, month: 5, day: 7, logo: '黑色', industry: '電子製造' },
  amazon:    { name: 'Amazon', year: 1994, month: 7, day: 5, logo: '橘色', industry: '軟體網路' },
  meta:      { name: 'Meta', year: 2004, month: 2, day: 4, logo: '藍色', industry: '軟體網路' },
  tesla:     { name: 'Tesla', year: 2003, month: 7, day: 1, logo: '紅色', industry: '汽車' },
};

document.addEventListener('DOMContentLoaded', () => {
  const btnGo = document.getElementById('company-compat-go');
  if (!btnGo) return;

  // 預設公司選擇 → 自動帶入
  const presetSelect = document.getElementById('company-preset');
  if (presetSelect) {
    presetSelect.addEventListener('change', () => {
      const key = presetSelect.value;
      if (!key) return;
      const p = COMPANY_PRESETS[key];
      if (!p) return;
      document.getElementById('company-name').value = p.name;
      document.getElementById('company-year').value = p.year;
      document.getElementById('company-month').value = p.month;
      document.getElementById('company-day').value = p.day;
      document.getElementById('company-logo-color').value = p.logo;
      document.getElementById('company-industry').value = p.industry;
    });
  }

  btnGo.addEventListener('click', async () => {
    const errorDiv = document.getElementById('company-compat-error');
    const resultDiv = document.getElementById('company-compat-result');
    errorDiv.textContent = '';
    resultDiv.innerHTML = '';

    // 檢查個人命盤是否已算
    if (!lastBaziData) {
      errorDiv.textContent = '請先在上方計算個人命盤，才能做合盤分析。';
      return;
    }

    // 動態載入 engine（避免靜態 import 失敗炸掉整個 app）
    if (!companyCompatEngine) {
      try {
        companyCompatEngine = await import('./engines/company-compat.js');
      } catch (e) {
        errorDiv.textContent = `引擎載入失敗：${e.message}`;
        console.error('company-compat load error:', e);
        return;
      }
    }

    // 取得公司資料
    const year = parseInt(document.getElementById('company-year')?.value);
    const month = parseInt(document.getElementById('company-month')?.value);
    const day = parseInt(document.getElementById('company-day')?.value);
    const companyName = document.getElementById('company-name')?.value?.trim() || '';
    const logoColor = document.getElementById('company-logo-color')?.value || '';
    const industry = document.getElementById('company-industry')?.value || '';

    // 驗證
    if (!year || year < 1800 || year > 2100) {
      errorDiv.textContent = '請輸入公司成立年份';
      return;
    }
    if (!month || month < 1 || month > 12) {
      errorDiv.textContent = '請選擇成立月份';
      return;
    }
    if (!day || day < 1 || day > 31) {
      errorDiv.textContent = '請輸入成立日期';
      return;
    }

    try {
      const result = companyCompatEngine.calculate(lastBaziData, {
        year, month, day, hour: 9,
        logoColor, industry, companyName,
      });
      resultDiv.innerHTML = result.html;
      resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      errorDiv.textContent = `計算錯誤：${err.message}`;
      console.error('公司合盤錯誤:', err);
    }
  });
});
