"""V8 browser regression with simulated Supabase API; does NOT assert real production Auth/RLS."""
from playwright.sync_api import sync_playwright, expect
from pathlib import Path
import re, json
root=Path(__file__).resolve().parents[1]
fixture="""
window.__mockRows = Object.create(null);
window.__fakeUser = {id:'2caed453-479e-40a8-a884-1a2800000001',email:'estudante@example.test',email_confirmed_at:'2026-11-05T00:00:00Z',user_metadata:{display_name:'Estudante de Teste'}};
window.__mockEvents=[];
window.__mockUid=0;
const __make = () => 'test-row-'+String(++window.__mockUid);
class MockQuery {
  constructor(name){this.name=name;this.filters=[];this.op='select';this.body=null;this.returning=false;this.sortKey=null;this.desc=false;this.maxRows=null;}
  select(){this.returning=true;return this}
  eq(k,v){this.filters.push([k,v]);return this}
  order(k,opts={}){this.sortKey=k;this.desc=opts.ascending===false;return this}
  limit(n){this.maxRows=n;return this}
  insert(body){this.op='insert';this.body=body;return this}
  update(body){this.op='update';this.body=body;return this}
  match(r){return this.filters.every(([k,v])=>r[k]===v)}
  execute(){
    const rows=window.__mockRows[this.name]||(window.__mockRows[this.name]=[]);
    if(this.op==='insert'){
      const items=Array.isArray(this.body)?this.body:[this.body];let result=[];
      for(const item of items){if(item.user_id!==window.__fakeUser?.id)return {data:null,error:{message:'RLS denied'}};
        const record={id:__make(),created_at:new Date().toISOString(),updated_at:new Date().toISOString(),version:1,...item};rows.push(record);result.push(record);
      }return{data:this.returning?(Array.isArray(this.body)?result:result[0]):null,error:null};
    }
    if(this.op==='update'){
      const found=rows.filter(r=>this.match(r)&&r.user_id===window.__fakeUser?.id);
      found.forEach(r=>Object.assign(r,this.body));
      return{data:this.returning?(found.length===1?found[0]:found):null,error:null};
    }
    const matched=rows.filter(r=>this.match(r)&&r.user_id===window.__fakeUser?.id);
    if(this.sortKey)matched.sort((a,b)=>String(a[this.sortKey]||'').localeCompare(String(b[this.sortKey]||''))*(this.desc?-1:1));
    return {data:this.maxRows===null?matched:matched.slice(0,this.maxRows),error:null};
  }
  single(){const r=this.execute();if(Array.isArray(r.data)){return Promise.resolve({data:r.data[0]||null,error:r.data.length?null:{message:'No rows'}})}return Promise.resolve(r)}
  then(ok,bad){return Promise.resolve(this.execute()).then(ok,bad)}
}
window.__fakeClient={
  from(name){return new MockQuery(name)},
  auth:{
    async getUser(){return {data:{user:window.__fakeUser},error:window.__fakeUser?null:{message:'No session'}}},
    onAuthStateChange(cb){window.__mockEvents.push(cb);return{data:{subscription:{unsubscribe(){}}}}},
    async signUp(){return {data:{user:window.__fakeUser},error:null}},
    async signInWithPassword(){return {data:{user:window.__fakeUser},error:null}},
    async signOut(){window.__fakeUser=null;return{error:null}},
    async resetPasswordForEmail(){return {error:null}},
    async updateUser(){return {error:null}},
    async resend(){return {error:null}}
  }
};
"""

