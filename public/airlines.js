// ============================================================
// AIRCRAFT TYPES — Echte Spezifikationen
// ============================================================

export const AIRCRAFT_TYPES = {
  // --- AIRBUS ---
  a320: {
    name: 'Airbus A320',
    manufacturer: 'Airbus',
    type: 'narrow',
    engines: 2,
    maxSpeed: 871,       // km/h
    cruiseSpeed: 828,
    stallSpeed: 195,
    maxAlt: 39000,       // ft
    range: 6150,         // km
    wingspan: 35.8,      // m
    length: 37.6,
    mtow: 78000,         // kg
    thrust: 120000,      // N per engine
    fuelCapacity: 24210, // L
    passengers: '150-180',
    scale: 2.2,
    liftCoeff: 1.4,
    dragCoeff: 0.028,
    mass: 64000,
    wingArea: 122.6,
    color: 0xf0f0f0,
  },
  a330: {
    name: 'Airbus A330-300',
    manufacturer: 'Airbus',
    type: 'wide',
    engines: 2,
    maxSpeed: 913,
    cruiseSpeed: 871,
    stallSpeed: 210,
    maxAlt: 41000,
    range: 11750,
    wingspan: 60.3,
    length: 63.7,
    mtow: 242000,
    thrust: 320000,
    fuelCapacity: 139090,
    passengers: '277-440',
    scale: 3.0,
    liftCoeff: 1.5,
    dragCoeff: 0.026,
    mass: 180000,
    wingArea: 361.6,
    color: 0xf0f0f0,
  },
  a340: {
    name: 'Airbus A340-600',
    manufacturer: 'Airbus',
    type: 'wide',
    engines: 4,
    maxSpeed: 913,
    cruiseSpeed: 881,
    stallSpeed: 220,
    maxAlt: 41000,
    range: 14600,
    wingspan: 63.5,
    length: 75.4,
    mtow: 380000,
    thrust: 151000,
    fuelCapacity: 195880,
    passengers: '326-475',
    scale: 3.5,
    liftCoeff: 1.5,
    dragCoeff: 0.027,
    mass: 245000,
    wingArea: 439.4,
    color: 0xf0f0f0,
  },
  a350: {
    name: 'Airbus A350-900',
    manufacturer: 'Airbus',
    type: 'wide',
    engines: 2,
    maxSpeed: 945,
    cruiseSpeed: 903,
    stallSpeed: 215,
    maxAlt: 43000,
    range: 15000,
    wingspan: 64.8,
    length: 66.8,
    mtow: 280000,
    thrust: 374000,
    fuelCapacity: 141000,
    passengers: '300-440',
    scale: 3.2,
    liftCoeff: 1.55,
    dragCoeff: 0.024,
    mass: 195000,
    wingArea: 443,
    color: 0xf0f0f0,
  },
  a380: {
    name: 'Airbus A380-800',
    manufacturer: 'Airbus',
    type: 'super',
    engines: 4,
    maxSpeed: 945,
    cruiseSpeed: 903,
    stallSpeed: 230,
    maxAlt: 43000,
    range: 15200,
    wingspan: 79.8,
    length: 72.7,
    mtow: 575000,
    thrust: 311000,
    fuelCapacity: 320000,
    passengers: '525-853',
    scale: 4.5,
    liftCoeff: 1.6,
    dragCoeff: 0.025,
    mass: 390000,
    wingArea: 845,
    color: 0xf0f0f0,
  },

  // --- BOEING ---
  b737: {
    name: 'Boeing 737-800',
    manufacturer: 'Boeing',
    type: 'narrow',
    engines: 2,
    maxSpeed: 842,
    cruiseSpeed: 828,
    stallSpeed: 190,
    maxAlt: 41000,
    range: 5765,
    wingspan: 35.8,
    length: 39.5,
    mtow: 79010,
    thrust: 121400,
    fuelCapacity: 26020,
    passengers: '162-189',
    scale: 2.2,
    liftCoeff: 1.35,
    dragCoeff: 0.029,
    mass: 62000,
    wingArea: 124.6,
    color: 0xf0f0f0,
  },
  b747: {
    name: 'Boeing 747-400',
    manufacturer: 'Boeing',
    type: 'super',
    engines: 4,
    maxSpeed: 988,
    cruiseSpeed: 913,
    stallSpeed: 225,
    maxAlt: 45000,
    range: 13450,
    wingspan: 64.4,
    length: 70.7,
    mtow: 412775,
    thrust: 252400,
    fuelCapacity: 216840,
    passengers: '416-524',
    scale: 4.0,
    liftCoeff: 1.5,
    dragCoeff: 0.026,
    mass: 285000,
    wingArea: 541.2,
    color: 0xf0f0f0,
  },
  b757: {
    name: 'Boeing 757-200',
    manufacturer: 'Boeing',
    type: 'narrow',
    engines: 2,
    maxSpeed: 870,
    cruiseSpeed: 850,
    stallSpeed: 200,
    maxAlt: 42000,
    range: 7222,
    wingspan: 38.1,
    length: 47.3,
    mtow: 115680,
    thrust: 191700,
    fuelCapacity: 43490,
    passengers: '200-239',
    scale: 2.5,
    liftCoeff: 1.45,
    dragCoeff: 0.027,
    mass: 84000,
    wingArea: 185.3,
    color: 0xf0f0f0,
  },
  b777: {
    name: 'Boeing 777-300ER',
    manufacturer: 'Boeing',
    type: 'wide',
    engines: 2,
    maxSpeed: 950,
    cruiseSpeed: 905,
    stallSpeed: 220,
    maxAlt: 43100,
    range: 13650,
    wingspan: 64.8,
    length: 73.9,
    mtow: 351500,
    thrust: 513900,
    fuelCapacity: 181280,
    passengers: '365-550',
    scale: 3.5,
    liftCoeff: 1.55,
    dragCoeff: 0.025,
    mass: 240000,
    wingArea: 427.8,
    color: 0xf0f0f0,
  },
  b787: {
    name: 'Boeing 787-9 Dreamliner',
    manufacturer: 'Boeing',
    type: 'wide',
    engines: 2,
    maxSpeed: 954,
    cruiseSpeed: 903,
    stallSpeed: 210,
    maxAlt: 43000,
    range: 14140,
    wingspan: 60.1,
    length: 62.8,
    mtow: 254000,
    thrust: 320000,
    fuelCapacity: 126917,
    passengers: '242-330',
    scale: 3.0,
    liftCoeff: 1.5,
    dragCoeff: 0.023,
    mass: 181000,
    wingArea: 377,
    color: 0xf0f0f0,
  },

  // ==================================================
  // AIRBUS — Weitere
  // ==================================================
  a220: { name: 'Airbus A220-300', manufacturer: 'Airbus', type: 'narrow', engines: 2, maxSpeed: 871, cruiseSpeed: 828, stallSpeed: 180, maxAlt: 41000, range: 6390, wingspan: 35.1, length: 38.7, mtow: 67585, thrust: 102300, fuelCapacity: 21805, passengers: '120-160', scale: 2.2, liftCoeff: 1.4, dragCoeff: 0.028, mass: 45000, wingArea: 112, color: 0xf0f0f0 },
  a300: { name: 'Airbus A300-600', manufacturer: 'Airbus', type: 'wide', engines: 2, maxSpeed: 897, cruiseSpeed: 833, stallSpeed: 205, maxAlt: 40000, range: 7500, wingspan: 44.8, length: 54.1, mtow: 171700, thrust: 272000, fuelCapacity: 68150, passengers: '228-336', scale: 2.9, liftCoeff: 1.45, dragCoeff: 0.028, mass: 130000, wingArea: 260, color: 0xf0f0f0 },
  a321: { name: 'Airbus A321neo', manufacturer: 'Airbus', type: 'narrow', engines: 2, maxSpeed: 871, cruiseSpeed: 828, stallSpeed: 200, maxAlt: 39800, range: 7400, wingspan: 35.8, length: 44.5, mtow: 97000, thrust: 293000, fuelCapacity: 32940, passengers: '180-244', scale: 2.3, liftCoeff: 1.4, dragCoeff: 0.028, mass: 75000, wingArea: 122.6, color: 0xf0f0f0 },

  // ==================================================
  // BOEING — Weitere
  // ==================================================
  b707: { name: 'Boeing 707-320', manufacturer: 'Boeing', type: 'narrow', engines: 4, maxSpeed: 1000, cruiseSpeed: 886, stallSpeed: 200, maxAlt: 42000, range: 9900, wingspan: 44.4, length: 46.6, mtow: 151000, thrust: 80000, fuelCapacity: 90300, passengers: '140-189', scale: 2.7, liftCoeff: 1.4, dragCoeff: 0.029, mass: 117000, wingArea: 283, color: 0xf0f0f0 },
  b717: { name: 'Boeing 717-200', manufacturer: 'Boeing', type: 'narrow', engines: 2, maxSpeed: 811, cruiseSpeed: 810, stallSpeed: 180, maxAlt: 37000, range: 2645, wingspan: 28.5, length: 37.8, mtow: 54900, thrust: 85000, fuelCapacity: 13892, passengers: '106-134', scale: 2.0, liftCoeff: 1.35, dragCoeff: 0.030, mass: 49000, wingArea: 93, color: 0xf0f0f0 },
  b727: { name: 'Boeing 727-200', manufacturer: 'Boeing', type: 'narrow', engines: 3, maxSpeed: 963, cruiseSpeed: 904, stallSpeed: 200, maxAlt: 42000, range: 4450, wingspan: 32.9, length: 46.7, mtow: 95000, thrust: 71000, fuelCapacity: 42260, passengers: '134-189', scale: 2.5, liftCoeff: 1.4, dragCoeff: 0.029, mass: 86000, wingArea: 157.9, color: 0xf0f0f0 },
  b767: { name: 'Boeing 767-300ER', manufacturer: 'Boeing', type: 'wide', engines: 2, maxSpeed: 913, cruiseSpeed: 851, stallSpeed: 200, maxAlt: 43000, range: 11093, wingspan: 47.6, length: 54.9, mtow: 186900, thrust: 280000, fuelCapacity: 91380, passengers: '218-351', scale: 2.8, liftCoeff: 1.5, dragCoeff: 0.027, mass: 155000, wingArea: 283.3, color: 0xf0f0f0 },

  // ==================================================
  // DOUGLAS / MCDONNELL DOUGLAS
  // ==================================================
  dc3: { name: 'Douglas DC-3', manufacturer: 'Douglas', type: 'prop', engines: 2, maxSpeed: 370, cruiseSpeed: 333, stallSpeed: 110, maxAlt: 23200, range: 2420, wingspan: 29, length: 19.7, mtow: 11430, thrust: 8800, fuelCapacity: 3058, passengers: '21-32', scale: 1.8, liftCoeff: 1.5, dragCoeff: 0.035, mass: 8000, wingArea: 91.7, color: 0xe4e4e4 },
  dc8: { name: 'Douglas DC-8-63', manufacturer: 'Douglas', type: 'narrow', engines: 4, maxSpeed: 965, cruiseSpeed: 875, stallSpeed: 205, maxAlt: 42000, range: 9200, wingspan: 45.2, length: 57.1, mtow: 161000, thrust: 80000, fuelCapacity: 88500, passengers: '189-259', scale: 2.8, liftCoeff: 1.4, dragCoeff: 0.029, mass: 135000, wingArea: 271, color: 0xf0f0f0 },
  dc9: { name: 'Douglas DC-9-30', manufacturer: 'Douglas', type: 'narrow', engines: 2, maxSpeed: 925, cruiseSpeed: 811, stallSpeed: 190, maxAlt: 37000, range: 2780, wingspan: 28.5, length: 36.4, mtow: 54900, thrust: 80000, fuelCapacity: 13853, passengers: '90-135', scale: 2.1, liftCoeff: 1.4, dragCoeff: 0.030, mass: 48000, wingArea: 93, color: 0xf0f0f0 },
  dc10: { name: 'McDonnell Douglas DC-10-30', manufacturer: 'McDonnell Douglas', type: 'wide', engines: 3, maxSpeed: 956, cruiseSpeed: 908, stallSpeed: 215, maxAlt: 42000, range: 10010, wingspan: 50.4, length: 55.5, mtow: 263085, thrust: 233000, fuelCapacity: 138700, passengers: '270-380', scale: 3.3, liftCoeff: 1.55, dragCoeff: 0.027, mass: 195000, wingArea: 367.7, color: 0xf0f0f0 },
  md80: { name: 'McDonnell Douglas MD-80', manufacturer: 'McDonnell Douglas', type: 'narrow', engines: 2, maxSpeed: 925, cruiseSpeed: 811, stallSpeed: 195, maxAlt: 37000, range: 4635, wingspan: 32.8, length: 45.1, mtow: 67800, thrust: 91000, fuelCapacity: 22106, passengers: '130-172', scale: 2.5, liftCoeff: 1.4, dragCoeff: 0.029, mass: 58000, wingArea: 112.3, color: 0xf0f0f0 },
  md11: { name: 'McDonnell Douglas MD-11', manufacturer: 'McDonnell Douglas', type: 'wide', engines: 3, maxSpeed: 945, cruiseSpeed: 876, stallSpeed: 215, maxAlt: 43000, range: 12670, wingspan: 51.7, length: 61.2, mtow: 285990, thrust: 269000, fuelCapacity: 146173, passengers: '293-410', scale: 3.4, liftCoeff: 1.55, dragCoeff: 0.026, mass: 210000, wingArea: 338.9, color: 0xf0f0f0 },

  // ==================================================
  // RUSSISCHE JET-AIRLINER
  // ==================================================
  tu154: { name: 'Tupolev Tu-154', manufacturer: 'Tupolev', type: 'narrow', engines: 3, maxSpeed: 950, cruiseSpeed: 850, stallSpeed: 200, maxAlt: 39000, range: 6600, wingspan: 37.6, length: 48, mtow: 100000, thrust: 103000, fuelCapacity: 39750, passengers: '164-180', scale: 2.6, liftCoeff: 1.4, dragCoeff: 0.030, mass: 82000, wingArea: 202, color: 0xf0f0f0 },
  il62: { name: 'Ilyushin Il-62', manufacturer: 'Ilyushin', type: 'wide', engines: 4, maxSpeed: 900, cruiseSpeed: 850, stallSpeed: 195, maxAlt: 42000, range: 10000, wingspan: 43.2, length: 53.1, mtow: 165000, thrust: 107900, fuelCapacity: 105300, passengers: '168-186', scale: 2.9, liftCoeff: 1.4, dragCoeff: 0.029, mass: 105000, wingArea: 282, color: 0xf0f0f0 },

  // ==================================================
  // EARLY JETS
  // ==================================================
  comet: { name: 'de Havilland Comet 4', manufacturer: 'de Havilland', type: 'narrow', engines: 4, maxSpeed: 840, cruiseSpeed: 830, stallSpeed: 180, maxAlt: 42000, range: 5190, wingspan: 35, length: 33.98, mtow: 73480, thrust: 47000, fuelCapacity: 40200, passengers: '74-109', scale: 2.4, liftCoeff: 1.3, dragCoeff: 0.032, mass: 50000, wingArea: 187, color: 0xe8e8e8 },
  caravelle: { name: 'Sud Caravelle III', manufacturer: 'Sud Aviation', type: 'narrow', engines: 2, maxSpeed: 845, cruiseSpeed: 760, stallSpeed: 180, maxAlt: 37000, range: 1700, wingspan: 34.3, length: 32, mtow: 46000, thrust: 57400, fuelCapacity: 18900, passengers: '80-99', scale: 2.1, liftCoeff: 1.35, dragCoeff: 0.031, mass: 32000, wingArea: 146.7, color: 0xe8e8e8 },

  // ==================================================
  // SUPERSONIC
  // ==================================================
  concorde: { name: 'Aérospatiale Concorde', manufacturer: 'BAC / Aérospatiale', type: 'super', engines: 4, maxSpeed: 2180, cruiseSpeed: 2158, stallSpeed: 300, maxAlt: 60000, range: 7222, wingspan: 25.6, length: 61.66, mtow: 185000, thrust: 169000, fuelCapacity: 119500, passengers: '92-128', scale: 3.2, liftCoeff: 0.6, dragCoeff: 0.035, mass: 111000, wingArea: 358.25, color: 0xffffff },
  tu144: { name: 'Tupolev Tu-144', manufacturer: 'Tupolev', type: 'super', engines: 4, maxSpeed: 2430, cruiseSpeed: 2200, stallSpeed: 310, maxAlt: 60000, range: 6500, wingspan: 28.8, length: 65.5, mtow: 180000, thrust: 196000, fuelCapacity: 120000, passengers: '120-150', scale: 3.4, liftCoeff: 0.6, dragCoeff: 0.036, mass: 120000, wingArea: 438, color: 0xffffff },

  // ==================================================
  // REGIONAL JETS
  // ==================================================
  e190: { name: 'Embraer E190', manufacturer: 'Embraer', type: 'regional', engines: 2, maxSpeed: 890, cruiseSpeed: 829, stallSpeed: 180, maxAlt: 41000, range: 4537, wingspan: 28.72, length: 36.2, mtow: 50790, thrust: 126000, fuelCapacity: 16153, passengers: '96-114', scale: 2.0, liftCoeff: 1.4, dragCoeff: 0.029, mass: 28000, wingArea: 92.5, color: 0xf0f0f0 },
  crj900: { name: 'Bombardier CRJ-900', manufacturer: 'Bombardier', type: 'regional', engines: 2, maxSpeed: 876, cruiseSpeed: 828, stallSpeed: 175, maxAlt: 41000, range: 2956, wingspan: 24.85, length: 36.24, mtow: 38330, thrust: 80000, fuelCapacity: 14308, passengers: '76-90', scale: 2.0, liftCoeff: 1.4, dragCoeff: 0.030, mass: 22000, wingArea: 70.6, color: 0xf0f0f0 },
  bae146: { name: 'BAe 146-200', manufacturer: 'British Aerospace', type: 'regional', engines: 4, maxSpeed: 789, cruiseSpeed: 740, stallSpeed: 170, maxAlt: 35000, range: 2909, wingspan: 26.2, length: 28.6, mtow: 42184, thrust: 122400, fuelCapacity: 11728, passengers: '70-112', scale: 1.9, liftCoeff: 1.5, dragCoeff: 0.031, mass: 26000, wingArea: 77.3, color: 0xf0f0f0 },
  fokker100: { name: 'Fokker 100', manufacturer: 'Fokker', type: 'regional', engines: 2, maxSpeed: 845, cruiseSpeed: 755, stallSpeed: 170, maxAlt: 35000, range: 3170, wingspan: 28.08, length: 35.53, mtow: 44450, thrust: 122000, fuelCapacity: 13365, passengers: '97-122', scale: 2.0, liftCoeff: 1.4, dragCoeff: 0.031, mass: 24400, wingArea: 93.5, color: 0xf0f0f0 },

  // ==================================================
  // MODERNE NEUE
  // ==================================================
  c919: { name: 'COMAC C919', manufacturer: 'COMAC', type: 'narrow', engines: 2, maxSpeed: 876, cruiseSpeed: 834, stallSpeed: 195, maxAlt: 40000, range: 4075, wingspan: 35.8, length: 38.9, mtow: 72500, thrust: 258000, fuelCapacity: 19560, passengers: '156-174', scale: 2.2, liftCoeff: 1.4, dragCoeff: 0.028, mass: 42100, wingArea: 129.5, color: 0xf0f0f0 },
  ssj100: { name: 'Sukhoi Superjet 100', manufacturer: 'Sukhoi', type: 'regional', engines: 2, maxSpeed: 860, cruiseSpeed: 828, stallSpeed: 175, maxAlt: 40200, range: 4578, wingspan: 27.8, length: 29.94, mtow: 49450, thrust: 142000, fuelCapacity: 15805, passengers: '98-108', scale: 2.0, liftCoeff: 1.4, dragCoeff: 0.030, mass: 24250, wingArea: 77, color: 0xf0f0f0 },
  mc21: { name: 'Irkut MC-21-300', manufacturer: 'Irkut', type: 'narrow', engines: 2, maxSpeed: 870, cruiseSpeed: 828, stallSpeed: 190, maxAlt: 40000, range: 6000, wingspan: 35.9, length: 42.2, mtow: 79250, thrust: 275000, fuelCapacity: 20400, passengers: '163-211', scale: 2.3, liftCoeff: 1.45, dragCoeff: 0.026, mass: 41000, wingArea: 134.9, color: 0xf0f0f0 },

  // ==================================================
  // HISTORIC PROPS
  // ==================================================
  ju52: { name: 'Junkers Ju 52/3m', manufacturer: 'Junkers', type: 'prop', engines: 3, maxSpeed: 265, cruiseSpeed: 245, stallSpeed: 100, maxAlt: 18000, range: 1000, wingspan: 29.25, length: 18.9, mtow: 10990, thrust: 12000, fuelCapacity: 2500, passengers: '15-17', scale: 1.7, liftCoeff: 1.55, dragCoeff: 0.040, mass: 5970, wingArea: 110.5, color: 0x9ea2a8 },
  fordtrimotor: { name: 'Ford Trimotor 5-AT', manufacturer: 'Ford', type: 'prop', engines: 3, maxSpeed: 241, cruiseSpeed: 193, stallSpeed: 95, maxAlt: 18500, range: 900, wingspan: 23.72, length: 15.19, mtow: 6124, thrust: 9500, fuelCapacity: 1250, passengers: '13-15', scale: 1.6, liftCoeff: 1.5, dragCoeff: 0.042, mass: 3400, wingArea: 77.6, color: 0x9ea2a8 },
  constellation: { name: 'Lockheed L-1049 Super Constellation', manufacturer: 'Lockheed', type: 'prop', engines: 4, maxSpeed: 607, cruiseSpeed: 491, stallSpeed: 180, maxAlt: 24000, range: 8700, wingspan: 37.49, length: 34.62, mtow: 62370, thrust: 40000, fuelCapacity: 25600, passengers: '62-109', scale: 2.4, liftCoeff: 1.5, dragCoeff: 0.034, mass: 39000, wingArea: 153.3, color: 0xe8e8e8 },

  // ==================================================
  // BUSINESS JETS
  // ==================================================
  g650: { name: 'Gulfstream G650ER', manufacturer: 'Gulfstream', type: 'bizjet', engines: 2, maxSpeed: 1133, cruiseSpeed: 904, stallSpeed: 180, maxAlt: 51000, range: 13890, wingspan: 30.4, length: 30.41, mtow: 46493, thrust: 147000, fuelCapacity: 20593, passengers: '8-18', scale: 1.9, liftCoeff: 1.4, dragCoeff: 0.024, mass: 21000, wingArea: 119, color: 0xf0f0f0 },
  global7500: { name: 'Bombardier Global 7500', manufacturer: 'Bombardier', type: 'bizjet', engines: 2, maxSpeed: 1151, cruiseSpeed: 978, stallSpeed: 180, maxAlt: 51000, range: 14260, wingspan: 31.7, length: 33.8, mtow: 51700, thrust: 165000, fuelCapacity: 22700, passengers: '8-19', scale: 1.9, liftCoeff: 1.4, dragCoeff: 0.024, mass: 22500, wingArea: 131, color: 0xf0f0f0 },
  falcon7x: { name: 'Dassault Falcon 7X', manufacturer: 'Dassault', type: 'bizjet', engines: 3, maxSpeed: 953, cruiseSpeed: 900, stallSpeed: 180, maxAlt: 51000, range: 11020, wingspan: 26.21, length: 23.38, mtow: 31751, thrust: 101000, fuelCapacity: 14670, passengers: '8-16', scale: 1.7, liftCoeff: 1.4, dragCoeff: 0.025, mass: 15000, wingArea: 70, color: 0xf0f0f0 },
  citation: { name: 'Cessna Citation CJ4', manufacturer: 'Cessna', type: 'bizjet', engines: 2, maxSpeed: 835, cruiseSpeed: 833, stallSpeed: 170, maxAlt: 45000, range: 3710, wingspan: 15.49, length: 16.25, mtow: 7761, thrust: 31000, fuelCapacity: 2632, passengers: '7-10', scale: 1.3, liftCoeff: 1.35, dragCoeff: 0.028, mass: 5400, wingArea: 33, color: 0xf0f0f0 },
  hondajet: { name: 'HondaJet Elite', manufacturer: 'Honda Aircraft', type: 'bizjet', engines: 2, maxSpeed: 782, cruiseSpeed: 780, stallSpeed: 165, maxAlt: 43000, range: 2661, wingspan: 12.12, length: 12.99, mtow: 4853, thrust: 17200, fuelCapacity: 1320, passengers: '4-6', scale: 1.1, liftCoeff: 1.35, dragCoeff: 0.026, mass: 4800, wingArea: 17.4, color: 0xf0f0f0 },

  // ==================================================
  // TURBOPROP REGIONAL
  // ==================================================
  atr72: { name: 'ATR 72-600', manufacturer: 'ATR', type: 'turboprop', engines: 2, maxSpeed: 511, cruiseSpeed: 510, stallSpeed: 150, maxAlt: 25000, range: 1528, wingspan: 27.05, length: 27.17, mtow: 23000, thrust: 18600, fuelCapacity: 6360, passengers: '68-78', scale: 1.9, liftCoeff: 1.5, dragCoeff: 0.035, mass: 13500, wingArea: 61, color: 0xf0f0f0 },
  dash8: { name: 'Bombardier Dash 8 Q400', manufacturer: 'Bombardier', type: 'turboprop', engines: 2, maxSpeed: 667, cruiseSpeed: 667, stallSpeed: 150, maxAlt: 27000, range: 2040, wingspan: 28.42, length: 32.83, mtow: 29257, thrust: 34000, fuelCapacity: 6526, passengers: '68-90', scale: 2.0, liftCoeff: 1.5, dragCoeff: 0.035, mass: 17200, wingArea: 63.1, color: 0xf0f0f0 },
  do328: { name: 'Dornier 328', manufacturer: 'Dornier', type: 'turboprop', engines: 2, maxSpeed: 620, cruiseSpeed: 620, stallSpeed: 140, maxAlt: 31000, range: 1850, wingspan: 20.98, length: 21.28, mtow: 13990, thrust: 15600, fuelCapacity: 3430, passengers: '30-33', scale: 1.7, liftCoeff: 1.5, dragCoeff: 0.036, mass: 8400, wingArea: 40, color: 0xf0f0f0 },

  pc12: { name: 'Pilatus PC-12 NGX', manufacturer: 'Pilatus', type: 'turboprop', engines: 1, maxSpeed: 528, cruiseSpeed: 528, stallSpeed: 120, maxAlt: 30000, range: 3417, wingspan: 16.28, length: 14.4, mtow: 4740, thrust: 7800, fuelCapacity: 1538, passengers: '6-9', scale: 1.4, liftCoeff: 1.5, dragCoeff: 0.034, mass: 2700, wingArea: 25.8, color: 0xffffff },
};

