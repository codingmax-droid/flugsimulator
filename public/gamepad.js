// ============================================================
// GAMEPAD INPUT — HOTAS 4 + PS5 DualSense + Generic
// ============================================================

// --- Controller-Profile ---

const PROFILES = {
  // Thrustmaster T.Flight HOTAS 4
  hotas4: {
    match: (id) => id.toLowerCase().includes('thrustmaster') || id.toLowerCase().includes('hotas'),
    name: 'T.Flight HOTAS 4',
    axes: {
      roll: 0,       // Stick links/rechts
      pitch: 1,      // Stick vor/zurück
      throttle: 2,   // Schubregler
      yaw: 5,        // Stick Twist / Rudder-Rocker
    },
    axisInvert: { pitch: true, throttle: true },
    // Throttle: Achse geht von -1 (voll) bis +1 (idle) → umrechnen auf 0-1
    throttleRange: true,
    buttons: {
      trigger: 0,     // Trigger = Bremsen
      btnTop: 1,      // Taste oben auf Stick
      btn3: 2,
      btn4: 3,
      l1: 4,          // L1 = Flaps runter
      r1: 5,          // R1 = Flaps hoch
      l2: 6,          // L2 = Spoiler
      r2: 7,          // R2 = Gear
      select: 8,      // Select = Cockpit
      start: 9,       // Start = Pause
      l3: 10,         // L3 = Lichter
      r3: 11,         // R3 = Respawn
    },
    mapping: {
      brakes: 'trigger',
      flapsUp: 'r1',
      flapsDown: 'l1',
      gear: 'r2',
      spoilers: 'l2',
      cockpit: 'select',
      pause: 'start',
      lights: 'l3',
      respawn: 'r3',
      parkingBrake: 'btnTop',
    },
  },

  // PS5 DualSense / PS4 DualShock
  ps5: {
    match: (id) => id.toLowerCase().includes('dualsense') || id.toLowerCase().includes('dualshock') ||
                   id.toLowerCase().includes('playstation') || id.toLowerCase().includes('054c'),
    name: 'DualSense / PS Controller',
    axes: {
      roll: 0,       // Left Stick X
      pitch: 1,      // Left Stick Y
      yaw: 2,        // Right Stick X
      cameraY: 3,    // Right Stick Y (unbenutzt)
    },
    axisInvert: { pitch: true },
    axisDeadzone: 0.12,
    buttons: {
      cross: 0,      // X = Brakes
      circle: 1,     // O = Gear
      square: 2,     // □ = Spoilers
      triangle: 3,   // △ = Cockpit
      l1: 4,         // L1 = Flaps down
      r1: 5,         // R1 = Flaps up
      l2: 6,         // L2 = Throttle down (analog)
      r2: 7,         // R2 = Throttle up (analog)
      select: 8,     // Share = Lights
      start: 9,      // Options = Pause
      l3: 10,        // L3 = Parking Brake
      r3: 11,        // R3 = Respawn
      dpadUp: 12,
      dpadDown: 13,
      dpadLeft: 14,
      dpadRight: 15,
    },
    mapping: {
      brakes: 'cross',
      gear: 'circle',
      spoilers: 'square',
      cockpit: 'triangle',
      flapsDown: 'l1',
      flapsUp: 'r1',
      throttleDown: 'l2',
      throttleUp: 'r2',
      lights: 'select',
      pause: 'start',
      parkingBrake: 'l3',
      respawn: 'r3',
    },
    analogTriggers: true, // L2/R2 sind analog (0-1)
  },

  // Generisches Gamepad (Xbox-Layout / Standard)
  generic: {
    match: () => true,
    name: 'Gamepad',
    axes: {
      roll: 0,
      pitch: 1,
      yaw: 2,
      cameraY: 3,
    },
    axisInvert: { pitch: true },
    axisDeadzone: 0.12,
    buttons: {
      a: 0,
      b: 1,
      x: 2,
      y: 3,
      lb: 4,
      rb: 5,
      lt: 6,
      rt: 7,
      back: 8,
      start: 9,
      lstick: 10,
      rstick: 11,
      dpadUp: 12,
      dpadDown: 13,
      dpadLeft: 14,
      dpadRight: 15,
    },
    mapping: {
      brakes: 'a',
      gear: 'b',
      spoilers: 'x',
      cockpit: 'y',
      flapsDown: 'lb',
      flapsUp: 'rb',
      throttleDown: 'lt',
      throttleUp: 'rt',
      lights: 'back',
      pause: 'start',
      parkingBrake: 'lstick',
      respawn: 'rstick',
    },
    analogTriggers: true,
  },
};

// ============================================================
// GAMEPAD MANAGER
// ============================================================

