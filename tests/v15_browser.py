"""V15: percursos escolares no navegador real, sem fingir que há conteúdos escolares validados."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parent
prefix=(ROOT/'v9_browser.py').read_text(encoding='utf8').split('with sync_playwright() as p:')[0]
ns={'__file__':str(ROOT/'v9_browser.py')}
exec(prefix,ns)
HTML=ns['fixture']()
KEY='vyzo-academy-v9-guest-1'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for stage,grade,width in [('fundamental1',3,320),('fundamental2',7,390),('medio',2,768)]:
        page=browser.new_page(viewport={'width':width,'height':900})
        ns['storage'](page)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(HTML,wait_until='load')
        expect(page.get_by_role('heading',name='Qual é o seu objetivo de aprendizagem?')).to_be_visible()
        page.locator('input[name="exam_type"][value="ENEM"]').check()
        page.locator('#v15-learning-path').select_option('school')
        assert page.locator('.v10-research').is_hidden(), 'Fluxo escolar não deve exibir pesquisa de concurso'
        assert page.locator('.v10-manual').is_hidden(), 'Fluxo escolar não deve solicitar tipo de concurso'
        page.get_by_role('button',name='Continuar').click()
        expect(page.get_by_role('heading',name='Conte um pouco sobre cada prova')).to_be_visible()
        assert page.locator('input[id^="v9-name_"]').count()==1, 'Tipo oculto não deve criar prova extra'
        assert page.get_by_label('Banca (opcional)').count()==0
        page.locator('#v15-school-stage-0').select_option(stage)
        page.locator('#v15-school-year-0').select_option(str(grade))
        page.locator('#v9-name_0').fill('Reforço escolar')
        page.locator('input[name="schoolSubject_0"][value="Matemática"]').check()
        page.locator('input[name="schoolSubject_0"][value="Língua Portuguesa"]').check()
        if stage=='fundamental1':
            assert page.locator('input[name="schoolSubject_0"][value="Língua Inglesa"]').count()==0
        if stage in ('fundamental2','medio'):
            assert page.locator('input[name="schoolSubject_0"][value="Língua Inglesa"]').count()==1
        page.get_by_role('button',name='Continuar').click()
        expect(page.get_by_text('Quanto tempo você pode estudar por dia?')).to_be_visible()
        page.get_by_role('button',name='Continuar').click()
        page.get_by_role('button',name='Preparar meus diagnósticos').click()
        state=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',KEY)
        assert state['schema']==9
        assert len(state['goals'])==1 and len(state['assessments'])==0
        goal=state['goals'][0]
        assert goal['type']=='Prova escolar'
        assert goal['educationStage']==stage and goal['schoolYear']==grade
        assert goal['provisional'] is False
        page.locator('.v9-nav button[data-page="goals"]').click()
        page.get_by_role('button',name='Ver situação do conteúdo').first.click()
        expect(page.get_by_text('O diagnóstico escolar específico desta série ainda não está disponível.',exact=False)).to_be_visible()
        assert page.locator('#start-diagnostic-form').count()==0
        page.get_by_role('button',name='Editar objetivo').click()
        assert page.locator('#v15-school-stage-edit').count()==1
        assert page.get_by_label('Banca organizadora').count()==0
        next_stage='fundamental2' if stage=='medio' else 'medio'
        next_grade=8 if stage=='medio' else 2
        page.locator('#v15-school-stage-edit').select_option(next_stage)
        page.locator('#v15-school-year-edit').select_option(str(next_grade))
        page.once('dialog',lambda d:d.accept())
        page.get_by_role('button',name='Salvar alterações').click()
        current=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key)).goals[0]',KEY)
        assert current['educationStage']==next_stage and current['schoolYear']==next_grade
        assert current['curriculumHistory'][0]['schoolYear']==grade
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(width,'horizontal overflow')
        page.locator('.v9-nav button[data-page="past-papers"]').click()
        expect(page.get_by_role('heading',name='Provas anteriores')).to_be_visible()
        page.locator('#v15-past-year').select_option('2024')
        expect(page.locator('#v15-past-selection')).to_contain_text('2024')
        assert page.locator('#v15-past-direct a:has-text("Abrir prova (PDF oficial)")').count()==2
        assert page.locator('#v15-past-direct a:has-text("Abrir gabarito (PDF oficial)")').count()==2
        assert page.locator('#v15-past-direct').get_by_text('Não convertido em simulado interativo.').count()==2
        page.locator('#v15-past-year').select_option('2025')
        assert page.locator('#v15-past-direct a').count()==0
        expect(page.locator('#v15-past-direct')).to_contain_text('Não cadastramos links diretos')
        assert 'gov.br/inep' in page.get_by_role('link',name='Abrir provas e gabaritos oficiais no Inep').get_attribute('href')
        assert not errors,(width,errors)
        print('PASS V15 Chromium:',stage,grade,width,'px, escola sem banca, histórico, acervo oficial')
        page.close()
    # ENEM: atalho rápido com catálogo público sem inventar banca, edital ou edição.
    page=browser.new_page(viewport={'width':390,'height':850})
    ns['storage'](page)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(HTML,wait_until='load')
    page.locator('#v10-exam-query').fill('ENEM')
    expect(page.locator('#v15-enem-suggestion')).to_be_visible()
    page.get_by_role('button',name='Adicionar ENEM ao meu planejamento').click()
    page.get_by_role('button',name='Continuar').click()
    expect(page.get_by_role('heading',name='Conte um pouco sobre cada prova')).to_be_visible()
    assert page.locator('#v9-name_0').input_value()=='ENEM'
    assert page.locator('#v9-edition_0').input_value()==''
    assert page.locator('#v9-date_0').input_value()==''
    assert not errors,errors
    print('PASS V15 Chromium: ENEM sugerido localmente sem pesquisa IA nem edição inventada')
    page.close()
    browser.close()
