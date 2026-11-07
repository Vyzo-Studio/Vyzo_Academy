/** VYZO ACADEMY V9: percurso local verificável. NENHUM cadastro ou senha é criado neste modo. */
import {EXAM_TYPES,AREAS,WEEKDAYS,isEnem,suitableQuestions,sampleDiagnostic,analyzeAnswers,topicRecommendations,buildAdaptiveSchedule,verifyPlan,isGoalEvaluated,hasEnoughEvidence,latestInitial,latestReport} from './v9-core.mjs';
import {searchExams,cloudConfigured,validQuery} from './v10-research.mjs';
import {composeExam} from './v11-composer.mjs';
import {renderFigure} from './v11-visual.mjs';
import {officialPaperHtml} from './v15-official-papers.mjs';
import {EDUCATION_STAGES,LEARNING_PATHS,getLearningPath,getSchoolStage,schoolYears,schoolSubjects,validSchoolYear,validateSchoolSubjectSelection,schoolGradeLabel,ENEM_OFFICIAL_ARCHIVE,searchVerifiedExam} from './v15-pathways.mjs';
const KEY='vyzo-academy-v9-guest-1';
const ACTIVE_KEY=window.VYZO_V9_CLOUD?.storageKey||KEY;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const BANK=Array.isArray(window.QUESTION_BANK)?window.QUESTION_BANK:[];
const labels={high:'Prioridade alta',medium:'Prioridade média',coverage:'Cobertura necessária',maintenance:'Manutenção'};
const weekdays=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'v9-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const today=()=>new Date().toLocaleDateString('sv-SE');
const fmtTime=sec=>`${String(Math.floor(Math.max(0,sec)/60)).padStart(2,'0')}:${String(Math.max(0,sec)%60).padStart(2,'0')}`;
const prettyDate=iso=>new Date(iso+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
const empty=()=>({schema:9,revision:0,onboarding:false,goals:[],profile:{minutes:120,weekdays:[1,2,3,4,5],dailyMinutes:null,confidence:'Não sei avaliar',difficulties:[],style:'Aprendizagem mista'},assessments:[],tasks:[],draft:null});
let storageFailure='',conflict=false;
function load(){try{const s=localStorage.getItem(ACTIVE_KEY);if(!s)return empty();const data=JSON.parse(s);if(data.schema!==9||!Array.isArray(data.goals)||!Array.isArray(data.assessments)||!Array.isArray(data.tasks))throw Error('Estrutura de dados inválida');return data;}catch(e){storageFailure='Os dados locais não puderam ser lidos. Nenhuma gravação será realizada até recuperar uma cópia.';return empty();}}
let state=load();let page='hub',step=0,selectedGoal=null,questionPosition=0,selectedAssessment=null,lessonTopic=null,lessonGoal=null,previewReason=null;
let draft=state.draft||{types:[],goals:[],learningPath:'',minutes:120,weekdays:[1,2,3,4,5],dailyMinutes:null,confidence:'Não sei avaliar',difficulties:[],style:'Aprendizagem mista'};
let mode='initial',newGoalWizard=false,editingGoalId=null,rescheduleTaskId=null,planView='all';
let researchResults=[],researchQuery='',researchError='',researchBusy=false;
step=Number.isInteger(state.wizardStep)?Math.max(0,Math.min(3,state.wizardStep)):0;

function assessmentElapsedMs(a,at=Date.now()){
 if(!a)return 0;
 if(!a.timer)return Math.max(0,(a.completedAt||at)-(a.startedAt||at));
 if(a.timer.mode==='untimed')return 0;
 if(Number.isFinite(a.timer.finishedElapsedMs))return a.timer.finishedElapsedMs;
 if(a.timer.mode==='countdown')return Math.max(0,Math.min(a.timer.durationMs||0,(a.timer.durationMs||0)-Math.max(0,(a.timer.deadlineAt||at)-at)));
 return Math.max(0,(a.timer.elapsedMs||0)+(a.timer.runningSince?Math.max(0,at-a.timer.runningSince):0));
}
function assessmentClockLabel(a,at=Date.now()){
 if(a?.timer?.mode==='untimed')return 'Prática sem cronômetro';
 if(a?.timer?.mode==='countdown')return 'Restante: '+fmtTime(Math.ceil(Math.max(0,(a.timer.deadlineAt||at)-at)/1000));
 return 'Tempo ativo: '+fmtTime(Math.floor(assessmentElapsedMs(a,at)/1000));
}
function pauseAssessmentClock(a){
 if(a?.timer?.mode!=='stopwatch'||!a.timer.runningSince)return;
 const at=Date.now();
 a.timer.elapsedMs=(a.timer.elapsedMs||0)+Math.max(0,at-a.timer.runningSince);
 a.timer.runningSince=null;a.timer.lastObservedAt=at;
}
function resumeAssessmentClock(a){
 if(a?.timer?.mode!=='stopwatch'||a.timer.runningSince)return;
 a.timer.runningSince=Date.now();a.timer.lastObservedAt=a.timer.runningSince;
}
// Carregamento de dados V14 ou antigos nunca deve computar toda a ausência offline
// como tempo ativo. A cópia local original continua inalterada até a próxima gravação.
for(const a of state.assessments){
 if(a.status==='in_progress'&&a.timer?.mode==='stopwatch'&&a.timer.runningSince){
  const end=Math.max(a.timer.runningSince,a.timer.lastObservedAt||a.timer.runningSince);
  a.timer.elapsedMs=(a.timer.elapsedMs||0)+(end-a.timer.runningSince);
  a.timer.runningSince=null;
 }
}

function persist(){if(storageFailure||conflict)throw Error('Salvamento bloqueado: exporte seu backup antes de continuar.');state.revision=(state.revision||0)+1;state.draft=draft;try{localStorage.setItem(ACTIVE_KEY,JSON.stringify(state));window.VYZO_V9_CLOUD?.queue(state);return true;}catch(e){state.revision--;storageFailure='O navegador não permitiu salvar. Libere espaço ou autorize armazenamento e baixe um backup.';message(storageFailure,'error');return false;}}
function message(text,type='info'){$('#v9-toast').textContent=text;$('#v9-toast').dataset.type=type;}
function output(html){
 $('#v9-content').innerHTML=html;
 $$('.v9-nav [data-page]').forEach(el=>{
  const active=el.dataset.page===page;
  el.classList.toggle('active',active);
  if(active)el.setAttribute('aria-current','page');
  else el.removeAttribute('aria-current');
 });
}
function title(text,info=''){return `<div class="page-head"><div><p class="v9-overline">VYZO ACADEMY · DIAGNÓSTICO ANTES DO PLANO</p><h1>${h(text)}</h1>${info?`<p class="v9-lead">${h(info)}</p>`:''}</div></div>`;}
function cta(text,action,extra=''){return `<button type="button" class="btn ${extra}" data-action="${action}">${text}</button>`;}
function stepper(){return `<div class="v9-steps">${['Prova','Detalhes','Disponibilidade','Preferências'].map((s,i)=>`<span class="v9-step ${i<step?'done':i===step?'current':''}">${i+1}. ${s}</span>`).join('')}</div>`;}
function formField(label,name,value='',type='text',attrs=''){return `<div class="field"><label for="v9-${h(name)}">${h(label)}</label><input type="${type}" name="${h(name)}" id="v9-${h(name)}" value="${h(value)}" ${attrs}></div>`;}
function formSelect(label,name,values,selected){return `<div class="field"><label for="v9-${h(name)}">${h(label)}</label><select name="${h(name)}" id="v9-${h(name)}">${values.map(v=>`<option value="${h(v)}" ${selected===v?'selected':''}>${h(v)}</option>`).join('')}</select></div>`;}
function beginWizard(add=false){researchResults=[];researchQuery='';researchError='';researchBusy=false;newGoalWizard=add;state.wizardStep=0;draft=add?{types:[],goals:[],learningPath:'',minutes:state.profile.minutes,weekdays:[...state.profile.weekdays],dailyMinutes:state.profile.dailyMinutes||null,confidence:state.profile.confidence,difficulties:[...state.profile.difficulties],style:state.profile.style}:draft;step=0;page='wizard';render();}
function schoolFields(i,goal){
 const stage=getSchoolStage(goal.educationStage)?.id||'fundamental1';
 const years=schoolYears(stage);
 const year=validSchoolYear(stage,goal.schoolYear)?Number(goal.schoolYear):years[0];
 return '<div class="field"><label for="v15-school-stage-'+i+'">Etapa de ensino</label>'+
  '<select name="stage_'+i+'" id="v15-school-stage-'+i+'">'+
  EDUCATION_STAGES.map(x=>'<option value="'+h(x.id)+'" '+(stage===x.id?'selected':'')+'>'+h(x.label)+'</option>').join('')+
  '</select></div><div class="field"><label for="v15-school-year-'+i+'">Ano escolar</label>'+
  '<select name="schoolYear_'+i+'" id="v15-school-year-'+i+'">'+
  years.map(n=>'<option value="'+n+'" '+(year===n?'selected':'')+'>'+n+'º ano</option>').join('')+
  '</select></div><p class="v9-mini">A etapa organiza seu objetivo. Questões específicas desta série ainda não foram validadas.</p>';
}
function schoolSubjectFields(index,goal){
 const stage=getSchoolStage(goal.educationStage)?.id||'fundamental1';
 const years=schoolYears(stage),year=validSchoolYear(stage,goal.schoolYear)?Number(goal.schoolYear):years[0];
 const allowed=schoolSubjects(stage,year),selected=validateSchoolSubjectSelection(stage,year,goal.subjects||[]);
 return '<fieldset id="v15-school-subjects-'+index+'" class="v9-detail">'+
   '<legend>Disciplinas do '+year+'º ano</legend>'+
   '<div class="v9-choice-grid">'+allowed.map(label=>
     '<label class="v9-choice"><input type="checkbox" name="schoolSubject_'+index+'" value="'+h(label)+'" '+
     (selected.accepted.includes(label)?'checked':'')+'><span>'+h(label)+'</span></label>').join('')+'</div>'+
   '<p class="v9-mini">Disciplinas conforme a etapa escolar; ainda não há aulas ou avaliações aprovadas para todas elas. Ensino Religioso tem matrícula facultativa.</p>'+
   (selected.rejected.length?'<p class="v9-warn">Há matérias antigas fora desta lista. Elas continuarão guardadas no histórico até você salvar alterações.</p>':'')+
   '</fieldset>';
}
function updateSchoolSubjectFields(index){
 const stage=$('#v15-school-stage-'+index)?.value,grade=Number($('#v15-school-year-'+index)?.value);
 const box=$('#v15-school-subjects-'+index);if(!box)return;
 const current=$$('input[name="schoolSubject_'+index+'"]:checked').map(input=>input.value);
 box.outerHTML=schoolSubjectFields(index,{educationStage:stage,schoolYear:grade,subjects:current});
}
function isSchoolPath(id){return getLearningPath(id)?.type==='Prova escolar';}
function pathSelector(){
 return '<section class="v15-path"><h2>Qual é o seu objetivo de aprendizagem?</h2>'+
  '<div class="field"><label for="v15-learning-path">Selecione seu objetivo</label>'+
  '<select id="v15-learning-path" name="learning_path"><option value="">Prefiro configurar manualmente</option>'+
  LEARNING_PATHS.map(x=>'<option value="'+h(x.id)+'" '+(draft.learningPath===x.id?'selected':'')+'>'+h(x.label)+'</option>').join('')+
  '</select></div><p class="v9-mini">As etapas escolares e os tipos de prova terão formulários adequados. Conteúdos ainda não validados não serão simulados como disponíveis.</p></section>';
}
function researchPreview(){
 const connected=cloudConfigured(window.VYZO_ACADEMY_CLOUD||{});
 const saved=draft.goals.filter(g=>Array.isArray(g.sources)&&g.sources.length);
 return pathSelector()+`<section class="v10-research" aria-label="Busca inteligente de provas" ${isSchoolPath(draft.learningPath)?'hidden':''}>
  <div class="v10-kicker">BUSCA INTELIGENTE DE PROVAS</div>
  <h2>Qual prova ou concurso você deseja estudar?</h2>
  <p class="v9-lead">Digite o nome da prova. Quando a pesquisa segura estiver conectada, consultaremos fontes oficiais e mostraremos opções para você conferir.</p>
  <div class="v10-search-row"><label class="sr-only" for="v10-exam-query">Nome da prova ou concurso</label><input id="v10-exam-query" type="search" list="v15-exam-catalog" maxlength="150" placeholder="Qual prova ou concurso você deseja estudar?" value="${h(researchQuery)}" autocomplete="off" aria-describedby="v10-search-status"><button type="button" class="btn" data-action="v10-research" ${researchBusy?'disabled':''}>${researchBusy?'Pesquisando fontes...':'Pesquisar com IA'}</button></div>
  <datalist id="v15-exam-catalog"><option value="ENEM"></option><option value="Exame Nacional do Ensino Médio"></option></datalist><div id="v15-enem-suggestion" hidden class="v9-info"><strong>ENEM — catálogo público</strong><p>É possível cadastrar o objetivo sem pesquisa por IA. Data, edital e edição não foram identificados automaticamente.</p><button type="button" class="btn secondary" data-action="v15-add-enem">Adicionar ENEM ao meu planejamento</button></div><p class="v9-mini">Exemplos de pesquisa: ENEM, Banco do Brasil, Polícia Federal — Agente, vestibular UnB. São exemplos, não editais anunciados.</p>
  <div id="v10-search-status" aria-live="polite" class="${researchError?'v9-warn':'v9-mini'}">${researchBusy?'Consultando um serviço externo autenticado...':researchError?h(researchError):connected?'A pesquisa exige uma conta confirmada. Resultados devem ser confrontados com fontes oficiais.':'Pesquisa automática ainda não ativada: falta um Supabase exclusivo e um serviço de IA no servidor. Você pode continuar manualmente abaixo.'}</div>
  ${saved.length?`<div class="v10-selected"><h3>Provas escolhidas com fontes vinculadas</h3>${saved.map((g,i)=>`<div class="v10-selected-row"><div><strong>${h(g.name)}</strong><small>${h(g.edition||'Edição não confirmada')} · ${h(g.sourceStatus||'Conferir fonte')}</small></div><button type="button" class="btn secondary" data-action="v10-remove" data-name="${h(g.name)}" data-edition="${h(g.edition||'')}">Remover</button></div>`).join('')}</div>`:''}
  ${researchResults.length?`<div class="v10-found"><h3>Encontramos estas opções com links de fontes oficiais</h3><p class="v9-mini">Fonte vinculada não equivale a validação humana do edital. Confira cargo, ano, data e matérias.</p>${researchResults.map((r,i)=>`<article class="v10-result"><div class="v10-result-head"><strong>${h(r.name)}</strong><span class="v9-badge">${h(r.edition||'Edição não confirmada')}</span></div><p class="v9-mini">${h([r.institution,r.position,r.board].filter(Boolean).join(' · ')||'Dados adicionais não confirmados')} · ${h(r.examDate||'Data não confirmada')}</p><div class="v10-sources">${r.sources.map(src=>`<a href="${h(src.url)}" target="_blank" rel="noopener noreferrer">${h(src.title||'Abrir fonte oficial')}</a>`).join('')}</div><button type="button" class="btn secondary" data-action="v10-select" data-index="${i}">Adicionar esta prova</button></article>`).join('')}</div>`:''}
 </section>
 <details class="v10-manual" ${isSchoolPath(draft.learningPath)?'hidden':''} ${!connected||draft.types.length||draft.goals.length?'open':''}><summary><strong>Configurar minha prova manualmente</strong> — alternativa quando a IA não estiver disponível</summary><div class="v9-choice-grid">${EXAM_TYPES.map(type=>`<label class="v9-choice"><input type="checkbox" name="exam_type" value="${h(type)}" ${draft.types.includes(type)?'checked':''}><strong>${h(type)}</strong></label>`).join('')}</div></details>
 <p class="v9-mini">É possível adicionar mais de uma prova. Cada uma receberá seu próprio diagnóstico antes do plano de estudos.</p>`;
}
async function researchExam(){
 const field=$('#v10-exam-query');researchQuery=validQuery(field?.value||'');
 if(!cloudConfigured(window.VYZO_ACADEMY_CLOUD||{})){researchError='Pesquisa automática ainda não ativada: é necessário configurar o Supabase e a função de pesquisa segura. Use o formulário manual abaixo.';renderWizard();return;}
 if(researchBusy)return;
 researchError='';researchResults=[];researchBusy=true;renderWizard();
 try {
  const loader=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm');
  const response=await searchExams(researchQuery,{createClient:loader.createClient});
  researchResults=response.candidates;
  if(!researchResults.length)researchError='Nenhuma opção com fonte oficial suficiente foi encontrada. Tente outro nome ou faça a configuração manual.';
 }catch(e){researchError=String(e.message||'Pesquisa indisponível.').slice(0,230);}
 finally{researchBusy=false;if(page==='wizard'&&step===0)renderWizard();}
}
function selectResearchResult(index){const item=researchResults[index];if(!item)throw Error('Resultado de pesquisa indisponível.');
 if(draft.goals.some(g=>g.name===item.name&&g.edition===item.edition))throw Error('Esta edição já foi adicionada.');
 draft.goals.push({...item,type:item.type,examDate:item.examDate||'',subjects:[...item.subjects],provisional:item.type!=='ENEM',sources:item.sources});
 draft.types=[...new Set([...draft.types,item.type])];persist();researchError='';renderWizard();message('Prova adicionada. Confira os documentos oficiais antes de confirmar as matérias.');
}
function renderWizard(){let content='';
 if(step===0) content=researchPreview();
 if(step===1) content=`<h2>Conte um pouco sobre cada prova</h2><p class="v9-lead">Preencha apenas o que você conhece. As matérias informadas por você não são apresentadas como edital oficial.</p>${draft.goals.map((g,i)=>`<fieldset class="v9-detail"><legend><strong>${h(g.type)}</strong></legend><div class="field-row">${formField('Nome da prova','name_'+i,g.name,'text','required maxlength="90"')}${g.type==='Prova escolar'?schoolFields(i,g):`${formField('Órgão / Instituição (opcional)','institution_'+i,g.institution,'text','maxlength="110"')}${formField('Cargo ou curso (opcional)','position_'+i,g.position,'text','maxlength="100"')}${formField('Banca (opcional)','board_'+i,g.board,'text','maxlength="100"')}${formField('Edição ou ano (opcional)','edition_'+i,g.edition,'text','maxlength="50"')}${formField('Data, se divulgada','date_'+i,g.examDate,'date')}`}</div>${g.type==='Prova escolar'?schoolSubjectFields(i,g):formField('Quais matérias você deseja estudar?','subjects_'+i,g.subjects.join(', '),'text','maxlength="400"')}${g.type==='ENEM'?formSelect('Língua estrangeira do ENEM','foreign_'+i,['Inglês','Espanhol'],g.foreignLanguage||'Inglês'):''}<p class="v9-mini">${g.sources?.length?'Fontes oficiais vinculadas à pesquisa. Você deve conferir se correspondem à edição e ao cargo desejados.':g.type==='ENEM'?'Áreas gerais do ENEM sugeridas; você pode ajustar.':'Conteúdo declarado pelo estudante — não validado com edital oficial.'}</p>${g.sources?.length?`<div class="v10-sources">${g.sources.map(src=>`<a href="${h(src.url)}" target="_blank" rel="noopener noreferrer">${h(src.title||'Consultar fonte oficial')}</a>`).join('')}</div>`:''}${g.type!=='ENEM'&&g.type!=='Prova escolar'?`<label class="v9-choice"><input type="checkbox" name="provisional_${i}" ${g.provisional?'checked':''}><span>Se não houver questões específicas, autorizo um <b>diagnóstico provisório de habilidades gerais</b> (não representa a prova nem a banca).</span></label>`:''}</fieldset>`).join('')}`;
 if(step===2) content=`<h2>Quanto tempo você pode estudar por dia?</h2><p class="v9-lead">Este é o tempo <strong>total</strong>, compartilhado entre todas as provas. Não criaremos horários sobrepostos.</p><div class="field">${formSelect('Disponibilidade diária','minutes',['30','60','90','120','180','240','custom'],String(draft.minutes||120))}<small>30 = 30 min · 60 = 1 h · 90 = 1 h e 30 min · 120 = 2 h · 180 = 3 h · 240 = 4 h.</small></div><div class="field" id="v9-custom-wrap" ${draft.minutes==='custom'?'':'hidden'}>${formField('Duração personalizada (em minutos)','custom_minutes',120,'number','min="15" max="720" step="5"')}</div><h3>Em quais dias da semana pode estudar?</h3><div class="v9-choice-grid">${WEEKDAYS.map((day,i)=>`<div class="v14-day-row"><label class="v9-choice"><input type="checkbox" name="weekday" value="${i}" ${draft.weekdays.includes(i)?'checked':''}>${day}</label><label class="v14-day-minutes">Minutos neste dia <input type="number" name="day_minutes_${i}" min="15" max="720" step="5" value="${Number(draft.dailyMinutes?.[String(i)]||draft.minutes||120)}"></label></div>`).join('')}</div>`;
 if(step===3) content=`<h2>Como você está se sentindo nos estudos?</h2><p class="v9-lead">Suas respostas são referências subjetivas. O diagnóstico verificará o que você realmente sabe.</p>${formSelect('Como avalia seu nível agora?','confidence',['Não sei avaliar','Iniciante','Básico','Intermediário','Avançado'],draft.confidence)}<h3>Em quais assuntos sente mais dificuldade?</h3><div class="v9-choice-grid">${['Matemática','Interpretação','Redação','Memorização','Raciocínio lógico','Gestão do tempo','Ciências da natureza','Outros assuntos'].map(x=>`<label class="v9-choice"><input type="checkbox" name="difficulty" value="${h(x)}" ${draft.difficulties.includes(x)?'checked':''}>${h(x)}</label>`).join('')}</div><div style="margin-top:17px">${formSelect('Como prefere aprender?','style',['Aprendizagem mista','Leitura e resumos','Exemplos resolvidos','Questões práticas','Flashcards','Videoaulas'],draft.style)}</div>`;
 output(`<div class="v9-hero"><div class="v9-overline" style="color:#b6ccfb">ETAPA 1 DE 2 · QUESTIONÁRIO</div><h1>Antes de começar, vamos conhecer seus objetivos.</h1><p>Este questionário curto personaliza a avaliação inicial. O plano de estudos só será criado após a correção do diagnóstico.</p></div><div class="v9-card">${stepper()}<form id="wizard-form" class="v9-form" novalidate>${content}<div class="v9-actions">${step?cta('← Voltar','wizard-back','secondary'):'<span></span>'}<button class="btn" type="submit">${step===3?'Preparar meus diagnósticos →':'Continuar →'}</button></div></form></div>`);
}
function saveStep(form){const f=new FormData(form);
 if(step===0){
  const path=getLearningPath(String(f.get('learning_path')||'')),manually=isSchoolPath(path?.id)?[]:f.getAll('exam_type').map(String);
  draft.learningPath=path?.id||'';
  const types=[...new Set([...manually,...(path?[path.type]:[]),...draft.goals.map(g=>g.type)])];
  if(!types.length)throw Error('Escolha um objetivo, uma prova ou configure manualmente.');
  draft.types=types;
  draft.goals=[...draft.goals,...types.filter(type=>!draft.goals.some(g=>g.type===type)).map(type=>({
   type,name:type==='ENEM'?'ENEM':type==='Prova escolar'?'Estudos escolares':type,
   institution:'',position:'',board:'',edition:'',examDate:'',
   subjects:type==='ENEM'?[...AREAS]:type==='Prova escolar'?['Língua Portuguesa','Matemática']:[],
   educationStage:type==='Prova escolar'?'fundamental1':null,schoolYear:type==='Prova escolar'?1:null,
   learningPath:path?.type===type?path.id:null,provisional:false
  }))];
 }
 if(step===1){draft.goals=draft.goals.map((g,i)=>{const name=String(f.get('name_'+i)||'').trim().slice(0,90);if(!name)throw Error('Informe o nome de cada prova.');const date=String(f.get('date_'+i)||'');if(date&&Number.isNaN(new Date(date+'T12:00:00').getTime()))throw Error('Data de prova inválida.');const educationStage=g.type==='Prova escolar'?String(f.get('stage_'+i)||'fundamental1'):null;
  const schoolYear=g.type==='Prova escolar'?Number(f.get('schoolYear_'+i)):null;
  if(g.type==='Prova escolar'&&!validSchoolYear(educationStage,schoolYear))throw Error('Selecione um ano escolar válido para a etapa.');
   if(g.type==='Prova escolar'&&!validateSchoolSubjectSelection(educationStage,schoolYear,f.getAll('schoolSubject_'+i).map(String)).valid)
    throw Error('Selecione disciplinas compatíveis com o ano escolar.');
  return {...g,name,educationStage,schoolYear,institution:String(f.get('institution_'+i)||'').trim(),position:String(f.get('position_'+i)||'').trim(),board:String(f.get('board_'+i)||'').trim(),edition:String(f.get('edition_'+i)||'').trim(),examDate:date,subjects:g.type==='Prova escolar'?validateSchoolSubjectSelection(educationStage,schoolYear,f.getAll('schoolSubject_'+i).map(String)).accepted:String(f.get('subjects_'+i)||'').split(',').map(s=>s.trim()).filter(Boolean).slice(0,20),foreignLanguage:g.type==='ENEM'&&f.get('foreign_'+i)==='Espanhol'?'Espanhol':'Inglês',provisional:g.type==='ENEM'||g.type==='Prova escolar'?false:f.has('provisional_'+i)};});}
 if(step===2){const raw=f.get('minutes');const minutes=raw==='custom'?Number(f.get('custom_minutes')):Number(raw);if(!Number.isInteger(minutes)||minutes<15||minutes>720)throw Error('Informe de 15 a 720 minutos por dia.');draft.minutes=minutes;draft.weekdays=f.getAll('weekday').map(Number);if(!draft.weekdays.length)throw Error('Selecione pelo menos um dia disponível.');
   draft.dailyMinutes=Object.fromEntries(Array.from({length:7},(_,i)=>{
    const n=draft.weekdays.includes(i)?Number(f.get('day_minutes_'+i)):0;
    if(draft.weekdays.includes(i)&&(!Number.isInteger(n)||n<15||n>720))throw Error('Informe de 15 a 720 minutos para '+WEEKDAYS[i]+'.');
    return [String(i),n];
   }));}
 if(step===3){draft.confidence=String(f.get('confidence')||'Não sei avaliar');draft.difficulties=f.getAll('difficulty').map(String);draft.style=String(f.get('style')||'Aprendizagem mista');}
 persist();
}
function endWizard(){state.wizardStep=0;const newGoals=draft.goals.map(g=>({...g,id:uid(),priority:'medium',status:'preparing',createdAt:Date.now()}));state.goals.push(...newGoals);state.profile={minutes:Number(draft.minutes),weekdays:draft.weekdays,dailyMinutes:draft.dailyMinutes||null,confidence:draft.confidence,difficulties:draft.difficulties,style:draft.style};state.onboarding=true;draft={types:[],goals:[],learningPath:'',minutes:state.profile.minutes,weekdays:[...state.profile.weekdays],dailyMinutes:state.profile.dailyMinutes||null,confidence:state.profile.confidence,difficulties:[...state.profile.difficulties],style:state.profile.style};if(!persist())return;page='hub';render();message('Objetivos salvos. Agora vamos descobrir o que você já sabe.');}
function availableMinutes(){
 return Object.fromEntries(Array.from({length:7},(_,i)=>{
  const saved=state.profile.dailyMinutes?.[String(i)];
  const value=Number.isInteger(saved)?saved:state.profile.weekdays.includes(i)?state.profile.minutes:0;
  return [String(i),Math.max(0,Math.min(720,value))];
 }));
}
function status(goal){if(goal.status==='archived')return 'Arquivada';if(goal.type==='Prova escolar')return 'Conteúdo específico por série em preparação';if(goal.curriculumChangedAt&&!isGoalEvaluated(goal,state.assessments))return 'Grade alterada — novo diagnóstico necessário';const init=latestInitial(goal.id,state.assessments);if(init&&isGoalEvaluated(goal,state.assessments))return goal.status==='paused'?'Pausada':'Diagnóstico concluído';if(init)return 'Evidência insuficiente — refazer';const running=state.assessments.find(a=>a.goalId===goal.id&&a.kind==='initial'&&a.status==='in_progress');return running?'Diagnóstico em andamento':'Diagnóstico pendente';}
function summaryGoal(goal){const done=goal.type!=='Prova escolar'&&isGoalEvaluated(goal,state.assessments),running=state.assessments.find(a=>a.goalId===goal.id&&a.status==='in_progress');return `<article class="v9-goal"><div><span class="v9-badge ${done?'ok':'muted'}">${h(status(goal))}</span><h3>${h(goal.name)}</h3><p>${h(goal.type)}${goal.type==='Prova escolar'?' · '+h(schoolGradeLabel(goal.educationStage,goal.schoolYear)):goal.examDate?' · '+h(prettyDate(goal.examDate)):' · Data não divulgada'} · ${h(goal.subjects.join(', ')||'Matérias a definir')}</p>${goal.provisional?'<p class="v9-mini">Avaliação provisória: habilidades gerais, não específicas da prova.</p>':''}</div><div class="v9-actions" style="margin:0">${goal.status==='archived'?'<span class="v9-mini">Objetivo arquivado. Restaure para retomar.</span>':goal.type==='Prova escolar'?`<button class="btn secondary" data-action="choose-assessment" data-id="${goal.id}">Ver situação do conteúdo</button>`:running?`<button class="btn" data-action="resume-assessment" data-id="${running.id}">Retomar avaliação</button>`:!done?`<button class="btn" data-action="choose-assessment" data-id="${goal.id}">Começar diagnóstico</button>`:`<button class="btn secondary" data-action="open-plan" data-id="${goal.id}">Ver plano</button><button class="btn secondary" data-action="open-report" data-id="${latestInitial(goal.id,state.assessments).id}">Ver diagnóstico</button>`}${done?`<button class="btn ghost" data-action="request-retest" data-id="${goal.id}">Novo teste</button>`:''}<button type="button" class="btn ghost" data-action="edit-goal" data-id="${goal.id}">${goal.type==='Prova escolar'?'Editar objetivo':'Editar prova'}</button></div></article>`;}
function renderHub(){const pending=state.goals.filter(g=>g.type==='Prova escolar'||!isGoalEvaluated(g,state.assessments));const finished=state.goals.filter(g=>g.type!=='Prova escolar'&&isGoalEvaluated(g,state.assessments));const todays=state.tasks.filter(t=>t.day===today());
 const recommended=state.tasks.filter(t=>t.status==='pending'&&state.goals.some(g=>g.id===t.goalId&&!['paused','archived'].includes(g.status)))
  .sort((a,b)=>a.day.localeCompare(b.day)||(a.startMinute||0)-(b.startMinute||0))[0];
 const recGoal=recommended?state.goals.find(g=>g.id===recommended.goalId):null;
 const advice=recommended?'<section class="v9-card"><h2>O que vamos estudar hoje?</h2><p class="v9-lead">'+
  h(recGoal?.name||'Prova')+' · '+h(recommended.subject)+' · '+h(recommended.topic)+
  '</p><p>'+h(recommended.day===today()?'Atividade de hoje':'Próxima atividade: '+prettyDate(recommended.day))+
  ' · '+recommended.minutes+' minutos · '+h(recommended.reason)+
  '</p><button class="btn" type="button" data-action="study-topic" data-goal="'+h(recommended.goalId)+
  '" data-topic="'+h(recommended.topic)+'">Estudar agora</button></section>':'';
 output(`${title('Sua jornada começa pelo diagnóstico','Você não precisa estudar às cegas: avaliamos o conhecimento, analisamos os erros e só então planejamos o que aprender.')}<section class="v9-hero"><p class="v9-overline" style="color:#b2c8ff">${pending.length?'ETAPA 2 DE 2 · AVALIAÇÃO INICIAL':'PLANEJAMENTO COM EVIDÊNCIAS'}</p><h1>${pending.length?(pending[0].type==='Prova escolar'?'Seu objetivo escolar está registrado.':'Agora vamos descobrir o que você já sabe.'):'Seu estudo já tem um ponto de partida.'}</h1><p>${pending.length?`${pending.length} prova(s) aguardam diagnóstico. Você pode escolher qual avaliar primeiro e continuar depois.`:'Planos personalizados são derivados das respostas dos seus diagnósticos. Questões não avaliadas continuam visíveis no planejamento.'}</p>${pending.length?`<button class="btn" data-action="choose-assessment" data-id="${pending[0].id}">${pending[0].type==='Prova escolar'?'Ver situação do conteúdo →':'Começar diagnóstico →'}</button>`:'<button class="btn" data-page="plan">Ver meu plano personalizado →</button>'}</section>${advice}<div class="v9-grid"><div class="v9-stat"><small>Provas cadastradas</small><strong>${state.goals.length}</strong></div><div class="v9-stat"><small>Diagnósticos concluídos</small><strong>${finished.length}</strong></div><div class="v9-stat"><small>Minutos disponíveis hoje</small><strong>${availableMinutes()[new Date().getDay()]||0}</strong></div><div class="v9-stat"><small>Atividades de hoje</small><strong>${todays.length}</strong></div></div><section class="v9-card" style="margin-top:20px"><div class="row between"><h2>Minhas provas</h2>${cta('+ Adicionar outra prova','add-goal','secondary')}</div>${state.goals.map(summaryGoal).join('')}</section>`);}
function renderGoals(){output(`${title('Minhas provas','A evolução de cada prova fica separada. Somente provas diagnosticadas liberam o plano correspondente.')}<div class="v9-actions">${cta('+ Adicionar prova','add-goal')}</div>${state.goals.map(g=>summaryGoal(g)+`<div class="row" style="margin:0 0 18px 10px"><button class="btn ghost" data-action="toggle-goal" data-id="${g.id}">${g.status==='paused'?'Retomar estudos':g.status==='archived'?'Restaurar prova':'Pausar prova'}</button><button type="button" class="btn ghost" data-action="duplicate-goal" data-id="${g.id}">Duplicar configuração</button><button type="button" class="btn ghost" data-action="archive-goal" data-id="${g.id}" ${g.status==='archived'?'disabled':''}>Arquivar</button></div>`).join('')}`);}

function renderEditGoal(){
 const g=state.goals.find(x=>x.id===editingGoalId);
 if(!g){go('goals');return;}
 output(title('Editar prova','Atualize informações sem perder avaliações, redações ou atividades concluídas.')+
  '<div class="v9-card"><form id="edit-goal-form" class="v9-form">'+
  formField('Nome da prova','name',g.name,'text','required maxlength="90"')+
  '<div class="field-row">'+
  (g.type==='Prova escolar'?schoolFields('edit',g):
  formField('Instituição','institution',g.institution||'','text','maxlength="110"')+
  formField('Cargo ou curso','position',g.position||'','text','maxlength="100"')+
  formField('Banca organizadora','board',g.board||'','text','maxlength="100"')+
  formField('Edição ou ano','edition',g.edition||'','text','maxlength="50"')+
  formField('Data da prova','examDate',g.examDate||'','date'))+
  '</div>'+(g.type==='Prova escolar'?schoolSubjectFields('edit',g):formField('Quais matérias deseja estudar?','subjects',(g.subjects||[]).join(', '),'text','maxlength="400"'))+
  formField('Tópicos prioritários (opcional, separados por vírgula)','topics',(g.topics||[]).join(', '),'text','maxlength="400"')+
  (isEnem(g)?formSelect('Língua estrangeira','foreignLanguage',['Inglês','Espanhol'],g.foreignLanguage||'Inglês'):'')+
  formSelect('Prioridade','priority',['high','medium','low'],g.priority||'medium')+
  formSelect('Situação','status',['preparing','paused','archived'],g.status||'preparing')+
  '<p class="v9-warn">Alterar matérias, tópicos ou idioma requer um novo diagnóstico para validar o plano. O histórico anterior será preservado; tarefas futuras desse objetivo serão substituídas após a atualização.</p>'+
  '<div class="v9-actions"><button class="btn" type="submit">Salvar alterações</button>'+
  '<button class="btn secondary" type="button" data-page="goals">Cancelar</button></div></form></div>');
}
function saveGoalEdit(form){
 const current=state.goals.find(g=>g.id===editingGoalId);
 if(!current)throw Error('Prova não encontrada.');
 let f=new FormData(form),name=String(f.get('name')||'').trim().slice(0,90),
  examDate=f.has('examDate')?String(f.get('examDate')||''):String(current.examDate||''),
  subjects=current.type==='Prova escolar'?f.getAll('schoolSubject_edit').map(String):[...new Set(String(f.get('subjects')||'').split(',').map(x=>x.trim()).filter(Boolean))].slice(0,20),
  topics=[...new Set(String(f.get('topics')||'').split(',').map(x=>x.trim()).filter(Boolean))].slice(0,30),
  foreignLanguage=isEnem(current)&&f.get('foreignLanguage')==='Espanhol'?'Espanhol':'Inglês',
  priority=String(f.get('priority')||'medium'),status=String(f.get('status')||'preparing');
 if(!name||!subjects.length)throw Error('Informe o nome e pelo menos uma matéria.');
 const educationStage=current.type==='Prova escolar'?String(f.get('stage_edit')||'fundamental1'):current.educationStage||null;
 const schoolYear=current.type==='Prova escolar'?Number(f.get('schoolYear_edit')):current.schoolYear||null;
 if(current.type==='Prova escolar'&&!validSchoolYear(educationStage,schoolYear))throw Error('Etapa e ano escolar incompatíveis.');
  if(current.type==='Prova escolar'){
   const checked=validateSchoolSubjectSelection(educationStage,schoolYear,subjects);
   if(!checked.valid)throw Error('As disciplinas precisam corresponder ao ano selecionado.');
   subjects=checked.accepted;
  }
 if(examDate&&Number.isNaN(new Date(examDate+'T12:00:00').getTime()))throw Error('Data inválida.');
 if(!['high','medium','low'].includes(priority)||!['preparing','paused','archived'].includes(status))throw Error('Configuração inválida.');
 const changed=JSON.stringify({subjects:current.subjects||[],topics:current.topics||[],language:current.foreignLanguage||'Inglês',stage:current.educationStage||null,year:current.schoolYear||null})!==
  JSON.stringify({subjects,topics,language:foreignLanguage,stage:educationStage,year:schoolYear});
 if(changed&&!confirm('As matérias, tópicos ou idioma mudaram. O diagnóstico anterior será preservado, mas será necessário um novo diagnóstico. Atividades futuras pendentes desta prova serão substituídas. Continuar?'))return;
 if(changed){
  current.curriculumHistory=[...(current.curriculumHistory||[]),{at:Date.now(),subjects:[...(current.subjects||[])],topics:[...(current.topics||[])],foreignLanguage:current.foreignLanguage||'Inglês',educationStage:current.educationStage||null,schoolYear:current.schoolYear||null}].slice(-50);
  current.curriculumChangedAt=Date.now();
  for(const t of state.tasks)if(t.goalId===current.id&&t.status==='pending'){t.status='superseded';t.supersededAt=Date.now();}
 }
 Object.assign(current,{name,institution:f.has('institution')?String(f.get('institution')||'').trim().slice(0,110):String(current.institution||''),
  position:f.has('position')?String(f.get('position')||'').trim().slice(0,100):String(current.position||''),
  board:f.has('board')?String(f.get('board')||'').trim().slice(0,100):String(current.board||''),edition:f.has('edition')?String(f.get('edition')||'').trim().slice(0,50):String(current.edition||''),
  examDate,subjects,topics,educationStage,schoolYear,foreignLanguage,priority,status,updatedAt:Date.now()});
 persist();editingGoalId=null;page='goals';render();
 message(changed?'Dados salvos. Seu histórico continua disponível; complete um novo diagnóstico para atualizar o plano.':'Informações da prova atualizadas.');
}

function renderDiagnostics(){const all=[...state.assessments].sort((a,b)=>b.startedAt-a.startedAt);output(`${title('Diagnósticos iniciais','O planejamento de cada prova só é liberado depois da sua primeira avaliação.')}<div class="v9-card">${state.goals.map(summaryGoal).join('')}</div>${all.length?`<div class="v9-card"><h2>Histórico de avaliações</h2>${all.map(a=>{const g=state.goals.find(g=>g.id===a.goalId);return `<div class="v9-goal"><div><b>${h(g?.name||'Prova')}</b> · ${a.kind==='initial'?'Diagnóstico inicial':'Reteste'}<p>${a.status==='completed'?`Concluído · ${a.report.correct} acertos · ${a.report.accuracy}% das respondidas`:'Em andamento · '+Object.keys(a.answers||{}).length+' de '+a.ids.length+' respondidas'}</p></div>${a.status==='completed'?`<button class="btn secondary" data-action="open-report" data-id="${a.id}">Abrir correção</button>`:`<button class="btn" data-action="resume-assessment" data-id="${a.id}">Retomar</button>`}</div>`}).join('')}</div>`:''}`);}
function renderReady(){const g=state.goals.find(x=>x.id===selectedGoal);if(!g){go('hub');return;}
 const already=state.assessments.filter(a=>a.goalId===g.id).flatMap(a=>a.ids);const pool=suitableQuestions(BANK,g,already);
 if(g.type==='Prova escolar'){
  const grade=schoolGradeLabel(g.educationStage,g.schoolYear);
  output(title('Estudos escolares','Estrutura escolar identificada; ainda não há questões específicas desta série revisadas editorialmente.')+
   '<div class="v9-card"><h2>'+h(g.name)+'</h2><p class="v9-lead">'+h(grade)+' · '+h((g.subjects||[]).join(', '))+'</p>'+
   '<div class="v9-warn">O diagnóstico escolar específico desta série ainda não está disponível. Não usamos questões do ENEM como equivalentes, nem fabricamos resultados ou planos personalizados.</div>'+
   '<div class="v9-actions"><button type="button" class="btn secondary" data-action="edit-goal" data-id="'+h(g.id)+'">Editar objetivo</button>'+
   '<button type="button" class="btn secondary" data-page="goals">Minhas provas</button></div></div>');
  return;
 }
 const provisional=!isEnem(g),warning=provisional?`<div class="v9-warn"><strong>Atenção:</strong> o banco atual contém questões autorais de estilo ENEM. ${g.provisional?'Você autorizou avaliação provisória de habilidades gerais. Os resultados NÃO representam a prova ou banca selecionada.':'Não temos questões específicas verificadas para essa prova. Você pode permitir uma avaliação geral provisória ou aguardar conteúdo adequado.'}</div>`:'';
 output(`${title('Seu diagnóstico inicial está pronto','Antes do plano, vamos observar seus acertos, erros e assuntos ainda não avaliados.')}<div class="v9-card"><h2>${h(g.name)}</h2><p class="v9-lead">${h(g.type)} · ${h(g.subjects.join(', ')||'Seleção geral')} · ${pool.length} questões compatíveis com as condições escolhidas.</p>${warning}<div class="v9-info" style="margin:15px 0"><strong>Regras:</strong> sem gabarito antecipado, respostas alteráveis, salvamento automático, retomada e correção ao finalizar. Questões em branco não são consideradas erros conceituais.</div>${!isEnem(g)&&!g.provisional?`${cta('Autorizar avaliação provisória geral','enable-provisional')}`:''}${(isEnem(g)||g.provisional)?`<form id="start-diagnostic-form" class="v9-form"><div class="field"><label for="v13-exam-mode">Modalidade</label><select id="v13-exam-mode"><option value="general">ENEM geral — quatro áreas</option><option value="day1">ENEM — primeiro dia</option><option value="day2">ENEM — segundo dia</option><option value="area">Uma área</option><option value="subject">Uma matéria</option></select></div><div class="field" id="v13-area-field" hidden><label for="v13-area">Área</label><select id="v13-area"><option value="Linguagens">Linguagens</option><option value="Humanas">Humanas</option><option value="Natureza">Natureza</option><option value="Matemática">Matemática</option></select></div><div class="field" id="v13-subject-field" hidden><label for="v13-subject">Matéria</label><select id="v13-subject"></select></div><div class="field" id="v13-lang-field"><label for="v13-language">Língua estrangeira</label><select id="v13-language"><option>Inglês</option><option>Espanhol</option></select></div><div class="field"><label for="exam-length">Quantidade de questões</label><select id="exam-length" name="count">${[10,20,30].map(n=>`<option value="${n}" ${n>pool.length?'disabled':''} ${n===20&&pool.length>=20?'selected':''}>${n} questões ${n>pool.length?'(indisponível)':''}</option>`).join('')}<option value="custom">Personalizada (3–50)</option></select></div><div class="field" id="custom-length-wrap" hidden><label for="custom-length">Quantidade personalizada</label><input id="custom-length" type="number" name="custom_count" min="3" max="50" value="${Math.min(10,pool.length)}"></div><div class="field"><label for="v14-timer-mode">Controle de tempo</label><select id="v14-timer-mode"><option value="stopwatch">Cronômetro — pausa ao suspender</option><option value="countdown">Contagem regressiva — prazo contínuo</option><option value="untimed">Prática sem cronômetro</option></select><small>No cronômetro, sair da avaliação pausa o tempo ativo. Na contagem regressiva, o prazo continua mesmo após fechar a página, até a finalização automática.</small></div><div class="field" id="v14-time-limit-wrap" hidden><label for="v14-time-limit">Prazo em minutos</label><input type="number" id="v14-time-limit" min="1" max="360" value="60"></div><section id="v13-composition" class="v13-composition" aria-live="polite"></section><div class="row"><button class="btn" type="submit" ${pool.length<3?'disabled':''}>COMEÇAR DIAGNÓSTICO →</button><button type="button" class="btn secondary" data-page="diagnostics">Voltar</button></div></form>`:''}${pool.length<10?`<div class="v9-warn">Há apenas ${pool.length} questões disponíveis nas condições escolhidas. ${pool.length>=3?'Selecione uma quantidade personalizada menor.':'Não é possível iniciar uma avaliação com menos de 3 questões relevantes.'}</div>`:''}</div>`);
 const language=$('#v13-language');if(language)language.value=g.foreignLanguage||'Inglês';
 const single=$('#v13-subject');if(single)single.innerHTML=[...new Set(BANK.map(q=>q.subject))].sort().map(name=>`<option value="${h(name)}">${h(name)}</option>`).join('');
  // Respeitar a seleção inicial: uma só área/matéria não vira prova geral sem aviso.
  if(isEnem(g)&&Array.isArray(g.subjects)&&g.subjects.length===1){
   const selected=String(g.subjects[0]).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
   const area=AREAS.find(a=>a.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()===selected);
   const modeSelect=$('#v13-exam-mode');
   if(area&&modeSelect){modeSelect.value='area';$('#v13-area').value=area;}
   else if(single&&modeSelect){
     const valid=[...single.options].find(o=>{
      const label=o.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
      return label===selected||(selected==='lingua portuguesa'&&label==='portugues');
     });
     if(valid){modeSelect.value='subject';single.value=valid.value;}
   }
  }
 updateCompositionPreview();
}
function assessmentSettings(goal,kind='initial'){
 const chosen=$('#v13-exam-mode')?.value||'general',language=$('#v13-language')?.value||goal?.foreignLanguage||'Inglês';
 return {mode:kind==='retest'||!isEnem(goal)?'targeted':chosen,
  area:$('#v13-area')?.value||'Matemática',subject:$('#v13-subject')?.value||'Português',
  language,seed:[goal?.id,kind,assessmentCount(),chosen,language,$('#v13-area')?.value,$('#v13-subject')?.value].join(':')};
}
function assessmentCount(){return Number($('#exam-length')?.value==='custom'?$('#custom-length')?.value:$('#exam-length')?.value);}
function assessmentPool(goal,kind,count,language){
 const excluded=state.assessments.filter(a=>a.goalId===goal.id).flatMap(a=>a.ids);
 const available=suitableQuestions(BANK,{...goal,foreignLanguage:language},excluded);
 if(kind!=='retest')return available;
 const initial=latestInitial(goal.id,state.assessments);
 const weak=new Set(Object.entries(initial?.report?.topics||{})
  .filter(([,value])=>['Precisa de revisão','Em desenvolvimento'].includes(value.label)).map(([topic])=>topic));
 const targeted=available.filter(q=>weak.has(q.topic));
 if(targeted.length>=count)return targeted;
 const subjects=new Set(Object.keys(initial?.report?.bySubject||{}));
 const bySubject=available.filter(q=>subjects.has(q.subject));
 return bySubject.length>=count?bySubject:available;
}
function updateCompositionPreview(){
 const slot=$('#v13-composition');if(!slot)return;
 const goal=state.goals.find(g=>g.id===selectedGoal),count=assessmentCount();
 const choices=assessmentSettings(goal,mode),start=$('#start-diagnostic-form button[type="submit"]');
 const chosen=$('#v13-exam-mode')?.value||'general';
 if($('#v13-area-field'))$('#v13-area-field').hidden=chosen!=='area'||!isEnem(goal);
 if($('#v13-subject-field'))$('#v13-subject-field').hidden=chosen!=='subject'||!isEnem(goal);
 if($('#v13-lang-field'))$('#v13-lang-field').hidden=!isEnem(goal);
 if($('#v13-exam-mode')&&!isEnem(goal))$('#v13-exam-mode').closest('.field').hidden=true;
 if(!Number.isInteger(count)||count<3||count>50){slot.textContent='Informe de 3 a 50 questões.';if(start)start.disabled=true;return;}
 try{
  const pool=assessmentPool(goal,mode,count,choices.language);
  const exam=composeExam(pool,goal,count,choices),areas=exam.blueprint.areas;
  slot.innerHTML='<h3>Composição do seu simulado</h3>'+
   '<p class="v9-mini">Prévia exata. Ao iniciar, o sistema usará estas cotas e questões. Sem nota TRI.</p>'+
   '<div class="v13-quotas">'+Object.entries(areas).map(([a,n])=>'<span>'+h(a)+': <b>'+n+'</b></span>').join('')+'</div>'+
   '<p class="v9-mini">'+exam.blueprint.total+' questões · '+exam.blueprint.visualCount+
   ' com gráficos, tabelas ou ilustrações · '+h(exam.blueprint.language||'Sem língua estrangeira específica')+'</p>';
  if(start)start.disabled=false;
 }catch(error){slot.innerHTML='<p class="v9-warn" role="alert">'+h(error.message)+'</p>';if(start)start.disabled=true;}
}
function startAssessment(goal,count,kind='initial',targeted=false){
 const opts=assessmentSettings(goal,kind),context={...goal,foreignLanguage:opts.language};
 const pool=assessmentPool(goal,kind,count,opts.language);
 if(pool.length<count){message('Há somente '+pool.length+' questões inéditas adequadas. Escolha uma quantidade menor.','error');return;}
 const built=composeExam(pool,context,count,opts);
 const selected=built.questions;
 const at=Date.now(),timerMode=$('#v14-timer-mode')?.value||'stopwatch';
  if(!['stopwatch','countdown','untimed'].includes(timerMode))throw Error('Modo de tempo inválido.');
  const limit=Number($('#v14-time-limit')?.value||60);
  if(timerMode==='countdown'&&(!Number.isInteger(limit)||limit<1||limit>360))throw Error('Escolha um prazo entre 1 e 360 minutos.');
  const timer={mode:timerMode,elapsedMs:0,runningSince:timerMode==='stopwatch'?at:null,
   durationMs:timerMode==='countdown'?limit*60000:null,deadlineAt:timerMode==='countdown'?at+limit*60000:null,lastObservedAt:at};
  const a={id:uid(),goalId:goal.id,kind,status:'in_progress',ids:selected.map(q=>q.id),answers:{},flagged:[],blueprint:built.blueprint,startedAt:at,updatedAt:at,timer,report:null};
 state.assessments.push(a);selectedAssessment=a.id;questionPosition=0;page='exam';if(persist())render();
}
function currentAssessment(){return state.assessments.find(a=>a.id===selectedAssessment);}
function renderExam(){const a=currentAssessment();if(!a||a.status!=='in_progress'){go('diagnostics');return;}
 const g=state.goals.find(x=>x.id===a.goalId),q=BANK.find(x=>x.id===a.ids[questionPosition]);if(!q){message('Uma questão não foi encontrada; suas respostas permanecem salvas.','error');go('diagnostics');return;}
 const answered=Object.values(a.answers).filter(v=>Number.isInteger(v)).length,flagged=new Set(a.flagged||[]);
 output(`${title(a.kind==='initial'?'Diagnóstico de conhecimento':'Reteste de aprendizagem',`${g.name} · Questão ${questionPosition+1} de ${a.ids.length}`)}<div class="v9-card"><div class="row between"><span class="v9-badge">${h(g.name)}</span><span class="v9-badge" id="v9-clock">${h(assessmentClockLabel(a))}</span></div><div class="v9-progress" aria-label="${answered} de ${a.ids.length} respondidas"><div style="width:${100*answered/a.ids.length}%"></div></div><div class="row between"><b>${answered} respondidas · ${a.ids.length-answered} em branco</b><span class="v9-mini" id="v9-save-msg">Salvamento local ativo</span></div><p class="v9-mini">${h(q.area)} · ${h(q.subject)} · ${h(q.topic)}</p><div class="v9-context">${h(q.context)}</div>${renderFigure(q.visual)}<h2 class="v9-question">${h(q.stem)}</h2><div role="radiogroup" aria-label="Alternativas da questão ${questionPosition+1}">${q.options.map((answer,i)=>`<label class="v9-option"><input type="radio" name="answer" value="${i}" ${a.answers[q.id]===i?'checked':''}><span><b>${'ABCDE'[i]})</b> ${h(answer)}</span></label>`).join('')}</div><label class="v9-choice" style="margin:15px 0"><input type="checkbox" id="review-toggle" ${flagged.has(q.id)?'checked':''}>Marcar esta questão para revisar antes de finalizar</label><div class="v9-actions"><button class="btn secondary" data-action="previous" ${questionPosition===0?'disabled':''}>← Anterior</button><button class="btn secondary" data-action="next" ${questionPosition===a.ids.length-1?'disabled':''}>Próxima →</button><button class="btn" data-action="finish">Finalizar avaliação</button></div><details style="margin-top:20px"><summary>Mapa de questões (${answered}/${a.ids.length})</summary><div class="v9-map" aria-label="Navegação de questões">${a.ids.map((id,i)=>`<button type="button" class="${Number.isInteger(a.answers[id])?'answered':''} ${flagged.has(id)?'flagged':''} ${questionPosition===i?'current':''}" data-action="jump" data-index="${i}" aria-label="Ir para questão ${i+1}">${i+1}</button>`).join('')}</div></details><div class="v9-actions">${cta('Salvar e continuar depois','suspend','secondary')}</div></div>`);
}
function finishAssessment(expired=false){const a=currentAssessment();if(!a||a.status!=='in_progress')return;
 const blank=a.ids.length-Object.keys(a.answers).length;
 if(!expired&&!confirm(`Finalizar a avaliação? Há ${blank} questão(ões) não respondida(s). Elas ficarão em branco, não serão contabilizadas como erros. Não será possível alterar as respostas após finalizar.`))return;
 const g=state.goals.find(x=>x.id===a.goalId);const measured=assessmentElapsedMs(a);pauseAssessmentClock(a);if(a.timer)a.timer.finishedElapsedMs=measured;a.report=analyzeAnswers(g,a,BANK);a.status='completed';a.completedAt=Date.now();a.updatedAt=Date.now();
 // Replanejar apenas tarefas FUTURAS ainda pendentes; manter todas as versões no histórico.
 if(hasEnoughEvidence(a))for(const task of state.tasks)if(task.day>=today()&&task.status==='pending'){task.status='superseded';task.supersededAt=Date.now();}
 const previousVersion=Math.max(0,...state.tasks.map(t=>t.version||0));const newTasks=hasEnoughEvidence(a)?buildAdaptiveSchedule({goals:state.goals,assessments:state.assessments,availability:availableMinutes(),bank:BANK,existing:state.tasks,start:new Date(),days:14,version:previousVersion+1}):[];
 const checks=verifyPlan([...state.tasks,...newTasks],availableMinutes());if(!checks.valid)throw Error('Planejamento gerou conflito e foi interrompido. Verifique os dias e horários.');
 state.tasks.push(...newTasks);if(persist()){page='report';selectedAssessment=a.id;render();message(hasEnoughEvidence(a)?'Diagnóstico corrigido e plano calculado a partir das respostas.':'Diagnóstico salvo. Evidências insuficientes para criar um plano personalizado; faça outra avaliação.');}
}
function correctionDetail(a,row,index){const q=BANK.find(x=>x.id===row.id),chosen=row.chosen,wrong=row.status==='wrong';if(!q)return'';
 const similar=BANK.find(x=>x.id!==q.id&&x.topic===q.topic&&!x.visual&&x.explanation);
 const video='https://www.youtube.com/results?search_query='+encodeURIComponent('aula '+q.subject+' '+q.topic);
 return `<details class="v9-detail" ${wrong?'':'data-optional="1"'}><summary>Questão ${index+1} · ${h(q.topic)} · <span class="v9-badge ${row.status==='correct'?'ok':wrong?'danger':'muted'}">${row.status==='correct'?'Acerto':wrong?'Precisa de revisão':'Não respondida'}</span></summary><p><b>${h(q.stem)}</b></p>${renderFigure(q.visual)}<p>Sua resposta: <strong>${chosen===null?'Não respondida':h('ABCDE'[chosen]+') '+q.options[chosen])}</strong></p><p>Resposta correta: <strong>${h('ABCDE'[q.answer]+') '+q.options[q.answer])}</strong></p><div class="v9-focus"><strong>Entender meu erro / consolidar o acerto</strong><p>${h(q.explanation)}</p><p><b>Conceito:</b> ${h(q.topic)}. ${wrong?'A causa exata do erro não pode ser inferida apenas pela alternativa escolhida.':'Use esta explicação para consolidar o assunto.'}</p>${similar?`<details><summary>Ver outro exemplo comentado</summary><p>${h(similar.stem)}</p><p>${h(similar.explanation)}</p></details>`:'<p class="v9-mini">Não há outro exemplo comentado validado para este assunto no banco atual.</p>'}</div><div class="row" style="margin-top:12px"><button class="btn secondary" data-action="study-topic" data-goal="${a.goalId}" data-topic="${h(q.topic)}">Estudar o assunto</button><button class="btn secondary" data-action="request-retest" data-id="${a.goalId}">Praticar questões inéditas</button><a class="btn ghost" href="${video}" target="_blank" rel="noopener noreferrer">Pesquisar videoaula ↗</a></div>${wrong?`<p class="v9-mini">Se desejar, identifique a possível causa: falta de conhecimento, interpretação, cálculo, tempo ou distração. Não será atribuída automaticamente.</p>`:''}</details>`;}
