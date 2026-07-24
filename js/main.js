/**
 * main.js — Orchestrator
 * 輸入驗證、引擎調度（並行）、結果收集→Synthesis→UI 渲染
 */

import * as ui from './ui.js';
import * as mayaEngine from './engines/maya.js';
import * as astroEngine from './engines/astro.js';
// import * as baziEngine from './engines/bazi.js';
// import * as ziweiEngine from './engines/ziwei.js';
// import * as hdEngine from './engines/human-design.js';
// import * as transitEngine from './engines/transit.js';
// import * as synthesisEngine from './engines/synthesis.js';

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
  return {
    year: parseInt(document.getElementById('birth-year')?.value) || 0,
    month: parseInt(document.getElementById('birth-month')?.value) || 0,
    day: parseInt(document.getElementById('birth-day')?.value) || 0,
    hour: parseInt(document.getElementById('birth-hour')?.value) ?? -1,
    minute: parseInt(document.getElementById('birth-minute')?.value) ?? 0,
    location: document.getElementById('birth-location')?.value?.trim() || '',
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
  };

  // 儲存到 localStorage
  saveInput(formData);

  // 顯示 loading
  ui.showLoading();

  try {
    // 計算各系統
    const mayaResult = mayaEngine.calculate(birthData);
    const astroResult = astroEngine.calculate(birthData);

    const results = {
      maya: mayaResult,
      astro: astroResult,
      bazi: { status: 'ok', html: '<div class="placeholder">📜 八字模組開發中⋯<br>（四柱排盤 + 十神 + 五行）</div>' },
      ziwei: { status: 'ok', html: '<div class="placeholder">⭐ 紫微斗數模組開發中⋯<br>（十二宮 + 十四主星）</div>' },
      hd: { status: 'ok', html: '<div class="placeholder">🔷 人類圖模組開發中⋯<br>（九大能量中心 + 類型/策略/權威）</div>' },
      transit: { status: 'ok', html: '<div class="placeholder">📅 流年分析模組開發中⋯<br>（五大系統流年交叉比對）</div>' },
      synthesis: { status: 'ok', html: '<div class="placeholder">🔮 綜合分析模組開發中⋯<br>（本命綜合 + 流年綜合）</div>' },
    };

    ui.render(results);
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
  } catch (e) { /* ignore */ }
}

// 頁面載入後初始化
document.addEventListener('DOMContentLoaded', init);
