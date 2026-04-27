(function () {
const CONFIG = {
size: 60,
zIndex: 9999,
animation: 'cricket',
reRenderDelay: 300
};

const PAGE_MAP = [
{ match: /^\/(?:en|hi|bn|te|mr|ta)?\/?$/, image: '/content/uploads/Red_Ball_3705195b14.webp', id: 'LEMON_HUNT:1', type_ball: 'redball' },
{ match: /(^|\/)my-account\/?$/, image: '/content/uploads/Red_Ball_3705195b14.webp', id: 'LEMON_HUNT:2', type_ball: 'redball' },
{ match: /(^|\/)promo\/?$/, image: '/content/uploads/Red_Ball_3705195b14.webp', id: 'LEMON_HUNT:3', type_ball: 'redball' },
{ match: /(^|\/)top-express\/?$/, image: '/content/uploads/Red_Ball_3705195b14.webp', id: 'LEMON_HUNT:4', type_ball: 'redball' },
{ match: /(^|\/)favorites\/events\/?$/, image: '/content/uploads/Red_Ball_3705195b14.webp', id: 'LEMON_HUNT:5', type_ball: 'redball' },
{ match: /(^|\/)cricket\/live\/?$/, image: '/content/uploads/Red_Ball_3705195b14.webp', id: 'LEMON_HUNT:6', type_ball: 'redball' },
{ match: /(^|\/)kabaddi\/live\/?$/, image: '/content/uploads/Red_Ball_3705195b14.webp', id: 'LEMON_HUNT:7', type_ball: 'redball' },
{ match: /(^|\/)horseracing\/live\/?$/, image: '/content/uploads/Red_Ball_3705195b14.webp', id: 'LEMON_HUNT:8', type_ball: 'redball' },
{ match: /(^|\/)casino\/live-casino\/?$/, image: '/content/uploads/Red_Ball_3705195b14.webp', id: 'LEMON_HUNT:9', type_ball: 'redball' },
{ match: /(^|\/)casino\/instant-games\/game\/spribe-in-aviator-insta\/?$/, image: '/content/uploads/Red_Ball_3705195b14.webp', id: 'LEMON_HUNT:10', type_ball: 'redball' },
{ match: /(^|\/)search\/?$/, image: '/content/uploads/Golden_Ball_bb09215114.webp', id: 'LEMON_HUNT:11', type_ball: 'goldenball' },
{ match: /(^|\/)menu\/?$/, image: '/content/uploads/Golden_Ball_bb09215114.webp', id: 'LEMON_HUNT:12', type_ball: 'goldenball' }
];

let currentEl = null;
let activeTooltip = null;

function getUserTags() {
  let tags = [];

  try {
    const stored = JSON.parse(localStorage.getItem('smartico_tags') || '[]');
    if (Array.isArray(stored)) {
      tags = stored.filter(tag => tag.startsWith('LEMON_HUNT'));
    }
  } catch (e) {
    tags = [];
  }

  const smartTags = window._smartico?.api?.getUserProfile()?.core_public_tags;

  if (Array.isArray(smartTags) && smartTags.length) {
    const filteredSmartTags = smartTags.filter(tag =>
      tag.startsWith('LEMON_HUNT')
    );

    tags = Array.from(new Set([
      ...tags,
      ...filteredSmartTags
    ]));

    try {
      localStorage.setItem('smartico_tags', JSON.stringify(tags));
    } catch (e) {}
  }

  return tags;
}


_smartico.on('props_change', function(props) {
  if (props.core_public_tags !== undefined) {

    let localTags;
    try {
      localTags = JSON.parse(localStorage.getItem('smartico_tags') || '[]');
    } catch (e) {
      localTags = [];
    }

    const smartTags = Array.isArray(props.core_public_tags)
      ? props.core_public_tags.filter(tag => tag.startsWith('LEMON_HUNT'))
      : [];

    const merged = Array.from(new Set([
      ...localTags,
      ...smartTags
    ]));

    localStorage.setItem('smartico_tags', JSON.stringify(merged));

    // если используешь кэш — обнови его
    if (typeof collectedCache !== 'undefined') {
      merged.forEach(tag => collectedCache.add(tag));
    }

    render();
  }
});

function getConfigForPage() {
const path = location.pathname;
return PAGE_MAP.find(item => item.match.test(path)) || null;
}

function getRandomPosition(size) {
const sidePadding = 20;
const topPercent = 0.2;
const bottomPercent = 0.2;
const viewportHeight = window.innerHeight;
let minY = viewportHeight * topPercent;
let maxY = viewportHeight * (1 - bottomPercent) - size;
const minX = sidePadding;
const maxX = window.innerWidth - size - sidePadding;
if (maxY < minY) { minY = 50; maxY = window.innerHeight - size - 50; }
return { x: Math.floor(Math.random() * (maxX - minX) + minX), y: Math.floor(Math.random() * (maxY - minY) + minY) };
}

function createElement(config) {
if (currentEl && currentEl.dataset.id === config.id) {
    return;
  }
if (currentEl) currentEl.remove();
const pos = getRandomPosition(CONFIG.size);
const el = document.createElement('img');
el.dataset.id = config.id; // dataset для id
el.src = config.image;
Object.assign(el.style, {
position: 'fixed',
left: pos.x + 'px',
top: pos.y + 'px',
width: CONFIG.size + 'px',
height: CONFIG.size + 'px',
zIndex: CONFIG.zIndex,
pointerEvents: 'auto',
cursor: 'pointer',
willChange: 'transform',
opacity: 0,
transition: 'opacity 0.25s ease'
});
applyAnimation(el);
document.body.appendChild(el);
currentEl = el;
requestAnimationFrame(() => {el.style.opacity = 1;

 window.analytics = window.analytics || [];
 window.analytics.push({
  schema: 'iglu:com.psp/widget_platform_view/jsonschema/5-0-0',
  data: {
    entity: "widget_item",
    item_id: config.id,
    item_name: "hunt_ball_view",
    item_type: config.type_ball,
    page_id: location.pathname,
    page_name: location.pathname,
    page_type: location.pathname,
    widget_name: "hunt_ball"
  }
});

setTimeout(() => {
const tags = getUserTags() || [];
const isFirstBallEver = !tags.some(tag => tag.startsWith('LEMON_HUNT'));
if (isFirstBallEver && !localStorage.getItem('tooltip_seen')) {
showTooltip(el, config);
}
}, 200);
});

el.addEventListener('click', () => {
  handleBallAction(config, el);
}, { once: true });
}

function removeTooltip() {
if (activeTooltip) {
activeTooltip.remove();
activeTooltip = null;
}
}

function showTooltip(targetEl, config) {
if (!targetEl || !config) return;

if (
config.type_ball !== 'redball' ||
localStorage.getItem('tooltip_seen') ||
activeTooltip
) return;

const tooltip = document.createElement('div');
tooltip.className = 'tooltip-mini-game';
tooltip.style.position = 'fixed';

tooltip.innerHTML = `
<div class="tooltip-box">
<div class="tooltip-arrow"></div>

<div class="tooltip-content">
Сollect 12 balls to enter ₹10 lakh giveaway!

<div class="tooltip-actions">
<span class="skip-tooltip">Skip</span>
<button class="tooltip-btn">EXPLORE</button>
</div>
</div>
</div>
`;

document.body.appendChild(tooltip);
activeTooltip = tooltip;

window.analytics = window.analytics || [];
 window.analytics.push({
  schema: 'iglu:com.psp/widget_platform_view/jsonschema/5-0-0',
  data: {
    entity: "widget_item",
    item_id: config.id,
    item_name: "hunt_tooltip_show",
    item_type: config.type_ball,
    page_id: location.pathname,
    page_name: location.pathname,
    page_type: location.pathname,
    widget_name: "hunt_ball"
  }
});

const rect = targetEl.getBoundingClientRect();
const margin = 4;

const tooltipBox = tooltip.querySelector('.tooltip-box');

// сначала скрываем чтобы измерить
tooltip.style.visibility = 'hidden';

const tooltipRect = tooltipBox.getBoundingClientRect();

let top;
let left;

const showAbove = rect.top > tooltipRect.height + margin;

if (showAbove) {
top = rect.top - tooltipRect.height - margin;
} else {
top = rect.bottom + margin;
}

left = rect.left + rect.width / 2 - tooltipRect.width / 2;

left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));
top = Math.max(8, Math.min(top, window.innerHeight - tooltipRect.height - 8));

tooltip.style.left = left + 'px';
tooltip.style.top = top + 'px';
tooltip.style.visibility = 'visible';

// стрелка в мяч
const arrow = tooltip.querySelector('.tooltip-arrow');

const ballCenter = rect.left + rect.width / 2;
let arrowLeft = ballCenter - left;

arrowLeft = Math.max(16, Math.min(arrowLeft, tooltipRect.width - 16));

arrow.style.left = arrowLeft + 'px';

if (showAbove) {
arrow.style.bottom = '-7px';
arrow.style.top = 'auto';
} else {
arrow.style.top = '-7px';
arrow.style.bottom = 'auto';
}

function positionTooltip() {
  if (!activeTooltip || !targetEl) return; // если тултип или мяч отсутствуют, выходим

  // Проверяем, если мяч был удалён из DOM, не продолжаем позиционирование
  if (!document.body.contains(targetEl)) return;

  const rect = targetEl.getBoundingClientRect();
  const tooltipBox = activeTooltip.querySelector('.tooltip-box');
  const margin = 4;

  const tooltipRect = tooltipBox.getBoundingClientRect();
  let top, left;

  const showAbove = rect.top > tooltipRect.height + margin;

  if (showAbove) {
    top = rect.top - tooltipRect.height - margin;
  } else {
    top = rect.bottom + margin;
  }

  left = rect.left + rect.width / 2 - tooltipRect.width / 2;

  left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));
  top = Math.max(8, Math.min(top, window.innerHeight - tooltipRect.height - 8));

  activeTooltip.style.left = left + 'px';
  activeTooltip.style.top = top + 'px';
}

  function followBallPosition() {
    if (activeTooltip && targetEl) {
      positionTooltip(); // обновляем позицию тултипа
      requestAnimationFrame(followBallPosition); // продолжаем отслеживать
    }
  }

  requestAnimationFrame(followBallPosition);

