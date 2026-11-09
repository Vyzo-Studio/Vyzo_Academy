/** V16.3 — Treino AUTORAL das 90 questões por área de cada dia do ENEM.
 * Não inclui redação, TRI ou os cinco itens oficiais de idioma selecionado.
 */
export const ENEM_DAY_TRAINING=Object.freeze({
 day1:Object.freeze({
  mode:'day1',label:'1º dia — Linguagens e Humanas',quantity:90,
  minutes:330,areas:Object.freeze({Linguagens:45,Humanas:45}),
  warning:'Treino autoral de questões do 1º dia; sem redação e sem distribuição oficial de língua estrangeira. Não equivale ao ENEM completo.'
 }),
 day2:Object.freeze({
  mode:'day2',label:'2º dia — Natureza e Matemática',quantity:90,
  minutes:300,areas:Object.freeze({Natureza:45,Matemática:45}),
  warning:'Treino autoral de questões do 2º dia; sem nota TRI e sem equivalência garantida com a prova oficial.'
 })
});
export function enemDayPreset(goal,mode){
 return goal?.type==='ENEM'&&Object.hasOwn(ENEM_DAY_TRAINING,mode)?
   ENEM_DAY_TRAINING[mode]:null;
}
export function resolveExamQuantity(goal,mode,normalQuantity){
 const preset=enemDayPreset(goal,mode);
 return preset?preset.quantity:Number(normalQuantity);
}
export function validateExamQuantity(goal,mode,count){
 const preset=enemDayPreset(goal,mode);
 if(preset){if(count!==preset.quantity)throw Error('O treino do dia do ENEM exige exatamente 90 questões.');}
 else if(!Number.isInteger(count)||count<3||count>50)
  throw Error('Escolha de 3 a 50 questões para o diagnóstico.');
 return true;
}
export function resolveExamTiming(goal,mode,requestedMode,requestedMinutes){
 const preset=enemDayPreset(goal,mode);
 if(preset)return {mode:'countdown',minutes:preset.minutes};
 if(!['stopwatch','countdown','untimed'].includes(requestedMode))
  throw Error('Modo de tempo inválido.');
 const minutes=Number(requestedMinutes);
 if(requestedMode==='countdown'&&(!Number.isInteger(minutes)||minutes<1||minutes>360))
  throw Error('Escolha um prazo entre 1 e 360 minutos.');
 return {mode:requestedMode,minutes};
}
