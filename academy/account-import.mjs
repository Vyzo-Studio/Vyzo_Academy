/** UI isolada: arquivo de estudo é importado somente com consentimento e conta verificada. */
import {scanLegacySources,importForAccount,listHistory,readHistoryArchive,downloadSnapshot} from './cloud-snapshot.mjs';
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function mountAccountImport(client,user,isCurrent){
 if(!user||!isCurrent())return;
 const host=document.querySelector('#main-view');
 const old=document.getElementById('account-import-panel');if(old)old.remove();
 const section=document.createElement('section');section.id='account-import-panel';section.className='card';
 section.style.marginTop='20px';
 const safeStorage={
  getItem(key){
   try{const raw=localStorage.getItem(key);if(raw!==null)return raw;}catch{}
   try{return sessionStorage.getItem(key);}catch{return null;}
  }
 };
 const sources=scanLegacySources(safeStorage);
 section.innerHTML='<h2>Importar meus backups anteriores</h2><p>Seus dados do simulador clássico e da jornada V9 nunca são enviados automaticamente. A cópia não remove os originais.</p>'
 +'<form class="form" id="form-import-legacy"><div class="stack" id="legacy-source-list"></div>'
 +'<label class="small"><input type="checkbox" name="confirmed" required> Confirmo que esses dados locais pertencem a mim e autorizo copiá-los para a conta <strong>'+escapeHtml(user.email)+'</strong>.</label>'
 +'<button class="btn" type="submit">Copiar para minha conta</button></form><div class="divider"></div>'
 +'<h3>Arquivos guardados na nuvem</h3><div id="legacy-archives"></div><p class="small muted">Não substituirá progresso de outros dispositivos sem confirmação específica.</p>';
 const list=section.querySelector('#legacy-source-list');
 for(const source of sources){
  const label=document.createElement('label');label.className='checkbox-set';
  const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.name='source';checkbox.value=source.key;checkbox.disabled=Boolean(source.blocked);
  const desc=document.createElement('span');desc.textContent=source.name+(source.blocked?' · '+source.reason:' · '+(source.records||0)+' registros');
  label.append(checkbox,desc);list.append(label);
 }
 if(!sources.length)list.textContent='Nenhum arquivo local compatível foi encontrado neste navegador.';
 async function showArchives(){
  const archives=await listHistory(client,user.id);if(!isCurrent())return;
  const display=section.querySelector('#legacy-archives');display.replaceChildren();
  if(!archives.length){display.textContent='Nenhuma importação registrada nesta conta.';return;}
  for(const item of archives){
   const row=document.createElement('div');row.className='goal-row';
   const name=document.createElement('strong');name.textContent=item.source_key;
   const time=document.createElement('p');time.className='small muted';time.textContent=new Date(item.imported_at).toLocaleString('pt-BR');
   const download=document.createElement('button');download.type='button';download.className='btn secondary';download.textContent='Baixar cópia';
   download.addEventListener('click',async()=>{
    if(!isCurrent())return;
    try{const archive=await readHistoryArchive(client,user.id,item.id);
     if(!isCurrent())return;
     downloadSnapshot(archive.original_state,'VYZO_ACADEMY_'+item.source_key+'.json');
    }catch(err){alert('Não foi possível baixar a cópia. Confira sua sessão.');}
   });
   row.append(name,time,download);display.append(row);
  }
 }
 section.querySelector('form').addEventListener('submit',async event=>{
  event.preventDefault();if(!isCurrent())return;
  const form=event.currentTarget,fd=new FormData(form),keys=fd.getAll('source').map(String);
  if(!fd.get('confirmed')||!keys.length){alert('Selecione os dados e confirme sua autorização.');return;}
  const button=form.querySelector('button[type="submit"]');button.disabled=true;
  try{
   const results=await importForAccount({client,storage:safeStorage,user,keys,confirmed:true});
   if(!isCurrent())return;
   await showArchives();
   const message=results.some(x=>x.activeAlreadyExists)?
    'Backup guardado. Havia progresso ativo na nuvem; ele não foi substituído.':
    'Importação concluída sem apagar o histórico local.';
   const status=document.createElement('p');status.role='status';status.textContent=message;form.append(status);
  }catch(error){alert('A importação falhou. Os arquivos locais permanecem intactos.');}
  finally{button.disabled=false;}
 });
 await showArchives();
 if(isCurrent())host.append(section);
}
