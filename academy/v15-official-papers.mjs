/**
 * Provas anteriores: URLs transcritas de links publicados pelo Inep no índice oficial.
 * Conteúdo interno dos PDFs NÃO foi extraído, inspecionado ou convertido em questões.
 * Em verificação de 07/11/2026 os documentos estavam listados no portal Inep; os PDFs não abriram neste ambiente (502/timeout);
 * os links permanecem registrados como encontrados na página oficial, não como PDFs baixados.
 */
export const OFFICIAL_PAPERS=Object.freeze([
 {id:'enem-2024-d1-c1-azul',exam:'ENEM',year:2024,edition:'Aplicação regular',
  institution:'Inep',organizingBoard:null,position:null,day:1,booklet:'Caderno 1 — Azul',
  officialPage:'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2024',
  paperUrl:'https://download.inep.gov.br/enem/provas_e_gabaritos/2024_PV_impresso_D1_CD1.pdf',
  keyUrl:'https://download.inep.gov.br/enem/provas_e_gabaritos/2024_GB_impresso_D1_CD1.pdf',
  verifiedStatus:'vinculado_no_indice_oficial',contentsReviewed:false,interactiveReady:false},
 {id:'enem-2024-d2-c7-azul',exam:'ENEM',year:2024,edition:'Aplicação regular',
  institution:'Inep',organizingBoard:null,position:null,day:2,booklet:'Caderno 7 — Azul',
  officialPage:'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2024',
  paperUrl:'https://download.inep.gov.br/enem/provas_e_gabaritos/2024_PV_impresso_D2_CD7.pdf',
  keyUrl:'https://download.inep.gov.br/enem/provas_e_gabaritos/2024_GB_impresso_D2_CD7.pdf',
  verifiedStatus:'vinculado_no_indice_oficial',contentsReviewed:false,interactiveReady:false}
]);
export const papersForYear=year=>OFFICIAL_PAPERS.filter(x=>x.year===Number(year));
export function officialPaperHtml(year,h){
 const papers=papersForYear(year);
 if(!papers.length)return '<p class="v9-mini">Não cadastramos links diretos para esta edição. Abra o índice oficial do Inep e selecione o ano para ver os documentos disponíveis. Não inventamos URLs.</p>';
 return '<div class="v14-library-grid">'+papers.map(p=>
   '<article class="v14-library-item"><h3>'+h(p.exam)+' '+p.year+' · '+p.day+'º dia</h3>'+
   '<p>'+h(p.booklet)+' · '+h(p.edition)+'</p>'+
   '<p class="v9-mini">Fonte: Inep. Links identificados no índice oficial; a leitura e extração dos PDFs ainda não foram validadas.</p>'+
   '<div class="v9-actions"><a class="btn secondary" href="'+h(p.paperUrl)+'" target="_blank" rel="noopener noreferrer">Abrir prova (PDF oficial)</a>'+
   '<a class="btn secondary" href="'+h(p.keyUrl)+'" target="_blank" rel="noopener noreferrer">Abrir gabarito (PDF oficial)</a>'+
   '<a class="btn ghost" href="'+h(p.officialPage)+'" target="_blank" rel="noopener noreferrer">Conferir página do Inep</a></div>'+
   '<p class="v9-mini">Não convertido em simulado interativo.</p></article>').join('')+'</div>';
}
