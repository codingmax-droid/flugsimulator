# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt

MSFS-artiger Multiplayer-Flugsimulator im Browser mit echten Satellitendaten — Node.js-Server mit WebSocket-Gameloop und Three.js 3D-Client.

## Befehle

- `npm start` — Server starten (Port 3000)
- `npm run dev` — Server mit Auto-Reload starten (`--watch`)

## Architektur

**Server (`server.js`):** Express serviert `public/`. WebSocket-Server (60 Hz) verwaltet Spieler mit erweiterter Physik: Flaps (0-3), Fahrwerk, Bremsen, Spoiler, Lichter, Stall-Erkennung, G-Kräfte, Treibstoff. Wetter-System mit 5 Presets (clear → stormy) beeinflusst Wind/Turbulenz. Crash-Erkennung mit Grund (zu schnell, zu steil, Fahrwerk ein, Strukturversagen).

**Client-Module:**
- `game.js` — Hauptmodul: Menü-Logik, Three.js-Szene, Render-Loop, Kamera (4 Modi), HUD-Updates, WebSocket
- `terrain.js` — Tile-basiertes echtes Terrain (AWS Terrarium Höhendaten + ESRI Satellitenbilder), dynamisches Laden/Entladen
- `airplane.js` — GLTFLoader für GLB-Modelle aus `/models/`, prozeduraler Fallback
- `style.css` — Komplettes MSFS-artiges UI-Design
- `index.html` — Alle UI-Panels: Hauptmenü, Weltkarte, Flugzeugwahl, Wetter, Settings, PFD, HUD, Pause, Crash

**UI-Struktur (MSFS-inspiriert):**
- Hauptmenü mit Tab-Navigation: Fliegen (Weltkarte + 12 Orte), Flugzeug (4 Typen), Wetter (5 Presets), Optionen (Grafik, Einheiten, Keybindings)
- Ladebildschirm mit Fortschrittsbalken
- Flight-HUD: PFD mit Attitude Indicator, Compass Tape, Systemanzeigen (THR/FUEL/G), Statusanzeigen (Gear/Flaps/Brakes/Spoilers/Lights)
- Pause-Menü (Esc) mit Wetter-Wechsel
- Crash-Screen mit Absturzgrund und Statistiken

**Datenquellen (kein API-Key nötig):**
- Höhendaten: `s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`
- Satellitenbilder: `server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`

## Steuerung

W/S: Pitch, A/D: Roll, Q/E: Yaw, Shift/Ctrl: Schub, F/V: Flaps +/-, G: Fahrwerk, B: Bremsen, K: Spoiler, L: Lichter, C: Kamera, R: Respawn, Esc: Pause
