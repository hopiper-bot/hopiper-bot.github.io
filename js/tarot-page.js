import {
  drawDailyTarot,
  drawQuestionTarot,
  getBirthFingerprint,
  getLocalDateKey,
  normalizeBirthData,
} from './engines/tarot.js?v=24';

const BIRTH_STORAGE_KEY = 'destiny_birth_data';
const DAILY_STORAGE_KEY = 'destiny_tarot_daily_v1';
const QUESTION_STORAGE_KEY = 'destiny_tarot_question_v1';

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch (error) {
    return null;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  }).format(new Date(year, month - 1, day));
}

function romanNumeral(number) {
  if (number === 0) return '0';
  const values = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let remaining = number;
  let result = '';
  for (const [value, symbol] of values) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }
  return result;
}

function initTarotPage() {
  const form = document.getElementById('tarot-birth-form');
  if (!form) return;

  const yearInput = document.getElementById('tarot-birth-year');
  const monthInput = document.getElementById('tarot-birth-month');
  const dayInput = document.getElementById('tarot-birth-day');
  const errorElement = document.getElementById('tarot-error');
  const details = document.getElementById('tarot-birth-details');
  const profileStatus = document.getElementById('tarot-profile-status');
  const drawButton = document.getElementById('tarot-draw');
  const resultElement = document.getElementById('tarot-result');
  const dateElement = document.getElementById('tarot-date');
  const modeButtons = [...document.querySelectorAll('[data-tarot-mode]')];
  const dailyPanel = document.getElementById('tarot-daily-panel');
  const questionPanel = document.getElementById('tarot-question-panel');
  const questionForm = document.getElementById('tarot-question-form');
  const questionInput = document.getElementById('tarot-question');
  const questionError = document.getElementById('tarot-question-error');
  let dateKey = getLocalDateKey();
  let currentBirthData = null;
  let currentReading = null;

  dateElement.textContent = formatDate(dateKey);

  function setError(message = '') {
    errorElement.textContent = message;
  }

  function setMode(mode) {
    const isQuestion = mode === 'question';
    dailyPanel.hidden = isQuestion;
    questionPanel.hidden = !isQuestion;
    resultElement.hidden = true;
    resultElement.innerHTML = '';
    modeButtons.forEach((button) => {
      const active = button.dataset.tarotMode === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    if (isQuestion) questionInput.focus();
  }

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.tarotMode));
  });

  function fillForm(saved) {
    if (!saved) return;
    yearInput.value = saved.year || '';
    monthInput.value = saved.month || '';
    dayInput.value = saved.day || '';
  }

  function readForm() {
    const previous = readJson(BIRTH_STORAGE_KEY) || {};
    return normalizeBirthData({
      ...previous,
      year: Number(yearInput.value),
      month: Number(monthInput.value),
      day: Number(dayInput.value),
    });
  }

  function showProfile(reading, restored = false) {
    const profile = reading.profile;
    const dayMaster = profile.dayMasterElement
      ? `${profile.dayMaster}${profile.dayMasterElement}日主`
      : '日主暫缺';
    profileStatus.innerHTML = `
      <span class="tarot-profile-label">本命解讀依據</span>
      <span class="tarot-chip">☉ ${escapeHtml(profile.sunSign.name)}</span>
      <span class="tarot-chip">五行 ${escapeHtml(dayMaster)}</span>
      <span class="tarot-profile-note">${restored ? '今天已揭過牌，以下保留同一張結果。' : '同一份生日資料，每天只有一張固定牌。'}</span>
    `;
  }

  function prepareReading(birthData, restored = false) {
    dateKey = getLocalDateKey();
    dateElement.textContent = formatDate(dateKey);
    currentBirthData = birthData;
    currentReading = drawDailyTarot({ birthData, dateKey });
    drawButton.disabled = false;
    drawButton.classList.add('is-ready');
    showProfile(currentReading, restored);
    return currentReading;
  }

  function renderReading(reading, shouldScroll = true) {
    const { card, meaning, orientation, orientationLabel, personalReading, profile } = reading;
    const orientationClass = orientation === 'reversed' ? ' is-reversed' : '';
    const chips = meaning.keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join('');

    resultElement.innerHTML = `
      <section class="tarot-reading" aria-labelledby="tarot-card-title">
        <div class="tarot-card-shell${orientationClass}">
          <div class="tarot-card-face">
            <span class="tarot-card-number">${romanNumeral(card.number)}</span>
            <span class="tarot-card-symbol" aria-hidden="true">${escapeHtml(card.symbol)}</span>
            <span class="tarot-card-name" id="tarot-card-title">${escapeHtml(card.name)}</span>
            <span class="tarot-card-en">${escapeHtml(card.en)}</span>
            <span class="tarot-card-element">${escapeHtml(card.element)}元素</span>
          </div>
        </div>
        <div class="tarot-reading-body">
          <div class="tarot-reading-heading">
            <div>
              <span class="tarot-eyebrow">你今天的牌</span>
              <h2>${escapeHtml(card.name)}・${escapeHtml(orientationLabel)}</h2>
            </div>
            <span class="tarot-orientation">${escapeHtml(orientationLabel)}</span>
          </div>
          <div class="tarot-keywords">${chips}</div>
          <p class="tarot-main-message">${escapeHtml(meaning.message)}</p>
          <div class="tarot-guidance">
            <div><span>今天可以這樣做</span><p>${escapeHtml(meaning.action)}</p></div>
            <div><span>今天問問自己</span><p>${escapeHtml(meaning.reflection)}</p></div>
          </div>
        </div>
      </section>
      <section class="tarot-personal">
        <div class="tarot-section-title"><span>✦</span><div><b>本命資料 × 今日牌</b><small>不是通用牌義，而是你接住這張牌的方式</small></div></div>
        <div class="tarot-personal-grid">
          <article><span class="tarot-personal-tag">太陽星座</span><p>${escapeHtml(personalReading.zodiac)}</p></article>
          <article><span class="tarot-personal-tag">八字日主</span><p>${escapeHtml(personalReading.dayMaster)}</p></article>
        </div>
        <p class="tarot-resonance">${escapeHtml(personalReading.resonance)}</p>
        <p class="tarot-source-note">本次個人化依據：${escapeHtml(profile.sunSign.name)} ＋ ${escapeHtml(profile.dayMasterElement ? `${profile.dayMaster}${profile.dayMasterElement}日主` : '生日基礎資料')}。資料只留在你的瀏覽器。</p>
      </section>
      <p class="tarot-tomorrow">一日一牌。明天會依新的日期，為同一份本命資料換一張牌。</p>
    `;
    resultElement.hidden = false;
    drawButton.classList.add('has-drawn');
    drawButton.setAttribute('aria-expanded', 'true');

    writeJson(DAILY_STORAGE_KEY, {
      dateKey: reading.dateKey,
      birthFingerprint: reading.birthFingerprint,
      cardId: reading.card.id,
      orientation: reading.orientation,
      revealed: true,
    });

    if (shouldScroll) {
      resultElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderQuestionReading(reading) {
    const spreadHtml = reading.spread.map(({ position, card, orientation, orientationLabel, meaning }) => {
      const reversedClass = orientation === 'reversed' ? ' is-reversed' : '';
      const keywords = meaning.keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join('');
      return `
        <article class="tarot-spread-card">
          <div class="tarot-spread-position"><b>${escapeHtml(position.label)}</b><small>${escapeHtml(position.prompt)}</small></div>
          <div class="tarot-mini-card${reversedClass}">
            <span class="tarot-mini-number">${romanNumeral(card.number)}</span>
            <span class="tarot-mini-symbol" aria-hidden="true">${escapeHtml(card.symbol)}</span>
            <span class="tarot-mini-name">${escapeHtml(card.name)}</span>
          </div>
          <h3>${escapeHtml(card.name)}・${escapeHtml(orientationLabel)}</h3>
          <div class="tarot-keywords">${keywords}</div>
          <p>${escapeHtml(meaning.message)}</p>
        </article>
      `;
    }).join('');

    resultElement.innerHTML = `
      <section class="tarot-question-result">
        <span class="tarot-eyebrow">你問的事情</span>
        <h2>「${escapeHtml(reading.question)}」</h2>
        <div class="tarot-spread">${spreadHtml}</div>
      </section>
      <section class="tarot-personal tarot-question-personal">
        <div class="tarot-section-title"><span>✦</span><div><b>本命給你的解題方式</b><small>${escapeHtml(reading.profile.sunSign.name)} ＋ ${escapeHtml(reading.profile.dayMasterElement ? `${reading.profile.dayMaster}${reading.profile.dayMasterElement}日主` : '生日基礎資料')}</small></div></div>
        <div class="tarot-personal-grid">
          <article><span class="tarot-personal-tag">太陽星座</span><p>${escapeHtml(reading.personalReading.zodiac)}</p></article>
          <article><span class="tarot-personal-tag">八字日主</span><p>${escapeHtml(reading.personalReading.dayMaster)}</p></article>
        </div>
        <div class="tarot-question-conclusion">
          <span>把牌意落地</span>
          <p>${escapeHtml(reading.personalReading.finalAction)}</p>
          <small>問問自己：${escapeHtml(reading.personalReading.finalReflection)}</small>
        </div>
        <p class="tarot-source-note">同一個問題、同一天會保留同一組牌；不是靠重抽挑喜歡的答案。問題與結果只保存在你的瀏覽器。</p>
      </section>
    `;
    resultElement.hidden = false;
    writeJson(QUESTION_STORAGE_KEY, {
      dateKey: reading.dateKey,
      birthFingerprint: reading.birthFingerprint,
      question: reading.question,
      questionFingerprint: reading.questionFingerprint,
      cardIds: reading.spread.map((item) => item.card.id),
      orientations: reading.spread.map((item) => item.orientation),
    });
    resultElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    setError();
    try {
      const birthData = readForm();
      writeJson(BIRTH_STORAGE_KEY, birthData);
      prepareReading(birthData);
      resultElement.hidden = true;
      resultElement.innerHTML = '';
      drawButton.classList.remove('has-drawn');
      drawButton.setAttribute('aria-expanded', 'false');
      details.open = false;
    } catch (error) {
      setError(error.message || '出生日期有誤，請重新確認。');
    }
  });

  drawButton.addEventListener('click', () => {
    if (currentBirthData) {
      prepareReading(currentBirthData);
      renderReading(currentReading);
    }
  });

  questionForm.addEventListener('submit', (event) => {
    event.preventDefault();
    questionError.textContent = '';
    if (!currentBirthData) {
      questionError.textContent = '請先輸入出生日期，再為這件事抽牌。';
      details.open = true;
      yearInput.focus();
      return;
    }
    try {
      dateKey = getLocalDateKey();
      dateElement.textContent = formatDate(dateKey);
      const reading = drawQuestionTarot({
        birthData: currentBirthData,
        question: questionInput.value,
        dateKey,
      });
      questionInput.value = reading.question;
      renderQuestionReading(reading);
    } catch (error) {
      questionError.textContent = error.message || '問題暫時無法解讀，請重新確認。';
    }
  });

  const savedQuestion = readJson(QUESTION_STORAGE_KEY);
  if (savedQuestion && typeof savedQuestion.question === 'string') {
    questionInput.value = savedQuestion.question;
  }

  const savedBirth = readJson(BIRTH_STORAGE_KEY);
  fillForm(savedBirth);
  try {
    const birthData = normalizeBirthData(savedBirth);
    const fingerprint = getBirthFingerprint(birthData);
    const savedDaily = readJson(DAILY_STORAGE_KEY);
    const restored = Boolean(savedDaily
      && savedDaily.dateKey === dateKey
      && savedDaily.birthFingerprint === fingerprint
      && savedDaily.revealed);
    const reading = prepareReading(birthData, restored);
    details.open = false;
    if (restored
      && savedDaily.cardId === reading.card.id
      && savedDaily.orientation === reading.orientation) {
      renderReading(reading, false);
    }
  } catch (error) {
    drawButton.disabled = true;
    details.open = true;
    profileStatus.innerHTML = '<span class="tarot-profile-note">先輸入出生日期，才能把今日牌放進你的本命脈絡裡。</span>';
  }
}

initTarotPage();
