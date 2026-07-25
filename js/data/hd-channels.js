/**
 * hd-channels.js — 人類圖 36 條通道定義
 * 
 * 每條通道連接兩個能量中心，由兩個閘門組成。
 * 當出生盤中兩個閘門都被啟動（不論是 Personality 或 Design），
 * 該通道即為「定義」，連接的兩個中心也因此被「定義」。
 */

/**
 * 通道定義
 * gates: [閘門A, 閘門B]
 * centers: [中心A, 中心B]
 * name: 通道名稱
 * keyword: 關鍵字
 * type: 通道類型 (generating, projecting, manifesting)
 */
export const CHANNELS = [
  // Head ↔ Ajna (3)
  { gates: [64, 47], centers: ['head', 'ajna'], name: '抽象思維', keyword: '思緒紛飛中找到意義', type: 'projecting' },
  { gates: [61, 24], centers: ['head', 'ajna'], name: '覺察', keyword: '從內在真理中獲得洞見', type: 'projecting' },
  { gates: [63, 4],  centers: ['head', 'ajna'], name: '邏輯', keyword: '透過質疑找到公式', type: 'projecting' },

  // Ajna ↔ Throat (3)
  { gates: [17, 62], centers: ['ajna', 'throat'], name: '接受', keyword: '組織性的思考表達', type: 'projecting' },
  { gates: [43, 23], centers: ['ajna', 'throat'], name: '架構', keyword: '個體洞見的表達', type: 'projecting' },
  { gates: [11, 56], centers: ['ajna', 'throat'], name: '好奇心', keyword: '想法的分享', type: 'projecting' },

  // Throat ↔ G Center (3)
  { gates: [31, 7],  centers: ['throat', 'g'], name: '創始者', keyword: '民主式領導', type: 'projecting' },
  { gates: [8, 1],   centers: ['throat', 'g'], name: '啟發', keyword: '創意的角色典範', type: 'projecting' },
  { gates: [33, 13], centers: ['throat', 'g'], name: '浪子', keyword: '見證者的回憶', type: 'projecting' },
  { gates: [20, 10], centers: ['throat', 'g'], name: '覺醒', keyword: '活在當下的承諾', type: 'projecting' },

  // Throat ↔ Heart/Will (1)
  { gates: [45, 21], centers: ['throat', 'heart'], name: '金錢線', keyword: '物質主義者', type: 'manifesting' },

  // Throat ↔ Solar Plexus (2)
  { gates: [12, 22], centers: ['throat', 'solar'], name: '開放', keyword: '社交人', type: 'manifesting' },
  { gates: [35, 36], centers: ['throat', 'solar'], name: '無常', keyword: '萬事通', type: 'manifesting' },

  // Throat ↔ Sacral (1)
  { gates: [20, 34], centers: ['throat', 'sacral'], name: '魅力', keyword: '即知即行的忙碌', type: 'manifesting' },

  // Throat ↔ Spleen (2)
  { gates: [57, 20], centers: ['throat', 'spleen'], name: '腦波', keyword: '當下的覺知', type: 'projecting' },
  { gates: [48, 16], centers: ['throat', 'spleen'], name: '才華', keyword: '深度的技能表達', type: 'projecting' },

  // G Center ↔ Sacral (4)
  { gates: [46, 29], centers: ['g', 'sacral'], name: '發現', keyword: '成功的決心', type: 'generating' },
  { gates: [10, 34], centers: ['g', 'sacral'], name: '探索', keyword: '遵循信念的行為', type: 'generating' },
  { gates: [15, 5],  centers: ['g', 'sacral'], name: '韻律', keyword: '固定模式', type: 'generating' },
  { gates: [2, 14],  centers: ['g', 'sacral'], name: '脈動', keyword: '掌握方向的鑰匙', type: 'generating' },

  // Heart/Will ↔ G Center (1)
  { gates: [25, 51], centers: ['g', 'heart'], name: '發起', keyword: '需要先震撼才能創新', type: 'manifesting' },

  // Heart/Will ↔ Spleen (1)
  { gates: [26, 44], centers: ['heart', 'spleen'], name: '投降', keyword: '傳遞者', type: 'projecting' },

  // Heart/Will ↔ Solar Plexus (1)
  { gates: [40, 37], centers: ['heart', 'solar'], name: '社群', keyword: '交易（付出與回報）', type: 'manifesting' },

  // Sacral ↔ Spleen (2)
  { gates: [50, 27], centers: ['spleen', 'sacral'], name: '保存', keyword: '監護人', type: 'generating' },
  { gates: [57, 34], centers: ['spleen', 'sacral'], name: '力量原型', keyword: '直覺性的力量', type: 'generating' },

  // Sacral ↔ Solar Plexus (1)
  { gates: [59, 6],  centers: ['sacral', 'solar'], name: '親密', keyword: '聚焦於生育', type: 'generating' },

  // Sacral ↔ Root (3)
  { gates: [3, 60],  centers: ['sacral', 'root'], name: '突變', keyword: '脈搏（能量的開關）', type: 'generating' },
  { gates: [42, 53], centers: ['sacral', 'root'], name: '成熟', keyword: '循環（開始到完成）', type: 'generating' },
  { gates: [9, 52],  centers: ['sacral', 'root'], name: '專注', keyword: '決心的專注', type: 'generating' },

  // Spleen ↔ Root (3)
  { gates: [28, 38], centers: ['spleen', 'root'], name: '掙扎', keyword: '固執', type: 'projecting' },
  { gates: [18, 58], centers: ['spleen', 'root'], name: '批判', keyword: '不知足', type: 'projecting' },
  { gates: [32, 54], centers: ['spleen', 'root'], name: '蛻變', keyword: '驅動力', type: 'projecting' },

  // Solar Plexus ↔ Root (3)
  { gates: [49, 19], centers: ['solar', 'root'], name: '綜合', keyword: '敏感的人', type: 'manifesting' },
  { gates: [55, 39], centers: ['solar', 'root'], name: '情緒', keyword: '多愁善感', type: 'manifesting' },
  { gates: [30, 41], centers: ['solar', 'root'], name: '辨認', keyword: '夢想家', type: 'manifesting' },
];

/**
 * 查找兩個閘門是否形成通道
 * @param {number} gate1 
 * @param {number} gate2 
 * @returns {object|null} 通道定義或 null
 */
export function findChannel(gate1, gate2) {
  return CHANNELS.find(ch => 
    (ch.gates[0] === gate1 && ch.gates[1] === gate2) ||
    (ch.gates[0] === gate2 && ch.gates[1] === gate1)
  ) || null;
}

/**
 * 從啟動的閘門清單找出所有定義的通道
 * @param {number[]} activatedGates - 所有啟動的閘門編號
 * @returns {object[]} 已定義的通道列表
 */
export function findDefinedChannels(activatedGates) {
  const gateSet = new Set(activatedGates);
  return CHANNELS.filter(ch => gateSet.has(ch.gates[0]) && gateSet.has(ch.gates[1]));
}
