/**
 * hd-crosses.js — 輪迴交叉資料庫
 * 
 * key = "P太陽閘門-P地球閘門/D太陽閘門-D地球閘門"
 * 每個 key 對應一個交叉名稱和描述
 * 
 * 右角度（Right Angle）= Profile 1/3, 1/4, 2/4, 2/5, 3/5, 3/6
 * 並列（Juxtaposition）= Profile 4/6, 4/1
 * 左角度（Left Angle）= Profile 5/1, 5/2, 6/2, 6/3
 */

// 輪迴交叉查找表
// 格式：[P太陽, P地球, D太陽, D地球] → { name, desc }
// 太陽/地球永遠互為對宮（相差 180°），所以只需太陽閘門即可確定
// 對宮表：gate → opposite gate
const GATE_OPPOSITES = {
  1:2, 2:1, 3:42, 4:49, 5:35, 6:36, 7:13, 8:14, 9:16, 10:15,
  11:12, 12:11, 13:7, 14:8, 15:10, 16:9, 17:18, 18:17, 19:33, 20:34,
  21:48, 22:47, 23:43, 24:44, 25:46, 26:45, 27:28, 28:27, 29:30, 30:29,
  31:41, 32:42, 33:19, 34:20, 35:5, 36:6, 37:40, 38:39, 39:38, 40:37,
  41:31, 42:32, 43:23, 44:24, 45:26, 46:25, 47:22, 48:21, 49:4, 50:3,
  51:57, 52:58, 53:54, 54:53, 55:59, 56:60, 57:51, 58:52, 59:55, 60:56,
  61:62, 62:61, 63:64, 64:63
};

/**
 * 交叉資料表
 * key = "pSun-dSun" (因為地球永遠是太陽的對宮，只需兩個太陽閘門)
 * 每個組合有三種角度版本，由 Profile 決定
 */
