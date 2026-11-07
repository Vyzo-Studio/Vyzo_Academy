/** Interface da Subetapa A: DOM seguro, sem innerHTML de redações e sem chamadas de IA. */
import {WRITING_CATEGORIES,WRITING_CATALOG_VERSION,getWritingProposals,getWritingProposal,
 OFFICIAL_WRITING_GUIDE,essayMetrics,formatWritingTimer} from './essay-lab.mjs';

function el(tag,text,classes){
 const node=document.createElement(tag);
 if(text!==undefined&&text!==null)node.textContent=String(text);
 if(classes)node.className=classes;
 return node;
}
function btn(title,action,id,classes='btn secondary'){
 const button=el('button',title,classes);button.type='button';button.dataset.action=action;
 if(id)button.dataset.id=id;return button;
}
function info(tag,content,classes){return el(tag,content,classes);}
function sourceLink(source){
 const a=el('a',source.publisher+' — '+source.title);
 a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';return a;
}
function choiceControl(id,name,options,selected){
 const wrap=el('div',null,'field');const label=el('label',name);label.htmlFor=id;
 const select=el('select',null,'text');select.id=id;
 for(const option of options){
  const item=el('option',option.label);item.value=option.value;item.selected=option.value===selected;
  select.append(item);
 }wrap.append(label,select);return wrap;
}
export function renderWritingCatalog(root,{essays,goals,category,mode}){
 root.replaceChildren();
 const hero=el('div',null,'essay-hero');
 hero.append(el('p','LABORATÓRIO DE REDAÇÃO · PROPOSTAS CONFERIDAS','eyebrow'),
  el('h2','Escolha uma proposta e comece a escrever'),
  el('p','Leia os textos motivadores, produza seu rascunho e acompanhe as versões. A correção por IA ainda NÃO está disponível.'));
 root.append(hero);
 const controls=el('section',null,'card essay-catalog-controls');
 controls.append(choiceControl('essay-category','Modalidade',WRITING_CATEGORIES.map(c=>({value:c.id,label:c.name})),category),
  choiceControl('essay-mode','Modo de escrita',[{value:'treino',label:'Treino — orientação antes da escrita'},
   {value:'simulado',label:'Simulado — sem dicas durante a produção'}],mode));
 const goalOptions=[{value:'',label:'Sem prova vinculada'}];
 for(const goal of goals)goalOptions.push({value:goal.id,label:goal.exam_name||'Objetivo registrado'});
 controls.append(choiceControl('essay-goal','Objetivo educacional (opcional)',goalOptions,''));
 root.append(controls);
 const list=el('section',null,'essay-catalog-list');
 const categoryInfo=WRITING_CATEGORIES.find(c=>c.id===category);
 list.append(el('h3','Propostas disponíveis'),el('p',categoryInfo?.description||'','small muted'));
 const proposals=getWritingProposals(category);
 for(const p of proposals){
  const card=el('article',null,'card essay-proposal-card');
  card.append(el('p',p.provenance+' · Versão '+p.versionLabel,'essay-proposal-kind'),
    el('h4',p.theme),el('p',p.genre+' · '+p.educationalLevel,'small muted'));
  card.append(el('p',p.instructions));
  const foot=el('div',null,'essay-proposal-foot');
  foot.append(el('span',p.supports.length+' materiais motivadores · '+p.sources.length+' referências','small muted'));
  foot.append(btn('Escolher proposta e escrever','essay-start-proposal',p.id,'btn'));
  card.append(foot);list.append(card);
 }
 if(!proposals.length)list.append(el('p','Ainda não há proposta editorialmente conferida nesta modalidade. Não inventaremos editais, gêneros ou critérios oficiais.','callout warning'));
 const note=el('p','Temas e textos do catálogo são autorais da VYZO ACADEMY, nunca propostas oficiais do ENEM. Catálogo '+WRITING_CATALOG_VERSION+'.','small muted');
 list.append(note,btn('Criar uma redação livre (compatibilidade)','essay-new',null,'btn ghost'));
 root.append(list);
 const history=el('section',null,'card essay-history');
 history.append(el('h3','Meus rascunhos e versões'));
 for(const essay of essays){
  const row=el('article',null,'essay-history-item');
  const m=essayMetrics(essay.body);
  const existing=getWritingProposal(essay.proposal_id,essay.proposal_version);
  row.append(el('strong',essay.title||'Redação sem título'),
   el('p',(existing?'TEMA AUTORAL DE TREINO':essay.proposal_id?'Proposta arquivada ou não encontrada':'Redação livre ou anterior')
   +' · '+m.words+' palavras · '+(essay.versions||[]).length+' versões anteriores','small muted'));
  row.append(btn('Abrir rascunho','essay-open',essay.id));
  history.append(row);
 }
 if(!essays.length)history.append(el('p','Você ainda não tem redações salvas nesta conta.','small muted'));
 root.append(history);
}
function supportingMaterials(root,p){
 const section=el('section',null,'essay-supports');
 section.append(el('h2','Coletânea de textos motivadores'));
 for(const source of p.supports){
  const card=el('article',null,'essay-support');
  card.append(el('h3',source.title),el('p',source.body));
  if(source.kind==='tabela'){
   const holder=el('div',null,'essay-table-wrap');
   const table=el('table',null,'essay-source-table');
   const caption=el('caption','IBGE — PNAD Contínua TIC 2024: acesso domiciliar à internet');
   table.append(caption);
   const thead=el('thead'),heading=el('tr');
   for(const h of source.headers){const th=el('th',h);th.scope='col';heading.append(th);}thead.append(heading);table.append(thead);
   const tbody=el('tbody');
   for(const row of source.rows){const tr=el('tr');tr.append(el('th',row[0]),el('td',row[1]));tr.firstChild.scope='row';tbody.append(tr);}
   table.append(tbody);holder.append(table);card.append(holder);
  }
  const refs=el('div',null,'essay-support-links');refs.append(el('span','Fonte: ','small'));
  for(const id of source.sourceIds){const ref=p.sources.find(x=>x.id===id);if(ref)refs.append(sourceLink(ref));}
  card.append(refs,el('p','Síntese ou tabela elaborada para treino; não reproduz integralmente o documento externo.','essay-licence-note'));
  section.append(card);
 }
 root.append(section);
}
function labelledInput(id,label,value,area=false){
 const wrapper=el('div',null,'field');
 const l=el('label',label);l.htmlFor=id;
 const control=area?el('textarea'):el('input');
 control.id=id;control.className='text';if(!area)control.type='text';
 if(area){control.rows=4;control.value=value||'';}else control.value=value||'';
 wrapper.append(l,control);return wrapper;
}
export function renderWritingEditor(root,essay,{canAssess=false}={}){
 root.replaceChildren();
 const p=getWritingProposal(essay.proposal_id,essay.proposal_version);
 const mode=essay.writing_mode==='simulado'?'simulado':'treino';
 const shell=el('div',null,'essay-editor');
 const intro=el('div',null,'essay-editor-head');
 intro.append(el('p',p?'TEMA AUTORAL DE TREINO':'REDAÇÃO LIVRE / HISTÓRICA','essay-proposal-kind'),
   el('h2',p?.theme||'Minha redação'),
   el('p',(p?p.genre+' · '+p.educationalLevel:'Material anterior ou texto pessoal')
    +' · '+(mode==='simulado'?'Modo simulado':'Modo treino'),'small muted'));
 shell.append(intro);
 if(p){
  const instructions=el('section',null,'essay-instructions');
  instructions.append(el('h2','Proposta de escrita'),el('p',p.instructions),
   el('p','Tempo sugerido pela VYZO: '+p.timeLimitMinutes+' minutos. Não é o tempo oficial do ENEM.','small muted'));
  shell.append(instructions);
  supportingMaterials(shell,p);
  const sources=el('section',null,'essay-source-list');
  sources.append(el('h2','Fontes originais e critérios'));
  for(const source of p.sources){
   const box=el('p');box.append(sourceLink(source));box.append(el('span',' · '+source.locator,'small muted'));sources.append(box);
  }
  sources.append(el('p',OFFICIAL_WRITING_GUIDE.note,'callout warning'));
  if(mode==='treino'){
   const details=el('details',null,'essay-guidance');const summary=el('summary','Roteiro de planejamento antes da entrega');
   details.append(summary,el('p','Defina sua tese, separe dois argumentos relevantes e planeje uma proposta de intervenção com agente, ação, meio e finalidade. Use as fontes como ponto de partida, não como texto a copiar.'));
   sources.append(details);
  }else sources.append(el('p','Modo simulado: orientações de planejamento e possíveis melhorias ficam ocultas. Nenhuma nota ou correção é exibida antes da entrega; a avaliação automática depende de uma etapa futura.','callout'));
  shell.append(sources);
 }else{
  shell.append(el('p','Este rascunho é anterior ao catálogo ou foi criado livremente. Seus textos e versões anteriores permanecem disponíveis sem alteração.','callout'));
 }
 const editing=el('section',null,'essay-writing');
 editing.append(labelledInput('essay-title','Título do seu rascunho',essay.title));
 if(!p)editing.append(labelledInput('essay-prompt','Enunciado e materiais pessoais (redação antiga ou livre)',essay.prompt,true));
 const editor=labelledInput('essay-body','Escreva sua redação',essay.body,true);
 const textarea=editor.querySelector('textarea');textarea.rows=18;textarea.spellcheck=true;textarea.maxLength=50000;
 textarea.setAttribute('aria-describedby','essay-editor-notice essay-count');
 editing.append(editor);
 editing.append(el('p','Editor digital: a quantidade de linhas na tela depende da fonte e do aparelho; não equivale à folha manuscrita oficial de 30 linhas.','essay-warning-small'));
 const statusRow=el('div',null,'essay-meta-row');
 const m=essayMetrics(essay.body);
 const count=el('span',m.words+' palavras · '+m.paragraphs+' parágrafos','small muted');count.id='essay-count';
 const timer=el('span',formatWritingTimer(essay.elapsed_seconds||0),'essay-clock');timer.id='essay-clock';
 timer.setAttribute('role','timer');timer.setAttribute('aria-label','Tempo de escrita');
 const save=el('span','Rascunho carregado; alterações serão salvas na nuvem.','essay-save');save.id='essay-save-status';save.role='status';save.setAttribute('aria-live','polite');
 statusRow.append(count,timer,save);editing.append(statusRow);
 const actions=el('div',null,'essay-actions');
 actions.append(btn('Iniciar cronômetro','essay-timer',null,'btn secondary'),
  btn('Foco na escrita','essay-focus',null,'btn ghost'),
  btn('Salvar agora','essay-save-now',null,'btn'),
  btn('Guardar esta versão','essay-version',null,'btn secondary'),
  btn('Baixar texto','essay-export',null,'btn ghost'),
  btn('Voltar às redações','essay-list',null,'btn ghost'));
 if(p&&mode==='treino'){
  if(canAssess){
   actions.append(btn('CORRIGIR MINHA REDAÇÃO','essay-assess',null,'btn'));
   actions.append(btn('Ver última avaliação','essay-latest-assessment',null,'btn secondary'));
   const state=el('p','Correção com IA disponível somente após autorização do servidor. O texto será salvo antes do envio.','small muted');
   state.id='essay-assess-status';state.role='status';state.setAttribute('aria-live','polite');
   editing.append(state);
  }else editing.append(el('p','A correção por IA exige uma conta adulta homologada e liberação expressa do serviço. Seu rascunho permanece disponível sem IA.','essay-warning-small'));
 }
 editing.append(actions);
 const versions=el('section',null,'essay-versions');
 versions.append(el('h3','Histórico de versões ('+(essay.versions||[]).length+')'));
 for(const [i,v] of (essay.versions||[]).entries()){
  const details=el('details');details.append(el('summary','Versão '+(i+1)+' · '+new Date(v.at).toLocaleString('pt-BR')));
  const pre=el('pre',v.body||'','essay-version-body');details.append(pre);versions.append(details);
 }
 editing.append(versions);
 shell.append(editing);root.append(shell);
}
export function refreshWritingCounters(text){
 const target=document.getElementById('essay-count');if(!target)return;
 const metrics=essayMetrics(text);
 target.textContent=metrics.words+' palavras · '+metrics.paragraphs+' parágrafos';
}
