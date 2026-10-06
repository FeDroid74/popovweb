const root = document.documentElement;
function translateServices() {
  document.querySelectorAll('.version-two [data-ru]').forEach(element => {
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

// This neutral process demo is local to v2 and never intercepts page scrolling.
const journey = document.querySelector('.journey');
if (journey) {
  const stepTabs = [...journey.querySelectorAll('[data-step]')];
  const scenes = [...journey.querySelectorAll('.journey-scene')];
  const viewTabs = [...journey.querySelectorAll('[data-view]')];
  const views = [...journey.querySelectorAll('.journey-view')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobileLayout = matchMedia('(max-width: 760px)');
  const backButton = journey.querySelector('.journey-back');
  const nextButton = journey.querySelector('.journey-next');
  const handoverTabs = [...journey.querySelectorAll('[data-handover]')];
  const handoverPanel = journey.querySelector('#handover-detail');
  let step = 0;
  let view = 0;
  let handover = 0;
  let transitionId = 0;

  const copy = {
    ru: {
      descriptions: [
        'Расскажите о бизнесе и задаче. Уточню, какие страницы и функции нужны, предложу состав работ, стоимость и сроки.',
        'Сначала согласуем структуру, затем дизайн. После соберу сайт и проверю страницы и формы на компьютере и телефоне.',
        'Подключу домен, проверю работу сайта и передам доступы. Покажу, как менять тексты, фотографии и другие согласованные разделы.'
      ],
      roles: ['Рассказать о проекте. Готовое ТЗ не нужно.', 'Посмотреть макеты и собрать обратную связь.', 'Проверить сайт и попробовать редактор вместе со мной.'],
      next: ['К созданию сайта', 'К запуску и передаче', 'Вернуться к началу'],
      captions: ['Согласуем содержание и порядок разделов.', 'Согласуем внешний вид до начала сборки.', 'Проверю работу сайта до публикации.'],
      role: 'От вас', steps: 'Этапы работы', views: 'Этапы создания сайта', back: 'Предыдущий этап', handoverLabel: 'Что входит в передачу',
      handoverTitles: ['Всё под вашим контролем', 'Обновляйте контент сами', 'Покажу, как пользоваться'],
      handoverDescriptions: ['Передаю доступы к сайту и подключённым сервисам. Разбираем, где управлять сайтом, доменом и оплатой платформы.', 'Заранее определим, что вы будете менять: тексты, фотографии, товары или проекты. Настрою редактор под эти задачи.', 'Объясню, как обновлять согласованные разделы, и оставлю инструкцию. Состав дальнейшей поддержки обсудим отдельно.']
    },
    en: {
      descriptions: [
        'Tell me about your business and goals. I will clarify the pages and features you need, then propose the scope, price, and timeline.',
        'We agree the structure first, then the design. I build the website and check the pages and forms on desktop and mobile.',
        'I connect your domain, check the website, and hand over access. I show you how to update text, photos, and the agreed sections.'
      ],
      roles: ['Tell me about the project. No technical brief required.', 'Review the designs and collect your feedback.', 'Check the website and try the editor with me.'],
      next: ['To the website', 'To launch and handover', 'Back to the beginning'],
      captions: ['We agree the content and order of sections.', 'We approve the design before the build.', 'I check the website before publishing.'],
      role: 'Your part', steps: 'Project stages', views: 'Website creation stages', back: 'Previous stage', handoverLabel: 'Handover contents',
      handoverTitles: ['You are in control', 'Update content yourself', 'I will show you how'],
      handoverDescriptions: ['I hand over access to the website and connected services. We go through where to manage the site, domain, and platform billing.', 'We agree which text, photos, products, or projects you will update. I set up the editor for those tasks.', 'I explain how to update the agreed sections and leave you a guide. Any ongoing support is scoped separately.']
    }
  };

  function currentCopy() { return copy[root.lang === 'ru' ? 'ru' : 'en']; }
  function updateText() {
    const text = currentCopy();
    journey.querySelector('#journey-description').textContent = text.descriptions[step];
    journey.querySelector('#journey-role-label').textContent = text.role;
    journey.querySelector('#journey-role').textContent = text.roles[step];
    journey.querySelector('#journey-next-label').textContent = text.next[step];
    journey.querySelector('#journey-view-caption').textContent = text.captions[view];
    journey.querySelector('.journey-tabs').setAttribute('aria-label', text.steps);
    journey.querySelector('.journey-views').setAttribute('aria-label', text.views);
    journey.querySelector('.journey-tabs').setAttribute('aria-orientation', mobileLayout.matches ? 'horizontal' : 'vertical');
    backButton.setAttribute('aria-label', text.back);
    journey.querySelector('.handover-files').setAttribute('aria-label', text.handoverLabel);
    journey.querySelector('#handover-detail-title').textContent = text.handoverTitles[handover];
    journey.querySelector('#handover-detail-copy').textContent = text.handoverDescriptions[handover];
  }

  // Keep transitions interruptible: settle the previous scene before retargeting.
  function selectStep(index, { animate = false, reveal = false } = {}) {
    if (index === step) return;
    const previous = step;
    const ticket = ++transitionId;
    scenes.forEach(scene => {
      scene.getAnimations().forEach(animation => animation.cancel());
      scene.classList.remove('is-leaving');
      scene.hidden = true;
      scene.inert = false;
      scene.removeAttribute('aria-hidden');
    });
    step = index;
    const incoming = scenes[step];
    const outgoing = scenes[previous];
    incoming.hidden = false;
    stepTabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === step)); tab.tabIndex = i === step ? 0 : -1; });
    journey.querySelector('#journey-current').textContent = String(step + 1).padStart(2, '0');
    backButton.disabled = step === 0;
    updateText();
    journey.classList.toggle('no-journey-motion', !animate);
    if (reveal && mobileLayout.matches) {
      journey.querySelector('.journey-demo').scrollIntoView({ block: 'start', behavior: animate && !reducedMotion.matches ? 'smooth' : 'instant' });
    }
    if (!animate || reducedMotion.matches) return;
    const direction = step > previous ? 1 : -1;
    outgoing.hidden = false;
    outgoing.inert = true;
    outgoing.setAttribute('aria-hidden', 'true');
    outgoing.classList.add('is-leaving');
    const timing = { duration: 280, easing: 'cubic-bezier(.23,1,.32,1)' };
    outgoing.animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${-direction * 44}px)`, opacity: 0 }], { ...timing, duration: 200, fill: 'forwards' });
    const entry = incoming.animate([{ transform: `translateX(${direction * 58}px)`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], timing);
    entry.finished.then(() => {
      if (ticket !== transitionId) return;
      outgoing.hidden = true;
      outgoing.classList.remove('is-leaving');
      outgoing.getAnimations().forEach(animation => animation.cancel());
    }).catch(() => {});
  }

  function selectView(index, animate = false) {
    if (index === view) return;
    view = index;
    viewTabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === view)); tab.tabIndex = i === view ? 0 : -1; });
    views.forEach((panel, i) => { panel.getAnimations().forEach(animation => animation.cancel()); panel.hidden = i !== view; });
    updateText();
    if (animate && !reducedMotion.matches) views[view].animate([{ opacity: .3, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' });
  }

  function bindTabs(items, select) {
    items.forEach((tab, index) => {
      tab.addEventListener('click', event => select(index, event.detail > 0));
      tab.addEventListener('keydown', event => {
        const vertical = tab.parentElement.getAttribute('aria-orientation') === 'vertical';
        const forward = vertical ? 'ArrowDown' : 'ArrowRight';
        const backward = vertical ? 'ArrowUp' : 'ArrowLeft';
        if (![forward, backward, 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === forward ? 1 : -1) + items.length) % items.length;
        select(next, false);
        items[next].focus({ preventScroll: true });
      });
    });
  }
  bindTabs(stepTabs, (index, animate) => selectStep(index, { animate }));
  bindTabs(viewTabs, selectView);
  bindTabs(handoverTabs, (index, animate) => {
    handover = index;
    handoverTabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
    handoverPanel.setAttribute('aria-labelledby', handoverTabs[index].id);
    handoverPanel.getAnimations().forEach(animation => animation.cancel());
    updateText();
    if (animate && !reducedMotion.matches) handoverPanel.animate([{ opacity: .35, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' });
  });
  nextButton.addEventListener('click', event => selectStep((step + 1) % scenes.length, { animate: event.detail > 0, reveal: true }));
  backButton.addEventListener('click', event => {
    selectStep(Math.max(0, step - 1), { animate: event.detail > 0, reveal: true });
    if (backButton.disabled) stepTabs[0].focus({ preventScroll: true });
  });
  root.addEventListener('popovweb:language', updateText);
  mobileLayout.addEventListener('change', updateText);
  reducedMotion.addEventListener('change', () => {
    ++transitionId;
    scenes.forEach((scene, index) => {
      scene.getAnimations().forEach(animation => animation.cancel());
      scene.hidden = index !== step;
      scene.classList.remove('is-leaving');
      scene.inert = false;
      scene.removeAttribute('aria-hidden');
    });
    views.forEach(panel => panel.getAnimations().forEach(animation => animation.cancel()));
    handoverPanel.getAnimations().forEach(animation => animation.cancel());
  });
  updateText();
}
