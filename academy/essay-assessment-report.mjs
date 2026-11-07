/** VYZO ACADEMY B3 — leitura autorizada e apresentação segura de avaliação real.
 * SEM pontuação simulada, sem sobrescrever rascunho, sem HTML não confiável.
 */
import {validateAssessmentEnvelope} from './essay-assessment-client.mjs';
import {getWritingProposal} from './essay-lab.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const LABELS=Object.freeze({
 C1:'Competência I — Escrita formal',
 C2:'Competência II — Tema, repertório e gênero',
 C3:'Competência III — Desenvolvimento dos argumentos',
 C4:'Competência IV — Coesão textual',
 C5:'Competência V — Proposta de intervenção'
});
const MAX_BODY=50000;
function validRow(user,essay,row){
 if(!user?.id||!essay?.id||!row||row.user_id!==user.id||
   row.essay_id!==essay.id||essay.user_id!==user.id||
   row.status!=='completed'||!UUID.test(String(row.id||''))||
   typeof row.essay_snapshot!=='string'||row.essay_snapshot.length>MAX_BODY||
   !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(String(row.essay_revision||'')))
  throw Error('Avaliação indisponível para esta conta e redação.');
 const p=getWritingProposal(row.proposal_id,row.proposal_version);
 if(!p||p.rubricId!=='enem-cartilha-2026')throw Error('Rubrica da proposta não encontrada.');
 const envelope=validateAssessmentEnvelope({status:'completed',assessment_id:row.id,result:row.report});
 for(const issue of envelope.result.issues){
  if(!issue||typeof issue.quote!=='string'||!row.essay_snapshot.includes(issue.quote))
   throw Error('Trecho não corresponde à revisão preservada da redação.');
 }
 return envelope.result;
}
export function verifyPersistedAssessment(user,essay,row){return validRow(user,essay,row);}
export async function readPersistedAssessment(client,user,essay,id){
 if(!UUID.test(String(id||''))||!client?.from)throw Error('Identificador de avaliação inválido.');
 const {data,error}=await client.from('academy_essay_assessments')
  .select('id,user_id,essay_id,essay_revision,essay_snapshot,proposal_id,proposal_version,status,report,created_at')
  .eq('id',id).eq('essay_id',essay.id).eq('user_id',user.id).eq('status','completed').single();
 if(error||!data)throw Error('Avaliação ainda não disponível na conta.');
 return {id,essay_id:essay.id,revision:data.essay_revision,created_at:data.created_at,
  report:validRow(user,essay,data)};
}
export async function readLatestAssessment(client,user,essay){
 if(!client?.from||!user?.id||!essay?.id)throw Error('Conta não autorizada.');
 const {data,error}=await client.from('academy_essay_assessments')
  .select('id,user_id,essay_id,essay_revision,essay_snapshot,proposal_id,proposal_version,status,report,created_at')
  .eq('essay_id',essay.id).eq('user_id',user.id).eq('status','completed')
  .order('created_at',{ascending:false}).limit(1);
 if(error)throw Error('O histórico de avaliações está temporariamente indisponível.');
 if(!Array.isArray(data)||!data.length)return null;
 return {id:data[0].id,essay_id:essay.id,revision:data[0].essay_revision,
  created_at:data[0].created_at,report:validRow(user,essay,data[0])};
}
function el(tag,text,klass){
 const n=document.createElement(tag);
 if(text!==undefined&&text!==null)n.textContent=String(text);
 if(klass)n.className=klass;
 return n;
}
function section(root,heading,items){
 const container=el('section',null,'essay-result-section');
 container.append(el('h3',heading));
 const list=el('ul');
 for(const line of items||[])list.append(el('li',String(line)));
 if(!items?.length)list.append(el('li','Nenhuma observação específica registrada nesta categoria.'));
 container.append(list);root.append(container);
}
export function renderAssessmentReport(root,assessment){
 if(!root||!assessment?.report)throw Error('Sem avaliação persistida para apresentar.');
 root.replaceChildren();
 const result=assessment.report;
 const heading=el('section',null,'essay-result-head');
 const score=result.status==='manual_review'?'AVALIAÇÃO PENDENTE DE REVISÃO HUMANA':
  'NOTA ESTIMADA: '+result.total_score+'/1000';
 heading.append(
  el('p','VYZO ACADEMY · AVALIAÇÃO PEDAGÓGICA POR IA','essay-proposal-kind'),
  el('h2',score),
  el('p','Não é uma nota oficial do Inep. Os resultados referem-se somente à versão submetida em '+new Date(assessment.revision).toLocaleString('pt-BR')+'.','small muted')
 );
 root.append(heading);
 const competencies=el('section',null,'essay-result-section');
 competencies.append(el('h3','Avaliação por competência'));
 for(const c of result.competences){
  const article=el('article',null,'essay-result-competence');
  const label=el('h4',LABELS[c.id]||c.id);
  const points=el('strong',c.score===null?'Sem pontuação estimada':c.score+'/200');
  article.append(label,points,el('p',c.rationale));competencies.append(article);
 }
 root.append(competencies);
 section(root,'Pontos fortes',result.strengths);
 section(root,'Oportunidades de melhoria',result.weaknesses);
 const issues=el('section',null,'essay-result-section');
 issues.append(el('h3','Revisão por trechos'));
 if(!result.issues.length)issues.append(el('p','Nenhuma correção por trecho foi apresentada pelo serviço.'));
 for(const issue of result.issues){
  const card=el('article',null,'essay-result-issue');
  card.append(el('h4',issue.kind==='erro_objetivo'?'Erro identificado':'Sugestão de melhoria'),
   el('blockquote',issue.quote),el('p',issue.explanation),el('p','Sugestão: '+issue.suggestion),
   el('p','Justificativa: '+issue.justification));
  issues.append(card);
 }
 root.append(issues);
 const analyses=el('section',null,'essay-result-section');
 analyses.append(el('h3','Análise individualizada'));
 for(const [name,key] of [
  ['Argumentação','argumentation'],['Coesão','cohesion'],['Repertório','repertoire'],
  ['Proposta de intervenção','intervention']
 ])analyses.append(el('h4',name),el('p',result[key]));
 root.append(analyses);
 section(root,'Prioridades para sua próxima redação',result.recommendations);
 const limitations=el('section',null,'essay-result-section');
 limitations.append(el('h3','Limitações da correção'),
  el('p',result.limitations),
  el('p',result.disclaimer||'Resultado estimado por IA; revisão pedagógica humana pode ser necessária.'));
 root.append(limitations);
 const actions=el('div',null,'essay-actions');
 const back=el('button','Voltar à minha redação','btn secondary');
 back.type='button';back.dataset.action='essay-result-back';
 actions.append(back);root.append(actions);
}
