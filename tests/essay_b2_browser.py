"""B2: navegador Chromium + Auth/Edge Function SIMULADOS; não comprova IA operacional."""
import json
from playwright.sync_api import sync_playwright,expect
from browser_v8 import build_html
OWNER='2caed453-479e-40a8-a884-1a2800000001'
ESSAY='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
ASSESS='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
BODY=('A desigualdade digital representa um obstáculo importante à cidadania brasileira. '
      'Muitas famílias ainda enfrentam conexão precária, custos elevados e falta de formação tecnológica. '
      'Por isso, o poder público deve financiar infraestrutura em regiões afastadas e ampliar programas '
      'de educação digital, com acompanhamento público e prioridade às comunidades de menor renda.')
def make_html(mode):
    rows={
      'academy_profiles':[{'id':'profile-1','user_id':OWNER,'display_name':'Adulto de QA',
         'onboarding_complete':True,'availability':{}}],
      'academy_goals':[],
      'academy_essays':[{'id':ESSAY,'user_id':OWNER,'title':'Treino de redação ENEM',
       'body':BODY,'prompt':'Tema autoral seguro',
       'proposal_id':'enem-inclusao-digital-2026-a1','proposal_version':1,
       'writing_mode':mode,'elapsed_seconds':0,'versions':[],
       'created_at':'2026-11-07T12:00:00.000Z','updated_at':'2026-11-07T12:00:00.000Z'}]
    }
    html=build_html(mock=True)
    html=html.replace('window.__mockRows = Object.create(null);',
       'window.__mockRows = '+json.dumps(rows,ensure_ascii=False)+';')
    html=html.replace("user_metadata:{display_name:'Estudante de Teste'}",
       "app_metadata:{academy_ai_essay_allowed:true,academy_adult_verified:true},user_metadata:{display_name:'Estudante de Teste'}")
    return html
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
 for width in (390,1024):
  page=browser.new_page(viewport={'width':width,'height':850})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(make_html('treino'),wait_until='load')
  expect(page.get_by_role('heading',name='Seu painel de aprendizagem')).to_be_visible()
  if width<=740:page.locator('#mobile-menu').click()
  page.locator('#app-nav [data-page="essay"]').click()
  page.locator('[data-action="essay-open"][data-id="'+ESSAY+'"]').click()
  expect(page.get_by_role('button',name='CORRIGIR MINHA REDAÇÃO')).to_be_visible()
  page.evaluate("""([id,body])=>{
   window.__calls=[];
   window.__failOnce=true;
   window.__fakeClient.functions={
    invoke:async (name,options)=>{
     window.__calls.push({name,payload:options.body});
     if(window.__failOnce){window.__failOnce=false;return {data:null,error:{context:{status:503}}};}
     return {error:null,data:{
      status:'completed',assessment_id:id,
      result:{official:false,estimated:true,rubric_id:'enem-cartilha-2026',
       status:'scored',total_score:800,issues:[],
       competences:['C1','C2','C3','C4','C5'].map(id=>({id,score:160,rationale:'Justificativa específica encontrada na redação de treinamento.'}))}
     }};
    }
   };
  }""",[ASSESS,BODY])
  button=page.locator('[data-action="essay-assess"]')
  button.click()
  expect(page.locator('#essay-assess-status')).to_contain_text('Correção não concluída',timeout=5000)
  assert page.locator('#essay-body').input_value()==BODY
  button.click()
  expect(page.locator('#essay-assess-status')).to_contain_text('Correção concluída',timeout=5000)
  calls=page.evaluate('window.__calls')
  assert len(calls)==2 and all(c['name']=='academy-essay-assess' for c in calls)
  assert all(set(c['payload'])=={'essay_id','revision'} for c in calls)
  assert all(c['payload']['essay_id']==ESSAY for c in calls)
  assert page.evaluate("window.__mockRows.academy_essays[0].body")==BODY
  assert page.evaluate("window.__mockRows.academy_essays[0].versions.length")==0
  assert not errors,errors
  print('PASS B2 Chromium:',width,'px, autorização, falha/reenvio, snapshot sem alteração')
  page.close()
 # Modo simulado continua bloqueado (não possui protocolo de entrega homologado).
 page=browser.new_page(viewport={'width':390,'height':850})
 page.set_content(make_html('simulado'),wait_until='load')
 expect(page.get_by_role('heading',name='Seu painel de aprendizagem')).to_be_visible()
 page.locator('#mobile-menu').click()
 page.locator('#app-nav [data-page="essay"]').click()
 page.locator('[data-action="essay-open"][data-id="'+ESSAY+'"]').click()
 assert page.locator('[data-action="essay-assess"]').count()==0
 page.close()
 browser.close()
 print('PASS B2: modo simulado segue fechado até entrega segura.')
