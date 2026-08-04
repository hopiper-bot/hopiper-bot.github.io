/**
 * share.js — 分享/匯出功能
 * 提供：複製文字摘要、分享連結（Web Share API）、匯出 PDF（瀏覽器列印）
 */

/** 顯示 toast 提示 */
function showToast(msg) {
  let toast = document.getElementById('share-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'share-toast';
    toast.className = 'share-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

/** 從當前結果 DOM 萃取純文字摘要 */
function extractTextSummary() {
  const container = document.getElementById('result-container');
  if (!container) return '';

  // 取得目前激活的 view
  const activeView = container.querySelector('.view.active');
  if (!activeView) return '';

  const tabName = activeView.id.replace('view-', '');
  const tabLabel = {
    maya: '馬雅曆', astro: '星座', bazi: '八字',
    ziwei: '紫微', hd: '人類圖', transit: '流年', synthesis: '劇本大綱'
  }[tabName] || tabName;

  // 取得文字內容（去除過多空行）
  let text = activeView.innerText || activeView.textContent || '';
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return `【人生劇本 — ${tabLabel}】\n\n${text}\n\n🔗 https://hopiper-bot.github.io`;
}

/** 複製文字到剪貼簿 */
export async function copyText() {
  const text = extractTextSummary();
  if (!text) { showToast('沒有可複製的內容'); return; }

  try {
    await navigator.clipboard.writeText(text);
    showToast('✓ 已複製到剪貼簿');
  } catch (err) {
    // fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('✓ 已複製到剪貼簿');
  }
}

/** 使用 Web Share API 分享（手機原生分享） */
export async function shareNative() {
  const text = extractTextSummary();
  const shareData = {
    title: '人生劇本｜命理合盤分析',
    text: text.slice(0, 500), // 限制長度避免太長
    url: 'https://hopiper-bot.github.io'
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (err) {
      if (err.name !== 'AbortError') {
        showToast('分享失敗，已改為複製');
        await copyText();
      }
    }
  } else {
    // 桌面不支援 Web Share → fallback 複製
    await copyText();
  }
}

/** 匯出 PDF（利用瀏覽器列印功能，隱藏非結果區域） */
export function exportPDF() {
  // 加上列印專用 class
  document.body.classList.add('printing-result');
  window.print();
  // 列印完成或取消後移除
  setTimeout(() => document.body.classList.remove('printing-result'), 1000);
}

/** 渲染分享工具列 HTML（插入到結果容器頂部） */
export function renderShareToolbar() {
  const hasShare = !!navigator.share;
  let html = `<div class="share-toolbar">`;
  html += `<button class="share-btn" data-share="copy" type="button" aria-label="複製分析結果">📋 複製文字</button>`;
  if (hasShare) {
    html += `<button class="share-btn" data-share="native" type="button" aria-label="分享分析結果">📤 分享</button>`;
  }
  html += `<button class="share-btn" data-share="pdf" type="button" aria-label="匯出PDF">🖨️ 匯出 PDF</button>`;
  html += `</div>`;
  return html;
}

/** 綁定分享按鈕事件（在結果渲染後呼叫） */
export function attachShareHandlers() {
  document.querySelectorAll('[data-share]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = e.currentTarget.dataset.share;
      if (action === 'copy') copyText();
      else if (action === 'native') shareNative();
      else if (action === 'pdf') exportPDF();
    });
  });
}
