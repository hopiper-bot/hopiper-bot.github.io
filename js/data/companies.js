/**
 * companies.js — 預設公司資料庫
 * 格式：{ id, name, year, month, day, logo, industry }
 * logo = LOGO 主色（對應 COLOR_ELEMENT key）
 * industry = 產業（對應 INDUSTRY_ELEMENT key）
 */

export const COMPANIES = [
  // === 台灣電子製造 / 代工 ===
  { id:'inventec', name:'英業達', year:1975, month:8, day:1, logo:'紅色', industry:'電子製造' },
  { id:'foxconn', name:'鴻海', year:1974, month:2, day:20, logo:'藍色', industry:'電子製造' },
  { id:'quanta', name:'廣達', year:1988, month:5, day:9, logo:'藍色', industry:'電子製造' },
  { id:'compal', name:'仁寶', year:1984, month:6, day:1, logo:'藍色', industry:'電子製造' },
  { id:'pegatron', name:'和碩', year:2008, month:1, day:1, logo:'藍色', industry:'電子製造' },
  { id:'wistron', name:'緯創', year:2001, month:7, day:1, logo:'藍色', industry:'電子製造' },
  { id:'liteon', name:'光寶科', year:1975, month:6, day:6, logo:'綠色', industry:'電子製造' },
  { id:'delta', name:'台達電', year:1971, month:4, day:1, logo:'紅色', industry:'電子製造' },
  { id:'mic', name:'英華達', year:2000, month:10, day:1, logo:'藍色', industry:'電子製造' },
