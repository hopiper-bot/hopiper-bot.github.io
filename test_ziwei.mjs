import { calculate } from './js/engines/ziwei.js';
import { writeFileSync } from 'fs';

let out = '';
function log(...args) { out += args.join(' ') + '\n'; }

// 案例1：1990/3/15 午時 男 → 庚午年二月十九
const r1 = calculate({ year: 1990, month: 3, day: 15, hour: 12, gender: 'male' });
log('=== 1990/3/15 午時 男 ===');
log('農曆:', r1.data.lunar.yearStem+r1.data.lunar.yearBranch+'年', r1.data.lunar.lunarMonth+'月'+r1.data.lunar.lunarDay+'日');
log('命宮:', r1.data.palaces[0].branch, r1.data.ju.name);
log('紫微在:', r1.data.palaces.find(p=>p.main.some(s=>s.name==='紫微'))?.branch);

// 案例2：1985/6/20 子時 女 → 乙丑年五月初三
const r2 = calculate({ year: 1985, month: 6, day: 20, hour: 0, gender: 'female' });
log('\n=== 1985/6/20 子時 女 ===');
log('農曆:', r2.data.lunar.yearStem+r2.data.lunar.yearBranch+'年', r2.data.lunar.lunarMonth+'月'+r2.data.lunar.lunarDay+'日');
log('命宮:', r2.data.palaces[0].branch, r2.data.ju.name);
log('紫微在:', r2.data.palaces.find(p=>p.main.some(s=>s.name==='紫微'))?.branch);

// 案例3：2000/1/1 卯時 男
const r3 = calculate({ year: 2000, month: 1, day: 1, hour: 6, gender: 'male' });
log('\n=== 2000/1/1 卯時 男 ===');
log('農曆:', r3.data.lunar.yearStem+r3.data.lunar.yearBranch+'年', r3.data.lunar.lunarMonth+'月'+r3.data.lunar.lunarDay+'日');
log('命宮:', r3.data.palaces[0].branch, r3.data.ju.name);
log('紫微在:', r3.data.palaces.find(p=>p.main.some(s=>s.name==='紫微'))?.branch);

// 驗證大限方向
log('\n=== 大限(案例1: 庚午年 陽男 順行) ===');
r1.data.daxian.slice(0,5).forEach(d => {
  log(`  ${d.age}-${d.ageEnd}歲: ${d.branch}(${d.palaceName})`);
});

writeFileSync('c:/Users/Administrator/OneDrive - Inventec Corp/KIRO/destiny-reading/test_output.txt', out, 'utf8');
