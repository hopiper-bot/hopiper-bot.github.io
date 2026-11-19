const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const wait = (milliseconds) => new Promise((resolve) => {
  window.setTimeout(resolve, prefersReducedMotion ? 40 : milliseconds);
});

function ensurePortal() {
  let portal = document.getElementById('cosmic-ritual');
  if (portal) return portal;

  portal = document.createElement('div');
  portal.id = 'cosmic-ritual';
  portal.setAttribute('aria-hidden', 'true');
  portal.innerHTML = `
    <div class="ritual-halo ritual-halo-outer"></div>
    <div class="ritual-halo ritual-halo-inner"></div>
    <div class="ritual-sigil"><span>☿</span><span>☽</span><span>♄</span><span>✦</span><span>☯</span></div>
    <div class="ritual-core">✦</div>
    <p>星軌交會・命盤展開</p>
  `;
  document.body.appendChild(portal);
  return portal;
}

async function openPortal() {
  if (document.body.classList.contains('ritual-opening')) return;
  const portal = ensurePortal();
  portal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('ritual-opening');
  await wait(1250);
}

async function shuffleTarot(mode = 'single') {
  const deck = document.getElementById('tarot-draw');
  const host = deck?.closest('.tarot-deck-wrap') || document.querySelector('.tarot-question-panel');
  if (!host || host.classList.contains('is-shuffling')) return;

  host.classList.add('is-shuffling');
  const fan = document.createElement('div');
  fan.className = `tarot-ghost-fan tarot-ghost-fan-${mode}`;
  fan.setAttribute('aria-hidden', 'true');
  fan.innerHTML = Array.from({ length: mode === 'spread' ? 7 : 5 }, (_, index) => (
    `<span style="--card-index:${index}"><i>☾</i></span>`
  )).join('');
  host.appendChild(fan);

  await wait(mode === 'spread' ? 1150 : 920);
  fan.remove();
  host.classList.remove('is-shuffling');
}

async function castMeihua() {
  const container = document.getElementById('meihua-container');
  const result = document.getElementById('meihua-result');
  if (!container || container.classList.contains('is-casting')) return;

  result?.classList.remove('gua-revealed');
  container.classList.add('is-casting');
  const ritual = document.createElement('div');
  ritual.className = 'meihua-ritual';
  ritual.setAttribute('role', 'status');
  ritual.setAttribute('aria-label', '陰陽流轉，正在形成卦象');
  ritual.innerHTML = `
    <div class="meihua-taiji" aria-hidden="true"></div>
    <div class="meihua-lines" aria-hidden="true">
      ${Array.from({ length: 6 }, (_, index) => `<span style="--line-index:${index}"></span>`).join('')}
    </div>
    <p>陰陽流轉・六爻成象</p>
  `;
  result?.before(ritual);

  await wait(1450);
  ritual.remove();
  container.classList.remove('is-casting');
}

function initScrollReveals() {
  const targets = [...document.querySelectorAll('.panel, .more-item')];
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach((target) => target.classList.add('cosmic-visible'));
    return;
  }

  targets.forEach((target) => target.classList.add('cosmic-reveal'));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('cosmic-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -25px' });
  targets.forEach((target) => observer.observe(target));
}

function initResultArrival() {
  const resultContainer = document.getElementById('result-container');
  if (!resultContainer || prefersReducedMotion) return;
  resultContainer.classList.add('cosmic-result-arrival');
  window.setTimeout(() => resultContainer.classList.remove('cosmic-result-arrival'), 1500);
}

window.__cosmicRitual = {
  openPortal,
  shuffleTarot,
  castMeihua,
};

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveals();
  initResultArrival();
});
