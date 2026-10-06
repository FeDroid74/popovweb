import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parse } from 'parse5';
const html = await readFile('design/case-restoration/royal-live.html','utf8');
const tree = parse(html), urls = new Set();
function walk(n) {
  for (const a of n.attrs || []) if (a.name === 'data-original' || a.name === 'src' || a.name === 'style') {
    for (const url of a.value.matchAll(/https:\/\/static\.tildacdn\.com\/[^\s'";)]+/g)) urls.add(url[0]);
  }
  for (const c of n.childNodes || []) walk(c);
}
walk(tree);
const selected = [...urls].filter(u => /noroot|_22-10-2024|photo_531|svg_176060|1644087447|\/1\.webp/.test(u));
const dest='assets/cases/royal-trees/files';await mkdir(dest,{recursive:true});
const log=[];
for (let i=0;i<selected.length;i+=3) await Promise.all(selected.slice(i,i+3).map(async (url,j)=>{
 const file=`asset-${i+j}.${url.split('.').at(-1)}`;
 const r=await fetch(url,{signal:AbortSignal.timeout(30000)}); if(!r.ok)throw new Error(`${r.status} ${url}`);
 await writeFile(`${dest}/${file}`,Buffer.from(await r.arrayBuffer())); log.push({url,file});
}));
await writeFile('design/case-restoration/royal-assets.json',JSON.stringify(log,null,2));
console.log(log);
