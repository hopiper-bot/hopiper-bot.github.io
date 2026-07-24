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

  // 部分匹配
  for (const city of CITIES) {
    if (city.zh.includes(name) || city.en.toLowerCase().includes(normalized)) {
      return { lat: city.lat, lng: city.lng, utcOffset: city.tz };
    }
  }

  return null;
}
