/** VYZO ACADEMY — B2, cliente de entrega da redação (SEM nota local ou API secreta).
 * O servidor revalida JWT, titularidade, revisão, quota e as flags de IA.
 * Este módulo NUNCA modifica o conteúdo da redação.
 */
import {getWritingProposal,essayMetrics} from './essay-lab.mjs';

export const ASSESS_FUNCTION='academy-essay-assess';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const LEVELS=new Set([0,40,80,120,160,200]);
const COMPETENCIES=['C1','C2','C3','C4','C5'];
const inFlight=new Map();

export function eligibleEssay(user,essay){
 if(!user?.id||!user.email_confirmed_at||user.is_anonymous===true)return false;
 if(user.app_metadata?.academy_ai_essay_allowed!==true||
    user.app_metadata?.academy_adult_verified!==true)return false;
 if(!essay||!UUID.test(String(essay.id||''))||essay.user_id!==user.id)return false;
 const p=getWritingProposal(essay.proposal_id,essay.proposal_version);
 return Boolean(p?.status==='validado_editorialmente'&&p.category==='enem'&&
   p.rubricId==='enem-cartilha-2026'&&essay.writing_mode==='treino');
}
export function assessmentRequest(user,essay){
 if(!eligibleEssay(user,essay))throw Error('Conta ou proposta ainda não habilitada para avaliação por IA.');
 const body=String(essay.body||'');
 if(body.trim().length<80||body.length>50000||essayMetrics(body).words<20)
  throw Error('Sua redação precisa de pelo menos 20 palavras e 80 caracteres para uma correção fundamentada.');
 const rev=String(essay.updated_at||'');
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(rev)
    ||!Number.isFinite(Date.parse(rev)))throw Error('Salve a redação antes de solicitar a correção.');
 return Object.freeze({essay_id:essay.id,revision:rev});
}
export function validateAssessmentEnvelope(body){
 if(!body||typeof body!=='object'||body.status!=='completed'||
    !UUID.test(String(body.assessment_id||''))||
    !body.result||body.result.official!==false||body.result.estimated!==true||
    body.result.rubric_id!=='enem-cartilha-2026')
  throw Error('O serviço não confirmou uma avaliação válida.');
 const {result}=body,c=result.competences;
 if(!Array.isArray(c)||c.length!==5||c.some((v,i)=>v.id!==COMPETENCIES[i]||
   (v.score!==null&&!LEVELS.has(v.score))||typeof v.rationale!=='string'||
   v.rationale.trim().length<10))throw Error('O provedor não confirmou as cinco competências.');
 const scores=c.map(v=>v.score);
 if(result.status==='scored'){
  if(scores.some(v=>v===null)||result.total_score!==scores.reduce((a,b)=>a+b,0))
    throw Error('A soma das competências não confere.');
 }else if(result.status==='estimated_zero'){
  if(result.total_score!==0||scores.some(v=>v!==0))throw Error('Estimativa zero inconsistente.');
 }else if(result.status==='manual_review'){
  if(result.total_score!==null||scores.some(v=>v!==null))throw Error('Revisão humana não pode exibir nota.');
 }else throw Error('Estado de correção inválido.');
 if(!Array.isArray(result.issues)||result.issues.some(i=>typeof i.quote!=='string'))
  throw Error('Resposta sem trechos verificáveis.');
 return body;
}
const displayError=e=>{
 const context=String(e?.context?.status||'');
 if(context==='429')return 'Limite de correções atingido. Tente mais tarde.';
 if(context==='401'||context==='403')return 'Conta sem autorização para correção por IA.';
 if(context==='409')return 'Esta versão já está em análise ou foi modificada. Atualize o rascunho.';
 if(context==='503')return 'Correção com IA ainda não habilitada para esta conta.';
 return 'A correção não foi concluída. Sua redação e suas versões continuam salvas; tente novamente.';
};
/** Coalescência por (conta, redação, revisão). Backend possui segunda deduplicação atômica. */
export async function submitSavedEssay({client,user,essay}){
 const payload=assessmentRequest(user,essay);
 if(!client?.auth?.getUser||!client?.functions?.invoke)throw Error('Serviço autenticado indisponível.');
 const key=user.id+':'+payload.essay_id+':'+payload.revision;
 if(inFlight.has(key))return inFlight.get(key);
 const task=(async()=>{
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user||data.user.id!==user.id||
     !eligibleEssay(data.user,essay))throw Error('Confirme a sessão e a autorização antes do envio.');
  let response;
  try{
   response=await client.functions.invoke(ASSESS_FUNCTION,{body:payload});
  }catch(e){throw Error(displayError(e));}
  if(response?.error)throw Error(displayError(response.error));
  return validateAssessmentEnvelope(response?.data);
 })();
 inFlight.set(key,task);
 try{return await task;}finally{if(inFlight.get(key)===task)inFlight.delete(key);}
}
