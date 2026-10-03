import { ru } from './translations.js';
import { initStudio } from './studio.js';

const root = document.documentElement;
const themeButton = document.querySelector('.theme-toggle');
const languageButton = document.querySelector('.language-toggle');
const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const english = {};
const attributes = [['data-i18n', 'textContent'], ['data-i18n-alt', 'alt'], ['data-i18n-aria', 'aria-label']];
const bindings = attributes.flatMap(([attribute, target]) => [...document.querySelectorAll(`[${attribute}]`)].map(element => {
  const key = element.getAttribute(attribute);
  english[key] = target === 'textContent' ? element.textContent : element.getAttribute(target);
  return { element, key, target };
}));

function persist(key, value) { try { localStorage.setItem(key, value); } catch { /* Preferences remain usable without storage. */ } }
function updateControls() {
  const isRu = root.lang === 'ru';
  const isLight = root.dataset.theme === 'light';
  const themeLabel = isRu ? (isLight ? 'Включить тёмную тему' : 'Включить светлую тему') : (isLight ? 'Switch to dark theme' : 'Switch to light theme');
  themeButton.setAttribute('aria-label', themeLabel);
  themeButton.title = themeLabel;
  themeButton.setAttribute('aria-pressed', String(isLight));
  const languageLabel = isRu ? 'Switch to English' : 'Переключить на русский';
  languageButton.setAttribute('aria-label', languageLabel);
  languageButton.title = languageLabel;
  const menuOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-label', isRu ? (menuOpen ? 'Закрыть меню' : 'Открыть меню') : (menuOpen ? 'Close menu' : 'Open menu'));
  document.querySelector('meta[name="theme-color"]').content = isLight ? '#F5F5F2' : '#1B1C1A';
}
function setLanguage(language) {
  root.lang = language === 'ru' ? 'ru' : 'en';
  const dictionary = root.lang === 'ru' ? ru : english;
  bindings.forEach(({ element, key, target }) => {
    const value = dictionary[key] ?? english[key];
    if (target === 'textContent') element.textContent = value;
    else element.setAttribute(target, value);
  });
  document.title = root.lang === 'ru' ? 'PopovWeb — Дизайн сайтов и разработка на Framer' : 'PopovWeb — Independent design & Framer development';
  document.querySelector('meta[name="description"]').content = root.lang === 'ru' ? 'Продуманные сайты от Фёдора Попова. Независимый дизайн, разработка на Framer и осмысленная анимация.' : 'Thoughtful websites by Fedor Popov. Independent website design, Framer development and purposeful motion.';
  persist('popovweb-lang', root.lang);
  updateControls();
  root.dispatchEvent(new Event('popovweb:language'));
}
setLanguage(root.lang);
languageButton.addEventListener('click', () => setLanguage(root.lang === 'ru' ? 'en' : 'ru'));
let themeTransitionTimer;
themeButton.addEventListener('click', () => {
  clearTimeout(themeTransitionTimer);
  root.classList.add('theme-transition');
  root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
  persist('popovweb-theme', root.dataset.theme);
  updateControls();
  redrawIllumination();
  themeTransitionTimer = setTimeout(() => root.classList.remove('theme-transition'), 240);
});

function setMenu(open, restoreFocus = false) {
  mobileNav.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  updateControls();
  if (restoreFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => setMenu(mobileNav.hidden));
mobileNav.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !mobileNav.hidden) setMenu(false, true); });
document.addEventListener('pointerdown', event => { if (!mobileNav.hidden && !event.target.closest('.site-header')) setMenu(false); });
matchMedia('(min-width: 960px)').addEventListener('change', event => { if (event.matches) setMenu(false); });

