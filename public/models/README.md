# GLB-Modelle

Legt hier GLB-Dateien ab. Namenschema: `<type>.glb` (z. B. `b737.glb`).

Der Lader in `airplane.js` erkennt die Datei automatisch und verwendet sie
statt des prozeduralen Meshes. Die Welt-Größe wird aus `AIRCRAFT_TYPES` in
`public/airlines.js` (Feld `length` in Metern) gelesen und das Modell
entsprechend skaliert — beliebig große/kleine GLBs funktionieren also.

## Vorhandene Dateien

- `a320.glb`, `a330.glb`, `a340.glb`, `a350.glb`, `a380.glb`
- `b747.glb`, `b757.glb`, `b787.glb`

Fallbacks in `airplane.js`: `b737 → a320`, `b777 → b787`.

## Fehlende Typen

Für alle anderen Typen wird prozedural gebaut (siehe `CONFIGS` in
`airplane.js`). Um einen Typ zu ersetzen, einfach `<type>.glb` hier ablegen.

Alle unterstützten Typen: siehe Keys in `AIRCRAFT_TYPES` in
`public/airlines.js` (ca. 80 Flugzeuge).

## Quellen für eigene GLBs

- **Sketchfab** — viele CC-BY-Modelle (`sketchfab.com`, Lizenz prüfen)
- **Poly Haven** — CC0
- **GrabCAD** — primär CAD, manchmal GLB-Export
- **NASA 3D Resources** — öffentlich
- **Free3D** — gemischte Lizenzen, prüfen

## Aufbereitung

1. In Blender importieren, Orientierung prüfen:
   - Nase zeigt in **+X** (nach dem Laden rotiert der Lader um `-π/2`)
   - „Oben" ist **+Y**
2. Skalierung spielt keine Rolle (Auto-Scale zur echten Länge)
3. Als glTF 2.0 (Binary `.glb`) exportieren
4. Texturen einbetten (Option „Embed Textures")
5. PBR-Materialien (MetalRough) verwenden — der Lader setzt `envMapIntensity`

## Lizenz-Hinweis

Kommerzielle Nutzung oder Weiterverbreitung nur, wenn die jeweilige Lizenz
des Modells das erlaubt. CC-BY verlangt Namensnennung.
