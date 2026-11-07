/** VYZO ACADEMY | Política pura de pesquisa V10.
 * Documentos, snippets, links e texto do modelo são dados NÃO confiáveis.
 * Nenhum metadado gerado por IA constitui validação humana do edital.
 */
export const ALLOWED_ORIGINS=Object.freeze(['https://vyzo-studio.github.io']);
export const ALLOWED_HOSTS=Object.freeze([
 'gov.br','edu.br','mil.br','unb.br','fgv.br','cebraspe.org.br','vunesp.com.br',
 'cesgranrio.org.br','concursosfcc.com.br','institutoaocp.org.br',
 'institutoconsulplan.org.br','ibfc.org.br','fundatec.org.br',
 'quadrix.org.br','bancodobrasil.com.br'
]);
const clean=(v,max=120)=>typeof v==='string'?v.trim().replace(/\s+/gu,' ').slice(0,max):'';
export function safeOfficialUrl(raw){
 try {
  const original=String(raw);
  // URL() normaliza /%2e%2e/ antes da verificação; examine o caminho bruto.
  const rawPath=original.replace(/^https:\/\/[^/?#]+/i,'').split(/[?#]/,1)[0];
  if(/(?:%2e|%2f|%5c|\\|\/\.\.?\/|\/\/)/i.test(rawPath))return null;
  const u=new URL(original);
  if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443')return null;
  if(!ALLOWED_HOSTS.some(h=>u.hostname===h||u.hostname.endsWith('.'+h)))return null;
  if(/(?:\\|%5c|%2f|%2e%2e|\/\.\.|\/\/)/i.test(u.pathname))return null;
  u.hash='';return u.href;
 }catch{return null;}
}
export function validateQueryPayload(payload){
 if(!payload||Array.isArray(payload)||typeof payload!=='object'||Object.keys(payload).some(k=>k!=='query'))
  throw Error('Formato de solicitação inválido.');
 const q=payload.query;
 if(typeof q!=='string')throw Error('Informe o nome da prova.');
 const result=q.trim().replace(/\s+/gu,' ');
 if(result.length<3||result.length>150)throw Error('Informe de 3 a 150 caracteres.');
 if(/[\u0000-\u001f\u007f<>]/u.test(q)||/https?:\/\//iu.test(q))
  throw Error('Pesquise pelo nome da prova, não por links ou documentos.');
 return result;
}
/** URLs devem vir de citações reais no retorno do web_search, NÃO só do texto gerado. */
export function citedOfficialSources(response){
 const map=new Map();
 for(const part of Array.isArray(response?.output)?response.output:[]){
  if(part?.type!=='message')continue;
  const nodes=[...(Array.isArray(part.content)?part.content:[]),part];
  for(const node of nodes){
   for(const annotation of Array.isArray(node?.annotations)?node.annotations:[]){
    const a=annotation.type==='url_citation'?(annotation.url_citation||annotation):null;
    const url=a&&safeOfficialUrl(a.url);
    if(url&&!map.has(url))map.set(url,{url,title:clean(a.title,150)||'Fonte institucional citada',documentType:'Link institucional citado (não auditado)',retrievedAt:new Date().toISOString()});
   }
  }
 }
 return map;
}
function sourcedValue(value,sources,max=110){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const url=safeOfficialUrl(value.sourceUrl);
 return url&&sources.has(url)&&typeof value.value==='string'?clean(value.value,max)||null:null;
}
function validDate(date){
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
 const time=new Date(date+'T12:00:00Z');
 return Number.isFinite(time.getTime())&&time.toISOString().slice(0,10)===date;
}
/** Somente pistas com citações explícitas. Nunca declara que o edital foi lido ou validado. */
export function validateProviderCandidates(output,providerResponse){
 if(!output||typeof output!=='object'||Array.isArray(output)||!Array.isArray(output.candidates))throw Error('Resposta de IA incompatível.');
 const citations=citedOfficialSources(providerResponse),result=[],seen=new Set();
 for(const item of output.candidates.slice(0,4)){
  if(!item||typeof item!=='object'||Array.isArray(item))continue;
  const name=clean(item.name,110);
  if(name.length<3||seen.has(name.toLowerCase()))continue;
  const linked=new Map();
  for(const source of Array.isArray(item.sources)?item.sources.slice(0,10):[]){
   const url=safeOfficialUrl(source?.url);
   if(url&&citations.has(url))linked.set(url,citations.get(url));
  }
  if(!linked.size)continue;
  const subjects=[];
  for(const subject of Array.isArray(item.subjects)?item.subjects.slice(0,25):[]){
   const value=sourcedValue(subject,linked,90);
   if(value&&!subjects.includes(value))subjects.push(value);
  }
  const date=sourcedValue(item.examDate,linked,10);
  const types=new Set(['ENEM','Vestibular','Concurso público','Concurso militar','Certificação profissional','Prova escolar','Outra prova']);
  result.push({
   name,examType:types.has(item.examType)?item.examType:'Outra prova',
   institution:sourcedValue(item.institution,linked),position:sourcedValue(item.position,linked),
   board:sourcedValue(item.board,linked),edition:sourcedValue(item.edition,linked,60),
   examDate:validDate(date)?date:null,
   subjects,sources:[...linked.values()],noticeAnalyzed:false,
   sourceStatus:'Links institucionais citados; edital e conteúdo ainda precisam de conferência humana'
  });
  seen.add(name.toLowerCase());
 }
 return result;
}
export function extractProviderText(response){
 return (Array.isArray(response?.output)?response.output:[])
  .filter(x=>x?.type==='message')
  .flatMap(x=>Array.isArray(x.content)?x.content:[])
  .filter(x=>x?.type==='output_text'&&typeof x.text==='string')
  .map(x=>x.text).join('\n');
}
export function usageFromProvider(response){
 const usage=response?.usage||{};
 const input=Number(usage.input_tokens),output=Number(usage.output_tokens);
 const calls=(Array.isArray(response?.output)?response.output:[]).filter(x=>x.type==='web_search_call').length;
 return {
  input_tokens:Number.isInteger(input)&&input>=0?input:0,
  output_tokens:Number.isInteger(output)&&output>=0?output:0,
  web_search_calls:Math.min(calls,2),
  total_tokens:Number.isInteger(usage.total_tokens)&&usage.total_tokens>=0?usage.total_tokens:0
 };
}
/** Null quando não há tabela de preços verificada e configurada; nunca inventar custo. */
export function estimatedUsd(usage,env){
 const variables=['ACADEMY_INPUT_USD_PER_M','ACADEMY_OUTPUT_USD_PER_M','ACADEMY_SEARCH_USD_PER_CALL'];
 const rates=variables.map(name=>env[name]);
 if(rates.some(r=>typeof r!=='string'||!r.trim()||!Number.isFinite(Number(r))||Number(r)<0))return null;
 const [input,output,search]=rates.map(Number);
 const usd=(usage.input_tokens*input+usage.output_tokens*output)/1_000_000+usage.web_search_calls*search;
 return Math.round(usd*1_000_000)/1_000_000;
}
