const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'water-bank.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'water-bank.js'), 'utf8');
const sql = fs.readFileSync(path.join(root, 'supabase', 'water-bank.sql'), 'utf8');
const mainHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('water bank script references existing unique HTML ids', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, new Set(ids).size, 'HTML ids must be unique');
  const idSet = new Set(ids);
  const referenced = [...js.matchAll(/\$\('([^']+)'\)/g)].map((m) => m[1]);
  assert.ok(referenced.length > 20, 'expected the application to bind its controls');
  assert.deepEqual([...new Set(referenced.filter((id) => !idSet.has(id)))], [], 'all JavaScript element lookups must exist in HTML');
});

test('existing RICE DOCTOR inline scripts still parse and link to the water bank', () => {
  const inlineScripts = [...mainHtml.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  assert.ok(inlineScripts.length > 0);
  for (const script of inlineScripts) assert.doesNotThrow(() => new Function(script));
  assert.match(mainHtml, /href="\.\/water-bank\.html"/);
});

test('migration enables row-level security for every water data table', () => {
  for (const table of ['water_communities', 'water_community_staff', 'water_sources', 'water_requests', 'water_allocations', 'water_deliveries']) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }
  assert.match(sql, /from public,anon/i);
  assert.match(sql, /from public\.water_requests[\s\S]*?user_id=\(select auth\.uid\(\)\)/i);
  assert.match(sql, /water_is_manager\(community_id\)/i);
});

test('water source types and allocation rules keep recharge wells out of supply allocation', () => {
  assert.match(sql, /source_type in \('recharge_well','irrigation_well'\)/i);
  assert.match(sql, /source_type <> 'recharge_well' or available_volume_m3=0/i);
  assert.match(sql, /s\.source_type <> 'irrigation_well' or s\.status <> 'active'/i);
  assert.match(sql, /total\+p_volume_m3 > r\.approved_volume_m3/i);
  assert.match(sql, /p_volume_m3 > s\.available_volume_m3/i);
});

test('review, allocation and actual delivery use guarded server-side functions', () => {
  for (const rpc of ['water_review_request', 'water_schedule_allocation', 'water_record_delivery']) {
    assert.match(sql, new RegExp(`create or replace function public\\.${rpc}\\([\\s\\S]*?security definer`, 'i'));
    assert.match(sql, new RegExp(`revoke all on function public\\.${rpc}\\(`, 'i'));
    assert.match(sql, new RegExp(`grant execute on function public\\.${rpc}\\(`, 'i'));
  }
  assert.match(sql, /allocation_delivered\+p_volume_m3 > a\.allocated_volume_m3/i);
  assert.match(html, /ไม่มีข้อมูลบ่อหรือน้ำตั้งต้น/);
  assert.doesNotMatch(sql, /insert into public\.water_sources/i, 'migration must not seed invented water sources');
});
