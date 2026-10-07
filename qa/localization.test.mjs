import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from 'parse5';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { renderHome, deployment, sitemap, robots, walk, attr, root } from '../scripts/localize.mjs';
import { render404 } from '../scripts/not-found.mjs';

function elements(html) {
  const nodes = [];
  walk(parse(html, { scriptingEnabled: false }), node => { nodes.push(node); });
  return nodes;
}
const local = deployment({});

test('every published entry point uses the accessible PopovWeb VW wordmark', async () => {
  const pages = [await renderHome('ru', local), await renderHome('en', local)];
  for (const file of ['v2.html', 'v3.html']) pages.push(await readFile(resolve(root, file), 'utf8'));
  for (const html of pages) {
    const nodes = elements(html);
    const brand = nodes.find(n => attr(n, 'class')?.split(' ').includes('brand'));
    assert.ok(attr(brand, 'class').includes('brand-wordmark'));
    assert.ok(brand.childNodes.some(n => n.tagName === 'a' && attr(n, 'aria-label') === 'PopovWeb'));
    assert.ok(nodes.some(n => n.tagName === 'svg' && attr(n, 'class') === 'brand-logo'));
    assert.ok(!nodes.some(n => attr(n, 'class') === 'logo-globe'));
    assert.ok(nodes.some(n => attr(n, 'href')?.includes('studio.css?v=vw-2')));
    assert.ok(nodes.some(n => attr(n, 'rel') === 'icon' && attr(n, 'href')?.includes('favicon.svg?v=vw-1')));
  }
});

test('RU and EN contain their complete content before any JavaScript executes', async () => {
  for (const locale of ['ru', 'en']) {
    const nodes = elements(await renderHome(locale, local));
    assert.equal(attr(nodes.find(n => n.tagName === 'html'), 'lang'), locale);
    assert.equal(nodes.filter(n => n.tagName === 'h1').length, 1);
    const text = nodes.filter(n => n.nodeName === '#text' && !['script', 'style'].includes(n.parentNode?.tagName)).map(n => n.value).join(' ');
    if (locale === 'en') assert.doesNotMatch(text, /[А-Яа-яЁё]/);
    else { assert.match(text, /Сайты, которые/); assert.doesNotMatch(text, /Have something in mind|Your name|Websites that|Send enquiry/); }
    assert.match(text, locale === 'ru' ? /Ваше имя/ : /Your name/);
    assert.equal(attr(nodes.find(n => attr(n, 'name') === 'robots'), 'content'), 'noindex, nofollow');
    assert.equal(nodes.filter(n => attr(n, 'rel') === 'canonical').length, 0);
    const submit = nodes.find(n => attr(n, 'class') === 'button form-submit');
    const uses = []; walk(submit, n => { if (n.tagName === 'use') uses.push(attr(n, 'href')); });
    assert.deepEqual(uses, ['#arrow-up-right']);
  }
});

test('language links, social links, anchors, and assets work from a nested hosting path', async () => {
  for (const locale of ['ru', 'en']) {
    const nodes = elements(await renderHome(locale, local));
    const current = new URL(locale === 'ru' ? 'https://host.test/popovweb/' : 'https://host.test/popovweb/en/');
    const ids = new Set(nodes.map(n => attr(n, 'id')).filter(Boolean));
    const switches = nodes.filter(n => attr(n, 'data-locale-switch') !== undefined);
    assert.equal(switches.length, 1);
    assert.equal(switches[0].tagName, 'a');
    assert.equal(attr(switches[0], 'data-locale'), locale === 'ru' ? 'en' : 'ru');
    assert.equal(attr(switches[0], 'hreflang'), locale === 'ru' ? 'en' : 'ru');
    assert.ok(attr(switches[0], 'aria-label'));
    for (const node of nodes) {
      const lang = attr(node, 'data-locale');
      if (lang) assert.equal(new URL(attr(node, 'href'), current).pathname, `/popovweb/${lang === 'en' ? 'en/' : ''}`);
      for (const key of ['src', 'href']) {
        const value = attr(node, key);
        if (value?.startsWith('#')) assert.ok(ids.has(value.slice(1)), `Missing anchor ${value}`);
        if (value?.startsWith('./') || value?.startsWith('../')) {
          const url = new URL(value, current);
          assert.ok(url.pathname.startsWith('/popovweb/'));
          if (!url.pathname.endsWith('/')) await access(resolve(root, url.pathname.slice('/popovweb/'.length)));
        }
      }
    }
    assert.equal(attr(nodes.find(n => attr(n, 'data-contact-link') === 'telegram'), 'href'), 'https://t.me/FeDroid74');
  }
});

