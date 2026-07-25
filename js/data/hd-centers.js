/**
 * hd-centers.js — 人類圖九大能量中心定義
 * 
 * 每個中心包含：
 * - 所屬閘門列表
 * - 中心定義/未定義的含義
 * - 對應主題
 */

/**
 * 九大能量中心
 * gates: 屬於此中心的閘門
 * theme: 中心主題
 * defined: 定義時的含義
 * open: 未定義（開放）時的含義
 * bio: 對應的生理系統
 */
export const CENTERS = {
  head: {
    zh: '頭腦中心',
    gates: [61, 63, 64],
    theme: '靈感與壓力',
    bio: '松果體',
    defined: '有固定的靈感來源和思考壓力模式，容易陷入自己的思維迴路。你天生會產生靈感和問題。',
    open: '你接收來自各方的靈感和問題。不要被「必須想出答案」的壓力驅動。問自己：這個問題真的重要嗎？',
    notSelf: '試圖回答所有問題、被不屬於自己的靈感壓力驅動',
  },
  ajna: {
    zh: '邏輯中心',
    gates: [4, 11, 17, 24, 43, 47],
    theme: '思考與概念化',
    bio: '腦下垂體前葉',
    defined: '有固定的思考方式和資訊處理模式。你的心智以特定方式運作，信任它。',
    open: '你能從多元角度看事情，不被單一觀點綁住。但容易假裝確定自己不確定的事。問：我真的確定嗎？',
    notSelf: '假裝對所有事都有確定的看法',
  },
  throat: {
    zh: '喉嚨中心',
    gates: [8, 12, 16, 20, 23, 31, 33, 35, 45, 56, 62],
    theme: '表達與行動化',
    bio: '甲狀腺/副甲狀腺',
    defined: '有固定的表達方式和說話風格。你知道該如何表達，你的聲音有辨識度。',
    open: '你的表達方式多變，會反映當下環境。不要為了被注意而亂說話。等待被邀請或有回應時再表達。',
    notSelf: '為了引起注意而不停說話',
  },
  g: {
    zh: 'G 中心（自我中心）',
    gates: [1, 2, 7, 10, 13, 15, 25, 46],
    theme: '身份、方向與愛',
    bio: '肝臟/血液',
    defined: '有穩固的自我認同和人生方向感。你知道自己是誰。',
    open: '你的身份認同是流動的，能適應不同環境。不要執著於固定的自我形象。去對的地方，方向自然浮現。',
    notSelf: '不斷尋找固定的身份認同和人生方向',
  },
  heart: {
    zh: '意志力中心（心臟中心）',
    gates: [21, 26, 40, 51],
    theme: '意志力、自我價值與物質世界',
    bio: '心臟/胃/膽囊/胸腺',
    defined: '有穩定的意志力和自我價值感。能做出承諾並完成。適合在物質世界打拼。',
    open: '你的意志力是波動的。不要過度承諾或試圖證明自己的價值。你的價值不需要被證明。',
    notSelf: '過度承諾、不斷試圖證明自己的價值',
  },
  solar: {
    zh: '情緒中心（太陽神經叢）',
    gates: [6, 22, 30, 36, 37, 49, 55],
    theme: '情緒、感受與情緒波',
    bio: '腎臟/前列腺/胰臟/神經系統',
    defined: '你有情緒波，情感會經歷高低起伏。這是正常的！重大決定不在情緒高峰或低谷時做。等待情緒波歸零再行動。',
    open: '你能感受到他人的情緒，甚至放大它。不要為了避免衝突而壓抑真實感受。問：這是我的情緒還是別人的？',
    notSelf: '逃避真相和衝突、將他人情緒誤認為自己的',
  },
  sacral: {
    zh: '薦骨中心',
    gates: [3, 5, 9, 14, 27, 29, 34, 42, 59],
    theme: '生命力、工作力與性能量',
    bio: '卵巢/睾丸',
    defined: '你有持續可再生的生命能量。回應讓你興奮的事，「嗯哼」就去做。你天生為了使用能量而存在。',
    open: '你不擁有自己穩定的能量來源。你會放大周圍的薦骨能量。知道何時該停下休息。問：我知道什麼時候夠了嗎？',
    notSelf: '不知道何時停下來、過度工作',
  },
  spleen: {
    zh: '直覺中心（脾中心）',
    gates: [18, 28, 32, 44, 48, 50, 57],
    theme: '直覺、健康、安全感與時間',
    bio: '脾臟/淋巴系統',
    defined: '你有穩定的直覺判斷力和生存本能。第一感覺通常是對的，信任它。',
    open: '你會放大恐懼，容易執著於不健康的人事物因為「感覺很好」。學會分辨真正的危險和放大的恐懼。',
    notSelf: '執著於不健康的事物、忽略身體的信號',
  },
  root: {
    zh: '根部中心',
    gates: [19, 38, 39, 41, 52, 53, 54, 58, 60],
    theme: '壓力、腎上腺素與驅動力',
    bio: '腎上腺',
    defined: '你以自己的節奏處理壓力和驅動力。有時壓力激勵你行動，有時讓你靜止。信任自己的節奏。',
    open: '你會被外在壓力驅動。不要在壓力下草率行動。問：這件事真的急嗎？我的時間表是什麼？',
    notSelf: '總是趕著把事情做完、被壓力驅動',
  },
};

/**
 * 判定哪些中心被定義
 * @param {object[]} definedChannels - 已定義的通道列表
 * @returns {Set<string>} 被定義的中心名稱集合
 */
export function getDefinedCenters(definedChannels) {
  const defined = new Set();
  for (const ch of definedChannels) {
    defined.add(ch.centers[0]);
    defined.add(ch.centers[1]);
  }
  return defined;
}

/**
 * 判斷能量中心之間的連接性（用於分裂定義）
 * @param {object[]} definedChannels - 已定義的通道
 * @returns {number} 定義區塊數量（1=單一定義, 2=二分, 3=三分, 0=無定義）
 */
export function getDefinitionType(definedChannels) {
  if (definedChannels.length === 0) return 0;

  // 建立中心之間的鄰接關係
  const adj = {};
  for (const ch of definedChannels) {
    const [c1, c2] = ch.centers;
    if (!adj[c1]) adj[c1] = new Set();
    if (!adj[c2]) adj[c2] = new Set();
    adj[c1].add(c2);
    adj[c2].add(c1);
  }

  // BFS 計算連通分量
  const visited = new Set();
  let components = 0;
  const centers = Object.keys(adj);

  for (const start of centers) {
    if (visited.has(start)) continue;
    components++;
    const queue = [start];
    while (queue.length > 0) {
      const node = queue.shift();
      if (visited.has(node)) continue;
      visited.add(node);
      for (const neighbor of (adj[node] || [])) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }
  }

  return components;
}
