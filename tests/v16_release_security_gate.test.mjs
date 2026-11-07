/** V16 release safety contract. Run on public main / safe PRs only.
 * Prevents accidental activation of unreviewed Auth, AI, minors and loss of local histories.
 * Static guardrails do not replace Auth/RLS tests, penetration testing or runtime QA.
 */
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const absent=[
 'academy/v12-auth-core.mjs','academy/v12-entry.html','academy/v12-entry.mjs',
 'academy/v9-cloud.html','academy/v9-cloud-gate.mjs',
 'academy/v15-school-content.mjs','academy/v15-school-engine.mjs',
 'academy/v15-school-ui.mjs',
 'academy/essay-lab-ui.mjs','academy/essay-lab.mjs','academy/essay-lab.css',
 'supabase/functions/academy-essay-assess/index.ts'
];
for(const file of absent)
 assert.equal(existsSync(new URL(file,root)),false,'Public release includes unapproved module: '+file);

const config=read('academy/config.js');
assert.match(config,/url:\s*''/u,'Public Auth URL must remain empty until homologated.');
assert.match(config,/publishableKey:\s*''/u,'Public Auth key must remain empty until homologated.');
assert.doesNotMatch(config,/https:\/\/[a-z\d-]+\.supabase\.co/iu,'Never embed project URLs in public release config while registration blocked.');
for(const [p,source] of [
 ['academy/config.js',config],['academy/v9.html',read('academy/v9.html')],
 ['academy/index.html',read('academy/index.html')],['src/app.js',read('src/app.js')]
]){
 assert.doesNotMatch(source,/sb_secret_[A-Za-z0-9_-]{8,}|sk-proj-[A-Za-z0-9_-]{12,}|sk-[A-Za-z0-9_-]{30,}/u,'Possible API secret in '+p);
 assert.doesNotMatch(source,/ACADEMY_AI_(?:ENABLED|ESSAY_ENABLED)\s*[:=]\s*['"]?true/u,'AI must not be activated in client: '+p);
}
const v9=read('academy/v9.mjs');
assert.match(v9,/const KEY='vyzo-academy-v9-guest-1'/u,'V9 local state key changed');
assert.match(v9,/schema:9/u,'V9 local schema changed');
const classic=read('src/app.js');
assert.match(classic,/const STORE='enem-intelligence-v2', OLD='enem-intelligence-v1'/u,
 'Classic local migration keys changed');
assert.match(classic,/enem-intelligence-recovery-/u,'Classic recovery snapshots must remain');
const taxonomy=read('academy/v15-pathways.mjs');
assert.match(taxonomy,/schoolContentReady=\(\)=>false/u,'School educational gate unexpectedly enabled');
const v9core=read('academy/v9-core.mjs');
assert.match(v9core,/if\(goal.type==='Prova escolar'\|\|goal.educationStage\)return \[\];/u,
 'Do not serve ENEM questions as school-grade diagnostics');
const sw=read('sw.js');
assert.match(sw,/if\(e\.request\.method!=='GET'/u);
assert.match(sw,/academy\|api\|auth\|rest\|functions/u,'Worker must bypass private routes');
assert.doesNotMatch(sw,/caches\.open\([^)]*\).*essay/iu,'Never cache essays offline via service worker');
console.log('PASS V16 release security gate: no unapproved Auth/AI/children deployment, no exposed keys, historic data keys, safe offline exclusion.');
