/** Inicializador V9 cloud: conteúdo privado só é carregado após auth.getUser() real. */
import {isVerifiedStudent} from './v12-auth-core.mjs';
const cfg=window.VYZO_ACADEMY_CLOUD||{};
const url='https://cfrlqinzsysoqcduqftd.supabase.co';
const configured=cfg.url===url&&/^sb_publishable_[a-zA-Z0-9_-]+$/.test(cfg.publishableKey||'');
const view=document.getElementById('v9-content');
function deny(message){
 document.querySelectorAll('.v9-nav, .v9-top-actions').forEach(el=>el.hidden=true);
 if(view)view.innerHTML='<section class="v9-card"><h1>Acesso à jornada em nuvem</h1><p>'+message+'</p><p><a class="btn" href="./?auth=login">Entrar na minha conta</a></p><p><a href="./v9.html">Continuar no modo local (sem sincronização)</a></p></section>';
}
if(!configured){deny('A conexão dedicada não está configurada. Nenhuma senha será solicitada nesta tela.');}
else{
 try{
  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm');
  const client=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data,error}=await client.auth.getUser();
  const user=!error&&isVerifiedStudent(data?.user)?data.user:null;
  if(!user){deny('Confirme seu e-mail e entre na sua conta antes de abrir os estudos sincronizados.');}
  else{
   const scopedKey='vyzo-academy-v9-account-'+user.id;
   const {data:remote,error:readError}=await client.from('academy_private_records')
    .select('payload,revision').eq('user_id',user.id).eq('record_key','v9_current_state').maybeSingle();
   if(readError)throw readError;
   let version=remote?.revision??0,invalid=false;
   if(remote){
    const p=remote.payload;
    if(p?.schema!==9||!Array.isArray(p.goals)||!Array.isArray(p.assessments)||!Array.isArray(p.tasks))throw Error('Snapshot remoto incompatível: preserve o backup, sem sobrescrever.');
    try{
     const cached=localStorage.getItem(scopedKey);
     if(cached&&cached!==JSON.stringify(p))
      localStorage.setItem(scopedKey+'-backup-'+Date.now(),cached);
     localStorage.setItem(scopedKey,JSON.stringify(p));
    }catch{throw Error('Não foi possível proteger o cache deste usuário. Exporte o backup local antes de continuar.');}
   }
   const status=document.querySelector('.v9-guest-label');
   const note=document.querySelector('.v9-notice');
   if(status){status.textContent='Conta verificada · sincronização privada';status.title='Progresso vinculado apenas à sua conta';}
   if(note)note.innerHTML='<b>Sincronização privada:</b> seus dados são enviados para o Supabase da VYZO ACADEMY. Acesse a conta em outro dispositivo para recuperá-los. <a href="./">Minha conta</a>.';
   let pending=null,running=false,blocked=false;
   async function send(snapshot){
    const verified=await client.auth.getUser();
    if(verified.error||verified.data?.user?.id!==user.id)throw Error('A conta ativa mudou. Sincronização interrompida.');
    if(!version){
     const {error}=await client.from('academy_private_records').insert({
      user_id:user.id,record_key:'v9_current_state',payload:snapshot,revision:1
     });
     if(error)throw error;
     version=1;return;
    }
    const {data,error}=await client.from('academy_private_records').update({
     payload:snapshot,revision:version+1,updated_at:new Date().toISOString()
    }).eq('user_id',user.id).eq('record_key','v9_current_state').eq('revision',version)
    .select('revision').maybeSingle();
    if(error)throw error;
    if(!data)throw Error('Conflito com outro dispositivo: nenhuma informação foi sobrescrita. Exporte seu backup e recarregue.');
    version=data.revision;
   }
   async function flush(){
    if(running||blocked||!pending)return;
    running=true;
    try{
     while(pending){
      const content=pending;pending=null;await send(content);
      if(status)status.textContent='Conta verificada · salvo na nuvem';
     }
    }catch(err){
     pending=pending||JSON.parse(localStorage.getItem(scopedKey)||'null');
     blocked=/Conflito|conta ativa mudou|23505/.test(String(err.message||err));
     if(status){status.textContent=blocked?'Conflito: exporte seu backup':'Nuvem offline: backup local preservado';status.title=String(err.message||err);}
    }finally{running=false;}
   }
   window.VYZO_V9_CLOUD=Object.freeze({
    userId:user.id,storageKey:scopedKey,
    queue(snapshot){pending=structuredClone(snapshot);void flush();},
    flush
   });
   window.addEventListener('online',()=>void flush());
   client.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_OUT'||event==='SIGNED_IN'&&session?.user?.id!==user.id){
     window.VYZO_V9_CLOUD=null;
     if(view)view.replaceChildren();
     location.replace('./?auth=login');
    }
   });
   await import('./v9.mjs');
  }
 }catch(err){deny('Não foi possível verificar sua sessão ou carregar a jornada. Tente novamente pelo portal.');}
}
