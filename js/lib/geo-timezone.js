/**
 * geo-timezone.js — 城市名稱→經緯度→UTC offset 查詢
 * 內建 200+ 城市資料（亞太為主 + 世界主要城市）
 * Placeholder: Task 2 會擴充完整資料
 */

import { CITIES } from '../data/cities.js';

/**
 * 解析城市名稱，回傳經緯度和 UTC offset
 * @param {string} name - 城市名稱（中文或英文）
 * @returns {{ lat: number, lng: number, utcOffset: number } | null}
 */
export function resolveCity(name) {
  if (!name) return null;

  const normalized = name.trim().toLowerCase();

  // 完全匹配
  for (const city of CITIES) {
    if (city.zh === name || city.en.toLowerCase() === normalized) {
      return { lat: city.lat, lng: city.lng, utcOffset: city.tz };
    }
  }

  // 部分匹配（雙向：資料庫包含輸入，或輸入包含資料庫）
  for (const city of CITIES) {
    if (city.zh.includes(name) || name.includes(city.zh) ||
        city.en.toLowerCase().includes(normalized) || normalized.includes(city.en.toLowerCase())) {
      return { lat: city.lat, lng: city.lng, utcOffset: city.tz };
    }
  }

  // 去除常見後綴再試（市、縣、區、鎮、鄉）
  const stripped = name.replace(/[市縣區鎮鄉]$/g, '');
  if (stripped && stripped !== name) {
    for (const city of CITIES) {
      if (city.zh === stripped || city.zh.includes(stripped) || stripped.includes(city.zh)) {
        return { lat: city.lat, lng: city.lng, utcOffset: city.tz };
      }
    }
  }

  return null;
}
