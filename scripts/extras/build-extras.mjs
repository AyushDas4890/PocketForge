import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { loadBook } from '../lib/book.mjs';
// usage: node scripts/extras/build-extras.mjs projects/<slug>  -> output/mockup.png, listing-1..3.png
const P = path.resolve(process.argv[2] || '');
if (!fs.existsSync(path.join(P, 'manuscript'))) { console.error('usage: build-extras.mjs projects/<slug>'); process.exit(2); }
const book = loadBook(P);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const L = book.listing;
const u = p => pathToFileURL(path.join(P, p)).href;
const css = `@import url('https://fonts.googleapis.com/css2?family=Merriweather+Sans:wght@700;800&family=Source+Sans+3:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0}body{width:2000px;height:1600px;overflow:hidden;font-family:'Source Sans 3','Segoe UI',Arial,sans-serif;color:#233046;position:relative}
h1,h2,h3,.h{font-family:'Merriweather Sans','Segoe UI',Arial,sans-serif;font-weight:800}
.cream{background:#FFF8EC}.teal{color:#2F7F79}`;
const chapters = fs.readdirSync(path.join(P, 'manuscript')).filter((f) => /^ch\d+\.md$/.test(f)).sort()
  .map((f) => fs.readFileSync(path.join(P, 'manuscript', f), 'utf8').split(/\r?\n/)[0].trim().replace(/^#\s+(Chapter\s+\d+:\s*)?/, ''));
const pages = {
'mockup': `<style>${css}body{background:linear-gradient(135deg,#FFF8EC,#F2C57C 140%)}
.tab{position:absolute;left:572px;top:140px;width:855px;height:1320px;background:#233046;border-radius:70px;box-shadow:0 50px 90px rgba(35,48,70,.35)}
.scr{position:absolute;left:612px;top:180px;width:775px;height:1240px;border-radius:30px;overflow:hidden;background:#fff}
.scr img{width:100%;height:100%;object-fit:cover}.cam{position:absolute;left:984px;top:152px;width:32px;height:16px;border-radius:8px;background:#3b4a63}</style>
<div class="tab"></div><div class="cam"></div><div class="scr"><img src="${u('output/cover.png')}"></div>`,
'listing-1': `<style>${css}body{background:#FFF8EC}
.cv{position:absolute;left:140px;top:130px;width:837px;height:1340px;box-shadow:0 40px 80px rgba(35,48,70,.3);border-radius:8px}
.t{position:absolute;left:1100px;top:200px;width:800px}.t h1{font-size:92px;line-height:1.08;color:#233046}
.t p{font-size:44px;line-height:1.35;margin-top:44px}.t .by{font-size:40px;font-weight:600;margin-top:60px;color:#2F7F79}
.bar{position:absolute;left:1100px;top:1180px;width:800px;height:12px;background:#F2C57C}
.fm{position:absolute;left:1100px;top:1230px;font-size:38px;font-weight:600}</style>
<img class="cv" src="${u('output/cover.png')}">
<div class="t"><h1>${esc(book.title)}</h1><p>${esc(book.subtitle)}</p><div class="by">By ${esc(book.author)}</div></div>
<div class="bar"></div><div class="fm">${L.formatLine || `eBook (PDF) &nbsp;|&nbsp; ${chapters.length} chapters`}</div>`,
'listing-2': `<style>${css}body{background:#FFF8EC;padding:90px 110px}
h2{font-size:84px;color:#233046}.sub{font-size:40px;margin:14px 0 50px;color:#2F7F79;font-weight:600}
.g{display:grid;grid-template-columns:1fr 1fr;gap:26px 34px;width:1300px}
.c{background:#fff;border:6px solid #233046;border-radius:24px;padding:22px 28px;display:flex;gap:24px;align-items:center;min-height:150px}
.n{flex:none;width:76px;height:76px;border-radius:50%;background:#2F7F79;color:#fff;font:800 40px 'Merriweather Sans',Arial;display:flex;align-items:center;justify-content:center}
.c span{font-size:35px;font-weight:600;line-height:1.2}
.w{position:absolute;left:110px;bottom:90px;width:1300px;background:#F2C57C;border:6px solid #233046;border-radius:24px;padding:30px 40px;font:800 52px 'Merriweather Sans',Arial}
.tally{position:absolute;right:70px;bottom:90px;height:780px}</style>
<h2>What's inside</h2><div class="sub">${chapters.length} short chapters. Each one ends with a worksheet.</div>
<div class="g">${chapters.map((c,i)=>`<div class="c" ${i==chapters.length-1&&chapters.length%2?'style="grid-column:1/3;width:640px"':''}><div class="n">${i+1}</div><span>${c}</span></div>`).join('')}</div>
<div class="w">+ ${chapters.length} one-page worksheets</div>
<img class="tally" src="${u('assets/character/poses/holding-checklist.png')}">`,
'listing-3': `<style>${css}body{background:#FFF8EC;padding:80px 100px}
h2{font-size:78px}.sub{font-size:40px;margin:12px 0 40px;color:#2F7F79;font-weight:600;width:1300px}
.fw{display:flex;gap:24px;width:1250px}.f{flex:1;background:#2F7F79;color:#fff;border-radius:24px;padding:28px 30px;font:800 38px/1.15 'Merriweather Sans',Arial}
.f small{display:block;font:600 32px 'Source Sans 3',Arial;margin-top:10px;color:#FFF8EC}
.ch{position:absolute;left:100px;top:660px;width:1250px;background:#fff;border:6px solid #233046;border-radius:24px;padding:20px}
.ch img{width:100%;display:block}.cap{position:absolute;left:100px;top:1440px;font-size:34px;width:1250px}
.tally{position:absolute;right:60px;top:560px;height:850px}</style>
<h2>Meet ${esc(book.mascot)}, your guide</h2><div class="sub">${esc(L.mascotLine || '')}</div>
<div class="fw">${(L.highlights || []).map(([n, c]) => `<div class="f">${esc(n)}<small>Chapter ${c}</small></div>`).join('')}</div>
${L.sampleFigure ? `<div class="ch"><img src="${u(L.sampleFigure)}"></div>
<div class="cap">Sample chart from the book.</div>` : ''}
<img class="tally" src="${u('assets/character/poses/pointing.png')}">`,
};
const b = await chromium.launch({channel:'chrome'}); 
for (const [n,h] of Object.entries(pages)) {
  const pg = await b.newPage({viewport:{width:2000,height:1600}});
  const f=path.join(P,'assets','_tmp-'+n+'.html'); fs.writeFileSync(f,`<html><body>${h}</body></html>`); await pg.goto(pathToFileURL(f).href); await pg.waitForLoadState('networkidle').catch(()=>{});
  await pg.evaluate(()=>document.fonts.ready); await pg.waitForTimeout(800);
  await pg.screenshot({path:path.join(P,'output',n+'.png')}); fs.unlinkSync(f); await pg.close();
}
await b.close();
