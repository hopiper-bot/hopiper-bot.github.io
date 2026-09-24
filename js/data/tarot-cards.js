export const TAROT_CARDS = [
  {
    id: 'fool', number: 0, name: '愚者', en: 'The Fool', symbol: '✦', element: '風',
    upright: { keywords: ['開始', '自由', '信任'], message: '新的路正在你面前展開。今天不需要先看見完整地圖，只要確認第一步值得走。', action: '替一件想很久的事，完成一個最小但真實的起步。', reflection: '如果不怕被笑，我今天最想嘗試什麼？' },
    reversed: { keywords: ['冒進', '分心', '準備不足'], message: '想衝出去的心很強，但有一個細節還沒被照顧。暫停不是退縮，而是避免把勇敢用在錯的方向。', action: '出手前多檢查一次時間、資源與退路。', reflection: '我是真的相信這條路，還是只想逃離現在？' },
  },
  {
    id: 'magician', number: 1, name: '魔術師', en: 'The Magician', symbol: '∞', element: '風',
    upright: { keywords: ['主動', '資源', '創造'], message: '你手上的條件已經比自己以為的完整。今天的關鍵不是再等，而是把現有資源組合成成果。', action: '選一件最重要的事，主動發出訊息、提案或第一版。', reflection: '我已經擁有、卻一直沒拿來用的能力是什麼？' },
    reversed: { keywords: ['失焦', '話術', '能量分散'], message: '能力沒有消失，只是心力散在太多地方。也要留意漂亮說法是否掩蓋了真正的問題。', action: '刪掉一項不必要的承諾，把力氣收回核心目標。', reflection: '我現在是在創造，還是在證明自己很厲害？' },
  },
  {
    id: 'high-priestess', number: 2, name: '女祭司', en: 'The High Priestess', symbol: '☾', element: '水',
    upright: { keywords: ['直覺', '觀察', '沉靜'], message: '答案還不適合被催出來。今天多看一層、多聽一句，直覺會在安靜裡把線索拼好。', action: '重要決定先留一晚，記下第一個身體感受。', reflection: '我其實早就知道、只是還不願承認的是什麼？' },
    reversed: { keywords: ['封閉', '疑心', '忽略直覺'], message: '外界聲音太大，讓你聽不見自己。別把焦慮誤認成直覺，也別因害怕答案而假裝沒有感覺。', action: '離開資訊流十五分鐘，只寫下事實與感受。', reflection: '哪個聲音是我的，哪個只是別人的期待？' },
  },
  {
    id: 'empress', number: 3, name: '皇后', en: 'The Empress', symbol: '❀', element: '土',
    upright: { keywords: ['滋養', '豐盛', '生長'], message: '今天適合照顧正在成形的人事物。真正的豐盛不是塞滿，而是讓重要的東西得到足夠養分。', action: '把時間、食物或一句肯定，給真正需要被照顧的地方。', reflection: '什麼在我的耐心照料下，正在慢慢長大？' },
    reversed: { keywords: ['耗竭', '過度照顧', '自我忽略'], message: '你可能把太多養分給了別人，自己卻已經乾掉。照顧不是無限供應，界線也是愛的一部分。', action: '今天至少拒絕一件會讓自己過度消耗的事。', reflection: '我照顧別人時，是否也允許自己被照顧？' },
  },
  {
    id: 'emperor', number: 4, name: '皇帝', en: 'The Emperor', symbol: '♜', element: '火',
    upright: { keywords: ['結構', '決斷', '責任'], message: '今天需要清楚規則與明確決定。穩定不是控制所有人，而是知道什麼必須由你守住。', action: '替目前最混亂的事情訂出一條可執行的規則。', reflection: '哪一件事需要我停止模糊、正式做決定？' },
    reversed: { keywords: ['僵化', '控制', '權責失衡'], message: '太用力維持秩序，反而可能讓事情卡住。檢查你是在承擔責任，還是在用控制抵抗不安。', action: '保留目標，但放寬一個不必要的做法。', reflection: '如果不用證明權威，我會怎麼帶領這件事？' },
  },
  {
    id: 'hierophant', number: 5, name: '教皇', en: 'The Hierophant', symbol: '✣', element: '土',
    upright: { keywords: ['傳承', '學習', '價值'], message: '成熟的方法與前人的經驗能替你省下繞路。今天適合找老師、查規範，也適合重新確認自己的原則。', action: '向一位有經驗的人請教一個具體問題。', reflection: '我真正願意長期遵守的價值是什麼？' },
    reversed: { keywords: ['盲從', '框架', '價值衝突'], message: '一直以來的標準未必仍適合你。尊重傳統不等於交出判斷，今天可以重新問一次「為什麼」。', action: '找出一條只是習慣、已不再有用的規則。', reflection: '我遵守它，是因為認同，還是怕不合群？' },
  },
  {
    id: 'lovers', number: 6, name: '戀人', en: 'The Lovers', symbol: '♡', element: '風',
    upright: { keywords: ['選擇', '連結', '一致'], message: '這張牌不只談感情，也談價值一致的選擇。今天的好答案，是選完之後更像真正的自己。', action: '做決定前，先說清楚自己最不能犧牲的條件。', reflection: '這個選擇讓我更完整，還是只讓別人滿意？' },
    reversed: { keywords: ['失衡', '迎合', '選擇困難'], message: '關係或選擇裡有一部分正在委屈自己。先停止兩邊討好，矛盾才有機會被真正看見。', action: '把沒說出口的需求，用不指責的方式說清楚。', reflection: '我害怕失去什麼，所以遲遲不肯選？' },
  },
  {
    id: 'chariot', number: 7, name: '戰車', en: 'The Chariot', symbol: '➶', element: '水',
    upright: { keywords: ['前進', '意志', '掌舵'], message: '方向一旦確定，雜音就不必逐一回應。今天適合集中意志，把互相拉扯的力量帶往同一個目的地。', action: '先完成今天最難、也最能推進局面的那一步。', reflection: '我想贏的是面子，還是真正重要的結果？' },
    reversed: { keywords: ['失控', '硬撐', '方向混亂'], message: '速度不等於進度。當內在兩股力量方向相反，再踩油門只會更累，先把方向盤拿回來。', action: '暫停一個沒有明確目的的忙碌行程。', reflection: '我現在最需要修正的是速度，還是方向？' },
  },
  {
    id: 'strength', number: 8, name: '力量', en: 'Strength', symbol: '♌', element: '火',
    upright: { keywords: ['勇氣', '溫柔', '自制'], message: '真正的力量不是壓過對方，而是能安放自己的情緒。今天柔軟但堅定，會比正面硬碰更有影響力。', action: '遇到刺激時慢三秒，再用最穩的語氣回應。', reflection: '我能不能不靠逞強，也相信自己有力量？' },
    reversed: { keywords: ['自我懷疑', '壓抑', '內耗'], message: '你可能把力氣都用來責怪自己。脆弱不是能力不足的證據，先停止內戰，力量才回得來。', action: '把一句自我批評改寫成具體、可改善的描述。', reflection: '如果我站在自己這邊，現在會怎麼說？' },
  },
  {
    id: 'hermit', number: 9, name: '隱者', en: 'The Hermit', symbol: '☼', element: '土',
    upright: { keywords: ['獨處', '內省', '智慧'], message: '今天不必急著向外找認同。拉開一點距離，你會看見真正值得帶走的經驗與方向。', action: '留一段不被訊息打斷的獨處時間。', reflection: '拿掉別人的掌聲後，我仍然想做什麼？' },
    reversed: { keywords: ['孤立', '封閉', '想太多'], message: '獨處已經慢慢變成躲藏。思考若沒有回到現實驗證，就容易在腦中繞成迷宮。', action: '找一位信任的人，說出目前最卡的一件事。', reflection: '我需要安靜，還是其實需要連結？' },
  },
  {
    id: 'wheel-of-fortune', number: 10, name: '命運之輪', en: 'Wheel of Fortune', symbol: '⊙', element: '火',
    upright: { keywords: ['轉機', '週期', '順勢'], message: '局勢正在移動，原本卡住的地方可能出現新入口。好運不只是等待，而是看見時機時願意伸手。', action: '回覆那個可能帶來新連結或新機會的訊息。', reflection: '眼前的變化，正在邀請我更新哪個做法？' },
    reversed: { keywords: ['反覆', '延遲', '抗拒變化'], message: '同一個課題可能又繞回來，不是命運針對你，而是舊反應還沒被改寫。這次可以選不同做法。', action: '辨認最近重複出現的模式，改掉其中一個環節。', reflection: '我一直把什麼歸咎運氣，卻沒改變自己的選擇？' },
  },
  {
    id: 'justice', number: 11, name: '正義', en: 'Justice', symbol: '⚖', element: '風',
    upright: { keywords: ['誠實', '平衡', '因果'], message: '今天適合回到事實，做一個對長期負責的決定。公平不是每個人都一樣，而是付出與責任相稱。', action: '把情緒與事實分開列出，再決定下一步。', reflection: '如果願意承擔後果，我最誠實的選擇是什麼？' },
    reversed: { keywords: ['偏見', '逃避責任', '失衡'], message: '某個判斷可能被立場或情緒拉歪。先別急著證明誰對，看看自己是否漏掉了不方便承認的事實。', action: '主動補上一項自己應負、卻一直延後的責任。', reflection: '我要求別人公平時，有沒有也公平看待自己？' },
  },
  {
    id: 'hanged-man', number: 12, name: '吊人', en: 'The Hanged Man', symbol: '▽', element: '水',
    upright: { keywords: ['暫停', '換位', '放下'], message: '現在的停頓不是空白，而是換角度的時間。越想用舊方法硬推，越難看見真正的出口。', action: '把問題倒過來問一次，或請立場不同的人描述它。', reflection: '如果這段停滯有用，它正在教我看見什麼？' },
    reversed: { keywords: ['拖延', '白等', '不肯放手'], message: '你可能用「再等等」延後必要的選擇。犧牲若沒有意義，就只是消耗；該調整的是方法，不是無限忍耐。', action: '替一件懸而未決的事訂下明確期限。', reflection: '我是真的等待時機，還是不敢結束？' },
  },
  {
    id: 'death', number: 13, name: '死神', en: 'Death', symbol: '♢', element: '水',
    upright: { keywords: ['結束', '轉化', '更新'], message: '某個階段已完成它的任務。這不是預告壞事，而是提醒你：騰出空間，新生活才進得來。', action: '清掉一項已過期的物品、承諾或工作方式。', reflection: '我明知已經結束，卻還捨不得放下的是什麼？' },
    reversed: { keywords: ['抗拒改變', '停滯', '留戀'], message: '你正在抓住熟悉感，即使它已不再適合。改變令人不安，但長期卡住也有代價。', action: '承認一個已無法回到從前的事實。', reflection: '我留住的是價值，還是只是熟悉？' },
  },
  {
    id: 'temperance', number: 14, name: '節制', en: 'Temperance', symbol: '⚗', element: '火',
    upright: { keywords: ['調和', '耐心', '適量'], message: '今天不需要走極端。把兩種看似衝突的方法調成適合自己的比例，穩定累積會比一口氣爆發更有效。', action: '把過大的目標拆成今天能穩定完成的份量。', reflection: '我的生活裡，哪一項需要重新調整比例？' },
    reversed: { keywords: ['過量', '失序', '急躁'], message: '某件事不是完全不能做，而是份量已經失衡。先把節奏拉回來，別用下一個極端修理上一個極端。', action: '今天把一項過量行為減少三分之一。', reflection: '我在什麼地方總是一下太多、一下完全不要？' },
  },
  {
    id: 'devil', number: 15, name: '惡魔', en: 'The Devil', symbol: '♑', element: '土',
    upright: { keywords: ['慾望', '依附', '束縛'], message: '有一條看不見的繩子正在牽動你，可能是慾望、習慣或怕失去。先誠實看見它，選擇權才會回來。', action: '替最容易失控的一件事設一個今天有效的界線。', reflection: '什麼看似帶給我快樂，事後卻讓我更不自由？' },
    reversed: { keywords: ['鬆綁', '覺醒', '戒除'], message: '你開始看懂束縛自己的模式，繩子其實比想像中鬆。今天是一個停止餵養舊習慣的好時機。', action: '做一個能證明「我可以不照舊反應」的小選擇。', reflection: '我準備從哪一種依附裡拿回主導權？' },
  },
  {
    id: 'tower', number: 16, name: '高塔', en: 'The Tower', symbol: 'ϟ', element: '火',
    upright: { keywords: ['震動', '真相', '重建'], message: '不穩的結構可能突然露出裂縫。別急著把表面補回原樣，真相出現，是為了讓你蓋得更牢。', action: '先處理最核心的風險，不維持已經失效的假象。', reflection: '如果這個結構倒下，哪些東西其實值得被留下？' },
    reversed: { keywords: ['延後爆發', '害怕失去', '內在震盪'], message: '你已感覺哪裡不對，只是還在延後面對。小幅主動修正，會比等它被迫翻桌更溫和。', action: '今天修補一個你早已知道的薄弱點。', reflection: '我為了維持安全感，正在假裝看不見什麼？' },
  },
  {
    id: 'star', number: 17, name: '星星', en: 'The Star', symbol: '✧', element: '風',
    upright: { keywords: ['希望', '療癒', '真誠'], message: '混亂之後，方向感正在慢慢回來。今天不必強迫自己立刻振作，只要保持真誠，微光就會累積成路。', action: '完成一件能讓未來的自己感謝你的小事。', reflection: '即使還沒實現，我仍願意相信什麼？' },
    reversed: { keywords: ['失望', '比較', '信心微弱'], message: '你可能因為進度不如預期，就否定一路的累積。先離開比較，重新確認這個願望是不是仍屬於你。', action: '記下三個已經發生、但被自己忽略的進展。', reflection: '我是失去希望，還是只對速度感到失望？' },
  },
  {
    id: 'moon', number: 18, name: '月亮', en: 'The Moon', symbol: '☽', element: '水',
    upright: { keywords: ['潛意識', '模糊', '感受'], message: '資訊還不完整，情緒卻很有聲音。今天適合探索，不適合因恐懼快速下結論；先讓霧散一點。', action: '重大判斷先查證，並記下反覆出現的夢、念頭或感受。', reflection: '我害怕的事情，有多少是事實、多少是想像？' },
    reversed: { keywords: ['霧散', '揭露', '焦慮鬆動'], message: '原本模糊的線索逐漸清楚。你不必一次解開全部，只要停止餵養最壞劇本，真相就更容易被看見。', action: '向當事人確認一件你一直自行猜測的事。', reflection: '當恐懼退去，我看見的事實是什麼？' },
  },
  {
    id: 'sun', number: 19, name: '太陽', en: 'The Sun', symbol: '☀', element: '火',
    upright: { keywords: ['清晰', '活力', '喜悅'], message: '事情有機會變得簡單而明亮。今天適合被看見、分享成果，也別忘了允許自己享受已經擁有的好。', action: '公開一個成果，或真心稱讚一位讓你開心的人。', reflection: '哪一種快樂不需要證明，也值得我好好享受？' },
    reversed: { keywords: ['過度樂觀', '疲憊', '快樂被遮住'], message: '光還在，只是被期待或疲憊擋住。別為了表現正向而否認真實感受，也別因一朵雲忘記整片天空。', action: '降低一項不必要的表現壓力，補回睡眠或休息。', reflection: '我是在感受快樂，還是在表演快樂？' },
  },
  {
    id: 'judgement', number: 20, name: '審判', en: 'Judgement', symbol: '♬', element: '火',
    upright: { keywords: ['召喚', '醒悟', '回應'], message: '過去的經驗正在要求一個更成熟的回答。今天適合做總結、承認改變，並回應那個一直叫你的方向。', action: '替一件重要舊事做出結論，然後採取新版本的行動。', reflection: '現在的我，會如何重新回答過去那個問題？' },
    reversed: { keywords: ['自責', '逃避召喚', '遲疑'], message: '你可能一直拿過去審判自己，反而聽不見真正的召喚。承認錯誤是為了更新，不是終身服刑。', action: '把一個後悔轉成今天能補做的具體行動。', reflection: '如果不再懲罰自己，我準備承擔什麼？' },
  },
  {
    id: 'world', number: 21, name: '世界', en: 'The World', symbol: '◎', element: '土',
    upright: { keywords: ['完成', '整合', '新階段'], message: '一個週期正走向完整。今天適合收尾、確認成果，也要讓自己真正感受到「我做到了」。', action: '完成最後百分之十，並替這段旅程留下一個紀錄。', reflection: '這段經歷讓我成為了怎樣的人？' },
    reversed: { keywords: ['差最後一步', '未完待續', '完美主義'], message: '事情已很接近完成，卡住的可能不是能力，而是不願接受它不必完美。讓成果落地，比永遠修改更重要。', action: '定義「足夠完成」的標準，今天正式交付。', reflection: '我不肯結束，是因為還沒完成，還是捨不得離開？' },
  },
];

export const TAROT_CARD_COUNT = TAROT_CARDS.length;
