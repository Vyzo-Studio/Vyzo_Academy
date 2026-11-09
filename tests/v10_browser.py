"""Chromium real: app V9 em bundle local sem rede e armazenamento simulado (não é teste de Supabase)."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
def source(p):return (ROOT/p).read_text(encoding='utf8')
def fixture():
    html=source('academy/v9.html').replace('<link rel="stylesheet" href="./styles.css">','<style>'+source('academy/styles.css')+'\n'+source('academy/v9.css')+'</style>').replace('<link rel="stylesheet" href="./v9.css">','')
    for filename in ('questions.js','extra_questions.js','advanced_questions.js'):
        html=html.replace(f'<script src="../src/{filename}" defer></script>',f'<script>{source("src/"+filename)}</script>')
    sch=source('academy/scheduler.mjs').replace("export const WEEKDAYS = ['dom','seg','ter','qua','qui','sex','sab'];",'').replace('export ','')
    diag=source('academy/diagnostics.mjs').replace('export ','')
    composer=source('academy/v11-composer.mjs').replace('export ','')
    day_training=source('academy/v16-enem-day.mjs').replace('export ','')
    visual=source('academy/v11-visual.mjs').replace('export ','')
    core=source('academy/v9-core.mjs').replace("import {allocateDaily,validMinutes} from './scheduler.mjs';",'').replace("import {evaluateDiagnostic} from './diagnostics.mjs';",'').replace("import {composeExam,isSupportedVisual} from './v11-composer.mjs';",'').replace('export ','')
    taxonomy=source('academy/curriculum-taxonomy.mjs').replace('export ','')
    taxonomy_bind='const {getGradeSubjects,validateSchoolSubjects}=(function(){'+taxonomy+';return {getGradeSubjects,validateSchoolSubjects};})();'
    pathways=source('academy/v15-pathways.mjs').replace("import {getGradeSubjects,validateSchoolSubjects} from './curriculum-taxonomy.mjs';",'').replace('export ','')
    research=source('academy/v10-research.mjs').replace('export ','')
    papers=source('academy/v15-official-papers.mjs').replace('export ','')
    app=source('academy/v9.mjs').replace("import {EXAM_TYPES,AREAS,WEEKDAYS,isEnem,suitableQuestions,sampleDiagnostic,analyzeAnswers,topicRecommendations,buildAdaptiveSchedule,verifyPlan,isGoalEvaluated,hasEnoughEvidence,latestInitial,latestReport} from './v9-core.mjs';",'').replace("import {searchExams,cloudConfigured,validQuery} from './v10-research.mjs';",'').replace("import {composeExam} from './v11-composer.mjs';",'').replace("import {enemDayPreset,resolveExamQuantity,validateExamQuantity,resolveExamTiming} from './v16-enem-day.mjs';",'').replace("import {renderFigure} from './v11-visual.mjs';",'').replace("import {EDUCATION_STAGES,LEARNING_PATHS,getLearningPath,getSchoolStage,schoolYears,schoolSubjects,validSchoolYear,validateSchoolSubjectSelection,schoolGradeLabel,ENEM_OFFICIAL_ARCHIVE,searchVerifiedExam} from './v15-pathways.mjs';",'').replace("import {officialPaperHtml} from './v15-official-papers.mjs';",'')
    return html.replace('<script src="./config.js"></script>','<script>window.VYZO_ACADEMY_CLOUD={url:"",publishableKey:""};</script>').replace('<script type="module" src="./v9.mjs"></script>','').replace('</body>',f'<script>\n{sch}\n{diag}\n{composer}\n{day_training}\n{visual}\n{core}\n{taxonomy_bind}\n{pathways}\n{research}\n{papers}\n{app}\n</script></body>')
HTML=fixture()
def storage(page,seed=None):
    page.evaluate("""(seed)=>{
       const items=Object.assign(Object.create(null),seed||{});
       Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem:k=>Object.hasOwn(items,k)?items[k]:null,
        setItem:(k,v)=>{items[k]=String(v)},
        removeItem:k=>{delete items[k]},
        clear:()=>{for(const k of Object.keys(items))delete items[k]}
       }});
    }""",seed or {})
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for width in (320,390,768,1024,1440):
        context=b.new_context(viewport={'width':width,'height':850},accept_downloads=True)
        page=context.new_page();storage(page)
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(HTML,wait_until='load')
        expect(page.get_by_text('Antes de começar, vamos conhecer seus objetivos.')).to_be_visible()
        expect(page.get_by_text('BUSCA INTELIGENTE DE PROVAS')).to_be_visible()
        expect(page.get_by_text('Pesquisa automática ainda não ativada:',exact=False)).to_be_visible()
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'),(width,'wizard overflow')
        page.locator('#v10-exam-query').fill('Polícia Federal')
        page.get_by_role('button',name='Pesquisar com IA').click()
        expect(page.get_by_text('Pesquisa automática ainda não ativada:',exact=False)).to_be_visible()
        page.locator('input[name="exam_type"][value="ENEM"]').check()
        page.locator('input[name="exam_type"][value="Concurso público"]').check()
        page.get_by_role('button',name='Continuar').click()
        expect(page.get_by_text('Conte um pouco sobre cada prova')).to_be_visible()
        page.locator('#v9-name_1').fill('Banco do Brasil')
        page.locator('#v9-subjects_1').fill('Português, Matemática')
        page.locator('input[name="provisional_1"]').check()
        page.get_by_role('button',name='Continuar').click()
        expect(page.get_by_text('Quanto tempo você pode estudar por dia?')).to_be_visible()
        page.locator('#v9-minutes').select_option('120')
        for i in (0,6):page.locator(f'input[name="weekday"][value="{i}"]').check()
        page.get_by_role('button',name='Continuar').click()
        expect(page.get_by_text('Como você está se sentindo nos estudos?')).to_be_visible()
        page.locator('input[name="difficulty"][value="Matemática"]').check()
        page.get_by_role('button',name='Preparar meus diagnósticos').click()
        expect(page.get_by_text('Sua jornada começa pelo diagnóstico')).to_be_visible()
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'),(width,'hub overflow')
        page.locator('.v9-nav button[data-page="plan"]').click()
        expect(page.get_by_text('Plano bloqueado: diagnóstico inicial não concluído.')).to_have_count(2)
        page.locator('.v9-nav button[data-page="diagnostics"]').click()
        page.locator('button[data-action="choose-assessment"]').first.click()
        expect(page.get_by_text('Seu diagnóstico inicial está pronto')).to_be_visible()
        page.locator('#exam-length').select_option('10')
        page.get_by_role('button',name='COMEÇAR DIAGNÓSTICO').click()
        expect(page.get_by_text('Diagnóstico de conhecimento')).to_be_visible()
        assert page.locator('input[name="answer"]').count()==5
        page.locator('input[name="answer"][value="1"]').check()
        key='vyzo-academy-v9-guest-1'
        saved=page.evaluate('(key)=>localStorage.getItem(key)',key)
        assert len(saved)>300
        page.close();page=context.new_page();storage(page,{key:saved});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(HTML,wait_until='load')
        expect(page.get_by_text('Sua jornada começa pelo diagnóstico')).to_be_visible()
        page.locator('button[data-action="resume-assessment"]').first.click()
        assert page.locator('input[name="answer"][value="1"]').is_checked()
        for i in range(2):
            page.get_by_role('button',name='Próxima →').click()
            page.locator('input[name="answer"][value="0"]').check()
        page.once('dialog',lambda d:d.accept())
        page.get_by_role('button',name='Finalizar avaliação').click()
        expect(page.get_by_text('Seu diagnóstico está pronto')).to_be_visible()
        expect(page.get_by_text('Desempenho por área')).to_be_visible()
        assert page.locator('table.v9-table').count()>=3
        page.get_by_role('button',name='VER MEU PLANO PERSONALIZADO').click()
        expect(page.get_by_text('Plano bloqueado: diagnóstico inicial não concluído.')).to_have_count(1)
        assert page.locator('.v9-task').count()>0
        state=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',key)
        assert all(t['goalId']==state['goals'][0]['id'] for t in state['tasks'])
        totals={}
        for t in state['tasks']:totals[t['day']]=totals.get(t['day'],0)+t['minutes']
        assert all(n<=120 for n in totals.values())
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'),(width,'plan overflow')
        if width==390:
            page.locator('.v9-nav button[data-page="diagnostics"]').click()
            second=state['goals'][1]['id']
            page.locator(f'button[data-action="choose-assessment"][data-id="{second}"]').first.click()
            page.locator('#exam-length').select_option('10')
            page.get_by_role('button',name='COMEÇAR DIAGNÓSTICO').click()
            for i in range(3):
                page.locator('input[name="answer"][value="0"]').check()
                if i<2: page.get_by_role('button',name='Próxima →').click()
            page.once('dialog',lambda d:d.accept())
            page.get_by_role('button',name='Finalizar avaliação').click()
            expect(page.get_by_text('Seu diagnóstico está pronto')).to_be_visible()
            page.locator('.v9-nav button[data-page="plan"]').click()
            new_state=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',key)
            active=[t for t in new_state['tasks'] if t['status']!='superseded']
            assert {t['goalId'] for t in active}=={g['id'] for g in new_state['goals']}
            assert any(t['status']=='superseded' for t in new_state['tasks']),'Deve preservar versões antigas'
            totals2={}
            for t in active: totals2[t['day']]=totals2.get(t['day'],0)+t['minutes']
            assert all(n<=120 for n in totals2.values())
            # Concluir tarefa e verificar reteste sem reutilizar questões
            page.locator('.v9-task button[data-action="complete-task"]').first.click()
            done_state=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',key)
            done_goal=next(t['goalId'] for t in done_state['tasks'] if t['status']=='completed')
            page.locator(f'button[data-action="request-retest"][data-id="{done_goal}"]').first.click() if page.locator(f'button[data-action="request-retest"][data-id="{done_goal}"]').count() else page.locator('.v9-nav button[data-page="study"]').click()
            if page.locator('#exam-length').count()==0:
                page.locator(f'button[data-action="request-retest"][data-id="{done_goal}"]').click()
            page.locator('#exam-length').select_option('10')
            page.get_by_role('button',name='COMEÇAR DIAGNÓSTICO').click()
            expect(page.get_by_text('Reteste de aprendizagem')).to_be_visible()
            before=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',key)
            exams=[a for a in before['assessments'] if a['goalId']==done_goal]
            assert not(set(exams[-1]['ids'])&set(exams[0]['ids']))
            page.locator('input[name="answer"][value="2"]').check()
            page.once('dialog',lambda d:d.accept())
            page.get_by_role('button',name='Finalizar avaliação').click()
            expect(page.get_by_text('Comparação descritiva:')).to_be_visible()
            print('PASS V9: segundo diagnóstico, redistribuição 2h, histórico preservado, reteste inédito')
        assert not errors,(width,errors)
        print('PASS V9 Chromium:',width,'px, questionário, 2 provas, autosave, retomada, correção, planejamento <=2h')
        context.close()
    b.close()