// ============================================================
// AIRLINES — Echte Airlines mit Farben
// ============================================================

export const AIRLINES = {
  // --- EUROPA ---
  lufthansa:     { name: 'Lufthansa',           country: 'DE', iata: 'LH', color1: '#05164d', color2: '#ffc72c', aircraft: ['a320','a330','a340','a350','a380','b747','b777','b787'] },
  eurowings:     { name: 'Eurowings',            country: 'DE', iata: 'EW', color1: '#a5027d', color2: '#ffffff', aircraft: ['a320'] },
  condor:        { name: 'Condor',               country: 'DE', iata: 'DE', color1: '#ffcc00', color2: '#1a1a1a', aircraft: ['a320','a330','b757','b767'] },
  swiss:         { name: 'Swiss',                country: 'CH', iata: 'LX', color1: '#d81e05', color2: '#ffffff', aircraft: ['a320','a330','a340','b777'] },
  austrian:      { name: 'Austrian Airlines',    country: 'AT', iata: 'OS', color1: '#e20a17', color2: '#ffffff', aircraft: ['a320','b777'] },
  british:       { name: 'British Airways',      country: 'GB', iata: 'BA', color1: '#1b3d6f', color2: '#eb2226', aircraft: ['a320','a350','a380','b747','b777','b787'] },
  airfrance:     { name: 'Air France',           country: 'FR', iata: 'AF', color1: '#002157', color2: '#e4002b', aircraft: ['a320','a330','a350','a380','b777','b787'] },
  klm:           { name: 'KLM',                  country: 'NL', iata: 'KL', color1: '#00a1de', color2: '#ffffff', aircraft: ['a330','b737','b777','b787'] },
  iberia:        { name: 'Iberia',               country: 'ES', iata: 'IB', color1: '#d81e05', color2: '#f5c518', aircraft: ['a320','a330','a340','a350'] },
  alitalia:      { name: 'ITA Airways',          country: 'IT', iata: 'AZ', color1: '#0b3d2e', color2: '#ffffff', aircraft: ['a320','a330'] },
  sas:           { name: 'SAS',                  country: 'SE', iata: 'SK', color1: '#000066', color2: '#c8c8c8', aircraft: ['a320','a330','a340','a350'] },
  finnair:       { name: 'Finnair',              country: 'FI', iata: 'AY', color1: '#003580', color2: '#ffffff', aircraft: ['a320','a330','a350'] },
  norwegian:     { name: 'Norwegian',            country: 'NO', iata: 'DY', color1: '#d81939', color2: '#003251', aircraft: ['b737','b787'] },
  ryanair:       { name: 'Ryanair',              country: 'IE', iata: 'FR', color1: '#073590', color2: '#f1c933', aircraft: ['b737'] },
  easyjet:       { name: 'easyJet',              country: 'GB', iata: 'U2', color1: '#ff6600', color2: '#ffffff', aircraft: ['a320'] },
  turkishair:    { name: 'Turkish Airlines',     country: 'TR', iata: 'TK', color1: '#c8102e', color2: '#ffffff', aircraft: ['a320','a330','a350','b737','b777','b787'] },
  aeroflot:      { name: 'Aeroflot',             country: 'RU', iata: 'SU', color1: '#003b7a', color2: '#e31e24', aircraft: ['a320','a330','a350','b737','b777'] },
  tap:           { name: 'TAP Portugal',         country: 'PT', iata: 'TP', color1: '#006847', color2: '#ff0000', aircraft: ['a320','a330'] },
  lot:           { name: 'LOT Polish Airlines',  country: 'PL', iata: 'LO', color1: '#003a70', color2: '#e4002b', aircraft: ['a320','b737','b787'] },
  icelandair:    { name: 'Icelandair',           country: 'IS', iata: 'FI', color1: '#003888', color2: '#ffd700', aircraft: ['b737','b757'] },

  // --- NORDAMERIKA ---
  united:        { name: 'United Airlines',      country: 'US', iata: 'UA', color1: '#002244', color2: '#0066b2', aircraft: ['a320','b737','b757','b777','b787'] },
  delta:         { name: 'Delta Air Lines',      country: 'US', iata: 'DL', color1: '#003366', color2: '#c8102e', aircraft: ['a320','a330','a350','b737','b757','b777','b787'] },
  american:      { name: 'American Airlines',    country: 'US', iata: 'AA', color1: '#0078d2', color2: '#b2b2b2', aircraft: ['a320','a330','b737','b757','b777','b787'] },
  southwest:     { name: 'Southwest Airlines',   country: 'US', iata: 'WN', color1: '#304cb2', color2: '#ffbf27', aircraft: ['b737'] },
  jetblue:       { name: 'JetBlue Airways',      country: 'US', iata: 'B6', color1: '#003876', color2: '#0033a0', aircraft: ['a320'] },
  alaska:        { name: 'Alaska Airlines',      country: 'US', iata: 'AS', color1: '#01426a', color2: '#64ccc9', aircraft: ['b737'] },
  aircanada:     { name: 'Air Canada',           country: 'CA', iata: 'AC', color1: '#f01428', color2: '#000000', aircraft: ['a320','a330','b737','b777','b787'] },
  westjet:       { name: 'WestJet',              country: 'CA', iata: 'WS', color1: '#00a4e4', color2: '#ffffff', aircraft: ['b737','b787'] },

  // --- ASIEN ---
  emirates:      { name: 'Emirates',             country: 'AE', iata: 'EK', color1: '#d71921', color2: '#b5985a', aircraft: ['a380','b777'] },
  qatar:         { name: 'Qatar Airways',        country: 'QA', iata: 'QR', color1: '#5c0632', color2: '#c8a96e', aircraft: ['a320','a330','a350','a380','b777','b787'] },
  etihad:        { name: 'Etihad Airways',       country: 'AE', iata: 'EY', color1: '#bd8b13', color2: '#1a1a1a', aircraft: ['a320','a350','a380','b777','b787'] },
  singapore:     { name: 'Singapore Airlines',   country: 'SG', iata: 'SQ', color1: '#1a3668', color2: '#f5c518', aircraft: ['a330','a350','a380','b737','b777','b787'] },
  cathay:        { name: 'Cathay Pacific',       country: 'HK', iata: 'CX', color1: '#006564', color2: '#8b6f4e', aircraft: ['a320','a330','a350','b747','b777'] },
  ana:           { name: 'ANA',                  country: 'JP', iata: 'NH', color1: '#003399', color2: '#0078c8', aircraft: ['a320','a380','b737','b777','b787'] },
  jal:           { name: 'Japan Airlines',       country: 'JP', iata: 'JL', color1: '#c8102e', color2: '#1c1c1c', aircraft: ['a350','b737','b777','b787'] },
  korean:        { name: 'Korean Air',           country: 'KR', iata: 'KE', color1: '#005baa', color2: '#b5b5b5', aircraft: ['a320','a330','a380','b737','b747','b777','b787'] },
  asiana:        { name: 'Asiana Airlines',      country: 'KR', iata: 'OZ', color1: '#c8102e', color2: '#6e6e6e', aircraft: ['a320','a330','a350','a380','b747','b777'] },
  thai:          { name: 'Thai Airways',         country: 'TH', iata: 'TG', color1: '#4b2882', color2: '#e31d93', aircraft: ['a320','a330','a350','a380','b747','b777','b787'] },
  garuda:        { name: 'Garuda Indonesia',     country: 'ID', iata: 'GA', color1: '#00a3e0', color2: '#006747', aircraft: ['a330','b737','b777'] },
  airchina:      { name: 'Air China',            country: 'CN', iata: 'CA', color1: '#cc0000', color2: '#ffd700', aircraft: ['a320','a330','a350','b737','b747','b777','b787'] },
  chinaeastern:  { name: 'China Eastern',        country: 'CN', iata: 'MU', color1: '#003399', color2: '#ed1c24', aircraft: ['a320','a330','a350','b737','b777','b787'] },
  chinasouthern: { name: 'China Southern',       country: 'CN', iata: 'CZ', color1: '#008fce', color2: '#e31d1a', aircraft: ['a320','a330','a350','a380','b737','b777','b787'] },
  airindia:      { name: 'Air India',            country: 'IN', iata: 'AI', color1: '#e31e24', color2: '#ff8300', aircraft: ['a320','a350','b737','b777','b787'] },
  malaysian:     { name: 'Malaysia Airlines',    country: 'MY', iata: 'MH', color1: '#1c3f94', color2: '#cc0000', aircraft: ['a330','a350','a380','b737'] },
  eva:           { name: 'EVA Air',              country: 'TW', iata: 'BR', color1: '#006747', color2: '#f58220', aircraft: ['a320','a330','b777','b787'] },
  vietnam:       { name: 'Vietnam Airlines',     country: 'VN', iata: 'VN', color1: '#00467f', color2: '#ffd700', aircraft: ['a320','a330','a350','b787'] },
  philippine:    { name: 'Philippine Airlines',  country: 'PH', iata: 'PR', color1: '#003580', color2: '#cc0000', aircraft: ['a320','a330','a350','b777'] },

  // --- OZEANIEN ---
  qantas:        { name: 'Qantas',               country: 'AU', iata: 'QF', color1: '#e31837', color2: '#ffffff', aircraft: ['a320','a330','a380','b737','b787'] },
  airnz:         { name: 'Air New Zealand',      country: 'NZ', iata: 'NZ', color1: '#1c1c1c', color2: '#ffffff', aircraft: ['a320','a321','b777','b787'] },

  // --- SÜDAMERIKA ---
  latam:         { name: 'LATAM Airlines',       country: 'CL', iata: 'LA', color1: '#1b0a5e', color2: '#e4002b', aircraft: ['a320','a350','b767','b777','b787'] },
  avianca:       { name: 'Avianca',              country: 'CO', iata: 'AV', color1: '#e31837', color2: '#003580', aircraft: ['a320','b787'] },
  azul:          { name: 'Azul Brazilian',       country: 'BR', iata: 'AD', color1: '#003b8e', color2: '#ffffff', aircraft: ['a320','a330'] },

  // --- AFRIKA ---
  ethiopian:     { name: 'Ethiopian Airlines',   country: 'ET', iata: 'ET', color1: '#006747', color2: '#ffcc00', aircraft: ['a320','a350','b737','b777','b787'] },
  southafrican:  { name: 'South African Airways', country: 'ZA', iata: 'SA', color1: '#003580', color2: '#f26522', aircraft: ['a320','a330','a340'] },
  royalair:      { name: 'Royal Air Maroc',      country: 'MA', iata: 'AT', color1: '#cc0000', color2: '#006233', aircraft: ['a320','b737','b787'] },
};

