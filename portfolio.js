const root = document.documentElement;
const work = document.querySelector('[data-portfolio]');
const tabs = [...work.querySelectorAll('[role="tab"]')];
const panel = work.querySelector('[role="tabpanel"]');
const cards = [...panel.children];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let animation;
let category = 'sites';
root.addEventListener('popovweb:restore-portfolio', event => activate(event.detail));

function translate() {
  const locale = root.lang === 'ru' ? 'ru' : 'en';
  work.querySelectorAll('[data-portfolio-ru]').forEach(node => {
    node.textContent = node.getAttribute(`data-portfolio-${locale}`);
  });
  work.querySelector('[role="tablist"]').setAttribute('aria-label', locale === 'ru' ? 'Раздел портфолио' : 'Portfolio category');
}

function activate(value, { updateUrl = false, animate = false } = {}) {
  const changed = category !== value;
  category = value === 'templates' ? value : 'sites';
  tabs.forEach(tab => {
    const active = tab.dataset.portfolioTab === category;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  cards.forEach(card => { card.hidden = card.dataset.portfolioCategory !== category; });
  panel.setAttribute('aria-labelledby', `portfolio-tab-${category}`);
  translate();
  animation?.cancel();
  if (changed && animate && !reduced.matches) {
    animation = panel.animate([{ opacity: .5 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
  }
  if (updateUrl) {
    const url = new URL(location.href);
    if (category !== 'sites') url.searchParams.set('portfolio', category);
    else url.searchParams.delete('portfolio');
    url.hash = 'work';
    history.pushState(null, '', url);
  }
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activate(tab.dataset.portfolioTab, { updateUrl: true, animate: true }));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    activate(tabs[next].dataset.portfolioTab, { updateUrl: true });
    tabs[next].focus();
  });
});

function restoreLocation() {
  activate(location.hash === '#templates' ? 'templates' : new URL(location.href).searchParams.get('portfolio'));
}
addEventListener('popstate', restoreLocation);
addEventListener('hashchange', restoreLocation);
root.addEventListener('popovweb:language', translate);
restoreLocation();