function closeTooltip() {
if (activeTooltip) {
activeTooltip.remove();
activeTooltip = null;
}
localStorage.setItem('tooltip_seen', 'true');
window.removeEventListener('resize', onResize);
}

function onResize() {
closeTooltip();
}

const skipBtn = tooltip.querySelector('.skip-tooltip');
const exploreBtn = tooltip.querySelector('.tooltip-btn');

skipBtn.addEventListener('click', () => {
  window.analytics = window.analytics || [];
  window.analytics.push({
    schema: 'iglu:com.psp/widget_platform_click/jsonschema/5-0-0',
    data: {
      click_type: "hunt_tooltip_skip",
      entity: "widget_item",
      item_id: config.id,
      item_name: "hunt_tooltip_skip",
      item_type: config.type_ball,
      page_id: location.pathname,
      page_name: location.pathname,
      page_type: location.pathname,
      widget_name: "hunt_ball"
    }
  });

  closeTooltip();
  handleBallAction(config, targetEl);
});

exploreBtn.addEventListener('click', () => {
  window.analytics = window.analytics || [];
  window.analytics.push({
    schema: 'iglu:com.psp/widget_platform_click/jsonschema/5-0-0',
    data: {
      click_type: "hunt_tooltip_explore",
      entity: "widget_item",
      item_id: config.id,
      item_name: "hunt_tooltip_explore",
      item_type: config.type_ball,
      page_id: location.pathname,
      page_name: location.pathname,
      page_type: location.pathname,
      widget_name: "hunt_ball"
    }
  });

  closeTooltip();

  handleBallAction(config, targetEl, () => {
    _smartico.dp('dp:gf_section&id=1398');
  });
});