def build_html(mock=False):
 html=(root/'academy/index.html').read_text()
 html=html.replace('<link rel="stylesheet" href="./styles.css">','<style>'+(root/'academy/styles.css').read_text()+'</style>')
 html=html.replace('<link rel="stylesheet" href="./essay-lab.css">','<style>'+(root/'academy/essay-lab.css').read_text()+'</style>')
 config=(root/'academy/config.js').read_text()
 if mock:
  config="window.VYZO_ACADEMY_CLOUD={url:'https://abcde12345.supabase.co',publishableKey:'sb_publishable_mock'};"
  config+=fixture
 html=html.replace('<script src="./config.js"></script>','<script>'+config+'</script>')
 for name in ['questions.js','extra_questions.js','advanced_questions.js']:
  html=html.replace('<script src="../src/'+name+'" defer></script>','<script>'+(root/'src'/name).read_text()+'</script>')
 scheduler=(root/'academy/scheduler.mjs').read_text().replace('export ','')
 diagnostic=(root/'academy/diagnostics.mjs').read_text().replace('export ','')
 lab=(root/'academy/essay-lab.mjs').read_text().replace('export ','')
 ui=(root/'academy/essay-lab-ui.mjs').read_text().replace('export ','')
 ui=re.sub(r"^import \{WRITING_CATEGORIES,[\s\S]*?\} from './essay-lab.mjs';\s*","",ui,count=1,flags=re.M)
 assess=(root/'academy/essay-assessment-client.mjs').read_text().replace('export ','')
 assess=assess.replace("import {getWritingProposal,essayMetrics} from './essay-lab.mjs';",'')
 report=(root/'academy/essay-assessment-report.mjs').read_text().replace('export ','')
 report=report.replace("import {validateAssessmentEnvelope} from './essay-assessment-client.mjs';",'').replace("import {getWritingProposal} from './essay-lab.mjs';",'')
 app=(root/'academy/app.mjs').read_text()
 for declaration in [
  "import {generateSchedule,verifySchedule,WEEKDAYS,validMinutes} from './scheduler.mjs';",
  "import {evaluateDiagnostic,selectDiagnosticQuestions} from './diagnostics.mjs';",
  "import {getWritingProposal,WRITING_PROPOSALS,newEssayRecord,essayMetrics,formatWritingTimer,essayVersionSnapshot} from './essay-lab.mjs';",
  "import {renderWritingCatalog,renderWritingEditor,refreshWritingCounters} from './essay-lab-ui.mjs';",
  "import {eligibleEssay,submitSavedEssay} from './essay-assessment-client.mjs';",
  "import {readPersistedAssessment,readLatestAssessment,renderAssessmentReport} from './essay-assessment-report.mjs';"
 ]:
  assert declaration in app,('Missing fixture import',declaration)
  app=app.replace(declaration,'')
 if mock:
  app=app.replace("const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm');","const {createClient}={createClient:()=>window.__fakeClient};")
 html=html.replace('<script type="module" src="./app.mjs"></script>','<script type="module">'+scheduler+'\n'+diagnostic+'\n'+lab+'\n'+ui+'\n'+assess+'\n'+report+'\n'+app+'</script>')
 return html