const CROSS_DATA = {
  // === 閘門 47 系列（P太陽=47） ===
  '47-45': {
    right: { name: '右角度交叉之統領', en: 'Right Angle Cross of Rulership',
      desc: '你天生具有領導的潛力。閘門 47 帶來從混亂中提煉領悟的能力，閘門 45 是聚集資源與人的王者能量。你的人生主題是透過自身的頓悟和理解，引領一群人走向共同目標。你不是強勢的指揮者，而是那個「突然想通了，然後所有人跟著你走」的人。' },
    juxt: { name: '並列交叉之領悟', en: 'Juxtaposition Cross of Realizing',
      desc: '你走在一條固定的軌道上——不斷地經歷困惑、然後頓悟。這是你的生命節奏，不需要抗拒。你的存在本身就在示範「領悟」的過程。' },
    left: { name: '左角度交叉之告知', en: 'Left Angle Cross of Informing',
      desc: '你的使命是透過與他人的互動，把你的領悟傳遞出去。你不是為自己而活，而是為了讓別人也能「啊哈！原來如此」。' },
  },
  '47-2': {
    right: { name: '右角度交叉之統領 2', en: 'Right Angle Cross of Rulership 2',
      desc: '閘門 47 的領悟搭配閘門 2 的方向感。你的領導力來自直覺性的「我知道方向在哪」，即使當下看似混亂，你內在有個羅盤。' },
    juxt: { name: '並列交叉之領悟', en: 'Juxtaposition Cross of Realizing',
      desc: '你的人生是一連串的頓悟之旅，搭配天生的方向感，你總能在迷霧中找到出路。' },
    left: { name: '左角度交叉之告知 2', en: 'Left Angle Cross of Informing 2',
      desc: '你把領悟傳遞給他人，幫助他們找到方向。你是人群中的導航者。' },
  },

  // === 閘門 1 系列 ===
  '1-2': {
    right: { name: '右角度交叉之人面獅身', en: 'Right Angle Cross of the Sphinx',
      desc: '四個閘門都在 G 中心和薦骨的軸線上。你的人生主題是探索自我認同——我是誰、我要去哪、我的方向是什麼。你是自我探索的典範。' },
    juxt: { name: '並列交叉之自我表達', en: 'Juxtaposition Cross of Self-Expression',
      desc: '你走在創意表達的固定軌道上。你的存在就是要把內在的創造力展現出來。' },
    left: { name: '左角度交叉之挑釁', en: 'Left Angle Cross of Defiance',
      desc: '你透過挑戰現狀來完成使命。你的創造力不是為了自己，而是為了打破舊有的框架。' },
  },

  // === 閘門 2 系列 ===
  '2-1': {
    right: { name: '右角度交叉之人面獅身', en: 'Right Angle Cross of the Sphinx',
      desc: '你是人面獅身交叉的另一種表達。閘門 2 是接收方向的容器，你的使命是信任你內在的磁性——你不需要追尋方向，方向會來找你。' },
    juxt: { name: '並列交叉之驅動力', en: 'Juxtaposition Cross of the Driver',
      desc: '你是天生的駕駛者，走在一條無法偏離的路上。信任你的內在引力。' },
    left: { name: '左角度交叉之挑釁', en: 'Left Angle Cross of Defiance',
      desc: '你的方向感服務於集體——你知道群體該往哪走，即使那條路看似叛逆。' },
  },

  // === 閘門 3 系列 ===
  '3-50': {
    right: { name: '右角度交叉之突變', en: 'Right Angle Cross of Mutation',
      desc: '你攜帶突變的能量。閘門 3 是秩序中的混亂，閘門 50 是價值與責任。你的人生主題是在既有規則中帶入全新的可能性。改變不是你選的，是你天生攜帶的。' },
    juxt: { name: '並列交叉之突變', en: 'Juxtaposition Cross of Mutation',
      desc: '你就是突變本身。你的存在就在挑戰「事情本來的樣子」。' },
    left: { name: '左角度交叉之希望', en: 'Left Angle Cross of Wishes',
      desc: '你帶來的改變不是為了自己，而是為了實現集體的希望。你是群體突變的催化劑。' },
  },

  // === 閘門 4 系列 ===
  '4-29': {
    right: { name: '右角度交叉之解釋', en: 'Right Angle Cross of Explanation',
      desc: '閘門 4 是公式化的答案，閘門 29 是承諾的力量。你的人生主題是找到答案然後全力投入。你是那個「想通了就死命做」的人。' },
    juxt: { name: '並列交叉之公式', en: 'Juxtaposition Cross of Formulization',
      desc: '你的軌道是不斷地將生活公式化——找到模式、建立系統。' },
    left: { name: '左角度交叉之革命', en: 'Left Angle Cross of Revolution',
      desc: '你的思考力服務於集體的革新。你不只是想通，你要幫整個系統想通。' },
  },

  // === 閘門 5 系列 ===
  '5-35': {
    right: { name: '右角度交叉之意識', en: 'Right Angle Cross of Consciousness',
      desc: '閘門 5 是等待正確時機的耐心，閘門 35 是追求體驗的渴望。你在等待與行動之間找到生命的節奏。' },
    juxt: { name: '並列交叉之習慣', en: 'Juxtaposition Cross of Habits',
      desc: '你的生命建立在穩定的節奏和習慣上。正確的時機就是你的生命模式。' },
    left: { name: '左角度交叉之分離', en: 'Left Angle Cross of Separation',
      desc: '你透過與他人的經驗交流，幫助人們找到自己的節奏。' },
  },

  // === 閘門 6 系列 ===
  '6-36': {
    right: { name: '右角度交叉之伊甸園', en: 'Right Angle Cross of Eden',
      desc: '閘門 6 是親密的界限，閘門 36 是情緒的冒險。你的人生主題是在情感的波動中找到真正的親密。你知道什麼時候該開門、什麼時候該關門。' },
    juxt: { name: '並列交叉之衝突', en: 'Juxtaposition Cross of Conflict',
      desc: '你的軌道不可避免地涉及情緒衝突——但這不是壞事，這是你生命的教材。' },
    left: { name: '左角度交叉之飛機', en: 'Left Angle Cross of the Plane',
      desc: '你把情緒的智慧帶入人際關係中。你幫助別人理解「什麼時候該冒險、什麼時候該等待」。' },
  },

  // === 閘門 7 系列 ===
  '7-13': {
    right: { name: '右角度交叉之人面獅身 4', en: 'Right Angle Cross of the Sphinx 4',
      desc: '閘門 7 是領導的角色，閘門 13 是傾聽者。你天生在方向和角色之間找到平衡——有時帶領，有時傾聽。這是人面獅身最具領導力的版本。' },
    juxt: { name: '並列交叉之互動', en: 'Juxtaposition Cross of Interaction',
      desc: '你存在的軌道就是與人互動——透過引導和聆聽來找到集體的方向。' },
    left: { name: '左角度交叉之面具', en: 'Left Angle Cross of Masks',
      desc: '你戴著不同的面具服務不同的人群。你的領導力是變化的、適應的。' },
  },

  // === 閘門 8 系列 ===
  '8-14': {
    right: { name: '右角度交叉之傳染', en: 'Right Angle Cross of Contagion',
      desc: '閘門 8 是貢獻的渴望，閘門 14 是豐盛的力量。你天生有感染力——你的熱情和資源會「傳染」給身邊的人。你做的事會自然吸引追隨者。' },
    juxt: { name: '並列交叉之貢獻', en: 'Juxtaposition Cross of Contribution',
      desc: '你的軌道是不斷付出和貢獻。這不是犧牲，而是你存在的自然表達。' },
    left: { name: '左角度交叉之不確定', en: 'Left Angle Cross of Uncertainty',
      desc: '你的貢獻方式是幫助人們面對不確定性。你在不確定中找到力量。' },
  },

  // === 閘門 9 系列 ===
  '9-16': {
    right: { name: '右角度交叉之計畫', en: 'Right Angle Cross of Planning',
      desc: '閘門 9 是專注於細節，閘門 16 是技能的熱情。你的人生主題是精益求精——透過反覆練習和專注，把事情做到極致。' },
    juxt: { name: '並列交叉之專注', en: 'Juxtaposition Cross of Focusing',
      desc: '你的固定軌道就是深度專注。你不需要廣度，你需要的是深入再深入。' },
    left: { name: '左角度交叉之奉獻', en: 'Left Angle Cross of Dedication',
      desc: '你的專注力服務於更大的目標。你是團隊中那個把細節做到完美的人。' },
  },

  // === 閘門 10 系列 ===
  '10-15': {
    right: { name: '右角度交叉之愛之船', en: 'Right Angle Cross of the Vessel of Love',
      desc: '閘門 10 是自我行為（做自己），閘門 15 是極端和韻律。你的人生主題是完全做自己——極端的、有韻律的、不妥協的活出真實的你。愛從這裡開始。' },
    juxt: { name: '並列交叉之行為', en: 'Juxtaposition Cross of Behavior',
      desc: '你就是你的行為。沒有偽裝的空間。你活在「我就是這樣」的純粹中。' },
    left: { name: '左角度交叉之預防', en: 'Left Angle Cross of Prevention',
      desc: '你做自己的方式能幫助別人避免走錯路。你的真實是他人的鏡子。' },
  },

  // === 閘門 11 系列 ===
  '11-12': {
    right: { name: '右角度交叉之伊甸園 2', en: 'Right Angle Cross of Eden 2',
      desc: '閘門 11 是和平的想法，閘門 12 是謹慎的表達。你內心充滿靈感和想法，但你知道不是所有想法都該說出口。你的人生主題是找到正確的時機去分享你的洞見。' },
    juxt: { name: '並列交叉之想法', en: 'Juxtaposition Cross of Ideas',
      desc: '你的軌道就是不斷產生想法。你是靈感的泉源，點子永遠不缺。' },
    left: { name: '左角度交叉之教育', en: 'Left Angle Cross of Education',
      desc: '你的想法服務於教育他人。你天生就是老師——把複雜的事情變簡單。' },
  },

  // === 閘門 13 系列 ===
  '13-7': {
    right: { name: '右角度交叉之人面獅身 2', en: 'Right Angle Cross of the Sphinx 2',
      desc: '閘門 13 是聆聽和收集秘密的人，閘門 7 是領導者的角色。你的人生主題是透過傾聽來引導。你知道的比你說的多太多。' },
    juxt: { name: '並列交叉之傾聽', en: 'Juxtaposition Cross of Listening',
      desc: '你的存在就是傾聽。人們會把秘密告訴你，因為你天生值得信任。' },
    left: { name: '左角度交叉之面具 2', en: 'Left Angle Cross of Masks 2',
      desc: '你用傾聽的能力服務不同的人群，每次都展現不同的面向。' },
  },

  // === 閘門 14 系列 ===
  '14-8': {
    right: { name: '右角度交叉之傳染 2', en: 'Right Angle Cross of Contagion 2',
      desc: '閘門 14 是掌握資源的力量，閘門 8 是獨特的貢獻。你天生富有（不只是錢），而且你的豐盛會感染周圍的人。你做自己就是最好的貢獻。' },
    juxt: { name: '並列交叉之力量', en: 'Juxtaposition Cross of Empowering',
      desc: '你的軌道是不斷地給予力量——你的存在本身就能點燃別人。' },
    left: { name: '左角度交叉之不確定 2', en: 'Left Angle Cross of Uncertainty 2',
      desc: '你的資源和力量幫助他人在不確定中找到支撐。你是混亂中的穩定。' },
  },

  // === 閘門 15 系列 ===
  '15-10': {
    right: { name: '右角度交叉之愛之船 2', en: 'Right Angle Cross of the Vessel of Love 2',
      desc: '閘門 15 是接受多元的寬容，閘門 10 是做自己。你的人生主題是無條件接受人的多樣性——包括你自己。真正的愛從不批判。' },
    juxt: { name: '並列交叉之極端', en: 'Juxtaposition Cross of Extremes',
      desc: '你走在極端的軌道上。你的韻律不是一般人的韻律，那是你的超能力。' },
    left: { name: '左角度交叉之預防 2', en: 'Left Angle Cross of Prevention 2',
      desc: '你的包容力幫助群體預防因偏見而產生的衝突。你是多元的守護者。' },
  },

  // === 閘門 16 系列 ===
  '16-9': {
    right: { name: '右角度交叉之計畫 2', en: 'Right Angle Cross of Planning 2',
      desc: '閘門 16 是表達技能的熱情，閘門 9 是深入細節的專注。你的人生主題是把你的技能打磨到閃閃發光——然後自然而然地被看見。' },
    juxt: { name: '並列交叉之實驗', en: 'Juxtaposition Cross of Experimentation',
      desc: '你的軌道就是不斷嘗試和實驗。每次失敗都是在打磨你的技能。' },
    left: { name: '左角度交叉之奉獻 2', en: 'Left Angle Cross of Dedication 2',
      desc: '你的技能和熱情不是為了自己，而是為了服務需要你的人。' },
  },

  // === 閘門 17 系列 ===
  '17-18': {
    right: { name: '右角度交叉之服務', en: 'Right Angle Cross of Service',
      desc: '閘門 17 是意見和觀點，閘門 18 是修正和完善。你的人生主題是看到事情可以更好——然後提出你的見解來改善它。你是天生的改良者。' },
    juxt: { name: '並列交叉之意見', en: 'Juxtaposition Cross of Opinions',
      desc: '你的軌道就是不斷形成和表達意見。不是為了爭論，而是為了改善。' },
    left: { name: '左角度交叉之動盪', en: 'Left Angle Cross of Upheaval',
      desc: '你的修正能力可能會引起動盪——但那是必要的陣痛。舊的不去，新的不來。' },
  },

  // === 閘門 18 系列 ===
  '18-17': {
    right: { name: '右角度交叉之服務 2', en: 'Right Angle Cross of Service 2',
      desc: '閘門 18 是糾正模式的直覺，閘門 17 是邏輯性的觀點。你天生能看到「哪裡不對」，而且你有論述能力來說明為什麼需要改變。' },
    juxt: { name: '並列交叉之修正', en: 'Juxtaposition Cross of Correction',
      desc: '你的固定軌道就是修正。不是吹毛求疵，而是天生的品質控制。' },
    left: { name: '左角度交叉之動盪 2', en: 'Left Angle Cross of Upheaval 2',
      desc: '你的修正能力服務於集體的進化。你挑戰過時的模式，推動更新。' },
  },

  // === 閘門 19 系列 ===
  '19-33': {
    right: { name: '右角度交叉之四方之路', en: 'Right Angle Cross of the Four Ways',
      desc: '閘門 19 是接近和需求，閘門 33 是退隱。你在靠近與退後之間找到生命的節奏。你天生懂得什麼時候該靠近、什麼時候該保持距離。' },
    juxt: { name: '並列交叉之需要', en: 'Juxtaposition Cross of Need',
      desc: '你的軌道圍繞著基本需求——識別它、滿足它、然後前進。' },
    left: { name: '左角度交叉之靈性', en: 'Left Angle Cross of Spirit',
      desc: '你的敏感度服務於靈性的探索。你幫助人們連結更深的需求。' },
  },

  // === 閘門 20 系列 ===
  '20-34': {
    right: { name: '右角度交叉之沉睡的鳳凰', en: 'Right Angle Cross of the Sleeping Phoenix',
      desc: '閘門 20 是當下的覺知，閘門 34 是強大的力量。你就像沉睡中的鳳凰——一旦在正確的時機醒來，你的能量令人震撼。活在當下，是你的超能力。' },
    juxt: { name: '並列交叉之當下', en: 'Juxtaposition Cross of the Now',
      desc: '你的軌道完全存在於當下這一刻。過去和未來對你都不重要。' },
    left: { name: '左角度交叉之對決', en: 'Left Angle Cross of Duality',
      desc: '你的當下覺知服務於幫助人們面對二元對立——做與不做、是與非。' },
  },

  // === 閘門 21 系列 ===
  '21-48': {
    right: { name: '右角度交叉之張力', en: 'Right Angle Cross of Tension',
      desc: '閘門 21 是控制和意志力，閘門 48 是深度。你的人生主題是在控制與深度之間找到平衡。你需要掌控，但也需要深度的理解。' },
    juxt: { name: '並列交叉之控制', en: 'Juxtaposition Cross of Control',
      desc: '你的軌道圍繞著控制——學會在正確的時機施展你的意志力。' },
    left: { name: '左角度交叉之努力', en: 'Left Angle Cross of Endeavor',
      desc: '你的控制力服務於更大的努力。你是推動事情完成的那股力量。' },
  },

  // === 閘門 22 系列 ===
  '22-47': {
    right: { name: '右角度交叉之統領 4', en: 'Right Angle Cross of Rulership 4',
      desc: '閘門 22 是情緒的優雅，閘門 47 是領悟。你的領導力來自情緒智慧——你知道在正確的情緒狀態下，洞見才有力量。' },
    juxt: { name: '並列交叉之恩典', en: 'Juxtaposition Cross of Grace',
      desc: '你的軌道就是恩典。在情緒的波動中保持優雅，這是你天生的禮物。' },
    left: { name: '左角度交叉之告知 4', en: 'Left Angle Cross of Informing 4',
      desc: '你用情緒智慧和領悟來告知他人。你說的話帶著感染力。' },
  },

  // === 閘門 23 系列 ===
  '23-43': {
    right: { name: '右角度交叉之解釋 2', en: 'Right Angle Cross of Explanation 2',
      desc: '閘門 23 是表達洞見，閘門 43 是突破性的內在知道。你天生有獨特的洞見，而且你能把它說出來。挑戰在於等待正確的時機開口。' },
    juxt: { name: '並列交叉之表達', en: 'Juxtaposition Cross of Assimilation',
      desc: '你的軌道是不斷消化和整合內在的洞見，然後找到表達的方式。' },
    left: { name: '左角度交叉之奉獻 4', en: 'Left Angle Cross of Dedication 4',
      desc: '你的獨特洞見服務於集體。你是那個看見新可能性的人。' },
  },

  // === 閘門 24 系列 ===
  '24-44': {
    right: { name: '右角度交叉之四方之路 2', en: 'Right Angle Cross of the Four Ways 2',
      desc: '閘門 24 是回歸和反覆思考，閘門 44 是模式識別。你不斷在回顧中發現模式，這是你找到正確方向的方式。' },
    juxt: { name: '並列交叉之理性化', en: 'Juxtaposition Cross of Rationalization',
      desc: '你的軌道是不斷理性化和消化過去的經驗。每次回顧都帶來新的理解。' },
    left: { name: '左角度交叉之輪迴', en: 'Left Angle Cross of Incarnation',
      desc: '你的反思能力服務於集體的記憶。你幫助人們從過去中學習。' },
  },

  // === 閘門 25 系列 ===
  '25-46': {
    right: { name: '右角度交叉之愛之船 4', en: 'Right Angle Cross of the Vessel of Love 4',
      desc: '閘門 25 是無條件的愛（天真），閘門 46 是對身體的決心。你是最純粹的愛之船——在身體中體驗無條件的愛。你的存在本身就是療癒的。' },
    juxt: { name: '並列交叉之天真', en: 'Juxtaposition Cross of Innocence',
      desc: '你走在天真的軌道上。不是幼稚，而是對生命的全然信任。' },
    left: { name: '左角度交叉之療癒', en: 'Left Angle Cross of Healing',
      desc: '你的無條件接納能療癒他人。你不需要做什麼，存在就夠了。' },
  },

  // === 閘門 26 系列 ===
  '26-45': {
    right: { name: '右角度交叉之統領 3', en: 'Right Angle Cross of Rulership 3',
      desc: '閘門 26 是說服力和行銷天賦，閘門 45 是聚集者。你的領導力來自你的說服能力——你能把人和資源聚在一起。你是天生的「推銷自己理念」的人。' },
    juxt: { name: '並列交叉之詭計', en: 'Juxtaposition Cross of the Trickster',
      desc: '你的軌道是利用策略和說服力。這不是欺騙，而是一種天賦。' },
    left: { name: '左角度交叉之對抗', en: 'Left Angle Cross of Confrontation',
      desc: '你的說服力服務於挑戰不合理的現狀。你敢說別人不敢說的。' },
  },

  // === 閘門 27 系列 ===
  '27-28': {
    right: { name: '右角度交叉之意外', en: 'Right Angle Cross of the Unexpected',
      desc: '閘門 27 是照顧和滋養，閘門 28 是冒險的鬥士。你的人生總是在照顧與冒險之間擺盪。意外是你生命的常態——學會擁抱它。' },
    juxt: { name: '並列交叉之照顧', en: 'Juxtaposition Cross of Caring',
      desc: '你的固定軌道就是照顧。不只照顧人，也照顧你認為值得的事物。' },
    left: { name: '左角度交叉之校準', en: 'Left Angle Cross of Alignment',
      desc: '你的照顧能力幫助群體找到校準——什麼值得投入、什麼該放手。' },
  },

  // === 閘門 28 系列 ===
  '28-27': {
    right: { name: '右角度交叉之意外 2', en: 'Right Angle Cross of the Unexpected 2',
      desc: '閘門 28 是為了找到意義而冒險，閘門 27 是照顧。你是個冒險家，但你的冒險是為了找到值得照顧的事物。「人生值不值得活」是你的核心提問。' },
    juxt: { name: '並列交叉之冒險', en: 'Juxtaposition Cross of Risks',
      desc: '你的軌道就是冒險。不是魯莽，而是對生命意義的不斷追尋。' },
    left: { name: '左角度交叉之校準 2', en: 'Left Angle Cross of Alignment 2',
      desc: '你的冒險精神幫助集體校準——什麼是真正重要的、什麼只是虛幻。' },
  },

  // === 閘門 29 系列 ===
  '29-30': {
    right: { name: '右角度交叉之傳染 4', en: 'Right Angle Cross of Contagion 4',
      desc: '閘門 29 是承諾的力量，閘門 30 是渴望和慾望。你一旦承諾就全力以赴，你的熱情會感染周圍所有人。但記得：不是所有邀請都值得說 Yes。' },
    juxt: { name: '並列交叉之承諾', en: 'Juxtaposition Cross of Commitment',
      desc: '你的軌道就是承諾。你一旦說了「好」，就會燃燒到底。' },
    left: { name: '左角度交叉之動盪 4', en: 'Left Angle Cross of Upheaval 4',
      desc: '你的承諾力服務於集體的改變。你的全力投入可以翻轉整個局勢。' },
  },

  // === 閘門 30 系列 ===
  '30-29': {
    right: { name: '右角度交叉之傳染 3', en: 'Right Angle Cross of Contagion 3',
      desc: '閘門 30 是對新體驗的渴望（慾望的火），閘門 29 是承諾。你渴望體驗一切，而且你有能力全力投入。你的熱情本身就有感染力。' },
    juxt: { name: '並列交叉之命運', en: 'Juxtaposition Cross of Fates',
      desc: '你的軌道是被命運之火驅動。你的渴望不是隨便的，那是你的方向。' },
    left: { name: '左角度交叉之動盪 3', en: 'Left Angle Cross of Upheaval 3',
      desc: '你的慾望之火可以點燃集體的改變。你的渴望帶動其他人行動。' },
  },

  // === 閘門 31 系列 ===
  '31-41': {
    right: { name: '右角度交叉之意外 4', en: 'Right Angle Cross of the Unexpected 4',
      desc: '閘門 31 是影響力和領導（民主領袖），閘門 41 是想像和新開始的壓力。你的影響力來自你對未來的想像——你看到可能性，然後自然地帶領人前進。' },
    juxt: { name: '並列交叉之影響', en: 'Juxtaposition Cross of Influence',
      desc: '你的軌道就是影響他人。你的想法和願景自然地吸引追隨者。' },
    left: { name: '左角度交叉之校準 4', en: 'Left Angle Cross of Alignment 4',
      desc: '你的影響力幫助集體校準方向——用你的想像力引導大家看見更好的未來。' },
  },

  // === 閘門 32 系列 ===
  '32-42': {
    right: { name: '右角度交叉之馬雅', en: 'Right Angle Cross of Maya',
      desc: '閘門 32 是持久性（什麼會持續），閘門 42 是完成和結束。你天生知道什麼值得堅持、什麼該結束。你的直覺能穿透表象（馬雅=幻象）看到本質。' },
    juxt: { name: '並列交叉之持續', en: 'Juxtaposition Cross of Conservation',
      desc: '你的軌道是保存有價值的東西。你是時間的守護者，知道什麼能經得起考驗。' },
    left: { name: '左角度交叉之限制', en: 'Left Angle Cross of Limitation',
      desc: '你幫助集體認識限制——什麼是可行的、什麼只是幻想。務實是你的禮物。' },
  },

  // === 閘門 33 系列 ===
  '33-19': {
    right: { name: '右角度交叉之四方之路 4', en: 'Right Angle Cross of the Four Ways 4',
      desc: '閘門 33 是退隱和反思，閘門 19 是敏感和接近。你在退隱和接近之間找到節奏——有時你需要獨處反思，有時你需要靠近人群。兩者缺一不可。' },
    juxt: { name: '並列交叉之退隱', en: 'Juxtaposition Cross of Retreat',
      desc: '你的軌道包含必要的退隱。你不是逃避，而是為了回來時更有力量。' },
    left: { name: '左角度交叉之精煉', en: 'Left Angle Cross of Refinement',
      desc: '你的反思能力幫助集體精煉——去蕪存菁，留下真正重要的。' },
  },

  // === 閘門 34 系列 ===
  '34-20': {
    right: { name: '右角度交叉之沉睡的鳳凰 2', en: 'Right Angle Cross of the Sleeping Phoenix 2',
      desc: '閘門 34 是純粹的生命力量，閘門 20 是當下的覺知。你有巨大的能量但它只在正確的時刻才該釋放。當你活在當下，你的力量才能正確運作。' },
    juxt: { name: '並列交叉之力量', en: 'Juxtaposition Cross of Power',
      desc: '你的軌道就是純粹的力量表達。你不需要理由，你就是力量本身。' },
    left: { name: '左角度交叉之對決 2', en: 'Left Angle Cross of Duality 2',
      desc: '你的力量服務於幫助他人面對生命的二元性。你的存在是行動的號角。' },
  },

  // === 閘門 35 系列 ===
  '35-5': {
    right: { name: '右角度交叉之意識 2', en: 'Right Angle Cross of Consciousness 2',
      desc: '閘門 35 是追求體驗的冒險家，閘門 5 是等待正確時機。你渴望體驗一切，但你的智慧在於等待——正確的體驗會在正確的時機出現。' },
    juxt: { name: '並列交叉之體驗', en: 'Juxtaposition Cross of Experience',
      desc: '你的軌道就是不斷體驗。不是每個體驗都有「意義」，但每個都是完整的。' },
    left: { name: '左角度交叉之分離 2', en: 'Left Angle Cross of Separation 2',
      desc: '你的體驗幫助他人看到生命的多元面向。你活出了別人不敢活的。' },
  },

  // === 閘門 36 系列 ===
  '36-6': {
    right: { name: '右角度交叉之伊甸園 4', en: 'Right Angle Cross of Eden 4',
      desc: '閘門 36 是情緒的冒險（危機中的成長），閘門 6 是親密的界限。你透過情感的起伏來成長。每次「危機」都是回到伊甸園（內在平靜）的機會。' },
    juxt: { name: '並列交叉之危機', en: 'Juxtaposition Cross of Crisis',
      desc: '你的軌道圍繞著情緒危機。但危機不是災難——它是你轉化的燃料。' },
    left: { name: '左角度交叉之飛機 2', en: 'Left Angle Cross of the Plane 2',
      desc: '你的情緒經驗幫助集體理解——什麼是真正的親密、什麼是保護機制。' },
  },

  // === 閘門 37 系列 ===
  '37-40': {
    right: { name: '右角度交叉之計畫 4', en: 'Right Angle Cross of Planning 4',
      desc: '閘門 37 是家族和社群的友誼，閘門 40 是獨處和界限。你的人生在社群和獨處之間找到平衡——你需要人，但你也需要自己的空間。' },
    juxt: { name: '並列交叉之交易', en: 'Juxtaposition Cross of Bargains',
      desc: '你的軌道圍繞著社群中的交換——付出和接受需要平衡。' },
    left: { name: '左角度交叉之遷移', en: 'Left Angle Cross of Migration',
      desc: '你幫助社群理解健康的界限。你知道什麼時候該團聚、什麼時候該各散。' },
  },

  // === 閘門 38 系列 ===
  '38-39': {
    right: { name: '右角度交叉之張力 2', en: 'Right Angle Cross of Tension 2',
      desc: '閘門 38 是鬥士的能量，閘門 39 是挑釁。你天生就是那個敢挑戰、敢抗爭的人。你的人生充滿張力——但這張力就是你成長的動力。' },
    juxt: { name: '並列交叉之對抗', en: 'Juxtaposition Cross of Opposition',
      desc: '你的軌道就是對抗。不是為了打架，而是為了找到生命真正值得戰鬥的事物。' },
    left: { name: '左角度交叉之個人主義', en: 'Left Angle Cross of Individualism',
      desc: '你的戰鬥精神幫助集體維護個人的獨特性。你為異類發聲。' },
  },

  // === 閘門 39 系列 ===
  '39-38': {
    right: { name: '右角度交叉之張力 3', en: 'Right Angle Cross of Tension 3',
      desc: '閘門 39 是挑釁者，閘門 38 是戰士。你用挑釁來測試——誰是真的在乎、誰只是說說。你的人生主題是透過製造適度的張力來找到真正的連結。' },
    juxt: { name: '並列交叉之挑釁', en: 'Juxtaposition Cross of Provocation',
      desc: '你的軌道就是挑釁——不是惡意的，而是為了激發真實的反應。' },
    left: { name: '左角度交叉之個人主義 2', en: 'Left Angle Cross of Individualism 2',
      desc: '你的挑釁性幫助人們脫離舒適圈。你是進化的催化劑。' },
  },

  // === 閘門 40 系列 ===
  '40-37': {
    right: { name: '右角度交叉之計畫 3', en: 'Right Angle Cross of Planning 3',
      desc: '閘門 40 是休息和獨處的意志力，閘門 37 是社群的溫暖。你需要獨處來充電，然後把能量帶回社群。你是那個「消失一陣子然後帶著禮物回來」的人。' },
    juxt: { name: '並列交叉之否認', en: 'Juxtaposition Cross of Denial',
      desc: '你的軌道包含必要的「說不」。你的界限保護你的能量完整性。' },
    left: { name: '左角度交叉之遷移 2', en: 'Left Angle Cross of Migration 2',
      desc: '你的獨處智慧幫助集體理解——休息不是偷懶，而是可持續的必要。' },
  },

  // === 閘門 41 系列 ===
  '41-31': {
    right: { name: '右角度交叉之意外 3', en: 'Right Angle Cross of the Unexpected 3',
      desc: '閘門 41 是幻想和新開始的壓力，閘門 31 是影響力。你的人生充滿新的開始——每個幻想都可能成為影響他人的起點。意想不到的事是你的日常。' },
    juxt: { name: '並列交叉之幻想', en: 'Juxtaposition Cross of Fantasies',
      desc: '你的軌道被想像力驅動。你的幻想不是白日夢——它們是創造的種子。' },
    left: { name: '左角度交叉之校準 3', en: 'Left Angle Cross of Alignment 3',
      desc: '你的想像力幫助集體校準——什麼是值得追求的新可能性。' },
  },

  // === 閘門 42 系列 ===
  '42-32': {
    right: { name: '右角度交叉之馬雅 2', en: 'Right Angle Cross of Maya 2',
      desc: '閘門 42 是完成的能量，閘門 32 是持久性的直覺。你知道什麼時候一件事該結束、什麼值得長久投入。你能看穿幻象（馬雅），看到事物的真實壽命。' },
    juxt: { name: '並列交叉之完成', en: 'Juxtaposition Cross of Completion',
      desc: '你的軌道就是把事情做完。你不是開始者，你是終結者（最好的那種）。' },
    left: { name: '左角度交叉之限制 2', en: 'Left Angle Cross of Limitation 2',
      desc: '你幫助集體認識什麼該結束了。你的判斷幫助人們不再浪費能量在已死的事物上。' },
  },

  // === 閘門 43 系列 ===
  '43-23': {
    right: { name: '右角度交叉之解釋 4', en: 'Right Angle Cross of Explanation 4',
      desc: '閘門 43 是突破性的內在知道，閘門 23 是簡化和表達。你有「天才」般的洞見——你就是知道答案，即使你解釋不了為什麼。挑戰是等待別人準備好聽。' },
    juxt: { name: '並列交叉之洞見', en: 'Juxtaposition Cross of Insight',
      desc: '你的軌道就是不斷產生突破性的洞見。你是被動的天才——答案自己來找你。' },
    left: { name: '左角度交叉之奉獻 3', en: 'Left Angle Cross of Dedication 3',
      desc: '你的天才洞見服務於集體。正確的時機來臨時，你一句話就能改變一切。' },
  },

  // === 閘門 44 系列 ===
  '44-24': {
    right: { name: '右角度交叉之四方之路 3', en: 'Right Angle Cross of the Four Ways 3',
      desc: '閘門 44 是本能的警覺（過去的模式），閘門 24 是回歸和反覆。你天生能從過去的模式中學習——你的嗅覺告訴你「這次跟上次一樣」或「這次不同」。' },
    juxt: { name: '並列交叉之警覺', en: 'Juxtaposition Cross of Alertness',
      desc: '你的軌道就是保持警覺。你的本能記憶幫助你避開重複的陷阱。' },
    left: { name: '左角度交叉之輪迴 2', en: 'Left Angle Cross of Incarnation 2',
      desc: '你的模式識別能力幫助集體打破重複的循環。你看得見別人看不見的歷史規律。' },
  },

  // === 閘門 45 系列 ===
  '45-26': {
    right: { name: '右角度交叉之統領 2', en: 'Right Angle Cross of Rulership 2',
      desc: '閘門 45 是王者——聚集的力量，閘門 26 是行銷和說服。你天生就是那個「把人聚在一起然後帶領他們」的人。你的存在有一種自然的權威感。' },
    juxt: { name: '並列交叉之擁有', en: 'Juxtaposition Cross of Possession',
      desc: '你的軌道圍繞著資源和所有權。你天生知道什麼是「我的」，而且你有能力守護它。' },
    left: { name: '左角度交叉之對抗 2', en: 'Left Angle Cross of Confrontation 2',
      desc: '你的聚集能力服務於挑戰不公。你為你的「子民」發聲。' },
  },

  // === 閘門 46 系列 ===
  '46-25': {
    right: { name: '右角度交叉之愛之船 3', en: 'Right Angle Cross of the Vessel of Love 3',
      desc: '閘門 46 是對身體的承諾，閘門 25 是純真的愛。你的愛透過身體表達——擁抱、照顧、實際的陪伴。你用行動證明愛，而不是用嘴說。' },
    juxt: { name: '並列交叉之機緣', en: 'Juxtaposition Cross of Serendipity',
      desc: '你的軌道充滿巧合。事情就是會在對的時候出現在對的地方——因為你的身體在對的地方。' },
    left: { name: '左角度交叉之療癒 2', en: 'Left Angle Cross of Healing 2',
      desc: '你的身體存在本身就有療癒的力量。你在場就能讓人感覺好一點。' },
  },

  // === 閘門 48 系列 ===
  '48-21': {
    right: { name: '右角度交叉之張力 4', en: 'Right Angle Cross of Tension 4',
      desc: '閘門 48 是深度和恐懼不足，閘門 21 是控制。你渴望深度但又怕不夠好——這個張力就是你的動力。當你放下控制、信任自己的深度，你就自由了。' },
    juxt: { name: '並列交叉之深度', en: 'Juxtaposition Cross of Depth',
      desc: '你的軌道就是深入。淺嘗輒止不是你的風格——你要不不做，一做就到底。' },
    left: { name: '左角度交叉之努力 2', en: 'Left Angle Cross of Endeavor 2',
      desc: '你的深度服務於集體的努力。你是那個願意潛到最深處把答案帶上來的人。' },
  },

  // === 閘門 49 系列 ===
  '49-4': {
    right: { name: '右角度交叉之解釋 3', en: 'Right Angle Cross of Explanation 3',
      desc: '閘門 49 是革命和原則，閘門 4 是公式化的答案。你對原則有強烈的感受，而且你能邏輯地解釋為什麼某些事必須改變。你是有理論基礎的革命者。' },
    juxt: { name: '並列交叉之原則', en: 'Juxtaposition Cross of Principles',
      desc: '你的軌道圍繞著堅不可摧的原則。你不會妥協你相信的事。' },
    left: { name: '左角度交叉之革命', en: 'Left Angle Cross of Revolution 2',
      desc: '你的原則服務於集體的革命。你是推翻不義的理論家和行動者。' },
  },

  // === 閘門 50 系列 ===
  '50-3': {
    right: { name: '右角度交叉之法則', en: 'Right Angle Cross of Laws',
      desc: '閘門 50 是價值觀和責任，閘門 3 是突變和新開始。你天生就是規則的守護者——但你也知道規則需要進化。你的人生是在傳統和創新之間找到平衡。' },
    juxt: { name: '並列交叉之價值', en: 'Juxtaposition Cross of Values',
      desc: '你的軌道圍繞著價值觀。什麼是對的、什麼是錯的——你有很強的判斷。' },
    left: { name: '左角度交叉之希望 2', en: 'Left Angle Cross of Wishes 2',
      desc: '你的價值觀服務於集體的希望。你守護的不只是規則，而是大家共同的美好願景。' },
  },

  // === 閘門 51 系列 ===
  '51-57': {
    right: { name: '右角度交叉之穿透', en: 'Right Angle Cross of Penetration',
      desc: '閘門 51 是突然的衝擊和勇氣，閘門 57 是直覺的清晰。你天生有穿透力——你的直覺加上勇氣讓你能在一瞬間看穿事物的本質並採取行動。' },
    juxt: { name: '並列交叉之震驚', en: 'Juxtaposition Cross of Shock',
      desc: '你的軌道充滿突然的震撼。每次震動都讓你更清醒、更勇敢。' },
    left: { name: '左角度交叉之號角', en: 'Left Angle Cross of the Clarion',
      desc: '你是號角聲——你的洞察力和勇氣喚醒他人。你的存在是集體的警鐘。' },
  },

  // === 閘門 52-64 系列 ===
  '52-58': {
    right: { name: '右角度交叉之服務 4', en: 'Right Angle Cross of Service 4',
      desc: '閘門 52 是靜止（山），閘門 58 是喜悅和完善。你在靜止中找到完善事物的力量。你不是急躁的改良者，而是沉穩的、充滿喜悅的服務者。' },
    juxt: { name: '並列交叉之靜止', en: 'Juxtaposition Cross of Stillness',
      desc: '你的軌道是靜止。你不需要動——在對的時候，山自然會被看見。' },
    left: { name: '左角度交叉之要求', en: 'Left Angle Cross of Demands',
      desc: '你的靜止力量幫助集體——你用不動如山的穩定性為喧鬧的世界創造支點。' },
  },

  '53-54': {
    right: { name: '右角度交叉之穿透 2', en: 'Right Angle Cross of Penetration 2',
      desc: '閘門 53 是新的開始（起始壓力），閘門 54 是野心和上升。你天生有強大的起始力和野心。你不斷開始新的上升——每次都穿透新的高度。' },
    juxt: { name: '並列交叉之開始', en: 'Juxtaposition Cross of Beginnings',
      desc: '你的軌道就是不斷開始。結束不是你的事——你負責點燃火箭。' },
    left: { name: '左角度交叉之循環', en: 'Left Angle Cross of Cycles',
      desc: '你的起始能量服務於集體的循環更新。你是新時代的點火者。' },
  },

  '54-53': {
    right: { name: '右角度交叉之穿透 3', en: 'Right Angle Cross of Penetration 3',
      desc: '閘門 54 是野心和社會晉升，閘門 53 是新的開始。你天生有向上的動力，而且你知道每次晉升都需要一個全新的開始。' },
    juxt: { name: '並列交叉之野心', en: 'Juxtaposition Cross of Ambition',
      desc: '你的軌道就是向上。不是貪婪，而是天生的「我要更好」。' },
    left: { name: '左角度交叉之循環 2', en: 'Left Angle Cross of Cycles 2',
      desc: '你的野心幫助集體進化。你的向上帶動整個群體提升。' },
  },

  '55-59': {
    right: { name: '右角度交叉之沉睡的鳳凰 4', en: 'Right Angle Cross of the Sleeping Phoenix 4',
      desc: '閘門 55 是情緒的豐盛（精神），閘門 59 是親密和突破界限。你是情緒上的鳳凰——你的精神能量可以突破人與人之間的牆。當你的spirit清醒時，你能創造深刻的連結。' },
    juxt: { name: '並列交叉之心情', en: 'Juxtaposition Cross of Moods',
      desc: '你的軌道被情緒驅動。你的心情不是障礙——它是你創造力的燃料。' },
    left: { name: '左角度交叉之精神', en: 'Left Angle Cross of Spirit',
      desc: '你的情緒豐盛幫助集體連結更深的精神層面。你是靈魂的橋樑。' },
  },

  '56-60': {
    right: { name: '右角度交叉之法則 2', en: 'Right Angle Cross of Laws 2',
      desc: '閘門 56 是故事和刺激（旅行者），閘門 60 是接受限制中的突變。你用故事來打破限制——你的人生主題是在限制中找到自由的敘事。' },
    juxt: { name: '並列交叉之刺激', en: 'Juxtaposition Cross of Stimulation',
      desc: '你的軌道需要不斷的刺激。無聊是你最大的敵人。' },
    left: { name: '左角度交叉之分心', en: 'Left Angle Cross of Distraction',
      desc: '你的故事能力可以分散集體的注意力——有時是療癒的，讓人暫時離開痛苦。' },
  },

  '57-51': {
    right: { name: '右角度交叉之穿透 4', en: 'Right Angle Cross of Penetration 4',
      desc: '閘門 57 是直覺的清晰，閘門 51 是勇氣和衝擊。你的直覺配合勇氣——你是那個在關鍵時刻「就是知道該怎麼做」然後立刻行動的人。' },
    juxt: { name: '並列交叉之直覺', en: 'Juxtaposition Cross of Intuition',
      desc: '你的軌道完全由直覺引導。不需要理由——你的身體比腦袋快。' },
    left: { name: '左角度交叉之號角 2', en: 'Left Angle Cross of the Clarion 2',
      desc: '你的直覺清晰度是集體的號角。在危機時刻，你的一個直覺能救很多人。' },
  },

  '58-52': {
    right: { name: '右角度交叉之服務 3', en: 'Right Angle Cross of Service 3',
      desc: '閘門 58 是活力和完善的喜悅，閘門 52 是山的靜止。你用喜悅的能量來完善事物，同時知道什麼時候該停下來欣賞。你服務的方式是帶著歡樂。' },
    juxt: { name: '並列交叉之活力', en: 'Juxtaposition Cross of Vitality',
      desc: '你的軌道就是充滿活力。你的存在讓周圍的人也感覺更有精神。' },
    left: { name: '左角度交叉之要求 2', en: 'Left Angle Cross of Demands 2',
      desc: '你的活力幫助集體設定更高的標準。你的喜悅是「這還可以更好」的動力。' },
  },

  '59-55': {
    right: { name: '右角度交叉之沉睡的鳳凰 3', en: 'Right Angle Cross of the Sleeping Phoenix 3',
      desc: '閘門 59 是打破界限（生殖力），閘門 55 是情緒的豐盛。你有打破人際界限的天賦——你的情感豐富度讓人願意對你敞開。你是人際連結的催化劑。' },
    juxt: { name: '並列交叉之策略', en: 'Juxtaposition Cross of Strategy',
      desc: '你的軌道是用策略打破限制。你知道如何接近人、如何創造連結。' },
    left: { name: '左角度交叉之精神 2', en: 'Left Angle Cross of Spirit 2',
      desc: '你打破界限的能力服務於集體的精神連結。你幫助人們走出孤立。' },
  },

  '60-56': {
    right: { name: '右角度交叉之法則 3', en: 'Right Angle Cross of Laws 3',
      desc: '閘門 60 是限制中的突變可能，閘門 56 是故事。你在限制中找到突變——當你接受限制，突破才會自然發生。你用故事來表達這個真相。' },
    juxt: { name: '並列交叉之限制', en: 'Juxtaposition Cross of Limitation',
      desc: '你的軌道有明確的限制——但限制不是牢籠，它是你突變的容器。' },
    left: { name: '左角度交叉之分心 2', en: 'Left Angle Cross of Distraction 2',
      desc: '你幫助集體接受限制。你的智慧是：接受才能突破，抗拒只會受苦。' },
  },

  '61-62': {
    right: { name: '右角度交叉之馬雅 4', en: 'Right Angle Cross of Maya 4',
      desc: '閘門 61 是內在真理（神祕），閘門 62 是細節的表達。你內在有不可言說的知道——你的人生是嘗試把那個「就是知道」用文字表達出來。穿透幻象到達真相。' },
    juxt: { name: '並列交叉之思考', en: 'Juxtaposition Cross of Thinking',
      desc: '你的軌道就是思考。不是為了行動，而是為了理解存在本身。' },
    left: { name: '左角度交叉之隱晦', en: 'Left Angle Cross of Obscuration',
      desc: '你的內在真理幫助集體穿透幻象——即使你的表達方式不是人人都聽得懂。' },
  },

  '62-61': {
    right: { name: '右角度交叉之馬雅 3', en: 'Right Angle Cross of Maya 3',
      desc: '閘門 62 是細節和事實，閘門 61 是內在的神祕知道。你用細節和事實來表達那些「說不清楚但就是知道」的真相。你是穿透幻象的務實者。' },
    juxt: { name: '並列交叉之細節', en: 'Juxtaposition Cross of Detail',
      desc: '你的軌道圍繞著細節。上帝在細節裡——你用精確來揭示真相。' },
    left: { name: '左角度交叉之隱晦 2', en: 'Left Angle Cross of Obscuration 2',
      desc: '你用精確的細節幫助集體看穿幻象。你是用數據說真話的人。' },
  },

  '63-64': {
    right: { name: '右角度交叉之意識 4', en: 'Right Angle Cross of Consciousness 4',
      desc: '閘門 63 是懷疑之後的完成，閘門 64 是混亂之前的想像。你永遠在「我覺得還不夠完整」和「但我有好多新想法」之間。這個循環就是意識進化的過程。' },
    juxt: { name: '並列交叉之懷疑', en: 'Juxtaposition Cross of Doubts',
      desc: '你的軌道充滿懷疑——但懷疑不是弱點，它是你追求完整的動力。' },
    left: { name: '左角度交叉之統治', en: 'Left Angle Cross of Dominion',
      desc: '你的懷疑精神幫助集體保持謙遜。你提醒大家：沒有什麼是確定的。' },
  },

  '64-63': {
    right: { name: '右角度交叉之意識 3', en: 'Right Angle Cross of Consciousness 3',
      desc: '閘門 64 是完成前的混亂（太多可能性），閘門 63 是懷疑和邏輯完整。你的腦袋永遠在轉——百萬個可能性加上「到底哪個是對的」。放鬆，答案會在正確的時候浮現。' },
    juxt: { name: '並列交叉之困惑', en: 'Juxtaposition Cross of Confusion',
      desc: '你的軌道充滿混亂和可能性。這不是問題——這是你創造力的源泉。' },
    left: { name: '左角度交叉之統治 2', en: 'Left Angle Cross of Dominion 2',
      desc: '你的混沌思維幫助集體看到更多可能性。你是打破線性思考的人。' },
  },
};

