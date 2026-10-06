import { readFileSync } from 'node:fs';
import { cases } from '../data/cases.mjs';

export { cases };
const optimized = JSON.parse(readFileSync(new URL('../data/optimized-images.json', import.meta.url), 'utf8'));
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7"/></svg>';
const factIcons = {
  format: '<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M12 16v5m-4 0h8"/>',
  platform: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
  city: '<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  audience: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2"/>',
};
const labels = {
  ru: { view: 'Смотреть кейс', close: 'Закрыть кейс', live: 'Посмотреть сайт', purpose: 'Задача', done: 'Что сделано', full: 'Исходный снимок страницы', open: 'Открыть изображение', archive: 'Веб-архив', notice: 'Показана версия проекта на момент моей работы. После передачи сайт мог быть изменён владельцем.', current: 'Снимки действующего сайта Royal Trees. Текущая версия могла быть изменена владельцем после передачи проекта.', original: 'Разрешение исходного снимка ограничено. Он сохранён без увеличения.' },
  en: { view: 'View case study', close: 'Close case study', live: 'Visit website', purpose: 'The task', done: 'What was done', full: 'Original page capture', open: 'Open image', archive: 'Web archive', notice: 'This shows the project as it was during my work. The owner may have changed the website after handover.', current: 'Images of the current Royal Trees website. The owner may have changed this version after handover.', original: 'The original capture has limited resolution. It is preserved without upscaling.' },
};
function optimizedImage(item, full, alt) {
  const assets = optimized.cases[item.slug];
  const asset = full ? assets.full : assets.card;
  const source = full ? `data-case-src="./${asset.file}" class="case-mockup-original" draggable="false"` : `src="./${asset.file}" srcset="./${assets.small.file} ${assets.small.width}w, ./${asset.file} ${asset.width}w" sizes="(max-width: 760px) 92vw, 48vw" loading="lazy"`;
  return `<img ${source} width="${asset.width}" height="${asset.height}" alt="${escape(alt)}" decoding="async">`;
}
function tags(copy) {
  return `<ul class="case-tags">${copy.modalFacts.map(([, label, value]) => `<li class="badge" aria-label="${escape(label)}: ${escape(value)}">${escape(value)}</li>`).join('')}</ul>`;
}
function preview(item, locale) {
  const ru = locale === 'ru';
  return `<section class="case-site-preview" aria-label="${ru ? 'Просмотр макета' : 'Website preview'}: ${escape(item.title)}">
    <div class="case-mockup-scroll" tabindex="0" role="region" aria-label="${escape(item.title)}: ${ru ? 'прокручиваемое изображение макета' : 'scrollable mockup image'}">
      ${optimizedImage(item, true, `${item.title}: ${ru ? 'полный макет' : 'full website mockup'}`)}
    </div>
  </section>`;
}
export function renderCaseCards(locale) {
  const l = labels[locale];
  return cases.map((item, index) => {
    const copy = item[locale];
    const trigger = `type="button" data-case-open="${item.slug}" aria-haspopup="dialog" aria-controls="case-${item.slug}" aria-label="${l.view}: ${escape(item.title)}"`;
    return `<article data-portfolio-category="sites" class="case-card panel project-hover ${item.preview && index % 2 ? 'case-card-reverse' : ''} ${item.preview ? '' : 'case-card-archive'}">
      <div class="case-card-copy">${tags(copy)}<h3>${escape(item.title)}</h3><p>${escape(copy.description)}</p><button class="case-link case-open" ${trigger}><span>${l.view}</span>${arrow}</button></div>
      ${item.preview ? `<button class="case-preview" ${trigger} tabindex="-1">${optimizedImage(item, false, '')}</button>` : `<a class="case-link case-archive-link" href="${item.archiveUrl}" target="_blank" rel="noopener noreferrer">${locale === 'ru' ? 'Открыть архив сайта' : 'Open website archive'}${arrow}</a>`}
    </article>`;
  }).join('\n');
}
export function renderCaseDialogs(locale) {
  const l = labels[locale];
  return cases.map(item => {
    const copy = item[locale];
    return `<dialog id="case-${item.slug}" class="case-dialog" aria-labelledby="case-${item.slug}-title">
      <header class="case-dialog-header">
        <div class="case-dialog-heading"><h2 id="case-${item.slug}-title" tabindex="-1" data-case-heading>${escape(item.title)}</h2></div>
        <div class="case-dialog-actions">${item.live ? `<a class="case-link case-live" href="${item.live}" target="_blank" rel="noopener noreferrer">${l.live}${arrow}</a>` : ''}<button type="button" class="case-close" data-case-close aria-label="${l.close}" autofocus><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
      </header>
      <div class="case-dialog-content">
        ${preview(item, locale)}
        <dl class="case-facts">${copy.modalFacts.map(([icon, label, value]) => `<div class="case-fact"><dt><svg viewBox="0 0 24 24" aria-hidden="true">${factIcons[icon]}</svg>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>
        <div class="case-summary"><p>${escape(copy.description)}</p></div>
      </div>
    </dialog>`;
  }).join('\n').replace(/[\t ]+\n/g, '\n');
}