function renderReport(){const a=currentAssessment();if(!a||a.status!=='completed'){go('diagnostics');return;}
 const g=state.goals.find(x=>x.id===a.goalId),r=a.report,initial=latestInitial(g.id,state.assessments),prev=a.kind==='retest'?initial?.report:null;
 const rows=Object.entries(r.topics).sort((a,b)=>a[1].accuracy===null?1:b[1].accuracy===null?-1:(a[1].accuracy-b[1].accuracy));
 output(`${title('Seu diagnóstico está pronto','Vamos transformar seus resultados em um plano de estudos — sem confundir ausência de resposta com falta de conhecimento.')}<div class="v9-card"><h2>${h(g.name)} · ${a.kind==='retest'?'Reteste':'Avaliação inicial'}</h2>${!isEnem(g)?'<div class="v9-warn">Avaliação de habilidades gerais, provisória; não corresponde ao edital nem ao formato da prova selecionada.</div>':''}${!hasEnoughEvidence(a)?'<div class="v9-warn"><b>Avaliação com evidências insuficientes.</b> Você respondeu poucas questões para fundamentar um plano personalizado. Suas respostas ficam salvas; realize outro diagnóstico com mais questões respondidas.</div>':''}<div class="v9-grid">${[['Questões apresentadas',r.total],['Respondidas',r.answered],['Acertos',r.correct],['Erros',r.wrong],['Não respondidas',r.blank],['Precisão nas respondidas',r.accuracy+'%'],['Cobertura',r.coverage+'%'],['Tempo gasto',a.timer?.mode==='untimed'?'Sem limite':fmtTime(Math.floor(assessmentElapsedMs(a)/1000))]].map(([k,v])=>`<div class="v9-stat"><small>${h(k)}</small><strong>${h(v)}</strong></div>`).join('')}</div>${prev?`<div class="v9-info" style="margin-top:17px"><b>Comparação descritiva:</b> inicial ${prev.accuracy}% de acertos entre respondidas (${prev.answered} respostas), agora ${r.accuracy}% (${r.answered} respostas). As provas podem conter questões diferentes, então essa diferença não é prova isolada de domínio.</div>`:''}<div class="v9-info" style="margin-top:17px">Uma avaliação curta oferece indícios, não certeza de domínio. Apenas tópicos com evidência repetida recebem classificação mais forte.</div><h2 style="margin-top:24px">Desempenho por área</h2><div style="overflow-x:auto"><table class="v9-table"><thead><tr><th>Área</th><th>Acertos / respondidas</th><th>Em branco</th><th>Itens</th></tr></thead><tbody>${Object.entries(r.byArea||{}).map(([area,row])=>`<tr><td>${h(area)}</td><td>${row.correct} / ${row.answered}</td><td>${row.blank}</td><td>${row.total}</td></tr>`).join('')}</tbody></table></div><h2 style="margin-top:24px">Desempenho por matéria</h2><div style="overflow-x:auto"><table class="v9-table"><thead><tr><th>Matéria</th><th>Acertos / respondidas</th><th>Sem resposta</th></tr></thead><tbody>${Object.entries(r.bySubject).map(([subject,s])=>`<tr><td>${h(subject)}</td><td>${s.correct} / ${s.answered}</td><td>${s.blank}</td></tr>`).join('')}</tbody></table></div><h2 style="margin-top:22px">Assuntos e confiança na avaliação</h2><div style="overflow-x:auto"><table class="v9-table"><thead><tr><th>Assunto</th><th>Precisão</th><th>Classificação</th><th>Evidência</th></tr></thead><tbody>${rows.map(([topic,s])=>`<tr><td>${h(topic)}</td><td>${s.accuracy===null?'Não avaliado':s.accuracy+'%'}</td><td>${h(s.label)}</td><td>${h(s.evidence)}</td></tr>`).join('')}</tbody></table></div>${!Object.keys(r.bySkill||{}).length?'<p class="v9-mini">As habilidades específicas não estão etiquetadas neste banco: não seria correto inventar desempenho por competência.</p>':''}<div class="v9-actions">${hasEnoughEvidence(a)?cta('VER MEU PLANO PERSONALIZADO','plan-after-report'):cta('FAZER NOVO DIAGNÓSTICO','other-goals')}${cta('Ver outras provas','other-goals','secondary')}</div></div><div class="v9-card"><h2>Correção comentada e oportunidades de aprendizagem</h2><p class="v9-lead">As questões não respondidas aparecem separadamente. Os erros têm explicações e um caminho para estudar ou praticar. Os acertos também podem ser revisados.</p>${r.rows.map((row,i)=>correctionDetail(a,row,i)).join('')}</div>`);
}

