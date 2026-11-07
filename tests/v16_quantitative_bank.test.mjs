/** V16 Module 09 — independent arithmetic validation for the authored question bank.
 * Checks numeric evidence, not editorial quality or equivalence to Inep questions.
 * Never changes IDs, answers, content, user data or test thresholds to hide defects.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,Script} from 'node:vm';

const ctx=createContext({window:{}});
for(const f of ['questions.js','extra_questions.js','advanced_questions.js']){
 new Script(readFileSync(new URL('../src/'+f,import.meta.url),'utf8')).runInContext(ctx);
}
const bank=ctx.window.QUESTION_BANK,byId=new Map(bank.map(q=>[q.id,q]));
assert.equal(bank.length,224);
assert.equal(byId.size,224);
const asNumber=s=>Number(String(s).replace(/\./g,'').replace(',','.').replace(/[^\d.-]/g,''));
const qAt=n=>{const key='V'+String(n);const q=byId.get(key);assert(q,'Faltou '+key);return q;};
let audited=0;
for(let n=4001;n<=4008;n++){
 const q=qAt(n),parts=q.context.match(/preço anunciado é R\$ ([\d.,]+), com desconto único de (\d+)%/u);
 assert(parts,'Contexto de porcentagem incompatível em '+q.id);
 const original=asNumber(parts[1]),discount=Number(parts[2]);
 const expected=Math.round(original*(1-discount/100)*100)/100;
 const selected=asNumber(q.options[q.answer]);
 assert.equal(selected,expected,q.id+' preço errado.');
 assert(q.explanation.includes('O desconto'),q.id+' sem cálculo.');
 audited++;
}
for(let n=4009;n<=4016;n++){
 const q=qAt(n),start=q.context.match(/(\d+) equipes[\s\S]*?concluíram (\d+) tarefas/u);
 const end=q.stem.match(/(\d+) equipes/u);
 assert(start&&end,'Contexto de proporção incompatível em '+q.id);
 const [teams,done,target]=[Number(start[1]),Number(start[2]),Number(end[1])];
 const expected=done*target/teams;
 assert(Number.isInteger(expected));
 assert.equal(asNumber(q.options[q.answer]),expected,q.id+' proporção incorreta.');
 const ratio=q.explanation.match(/(\d+)\/(\d+)\s*=\s*(\d+(?:[.,]\d+)?)/u);
 assert(ratio,q.id+' sem taxa por equipe verificável.');
 assert.equal(Number(ratio[1]),done,q.id+' numerador inconsistente');
 assert.equal(Number(ratio[2]),teams,q.id+' denominador inconsistente');
 assert.equal(asNumber(ratio[3]),done/teams,q.id+' erro no cálculo exibido ao estudante');
 const claim=q.explanation.match(/(\d+)\s*×\s*(\d+(?:[.,]\d+)?)\s*=\s*(\d+(?:[.,]\d+)?)/u);
 assert(claim,'Multiplicação final ausente em '+q.id);
 assert.equal(asNumber(claim[1])*asNumber(claim[2]),asNumber(claim[3]),q.id+' produto inválido');
 assert.equal(asNumber(claim[3]),expected,q.id+' gabarito e justificativa divergentes');
 audited++;
}
for(let n=4017;n<=4024;n++){
 const q=qAt(n),row=q.visual?.rows?.[0];
 assert(Array.isArray(row)&&row.length===3,'Tabela de média ausente em '+q.id);
 const values=row.map(asNumber),mean=values.reduce((a,b)=>a+b,0)/3;
 assert.equal(asNumber(q.options[q.answer]),mean,q.id+' média aritmética incorreta');
 assert(q.explanation.includes(String(values.reduce((a,b)=>a+b,0))),q.id+' sem soma comprovada');
 audited++;
}
const src=readFileSync(new URL('../src/extra_questions.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert(html.includes('<script data-source="extra_questions.js">\n'+src+'\n</script>'),
 'O simulador compilado precisa espelhar a correção pedagógica, sem divergência da fonte.');
assert(qAt(4009).explanation.includes('18/4 = 4,5'));
assert(qAt(4009).explanation.includes('10 × 4,5 = 45'));
console.log('PASS V16: '+audited+' questões com resultados matemáticos conferidos (porcentagens, proporções e médias); V4009 corrigida sem alterar IDs/gabaritos.');
