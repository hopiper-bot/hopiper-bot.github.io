r"""
build_strokes.py — 產生 js/data/strokes.js（康熙筆劃查表）

資料來源：https://github.com/breezyreeds/kangxi-strokecount （MIT License）
  康熙字典部首原形筆劃，姓名學（熊崎氏五格）用的就是這一套，
  與手寫筆劃不同（例：陳＝阜8＋8＝16、華＝艸6＋8＝14、江＝水4＋3＝7）。

同時產生簡→繁對照表。原因：簡體字在康熙字典裡多半也查得到筆劃，
但那個筆劃不是姓名學要用的（陈=13 而 陳=16、刘=6 而 劉=15、叶=5 而 葉=15），
若不處理就會安靜地算錯。來源為 OpenCC STCharacters.txt（Apache-2.0）。

產出三個檔：
  js/data/strokes.js     康熙筆劃 + 簡繁對照
  js/data/tones.js       聲調（給「名字念起來順不順」用）
  js/data/name-chars.js  適合取名的字，按筆劃分組（給筆劃反查用）

用法：
  1. 下載三份來源資料到 %TEMP%\（或用 --csv / --st / --unihan 指定）：
     https://raw.githubusercontent.com/breezyreeds/kangxi-strokecount/master/kangxi-strokecount.csv
     https://raw.githubusercontent.com/BYVoid/OpenCC/master/data/dictionary/STCharacters.txt
     https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip
  2. python tools/build_strokes.py

輸出格式為「按筆劃分組的字串」，比 JSON 物件小很多：
  export const STROKE_GROUPS = { 4: "王方尹...", 5: "玉石..." };
執行期在 name.js 展開成 Map。
"""

import argparse
import csv
import io
import os
import sys
import unicodedata
import zipfile

# 拼音的聲調符號 → 聲調數字。輕聲（沒有符號）算 5。
TONE_MARKS = {
    '\u0304': 1,  # ˉ 陰平
    '\u0301': 2,  # ˊ 陽平
    '\u030C': 3,  # ˇ 上聲
    '\u0300': 4,  # ˋ 去聲
}

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

TONE_HEADER = '''/**
 * tones.js — 國語聲調查表（姓名念起來順不順）
 *
 * ⚠️ 此檔為自動產生，請勿手改。要更新請跑 tools/build_strokes.py
 *
 * 資料來源：Unicode Unihan Database, kMandarin 欄位
 *          https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip
 *
 * 聲調：1 陰平、2 陽平、3 上聲、4 去聲、5 輕聲。
 * 多音字只收 kMandarin 的第一個讀音（Unihan 以最常用的排前面），
 * 所以像「樂」這種破音字只會有一個聲調，這是已知的取捨。
 *
 * 收錄 %(count)d 字。格式：TONE_GROUPS[聲調] = 該聲調的所有字。
 */

'''

NAMECHAR_HEADER = '''/**
 * name-chars.js — 適合取名的字，按康熙筆劃分組
 *
 * ⚠️ 此檔為自動產生，請勿手改。
 *    要增刪字改 tools/name_chars.txt，然後跑 tools/build_strokes.py
 *
 * 為什麼需要白名單？取名建議算出「這個姓配 11＋5 劃最順」之後，
 * 使用者還要知道哪些字是 11 劃。但直接從筆劃表反查會列出
 * 屍、癌、屁、賤這類字 —— 筆劃是資料問題，「能不能拿來取名」是編輯判斷。
 *
 * 收錄 %(count)d 字。格式：NAME_CHARS[筆劃] = 該筆劃的可選字。
 */

'''


def tone_of(pinyin):
    """從帶符號的拼音取聲調（ hǎo → 3、ma → 5 輕聲 ）"""
    for ch in unicodedata.normalize('NFD', pinyin):
        if ch in TONE_MARKS:
            return TONE_MARKS[ch]
    return 5


def read_tones(unihan_zip, wanted):
    """讀 Unihan kMandarin，取第一個讀音的聲調。多音字只取最常用的那個。"""
    tones = {}
    with zipfile.ZipFile(unihan_zip) as z:
        with z.open('Unihan_Readings.txt') as fh:
            for line in io.TextIOWrapper(fh, encoding='utf-8'):
                if '\tkMandarin\t' not in line:
                    continue
                cp, _, val = line.rstrip('\n').split('\t', 2)
                try:
                    ch = chr(int(cp[2:], 16))
                except ValueError:
                    continue
                if ch not in wanted:
                    continue
                first = val.split()[0] if val.split() else ''
                if first:
                    tones[ch] = tone_of(first)
    return tones


def read_name_chars(path):
    """讀人工篩選的取名用字白名單，只取 CJK 漢字"""
    chars = []
    seen = set()
    with open(path, encoding='utf-8') as f:
        for line in f:
            if line.lstrip().startswith('#'):
                continue
            for ch in line:
                if LO <= ord(ch) <= HI and ch not in seen:
                    seen.add(ch)
                    chars.append(ch)
    return chars