def suite():
 with sync_playwright() as p:
  binary=Path('/usr/bin/chromium')
  opts={'headless':True,'args':['--no-sandbox']}
  if binary.is_file():opts['executable_path']=str(binary)
  browser=p.chromium.launch(**opts)
  for size in [(320,740),(390,844),(768,900),(1024,768),(1440,900)]:
   page=browser.new_page(viewport={'width':size[0],'height':size[1]})
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.set_content(build_html(mock=False),wait_until='load')
   expect(page.locator('#main-view')).to_contain_text('credenciais públicas do projeto exclusivo',timeout=3000)
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),f'overflow {size}'
   assert not errors,errors
   page.close()
  page=browser.new_page(viewport={'width':390,'height':844})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(build_html(mock=True),wait_until='load')
  expect(page.get_by_text('Vamos preparar seus estudos')).to_be_visible(timeout=3000)
  # First access onboarding
  page.locator('#form-onboard-profile input[name="display_name"]').fill('Estudante A')
  page.locator('#form-onboard-profile select[name="minutes_1"]').select_option('120')
  page.locator('#form-onboard-profile select[name="minutes_2"]').select_option('120')
  page.locator('#form-onboard-profile button[type="submit"]').click()
  expect(page.get_by_text('Selecione uma ou mais categorias')).to_be_visible()
  page.locator('.onboard-type[value="ENEM"]').check()
  page.locator('.onboard-type[value="Concurso federal"]').check()
  page.locator('[data-action="onboard-types-next"]').click()
  expect(page.locator('#form-onboard-goals')).to_be_visible()
  page.locator('[name="name_0"]').fill('ENEM 2026')
  page.locator('[name="name_1"]').fill('Concurso Banco do Brasil')
  page.locator('[name="subjects_1"]').fill('Matemática, Português')
  page.locator('#form-onboard-goals button[type="submit"]').click()
  expect(page.locator('#form-onboard-final')).to_be_visible(timeout=3000)
  page.locator('#form-onboard-final button[type="submit"]').click()
  expect(page.get_by_role('heading',name='Diagnósticos iniciais')).to_be_visible(timeout=3000)
  assert page.locator('[data-action="start-diagnostic"]').count()==2
  # ENEM diagnosis start and autosave
  page.locator('[data-action="start-diagnostic"]').first.click()
  expect(page.locator('#form-diagnostic-start')).to_be_visible()
  page.locator('#form-diagnostic-start button').first.click()
  expect(page.get_by_role('heading',name='Diagnóstico em andamento')).to_be_visible()
  page.locator('input[name="diag-answer"][value="0"]').check()
  expect(page.locator('#answer-state')).to_contain_text('Salvo na nuvem',timeout=3000)
  assert len(page.evaluate('window.__mockRows.academy_diagnostics||[]'))==1
  page.locator('[data-action="diag-suspend"]').click()
  expect(page.get_by_role('heading',name='Diagnósticos iniciais')).to_be_visible()
  page.locator('[data-action="start-diagnostic"]').first.click()
  expect(page.get_by_role('heading',name='Diagnóstico em andamento')).to_be_visible()
  assert page.locator('input[name="diag-answer"][value="0"]').is_checked()
  page.once('dialog',lambda dialog:dialog.accept())
  page.locator('[data-action="diag-finalize"]').click()
  expect(page.get_by_role('heading',name='Resultado do diagnóstico')).to_be_visible(timeout=3000)
  page.locator('[data-page="calendar"]').last.click()
  expect(page.get_by_role('heading',name='Meu calendário')).to_be_visible()
  page.locator('[data-action="calendar-generate"]').click()
  page.locator('[data-action="calendar-next"]').click()
  expect(page.locator('.calendar-chip').first).to_be_visible(timeout=3000)
  # Data remains scoped to one user in fake responses, real RLS requires actual database test.
  db=page.evaluate('window.__mockRows'); assert len(db['academy_goals'])==2
  assert len(db['academy_study_tasks'])>0
  for task in db['academy_study_tasks']:
   assert task['user_id']=='2caed453-479e-40a8-a884-1a2800000001'
  # Essay drafts
  page.locator('#mobile-menu').click()
  page.locator('#app-nav [data-page="essay"]').click()
  page.locator('[data-action="essay-new"]').click()
  expect(page.get_by_role('heading',name='Editor de redação')).to_be_visible()
  page.locator('#essay-body').fill('Introdução. Desenvolvimento. Proposta de intervenção.')
  expect(page.locator('#essay-save-status')).to_contain_text('Salva na nuvem',timeout=3000)
  page.locator('[data-action="essay-version"]').click()
  assert page.evaluate('window.__mockRows.academy_essays[0].versions.length')==1
  assert not errors,errors
  print('PASS V8 BROWSER: offline blocked, responsive x5, onboarding, two goals, diagnostic/autosave/resume, calendar, essay versions')
  browser.close()

if __name__=='__main__':suite()
