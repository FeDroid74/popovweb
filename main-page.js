const root = document.documentElement;
function translateServices() {
  document.querySelectorAll('.v2-pricing [data-ru]').forEach(element => {
    element.textContent = element.dataset[root.lang === 'ru' ? 'ru' : 'en'];
  });
  document.querySelector('.format-tabs').setAttribute('aria-label', root.lang === 'ru' ? 'Задача сайта' : 'Website goal');
}
translateServices();
root.addEventListener('popovweb:language', translateServices);
const tabs = [...document.querySelectorAll('.format-tabs [role=tab]')];
function activate(tab) {
  tabs.forEach(item => { const active = item === tab; item.setAttribute('aria-selected', String(active)); item.tabIndex = active ? 0 : -1; });
  document.querySelectorAll('.format-panel').forEach(panel => { panel.hidden = panel.id !== tab.getAttribute('aria-controls'); });
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activate(tab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + tabs.length) % tabs.length;
    activate(tabs[next]); tabs[next].focus();
  });
});
