import { parse, parseFragment, serialize } from 'parse5';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ru } from '../translations.js';
import { contactCopy } from '../contact-copy.js';
import { renderCaseCards, renderCaseDialogs } from './cases.mjs';
import { buildLegal } from './legal.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const metadata = {
  ru: {
    title: 'Разработка сайтов под ключ | PopovWeb, Федор Попов',
    description: 'Создаю сайты для бизнеса: структура, дизайн и разработка на Framer, WordPress или с нуля. Лендинги, сайты компаний и интернет-магазины. SEO и Яндекс Директ.',
    imageAlt: 'PopovWeb. Дизайн и разработка сайтов. Федор Попов.',
  },
  en: {
    title: 'Web Design & Development | PopovWeb, Fedor Popov',
    description: 'Independent web designer and developer. Custom websites, landing pages and online stores built with Framer, WordPress or code. Work directly with Fedor Popov.',
    imageAlt: 'PopovWeb. Web design and development by Fedor Popov.',
  },
};
export function walk(node, visit) {
  visit(node);
  for (const child of [...(node.childNodes || [])]) walk(child, visit);
}
export const attr = (node, name) => node.attrs?.find(a => a.name === name)?.value;
export function setAttr(node, name, value) {
  const item = node.attrs.find(a => a.name === name);
  if (item) item.value = value;
  else node.attrs.push({ name, value });
}
function text(node, value) { node.childNodes = [{ nodeName: '#text', value, parentNode: node }]; }
function append(node, html) {
  const children = parseFragment(html).childNodes;
  for (const child of children) child.parentNode = node;
  node.childNodes.push(...children);
}
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

export function deployment(env = process.env) {
  const indexable = env.SITE_INDEXABLE === 'true';
  let base = '';
  if (env.SITE_URL) {
    const url = new URL(env.SITE_URL);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || ['localhost', '127.0.0.1'].includes(url.hostname)) {
      throw new Error('SITE_URL must be the final public HTTPS address, including its base path.');
    }
    base = url.href.replace(/\/?$/, '/');
  }
  if (indexable && !base) throw new Error('Set SITE_URL before opening indexing.');
  const endpoint = env.CONTACT_ENDPOINT || '/api/contact';
  if (!/^\/(?!\/)/.test(endpoint) && !/^https:\/\//.test(endpoint)) throw new Error('Invalid CONTACT_ENDPOINT');
  const basePath = env.SITE_BASE_PATH || '/';
  if (!/^\/(?!\/)[\w\-/]*\/$/.test(basePath) && basePath !== '/') throw new Error('Invalid SITE_BASE_PATH');
  return { base, basePath, indexable, endpoint, contactDisabled: env.CONTACT_DISABLED === 'true' };
}

