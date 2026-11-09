"""V16.3: prova autoral de 90 questões por dia no Chromium, sem backend real."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parent
source=(ROOT/'v9_browser.py').read_text(encoding='utf8').split('with sync_playwright() as p:')[0]
ns={'__file__':str(ROOT/'v9_browser.py')}
exec(source,ns)
HTML=ns['HTML']
KEY='vyzo-academy-v9-guest-1'
GOAL={
 'id':'v163-enem','type':'ENEM','name':'Treino ENEM autoral',
 'subjects':['Linguagens','Humanas','Natureza','Matemática'],
 'foreignLanguage':'Espanhol','priority':'high','status':'preparing','createdAt':1000,
 'examDate':'','institution':'','position':'','board':'','edition':''
}
def seed():
 return {KEY:json.dumps({
  'schema':9,'revision':1,'onboarding':True,
  'profile':{'minutes':120,'weekdays':[1,2,3,4,5],'confidence':'Iniciante',
             'dailyMinutes':None,'difficulties':[],'style':'Aprendizagem mista'},
  'goals':[GOAL],'assessments':[],'tasks':[],'draft':None
 },ensure_ascii=False)}

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 for width in (320,768):
  for kind,areas,minutes in (
   ('day1',{'Linguagens':45,'Humanas':45},330),
   ('day2',{'Natureza':45,'Matemática':45},300)
  ):
   page=browser.new_page(viewport={'width':width,'height':850})
   ns['storage'](page,seed())
   errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.evaluate('window.__fakeNow=Date.now();Date.now=()=>window.__fakeNow')
   page.set_content(HTML,wait_until='load')
   page.locator('.v9-nav button[data-page="diagnostics"]').click()
   page.get_by_role('button',name='Começar diagnóstico').first.click()
   page.locator('#v13-exam-mode').select_option(kind)
   expect(page.locator('#v13-count-field')).to_be_hidden()
   expect(page.locator('#v13-composition')).to_contain_text('90 questões')
   expect(page.locator('#v13-composition')).to_contain_text(str(minutes)+' minutos')
   expect(page.locator('#v13-composition')).to_contain_text('Treino autoral')
   expect(page.locator('#start-diagnostic-form button[type="submit"]')).to_be_enabled()
   page.get_by_role('button',name='COMEÇAR DIAGNÓSTICO').click()
   a=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key)).assessments.at(-1)',KEY)
   assert len(a['ids'])==90,(kind,len(a['ids']))
   assert len(set(a['ids']))==90
   assert a['blueprint']['areas']==areas,(kind,a['blueprint']['areas'])
   assert a['timer']['mode']=='countdown'
   assert a['timer']['durationMs']==minutes*60000
   assert a['blueprint']['language']=='Espanhol'
   expect(page.locator('#v9-clock')).to_contain_text('Restante:')
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(width,kind)
   page.locator('input[name="answer"][value="0"]').check()
   page.evaluate('(advance)=>window.__fakeNow+=advance',minutes*60000+100)
   page.wait_for_timeout(1250)
   result=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key)).assessments.at(-1)',KEY)
   assert result['status']=='completed',(kind,result['status'])
   assert result['report']['total']==90
   assert result['report']['answered']==1
   assert result['report']['blank']==89
   assert result['report']['wrong'] in (0,1)
   assert result['report']['correct']+result['report']['wrong']==1
   expect(page.get_by_text('Seu treino ENEM foi corrigido')).to_be_visible()
   assert not errors,(width,kind,errors)
   page.close()
 browser.close()
print('PASS V16.3 Chromium: 90-item 1º/2º day training, 45/45 quotas, responsive layout, countdown expiration and blank-neutral grading.')
