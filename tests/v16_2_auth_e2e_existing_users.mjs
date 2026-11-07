/** V16.2 live Auth/RLS drill.
 * Read-only queries of PRE-EXISTING two authorized adult accounts with seeded records.
 * Does NOT create users, bypass signup gates, mutate study data or log secrets.
 */
import assert from 'node:assert/strict';
const env=process.env;
if(env.ACADEMY_REAL_AUTH_TEST_APPROVED!=='YES'){
 console.log('SKIP real Auth/RLS: execução exige aprovação explícita e duas contas adultas já homologadas.');
 process.exit(0);
}
const requireEnv=k=>{const v=env[k];if(!v)throw Error('Credencial de homologação ausente: '+k);return v;};
const base=requireEnv('ACADEMY_TEST_SUPABASE_URL').replace(/\/+$/,'');
const publicKey=requireEnv('ACADEMY_TEST_PUBLISHABLE_KEY');
if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(base)||!/^(sb_publishable_|eyJ)/.test(publicKey))
 throw Error('Projeto de homologação ou chave publicável inválidos.');
const shared={apikey:publicKey,'Content-Type':'application/json'};
const safeFetch=async (path,opt={})=>{
 const response=await fetch(base+path,{...opt,signal:AbortSignal.timeout(12000)});
 const body=await response.json().catch(()=>null);
 if(!response.ok)throw Error('Requisição de homologação falhou: '+response.status);
 return body;
};
async function login(email,password){
 const body=await safeFetch('/auth/v1/token?grant_type=password',{
  method:'POST',headers:shared,body:JSON.stringify({email,password})
 });
 if(!body?.access_token)throw Error('Sessão não criada; nenhuma conta será modificada.');
 const token=body.access_token;
 const user=await safeFetch('/auth/v1/user',{headers:{apikey:publicKey,Authorization:'Bearer '+token}});
 if(!user?.id||!user.email_confirmed_at||user.is_anonymous===true||user.app_metadata?.academy_adult_verified!==true)
  throw Error('Conta sem autorização administrativa adulta ou e-mail confirmado.');
 return {user,token};
}
const records=async(session,studentId)=>{
 const query='?user_id=eq.'+encodeURIComponent(studentId)+'&select=user_id,record_key&limit=3';
 const rows=await safeFetch('/rest/v1/academy_private_records'+query,{
  headers:{apikey:publicKey,Authorization:'Bearer '+session.token}
 });
 if(!Array.isArray(rows))throw Error('RLS não retornou conjunto JSON válido.');
 return rows;
};
let a=null,b=null;
try{
 a=await login(requireEnv('ACADEMY_TEST_A_EMAIL'),requireEnv('ACADEMY_TEST_A_PASSWORD'));
 b=await login(requireEnv('ACADEMY_TEST_B_EMAIL'),requireEnv('ACADEMY_TEST_B_PASSWORD'));
 assert.notEqual(a.user.id,b.user.id,'Contas precisam ser distintas.');
 const [ownA,ownB,otherA,otherB]=await Promise.all([
  records(a,a.user.id),records(b,b.user.id),records(a,b.user.id),records(b,a.user.id)
 ]);
 if(!ownA.length||!ownB.length)
  throw Error('INCONCLUSIVO: prepare previamente ao menos um registro privado por conta adulta em homologação.');
 assert(ownA.every(row=>row.user_id===a.user.id));
 assert(ownB.every(row=>row.user_id===b.user.id));
 assert.equal(otherA.length,0,'Usuário A conseguiu ler registro privado de B.');
 assert.equal(otherB.length,0,'Usuário B conseguiu ler registro privado de A.');
 console.log('PASS AUTH/RLS REAL: duas sessões adultas autorizadas, dados próprios e acessos cruzados negados.');
}finally{
 for(const session of [a,b]){
  if(!session?.token)continue;
  try{
   await fetch(base+'/auth/v1/logout',{
    method:'POST',
    headers:{apikey:publicKey,Authorization:'Bearer '+session.token},
    signal:AbortSignal.timeout(5000)
   });
  }catch{}
 }
}
