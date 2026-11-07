import {generateSchedule,verifySchedule,WEEKDAYS,validMinutes} from './scheduler.mjs';
import {evaluateDiagnostic,selectDiagnosticQuestions} from './diagnostics.mjs';
import {scanLegacySources,importForAccount,listHistory,readSnapshot,readHistoryArchive,downloadSnapshot} from './cloud-snapshot.mjs';
import {getVerifiedStudent} from './v12-auth-core.mjs';
import {mountAccountImport} from './account-import.mjs';

/* VYZO ACADEMY — V8.0.1: cliente cloud. Não contém credenciais privilegiadas. */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const cfg=window.VYZO_ACADEMY_CLOUD||{};
const publicUrl=location.origin+location.pathname;
const examTypes=['ENEM','Vestibular','Concurso federal','Concurso estadual','Concurso municipal','Concurso militar','Certificação','Prova escolar','Personalizada'];
const colors=['#386fe9','#1c987b','#dc8c36','#8a5fd3','#dc526b','#1e8794','#7757c0'];
const priorities={high:'Alta',medium:'Média',low:'Baixa'};
const statuses={preparing:'Em preparação',diagnostic_pending:'Diagnóstico pendente',active:'Ativa',paused:'Pausada',completed:'Concluída',archived:'Arquivada'};
const BANK=()=>Array.isArray(window.QUESTION_BANK)?window.QUESTION_BANK:[];
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const formatDate=day=>day?new Date(day+'T12:00:00').toLocaleDateString('pt-BR'):'Data não divulgada';
const moneyTime=minutes=>`${Math.floor(minutes/60)?Math.floor(minutes/60)+'h ':''}${minutes%60?minutes%60+'min':''}`.trim()||'0min';
const week=(dt)=>{const d=new Date(dt);d.setHours(12,0,0,0);return d;};
const fmtClock=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
const safeExternalUrl=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}};
const configReady=()=>/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(String(cfg.url||'')) && (/^sb_publishable_/.test(String(cfg.publishableKey||''))||/^eyJ/.test(String(cfg.publishableKey||'')));
const data={client:null,user:null,profile:null,archives:[],goals:[],diagnostics:[],tasks:[],essays:[],page:'home',activeGoalId:null,activeDiagnostic:null,questionPosition:0,authTab:'login',onboard:1,selectedTypes:[],calendarView:'week',calendarOffset:0,calendarFilter:'all',recovery:false,busy:false,essayTimer:null,essayPending:null,lastSync:null};
let authGeneration=0;
function erasePrivateState(){
 authGeneration++;clearTimeout(data.essayTimer);data.essayPending=null;data.activeEssay=null;
 data.user=null;data.profile=null;data.goals=[];data.diagnostics=[];data.tasks=[];
 data.essays=[];data.archives=[];data.activeGoalId=null;data.activeDiagnostic=null;
 data.questionPosition=0;data.onboard=1;data.lastSync=null;
}
function say(message,type='info'){
 const el=$('#toast');el.textContent=message;el.dataset.type=type;
}
function setStatus(message){$('#cloud-status').textContent=message;}
function busy(value){data.busy=value;document.querySelectorAll('button[type="submit"]').forEach(b=>b.disabled=value);}
function main(html){$('#main-view').innerHTML=html;}
function head(title,intro='',action=''){return `<div class="page-head"><div><div class="eyebrow">VYZO ACADEMY · SUA JORNADA</div><h1>${esc(title)}</h1><p class="lede">${esc(intro)}</p></div>${action}</div>`;}
function field(label,name,type='text',value='',extra='') {return `<div class="field"><label for="f-${name}">${esc(label)}</label><input id="f-${name}" name="${esc(name)}" type="${type}" value="${esc(value)}" ${extra}></div>`;}
function options(arr,selected){return arr.map(x=>`<option value="${esc(x)}" ${String(x)===String(selected)?'selected':''}>${esc(x)}</option>`).join('');}
function notifyError(error,action='Operação'){
 const msg=String(error?.message||error||'');
 console.error(action, error?.code||error?.name||'falha'); // Sem dados pessoais ou credenciais
 if(/fetch|network|networkerror/i.test(msg))say('Falha de conexão. Confira a internet e tente novamente.','error');
 else if(/row-level|permission|policy|relation.*does not exist|schema cache/i.test(msg))say('O banco da plataforma não está pronto ou sua sessão não tem autorização. Contate o administrador.','error');
 else say(`${action} não foi concluída. ${msg.length<180?msg:'Tente novamente.'}`,'error');
}
function nav(){const show=!!data.user && !!data.user.email_confirmed_at && !!data.profile?.onboarding_complete;$('#app-nav').hidden=!show||window.matchMedia('(max-width:740px)').matches;$('#mobile-menu').setAttribute('aria-expanded','false');$('#mobile-nav').hidden=!show;document.querySelectorAll('[data-page]').forEach(e=>e.classList.toggle('active',e.dataset.page===data.page));}
function go(page){
 if(data.essayPending){saveEssayDraft().catch(e=>notifyError(e,'Salvamento da redação'));}
 data.page=page;nav();render();window.scrollTo({top:0,behavior:'instant'});
}
function disableUI(reason){
 nav();
 main(`<section class="auth-shell" style="max-width:750px"><div class="card stack">
  <div class="eyebrow">VYZO ACADEMY V8 · ACESSO DOS ESTUDANTES</div>
  <h1>Crie sua conta e organize seus estudos.</h1>
  <p class="lede">A nova área terá login, várias provas por estudante, questionários diagnósticos e planejamento pessoal.</p>
  <div class="callout warning" role="status"><strong>Cadastro ainda indisponível.</strong> ${esc(reason)} Os formulários abaixo são apenas uma prévia e não aceitam dados pessoais.</div>
  <div class="auth-tabs" role="tablist" aria-label="Funcionalidades previstas para a conta"><button type="button" class="active" disabled aria-selected="true">Criar conta</button><button type="button" disabled>Entrar</button><button type="button" disabled>Esqueci a senha</button></div>
  <form class="form" aria-label="Prévia desativada do cadastro"><fieldset disabled style="border:0;margin:0;padding:0;display:grid;gap:12px;min-width:0">
   <div class="field"><label for="preview-name">Nome para exibição</label><input id="preview-name" type="text" placeholder="Seu nome" autocomplete="off"></div>
   <div class="field"><label for="preview-email">E-mail</label><input id="preview-email" type="email" placeholder="voce@exemplo.com" autocomplete="off"></div>
   <div class="field"><label for="preview-password">Senha</label><input id="preview-password" type="password" placeholder="Mínimo de 12 caracteres" autocomplete="off"></div>
   <button type="button" class="btn" disabled>Criar minha conta — ativação pendente</button>
  </fieldset></form>
  <div class="divider"></div>
  <h2>Quer experimentar um questionário agora?</h2>
  <p class="muted">A demonstração pública permite responder a 10 questões autorais e ver a correção, sem criar conta. Ela não salva respostas nem substitui o diagnóstico individual.</p>
  <div class="row"><a class="btn" href="./v9.html">Começar questionário, diagnóstico e plano V9</a><a class="btn secondary" href="./demo.html">Amostra de 10 questões</a><a class="btn secondary" href="../index.html?classic=1">Simulados completos existentes</a></div>
  <p class="small muted">Quando um Supabase dedicado for configurado e testado, os formulários reais de cadastro e os diagnósticos por prova serão liberados automaticamente. Nenhuma senha será recebida ou armazenada nesta prévia.</p>
 </div></section>`);
}
async function setup(){
 if(!configReady()){setStatus('Nuvem não configurada');disableUI('As credenciais públicas do projeto exclusivo ainda não foram configuradas em academy/config.js.');return;}
 try{
   const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm');
   data.client=createClient(cfg.url,cfg.publishableKey,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
   data.client.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT'||event==='SIGNED_IN'&&data.user&&session?.user?.id!==data.user.id){erasePrivateState();data.authTab='login';renderAuth();}
     if(event==='PASSWORD_RECOVERY'){data.recovery=true;setTimeout(()=>{data.authTab='reset';renderAuth();},0);return;}
     if(['SIGNED_IN','SIGNED_OUT','USER_UPDATED','TOKEN_REFRESHED'].includes(event))setTimeout(()=>bootstrap().catch(e=>notifyError(e,'Restauração de sessão')),0);
   });
   await bootstrap();
 }catch(e){setStatus('Conexão indisponível');disableUI('Não foi possível carregar o provedor de autenticação de forma segura.');}
}
async function bootstrap(){
 let generation=++authGeneration;
 const {data:result,error}=await data.client.auth.getUser();
 if(generation!==authGeneration)return;
 if(error||!result?.user){erasePrivateState();setStatus('Conta necessária');renderAuth();return;}
 if(data.user&&data.user.id!==result.user.id){erasePrivateState();generation=authGeneration;}
 data.user=result.user;
 if(!data.user.email_confirmed_at||data.user.is_anonymous){setStatus('Verifique seu e-mail');renderUnverified();return;}
 const identity=data.user.id;
 setStatus('Sincronizando...');
 await loadData(identity);
 if(generation!==authGeneration||data.user?.id!==identity)return;
 setStatus('Conectado à nuvem');
 if(!data.profile?.onboarding_complete){renderOnboarding();return;}
 nav();render();
}
async function loadTable(table,columns='*',ownerId=data.user?.id){
 if(!ownerId)throw Error('Sessão ausente.');
 const {data:rows,error}=await data.client.from(table).select(columns).eq('user_id',ownerId);
 if(error)throw error;return rows||[];
}
async function loadData(identity=data.user?.id){
 if(!identity)throw Error('Sessão ausente.');
 const [profiles,goals,diagnostics,tasks,essays]=await Promise.all([
  loadTable('academy_profiles','*',identity),loadTable('academy_goals','*',identity),
  loadTable('academy_diagnostics','*',identity),loadTable('academy_study_tasks','*',identity),
  loadTable('academy_essays','*',identity)
 ]);
 const fresh=await getVerifiedStudent(data.client);
 if(!fresh||fresh.id!==identity||data.user?.id!==identity)throw Error('A conta ativa mudou durante o carregamento.');
 data.profile=profiles[0]||null;data.goals=goals;data.diagnostics=diagnostics;
 data.tasks=tasks.sort((a,b)=>String(a.day).localeCompare(String(b.day)));
 data.essays=essays;
 if(!data.profile){
  const name=String(data.user.user_metadata?.display_name||'Estudante').slice(0,100);
  const accepted=data.user.user_metadata?.terms_accepted_at;
  const {data:newProfile,error}=await data.client.from('academy_profiles').insert({user_id:identity,display_name:name,terms_accepted_at:accepted&&Number.isFinite(Date.parse(accepted))?accepted:null}).select().single();
  if(error)throw error;data.profile=newProfile;
 }
 data.archives=await listHistory(data.client,identity);
 data.lastSync=new Date();
}
async function put(table,payload,filter){
 let q=data.client.from(table);
 if(filter){q=q.update(payload).eq('user_id',data.user.id).eq('id',filter);}else{q=q.insert({...payload,user_id:data.user.id});}
 const {data:response,error}=await q.select().single();if(error)throw error;return response;
}
async function saveProfile(payload){
 const {data:profile,error}=await data.client.from('academy_profiles').update({...payload,updated_at:new Date().toISOString()}).eq('user_id',data.user.id).select().single();
 if(error)throw error;data.profile=profile;return profile;
}
function authView(){return `<div class="auth-shell"><div class="card stack"><div class="eyebrow">VYZO ACADEMY • ACESSO SEGURO</div><h1>Seu espaço de aprendizagem</h1><p class="muted">Suas provas, redações e planos ficam em uma conta pessoal.</p>
 <div class="auth-tabs" role="tablist" aria-label="Opções de autenticação">
  ${[['signup','Criar conta'],['login','Entrar'],['forgot','Esqueci a senha']].map(([k,v])=>`<button type="button" data-auth-tab="${k}" role="tab" aria-selected="${data.authTab===k}" class="${data.authTab===k?'active':''}">${v}</button>`).join('')}
 </div>
 ${data.authTab==='signup'&&!cfg.registrationEnabled?`<div class="callout warning"><strong>Inscrições temporariamente fechadas.</strong> A confirmação de e-mail e a proteção etária ainda estão em homologação. Contas de menores não são permitidas. Se já possui conta, escolha Entrar.</div>`:data.authTab==='signup'?`<form class="form" id="form-signup">
 ${field('Nome para exibição','display_name','text','','required minlength="2" maxlength="100" autocomplete="name"')}
 ${field('E-mail','email','email','','required autocomplete="email"')}
 <div class="field"><label for="f-password">Senha (mínimo de 12 caracteres)</label><div class="password-line"><input id="f-password" type="password" name="password" minlength="12" maxlength="128" required autocomplete="new-password"><button type="button" data-action="reveal" data-target="f-password" aria-label="Mostrar ou ocultar senha">Mostrar</button></div><small>Use uma senha longa, difícil de adivinhar, com letras, números e símbolos.</small></div>
 <div class="field"><label for="f-confirm">Confirmar senha</label><div class="password-line"><input id="f-confirm" type="password" name="confirm" minlength="12" required autocomplete="new-password"><button type="button" data-action="reveal" data-target="f-confirm">Mostrar</button></div></div>
 <label class="small"><input type="checkbox" name="adult" required> Confirmo que tenho 18 anos ou mais. O cadastro de menores está indisponível.</label>
 <label class="small"><input type="checkbox" name="accepted" required> Li e aceito os <a target="_blank" rel="noopener" href="./termos.html">termos de uso</a> e a <a href="../privacidade.html" target="_blank" rel="noopener">política de privacidade</a>.</label><button type="submit" class="btn">Criar conta</button></form>`:
 data.authTab==='login'?`<form class="form" id="form-login">${field('E-mail','email','email','','required autocomplete="email"')}
 <div class="field"><label for="f-password">Senha</label><div class="password-line"><input id="f-password" type="password" name="password" required autocomplete="current-password"><button type="button" data-action="reveal" data-target="f-password">Mostrar</button></div></div><button type="submit" class="btn">Entrar</button></form>`:
 data.authTab==='reset'?`<form class="form" id="form-reset"><div class="callout good">Defina sua nova senha para recuperar o acesso à conta.</div><div class="field"><label for="f-password">Nova senha</label><input id="f-password" type="password" name="password" minlength="12" required autocomplete="new-password"></div><button type="submit" class="btn">Salvar nova senha</button></form>`:
 `<form class="form" id="form-forgot">${field('E-mail cadastrado','email','email','','required autocomplete="email"')}<p class="small muted">Por segurança, a confirmação é igual para e-mails cadastrados ou não.</p><button type="submit" class="btn">Enviar link de recuperação</button></form>`}
 <p class="auth-note">A senha é processada apenas pelo provedor de autenticação. Não é armazenada no banco de perfis nem em backups de estudo.</p></div></div>`;}
