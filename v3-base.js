import { initStudio } from './studio.js';
import { ru } from './translations.js';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const theme = document.querySelector('.theme-toggle');
const language = document.querySelector('.language-toggle');
const menu = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
const translated = [...document.querySelectorAll('[data-ru][data-en]')];
const localAttributes = [...document.querySelectorAll('[data-local-alt],[data-local-aria]')].map(el => {
  const attribute = el.hasAttribute('data-local-alt') ? 'alt' : 'aria-label';
  return { el, attribute, en: el.getAttribute(attribute), key: el.dataset.localAlt || el.dataset.localAria };
});
const label = (ru, en) => root.lang === 'ru' ? ru : en;
const persist = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Local preferences are optional. */ } };
const works = {
  velora: {
    name: 'VELORA', desktop: './assets/velora-desktop.jpg', mobile: './assets/velora-phone.jpg',
    kind: ['Авторский шаблон · Framer', 'Original template · Framer'],
    intro: ['Сайт модного бренда, где вещи и фотографии говорят первыми.', 'A fashion website that gives clothes and photography the leading role.'],
    task: ['Представить коллекцию и привести посетителя к записи на примерку.', 'Present the collection and guide visitors towards booking an appointment.'],
    solution: ['Крупная фотография, типографика с характером и короткий путь к заявке.', 'Large photography, expressive typography, and a short path to an enquiry.'],
    note: ['Шаблон в подготовке к запуску.', 'Template in preparation for release.'],
    link: 'https://cute-plans-049750.framer.app/'
  },
  stilla: {
    name: 'STILLA', desktop: './assets/stitch-stilla.webp',
    kind: ['Самостоятельная концепция · Архитектура', 'Independent concept · Architecture'],
    intro: ['Архитектурное бюро. Внимание к пространству и самим проектам.', 'An architecture practice. Space and the projects themselves take centre stage.'],
    task: ['Показать характер архитектурного бюро через его работы.', 'Express an architecture practice’s identity through its work.'],
    solution: ['Спокойная сетка, крупные фотографии зданий и простая навигация.', 'A restrained grid, large architectural photographs, and simple navigation.'],
    note: ['Дизайн-концепция. Не клиентский проект.', 'Design concept, not a commissioned project.'],
    link: './assets/stitch-stilla.webp'
  },
  luma: {
    name: 'LUMA', desktop: './assets/stitch-luma.webp',
    kind: ['Самостоятельная концепция · Фотография', 'Independent concept · Photography'],
    intro: ['Портфолио фотостудии с акцентом на портреты.', 'A photography studio portfolio built around portraits.'],
    task: ['Дать посетителю оценить стиль фотографа по самим снимкам.', 'Let visitors understand the photographer’s style through the images.'],
    solution: ['Монохромные фотографии, контраст масштаба и минимум отвлекающих деталей.', 'Monochrome photography, contrasting scale, and few distractions.'],
    note: ['Дизайн-концепция. Не клиентский проект.', 'Design concept, not a commissioned project.'],
    link: './assets/stitch-luma.webp'
  }
};
let selectedWork = 'velora', selectedDevice = 'desktop';
const preview = document.querySelector('.work-preview');
const workImage = document.querySelector('#work-image');
const deviceGroup = document.querySelector('.device-switch');
function renderWork() {
  const work = works[selectedWork];
  const mobile = Boolean(work.mobile) && selectedDevice === 'mobile';
  preview.dataset.device = mobile ? 'mobile' : 'desktop';
  preview.dataset.work = selectedWork;
  const source = mobile ? work.mobile : work.desktop;
  if (workImage.getAttribute('src') !== source) workImage.src = source;
  workImage.alt = `${work.name} · ${label(mobile ? 'мобильный макет' : 'макет сайта', mobile ? 'mobile layout' : 'website layout')}`;
  document.querySelector('#work-name').textContent = work.name;
  for (const key of ['kind','intro','task','solution']) document.querySelector(`#work-${key}`).textContent = label(...work[key]);
  document.querySelector('#work-disclaimer').textContent = label(...work.note);
  const link = document.querySelector('#work-link');
  link.href = work.link;
  link.querySelector('span').textContent = selectedWork === 'velora' ? label('Открыть сайт','Open website') : label('Открыть макет','Open design');
  deviceGroup.hidden = !work.mobile;
  deviceGroup.setAttribute('aria-label', label('Размер экрана','Screen size'));
  document.querySelector('#preview-label').textContent = selectedWork === 'velora' ? label('Макет первого экрана','Homepage preview') : label('Дизайн-концепция','Design concept');
  deviceGroup.querySelectorAll('button').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.device === (mobile ? 'mobile' : 'desktop')));
    button.setAttribute('aria-label', label(button.dataset.device === 'mobile' ? 'Телефон' : 'Компьютер', button.dataset.device === 'mobile' ? 'Mobile' : 'Desktop'));
  });
}
function updateControls() {
  const isLight = root.dataset.theme === 'light';
  theme.setAttribute('aria-label', isLight ? label('Включить тёмную тему','Switch to dark theme') : label('Включить светлую тему','Switch to light theme'));
  theme.title = theme.getAttribute('aria-label');
  theme.setAttribute('aria-pressed', String(isLight));
  language.setAttribute('aria-label', label('Switch to English','Переключить на русский'));
  language.title = language.getAttribute('aria-label');
  menu.setAttribute('aria-label', mobileNav.hidden ? label('Открыть меню','Open menu') : label('Закрыть меню','Close menu'));
  document.querySelector('meta[name=theme-color]').content = isLight ? '#f5f5f2' : '#1b1c1a';
}
function setLanguage(lang) {
  root.lang = lang === 'en' ? 'en' : 'ru';
  translated.forEach(el => { el.textContent = root.lang === 'ru' ? el.dataset.ru : el.dataset.en; });
  localAttributes.forEach(({ el, attribute, en, key }) => el.setAttribute(attribute, root.lang === 'ru' ? (ru[key] || en) : en));
  document.title = label('PopovWeb — сайты для бизнеса · Новая версия','PopovWeb — websites for business · New edition');
  document.querySelector('meta[name=description]').content = label('Федор Попов. Дизайн и разработка сайтов под ключ. Лендинги, сайты компаний, каталоги и интернет-магазины.', 'Fedor Popov. Website design and development. Landing pages, company websites, catalogs, and online stores.');
  document.querySelector('.format-tabs').setAttribute('aria-label', label('Задача сайта','Website goal'));
  document.querySelector('.work-tabs').setAttribute('aria-label', label('Работы','Selected work'));
  document.querySelector('.next-portrait figcaption>span:last-child').textContent = label('& разработчик','& developer');
  document.querySelector('.next-portrait img').alt = label('Федор Попов','Fedor Popov');
  updateControls(); renderWork(); persist('popovweb-lang',root.lang);
  root.dispatchEvent(new Event('popovweb:language'));
}
setLanguage(root.lang);
language.addEventListener('click',()=>setLanguage(root.lang==='ru'?'en':'ru'));
theme.addEventListener('click',()=>{
  root.dataset.theme = root.dataset.theme==='light'?'dark':'light';
  persist('popovweb-theme',root.dataset.theme); updateControls();
});
function setMenu(open, focus = false) {
  mobileNav.hidden = !open;
  menu.setAttribute('aria-expanded', String(open));
  updateControls();
  if (focus) menu.focus();
}
menu.addEventListener('click',()=>setMenu(mobileNav.hidden));
mobileNav.addEventListener('click',event=>{if(event.target.closest('a'))setMenu(false);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!mobileNav.hidden)setMenu(false,true);});
document.addEventListener('pointerdown',event=>{if(!mobileNav.hidden&&!event.target.closest('.site-header'))setMenu(false);});
matchMedia('(min-width: 801px)').addEventListener('change',event=>{if(event.matches)setMenu(false);});

