import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {OFFICIAL_PAPERS,papersForYear,officialPaperHtml} from '../academy/v15-official-papers.mjs';

const safeEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ids=new Set();
assert.equal(OFFICIAL_PAPERS.length,2,'Somente dois cadernos de 2024 conferidos no índice');
for(const p of OFFICIAL_PAPERS){
 assert(!ids.has(p.id));ids.add(p.id);
 assert.equal(p.exam,'ENEM');
 assert.equal(p.year,2024);
 assert.equal(p.institution,'Inep');
 assert.equal(p.edition,'Aplicação regular');
 assert.equal(p.verifiedStatus,'vinculado_no_indice_oficial');
 assert.equal(p.contentsReviewed,false);
 assert.equal(p.interactiveReady,false);
 for(const link of [p.officialPage,p.paperUrl,p.keyUrl]){
  const url=new URL(link);
  assert.equal(url.protocol,'https:');
  assert(['www.gov.br','download.inep.gov.br'].includes(url.hostname));
  assert(!url.username&&!url.password);
 }
 assert(p.officialPage.endsWith('/2024'));
 assert(p.paperUrl.endsWith('.pdf')&&p.keyUrl.endsWith('.pdf'));
}
assert.deepEqual(papersForYear(2025),[]);
assert.equal(papersForYear(2024).length,2);
assert.equal(papersForYear('2024').length,2);
const html=officialPaperHtml(2024,safeEscape);
assert(html.includes('1º dia')&&html.includes('2º dia'));
assert.equal((html.match(/Abrir prova \(PDF oficial\)/g)||[]).length,2);
assert.equal((html.match(/Abrir gabarito \(PDF oficial\)/g)||[]).length,2);
assert(html.includes('Não convertido em simulado interativo'));
assert(html.includes('a leitura e extração dos PDFs ainda não foram validadas'));
assert(!html.includes('onclick='));
assert(html.includes('rel="noopener noreferrer"'));
const other=officialPaperHtml(2025,safeEscape);
assert(other.includes('Não cadastramos links diretos'));
assert(!other.includes('Abrir prova (PDF oficial)'));
const app=readFileSync(new URL('../academy/v9.mjs',import.meta.url),'utf8');
assert(app.includes("import {officialPaperHtml} from './v15-official-papers.mjs'"));
assert(app.includes("direct.innerHTML=officialPaperHtml(el.value,h)"));
console.log('PASS V16 official archive: two index-sourced 2024 links, neutral fallback, safe provenance, no interactive simulation.');