export async function renderHome(locale, config = deployment({})) {
  if (!['ru', 'en'].includes(locale)) throw new Error('Unknown locale');
  let template = await readFile(resolve(root, 'pages/home.html'), 'utf8');
  template = template.replace('<!-- CASE_CARDS -->', renderCaseCards(locale)).replace('<!-- CASE_DIALOGS -->', renderCaseDialogs(locale));
  const document = parse(template, { scriptingEnabled: false });
  const meta = metadata[locale];
  const prefix = locale === 'en' ? '../' : './';
  const paths = { ru: '', en: 'en/' };
  const localUrls = { ru: prefix + paths.ru, en: prefix + paths.en };
  const urls = config.base ? { ru: config.base + paths.ru, en: config.base + paths.en } : localUrls;
  let head, body;
  walk(document, node => {
    if (!node.tagName) return;
    if (node.tagName === 'html') setAttr(node, 'lang', locale);
    if (node.tagName === 'head') head = node;
    if (node.tagName === 'body') body = node;
    if (node.tagName === 'title') text(node, meta.title);
    if (attr(node, 'name') === 'description') setAttr(node, 'content', meta.description);
    for (const [key, target] of [['data-i18n', null], ['data-i18n-alt', 'alt'], ['data-i18n-aria', 'aria-label']]) {
      const binding = attr(node, key);
      if (binding && locale === 'ru') {
        if (ru[binding] === undefined) throw new Error(`Missing Russian translation: ${binding}`);
        if (target) setAttr(node, target, ru[binding]); else text(node, ru[binding]);
      }
    }
    for (const key of [`data-${locale}`, `data-portfolio-${locale}`, 'data-contact-text']) {
      const value = attr(node, key);
      if (value !== undefined) text(node, key === 'data-contact-text' ? contactCopy[locale][value] : value);
    }
    for (const [key, target] of [[`data-aria-${locale}`, 'aria-label'], [`data-alt-${locale}`, 'alt']]) {
      if (attr(node, key)) setAttr(node, target, attr(node, key));
    }
    if (attr(node, 'data-contact-aria')) setAttr(node, 'aria-label', contactCopy[locale][attr(node, 'data-contact-aria')]);
    const id = attr(node, 'id');
    if (id === 'enquiry-name') setAttr(node, 'placeholder', contactCopy[locale].namePlaceholder);
    if (id === 'enquiry-message') setAttr(node, 'placeholder', contactCopy[locale].messagePlaceholder);
    if (id === 'enquiry-contact') setAttr(node, 'placeholder', 'username');
    if (id === 'contact-help') text(node, contactCopy[locale].telegramHelp);
    if (attr(node, 'class')?.split(' ').includes('theme-toggle')) setAttr(node, 'title', attr(node, 'aria-label'));
    if (node.tagName === 'form') {
      setAttr(node, 'action', config.endpoint);
      if (config.contactDisabled) setAttr(node, 'data-contact-disabled', 'true');
    }
    if (attr(node, 'data-document')) setAttr(node, 'href', `./documents/${attr(node, 'data-document')}-${locale}.html`);
    // Assets are relative to the project root, independent of domain or subdirectory.
    for (const name of ['src', 'href', 'data-case-src']) {
      const value = attr(node, name);
      if (value?.startsWith('./')) setAttr(node, name, prefix + value.slice(2));
    }
    if (attr(node, 'srcset')) setAttr(node, 'srcset', attr(node, 'srcset').replace(/(^|,\s*)\.\//g, `$1${prefix}`));
    if (attr(node, 'data-locale-switch') !== undefined) {
      const destination = locale === 'ru' ? 'en' : 'ru';
      setAttr(node, 'data-locale', destination);
      setAttr(node, 'hreflang', destination);
      setAttr(node, 'aria-label', locale === 'ru' ? 'Переключить на английский' : 'Switch to Russian');
    }
    const linkLocale = attr(node, 'data-locale');
    if (linkLocale) {
      setAttr(node, 'href', localUrls[linkLocale]);
      if (linkLocale === locale) setAttr(node, 'aria-current', 'page');
    }
  });
  const headTags = [
    `<meta name="robots" content="${config.indexable ? 'index, follow' : 'noindex, nofollow'}">`,
    ...['ru', 'en', 'x-default'].map(lang => `<link rel="alternate" hreflang="${lang}" href="${escape(urls[lang === 'x-default' ? 'ru' : lang])}">`),
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="PopovWeb">`,
    `<meta property="og:title" content="${escape(meta.title)}">`,
    `<meta property="og:description" content="${escape(meta.description)}">`,
    `<meta property="og:locale" content="${locale === 'ru' ? 'ru_RU' : 'en_GB'}">`,
    `<meta property="og:locale:alternate" content="${locale === 'ru' ? 'en_GB' : 'ru_RU'}">`,
    `<meta property="og:image" content="${escape(config.base || prefix)}assets/social-${locale}.png">`,
    '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${escape(meta.imageAlt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escape(meta.title)}">`,
    `<meta name="twitter:description" content="${escape(meta.description)}">`,
    `<meta name="twitter:image" content="${escape(config.base || prefix)}assets/social-${locale}.png">`,
    `<meta name="twitter:image:alt" content="${escape(meta.imageAlt)}">`,
  ];
  if (config.base) headTags.push(`<link rel="canonical" href="${escape(urls[locale])}">`, `<meta property="og:url" content="${escape(urls[locale])}">`);
  append(head, '\n' + headTags.join('\n') + '\n');
  // Set arrival state before paint. A watchdog reveals the page even if its modules fail.
  append(head, `<script>${await readFile(resolve(root, 'locale-boot.js'), 'utf8')}</script>`);
  const overlay = parseFragment(`<div class="locale-curtain" aria-hidden="true"><div class="locale-curtain-mark"><svg class="locale-cycle" viewBox="0 0 240 240"><path d="M42 78a88 88 0 0 1 156 0m-17-6 17 6 5-18M198 162a88 88 0 0 1-156 0m17 6-17-6-5 18"/></svg><div class="locale-curtain-label"><span data-locale-from>${locale === 'ru' ? 'EN' : 'RU'}</span><span data-locale-to>${locale.toUpperCase()}</span></div></div></div>`).childNodes[0];
  overlay.parentNode = body;
  body.childNodes.unshift(overlay);
  return '<!-- Generated by scripts/localize.mjs. Edit pages/home.html, then npm run build:pages. -->\n' + serialize(document);
}

export function sitemap(config) {
  if (!config.base || !config.indexable) return null;
  const paths = ['', 'en/'];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(path => `  <url><loc>${escape(config.base + path)}</loc></url>`).join('\n')}\n</urlset>\n`;
}
export function robots(config) {
  return config.indexable ? `User-agent: *\nAllow: /\nSitemap: ${config.base}sitemap.xml\n` : 'User-agent: *\nDisallow: /\n';
}

export async function buildPages(destination = root, config = deployment({})) {
  await buildLegal(destination);
  for (const [locale, file] of [['ru', 'index.html'], ['en', 'en/index.html']]) {
    const path = resolve(destination, file);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, await renderHome(locale, config));
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildPages();
  console.log('Generated local RU and EN pages. Indexing remains disabled.');
}