// ============================================================
// LIVERY-DEFAULTS & Sonderfälle
// ============================================================
// Livery-Schema: { color1, color2, belly, engine, cheatline, cheatlineY,
//                  titles, tailStyle, tailExtra }
//   tailStyle: 'solid'|'stripe'|'split'|'sweep'|'tricolor'|'eurowhite'
//   cheatlineY: 0..1 — Höhe relativ zum Rumpf (0=Mitte, 1=oben)
// Fehlt ein Feld, werden sinnvolle Defaults aus color1/color2 berechnet.

const LIVERY_OVERRIDES = {
  // Europa — markante Airlines
  lufthansa:  { tailStyle: 'solid',   engine: '#05164d', titles: '#05164d', cheatline: '#ffc72c' },
  eurowings:  { belly: '#a5027d',     engine: '#a5027d', titles: '#ffffff', cheatline: '#ffffff' },
  condor:     { tailStyle: 'stripe',  belly: '#ffcc00', engine: '#1a1a1a' },
  swiss:      { tailStyle: 'solid',   engine: '#d81e05', titles: '#d81e05' },
  british:    { tailStyle: 'sweep',   cheatline: '#eb2226', titles: '#1b3d6f' },
  airfrance:  { tailStyle: 'tricolor', cheatline: '#e4002b', titles: '#002157' },
  klm:        { belly: '#00a1de',     engine: '#00a1de', titles: '#00a1de' },
  iberia:     { tailStyle: 'sweep',   titles: '#d81e05' },
  norwegian:  { tailStyle: 'solid',   titles: '#d81939' },
  ryanair:    { tailStyle: 'solid',   cheatline: '#f1c933', engine: '#ffffff' },
  easyjet:    { belly: '#ff6600',     engine: '#ff6600', tailStyle: 'solid', titles: '#ffffff' },
  turkishair: { tailStyle: 'solid',   cheatline: '#c8102e' },
  aeroflot:   { tailStyle: 'sweep',   cheatline: '#e31e24' },
  // Nordamerika
  united:     { tailStyle: 'solid',   engine: '#0066b2', cheatline: '#0066b2' },
  delta:      { tailStyle: 'sweep',   cheatline: '#c8102e' },
  american:   { belly: '#b2b2b2',    tailStyle: 'tricolor', engine: '#0078d2' },
  southwest:  { tailStyle: 'tricolor', belly: '#ffbf27', engine: '#304cb2' },
  jetblue:    { tailStyle: 'stripe',  engine: '#003876' },
  alaska:     { tailStyle: 'solid',   engine: '#01426a' },
  aircanada:  { tailStyle: 'solid',   engine: '#f01428' },
  // Asien
  emirates:   { tailStyle: 'solid',   engine: '#d71921', cheatline: '#d71921' },
  qatar:      { tailStyle: 'sweep',   cheatline: '#5c0632', engine: '#5c0632' },
  etihad:     { tailStyle: 'sweep',   cheatline: '#bd8b13' },
  singapore:  { belly: '#f5c518',     tailStyle: 'split', engine: '#1a3668' },
  cathay:     { tailStyle: 'sweep',   cheatline: '#006564', engine: '#006564' },
  ana:        { tailStyle: 'solid',   cheatline: '#0078c8', engine: '#003399' },
  jal:        { tailStyle: 'solid',   cheatline: '#c8102e' },
  korean:     { belly: '#b5b5b5',    tailStyle: 'solid', engine: '#005baa' },
  thai:       { tailStyle: 'sweep',   cheatline: '#e31d93' },
  airchina:   { tailStyle: 'solid',   cheatline: '#ffd700' },
  chinaeastern:{tailStyle: 'sweep',   cheatline: '#ed1c24' },
  chinasouthern:{tailStyle: 'solid',  cheatline: '#e31d1a' },
  // Ozeanien/Süd/Afrika
  qantas:     { tailStyle: 'solid',   engine: '#e31837' },
  airnz:      { tailStyle: 'solid',   cheatline: '#ffffff', engine: '#1c1c1c' },
  latam:      { tailStyle: 'sweep',   cheatline: '#e4002b' },
  ethiopian:  { tailStyle: 'tricolor',cheatline: '#ffcc00' },
};