test('production metadata uses only the configured domain, with reciprocal locales and self canonicals', async () => {
  const config = deployment({ SITE_URL: 'https://portfolio.example/studio', SITE_INDEXABLE: 'true' });
  for (const locale of ['ru', 'en']) {
    const nodes = elements(await renderHome(locale, config));
    const expected = config.base + (locale === 'en' ? 'en/' : '');
    assert.equal(attr(nodes.find(n => attr(n, 'rel') === 'canonical'), 'href'), expected);
    assert.equal(attr(nodes.find(n => attr(n, 'property') === 'og:url'), 'content'), expected);
    assert.equal(attr(nodes.find(n => attr(n, 'property') === 'og:image'), 'content'), `${config.base}assets/social-${locale}.png`);
    const alternatives = nodes.filter(n => attr(n, 'rel') === 'alternate');
    assert.deepEqual(alternatives.map(n => [attr(n, 'hreflang'), attr(n, 'href')]), [ ['ru', config.base], ['en', config.base + 'en/'], ['x-default', config.base] ]);
  }
  assert.match(sitemap(config), /https:\/\/portfolio\.example\/studio\/en\//);
  assert.doesNotMatch(sitemap(config), /github|localhost|v2|v3/);
  assert.match(robots(config), /Allow: \/\nSitemap: https:\/\/portfolio\.example\/studio\/sitemap.xml/);
});

test('preview builds stay closed; indexing cannot be enabled without a real HTTPS base', () => {
  assert.equal(sitemap(local), null);
  assert.equal(robots(local), 'User-agent: *\nDisallow: /\n');
  assert.throws(() => deployment({ SITE_INDEXABLE: 'true' }));
  for (const SITE_URL of ['http://example.com', 'https://localhost', 'https://example.com/?a=b']) assert.throws(() => deployment({ SITE_URL }));
  assert.throws(() => deployment({ CONTACT_ENDPOINT: '//evil.example' }));
  assert.throws(() => deployment({ SITE_BASE_PATH: '//evil.example/' }));
  assert.match(render404(deployment({ SITE_BASE_PATH: '/popovweb/' })), /href="\/popovweb\/en\/"/);
  assert.match(render404(), /noindex, follow/);
});

test('arrival boot consumes only a fresh transfer for the exact destination; direct visits stay uncovered', async () => {
  const source = await readFile(resolve(root, 'locale-boot.js'), 'utf8');
  for (const [target, at, animate, valid] of [['/en/', Date.now(), true, true], ['/other/', Date.now(), true, false], ['/en/', 1, true, false], ['/en/', Date.now(), false, true]]) {
    const classes = new Set(); let removed = false;
    const context = { window: {}, location: { pathname: '/en/' }, document: { documentElement: { classList: { add: x => classes.add(x), remove: x => classes.delete(x) } } }, sessionStorage: { getItem: () => JSON.stringify({ target, at, animate }), removeItem: () => { removed = true; } }, matchMedia: () => ({ matches: false }), setTimeout: () => {} };
    runInNewContext(source, context);
    assert.equal(Boolean(context.window.popovLocaleTransfer), valid);
    assert.equal(classes.has('locale-arriving'), valid && animate);
    assert.ok(removed);
  }
});
