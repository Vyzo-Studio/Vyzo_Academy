"""V16.3: browser real, serviço SUPABASE FALSO. Sem credenciais, HTTP/Auth real ou custos."""
import json
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
ACCOUNT='a0a0a0a0-0000-4000-8000-000000000001'
KEY='vyzo-academy-v9-account-'+ACCOUNT
LOCAL={'schema':9,'revision':8,'onboarding':False,'goals':[{'id':'local-goal'}],
       'assessments':[{'id':'old-result'}],'tasks':[],'profile':{'minutes':90}}
REMOTE={'schema':9,'revision':4,'onboarding':False,'goals':[{'id':'remote-goal'}],
        'assessments':[],'tasks':[],'profile':{'minutes':120}}
CONFIG="window.VYZO_ACADEMY_CLOUD={url:'https://cfrlqinzsysoqcduqftd.supabase.co',publishableKey:'sb_publishable_test_only',registrationEnabled:false};"
def mock_backend(approved=True):
 user={'id':ACCOUNT,'email':'test-adult@example.invalid','email_confirmed_at':'2026-11-09T10:00:00Z',
       'is_anonymous':False,'app_metadata':{'academy_adult_verified':approved}}
 return "export function createClient(){const user="+json.dumps(user)+",remote="+json.dumps(REMOTE)+""";
  return {
   auth:{
    getUser:async()=>({data:{user},error:null}),
    onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
   },
   from:()=>({
    select(){return this},eq(){return this},
    maybeSingle:async()=>({data:{payload:remote,revision:2},error:null})
   })
  };
 }"""

class QuietHandler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass

httpd=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
thread=Thread(target=httpd.serve_forever,daemon=True)
thread.start()
site=f'http://127.0.0.1:{httpd.server_address[1]}/academy/v9-cloud.html'

def setup(context,approved):
 context.route('**/academy/config.js',lambda route:route.fulfill(
  status=200,content_type='text/javascript',body=CONFIG))
 context.route('**/npm/@supabase/supabase-js@2.119.0/+esm',
  lambda route:route.fulfill(status=200,content_type='text/javascript',
    headers={'Access-Control-Allow-Origin':'*'},body=mock_backend(approved)))
 context.route('https://cfrlqinzsysoqcduqftd.supabase.co/**',lambda route:route.abort())

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 try:
  context=browser.new_context(accept_downloads=True)
  context.add_init_script(script=f"""if(location.hostname==='127.0.0.1')localStorage.setItem({json.dumps(KEY)},JSON.stringify({json.dumps(LOCAL)}));""")
  setup(context,True)
  page=context.new_page()
  problems=[]
  page.on('pageerror',lambda error:problems.append(str(error)))
  page.goto(site,wait_until='load')
  expect(page.get_by_role('heading',name='Duas versões da sua jornada')).to_be_visible(timeout=10000)
  assert page.locator('#v9-cache-use-remote').is_disabled()
  assert json.loads(page.evaluate('(key)=>localStorage.getItem(key)',KEY))==LOCAL
  with page.expect_download() as saved:
   page.locator('#v9-cache-download').click()
  assert saved.value.suggested_filename=='VYZO_ACADEMY_V9_COPIA_LOCAL.json'
  expect(page.locator('#v9-cache-use-remote')).to_be_enabled()
  page.locator('#v9-cache-use-remote').click()
  expect(page.get_by_text('Antes de começar, vamos conhecer seus objetivos.')).to_be_visible(timeout=10000)
  stored=page.evaluate("""(key)=>({
    current:JSON.parse(localStorage.getItem(key)),
    archives:Object.keys(localStorage).filter(name=>name.startsWith(key+'-backup-')).map(name=>JSON.parse(localStorage.getItem(name))),
    cloud:window.VYZO_V9_CLOUD?.userId
  })""",KEY)
  assert stored['current']==REMOTE
  assert stored['archives']==[LOCAL]
  assert stored['cloud']==ACCOUNT
  assert not problems,problems
  context.close()

  context2=browser.new_context()
  context2.add_init_script(script=f"""if(location.hostname==='127.0.0.1')localStorage.setItem({json.dumps(KEY)},{json.dumps(json.dumps(LOCAL))});""")
  setup(context2,False)
  page=context2.new_page()
  page.goto(site,wait_until='load')
  expect(page.get_by_text('Confirme seu e-mail e entre na sua conta',exact=False)).to_be_visible(timeout=10000)
  assert json.loads(page.evaluate('(key)=>localStorage.getItem(key)',KEY))==LOCAL
  assert page.evaluate('window.VYZO_V9_CLOUD===undefined')
  context2.close()
 finally:
  browser.close()
  httpd.shutdown()
print('PASS V16.3 Auth mock Chromium: conflict requires explicit download, original archived, remote applied and unapproved adult denied.')
