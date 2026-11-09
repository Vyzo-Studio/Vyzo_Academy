import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,Script} from 'node:vm';
import {composeExam} from '../academy/v11-composer.mjs';
import {analyzeAnswers,suitableQuestions} from '../academy/v9-core.mjs';
import {enemDayPreset,resolveExamQuantity,validateExamQuantity,resolveExamTiming} from '../academy/v16-enem-day.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const runtime=createContext({window:{}});
for(const file of ['questions.js','extra_questions.js','advanced_questions.js'])
 new Script(read('src/'+file),{filename:file}).runInContext(runtime);
const bank=runtime.window.QUESTION_BANK,goal={type:'ENEM',name:'ENEM autoral',subjects:['Linguagens','Humanas','Natureza','Matemática']};
assert.equal(bank.length,224);
assert.equal(enemDayPreset(goal,'day1').minutes,330);
assert.equal(enemDayPreset(goal,'day2').minutes,300);
assert.equal(enemDayPreset({type:'Concurso público'},'day1'),null);
assert.equal(resolveExamQuantity(goal,'day1','20'),90);
assert.equal(resolveExamQuantity(goal,'day2','20'),90);
assert.equal(resolveExamQuantity(goal,'general','20'),20);
for(const mode of ['day1','day2']){
 const preset=enemDayPreset(goal,mode);
 assert(validateExamQuantity(goal,mode,90));
 assert.throws(()=>validateExamQuantity(goal,mode,50),/exatamente 90/);
 assert.deepEqual(resolveExamTiming(goal,mode,'untimed',20),{mode:'countdown',minutes:preset.minutes});
 for(const language of ['Inglês','Espanhol']){
  const exam=composeExam(bank,goal,90,{mode,language,seed:'v16-3-test-'+mode+'-'+language});
  assert.equal(exam.questions.length,90);
  assert.equal(new Set(exam.questions.map(x=>x.id)).size,90);
  assert.deepEqual(exam.blueprint.areas,preset.areas);
  assert(exam.questions.every(q=>!['Inglês','Espanhol'].includes(q.subject)||q.subject===language));
  if(mode==='day1')assert(exam.questions.some(q=>q.subject===language),'Foreign language has to appear in first-day authorial practice');
  assert(exam.questions.every(q=>Number.isInteger(q.answer)&&q.answer>=0&&q.answer<=4));
  const [q1,q2]=exam.questions,answers={[q1.id]:q1.answer,[q2.id]:(q2.answer+1)%5};
  const report=analyzeAnswers(goal,{ids:exam.questions.map(q=>q.id),answers,kind:'initial'},bank);
  assert.equal(report.total,90);
  assert.equal(report.answered,2);
  assert.equal(report.correct,1);
  assert.equal(report.wrong,1);
  assert.equal(report.blank,88,'Unanswered items must not count as wrong');
  assert.equal(report.accuracy,50);
 }
}
assert.throws(()=>validateExamQuantity(goal,'general',90),/3 a 50/);
assert(validateExamQuantity(goal,'general',50));
assert.throws(()=>resolveExamTiming(goal,'general','countdown',361),/1 e 360/);
assert.equal(resolveExamTiming(goal,'general','stopwatch',70).mode,'stopwatch');
const narrow={...goal,subjects:['Português']};
const pool=suitableQuestions(bank,narrow);
assert(pool.length<90);
assert.throws(()=>composeExam(pool,narrow,90,{mode:'day1',language:'Inglês'}),/questões|diagnóstico/);
const v9=read('academy/v9.mjs');
for(const token of ['resolveExamQuantity','validateExamQuantity','resolveExamTiming','Treino autoral — 1º dia','sem redação'])
 assert(v9.includes(token),'Missing V9 integration: '+token);
console.log('PASS V16.3 ENEM: 90 authorial items per day, 45/45 quotas, exact 330/300-minute clocks, unique IDs and blank-neutral scoring.');
