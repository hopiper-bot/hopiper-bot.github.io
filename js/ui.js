/**
 * ui.js — DOM 操作、Tab 切換、Loading 動畫、Result 渲染框架
 */

const TABS = ['maya', 'astro', 'bazi', 'ziwei', 'hd', 'transit', 'synthesis'];

/** 初始化 Tab 切換事件 */
export function initTabs() {
  const tabEls = document.querySelectorAll('.tab[data-view]');
  tabEls.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.view));
    tab.addEventListener('keydown', (e) => {
      const tabs = [...tabEls];
      const idx = tabs.indexOf(tab);
      let next = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        next = (idx + 1) % tabs.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        next = (idx - 1 + tabs.length) % tabs.length;
      } else if (e.key === 'Home') {
        next = 0;
      } else if (e.key === 'End') {
        next = tabs.length - 1;
      }
      if (next >= 0) {
        e.preventDefault();
        tabs[next].focus();
        switchTab(tabs[next].dataset.view);
      }
    });
  });
}

/** 切換到指定 tab */
export function switchTab(viewId) {
  // Update tab active state
  document.querySelectorAll('.tab[data-view]').forEach(t => {
    t.classList.toggle('active', t.dataset.view === viewId);
    t.setAttribute('aria-selected', t.dataset.view === viewId ? 'true' : 'false');
  });

  // Update view visibility
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.id === `view-${viewId}`);
  });
}

/** 顯示 loading indicator */
export function showLoading() {
  const el = document.getElementById('loading');
  if (el) el.classList.add('show');
}

/** 隱藏 loading indicator */
export function hideLoading() {
  const el = document.getElementById('loading');
  if (el) el.classList.remove('show');
}

/** 顯示結果容器 */
export function showResults() {
  const el = document.getElementById('result-container');
  if (el) {
    el.classList.add('show');
  }
}

/** 隱藏結果容器 */
export function hideResults() {
  const el = document.getElementById('result-container');
  if (el) el.classList.remove('show');
}

/** 顯示錯誤訊息 */
export function showError(fieldId, message) {
  const el = document.getElementById(`error-${fieldId}`);
  if (el) {
    el.textContent = message;
    el.classList.add('show');
  }
}

/** 清除所有錯誤訊息 */
export function clearErrors() {
  document.querySelectorAll('.error-msg').forEach(el => {
    el.textContent = '';
    el.classList.remove('show');
  });
}

/**
 * 渲染所有系統結果
 * @param {Object} results - { maya, astro, bazi, ziwei, hd, transit, synthesis }
 */
export function render(results) {
  hideLoading();
  showResults();

  // 各系統渲染（由各引擎模組提供 renderXxx 函式）
  if (results.maya?.status === 'ok') {
    setViewContent('maya', results.maya.html);
  } else if (results.maya?.status === 'error') {
    setViewContent('maya', renderError(results.maya.error));
  }

  if (results.astro?.status === 'ok') {
    setViewContent('astro', results.astro.html);
  } else if (results.astro?.status === 'error') {
    setViewContent('astro', renderError(results.astro.error));
  }

  if (results.bazi?.status === 'ok') {
    setViewContent('bazi', results.bazi.html);
  } else if (results.bazi?.status === 'error') {
    setViewContent('bazi', renderError(results.bazi.error));
  }

  if (results.ziwei?.status === 'ok') {
    setViewContent('ziwei', results.ziwei.html);
  } else if (results.ziwei?.status === 'error') {
    setViewContent('ziwei', renderError(results.ziwei.error));
  }

  if (results.hd?.status === 'ok') {
    setViewContent('hd', results.hd.html);
  } else if (results.hd?.status === 'error') {
    setViewContent('hd', renderError(results.hd.error));
  }

  if (results.transit?.status === 'ok') {
    setViewContent('transit', results.transit.html);
  } else if (results.transit?.status === 'error') {
    setViewContent('transit', renderError(results.transit.error));
  }

  if (results.synthesis?.status === 'ok') {
    setViewContent('synthesis', results.synthesis.html);
  } else if (results.synthesis?.status === 'error') {
    setViewContent('synthesis', renderError(results.synthesis.error));
  }

  // 預設顯示第一個 tab
  switchTab('maya');
}

/** 設定特定 view 的 HTML 內容 */
function setViewContent(viewId, html) {
  const el = document.getElementById(`view-${viewId}`);
  if (el) el.innerHTML = html;
}

/** 渲染錯誤訊息區塊 */
function renderError(message) {
  return `<div class="placeholder">⚠️ ${message || '計算失敗，請確認輸入資料'}</div>`;
}

/** 渲染 placeholder（資料準備中） */
export function renderPlaceholder(message) {
  return `<div class="placeholder">${message || '解讀內容準備中⋯'}</div>`;
}