window.addEventListener('resize', onResize);
}


function handleBallAction(config, targetEl, extraAction) {
  if (!targetEl) return;

  let tags;
try {
  tags = JSON.parse(localStorage.getItem('smartico_tags') || '[]');
} catch (e) {
  tags = [];
}

if (!tags.includes(config.id)) {
  tags.push(config.id);
  localStorage.setItem('smartico_tags', JSON.stringify(tags));
}
  
 window.analytics = window.analytics || [];
 window.analytics.push({
  schema: 'iglu:com.psp/widget_platform_click/jsonschema/5-0-0',
  data: {
    click_type: "hunt_ball_click",
    entity: "widget_item",
    item_id: config.id,
    item_name: "hunt_ball_click",
    item_type: config.type_ball,
    page_id: location.pathname,
    page_name: location.pathname,
    page_type: location.pathname,
    widget_name: "hunt_ball"
  }
});

  targetEl.style.pointerEvents = 'none';

  // 🎬 анимация (перенесли сюда)
  targetEl.style.animation = 'none';
  targetEl.offsetHeight;

  targetEl.style.transition =
    'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s';

  targetEl.style.transform = 'scale(1.4) rotate(360deg)';
  targetEl.style.opacity = '0';

  setTimeout(() => {
    targetEl.remove();
  }, 300);

  removeTooltip();


  _smartico.updatePublicTags('add', [config.id]);
  _smartico.action('lemon_hunt_action_week_1', {
    custom_location: config.type_ball
  });

  if (extraAction) extraAction();

}

