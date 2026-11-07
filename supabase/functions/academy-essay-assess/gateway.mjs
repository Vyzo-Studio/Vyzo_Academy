/** VYZO ACADEMY | B1 — Edge Function privada de correção. Desligada por padrão.
 * Segue o padrão Auth -> RLS -> RPC atômica -> OpenAI -> persistência do gateway V10.
 * Deploy SOMENTE após homologação, com verify_jwt=true. Não registra redações em logs.
 */
import {
 ALLOWED_ORIGINS,ASSESSMENT_VERSION,validateSubmission,validateSavedEssay,
 providerPayload,extractProviderText,validateReport,readUsage
} from './assessment-policy.mjs';
const API='https://api.openai.com/v1/responses';
const MAX_REQUEST=1024;
const env=k=>Deno.env.get(k)||'';
const allowed=o=>ALLOWED_ORIGINS.includes(o);
const headers=o=>({
 Vary:'Origin','Cache-Control':'no-store',
 ...(allowed(o)?{'Access-Control-Allow-Origin':o}:{}),
 'Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type',
 'Access-Control-Allow-Methods':'POST,OPTIONS'
});
const reply=(value,status,h,extra={})=>new Response(JSON.stringify(value),{
 status,headers:{...h,...extra,'Content-Type':'application/json; charset=utf-8'}
});
const fail=(message,status,h,extra={})=>reply({error:message},status,h,extra);
const bounded=(url,opt={},timeout=5000)=>fetch(url,{...opt,signal:AbortSignal.timeout(timeout)});
function config(){
 return {
  project:env('SUPABASE_URL').replace(/\/+$/u,''),
  publicKey:env('SUPABASE_PUBLISHABLE_KEY')||env('SUPABASE_ANON_KEY'),
  adminKey:env('SUPABASE_SERVICE_ROLE_KEY'),
  providerKey:env('OPENAI_API_KEY'),
  model:env('OPENAI_ESSAY_MODEL'),
  enabled:env('ACADEMY_AI_ENABLED')==='true'&&env('ACADEMY_AI_ESSAY_ENABLED')==='true'
 };
}
const asJson=async res=>res.json().catch(()=>null);
function pubHeaders(key,jwt){
 return {apikey:key,Authorization:'Bearer '+jwt,'Content-Type':'application/json'};
}
async function authenticated(c,jwt){
 const resp=await bounded(c.project+'/auth/v1/user',{headers:pubHeaders(c.publicKey,jwt)},5000);
 if(!resp.ok)return null;
 const user=await asJson(resp);
 if(!user?.id||!user.email_confirmed_at||user.is_anonymous===true||
  user.app_metadata?.academy_ai_essay_allowed!==true||
  user.app_metadata?.academy_adult_verified!==true)return null;
 return user;
}
async function ownerEssay(c,jwt,user,essayId){
 const query='?id=eq.'+encodeURIComponent(essayId)+'&user_id=eq.'+encodeURIComponent(user.id)
  +'&select=id,user_id,updated_at,body,proposal_id,proposal_version,writing_mode';
 const resp=await bounded(c.project+'/rest/v1/academy_essays'+query,{
  headers:{...pubHeaders(c.publicKey,jwt),Accept:'application/vnd.pgrst.object+json'}
 },5000);
 if(resp.status===406||resp.status===404)return null;
 if(!resp.ok)throw new Error('database');
 return asJson(resp);
}
async function reserve(c,jwt,payload){
 const resp=await bounded(c.project+'/rest/v1/rpc/academy_reserve_essay_assessment',{
  method:'POST',headers:pubHeaders(c.publicKey,jwt),
  body:JSON.stringify({p_essay_id:payload.essay_id,p_revision:payload.revision})
 },5000);
 if(!resp.ok){
  const issue=await asJson(resp);
  if(resp.status===401||resp.status===403||issue?.code==='42501')return {error:'forbidden'};
  if(issue?.code==='P0001')return {error:'quota'};
  if(issue?.code==='P0002')return {error:'duplicate'};
  if(issue?.code==='P0003')return {error:'revision'};
  if(issue?.code==='22023')return {error:'invalid'};
  return {error:'database'};
 }
 const id=await asJson(resp);
 if(typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id))return {error:'database'};
 return {id};
}
async function loadReserved(c,jwt,user,id){
 const url=c.project+'/rest/v1/academy_essay_assessments?id=eq.'+encodeURIComponent(id)
   +'&user_id=eq.'+encodeURIComponent(user.id)
   +'&select=id,user_id,essay_id,essay_revision,essay_snapshot,body_sha256,proposal_id,proposal_version,status';
 const resp=await bounded(url,{headers:{...pubHeaders(c.publicKey,jwt),Accept:'application/vnd.pgrst.object+json'}},5000);
 if(!resp.ok)throw new Error('reserved_missing');
 return asJson(resp);
}
async function hashText(text){
 const buffer=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
 return Array.from(new Uint8Array(buffer)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function finish(c,user,id,status,report,usage){
 const path='/rest/v1/academy_essay_assessments?id=eq.'+encodeURIComponent(id)
  +'&user_id=eq.'+encodeURIComponent(user.id)+'&status=eq.reserved';
 const resp=await bounded(c.project+path,{
  method:'PATCH',headers:{
   apikey:c.adminKey,Authorization:'Bearer '+c.adminKey,
   'Content-Type':'application/json',Prefer:'return=representation'
  },
  body:JSON.stringify({
   status,report:status==='completed'?report:null,provider_model:c.model.slice(0,80),
   input_tokens:usage.input_tokens,output_tokens:usage.output_tokens,
   completed_at:new Date().toISOString()
  })
 },6000);
 if(!resp.ok)return false;
 const rows=await asJson(resp);
 return Array.isArray(rows)&&rows.length===1;
}
export async function handleEssayAssessment(req){
 const origin=req.headers.get('Origin')||'',cors=headers(origin);
 if(req.method==='OPTIONS')return new Response(null,{status:allowed(origin)?204:403,headers:cors});
 if(!allowed(origin))return fail('Origem não autorizada.',403,cors);
 if(req.method!=='POST')return fail('Método não permitido.',405,cors);
 const jwt=req.headers.get('Authorization')?.match(/^Bearer\s+([A-Za-z0-9_.-]+)$/iu)?.[1];
 if(!jwt||jwt.length<80)return fail('Autentique-se para solicitar avaliação.',401,cors);
 const c=config();
 if(!c.project||!c.publicKey)return fail('Autenticação indisponível.',503,cors);
 let user;
 try{user=await authenticated(c,jwt);}
 catch{return fail('Falha na verificação da sessão.',503,cors);}
 if(!user)return fail('Conta não homologada para correção.',403,cors);
 if(req.headers.get('Content-Type')?.split(';')[0]?.trim()!=='application/json')
  return fail('Solicitação JSON obrigatória.',415,cors);
 if(Number(req.headers.get('Content-Length')||0)>MAX_REQUEST)return fail('Solicitação extensa.',413,cors);
 let payload;
 try{
  const raw=await req.text();
  if(new TextEncoder().encode(raw).length>MAX_REQUEST)throw Error('size');
  payload=validateSubmission(JSON.parse(raw));
 }catch{return fail('Identificador ou revisão da redação inválidos.',400,cors);}
 let essay,proposal;
 try{
  essay=await ownerEssay(c,jwt,user,payload.essay_id);
  proposal=validateSavedEssay(essay,user.id,payload.revision);
 }catch(error){
  if(error?.message==='database')return fail('Banco de redações indisponível.',503,cors);
  if(error?.message?.includes('alterado'))return fail('Redação atualizada: envie a versão mais recente.',409,cors);
  return fail('Redação indisponível ou ainda não elegível para correção.',422,cors);
 }
 // A Etapa B2 implementará a entrega irrevogável do modo simulado.
 if(essay.writing_mode==='simulado')return fail('Simulado precisa ser entregue antes de corrigir.',403,cors);
 // Duas autorizações explícitas, sem habilitar pesquisa V10 nem cadastro de menores.
 if(!c.enabled||!c.adminKey||!c.providerKey||!c.model)
  return fail('Correção com IA desativada durante a homologação.',503,cors);
 let ticket;
 try{ticket=await reserve(c,jwt,payload);}catch{return fail('Controle de cota indisponível.',503,cors);}
 if(ticket.error==='forbidden')return fail('Solicitação não autorizada.',403,cors);
 if(ticket.error==='quota')return fail('Limite de correções atingido.',429,cors,{'Retry-After':'60'});
 if(ticket.error==='duplicate')return fail('Correção desta revisão já iniciada ou concluída.',409,cors);
 if(ticket.error==='revision')return fail('Redação alterada durante o envio.',409,cors);
 if(ticket.error==='invalid')return fail('Texto incompatível com a rubrica.',422,cors);
 if(!ticket.id)return fail('Reserva segura indisponível.',503,cors);
 let report=null,usage={input_tokens:0,output_tokens:0},state='provider_error',status=502;
 let message='O provedor de IA não concluiu a correção.';
 try{
  const reserved=await loadReserved(c,jwt,user,ticket.id);
  if(!reserved||reserved.status!=='reserved'||reserved.essay_id!==essay.id||
    reserved.user_id!==user.id||reserved.essay_snapshot!==essay.body||
    reserved.body_sha256!==await hashText(reserved.essay_snapshot)||
    new Date(reserved.essay_revision).getTime()!==new Date(payload.revision).getTime())
   throw new Error('assessment_snapshot_invalid');
  validateSavedEssay({
   id:reserved.essay_id,user_id:reserved.user_id,
   updated_at:reserved.essay_revision,body:reserved.essay_snapshot,
   proposal_id:reserved.proposal_id,proposal_version:reserved.proposal_version,
   writing_mode:essay.writing_mode
  },user.id,payload.revision);
  const response=await bounded(API,{
   method:'POST',headers:{Authorization:'Bearer '+c.providerKey,'Content-Type':'application/json'},
   body:JSON.stringify(providerPayload({...essay,body:reserved.essay_snapshot},proposal,c.model))
  },27000);
  if(!response.ok){
   state='provider_error';status=response.status===429?429:502;
  }else{
   const text=await response.text();
   if(text.length>95000)throw new Error('oversized_provider_response');
   const provider=JSON.parse(text);
   usage=readUsage(provider);
   report=validateReport(JSON.parse(extractProviderText(provider)),reserved.essay_snapshot);
   state='completed';status=200;
  }
 }catch(error){
  const timeout=error?.name==='TimeoutError'||error?.name==='AbortError';
  const invalid=error?.message!=='assessment_snapshot_invalid'&&!timeout;
  state=timeout?'timeout':invalid?'invalid_output':'provider_error';
  status=timeout?504:502;
  message=timeout?'Tempo limite do provedor excedido.':'Resposta da IA inválida ou não verificável.';
 }
 try{
  if(!await finish(c,user,ticket.id,state,report,usage))
   return fail('Não foi possível registrar a correção com segurança.',503,cors);
 }catch{return fail('Persistência da correção indisponível.',503,cors);}
 if(state!=='completed')return fail(message,status,cors);
 return reply({
  assessment_id:ticket.id,status:'completed',assessment_version:ASSESSMENT_VERSION,
  result:report
 },200,cors);
}