export function getLivery(airlineId) {
  const al = AIRLINES[airlineId];
  if (!al) {
    return {
      color1: '#05164d', color2: '#ffc72c',
      belly: '#eaeaec', engine: '#f2f2f4', cheatline: '#05164d',
      cheatlineY: 0.02, titles: '#05164d', tailStyle: 'solid',
      iata: 'LH', airlineName: '',
    };
  }
  const ov = LIVERY_OVERRIDES[airlineId] || {};
  return {
    color1:      al.color1,
    color2:      al.color2,
    belly:       ov.belly       || '#eaeaec',
    engine:      ov.engine      || '#f2f2f4',
    cheatline:   ov.cheatline   || al.color1,
    cheatlineY:  ov.cheatlineY  ?? 0.02,
    titles:      ov.titles      || al.color1,
    tailStyle:   ov.tailStyle   || 'solid',
    tailExtra:   ov.tailExtra   || al.color2,
    iata:        al.iata,
    airlineName: al.name,
  };
}

// ============================================================
// Hilfsfunktionen
// ============================================================

export function getAirlinesForAircraft(aircraftId) {
  return Object.entries(AIRLINES)
    .filter(([, a]) => a.aircraft.includes(aircraftId))
    .map(([id, a]) => ({ id, ...a }));
}

export function getAircraftList() {
  return Object.entries(AIRCRAFT_TYPES).map(([id, a]) => ({ id, ...a }));
}