export class GamepadManager {
  constructor() {
    this.gamepads = {};
    this.activeProfile = null;
    this.activeGamepad = null;
    this.prevButtons = {};
    this.onAction = null; // callback(action)
    this.connected = false;
    this.controllerName = '';

    // Throttle-Wert für PS5/Xbox (kumulativ über Trigger)
    this.virtualThrottle = 0.5;

    window.addEventListener('gamepadconnected', (e) => {
      console.log(`🎮 Controller verbunden: ${e.gamepad.id}`);
      this.detectProfile(e.gamepad);
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      console.log(`🎮 Controller getrennt: ${e.gamepad.id}`);
      if (this.activeGamepad?.index === e.gamepad.index) {
        this.connected = false;
        this.activeProfile = null;
        this.controllerName = '';
      }
    });
  }

  detectProfile(gp) {
    for (const [key, profile] of Object.entries(PROFILES)) {
      if (key !== 'generic' && profile.match(gp.id)) {
        this.activeProfile = profile;
        this.activeGamepad = gp;
        this.connected = true;
        this.controllerName = profile.name;
        console.log(`🎮 Profil erkannt: ${profile.name}`);
        return;
      }
    }
    // Fallback: Generic
    this.activeProfile = PROFILES.generic;
    this.activeGamepad = gp;
    this.connected = true;
    this.controllerName = PROFILES.generic.name;
    console.log(`🎮 Generisches Gamepad-Profil`);
  }

  // Muss jeden Frame aufgerufen werden
  poll() {
    // Aktiv nach Gamepads suchen — Browser feuern `gamepadconnected` oft erst
    // nach User-Interaktion. So erkennen wir auch nachträglich angesteckte oder
    // beim Laden bereits verbundene Sticks.
    if (!this.connected || !this.activeProfile) {
      const all = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const g of all) {
        if (g && g.connected) { this.detectProfile(g); break; }
      }
      if (!this.connected || !this.activeProfile) return null;
    }

    // Gamepads neu lesen (Chrome braucht das)
    const gamepads = navigator.getGamepads();
    const gp = gamepads[this.activeGamepad.index];
    if (!gp) { this.connected = false; return null; }

    const profile = this.activeProfile;
    const dz = profile.axisDeadzone || 0.08;

    // --- Achsen ---
    const readAxis = (name) => {
      const idx = profile.axes[name];
      if (idx === undefined) return 0;
      let val = gp.axes[idx] || 0;
      if (Math.abs(val) < dz) val = 0;
      if (profile.axisInvert?.[name]) val = -val;
      return val;
    };

    let roll = readAxis('roll');
    let pitch = readAxis('pitch');
    let yaw = readAxis('yaw');

    // --- Throttle ---
    let throttleInput = 0;

    if (profile.throttleRange) {
      // HOTAS: Direkte Throttle-Achse (-1 bis +1 → 0 bis 1)
      const rawThrottle = gp.axes[profile.axes.throttle] || 0;
      const invert = profile.axisInvert?.throttle;
      const t = invert ? -rawThrottle : rawThrottle;
      // Map von -1..+1 auf 0..1
      this.virtualThrottle = (t + 1) / 2;
    } else if (profile.analogTriggers) {
      // PS5/Xbox: L2 = throttle down, R2 = throttle up (analog 0-1)
      const lt = this.getButtonValue(gp, profile.buttons[profile.mapping.throttleDown]);
      const rt = this.getButtonValue(gp, profile.buttons[profile.mapping.throttleUp]);
      throttleInput = rt - lt;
      this.virtualThrottle = Math.max(0, Math.min(1, this.virtualThrottle + throttleInput * 0.02));
    }

    // --- Button-Events (press/release) ---
    const actions = [];
    for (const [action, btnName] of Object.entries(profile.mapping)) {
      if (action === 'throttleUp' || action === 'throttleDown') continue;
      const btnIdx = profile.buttons[btnName];
      if (btnIdx === undefined) continue;

      const pressed = this.isButtonPressed(gp, btnIdx);
      const wasPressed = this.prevButtons[btnIdx] || false;

      if (pressed && !wasPressed) {
        actions.push(action);
      }

      this.prevButtons[btnIdx] = pressed;
    }

    // Brakes: Gehalten
    const brakeBtn = profile.buttons[profile.mapping.brakes];
    const brakesHeld = brakeBtn !== undefined ? this.isButtonPressed(gp, brakeBtn) : false;

    return {
      roll,
      pitch,
      yaw,
      throttle: this.virtualThrottle,
      throttleIsAbsolute: true, // Server soll diesen Wert direkt setzen
      brakesHeld,
      actions,
    };
  }

  isButtonPressed(gp, idx) {
    if (idx === undefined || !gp.buttons[idx]) return false;
    return gp.buttons[idx].pressed;
  }

  getButtonValue(gp, idx) {
    if (idx === undefined || !gp.buttons[idx]) return 0;
    return gp.buttons[idx].value;
  }
}
