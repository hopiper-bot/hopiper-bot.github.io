r"""
build_strokes.py — 產生 js/data/strokes.js（康熙筆劃查表）

資料來源：https://github.com/breezyreeds/kangxi-strokecount （MIT License）
  康熙字典部首原形筆劃，姓名學（熊崎氏五格）用的就是這一套，
  與手寫筆劃不同（例：陳＝阜8＋8＝16、華＝艸6＋8＝14、江＝水4＋3＝7）。

同時產生簡→繁對照表。原因：簡體字在康熙字典裡多半也查得到筆劃，
但那個筆劃不是姓名學要用的（陈=13 而 陳=16、刘=6 而 劉=15、叶=5 而 葉=15），
若不處理就會安靜地算錯。來源為 OpenCC STCharacters.txt（Apache-2.0）。

用法：
  1. 下載兩份來源資料：
     https://raw.githubusercontent.com/breezyreeds/kangxi-strokecount/master/kangxi-strokecount.csv
     https://raw.githubusercontent.com/BYVoid/OpenCC/master/data/dictionary/STCharacters.txt
     放到 %TEMP%\（或用 --csv / --st 指定路徑）
  2. python tools/build_strokes.py

輸出格式為「按筆劃分組的字串」，比 JSON 物件小很多：
  export const STROKE_GROUPS = { 4: "王方尹...", 5: "玉石..." };
執行期在 name.js 展開成 Map。
"""

import argparse
import csv
import os
import sys

# 只收 CJK 基本區（U+4E00–U+9FFF）。姓名用字幾乎都在這裡，
# 擴充區 A/B 的罕用字排除掉可省下大量體積。
LO, HI = 0x4E00, 0x9FFF

# 驗證用：標準姓名學筆劃，任何一個對不上就不要產生檔案
EXPECT = {
    '華': 14, '陳': 16, '林': 8, '李': 7, '王': 4, '玉': 5, '玲': 10, '珍': 10,
    '建': 9, '明': 8, '淑': 12, '芬': 10, '張': 11, '黃': 12, '劉': 15,
    '蔡': 17, '楊': 13, '許': 11, '鄭': 19, '謝': 17, '洪': 10, '郭': 15, '邱': 12,
    '曾': 12, '廖': 14, '賴': 16, '徐': 10, '周': 8, '葉': 15, '蘇': 22, '莊': 13,
    '呂': 7, '江': 7, '簡': 18, '彭': 12, '游': 13, '吳': 7, '涂': 11, '藍': 20,
    '蕭': 18, '潘': 16, '朱': 6, '鍾': 17, '施': 9, '柯': 9, '紀': 9, '翁': 10,
    '魏': 18, '孫': 10, '戴': 18, '范': 11, '方': 4, '宋': 7, '鄧': 19, '杜': 7,
    '侯': 9, '曹': 11, '薛': 19, '傅': 12, '沈': 8, '盧': 16, '姚': 9, '石': 5,
    '嚴': 20, '童': 12, '歐': 15, '巫': 7, '邵': 12, '倪': 10, '湯': 13, '龔': 22,
    '梁': 11, '丁': 2, '馬': 10, '胡': 11, '陸': 16, '康': 11, '志': 7, '偉': 11,
}

HEADER = '''/**
 * strokes.js — 康熙筆劃查表（姓名學用）
 *
 * ⚠️ 此檔為自動產生，請勿手改。要更新請跑 tools/build_strokes.py
 *
 * 資料來源：https://github.com/breezyreeds/kangxi-strokecount (MIT License)
 *          Copyright (c) 2018 Kawai Lo
 *
 * 為什麼不用手寫筆劃？姓名學（熊崎氏五格）算的是康熙字典的「部首原形」筆劃：
 *   陳 = 阜(8) + 8 = 16   （手寫 11）
 *   華 = 艸(6) + 8 = 14   （手寫 12）
 *   江 = 水(4) + 3 = 7    （手寫 6）
 *   玲 = 玉(5) + 令(5) = 10（手寫 9）
 * 用手寫筆劃算出來的五格全部會錯。
 *
 * 收錄範圍：CJK 基本區 U+4E00–U+9FFF，共 %(count)d 字。
 * 格式：STROKE_GROUPS[筆劃] = 該筆劃的所有字串接成的字串（省體積）。
 *
 * 另附簡→繁對照（S2T_ONE / S2T_MANY），只收「簡體筆劃與正體不同」的字。
 * 簡體字在康熙字典多半也查得到筆劃，但那不是姓名學該用的數字，
 * 不處理就會安靜算錯。來源：OpenCC STCharacters.txt (Apache-2.0)。
 */

'''