function renderAuth(){nav();main(authView());}
function renderUnverified(){nav();main(`<section class="auth-shell"><div class="card stack"><h1>Confirme seu e-mail</h1><p>Enviamos um link de verificação ao endereço utilizado no cadastro. Confirme a conta antes de acessar seus dados privados.</p><button class="btn" data-action="resend-email">Reenviar confirmação</button><button class="btn secondary" data-action="logout">Voltar ao login</button></div></section>`);}
async function handleAuth(form){
 const type=form.id,fd=new FormData(form),email=String(fd.get('email')||'').trim();
 if(data.busy)return;busy(true);
 try{
 if(type==='form-signup'){
   if(!cfg.registrationEnabled)throw Error('Inscrições indisponíveis até homologação.');
   if(fd.get('adult')!=='on')throw Error('Cadastro somente para maiores de 18 anos.');
   const pwd=String(fd.get('password')||'');
   if(pwd.length<12||pwd!==fd.get('confirm'))throw Error('As senhas precisam coincidir e ter pelo menos 12 caracteres.');
   if(!fd.get('accepted'))throw Error('Aceite os termos e a política de privacidade.');
   const {error}=await data.client.auth.signUp({email,password:pwd,options:{emailRedirectTo:publicUrl,data:{display_name:String(fd.get('display_name')||'Estudante').slice(0,100),terms_accepted_at:new Date().toISOString(),vyzo_adult_attested:'true'}}});
   if(error)throw error;
   say('Se o cadastro puder ser concluído, você receberá um e-mail de confirmação. Verifique sua caixa de entrada e spam.');
   data.authTab='login';renderAuth();
 }else if(type==='form-login'){
   const {error}=await data.client.auth.signInWithPassword({email,password:String(fd.get('password')||'')});
   if(error)throw Error('Credenciais inválidas ou conta ainda não confirmada.');
   await bootstrap();
 }else if(type==='form-forgot'){
   await data.client.auth.resetPasswordForEmail(email,{redirectTo:publicUrl});
   say('Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.');
 }else if(type==='form-reset'){
   const pwd=String(fd.get('password')||'');if(pwd.length<12)throw Error('Use pelo menos 12 caracteres.');
   const {error}=await data.client.auth.updateUser({password:pwd});if(error)throw error;
   data.recovery=false;data.authTab='login';say('Senha atualizada.');await bootstrap();
 }
 }catch(e){notifyError(e,'Autenticação');}finally{busy(false);}
}
function availableMarkup(availability){const all=availability||{};
 return `<div class="grid cols2">${WEEKDAYS.map((label,i)=>`<div class="field"><label for="min-${i}">${['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][i]}</label><select id="min-${i}" name="minutes_${i}">${[0,30,60,90,120,180,240,300,360].map(m=>`<option value="${m}" ${Number(all[i]??0)===m?'selected':''}>${m===0?'Indisponível':moneyTime(m)}</option>`).join('')}</select></div>`).join('')}</div>`;
}
function parseAvailability(fd){const a={};for(let i=0;i<7;i++)a[String(i)]=validMinutes(fd.get('minutes_'+i));return a;}
function renderOnboarding(){
 nav();const stage=data.onboard;
 let inner='';
 if(stage===1){inner=`<form class="form" id="form-onboard-profile">${field('Como podemos chamar você?','display_name','text',data.profile?.display_name||'','required minlength="2" maxlength="100"')}
 <h3>Quanto tempo você pode estudar por dia?</h3><p class="muted small">Defina o tempo total de todas as provas somadas, não por prova.</p>${availableMarkup(data.profile?.availability)}<button class="btn" type="submit">Continuar: minhas provas</button></form>`;}
 else if(stage===2){inner=`<div class="stack"><p>Selecione uma ou mais categorias. Depois, você poderá informar os detalhes de cada prova.</p>
 <div class="checkbox-set">${examTypes.map(t=>`<label><input type="checkbox" class="onboard-type" value="${esc(t)}" ${data.selectedTypes.includes(t)?'checked':''}>${esc(t)}</label>`).join('')}</div><div class="row"><button class="btn secondary" data-action="onboard-back">Voltar</button><button class="btn" data-action="onboard-types-next">Continuar</button></div></div>`;}
 else if(stage===3){inner=`<form id="form-onboard-goals" class="form"><p>Informe os dados de cada objetivo. Se a data ainda não foi divulgada, deixe em branco.</p>
 ${data.selectedTypes.map((t,i)=>`<div class="card stack"><h3>${esc(t)}</h3>${field('Nome da prova','name_'+i,'text',t==='ENEM'?'ENEM':'' ,'required minlength="2"')}
 ${field('Instituição ou banca (se souber)','institution_'+i,'text')}
 ${field('Curso, cargo ou objetivo','objective_'+i,'text')}
 ${field('Data da prova (opcional)','date_'+i,'date')}
 ${field('Quais matérias você deseja estudar?','subjects_'+i,'text',t==='ENEM'?'Português,Matemática,História,Geografia,Biologia,Química,Física,Redação':'')}
 <div class="field"><label for="prior-${i}">Prioridade</label><select name="priority_${i}" id="prior-${i}">${options(['medium','high','low'],'medium')}</select></div></div>`).join('')}
 <div class="row"><button type="button" class="btn secondary" data-action="onboard-back">Voltar</button><button class="btn" type="submit">Salvar minhas provas</button></div></form>`;}
 else {inner=`<form class="form" id="form-onboard-final"><h3>Como você prefere aprender?</h3><div class="checkbox-set">${['Videoaulas','Leitura e resumos','Exemplos resolvidos','Questões','Flashcards','Aprendizagem mista'].map(x=>`<label><input type="checkbox" name="pref" value="${esc(x)}">${esc(x)}</label>`).join('')}</div><h3>Quais áreas você acredita serem mais difíceis?</h3><div class="checkbox-set">${['Matemática','Interpretação','Redação','Memorização','Raciocínio lógico','Gestão do tempo'].map(x=>`<label><input type="checkbox" name="difficulty" value="${esc(x)}">${esc(x)}</label>`).join('')}</div><p class="small muted">Essas respostas são percepções pessoais. O diagnóstico será necessário para medir desempenho.</p><button type="submit" class="btn">Concluir e iniciar diagnósticos</button></form>`;}
 main(`<div class="onboarding">${head('Vamos preparar seus estudos para seus objetivos.','Seu primeiro acesso tem quatro etapas. Você pode retomar depois sem perder os dados que já foram salvos.')}
 <div class="stepper">${['Seu perfil','Tipos de prova','Detalhes das provas','Como você aprende'].map((x,i)=>`<span class="step ${i+1===stage?'on':''}">${i+1}. ${x}</span>`).join('')}</div>
 <div class="card">${inner}</div><p class="small muted">Já tem uma prova cadastrada? Ela não será apagada ao retomar este assistente.</p></div>`);
}
async function saveNewGoal(goal){const row=await put('academy_goals',goal);data.goals.push(row);return row;}
async function handleOnboarding(form){if(data.busy)return;busy(true);const fd=new FormData(form);
 try{
 if(form.id==='form-onboard-profile'){
  const name=String(fd.get('display_name')||'').trim();if(name.length<2)throw Error('Informe um nome válido.');
  await saveProfile({display_name:name,availability:parseAvailability(fd)});data.onboard=2;
 }else if(form.id==='form-onboard-goals'){
  for(let i=0;i<data.selectedTypes.length;i++){
   const type=data.selectedTypes[i],name=String(fd.get('name_'+i)||'').trim(),date=String(fd.get('date_'+i)||'').trim();
   if(name.length<2)throw Error('Informe o nome de todas as provas.');
   if(data.goals.some(g=>g.exam_type===type&&g.exam_name===name))continue;
   await saveNewGoal({exam_type:type,exam_name:name,institution:String(fd.get('institution_'+i)||''),objective:String(fd.get('objective_'+i)||''),exam_date:date||null,date_tbd:!date,
    subjects:String(fd.get('subjects_'+i)||'').split(',').map(x=>x.trim()).filter(Boolean),priority:String(fd.get('priority_'+i)||'medium'),status:'diagnostic_pending',
    color:colors[(data.goals.length+i)%colors.length]});
  }data.onboard=4;
 }else if(form.id==='form-onboard-final'){
  await saveProfile({learning_preferences:fd.getAll('pref').map(String),perceived_difficulties:fd.getAll('difficulty').map(String),onboarding_complete:true});
  data.page='diagnostics';
 }
 render();
 }catch(e){notifyError(e,'Configuração inicial');}finally{busy(false);}
}
function activeExamGoals(){return data.goals.filter(g=>g.status!=='archived');}
function goalCard(g){const done=data.diagnostics.filter(d=>d.goal_id===g.id&&d.status==='completed');
 const planned=data.tasks.filter(t=>t.goal_id===g.id&&t.status!=='cancelled'),completed=planned.filter(t=>t.status==='completed').length;
 return `<article class="goal-row"><div class="row between"><div><span class="goal-dot" style="background:${esc(g.color)}"></span><strong>${esc(g.exam_name)}</strong><p class="small muted">${esc(g.exam_type)} · ${esc(g.institution||'Instituição não informada')} · ${formatDate(g.exam_date)}</p></div><span class="badge">${esc(statuses[g.status]||g.status)}</span></div>
 <p class="small">${done.length?'Diagnóstico concluído':'Diagnóstico pendente'} · ${completed}/${planned.length} tarefas concluídas · Prioridade ${esc(priorities[g.priority])}</p>
 <div class="progress-bar" role="progressbar" aria-label="Progresso do plano" aria-valuenow="${planned.length?Math.round(completed/planned.length*100):0}" aria-valuemin="0" aria-valuemax="100"><span style="width:${planned.length?Math.round(completed/planned.length*100):0}%"></span></div>
 <div class="row" style="margin-top:13px"><button class="btn secondary" data-action="goal-open" data-id="${g.id}">Ver planejamento</button>
 <button class="btn ghost" data-action="goal-status" data-id="${g.id}" data-status="${g.status==='paused'?'active':'paused'}">${g.status==='paused'?'Retomar':'Pausar'}</button>
 <button class="btn ghost" data-action="goal-edit" data-id="${g.id}">Editar</button></div></article>`;
}
function renderHome(){const active=activeExamGoals(),pending=data.goals.filter(g=>g.diagnostic_status!=='completed').length,
 tasks=data.tasks.filter(t=>t.day===today()&&t.status==='pending'),done=data.tasks.filter(t=>t.status==='completed').length;
 main(`${head('Seu painel de aprendizagem',`Olá, ${data.profile?.display_name||'estudante'}! Veja seus objetivos e continue do ponto certo.`)}
 <section class="hero"><p class="eyebrow" style="color:#dbe6ff">SEU PRÓXIMO PASSO</p><h1>${pending?'Faça seus diagnósticos iniciais':tasks.length?'Continue o estudo de hoje':'Organize sua próxima atividade'}</h1><p>${pending?`Você tem ${pending} prova(s) aguardando diagnóstico. Cada uma terá um plano independente.`:tasks.length?`${tasks.length} tarefa(s) no calendário de hoje.`:'Crie uma prova, estude e acompanhe sua evolução.'}</p><button class="btn" data-page="${pending?'diagnostics':tasks.length?'calendar':'goals'}">${pending?'Ir aos diagnósticos':tasks.length?'Ver estudos de hoje':'Minhas provas'} →</button></section>
 <div class="grid cols3" style="margin-top:17px"><div class="card"><div class="small muted">Provas cadastradas</div><div class="kpi">${active.length}</div></div><div class="card"><div class="small muted">Diagnósticos pendentes</div><div class="kpi">${pending}</div></div><div class="card"><div class="small muted">Tarefas concluídas</div><div class="kpi">${done}</div></div></div>
 <div class="grid cols2" style="margin-top:18px"><section class="card"><h2>Minhas provas</h2>${active.length?active.slice(0,3).map(goalCard).join(''):'<p>Comece cadastrando seu primeiro objetivo de estudo.</p>'}<button class="btn secondary" data-page="goals">Gerenciar minhas provas</button></section>
 <section class="card"><h2>Hoje no seu calendário</h2>${tasks.length?tasks.map(t=>`<div class="task-row"><b>${esc(t.subject)}</b><p>${esc(t.topic)} · ${moneyTime(t.minutes)}</p><button class="btn secondary" data-action="task-done" data-id="${t.id}">Marcar como estudado</button></div>`).join(''):'<p>Sem tarefas pendentes para hoje.</p>'}<button class="btn secondary" data-page="calendar">Abrir calendário</button></section></div>`);
}
function goalForm(g=null){return `<form class="card form" id="form-goal" ${g?`data-id="${g.id}"`:''}><h2>${g?'Editar prova':'Adicionar uma prova'}</h2>
 <div class="field-row"><div class="field"><label for="goal-type">Tipo de prova</label><select name="exam_type" id="goal-type">${options(examTypes,g?.exam_type||'ENEM')}</select></div>${field('Nome da prova','exam_name','text',g?.exam_name||'','required minlength="2"')}</div>
 <div class="field-row">${field('Instituição','institution','text',g?.institution||'')}${field('Banca organizadora','board','text',g?.board||'')}</div>
 <div class="field-row">${field('Cargo, curso ou objetivo','objective','text',g?.objective||'')}${field('Edição','edition','text',g?.edition||'')}</div>
 <div class="field-row">${field('Data (deixe vazia se não divulgada)','exam_date','date',g?.exam_date||'')}
 <div class="field"><label for="goal-priority">Prioridade</label><select id="goal-priority" name="priority">${['high','medium','low'].map(x=>`<option value="${x}" ${x===(g?.priority||'medium')?'selected':''}>${priorities[x]}</option>`).join('')}</select></div></div>
 ${field('Quais matérias você deseja estudar?','subjects','text',(g?.subjects||[]).join(', '))}
 ${field('Link oficial do edital (opcional)','official_source','url',g?.official_source||'','placeholder="https://..."')}
 <label class="small"><input type="checkbox" name="allow_provisional" ${g?.allow_provisional?'checked':''}> Aceito um diagnóstico provisório de competências gerais se não existir banco específico para minha prova.</label>
 <div class="row"><button class="btn" type="submit">${g?'Salvar alterações':'Adicionar prova'}</button><button class="btn secondary" type="button" data-action="goal-cancel">Cancelar</button></div></form>`;}
function renderGoals(){if(data.activeGoalId){renderGoalDetail();return;}
 main(`${head('Minhas provas','Cadastre diversos objetivos. Cada prova terá diagnóstico, planejamento e desempenho próprios.',`<button class="btn" data-action="goal-new">+ Nova prova</button>`)}
 <div id="goal-form-slot"></div>${activeExamGoals().length?activeExamGoals().map(goalCard).join(''):'<div class="card empty">Nenhuma prova cadastrada.</div>'}${data.goals.some(g=>g.status==='archived')?`<div class="card" style="margin-top:16px"><h2>Provas arquivadas</h2>${data.goals.filter(g=>g.status==='archived').map(goalCard).join('')}</div>`:''}`);}
async function handleGoalForm(form){const f=new FormData(form),date=String(f.get('exam_date')||'');const goalId=form.dataset.id;
 const payload={exam_type:String(f.get('exam_type')),exam_name:String(f.get('exam_name')||'').trim(),institution:String(f.get('institution')||''),board:String(f.get('board')||''),objective:String(f.get('objective')||''),edition:String(f.get('edition')||''),
 exam_date:date||null,date_tbd:!date,priority:String(f.get('priority')||'medium'),subjects:String(f.get('subjects')||'').split(',').map(x=>x.trim()).filter(Boolean),official_source:String(f.get('official_source')||'')||null,allow_provisional:!!f.get('allow_provisional')};
 if(payload.exam_name.length<2)throw Error('Informe o nome da prova.');
 if(payload.official_source&&!safeExternalUrl(payload.official_source))throw Error('Informe uma URL oficial começando com https:// ou http://.');
 if(goalId){await put('academy_goals',payload,goalId);}
 else{await saveNewGoal({...payload,color:colors[data.goals.length%colors.length],status:'diagnostic_pending'});}
 await loadData();data.activeGoalId=null;go('goals');say('Prova salva.');
}
function renderGoalDetail(){const g=data.goals.find(g=>g.id===data.activeGoalId);if(!g){data.activeGoalId=null;renderGoals();return;}
 const diag=data.diagnostics.filter(x=>x.goal_id===g.id&&x.status==='completed').sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))[0];
 const tasks=data.tasks.filter(x=>x.goal_id===g.id&&x.status!=='cancelled');const sum=tasks.reduce((n,t)=>n+t.minutes,0);
 main(`${head(g.exam_name,`${g.exam_type} · ${g.institution||'Instituição não informada'} · ${formatDate(g.exam_date)}`,'<button class="btn secondary" data-action="goal-back">← Minhas provas</button>')}
 <div class="grid cols3"><div class="card"><div class="small muted">Diagnóstico</div><div class="kpi">${diag?diag.result?.accuracy+'%':'Pendente'}</div><p class="small">${diag?'Taxa entre as respondidas':'Conclua antes do plano definitivo'}</p></div><div class="card"><div class="small muted">Tempo planejado</div><div class="kpi">${sum} <span class="small">min</span></div></div><div class="card"><div class="small muted">Tarefas concluídas</div><div class="kpi">${tasks.filter(x=>x.status==='completed').length}/${tasks.length}</div></div></div>
 <div class="grid cols2" style="margin-top:18px"><div class="card"><h2>Disciplinas e requisitos</h2><p>${(g.subjects||[]).length?g.subjects.map(esc).join(' · '):'Disciplinas ainda não informadas'}</p><p class="small">${safeExternalUrl(g.official_source)?`<a href="${esc(safeExternalUrl(g.official_source))}" target="_blank" rel="noopener noreferrer">Fonte oficial registrada</a>`:'Edital oficial não vinculado'}</p><button class="btn" data-action="start-diagnostic" data-id="${g.id}">${diag?'Novo diagnóstico':'Realizar diagnóstico'}</button></div>
 <div class="card"><h2>Planejamento da prova</h2>${tasks.length?tasks.slice(0,12).map(t=>`<p class="small">${formatDate(t.day)} · <b>${esc(t.subject)}</b> — ${esc(t.topic)} · ${moneyTime(t.minutes)} ${t.status==='completed'?'✓':''}</p>`).join(''):'<p>Nenhum estudo programado. Conclua o diagnóstico e gere seu calendário.</p>'}<button class="btn secondary" data-page="calendar">Abrir calendário unificado</button></div></div>`);
}
function renderDiagnostics(){const eligible=activeExamGoals();main(`${head('Diagnósticos iniciais','Avaliações independentes. Não é possível medir uma prova específica sem conteúdo adequado.')}
 ${eligible.length?eligible.map(g=>{const done=data.diagnostics.filter(d=>d.goal_id===g.id&&d.status==='completed'),prog=data.diagnostics.find(d=>d.goal_id===g.id&&d.status==='in_progress');const supported=g.exam_type==='ENEM';return `<div class="card" style="margin:12px 0"><div class="row between"><div><h2>${esc(g.exam_name)}</h2><p>${supported?'Questões autorais alinhadas às áreas do ENEM':'Banco específico não verificado'}</p></div><span class="badge">${done.length?'Concluído':prog?'Em andamento':'Pendente'}</span></div>
 ${!supported?`<div class="callout warning">Sem questões verificadas para esta prova. ${g.allow_provisional?'Você autorizou um diagnóstico provisório de competências gerais.':'Ative a avaliação provisória nos dados da prova ou aguarde conteúdo específico.'}</div>`:''}
 <div class="row"><button class="btn" data-action="start-diagnostic" data-id="${g.id}" ${!supported&&!g.allow_provisional?'disabled':''}>${prog?'Retomar diagnóstico':'Iniciar diagnóstico'}</button>${done.length?`<button class="btn secondary" data-action="show-diagnostic" data-id="${done[0].id}">Ver resultado</button>`:''}</div></div>`;}).join(''):'<div class="card empty">Cadastre uma prova primeiro.</div>'}`);}