function enhanceTabs(container, select) {
  const tabs = [...container.querySelectorAll('[role=tab]')];
  const activate = tab => {
    tabs.forEach(item=>{const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;});
    select(tab);
  };
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>activate(tab));
    tab.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
      event.preventDefault();
      const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+tabs.length)%tabs.length;
      activate(tabs[next]); tabs[next].focus();
    });
  });
}
enhanceTabs(document.querySelector('.format-tabs'),tab=>{
  document.querySelectorAll('.format-panel').forEach(panel=>{panel.hidden=panel.id!==tab.getAttribute('aria-controls');});
  const panel=document.getElementById(tab.getAttribute('aria-controls'));
  if(!reduced.matches)panel.animate([{opacity:.4,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:220,easing:'ease-out'});
});
enhanceTabs(document.querySelector('.work-tabs'),tab=>{
  selectedWork=tab.dataset.work; selectedDevice='desktop';
  document.querySelector('#work-panel').setAttribute('aria-labelledby',tab.id);
  renderWork();
});
deviceGroup.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{selectedDevice=button.dataset.device;renderWork();}));

const readyPanel=document.querySelector('#ready-panel');
const readyTabs=[...document.querySelectorAll('[data-ready]')];
const readyDeviceButtons=[...document.querySelectorAll('[data-ready-device]')].filter(node=>node.tagName==='BUTTON');
const readyHeadline=document.querySelector('[data-demo-headline]');
const readyHeadlineInput=document.querySelector('#ready-edit-title');
const readyForm=document.querySelector('.ready-example-form');
const readyStatus=document.querySelector('.ready-demo-status');
let readyMode='responsive',headlineEdited=false;
const readyCopy={
  ru:{
    responsive:['Один сайт — оба экрана','Переключите компьютер и телефон. Макет меняет ширину, сохраняя читаемость и порядок элементов.'],
    enquiry:['Форма обращения','Нажмите «Показать отправку»: это локальная демонстрация, она не передаёт ваши данные.'],
    editing:['Текст под вашим контролем','Измените пример заголовка. Редактор для ваших материалов настраивается отдельно под согласованный формат сайта.'],
    handover:['Сайт и материалы после запуска','Доступы, подготовленные файлы и инструкция по согласованному редактированию. Итоговый список фиксируем до старта.'],
    headline:'Свет, который меняет комнату',namePlaceholder:'Например, Анна',contactPlaceholder:'Телефон или почта',status:'Демонстрация завершена: данные никуда не отправлены.',desktop:'Компьютер',mobile:'Телефон',deviceGroup:'Размер экрана'
  },
  en:{
    responsive:['One website, two screens','Switch between desktop and mobile. The layout changes width while keeping its content clear and in order.'],
    enquiry:['An enquiry form','Select “Preview submission”. This local demo does not transmit any information.'],
    editing:['Content you can update','Edit the sample headline. An editor for your content is configured to match the agreed website scope.'],
    handover:['Your website and files after launch','Access, prepared files, and guidance for the agreed editing tools. We confirm the handover list before work begins.'],
    headline:'Light that shapes a room',namePlaceholder:'For example, Anna',contactPlaceholder:'Phone or email',status:'Demo complete: no information was sent.',desktop:'Desktop',mobile:'Mobile',deviceGroup:'Screen size'
  }
};
function updateReadyCopy(){
  const copy=readyCopy[root.lang==='ru'?'ru':'en'];
  document.querySelector('.ready-choices').setAttribute('aria-label',label('Что можно проверить в примере','What you can explore in this example'));
  document.querySelector('[data-ready-title]').textContent=copy[readyMode][0];
  document.querySelector('[data-ready-description]').textContent=copy[readyMode][1];
  if(!headlineEdited){readyHeadlineInput.value=copy.headline;readyHeadline.textContent=copy.headline;}
  document.querySelector('#ready-demo-name').placeholder=copy.namePlaceholder;
  document.querySelector('#ready-demo-contact').placeholder=copy.contactPlaceholder;
  document.querySelector('.ready-device-switch').setAttribute('aria-label',copy.deviceGroup);
  readyDeviceButtons.forEach(button=>button.setAttribute('aria-label',copy[button.dataset.readyDevice]));
}
function selectReady(tab,focus=false){
  readyMode=tab.dataset.ready;
  readyTabs.forEach(item=>{const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;});
  readyPanel.setAttribute('aria-labelledby',tab.id);
  readyPanel.dataset.readyMode=readyMode;
  readyDeviceButtons.forEach(button=>button.closest('.ready-device-switch').hidden=readyMode!=='responsive');
  readyForm.hidden=readyMode!=='enquiry';
  document.querySelector('.ready-edit-control').hidden=readyMode!=='editing';
  document.querySelector('.ready-handover').hidden=readyMode!=='handover';
  readyStatus.hidden=true;
  updateReadyCopy();
  if(focus)tab.focus();
  if(!reduced.matches)readyPanel.animate([{opacity:.55,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:220,easing:'ease-out'});
}
readyTabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>selectReady(tab));
  tab.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?readyTabs.length-1:(index+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+readyTabs.length)%readyTabs.length;
    selectReady(readyTabs[next],true);
  });
});
readyDeviceButtons.forEach(button=>button.addEventListener('click',()=>{
  document.querySelector('.ready-site').dataset.readyDevice=button.dataset.readyDevice;
  readyDeviceButtons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
}));
document.querySelector('.ready-demo-cta').addEventListener('click',()=>selectReady(readyTabs.find(tab=>tab.dataset.ready==='enquiry')));
readyHeadlineInput.addEventListener('input',()=>{headlineEdited=true;readyHeadline.textContent=readyHeadlineInput.value||readyCopy[root.lang==='ru'?'ru':'en'].headline;});
readyForm.addEventListener('submit',event=>{
  event.preventDefault();
  readyStatus.textContent=readyCopy[root.lang==='ru'?'ru':'en'].status;
  readyStatus.hidden=false;
});
root.addEventListener('popovweb:language',updateReadyCopy);
selectReady(readyTabs[0]);

// Preserve the approved inertial globe, orbit filtering, Radix tooltips, and plan transfer.
initStudio();
