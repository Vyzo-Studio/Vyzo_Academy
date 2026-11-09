import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/staging/v16_3_adult_rls_policy_preview.sql');
const test=read('tests/v16_3_adult_rls_live.sql');
const tables=[
 'academy_activity_history','academy_assessment_answers','academy_assessment_sessions',
 'academy_diagnostics','academy_essays','academy_goal_subjects','academy_goals',
 'academy_legacy_imports','academy_plan_tasks','academy_private_records',
 'academy_profiles','academy_research_requests','academy_revision_items',
 'academy_study_plans','academy_study_sessions','academy_study_tasks'
];
for(const table of tables)assert(sql.includes("'"+table+"'"),'Missing guard for '+table);
assert.match(sql,/as restrictive for all to authenticated/i);
assert.match(sql,/auth\.jwt\(\)->'app_metadata'->>'academy_adult_verified'/);
assert.doesNotMatch(sql,/auth\.jwt\(\)->'user_metadata'/);
assert.match(test,/request\.jwt\.claims/);
assert.match(test,/set local role authenticated/i);
assert.match(test,/spoofed user_metadata bypassed adult guard/i);
assert.match(test,/revoked JWT claim still reads a student record/i);
assert(!/\bdrop\s+table\b/i.test(sql),'Never destructively replace private student tables');
assert(!/\bdisable\s+row\s+level\s+security\b/i.test(sql));
console.log('PASS V16.3 restricted adult RLS stage contract: 16 private tables, defensive policies and spoofed metadata tests; NOT a production migration.');
