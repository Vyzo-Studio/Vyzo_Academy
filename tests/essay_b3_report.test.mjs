/** B3 Node: verifica somente dados persistidos/mock; não é correção real de IA. */
import assert from 'node:assert/strict';
import {verifyPersistedAssessment,readPersistedAssessment,
 readLatestAssessment} from '../academy/essay-assessment-report.mjs';

const uid='2caed453-479e-40a8-a884-1a2800000001',essayId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const id='cccccccc-cccc-4ccc-8ccc-cccccccccccc',revision='2026-11-07T19:00:00.000Z';
const text='A desigualdade digital representa um obstáculo importante à cidadania brasileira. Muitos territórios enfrentam conexão precária, custo elevado e dificuldades de acesso a ferramentas educacionais. A participação cidadã requer conectividade pública e formação digital, acompanhadas de políticas sociais eficazes.';
const user={id:uid},essay={id:essayId,user_id:uid};
const report={
 official:false,estimated:true,rubric_id:'enem-cartilha-2026',
 status:'scored',total_score:800,
 competences:['C1','C2','C3','C4','C5'].map(id=>({id,score:160,rationale:'Estimativa baseada em elementos identificáveis do texto.'})),
 issues:[{quote:'Muitos territórios enfrentam conexão precária'}],
 strengths:['Existe tese explícita.'],weaknesses:['Repertório pode ser ampliado.'],
 recommendations:['Detalhe a intervenção.'],limitations:'Resultado estimado por IA.'
};
const row={
 id,user_id:uid,essay_id:essayId,proposal_id:'enem-inclusao-digital-2026-a1',
 proposal_version:1,essay_revision:revision,essay_snapshot:text,
 status:'completed',report,created_at:'2026-11-07T19:10:00Z'
};
assert.equal(verifyPersistedAssessment(user,essay,row).total_score,800);
for(const bad of [
 {...row,user_id:'another-user'},{...row,essay_id:'another-essay'},
 {...row,proposal_id:'unknown'},{...row,status:'reserved'},
 {...row,essay_snapshot:'sem o trecho original'},
 {...row,report:{...report,total_score:999}},
 {...row,report:{...report,official:true}}
])assert.throws(()=>verifyPersistedAssessment(user,essay,bad));
const params=[],fake={
 from(table){assert.equal(table,'academy_essay_assessments');return{
  select(cols){assert(!cols.includes('service_role'));return this;},
  eq(k,v){params.push([k,v]);return this;},
  order(k,opts){assert.equal(k,'created_at');assert.equal(opts.ascending,false);return this;},
  limit(n){assert.equal(n,1);return Promise.resolve({data:[row],error:null});},
  single(){return Promise.resolve({data:row,error:null});}
 };}
};
const result=await readPersistedAssessment(fake,user,essay,id);
assert.equal(result.report.total_score,800);
assert.equal(result.revision,revision);
assert(params.some(([k,v])=>k==='user_id'&&v===uid));
assert(params.some(([k,v])=>k==='essay_id'&&v===essayId));
assert(params.some(([k,v])=>k==='status'&&v==='completed'));
const latest=await readLatestAssessment(fake,user,essay);
assert.equal(latest.id,id);
await assert.rejects(readPersistedAssessment(fake,user,essay,'invalid'));
const noResults={
 from(){return{
 select(){return this},eq(){return this},order(){return this},
 limit(){return Promise.resolve({data:[],error:null})}
 };}
};
assert.equal(await readLatestAssessment(noResults,user,essay),null);
const code=new URL('../academy/essay-assessment-report.mjs',import.meta.url);
const {readFileSync}=await import('node:fs');
const source=readFileSync(code,'utf8');
assert(source.includes('root.replaceChildren()'),'Report must not interpolate IA HTML.');
assert(source.includes('textContent=String(text)'),'Every provider field must be a text node.');
assert(!source.includes('innerHTML'));
console.log('PASS B3: RLS owner/essay filters, exact submitted quote, five scores, invalid provider rejection, persisted result & history mocks, safe text nodes.');