function diagnosticStartModal(goal){const pending=data.diagnostics.find(d=>d.goal_id===goal.id&&d.status==='in_progress');if(pending){data.activeDiagnostic=pending;data.questionPosition=0;renderDiagnosticExam();return;}
 const can=goal.exam_type==='ENEM'||goal.allow_provisional;
 if(!can){say('Não há banco de questões específico validado para esta prova.','error');return;}
 main(`${head('Preparar diagnóstico',`Prova: ${goal.exam_name}. Escolha a quantidade de questões.`)}
 <div class="card stack"><p>${goal.exam_type==='ENEM'?'As questões são autorais; esta avaliação não reproduz o TRI.':'Avaliação provisória de competências gerais. Não se trata de um simulado específico da sua banca.'}</p>
 <form id="form-diagnostic-start" class="form" data-id="${goal.id}"><div class="field"><label for="diag-count">Quantidade</label><select name="count" id="diag-count"><option value="10">Rápido — 10 questões</option><option value="15">Rápido — 15 questões</option><option value="20">Padrão — 20 questões</option><option value="30">Padrão — 30 questões</option><option value="40">Estendido — 40 questões</option><option value="50">Estendido — 50 questões</option></select></div><button class="btn">Iniciar avaliação</button><button type="button" data-page="diagnostics" class="btn secondary">Voltar</button></form></div>`);
}
async function createDiagnostic(goal,count){
 const used=data.diagnostics.filter(d=>d.goal_id===goal.id).flatMap(d=>d.question_ids||[]);
 const questions=selectDiagnosticQuestions(BANK(),goal,count,used);
 if(questions.length<count)throw Error(`Existem apenas ${questions.length} questões inéditas compatíveis. Selecione uma quantidade menor ou complemente o banco.`);
 const row=await put('academy_diagnostics',{goal_id:goal.id,assessment_type:goal.exam_type==='ENEM'?'original':'provisional_general',question_ids:questions.map(q=>q.id),answers:{},status:'in_progress'});
 data.diagnostics.push(row);data.activeDiagnostic=row;data.questionPosition=0;renderDiagnosticExam();
}
function renderDiagnosticExam(){const diag=data.activeDiagnostic;if(!diag){go('diagnostics');return;}
 const list=diag.question_ids||[],q=BANK().find(q=>q.id===list[data.questionPosition]);
 if(!q){main(`${head('Questão indisponível','O banco foi atualizado. Suas respostas estão salvas.')}<button class="btn" data-page="diagnostics">Voltar</button>`);return;}
 const answered=Object.values(diag.answers||{}).filter(x=>Number.isInteger(x)).length;
 main(`${head('Diagnóstico em andamento',`Questão ${data.questionPosition+1} de ${list.length} · ${answered} respondidas`)}
 <div class="progress-bar" role="progressbar" aria-valuenow="${Math.round(answered/list.length*100)}" aria-valuemax="100" aria-valuemin="0"><span style="width:${Math.round(answered/list.length*100)}%"></span></div>
 <div class="card" style="margin-top:15px"><div class="small muted">${esc(q.area)} · ${esc(q.subject)} · ${esc(q.topic)}</div><div class="quest-context">${esc(q.context)}</div><p class="question">${esc(q.stem)}</p><div class="alternatives">${q.options.map((o,i)=>`<label class="alternative"><input type="radio" name="diag-answer" value="${i}" ${diag.answers?.[q.id]===i?'checked':''}><span><b>${'ABCDE'[i]})</b> ${esc(o)}</span></label>`).join('')}</div></div>
 <div class="row between" style="margin-top:14px"><button class="btn secondary" data-action="diag-back" ${data.questionPosition===0?'disabled':''}>← Anterior</button><span class="pill" id="answer-state">Respostas salvas na nuvem</span><button class="btn secondary" data-action="diag-next" ${data.questionPosition===list.length-1?'disabled':''}>Próxima →</button></div>
 <div class="row" style="margin-top:10px"><button class="btn secondary" data-action="diag-suspend">Salvar e sair</button><button class="btn" data-action="diag-finalize">Finalizar e corrigir</button></div>`);
}
async function saveDiagnosticAnswer(answer){const d=data.activeDiagnostic;if(!d)return;
 const id=d.question_ids[data.questionPosition],previous={...(d.answers||{})};
 if(answer===null)delete previous[id];else previous[id]=answer;
 const {data:updated,error}=await data.client.from('academy_diagnostics')
 .update({answers:previous,version:d.version+1,updated_at:new Date().toISOString()})
 .eq('id',d.id).eq('user_id',data.user.id).eq('version',d.version).select().single();
 if(error||!updated){say('Conflito de atualização. Reabra o diagnóstico para proteger suas respostas.','error');await loadData();return;}
 data.activeDiagnostic=updated;data.diagnostics=data.diagnostics.map(x=>x.id===d.id?updated:x);
 const el=$('#answer-state');if(el)el.textContent='Salvo na nuvem ✓';
}
async function finishDiagnostic(){const d=data.activeDiagnostic;if(!d)return;
 const count=Object.values(d.answers||{}).filter(x=>Number.isInteger(x)).length;
 const empty=d.question_ids.length-count;
 if(!confirm(`Finalizar? ${empty} questão(ões) sem resposta não serão contadas como erro.`))return;
 const result=evaluateDiagnostic(d.question_ids,d.answers,BANK());
 const {data:record,error}=await data.client.from('academy_diagnostics').update({status:'completed',result,completed_at:new Date().toISOString(),updated_at:new Date().toISOString(),version:d.version+1})
 .eq('id',d.id).eq('user_id',data.user.id).eq('version',d.version).select().single();
 if(error||!record)throw Error('Não foi possível finalizar com segurança; suas respostas continuam gravadas.');
 const goal=data.goals.find(x=>x.id===record.goal_id);
 await put('academy_goals',{diagnostic_status:'completed',status:'active'},goal.id);
 await loadData();data.activeDiagnostic=null;renderDiagnosticReport(record);
}
function renderDiagnosticReport(diag){const r=diag.result||{};const topics=Object.entries(r.needs||{});
 main(`${head('Resultado do diagnóstico','Avaliação descritiva: a precisão da análise aumenta com mais evidências.')}
 <div class="grid cols3"><div class="card"><div class="small muted">Respondidas</div><div class="kpi">${r.answered||0}/${r.total||0}</div></div><div class="card"><div class="small muted">Acertos entre respondidas</div><div class="kpi">${r.accuracy||0}%</div></div><div class="card"><div class="small muted">Em branco</div><div class="kpi">${r.blank||0}</div></div></div>
 <div class="card" style="margin-top:16px"><h2>O que revisar</h2>${topics.map(([name,n])=>`<div class="task-row"><b>${esc(name)}</b> <span class="badge">${esc(n.priority)}</span><p class="small muted">Confiança: ${esc(n.confidence)}. Uma questão isolada não comprova domínio.</p></div>`).join('')||'<p>Sem dados suficientes.</p>'}</div>
 <div class="row" style="margin-top:16px"><button class="btn" data-page="calendar">Criar plano no calendário</button><button class="btn secondary" data-page="diagnostics">Outros diagnósticos</button></div>`);
}
function examPriorities(){const results={};for(const goal of data.goals){const d=data.diagnostics.filter(x=>x.goal_id===goal.id&&x.status==='completed').sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))[0];if(d)results[goal.id]=d.result||{};}return results;}
async function generatePlan(){
 const goals=data.goals.map(g=>({...g,weakness_weight:1}));
 const tasks=generateSchedule({goals,availability:data.profile?.availability||{},diagnostics:examPriorities(),start:new Date(),days:7,existing:data.tasks});
 if(!tasks.length){say('Não há tempo disponível ou diagnósticos concluídos para gerar tarefas novas.','error');return;}
 const validation=verifySchedule([...data.tasks,...tasks],data.profile?.availability||{});
 if(!validation.valid){say('Conflito no calendário. Reveja o tempo disponível e os horários existentes.','error');return;}
 const {error}=await data.client.from('academy_study_tasks').insert(tasks.map(t=>({...t,user_id:data.user.id})));
 if(error)throw error;await loadData();renderCalendar();say(`${tasks.length} atividades planejadas sem exceder sua disponibilidade.`);
}
function renderCalendar(){const ref=new Date();ref.setDate(ref.getDate()+data.calendarOffset*(data.calendarView==='month'?30:data.calendarView==='week'?7:1));const start=new Date(ref.getFullYear(),ref.getMonth(),ref.getDate(),12);
 const dates=[];if(data.calendarView==='week'){start.setDate(start.getDate()-start.getDay());for(let i=0;i<7;i++){let d=new Date(start);d.setDate(start.getDate()+i);dates.push(d)}}
 else if(data.calendarView==='month'){let d=new Date(start.getFullYear(),start.getMonth(),1,12);while(d.getMonth()===start.getMonth()){dates.push(new Date(d));d.setDate(d.getDate()+1)}}
 else{dates.push(start)};
 const select=activeExamGoals().map(g=>`<option value="${g.id}" ${g.id===data.calendarFilter?'selected':''}>${esc(g.exam_name)}</option>`).join('');
 const tasks=data.calendarFilter==='all'?data.tasks:data.tasks.filter(t=>t.goal_id===data.calendarFilter);
 const cell=dates.map(d=>{const day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const list=tasks.filter(t=>t.day===day&&t.status!=='cancelled');const mins=list.reduce((n,t)=>n+t.minutes,0),cap=validMinutes(data.profile?.availability?.[d.getDay()]||0);
  return `<div class="calendar-day"><h3>${d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'})}</h3><div class="small muted">${mins}/${cap} min</div>${list.map(t=>{const g=data.goals.find(g=>g.id===t.goal_id);return `<div class="calendar-chip" style="border-left:3px solid ${esc(g?.color||'#386fe9')}"><b>${esc(g?.exam_name||'Prova')}</b>${t.start_minute!=null?fmtClock(t.start_minute)+' · ':''}${esc(t.topic)}<div>${moneyTime(t.minutes)}</div>${t.status==='completed'?'✓ Concluída':`<button type="button" class="btn ghost" style="padding:3px 5px;font-size:10px;margin-top:5px" data-action="task-done" data-id="${t.id}">Concluir</button>`}</div>`}).join('')}</div>`;
 }).join('');
 main(`${head('Meu calendário','A disponibilidade é compartilhada entre todas as provas. Não são criados três calendários de duas horas para dois horas disponíveis.')}
 <div class="card stack"><div class="row between"><div class="row"><button class="btn secondary" data-action="calendar-prev">←</button><button class="btn secondary" data-action="calendar-now">Hoje</button><button class="btn secondary" data-action="calendar-next">→</button></div><div class="row"><select id="calendar-view" class="text">${['day','week','month'].map(x=>`<option value="${x}" ${x===data.calendarView?'selected':''}>${{day:'Dia',week:'Semana',month:'Mês'}[x]}</option>`).join('')}</select><select id="calendar-goal" class="text"><option value="all">Todas as provas</option>${select}</select></div></div>
 <div class="row between"><p class="small muted">${dates.length} dia(s) · ${activeExamGoals().length} prova(s) cadastradas</p><button class="btn" data-action="calendar-generate">Gerar próximos 7 dias</button></div>
 <div class="calendar-grid">${cell}</div></div><div class="callout" style="margin-top:15px">Tarefas finalizadas são mantidas no histórico. A geração acrescenta atividades novas sem substituir as já concluídas.</div>`);
}
function renderEssays(){main(`${head('Redações e versões','Guarde rascunhos separados por prova. A correção por IA ainda não foi ativada.')}
 <div class="row" style="margin-bottom:15px"><button class="btn" data-action="essay-new">+ Nova redação</button></div>
 <div class="stack">${data.essays.map(e=>{const g=data.goals.find(g=>g.id===e.goal_id);return `<div class="goal-row"><div class="row between"><b>${esc(e.title)}</b><span class="badge">${esc(g?.exam_name||'Geral')}</span></div><p class="small muted">${(e.body||'').trim().split(/\s+/).filter(Boolean).length} palavras · ${(e.versions||[]).length} versões anteriores</p><button class="btn secondary" data-action="essay-open" data-id="${e.id}">Editar</button></div>`}).join('')||'<div class="card empty">Nenhuma redação salva.</div>'}</div>`);}