def write_js(path, lines):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.writelines(lines)
    return os.path.getsize(path)


def main():
    ap = argparse.ArgumentParser()
    tmp = os.environ.get('TEMP', '.')
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(here)
    ap.add_argument('--csv', default=os.path.join(tmp, 'kangxi-strokecount.csv'))
    ap.add_argument('--st', default=os.path.join(tmp, 'STCharacters.txt'))
    ap.add_argument('--unihan', default=os.path.join(tmp, 'Unihan.zip'))
    ap.add_argument('--name-chars', default=os.path.join(here, 'name_chars.txt'))
    ap.add_argument('--out', default=None)
    args = ap.parse_args()

    if not os.path.isfile(args.csv):
        sys.exit(f'找不到來源 CSV：{args.csv}\n請先下載（見檔頭說明）。')
    if not os.path.isfile(args.st):
        sys.exit(f'找不到簡繁對照表：{args.st}\n請先下載（見檔頭說明）。')
    if not os.path.isfile(args.unihan):
        sys.exit(f'找不到 Unihan.zip：{args.unihan}\n請先下載（見檔頭說明）。')
    if not os.path.isfile(args.name_chars):
        sys.exit(f'找不到取名用字白名單：{args.name_chars}')

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

    out = args.out or os.path.join(root, 'js', 'data', 'strokes.js')

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

    size = write_js(out, lines)

    print(f'OK  strokes.js  {total} 字 / 筆劃 {min(groups)}-{max(groups)} / {size / 1024:.0f} KB')
    print(f'    驗證 {len(EXPECT)} 個標準字全數通過')
    print(f'    簡→繁：唯一 {len(s2t_one)} 組、需選擇 {len(s2t_many)} 組')
    for probe in '陈刘叶华':
        tgt = s2t_one.get(probe) or s2t_many.get(probe)
        print(f'      {probe} -> {tgt}  ({lookup.get(probe)} 劃 vs {lookup.get(tgt[0]) if tgt else "?"} 劃)')

    # ---- 聲調 ----
    tones = read_tones(args.unihan, set(lookup))
    tone_groups = {}
    for ch, t in tones.items():
        tone_groups.setdefault(t, []).append(ch)

    tone_lines = [TONE_HEADER % {'count': len(tones)}, 'export const TONE_GROUPS = {\n']
    for t in sorted(tone_groups):
        tone_lines.append(f'  {t}: "{"".join(sorted(tone_groups[t]))}",\n')
    tone_lines.append('};\n')
    tone_path = os.path.join(root, 'js', 'data', 'tones.js')
    tone_size = write_js(tone_path, tone_lines)

    tone_probe = {'媽': 1, '麻': 2, '馬': 3, '罵': 4, '明': 2, '偉': 3, '建': 4, '安': 1}
    tone_bad = [(c, w, tones.get(c)) for c, w in tone_probe.items() if tones.get(c) != w]
    print(f'OK  tones.js    {len(tones)} 字 / {tone_size / 1024:.0f} KB')
    if tone_bad:
        for c, w, g in tone_bad:
            print(f'    聲調不符：{c} 應為 {w}，讀到 {g}')
        sys.exit('聲調驗證失敗。')
    print(f'    驗證 {len(tone_probe)} 個字聲調正確（媽1 麻2 馬3 罵4）')

    # ---- 取名用字（按筆劃分組） ----
    name_chars = read_name_chars(args.name_chars)
    missing = [c for c in name_chars if c not in lookup]
    if missing:
        sys.exit(f'白名單有 {len(missing)} 個字查不到康熙筆劃：{"".join(missing)}')

    nc_groups = {}
    for ch in name_chars:
        nc_groups.setdefault(lookup[ch], []).append(ch)

    nc_lines = [NAMECHAR_HEADER % {'count': len(name_chars)}, 'export const NAME_CHARS = {\n']
    for n in sorted(nc_groups):
        nc_lines.append(f'  {n}: "{"".join(nc_groups[n])}",\n')
    nc_lines.append('};\n')
    nc_path = os.path.join(root, 'js', 'data', 'name-chars.js')
    nc_size = write_js(nc_path, nc_lines)

    thin = [n for n in range(3, 25) if len(nc_groups.get(n, [])) < 6]
    print(f'OK  name-chars.js  {len(name_chars)} 字 / 筆劃 {min(nc_groups)}-{max(nc_groups)} / {nc_size / 1024:.0f} KB')
    print(f'    沒有聲調資料的字：{len([c for c in name_chars if c not in tones])}')
    if thin:
        print(f'    ⚠️ 這些筆劃的可選字太少（<6），建議補：{thin}')


if __name__ == '__main__':
    main()
