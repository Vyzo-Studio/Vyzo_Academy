import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,Script} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const context=createContext({window:{}});
for(const file of ['questions.js','extra_questions.js','advanced_questions.js'])
 new Script(read('src/'+file),{filename:file}).runInContext(context);
const bank=context.window.QUESTION_BANK;
assert.equal(bank.length,224);
const ids=new Set(bank.map(q=>q.id));
assert.equal(ids.size,224);
const cases=[
 ['Q011','Inglês',1],
 ['Q012','Espanhol',4],
 ['V6A015','Inglês',3],
 ['V6A016','Espanhol',2]
];
for(const [id,subject,answer] of cases){
 const q=bank.find(x=>x.id===id);
 assert(q,'Missing '+id);
 assert.equal(q.subject,subject);
 assert.equal(q.answer,answer);
 assert.equal(q.options.length,5);
 assert(q.options.every(s=>typeof s==='string'&&s.length>18));
 assert(/^(?:A principal ideia|Segundo o fragmento|A mensagem|O comunicado)/u.test(q.stem),
  'Foreign language question not presented in PT-BR: '+id);
 assert(/Questão autoral/u.test(q.origin));
}
const en=bank.find(x=>x.id==='V6A015');
const es=bank.find(x=>x.id==='V6A016');
assert.match(en.context,/A school library can offer books/u,'Original foreign passage must be preserved');
assert.match(es.context,/Separar los residuos en casa es útil/u,'Original Spanish excerpt must be preserved');
assert.match(en.options[3],/além do empréstimo de livros/u);
assert.match(es.options[2],/hábitos individuais e serviços públicos/u);
assert.match(en.explanation,/bibliotecas oferecem espaço, internet e orientação/u);
assert.match(es.explanation,/hábitos individuais e serviços públicos/u);
assert(read('index.html').includes(read('src/advanced_questions.js')),
 'Classic HTML bundle must match the source bank exactly');
console.log('PASS V16.2: 224 unique items, four language questions with Portuguese prompts and alternatives, original passages and answers preserved.');
