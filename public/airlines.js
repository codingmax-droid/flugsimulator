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
