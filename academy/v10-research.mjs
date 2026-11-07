/** V10 – contrato de pesquisa: sem fontes oficiais vinculadas, sem alegações de confirmação. */
export const OFFICIAL_DOMAINS=[
  'gov.br','edu.br','mil.br','unb.br','fgv.br','cebraspe.org.br','vunesp.com.br',
  'cesgranrio.org.br','concursosfcc.com.br','institutoaocp.org.br','institutoconsulplan.org.br',
  'ibfc.org.br','fundatec.org.br','quadrix.org.br','bancodobrasil.com.br'
];
const typeNames=new Set(['ENEM','Vestibular','Concurso público','Concurso militar','Certificação profissional','Prova escolar','Outra prova']);
const clean=(x,max=160)=>typeof x==='string'?x.trim().replace(/\s+/g,' ').slice(0,max):'';
const realCalendarDay=date=>{
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
 const parsed=new Date(date+'T12:00:00.000Z');
 return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===date;
};
export function validQuery(query){
 if(typeof query!=='string'||/[\u0000-\u001f\u007f<>]/u.test(query)||/https?:\/\//iu.test(query))
  throw Error('Digite somente o nome da prova, sem links nem instruções de controle.');
 const q=query.trim().replace(/\s+/gu,' ');
 if(q.length<3||q.length>150)
  throw Error('Informe o nome da prova entre 3 e 150 caracteres.');
 return q;
}
export function officialUrl(raw){
 try {
 const text=String(raw);
 // Reject encoded traversal/ambiguous paths before URL() normalizes them.
 const rawPath=text.replace(/^https:\/\/[^/?#]+/i,'').split(/[?#]/,1)[0];
 if(/(?:%2e|%2f|%5c|\\|\/\.\.?\/|\/\/)/i.test(rawPath))return null;
 const url=new URL(text);
 if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443')return null;
 const host=url.hostname.toLowerCase();if(!OFFICIAL_DOMAINS.some(d=>host===d||host.endsWith('.'+d)))return null;
 if(/(?:\/\.\.|%2e%2e|\\)/i.test(url.pathname))return null;
 url.hash='';return url.href;
 }catch{return null;}
}
function normalizedSource(item){const href=officialUrl(item?.url);if(!href)return null;return {url:href,title:clean(item?.title||'Fonte oficial',140),documentType:clean(item?.documentType||'Página institucional',60),retrievedAt:clean(item?.retrievedAt||'',40)};}
export function normalizeResearch(raw){
 if(!raw||typeof raw!=='object'||!Array.isArray(raw.candidates))throw Error('O serviço de pesquisa não devolveu uma resposta válida.');
 const out=[];
 for(const item of raw.candidates.slice(0,6)){
  const sources=(Array.isArray(item?.sources)?item.sources:[]).map(normalizedSource).filter(Boolean).slice(0,8);
  if(!sources.length)continue;
  const type=typeNames.has(item.examType)?item.examType:'Outra prova';
  const name=clean(item.name,110);if(name.length<3)continue;
  const subjects=(Array.isArray(item.subjects)?item.subjects:[]).map(x=>clean(x,90)).filter(Boolean).slice(0,30);
  const date=realCalendarDay(item.examDate)?item.examDate:null;
  out.push({name,type,institution:clean(item.institution,110),position:clean(item.position,110),board:clean(item.board,110),edition:clean(item.edition,60),examDate:date,subjects,provisional:type!=='ENEM',sources,sourceStatus:'Fontes oficiais vinculadas; confirme o edital antes de usar',researchDate:clean(raw.researchedAt||new Date().toISOString(),40),noticeAnalyzed:false,sourceVersion:clean(raw.researchVersion||'v10',30)});
 }
 return {candidates:out,researchedAt:clean(raw.researchedAt||'',40)};
}
export function cloudConfigured(config){return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(String(config?.url||''))&&(/^(sb_publishable_|eyJ)/.test(String(config?.publishableKey||'')));}
// Chamadas reais exclusivamente pelo projeto Supabase autenticado; nunca por API key no frontend.
export async function searchExams(query,{config=globalThis.window?.VYZO_ACADEMY_CLOUD,createClient,timeoutMs=30000}={}){
 const q=validQuery(query);
 if(!cloudConfigured(config))throw Error('A pesquisa com IA ainda não foi ativada. Use a configuração manual enquanto preparamos o servidor seguro.');
 if(typeof createClient!=='function')throw Error('Provedor de autenticação indisponível.');
 const client=createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true}});
 const {data,error}=await client.auth.getUser();
 if(error||!data?.user||!data.user.email_confirmed_at)throw Error('Entre na sua conta e confirme o e-mail para utilizar a pesquisa com IA.');
 const task=client.functions.invoke('academy-exam-research',{body:{query:q}});
 // Tratamento de tempo no cliente; o servidor também define timeout e cota.
 let handle;const limit=new Promise((_,reject)=>{handle=setTimeout(()=>reject(Error('A pesquisa excedeu o tempo disponível. Tente novamente.')),timeoutMs);});
 try {
   const result=await Promise.race([task,limit]);if(result.error)throw Error('A pesquisa não pôde ser concluída. Confira a conexão e tente novamente.');
   return normalizeResearch(result.data);
 }finally{clearTimeout(handle);}
}