function rescheduleTask(taskId,day){
 const task=state.tasks.find(t=>t.id===taskId);
 if(!task||task.status!=='pending')throw Error('Só é possível remarcar tarefas pendentes.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||Number.isNaN(new Date(day+'T12:00:00').getTime()))throw Error('Escolha uma data válida.');
 const date=new Date(day+'T12:00:00');
 if(date.toLocaleDateString('sv-SE')!==day)throw Error('Data inválida.');
 const cap=availableMinutes()[String(date.getDay())]||0,minutes=Number(task.minutes);
 const occupied=state.tasks.filter(t=>t.id!==taskId&&t.day===day&&!['superseded','cancelled'].includes(t.status));
 if(occupied.reduce((n,t)=>n+Number(t.minutes||0),0)+minutes>cap)
  throw Error('Este dia não possui minutos livres suficientes. Escolha outra data.');
 const booked=occupied.map(t=>({start:Math.max(0,Number(t.startMinute??480)),end:Math.max(0,Number(t.startMinute??480))+Number(t.minutes||0)}))
  .sort((a,b)=>a.start-b.start);
 let start=480;
 for(const interval of booked){
  if(start+minutes<=interval.start)break;
  start=Math.max(start,interval.end);
 }
 if(start+minutes>1440)throw Error('Não há um horário livre neste dia.');
 const backup={day:task.day,startMinute:task.startMinute};
 task.day=day;task.startMinute=start;task.updatedAt=Date.now();
 const check=verifyPlan(state.tasks,availableMinutes());
 if(!check.valid){Object.assign(task,backup);throw Error('Remarcação rejeitada: conflito de agenda.');}
 if(!persist()){Object.assign(task,backup);return;}
 rescheduleTaskId=null;renderPlan();message('Atividade remarcada sem alterar o histórico concluído.');
}

function renderPlan(){const filtered=selectedGoal?state.goals.filter(g=>g.id===selectedGoal):state.goals;
 const available=filtered.filter(g=>isGoalEvaluated(g,state.assessments));let tasks=state.tasks.filter(t=>!['superseded','cancelled'].includes(t.status)&&available.some(g=>g.id===t.goalId));
 const pending=state.goals.filter(g=>!isGoalEvaluated(g,state.assessments));
 const allDays=[...new Set(tasks.map(t=>t.day))].sort();
  const base=new Date(today()+'T12:00:00'),weekLimit=new Date(base),monthLimit=new Date(base);
  weekLimit.setDate(weekLimit.getDate()+7);monthLimit.setMonth(monthLimit.getMonth()+1);
  const dateKey=d=>d.toLocaleDateString('sv-SE');
  const days=allDays.filter(d=>planView==='all'||(planView==='today'&&d===today())||(planView==='week'&&d>=today()&&d<dateKey(weekLimit))||(planView==='month'&&d>=today()&&d<dateKey(monthLimit)));
  const check=verifyPlan(state.tasks,availableMinutes());
 output(`${title('Meu plano personalizado','Cada tarefa leva em conta os erros, os acertos, os assuntos não avaliados e o tempo total disponível.')}<div class="v9-card"><h2>Estado das suas provas</h2>${pending.map(g=>`<div class="v9-goal"><div><b>${h(g.name)}</b><p>${g.type==='Prova escolar'?'Conteúdo escolar desta série aguardando validação editorial.':'Plano bloqueado: diagnóstico inicial não concluído.'}</p></div><button class="btn" data-action="choose-assessment" data-id="${g.id}">${g.type==='Prova escolar'?'Ver situação':'Começar diagnóstico'}</button></div>`).join('')}${available.length?`<div class="v9-success">${available.length} objetivo(s) com diagnóstico concluído. O estudo das demais provas permanece bloqueado até sua avaliação.</div>`:''}<p class="v9-lead">Disponibilidade semanal: <b>${Object.entries(availableMinutes()).filter(([,n])=>n>0).map(([day,n])=>weekdays[Number(day)]+' '+n+' min').join(' · ')}</b>. O total diário respeita cada dia.</p>${check.valid?'<p class="v9-mini">Verificação: sem sobreposição ou excesso de minutos.</p>':'<div class="v9-warn">A agenda contém um conflito. Exporte um backup e confira as tarefas.</div>'}<div class="v9-actions"><button class="btn secondary" data-action="plan-all">Mostrar todas as provas</button><button class="btn secondary" data-action="plan-extend">Planejar próximos 14 dias</button></div><div class="v9-actions" aria-label="Visualização do calendário">${[['today','Hoje'],['week','Semana'],['month','Mês'],['all','Todas']].map(([view,label])=>'<button type="button" class="btn '+(planView===view?'':'secondary')+'" data-action="plan-view" data-view="'+view+'">'+label+'</button>').join('')}</div></div>${!available.length?'<div class="v9-warn">Nenhum plano personalizado disponível. Complete primeiro um diagnóstico.</div>':days.length?days.map(day=>{const group=tasks.filter(t=>t.day===day);return `<section class="v9-card"><div class="row between"><h2>${h(prettyDate(day))}</h2><span class="v9-badge">${group.reduce((n,t)=>n+t.minutes,0)} minutos planejados</span></div>${group.map(t=>`<article class="v9-task ${t.status==='completed'?'done':''}"><div class="row"><span class="v9-badge">${h(state.goals.find(g=>g.id===t.goalId)?.name||'Prova')}</span><span class="v9-badge ${t.priority==='high'?'danger':'muted'}">${h(labels[t.priority]||t.priority)}</span></div><h3>${h(t.subject)} — ${h(t.topic)}</h3><p>${h(t.objective)} · ${t.minutes} minutos</p><p class="v9-mini">${h(t.reason)} · Evidência: ${h(t.confidence)}. Teoria ${t.parts.theory} min, exemplos ${t.parts.example} min, exercícios ${t.parts.practice} min, revisão ${t.parts.review} min.</p><div class="row"><button class="btn secondary" data-action="study-topic" data-goal="${t.goalId}" data-topic="${h(t.topic)}">Estudar assunto</button><button class="btn ${t.status==='completed'?'ghost':''}" data-action="complete-task" data-id="${t.id}" ${t.status==='completed'?'disabled':''}>${t.status==='completed'?'Concluída ✓':'Concluir atividade'}</button><button class="btn secondary" type="button" data-action="reschedule-open" data-id="${t.id}" ${t.status==='completed'?'disabled':''}>Remarcar</button></div>${rescheduleTaskId===t.id?`<form id="v14-reschedule-form" data-id="${t.id}" class="v9-form"><div class="field"><label for="v14-new-day">Nova data da atividade</label><input id="v14-new-day" type="date" name="new_day" value="${h(t.day)}" required></div><div class="v9-actions"><button type="submit" class="btn">Confirmar remarcação</button></div></form>`:''}</article>`).join('')}</section>`}).join(''):'<div class="v9-card"><p>Nenhuma tarefa gerada para os dias disponíveis. Confira seu calendário e escolha dias com tempo livre.</p></div>'}`);
}

function renderPastPapers(){
 const archive=ENEM_OFFICIAL_ARCHIVE;
 output(title('Provas anteriores','Consulte provas e gabaritos diretamente no acervo oficial do Inep.')+
  '<div class="v9-card"><h2>Acervo histórico do ENEM</h2>'+
  '<p class="v9-lead">O Inep publica os cadernos e gabaritos de edições anteriores. A VYZO ACADEMY ainda não converteu esses PDFs em avaliações interativas: consulte os documentos originais.</p>'+
  '<div class="field"><label for="v15-past-year">Ano da edição</label><select id="v15-past-year">'+
  archive.years.map(y=>'<option value="'+y+'">'+y+'</option>').join('')+
  '</select></div><p id="v15-past-selection" class="v9-mini">Edição selecionada: '+archive.years[0]+'. Localize esse ano na página oficial.</p>'+
  '<div class="v9-actions"><a class="btn" href="'+h(archive.url)+'" target="_blank" rel="noopener noreferrer">Abrir provas e gabaritos oficiais no Inep</a></div>'+
  '<p class="v9-mini">O índice oficial reúne todas as edições. Os links diretos abaixo só aparecem quando catalogados e conferidos no índice; a disponibilidade dos PDFs depende do Inep e o conteúdo não foi convertido em simulado.</p>'+
  '<div id="v15-past-direct" aria-live="polite">'+officialPaperHtml(archive.years[0],h)+'</div>'+
  '</div>');
}
function renderLibrary(){
 const rows=[],seen=new Set();
 for(const goal of state.goals.filter(g=>g.status!=='archived')){
  const allowed=isGoalEvaluated(goal,state.assessments);
  for(const q of suitableQuestions(BANK,goal)){
   const key=goal.id+'|'+q.area+'|'+q.subject+'|'+q.topic;
   if(seen.has(key))continue;seen.add(key);
   rows.push({goal,question:q,allowed});
  }
 }
 rows.sort((a,b)=>a.goal.name.localeCompare(b.goal.name)||a.question.area.localeCompare(b.question.area)||
  a.question.subject.localeCompare(b.question.subject)||a.question.topic.localeCompare(b.question.topic));
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const items=rows.slice(0,200).map(({goal,question:q,allowed})=>
  '<article class="v14-library-item" data-search="'+h(normalize([goal.name,q.area,q.subject,q.topic].join(' ')))+'">'+
  '<p class="v9-mini">'+h(goal.name)+' · '+h(q.area)+' → '+h(q.subject)+'</p>'+
  '<h3>'+h(q.topic)+'</h3><p class="v9-mini">'+h(allowed?'Conteúdo explicativo do banco autoral; verifique as fontes e a dificuldade.':'Faça o diagnóstico inicial para receber orientação baseada no seu desempenho.')+'</p>'+
  (allowed?'<button type="button" class="btn secondary" data-action="study-topic" data-goal="'+h(goal.id)+'" data-topic="'+h(q.topic)+'">Estudar este assunto</button>':'')+
  '</article>').join('');
 output(title('Biblioteca de estudos','Localize assuntos reais do banco autoral por prova, área e disciplina.')+
  '<div class="v9-card"><div class="field"><label for="v14-library-search">Pesquisar aula, disciplina ou assunto</label>'+
  '<input id="v14-library-search" type="search" placeholder="Ex.: porcentagem, física, geografia" autocomplete="off"></div>'+
  '<p class="v9-mini">Conteúdo existente; não se trata de aulas geradas ou corrigidas por IA. Os temas não cadastrados no banco não serão inventados.</p>'+
  '<div class="v14-library-grid" id="v14-library-results">'+(items||'<p>Não há conteúdos compatíveis com suas provas. Configure as matérias ou complete o primeiro diagnóstico.</p>')+'</div>'+
  (rows.length>200?'<p class="v9-mini">Exibindo os primeiros 200 assuntos. Refine sua pesquisa quando houver uma biblioteca ampliada.</p>':'')+'</div>');
}
function renderRevisions(){
 const wrong=[];
 for(const a of state.assessments.filter(a=>a.status==='completed'&&Array.isArray(a.report?.rows))){
  const goal=state.goals.find(g=>g.id===a.goalId);
  for(const row of a.report.rows){
   if(row.status!=='wrong')continue;
   const q=BANK.find(item=>item.id===row.id);
   if(q)wrong.push({assessment:a,goal,question:q,row});
  }
 }
 wrong.sort((a,b)=>(b.assessment.completedAt||0)-(a.assessment.completedAt||0));
 const content=wrong.slice(0,100).map(({assessment:a,goal,question:q,row})=>
  '<details class="v9-detail"><summary>'+h(goal?.name||'Prova')+' · '+h(q.subject)+' · '+h(q.topic)+'</summary>'+
  '<p><b>Questão:</b> '+h(q.stem)+'</p>'+
  renderFigure(q.visual)+
  '<p><b>Resposta assinalada:</b> '+h(Number.isInteger(row.chosen)?'ABCDE'[row.chosen]+') '+q.options[row.chosen]:'Não registrada')+'</p>'+
  '<p><b>Resposta correta:</b> '+h('ABCDE'[q.answer]+') '+q.options[q.answer])+'</p>'+
  '<p><b>Explicação do banco autoral:</b> '+h(q.explanation)+'</p>'+
  '<p class="v9-mini">Uma alternativa errada não revela por si só a causa do erro. Identifique o que precisa reforçar.</p>'+
  '<div class="v9-actions"><button type="button" class="btn secondary" data-action="study-topic" data-goal="'+h(a.goalId)+'" data-topic="'+h(q.topic)+'">Revisar o assunto</button>'+
  '<button type="button" class="btn secondary" data-action="request-retest" data-id="'+h(a.goalId)+'">Testar com questões inéditas</button></div></details>'
 ).join('');
 output(title('Meus erros e revisões','Revise respostas incorretas sem tratar questões em branco como erros.')+
  '<div class="v9-card"><h2>Questões que precisam de atenção</h2>'+
  '<p class="v9-lead">'+wrong.length+' resposta(s) incorreta(s) identificada(s) nos relatórios locais disponíveis.</p>'+
  (content||'<p>Nenhum erro foi registrado em diagnósticos concluídos nesta jornada. Questões em branco não entram nesta lista.</p>')+
  (wrong.length>100?'<p class="v9-mini">Mostrando as 100 ocorrências mais recentes. O histórico completo permanece salvo.</p>':'')+
  '</div>');
}

function renderStudy(){const complete=state.goals.filter(g=>isGoalEvaluated(g,state.assessments)),done=state.tasks.filter(t=>t.status==='completed');
 output(`${title('Estudar, revisar e retestar','O conteúdo parte dos seus diagnósticos, e novas questões ajudam a verificar a evolução.')}<div class="v9-card"><h2>Assuntos recomendados</h2>${complete.map(g=>{const rec=topicRecommendations(g,latestReport(g.id,state.assessments),BANK);return `<div class="v9-detail"><h3>${h(g.name)}</h3>${rec.slice(0,12).map(x=>`<div class="v9-goal"><div><b>${h(x.subject)} · ${h(x.topic)}</b><p>${h(x.reason)} · ${h(x.confidence)}</p></div><button class="btn secondary" data-action="study-topic" data-goal="${g.id}" data-topic="${h(x.topic)}">Abrir conteúdo</button></div>`).join('')}<div class="row"><button class="btn" data-action="request-retest" data-id="${g.id}" ${!done.some(t=>t.goalId===g.id)?'disabled title="Conclua pelo menos uma atividade para liberar o reteste"':''}>Fazer reteste com questões novas</button></div></div>`;}).join('')}${!complete.length?'<p class="v9-warn">Primeiro termine um diagnóstico para liberar a aprendizagem guiada.</p>':''}</div>`);
}
function renderLesson(){const g=state.goals.find(x=>x.id===lessonGoal);if(!g||!state.assessments.some(a=>a.goalId===g.id&&a.status==='completed')){go('hub');return;}
 const examples=BANK.filter(q=>q.topic===lessonTopic&&!q.visual&&q.explanation).slice(0,3),video='https://www.youtube.com/results?search_query='+encodeURIComponent('aula '+(examples[0]?.subject||g.type)+' '+lessonTopic);
 output(`${title('Estudar: '+lessonTopic,`${g.name} · Conteúdos do banco de questões autorais, sem explicações inventadas.`)}<div class="v9-card v9-lesson"><div class="v9-info">Estude este conceito, revise as explicações e depois tente questões inéditas. ${examples.length?'As explicações abaixo vêm do banco original, sem geração automática por IA.':'Ainda não há uma aula validada específica para este tópico.'}</div>${examples.map((q,i)=>`<div class="v9-detail"><h3>Exemplo comentado ${i+1}: ${h(q.subject)}</h3><p>${h(q.context)}</p><p><b>${h(q.stem)}</b></p><p><b>Explicação:</b> ${h(q.explanation)}</p></div>`).join('')}<div class="v9-actions"><button class="btn" data-action="request-retest" data-id="${g.id}">Praticar com questões novas</button><a class="btn secondary" href="${video}" target="_blank" rel="noopener noreferrer">Pesquisar videoaula ↗</a><button class="btn secondary" data-page="plan">Voltar ao plano</button></div><p class="v9-mini">O link abre uma busca pública no YouTube. Títulos e métricas de vídeos não foram verificados.</p></div>`);
}
function renderData(){output(`${title('Backup e privacidade',window.VYZO_V9_CLOUD?'Seus dados ficam vinculados à conta e são sincronizados quando a nuvem estiver disponível.':'O progresso desta experiência fica somente neste navegador. Não há conta nem sincronização entre dispositivos.')}<div class="v9-card"><h2>Proteja seu progresso</h2><p>Faça backup antes de trocar de aparelho, limpar dados do navegador ou abrir em uma sessão privada.</p><div class="v9-actions">${cta('Baixar backup JSON','export')}${cta('Importar backup V9','show-import','secondary')}</div><input type="file" accept="application/json,.json" id="v9-import-file" hidden><p class="v9-mini">Chave local: ${window.VYZO_V9_CLOUD?'isolada por conta':KEY}. O backup não contém senhas. Não contém dados do antigo simulador, que permanece intacto no endereço original.</p></div>`);}
function render(){if(!state.onboarding||page==='wizard'){page='wizard';renderWizard();return;}
 if(page==='hub')renderHub();else if(page==='goals')renderGoals();else if(page==='diagnostics')renderDiagnostics();else if(page==='edit-goal')renderEditGoal();else if(page==='ready')renderReady();else if(page==='exam')renderExam();else if(page==='report')renderReport();else if(page==='plan')renderPlan();else if(page==='study')renderStudy();else if(page==='library')renderLibrary();else if(page==='past-papers')renderPastPapers();else if(page==='revisions')renderRevisions();else if(page==='lesson')renderLesson();else if(page==='data')renderData();else renderHub();
}
function setMobileMenu(expanded){
 const nav=$('#v9-nav'),button=$('#v9-nav-toggle');
 if(!nav||!button)return;
 nav.classList.toggle('is-expanded',expanded);
 button.setAttribute('aria-expanded',String(expanded));
 const label=button.querySelector('.v9-nav-toggle-label');
 if(label)label.textContent=expanded?'Recolher seções':'Ver todas as seções';
}
function focusPageHeading(){
 const heading=$('#v9-content h1');
 if(!heading)return;
 heading.setAttribute('tabindex','-1');
 heading.focus({preventScroll:true});
}
function go(to){if(page==='exam'&&to!=='exam'){const a=currentAssessment();if(a?.status==='in_progress'){pauseAssessmentClock(a);persist();}}if(!state.onboarding&&to!=='wizard'){page='wizard';renderWizard();return;}page=to;if(to==='plan')selectedGoal=null;render();window.scrollTo({top:0,behavior:'instant'});}
function download(name,value){const b=new Blob([value],{type:'application/json;charset=utf-8'}),link=document.createElement('a'),url=URL.createObjectURL(b);link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
function backup(){download('VYZO_ACADEMY_V9_BACKUP_'+today()+'.json',JSON.stringify({...state,exportedAt:Date.now(),source:'VYZO ACADEMY V9 modo local'},null,2));}
function importBackup(file){if(!file||file.size>5_000_000)throw Error('O arquivo é muito grande ou inválido.');const reader=new FileReader();reader.onload=()=>{try{const x=JSON.parse(String(reader.result));if(x.schema!==9||!Array.isArray(x.goals)||!Array.isArray(x.assessments)||!Array.isArray(x.tasks)||!x.profile||typeof x.profile!=='object')throw Error('Este arquivo não é um backup V9 válido.');if(x.goals.length>100||x.assessments.length>2000||x.tasks.length>20000)throw Error('Arquivo maior que os limites de importação.');for(const g of x.goals)if(typeof g.id!=='string'||typeof g.name!=='string')throw Error('Prova inválida no backup.');for(const a of x.assessments)if(typeof a.id!=='string'||!Array.isArray(a.ids)||a.ids.length>50||!a.answers||typeof a.answers!=='object')throw Error('Diagnóstico inválido no backup.');
 if(!confirm('A importação substituirá apenas os dados locais V9 deste navegador. Deseja baixar o backup atual e continuar?'))return;backup();const old=state;state=x;state.draft=null;draft={types:[],goals:[],minutes:state.profile.minutes,weekdays:state.profile.weekdays,confidence:state.profile.confidence,difficulties:state.profile.difficulties||[],style:state.profile.style};if(!persist()){state=old;return;}page='hub';render();message('Backup V9 restaurado.');
 }catch(e){message('Importação rejeitada: '+e.message,'error');}};reader.readAsText(file);}
function onAction(el){const action=el.dataset.action,id=el.dataset.id;
 if(action==='wizard-back'){step=Math.max(0,step-1);state.wizardStep=step;persist();render();}
 else if(action==='add-goal')beginWizard(true);
  else if(action==='v15-add-enem'){
   if(draft.goals.some(g=>g.type==='ENEM')){message('O ENEM já foi adicionado a esta seleção.');return;}
   draft.types=[...new Set([...draft.types,'ENEM'])];
   draft.goals.push({type:'ENEM',name:'ENEM',subjects:[...AREAS],institution:'Inep',position:'',board:'',edition:'',examDate:'',provisional:false,
    sourceStatus:'Edição e edital ainda não conferidos'});
   persist();renderWizard();message('ENEM adicionado como objetivo geral, sem inventar edição ou data.');
  }
  else if(action==='edit-goal'){editingGoalId=id;page='edit-goal';render();}
  else if(action==='duplicate-goal'){
   const original=state.goals.find(g=>g.id===id);if(!original)throw Error('Prova indisponível.');
   const {curriculumHistory,curriculumChangedAt,...settings}=original;
   state.goals.push({...settings,id:uid(),name:original.name+' (cópia)',status:'preparing',createdAt:Date.now(),updatedAt:Date.now()});
   persist();render();message('Configuração duplicada sem copiar diagnósticos ou histórico de respostas.');
  }
  else if(action==='archive-goal'){
   const g=state.goals.find(x=>x.id===id);if(!g||g.status==='archived')return;
   if(!confirm('Arquivar esta prova? O histórico será preservado e o objetivo sairá do planejamento ativo.'))return;
   g.status='archived';for(const t of state.tasks)if(t.goalId===g.id&&t.status==='pending'){t.status='superseded';t.supersededAt=Date.now();}
   persist();render();message('Prova arquivada, sem excluir seus dados.');
  }
 else if(action==='choose-assessment'){selectedGoal=id;page='ready';render();}
 else if(action==='enable-provisional'){const g=state.goals.find(x=>x.id===selectedGoal);g.provisional=true;persist();render();}
 else if(action==='resume-assessment'){selectedAssessment=id;questionPosition=0;const a=currentAssessment();if(!a||a.status!=='in_progress')return;resumeAssessmentClock(a);persist();page='exam';render();tick();}
 else if(action==='jump'){questionPosition=Number(el.dataset.index);render();}
 else if(action==='previous'){questionPosition=Math.max(0,questionPosition-1);render();}
 else if(action==='next'){questionPosition=Math.min(currentAssessment().ids.length-1,questionPosition+1);render();}
 else if(action==='finish')finishAssessment();
 else if(action==='suspend')go('diagnostics');
 else if(action==='open-report'){selectedAssessment=id;page='report';render();}
 else if(action==='open-plan'){selectedGoal=id;page='plan';renderPlan();}
 else if(action==='plan-after-report'){selectedGoal=currentAssessment().goalId;page='plan';renderPlan();}
 else if(action==='other-goals')go('diagnostics');
 else if(action==='study-topic'){lessonGoal=el.dataset.goal;lessonTopic=el.dataset.topic;page='lesson';renderLesson();}
 else if(action==='request-retest'){const goal=state.goals.find(g=>g.id===id);if(!goal||!isGoalEvaluated(goal,state.assessments)){message('Termine o diagnóstico inicial desta prova primeiro.','error');return;}const started=state.tasks.some(t=>t.goalId===id&&t.status==='completed');if(!started){message('Conclua ao menos uma atividade do plano antes de retestar.','error');return;}const used=state.assessments.filter(a=>a.goalId===id).flatMap(a=>a.ids),free=suitableQuestions(BANK,goal,used).length;if(free<3){message('Ainda não há questões inéditas suficientes para um reteste confiável.','error');return;}selectedGoal=id;mode='retest';page='ready';renderReady();message('Reteste: selecione uma quantidade de questões inéditas.');}
 else if(action==='toggle-goal'){const goal=state.goals.find(g=>g.id===id);if(!goal)return;goal.status=goal.status==='paused'||goal.status==='archived'?'preparing':'paused';persist();render();}
 else if(action==='complete-task'){const task=state.tasks.find(t=>t.id===id);if(task&&task.status!=='completed'){task.status='completed';task.completedAt=Date.now();persist();render();message('Atividade concluída. Um reteste ficará disponível para esta prova.');}}
 else if(action==='plan-all'){selectedGoal=null;renderPlan();}
  else if(action==='plan-view'){planView=['today','week','month','all'].includes(el.dataset.view)?el.dataset.view:'all';renderPlan();}
  else if(action==='reschedule-open'){rescheduleTaskId=id;renderPlan();}
 else if(action==='plan-extend'){const version=Math.max(0,...state.tasks.map(t=>t.version||0))+1;const last=state.tasks.map(t=>t.day).sort().at(-1);const start=last?new Date(last+'T12:00:00'):new Date();start.setDate(start.getDate()+1);const additions=buildAdaptiveSchedule({goals:state.goals,assessments:state.assessments,availability:availableMinutes(),bank:BANK,existing:state.tasks,start,days:14,version});if(!additions.length){message('Não há tempo livre ou provas com diagnóstico para adicionar tarefas.','error');return;}const valid=verifyPlan([...state.tasks,...additions],availableMinutes());if(!valid.valid)throw Error('Agenda rejeitada: conflito de horário.');state.tasks.push(...additions);persist();renderPlan();message(additions.length+' novas atividades planejadas.');}
 else if(action==='export')backup();else if(action==='show-import')$('#v9-import-file')?.click();
}
document.addEventListener('click',event=>{const special=event.target.closest('[data-action^="v10-"]');if(special){event.preventDefault();if(special.dataset.action==='v10-research'){researchExam().catch(e=>message(e.message,'error'));return;}if(special.dataset.action==='v10-select'){try{selectResearchResult(Number(special.dataset.index));}catch(e){message(e.message,'error');}return;}if(special.dataset.action==='v10-remove'){draft.goals=draft.goals.filter(g=>!(g.name===special.dataset.name&&(g.edition||'')===special.dataset.edition));draft.types=[...new Set(draft.goals.map(g=>g.type))];persist();renderWizard();return;}}const nav=event.target.closest('[data-page]');if(nav){go(nav.dataset.page);if(nav.closest('#v9-nav')){setMobileMenu(false);focusPageHeading();}return;}const a=event.target.closest('[data-action]');if(!a||a.disabled)return;try{onAction(a);}catch(e){message('Não foi possível concluir: '+e.message,'error');}});
document.addEventListener('change',e=>{const el=e.target;
 if(el.id==='exam-length'){$('#custom-length-wrap').hidden=el.value!=='custom';}
 if(['exam-length','custom-length','v13-exam-mode','v13-area','v13-subject','v13-language'].includes(el.id))updateCompositionPreview();
 if(el.id==='v9-minutes'){$('#v9-custom-wrap').hidden=el.value!=='custom';}
  if(el.id==='v14-timer-mode')$('#v14-time-limit-wrap').hidden=el.value!=='countdown';
 if(el.id==='v15-learning-path'){
  const school=isSchoolPath(el.value),research=$('.v10-research'),manual=$('.v10-manual');
  if(research)research.hidden=school;
  if(manual)manual.hidden=school;
 }
 if(el.id==='v15-past-year'){const display=$('#v15-past-selection'),direct=$('#v15-past-direct');if(display)display.textContent='Edição selecionada: '+el.value+'. Consulte os documentos listados abaixo ou abra o índice do Inep.';if(direct)direct.innerHTML=officialPaperHtml(el.value,h);}
 if(el.id.startsWith('v15-school-stage-')){
  const index=el.id.slice('v15-school-stage-'.length),target=$('#v15-school-year-'+index);
  if(target)target.innerHTML=schoolYears(el.value).map(y=>'<option value="'+y+'">'+y+'º ano</option>').join('');
   updateSchoolSubjectFields(index);
 }
 if(el.id.startsWith('v15-school-year-'))updateSchoolSubjectFields(el.id.slice('v15-school-year-'.length));
  if(el.name==='answer'){const a=currentAssessment(),qid=a.ids[questionPosition];a.answers[qid]=Number(el.value);a.updatedAt=Date.now();if(persist()){render();message('Resposta salva neste navegador.');}}
 if(el.id==='review-toggle'){const a=currentAssessment(),qid=a.ids[questionPosition];a.flagged=a.flagged||[];a.flagged=el.checked?[...new Set([...a.flagged,qid])]:a.flagged.filter(x=>x!==qid);persist();render();}
 if(el.id==='v9-import-file'&&el.files?.[0])importBackup(el.files[0]);
});
document.addEventListener('input',e=>{
 if(e.target.id==='v10-exam-query'){
  const suggestion=$('#v15-enem-suggestion');
  if(suggestion)suggestion.hidden=!searchVerifiedExam(e.target.value).some(x=>x.id==='enem');
 }
 if(e.target.id==='custom-length')updateCompositionPreview();
 if(e.target.id==='v14-library-search'){
  const query=String(e.target.value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  $$('.v14-library-item').forEach(el=>{el.hidden=!el.dataset.search.includes(query);});
 }
});
document.addEventListener('submit',e=>{const f=e.target;if(!['wizard-form','start-diagnostic-form','edit-goal-form','v14-reschedule-form'].includes(f.id))return;e.preventDefault();try{if(f.id==='wizard-form'){saveStep(f);if(step===3)endWizard();else {step++;state.wizardStep=step;persist();render();}}else if(f.id==='edit-goal-form'){saveGoalEdit(f);}else if(f.id==='v14-reschedule-form'){rescheduleTask(f.dataset.id,String(new FormData(f).get('new_day')||''));}else{const g=state.goals.find(x=>x.id===selectedGoal),fd=new FormData(f);const n=fd.get('count')==='custom'?Number(fd.get('custom_count')):Number(fd.get('count'));if(!Number.isInteger(n)||n<3||n>50)throw Error('Escolha de 3 a 50 questões.');startAssessment(g,n,mode,mode==='retest');mode='initial';}}catch(err){message(err.message,'error');}});
window.addEventListener('storage',event=>{if(event.key===ACTIVE_KEY&&event.newValue!==JSON.stringify(state)){conflict=true;message('Outra aba alterou seu progresso. Exporte um backup e atualize esta página antes de continuar.','error');}});
let lastHeartbeat=0;
function tick(){if(page!=='exam')return;const a=currentAssessment(),el=$('#v9-clock');if(!a||a.status!=='in_progress')return;
  if(a.timer?.mode==='countdown'&&Date.now()>=a.timer.deadlineAt){finishAssessment(true);message('O prazo terminou. Suas respostas foram corrigidas e as questões em branco permaneceram em branco.');return;}
  if(el)el.textContent=assessmentClockLabel(a);
  if(a.timer?.mode==='stopwatch'&&Date.now()-lastHeartbeat>=5000){lastHeartbeat=Date.now();a.timer.lastObservedAt=lastHeartbeat;persist();}
}
setInterval(tick,1000);
window.addEventListener('pagehide',()=>{if(page==='exam'){const a=currentAssessment();if(a?.status==='in_progress'){pauseAssessmentClock(a);try{persist();}catch{}}}});
$('#v9-nav-toggle')?.addEventListener('click',()=>{
 const expanded=$('#v9-nav-toggle').getAttribute('aria-expanded')==='true';
 setMobileMenu(!expanded);
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&$('#v9-nav')?.classList.contains('is-expanded')){
  setMobileMenu(false);
  $('#v9-nav-toggle')?.focus();
 }
});
function syncThemeControl(){
 $('#v9-theme').setAttribute('aria-pressed',String(document.body.dataset.theme==='dark'));
}
$('#v9-theme').addEventListener('click',()=>{const theme=document.body.dataset.theme==='dark'?'light':'dark';document.body.dataset.theme=theme;syncThemeControl();try{localStorage.setItem('vyzo-v9-theme',theme);}catch{}});
try{document.body.dataset.theme=localStorage.getItem('vyzo-v9-theme')==='dark'?'dark':'light';}catch{document.body.dataset.theme='light';}
syncThemeControl();
if(storageFailure)message(storageFailure,'error');render();
