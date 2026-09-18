/**
 * test_name.mjs — 姓名學引擎驗證
 * 跑法：node test_name.mjs
 */
import { calculate, splitName, strokesOf } from './js/engines/name.js';

let pass = 0, fail = 0;
function eq(label, got, want) {
  if (got === want) { pass++; }
  else { fail++; console.log(`  FAIL ${label}: got ${got}, want ${want}`); }
}

// ---- 1. 康熙筆劃 ----
console.log('[1] 康熙筆劃');
[['陳', 16], ['華', 14], ['江', 7], ['玲', 10], ['王', 4], ['建', 9], ['明', 8],
 ['歐', 15], ['陽', 17], ['小', 3], ['蘇', 22], ['郭', 15], ['芬', 10]]
  .forEach(([ch, n]) => eq(ch, strokesOf(ch), n));

// ---- 2. 複姓辨識 ----
console.log('[2] 姓名切分');
eq('陳建華.surname', splitName('陳建華').surname, '陳');
eq('陳建華.given', splitName('陳建華').given, '建華');
eq('歐陽小明.surname', splitName('歐陽小明').surname, '歐陽');
eq('歐陽小明.given', splitName('歐陽小明').given, '小明');
eq('司馬光.surname', splitName('司馬光').surname, '司馬');
eq('王明.surname', splitName('王明').surname, '王');

// ---- 3. 五格（四種假添一規則） ----
console.log('[3] 五格');
function grids(surname, given) {
  const r = calculate({ surname, given });
  if (r.status !== 'ok') throw new Error(`${surname}${given}: ${r.error}`);
  const g = r.data.grids;
  return { tian: g.tian.n, ren: g.ren.n, di: g.di.n, wai: g.wai.n, zong: g.zong.n };
}

// 單姓複名：王(4) 小(3) 明(8)
let g = grids('王', '小明');
eq('王小明.天', g.tian, 5);
eq('王小明.人', g.ren, 7);
eq('王小明.地', g.di, 11);
eq('王小明.外', g.wai, 9);
eq('王小明.總', g.zong, 15);

// 單姓單名：王(4) 明(8) — 外格固定 2
g = grids('王', '明');
eq('王明.天', g.tian, 5);
eq('王明.人', g.ren, 12);
eq('王明.地', g.di, 9);
eq('王明.外', g.wai, 2);
eq('王明.總', g.zong, 12);

// 複姓複名：歐(15) 陽(17) 小(3) 明(8) — 不假添一
g = grids('歐陽', '小明');
eq('歐陽小明.天', g.tian, 32);
eq('歐陽小明.人', g.ren, 20);
eq('歐陽小明.地', g.di, 11);
eq('歐陽小明.外', g.wai, 23);
eq('歐陽小明.總', g.zong, 43);

// 複姓單名：歐(15) 陽(17) 明(8)
g = grids('歐陽', '明');
eq('歐陽明.天', g.tian, 32);
eq('歐陽明.人', g.ren, 25);
eq('歐陽明.地', g.di, 9);
eq('歐陽明.外', g.wai, 16);
eq('歐陽明.總', g.zong, 40);

// 陳建華：陳(16) 建(9) 華(14)
g = grids('陳', '建華');
eq('陳建華.天', g.tian, 17);
eq('陳建華.人', g.ren, 25);
eq('陳建華.地', g.di, 23);
eq('陳建華.外', g.wai, 15);
eq('陳建華.總', g.zong, 39);

// ---- 4. 五行 / 三才 ----
console.log('[4] 五行與三才');
{
  // 陳建華：天17 人25 地23 外15 總39
  const r = calculate({ surname: '陳', given: '建華' });
  const gd = r.data.grids;
  eq('天17→金', gd.tian.elem, '金');
  eq('人25→土', gd.ren.elem, '土');
  eq('地23→火', gd.di.elem, '火');
  eq('外15→土', gd.wai.elem, '土');
  eq('總39→水', gd.zong.elem, '水');
  eq('三才combo', r.data.sancai.combo, '金土火');
  eq('天金被土生', r.data.sancai.tianRenRel, '被生');
  eq('人土被火生', r.data.sancai.renDiRel, '被生');
}
{
  // 尾數 → 五行邊界：10→水, 20→水, 1→木, 9→水, 5→土
  const map = { 1: '木', 2: '木', 3: '火', 4: '火', 5: '土', 6: '土', 7: '金', 8: '金', 9: '水', 10: '水', 20: '水', 11: '木' };
  // 借 calculate 驗不方便，改用已知格數驗證：王明 天5=土 地9=水
  const r = calculate({ surname: '王', given: '明' });
  eq('天5→土', r.data.grids.tian.elem, '土');
  eq('地9→水', r.data.grids.di.elem, '水');
  eq('人12→木', r.data.grids.ren.elem, '木');
  void map;
}

