import './v3-base.js?v=vw-1';

const root = document.documentElement;
const preview = document.querySelector('.work-preview');
const markers = [...document.querySelectorAll('[data-work-inspect]')];
const explanation = document.querySelector('#work-solution');
const hint = document.querySelector('#work-hotspot-hint');

const decisions = {
  headline: {
    label: ['Разобрать заголовок VELORA', 'Inspect the VELORA headline'],
    ru: 'Название бренда занимает почти весь первый экран: посетитель сразу понимает, для кого создан сайт.',
    en: 'The brand name owns the first screen, making the intended audience clear at a glance.'
  },
  collection: {
    label: ['Разобрать фотографию коллекции', 'Inspect the collection photography'],
    ru: 'Крупная фотография коллекции создаёт настроение и показывает вещи без длинного вступления.',
    en: 'Large collection photography sets the mood and presents the pieces without a long introduction.'
  },
  'next-step': {
    label: ['Разобрать следующий шаг', 'Inspect the next step'],
    ru: 'Два понятных действия ведут либо к записи на примерку, либо к просмотру коллекции.',
    en: 'Two clear actions lead visitors to book an appointment or explore the collection.'
  }
};

const baseSolution = {
  ru: 'Крупная фотография, типографика с характером и короткий путь к заявке.',
  en: 'Large photography, expressive typography, and a short path to an enquiry.'
};
let activeDecision = 'headline';
let currentKey = '';

function isRussian() {
  return root.lang === 'ru';
}

function setDecision(id) {
  const decision = decisions[id];
  if (!decision || preview.dataset.work !== 'velora' || preview.dataset.device === 'mobile') return;
  activeDecision = id;
  markers.forEach(button => {
    const selected = button.dataset.workInspect === id;
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-label', decision.label[isRussian() ? 0 : 1]);
  });
  explanation.textContent = isRussian() ? decision.ru : decision.en;
}

function syncPreview() {
  const key = `${preview.dataset.work}:${preview.dataset.device}`;
  const changed = key !== currentKey;
  currentKey = key;
  const inspectable = preview.dataset.work === 'velora' && preview.dataset.device !== 'mobile';
  markers.forEach(button => { button.hidden = !inspectable; });
  hint.hidden = !inspectable;

  if (preview.dataset.work !== 'velora') {
    activeDecision = 'headline';
    return;
  }
  if (!inspectable) {
    explanation.textContent = isRussian() ? baseSolution.ru : baseSolution.en;
    return;
  }
  if (changed) activeDecision = 'headline';
  setDecision(activeDecision);
}

markers.forEach(button => button.addEventListener('click', () => setDecision(button.dataset.workInspect)));
new MutationObserver(syncPreview).observe(preview, { attributes: true, attributeFilter: ['data-work', 'data-device'] });
root.addEventListener('popovweb:language', syncPreview);
syncPreview();
