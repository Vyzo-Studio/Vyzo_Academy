/** V16: cross-check 48 quantitative items against their problem statements.
 * Automated arithmetic only, not a human curriculum / ENEM review.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,Script} from 'node:vm';
const context=createContext({window:{}});
for(const file of ['questions.js','extra_questions.js','advanced_questions.js'])
 new Script(readFileSync(new URL('../src/'+file,import.meta.url),'utf8')).runInContext(context);
const questions=context.window.QUESTION_BANK;
assert.equal(questions.length,224);
const bank=new Map(questions.map(q=>[q.id,q]));
const qAt=id=>{const q=bank.get('V'+id);assert(q,'Faltou V'+id);return q;};
const n=value=>{
 const m=String(value).match(/[\d.,]+/);
 assert(m,'Valor ausente: '+value);
 return Number(m[0].replace(/\./g,'').replace(',','.'));
};
const check=(a,b,id)=>assert(Math.abs(a-b)<1e-8,id+': gabarito '+a+' ≠ cálculo '+b);
let checked=0;const byTopic={};
for(let id=4025;id<=4072;id++){
 const q=qAt(id),text=q.context;
 let m,expected,actual=n(q.options[q.answer]);
 if(id<=4032){
  m=text.match(/(\d+) metros de largura e (\d+) metros de comprimento/u);
  assert(m,q.id+' sem dimensões');
  expected=Number(m[1])*Number(m[2]);
 }else if(id<=4040){
  m=text.match(/percorreu (\d+) km em (\d+) horas/u);
  assert(m,q.id+' sem velocidade média');
  expected=Number(m[1])/Number(m[2]);
 }else if(id<=4048){
  m=text.match(/há (\d+) fichas azuis e (\d+) fichas amarelas/u);
  assert(m,q.id+' sem urna explícita');
  expected=Number(m[1])/(Number(m[1])+Number(m[2]));
  const fraction=q.options[q.answer].match(/^(\d+)\/(\d+)$/u);
  assert(fraction,q.id+' sem fração');
  actual=Number(fraction[1])/Number(fraction[2]);
  const explanation=q.explanation.match(/probabilidade é (\d+)\/(\d+)/u);
  assert(explanation,q.id+' sem justificativa probabilística');
  check(Number(explanation[1])/Number(explanation[2]),expected,q.id);
 }else if(id<=4052){
  m=text.match(/resistor de (\d+) Ω ligado a uma fonte contínua de (\d+) V/u);
  assert(m,q.id+' sem Lei de Ohm');
  expected=Number(m[2])/Number(m[1]);
 }else if(id<=4056){
  m=text.match(/armazena (\d+) kJ[\s\S]*?(\d+)%/u);
  assert(m,q.id+' sem fluxo energético');
  expected=Number(m[1])*Number(m[2])/100;
 }else if(id<=4060){
  m=text.match(/(\d+) g de um soluto[\s\S]*?(\d+) L de solução/u);
  assert(m,q.id+' sem concentração');
  expected=Number(m[1])/Number(m[2]);
 }else if(id<=4064){
  m=text.match(/massa de (\d+) g e ocupa volume de (\d+) cm³/u);
  assert(m,q.id+' sem densidade');
  expected=Number(m[1])/Number(m[2]);
 }else if(id<=4068){
  m=text.match(/massa de (\d+) g[\s\S]*?temperatura em (\d+) °C[\s\S]*?igual a ([\d.,]+) J/u);
  assert(m,q.id+' sem calor específico');
  expected=Number(m[1])*Number(m[2])*n(m[3]);
 }else{
  m=text.match(/apresentam pH (\d+) e pH (\d+)/u);
  assert(m,q.id+' sem valores de pH');
  expected=10**Math.abs(Number(m[1])-Number(m[2]));
 }
 check(actual,expected,q.id);
 assert(q.explanation.includes(String(expected)),
  q.id+' sem resultado numérico comprovável na explicação');
 checked++;byTopic[q.topic]=(byTopic[q.topic]||0)+1;
}
assert.equal(checked,48);
assert.equal(Object.values(byTopic).reduce((x,y)=>x+y,0),48);
assert.equal(Object.keys(byTopic).length,9);
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const templates=new Map();
for(const q of questions){
 const key=norm(q.stem);
 const group=templates.get(key)||[];group.push(q.id);templates.set(key,group);
}
const repeated=[...templates.values()].filter(g=>g.length>1);
assert(repeated.length>0,'O benchmark pedagógico não deve ocultar enunciados padronizados');
console.log('PASS V16: '+checked+' itens adicionais de geometria, velocidade, probabilidade, física, química e biologia, com gabaritos matemáticos coerentes.');
console.log('ATENÇÃO EDITORIAL: '+repeated.length+' grupos de enunciados iguais, ainda não considerados questões distintas validadas editorialmente.');
