import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectCloudCache,adoptCloudCache} from '../academy/v9-cloud-recovery.mjs';
const keyA='vyzo-academy-v9-account-a0a0a0a0-0000-4000-8000-000000000001';
const keyB='vyzo-academy-v9-account-b0b0b0b0-0000-4000-8000-000000000002';
const backupId='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const local={schema:9,revision:9,goals:[{id:'meta-a'}],assessments:[{id:'prova-a'}],tasks:[],draft:{text:'Texto local preservado'}};
const remote={schema:9,revision:4,goals:[{id:'meta-remota'}],assessments:[],tasks:[]};
const map=new Map(),storage={
 getItem:key=>map.has(key)?map.get(key):null,
 setItem:(key,v)=>{map.set(key,String(v));}
};
map.set(keyA,JSON.stringify(local));
map.set(keyB,'{"schema":9,"private":"estudante-b"}');
const d=inspectCloudCache(storage.getItem(keyA),remote);
assert.equal(d.action,'conflict','Local unsynced work must not be silently overwritten');
assert.equal(storage.getItem(keyA),JSON.stringify(local));
assert.throws(()=>adoptCloudCache(storage,keyA,d,'not-a-uuid'),/Identificador/);
assert.equal(storage.getItem(keyA),JSON.stringify(local));
const archive=adoptCloudCache(storage,keyA,d,backupId);
assert.equal(archive,keyA+'-backup-'+backupId);
assert.deepEqual(JSON.parse(storage.getItem(archive)),local);
assert.deepEqual(JSON.parse(storage.getItem(keyA)),remote);
assert.equal(storage.getItem(keyB),'{"schema":9,"private":"estudante-b"}','Student B must remain untouched');
assert.equal(inspectCloudCache(storage.getItem(keyA),remote).action,'identical');
assert.equal(adoptCloudCache(storage,keyA,inspectCloudCache(storage.getItem(keyA),remote),backupId),null);
assert.equal(storage.getItem(archive),JSON.stringify(local));
const newRemote={...remote,revision:5};
const concurrent=inspectCloudCache(storage.getItem(keyA),newRemote);
map.set(keyA,JSON.stringify({...remote,revision:123}));
assert.throws(()=>adoptCloudCache(storage,keyA,concurrent,'dddddddd-dddd-4ddd-8ddd-dddddddddddd'),/outra aba/);
assert.equal(storage.getItem(keyA),JSON.stringify({...remote,revision:123}));
map.delete(keyA);
assert.equal(inspectCloudCache(null,remote).action,'adopt');
assert.equal(adoptCloudCache(storage,keyA,inspectCloudCache(null,remote),backupId),null);
assert.deepEqual(JSON.parse(storage.getItem(keyA)),remote);
const stored=JSON.stringify(local);
const broken=new Map([[keyA,stored]]);
const storageFail={
 getItem:k=>broken.get(k)??null,
 setItem:(k,v)=>{if(k.includes('-backup-'))throw Error('QuotaExceededError');broken.set(k,String(v));}
};
assert.throws(()=>adoptCloudCache(storageFail,keyA,inspectCloudCache(stored,remote),backupId),/QuotaExceededError/);
assert.equal(broken.get(keyA),stored,'Failed archive must never touch active progress');
assert.throws(()=>adoptCloudCache(storage,keyB,d,backupId),/outra aba/);
assert.throws(()=>adoptCloudCache(storage,'other-key',d,backupId),/Chave/);
const gate=readFileSync(new URL('../academy/v9-cloud-gate.mjs',import.meta.url),'utf8');
assert.match(gate,/inspectCloudCache\(/);
assert.match(gate,/adoptCloudCache\(/);
assert.match(gate,/Duas versões da sua jornada/);
assert.match(gate,/A sessão mudou/);
assert.doesNotMatch(gate,/localStorage\.setItem\(scopedKey,JSON\.stringify\(p\)\)/);
console.log('PASS V16.3: local progress conflicts require explicit choice; backup integrity, storage errors, concurrent tab and user isolation verified.');
