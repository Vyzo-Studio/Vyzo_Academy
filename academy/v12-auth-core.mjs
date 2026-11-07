/* VYZO ACADEMY V12: autenticação real e importação de histórico local por consentimento.
   Nunca armazena credenciais, nunca usa dados de perfil para autorização. */
export const LEGACY_SOURCES = Object.freeze([
  {key:'enem-intelligence-v2',name:'Simulados e redações do sistema clássico',kind:'classic'},
  {key:'enem-intelligence-v1',name:'Backup histórico do simulador antigo',kind:'classic'},
  {key:'vyzo-academy-v9-guest-1',name:'Diagnósticos e planos locais da jornada personalizada',kind:'v9'}
]);
const BAD_FIELD=/^(password|passwd|passphrase|access_token|refresh_token|id_token|token|secret|service_role|apikey|api_key|authorization|cookie|credentials|session)$/i;
const MAX_BYTES=3_000_000;
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isVerifiedStudent(user){
  return Boolean(user&&typeof user.id==='string'&&user.id.length>0&&
   EMAIL.test(String(user.email||''))&&Boolean(user.email_confirmed_at)&&user.is_anonymous!==true);
}
export async function getVerifiedStudent(client){
  if(!client?.auth?.getUser)throw Error('Provedor de autenticação indisponível.');
  const {data,error}=await client.auth.getUser();
  if(error)return null;
  return isVerifiedStudent(data?.user)?data.user:null;
}
export function privateRoute(pathname){
  const path=decodeURIComponent(String(pathname||'/')).replace(/\/{2,}/g,'/');
  const routes=['/','/index.html','/academy/','/academy/index.html','/academy/v9.html','/academy/demo.html','/academy/v12.html'];
  const prefix=path.indexOf('/Vyzo_Academy/');
  if(prefix>=0)return routes.includes(path.slice(prefix+'/Vyzo_Academy'.length));
  return routes.includes(path);
}
export function safeReturnRoute(value){
  // Não permitir URLs externas, javascript: ou caminhos que escapem do site.
  if(typeof value!=='string'||value.length>180||!/^\/Vyzo_Academy\/(?:academy\/(?:v9|index)\.html)?$/.test(value))return '/Vyzo_Academy/academy/';
  return value;
}
function hasForbiddenFields(root){
  const seen=new WeakSet(),stack=[root];
  while(stack.length){
    const value=stack.pop();
    if(!value||typeof value!=='object')continue;
    if(seen.has(value))return true;
    seen.add(value);
    for(const [key,field] of Object.entries(value)){
      if(BAD_FIELD.test(key))return true;
      if(field&&typeof field==='object')stack.push(field);
    }
  }
  return false;
}
export function validateLegacyRecord(source,raw){
  if(!source||!LEGACY_SOURCES.some(s=>s.key===source.key))throw Error('Origem não permitida.');
  if(typeof raw!=='string'||!raw.length||new TextEncoder().encode(raw).length>MAX_BYTES)throw Error('Tamanho de backup inválido ou maior que 3 MB.');
  let parsed;
  try{parsed=JSON.parse(raw);}catch{throw Error('O conteúdo anterior não está em JSON válido.');}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('Histórico sem estrutura válida.');
  if(source.kind==='v9'&&(parsed.schema!==9||!Array.isArray(parsed.goals)||!Array.isArray(parsed.assessments)||!Array.isArray(parsed.tasks)))throw Error('Estrutura V9 incompatível.');
  if(source.kind==='classic'&&!['history','exam','essay','mentor','seenIds','savedExams'].some(k=>k in parsed))throw Error('Histórico clássico incompatível.');
  if(hasForbiddenFields(parsed))throw Error('O arquivo contém campos de autenticação. Não será importado.');
  return parsed;
}
export function scanLegacySources(storage){
  const result=[];
  for(const source of LEGACY_SOURCES){
    try{
      const raw=storage.getItem(source.key);
      if(!raw)continue;
      const parsed=validateLegacyRecord(source,raw);
      const count=source.kind==='v9'?parsed.assessments.length:(Array.isArray(parsed.history)?parsed.history.length:0);
      result.push({key:source.key,name:source.name,kind:source.kind,bytes:new TextEncoder().encode(raw).length,records:count});
    }catch(error){
      result.push({key:source.key,name:source.name,blocked:true,reason:String(error.message||error)});
    }
  }
  return result;
}
export async function legacyFingerprint(raw){
  if(!globalThis.crypto?.subtle?.digest)throw Error('Importação segura exige um navegador com criptografia habilitada.');
  const hash=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function importLegacyWithConsent({client,storage,user,keys,confirmed}){
  if(!confirmed)throw Error('Você precisa confirmar a cópia dos dados locais.');
  const verified=await getVerifiedStudent(client);
  if(!verified||verified.id!==user?.id)throw Error('A conta ativa mudou. Faça login novamente e confira seu histórico.');
  const requested=[...new Set(Array.isArray(keys)?keys:[])];
  if(!requested.length)throw Error('Selecione ao menos uma origem para importar.');
  const imports=[];
  for(const key of requested){
    const source=LEGACY_SOURCES.find(x=>x.key===key);
    if(!source)throw Error('Origem de histórico não autorizada.');
    const raw=storage.getItem(key);
    const parsed=validateLegacyRecord(source,raw);
    const fingerprint=await legacyFingerprint(raw);
    // A restrição de UNIQUE no banco evita importação repetida mesmo em duas abas.
    const {data:existing,error:lookupError}=await client.from('academy_legacy_imports')
      .select('id').eq('user_id',verified.id).eq('source_key',key).eq('fingerprint',fingerprint).limit(1);
    if(lookupError)throw lookupError;
    if(existing?.length){imports.push({key,alreadySaved:true});continue;}
    const {error}=await client.from('academy_legacy_imports').insert({
      user_id:verified.id,source_key:key,fingerprint,original_state:parsed
    });
    if(error){
      if(error.code==='23505'){imports.push({key,alreadySaved:true});continue;}
      throw error;
    }
    // Intencionalmente NUNCA remover localStorage: o original é a cópia de segurança.
    imports.push({key,alreadySaved:false});
  }
  return imports;
}