/**
 * 根據四個太陽閘門和 Profile 查找輪迴交叉
 * @param {number} pSunGate - Personality 太陽閘門
 * @param {number} dSunGate - Design 太陽閘門
 * @param {number} pSunLine - Personality 太陽爻（用於判斷角度）
 * @returns {{ name: string, en: string, desc: string, angle: string } | null}
 */
export function getCrossInfo(pSunGate, dSunGate, pSunLine) {
  const key = `${pSunGate}-${dSunGate}`;
  const crossEntry = CROSS_DATA[key];
  
  if (!crossEntry) return null;
  
  // 由 Profile 的 Personality Sun Line 決定角度
  let angleType;
  if (pSunLine <= 3) {
    angleType = 'right';
  } else if (pSunLine === 4) {
    angleType = 'juxt';
  } else {
    angleType = 'left';
  }
  
  const data = crossEntry[angleType];
  if (!data) return null;
  
  const angleZh = angleType === 'right' ? '右角度（個人命運）' 
    : angleType === 'juxt' ? '並列（固定命運）' 
    : '左角度（超個人命運）';
  
  return { ...data, angle: angleZh };
}

/**
 * 取得閘門的對宮
 */
export function getOppositeGate(gate) {
  return GATE_OPPOSITES[gate] || null;
}

