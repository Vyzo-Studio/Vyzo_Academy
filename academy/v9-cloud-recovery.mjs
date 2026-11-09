/** V16.3 — Não substituir silenciosamente uma versão local de estudante.
 * A interface controla a decisão; esta camada cuida somente de integridade.
 */
export function inspectCloudCache(localRaw,remotePayload){
 const remoteRaw=JSON.stringify(remotePayload);
 if(typeof remoteRaw!=='string')throw Error('Snapshot remoto inválido.');
 if(localRaw===null)return {action:'adopt',localRaw:null,remoteRaw};
 if(typeof localRaw!=='string')throw Error('Cache privado inválido.');
 if(localRaw===remoteRaw)return {action:'identical',localRaw,remoteRaw};
 return {action:'conflict',localRaw,remoteRaw};
}
export function adoptCloudCache(storage,key,decision,backupId){
 if(!/^vyzo-academy-v9-account-[a-f0-9-]{36}$/i.test(key))
  throw Error('Chave de estudante inválida.');
 if(!decision||!['adopt','identical','conflict'].includes(decision.action))
  throw Error('Decisão de sincronização inválida.');
 const now=storage.getItem(key);
 if(now!==decision.localRaw)
  throw Error('O cache foi alterado por outra aba; nenhum progresso foi substituído.');
 if(decision.action==='identical')return null;
 let archiveKey=null;
 if(decision.action==='conflict'){
  if(typeof backupId!=='string'||!(/^[a-f0-9-]{36}$/i.test(backupId)))
   throw Error('Identificador de backup inválido.');
  archiveKey=key+'-backup-'+backupId;
  if(storage.getItem(archiveKey)!==null)
   throw Error('O backup já existe; nenhuma gravação foi realizada.');
  storage.setItem(archiveKey,decision.localRaw);
  if(storage.getItem(archiveKey)!==decision.localRaw)
   throw Error('O backup não pôde ser confirmado. Cache original preservado.');
 }
 storage.setItem(key,decision.remoteRaw);
 if(storage.getItem(key)!==decision.remoteRaw)
  throw Error('A cópia da nuvem não pôde ser confirmada.');
 return archiveKey;
}
