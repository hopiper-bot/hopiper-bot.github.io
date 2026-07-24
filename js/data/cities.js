/**
 * cities.js — 城市經緯度與時區資料庫
 * 格式: { zh: 中文名, en: 英文名, lat: 緯度, lng: 經度, tz: UTC offset (hours) }
 */

export const CITIES = [
  // === 台灣 ===
  { zh: "台北", en: "Taipei", lat: 25.033, lng: 121.565, tz: 8 },
  { zh: "新北", en: "New Taipei", lat: 25.012, lng: 121.465, tz: 8 },
  { zh: "桃園", en: "Taoyuan", lat: 24.994, lng: 121.297, tz: 8 },
  { zh: "台中", en: "Taichung", lat: 24.148, lng: 120.674, tz: 8 },
  { zh: "台南", en: "Tainan", lat: 22.999, lng: 120.227, tz: 8 },
  { zh: "高雄", en: "Kaohsiung", lat: 22.627, lng: 120.301, tz: 8 },
  { zh: "基隆", en: "Keelung", lat: 25.128, lng: 121.739, tz: 8 },
  { zh: "新竹", en: "Hsinchu", lat: 24.804, lng: 120.972, tz: 8 },
  { zh: "苗栗", en: "Miaoli", lat: 24.560, lng: 120.821, tz: 8 },
  { zh: "彰化", en: "Changhua", lat: 24.072, lng: 120.536, tz: 8 },
  { zh: "南投", en: "Nantou", lat: 23.906, lng: 120.684, tz: 8 },
  { zh: "雲林", en: "Yunlin", lat: 23.709, lng: 120.432, tz: 8 },
  { zh: "嘉義", en: "Chiayi", lat: 23.480, lng: 120.449, tz: 8 },
  { zh: "屏東", en: "Pingtung", lat: 22.672, lng: 120.487, tz: 8 },
  { zh: "宜蘭", en: "Yilan", lat: 24.752, lng: 121.753, tz: 8 },
  { zh: "花蓮", en: "Hualien", lat: 23.992, lng: 121.601, tz: 8 },
  { zh: "台東", en: "Taitung", lat: 22.755, lng: 121.150, tz: 8 },
  { zh: "澎湖", en: "Penghu", lat: 23.571, lng: 119.579, tz: 8 },
  { zh: "金門", en: "Kinmen", lat: 24.449, lng: 118.377, tz: 8 },
  { zh: "馬祖", en: "Matsu", lat: 26.160, lng: 119.950, tz: 8 },

  // === 中國大陸主要城市 ===
  { zh: "北京", en: "Beijing", lat: 39.904, lng: 116.407, tz: 8 },
  { zh: "上海", en: "Shanghai", lat: 31.230, lng: 121.474, tz: 8 },
  { zh: "廣州", en: "Guangzhou", lat: 23.129, lng: 113.264, tz: 8 },
  { zh: "深圳", en: "Shenzhen", lat: 22.543, lng: 114.058, tz: 8 },
  { zh: "成都", en: "Chengdu", lat: 30.573, lng: 104.066, tz: 8 },
  { zh: "重慶", en: "Chongqing", lat: 29.563, lng: 106.552, tz: 8 },
  { zh: "武漢", en: "Wuhan", lat: 30.593, lng: 114.305, tz: 8 },
  { zh: "杭州", en: "Hangzhou", lat: 30.274, lng: 120.155, tz: 8 },
  { zh: "南京", en: "Nanjing", lat: 32.061, lng: 118.797, tz: 8 },
  { zh: "西安", en: "Xian", lat: 34.264, lng: 108.943, tz: 8 },
  { zh: "天津", en: "Tianjin", lat: 39.084, lng: 117.200, tz: 8 },
  { zh: "蘇州", en: "Suzhou", lat: 31.299, lng: 120.585, tz: 8 },
  { zh: "福州", en: "Fuzhou", lat: 26.075, lng: 119.306, tz: 8 },
  { zh: "廈門", en: "Xiamen", lat: 24.480, lng: 118.089, tz: 8 },
  { zh: "昆明", en: "Kunming", lat: 25.042, lng: 102.712, tz: 8 },
  { zh: "長沙", en: "Changsha", lat: 28.228, lng: 112.939, tz: 8 },
  { zh: "哈爾濱", en: "Harbin", lat: 45.803, lng: 126.535, tz: 8 },
  { zh: "瀋陽", en: "Shenyang", lat: 41.805, lng: 123.432, tz: 8 },
  { zh: "大連", en: "Dalian", lat: 38.914, lng: 121.615, tz: 8 },
  { zh: "青島", en: "Qingdao", lat: 36.067, lng: 120.383, tz: 8 },

  // === 香港、澳門 ===
  { zh: "香港", en: "Hong Kong", lat: 22.320, lng: 114.170, tz: 8 },
  { zh: "澳門", en: "Macau", lat: 22.199, lng: 113.544, tz: 8 },

  // === 日本 ===
  { zh: "東京", en: "Tokyo", lat: 35.682, lng: 139.759, tz: 9 },
  { zh: "大阪", en: "Osaka", lat: 34.694, lng: 135.502, tz: 9 },
  { zh: "京都", en: "Kyoto", lat: 35.012, lng: 135.768, tz: 9 },
  { zh: "名古屋", en: "Nagoya", lat: 35.181, lng: 136.907, tz: 9 },
  { zh: "福岡", en: "Fukuoka", lat: 33.590, lng: 130.402, tz: 9 },
  { zh: "札幌", en: "Sapporo", lat: 43.062, lng: 141.354, tz: 9 },
  { zh: "沖繩", en: "Okinawa", lat: 26.335, lng: 127.801, tz: 9 },

  // === 韓國 ===
  { zh: "首爾", en: "Seoul", lat: 37.567, lng: 126.978, tz: 9 },
  { zh: "釜山", en: "Busan", lat: 35.180, lng: 129.076, tz: 9 },

  // === 東南亞 ===
  { zh: "新加坡", en: "Singapore", lat: 1.352, lng: 103.820, tz: 8 },
  { zh: "曼谷", en: "Bangkok", lat: 13.756, lng: 100.502, tz: 7 },
  { zh: "吉隆坡", en: "Kuala Lumpur", lat: 3.139, lng: 101.687, tz: 8 },
  { zh: "馬尼拉", en: "Manila", lat: 14.600, lng: 120.984, tz: 8 },
  { zh: "雅加達", en: "Jakarta", lat: -6.175, lng: 106.846, tz: 7 },
  { zh: "河內", en: "Hanoi", lat: 21.029, lng: 105.852, tz: 7 },
  { zh: "胡志明市", en: "Ho Chi Minh", lat: 10.823, lng: 106.630, tz: 7 },
  { zh: "仰光", en: "Yangon", lat: 16.866, lng: 96.196, tz: 6.5 },
  { zh: "金邊", en: "Phnom Penh", lat: 11.557, lng: 104.917, tz: 7 },
  { zh: "峇里島", en: "Bali", lat: -8.340, lng: 115.092, tz: 8 },

  // === 南亞 ===
  { zh: "新德里", en: "New Delhi", lat: 28.614, lng: 77.209, tz: 5.5 },
  { zh: "孟買", en: "Mumbai", lat: 19.076, lng: 72.878, tz: 5.5 },
  { zh: "可倫坡", en: "Colombo", lat: 6.927, lng: 79.861, tz: 5.5 },

  // === 中東 ===
  { zh: "杜拜", en: "Dubai", lat: 25.205, lng: 55.271, tz: 4 },
  { zh: "伊斯坦堡", en: "Istanbul", lat: 41.009, lng: 28.978, tz: 3 },

  // === 大洋洲 ===
  { zh: "雪梨", en: "Sydney", lat: -33.869, lng: 151.209, tz: 10 },
  { zh: "墨爾本", en: "Melbourne", lat: -37.814, lng: 144.963, tz: 10 },
  { zh: "布里斯本", en: "Brisbane", lat: -27.470, lng: 153.021, tz: 10 },
  { zh: "奧克蘭", en: "Auckland", lat: -36.849, lng: 174.764, tz: 12 },

  // === 歐洲 ===
  { zh: "倫敦", en: "London", lat: 51.507, lng: -0.128, tz: 0 },
  { zh: "巴黎", en: "Paris", lat: 48.857, lng: 2.352, tz: 1 },
  { zh: "柏林", en: "Berlin", lat: 52.520, lng: 13.405, tz: 1 },
  { zh: "羅馬", en: "Rome", lat: 41.902, lng: 12.496, tz: 1 },
  { zh: "馬德里", en: "Madrid", lat: 40.417, lng: -3.704, tz: 1 },
  { zh: "阿姆斯特丹", en: "Amsterdam", lat: 52.370, lng: 4.895, tz: 1 },
  { zh: "維也納", en: "Vienna", lat: 48.209, lng: 16.372, tz: 1 },
  { zh: "蘇黎世", en: "Zurich", lat: 47.377, lng: 8.542, tz: 1 },
  { zh: "莫斯科", en: "Moscow", lat: 55.756, lng: 37.617, tz: 3 },
  { zh: "斯德哥爾摩", en: "Stockholm", lat: 59.329, lng: 18.069, tz: 1 },
  { zh: "哥本哈根", en: "Copenhagen", lat: 55.676, lng: 12.568, tz: 1 },
  { zh: "赫爾辛基", en: "Helsinki", lat: 60.170, lng: 24.941, tz: 2 },
  { zh: "華沙", en: "Warsaw", lat: 52.230, lng: 21.012, tz: 1 },
  { zh: "布拉格", en: "Prague", lat: 50.076, lng: 14.438, tz: 1 },
  { zh: "布達佩斯", en: "Budapest", lat: 47.498, lng: 19.040, tz: 1 },
  { zh: "里斯本", en: "Lisbon", lat: 38.722, lng: -9.139, tz: 0 },
  { zh: "雅典", en: "Athens", lat: 37.984, lng: 23.728, tz: 2 },
  { zh: "都柏林", en: "Dublin", lat: 53.350, lng: -6.260, tz: 0 },
  { zh: "巴塞隆納", en: "Barcelona", lat: 41.389, lng: 2.159, tz: 1 },
  { zh: "米蘭", en: "Milan", lat: 45.464, lng: 9.190, tz: 1 },
  { zh: "慕尼黑", en: "Munich", lat: 48.135, lng: 11.582, tz: 1 },

  // === 北美 ===
  { zh: "紐約", en: "New York", lat: 40.713, lng: -74.006, tz: -5 },
  { zh: "洛杉磯", en: "Los Angeles", lat: 34.052, lng: -118.244, tz: -8 },
  { zh: "舊金山", en: "San Francisco", lat: 37.775, lng: -122.419, tz: -8 },
  { zh: "芝加哥", en: "Chicago", lat: 41.878, lng: -87.630, tz: -6 },
  { zh: "華盛頓", en: "Washington DC", lat: 38.907, lng: -77.037, tz: -5 },
  { zh: "西雅圖", en: "Seattle", lat: 47.606, lng: -122.332, tz: -8 },
  { zh: "波士頓", en: "Boston", lat: 42.360, lng: -71.059, tz: -5 },
  { zh: "多倫多", en: "Toronto", lat: 43.653, lng: -79.383, tz: -5 },
  { zh: "溫哥華", en: "Vancouver", lat: 49.283, lng: -123.121, tz: -8 },
  { zh: "蒙特婁", en: "Montreal", lat: 45.502, lng: -73.567, tz: -5 },

  // === 南美 ===
  { zh: "聖保羅", en: "Sao Paulo", lat: -23.551, lng: -46.634, tz: -3 },
  { zh: "布宜諾斯艾利斯", en: "Buenos Aires", lat: -34.604, lng: -58.382, tz: -3 },
  { zh: "墨西哥城", en: "Mexico City", lat: 19.432, lng: -99.133, tz: -6 },

  // === 非洲 ===
  { zh: "開羅", en: "Cairo", lat: 30.044, lng: 31.236, tz: 2 },
  { zh: "約翰尼斯堡", en: "Johannesburg", lat: -26.205, lng: 28.050, tz: 2 },
  { zh: "奈洛比", en: "Nairobi", lat: -1.286, lng: 36.817, tz: 3 },
];
