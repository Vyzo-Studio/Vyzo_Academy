/** Dados privados: histórico antigo íntegro e snapshots ativos por usuário. Nunca usa service_role. */
import {getVerifiedStudent,importLegacyWithConsent,scanLegacySources,LEGACY_SOURCES} from './v12-auth-core.mjs';
export {scanLegacySources,LEGACY_SOURCES};
const KEYMAP=Object.freeze({
 'vyzo-academy-v9-guest-1':'v9_current_state',
 'enem-intelligence-v2':'classic_current_state',
 'enem-intelligence-v1':'classic_v1_state'
});
const goodRecord=k=>Object.prototype.hasOwnProperty.call(KEYMAP,k);
async function owner(client,expectedId){
 const u=await getVerifiedStudent(client);
 if(!u||u.id!==expectedId)throw Error('Sessão alterada. Operação bloqueada para proteger seus dados.');
 return u.id;
}
export async function readSnapshot(client,userId,source){
 if(!goodRecord(source))throw Error('Origem desconhecida.');
 await owner(client,userId);
 const {data,error}=await client.from('academy_private_records').select('payload,revision,updated_at')
 .eq('user_id',userId).eq('record_key',KEYMAP[source]).maybeSingle();
 if(error)throw error;return data||null;
}
export async function listHistory(client,userId){
 await owner(client,userId);
 const {data,error}=await client.from('academy_legacy_imports')
  .select('id,source_key,imported_at,fingerprint').eq('user_id',userId)
  .order('imported_at',{ascending:false}).limit(80);
 if(error)throw error;return data||[];
}
export async function readHistoryArchive(client,userId,id){
 await owner(client,userId);
 const {data,error}=await client.from('academy_legacy_imports')
  .select('original_state,source_key').eq('user_id',userId).eq('id',id).single();
 if(error)throw error;return data;
}
export async function importForAccount({client,storage,user,keys,confirmed}){
 const id=await owner(client,user?.id);
 const results=await importLegacyWithConsent({client,storage,user,keys,confirmed});
 for(const entry of results){
  if(!goodRecord(entry.key))continue;
  await owner(client,id);
  const existing=await readSnapshot(client,id,entry.key);
  if(existing){entry.activeAlreadyExists=true;continue;} // Nunca sobrescrever o progresso na nuvem.
  const source=LEGACY_SOURCES.find(s=>s.key===entry.key);
  const {validateLegacyRecord}=await import('./v12-auth-core.mjs');
  const payload=validateLegacyRecord(source,storage.getItem(entry.key));
  const {error}=await client.from('academy_private_records').insert({
   user_id:id,record_key:KEYMAP[entry.key],payload,revision:1
  });
  if(error&&error.code!=='23505')throw error;
  entry.activeCreated=!error;
 }
 return results;
}
export function downloadSnapshot(data,name='VYZO_ACADEMY_NUVEM.json'){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