// ---- 5. 81 數循環 ----
console.log('[5] 81 數');
{
  // 蘇(22)+龔(22)+龔(22) = 總 66；找一組總格 > 81 的
  const r = calculate({ surname: '鄭', given: '瓊瑤' });
  if (r.status === 'ok') {
    const z = r.data.grids.zong;
    eq('總格 luck.n 在 1-81', z.luck.n >= 1 && z.luck.n <= 81, true);
  }
  // 直接驗超過 81 的情況
  const r2 = calculate({ surname: '龔', given: '鑫鑫' });
  if (r2.status === 'ok') {
    const z = r2.data.grids.zong;
    eq(`總格 ${z.n} → 81數 ${z.luck.n}`, z.luck.n, z.n > 81 ? z.n - 80 : z.n);
  }
}

// ---- 6. 錯誤處理 ----
console.log('[6] 錯誤處理');
eq('空姓', calculate({ surname: '', given: '明' }).status, 'error');
eq('空名', calculate({ surname: '王', given: '' }).status, 'error');
eq('英文', calculate({ surname: 'A', given: 'B' }).status, 'error');
eq('注音符號', calculate({ surname: 'ㄅ', given: 'ㄆ' }).status, 'error');

// ---- 6b. 簡體字自動轉正體 ----
console.log('[6b] 簡體字');
{
  // 陈晓华 → 陳曉華，五格必須跟正體一致
  const simp = calculate({ surname: '陈', given: '晓华' });
  const trad = calculate({ surname: '陳', given: '曉華' });
  eq('簡體可算', simp.status, 'ok');
  eq('簡體=正體 人格', simp.data.grids.ren.n, trad.data.grids.ren.n);
  eq('簡體=正體 總格', simp.data.grids.zong.n, trad.data.grids.zong.n);
  eq('回報轉換數', simp.data.converted.length, 3);
  eq('轉換後姓', simp.data.surname, '陳');
  eq('轉換後名', simp.data.given, '曉華');
  eq('HTML 有提示', simp.html.includes('偵測到簡體字'), true);
  // 刘/张/叶 也要對
  eq('刘→劉', calculate({ surname: '刘', given: '明' }).data.surname, '劉');
  eq('叶→葉', calculate({ surname: '叶', given: '明' }).data.surname, '葉');
}

// ---- 7. 取名建議 ----
console.log('[7] 取名建議');
{
  const r = calculate({ surname: '陳', given: '建華' });
  eq('建議數量', r.data.suggestions.length, 8);
  eq('建議有排序', r.data.suggestions[0].score >= r.data.suggestions[7].score, true);
  eq('建議三才為吉', r.data.suggestions[0].sancai.level, 'good');
}

// ---- 8. 八字整合 ----
console.log('[8] 八字整合');
{
  const fakeBazi = {
    dayMaster: '甲', dayMasterElem: '木',
    elements: { 木: 5, 火: 1, 土: 2, 金: 1, 水: 3 },
    yongshen: { strength: '身強', yongshen: '火', xishen: '土', jishen: '水', choushen: '木' },
    pillars: { year: { branch: '寅' } },
  };
  const r = calculate({ surname: '陳', given: '建華' }, fakeBazi);
  eq('有 bazi 分析', !!r.data.bazi, true);
  eq('生肖寅→虎', r.data.bazi.zodiac, '虎');
  // 人格 25 → 土 = 喜神
  eq('人格土=喜神→good', r.data.bazi.verdict, 'good');
  // 日主木 對 人格土：木剋土 → 正財偏財
  eq('十神關係', r.data.bazi.role.rel, '剋');
  eq('HTML 有內容', r.html.length > 2000, true);
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'HAS FAILURES'}  pass=${pass} fail=${fail}`);
process.exit(fail === 0 ? 0 : 1);
