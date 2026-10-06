import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { parse } from 'parse5';
import { cases } from '../scripts/cases.mjs';
import { renderHome, deployment, walk, attr, root, sitemap } from '../scripts/localize.mjs';

function nodes(html) { const result=[]; walk(typeof html === 'string' ? parse(html) : html, node=>result.push(node)); return result; }
const config=deployment({SITE_URL:'https://example.com/popovweb/',SITE_INDEXABLE:'true'});
test('all cases open as labelled dialogs with valid assets in both locales and a project subpath',async()=>{
  for(const locale of ['ru','en']) {
    const elements=nodes(await renderHome(locale,config));
    const current=new URL(locale==='en'?'en/':'',config.base);
    const dialogs=elements.filter(n=>n.tagName==='dialog');
    assert.equal(dialogs.length,cases.length);
    assert.equal(elements.filter(n=>n.tagName==='h1').length,1);
    const ids=elements.map(n=>attr(n,'id')).filter(Boolean);
    assert.equal(new Set(ids).size,ids.length,'IDs must be unique');
    for(const item of cases) {
      const dialog=dialogs.find(n=>attr(n,'id')===`case-${item.slug}`);
      const children=nodes(dialog);
      const title=children.find(n=>attr(n,'id')===attr(dialog,'aria-labelledby'));
      assert.equal(title.childNodes[0].value,item.title);
      assert.ok(children.some(n=>n.tagName==='button'&&attr(n,'data-case-close')!==undefined&&attr(n,'aria-label')));
      assert.equal(children.filter(n=>n.tagName==='a'&&attr(n,'class')?.includes('case-live')).length,item.live?1:0);
      const triggers=elements.filter(n=>attr(n,'data-case-open')===item.slug);
      assert.equal(triggers.length,item.preview?2:1);
      for(const trigger of triggers) {
        assert.equal(trigger.tagName,'button');
        assert.equal(attr(trigger,'aria-controls'),attr(dialog,'id'));
        assert.equal(attr(trigger,'aria-haspopup'),'dialog');
      }
    }
    for(const element of elements) for(const key of ['href','src','data-case-src']) {
      const value=attr(element,key);
      if(!value||(!value.startsWith('./')&&!value.startsWith('../'))) continue;
      const url=new URL(value,current);
      assert.ok(url.pathname.startsWith('/popovweb/'),`Escaped project path: ${url}`);
      const localPath=url.pathname.slice('/popovweb/'.length);
      assert.doesNotMatch(localPath,/^(en\/)?cases\//,'No links to deleted case pages');
      await access(resolve(root,localPath.endsWith('/')?localPath+'index.html':localPath));
    }
  }
});
test('portfolio keeps the four websites and Framer template without promotion',async()=>{
  const elements=nodes(await renderHome('ru'));
  const projects=elements.filter(n=>attr(n,'data-portfolio-category')==='sites');
  assert.deepEqual(projects.map(project=>nodes(project).find(n=>n.tagName==='h3').childNodes[0].value),cases.map(item=>item.title));
  assert.deepEqual(elements.filter(n=>attr(n,'data-portfolio-tab')).map(n=>attr(n,'data-portfolio-tab')),['sites','templates']);
  const template=elements.find(n=>attr(n,'data-portfolio-category')==='templates');
  assert.equal(attr(template,'id'),'templates');
  const source=await readFile(resolve(root,'pages/home.html'),'utf8');
  assert.match(source,/https:\/\/cute-plans-049750\.framer\.app\//);
  assert.equal(elements.some(n=>attr(n,'data-portfolio-category')==='promotion'),false);
});
test('case pages are removed and no longer listed in the sitemap',async()=>{
  assert.doesNotMatch(sitemap(config),/\/cases\//);
  assert.equal((sitemap(config).match(/<loc>/g)||[]).length,2);
  for(const item of cases) for(const locale of ['','en/']) {
    await assert.rejects(access(resolve(root,`${locale}cases/${item.slug}.html`)),{code:'ENOENT'});
  }
});
test('cards repeat the case facts as badges; dialogs omit redundant labels and role',async()=>{
  for(const locale of ['ru','en']) {
    const elements=nodes(await renderHome(locale));
    const projects=elements.filter(n=>attr(n,'data-portfolio-category')==='sites');
    for(const [index, project] of projects.entries()) {
      const children=nodes(project);
      const badges=children.filter(n=>n.tagName==='li'&&attr(n,'class')==='badge').map(n=>n.childNodes[0].value);
      assert.deepEqual(badges,cases[index][locale].modalFacts.map(([, , value])=>value));
      assert.equal(children.filter(n=>attr(n,'class')==='case-tags').length,1);
      assert.equal(children.filter(n=>attr(n,'class')==='case-media-note').length,0);
      assert.equal(children.filter(n=>n.tagName==='span'&&attr(n,'class')==='badge').length,0);
      const dialog=elements.find(n=>attr(n,'id')===`case-${cases[index].slug}`);
      const detail=nodes(dialog);
      assert.equal(detail.filter(n=>['case-tags','case-media-note'].includes(attr(n,'class'))).length,0);
      assert.equal(cases[index][locale].modalFacts.some(([key])=>key==='role'),false);
      assert.ok(cases[index][locale].modalFacts.some(([key])=>key==='format'));
      const heading=detail.find(n=>attr(n,'class')==='case-dialog-heading');
      assert.equal(nodes(heading).filter(n=>n.tagName==='p').length,0);
    }
  }
});
test('every case uses the same scrolling image at all viewport sizes, without interactive site embeds',async()=>{
  for(const locale of ['ru','en']) {
    const elements=nodes(await renderHome(locale));
    for(const item of cases) {
      const dialog=elements.find(n=>attr(n,'id')===`case-${item.slug}`);
      const children=nodes(dialog);
      assert.equal(children.filter(n=>n.tagName==='iframe').length,0);
      const viewport=children.find(n=>attr(n,'class')==='case-mockup-scroll');
      assert.equal(attr(viewport,'tabindex'),'0');
      assert.ok(attr(viewport,'aria-label').includes(item.title));
      const content=nodes(viewport);
      assert.equal(content.some(n=>['a','button','input','form','iframe','canvas'].includes(n.tagName)),false);
      const pictures=content.filter(n=>n.tagName==='img');
      assert.equal(pictures.length,1);
      for(const picture of pictures) {
        assert.equal(attr(picture,'src'),undefined,'Full images must not download before the dialog opens');
        assert.ok(attr(picture,'data-case-src').endsWith(`/${item.slug}-full.webp`));
        assert.equal(attr(picture,'draggable'),'false');
        assert.equal(attr(picture,'class'),'case-mockup-original');
        assert.ok(Number(attr(picture,'height'))>Number(attr(picture,'width'))*2);
      }
      assert.equal(children.some(n=>attr(n,'data-gallery-index')!==undefined),false);
      assert.equal(children.filter(n=>n.tagName==='a'&&/assets\/cases/.test(attr(n,'href')||'')).length,0);
    }
  }
});

test('original PNG files keep their recorded dimensions and content hashes',async()=>{
  const originals=JSON.parse(await readFile(resolve(root,'data/case-originals.json'),'utf8'));
  const upscales=JSON.parse(await readFile(resolve(root,'data/case-upscales.json'),'utf8'));
  const rebuilds=JSON.parse(await readFile(resolve(root,'data/case-rebuilds.json'),'utf8'));
  for(const item of cases) {
    const original=originals[item.slug];
    const upscale=upscales[item.slug];
    const rebuild=rebuilds[item.slug];
    assert.equal(item.mockup,rebuild?.file||upscale?.file||original.file);
    assert.equal(item.preview,item.mockup,'Card and dialog must show the same design');
    const data=await readFile(resolve(root,`assets/cases/${item.slug}/${original.file}`));
    assert.equal(data.subarray(1,4).toString(),'PNG');
    assert.equal(data.readUInt32BE(16),original.width);
    assert.equal(data.readUInt32BE(20),original.height);
    assert.equal(createHash('sha256').update(data).digest('hex'),original.sha256);
    if(rebuild) {
      const adapted=await readFile(resolve(root,`assets/cases/${item.slug}/${rebuild.file}`));
      assert.equal(adapted.readUInt32BE(16),rebuild.width);
      assert.equal(adapted.readUInt32BE(20),rebuild.height);
      assert.equal(createHash('sha256').update(adapted).digest('hex'),rebuild.sha256);
    }
    if(upscale) {
      assert.equal(upscale.sourceSha256,original.sha256);
      assert.equal(upscale.width,original.width*upscale.scale);
      assert.equal(upscale.height,original.height*upscale.scale);
      const restored=await readFile(resolve(root,`assets/cases/${item.slug}/${upscale.file}`));
      assert.equal(restored.readUInt32BE(16),upscale.width);
      assert.equal(restored.readUInt32BE(20),upscale.height);
      assert.equal(createHash('sha256').update(restored).digest('hex'),upscale.sha256);
    }
  }
});

test('optimized full mockups preserve source dimensions and cards use smaller responsive images',async()=>{
  const images=JSON.parse(await readFile(resolve(root,'data/optimized-images.json'),'utf8'));
  for (const item of cases) {
    const delivery=images.cases[item.slug];
    const original=await sharp(resolve(root,`assets/cases/${item.slug}/${item.mockup}`)).metadata();
    const full=await sharp(resolve(root,delivery.full.file)).metadata();
    assert.deepEqual([full.width,full.height],[original.width,original.height]);
    assert.ok(delivery.full.bytes<delivery.full.sourceBytes/2);
    assert.ok(delivery.card.bytes<250000);
    assert.ok(delivery.small.bytes<delivery.card.bytes);
  }
  for(const locale of ['ru','en']) {
    const elements=nodes(await renderHome(locale));
    const cards=elements.filter(n=>n.tagName==='img'&&attr(n,'src')?.includes('-card.webp'));
    assert.equal(cards.length,4);
    for(const card of cards) {
      assert.equal(attr(card,'loading'),'lazy');
      for(const candidate of attr(card,'srcset').split(',')) {
        const path=candidate.trim().split(' ')[0];
        assert.ok(path.startsWith(locale==='ru'?'./':'../'));
        await access(resolve(root,path.replace(/^\.\.?\//,'')));
      }
    }
  }
});