function renderEssayEditor(e){data.activeEssay=e;
 main(`${head('Editor de redação','O rascunho é salvo automaticamente na conta quando você faz alterações.')}
 <div class="card stack"><div class="field"><label for="essay-title">Título</label><input class="text" id="essay-title" value="${esc(e.title)}"></div>
 <div class="field"><label for="essay-prompt">Tema e textos motivadores (fontes confiáveis)</label><textarea class="text" id="essay-prompt" rows="3">${esc(e.prompt)}</textarea></div>
 <div class="field"><label for="essay-body">Sua redação</label><textarea class="text" id="essay-body" style="min-height:360px;line-height:1.75" rows="15">${esc(e.body)}</textarea></div>
 <div class="row between"><span id="essay-count" class="small muted">${(e.body||'').trim().split(/\s+/).filter(Boolean).length} palavras</span><span id="essay-save-status" class="small muted">Salva na nuvem</span></div>
 <div class="row"><button class="btn" data-action="essay-version">Salvar esta versão</button><button class="btn secondary" data-action="essay-list">Voltar às redações</button></div>
 ${(e.versions||[]).length?`<h3>Histórico de versões</h3>${e.versions.map((v,i)=>`<details><summary>Versão ${i+1} · ${new Date(v.at).toLocaleString('pt-BR')}</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(v.body)}</pre></details>`).join('')}`:''}</div>`);
}
async function saveEssayDraft(){if(!data.essayPending)return;
 const ed=data.activeEssay;if(!ed)return;
 const payload=data.essayPending;data.essayPending=null;clearTimeout(data.essayTimer);
 const {data:updated,error}=await data.client.from('academy_essays').update({...payload,updated_at:new Date().toISOString()}).eq('id',ed.id).eq('user_id',data.user.id).select().single();
 if(error){data.essayPending=payload;throw error;}
 data.activeEssay=updated;data.essays=data.essays.map(e=>e.id===ed.id?updated:e);
 $('#essay-save-status')&&($('#essay-save-status').textContent='Salva na nuvem ✓');
}
function renderAccount(){const p=data.profile||{};
 main(`${head('Minha conta','Suas informações são privadas. A senha não faz parte do perfil de estudante.')}
 <div class="grid cols2"><section class="card"><h2>Dados de perfil</h2><form id="form-account" class="form">${field('Nome para exibição','display_name','text',p.display_name||'','required minlength="2"')}
 <p class="muted small">E-mail atual: ${esc(data.user?.email||'')}</p>${availableMarkup(p.availability)}<button class="btn">Salvar preferências</button></form></section>
 <section class="card stack"><h2>Segurança e privacidade</h2><form id="form-email-change" class="form">${field('Novo e-mail','email','email','','required')}<button class="btn secondary">Solicitar alteração de e-mail</button></form>
 <div class="divider"></div><button class="btn secondary" data-action="reset-email">Solicitar recuperação de senha</button>
 <a class="btn secondary" href="./v9-cloud.html">Abrir jornada V9 sincronizada</a><p class="small muted">A importação é opcional e não apaga o arquivo original. Só inclui conteúdo de estudo, nunca credenciais.</p>
 <div class="divider"></div><button class="btn danger" data-action="logout">Sair da minha conta</button></section></div>`);
 const ownerId=data.user?.id;
 void mountAccountImport(data.client,data.user,()=>Boolean(ownerId)&&data.user?.id===ownerId&&data.page==='account').catch(()=>say('Não foi possível listar backups. Verifique sua conexão.','error'));
}
function render(){
 if(!data.client){disableUI('Backend ainda não configurado.');return;}
 if(!data.user){renderAuth();return;}
 if(!data.user.email_confirmed_at){renderUnverified();return;}
 if(!data.profile?.onboarding_complete){renderOnboarding();return;}
 nav();
 switch(data.page){case'home':renderHome();break;case'goals':renderGoals();break;case'calendar':renderCalendar();break;case'diagnostics':renderDiagnostics();break;case'essay':renderEssays();break;case'account':renderAccount();break;default:renderHome();}
}
// Eventos delegados: os campos de senha nunca são armazenados nem enviados para estatísticas.
document.addEventListener('click',async ev=>{
 const tab=ev.target.closest('[data-auth-tab]');if(tab){data.authTab=tab.dataset.authTab;renderAuth();return;}
 const page=ev.target.closest('[data-page]');if(page){go(page.dataset.page);return;}
 const action=ev.target.closest('[data-action]');if(!action)return;
 const id=action.dataset.id;
 try{
 switch(action.dataset.action){
  case 'reveal':{const el=document.getElementById(action.dataset.target);if(!el)return;el.type=el.type==='password'?'text':'password';action.textContent=el.type==='password'?'Mostrar':'Ocultar';break;}
  case 'resend-email':{const {error}=await data.client.auth.resend({type:'signup',email:data.user.email,options:{emailRedirectTo:publicUrl}});if(error)throw error;say('Se a conta estiver pendente, um novo e-mail será enviado.');break;}
  case 'logout':{erasePrivateState();const {error}=await data.client.auth.signOut();if(error)throw error;data.authTab='login';renderAuth();break;}
  case 'onboard-back':data.onboard=Math.max(1,data.onboard-1);renderOnboarding();break;
  case 'onboard-types-next':data.selectedTypes=[...document.querySelectorAll('.onboard-type:checked')].map(x=>x.value);if(!data.selectedTypes.length){say('Selecione pelo menos um tipo de prova.','error');break;}data.onboard=3;renderOnboarding();break;
  case 'goal-new':$('#goal-form-slot').innerHTML=goalForm();$('#goal-form-slot').scrollIntoView({behavior:'smooth'});break;
  case 'goal-edit':$('#goal-form-slot').innerHTML=goalForm(data.goals.find(g=>g.id===id));$('#goal-form-slot').scrollIntoView({behavior:'smooth'});break;
  case 'goal-cancel':$('#goal-form-slot').innerHTML='';break;
  case 'goal-open':data.activeGoalId=id;renderGoalDetail();break;
  case 'goal-back':data.activeGoalId=null;go('goals');break;
  case 'goal-status':if(action.dataset.status==='archived'&&!confirm('Arquivar esta prova? O histórico será preservado e você poderá restaurá-la.'))break;await put('academy_goals',{status:action.dataset.status},id);await loadData();render();say('Status atualizado.');break;
  case 'start-diagnostic':diagnosticStartModal(data.goals.find(g=>g.id===id));break;
  case 'show-diagnostic':renderDiagnosticReport(data.diagnostics.find(d=>d.id===id));break;
  case 'diag-back':data.questionPosition=Math.max(0,data.questionPosition-1);renderDiagnosticExam();break;
  case 'diag-next':data.questionPosition=Math.min(data.activeDiagnostic.question_ids.length-1,data.questionPosition+1);renderDiagnosticExam();break;
  case 'diag-suspend':data.activeDiagnostic=null;go('diagnostics');say('Prova salva na nuvem.');break;
  case 'diag-finalize':await finishDiagnostic();break;
  case 'calendar-prev':data.calendarOffset--;renderCalendar();break;
  case 'calendar-next':data.calendarOffset++;renderCalendar();break;
  case 'calendar-now':data.calendarOffset=0;renderCalendar();break;
  case 'calendar-generate':await generatePlan();break;
  case 'task-done':await put('academy_study_tasks',{status:'completed',completed_at:new Date().toISOString()},id);await loadData();render();say('Atividade concluída.');break;
  case 'essay-new':{const row=await put('academy_essays',{title:'Nova redação',body:'',prompt:'',versions:[]});data.essays.push(row);renderEssayEditor(row);break;}
  case 'essay-open':renderEssayEditor(data.essays.find(e=>e.id===id));break;
  case 'essay-list':await saveEssayDraft();data.activeEssay=null;go('essay');break;
  case 'essay-version':{await saveEssayDraft();const ed=data.activeEssay;const versions=[...(ed.versions||[]),{at:new Date().toISOString(),body:ed.body||'',prompt:ed.prompt||''}];
    const updated=await put('academy_essays',{versions},ed.id);data.essays=data.essays.map(x=>x.id===ed.id?updated:x);renderEssayEditor(updated);say('Versão registrada.');break;}
  case 'import-old':go('account');break;
  case 'reset-email':{const {error}=await data.client.auth.resetPasswordForEmail(data.user.email,{redirectTo:publicUrl});if(error)throw error;say('Se permitido, um link foi enviado ao seu e-mail.');break;}
  default:break;
 }
 }catch(e){notifyError(e,'Ação');}
});
document.addEventListener('change',async ev=>{
 const t=ev.target;
 if(t.name==='diag-answer'){
  t.disabled=true;try{await saveDiagnosticAnswer(Number(t.value));}catch(e){notifyError(e,'Salvamento da resposta');}finally{t.disabled=false;}
 }else if(t.id==='calendar-view'){data.calendarView=t.value;data.calendarOffset=0;renderCalendar();}
 else if(t.id==='calendar-goal'){data.calendarFilter=t.value;renderCalendar();}
});
document.addEventListener('input',ev=>{
 const t=ev.target;
 if(['essay-body','essay-title','essay-prompt'].includes(t.id)&&data.activeEssay){
  data.essayPending={...(data.essayPending||{}),body:$('#essay-body')?.value??data.activeEssay.body,title:$('#essay-title')?.value??data.activeEssay.title,prompt:$('#essay-prompt')?.value??data.activeEssay.prompt};
  $('#essay-save-status').textContent='Salvando...';clearTimeout(data.essayTimer);
  data.essayTimer=setTimeout(()=>saveEssayDraft().catch(e=>notifyError(e,'Salvamento da redação')),800);
  $('#essay-count').textContent=($('#essay-body')?.value.trim().split(/\s+/).filter(Boolean).length||0)+' palavras';
 }
});
document.addEventListener('submit',async ev=>{
 const f=ev.target;if(!f.id)return;ev.preventDefault();
 try{
 if(f.id.startsWith('form-signup')||f.id.startsWith('form-login')||f.id.startsWith('form-forgot')||f.id.startsWith('form-reset'))await handleAuth(f);
 else if(f.id.startsWith('form-onboard-'))await handleOnboarding(f);
 else if(f.id==='form-goal')await handleGoalForm(f);
 else if(f.id==='form-diagnostic-start'){
  const g=data.goals.find(x=>x.id===f.dataset.id);const count=Number(new FormData(f).get('count'));await createDiagnostic(g,count);
 }else if(f.id==='form-account'){const fd=new FormData(f);await saveProfile({display_name:String(fd.get('display_name')||'').trim(),availability:parseAvailability(fd)});say('Preferências salvas.');}
 else if(f.id==='form-email-change'){const email=String(new FormData(f).get('email')||'').trim();const {error}=await data.client.auth.updateUser({email});if(error)throw error;say('Confira seu e-mail para confirmar a alteração, conforme as configurações do provedor.');}
 }catch(e){notifyError(e,'Formulário');}
});
$('#mobile-menu').addEventListener('click',()=>{const nav=$('#app-nav'),open=!nav.hidden;nav.hidden=open;$('#mobile-menu').setAttribute('aria-expanded',String(!open));});
window.addEventListener('beforeunload',ev=>{if(data.essayPending){ev.preventDefault();ev.returnValue='';}});
setup();