function applyAnimation(el) {
if (!document.getElementById('tooltip-style')) {
const style = document.createElement('style');
style.id = 'tooltip-style';
style.innerHTML = `
.tooltip-mini-game {
position: fixed;
z-index: 9999999;
pointer-events: auto;
animation: tooltipFade 0.25s ease;
}

@keyframes tooltipFade {
from { opacity: 0; transform: scale(0.95); }
to { opacity: 1; transform: scale(1); }
}

.tooltip-box {
position: relative;
background: #f5f500;
border-radius: 16px;
padding: 16px;
max-width: min(280px, calc(100vw - 24px));
box-shadow: 0 10px 24px rgba(0,0,0,0.25);
font-family: sans-serif;
}

.tooltip-content {
font-weight: 700;
color: #000;
line-height: 1.35;
}
.tooltip-actions {
display: flex;
align-items: center;
justify-content: space-between;
gap: 12px;
margin-top: 12px;
}

.tooltip-btn {
margin: 0;
flex: 1;
max-width: 140px;
background: #000;
color: #fff;
border: none;
padding: 12px;
border-radius: 24px;
cursor: pointer;
font-weight: bold;
}

.skip-tooltip {
font-size: 12px;
text-decoration: underline;
cursor: pointer;
margin: 0;
}

.tooltip-arrow {
position: absolute;
width: 14px;
height: 14px;
background: #f5f500;
transform: rotate(45deg);
}
`;
document.head.appendChild(style);
}
if (!document.getElementById('gamification-anim-style')) {
const style = document.createElement('style');
style.id = 'gamification-anim-style';
style.innerHTML = `
@keyframes cricketBallAnim {0%{transform:rotate(-18deg) translateY(0) scale(1);}25%{transform:rotate(-18deg) translateY(-14px) scale(1.05);}40%{transform:rotate(-8deg) translateY(0) scale(0.92);}50%{transform:rotate(12deg) translateY(-10px) scale(1.03);}65%{transform:rotate(18deg) translateY(0) scale(0.94);}80%{transform:rotate(10deg) translateY(-6px) scale(1.01);}100%{transform:rotate(-18deg) translateY(0) scale(1);}}
@keyframes floatAnim {0%{transform:translateY(0);}50%{transform:translateY(-10px);}100%{transform:translateY(0);}}
@keyframes bounceAnim {0%,100%{transform:translateY(0);}50%{transform:translateY(-20px);}}
@keyframes rotateAnim {from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
`;
document.head.appendChild(style);
}

el.style.animation = 'none';
el.offsetHeight;

if (CONFIG.animation === 'float') el.style.animation = 'floatAnim 2s ease-in-out infinite';
if (CONFIG.animation === 'bounce') el.style.animation = 'bounceAnim 1.5s infinite';
if (CONFIG.animation === 'rotate') el.style.animation = 'rotateAnim 4s linear infinite';
if (CONFIG.animation === 'cricket') el.style.animation = 'cricketBallAnim 2.2s cubic-bezier(0.3,0.7,0.4,1.4) infinite';
}

function removeBallSmooth() {
if (!currentEl) return;

currentEl.style.transition = 'opacity 0.25s ease';
currentEl.style.opacity = 0;

setTimeout(() => {
currentEl?.remove();
currentEl = null;
}, 250);
}

function render() {
  const config = getConfigForPage();
  const userTags = getUserTags();
  const allMallsCollected = PAGE_MAP.every(p => userTags.includes(p.id));

  if (allMallsCollected) {
    // Если собраны все мячи, не показываем ничего
    if (currentEl) {
      currentEl.remove();
      currentEl = null;
    }
    return;
  }
  if (!config) {
    removeTooltip();
    if (currentEl) { currentEl.remove(); currentEl = null; }
    return;
  }

  const allRedIds = PAGE_MAP.filter(p => p.type_ball === 'redball').map(p => p.id);
  const hasAllRedBalls = allRedIds.every(id => userTags.includes(id));

  if (config.type_ball === 'goldenball' && !hasAllRedBalls) {
    // ещё не собраны все красные мячи — не показываем золотой
    if (currentEl) { currentEl.remove(); currentEl = null; }
    return;
  }

  // Если пользователь уже собрал этот мяч, не показываем
  if (userTags.includes(config.id)) {
    if (currentEl) { currentEl.remove(); currentEl = null; }
    return;
  }

  createElement(config);
}

let domStableTimeout;
let renderLock = false;

function safeRender() {
  if (renderLock) return;

  renderLock = true;
  requestAnimationFrame(() => {
    render();
    renderLock = false;
  });
}

function runAfterDOMStable(callback) {
  clearTimeout(domStableTimeout);

  domStableTimeout = setTimeout(() => {
    callback();
  }, 80);
}

function initSPAListener() {
  const pushState = history.pushState;

  history.pushState = function () {
    pushState.apply(history, arguments);

    removeTooltip();

    runAfterDOMStable(safeRender);
  };

  window.addEventListener('popstate', () => {
    removeTooltip();

    runAfterDOMStable(safeRender);
  });
}

initSPAListener();

window.addEventListener('load', () => {
  runAfterDOMStable(safeRender);
});

})();