// Contact illumination follows the pointer 1:1 and pauses outside the viewport.
const canvas = document.querySelector('#illumination');
const contact = canvas?.closest('[data-illumination]') || document.querySelector('#contact');
const context = canvas?.getContext('2d');
let width = 1, height = 1, time = 0, lastTime = 0, frame = 0, inView = true;
let x = .75, y = .45, targetX = .75, targetY = .45;
let accent = root.dataset.theme === 'light' ? '40,104,222' : '247,106,56';
function draw(delta = 16.67) {
  if (!context) return;
  time += Math.min(delta, 50) * .00072;
  x = targetX; y = targetY;
  context.clearRect(0, 0, width, height);
  const radius = Math.min(380, Math.max(width * .25, 190));
  const primary = context.createRadialGradient(x * width, y * height, 0, x * width, y * height, radius);
  primary.addColorStop(0, `rgba(${accent},.55)`); primary.addColorStop(.45, `rgba(${accent},.2)`); primary.addColorStop(1, `rgba(${accent},0)`);
  context.fillStyle = primary; context.fillRect(0, 0, width, height);
  const cx = width * .3 + Math.cos(time * .8) * Math.min(120, width * .12);
  const cy = height * .5 + Math.sin(time * .7) * 90;
  const secondary = context.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width * .4, 240));
  const tint = root.dataset.theme === 'light' ? '87,126,173' : '75,105,85';
  secondary.addColorStop(0, `rgba(${tint},.25)`); secondary.addColorStop(.6, `rgba(${tint},.08)`); secondary.addColorStop(1, `rgba(${tint},0)`);
  context.fillStyle = secondary; context.fillRect(0, 0, width, height);
}
function tick(now) {
  frame = 0;
  draw(lastTime ? now - lastTime : 16.67); lastTime = now;
  if (context && inView && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(tick);
}
function syncAnimation() {
  cancelAnimationFrame(frame); frame = 0; lastTime = 0;
  if (context && inView && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(tick);
  else draw(0);
}
function redrawIllumination() {
  accent = root.dataset.theme === 'light' ? '40,104,222' : '247,106,56';
  draw(0);
}
function resizeCanvas() {
  if (!canvas) return;
  const rect = contact.getBoundingClientRect();
  width = rect.width; height = rect.height;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  context?.setTransform(ratio, 0, 0, ratio, 0, 0); draw(0);
}
new ResizeObserver(resizeCanvas).observe(contact);
new IntersectionObserver(entries => { inView = entries[0].isIntersecting; syncAnimation(); }).observe(contact);
document.addEventListener('visibilitychange', syncAnimation);
reducedMotion.addEventListener('change', () => { updateControls(); syncAnimation(); });
function followPointer(event) {
  if (!context || reducedMotion.matches) return;
  const rect = contact.getBoundingClientRect();
  targetX = (event.clientX - rect.left) / rect.width; targetY = (event.clientY - rect.top) / rect.height;
  draw(0);
}
contact.addEventListener('pointermove', followPointer, { passive: true });
contact.addEventListener('pointerdown', followPointer, { passive: true });

// Keep native details semantics; animate both directions from the current height.
document.querySelectorAll('details').forEach(details => {
  const summary = details.querySelector('summary');
  const content = document.createElement('div');
  content.className = 'disclosure-content';
  while (summary.nextSibling) content.append(summary.nextSibling);
  details.append(content);
  let animation;
  let expanded = details.open;
  summary.addEventListener('click', event => {
    event.preventDefault();
    const startHeight = details.getBoundingClientRect().height;
    animation?.cancel();
    expanded = !expanded;
    details.dataset.expanded = String(expanded);
    details.open = expanded;
    const endHeight = details.getBoundingClientRect().height;
    if (reducedMotion.matches || event.detail === 0) {
      details.style.overflow = '';
      return;
    }
    details.open = true;
    details.style.overflow = 'hidden';
    animation = details.animate([{height:`${startHeight}px`},{height:`${endHeight}px`}], {
      duration: 260, easing: 'cubic-bezier(.16,1,.3,1)'
    });
    animation.onfinish = () => {
      details.open = expanded;
      details.style.overflow = '';
      animation = null;
    };
  });
});

// No scroll locks, synthetic inertia, snap points, or oversized scroll spacers.
const stack = document.querySelector('.project-stack');
const cards = [...stack.children];
const stackMedia = matchMedia('(min-width:1024px) and (min-height:650px)');
let stackFrame = 0;
function paintStack() {
  stackFrame = 0;
  const visibleCards = cards.filter(card => !card.hidden);
  cards.forEach(card => { if (card.hidden) card.style.transform = ''; });
  visibleCards.forEach((card, index) => {
    if (!stack.classList.contains('is-stacking') || reducedMotion.matches) {
      card.style.transform = '';
      return;
    }
    const next = visibleCards[index + 1];
    const progress = next ? Math.max(0, Math.min(1, (innerHeight - next.getBoundingClientRect().top) / (innerHeight - 108))) : 0;
    card.style.transform = `scale(${1 - progress * .045})`;
  });
}
function queueStack() {
  if (!stackFrame) stackFrame = requestAnimationFrame(paintStack);
}
function measureStack() {
  // If a card is too tall (translation, zoom, expanded details), let it scroll normally.
  stack.classList.toggle('is-stacking', stackMedia.matches && !reducedMotion.matches && cards.every(card => card.offsetHeight <= innerHeight - 132));
  queueStack();
}
const stackResize = new ResizeObserver(measureStack);
cards.forEach(card => stackResize.observe(card));
addEventListener('scroll', queueStack, {passive:true});
addEventListener('resize', measureStack, {passive:true});
stackMedia.addEventListener('change', measureStack);
reducedMotion.addEventListener('change', measureStack);
measureStack();

// A small entrance on scroll; content stays visible if scripts or animation are unavailable.
const reveals = new IntersectionObserver(entries => entries.forEach(entry => {
  if (!entry.isIntersecting) return;
  reveals.unobserve(entry.target);
  if (!reducedMotion.matches && entry.boundingClientRect.top > 0 && entry.target.animate) {
    entry.target.animate([{ opacity: .65, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 480, easing: 'cubic-bezier(.16,1,.3,1)' });
  }
}), { threshold: .08 });
document.querySelectorAll('.page > section:not(.hero):not(#work)').forEach(section => reveals.observe(section));
initStudio();