def main():
    ap = argparse.ArgumentParser()
    tmp = os.environ.get('TEMP', '.')
    ap.add_argument('--csv', default=os.path.join(tmp, 'kangxi-strokecount.csv'))
    ap.add_argument('--st', default=os.path.join(tmp, 'STCharacters.txt'))
    ap.add_argument('--out', default=None)
    args = ap.parse_args()

    if not os.path.isfile(args.csv):
        sys.exit(f'找不到來源 CSV：{args.csv}\n請先下載（見檔頭說明）。')
    if not os.path.isfile(args.st):
        sys.exit(f'找不到簡繁對照表：{args.st}\n請先下載（見檔頭說明）。')

    groups = {}
    total = 0
    lookup = {}
    with open(args.csv, encoding='utf-8-sig', newline='') as f:
        for row in csv.reader(f):
            if len(row) < 4 or row[0] == 'CodePoint':
                continue
            ch = row[2]
            if len(ch) != 1:
                continue
            cp = ord(ch)
            if not (LO <= cp <= HI):
                continue
            try:
                n = int(row[3])
            except ValueError:
                continue
            if n <= 0:
                continue
            groups.setdefault(n, []).append(ch)
            lookup[ch] = n
            total += 1

    # 驗證
    bad = [(ch, want, lookup.get(ch)) for ch, want in EXPECT.items() if lookup.get(ch) != want]
    if bad:
        for ch, want, got in bad:
            print(f'  筆劃不符：{ch} 應為 {want}，資料為 {got}')
        sys.exit(f'驗證失敗（{len(bad)} 個字對不上標準姓名學筆劃），不產生檔案。')

    # ---- 簡→繁對照（只留筆劃真的會算錯的） ----
    s2t_one = {}
    s2t_many = {}
    with open(args.st, encoding='utf-8') as f:
        for line in f:
            line = line.rstrip('\n')
            if not line or line.startswith('#') or '\t' not in line:
                continue
            simp, vals = line.split('\t', 1)
            if len(simp) != 1:
                continue
            trads = [t for t in vals.split() if len(t) == 1 and t != simp]
            if not trads:
                continue
            # 只有「用簡體會算出不同筆劃」時才需要提醒／轉換
            simp_n = lookup.get(simp)
            if simp_n is not None and all(lookup.get(t) == simp_n for t in trads):
                continue  # 筆劃一樣，無害，不必收
            trads = [t for t in trads if t in lookup]
            if not trads:
                continue
            if len(trads) == 1:
                s2t_one[simp] = trads[0]
            else:
                s2t_many[simp] = ''.join(trads)

    out = args.out or os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'js', 'data', 'strokes.js'
    )

    lines = [HEADER % {'count': total}, 'export const STROKE_GROUPS = {\n']
    for n in sorted(groups):
        chars = ''.join(sorted(groups[n]))
        lines.append(f'  {n}: "{chars}",\n')
    lines.append('};\n\n')

    lines.append('/** 簡體 → 唯一正體（可安全自動轉換） */\n')
    lines.append('export const S2T_ONE = {\n')
    for simp in sorted(s2t_one):
        lines.append(f'  "{simp}": "{s2t_one[simp]}",\n')
    lines.append('};\n\n')

    lines.append('/** 簡體 → 多個正體候選（不自動轉，請使用者自己選） */\n')
    lines.append('export const S2T_MANY = {\n')
    for simp in sorted(s2t_many):
        lines.append(f'  "{simp}": "{s2t_many[simp]}",\n')
    lines.append('};\n')

    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8', newline='\n') as f:
        f.writelines(lines)

    size = os.path.getsize(out)
    print(f'OK  {total} 字 / 筆劃 {min(groups)}-{max(groups)} / {size / 1024:.0f} KB')
    print(f'    -> {out}')
    print(f'    驗證 {len(EXPECT)} 個標準字全數通過')
    print(f'    簡→繁：唯一 {len(s2t_one)} 組、需選擇 {len(s2t_many)} 組')
    for probe in '陈刘张叶华杨龙':
        tgt = s2t_one.get(probe) or s2t_many.get(probe)
        print(f'      {probe} -> {tgt}  ({lookup.get(probe)} 劃 vs {lookup.get(tgt[0]) if tgt else "?"} 劃)')


if __name__ == '__main__':
    main()
