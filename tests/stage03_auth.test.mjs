import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isVerifiedStudent,scanLegacySources} from '../academy/v12-auth-core.mjs';
import {importForAccount,readSnapshot,listHistory} from '../academy/cloud-snapshot.mjs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const userA={id:'a0a0a0a0-0000-4000-8000-000000000001',email:'adult-a@example.invalid',email_confirmed_at:'2026-11-07T10:00:00Z',is_anonymous:false,app_metadata:{academy_adult_verified:true}};
const userB={id:'b0b0b0b0-0000-4000-8000-000000000002',email:'adult-b@example.invalid',email_confirmed_at:'2026-11-07T10:00:00Z',is_anonymous:false,app_metadata:{academy_adult_verified:true}};
assert(isVerifiedStudent(userA));
assert(!isVerifiedStudent({...userA,email_confirmed_at:null}));
assert(!isVerifiedStudent({...userA,is_anonymous:true}));
assert(!isVerifiedStudent({...userA,app_metadata:{}}));
assert(!isVerifiedStudent({...userA,user_metadata:{academy_adult_verified:true},app_metadata:{}}));
const store=new Map([
 ['enem-intelligence-v2',JSON.stringify({schema:2,history:[{id:'exam-1',answers:{q:2}}],essay:{text:'Exemplo de redação'},seenIds:['q']})],
 ['vyzo-academy-v9-guest-1',JSON.stringify({schema:9,revision:4,goals:[{id:'goal-1'}],assessments:[{id:'assessment-1',answers:{q:1}}],tasks:[{id:'plan-1'}],profile:{minutes:60},revisions:[{id:'review-1'}]})]
]);
const storage={getItem:key=>store.get(key)||null};
const sources=scanLegacySources(storage);
assert.equal(sources.length,2);
let current=userA;
const archive=[],records=[];
const client={
 auth:{getUser:async()=>({data:{user:current},error:null})},
 from(name){
  const table=name==='academy_legacy_imports'?archive:name==='academy_private_records'?records:null;
  assert(table,'Unexpected table '+name);
  const filters=[];
  const chain={
   eq(k,v){filters.push([k,v]);return this;},
   order(){return this;},
   limit:async()=>({data:table.filter(r=>filters.every(([k,v])=>r[k]===v)),error:null}),
   maybeSingle:async()=>({data:table.find(r=>filters.every(([k,v])=>r[k]===v))||null,error:null}),
   single:async()=>({data:table.find(r=>filters.every(([k,v])=>r[k]===v))||null,error:null})
  };
  return {
   select(){return chain;},
   insert:async row=>{
    if(name==='academy_legacy_imports')table.push({...row,id:'archive-'+(table.length+1),imported_at:new Date().toISOString()});
    else table.push({...row,id:'private-'+(table.length+1)});
    return {error:null};
   }
  };
 }
};
await assert.rejects(()=>importForAccount({client,storage,user:userA,keys:[sources[0].key],confirmed:false}),/confirmar/);
const first=await importForAccount({client,storage,user:userA,keys:sources.map(x=>x.key),confirmed:true});
assert.equal(first.length,2);
assert.equal(archive.length,2,'Each original preserved as private archive');
assert.equal(records.length,2,'V9 and classic active snapshots created');
assert.equal((await readSnapshot(client,userA.id,'vyzo-academy-v9-guest-1')).payload.assessments[0].answers.q,1);
const second=await importForAccount({client,storage,user:userA,keys:sources.map(x=>x.key),confirmed:true});
assert(second.every(x=>x.alreadySaved&&x.activeAlreadyExists));
assert.equal(records.length,2,'No active overwrites');
assert.equal(archive.length,2,'Idempotent imports');
assert.equal((await listHistory(client,userA.id)).length,2);
current=userB;
await assert.rejects(()=>readSnapshot(client,userA.id,'vyzo-academy-v9-guest-1'),/conta ativa mudou|Sessão alterada/i);
await assert.rejects(()=>importForAccount({client,storage,user:userA,keys:['vyzo-academy-v9-guest-1'],confirmed:true}),/conta ativa mudou|Sessão alterada/i);
const app=read('academy/app.mjs');
const config=read('academy/config.js');
const v9=read('academy/v9.mjs');
const cloud=read('academy/v9-cloud-gate.mjs');
const gate=read('supabase/migrations/202611070003_stage03_registration_gate.sql');
for(const token of ['signUp(','signInWithPassword(','resetPasswordForEmail(','updateUser(','signOut(','persistSession:true'])assert(app.includes(token),'Missing Auth flow: '+token);
assert(app.includes('erasePrivateState()')&&app.includes('mountAccountImport'),'Account isolation and import UI');
assert.match(config,/registrationEnabled:\s*false/);
assert.match(config,/url:\s*''/);
assert.match(config,/publishableKey:\s*''/);
assert.match(config,/registrationEnabled:false/);
assert(!/sb_secret_/.test(config));
assert(v9.includes("const KEY='vyzo-academy-v9-guest-1'")&&v9.includes('window.VYZO_V9_CLOUD?.queue(state)'));
assert(cloud.includes("auth.getUser()")&&cloud.includes(".eq('revision',version)"));
assert(gate.includes('registration_gate')&&gate.includes('guard_signup')&&gate.includes('vyzo_adult_attested'));
console.log('PASS stage03 unit: Auth flows staged, consent, V9/classic imports, idempotence, account isolation, closed server gate.');
