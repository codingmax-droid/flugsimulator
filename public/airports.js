// ============================================================
// WELTWEITE FLUGHAFEN-DATENBANK
// Echte ICAO/IATA Codes, Koordinaten, Elevation, Runways
// ============================================================

export const AIRPORTS = [
  // ==================== DEUTSCHLAND ====================
  { icao:'EDDF', iata:'FRA', name:'Frankfurt am Main', city:'Frankfurt', country:'DE', lat:50.0333, lon:8.5706, elev:111, rwy:[{hdg:70,len:4000,wid:60},{hdg:250,len:4000,wid:60},{hdg:180,len:4000,wid:45}] },
  { icao:'EDDM', iata:'MUC', name:'München Franz Josef Strauß', city:'München', country:'DE', lat:48.3538, lon:11.7861, elev:453, rwy:[{hdg:80,len:4000,wid:60},{hdg:260,len:4000,wid:60}] },
  { icao:'EDDB', iata:'BER', name:'Berlin Brandenburg', city:'Berlin', country:'DE', lat:52.3667, lon:13.5033, elev:48, rwy:[{hdg:70,len:3600,wid:45},{hdg:250,len:4000,wid:45}] },
  { icao:'EDDL', iata:'DUS', name:'Düsseldorf', city:'Düsseldorf', country:'DE', lat:51.2895, lon:6.7668, elev:45, rwy:[{hdg:50,len:3000,wid:45},{hdg:230,len:2700,wid:45}] },
  { icao:'EDDH', iata:'HAM', name:'Hamburg', city:'Hamburg', country:'DE', lat:53.6304, lon:9.9882, elev:16, rwy:[{hdg:50,len:3250,wid:46},{hdg:150,len:3666,wid:46}] },
  { icao:'EDDS', iata:'STR', name:'Stuttgart', city:'Stuttgart', country:'DE', lat:48.6899, lon:9.2220, elev:389, rwy:[{hdg:70,len:3345,wid:45}] },
  { icao:'EDDC', iata:'CGN', name:'Köln/Bonn', city:'Köln', country:'DE', lat:50.8659, lon:7.1427, elev:92, rwy:[{hdg:140,len:3815,wid:60}] },
  { icao:'EDDP', iata:'LEJ', name:'Leipzig/Halle', city:'Leipzig', country:'DE', lat:51.4324, lon:12.2416, elev:141, rwy:[{hdg:80,len:3600,wid:45}] },
  { icao:'EDDN', iata:'NUE', name:'Nürnberg', city:'Nürnberg', country:'DE', lat:49.4987, lon:11.0669, elev:318, rwy:[{hdg:100,len:2700,wid:45}] },
  { icao:'EDDW', iata:'BRE', name:'Bremen', city:'Bremen', country:'DE', lat:53.0475, lon:8.7867, elev:4, rwy:[{hdg:90,len:2040,wid:45}] },

  // ==================== EUROPA ====================
  { icao:'EGLL', iata:'LHR', name:'London Heathrow', city:'London', country:'GB', lat:51.4706, lon:-0.4619, elev:25, rwy:[{hdg:90,len:3902,wid:50},{hdg:270,len:3658,wid:50}] },
  { icao:'EGKK', iata:'LGW', name:'London Gatwick', city:'London', country:'GB', lat:51.1481, lon:-0.1903, elev:62, rwy:[{hdg:80,len:3316,wid:45},{hdg:260,len:2565,wid:45}] },
  { icao:'EGSS', iata:'STN', name:'London Stansted', city:'London', country:'GB', lat:51.8850, lon:0.2350, elev:106, rwy:[{hdg:40,len:3048,wid:46}] },
  { icao:'EGLC', iata:'LCY', name:'London City', city:'London', country:'GB', lat:51.5053, lon:0.0553, elev:6, rwy:[{hdg:90,len:1508,wid:30}] },
  { icao:'EGCC', iata:'MAN', name:'Manchester', city:'Manchester', country:'GB', lat:53.3537, lon:-2.2750, elev:78, rwy:[{hdg:50,len:3048,wid:46},{hdg:230,len:3048,wid:46}] },
  { icao:'LFPG', iata:'CDG', name:'Paris Charles de Gaulle', city:'Paris', country:'FR', lat:49.0097, lon:2.5479, elev:119, rwy:[{hdg:90,len:4200,wid:60},{hdg:270,len:4215,wid:60},{hdg:80,len:2700,wid:60},{hdg:260,len:2700,wid:45}] },
  { icao:'LFPO', iata:'ORY', name:'Paris Orly', city:'Paris', country:'FR', lat:48.7233, lon:2.3794, elev:89, rwy:[{hdg:60,len:3650,wid:45},{hdg:240,len:3320,wid:45}] },
  { icao:'LFMN', iata:'NCE', name:'Nice Côte d\'Azur', city:'Nizza', country:'FR', lat:43.6584, lon:7.2159, elev:4, rwy:[{hdg:40,len:2960,wid:45}] },
  { icao:'EHAM', iata:'AMS', name:'Amsterdam Schiphol', city:'Amsterdam', country:'NL', lat:52.3086, lon:4.7639, elev:-3, rwy:[{hdg:60,len:3800,wid:60},{hdg:180,len:3490,wid:45},{hdg:90,len:3453,wid:45},{hdg:360,len:3400,wid:45},{hdg:240,len:3300,wid:45}] },
  { icao:'EBBR', iata:'BRU', name:'Brüssel', city:'Brüssel', country:'BE', lat:50.9014, lon:4.4844, elev:56, rwy:[{hdg:70,len:3638,wid:50},{hdg:10,len:3211,wid:45},{hdg:200,len:2984,wid:45}] },
  { icao:'LSZH', iata:'ZRH', name:'Zürich', city:'Zürich', country:'CH', lat:47.4647, lon:8.5492, elev:432, rwy:[{hdg:160,len:3700,wid:60},{hdg:100,len:3300,wid:60},{hdg:280,len:2500,wid:45}] },
  { icao:'LSGG', iata:'GVA', name:'Genf', city:'Genf', country:'CH', lat:46.2381, lon:6.1089, elev:430, rwy:[{hdg:40,len:3900,wid:50}] },
  { icao:'LOWW', iata:'VIE', name:'Wien Schwechat', city:'Wien', country:'AT', lat:48.1103, lon:16.5697, elev:183, rwy:[{hdg:110,len:3600,wid:45},{hdg:160,len:3500,wid:45}] },
  { icao:'LOWI', iata:'INN', name:'Innsbruck', city:'Innsbruck', country:'AT', lat:47.2602, lon:11.3439, elev:581, rwy:[{hdg:80,len:2000,wid:45}] },
  { icao:'LEMD', iata:'MAD', name:'Madrid Barajas', city:'Madrid', country:'ES', lat:40.4936, lon:-3.5668, elev:610, rwy:[{hdg:140,len:4350,wid:60},{hdg:320,len:4100,wid:60},{hdg:180,len:3500,wid:60},{hdg:360,len:3500,wid:60}] },
  { icao:'LEBL', iata:'BCN', name:'Barcelona El Prat', city:'Barcelona', country:'ES', lat:41.2971, lon:2.0785, elev:4, rwy:[{hdg:70,len:3352,wid:60},{hdg:20,len:2660,wid:45}] },
  { icao:'LPPT', iata:'LIS', name:'Lissabon Portela', city:'Lissabon', country:'PT', lat:38.7813, lon:-9.1359, elev:114, rwy:[{hdg:30,len:3805,wid:45},{hdg:210,len:2400,wid:45}] },
  { icao:'LIRF', iata:'FCO', name:'Rom Fiumicino', city:'Rom', country:'IT', lat:41.8045, lon:12.2508, elev:5, rwy:[{hdg:160,len:3900,wid:60},{hdg:70,len:3600,wid:45},{hdg:250,len:3600,wid:45}] },
  { icao:'LIMC', iata:'MXP', name:'Mailand Malpensa', city:'Mailand', country:'IT', lat:45.6306, lon:8.7281, elev:234, rwy:[{hdg:170,len:3920,wid:60},{hdg:350,len:3920,wid:60}] },
  { icao:'LIPZ', iata:'VCE', name:'Venedig Marco Polo', city:'Venedig', country:'IT', lat:45.5053, lon:12.3519, elev:2, rwy:[{hdg:40,len:3300,wid:45}] },
  { icao:'LGAV', iata:'ATH', name:'Athen Eleftherios Venizelos', city:'Athen', country:'GR', lat:37.9364, lon:23.9445, elev:94, rwy:[{hdg:30,len:4000,wid:60},{hdg:210,len:3800,wid:45}] },
  { icao:'LTFM', iata:'IST', name:'Istanbul', city:'Istanbul', country:'TR', lat:41.2753, lon:28.7519, elev:99, rwy:[{hdg:170,len:4100,wid:60},{hdg:350,len:3750,wid:60},{hdg:60,len:4100,wid:60}] },
  { icao:'LTBA', iata:'SAW', name:'Istanbul Sabiha Gökçen', city:'Istanbul', country:'TR', lat:40.8986, lon:29.3092, elev:95, rwy:[{hdg:60,len:3000,wid:45}] },
  { icao:'EKCH', iata:'CPH', name:'Kopenhagen', city:'Kopenhagen', country:'DK', lat:55.6181, lon:12.6560, elev:5, rwy:[{hdg:40,len:3600,wid:45},{hdg:220,len:3300,wid:45},{hdg:120,len:2800,wid:45}] },
  { icao:'ESSA', iata:'ARN', name:'Stockholm Arlanda', city:'Stockholm', country:'SE', lat:59.6519, lon:17.9186, elev:41, rwy:[{hdg:10,len:3300,wid:45},{hdg:80,len:2500,wid:45},{hdg:260,len:3300,wid:45}] },
  { icao:'ENGM', iata:'OSL', name:'Oslo Gardermoen', city:'Oslo', country:'NO', lat:60.1939, lon:11.1004, elev:208, rwy:[{hdg:10,len:3600,wid:45},{hdg:190,len:2950,wid:45}] },
  { icao:'EFHK', iata:'HEL', name:'Helsinki Vantaa', city:'Helsinki', country:'FI', lat:60.3172, lon:24.9633, elev:55, rwy:[{hdg:40,len:3440,wid:60},{hdg:150,len:3060,wid:60},{hdg:220,len:2901,wid:45}] },
  { icao:'EPWA', iata:'WAW', name:'Warschau Chopin', city:'Warschau', country:'PL', lat:52.1657, lon:20.9671, elev:110, rwy:[{hdg:110,len:3690,wid:50},{hdg:330,len:2800,wid:50}] },
  { icao:'LKPR', iata:'PRG', name:'Prag Václav Havel', city:'Prag', country:'CZ', lat:50.1008, lon:14.2600, elev:380, rwy:[{hdg:60,len:3715,wid:45},{hdg:120,len:3250,wid:45}] },
  { icao:'LHBP', iata:'BUD', name:'Budapest Liszt Ferenc', city:'Budapest', country:'HU', lat:47.4369, lon:19.2556, elev:151, rwy:[{hdg:130,len:3707,wid:45},{hdg:310,len:3010,wid:45}] },
  { icao:'LROP', iata:'OTP', name:'Bukarest Otopeni', city:'Bukarest', country:'RO', lat:44.5722, lon:26.1022, elev:96, rwy:[{hdg:80,len:3500,wid:45}] },
  { icao:'BIKF', iata:'KEF', name:'Keflavík', city:'Reykjavik', country:'IS', lat:63.9850, lon:-22.6056, elev:52, rwy:[{hdg:10,len:3054,wid:60},{hdg:190,len:3054,wid:60}] },
  { icao:'EIDW', iata:'DUB', name:'Dublin', city:'Dublin', country:'IE', lat:53.4213, lon:-6.2701, elev:74, rwy:[{hdg:100,len:2637,wid:45},{hdg:280,len:2072,wid:61}] },
  { icao:'UUEE', iata:'SVO', name:'Moskau Scheremetjewo', city:'Moskau', country:'RU', lat:55.9726, lon:37.4146, elev:190, rwy:[{hdg:60,len:3700,wid:60},{hdg:70,len:3550,wid:60}] },

  // ==================== NORDAMERIKA ====================
  { icao:'KJFK', iata:'JFK', name:'New York John F. Kennedy', city:'New York', country:'US', lat:40.6398, lon:-73.7789, elev:4, rwy:[{hdg:40,len:4423,wid:61},{hdg:130,len:3460,wid:46},{hdg:220,len:3682,wid:61},{hdg:310,len:2560,wid:46}] },
  { icao:'KLGA', iata:'LGA', name:'New York LaGuardia', city:'New York', country:'US', lat:40.7772, lon:-73.8726, elev:7, rwy:[{hdg:40,len:2134,wid:46},{hdg:310,len:2134,wid:46}] },
  { icao:'KEWR', iata:'EWR', name:'Newark Liberty', city:'Newark', country:'US', lat:40.6925, lon:-74.1687, elev:5, rwy:[{hdg:40,len:3353,wid:46},{hdg:220,len:3048,wid:46},{hdg:110,len:2073,wid:46}] },
  { icao:'KLAX', iata:'LAX', name:'Los Angeles International', city:'Los Angeles', country:'US', lat:33.9425, lon:-118.4081, elev:38, rwy:[{hdg:70,len:3685,wid:46},{hdg:250,len:3135,wid:61},{hdg:60,len:2720,wid:46},{hdg:240,len:3382,wid:61}] },
  { icao:'KORD', iata:'ORD', name:'Chicago O\'Hare', city:'Chicago', country:'US', lat:41.9742, lon:-87.9073, elev:204, rwy:[{hdg:90,len:3963,wid:61},{hdg:100,len:3962,wid:46},{hdg:140,len:2461,wid:46},{hdg:270,len:3048,wid:46},{hdg:280,len:2286,wid:46},{hdg:320,len:2286,wid:46}] },
  { icao:'KATL', iata:'ATL', name:'Atlanta Hartsfield-Jackson', city:'Atlanta', country:'US', lat:33.6407, lon:-84.4277, elev:313, rwy:[{hdg:80,len:3624,wid:46},{hdg:90,len:2743,wid:46},{hdg:100,len:2743,wid:46},{hdg:260,len:3776,wid:46},{hdg:270,len:2743,wid:46}] },
  { icao:'KDFW', iata:'DFW', name:'Dallas/Fort Worth', city:'Dallas', country:'US', lat:32.8998, lon:-97.0403, elev:185, rwy:[{hdg:170,len:4085,wid:61},{hdg:180,len:3505,wid:46},{hdg:130,len:2743,wid:61},{hdg:350,len:2743,wid:46}] },
  { icao:'KDEN', iata:'DEN', name:'Denver International', city:'Denver', country:'US', lat:39.8561, lon:-104.6737, elev:1655, rwy:[{hdg:170,len:4877,wid:46},{hdg:70,len:3658,wid:46},{hdg:80,len:3658,wid:46},{hdg:250,len:3658,wid:46},{hdg:340,len:3658,wid:46}] },
  { icao:'KSFO', iata:'SFO', name:'San Francisco International', city:'San Francisco', country:'US', lat:37.6213, lon:-122.3790, elev:4, rwy:[{hdg:10,len:3618,wid:61},{hdg:280,len:3231,wid:61},{hdg:100,len:2286,wid:46},{hdg:190,len:2286,wid:46}] },
  { icao:'KSEA', iata:'SEA', name:'Seattle-Tacoma', city:'Seattle', country:'US', lat:47.4502, lon:-122.3088, elev:137, rwy:[{hdg:160,len:3627,wid:46},{hdg:340,len:2874,wid:46},{hdg:160,len:2591,wid:46}] },
  { icao:'KMIA', iata:'MIA', name:'Miami International', city:'Miami', country:'US', lat:25.7959, lon:-80.2870, elev:3, rwy:[{hdg:90,len:3962,wid:61},{hdg:80,len:3202,wid:46},{hdg:120,len:2743,wid:46},{hdg:270,len:2438,wid:46}] },
  { icao:'KBOS', iata:'BOS', name:'Boston Logan', city:'Boston', country:'US', lat:42.3656, lon:-71.0096, elev:6, rwy:[{hdg:40,len:3073,wid:46},{hdg:90,len:2134,wid:46},{hdg:150,len:3048,wid:46},{hdg:220,len:2134,wid:46},{hdg:270,len:2134,wid:46},{hdg:330,len:2134,wid:46}] },
  { icao:'KLAS', iata:'LAS', name:'Las Vegas Harry Reid', city:'Las Vegas', country:'US', lat:36.0840, lon:-115.1537, elev:664, rwy:[{hdg:10,len:4390,wid:46},{hdg:80,len:3209,wid:46},{hdg:190,len:2740,wid:46},{hdg:260,len:2740,wid:46}] },
  { icao:'KIAH', iata:'IAH', name:'Houston George Bush', city:'Houston', country:'US', lat:29.9844, lon:-95.3414, elev:29, rwy:[{hdg:80,len:3658,wid:46},{hdg:90,len:2743,wid:46},{hdg:150,len:3810,wid:46},{hdg:260,len:3048,wid:46},{hdg:330,len:2743,wid:46}] },
  { icao:'KMSP', iata:'MSP', name:'Minneapolis Saint Paul', city:'Minneapolis', country:'US', lat:44.8820, lon:-93.2218, elev:256, rwy:[{hdg:120,len:3355,wid:61},{hdg:300,len:3048,wid:46},{hdg:40,len:2499,wid:46},{hdg:170,len:2438,wid:46}] },
  { icao:'KPHL', iata:'PHL', name:'Philadelphia', city:'Philadelphia', country:'US', lat:39.8719, lon:-75.2411, elev:11, rwy:[{hdg:90,len:3202,wid:46},{hdg:80,len:2896,wid:46},{hdg:170,len:1524,wid:46},{hdg:270,len:2286,wid:46}] },
  { icao:'KDTW', iata:'DTW', name:'Detroit Metropolitan', city:'Detroit', country:'US', lat:42.2124, lon:-83.3534, elev:196, rwy:[{hdg:30,len:3659,wid:61},{hdg:40,len:2591,wid:46},{hdg:210,len:3048,wid:46},{hdg:220,len:3658,wid:61}] },
  { icao:'PANC', iata:'ANC', name:'Anchorage Ted Stevens', city:'Anchorage', country:'US', lat:61.1744, lon:-149.9964, elev:46, rwy:[{hdg:70,len:3231,wid:46},{hdg:150,len:3231,wid:46}] },
  { icao:'PHNL', iata:'HNL', name:'Honolulu Daniel K. Inouye', city:'Honolulu', country:'US', lat:21.3187, lon:-157.9225, elev:4, rwy:[{hdg:40,len:3753,wid:46},{hdg:80,len:3681,wid:61},{hdg:220,len:2743,wid:46}] },
  { icao:'CYYZ', iata:'YYZ', name:'Toronto Pearson', city:'Toronto', country:'CA', lat:43.6772, lon:-79.6306, elev:173, rwy:[{hdg:50,len:3389,wid:61},{hdg:60,len:2743,wid:61},{hdg:230,len:3368,wid:61},{hdg:240,len:2956,wid:61},{hdg:330,len:2770,wid:61}] },
  { icao:'CYUL', iata:'YUL', name:'Montréal Trudeau', city:'Montréal', country:'CA', lat:45.4706, lon:-73.7408, elev:36, rwy:[{hdg:60,len:3353,wid:61},{hdg:100,len:2926,wid:46},{hdg:240,len:3353,wid:61}] },
  { icao:'CYVR', iata:'YVR', name:'Vancouver International', city:'Vancouver', country:'CA', lat:49.1947, lon:-123.1839, elev:4, rwy:[{hdg:80,len:3030,wid:61},{hdg:120,len:2225,wid:46},{hdg:260,len:3030,wid:46}] },
  { icao:'MMMX', iata:'MEX', name:'Mexico City Benito Juárez', city:'Mexico City', country:'MX', lat:19.4363, lon:-99.0721, elev:2238, rwy:[{hdg:50,len:3963,wid:45},{hdg:230,len:3900,wid:45}] },

  // ==================== ASIEN ====================
  { icao:'VHHH', iata:'HKG', name:'Hong Kong International', city:'Hong Kong', country:'HK', lat:22.3089, lon:113.9185, elev:9, rwy:[{hdg:70,len:3800,wid:60},{hdg:250,len:3800,wid:60}] },
  { icao:'WSSS', iata:'SIN', name:'Singapore Changi', city:'Singapur', country:'SG', lat:1.3502, lon:103.9944, elev:7, rwy:[{hdg:20,len:4000,wid:60},{hdg:200,len:4000,wid:60},{hdg:20,len:4000,wid:60}] },
  { icao:'RJTT', iata:'HND', name:'Tokyo Haneda', city:'Tokio', country:'JP', lat:35.5494, lon:139.7798, elev:11, rwy:[{hdg:160,len:3000,wid:60},{hdg:40,len:3000,wid:60},{hdg:50,len:2500,wid:60},{hdg:220,len:2500,wid:60}] },
  { icao:'RJAA', iata:'NRT', name:'Tokyo Narita', city:'Tokio', country:'JP', lat:35.7647, lon:140.3864, elev:43, rwy:[{hdg:160,len:4000,wid:60},{hdg:340,len:2500,wid:60}] },
  { icao:'RKSI', iata:'ICN', name:'Seoul Incheon', city:'Seoul', country:'KR', lat:37.4602, lon:126.4407, elev:7, rwy:[{hdg:150,len:3750,wid:60},{hdg:160,len:4000,wid:60},{hdg:330,len:3750,wid:60},{hdg:340,len:4000,wid:60}] },
  { icao:'ZBAA', iata:'PEK', name:'Beijing Capital', city:'Peking', country:'CN', lat:40.0799, lon:116.6031, elev:35, rwy:[{hdg:180,len:3800,wid:60},{hdg:10,len:3200,wid:50},{hdg:360,len:3800,wid:60}] },
  { icao:'ZSPD', iata:'PVG', name:'Shanghai Pudong', city:'Shanghai', country:'CN', lat:31.1434, lon:121.8052, elev:4, rwy:[{hdg:170,len:4000,wid:60},{hdg:160,len:3800,wid:60},{hdg:350,len:3400,wid:60}] },
  { icao:'ZGGG', iata:'CAN', name:'Guangzhou Baiyun', city:'Guangzhou', country:'CN', lat:23.3924, lon:113.2988, elev:15, rwy:[{hdg:10,len:3800,wid:60},{hdg:20,len:3600,wid:45}] },
  { icao:'ZGSZ', iata:'SZX', name:'Shenzhen Bao\'an', city:'Shenzhen', country:'CN', lat:22.6393, lon:113.8106, elev:4, rwy:[{hdg:150,len:3400,wid:60}] },
  { icao:'RCTP', iata:'TPE', name:'Taipei Taoyuan', city:'Taipeh', country:'TW', lat:25.0777, lon:121.2325, elev:33, rwy:[{hdg:50,len:3660,wid:60},{hdg:230,len:3660,wid:60}] },
  { icao:'VTBS', iata:'BKK', name:'Bangkok Suvarnabhumi', city:'Bangkok', country:'TH', lat:13.6900, lon:100.7501, elev:2, rwy:[{hdg:10,len:4000,wid:60},{hdg:190,len:3700,wid:60}] },
  { icao:'WMKK', iata:'KUL', name:'Kuala Lumpur International', city:'Kuala Lumpur', country:'MY', lat:2.7456, lon:101.7099, elev:21, rwy:[{hdg:140,len:4050,wid:60},{hdg:320,len:4124,wid:60}] },
  { icao:'RPLL', iata:'MNL', name:'Manila Ninoy Aquino', city:'Manila', country:'PH', lat:14.5086, lon:121.0198, elev:23, rwy:[{hdg:60,len:3737,wid:60},{hdg:130,len:2258,wid:45}] },
  { icao:'VVNB', iata:'HAN', name:'Hanoi Noi Bai', city:'Hanoi', country:'VN', lat:21.2212, lon:105.8072, elev:12, rwy:[{hdg:110,len:3800,wid:45},{hdg:290,len:3200,wid:45}] },
  { icao:'VIDP', iata:'DEL', name:'New Delhi Indira Gandhi', city:'Neu-Delhi', country:'IN', lat:28.5665, lon:77.1031, elev:237, rwy:[{hdg:90,len:4430,wid:60},{hdg:100,len:3810,wid:46},{hdg:270,len:2813,wid:46}] },
  { icao:'VABB', iata:'BOM', name:'Mumbai Chhatrapati Shivaji', city:'Mumbai', country:'IN', lat:19.0887, lon:72.8679, elev:11, rwy:[{hdg:90,len:3660,wid:46},{hdg:140,len:2990,wid:46}] },

  // ==================== MITTLERER OSTEN ====================
  { icao:'OMDB', iata:'DXB', name:'Dubai International', city:'Dubai', country:'AE', lat:25.2528, lon:55.3644, elev:19, rwy:[{hdg:120,len:4000,wid:60},{hdg:300,len:4351,wid:60}] },
  { icao:'OMDW', iata:'DWC', name:'Dubai Al Maktoum', city:'Dubai', country:'AE', lat:24.8967, lon:55.1614, elev:34, rwy:[{hdg:120,len:4500,wid:60},{hdg:300,len:4500,wid:60}] },
  { icao:'OMAA', iata:'AUH', name:'Abu Dhabi', city:'Abu Dhabi', country:'AE', lat:24.4330, lon:54.6511, elev:27, rwy:[{hdg:130,len:4100,wid:60},{hdg:310,len:4100,wid:60}] },
  { icao:'OTHH', iata:'DOH', name:'Hamad International', city:'Doha', country:'QA', lat:25.2731, lon:51.6081, elev:4, rwy:[{hdg:160,len:4850,wid:60},{hdg:340,len:4250,wid:60}] },
  { icao:'OEJN', iata:'JED', name:'Jeddah King Abdulaziz', city:'Dschidda', country:'SA', lat:21.6796, lon:39.1565, elev:15, rwy:[{hdg:160,len:4000,wid:60},{hdg:340,len:3800,wid:60}] },
  { icao:'OERK', iata:'RUH', name:'Riyadh King Khalid', city:'Riad', country:'SA', lat:24.9578, lon:46.6989, elev:620, rwy:[{hdg:150,len:4205,wid:60},{hdg:330,len:4200,wid:60}] },
  { icao:'LLBG', iata:'TLV', name:'Tel Aviv Ben Gurion', city:'Tel Aviv', country:'IL', lat:32.0114, lon:34.8867, elev:41, rwy:[{hdg:80,len:3112,wid:45},{hdg:120,len:3657,wid:45},{hdg:260,len:2780,wid:45}] },

  // ==================== AFRIKA ====================
  { icao:'FAOR', iata:'JNB', name:'Johannesburg O.R. Tambo', city:'Johannesburg', country:'ZA', lat:-26.1392, lon:28.2460, elev:1694, rwy:[{hdg:30,len:4418,wid:61},{hdg:210,len:3400,wid:46}] },
  { icao:'FACT', iata:'CPT', name:'Cape Town International', city:'Kapstadt', country:'ZA', lat:-33.9649, lon:18.6017, elev:46, rwy:[{hdg:10,len:3201,wid:61},{hdg:160,len:1700,wid:46}] },
  { icao:'HECA', iata:'CAI', name:'Kairo International', city:'Kairo', country:'EG', lat:30.1219, lon:31.4056, elev:116, rwy:[{hdg:50,len:4000,wid:60},{hdg:230,len:3180,wid:60}] },
  { icao:'GMMN', iata:'CMN', name:'Casablanca Mohammed V', city:'Casablanca', country:'MA', lat:33.3675, lon:-7.5898, elev:200, rwy:[{hdg:170,len:3720,wid:45},{hdg:350,len:3720,wid:45}] },
  { icao:'HAAB', iata:'ADD', name:'Addis Abeba Bole', city:'Addis Abeba', country:'ET', lat:8.9779, lon:38.7993, elev:2334, rwy:[{hdg:70,len:3800,wid:45},{hdg:250,len:3800,wid:45}] },
  { icao:'HKJK', iata:'NBO', name:'Nairobi Jomo Kenyatta', city:'Nairobi', country:'KE', lat:-1.3192, lon:36.9278, elev:1624, rwy:[{hdg:60,len:4117,wid:46}] },
  { icao:'DNMM', iata:'LOS', name:'Lagos Murtala Muhammed', city:'Lagos', country:'NG', lat:6.5774, lon:3.3213, elev:41, rwy:[{hdg:180,len:3900,wid:60},{hdg:190,len:2743,wid:46}] },

  // ==================== SÜDAMERIKA ====================
  { icao:'SBGR', iata:'GRU', name:'São Paulo Guarulhos', city:'São Paulo', country:'BR', lat:-23.4356, lon:-46.4731, elev:750, rwy:[{hdg:90,len:3700,wid:45},{hdg:100,len:3000,wid:45}] },
  { icao:'SBGL', iata:'GIG', name:'Rio de Janeiro Galeão', city:'Rio de Janeiro', country:'BR', lat:-22.8100, lon:-43.2506, elev:9, rwy:[{hdg:100,len:4000,wid:47},{hdg:150,len:3180,wid:47}] },
  { icao:'SAEZ', iata:'EZE', name:'Buenos Aires Ezeiza', city:'Buenos Aires', country:'AR', lat:-34.8222, lon:-58.5358, elev:20, rwy:[{hdg:110,len:3300,wid:45},{hdg:170,len:3105,wid:45}] },
  { icao:'SCEL', iata:'SCL', name:'Santiago Arturo Merino', city:'Santiago', country:'CL', lat:-33.3928, lon:-70.7858, elev:474, rwy:[{hdg:170,len:3748,wid:45},{hdg:350,len:3150,wid:45}] },
  { icao:'SKBO', iata:'BOG', name:'Bogotá El Dorado', city:'Bogotá', country:'CO', lat:4.7016, lon:-74.1469, elev:2548, rwy:[{hdg:130,len:3800,wid:45},{hdg:310,len:3800,wid:45}] },
  { icao:'SPJC', iata:'LIM', name:'Lima Jorge Chávez', city:'Lima', country:'PE', lat:-12.0219, lon:-77.1143, elev:34, rwy:[{hdg:150,len:3507,wid:45}] },

  // ==================== OZEANIEN ====================
  { icao:'YSSY', iata:'SYD', name:'Sydney Kingsford Smith', city:'Sydney', country:'AU', lat:-33.9461, lon:151.1772, elev:6, rwy:[{hdg:160,len:3962,wid:45},{hdg:70,len:2530,wid:45},{hdg:340,len:2438,wid:45}] },
  { icao:'YMML', iata:'MEL', name:'Melbourne Tullamarine', city:'Melbourne', country:'AU', lat:-37.6733, lon:144.8433, elev:132, rwy:[{hdg:160,len:3657,wid:45},{hdg:90,len:2286,wid:45},{hdg:270,len:3048,wid:45}] },
  { icao:'YBBN', iata:'BNE', name:'Brisbane', city:'Brisbane', country:'AU', lat:-27.3842, lon:153.1175, elev:4, rwy:[{hdg:10,len:3560,wid:45},{hdg:190,len:1760,wid:45}] },
  { icao:'NZAA', iata:'AKL', name:'Auckland', city:'Auckland', country:'NZ', lat:-37.0082, lon:174.7850, elev:7, rwy:[{hdg:50,len:3635,wid:45}] },
  { icao:'NZWN', iata:'WLG', name:'Wellington', city:'Wellington', country:'NZ', lat:-41.3272, lon:174.8053, elev:12, rwy:[{hdg:160,len:2081,wid:45}] },
];

// Index by ICAO
export const AIRPORT_INDEX = {};
AIRPORTS.forEach(a => { AIRPORT_INDEX[a.icao] = a; });

// Suche
export function searchAirports(query) {
  if (!query || query.length < 2) return AIRPORTS.slice(0, 30);
  const q = query.toUpperCase();
  return AIRPORTS.filter(a =>
    a.icao.includes(q) ||
    a.iata.includes(q) ||
    a.name.toUpperCase().includes(q) ||
    a.city.toUpperCase().includes(q) ||
    a.country.includes(q)
  ).slice(0, 40);
}
