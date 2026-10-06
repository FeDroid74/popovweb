const root = document.documentElement;
const links = [...document.querySelectorAll('[data-locale]')];
const curtain = document.querySelector('.locale-curtain');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const key = 'popovweb-locale-transfer';
let leaving = false;
let fallback;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function reset() {
  leaving = false;
  clearTimeout(fallback);
  root.classList.remove('locale-leaving', 'locale-arriving', 'locale-swapping', 'locale-revealing');
}
addEventListener('pageshow', event => { if (event.persisted) reset(); });
addEventListener('pagehide', reset);

function position() {
  const line = Math.min(180, innerHeight * .25);
  const sections = [...document.querySelectorAll('main > section[id]')];
  const section = sections.find(node => {
    const box = node.getBoundingClientRect();
    return box.top <= line && box.bottom > line;
  }) || sections.find(node => node.getBoundingClientRect().top > line);
  if (!section || scrollY < 80) return { id: 'top', ratio: 0 };
  const box = section.getBoundingClientRect();
  return { id: section.id, ratio: Math.max(0, Math.min(1, -box.top / Math.max(1, box.height))) };
}

links.forEach(link => {
  link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
    if (link.dataset.locale === root.lang) { event.preventDefault(); return; }
    if (leaving) { event.preventDefault(); return; }
    const target = new URL(link.href);
    const scroll = position();
    const activePortfolio = document.querySelector('[data-portfolio-tab][aria-selected="true"]')?.dataset.portfolioTab;
    target.hash = scroll.id === 'top' ? '' : scroll.id;
    if (scroll.id === 'work' && activePortfolio === 'templates') target.hash = 'templates';
    if (activePortfolio && activePortfolio !== 'sites') target.searchParams.set('portfolio', activePortfolio);
    const form = document.querySelector('.project-form');
    const draft = {};
    form?.dispatchEvent(new CustomEvent('popovweb:save-draft', { detail: draft }));
    const transfer = {
      at: Date.now(), target: target.pathname, keyboard: event.detail === 0, animate: !reduced.matches && event.detail !== 0,
      scroll, draft, plan: document.querySelector('.chosen-plan')?.dataset.plan,
      format: document.querySelector('[data-format][aria-selected="true"]')?.dataset.format,
      portfolio: activePortfolio,
    };
    try { sessionStorage.setItem(key, JSON.stringify(transfer)); }
    catch { return; } // No storage: keep native navigation, with no artificial delay.
    event.preventDefault();
    if (!transfer.animate) { location.assign(target.href); return; }
    leaving = true;
    curtain.querySelector('[data-locale-from]').textContent = root.lang.toUpperCase();
    curtain.querySelector('[data-locale-to]').textContent = link.dataset.locale.toUpperCase();
    root.classList.add('locale-leaving');
    setTimeout(() => location.assign(target.href), 220);
    // A cancelled/failed navigation must never trap the visitor behind an overlay.
    fallback = setTimeout(reset, 4000);
  });
});

async function restore() {
  const transfer = window.popovLocaleTransfer;
  delete window.popovLocaleTransfer;
  if (!transfer) return;
  root.dispatchEvent(new CustomEvent('popovweb:restore-format', { detail: transfer.format }));
  root.dispatchEvent(new CustomEvent('popovweb:restore-portfolio', { detail: transfer.portfolio }));
  root.dispatchEvent(new CustomEvent('popovweb:restore-plan', { detail: transfer.plan }));
  document.querySelector('.project-form')?.dispatchEvent(new CustomEvent('popovweb:restore-draft', { detail: transfer.draft }));
  // Wait briefly for fonts, without making them a prerequisite for opening the page.
  await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 180))]);
  const section = document.getElementById(transfer.scroll?.id);
  if (section) {
    const ratio = Number.isFinite(transfer.scroll.ratio) ? Math.max(0, Math.min(1, transfer.scroll.ratio)) : 0;
    const box = section.getBoundingClientRect();
    window.scrollTo({ top: Math.max(0, scrollY + box.top + box.height * ratio - (ratio === 0 && section.id !== 'top' ? 130 : 0)), behavior: 'instant' });
  }
  if (transfer.keyboard) {
    const focusSwitch = () => requestAnimationFrame(() => links[0]?.focus({ preventScroll: true }));
    // Native fragment navigation can reset focus at load, after DOMContentLoaded.
    if (document.readyState === 'complete') focusSwitch();
    else addEventListener('load', focusSwitch, { once: true });
  }
  if (root.classList.contains('locale-arriving')) {
    // The old language stays visible across navigation. Only roll it away once
    // the destination and restored page position are ready behind the curtain.
    await delay(100);
    if (!root.classList.contains('locale-arriving')) return;
    root.classList.add('locale-swapping');
    await delay(760);
    if (!root.classList.contains('locale-arriving')) return;
    root.classList.replace('locale-arriving', 'locale-revealing');
    setTimeout(reset, 300);
  }
}
// Module scripts run while readyState is already "interactive". Wait for all
// sibling modules (contact, Radix, portfolio) to install their listeners first.
if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', restore, { once: true });
else restore();