/**
 * 產生綜合解讀
 * @param {object} data - 完整的人類圖計算結果
 * @returns {string} 綜合解讀文字
 */
export function generateSynthesis(data) {
  const { typeInfo, strategy, authority, profile, cross,
    definedChannels, definedCenters, openCenters } = data;
  
  const pSun = data.personalityPlanets[0];
  const dSun = data.designPlanets[0];
  
  // 取得交叉資訊
  const crossInfo = getCrossInfo(pSun.gate, dSun.gate, pSun.line);
  const crossName = crossInfo ? crossInfo.name : `閘門 ${pSun.gate} 的交叉`;
  
  // 組合綜合解讀
  let synthesis = '';
  
  // 第一段：你是誰
  synthesis += `你是一位 <b>${typeInfo.zh}</b>，Profile <b>${profile.profile} ${profile.zh}</b>。`;
  synthesis += `你的人生目的方向是「<b>${crossName}</b>」。`;
  
  // 第二段：如何運作
  synthesis += `<br><br>`;
  synthesis += `作為${typeInfo.zh}，你的策略是「${strategy.zh}」——${strategy.desc.split('。')[0]}。`;
  synthesis += `做決定時，信任你的「${authority.zh}」——${authority.desc.split('。')[0]}。`;
  
  // 第三段：Profile 解讀
  synthesis += `<br><br>`;
  synthesis += `你的 ${profile.profile} ${profile.zh}意味著：${profile.desc}`;
  
  // 第四段：交叉深度（如果有資料）
  if (crossInfo) {
    synthesis += `<br><br>`;
    synthesis += `<b>關於你的輪迴交叉：</b>${crossInfo.desc}`;
  }
  
  // 第五段：通道能量
  if (definedChannels.length > 0) {
    synthesis += `<br><br>`;
    synthesis += `<b>你的能量通道：</b>你有 ${definedChannels.length} 條定義的通道，`;
    synthesis += `定義了 ${definedCenters.length} 個能量中心。`;
    const channelNames = definedChannels.slice(0, 3).map(ch => ch.name || `${ch.gates[0]}-${ch.gates[1]}`);
    if (channelNames.length > 0) {
      synthesis += `其中包括${channelNames.join('、')}`;
      if (definedChannels.length > 3) synthesis += `等`;
      synthesis += `。`;
    }
    synthesis += `這些固定的能量是你最可靠的天賦——不受環境影響、不需要別人給你。`;
  }
  
  // 第六段：開放中心的智慧
  if (openCenters.length > 0) {
    const CENTERS_ZH = {
      head: '頭腦', ajna: '邏輯', throat: '喉嚨', g: '方向/自我',
      heart: '意志力', solar: '情緒', sacral: '薦骨', spleen: '直覺', root: '壓力'
    };
    const openNames = openCenters.slice(0, 3).map(c => CENTERS_ZH[c] || c);
    synthesis += `<br><br>`;
    synthesis += `<b>你的智慧學校：</b>開放的${openNames.join('、')}中心`;
    if (openCenters.length > 3) synthesis += `等 ${openCenters.length} 個中心`;
    synthesis += `是你學習智慧的地方。這些地方你會放大別人的能量——這不是你的弱點，而是你最能感受和理解他人的地方。只是記得：那些放大的能量不是「你的」，不需要被它們驅動做決定。`;
  }
  
  return synthesis;
}
